import * as Notifications from 'expo-notifications';

/**
 * Single source of truth for notification handler configuration.
 * Previously this was duplicated in backgroundService.ts and pushNotifications.ts.
 */
export function configureNotificationHandler() {
    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldPlaySound: true,
            shouldSetBadge: true,
            shouldShowBanner: true,
            shouldShowList: true,
        }),
    });
}
