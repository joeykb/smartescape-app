import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { Notification } from '../types';
import { useState, useCallback } from 'react';
import { Check, X, Archive } from 'lucide-react-native';
import { STATUS_THEME } from '../constants/statusTheme';
import { timeAgo } from '../utils/formatTime';
import { AlertCircle } from 'lucide-react-native';



interface ActiveAlertCardProps {
    alerts: Notification[];
    maxAlerts?: number;
    onAcknowledge: (id: string) => Promise<void>;
    onArchive?: (id: string) => Promise<void>;
    onAcknowledgeAll: () => Promise<void>;
    onViewAll: () => void;
}

export function ActiveAlertCard({ alerts, maxAlerts = 5, onAcknowledge, onArchive, onAcknowledgeAll, onViewAll }: ActiveAlertCardProps) {
    const [ackingAll, setAckingAll] = useState(false);
    const [selectedAlert, setSelectedAlert] = useState<Notification | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Sort by most recent and limit
    const sorted = [...alerts].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const visible = sorted.slice(0, maxAlerts);
    const hiddenCount = sorted.length - visible.length;

    const handleLongPress = useCallback((alert: Notification) => {
        setSelectedAlert(alert);
    }, []);

    const handleAck = useCallback(async () => {
        if (!selectedAlert) return;
        setActionLoading('ack');
        await onAcknowledge(selectedAlert.id);
        setActionLoading(null);
        setSelectedAlert(null);
    }, [selectedAlert, onAcknowledge]);

    const handleArchiveAction = useCallback(async () => {
        if (!selectedAlert || !onArchive) return;
        setActionLoading('archive');
        await onArchive(selectedAlert.id);
        setActionLoading(null);
        setSelectedAlert(null);
    }, [selectedAlert, onArchive]);

    const handleAckAll = async () => {
        setAckingAll(true);
        await onAcknowledgeAll();
        setAckingAll(false);
    };

    return (
        <View className="mx-4 mt-4 rounded-xl border border-gray-800 bg-gray-900/60 overflow-hidden">
            {/* Header */}
            <View className="flex-row items-center justify-between px-4 pt-4 pb-2">
                <View className="flex-row items-center">
                    <AlertCircle color="#ef4444" size={16} style={{ marginRight: 8 }} />
                    <Text className="text-white font-black text-sm tracking-wider">ACTIVE ALERTS</Text>
                    {alerts.length > 0 && (
                        <View className="ml-2 bg-red-500/20 rounded-full px-2 py-0.5">
                            <Text className="text-red-400 text-xs font-black">{alerts.reduce((s, a) => s + (a.count || 1), 0)}</Text>
                        </View>
                    )}
                </View>
                <TouchableOpacity onPress={onViewAll}>
                    <Text className="text-emerald-500 text-xs font-bold tracking-wider">VIEW ALL →</Text>
                </TouchableOpacity>
            </View>

            {sorted.length > 0 ? (
                <>
                    <View className="px-4 pb-1.5">
                        <Text className="text-gray-700 text-xs italic">long press for actions</Text>
                    </View>

                    <View>
                        {visible.map((alert, i) => {
                            const config = STATUS_THEME[alert.status] || STATUS_THEME.ALERT;
                            const Icon = config.icon;
                            return (
                                <TouchableOpacity
                                    key={alert.id}
                                    onLongPress={() => handleLongPress(alert)}
                                    activeOpacity={0.7}
                                    delayLongPress={300}
                                >
                                    <View className={`flex-row ${i > 0 ? 'border-t border-gray-800/30' : ''}`}>
                                        <View style={{ width: 3, backgroundColor: config.color, borderRadius: 2 }} />
                                        <View className="flex-1 px-3 py-2.5">
                                            <View className="flex-row items-center">
                                                <View className="w-7 h-7 rounded-md items-center justify-center" style={{ backgroundColor: config.color + '15' }}>
                                                    <Icon color={config.color} size={14} />
                                                </View>
                                                <View className="flex-1 ml-2.5">
                                                    <View className="flex-row items-center justify-between">
                                                        <View className="flex-row items-center flex-1 mr-2">
                                                            <Text className="text-white text-sm font-bold">{alert.systemId}</Text>
                                                            {(alert.count || 1) > 1 && (
                                                                <View className="ml-1.5 bg-gray-800 rounded-full px-1.5 py-0.5">
                                                                    <Text className="text-gray-400 text-xs font-black">×{alert.count}</Text>
                                                                </View>
                                                            )}
                                                        </View>
                                                        <Text className="text-gray-600 text-xs">{timeAgo(alert.timestamp)}</Text>
                                                    </View>
                                                    <Text className="text-gray-500 text-xs mt-0.5" numberOfLines={1}>{alert.message}</Text>
                                                </View>
                                            </View>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {hiddenCount > 0 && (
                        <TouchableOpacity onPress={onViewAll} className="px-4 py-2">
                            <Text className="text-gray-500 text-xs text-center">+{hiddenCount} more — tap VIEW ALL</Text>
                        </TouchableOpacity>
                    )}

                    {/* Acknowledge All */}
                    {sorted.length > 1 && (
                        <TouchableOpacity
                            onPress={handleAckAll}
                            disabled={ackingAll}
                            className="mx-4 mb-4 mt-3 flex-row items-center justify-center py-2.5 rounded-md bg-emerald-500/10 border border-emerald-500/20"
                        >
                            <Check color="#10b981" size={14} />
                            <Text className="text-emerald-500 text-xs font-black tracking-wider ml-1.5">
                                {ackingAll ? 'ACKNOWLEDGING ALL...' : `ACKNOWLEDGE ALL (${sorted.length})`}
                            </Text>
                        </TouchableOpacity>
                    )}
                </>
            ) : (
                <View className="py-4 items-center pb-5">
                    <Text className="text-emerald-500 font-bold text-sm">✓ No active alerts</Text>
                    <Text className="text-gray-600 text-xs mt-1">All systems operating normally</Text>
                </View>
            )}

            {/* Action Sheet Modal */}
            <Modal
                visible={!!selectedAlert}
                transparent
                animationType="fade"
                onRequestClose={() => setSelectedAlert(null)}
            >
                <TouchableOpacity
                    className="flex-1 justify-end"
                    style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
                    activeOpacity={1}
                    onPress={() => setSelectedAlert(null)}
                >
                    <View className="bg-gray-900 rounded-t-2xl border-t border-gray-700 pb-8">
                        {/* Handle bar */}
                        <View className="items-center pt-3 pb-4">
                            <View className="w-10 h-1 rounded-full bg-gray-700" />
                        </View>

                        {selectedAlert && (
                            <>
                                {/* Alert info */}
                                <View className="px-5 pb-4 border-b border-gray-800">
                                    <Text className="text-white font-bold text-base">{selectedAlert.systemId}</Text>
                                    <Text className="text-gray-400 text-sm mt-1">{selectedAlert.message}</Text>
                                    <Text className="text-gray-600 text-xs mt-1">{timeAgo(selectedAlert.timestamp)}</Text>
                                </View>

                                {/* Actions */}
                                <View className="px-4 pt-3" style={{ gap: 8 }}>
                                    <TouchableOpacity
                                        onPress={handleAck}
                                        disabled={actionLoading === 'ack'}
                                        className="flex-row items-center px-4 py-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20"
                                    >
                                        <Check color="#10b981" size={18} />
                                        <View className="ml-3 flex-1">
                                            <Text className="text-emerald-400 font-bold text-sm">
                                                {actionLoading === 'ack' ? 'Acknowledging...' : 'Acknowledge'}
                                            </Text>
                                            <Text className="text-gray-500 text-xs mt-0.5">Mark as read in Gmail</Text>
                                        </View>
                                    </TouchableOpacity>

                                    {onArchive && (
                                        <TouchableOpacity
                                            onPress={handleArchiveAction}
                                            disabled={actionLoading === 'archive'}
                                            className="flex-row items-center px-4 py-3.5 rounded-xl bg-gray-800/50 border border-gray-700/50"
                                        >
                                            <Archive color="#737373" size={18} />
                                            <View className="ml-3 flex-1">
                                                <Text className="text-gray-300 font-bold text-sm">
                                                    {actionLoading === 'archive' ? 'Archiving...' : 'Archive'}
                                                </Text>
                                                <Text className="text-gray-500 text-xs mt-0.5">Remove from inbox</Text>
                                            </View>
                                        </TouchableOpacity>
                                    )}

                                    <TouchableOpacity
                                        onPress={() => setSelectedAlert(null)}
                                        className="flex-row items-center justify-center px-4 py-3 rounded-xl mt-1"
                                    >
                                        <Text className="text-gray-500 font-bold text-sm">Cancel</Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}
