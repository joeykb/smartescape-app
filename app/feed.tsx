import { View, FlatList, Text, RefreshControl, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '../src/components/Header';
import { NotificationRow } from '../src/components/NotificationRow';
import { useAuthStore } from '../src/store/authStore';
import { useNotificationStore } from '../src/store/notificationStore';
import { fetchGmailMessages } from '../src/api/gmail';
import { useCallback, useMemo, useState } from 'react';
import { ShieldOff, Search, X, Database } from 'lucide-react-native';
import { NotificationStatus } from '../src/types';

const FILTER_OPTIONS: { label: string; value: NotificationStatus | 'ALL' }[] = [
    { label: 'ALL', value: 'ALL' },
    { label: 'ALERT', value: 'ALERT' },
    { label: 'OFFLINE', value: 'OFFLINE' },
    { label: 'WARNING', value: 'WARNING' },
    { label: 'INFO', value: 'INFO' },
    { label: 'HEALTHY', value: 'HEALTHY' },
];

const filterColors: Record<string, string> = {
    ALL: '#10b981',
    ALERT: '#ef4444',
    OFFLINE: '#ef4444',
    WARNING: '#f59e0b',
    INFO: '#3b82f6',
    HEALTHY: '#10b981',
};

export default function Feed() {
    const { accessToken, refreshToken } = useAuthStore();
    const { alertHistory, isLoading, setNotifications, setLoading } = useNotificationStore();
    const [activeFilter, setActiveFilter] = useState<NotificationStatus | 'ALL'>('ALL');
    const [searchQuery, setSearchQuery] = useState('');

    const loadData = useCallback(async () => {
        let token = accessToken;
        if (!token) return;

        try {
            setLoading(true);
            const data = await fetchGmailMessages(token, 50);
            setNotifications(data);
        } catch (e: any) {
            if (e.message?.includes('401')) {
                const freshToken = await refreshToken();
                if (freshToken) {
                    try {
                        const data = await fetchGmailMessages(freshToken, 50);
                        setNotifications(data);
                    } catch (retryErr) {
                        console.error('[Feed] Retry failed:', retryErr);
                    }
                }
            } else {
                console.error('[Feed] Failed to fetch:', e);
            }
        } finally {
            setLoading(false);
        }
    }, [accessToken]);

    const filteredNotifications = useMemo(() => {
        let result = alertHistory;

        if (activeFilter !== 'ALL') {
            result = result.filter((n) => n.status === activeFilter);
        }

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(
                (n) =>
                    n.systemId.toLowerCase().includes(query) ||
                    n.message.toLowerCase().includes(query)
            );
        }

        return result;
    }, [alertHistory, activeFilter, searchQuery]);

    // Count alerts by status for the filter badges
    const statusCounts = useMemo(() => {
        const counts: Record<string, number> = { ALL: alertHistory.length };
        for (const n of alertHistory) {
            counts[n.status] = (counts[n.status] || 0) + 1;
        }
        return counts;
    }, [alertHistory]);

    if (!accessToken) {
        return (
            <View className="flex-1 bg-black items-center justify-center p-8">
                <ShieldOff color="#525252" size={48} />
                <Text className="text-gray-500 text-lg mt-4 text-center">
                    Sign in via the Settings tab to view alerts.
                </Text>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-black">
            <SafeAreaView edges={['top']} className="flex-1">
                <Header title="Alert History" />

                <View className="flex-1 p-4">
                    {/* Persistence badge */}
                    <View className="flex-row items-center mb-3">
                        <Database color="#525252" size={12} style={{ marginRight: 6 }} />
                        <Text className="text-gray-600 text-xs">
                            {alertHistory.length} records stored locally
                        </Text>
                    </View>

                    {/* Search bar */}
                    <View className="flex-row items-center bg-gray-900 border border-gray-800 rounded-lg px-3 mb-3">
                        <Search color="#525252" size={16} />
                        <TextInput
                            className="flex-1 text-white text-sm py-2.5 px-2"
                            placeholder="Search by system ID or message..."
                            placeholderTextColor="#525252"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            autoCapitalize="none"
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')}>
                                <X color="#525252" size={16} />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Filter chips with counts */}
                    <View className="flex-row flex-wrap mb-3" style={{ gap: 6 }}>
                        {FILTER_OPTIONS.map((filter) => {
                            const isActive = activeFilter === filter.value;
                            const color = filterColors[filter.value];
                            const count = statusCounts[filter.value] || 0;
                            return (
                                <TouchableOpacity
                                    key={filter.value}
                                    onPress={() => setActiveFilter(filter.value)}
                                    style={{
                                        paddingHorizontal: 10,
                                        paddingVertical: 6,
                                        borderRadius: 6,
                                        borderWidth: 1,
                                        borderColor: isActive ? color : '#333',
                                        backgroundColor: isActive ? color + '20' : 'transparent',
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        gap: 4,
                                    }}
                                >
                                    <Text
                                        style={{
                                            color: isActive ? color : '#737373',
                                            fontSize: 11,
                                            fontWeight: '900',
                                            letterSpacing: 1,
                                        }}
                                    >
                                        {filter.label}
                                    </Text>
                                    {count > 0 && (
                                        <Text style={{ color: isActive ? color : '#525252', fontSize: 10, fontWeight: '700' }}>
                                            {count}
                                        </Text>
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {/* Count */}
                    <Text className="text-gray-500 font-black tracking-widest mb-3 uppercase text-xs">
                        {filteredNotifications.length} Result{filteredNotifications.length !== 1 ? 's' : ''}
                    </Text>

                    <FlatList
                        data={filteredNotifications}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => <NotificationRow notification={item} />}
                        contentContainerStyle={{ paddingBottom: 20 }}
                        refreshControl={
                            <RefreshControl refreshing={isLoading} onRefresh={loadData} tintColor="#10b981" />
                        }
                        ListEmptyComponent={
                            <View className="items-center py-12">
                                <Text className="text-gray-500 text-base">
                                    {activeFilter !== 'ALL' || searchQuery ? 'No matching results.' : 'No historical alerts yet.'}
                                </Text>
                            </View>
                        }
                    />
                </View>
            </SafeAreaView>
        </View>
    );
}
