import { View, Text, TouchableOpacity, ActivityIndicator, Image, Alert } from 'react-native';
import { LogOut, CheckCircle, ShieldAlert } from 'lucide-react-native';
import { useState } from 'react';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { useAuthStore } from '../../store/authStore';
import { fetchGoogleUserInfo, GOOGLE_WEB_CLIENT_ID } from '../../api/auth';
import { Config } from '../../constants/config';

GoogleSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    iosClientId: Config.GOOGLE_IOS_CLIENT_ID,
    scopes: [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/gmail.modify',
    ],
    offlineAccess: true,
});

/**
 * Authentication section for Settings screen.
 * Shows signed-in user info or sign-in prompt.
 */
export function AuthSection() {
    const { accessToken, userInfo, setAuth, logout } = useAuthStore();
    const [loading, setLoading] = useState(false);

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

    return (
        <>
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
        </>
    );
}
