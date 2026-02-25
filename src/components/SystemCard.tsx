import { View, Text, TouchableOpacity } from 'react-native';
import { System } from '../types';
import { ChevronRight } from 'lucide-react-native';
import React, { useEffect } from 'react';
import { STATUS_THEME } from '../constants/statusTheme';
import { timeAgo } from '../utils/formatTime';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withSequence,
    withTiming,
} from 'react-native-reanimated';

interface SystemCardProps {
    system: System;
    onPress?: () => void;
}

export const SystemCard = React.memo(function SystemCard({ system, onPress }: SystemCardProps) {
    const config = STATUS_THEME[system.status] || STATUS_THEME.INFO;
    const Icon = config.icon;
    const isCritical = system.status === 'ALERT' || system.status === 'OFFLINE';
    const pulseOpacity = useSharedValue(1);

    // Pulsing dot for critical statuses — runs on UI thread via Reanimated
    useEffect(() => {
        if (isCritical) {
            pulseOpacity.value = withRepeat(
                withSequence(
                    withTiming(0.2, { duration: 1000 }),
                    withTiming(1, { duration: 1000 }),
                ),
                -1, // infinite
            );
        } else {
            pulseOpacity.value = 1;
        }
    }, [isCritical]);

    const pulseStyle = useAnimatedStyle(() => ({
        opacity: pulseOpacity.value,
    }));

    const timeSince = timeAgo(system.lastSeen);

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
                                style={[pulseStyle, {
                                    position: 'absolute',
                                    top: -2,
                                    right: -2,
                                    width: 8,
                                    height: 8,
                                    borderRadius: 4,
                                    backgroundColor: config.color,
                                }]}
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
});
