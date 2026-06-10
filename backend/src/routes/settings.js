// Settings: signal thresholds + billing (suscripciones por OLT).
const express = require('express');
const { verifyToken, checkRole } = require('../middleware/auth');
const prisma = require('../config/database');
const router = express.Router();
router.use(verifyToken);
const wrap = (fn) => async (req, res, next) => { try { await fn(req, res, next); } catch (e) { next(e); } };

// Signal threshold config (fila única).
router.get('/signal-thresholds', wrap(async (req, res) => {
  let cfg = await prisma.signalThresholdConfig.findFirst();
  if (!cfg) cfg = await prisma.signalThresholdConfig.create({ data: {} });
  res.json({ data: cfg });
}));

router.put('/signal-thresholds', checkRole('admin'), wrap(async (req, res) => {
  const fields = ['variationThreshold', 'largeVariationDelta', 'multiOnuThreshold', 'trendWindowHours', 'trendMinEvents'];
  const data = fields.reduce((a, k) => (req.body[k] !== undefined ? (a[k] = req.body[k], a) : a), {});
  let cfg = await prisma.signalThresholdConfig.findFirst();
  cfg = cfg
    ? await prisma.signalThresholdConfig.update({ where: { id: cfg.id }, data })
    : await prisma.signalThresholdConfig.create({ data });
  res.json({ data: cfg });
}));

// Billing: una fila por OLT (crea las faltantes como "active").
router.get('/billing', wrap(async (req, res) => {
  const olts = await prisma.oLT.findMany({ select: { id: true, name: true } });
  const subs = await prisma.oltSubscription.findMany();
  const byOlt = new Map(subs.map((s) => [s.olt_id, s]));
  const data = olts.map((o) => {
    const s = byOlt.get(o.id);
    return { olt_id: o.id, olt_name: o.name, status: s?.status || 'active', endDate: s?.endDate || null, id: s?.id || null };
  });
  res.json({ data });
}));

router.put('/billing/:oltId', checkRole('admin'), wrap(async (req, res) => {
  const { status, endDate } = req.body;
  const data = { status, endDate: endDate ? new Date(endDate) : null };
  const sub = await prisma.oltSubscription.upsert({
    where: { olt_id: req.params.oltId },
    update: data,
    create: { olt_id: req.params.oltId, ...data },
  });
  res.json({ data: sub });
}));

module.exports = router;
