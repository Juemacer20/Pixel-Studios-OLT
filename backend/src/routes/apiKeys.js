// CRUD de API keys + regeneración.
const crypto = require('crypto');
const express = require('express');
const { verifyToken, checkRole } = require('../middleware/auth');
const prisma = require('../config/database');
const router = express.Router();
router.use(verifyToken);
const wrap = (fn) => async (req, res, next) => { try { await fn(req, res, next); } catch (e) { next(e); } };

const genKey = () => 'pso_' + crypto.randomBytes(24).toString('hex');

router.get('/', wrap(async (req, res) => {
  res.json({ data: await prisma.apiKey.findMany({ orderBy: { created_at: 'desc' } }) });
}));

router.post('/', checkRole('admin'), wrap(async (req, res) => {
  const { name, type, restrictionGroup, allowedIPs } = req.body;
  const key = await prisma.apiKey.create({
    data: { key: genKey(), name: name || 'API key', type: type || 'full', restrictionGroup, allowedIPs },
  });
  res.status(201).json({ data: key });
}));

router.post('/:id/regenerate', checkRole('admin'), wrap(async (req, res) => {
  const key = await prisma.apiKey.update({ where: { id: req.params.id }, data: { key: genKey() } });
  res.json({ data: key });
}));

router.delete('/:id', checkRole('admin'), wrap(async (req, res) => {
  await prisma.apiKey.delete({ where: { id: req.params.id } });
  res.json({ message: 'deleted' });
}));

module.exports = router;
