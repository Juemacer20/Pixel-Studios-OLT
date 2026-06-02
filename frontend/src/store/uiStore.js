import { create } from 'zustand';

export const useUIStore = create((set) => ({
  sidebarCollapsed: false,
  activeDrawer: null,
  drawerData: null,
  filters: {},
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  openDrawer: (name, data = null) => set({ activeDrawer: name, drawerData: data }),
  closeDrawer: () => set({ activeDrawer: null, drawerData: null }),
  setFilter: (key, value) => set((s) => ({ filters: { ...s.filters, [key]: value } })),
  clearFilters: () => set({ filters: {} }),
}));
