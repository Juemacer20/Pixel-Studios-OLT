import { create } from 'zustand';

export const useAlertStore = create((set) => ({
  activeAlerts: [],
  alertCount: 0,
  criticalCount: 0,
  setAlerts: (alerts) => set({
    activeAlerts: alerts,
    alertCount: alerts.length,
    criticalCount: alerts.filter(a => a.severity === 'CRITICAL').length,
  }),
  addAlert: (alert) => set((s) => ({
    activeAlerts: [alert, ...s.activeAlerts],
    alertCount: s.alertCount + 1,
    criticalCount: alert.severity === 'CRITICAL' ? s.criticalCount + 1 : s.criticalCount,
  })),
  removeAlert: (id) => set((s) => {
    const removed = s.activeAlerts.find(a => a.id === id);
    return {
      activeAlerts: s.activeAlerts.filter(a => a.id !== id),
      alertCount: Math.max(0, s.alertCount - 1),
      criticalCount: removed?.severity === 'CRITICAL' ? Math.max(0, s.criticalCount - 1) : s.criticalCount,
    };
  }),
  acknowledgeAlert: (id) => set((s) => ({
    activeAlerts: s.activeAlerts.map(a => a.id === id ? { ...a, acknowledged: true } : a),
  })),
}));
