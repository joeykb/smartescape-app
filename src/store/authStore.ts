import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

interface UserInfo {
    id: string;
    email: string;
    name: string;
    picture: string;
}

interface AuthState {
    accessToken: string | null;
    userInfo: UserInfo | null;
    setAuth: (token: string, user: UserInfo) => void;
    logout: () => void;
    refreshToken: () => Promise<string | null>;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            accessToken: null,
            userInfo: null,
            setAuth: (accessToken, userInfo) => set({ accessToken, userInfo }),
            logout: () => set({ accessToken: null, userInfo: null }),
            refreshToken: async () => {
                try {
                    const tokens = await GoogleSignin.getTokens();
                    if (tokens.accessToken) {
                        set({ accessToken: tokens.accessToken });
                        return tokens.accessToken;
                    }
                } catch (e) {
                    console.warn('[Auth] Token refresh failed, attempting silent sign-in...');
                    try {
                        await GoogleSignin.signInSilently();
                        const tokens = await GoogleSignin.getTokens();
                        if (tokens.accessToken) {
                            set({ accessToken: tokens.accessToken });
                            return tokens.accessToken;
                        }
                    } catch (silentErr) {
                        console.error('[Auth] Silent sign-in failed:', silentErr);
                        get().logout();
                    }
                }
                return null;
            },
        }),
        {
            name: 'smartescape-auth-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
