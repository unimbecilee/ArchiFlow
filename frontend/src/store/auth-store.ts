import { create } from 'zustand';
import { User, LoginRequest, RegisterRequest } from '@/types/auth';
import axios from '@/lib/api';
import { api } from '@/lib/api';
import { clearAuthSession, refreshAccessToken } from '@/lib/auth-session';
import {
  clearAccessToken,
  getAccessToken,
  purgeLegacyTokenStorage,
  setAccessToken,
} from '@/lib/session-tokens';
import { getApiErrorMessage } from '@/lib/api-error';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitializing: boolean;
  error: string | null;

  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  setUser: (user: User) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isInitializing: true,
  error: null,

  login: async (credentials) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.post('/api/auth/login', credentials);
      const { user, token } = response.data.data;

      setAccessToken(token.access_token);
      api.setToken(token.access_token);

      set({
        user,
        isAuthenticated: true,
        isLoading: false,
        isInitializing: false,
      });

      if (user.must_change_password) {
        if (
          typeof window !== 'undefined' &&
          !window.location.pathname.startsWith('/changer-mot-de-passe')
        ) {
          window.location.href = '/changer-mot-de-passe';
        }
      }
    } catch (error: unknown) {
      set({
        error: getApiErrorMessage(error, 'Login failed'),
        isLoading: false,
      });
      throw error;
    }
  },

  register: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.post('/api/auth/register', data);
      const { user, token } = response.data.data;

      setAccessToken(token.access_token);
      api.setToken(token.access_token);

      set({
        user,
        isAuthenticated: true,
        isLoading: false,
        isInitializing: false,
      });
    } catch (error: unknown) {
      set({
        error: getApiErrorMessage(error, 'Registration failed'),
        isLoading: false,
      });
      throw error;
    }
  },

  logout: async () => {
    try {
      await axios.post('/api/auth/logout');
    } catch {
      // ignore — cookie cleared below
    }

    await clearAuthSession();
    api.clearToken();

    set({
      user: null,
      isAuthenticated: false,
      isInitializing: false,
      error: null,
    });
  },

  checkAuth: async () => {
    purgeLegacyTokenStorage();
    set({ isInitializing: true });

    let token = getAccessToken();
    if (!token) {
      token = await refreshAccessToken();
    }
    if (!token) {
      set({ isAuthenticated: false, user: null, isInitializing: false });
      return;
    }

    api.setToken(token);

    try {
      const response = await axios.get('/api/auth/me');
      set({
        user: response.data.data,
        isAuthenticated: true,
        isInitializing: false,
      });
    } catch {
      const refreshed = await refreshAccessToken();
      if (!refreshed) {
        await clearAuthSession();
        api.clearToken();
        set({ user: null, isAuthenticated: false, isInitializing: false });
        return;
      }
      api.setToken(refreshed);
      try {
        const response = await axios.get('/api/auth/me');
        set({
          user: response.data.data,
          isAuthenticated: true,
          isInitializing: false,
        });
      } catch {
        await clearAuthSession();
        api.clearToken();
        set({ user: null, isAuthenticated: false, isInitializing: false });
      }
    }
  },

  setUser: (user) => set({ user }),
  clearError: () => set({ error: null }),
}));
