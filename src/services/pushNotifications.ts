import * as Notifications from 'expo-notifications';
import { Platform, Alert } from 'react-native';
import Constants from 'expo-constants';

// === Configuration ===
// Update this to your Cloud Run URL after deployment
const SERVER_URL = 'https://smartescape-server-234622472801.us-east1.run.app';

// Configure notification behavior
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

/**
 * Register for push notifications and get the device token.
 * Returns the FCM token or null if registration fails.
 */
export async function registerForPushNotifications(): Promise<string | null> {
    // Check permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== 'granted') {
        console.warn('[Push] Permission not granted');
        return null;
    }

    // Set up Android notification channel
    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('smartescape-alerts', {
            name: 'Smart Escape Alerts',
            importance: Notifications.AndroidImportance.HIGH,
            sound: 'default',
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#10b981',
        });
    }

    // Get the device push token (FCM for Android)
    try {
        const tokenData = await Notifications.getDevicePushTokenAsync();
        console.log('[Push] Device token:', tokenData.data);
        return tokenData.data as string;
    } catch (err) {
        console.error('[Push] Failed to get device token:', err);
        return null;
    }
}

/**
 * Register this device with the SmartEscape server.
 */
export async function registerDeviceWithServer(
    email: string,
    pushToken: string,
    accessToken: string
): Promise<boolean> {
    try {
        const res = await fetch(`${SERVER_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, pushToken, accessToken }),
        });

        if (!res.ok) {
            const body = await res.text();
            console.error('[Push] Registration failed:', body);
            return false;
        }

        console.log('[Push] Device registered with server');
        return true;
    } catch (err) {
        console.error('[Push] Server registration error:', err);
        return false;
    }
}

/**
 * Unregister this device from the SmartEscape server.
 */
export async function unregisterDeviceFromServer(
    email: string,
    pushToken?: string
): Promise<boolean> {
    try {
        const res = await fetch(`${SERVER_URL}/unregister`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, pushToken }),
        });

        return res.ok;
    } catch (err) {
        console.error('[Push] Unregister error:', err);
        return false;
    }
}

/**
 * Add a listener for when a notification is tapped (app was in background/closed).
 * Returns a cleanup function.
 */
export function addNotificationResponseListener(
    handler: (systemId: string, status: string) => void
): () => void {
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
        const data = response.notification.request.content.data;
        if (data?.systemId) {
            handler(data.systemId as string, data.status as string);
        }
    });

    return () => subscription.remove();
}
