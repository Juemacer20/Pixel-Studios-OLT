const express = require('express');
const { verifyToken } = require('../middleware/auth');
const prisma = require('../config/database');
const router = express.Router();

router.use(verifyToken);

router.get('/signal-summary', async (req, res, next) => {
  try {
    const { ontId, range = '24h' } = req.query;
    const ranges = { '24h': 24, '7d': 168, '30d': 720 };
    const hours = ranges[range] || 24;
    const since = new Date(Date.now() - hours * 3600 * 1000);

    const where = { timestamp: { gte: since } };
    if (ontId) where.ont_id = ontId;

    const data = await prisma.signalHistory.findMany({
      where,
      orderBy: { timestamp: 'asc' },
      take: 1000,
    });
    res.json({ data, range, count: data.length });
  } catch (err) { next(err); }
});

module.exports = router;
