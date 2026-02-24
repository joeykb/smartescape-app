import { View, Text, Image, TouchableOpacity } from 'react-native';
import { ReactNode } from 'react';

interface HeaderProps {
    title: string;
    rightAction?: ReactNode;
}

export function Header({ title, rightAction }: HeaderProps) {
    return (
        <View className="px-4 py-4 border-b border-gray-800/50">
            <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                    <Image
                        source={require('../../assets/se-logo.png')}
                        className="w-8 h-8"
                        style={{ marginRight: 10 }}
                        resizeMode="contain"
                    />
                    <Text className="text-white font-black text-lg tracking-wider uppercase">
                        {title}
                    </Text>
                </View>
                {rightAction && (
                    <View>{rightAction}</View>
                )}
            </View>
        </View>
    );
}
