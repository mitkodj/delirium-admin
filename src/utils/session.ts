import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import Constants from 'expo-constants';

const { partyService } = (Constants.expoConfig?.extra?.default ?? {}) as { partyService?: string };

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

async function getStoredSession(): Promise<AuthSession | null> {
    try {
        const raw = await SecureStore.getItemAsync(SESSION_KEY);
        if (!raw) return null;
        return JSON.parse(raw) as AuthSession;
    } catch {
        return null;
    }
}

export async function loadSession(): Promise<AuthSession | null> {
    const session = await getStoredSession();
    if (!session) return null;
    if (Math.floor(Date.now() / 1000) >= session.expiresAt) return null;
    axios.defaults.headers.common['Authorization'] = `Bearer ${session.accessToken}`;
    return session;
}

export async function refreshSession(): Promise<AuthSession | null> {
    try {
        const stored = await getStoredSession();
        if (!stored?.refreshToken) return null;

        const res = await axios.post(`${partyService}/api/auth/refresh`, {
            refreshToken: stored.refreshToken,
        });

        return await saveSession(res.data as { accessToken: string; refreshToken: string; expiresIn: number });
    } catch {
        await clearSession();
        return null;
    }
}

export async function clearSession(): Promise<void> {
    await SecureStore.deleteItemAsync(SESSION_KEY);
    delete axios.defaults.headers.common['Authorization'];
}

let _interceptorRegistered = false;

export function registerRefreshInterceptor(): void {
    if (_interceptorRegistered) return;
    _interceptorRegistered = true;

    axios.interceptors.response.use(
        res => res,
        async error => {
            const original = error.config;
            const isRefreshCall = original?.url?.includes('api/auth/refresh');
            if (error.response?.status === 401 && !original._retried && !isRefreshCall) {
                original._retried = true;
                console.log('Attempting to refresh session due to 401 response');
                const session = await refreshSession();
                if (session) {
                    original.headers['Authorization'] = `Bearer ${session.accessToken}`;
                    return axios(original);
                }
            }
            return Promise.reject(error);
        }
    );
}
