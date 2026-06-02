const prisma = require('../config/database');
const { getAdapter } = require('../utils/oltFactory');
const logger = require('../middleware/logger');

async function getAllONTs(filters = {}) {
  const where = {};
  if (filters.status) where.status = filters.status;
  if (filters.oltId) where.olt_id = filters.oltId;
  if (filters.search) {
    where.OR = [
      { serial_number: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } },
      { client: { name: { contains: filters.search, mode: 'insensitive' } } },
    ];
  }
  const page = parseInt(filters.page) || 1;
  const limit = parseInt(filters.limit) || 50;
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    prisma.oNT.findMany({
      where,
      include: { client: true, olt: { select: { name: true } }, ponPort: { select: { port_number: true } } },
      skip,
      take: limit,
      orderBy: { serial_number: 'asc' },
    }),
    prisma.oNT.count({ where }),
  ]);

  return { data, total, page, limit, pages: Math.ceil(total / limit) };
}

async function getONTById(id) {
  return prisma.oNT.findUnique({
    where: { id },
    include: { client: true, olt: true, ponPort: true, speedProfile: true, napBox: true },
  });
}

async function createONT(data) {
  return prisma.oNT.create({ data, include: { olt: true } });
}

async function updateONT(id, data) {
  return prisma.oNT.update({ where: { id }, data });
}

async function deleteONT(id) {
  return prisma.oNT.delete({ where: { id } });
}

async function getONTSignal(id) {
  const ont = await prisma.oNT.findUnique({ where: { id }, include: { olt: true } });
  if (!ont) throw Object.assign(new Error('ONT not found'), { status: 404 });
  try {
    const adapter = getAdapter(ont.olt);
    await adapter.connect();
    const signal = await adapter.getONTSignal(ont.serial_number);
    await adapter.disconnect();
    if (signal.rx_power !== null || signal.tx_power !== null) {
      await prisma.oNT.update({ where: { id }, data: { rx_power: signal.rx_power, tx_power: signal.tx_power, last_seen: new Date() } });
    }
    return { id, serial_number: ont.serial_number, ...signal };
  } catch (err) {
    logger.error(`getONTSignal: ${err.message}`);
    return { id, serial_number: ont.serial_number, rx_power: ont.rx_power, tx_power: ont.tx_power, cached: true };
  }
}

async function getSignalHistory(ontId, range = '24h') {
  const ranges = { '24h': 24, '7d': 168, '30d': 720 };
  const hours = ranges[range] || 24;
  const since = new Date(Date.now() - hours * 3600 * 1000);
  return prisma.signalHistory.findMany({
    where: { ont_id: ontId, timestamp: { gte: since } },
    orderBy: { timestamp: 'asc' },
    take: 2000,
  });
}

async function rebootONT(id, userId) {
  const ont = await prisma.oNT.findUnique({ where: { id }, include: { olt: true } });
  if (!ont) throw Object.assign(new Error('ONT not found'), { status: 404 });
  const adapter = getAdapter(ont.olt);
  await adapter.connect();
  const result = await adapter.rebootONT(ont.serial_number);
  await adapter.disconnect();
  await prisma.auditLog.create({
    data: { user_id: userId, action: 'ONT_REBOOT', target: id, details: { serial_number: ont.serial_number, result } },
  });
  return result;
}

async function updateLocation(id, latitude, longitude) {
  return prisma.oNT.update({ where: { id }, data: { latitude: parseFloat(latitude), longitude: parseFloat(longitude) } });
}

async function getDHCPLeases(ontId) {
  return prisma.dHCPLease.findMany({ where: { ont_id: ontId }, orderBy: { created_at: 'desc' } });
}

module.exports = { getAllONTs, getONTById, createONT, updateONT, deleteONT, getONTSignal, getSignalHistory, rebootONT, updateLocation, getDHCPLeases };
