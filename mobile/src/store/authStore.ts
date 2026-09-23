import { create } from 'zustand';
import * as SecureStore from '@/storage/tokenStorage';
import { apiClient, setAuthToken } from '@/api/client';
import { registerPushToken } from '@/notifications/registerPushToken';

const TOKEN_KEY = 'auth_token';

interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: 'DINER' | 'RESTAURANT_ADMIN' | 'PLATFORM_ADMIN';
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  isHydrating: boolean;
  hydrate: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => Promise<void>;
}

async function loadUser() {
  const { data } = await apiClient.get<AuthUser>('/users/me');
  return data;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isHydrating: true,

  hydrate: async () => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (token) {
        setAuthToken(token);
        const user = await loadUser();
        set({ token, user });
        registerPushToken().catch(() => {});
      }
    } catch {
      // Stored token is invalid/expired — fall through to logged-out state.
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      setAuthToken(null);
    } finally {
      set({ isHydrating: false });
    }
  },

  login: async (email, password) => {
    const { data } = await apiClient.post<{ accessToken: string }>('/auth/login', { email, password });
    await SecureStore.setItemAsync(TOKEN_KEY, data.accessToken);
    setAuthToken(data.accessToken);
    const user = await loadUser();
    set({ token: data.accessToken, user });
    registerPushToken().catch(() => {});
  },

  signup: async (email, password, fullName) => {
    const { data } = await apiClient.post<{ accessToken: string }>('/auth/signup', { email, password, fullName });
    await SecureStore.setItemAsync(TOKEN_KEY, data.accessToken);
    setAuthToken(data.accessToken);
    const user = await loadUser();
    set({ token: data.accessToken, user });
    registerPushToken().catch(() => {});
  },

  logout: async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    setAuthToken(null);
    set({ token: null, user: null });
  },
}));
