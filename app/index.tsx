import { View, FlatList, Text, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '../src/components/Header';
import { SystemCard } from '../src/components/SystemCard';
import { DashboardSettingsModal } from '../src/components/DashboardSettingsModal';
import { ActiveAlertCard } from '../src/components/ActiveAlertCard';
import { useAuthStore } from '../src/store/authStore';
import { useNotificationStore } from '../src/store/notificationStore';
import { useDashboardPrefsStore } from '../src/store/dashboardPrefsStore';
import { markMessageAsRead, archiveMessage } from '../src/api/gmail';
import { fetchAndStoreNotifications, withTokenRefresh } from '../src/api/apiClient';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, ShieldOff, PenSquare, AlertCircle, TrendingUp, BarChart3, Activity, Clock, SlidersHorizontal } from 'lucide-react-native';
import { router } from 'expo-router';
import { Config } from '../src/constants/config';
import ReAnimated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withSequence,
    withTiming,
} from 'react-native-reanimated';

export default function Dashboard() {
    const { accessToken, userInfo } = useAuthStore();
    const { systems, liveNotifications, alertHistory, isLoading, lastFetchedAt, setLoading, markAsRead, markArchived } = useNotificationStore();
    const { cards, maxActiveAlerts } = useDashboardPrefsStore();
    const [autoRefreshSeconds, setAutoRefreshSeconds] = useState<number>(Config.AUTO_REFRESH_SECONDS);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const pulseOpacity = useSharedValue(1);

    // Pulse animation — runs on UI thread via Reanimated
    useEffect(() => {
        const critCount = systems.filter(s => s.status === 'ALERT' || s.status === 'OFFLINE').length;
        if (critCount > 0) {
            pulseOpacity.value = withRepeat(
                withSequence(
                    withTiming(0.3, { duration: 800 }),
                    withTiming(1, { duration: 800 }),
                ),
                -1,
            );
        } else {
            pulseOpacity.value = 1;
        }
    }, [systems]);

    const pulseStyle = useAnimatedStyle(() => ({
        opacity: pulseOpacity.value,
    }));

    // Auto-refresh
    useEffect(() => {
        if (!accessToken) return;
        const interval = setInterval(() => {
            setAutoRefreshSeconds((prev) => {
                if (prev <= 1) { loadData(); return Config.AUTO_REFRESH_SECONDS; }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [accessToken]);

    const loadData = useCallback(async (manual = false) => {
        if (!accessToken) return;
        try {
            if (manual) setLoading(true);
            await fetchAndStoreNotifications();
            setAutoRefreshSeconds(Config.AUTO_REFRESH_SECONDS);
        } catch (e: any) {
            console.error('[Dashboard] Failed to fetch:', e);
        } finally { if (manual) setLoading(false); }
    }, [accessToken]);

    useEffect(() => { loadData(); }, [loadData]);

    // Analytics
    const analytics = useMemo(() => {
        const now = Date.now();
        const last24h = alertHistory.filter(n => now - new Date(n.timestamp).getTime() < 24 * 60 * 60 * 1000);
        const last7d = alertHistory.filter(n => now - new Date(n.timestamp).getTime() < 7 * 24 * 60 * 60 * 1000);
        const systemCounts: Record<string, number> = {};
        for (const n of alertHistory) { systemCounts[n.systemId] = (systemCounts[n.systemId] || 0) + 1; }
        const topSystem = Object.entries(systemCounts).sort((a, b) => b[1] - a[1])[0];
        const statusCounts: Record<string, number> = { ALERT: 0, OFFLINE: 0, WARNING: 0, INFO: 0, HEALTHY: 0 };
        for (const n of last24h) { statusCounts[n.status] = (statusCounts[n.status] || 0) + 1; }
        return { last24h: last24h.length, last7d: last7d.length, totalAll: alertHistory.length, topSystem: topSystem ? { id: topSystem[0], count: topSystem[1] } : null, statusCounts };
    }, [alertHistory]);

    const activeAlerts = useMemo(() => {
        return alertHistory.filter(n => !n.isRead && !n.isArchived && (n.status === 'ALERT' || n.status === 'OFFLINE' || n.status === 'WARNING'));
    }, [alertHistory]);

    const handleAcknowledge = useCallback(async (messageId: string) => {
        if (!accessToken) return;
        markAsRead(messageId);
        await withTokenRefresh((token) => markMessageAsRead(token, messageId));
        loadData();
    }, [accessToken, loadData, markAsRead]);

    const handleAcknowledgeAll = useCallback(async () => {
        if (!accessToken) return;
        // Optimistic update
        for (const alert of activeAlerts) { markAsRead(alert.id); }
        // Parallel API calls with error resilience
        const results = await Promise.allSettled(
            activeAlerts.map((alert) => withTokenRefresh((token) => markMessageAsRead(token, alert.id)))
        );
        results.filter(r => r.status === 'rejected').forEach(r => {
            console.error('[Dashboard] Ack failed:', (r as PromiseRejectedResult).reason);
        });
        loadData();
    }, [accessToken, activeAlerts, loadData, markAsRead]);

    const handleArchive = useCallback(async (messageId: string) => {
        if (!accessToken) return;
        markArchived(messageId);
        await withTokenRefresh((token) => archiveMessage(token, messageId));
        loadData();
    }, [accessToken, loadData, markArchived]);

    if (!accessToken) {
        return (
            <View className="flex-1 bg-black items-center justify-center p-8">
                <ShieldOff color="#525252" size={48} />
                <Text className="text-gray-500 text-lg mt-4 text-center">Sign in via the Settings tab to start monitoring your systems.</Text>
            </View>
        );
    }

    const alertCount = systems.filter(s => s.status === 'ALERT' || s.status === 'OFFLINE').length;
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    const firstName = userInfo?.name?.split(' ')[0] || 'there';

    // Build visible card order from preferences
    const visibleCards = cards.filter(c => c.visible).map(c => c.id);

    const sections = [
        { key: 'header' },
        ...visibleCards.map(id => ({ key: id })),
        // Systems cards as individual items if systems section is visible
        ...(visibleCards.includes('systems')
            ? [{ key: 'systems-header' }, ...systems.map(s => ({ key: `system-${s.id}`, system: s }))]
            : []),
    ];

    return (
        <View className="flex-1 bg-black">
            <SafeAreaView edges={['top']} className="flex-1">
                <Header
                    title="Dashboard"
                    rightAction={
                        <TouchableOpacity onPress={() => setSettingsOpen(true)} className="p-1.5">
                            <SlidersHorizontal color="#737373" size={18} />
                        </TouchableOpacity>
                    }
                />

                <DashboardSettingsModal visible={settingsOpen} onClose={() => setSettingsOpen(false)} />

                <FlatList
                    data={sections}
                    keyExtractor={(item) => item.key}
                    contentContainerStyle={{ paddingBottom: 24 }}
                    refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => loadData(true)} tintColor="#10b981" />}
                    renderItem={({ item }) => {
                        // === Welcome Header ===
                        if (item.key === 'header') {
                            return (
                                <View className="px-4 pt-4 pb-2">
                                    <View className="flex-row items-center justify-between">
                                        <View className="flex-1">
                                            <Text className="text-white text-xl font-bold">{greeting}, {firstName}</Text>
                                            {alertCount > 0 ? (
                                                <View className="flex-row items-center mt-1">
                                                    <ReAnimated.View style={pulseStyle}>
                                                        <AlertCircle color="#ef4444" size={14} />
                                                    </ReAnimated.View>
                                                    <Text className="text-red-400 text-sm ml-1.5">
                                                        {alertCount} system{alertCount !== 1 ? 's' : ''} need{alertCount === 1 ? 's' : ''} attention
                                                    </Text>
                                                </View>
                                            ) : (
                                                <Text className="text-gray-500 text-sm mt-1">All systems operational</Text>
                                            )}
                                        </View>
                                        <View className="flex-row items-center" style={{ gap: 8 }}>
                                            <TouchableOpacity onPress={() => router.push('/compose')} className="bg-emerald-500 rounded-md px-3 py-1.5 flex-row items-center">
                                                <PenSquare color="#000" size={13} />
                                                <Text className="text-black font-black text-xs ml-1 tracking-wider">SEND</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity onPress={() => loadData(true)} disabled={isLoading}>
                                                {isLoading ? (
                                                    <ActivityIndicator size="small" color="#10b981" />
                                                ) : (
                                                    <View className="flex-row items-center">
                                                        <RefreshCw color="#525252" size={14} />
                                                        <Text className="text-gray-600 text-xs ml-1">{autoRefreshSeconds}s</Text>
                                                    </View>
                                                )}
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </View>
                            );
                        }

                        // === Active Alerts Card ===
                        if (item.key === 'active-alerts') {
                            return (
                                <ActiveAlertCard
                                    alerts={activeAlerts}
                                    maxAlerts={maxActiveAlerts}
                                    onAcknowledge={handleAcknowledge}
                                    onArchive={handleArchive}
                                    onAcknowledgeAll={handleAcknowledgeAll}
                                    onViewAll={() => router.push('/feed')}
                                />
                            );
                        }

                        // === Analytics Card ===
                        if (item.key === 'analytics') {
                            return (
                                <View className="mx-4 mt-3 p-4 rounded-xl border border-gray-800 bg-gray-900/60">
                                    <View className="flex-row items-center mb-3">
                                        <BarChart3 color="#3b82f6" size={16} style={{ marginRight: 8 }} />
                                        <Text className="text-white font-black text-sm tracking-wider">ANALYTICS</Text>
                                    </View>
                                    <View className="flex-row" style={{ gap: 8 }}>
                                        <View className="flex-1 p-3 rounded-lg bg-gray-800/50 items-center">
                                            <Text className="text-white text-xl font-black">{analytics.last24h}</Text>
                                            <Text className="text-gray-500 text-xs font-bold mt-0.5">Last 24h</Text>
                                        </View>
                                        <View className="flex-1 p-3 rounded-lg bg-gray-800/50 items-center">
                                            <Text className="text-white text-xl font-black">{analytics.last7d}</Text>
                                            <Text className="text-gray-500 text-xs font-bold mt-0.5">Last 7 Days</Text>
                                        </View>
                                        <View className="flex-1 p-3 rounded-lg bg-gray-800/50 items-center">
                                            <Text className="text-white text-xl font-black">{analytics.totalAll}</Text>
                                            <Text className="text-gray-500 text-xs font-bold mt-0.5">All Time</Text>
                                        </View>
                                    </View>
                                    {analytics.last24h > 0 && (
                                        <View className="flex-row mt-3" style={{ gap: 6 }}>
                                            {analytics.statusCounts.ALERT > 0 && (
                                                <View className="flex-row items-center"><View className="w-2 h-2 rounded-full bg-red-500" style={{ marginRight: 4 }} /><Text className="text-gray-400 text-xs">{analytics.statusCounts.ALERT} critical</Text></View>
                                            )}
                                            {analytics.statusCounts.WARNING > 0 && (
                                                <View className="flex-row items-center"><View className="w-2 h-2 rounded-full bg-amber-500" style={{ marginRight: 4 }} /><Text className="text-gray-400 text-xs">{analytics.statusCounts.WARNING} warnings</Text></View>
                                            )}
                                            {analytics.statusCounts.INFO > 0 && (
                                                <View className="flex-row items-center"><View className="w-2 h-2 rounded-full bg-blue-500" style={{ marginRight: 4 }} /><Text className="text-gray-400 text-xs">{analytics.statusCounts.INFO} info</Text></View>
                                            )}
                                        </View>
                                    )}
                                    {analytics.topSystem && (
                                        <View className="mt-3 pt-3 border-t border-gray-800/50 flex-row items-center">
                                            <TrendingUp color="#f59e0b" size={13} style={{ marginRight: 6 }} />
                                            <Text className="text-gray-400 text-xs">Most active: <Text className="text-white font-bold">{analytics.topSystem.id}</Text> ({analytics.topSystem.count} alerts)</Text>
                                        </View>
                                    )}
                                </View>
                            );
                        }

                        // === Systems Header (only if systems card is visible, skip duplicate) ===
                        if (item.key === 'systems-header') {
                            return (
                                <View className="mx-4 mt-4 mb-2 flex-row items-center justify-between">
                                    <View className="flex-row items-center">
                                        <Activity color="#737373" size={14} style={{ marginRight: 6 }} />
                                        <Text className="text-gray-500 font-black tracking-widest uppercase text-xs">Systems ({systems.length})</Text>
                                    </View>
                                    {lastFetchedAt && (
                                        <View className="flex-row items-center">
                                            <Clock color="#404040" size={11} style={{ marginRight: 4 }} />
                                            <Text className="text-gray-700 text-xs">{new Date(lastFetchedAt).toLocaleTimeString()}</Text>
                                        </View>
                                    )}
                                </View>
                            );
                        }

                        // === System Cards ===
                        if (item.key === 'systems') return null; // Handled via systems-header + individual cards
                        if ((item as any).system) {
                            return (
                                <View className="px-4">
                                    <SystemCard system={(item as any).system} onPress={() => router.push(`/feed?systemId=${(item as any).system.id}`)} />
                                </View>
                            );
                        }

                        return null;
                    }}
                    ListEmptyComponent={
                        <View className="items-center py-12 px-4">
                            <Text className="text-gray-500 text-base">No data to display.</Text>
                        </View>
                    }
                />
            </SafeAreaView>
        </View>
    );
}
