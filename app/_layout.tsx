import '../global.css'; // NativeWind setup
import { Tabs, router } from 'expo-router';
import { Home, Bell, Settings } from 'lucide-react-native';
import { useEffect } from 'react';
import { addNotificationResponseListener } from '../src/services/pushNotifications';

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

    // Handle notification tap → deep link to system detail
    useEffect(() => {
        const cleanup = addNotificationResponseListener((systemId, _status) => {
            // Navigate to the system detail screen
            router.push(`/system/${systemId}`);
        });

        return cleanup;
    }, []);

    return (
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
    );
}
