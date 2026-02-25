import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchGmailMessages } from '../api/gmail';
import { Notification } from '../types';
import { Config } from '../constants/config';
import { configureNotificationHandler } from './notificationConfig';

const BACKGROUND_TASK_NAME = Config.BACKGROUND_TASK_NAME;
const LAST_SEEN_KEY = Config.STORAGE_KEYS.LAST_SEEN_NOTIFICATION;

/**
 * Configure notification handler (single source of truth).
 */
configureNotificationHandler();

/**
 * Define the background task.
 * This runs periodically (minimum ~15 min on iOS, ~15 min on Android).
 */
TaskManager.defineTask(BACKGROUND_TASK_NAME, async () => {
    try {
        // Retrieve the persisted auth token
        const authRaw = await AsyncStorage.getItem('smartescape-auth-storage');
        if (!authRaw) {
            console.log('[BackgroundTask] No auth token found, skipping.');
            return BackgroundTask.BackgroundTaskResult.NoData;
        }

        const authState = JSON.parse(authRaw);
        const accessToken = authState?.state?.accessToken;
        if (!accessToken) {
            return BackgroundTask.BackgroundTaskResult.NoData;
        }

        // Fetch latest notifications
        const notifications = await fetchGmailMessages(accessToken, 5);
        if (notifications.length === 0) {
            return BackgroundTask.BackgroundTaskResult.NoData;
        }

        // Check if there are new notifications since last poll
        const lastSeenId = await AsyncStorage.getItem(LAST_SEEN_KEY);
        const newNotifications = lastSeenId
            ? notifications.filter((n) => n.id !== lastSeenId)
            : notifications;

        if (newNotifications.length === 0) {
            return BackgroundTask.BackgroundTaskResult.NoData;
        }

        // Save the latest notification ID
        await AsyncStorage.setItem(LAST_SEEN_KEY, notifications[0].id);

        // Trigger local push notifications for alerts/offline
        for (const notification of newNotifications) {
            if (notification.status === 'ALERT' || notification.status === 'OFFLINE') {
                await triggerLocalNotification(notification);
            }
        }

        return BackgroundTask.BackgroundTaskResult.NewData;
    } catch (error) {
        console.error('[BackgroundTask] Error:', error);
        return BackgroundTask.BackgroundTaskResult.Failed;
    }
});

/**
 * Triggers a local push notification for a given alert.
 */
async function triggerLocalNotification(notification: Notification) {
    const isAlert = notification.status === 'ALERT';

    await Notifications.scheduleNotificationAsync({
        content: {
            title: isAlert
                ? `🚨 ALERT: ${notification.systemId}`
                : `⚠️ ${notification.systemId} Offline`,
            body: notification.message,
            data: { notificationId: notification.id, systemId: notification.systemId },
            sound: 'default',
        },
        trigger: null, // Fire immediately
    });
}

/**
 * Registers the background task.
 * Call this once during app initialization.
 */
export async function registerBackgroundFetch() {
    try {
        await BackgroundTask.registerTaskAsync(BACKGROUND_TASK_NAME, {
            minimumInterval: 15 * 60, // 15 minutes minimum
        });
        console.log('[BackgroundService] Background task registered.');
    } catch (err) {
        console.error('[BackgroundService] Failed to register background task:', err);
    }
}

/**
 * Requests notification permissions from the user.
 */
export async function requestNotificationPermissions() {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== 'granted') {
        console.warn('[BackgroundService] Notification permissions not granted.');
        return false;
    }

    return true;
}
