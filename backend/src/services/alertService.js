const prisma = require('../config/database');

async function getAlerts(filters = {}) {
  const where = {};
  if (filters.resolved !== undefined) where.resolved = filters.resolved === 'true' || filters.resolved === true;
  if (filters.acknowledged !== undefined) where.acknowledged = filters.acknowledged === 'true' || filters.acknowledged === true;
  if (filters.severity) where.severity = filters.severity;
  if (filters.type) where.type = filters.type;
  if (filters.oltId) where.olt_id = filters.oltId;
  if (filters.ontId) where.ont_id = filters.ontId;

  const page = parseInt(filters.page) || 1;
  const limit = parseInt(filters.limit) || 50;

  const [data, total] = await Promise.all([
    prisma.alert.findMany({ where, orderBy: { created_at: 'desc' }, skip: (page - 1) * limit, take: limit }),
    prisma.alert.count({ where }),
  ]);
  return { data, total, page, limit };
}

async function getAlertById(id) {
  return prisma.alert.findUnique({ where: { id } });
}

async function createAlert(data) {
  return prisma.alert.create({ data });
}

async function acknowledgeAlert(id, userId) {
  return prisma.alert.update({ where: { id }, data: { acknowledged: true, ack_at: new Date(), ack_by: userId } });
}

async function resolveAlert(id) {
  return prisma.alert.update({ where: { id }, data: { resolved: true, resolved_at: new Date() } });
}

async function deleteAlert(id) {
  return prisma.alert.delete({ where: { id } });
}

async function getActiveCount() {
  return prisma.alert.count({ where: { resolved: false } });
}

module.exports = { getAlerts, getAlertById, createAlert, acknowledgeAlert, resolveAlert, deleteAlert, getActiveCount };
