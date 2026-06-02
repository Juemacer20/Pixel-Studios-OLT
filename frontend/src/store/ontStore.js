import { create } from 'zustand';

export const useONTStore = create((set) => ({
  onts: [],
  pendingZTP: [],
  selectedONT: null,
  setONTs: (onts) => set({ onts }),
  updateONT: (id, data) => set((s) => ({
    onts: s.onts.map(o => o.id === id ? { ...o, ...data } : o),
  })),
  setPendingZTP: (pending) => set({ pendingZTP: pending }),
  addPendingZTP: (ont) => set((s) => ({ pendingZTP: [...s.pendingZTP, ont] })),
  removePendingZTP: (id) => set((s) => ({ pendingZTP: s.pendingZTP.filter(o => o.id !== id) })),
  selectONT: (ont) => set({ selectedONT: ont }),
}));
