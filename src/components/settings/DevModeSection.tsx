import { View, Text, TouchableOpacity, ActivityIndicator, Switch, TextInput, Alert } from 'react-native';
import { Code, Zap, Shuffle, Hash, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useNotificationStore } from '../../store/notificationStore';
import { sendSampleAlerts } from '../../utils/sampleData';

/**
 * Developer mode section for Settings screen.
 * Allows sending sample alerts and clearing history.
 */
export function DevModeSection() {
    const { accessToken, userInfo, refreshToken } = useAuthStore();
    const { alertHistory, clearHistory } = useNotificationStore();

    const [devMode, setDevMode] = useState(false);
    const [alertCount, setAlertCount] = useState('5');
    const [randomize, setRandomize] = useState(true);
    const [sending, setSending] = useState(false);
    const [sendProgress, setSendProgress] = useState('');

    const handleGenerateAlerts = async () => {
        if (!accessToken || !userInfo?.email) {
            Alert.alert('Not Signed In', 'Please sign in first to send sample alerts to your inbox.');
            return;
        }

        const count = Math.min(Math.max(parseInt(alertCount, 10) || 5, 1), 50);

        Alert.alert(
            'Send Sample Alerts',
            `This will send ${count} real email${count !== 1 ? 's' : ''} to ${userInfo.email}. Continue?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Send',
                    onPress: async () => {
                        try {
                            setSending(true);
                            setSendProgress(`Sending 0/${count}...`);

                            let token = accessToken;
                            const freshToken = await refreshToken();
                            if (freshToken) token = freshToken;

                            const result = await sendSampleAlerts(
                                token!,
                                userInfo.email,
                                count,
                                randomize,
                                (sent: number, total: number) => {
                                    setSendProgress(`Sending ${sent}/${total}...`);
                                }
                            );

                            setSendProgress('');

                            if (result.sent > 0) {
                                Alert.alert(
                                    'Done!',
                                    `${result.sent}/${count} alerts sent to ${userInfo.email}.\n\nGo to Dashboard and pull to refresh to see them.`
                                );
                            } else {
                                const errDetail = result.errors.length > 0
                                    ? `\n\nErrors:\n${result.errors.slice(0, 3).join('\n')}`
                                    : '';
                                Alert.alert('Failed', `0/${count} alerts sent.${errDetail}`);
                            }
                        } catch (e: any) {
                            console.error('[DevMode] Generate error:', e);
                            Alert.alert('Error', `Failed: ${e?.message || String(e)}`);
                        } finally {
                            setSending(false);
                            setSendProgress('');
                        }
                    },
                },
            ]
        );
    };

    const handleClearAlerts = () => {
        clearHistory();
        Alert.alert('Cleared', 'All historical alert data removed.');
    };

    return (
        <>
            <Text className="text-gray-500 font-black tracking-widest mb-4 uppercase text-xs mt-2">Developer</Text>
            <View className="p-4 rounded-lg border border-gray-800 bg-gray-900/50 mb-6">
                <View className="flex-row items-center justify-between py-2">
                    <View className="flex-row items-center">
                        <Code color="#a3a3a3" size={20} style={{ marginRight: 12 }} />
                        <Text className="text-white text-base">Developer Mode</Text>
                    </View>
                    <Switch
                        value={devMode}
                        onValueChange={setDevMode}
                        trackColor={{ false: '#333', true: '#10b98140' }}
                        thumbColor={devMode ? '#10b981' : '#737373'}
                    />
                </View>

                {devMode && (
                    <>
                        <View className="h-[1px] bg-gray-800 my-3" />

                        <Text className="text-gray-600 text-xs mb-3">
                            Sends real emails to your inbox so alerts persist on refresh.
                        </Text>

                        {/* Alert Count */}
                        <View className="flex-row items-center justify-between py-2">
                            <View className="flex-row items-center">
                                <Hash color="#a3a3a3" size={20} style={{ marginRight: 12 }} />
                                <Text className="text-white text-base">Alert Count (1-50)</Text>
                            </View>
                            <TextInput
                                className="bg-gray-800 border border-gray-700 rounded-md px-3 py-1.5 text-white text-center w-16 text-sm font-bold"
                                value={alertCount}
                                onChangeText={setAlertCount}
                                keyboardType="number-pad"
                                maxLength={2}
                            />
                        </View>

                        {/* Randomizer Toggle */}
                        <View className="flex-row items-center justify-between py-2 mt-1">
                            <View className="flex-row items-center">
                                <Shuffle color="#a3a3a3" size={20} style={{ marginRight: 12 }} />
                                <View>
                                    <Text className="text-white text-base">Randomize</Text>
                                    <Text className="text-gray-600 text-xs">Off = mostly critical alerts</Text>
                                </View>
                            </View>
                            <Switch
                                value={randomize}
                                onValueChange={setRandomize}
                                trackColor={{ false: '#333', true: '#10b98140' }}
                                thumbColor={randomize ? '#10b981' : '#737373'}
                            />
                        </View>

                        <View className="h-[1px] bg-gray-800 my-3" />

                        {/* Generate Button */}
                        <TouchableOpacity
                            className={`rounded-lg p-3 items-center flex-row justify-center mb-2 ${sending ? 'bg-gray-800' : 'bg-emerald-500'}`}
                            onPress={handleGenerateAlerts}
                            disabled={sending}
                        >
                            {sending ? (
                                <>
                                    <ActivityIndicator color="#10b981" size="small" />
                                    <Text className="text-emerald-500 font-black text-sm ml-2 tracking-wider">
                                        {sendProgress}
                                    </Text>
                                </>
                            ) : (
                                <>
                                    <Zap color="#000" size={16} />
                                    <Text className="text-black font-black text-sm ml-2 tracking-wider uppercase">
                                        Send {alertCount || '5'} Alerts to Inbox
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>

                        {/* Clear Button */}
                        <TouchableOpacity
                            className="bg-gray-800 border border-gray-700 rounded-lg p-3 items-center flex-row justify-center"
                            onPress={handleClearAlerts}
                        >
                            <Trash2 color="#ef4444" size={16} />
                            <Text className="text-red-400 font-black text-sm ml-2 tracking-wider uppercase">
                                Clear All History ({alertHistory.length})
                            </Text>
                        </TouchableOpacity>
                    </>
                )}
            </View>
        </>
    );
}
