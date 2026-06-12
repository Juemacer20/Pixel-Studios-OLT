const express = require('express');
const prisma = require('../config/database');
const { getAdapter } = require('../utils/oltFactory');
const { verifyToken, checkRole } = require('../middleware/auth');
const logger = require('../middleware/logger');

const router = express.Router();

router.use(verifyToken);

// VSOL-specific routes — require the OLT to be VSOL brand
async function getVsolOlt(oltId) {
  const olt = await prisma.oLT.findUnique({ where: { id: oltId } });
  if (!olt) throw Object.assign(new Error('OLT not found'), { status: 404 });
  if ((olt.brand || '').toLowerCase() !== 'vsol') {
    throw Object.assign(new Error('This OLT is not a VSOL device'), { status: 400 });
  }
  return olt;
}

// List PON ports with ONU count
router.get('/:oltId/ports', async (req, res, next) => {
  try {
    const olt = await getVsolOlt(req.params.oltId);
    const adapter = getAdapter(olt);
    const onts = await adapter.listONTs();

    const portMap = {};
    for (const ont of onts) {
      const port = ont.pon_port || 1;
      if (!portMap[port]) portMap[port] = { port, total: 0, online: 0, offline: 0 };
      portMap[port].total++;
      if (ont.status === 'ONLINE') portMap[port].online++;
      else portMap[port].offline++;
    }

    const ports = Object.values(portMap).sort((a, b) => a.port - b.port);
    res.json({ data: ports, total: onts.length });
  } catch (e) { next(e); }
});

// List ONUs on a specific PON port via Telnet
router.get('/:oltId/pon/:ponIndex/onus', async (req, res, next) => {
  try {
    const olt = await getVsolOlt(req.params.oltId);
    const adapter = getAdapter(olt);
    const onus = await adapter.listOnusTelnet(parseInt(req.params.ponIndex));
    res.json({ data: onus });
  } catch (e) { next(e); }
});

// Get ONU detail: optical + stats + eth + distance + profile
router.get('/:oltId/pon/:ponIndex/onu/:onuId', async (req, res, next) => {
  try {
    const olt = await getVsolOlt(req.params.oltId);
    const adapter = getAdapter(olt);
    const ponIndex = parseInt(req.params.ponIndex);
    const onuId = parseInt(req.params.onuId);

    const [optical, stats, ethPorts, distance, profile] = await Promise.allSettled([
      adapter.getOnuOptical(ponIndex, onuId),
      adapter.getOnuStats(ponIndex, onuId),
      adapter.getOnuEth(ponIndex, onuId),
      adapter.getOnuDistance(ponIndex, onuId),
      adapter.getOnuProfile(ponIndex, onuId),
    ]);

    res.json({
      data: {
        onuId,
        ponIndex,
        optical: optical.status === 'fulfilled' ? optical.value : null,
        stats: stats.status === 'fulfilled' ? stats.value : null,
        ethPorts: ethPorts.status === 'fulfilled' ? ethPorts.value : [],
        distance: distance.status === 'fulfilled' ? distance.value : null,
        profile: profile.status === 'fulfilled' ? profile.value : null,
      },
    });
  } catch (e) { next(e); }
});

// Get optical info for a specific ONU
router.get('/:oltId/pon/:ponIndex/onu/:onuId/optical', async (req, res, next) => {
  try {
    const olt = await getVsolOlt(req.params.oltId);
    const adapter = getAdapter(olt);
    const optical = await adapter.getOnuOptical(parseInt(req.params.ponIndex), parseInt(req.params.onuId));
    res.json({ data: optical });
  } catch (e) { next(e); }
});

// Get statistics for a specific ONU
router.get('/:oltId/pon/:ponIndex/onu/:onuId/stats', async (req, res, next) => {
  try {
    const olt = await getVsolOlt(req.params.oltId);
    const adapter = getAdapter(olt);
    const stats = await adapter.getOnuStats(parseInt(req.params.ponIndex), parseInt(req.params.onuId));
    res.json({ data: stats });
  } catch (e) { next(e); }
});

// Get Ethernet port status for a specific ONU
router.get('/:oltId/pon/:ponIndex/onu/:onuId/eth', async (req, res, next) => {
  try {
    const olt = await getVsolOlt(req.params.oltId);
    const adapter = getAdapter(olt);
    const eth = await adapter.getOnuEth(parseInt(req.params.ponIndex), parseInt(req.params.onuId));
    res.json({ data: eth });
  } catch (e) { next(e); }
});

// Add ONU in PON context
router.post('/:oltId/pon/:ponIndex/onu', checkRole('noc'), async (req, res, next) => {
  try {
    const olt = await getVsolOlt(req.params.oltId);
    const adapter = getAdapter(olt);
    const { onuId, profile, serial, description } = req.body;
    if (!serial) return res.status(400).json({ error: 'serial is required' });
    const result = await adapter.addOnu(parseInt(req.params.ponIndex), {
      onuId: onuId || 1,
      profile: profile || 'default',
      serial,
      description,
    });
    res.status(201).json({ data: result });
  } catch (e) { next(e); }
});

// ONU actions in PON context
router.post('/:oltId/pon/:ponIndex/onu/:onuId/activate', checkRole('noc'), async (req, res, next) => {
  try {
    const olt = await getVsolOlt(req.params.oltId);
    const adapter = getAdapter(olt);
    const result = await adapter.activateOnu(parseInt(req.params.ponIndex), parseInt(req.params.onuId));
    res.json({ data: result });
  } catch (e) { next(e); }
});

