import React, { Component, ReactNode } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { AlertCircle, RotateCcw } from 'lucide-react-native';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

/**
 * Top-level error boundary that prevents full app crashes.
 * Catches unhandled JS errors in the React tree and shows a recovery screen.
 */
export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('[ErrorBoundary] Caught error:', error, errorInfo);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <View
                    style={{
                        flex: 1,
                        backgroundColor: '#000',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 32,
                    }}
                >
                    <AlertCircle color="#ef4444" size={48} />
                    <Text
                        style={{
                            color: '#fff',
                            fontWeight: '900',
                            fontSize: 18,
                            marginTop: 16,
                            textAlign: 'center',
                            letterSpacing: 1,
                        }}
                    >
                        Something went wrong
                    </Text>
                    <Text
                        style={{
                            color: '#737373',
                            fontSize: 13,
                            marginTop: 8,
                            textAlign: 'center',
                            lineHeight: 20,
                        }}
                    >
                        {this.state.error?.message || 'An unexpected error occurred.'}
                    </Text>
                    <TouchableOpacity
                        onPress={this.handleReset}
                        style={{
                            marginTop: 24,
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: '#10b981',
                            borderRadius: 8,
                            paddingHorizontal: 20,
                            paddingVertical: 12,
                        }}
                    >
                        <RotateCcw color="#000" size={16} />
                        <Text
                            style={{
                                color: '#000',
                                fontWeight: '900',
                                fontSize: 13,
                                marginLeft: 8,
                                letterSpacing: 1,
                            }}
                        >
                            TRY AGAIN
                        </Text>
                    </TouchableOpacity>
                </View>
            );
        }

        return this.props.children;
    }
}
