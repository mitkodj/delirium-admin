import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator
} from 'react-native';
import { Stack, router } from 'expo-router';
import themeConfig from '../themes/themeConfig';
import { getMyClubs, login } from '../utils/service';
import { useSearchFilters } from '../providers/SearchCriteriaContext';

export default function LoginScreen() {

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { clubs, setClubs } = useSearchFilters();

    const handleLogin = async () => {
        try {

            setError(null);
            setLoading(true);

            // const token = await login(username, password);

            // (global as any).authToken = token;

            // const clubs = await getMyClubs(token);

            (global as any).myClubs = clubs.slice(0, 1);

            setLoading(false);

            router.replace('/dashboard/home');

        } catch (err) {
            console.error(err);
            setLoading(false);
            setError('Invalid username or password');
        }
    };

    return (
        <>
            <Stack.Screen options={{ title: 'Admin' }} />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.container}
            >
                <View style={styles.inner}>

                    {error && (
                        <View style={styles.errorBanner}>
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    )}

                    <TextInput
                        placeholder="Username"
                        placeholderTextColor={themeConfig.text.muted}
                        value={username}
                        onChangeText={setUsername}
                        style={styles.input}
                    />

                    <TextInput
                        placeholder="Password"
                        placeholderTextColor={themeConfig.text.muted}
                        secureTextEntry
                        value={password}
                        onChangeText={setPassword}
                        style={styles.input}
                    />

                    <TouchableOpacity
                        style={styles.button}
                        onPress={handleLogin}
                        disabled={loading}
                    >
                        <Text style={styles.buttonText}>Login</Text>
                    </TouchableOpacity>

                </View>

                {loading && (
                    <View style={styles.loadingOverlay}>
                        <ActivityIndicator size="large" color="#fff" />
                        <Text style={styles.loadingText}>
                            Loading your dashboard...
                        </Text>
                    </View>
                )}

            </KeyboardAvoidingView>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: themeConfig.background.primary,
        justifyContent: 'center',
    },
    inner: {
        paddingHorizontal: 24,
    },
    title: {
        color: themeConfig.text.primary,
        fontSize: 28,
        fontWeight: '700',
        marginBottom: 32,
        textAlign: 'center',
    },
    input: {
        width: '100%',
        backgroundColor: themeConfig.surface.elevated,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: themeConfig.border.subtle,
        paddingHorizontal: 16,
        paddingVertical: 16,
        color: themeConfig.text.primary,
        marginBottom: 16,
        fontWeight: 600
    },
    button: {
        width: '100%',
        backgroundColor: themeConfig.accent.primary,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    buttonText: {
        color: themeConfig.text.inverse,
        fontWeight: '700',
        fontSize: 16,
    },
    errorBanner: {
        backgroundColor: '#ff4d4d',
        padding: 12,
        borderRadius: 8,
        marginBottom: 20
    },

    errorText: {
        color: 'white',
        textAlign: 'center',
        fontWeight: '600'
    },

    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.75)',
        justifyContent: 'center',
        alignItems: 'center'
    },

    loadingText: {
        color: '#fff',
        marginTop: 12,
        fontSize: 16
    }
});