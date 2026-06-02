import { create } from 'zustand';

export const useOLTStore = create((set) => ({
  olts: [],
  selectedOLT: null,
  setOLTs: (olts) => set({ olts }),
  updateOLT: (id, data) => set((s) => ({
    olts: s.olts.map(o => o.id === id ? { ...o, ...data } : o),
    selectedOLT: s.selectedOLT?.id === id ? { ...s.selectedOLT, ...data } : s.selectedOLT,
  })),
  selectOLT: (olt) => set({ selectedOLT: olt }),
  clearSelection: () => set({ selectedOLT: null }),
}));
