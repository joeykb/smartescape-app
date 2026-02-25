import { View, FlatList, Text, RefreshControl, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '../src/components/Header';
import { NotificationRow } from '../src/components/NotificationRow';
import { useAuthStore } from '../src/store/authStore';
import { useNotificationStore } from '../src/store/notificationStore';
import { markMessageAsRead, archiveMessage } from '../src/api/gmail';
import { fetchAndStoreNotifications, withTokenRefresh } from '../src/api/apiClient';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { ShieldOff, Search, X, Database, Mail, MailOpen, Check, Archive, CheckSquare, Square } from 'lucide-react-native';
import { NotificationStatus } from '../src/types';
import { STATUS_COLORS } from '../src/constants/statusTheme';

const FILTER_OPTIONS: { label: string; value: NotificationStatus | 'ALL' }[] = [
    { label: 'ALL', value: 'ALL' },
    { label: 'ALERT', value: 'ALERT' },
    { label: 'OFFLINE', value: 'OFFLINE' },
    { label: 'WARNING', value: 'WARNING' },
    { label: 'INFO', value: 'INFO' },
    { label: 'HEALTHY', value: 'HEALTHY' },
];

type ReadFilter = 'all' | 'unread' | 'read';

export default function Feed() {
    const { accessToken } = useAuthStore();
    const { alertHistory, isLoading, setLoading, markArchived, markAsRead } = useNotificationStore();
    const [activeFilter, setActiveFilter] = useState<NotificationStatus | 'ALL'>('ALL');
    const [readFilter, setReadFilter] = useState<ReadFilter>('unread');
    const { systemId } = useLocalSearchParams<{ systemId?: string }>();
    const [searchQuery, setSearchQuery] = useState(systemId || '');

    // Multi-select state
    const [selectMode, setSelectMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [bulkLoading, setBulkLoading] = useState(false);

    // Sync systemId param to search query when navigating from dashboard
    useEffect(() => {
        if (systemId) {
            setSearchQuery(systemId);
            setReadFilter('all');
        }
    }, [systemId]);

    const loadData = useCallback(async () => {
        if (!accessToken) return;
        try {
            setLoading(true);
            await fetchAndStoreNotifications();
        } catch (e: any) {
            console.error('[Feed] Failed to fetch:', e);
        } finally {
            setLoading(false);
        }
    }, [accessToken]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleAcknowledge = useCallback(async (messageId: string) => {
        if (!accessToken) return;
        markAsRead(messageId);
        await withTokenRefresh((token) => markMessageAsRead(token, messageId));
        loadData();
    }, [accessToken, loadData, markAsRead]);

    const handleArchive = useCallback(async (messageId: string) => {
        if (!accessToken) return;
        try {
            markArchived(messageId);
            await withTokenRefresh((token) => archiveMessage(token, messageId));
            loadData();
        } catch (e) { console.error('[Feed] Archive failed:', e); }
    }, [accessToken, loadData, markArchived]);

    // Base list after read/unread filter (before status + search filters)
    const readFiltered = useMemo(() => {
        if (readFilter === 'unread') return alertHistory.filter(n => !n.isRead && !n.isArchived);
        if (readFilter === 'read') return alertHistory.filter(n => n.isRead && !n.isArchived);
        return alertHistory;
    }, [alertHistory, readFilter]);

    const filteredNotifications = useMemo(() => {
        let result = readFiltered;

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
    }, [readFiltered, activeFilter, searchQuery]);

    // Count alerts by status — based on current read filter so counts match results
    const statusCounts = useMemo(() => {
        const counts: Record<string, number> = { ALL: readFiltered.length };
        for (const n of readFiltered) {
            counts[n.status] = (counts[n.status] || 0) + 1;
        }
        return counts;
    }, [readFiltered]);

    const unreadCount = useMemo(() => alertHistory.filter(n => !n.isRead && !n.isArchived).length, [alertHistory]);
    const readCount = useMemo(() => alertHistory.filter(n => n.isRead && !n.isArchived).length, [alertHistory]);

    // -- Multi-select handlers --
    const handleLongPress = useCallback((id: string) => {
        setSelectMode(true);
        setSelectedIds(new Set([id]));
    }, []);

    const toggleSelection = useCallback((id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) { next.delete(id); } else { next.add(id); }
            if (next.size === 0) { setSelectMode(false); }
            return next;
        });
    }, []);

    const selectAll = useCallback(() => {
        setSelectedIds(new Set(filteredNotifications.map(n => n.id)));
    }, [filteredNotifications]);

    const cancelSelection = useCallback(() => {
        setSelectMode(false);
        setSelectedIds(new Set());
    }, []);

    const handleBulkAcknowledge = useCallback(async () => {
        if (!accessToken || selectedIds.size === 0) return;
        setBulkLoading(true);
        // Optimistic update
        for (const id of selectedIds) { markAsRead(id); }
        // Parallel API calls with error resilience
        const results = await Promise.allSettled(
            [...selectedIds].map((id) => withTokenRefresh((token) => markMessageAsRead(token, id)))
        );
        results.filter(r => r.status === 'rejected').forEach(r => {
            console.error('[Feed] Bulk ack failed:', (r as PromiseRejectedResult).reason);
        });
        cancelSelection();
        setBulkLoading(false);
        loadData();
    }, [accessToken, selectedIds, markAsRead, cancelSelection, loadData]);

    const handleBulkArchive = useCallback(async () => {
        if (!accessToken || selectedIds.size === 0) return;
        setBulkLoading(true);
        // Optimistic update
        for (const id of selectedIds) { markArchived(id); }
        // Parallel API calls with error resilience
        const results = await Promise.allSettled(
            [...selectedIds].map((id) => withTokenRefresh((token) => archiveMessage(token, id)))
        );
        results.filter(r => r.status === 'rejected').forEach(r => {
            console.error('[Feed] Bulk archive failed:', (r as PromiseRejectedResult).reason);
        });
        cancelSelection();
        setBulkLoading(false);
        loadData();
    }, [accessToken, selectedIds, markArchived, cancelSelection, loadData]);

    if (!accessToken) {
        return (
            <View className="flex-1 bg-black items-center justify-center p-8">
                <ShieldOff color="#ef4444" size={48} style={{ marginBottom: 16 }} />
                <Text className="text-white text-lg font-bold text-center mb-2">Not Logged In</Text>
                <Text className="text-gray-400 text-sm text-center">Sign in from the Dashboard to view your alert history.</Text>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-black">
            <SafeAreaView edges={['top']} className="flex-1">
                <Header title="Alert History" />

                <View className="flex-1 p-4">
                    {/* Selection bar */}
                    {selectMode && (
                        <View className="flex-row items-center justify-between bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 mb-3">
                            <View className="flex-row items-center">
                                <Text className="text-white font-bold text-sm">{selectedIds.size} selected</Text>
                                <TouchableOpacity onPress={selectAll} className="ml-3">
                                    <Text className="text-emerald-500 text-xs font-bold">SELECT ALL</Text>
                                </TouchableOpacity>
                            </View>
                            <View className="flex-row items-center" style={{ gap: 8 }}>
                                {readFilter === 'unread' || readFilter === 'all' ? (
                                    <TouchableOpacity
                                        onPress={handleBulkAcknowledge}
                                        disabled={bulkLoading}
                                        className="flex-row items-center bg-emerald-500/15 border border-emerald-500/30 rounded-md px-3 py-1.5"
                                    >
                                        <Check color="#10b981" size={13} />
                                        <Text className="text-emerald-500 text-xs font-black ml-1">ACK</Text>
                                    </TouchableOpacity>
                                ) : null}
                                {readFilter === 'read' || readFilter === 'all' ? (
                                    <TouchableOpacity
                                        onPress={handleBulkArchive}
                                        disabled={bulkLoading}
                                        className="flex-row items-center bg-gray-800 border border-gray-700 rounded-md px-3 py-1.5"
                                    >
                                        <Archive color="#737373" size={13} />
                                        <Text className="text-gray-400 text-xs font-black ml-1">ARCHIVE</Text>
                                    </TouchableOpacity>
                                ) : null}
                                <TouchableOpacity onPress={cancelSelection} className="p-1">
                                    <X color="#737373" size={16} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {/* Persistence badge */}
                    {!selectMode && (
                        <View className="flex-row items-center mb-3">
                            <Database color="#525252" size={12} style={{ marginRight: 6 }} />
                            <Text className="text-gray-600 text-xs">
                                {alertHistory.length} records stored locally
                            </Text>
                        </View>
                    )}

                    {/* Read/Unread toggle */}
                    <View className="flex-row mb-3 bg-gray-900 rounded-lg p-0.5 border border-gray-800">
                        {([
                            { key: 'unread' as ReadFilter, label: 'Unread', count: unreadCount, icon: Mail },
                            { key: 'read' as ReadFilter, label: 'Read', count: readCount, icon: MailOpen },
                            { key: 'all' as ReadFilter, label: 'All', count: alertHistory.length, icon: null },
                        ]).map(({ key, label, count, icon: FilterIcon }) => {
                            const isActive = readFilter === key;
                            return (
                                <TouchableOpacity
                                    key={key}
                                    onPress={() => { setReadFilter(key); cancelSelection(); }}
                                    className={`flex-1 flex-row items-center justify-center py-2 rounded-md ${isActive ? 'bg-gray-800' : ''}`}
                                >
                                    {FilterIcon && <FilterIcon color={isActive ? '#10b981' : '#525252'} size={12} style={{ marginRight: 4 }} />}
                                    <Text style={{ color: isActive ? '#10b981' : '#737373', fontSize: 11, fontWeight: '900', letterSpacing: 0.5 }}>
                                        {label}
                                    </Text>
                                    {count > 0 && (
                                        <Text style={{ color: isActive ? '#10b981' : '#525252', fontSize: 10, fontWeight: '700', marginLeft: 4 }}>
                                            {count}
                                        </Text>
                                    )}
                                </TouchableOpacity>
                            );
                        })}
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

                    {/* Filter + Count row */}
                    <View className="flex-row items-center justify-between mb-3">
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
                            <View className="flex-row" style={{ gap: 6 }}>
                                {FILTER_OPTIONS.map((filter) => {
                                    const isActive = activeFilter === filter.value;
                                    const color = STATUS_COLORS[filter.value];
                                    const count = statusCounts[filter.value] || 0;
                                    return (
                                        <TouchableOpacity
                                            key={filter.value}
                                            onPress={() => setActiveFilter(filter.value)}
                                            style={{
                                                paddingHorizontal: 8,
                                                paddingVertical: 4,
                                                borderRadius: 4,
                                                borderWidth: 1,
                                                borderColor: isActive ? color : '#333',
                                                backgroundColor: isActive ? color + '20' : 'transparent',
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                gap: 3,
                                            }}
                                        >
                                            <Text style={{ color: isActive ? color : '#525252', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 }}>
                                                {filter.label}
                                            </Text>
                                            {count > 0 && (
                                                <Text style={{ color: isActive ? color : '#404040', fontSize: 9, fontWeight: '700' }}>{count}</Text>
                                            )}
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </ScrollView>
                        <Text className="text-gray-600 text-xs font-bold ml-3">{filteredNotifications.length}</Text>
                    </View>

                    <FlatList
                        data={filteredNotifications}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => (
                            <View className="flex-row items-center">
                                {selectMode && (
                                    <TouchableOpacity onPress={() => toggleSelection(item.id)} className="pr-2 pl-1 py-2">
                                        {selectedIds.has(item.id) ? (
                                            <CheckSquare color="#10b981" size={20} />
                                        ) : (
                                            <Square color="#525252" size={20} />
                                        )}
                                    </TouchableOpacity>
                                )}
                                <View className="flex-1">
                                    <NotificationRow
                                        notification={item}
                                        onAcknowledge={selectMode ? undefined : handleAcknowledge}
                                        onArchive={selectMode ? undefined : handleArchive}
                                        onLongPress={() => handleLongPress(item.id)}
                                        onTap={selectMode ? () => toggleSelection(item.id) : undefined}
                                    />
                                </View>
                            </View>
                        )}
                        contentContainerStyle={{ paddingBottom: 20 }}
                        refreshControl={
                            <RefreshControl refreshing={isLoading} onRefresh={loadData} tintColor="#10b981" />
                        }
                        ListEmptyComponent={
                            <View className="items-center py-12">
                                <Text className="text-gray-500 text-base">
                                    {activeFilter !== 'ALL' || searchQuery || readFilter !== 'all' ? 'No matching results.' : 'No historical alerts yet.'}
                                </Text>
                            </View>
                        }
                    />
                </View>
            </SafeAreaView>
        </View>
    );
}
