import React, { useEffect, useState } from 'react';
import { View, Image, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { loadSession, refreshSession, registerRefreshInterceptor } from '../utils/session';
import { getMyClubs } from '../utils/service';
import themeConfig from '../themes/themeConfig';

export default function Index() {
    const [ready, setReady] = useState(false);
    const [authed, setAuthed] = useState(false);

    useEffect(() => {
        (async () => {
            registerRefreshInterceptor();

            let session = await loadSession();
            if (!session) session = await refreshSession();

            if (session) {
                try {
                    (globalThis as any).authToken = session.accessToken;
                    const clubs = await getMyClubs(session.accessToken);
                    (globalThis as any).myClubs = clubs;
                    setAuthed(true);
                } catch {
                    setAuthed(false);
                }
            }
            setReady(true);
        })();
    }, []);

    if (!ready) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: themeConfig.background.primary }}>
                <Image source={require('../../logo-ios.png')} style={{ width: 72, height: 72, borderRadius: 16, marginBottom: 24 }} />
                <ActivityIndicator color={themeConfig.accent.primary} size="large" />
            </View>
        );
    }

    return <Redirect href={authed ? '/dashboard/home' : '/login'} />;
}
