import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isAuthReady: false,

      setUser: (user) => set({ user, isAuthenticated: true }),

      setAuthReady: (ready = true) => set({ isAuthReady: Boolean(ready) }),

      clearAuth: () => set({ user: null, isAuthenticated: false, isAuthReady: true }),

      logout: () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('access');
        localStorage.removeItem('refresh');
        set({ user: null, isAuthenticated: false, isAuthReady: true });        
      },
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);

export default useAuthStore;