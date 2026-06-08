import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Image,
    Modal,
    ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, router } from 'expo-router';
import themeConfig from '../themes/themeConfig';
import { getMyClubs, login } from '../utils/service';
import { saveSession } from '../utils/session';
import { useSearchFilters } from '../providers/SearchCriteriaContext';

export default function LoginScreen() {

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [privacyVisible, setPrivacyVisible] = useState(false);
    const { setClubs } = useSearchFilters();

    const handleLogin = async () => {
        try {

            setError(null);
            setLoading(true);

            const loginData = await login(username, password);
            if (!loginData) throw new Error('Login failed');

            const session = await saveSession(loginData);
            (globalThis as any).authToken = session.accessToken;

            const clubs = await getMyClubs(session.accessToken);

            setClubs(clubs);
            (globalThis as any).myClubs = clubs;

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

                    <Image
                        source={require('../../logo-ios.png')}
                        style={styles.logo}
                    />

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

                <TouchableOpacity style={styles.privacyLink} onPress={() => setPrivacyVisible(true)} activeOpacity={0.7}>
                    <Text style={styles.privacyLinkText}>Privacy Policy</Text>
                </TouchableOpacity>

                {loading && (
                    <View style={styles.loadingOverlay}>
                        <ActivityIndicator size="large" color="#fff" />
                        <Text style={styles.loadingText}>
                            Loading your dashboard...
                        </Text>
                    </View>
                )}

            </KeyboardAvoidingView>

            <Modal visible={privacyVisible} animationType="slide" onRequestClose={() => setPrivacyVisible(false)}>
                <View style={styles.privacyModal}>
                    <View style={styles.privacyHeader}>
                        <Text style={styles.privacyTitle}>Privacy Policy</Text>
                        <TouchableOpacity onPress={() => setPrivacyVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                            <Ionicons name="close" size={24} color={themeConfig.text.muted} />
                        </TouchableOpacity>
                    </View>
                    <ScrollView style={styles.privacyScroll} showsVerticalScrollIndicator={false}>
                        <Text style={styles.privacyLastUpdated}>Last updated: June 2026</Text>

                        <Text style={styles.privacySectionTitle}>1. Introduction</Text>
                        <Text style={styles.privacyBody}>
                            Delirium Admin ("we", "our", or "us") operates this mobile application to help venue managers and staff manage reservations, floor layouts, and events. This Privacy Policy explains how we collect, use, and protect information when you use our app.
                        </Text>

                        <Text style={styles.privacySectionTitle}>2. Information We Collect</Text>
                        <Text style={styles.privacyBody}>
                            We collect information you provide directly, including:{'\n'}
                            • Account credentials (email and password) used to authenticate staff members.{'\n'}
                            • Reservation data such as guest names, phone numbers, table assignments, and comments entered by venue staff.{'\n'}
                            • Event details including dates, names, and banners uploaded by administrators.
                        </Text>

                        <Text style={styles.privacySectionTitle}>3. How We Use Your Information</Text>
                        <Text style={styles.privacyBody}>
                            The information collected is used solely to:{'\n'}
                            • Authenticate and authorise staff access to venue management features.{'\n'}
                            • Display, create, and manage reservations and floor layouts.{'\n'}
                            • Provide operational continuity across sessions via secure token storage.
                        </Text>

                        <Text style={styles.privacySectionTitle}>4. Guest Data</Text>
                        <Text style={styles.privacyBody}>
                            Reservation records may include personal information about venue guests (name, phone number). This data is entered by authorised staff and is stored securely on our servers. It is used exclusively for reservation management purposes and is never sold or shared with third parties.
                        </Text>

                        <Text style={styles.privacySectionTitle}>5. Data Retention</Text>
                        <Text style={styles.privacyBody}>
                            Reservation and event data is retained for as long as it is operationally required or until the venue administrator requests deletion. Authentication tokens are cleared upon logout.
                        </Text>

                        <Text style={styles.privacySectionTitle}>6. Security</Text>
                        <Text style={styles.privacyBody}>
                            We use industry-standard measures to protect your data, including encrypted transmission (HTTPS) and bearer-token authentication. Access is restricted to authenticated venue staff only.
                        </Text>

                        <Text style={styles.privacySectionTitle}>7. Your Rights</Text>
                        <Text style={styles.privacyBody}>
                            Authorised administrators may request access to, correction of, or deletion of any personal data stored within the platform by contacting us directly.
                        </Text>

                        <Text style={styles.privacySectionTitle}>8. Contact</Text>
                        <Text style={styles.privacyBody}>
                            If you have questions about this Privacy Policy, please contact us at support@deliriumadmin.com.
                        </Text>

                        <View style={styles.privacyFooterSpacer} />
                    </ScrollView>
                </View>
            </Modal>
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
    logo: {
        width: 60,
        height: 60,
        borderRadius: 14,
        alignSelf: 'center',
        marginBottom: 32,
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
    },
    privacyLink: {
        alignItems: 'center',
        paddingVertical: 16,
        position: 'absolute',
        bottom: 32,
        left: 0,
        right: 0,
    },
    privacyLinkText: {
        fontSize: 13,
        color: themeConfig.text.muted,
        textDecorationLine: 'underline',
    },
    privacyModal: {
        flex: 1,
        backgroundColor: themeConfig.background.primary,
    },
    privacyHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: themeConfig.border.subtle,
    },
    privacyTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: themeConfig.text.primary,
    },
    privacyScroll: {
        flex: 1,
        paddingHorizontal: 20,
    },
    privacyLastUpdated: {
        fontSize: 12,
        color: themeConfig.text.muted,
        marginTop: 20,
        marginBottom: 20,
    },
    privacySectionTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: themeConfig.text.primary,
        marginTop: 20,
        marginBottom: 8,
    },
    privacyBody: {
        fontSize: 14,
        color: themeConfig.text.muted,
        lineHeight: 22,
    },
    privacyFooterSpacer: {
        height: 48,
    },
});