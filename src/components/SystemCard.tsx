import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { System } from '../types';
import { Wifi, WifiOff, AlertTriangle, AlertCircle, CheckCircle, ChevronRight } from 'lucide-react-native';
import { useEffect, useRef } from 'react';

interface SystemCardProps {
    system: System;
    onPress?: () => void;
}

const statusConfig: Record<string, { icon: any; color: string; bgColor: string; borderColor: string; label: string }> = {
    OFFLINE: { icon: WifiOff, color: '#ef4444', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/30', label: 'OFFLINE' },
    ALERT: { icon: AlertCircle, color: '#ef4444', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/30', label: 'ALERT' },
    WARNING: { icon: AlertTriangle, color: '#f59e0b', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/30', label: 'WARNING' },
    INFO: { icon: AlertCircle, color: '#3b82f6', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/30', label: 'INFO' },
    HEALTHY: { icon: CheckCircle, color: '#10b981', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/30', label: 'HEALTHY' },
};

export function SystemCard({ system, onPress }: SystemCardProps) {
    const config = statusConfig[system.status] || statusConfig.INFO;
    const Icon = config.icon;
    const isCritical = system.status === 'ALERT' || system.status === 'OFFLINE';
    const pulseAnim = useRef(new Animated.Value(1)).current;

    // Pulsing dot for critical statuses
    useEffect(() => {
        if (isCritical) {
            const pulse = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 0.2, duration: 1000, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
                ])
            );
            pulse.start();
            return () => pulse.stop();
        }
    }, [isCritical]);

    const timeSince = getTimeSince(system.lastSeen);

    return (
        <TouchableOpacity
            className={`p-4 rounded-lg border ${config.borderColor} ${config.bgColor} mb-3`}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View className="flex-row items-center justify-between">
                <View className="flex-row items-center flex-1">
                    {/* Status icon with pulse */}
                    <View className="w-10 h-10 rounded-md bg-gray-800 items-center justify-center" style={{ marginRight: 12 }}>
                        <Icon color={config.color} size={20} />
                        {isCritical && (
                            <Animated.View
                                style={{
                                    position: 'absolute',
                                    top: -2,
                                    right: -2,
                                    width: 8,
                                    height: 8,
                                    borderRadius: 4,
                                    backgroundColor: config.color,
                                    opacity: pulseAnim,
                                }}
                            />
                        )}
                    </View>
                    <View className="flex-1">
                        <Text className="text-white font-bold text-base tracking-wide">{system.id}</Text>
                        <Text className="text-gray-500 text-xs mt-0.5">
                            {system.location || 'Unknown Location'} • {timeSince}
                        </Text>
                    </View>
                </View>
                <View className="flex-row items-center">
                    <View className="px-2.5 py-1 rounded-sm border" style={{ borderColor: config.color + '50', marginRight: 8 }}>
                        <Text style={{ color: config.color }} className="text-xs font-black tracking-widest">
                            {config.label}
                        </Text>
                    </View>
                    <ChevronRight color="#525252" size={16} />
                </View>
            </View>
        </TouchableOpacity>
    );
}

function getTimeSince(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
}
