import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type DashboardCardId = 'active-alerts' | 'analytics' | 'systems';

export interface DashboardCardConfig {
    id: DashboardCardId;
    label: string;
    visible: boolean;
}

interface DashboardPrefsState {
    cards: DashboardCardConfig[];
    setCardVisibility: (id: DashboardCardId, visible: boolean) => void;
    moveCard: (id: DashboardCardId, direction: 'up' | 'down') => void;
    resetDefaults: () => void;
}

const DEFAULT_CARDS: DashboardCardConfig[] = [
    { id: 'active-alerts', label: 'Active Alerts', visible: true },
    { id: 'analytics', label: 'Analytics', visible: true },
    { id: 'systems', label: 'Systems', visible: true },
];

export const useDashboardPrefsStore = create<DashboardPrefsState>()(
    persist(
        (set, get) => ({
            cards: [...DEFAULT_CARDS],

            setCardVisibility: (id, visible) => {
                set({
                    cards: get().cards.map(c =>
                        c.id === id ? { ...c, visible } : c
                    ),
                });
            },

            moveCard: (id, direction) => {
                const cards = [...get().cards];
                const index = cards.findIndex(c => c.id === id);
                if (index < 0) return;

                const newIndex = direction === 'up' ? index - 1 : index + 1;
                if (newIndex < 0 || newIndex >= cards.length) return;

                [cards[index], cards[newIndex]] = [cards[newIndex], cards[index]];
                set({ cards });
            },

            resetDefaults: () => set({ cards: [...DEFAULT_CARDS] }),
        }),
        {
            name: 'smartescape-dashboard-prefs',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
