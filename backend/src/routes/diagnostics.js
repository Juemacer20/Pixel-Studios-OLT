const express = require('express');
const prisma = require('../config/database');
const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const { status, olt_id, limit = 1000 } = req.query;
    const where = {};
    if (olt_id) where.olt_id = olt_id;
    if (status === 'online') where.status = 'ONLINE';
    else if (status === 'offline') where.status = { in: ['OFFLINE', 'LOS'] };

    const onts = await prisma.oNT.findMany({
      where,
      include: { olt: { select: { id: true, name: true } } },
      orderBy: { rx_power: 'asc' },
      take: parseInt(limit),
    });

    res.json({ data: onts });
  } catch (e) { next(e); }
});

module.exports = router;
