import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase, authAPI } from '@/lib/supabase';
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
          const data = await authAPI.signin(email, password);
          const user: User = { id: data.user!.id, email: data.user!.email!, created_at: data.user!.created_at };
          set({ user, isAuthenticated: true, isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      signup: async (email, password) => {
        try {
          set({ isLoading: true });
          const data = await authAPI.signup(email, password);
          const user: User = { id: data.user!.id, email: data.user!.email!, created_at: data.user!.created_at };
          set({ user, isAuthenticated: true, isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        try {
          await authAPI.logout();
        } finally {
          set({ user: null, isAuthenticated: false });
        }
      },

      checkAuth: async () => {
        try {
          const session = await authAPI.getSession();
          if (!session) {
            set({ user: null, isAuthenticated: false });
            return;
          }
          const u = session.user;
          set({ user: { id: u.id, email: u.email!, created_at: u.created_at }, isAuthenticated: true });
        } catch {
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
