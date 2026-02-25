import { View, FlatList, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '../../src/components/Header';
import { NotificationRow } from '../../src/components/NotificationRow';
import { useNotificationStore } from '../../src/store/notificationStore';
import { useLocalSearchParams, router } from 'expo-router';
import { ArrowLeft, MapPin, Clock, Activity } from 'lucide-react-native';
import { STATUS_COLORS } from '../../src/constants/statusTheme';

export default function SystemDetail() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { alertHistory, systems } = useNotificationStore();

    const system = systems.find((s) => s.id === id);
    const systemNotifications = alertHistory.filter((n) => n.systemId === id);

    const statusColor = STATUS_COLORS[system?.status || 'INFO'] || '#3b82f6';

    return (
        <View className="flex-1 bg-black">
            <SafeAreaView edges={['top']} className="flex-1">
                {/* Custom header with back button */}
                <View className="px-4 py-4 border-b border-gray-800/50 flex-row items-center">
                    <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
                        <ArrowLeft color="#ffffff" size={22} />
                    </TouchableOpacity>
                    <Text className="text-white font-black text-lg tracking-wider uppercase flex-1">
                        {id || 'System'}
                    </Text>
                    <View className="px-2.5 py-1 rounded-sm border" style={{ borderColor: statusColor }}>
                        <Text style={{ color: statusColor }} className="text-xs font-black tracking-widest">
                            {system?.status || 'UNKNOWN'}
                        </Text>
                    </View>
                </View>

                <View className="flex-1 p-4">
                    {/* System info card */}
                    <View className="p-4 rounded-lg border border-gray-800 bg-gray-900/50 mb-6">
                        <View className="flex-row items-center mb-3">
                            <Activity color={statusColor} size={18} />
                            <Text className="text-white font-bold text-base ml-2">{id}</Text>
                        </View>

                        <View className="flex-row items-center mb-2">
                            <MapPin color="#737373" size={14} />
                            <Text className="text-gray-400 text-sm ml-2">
                                {system?.location || 'Location not specified'}
                            </Text>
                        </View>

                        <View className="flex-row items-center">
                            <Clock color="#737373" size={14} />
                            <Text className="text-gray-400 text-sm ml-2">
                                Last seen: {system?.lastSeen ? new Date(system.lastSeen).toLocaleString() : 'N/A'}
                            </Text>
                        </View>
                    </View>

                    {/* Alert timeline */}
                    <Text className="text-gray-500 font-black tracking-widest mb-4 uppercase text-xs">
                        Alert History ({systemNotifications.length})
                    </Text>

                    <FlatList
                        data={systemNotifications}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => <NotificationRow notification={item} />}
                        contentContainerStyle={{ paddingBottom: 20 }}
                        ListEmptyComponent={
                            <View className="items-center py-12">
                                <Text className="text-gray-500 text-base">No alerts for this system.</Text>
                            </View>
                        }
                    />
                </View>
            </SafeAreaView>
        </View>
    );
}
