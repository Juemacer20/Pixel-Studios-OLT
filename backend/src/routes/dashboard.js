const express = require('express');
const { verifyToken } = require('../middleware/auth');
const prisma = require('../config/database');
const router = express.Router();

router.use(verifyToken);

router.get('/summary', async (req, res, next) => {
  try {
    const [
      totalOLTs, onlineOLTs, totalONTs, onlineONTs, activeAlerts,
      pending, statusLOS, statusDG, statusOFF,
      critical, warning,
    ] = await Promise.all([
      prisma.oLT.count(),
      prisma.oLT.count({ where: { status: 'ONLINE' } }),
      prisma.oNT.count(),
      prisma.oNT.count({ where: { status: 'ONLINE' } }),
      prisma.alert.count({ where: { resolved: false } }),
      prisma.oNT.count({ where: { status: 'PENDING' } }),
      prisma.oNT.count({ where: { status: 'LOS' } }),          // LoS
      prisma.oNT.count({ where: { status: 'DYING_GASP' } }),    // Power fail
      prisma.oNT.count({ where: { status: 'OFFLINE' } }),       // N/A
      prisma.oNT.count({ where: { status: 'ONLINE', rx_power: { lte: -27 } } }),                    // Critical
      prisma.oNT.count({ where: { status: 'ONLINE', rx_power: { gt: -27, lte: -25 } } }),           // Warning
    ]);

    const offlineTotal = statusLOS + statusDG + statusOFF;
    const lowSignals = warning + critical;

    res.json({
      data: {
        totalOLTs, onlineOLTs, totalONTs, onlineONTs,
        totalAuthorized: totalONTs,
        // Caja 1: Waiting authorization
        waiting: pending,
        waitingBreakdown: { d: 0, resync: 0, new: pending },
        // Caja 3: Total offline
        offlineONTs: offlineTotal,
        offlineBreakdown: { pwrfail: statusDG, los: statusLOS, na: statusOFF },
        // Caja 4: Low signals
        lowSignals,
        lowSignalsBreakdown: { warning, critical },
        // compat
        activeAlerts,
        losONTs: statusLOS,
        losCount: statusLOS,
        ztpPending: pending,
        onlinePercent: totalONTs > 0 ? Math.round((onlineONTs / totalONTs) * 100) : 0,
        validAt: new Date().toISOString(),
      },
    });
  } catch (err) { next(err); }
});

router.get('/network-health', async (req, res, next) => {
  try {
    const olts = await prisma.oLT.findMany({
      select: { id: true, name: true, status: true, cpu_usage: true, temperature: true, _count: { select: { onts: true } } },
    });
    const criticalAlerts = await prisma.alert.count({ where: { resolved: false, severity: 'CRITICAL' } });
    const offlineOLTs = olts.filter(o => o.status === 'OFFLINE').length;

    res.json({
      data: {
        olts,
        criticalAlerts,
        offlineOLTs,
        health: offlineOLTs === 0 && criticalAlerts === 0 ? 'healthy' : criticalAlerts > 2 ? 'critical' : 'degraded',
      },
    });
  } catch (err) { next(err); }
});

// PON outage: PONs (board/port) con suscriptores caídos > 7 días, agrupados por OLT.
router.get('/pon-outage', async (req, res, next) => {
  try {
    const olts = await prisma.oLT.findMany({ select: { id: true, name: true } });
    const oltName = Object.fromEntries(olts.map(o => [o.id, o.name]));
    const sevenDays = Date.now() - 7 * 24 * 3600 * 1000;
    // Todas las ONUs con su PON (frame/slot/port de "0/12/0:9") para detectar PON entera caída
    const all = await prisma.oNT.findMany({ select: { olt_id: true, description: true, status: true, last_seen: true } });
    const ports = {}; // key olt|slot/port -> { total, off, since }
    const parsePort = (d) => {
      const m = (d || '').match(/(\d+)\/(\d+)\/(\d+)/); // frame/slot/port
      return m ? `${m[2]}/${m[3]}` : null;
    };
    for (const o of all) {
      const port = parsePort(o.description); if (!port) continue;
      const k = `${o.olt_id}|${port}`;
      if (!ports[k]) ports[k] = { olt_id: o.olt_id, port, total: 0, off: 0, since: null };
      ports[k].total++;
      if ((o.status || '').toUpperCase() !== 'ONLINE') {
        ports[k].off++;
        if (o.last_seen && (!ports[k].since || o.last_seen < ports[k].since)) ports[k].since = o.last_seen;
      }
    }
    // PON outage = puerto donde TODAS (o >=90%) las ONUs están caídas, con >=2 suscriptores
    const byOlt = {};
    for (const p of Object.values(ports)) {
      if (p.total < 2 || p.off < p.total * 0.9) continue; // PON entera caída
      const name = oltName[p.olt_id] || p.olt_id;
      if (!byOlt[name]) byOlt[name] = { olt: name, pons: 0, subscribers: 0, since: null, longDownPons: 0, longDownSubs: 0 };
      byOlt[name].pons++; byOlt[name].subscribers += p.off;
      if (p.since && (!byOlt[name].since || p.since < byOlt[name].since)) byOlt[name].since = p.since;
      if (p.since && new Date(p.since).getTime() < sevenDays) { byOlt[name].longDownPons++; byOlt[name].longDownSubs += p.off; }
    }
    const rows = Object.values(byOlt).sort((a, b) => b.subscribers - a.subscribers);
    // "Power outages - monitor grid" = PONs caídas ahora; "Stale" = caídas > 7 días
    const active = { pons: rows.reduce((s, r) => s + r.pons, 0), subs: rows.reduce((s, r) => s + r.subscribers, 0) };
    const stale  = { pons: rows.reduce((s, r) => s + r.longDownPons, 0), subs: rows.reduce((s, r) => s + r.longDownSubs, 0) };
    res.json({ data: { rows, active, stale, totalPons: stale.pons, totalSubs: stale.subs } });
  } catch (err) { next(err); }
});

