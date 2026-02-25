import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Notification } from '../types';
import { ChevronDown, ChevronUp, Check, Archive } from 'lucide-react-native';
import React, { useState } from 'react';
import { STATUS_THEME } from '../constants/statusTheme';
import { shortDateTime, fullDateTime } from '../utils/formatTime';

interface NotificationRowProps {
    notification: Notification;
    onAcknowledge?: (id: string) => Promise<void>;
    onArchive?: (id: string) => Promise<void>;
    onLongPress?: () => void;
    onTap?: () => void;
}

export const NotificationRow = React.memo(function NotificationRow({ notification, onAcknowledge, onArchive, onLongPress, onTap }: NotificationRowProps) {
    const [expanded, setExpanded] = useState(false);
    const [ackLoading, setAckLoading] = useState(false);
    const [archiveLoading, setArchiveLoading] = useState(false);
    const config = STATUS_THEME[notification.status] || STATUS_THEME.INFO;
    const Icon = config.icon;
    const isUnread = !notification.isRead;
    const count = notification.count || 1;

    const timeStr = shortDateTime(notification.timestamp);
    const fullDate = fullDateTime(notification.timestamp);

    const handleAcknowledge = async () => {
        if (!onAcknowledge || ackLoading) return;
        setAckLoading(true);
        try { await onAcknowledge(notification.id); }
        finally { setAckLoading(false); }
    };

    const handleArchive = async () => {
        if (!onArchive || archiveLoading) return;
        setArchiveLoading(true);
        try { await onArchive(notification.id); }
        finally { setArchiveLoading(false); }
    };

    return (
        <TouchableOpacity
            className={`p-3 rounded-lg mb-2 border ${isUnread ? 'border-gray-700 bg-gray-900/80' : 'border-gray-800/30 bg-transparent'}`}
            onPress={onTap || (() => setExpanded(!expanded))}
            onLongPress={onLongPress}
            delayLongPress={300}
            activeOpacity={0.7}
        >
            {/* Header row */}
            <View className="flex-row items-start">
                <View className="w-8 h-8 rounded-md bg-gray-800 items-center justify-center mt-0.5" style={{ marginRight: 10 }}>
                    <Icon color={config.color} size={16} />
                </View>
                <View className="flex-1">
                    <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center flex-1 mr-2">
                            <Text className="text-white font-bold text-sm tracking-wide">{notification.systemId}</Text>
                            {count > 1 && (
                                <View className="ml-2 bg-gray-800 rounded-full px-2 py-0.5">
                                    <Text className="text-gray-300 text-xs font-black">×{count}</Text>
                                </View>
                            )}
                            {notification.isArchived && (
                                <View className="ml-2 bg-gray-800/50 rounded px-1.5 py-0.5 border border-gray-700/50">
                                    <Text className="text-gray-500 text-xs font-black tracking-wider">ARCHIVED</Text>
                                </View>
                            )}
                        </View>
                        <View className="flex-row items-center">
                            <Text className="text-gray-600 text-xs" style={{ marginRight: 6 }}>{timeStr}</Text>
                            {expanded ? (
                                <ChevronUp color="#525252" size={14} />
                            ) : (
                                <ChevronDown color="#525252" size={14} />
                            )}
                        </View>
                    </View>
                    <Text className="text-gray-400 text-xs mt-1" numberOfLines={expanded ? undefined : 1}>
                        {notification.message}
                    </Text>
                </View>
                {isUnread && (
                    <View className="w-2 h-2 rounded-full bg-emerald-500 ml-2 mt-2" />
                )}
            </View>

            {/* Expanded detail */}
            {expanded && (
                <View className="mt-3 ml-10 pt-3 border-t border-gray-800/50">
                    <View className="flex-row items-center mb-2">
                        <View className="px-2 py-0.5 rounded-sm border" style={{ borderColor: config.color + '50' }}>
                            <Text style={{ color: config.color }} className="text-xs font-black tracking-widest">
                                {notification.status}
                            </Text>
                        </View>
                        {count > 1 && (
                            <Text className="text-gray-500 text-xs ml-2">
                                Occurred {count} time{count !== 1 ? 's' : ''}
                            </Text>
                        )}
                        {!isUnread && (
                            <View className="ml-2 flex-row items-center">
                                <Check color="#10b981" size={11} />
                                <Text className="text-emerald-500 text-xs ml-1 font-bold">ACK</Text>
                            </View>
                        )}
                    </View>

                    <View className="mb-1.5">
                        <Text className="text-gray-600 text-xs font-bold tracking-wider mb-0.5">TIMESTAMP</Text>
                        <Text className="text-gray-400 text-xs">{fullDate}</Text>
                    </View>

                    <View className="mb-1.5">
                        <Text className="text-gray-600 text-xs font-bold tracking-wider mb-0.5">SYSTEM</Text>
                        <Text className="text-gray-400 text-xs">{notification.systemId}</Text>
                    </View>

                    <View>
                        <Text className="text-gray-600 text-xs font-bold tracking-wider mb-0.5">DETAILS</Text>
                        <Text className="text-gray-300 text-sm leading-5">{notification.message}</Text>
                    </View>

                    {/* Action buttons */}
                    {(onAcknowledge || onArchive) && (
                        <View className="flex-row mt-3 pt-3 border-t border-gray-800/50" style={{ gap: 8 }}>
                            {onAcknowledge && isUnread && (
                                <TouchableOpacity
                                    onPress={handleAcknowledge}
                                    disabled={ackLoading}
                                    className="flex-1 flex-row items-center justify-center py-2 rounded-md bg-emerald-500/15 border border-emerald-500/30"
                                >
                                    {ackLoading ? (
                                        <ActivityIndicator size="small" color="#10b981" />
                                    ) : (
                                        <>
                                            <Check color="#10b981" size={14} />
                                            <Text className="text-emerald-500 text-xs font-black tracking-wider ml-1.5">ACKNOWLEDGE</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            )}
                            {onArchive && (
                                <TouchableOpacity
                                    onPress={handleArchive}
                                    disabled={archiveLoading}
                                    className="flex-1 flex-row items-center justify-center py-2 rounded-md bg-gray-800/50 border border-gray-700/50"
                                >
                                    {archiveLoading ? (
                                        <ActivityIndicator size="small" color="#737373" />
                                    ) : (
                                        <>
                                            <Archive color="#737373" size={14} />
                                            <Text className="text-gray-400 text-xs font-black tracking-wider ml-1.5">ARCHIVE</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                </View>
            )}
        </TouchableOpacity>
    );
});
