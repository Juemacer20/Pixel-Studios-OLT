import { create } from 'zustand';
import { setAccessToken } from '../services/api';

const stored = (() => {
  try { return JSON.parse(localStorage.getItem('olt_auth') || 'null'); } catch { return null; }
})();

if (stored?.token) setAccessToken(stored.token);

export const useAuthStore = create((set) => ({
  user: stored?.user || null,
  token: stored?.token || null,
  setAuth: (user, token) => {
    setAccessToken(token);
    localStorage.setItem('olt_auth', JSON.stringify({ user, token }));
    set({ user, token });
  },
  clearAuth: () => {
    setAccessToken(null);
    localStorage.removeItem('olt_auth');
    set({ user: null, token: null });
  },
}));
