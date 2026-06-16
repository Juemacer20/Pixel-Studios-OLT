// Settings: signal thresholds + billing (suscripciones por OLT).
const express = require('express');
const { verifyToken, checkRole } = require('../middleware/auth');
const prisma = require('../config/database');
const { buildApiLogsSummary } = require('./settings.helpers');
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

// ── General / Polling settings — persisted in system_configs ─────────────────
const GENERAL_KEYS = { company: 'Pixel Studios', timezone: 'America/Argentina/Buenos_Aires', language: 'es', logo_url: '' };
const POLLING_KEYS = { polling_interval: '5', snmp_timeout: '3', snmp_retries: '2', snmp_version: '2c', snmp_community: 'public' };

async function readConfigs(defaults) {
  const keys = Object.keys(defaults);
  const rows = await prisma.systemConfig.findMany({ where: { key: { in: keys } } });
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return Object.fromEntries(keys.map((k) => [k, map[k] ?? defaults[k] ?? '']));
}

async function writeConfigs(data) {
  await Promise.all(
    Object.entries(data).map(([key, value]) =>
      prisma.systemConfig.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      }),
    ),
  );
}

router.get('/general', wrap(async (req, res) => {
  res.json({ data: await readConfigs(GENERAL_KEYS) });
}));

router.put('/general', checkRole('admin'), wrap(async (req, res) => {
  const allowed = new Set(Object.keys(GENERAL_KEYS));
  const data = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.has(k)));
  await writeConfigs(data);
  res.json({ data: await readConfigs(GENERAL_KEYS) });
}));

router.get('/polling', wrap(async (req, res) => {
  const raw = await readConfigs(POLLING_KEYS);
  res.json({ data: { interval: Number(raw.polling_interval), snmp_timeout: Number(raw.snmp_timeout), snmp_retries: Number(raw.snmp_retries), snmp_version: raw.snmp_version, snmp_community: raw.snmp_community } });
}));

router.put('/polling', checkRole('admin'), wrap(async (req, res) => {
  const { interval, snmp_timeout, snmp_retries, snmp_version, snmp_community } = req.body;
  const data = {};
  if (interval       != null) data.polling_interval = String(interval);
  if (snmp_timeout   != null) data.snmp_timeout      = String(snmp_timeout);
  if (snmp_retries   != null) data.snmp_retries      = String(snmp_retries);
  if (snmp_version   != null) data.snmp_version      = String(snmp_version);
  if (snmp_community != null) data.snmp_community    = String(snmp_community);
  await writeConfigs(data);
  const raw = await readConfigs(POLLING_KEYS);
  res.json({ data: { interval: Number(raw.polling_interval), snmp_timeout: Number(raw.snmp_timeout), snmp_retries: Number(raw.snmp_retries), snmp_version: raw.snmp_version, snmp_community: raw.snmp_community } });
}));

// GET /settings/api-logs — audit log activity summary used by the API Logs tab.
router.get('/api-logs', wrap(async (req, res) => {
  const oneHourAgo = new Date(Date.now() - 3600 * 1000);
  const [allRows, lastHourRows] = await Promise.all([
    prisma.auditLog.findMany({ select: { action: true } }),
    prisma.auditLog.findMany({ where: { created_at: { gte: oneHourAgo } }, select: { action: true } }),
  ]);
  res.json({ data: buildApiLogsSummary(allRows, lastHourRows) });
}));

module.exports = router;
