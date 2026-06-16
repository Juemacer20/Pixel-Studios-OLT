const MAX_PER_HOUR = {
  REBOOT_ONT:    20,
  AUTHORIZE_ONT: 100,
  ZTP_AUTHORIZE: 100,
  DELETE_ONT:    50,
  UPDATE_ONT:    200,
  CREATE_ONT:    100,
  UPDATE_OLT:    50,
  CONFIG_BACKUP: 10,
  WAN_CHANGE:    50,
  SPEED_PROFILE: 50,
  ENABLE_ONT:    100,
  DISABLE_ONT:   100,
  RESYNC_ONT:    30,
};

const DEFAULT_MAX = 100;

function buildApiLogsSummary(allRows, lastHourRows) {
  const counts = {};
  for (const row of lastHourRows) {
    counts[row.action] = (counts[row.action] || 0) + 1;
  }

  const methods = Object.entries(counts)
    .map(([method, current]) => ({
      method,
      current,
      maxPerHour: MAX_PER_HOUR[method] ?? DEFAULT_MAX,
    }))
    .sort((a, b) => b.current - a.current);

  return {
    methods,
    totalAll:       allRows.length,
    totalLastHour:  lastHourRows.length,
  };
}

module.exports = { buildApiLogsSummary };
