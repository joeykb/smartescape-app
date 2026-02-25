import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView } from 'react-native';
import { Header } from '../src/components/Header';
import { AuthSection } from '../src/components/settings/AuthSection';
import { PreferencesSection } from '../src/components/settings/PreferencesSection';
import { DevModeSection } from '../src/components/settings/DevModeSection';

export default function Settings() {
    return (
        <View className="flex-1 bg-black">
            <SafeAreaView edges={['top']} className="flex-1">
                <Header title="Settings" />

                <ScrollView className="flex-1 p-4">
                    <AuthSection />
                    <PreferencesSection />
                    <DevModeSection />
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

