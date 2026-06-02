const ontService = require('../services/ontService');

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

module.exports = { list, getOne, create, update, remove, getSignal, getSignalHistory, reboot, updateLocation, getDHCPLeases };
