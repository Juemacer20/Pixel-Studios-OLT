import React from 'react';

function getSignalStyle(value, type = 'rx') {
  if (value === null || value === undefined) return { color: '#6B7280', label: '—' };
  if (type === 'rx') {
    if (value <= -27) return { color: '#FF3B5C', label: `${value} dBm` };
    if (value <= -25) return { color: '#FF6B35', label: `${value} dBm` };
    if (value >= -8) return { color: '#A855F7', label: `${value} dBm` };
    if (value >= -22 && value <= -12) return { color: '#00FF94', label: `${value} dBm` };
    return { color: '#00D4FF', label: `${value} dBm` };
  }
  return { color: '#00D4FF', label: `${value} dBm` };
}

export default function SignalBadge({ value, type = 'rx' }) {
  const { color, label } = getSignalStyle(value, type);
  return (
    <span className="font-mono text-[10px] font-medium" style={{ color }}>
      {label}
    </span>
  );
}
