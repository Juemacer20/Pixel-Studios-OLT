const prisma = require('../config/database');
const { getAdapter } = require('../utils/oltFactory');
const logger = require('../middleware/logger');

// Sortable columns whitelist — prevents SQL injection via sort_by param.
const SORT_COLS = new Set([
  'serial_number', 'status', 'rx_power', 'tx_power', 'olt_rx_power',
  'distance', 'last_seen', 'provisioned_at', 'zone', 'odb', 'vlan',
  'board', 'port', 'model', 'ip_address', 'id',
]);

async function getAllONTs(filters = {}) {
  const where = {};

  // ── Text search ──────────────────────────────────────────────────────────────
  if (filters.search) {
    where.OR = [
      { serial_number:  { contains: filters.search, mode: 'insensitive' } },
      { mac:            { contains: filters.search, mode: 'insensitive' } },
      { ip_address:     { contains: filters.search, mode: 'insensitive' } },
      { description:    { contains: filters.search, mode: 'insensitive' } },
      { client: { name: { contains: filters.search, mode: 'insensitive' } } },
    ];
  }

  // ── Exact / foreign-key filters ───────────────────────────────────────────
  if (filters.olt_id || filters.oltId)        where.olt_id = filters.olt_id || filters.oltId;
  if (filters.status)                         where.status = filters.status.toUpperCase();
  if (filters.zone)                           where.zone   = filters.zone;
  if (filters.odb)                            where.odb    = filters.odb;
  if (filters.model)                          where.model  = { contains: filters.model, mode: 'insensitive' };
  if (filters.pon_type)                       where.protocol = filters.pon_type.toUpperCase();
  if (filters.wan_mode)                       where.wan_mode = { contains: filters.wan_mode, mode: 'insensitive' };
  if (filters.config_method)                  where.configuration_method = filters.config_method;
  if (filters.board != null && filters.board !== '') where.board = parseInt(filters.board);
  if (filters.port  != null && filters.port  !== '') where.port  = parseInt(filters.port);
  if (filters.vlan  != null && filters.vlan  !== '') where.vlan  = parseInt(filters.vlan);
  if (filters.svlan != null && filters.svlan !== '') where.vlan  = parseInt(filters.svlan); // svlan stored in vlan
  if (filters.voip === 'enabled')             where.NOT = { ...where.NOT, wan_mode: null }; // proxy: has voip config
  if (filters.has_catv != null && filters.has_catv !== '') where.has_catv = filters.has_catv === '1' || filters.has_catv === 'true';
  if (filters.has_iptv != null && filters.has_iptv !== '') where.has_iptv = filters.has_iptv === '1' || filters.has_iptv === 'true';
  if (filters.resync_failed === 'failed')     where.last_down_cause = { not: null };
  if (filters.tr069 === 'enabled')            where.tr069_enabled = true;
  if (filters.tr069 === 'disabled')           where.tr069_enabled = { not: true };
  if (filters.missing_from_olt === '1')       where.last_seen = null;

  // ── Duplicate filter ──────────────────────────────────────────────────────
  let duplicateIds = null;
  if (filters.duplicate === '1') {
    const duplicates = await prisma.$queryRaw`
      SELECT a.id FROM "ONTs" a
      WHERE EXISTS (
        SELECT 1 FROM "ONTs" b
        WHERE b.serial_number = a.serial_number
          AND b.status = 'ONLINE'
          AND b.id != a.id
      )
      ORDER BY a.serial_number
    `;
    duplicateIds = duplicates.map(r => r.id);
    if (duplicateIds.length === 0) duplicateIds = ['__none__'];
    where.id = { in: duplicateIds };
  }

  // ── Signal quality filter ─────────────────────────────────────────────────
  if (filters.signal === 'critical')          where.rx_power = { lt: -27 };
  else if (filters.signal === 'warning')      where.rx_power = { gte: -27, lt: -25 };
  else if (filters.signal === 'good')         where.rx_power = { gte: -20 };

  // ── Pagination ────────────────────────────────────────────────────────────
  const page  = Math.max(1, parseInt(filters.page)  || 1);
  const limit = Math.min(Math.max(1, parseInt(filters.limit) || 25), 500);
  const skip  = (page - 1) * limit;

  // ── Sorting ───────────────────────────────────────────────────────────────
  const sortKey = SORT_COLS.has(filters.sort_by) ? filters.sort_by : 'serial_number';
  const sortDir = filters.sort_dir === 'asc' ? 'asc' : 'desc';

  const [data, total] = await Promise.all([
    prisma.oNT.findMany({
      where,
      include: {
        client:   true,
        olt:      { select: { name: true } },
        ponPort:  { select: { port_number: true } },
        speedProfile: { select: { name: true } },
      },
      skip,
      take: limit,
      orderBy: { [sortKey]: sortDir },
    }),
    prisma.oNT.count({ where }),
  ]);

  return { data, total, page, limit, pages: Math.ceil(total / limit) };
}

