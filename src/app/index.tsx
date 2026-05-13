import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { loadSession } from '../utils/session';
import { getMyClubs } from '../utils/service';
import themeConfig from '../themes/themeConfig';

export default function Index() {
    const [ready, setReady] = useState(false);
    const [authed, setAuthed] = useState(false);

    useEffect(() => {
        (async () => {
            const session = await loadSession();
            if (session) {
                try {
                    (globalThis as any).authToken = session.accessToken;
                    const clubs = await getMyClubs(session.accessToken);
                    console.log('Loaded clubs', clubs);
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
                <ActivityIndicator color={themeConfig.accent.primary} size="large" />
            </View>
        );
    }

    return <Redirect href={authed ? '/dashboard/home' : '/login'} />;
}
