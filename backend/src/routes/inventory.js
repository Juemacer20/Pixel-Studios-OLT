// CRUD de inventario (zones, ODBs, ONU types, authorization presets) desde la DB.
// Reemplaza la lectura de smartolt-meta.json por consultas Prisma reales.
const express = require('express');
const { verifyToken, checkRole } = require('../middleware/auth');
const prisma = require('../config/database');

const wrap = (fn) => async (req, res, next) => {
  try { await fn(req, res, next); } catch (err) { next(err); }
};

// ---------- Zones ----------
const zones = express.Router();
zones.use(verifyToken);
zones.get('/', wrap(async (req, res) => {
  const items = await prisma.zone.findMany({ orderBy: { name: 'asc' } });
  res.json({ data: items });
}));
zones.post('/', checkRole('noc'), wrap(async (req, res) => {
  const { name, description, latitude, longitude } = req.body;
  if (!name) { const e = new Error('name is required'); e.status = 400; throw e; }
  const zone = await prisma.zone.create({ data: { name, description, latitude, longitude } });
  res.status(201).json({ data: zone });
}));
zones.put('/:id', checkRole('noc'), wrap(async (req, res) => {
  const { name, description, latitude, longitude } = req.body;
  const zone = await prisma.zone.update({ where: { id: req.params.id }, data: { name, description, latitude, longitude } });
  res.json({ data: zone });
}));
zones.delete('/:id', checkRole('admin'), wrap(async (req, res) => {
  await prisma.zone.delete({ where: { id: req.params.id } });
  res.json({ message: 'deleted' });
}));

// ---------- ODBs (NAPBox) ----------
const odbs = express.Router();
odbs.use(verifyToken);
odbs.get('/', wrap(async (req, res) => {
  const items = await prisma.nAPBox.findMany({ orderBy: { name: 'asc' } });
  const data = items.map((o) => ({
    ...o,
    usage: o.ports_total ? Math.round((o.ports_used / o.ports_total) * 100) : 0,
    has_coordinates: o.latitude != null && o.longitude != null,
  }));
  res.json({ data });
}));
odbs.post('/', checkRole('noc'), wrap(async (req, res) => {
  const { name, zone, address, latitude, longitude, ports_total, ports_used, odb_port } = req.body;
  if (!name) { const e = new Error('name is required'); e.status = 400; throw e; }
  const odb = await prisma.nAPBox.create({
    data: { name, zone, address, latitude, longitude, ports_total: ports_total ?? 16, ports_used: ports_used ?? 0, odb_port },
  });
  res.status(201).json({ data: odb });
}));
odbs.put('/:id', checkRole('noc'), wrap(async (req, res) => {
  const { name, zone, address, latitude, longitude, ports_total, ports_used, odb_port } = req.body;
  const odb = await prisma.nAPBox.update({
    where: { id: req.params.id },
    data: { name, zone, address, latitude, longitude, ports_total, ports_used, odb_port },
  });
  res.json({ data: odb });
}));
odbs.delete('/:id', checkRole('admin'), wrap(async (req, res) => {
  await prisma.nAPBox.delete({ where: { id: req.params.id } });
  res.json({ message: 'deleted' });
}));

// ---------- ONU types ----------
const onuTypes = express.Router();
onuTypes.use(verifyToken);
onuTypes.get('/', wrap(async (req, res) => {
  const items = await prisma.onuType.findMany({ orderBy: { name: 'asc' } });
  res.json({ data: items });
}));
onuTypes.post('/', checkRole('noc'), wrap(async (req, res) => {
  const { name, ponType, channels, ethernetPorts, wifiBands, voipPorts, hasCATV, allowCustomProfiles, capability } = req.body;
  if (!name) { const e = new Error('name is required'); e.status = 400; throw e; }
  const t = await prisma.onuType.create({
    data: { name, ponType, channels, ethernetPorts, wifiBands, voipPorts, hasCATV: !!hasCATV, allowCustomProfiles: !!allowCustomProfiles, capability },
  });
  res.status(201).json({ data: t });
}));
onuTypes.put('/:id', checkRole('noc'), wrap(async (req, res) => {
  const { name, ponType, channels, ethernetPorts, wifiBands, voipPorts, hasCATV, allowCustomProfiles, capability } = req.body;
  const t = await prisma.onuType.update({
    where: { id: req.params.id },
    data: { name, ponType, channels, ethernetPorts, wifiBands, voipPorts, hasCATV, allowCustomProfiles, capability },
  });
  res.json({ data: t });
}));
onuTypes.delete('/:id', checkRole('admin'), wrap(async (req, res) => {
  await prisma.onuType.delete({ where: { id: req.params.id } });
  res.json({ message: 'deleted' });
}));

// ---------- Authorization presets ----------
const authPresets = express.Router();
authPresets.use(verifyToken);
const PRESET_FIELDS = [
  'name', 'description', 'oltId', 'board', 'port', 'ponType', 'snPattern', 'onuTypeId',
  'fallbackOnuTypeId', 'mode', 'svlanId', 'cvlanId', 'tagTransform', 'downloadSpeedId',
  'uploadSpeedId', 'zoneId', 'odbId', 'webUser', 'webPassword', 'isActive',
];
const pick = (body) => PRESET_FIELDS.reduce((acc, k) => (body[k] !== undefined ? (acc[k] = body[k], acc) : acc), {});
authPresets.get('/', wrap(async (req, res) => {
  const items = await prisma.authorizationPreset.findMany({ orderBy: { created_at: 'desc' } });
  res.json({ data: items });
}));
authPresets.post('/', checkRole('noc'), wrap(async (req, res) => {
  const data = pick(req.body);
  if (!data.name) { const e = new Error('name is required'); e.status = 400; throw e; }
  const preset = await prisma.authorizationPreset.create({ data });
  res.status(201).json({ data: preset });
}));
authPresets.put('/:id', checkRole('noc'), wrap(async (req, res) => {
  const preset = await prisma.authorizationPreset.update({ where: { id: req.params.id }, data: pick(req.body) });
  res.json({ data: preset });
}));
authPresets.delete('/:id', checkRole('admin'), wrap(async (req, res) => {
  await prisma.authorizationPreset.delete({ where: { id: req.params.id } });
  res.json({ message: 'deleted' });
}));

module.exports = { zones, odbs, onuTypes, authPresets };
