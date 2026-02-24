import { View, Text, TouchableOpacity, ActivityIndicator, Image, Switch, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView } from 'react-native';
import { Header } from '../src/components/Header';
import { Settings as SettingsIcon, LogOut, CheckCircle, ShieldAlert, Code, Zap, Shuffle, Hash, Trash2, Bell } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { useAuthStore } from '../src/store/authStore';
import { useNotificationStore } from '../src/store/notificationStore';
import { fetchGoogleUserInfo, GOOGLE_WEB_CLIENT_ID } from '../src/api/auth';
import { sendSampleAlerts } from '../src/utils/sampleData';
import { registerForPushNotifications, registerDeviceWithServer, unregisterDeviceFromServer } from '../src/services/pushNotifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

GoogleSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    iosClientId: '234622472801-hpn7gvvl127odbifdalm8uked1bhgjee.apps.googleusercontent.com',
    scopes: ['https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/gmail.send'],
    offlineAccess: true,
});

export default function Settings() {
    const { accessToken, userInfo, setAuth, logout, refreshToken } = useAuthStore();
    const { setNotifications, alertHistory, clearHistory } = useNotificationStore();
    const [loading, setLoading] = useState(false);

    // Developer mode state
    const [devMode, setDevMode] = useState(false);
    const [alertCount, setAlertCount] = useState('5');
    const [randomize, setRandomize] = useState(true);
    const [sending, setSending] = useState(false);
    const [sendProgress, setSendProgress] = useState('');

    // Push notification state (persisted)
    const [pushEnabled, setPushEnabled] = useState(false);
    const [pushLoading, setPushLoading] = useState(false);
    const [pushToken, setPushToken] = useState<string | null>(null);

    // Load persisted push state on mount
    useEffect(() => {
        AsyncStorage.getItem('smartescape-push-enabled').then(val => {
            if (val === 'true') setPushEnabled(true);
        });
        AsyncStorage.getItem('smartescape-push-token').then(val => {
            if (val) setPushToken(val);
        });
    }, []);

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
                    await AsyncStorage.setItem('smartescape-push-enabled', 'true');
                    await AsyncStorage.setItem('smartescape-push-token', token);
                    Alert.alert('Push Enabled', 'You will receive push notifications for critical alerts even when the app is closed.');
                } else {
                    Alert.alert('Registration Failed', 'Could not register with the notification server. Make sure the server is running.');
                }
            } else {
                if (userInfo?.email) {
                    await unregisterDeviceFromServer(userInfo.email, pushToken || undefined);
                }
                setPushEnabled(false);
                setPushToken(null);
                await AsyncStorage.setItem('smartescape-push-enabled', 'false');
                await AsyncStorage.removeItem('smartescape-push-token');
                Alert.alert('Push Disabled', 'You will no longer receive push notifications.');
            }
        } catch (err: any) {
            console.error('[Push] Toggle error:', err);
            Alert.alert('Error', err.message || 'Failed to toggle push notifications.');
        } finally {
            setPushLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        try {
            setLoading(true);
            await GoogleSignin.hasPlayServices();
            await GoogleSignin.signIn();
            const tokens = await GoogleSignin.getTokens();
            const token = tokens.accessToken;

            const user = await fetchGoogleUserInfo(token);
            setAuth(token, user);
        } catch (error: any) {
            if (error.code === statusCodes.SIGN_IN_CANCELLED) {
                console.log('[Auth] User cancelled sign-in');
            } else if (error.code === statusCodes.IN_PROGRESS) {
                console.log('[Auth] Sign-in already in progress');
            } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
                console.error('[Auth] Play Services not available');
            } else {
                console.error('[Auth] Sign-in error:', error);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            await GoogleSignin.signOut();
        } catch (e) { }
        logout();
    };

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
                                (sent, total) => {
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
        <View className="flex-1 bg-black">
            <SafeAreaView edges={['top']} className="flex-1">
                <Header title="Settings" />

                <ScrollView className="flex-1 p-4">
                    {/* Authentication Section */}
                    <Text className="text-gray-500 font-black tracking-widest mb-4 uppercase text-xs">Authentication</Text>

                    {accessToken && userInfo ? (
                        <View className="p-4 rounded-lg border border-emerald-500/30 bg-emerald-500/5 mb-6 flex-row items-center justify-between">
                            <View className="flex-row items-center">
                                {userInfo.picture ? (
                                    <Image source={{ uri: userInfo.picture }} className="w-12 h-12 rounded-full mr-3" />
                                ) : (
                                    <CheckCircle color="#10b981" size={24} style={{ marginRight: 12 }} />
                                )}
                                <View>
                                    <Text className="text-white font-bold text-base">{userInfo.name || 'Connected'}</Text>
                                    <Text className="text-gray-400 text-sm">{userInfo.email}</Text>
                                </View>
                            </View>
                            <TouchableOpacity className="p-2.5 bg-gray-900 rounded-lg border border-gray-800" onPress={handleLogout}>
                                <LogOut color="#ef4444" size={20} />
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View className="p-4 rounded-lg border border-gray-800 bg-gray-900/50 mb-6">
                            <View className="flex-row items-center mb-3">
                                <ShieldAlert color="#ef4444" size={24} style={{ marginRight: 12 }} />
                                <Text className="text-white font-bold text-base">Not Authorized</Text>
                            </View>
                            <Text className="text-gray-400 text-sm mb-4">
                                Sign in with the authorized Smart Escape Google account to monitor your systems.
                            </Text>
                            <TouchableOpacity
                                className="bg-emerald-500 rounded-lg p-3.5 items-center flex-row justify-center"
                                disabled={loading}
                                onPress={handleGoogleSignIn}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#000000" />
                                ) : (
                                    <Text className="text-black font-black text-sm tracking-wider uppercase">Sign In with Google</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Preferences Section */}
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

                    {/* Developer Mode Section */}
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
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}
