import React from 'react';

const STATUS_MAP = {
  ONLINE: { color: '#00FF94', label: 'Online', animated: true },
  OFFLINE: { color: '#6B7280', label: 'Offline', animated: false },
  LOS: { color: '#FF3B5C', label: 'LOS', animated: true },
  DYING_GASP: { color: '#FF6B35', label: 'Dying Gasp', animated: true },
  PENDING: { color: '#FF6B35', label: 'Pendiente', animated: false },
  DEGRADED: { color: '#FF6B35', label: 'Degradado', animated: false },
  MAINTENANCE: { color: '#A855F7', label: 'Mantenimiento', animated: false },
};

export default function StatusDot({ status, size = 8, showLabel = false }) {
  const { color, label, animated } = STATUS_MAP[status] || { color: '#6B7280', label: status, animated: false };

  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        style={{
          width: size, height: size, borderRadius: '50%', display: 'inline-block',
          background: color,
          boxShadow: animated ? `0 0 6px ${color}` : 'none',
          animation: animated ? 'pulse-red 2s infinite' : 'none',
        }}
      />
      {showLabel && <span className="text-xs text-gray-400">{label}</span>}
    </span>
  );
}
