const ontService = require('../services/ontService');
const { getMACTable } = require('../services/macTableService');

async function list(req, res, next) {
  try {
    const result = await ontService.getAllONTs(req.query);
    res.json(result);
  } catch (err) { next(err); }
}

async function getOne(req, res, next) {
  try {
    const ont = await ontService.getONTById(req.params.id);
    if (!ont) return res.status(404).json({ error: 'ONT not found' });
    res.json({ data: ont });
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const ont = await ontService.createONT(req.body);
    res.status(201).json({ data: ont });
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const ont = await ontService.updateONT(req.params.id, req.body);
    res.json({ data: ont });
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    await ontService.deleteONT(req.params.id);
    res.json({ message: 'ONT deleted' });
  } catch (err) { next(err); }
}

async function getSignal(req, res, next) {
  try {
    const signal = await ontService.getONTSignal(req.params.id);
    res.json({ data: signal });
  } catch (err) { next(err); }
}

async function getSignalHistory(req, res, next) {
  try {
    const data = await ontService.getSignalHistory(req.params.id, req.query.range);
    res.json({ data });
  } catch (err) { next(err); }
}

async function reboot(req, res, next) {
  try {
    const result = await ontService.rebootONT(req.params.id, req.user?.id);
    res.json({ data: result });
  } catch (err) { next(err); }
}

async function updateLocation(req, res, next) {
  try {
    const { latitude, longitude } = req.body;
    const ont = await ontService.updateLocation(req.params.id, latitude, longitude);
    res.json({ data: ont });
  } catch (err) { next(err); }
}

async function getDHCPLeases(req, res, next) {
  try {
    const leases = await ontService.getDHCPLeases(req.params.id);
    res.json({ data: leases });
  } catch (err) { next(err); }
}

async function getMACTableCtrl(req, res, next) {
  try {
    const macs = await getMACTable(req.params.id);
    res.json({ data: macs });
  } catch (err) { next(err); }
}

async function provision(req, res, next) {
  try {
    const { profileId } = req.body;
    const { authorizeONT } = require('../services/ztp/ztpEngine');
    const result = await authorizeONT(req.params.id, profileId);
    res.json({ data: result });
  } catch (err) { next(err); }
}

async function wanConfig(req, res, next) {
  try {
    const prisma = require('../config/database');
    const { mode, ip, gateway, dns, username, password } = req.body;
    const ont = await prisma.oNT.findUnique({ where: { id: req.params.id } });
    if (!ont) return res.status(404).json({ error: 'ONT not found' });
    res.json({ data: { ontId: req.params.id, mode, applied: true } });
  } catch (err) { next(err); }
}

// Generic ONU action handler factory — `action` is one of ontService.ACTION_TO_ADAPTER keys.
function ontAction(action) {
  return async (req, res, next) => {
    try {
      const result = await ontService.executeOntAction(req.params.id, action, req.body, req.user?.id);
      res.json({ data: result });
    } catch (err) { next(err); }
  };
}

async function updateExternalId(req, res, next) {
  try {
    const ont = await ontService.updateExternalId(req.params.id, req.body.externalId, req.user?.id);
    res.json({ data: ont });
  } catch (err) { next(err); }
}

async function updateLocationDetails(req, res, next) {
  try {
    const ont = await ontService.updateLocationDetails(req.params.id, req.body, req.user?.id);
    res.json({ data: ont });
  } catch (err) { next(err); }
}

async function authorize(req, res, next) {
  try {
    const result = await ontService.authorizeONT(req.body, req.user?.id);
    res.status(201).json({ data: result });
  } catch (err) { next(err); }
}

module.exports = {
  list, getOne, create, update, remove, getSignal, getSignalHistory, reboot, updateLocation,
  getDHCPLeases, getMACTable: getMACTableCtrl, provision, wanConfig,
  ontAction, updateExternalId, updateLocationDetails, authorize,
};
