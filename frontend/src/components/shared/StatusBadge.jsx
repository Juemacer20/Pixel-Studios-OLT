import React from 'react';

const STATUS_CONFIG = {
  online:       { dotClass: 'status-online',   badgeClass: 'badge-green',  label: 'Online' },
  offline:      { dotClass: 'status-offline',  badgeClass: 'badge-gray',   label: 'Offline' },
  los:          { dotClass: 'status-los',       badgeClass: 'badge-red',    label: 'LOS' },
  pending:      { dotClass: 'status-pending',  badgeClass: 'badge-orange', label: 'Pendiente' },
  ztp:          { dotClass: 'status-pending',  badgeClass: 'badge-orange', label: 'ZTP' },
  error:        { dotClass: 'status-los',       badgeClass: 'badge-red',    label: 'Error' },
  warning:      { dotClass: 'status-pending',  badgeClass: 'badge-orange', label: 'Warning' },
  degraded:     { dotClass: 'status-pending',  badgeClass: 'badge-orange', label: 'Degradado' },
  maintenance:  { dotClass: 'status-offline',  badgeClass: 'badge-purple', label: 'Mantenimiento' },
};

/**
 * StatusBadge — renders a colored pill badge with an animated status dot.
 *
 * @param {string}  status    - 'online' | 'offline' | 'los' | 'pending' | 'ztp' | 'error' | 'warning'
 * @param {boolean} animated  - whether the dot pulses (default true)
 * @param {string}  size      - 'sm' | 'md' | 'lg'
 */
export default function StatusBadge({ status, animated = true, size = 'sm' }) {
  const key = (status || '').toLowerCase();
  const cfg = STATUS_CONFIG[key] || {
    dotClass: 'status-offline',
    badgeClass: 'badge-gray',
    label: status || '—',
  };

  const dotSize = size === 'lg' ? 10 : size === 'md' ? 8 : 7;
  const badgeStyle =
    size === 'lg'
      ? { fontSize: 13, padding: '3px 10px' }
      : size === 'md'
      ? { fontSize: 11, padding: '2px 8px' }
      : {};

  return (
    <span className={`badge ${cfg.badgeClass}`} style={badgeStyle}>
      <span
        className={`status-dot ${cfg.dotClass}`}
        style={{
          width: dotSize,
          height: dotSize,
          animation: !animated ? 'none' : undefined,
          boxShadow: !animated ? 'none' : undefined,
          flexShrink: 0,
        }}
      />
      {cfg.label}
    </span>
  );
}
