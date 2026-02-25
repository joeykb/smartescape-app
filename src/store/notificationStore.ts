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
    markAsRead: (id: string) => void;
    markArchived: (id: string) => void;
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
    const incomingMap = new Map(incoming.map(n => [n.id, n]));
    const seen = new Set<string>();

    // Update existing records with fresh data, and add new ones
    const merged: Notification[] = [];

    // First, update existing history entries with fresh data
    for (const n of existing) {
        const fresh = incomingMap.get(n.id);
        if (fresh) {
            // Update with latest data (especially isRead status)
            merged.push({ ...n, ...fresh });
            seen.add(n.id);
        } else {
            merged.push(n);
            seen.add(n.id);
        }
    }

    // Then add any new notifications we haven't seen
    for (const n of incoming) {
        if (!seen.has(n.id)) {
            merged.push(n);
        }
    }

    // Sort by timestamp descending, cap at 1000 records
    return merged
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 1000);
}

/**
 * Derives System objects from a list of Notifications.
 * Only unread (unacknowledged) alerts affect the system's severity status.
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

    // First pass: collect all systems and their latest seen time
    for (const n of notifications) {
        const existing = systemMap.get(n.systemId);
        if (!existing) {
            systemMap.set(n.systemId, {
                id: n.systemId,
                status: 'HEALTHY',
                lastSeen: n.timestamp,
            });
        } else if (new Date(n.timestamp) > new Date(existing.lastSeen)) {
            systemMap.set(n.systemId, { ...existing, lastSeen: n.timestamp });
        }
    }

    // Second pass: determine status from unread alerts only
    for (const n of notifications) {
        if (n.isRead) continue; // Acknowledged alerts don't affect status
        const existing = systemMap.get(n.systemId)!;
        if (severityOrder[n.status] > severityOrder[existing.status]) {
            systemMap.set(n.systemId, { ...existing, status: n.status });
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

            markAsRead: (id) => {
                const { alertHistory, liveNotifications } = get();
                set({
                    alertHistory: alertHistory.map(n =>
                        n.id === id ? { ...n, isRead: true } : n
                    ),
                    liveNotifications: liveNotifications.map(n =>
                        n.id === id ? { ...n, isRead: true } : n
                    ),
                });
            },

            markArchived: (id) => {
                const { alertHistory } = get();
                set({
                    alertHistory: alertHistory.map(n =>
                        n.id === id ? { ...n, isArchived: true } : n
                    ),
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
