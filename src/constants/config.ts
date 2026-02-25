import Constants from 'expo-constants';

/**
 * Centralized app configuration.
 * All secrets and environment-specific values live here
 * instead of being scattered across the codebase.
 *
 * TODO: Migrate to app.config.ts `extra` for true env-var support.
 */

const extra = Constants.expoConfig?.extra ?? {};

export const Config = {
    // Google OAuth
    GOOGLE_WEB_CLIENT_ID:
        extra.googleWebClientId ??
        '234622472801-808k3higs0vvq12hunck8pka4fsilb5p.apps.googleusercontent.com',

    GOOGLE_ANDROID_CLIENT_ID:
        extra.googleAndroidClientId ??
        '234622472801-cnpg133d0be04u81bj28p363bfhcgipt.apps.googleusercontent.com',

    GOOGLE_IOS_CLIENT_ID:
        extra.googleIosClientId ??
        '234622472801-hpn7gvvl127odbifdalm8uked1bhgjee.apps.googleusercontent.com',

    // SmartEscape Server
    SERVER_URL:
        extra.serverUrl ??
        'https://smartescape-server-234622472801.us-east1.run.app',

    // Gmail API
    GMAIL_QUERY: 'subject:(SmartEscape OR "Smart Escape" OR SMART-ESC)',
    DEFAULT_MAX_RESULTS: 20,

    // Background Task
    BACKGROUND_TASK_NAME: 'SMARTESCAPE_GMAIL_POLL',
    BACKGROUND_POLL_INTERVAL: 15 * 60, // 15 minutes

    // Auto-refresh
    AUTO_REFRESH_SECONDS: 60,

    // Storage Keys
    STORAGE_KEYS: {
        AUTH: 'smartescape-auth-storage',
        NOTIFICATIONS: 'smartescape-notifications-storage',
        DASHBOARD_PREFS: 'smartescape-dashboard-prefs',
        LAST_SEEN_NOTIFICATION: 'smartescape-last-seen-notification-id',
        PUSH_ENABLED: 'smartescape-push-enabled',
        PUSH_TOKEN: 'smartescape-push-token',
    },
} as const;