async function getONTById(id) {
  const [ont, authLog] = await Promise.all([
    prisma.oNT.findUnique({
      where: { id },
      include: { client: true, olt: true, ponPort: true, speedProfile: true, napBox: true },
    }),
    prisma.auditLog.findFirst({
      where: { action: 'AUTHORIZE_ONT', target: id },
      orderBy: { created_at: 'desc' },
      select: { user_id: true },
    }),
  ]);
  if (!ont) return null;
  let authorizedBy = null;
  if (authLog?.user_id) {
    const user = await prisma.user.findUnique({
      where: { id: authLog.user_id },
      select: { name: true, email: true },
    });
    authorizedBy = user?.name || user?.email || null;
  }
  return { ...ont, authorizedBy };
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
    const updateData = {};
    if (signal.rx_power !== null) updateData.rx_power = signal.rx_power;
    if (signal.tx_power !== null) updateData.tx_power = signal.tx_power;
    if (Object.keys(updateData).length > 0) {
      updateData.last_seen = new Date();
      await prisma.oNT.update({ where: { id }, data: updateData });
    }
    return { id, serial_number: ont.serial_number, ...signal };
  } catch (err) {
    logger.error(`getONTSignal: ${err.message}`);
    return { id, serial_number: ont.serial_number, rx_power: ont.rx_power, tx_power: ont.tx_power, cached: true };
  }
}

async function getSignalHistory(ontId, range = '24h') {
  const ranges = { '1h': 1, '24h': 24, '7d': 168, '30d': 720 };
  const hours = ranges[range] || 24;
  const since = new Date(Date.now() - hours * 3600 * 1000);
  return prisma.signalHistory.findMany({
    where: { ont_id: ontId, timestamp: { gte: since } },
    orderBy: { timestamp: 'asc' },
    take: 2000,
  });
}

async function rebootONT(id, userId, ip = null) {
  const ont = await prisma.oNT.findUnique({ where: { id }, include: { olt: true } });
  if (!ont) throw Object.assign(new Error('ONT not found'), { status: 404 });
  const adapter = getAdapter(ont.olt);
  await adapter.connect();
  const result = await adapter.rebootONT(ont.serial_number);
  await adapter.disconnect();
  await prisma.auditLog.create({
    data: { user_id: userId, action: 'ONT_REBOOT', target: id, details: { serial_number: ont.serial_number, result }, ip_address: ip ?? null },
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
  updateSvlan: 'updateVLANs',
  updateAttachedVlans: 'updateVLANs',
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
  wanSetup: 'wanSetup',
  ipv6: 'ipv6',
  dnsServers: 'dnsServers',
  dhcpOption82: 'dhcpOption82',
  pppoePlus: 'pppoePlus',
};

async function executeOntAction(id, action, body, userId, ip = null) {
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
      ip_address: ip ?? null,
    },
  });
  logger.info(`ONT action ${action} on ${ont.serial_number} (${ont.olt.name}): success=${result?.success}`);
  return result;
}

// DB-only actions (no OLT command needed) -------------------------------------
async function updateExternalId(id, externalId, userId, ip = null) {
  const ont = await prisma.oNT.update({ where: { id }, data: { external_id: externalId } });
  await prisma.auditLog.create({
    data: { user_id: userId, action: 'ONT_EXTERNAL_ID', action_type: 'ONT_ACTION', target: id, target_type: 'ONT', details: { externalId }, ip_address: ip ?? null },
  });
  return ont;
}

async function updateLocationDetails(id, body, userId, ip = null) {
  const data = {};
  for (const k of ['zone', 'odb', 'odb_port', 'description', 'contact', 'latitude', 'longitude']) {
    if (body[k] !== undefined) data[k] = body[k];
  }
  if (body.name !== undefined) data.description = body.name;
  if (data.latitude != null) data.latitude = parseFloat(data.latitude);
  if (data.longitude != null) data.longitude = parseFloat(data.longitude);
  if (data.odb_port != null) data.odb_port = parseInt(data.odb_port);
  const ont = await prisma.oNT.update({ where: { id }, data });
  await prisma.auditLog.create({
    data: { user_id: userId, action: 'ONT_UPDATE_LOCATION', action_type: 'ONT_ACTION', target: id, target_type: 'ONT', details: data, ip_address: ip ?? null },
  });
  return ont;
}

// Authorize (provision) a new ONU: send to OLT, then persist ONT + Client.
async function authorizeONT(data, userId, ip = null) {
  if (!data.oltId) throw Object.assign(new Error('oltId is required'), { status: 400 });
  if (!data.serialNumber) throw Object.assign(new Error('serialNumber is required'), { status: 400 });
  const olt = await prisma.oLT.findUnique({ where: { id: data.oltId } });
  if (!olt) throw Object.assign(new Error('OLT not found'), { status: 404 });

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
  const authFields = {
    olt_id: data.oltId, description: data.name, model: data.onuTypeId, status: 'ONLINE',
    vlan: data.svlanId ? parseInt(data.svlanId) : null,
    board: loc.board, port: loc.port, onu_id: loc.onu_id,
    zone: data.zone || null, odb: data.odb || null, odb_port: data.odbPort != null ? parseInt(data.odbPort) : null, last_seen: new Date(),
    ...(data.externalId != null ? { external_id: data.externalId } : {}),
    ...(data.configMethod ? { configuration_method: data.configMethod } : {}),
    ...(data.iptvEnabled != null ? { has_iptv: Boolean(data.iptvEnabled) } : {}),
    ...(data.iptvVlan ? { iptv_vlan: parseInt(data.iptvVlan) } : {}),
    ...(data.catvEnabled != null ? { has_catv: Boolean(data.catvEnabled) } : {}),
    ...(data.lat ? { latitude: parseFloat(data.lat) } : {}),
    ...(data.lng ? { longitude: parseFloat(data.lng) } : {}),
  };
  const ont = await prisma.oNT.upsert({
    where: { serial_number: data.serialNumber },
    update: authFields,
    create: { serial_number: data.serialNumber, ...authFields },
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
      details: { serial: data.serialNumber, olt: olt.name, location: loc }, ip_address: ip ?? null,
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
