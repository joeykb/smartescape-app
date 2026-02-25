/**
 * API client with automatic token refresh on 401.
 * Previously this pattern was duplicated in index.tsx, feed.tsx, and compose.tsx.
 */

import { useAuthStore } from '../store/authStore';
import { fetchGmailMessages } from './gmail';
import { useNotificationStore } from '../store/notificationStore';

/**
 * Wraps any async function that takes an access token as its first argument.
 * On 401, refreshes the token and retries once.
 */
export async function withTokenRefresh<T>(
    fn: (token: string) => Promise<T>
): Promise<T> {
    const { accessToken, refreshToken } = useAuthStore.getState();

    if (!accessToken) {
        throw new Error('No access token available');
    }

    try {
        return await fn(accessToken);
    } catch (e: any) {
        if (e.message?.includes('401')) {
            const freshToken = await refreshToken();
            if (freshToken) {
                return await fn(freshToken);
            }
            throw new Error('Token refresh failed');
        }
        throw e;
    }
}

/**
 * Fetches notifications with automatic token refresh and store update.
 * Replaces the duplicate loadData() implementations in Dashboard and Feed.
 */
export async function fetchAndStoreNotifications(): Promise<void> {
    const { setNotifications } = useNotificationStore.getState();

    const data = await withTokenRefresh((token) =>
        fetchGmailMessages(token)
    );

    setNotifications(data);
}
