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
  const onts = await prisma.oNT.findMany({
    where: { status: { in: ['ONLINE', 'LOS'] } },
    include: { olt: true },
    take: 500,
  });

  logger.debug(`Sampling signal for ${onts.length} ONTs`);

  const chunks = [];
  for (let i = 0; i < onts.length; i += 20) chunks.push(onts.slice(i, i + 20));

  for (const chunk of chunks) {
    await Promise.allSettled(chunk.map(async (ont) => {
      try {
        const adapter = getAdapter(ont.olt);
        adapter.snmp?.connect();
        const signal = await adapter.getONTSignal(ont.serial_number);
        adapter.snmp?.disconnect();

        if (signal.rx_power !== null || signal.tx_power !== null) {
          await saveSignalHistory(ont.id, signal.rx_power, signal.tx_power);
          await prisma.oNT.update({ where: { id: ont.id }, data: { rx_power: signal.rx_power, tx_power: signal.tx_power, last_seen: new Date() } });
          if (global.io) {
            global.io.to(`ont:${ont.id}`).emit('ont:signal-update', { ontId: ont.id, ...signal, timestamp: new Date() });
          }
        }
      } catch (err) {
        logger.debug(`Signal sample ONT ${ont.serial_number}: ${err.message}`);
      }
    }));
  }
});

queue.on('failed', (job, err) => logger.error(`signalHistory job failed: ${err.message}`));

function startSignalHistory(io) {
  const interval = parseInt(process.env.POLL_SIGNAL_INTERVAL) || 300000;
  queue.add({}, { repeat: { every: interval }, removeOnComplete: 5, removeOnFail: 10 });
  logger.info(`Signal history polling started, interval=${interval}ms`);
}

module.exports = { startSignalHistory, queue };
