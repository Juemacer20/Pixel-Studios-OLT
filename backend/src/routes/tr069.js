const express = require('express');
const { verifyToken, checkRole } = require('../middleware/auth');
const prisma = require('../config/database');
const router = express.Router();
router.use(verifyToken);
const wrap = (fn) => async (req, res, next) => { try { await fn(req, res, next); } catch (e) { next(e); } };

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

// ── VPN tunnels CRUD ──
router.get('/vpn-tunnels', wrap(async (req, res) => {
  res.json({ data: await prisma.vpnTunnel.findMany({ orderBy: { created_at: 'desc' } }) });
}));
router.post('/vpn-tunnels', checkRole('noc'), wrap(async (req, res) => {
  const { name, oltIds, subnet, status } = req.body;
  if (!name) { const e = new Error('name required'); e.status = 400; throw e; }
  const t = await prisma.vpnTunnel.create({ data: { name, oltIds: oltIds || '[]', subnet, status: status || 'active' } });
  res.status(201).json({ data: t });
}));
router.put('/vpn-tunnels/:id', checkRole('noc'), wrap(async (req, res) => {
  const { name, oltIds, subnet, status, connected } = req.body;
  res.json({ data: await prisma.vpnTunnel.update({ where: { id: req.params.id }, data: { name, oltIds, subnet, status, connected } }) });
}));
router.delete('/vpn-tunnels/:id', checkRole('admin'), wrap(async (req, res) => {
  await prisma.vpnTunnel.delete({ where: { id: req.params.id } });
  res.json({ message: 'deleted' });
}));

// ── TR-069 profiles CRUD ──
router.get('/profiles', wrap(async (req, res) => {
  res.json({ data: await prisma.tr069Profile.findMany({ orderBy: { created_at: 'desc' } }) });
}));
router.post('/profiles', checkRole('noc'), wrap(async (req, res) => {
  const { name, acsUrl, oltIds, status } = req.body;
  if (!name) { const e = new Error('name required'); e.status = 400; throw e; }
  const p = await prisma.tr069Profile.create({ data: { name, acsUrl, oltIds, status: status || 'active' } });
  res.status(201).json({ data: p });
}));
router.put('/profiles/:id', checkRole('noc'), wrap(async (req, res) => {
  const { name, acsUrl, oltIds, status } = req.body;
  res.json({ data: await prisma.tr069Profile.update({ where: { id: req.params.id }, data: { name, acsUrl, oltIds, status } }) });
}));
router.delete('/profiles/:id', checkRole('admin'), wrap(async (req, res) => {
  await prisma.tr069Profile.delete({ where: { id: req.params.id } });
  res.json({ message: 'deleted' });
}));

module.exports = router;
