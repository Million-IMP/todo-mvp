import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { bkend } from '@/lib/bkend';
import { User } from '@/types';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isLoading: false,
      isAuthenticated: false,

      setUser: (user) => set({ user, isAuthenticated: !!user }),

      setLoading: (isLoading) => set({ isLoading }),

      login: async (email, password) => {
        try {
          set({ isLoading: true });
          const response = await bkend.auth.signin({ email, password });
          localStorage.setItem('access_token', response.token.access_token);
          localStorage.setItem('refresh_token', response.token.refresh_token);
          set({ user: response.user, isAuthenticated: true, isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      signup: async (email, password) => {
        try {
          set({ isLoading: true });
          const response = await bkend.auth.signup({ email, password });
          localStorage.setItem('access_token', response.token.access_token);
          localStorage.setItem('refresh_token', response.token.refresh_token);
          set({ user: response.user, isAuthenticated: true, isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        try {
          await bkend.auth.signout();
        } finally {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          set({ user: null, isAuthenticated: false });
        }
      },

      checkAuth: async () => {
        const token = localStorage.getItem('access_token');
        if (!token) {
          set({ user: null, isAuthenticated: false });
          return;
        }

        try {
          const response = await bkend.auth.me();
          set({ user: response.user, isAuthenticated: true });
        } catch (error) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          set({ user: null, isAuthenticated: false });
        }
      },
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({ user: state.user }),
    }
  )
);