router.post('/:oltId/pon/:ponIndex/onu/:onuId/deactivate', checkRole('noc'), async (req, res, next) => {
  try {
    const olt = await getVsolOlt(req.params.oltId);
    const adapter = getAdapter(olt);
    const result = await adapter.deactivateOnu(parseInt(req.params.ponIndex), parseInt(req.params.onuId));
    res.json({ data: result });
  } catch (e) { next(e); }
});

router.post('/:oltId/pon/:ponIndex/onu/:onuId/reboot', checkRole('noc'), async (req, res, next) => {
  try {
    const olt = await getVsolOlt(req.params.oltId);
    const adapter = getAdapter(olt);
    const result = await adapter.rebootOnu(parseInt(req.params.ponIndex), parseInt(req.params.onuId));
    res.json({ data: result });
  } catch (e) { next(e); }
});

router.delete('/:oltId/pon/:ponIndex/onu/:onuId', checkRole('admin'), async (req, res, next) => {
  try {
    const olt = await getVsolOlt(req.params.oltId);
    const adapter = getAdapter(olt);
    const result = await adapter.deleteOnu(parseInt(req.params.ponIndex), parseInt(req.params.onuId));
    res.json({ data: result });
  } catch (e) { next(e); }
});

// Set ONU description
router.put('/:oltId/pon/:ponIndex/onu/:onuId/description', checkRole('noc'), async (req, res, next) => {
  try {
    const olt = await getVsolOlt(req.params.oltId);
    const adapter = getAdapter(olt);
    const { description } = req.body;
    if (!description) return res.status(400).json({ error: 'description required' });
    const result = await adapter.setOnuDescription(parseInt(req.params.ponIndex), parseInt(req.params.onuId), description);
    res.json({ data: result });
  } catch (e) { next(e); }
});

// Profiles
router.get('/:oltId/profiles', async (req, res, next) => {
  try {
    const olt = await getVsolOlt(req.params.oltId);
    const adapter = getAdapter(olt);
    const [line, service, alarm, traffic] = await Promise.allSettled([
      adapter.getProfiles('line'),
      adapter.getProfiles('srv'),
      adapter.getProfiles('alarm'),
      adapter.getProfiles('traffic'),
    ]);
    res.json({
      data: {
        line: line.status === 'fulfilled' ? line.value : [],
        service: service.status === 'fulfilled' ? service.value : [],
        alarm: alarm.status === 'fulfilled' ? alarm.value : [],
        traffic: traffic.status === 'fulfilled' ? traffic.value : [],
      },
    });
  } catch (e) { next(e); }
});

// Running config
router.get('/:oltId/config', async (req, res, next) => {
  try {
    const olt = await getVsolOlt(req.params.oltId);
    const adapter = getAdapter(olt);
    const parsed = await adapter.getParsedConfig();
    res.json({ data: parsed });
  } catch (e) { next(e); }
});

router.get('/:oltId/config/text', async (req, res, next) => {
  try {
    const olt = await getVsolOlt(req.params.oltId);
    const adapter = getAdapter(olt);
    const text = await adapter.getRunningConfigText();
    res.json({ data: { text } });
  } catch (e) { next(e); }
});

// Save config
router.post('/:oltId/config/save', checkRole('admin'), async (req, res, next) => {
  try {
    const olt = await getVsolOlt(req.params.oltId);
    const adapter = getAdapter(olt);
    const result = await adapter.saveConfig();
    res.json({ data: result });
  } catch (e) { next(e); }
});

// Autofind: scan for unprovisioned ONUs
router.get('/:oltId/autofind', async (req, res, next) => {
  try {
    const olt = await getVsolOlt(req.params.oltId);
    const adapter = getAdapter(olt);
    const telnetOnus = await adapter.listOnusTelnet(1);

    // Buscar qué seriales ya existen en DB
    const existing = await prisma.oNT.findMany({
      where: { olt_id: req.params.oltId },
      select: { serial_number: true, description: true },
    });
    const existingSet = new Set(existing.map(o => o.serial_number));

    const unprovisioned = telnetOnus.filter(o => !existingSet.has(o.serialNumber || ''));
    res.json({ data: { total: telnetOnus.length, unprovisioned, provisioned: telnetOnus.length - unprovisioned.length } });
  } catch (e) { next(e); }
});

// Batch activate/deactivate/reboot
router.post('/:oltId/batch/:action', checkRole('noc'), async (req, res, next) => {
  try {
    const olt = await getVsolOlt(req.params.oltId);
    const adapter = getAdapter(olt);
    const { ponIndex, onuIds } = req.body;
    const pon = parseInt(ponIndex) || 1;
    const ids = Array.isArray(onuIds) ? onuIds : [];
    if (!ids.length) return res.status(400).json({ error: 'onuIds array required' });

    const action = req.params.action;
    const methodMap = { activate: 'activateOnu', deactivate: 'deactivateOnu', reboot: 'rebootOnu' };
    const methodName = methodMap[action];
    if (!methodName) return res.status(400).json({ error: `Unknown action: ${action}` });

    const results = [];
    for (const onuId of ids) {
      try {
        const r = await adapter[methodName](pon, parseInt(onuId));
        results.push({ onuId, success: r.success, error: r.error });
      } catch (e) {
        results.push({ onuId, success: false, error: e.message });
      }
    }
    res.json({ data: { total: ids.length, success: results.filter(r => r.success).length, fail: results.filter(r => !r.success).length, results } });
  } catch (e) { next(e); }
});

module.exports = router;
