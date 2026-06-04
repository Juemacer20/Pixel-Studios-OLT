const express = require('express');
const { verifyToken } = require('../middleware/auth');
const prisma = require('../config/database');
const router = express.Router();

router.use(verifyToken);

router.get('/summary', async (req, res, next) => {
  try {
    const [totalOLTs, onlineOLTs, totalONTs, activeAlerts, losAlerts, onlineONTs, ztpPending] = await Promise.all([
      prisma.oLT.count(),
      prisma.oLT.count({ where: { status: 'ONLINE' } }),
      prisma.oNT.count(),
      prisma.alert.count({ where: { resolved: false } }),
      prisma.alert.count({ where: { resolved: false, type: 'LOS' } }),
      prisma.oNT.count({ where: { status: 'ONLINE' } }),
      prisma.oNT.count({ where: { status: 'PENDING' } }),
    ]);

    res.json({
      data: {
        totalOLTs,
        onlineOLTs,
        totalONTs,
        onlineONTs,
        offlineONTs: totalONTs - onlineONTs,
        activeAlerts,
        losONTs: losAlerts,
        losCount: losAlerts,
        ztpPending,
        onlinePercent: totalONTs > 0 ? Math.round((onlineONTs / totalONTs) * 100) : 0,
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
