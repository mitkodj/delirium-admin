import * as SecureStore from 'expo-secure-store';
import axios from 'axios';

const SESSION_KEY = 'auth_session';

export type AuthSession = {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
};

export async function saveSession(data: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}): Promise<AuthSession> {
    const session: AuthSession = {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresAt: Math.floor(Date.now() / 1000) + data.expiresIn,
    };
    await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
    axios.defaults.headers.common['Authorization'] = `Bearer ${session.accessToken}`;
    return session;
}

export async function loadSession(): Promise<AuthSession | null> {
    try {
        const raw = await SecureStore.getItemAsync(SESSION_KEY);
        if (!raw) return null;
        const session: AuthSession = JSON.parse(raw);
        if (Math.floor(Date.now() / 1000) >= session.expiresAt) return null;
        axios.defaults.headers.common['Authorization'] = `Bearer ${session.accessToken}`;
        return session;
    } catch {
        return null;
    }
}

export async function clearSession(): Promise<void> {
    await SecureStore.deleteItemAsync(SESSION_KEY);
    delete axios.defaults.headers.common['Authorization'];
}
