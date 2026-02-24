import { View, Text, TouchableOpacity } from 'react-native';
import { Notification, NotificationStatus } from '../types';
import { AlertCircle, AlertTriangle, WifiOff, Info, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react-native';
import { useState } from 'react';

interface NotificationRowProps {
    notification: Notification;
}

const iconMap: Record<NotificationStatus, { icon: any; color: string }> = {
    ALERT: { icon: AlertCircle, color: '#ef4444' },
    OFFLINE: { icon: WifiOff, color: '#ef4444' },
    WARNING: { icon: AlertTriangle, color: '#f59e0b' },
    INFO: { icon: Info, color: '#3b82f6' },
    HEALTHY: { icon: CheckCircle, color: '#10b981' },
};

export function NotificationRow({ notification }: NotificationRowProps) {
    const [expanded, setExpanded] = useState(false);
    const config = iconMap[notification.status] || iconMap.INFO;
    const Icon = config.icon;
    const isUnread = !notification.isRead;
    const count = notification.count || 1;

    const timeStr = new Date(notification.timestamp).toLocaleString(undefined, {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });

    const fullDate = new Date(notification.timestamp).toLocaleString(undefined, {
        weekday: 'short', year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
    });

    return (
        <TouchableOpacity
            className={`p-3 rounded-lg mb-2 border ${isUnread ? 'border-gray-700 bg-gray-900/80' : 'border-gray-800/30 bg-transparent'}`}
            onPress={() => setExpanded(!expanded)}
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
                </View>
            )}
        </TouchableOpacity>
    );
}
