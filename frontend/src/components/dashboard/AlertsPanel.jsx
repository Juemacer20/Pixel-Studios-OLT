import React from 'react';
import { useAlertStore } from '../../store/alertStore';
import { useAcknowledgeAlert } from '../../hooks/useAlerts';
import { IconCheck, IconAlertTriangle, IconInfoCircle } from '@tabler/icons-react';

const SEVERITY_COLORS = { CRITICAL: '#FF3B5C', HIGH: '#FF6B35', MEDIUM: '#F59E0B', LOW: '#6B7280', INFO: '#00D4FF' };
const TYPE_ICONS = { LOS: '📡', DYING_GASP: '⚡', CPU_HIGH: '🔥', TEMP_HIGH: '🌡️', HIGH_SIGNAL: '📶', LOW_SIGNAL: '📉', ONT_OFFLINE: '💤' };

export default function AlertsPanel() {
  const alerts = useAlertStore(s => s.activeAlerts);
  const { mutate: acknowledge } = useAcknowledgeAlert();

  return (
    <div className="rounded-lg flex flex-col" style={{ background: '#1A2235', border: '1px solid #1E2D45', height: '100%' }}>
      <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: '#1E2D45' }}>
        <span className="text-xs font-semibold text-gray-400">Alertas Activas</span>
        <span className="text-[10px] font-mono" style={{ color: '#FF3B5C' }}>{alerts.length} activas</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-gray-600">
            <IconInfoCircle size={24} className="mb-2" />
            <span className="text-xs">Sin alertas activas</span>
          </div>
        ) : alerts.map(alert => (
          <div
            key={alert.id}
            className="flex items-start gap-3 px-4 py-3 border-b hover:bg-[#1F2D44] transition-colors cursor-default"
            style={{ borderColor: '#1E2D45', opacity: alert.acknowledged ? 0.6 : 1 }}
          >
            <span className="text-base mt-0.5">{TYPE_ICONS[alert.type] || '⚠️'}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-semibold" style={{ color: SEVERITY_COLORS[alert.severity] || '#999' }}>
                  [{alert.severity}]
                </span>
                <span className="text-[10px] text-gray-600 font-mono">{alert.type}</span>
              </div>
              <div className="text-xs text-gray-300 truncate mt-0.5">{alert.message}</div>
              <div className="text-[10px] text-gray-600 mt-0.5">{new Date(alert.created_at).toLocaleString('es-AR')}</div>
            </div>
            {!alert.acknowledged && (
              <button
                onClick={() => acknowledge(alert.id)}
                className="text-gray-600 hover:text-green-400 transition-colors flex-shrink-0 mt-0.5"
                title="Reconocer"
              >
                <IconCheck size={13} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
