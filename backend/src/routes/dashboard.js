const express = require('express');
const { verifyToken } = require('../middleware/auth');
const prisma = require('../config/database');
const router = express.Router();

router.use(verifyToken);

router.get('/summary', async (req, res, next) => {
  try {
    const [totalOLTs, totalONTs, activeAlerts, losAlerts, onlineONTs] = await Promise.all([
      prisma.oLT.count(),
      prisma.oNT.count(),
      prisma.alert.count({ where: { resolved: false } }),
      prisma.alert.count({ where: { resolved: false, type: 'LOS' } }),
      prisma.oNT.count({ where: { status: 'ONLINE' } }),
    ]);

    res.json({
      data: {
        totalOLTs,
        totalONTs,
        activeAlerts,
        losCount: losAlerts,
        onlinePercent: totalONTs > 0 ? Math.round((onlineONTs / totalONTs) * 100) : 0,
        onlineONTs,
        offlineONTs: totalONTs - onlineONTs,
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

module.exports = router;