// Network status: 4 series (online / powerfail / los / na) en el tiempo, de net_status_history.
// ?range=hourly|daily|weekly|monthly|yearly
const RANGES = {
  hourly:  { interval: '1 hours',   bucket: 300,    pts: 12 },   // 5 min
  daily:   { interval: '24 hours',  bucket: 1800,   pts: 24 },   // 30 min
  weekly:  { interval: '7 days',    bucket: 21600,  pts: 28 },   // 6 h
  monthly: { interval: '30 days',   bucket: 86400,  pts: 30 },   // 1 día
  yearly:  { interval: '365 days',  bucket: 2592000, pts: 12 },  // 30 días
};
router.get('/network-status', async (req, res, next) => {
  try {
    const r = RANGES[req.query.range] || RANGES.daily;
    let points = [];
    try {
      const rows = await prisma.$queryRawUnsafe(`
        SELECT to_timestamp(floor(extract(epoch from timestamp)/${r.bucket})*${r.bucket}) AS t,
               round(avg(online))::int AS online, round(avg(powerfail))::int AS powerfail,
               round(avg(los))::int AS los, round(avg(na))::int AS na
        FROM net_status_history
        WHERE timestamp > now() - interval '${r.interval}'
        GROUP BY 1 ORDER BY 1
      `);
      points = rows.map(x => ({ t: new Date(x.t).toISOString(), online: Number(x.online), powerfail: Number(x.powerfail), los: Number(x.los), na: Number(x.na) }));
    } catch { /* tabla aún no existe */ }

    if (points.length < 6) {
      // Sin histórico suficiente: línea estable con el desglose ACTUAL real
      const [online, powerfail, los, na] = await Promise.all([
        prisma.oNT.count({ where: { status: 'ONLINE' } }),
        prisma.oNT.count({ where: { status: 'DYING_GASP' } }),
        prisma.oNT.count({ where: { status: 'LOS' } }),
        prisma.oNT.count({ where: { status: 'OFFLINE' } }),
      ]);
      const span = { hourly: 3600e3, daily: 86400e3, weekly: 604800e3, monthly: 2592000e3, yearly: 31536000e3 }[req.query.range] || 86400e3;
      points = Array.from({ length: r.pts }, (_, i) => ({
        t: new Date(Date.now() - (r.pts - 1 - i) * (span / r.pts)).toISOString(), online, powerfail, los, na,
      }));
    }
    res.json({ data: points });
  } catch (err) { next(err); }
});

// Autorizaciones de ONU por día (últimos 30 días) — por created_at de ONT.
router.get('/authorizations-per-day', async (req, res, next) => {
  try {
    const since = new Date(Date.now() - 30 * 24 * 3600 * 1000);
    const onts = await prisma.oNT.findMany({ where: { created_at: { gte: since } }, select: { created_at: true } });
    const buckets = {};
    for (let i = 0; i < 30; i++) {
      const day = new Date(Date.now() - (29 - i) * 24 * 3600 * 1000).toISOString().slice(0, 10);
      buckets[day] = 0;
    }
    onts.forEach(o => { const k = o.created_at.toISOString().slice(0, 10); if (k in buckets) buckets[k]++; });
    res.json({ data: Object.entries(buckets).map(([day, n]) => ({ day, n })) });
  } catch (err) { next(err); }
});

// GET /api/v1/dashboard/signal-degradation — ONUs con señal degradada, agrupadas por OLT.
router.get('/signal-degradation', async (req, res, next) => {
  try {
    const onts = await prisma.oNT.findMany({
      where: { rx_power: { not: null, lt: -25 } },
      select: { rx_power: true, board: true, port: true, olt: { select: { name: true } } },
      take: 5000,
    });
    const groups = {};
    for (const o of onts) {
      const key = `${o.olt?.name || '—'}|${o.board ?? '-'}/${o.port ?? '-'}`;
      if (!groups[key]) groups[key] = { oltName: o.olt?.name || '—', boardPort: `${o.board ?? '-'}/${o.port ?? '-'}`, vals: [] };
      groups[key].vals.push(o.rx_power);
    }
    const rows = Object.values(groups).map((g) => {
      const worst = Math.min(...g.vals);
      const avg = g.vals.reduce((a, b) => a + b, 0) / g.vals.length;
      return {
        severity: worst < -27 ? 'critical' : 'warning',
        oltName: g.oltName, boardPort: g.boardPort,
        avgDelta: Math.abs(avg + 22), maxDelta: Math.abs(worst + 22),
        degraded: g.vals.length, events: g.vals.length,
        lastScan: new Date().toISOString(),
      };
    }).sort((a, b) => b.maxDelta - a.maxDelta).slice(0, 50);
    res.json({ data: { rows } });
  } catch (err) { next(err); }
});

// GET /api/v1/dashboard/activity-feed — últimas acciones del audit log.
router.get('/activity-feed', async (req, res, next) => {
  try {
    const items = await prisma.auditLog.findMany({ orderBy: { created_at: 'desc' }, take: 20 });
    res.json({ data: items });
  } catch (err) { next(err); }
});

module.exports = router;
