import React from 'react';

function getSignalLevel(value) {
  if (value == null)  return { cls: 'signal-unknown', label: '—' };
  if (value > -20)    return { cls: 'signal-optimal', label: 'Good' };
  if (value >= -27)   return { cls: 'signal-warn',    label: 'Warning' };
  return               { cls: 'signal-critical', label: 'Critical' };
}

/**
 * SignalBadge — nivel de señal SmartOLT: Good / Warning / Critical.
 *
 * @param {number|null} value      - dBm (ej: -21.3)
 * @param {boolean}     showValue  - muestra el valor numérico
 * @param {boolean}     showLabel  - muestra el label textual
 */
export default function SignalBadge({ value, showValue = true, showLabel = false }) {
  const { cls, label } = getSignalLevel(value);

  return (
    <span className={`mono ${cls}`} style={{ fontSize: 12, letterSpacing: '0.02em' }}>
      {value != null && showValue && (
        <>{value.toFixed(1)}<span style={{ fontSize: 10, opacity: 0.7, marginLeft: 2 }}>dBm</span></>
      )}
      {showLabel && value != null && (
        <span style={{ marginLeft: showValue ? 4 : 0 }}>{label}</span>
      )}
      {value == null && '—'}
    </span>
  );
}
