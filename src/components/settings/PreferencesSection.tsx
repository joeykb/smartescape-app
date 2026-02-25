import { View, Text, Switch, ActivityIndicator, Alert } from 'react-native';
import { Settings as SettingsIcon, Bell } from 'lucide-react-native';
import { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { usePushStore } from '../../store/pushStore';
import { registerForPushNotifications, registerDeviceWithServer, unregisterDeviceFromServer } from '../../services/pushNotifications';

/**
 * Preferences section for Settings screen.
 * Shows background sync status and push notification toggle.
 */
export function PreferencesSection() {
    const { accessToken, userInfo } = useAuthStore();
    const { enabled: pushEnabled, token: pushToken, setEnabled: setPushEnabled, setToken: setPushToken, reset: resetPush } = usePushStore();
    const [pushLoading, setPushLoading] = useState(false);

    const handlePushToggle = async (enable: boolean) => {
        if (!accessToken || !userInfo?.email) {
            Alert.alert('Sign in first', 'You need to be signed in to enable push notifications.');
            return;
        }

        setPushLoading(true);
        try {
            if (enable) {
                const token = await registerForPushNotifications();
                if (!token) {
                    Alert.alert('Permission Required', 'Please allow notifications in your device settings.');
                    setPushLoading(false);
                    return;
                }
                setPushToken(token);

                const registered = await registerDeviceWithServer(userInfo.email, token, accessToken);
                if (registered) {
                    setPushEnabled(true);
                    Alert.alert('Push Enabled', 'You will receive push notifications for critical alerts even when the app is closed.');
                } else {
                    setPushToken(null);
                    Alert.alert('Registration Failed', 'Could not register with the notification server. Make sure the server is running.');
                }
            } else {
                if (userInfo?.email) {
                    await unregisterDeviceFromServer(userInfo.email, pushToken || undefined);
                }
                resetPush();
                Alert.alert('Push Disabled', 'You will no longer receive push notifications.');
            }
        } catch (err: any) {
            console.error('[Push] Toggle error:', err);
            Alert.alert('Error', err.message || 'Failed to toggle push notifications.');
        } finally {
            setPushLoading(false);
        }
    };

    return (
        <>
            <Text className="text-gray-500 font-black tracking-widest mb-4 uppercase text-xs mt-2">Preferences</Text>
            <View className="p-4 rounded-lg border border-gray-800 bg-gray-900/50 mb-6">
                <View className="flex-row items-center justify-between py-2">
                    <View className="flex-row items-center">
                        <SettingsIcon color="#a3a3a3" size={20} style={{ marginRight: 12 }} />
                        <Text className="text-white text-base">Background Sync</Text>
                    </View>
                    <Text className="text-emerald-500 font-bold text-xs tracking-wider">ENABLED</Text>
                </View>
                <View className="h-[1px] bg-gray-800 my-2" />
                <View className="flex-row items-center justify-between py-2">
                    <View className="flex-row items-center flex-1">
                        <Bell color={pushEnabled ? '#10b981' : '#a3a3a3'} size={20} style={{ marginRight: 12 }} />
                        <View>
                            <Text className="text-white text-base">Push Notifications</Text>
                            <Text className="text-gray-600 text-xs mt-0.5">Alerts when app is closed</Text>
                        </View>
                    </View>
                    {pushLoading ? (
                        <ActivityIndicator size="small" color="#10b981" />
                    ) : (
                        <Switch
                            value={pushEnabled}
                            onValueChange={handlePushToggle}
                            trackColor={{ false: '#333', true: '#10b98140' }}
                            thumbColor={pushEnabled ? '#10b981' : '#737373'}
                        />
                    )}
                </View>
            </View>
        </>
    );
}
