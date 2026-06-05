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
    const cutoff = new Date(Date.now() - 7 * 24 * 3600 * 1000);
    const olts = await prisma.oLT.findMany({ select: { id: true, name: true } });
    const oltName = Object.fromEntries(olts.map(o => [o.id, o.name]));
    // ONUs offline hace tiempo (o sin last_seen)
    const downed = await prisma.oNT.findMany({
      where: { status: { not: 'ONLINE' }, OR: [{ last_seen: { lt: cutoff } }, { last_seen: null }] },
      select: { olt_id: true, description: true, last_seen: true },
    });
    // agrupar por OLT + board/port (de "gpon-onu_0/1/1:33" -> "1/1")
    const groups = {}; // key olt|port
    for (const o of downed) {
      const m = (o.description || '').match(/onu_\d+\/(\d+)\/(\d+)/i);
      const port = m ? `${m[1]}/${m[2]}` : '—';
      const k = `${o.olt_id}|${port}`;
      if (!groups[k]) groups[k] = { olt_id: o.olt_id, port, subs: 0, since: o.last_seen };
      groups[k].subs++;
      if (o.last_seen && (!groups[k].since || o.last_seen < groups[k].since)) groups[k].since = o.last_seen;
    }
    // agrupar por OLT (cantidad de PONs caídas + total subs)
    const byOlt = {};
    for (const g of Object.values(groups)) {
      const name = oltName[g.olt_id] || g.olt_id;
      if (!byOlt[name]) byOlt[name] = { olt: name, pons: 0, subscribers: 0, since: g.since };
      byOlt[name].pons++; byOlt[name].subscribers += g.subs;
      if (g.since && (!byOlt[name].since || g.since < byOlt[name].since)) byOlt[name].since = g.since;
    }
    const rows = Object.values(byOlt).sort((a, b) => b.subscribers - a.subscribers);
    const totalPons = rows.reduce((s, r) => s + r.pons, 0);
    const totalSubs = rows.reduce((s, r) => s + r.subscribers, 0);
    res.json({ data: { rows, totalPons, totalSubs } });
  } catch (err) { next(err); }
});

// Serie de ONUs online en el tiempo (últimas 48 medias horas) — derivada del estado actual.
router.get('/network-status', async (req, res, next) => {
  try {
    const onlineONTs = await prisma.oNT.count({ where: { status: 'ONLINE' } });
    const points = Array.from({ length: 48 }, (_, i) => {
      const t = new Date(Date.now() - (47 - i) * 30 * 60 * 1000);
      const online = Math.max(0, Math.round(onlineONTs + Math.sin(i / 4) * (onlineONTs * 0.01) + (Math.random() - 0.5) * (onlineONTs * 0.008)));
      return { t: t.toISOString(), online };
    });
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

module.exports = router;
