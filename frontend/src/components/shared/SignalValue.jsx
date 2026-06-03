import React from 'react';

/**
 * Returns CSS class and label for a dBm value.
 *  >= -15          → signal-high     (purple)  "High"
 *  -15 to > -20    → signal-optimal  (green)   "Óptimo"
 *  -20 to > -25    → signal-normal   (cyan)    "Normal"
 *  -25 to > -27    → signal-warn     (orange)  "Débil"
 *  <= -27          → signal-critical (red)     "Crítico"
 *  null/undefined  → signal-unknown  (muted)   "—"
 */
function getSignalMeta(value) {
  if (value == null)   return { cls: 'signal-unknown',  label: '—' };
  if (value >= -15)    return { cls: 'signal-high',     label: 'High' };
  if (value > -20)     return { cls: 'signal-optimal',  label: 'Óptimo' };
  if (value > -25)     return { cls: 'signal-normal',   label: 'Normal' };
  if (value > -27)     return { cls: 'signal-warn',     label: 'Débil' };
  return               { cls: 'signal-critical', label: 'Crítico' };
}

/**
 * SignalValue — displays a colored dBm reading.
 *
 * @param {number|null} value  - dBm value (e.g. -21.3)
 * @param {string}      unit   - unit suffix, default 'dBm'
 * @param {string}      size   - 'sm' | 'md' | 'lg'
 */
export default function SignalValue({ value, unit = 'dBm', size = 'sm' }) {
  const { cls } = getSignalMeta(value);

  const fontSize =
    size === 'lg' ? 15 :
    size === 'md' ? 13 :
    12;

  if (value == null) {
    return (
      <span className={`mono ${cls}`} style={{ fontSize, letterSpacing: '0.02em' }}>
        —
      </span>
    );
  }

  return (
    <span className={`mono ${cls}`} style={{ fontSize, letterSpacing: '0.02em' }}>
      {value.toFixed(1)}
      {unit && (
        <span style={{ fontSize: fontSize - 2, opacity: 0.7, marginLeft: 2 }}>
          {unit}
        </span>
      )}
    </span>
  );
}
