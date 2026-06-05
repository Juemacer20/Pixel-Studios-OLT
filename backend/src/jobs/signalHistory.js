const Bull = require('bull');
const prisma = require('../config/database');
const { getAdapter } = require('../utils/oltFactory');
const { saveSignalHistory } = require('../services/signalService');
const logger = require('../middleware/logger');

const queue = new Bull('signal-history', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
  },
});

queue.process(async (job) => {
  const olts = await prisma.oLT.findMany({
    where: { status: { not: 'MAINTENANCE' } },
  });

  logger.debug(`Signal polling: ${olts.length} OLTs`);

  for (const olt of olts) {
    try {
      await pollOLTSignal(olt);
    } catch (err) {
      logger.error(`Signal poll OLT ${olt.name}: ${err.message}`);
    }
  }
});

async function pollOLTSignal(olt) {
  const adapter = getAdapter(olt);

  // Step 1: list all ONTs via telnet → [{serial_number, slot, pon_port, onu_id, status}]
  const telnetOnts = await adapter.listONTs();
  if (!telnetOnts.length) {
    logger.debug(`Signal poll ${olt.name}: no ONTs via telnet`);
    return;
  }

  // Step 2: get optical info via telnet (one session, all slot/port combos)
  const slotPorts = [];
  const seen = new Set();
  for (const o of telnetOnts) {
    const k = `${o.slot}/${o.pon_port}`;
    if (!seen.has(k)) { seen.add(k); slotPorts.push({ slot: o.slot, port: o.pon_port }); }
  }
  const opticalRows = await adapter.getOpticalInfo(slotPorts);

  // Step 3: build lookup map (slot/port/ont_id) → optical data
  const optMap = new Map();
  for (const row of opticalRows) {
    optMap.set(`${row.slot}/${row.port}/${row.ont_id}`, row);
  }

  // Step 4: merge telnet ONTs with optical data
  const merged = telnetOnts.map(o => {
    const optical = optMap.get(`${o.slot}/${o.pon_port}/${o.onu_id}`);
    return {
      serial_number: o.serial_number,
      status: o.status,
      rx_power: optical?.rx_power ?? null,
      tx_power: optical?.tx_power ?? null,
      olt_rx_power: optical?.olt_rx_power ?? null,
      temperature: optical?.temperature ?? null,
      voltage: optical?.voltage ?? null,
      bias_current: optical?.bias_current ?? null,
      distance: optical?.distance ?? null,
    };
  });

  // Step 5: load DB ONTs for this OLT, indexed by serial_number
  const dbOnts = await prisma.oNT.findMany({
    where: { olt_id: olt.id },
    select: { id: true, serial_number: true, status: true },
  });
  const dbMap = new Map(dbOnts.map(o => [o.serial_number, o]));

  // Step 6: save signal history and update ONT status/signal
  const now = new Date();
  let updated = 0;
  for (const ont of merged) {
    const dbOnt = dbMap.get(ont.serial_number);
    if (!dbOnt) continue;

    const updateData = { last_seen: now, status: ont.status };
    if (ont.rx_power !== null) updateData.rx_power = ont.rx_power;
    if (ont.tx_power !== null) updateData.tx_power = ont.tx_power;
    if (ont.olt_rx_power !== null) updateData.olt_rx_power = ont.olt_rx_power;
    if (ont.temperature !== null) updateData.temperature = ont.temperature;
    if (ont.voltage !== null) updateData.voltage = ont.voltage;
    if (ont.bias_current !== null) updateData.bias_current = ont.bias_current;
    if (ont.distance !== null) updateData.distance = ont.distance;

    await Promise.all([
      prisma.oNT.update({ where: { id: dbOnt.id }, data: updateData }),
      (ont.rx_power !== null || ont.tx_power !== null)
        ? saveSignalHistory(dbOnt.id, ont.rx_power, ont.tx_power)
        : Promise.resolve(),
    ]);

    if (global.io) {
      global.io.to(`ont:${dbOnt.id}`).emit('ont:signal-update', {
        ontId: dbOnt.id, ...ont, timestamp: now,
      });

      const wasOnline = dbOnt.status === 'ONLINE';
      if (!wasOnline && ont.status === 'ONLINE') {
        global.io.to('all').emit('ont:online', { oltId: olt.id, ontId: dbOnt.id, serial: ont.serial_number });
      } else if (wasOnline && ont.status === 'OFFLINE') {
        global.io.to('all').emit('ont:los', { oltId: olt.id, ontId: dbOnt.id, serial: ont.serial_number });
      }
    }
    updated++;
  }

  logger.info(`Signal poll ${olt.name}: ${updated}/${merged.length} ONTs updated`);
}

queue.on('failed', (job, err) => logger.error(`signalHistory job failed: ${err.message}`));

function startSignalHistory(io) {
  global.io = io;
  const interval = parseInt(process.env.POLL_SIGNAL_INTERVAL) || 300000;
  queue.add({}, { repeat: { every: interval }, removeOnComplete: 5, removeOnFail: 10 });
  logger.info(`Signal history polling started, interval=${interval}ms`);
}

module.exports = { startSignalHistory, queue };
