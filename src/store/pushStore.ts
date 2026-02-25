import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Config } from '../constants/config';

interface PushState {
    enabled: boolean;
    token: string | null;
    setEnabled: (enabled: boolean) => void;
    setToken: (token: string | null) => void;
    reset: () => void;
}

/**
 * Push notification state persisted via Zustand + AsyncStorage.
 * Replaces raw AsyncStorage reads for push-enabled and push-token.
 */
export const usePushStore = create<PushState>()(
    persist(
        (set) => ({
            enabled: false,
            token: null,
            setEnabled: (enabled) => set({ enabled }),
            setToken: (token) => set({ token }),
            reset: () => set({ enabled: false, token: null }),
        }),
        {
            name: Config.STORAGE_KEYS.PUSH_ENABLED, // reuses existing key
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
