// CRUD de AutoActionPreset + toggle + ejecución manual del auto-authorize.
const express = require('express');
const { verifyToken, checkRole } = require('../middleware/auth');
const prisma = require('../config/database');
const { runOnce } = require('../jobs/autoAuthorize');

const router = express.Router();
router.use(verifyToken);

const wrap = (fn) => async (req, res, next) => { try { await fn(req, res, next); } catch (e) { next(e); } };

const FIELDS = [
  'name', 'olts', 'boards', 'ports', 'ponType', 'snPattern', 'onuTypeId', 'fallbackOnuTypeId',
  'isDefault', 'mode', 'svlanId', 'cvlanId', 'tagTransform', 'downloadSpeed', 'uploadSpeed',
  'zoneId', 'odbId', 'webUser', 'webPassword', 'description', 'isActive',
];
const pick = (b) => FIELDS.reduce((a, k) => (b[k] !== undefined ? (a[k] = b[k], a) : a), {});

router.get('/', wrap(async (req, res) => {
  res.json({ data: await prisma.autoActionPreset.findMany({ orderBy: { created_at: 'desc' } }) });
}));

router.post('/', checkRole('noc'), wrap(async (req, res) => {
  const data = pick(req.body);
  if (!data.name) { const e = new Error('name is required'); e.status = 400; throw e; }
  res.status(201).json({ data: await prisma.autoActionPreset.create({ data }) });
}));

router.put('/:id', checkRole('noc'), wrap(async (req, res) => {
  res.json({ data: await prisma.autoActionPreset.update({ where: { id: req.params.id }, data: pick(req.body) }) });
}));

router.post('/:id/toggle', checkRole('noc'), wrap(async (req, res) => {
  const p = await prisma.autoActionPreset.findUnique({ where: { id: req.params.id } });
  if (!p) { const e = new Error('Preset not found'); e.status = 404; throw e; }
  res.json({ data: await prisma.autoActionPreset.update({ where: { id: req.params.id }, data: { isActive: !p.isActive } }) });
}));

router.delete('/:id', checkRole('admin'), wrap(async (req, res) => {
  await prisma.autoActionPreset.delete({ where: { id: req.params.id } });
  res.json({ message: 'deleted' });
}));

// Ejecuta el barrido de auto-authorize una vez (respeta el modo dry-run del job).
router.post('/run-now', checkRole('noc'), wrap(async (req, res) => {
  res.json({ data: await runOnce() });
}));

module.exports = router;
