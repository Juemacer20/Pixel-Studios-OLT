const prisma = require('../config/database');
const { getAdapter } = require('../utils/oltFactory');
const logger = require('../middleware/logger');

async function getAllONTs(filters = {}) {
  const where = {};
  if (filters.status) where.status = filters.status;
  if (filters.oltId || filters.olt_id) where.olt_id = filters.oltId || filters.olt_id;
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

// ── ONU actions ────────────────────────────────────────────────────────────
// Maps the public action name to the OLT adapter method that runs the Telnet
// command(s). DB-only actions (external id, location details) are handled
// separately below.
const ACTION_TO_ADAPTER = {
  changeType: 'changeOntType',
  speedProfile: 'configureSpeedProfile',
  enable: 'enableONT',
  disable: 'disableONT',
  start: 'startONT',
  stop: 'stopONT',
  resync: 'resyncONT',
  restoreDefaults: 'restoreDefaults',
  webUserPass: 'changeWebUserPass',
  replaceBySN: 'replaceBySN',
  move: 'moveONT',
  updateVLANs: 'updateVLANs',
  updateMode: 'updateMode',
  updateMgmtIP: 'updateMgmtIP',
  ethernetPort: 'configureEthernetPort',
  wifiPort: 'configureWiFiPort',
  voip: 'configureVoIP',
  disableVoip: 'disableVoIP',
  updateIPTV: 'updateIPTV',
  gponChannel: 'updateGponChannel',
  eponChannel: 'updateEponChannel',
  reallocateId: 'reallocateId',
  tr069Profile: 'setTr069Profile',
  firmwareUpgrade: 'firmwareUpgrade',
  runningConfig: 'getRunningConfig',
  swInfo: 'getSwInfo',
};

async function executeOntAction(id, action, body, userId) {
  const adapterMethod = ACTION_TO_ADAPTER[action];
  if (!adapterMethod) throw Object.assign(new Error(`Unknown ONU action: ${action}`), { status: 400 });

  const ont = await prisma.oNT.findUnique({ where: { id }, include: { olt: true } });
  if (!ont) throw Object.assign(new Error('ONT not found'), { status: 404 });

  const adapter = getAdapter(ont.olt);
  if (typeof adapter[adapterMethod] !== 'function') {
    throw Object.assign(new Error(`Action "${action}" is not supported for ${ont.olt.brand} OLTs yet`), { status: 501 });
  }

  const location = { board: ont.board, port: ont.port, onu_id: ont.onu_id };
  const result = await adapter[adapterMethod](ont.serial_number, body || {}, location);

  // Persist resolved physical location so future actions skip the by-SN lookup.
  if (result && result.location && result.location.onu_id != null) {
    await prisma.oNT.update({
      where: { id },
      data: { board: result.location.board, port: result.location.port, onu_id: result.location.onu_id },
    }).catch((e) => logger.warn(`persist ONT location: ${e.message}`));
  }

  await prisma.auditLog.create({
    data: {
      user_id: userId,
      action: `ONT_${action.toUpperCase()}`,
      action_type: 'ONT_ACTION',
      target: id,
      target_type: 'ONT',
      details: { serial: ont.serial_number, olt: ont.olt.name, body: body || {} },
    },
  });
  logger.info(`ONT action ${action} on ${ont.serial_number} (${ont.olt.name}): success=${result?.success}`);
  return result;
}

// DB-only actions (no OLT command needed) -------------------------------------
async function updateExternalId(id, externalId, userId) {
  const ont = await prisma.oNT.update({ where: { id }, data: { external_id: externalId } });
  await prisma.auditLog.create({
    data: { user_id: userId, action: 'ONT_EXTERNAL_ID', action_type: 'ONT_ACTION', target: id, target_type: 'ONT', details: { externalId } },
  });
  return ont;
}

async function updateLocationDetails(id, body, userId) {
  const data = {};
  for (const k of ['zone', 'odb', 'description', 'contact', 'latitude', 'longitude']) {
    if (body[k] !== undefined) data[k] = body[k];
  }
  if (body.name !== undefined) data.description = body.name;
  if (data.latitude != null) data.latitude = parseFloat(data.latitude);
  if (data.longitude != null) data.longitude = parseFloat(data.longitude);
  const ont = await prisma.oNT.update({ where: { id }, data });
  await prisma.auditLog.create({
    data: { user_id: userId, action: 'ONT_UPDATE_LOCATION', action_type: 'ONT_ACTION', target: id, target_type: 'ONT', details: data },
  });
  return ont;
}

// Authorize (provision) a new ONU: send to OLT, then persist ONT + Client.
async function authorizeONT(data, userId) {
  const olt = await prisma.oLT.findUnique({ where: { id: data.oltId } });
  if (!olt) throw Object.assign(new Error('OLT not found'), { status: 404 });
  if (!data.serialNumber) throw Object.assign(new Error('serialNumber is required'), { status: 400 });

  const adapter = getAdapter(olt);
  if (typeof adapter.authorizeONT !== 'function') {
    throw Object.assign(new Error(`Authorize is not supported for ${olt.brand} OLTs yet`), { status: 501 });
  }

  const result = await adapter.authorizeONT({
    board: data.board, port: data.port, serial: data.serialNumber, onuId: data.onuId,
    lineProfileId: data.lineProfileId, srvProfileId: data.srvProfileId, name: data.name,
    svlanId: data.svlanId, userVlan: data.cvlanId || data.userVlan, gemport: data.gemport,
    tagTransform: data.tagTransform,
    upstreamKbps: data.uploadSpeed, downstreamKbps: data.downloadSpeed,
  });

  const loc = result.location || {};
  // Upsert ONT (an unconfigured stub may already exist for this serial).
  const ont = await prisma.oNT.upsert({
    where: { serial_number: data.serialNumber },
    update: {
      olt_id: data.oltId, description: data.name, model: data.onuTypeId, status: 'ONLINE',
      vlan: data.svlanId, board: loc.board, port: loc.port, onu_id: loc.onu_id,
      zone: data.zone, odb: data.odb, last_seen: new Date(),
      ...(data.lat ? { latitude: parseFloat(data.lat) } : {}),
      ...(data.lng ? { longitude: parseFloat(data.lng) } : {}),
    },
    create: {
      olt_id: data.oltId, serial_number: data.serialNumber, description: data.name,
      model: data.onuTypeId, status: 'ONLINE', vlan: data.svlanId,
      board: loc.board, port: loc.port, onu_id: loc.onu_id, zone: data.zone, odb: data.odb,
      last_seen: new Date(),
      ...(data.lat ? { latitude: parseFloat(data.lat) } : {}),
      ...(data.lng ? { longitude: parseFloat(data.lng) } : {}),
    },
  });

  if (data.name || data.address || data.contact) {
    await prisma.client.upsert({
      where: { ont_id: ont.id },
      update: { name: data.name || 'Cliente', address: data.address, phone: data.contact },
      create: { ont_id: ont.id, name: data.name || 'Cliente', address: data.address, phone: data.contact },
    }).catch((e) => logger.warn(`authorize client upsert: ${e.message}`));
  }

  await prisma.auditLog.create({
    data: {
      user_id: userId, action: 'AUTHORIZE_ONT', action_type: 'ONT_ACTION', target: ont.id, target_type: 'ONT',
      details: { serial: data.serialNumber, olt: olt.name, location: loc },
    },
  });
  logger.info(`Authorized ONU ${data.serialNumber} on ${olt.name}: success=${result.success}`);
  return { ont, result };
}

module.exports = {
  getAllONTs, getONTById, createONT, updateONT, deleteONT, getONTSignal, getSignalHistory,
  rebootONT, updateLocation, getDHCPLeases,
  executeOntAction, updateExternalId, updateLocationDetails, authorizeONT,
};
