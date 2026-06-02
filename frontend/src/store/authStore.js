import { create } from 'zustand';
import { setAccessToken } from '../services/api';

export const useAuthStore = create((set) => ({
  user: null,
  token: null,
  setAuth: (user, token) => {
    setAccessToken(token);
    set({ user, token });
  },
  clearAuth: () => {
    setAccessToken(null);
    set({ user: null, token: null });
  },
}));
