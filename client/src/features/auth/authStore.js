import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../../services/api.js';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (username, password) => {
        set({ isLoading: true, error: null });
        try {
          const res = await api.post('/auth/login', { username, password });
          const { token, user } = res.data.data;
          set({ token, user, isAuthenticated: true, isLoading: false, error: null });
          return { success: true };
        } catch (err) {
          const message = err.response?.data?.error?.message || 'Login failed. Please try again.';
          set({ isLoading: false, error: message, isAuthenticated: false });
          return { success: false, message };
        }
      },

      logout: async () => {
        try { await api.post('/auth/logout'); } catch (_) {}
        set({ user: null, token: null, isAuthenticated: false, error: null });
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'sih183-auth',
      partialize: (state) => ({ token: state.token, user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);
