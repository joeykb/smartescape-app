import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { router } from 'expo-router';
import { ArrowLeft, Send } from 'lucide-react-native';
import { useAuthStore } from '../src/store/authStore';
import { sendGmailMessage } from '../src/api/gmail';

export default function Compose() {
    const { accessToken, refreshToken } = useAuthStore();
    const [to, setTo] = useState('');
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [sending, setSending] = useState(false);

    const handleSend = async () => {
        if (!to.trim() || !subject.trim()) {
            Alert.alert('Missing Fields', 'Please fill in the To and Subject fields.');
            return;
        }

        let token = accessToken;
        if (!token) {
            token = await refreshToken();
            if (!token) {
                Alert.alert('Auth Error', 'Please sign in again from Settings.');
                return;
            }
        }

        try {
            setSending(true);
            const success = await sendGmailMessage(token, to.trim(), subject.trim(), body.trim());

            if (success) {
                Alert.alert('Sent', 'Your message has been sent successfully.', [
                    { text: 'OK', onPress: () => router.back() },
                ]);
            } else {
                // Try refreshing token and retrying
                const freshToken = await refreshToken();
                if (freshToken) {
                    const retry = await sendGmailMessage(freshToken, to.trim(), subject.trim(), body.trim());
                    if (retry) {
                        Alert.alert('Sent', 'Your message has been sent successfully.', [
                            { text: 'OK', onPress: () => router.back() },
                        ]);
                        return;
                    }
                }
                Alert.alert('Failed', 'Could not send the message. Please try again.');
            }
        } catch (e) {
            console.error('[Compose] Send error:', e);
            Alert.alert('Error', 'An unexpected error occurred.');
        } finally {
            setSending(false);
        }
    };

    return (
        <View className="flex-1 bg-black">
            <SafeAreaView edges={['top']} className="flex-1">
                {/* Header */}
                <View className="px-4 py-4 border-b border-gray-800/50 flex-row items-center justify-between">
                    <View className="flex-row items-center">
                        <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
                            <ArrowLeft color="#ffffff" size={22} />
                        </TouchableOpacity>
                        <Text className="text-white font-black text-lg tracking-wider uppercase">
                            Send Command
                        </Text>
                    </View>
                    <TouchableOpacity
                        onPress={handleSend}
                        disabled={sending}
                        className="bg-emerald-500 rounded-lg px-4 py-2 flex-row items-center"
                    >
                        {sending ? (
                            <ActivityIndicator color="#000" size="small" />
                        ) : (
                            <>
                                <Send color="#000000" size={16} />
                                <Text className="text-black font-black text-sm ml-2 tracking-wider">SEND</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    className="flex-1"
                >
                    <ScrollView className="flex-1 p-4">
                        {/* To field */}
                        <View className="mb-4">
                            <Text className="text-gray-500 font-bold text-xs tracking-widest uppercase mb-2">To</Text>
                            <TextInput
                                className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 text-white text-base"
                                placeholder="recipient@example.com"
                                placeholderTextColor="#525252"
                                value={to}
                                onChangeText={setTo}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        </View>

                        {/* Subject field */}
                        <View className="mb-4">
                            <Text className="text-gray-500 font-bold text-xs tracking-widest uppercase mb-2">Subject</Text>
                            <TextInput
                                className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 text-white text-base"
                                placeholder="SMART-ESC-001 Command"
                                placeholderTextColor="#525252"
                                value={subject}
                                onChangeText={setSubject}
                            />
                        </View>

                        {/* Body field */}
                        <View className="mb-4">
                            <Text className="text-gray-500 font-bold text-xs tracking-widest uppercase mb-2">Message</Text>
                            <TextInput
                                className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 text-white text-base"
                                placeholder="Enter your command or message..."
                                placeholderTextColor="#525252"
                                value={body}
                                onChangeText={setBody}
                                multiline
                                numberOfLines={8}
                                textAlignVertical="top"
                                style={{ minHeight: 160 }}
                            />
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </View>
    );
}
