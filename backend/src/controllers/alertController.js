const alertService = require('../services/alertService');

async function list(req, res, next) {
  try {
    const result = await alertService.getAlerts(req.query);
    res.json(result);
  } catch (err) { next(err); }
}

async function getOne(req, res, next) {
  try {
    const alert = await alertService.getAlertById(req.params.id);
    if (!alert) return res.status(404).json({ error: 'Alert not found' });
    res.json({ data: alert });
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const alert = await alertService.createAlert(req.body);
    res.status(201).json({ data: alert });
  } catch (err) { next(err); }
}

async function acknowledge(req, res, next) {
  try {
    const alert = await alertService.acknowledgeAlert(req.params.id, req.user?.id);
    res.json({ data: alert });
  } catch (err) { next(err); }
}

async function resolve(req, res, next) {
  try {
    const alert = await alertService.resolveAlert(req.params.id);
    res.json({ data: alert });
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    await alertService.deleteAlert(req.params.id);
    res.json({ message: 'Alert deleted' });
  } catch (err) { next(err); }
}

module.exports = { list, getOne, create, acknowledge, resolve, remove };
