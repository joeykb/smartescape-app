import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Notification, System, NotificationStatus } from '../types';

interface NotificationState {
    // Live data (from latest Gmail fetch, used for Dashboard systems)
    liveNotifications: Notification[];
    systems: System[];

    // Historical archive (persisted, never lost)
    alertHistory: Notification[];

    isLoading: boolean;
    lastFetchedAt: string | null;

    // Actions
    setNotifications: (notifications: Notification[]) => void;
    setLoading: (loading: boolean) => void;
    clearHistory: () => void;
}

/**
 * Deduplicates notifications with identical systemId + message.
 */
function deduplicateNotifications(notifications: Notification[]): Notification[] {
    const grouped = new Map<string, Notification>();

    for (const n of notifications) {
        const key = `${n.systemId}::${n.message.trim().toLowerCase()}`;
        const existing = grouped.get(key);

        if (!existing) {
            grouped.set(key, { ...n, count: 1 });
        } else {
            const isMostRecent = new Date(n.timestamp) > new Date(existing.timestamp);
            grouped.set(key, {
                ...(isMostRecent ? n : existing),
                count: (existing.count || 1) + 1,
                isRead: existing.isRead && n.isRead,
            });
        }
    }

    return Array.from(grouped.values()).sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
}

/**
 * Merges new notifications into the historical archive.
 * Uses notification ID to prevent duplicates.
 */
function mergeIntoHistory(existing: Notification[], incoming: Notification[]): Notification[] {
    const seen = new Set(existing.map(n => n.id));
    const merged = [...existing];

    for (const n of incoming) {
        if (!seen.has(n.id)) {
            merged.push(n);
            seen.add(n.id);
        }
    }

    // Sort by timestamp descending, cap at 1000 records
    return merged
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 1000);
}

/**
 * Derives System objects from a list of Notifications.
 */
function deriveSystemsFromNotifications(notifications: Notification[]): System[] {
    const systemMap = new Map<string, System>();

    const severityOrder: Record<NotificationStatus, number> = {
        ALERT: 4,
        OFFLINE: 3,
        WARNING: 2,
        INFO: 1,
        HEALTHY: 0,
    };

    for (const n of notifications) {
        const existing = systemMap.get(n.systemId);

        if (!existing || severityOrder[n.status] > severityOrder[existing.status]) {
            systemMap.set(n.systemId, {
                id: n.systemId,
                status: n.status,
                lastSeen: n.timestamp,
            });
        } else if (new Date(n.timestamp) > new Date(existing.lastSeen)) {
            systemMap.set(n.systemId, {
                ...existing,
                lastSeen: n.timestamp,
            });
        }
    }

    return Array.from(systemMap.values());
}

export const useNotificationStore = create<NotificationState>()(
    persist(
        (set, get) => ({
            liveNotifications: [],
            systems: [],
            alertHistory: [],
            isLoading: false,
            lastFetchedAt: null,

            setNotifications: (rawNotifications) => {
                const { alertHistory } = get();

                // Merge into persistent history
                const updatedHistory = mergeIntoHistory(alertHistory, rawNotifications);

                // Live data for Dashboard (only from current fetch)
                const liveNotifications = deduplicateNotifications(rawNotifications);

                set({
                    liveNotifications,
                    systems: deriveSystemsFromNotifications(rawNotifications),
                    alertHistory: updatedHistory,
                    lastFetchedAt: new Date().toISOString(),
                });
            },

            setLoading: (isLoading) => set({ isLoading }),

            clearHistory: () => set({ alertHistory: [], liveNotifications: [], systems: [] }),
        }),
        {
            name: 'smartescape-notifications-storage',
            storage: createJSONStorage(() => AsyncStorage),
            // Only persist the alert history, not transient state
            partialize: (state) => ({
                alertHistory: state.alertHistory,
            }),
        }
    )
);
