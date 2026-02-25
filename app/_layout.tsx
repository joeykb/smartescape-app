import '../global.css'; // NativeWind setup
import { Tabs, router } from 'expo-router';
import { Home, Bell, Settings } from 'lucide-react-native';
import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { useAuthStore } from '../src/store/authStore';
import { useNotificationStore } from '../src/store/notificationStore';
import { markMessageAsRead, archiveMessage } from '../src/api/gmail';
import { withTokenRefresh } from '../src/api/apiClient';

export default function RootLayout() {
    useEffect(() => {
        async function init() {
            try {
                const { requestNotificationPermissions, registerBackgroundFetch } =
                    require('../src/services/backgroundService');
                await requestNotificationPermissions();
                await registerBackgroundFetch();
            } catch (e) {
                console.warn('[RootLayout] Background service init skipped:', e);
            }
        }
        init();
    }, []);

    // Register notification action categories (Acknowledge / Archive buttons)
    useEffect(() => {
        Notifications.setNotificationCategoryAsync('SMARTESCAPE_ALERT', [
            {
                identifier: 'ACKNOWLEDGE',
                buttonTitle: '✓ Acknowledge',
                options: { opensAppToForeground: false },
            },
            {
                identifier: 'ARCHIVE',
                buttonTitle: 'Archive',
                options: { opensAppToForeground: false, isDestructive: true },
            },
        ]);
    }, []);

    // Handle notification tap + action buttons
    useEffect(() => {
        const subscription = Notifications.addNotificationResponseReceivedListener(async (response) => {
            const actionId = response.actionIdentifier;
            const data = response.notification.request.content.data;
            const messageId = data?.messageId as string | undefined;
            const systemId = data?.systemId as string | undefined;

            // Default tap → navigate to feed
            if (actionId === Notifications.DEFAULT_ACTION_IDENTIFIER) {
                if (systemId) {
                    router.push(`/feed?systemId=${systemId}`);
                }
                return;
            }

            // Action buttons → run Gmail API in background
            const { accessToken } = useAuthStore.getState();
            if (!accessToken || !messageId) return;

            try {
                if (actionId === 'ACKNOWLEDGE') {
                    const success = await withTokenRefresh(() =>
                        markMessageAsRead(useAuthStore.getState().accessToken!, messageId)
                    );
                    if (success) {
                        useNotificationStore.getState().markAsRead(messageId);
                        console.log('[Push Action] Acknowledged:', messageId);
                    }
                } else if (actionId === 'ARCHIVE') {
                    const success = await withTokenRefresh(() =>
                        archiveMessage(useAuthStore.getState().accessToken!, messageId)
                    );
                    if (success) {
                        useNotificationStore.getState().markArchived(messageId);
                        console.log('[Push Action] Archived:', messageId);
                    }
                }
            } catch (err) {
                console.error('[Push Action] Failed:', err);
            }
        });

        return () => subscription.remove();
    }, []);

    return (
        <ErrorBoundary>
            <Tabs
                screenOptions={{
                    headerShown: false,
                    tabBarStyle: {
                        backgroundColor: '#000000',
                        borderTopColor: '#1a1a1a',
                        borderTopWidth: 1,
                    },
                    tabBarActiveTintColor: '#10b981',
                    tabBarInactiveTintColor: '#525252',
                    tabBarLabelStyle: {
                        fontWeight: '700',
                        fontSize: 10,
                        letterSpacing: 1,
                        textTransform: 'uppercase',
                    },
                }}
            >
                <Tabs.Screen
                    name="index"
                    options={{
                        title: 'Dashboard',
                        tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
                    }}
                />
                <Tabs.Screen
                    name="feed"
                    options={{
                        title: 'Alerts',
                        tabBarIcon: ({ color, size }) => <Bell color={color} size={size} />,
                    }}
                />
                <Tabs.Screen
                    name="settings"
                    options={{
                        title: 'Settings',
                        tabBarIcon: ({ color, size }) => <Settings color={color} size={size} />,
                    }}
                />
                {/* Hide non-tab screens */}
                <Tabs.Screen name="compose" options={{ href: null }} />
                <Tabs.Screen name="system/[id]" options={{ href: null }} />
            </Tabs>
        </ErrorBoundary>
    );
}
