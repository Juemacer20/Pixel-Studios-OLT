const express = require('express');
const { verifyToken } = require('../middleware/auth');
const router = express.Router();
router.use(verifyToken);

router.get('/onts', async (req, res, next) => {
  try {
    const prisma = require('../config/database');
    const onts = await prisma.oNT.findMany({
      where: { latitude: { not: null }, longitude: { not: null } },
      select: { id: true, serial_number: true, description: true, status: true, rx_power: true, latitude: true, longitude: true },
    });
    res.json({ data: onts });
  } catch (err) { next(err); }
});

router.get('/olts', async (req, res, next) => {
  try {
    const prisma = require('../config/database');
    const olts = await prisma.oLT.findMany({ select: { id: true, name: true, ip: true, status: true, location: true } });
    res.json({ data: olts });
  } catch (err) { next(err); }
});

module.exports = router;
