const express = require('express');
const { verifyToken } = require('../middleware/auth');
const router = express.Router();
router.use(verifyToken);

router.get('/devices', async (req, res, next) => {
  try {
    const prisma = require('../config/database');
    const devices = await prisma.tR069Device.findMany({ include: { ont: true, client: true }, take: 100 });
    res.json({ data: devices });
  } catch (err) { next(err); }
});

router.get('/devices/:id', async (req, res, next) => {
  try {
    const prisma = require('../config/database');
    const device = await prisma.tR069Device.findUnique({ where: { id: req.params.id }, include: { ont: true, client: true } });
    if (!device) return res.status(404).json({ error: 'Device not found' });
    res.json({ data: device });
  } catch (err) { next(err); }
});

module.exports = router;
