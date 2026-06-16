const ACTION_MESSAGES = {
  REBOOT_ONT:       (d) => `Reboot — ${d.name || d.sn || d.target || ''}`.trimEnd().replace(/— $/, ''),
  AUTHORIZE_ONT:    (d) => `ONU authorized — ${d.name || d.sn || ''}`.trimEnd().replace(/— $/, ''),
  ZTP_AUTHORIZE:    (d) => `Auto-authorized — ${d.name || d.sn || ''}`.trimEnd().replace(/— $/, ''),
  DELETE_ONT:       (d) => `ONU deleted — ${d.sn || d.name || ''}`.trimEnd().replace(/— $/, ''),
  UPDATE_ONT:       (d) => `Config updated — ${d.name || d.sn || ''}`.trimEnd().replace(/— $/, ''),
  CREATE_ONT:       (d) => `ONU created — ${d.name || d.sn || ''}`.trimEnd().replace(/— $/, ''),
  UPDATE_OLT:       (d) => `OLT updated — ${d.oltName || d.name || ''}`.trimEnd().replace(/— $/, ''),
  CONFIG_BACKUP:    (d) => `Auto config backup saved${d.oltName ? ` for ${d.oltName}` : ''}`,
  WAN_CHANGE:       (d) => `WAN config changed — ${d.name || d.sn || ''}`.trimEnd().replace(/— $/, ''),
  SPEED_PROFILE:    (d) => `Speed profile updated — ${d.name || d.sn || ''}`.trimEnd().replace(/— $/, ''),
  ENABLE_ONT:       (d) => `ONU enabled — ${d.name || d.sn || ''}`.trimEnd().replace(/— $/, ''),
  DISABLE_ONT:      (d) => `ONU disabled — ${d.name || d.sn || ''}`.trimEnd().replace(/— $/, ''),
  RESYNC_ONT:       (d) => `Config resynced — ${d.name || d.sn || ''}`.trimEnd().replace(/— $/, ''),
};

function buildActivityFeed(rows) {
  return rows.map(row => {
    const details = row.details || {};
    const fn = ACTION_MESSAGES[row.action];
    const message = fn ? fn(details) : row.action;
    return { id: row.id, action: row.action, message, user: row.user_id, target: row.target, created_at: row.created_at };
  });
}

function buildPonOutage(onts, oltNames) {
  const sevenDays = Date.now() - 7 * 24 * 3600 * 1000;

  const ports = {};
  for (const o of onts) {
    if (o.board == null || o.port == null) continue;
    const portLabel = `${o.board}/${o.port}`;
    const k = `${o.olt_id}|${portLabel}`;
    if (!ports[k]) ports[k] = { olt_id: o.olt_id, port: portLabel, total: 0, off: 0, since: null };
    ports[k].total++;
    if ((o.status || '').toUpperCase() !== 'ONLINE') {
      ports[k].off++;
      if (o.last_seen && (!ports[k].since || o.last_seen < ports[k].since)) ports[k].since = o.last_seen;
    }
  }

  const byOlt = {};
  for (const p of Object.values(ports)) {
    if (p.total < 2 || p.off < p.total * 0.9) continue;
    const name = oltNames[p.olt_id] || p.olt_id;
    if (!byOlt[name]) byOlt[name] = { olt: name, pons: 0, subscribers: 0, since: null, longDownPons: 0, longDownSubs: 0 };
    byOlt[name].pons++;
    byOlt[name].subscribers += p.off;
    if (p.since && (!byOlt[name].since || p.since < byOlt[name].since)) byOlt[name].since = p.since;
    if (p.since && new Date(p.since).getTime() < sevenDays) {
      byOlt[name].longDownPons++;
      byOlt[name].longDownSubs += p.off;
    }
  }

  const rows = Object.values(byOlt).sort((a, b) => b.subscribers - a.subscribers);
  const active = { pons: rows.reduce((s, r) => s + r.pons, 0), subs: rows.reduce((s, r) => s + r.subscribers, 0) };
  const stale  = { pons: rows.reduce((s, r) => s + r.longDownPons, 0), subs: rows.reduce((s, r) => s + r.longDownSubs, 0) };
  return { rows, active, stale, totalPons: stale.pons, totalSubs: stale.subs };
}

module.exports = { buildActivityFeed, buildPonOutage };
