const oltService = require('../services/oltService');
const logger = require('../middleware/logger');

async function list(req, res, next) {
  try {
    const olts = await oltService.getAllOLTs(req.query);
    res.json({ data: olts, total: olts.length });
  } catch (err) { next(err); }
}

async function getOne(req, res, next) {
  try {
    const olt = await oltService.getOLTById(req.params.id);
    if (!olt) return res.status(404).json({ error: 'OLT not found' });
    res.json({ data: olt });
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const olt = await oltService.createOLT(req.body);
    res.status(201).json({ data: olt });
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const olt = await oltService.updateOLT(req.params.id, req.body);
    res.json({ data: olt });
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    await oltService.deleteOLT(req.params.id);
    res.json({ message: 'OLT deleted' });
  } catch (err) { next(err); }
}

async function getStatus(req, res, next) {
  try {
    const status = await oltService.getOLTStatus(req.params.id);
    if (!status) return res.status(404).json({ error: 'OLT not found' });
    res.json({ data: status });
  } catch (err) { next(err); }
}

async function getPorts(req, res, next) {
  try {
    const ports = await oltService.getOLTPorts(req.params.id);
    res.json({ data: ports });
  } catch (err) { next(err); }
}

async function getPortONTs(req, res, next) {
  try {
    const onts = await oltService.getPortONTs(req.params.id, req.params.port);
    res.json({ data: onts });
  } catch (err) { next(err); }
}

async function sendCommand(req, res, next) {
  try {
    const { cmd } = req.body;
    if (!cmd) return res.status(400).json({ error: 'Command required' });
    const result = await oltService.sendOLTCommand(req.params.id, cmd, req.user?.id);
    res.json({ data: result });
  } catch (err) { next(err); }
}

async function scanONTs(req, res, next) {
  try {
    const result = await oltService.scanOLTOnts(req.params.id);
    res.json({ data: result });
  } catch (err) { next(err); }
}

module.exports = { list, getOne, create, update, remove, getStatus, getPorts, getPortONTs, sendCommand, scanONTs };
