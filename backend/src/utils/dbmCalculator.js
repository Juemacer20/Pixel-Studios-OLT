const THRESHOLDS = {
  LOS_MIN: -27,
  HIGH_SIGNAL_MAX: -8,
  WARN_LOW: -25,
  WARN_HIGH: -10,
  OPTIMAL_MIN: -22,
  OPTIMAL_MAX: -12,
};

function getSignalStatus(rxPower) {
  if (rxPower === null || rxPower === undefined) return 'unknown';
  if (rxPower <= THRESHOLDS.LOS_MIN) return 'los';
  if (rxPower <= THRESHOLDS.WARN_LOW) return 'critical';
  if (rxPower >= THRESHOLDS.HIGH_SIGNAL_MAX) return 'high';
  if (rxPower >= THRESHOLDS.WARN_HIGH) return 'warn-high';
  if (rxPower >= THRESHOLDS.OPTIMAL_MIN && rxPower <= THRESHOLDS.OPTIMAL_MAX) return 'optimal';
  return 'normal';
}

function getSignalColor(rxPower) {
  const status = getSignalStatus(rxPower);
  const colors = {
    los: '#FF3B5C',
    critical: '#FF6B35',
    high: '#A855F7',
    'warn-high': '#FF6B35',
    optimal: '#00FF94',
    normal: '#00D4FF',
    unknown: '#6B7280',
  };
  return colors[status] || colors.unknown;
}

module.exports = { THRESHOLDS, getSignalStatus, getSignalColor };
