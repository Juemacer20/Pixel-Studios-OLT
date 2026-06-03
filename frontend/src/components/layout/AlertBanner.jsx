import React from 'react';
import { IconAlertTriangle, IconX } from '@tabler/icons-react';
import { useAlertStore } from '../../store/alertStore';
import { useAcknowledgeAlert } from '../../hooks/useAlerts';

export default function AlertBanner() {
  const criticalAlerts = useAlertStore(s => s.activeAlerts.filter(a => a.severity === 'CRITICAL' && !a.acknowledged));
  const { mutate: acknowledge } = useAcknowledgeAlert();

  if (!criticalAlerts.length) return null;

  const latest = criticalAlerts[0];

  return (
    <div className="flex items-center gap-3 px-4 py-2 text-sm" style={{ background: 'rgba(248,81,73,0.08)', borderBottom: '1px solid rgba(248,81,73,0.25)' }}>
      <IconAlertTriangle size={14} style={{ color: '#FF3B5C', flexShrink: 0 }} className="animate-pulse" />
      <span className="font-mono text-xs" style={{ color: '#FF3B5C' }}>[CRÍTICO]</span>
      <span className="flex-1 text-gray-300 text-xs truncate">{latest.message}</span>
      {criticalAlerts.length > 1 && (
        <span className="text-xs text-gray-500">+{criticalAlerts.length - 1} más</span>
      )}
      <button
        onClick={() => acknowledge(latest.id)}
        className="text-gray-500 hover:text-gray-300 transition-colors"
      >
        <IconX size={13} />
      </button>
    </div>
  );
}
