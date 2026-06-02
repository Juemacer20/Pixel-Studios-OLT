const Bull = require('bull');
const prisma = require('../config/database');
const { createAlert } = require('../services/alertService');
const { THRESHOLDS } = require('../utils/dbmCalculator');
const logger = require('../middleware/logger');

const THRESHOLDS_OLT = { cpu_critical: 85, cpu_warn: 70, temp_critical: 60, temp_warn: 50 };

const queue = new Bull('alert-engine', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
  },
});

async function ensureNoActiveAlert(ontId, type) {
  const existing = await prisma.alert.findFirst({ where: { ont_id: ontId, type, resolved: false } });
  return !existing;
}

async function emitAlert(alert) {
  if (global.io) {
    global.io.to('all').emit('alert:new', alert);
    if (alert.type === 'LOS' && alert.ont_id) {
      const ont = await prisma.oNT.findUnique({ where: { id: alert.ont_id }, include: { client: true } });
      global.io.to(`ont:${alert.ont_id}`).emit('ont:los', { ontId: alert.ont_id, client: ont?.client?.name });
      global.io.to('all').emit('ont:los', { ontId: alert.ont_id, clientName: ont?.client?.name });
    }
    if (alert.type === 'DYING_GASP') {
      global.io.to(`ont:${alert.ont_id}`).emit('ont:dying-gasp', { ontId: alert.ont_id });
    }
  }
}

queue.process(async (job) => {
  const onts = await prisma.oNT.findMany({
    where: {},
    select: { id: true, serial_number: true, status: true, rx_power: true, tx_power: true, olt_id: true },
    take: 1000,
  });

  for (const ont of onts) {
    const rx = ont.rx_power;
    if (rx === null) continue;

    if (rx <= THRESHOLDS.LOS_MIN && ont.status !== 'LOS') {
      if (await ensureNoActiveAlert(ont.id, 'LOS')) {
        const alert = await createAlert({ ont_id: ont.id, olt_id: ont.olt_id, type: 'LOS', severity: 'CRITICAL', message: `LOS detected on ONT ${ont.serial_number} (RX: ${rx} dBm)` });
        await prisma.oNT.update({ where: { id: ont.id }, data: { status: 'LOS' } });
        await emitAlert(alert);
      }
    } else if (rx > THRESHOLDS.LOS_MIN && ont.status === 'LOS') {
      await prisma.oNT.update({ where: { id: ont.id }, data: { status: 'ONLINE' } });
      await prisma.alert.updateMany({ where: { ont_id: ont.id, type: 'LOS', resolved: false }, data: { resolved: true, resolved_at: new Date() } });
      if (global.io) global.io.to('all').emit('ont:online', { ontId: ont.id });
    }

    if (rx >= THRESHOLDS.HIGH_SIGNAL_MAX) {
      if (await ensureNoActiveAlert(ont.id, 'HIGH_SIGNAL')) {
        const alert = await createAlert({ ont_id: ont.id, olt_id: ont.olt_id, type: 'HIGH_SIGNAL', severity: 'HIGH', message: `High signal on ONT ${ont.serial_number} (RX: ${rx} dBm)` });
        await emitAlert(alert);
      }
    } else if (rx <= THRESHOLDS.WARN_LOW && rx > THRESHOLDS.LOS_MIN) {
      if (await ensureNoActiveAlert(ont.id, 'LOW_SIGNAL')) {
        const alert = await createAlert({ ont_id: ont.id, olt_id: ont.olt_id, type: 'LOW_SIGNAL', severity: 'MEDIUM', message: `Low signal on ONT ${ont.serial_number} (RX: ${rx} dBm)` });
        await emitAlert(alert);
      }
    }
  }

  const olts = await prisma.oLT.findMany({ select: { id: true, name: true, cpu_usage: true, temperature: true } });
  for (const olt of olts) {
    if (olt.cpu_usage !== null) {
      if (olt.cpu_usage >= THRESHOLDS_OLT.cpu_critical) {
        const existing = await prisma.alert.findFirst({ where: { olt_id: olt.id, type: 'CPU_HIGH', resolved: false } });
        if (!existing) {
          const alert = await createAlert({ olt_id: olt.id, type: 'CPU_HIGH', severity: 'CRITICAL', message: `CPU critical on ${olt.name}: ${olt.cpu_usage}%` });
          if (global.io) global.io.to('all').emit('olt:cpu-high', { oltId: olt.id, cpu: olt.cpu_usage });
          await emitAlert(alert);
        }
      }
    }
    if (olt.temperature !== null && olt.temperature >= THRESHOLDS_OLT.temp_critical) {
      const existing = await prisma.alert.findFirst({ where: { olt_id: olt.id, type: 'TEMP_HIGH', resolved: false } });
      if (!existing) {
        await createAlert({ olt_id: olt.id, type: 'TEMP_HIGH', severity: 'CRITICAL', message: `Temperature critical on ${olt.name}: ${olt.temperature}°C` });
      }
    }
  }
});

queue.on('failed', (job, err) => logger.error(`alertEngine failed: ${err.message}`));

function startAlertEngine(io) {
  const interval = parseInt(process.env.ALERT_ENGINE_INTERVAL) || 15000;
  queue.add({}, { repeat: { every: interval }, removeOnComplete: 5, removeOnFail: 10 });
  logger.info(`Alert engine started, interval=${interval}ms`);
}

module.exports = { startAlertEngine, queue };
