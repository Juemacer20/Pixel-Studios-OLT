const Bull = require('bull');
const prisma = require('../config/database');
const { getAdapter } = require('../utils/oltFactory');
const logger = require('../middleware/logger');

const queue = new Bull('poll-olts', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
  },
});

queue.process(async (job) => {
  const olts = await prisma.oLT.findMany({ where: { status: { not: 'MAINTENANCE' } } });
  logger.debug(`Polling ${olts.length} OLTs`);

  for (const olt of olts) {
    try {
      const adapter = getAdapter(olt);
      await adapter.connect();
      const [sysInfo, cpu, temp] = await Promise.allSettled([
        adapter.getSystemInfo(),
        adapter.getCPUUsage(),
        adapter.getTemperature(),
      ]);
      await adapter.disconnect();

      const updateData = { status: 'ONLINE', updated_at: new Date() };
      if (cpu.status === 'fulfilled' && cpu.value !== null) updateData.cpu_usage = cpu.value;
      if (temp.status === 'fulfilled' && temp.value !== null) updateData.temperature = temp.value;
      if (sysInfo.status === 'fulfilled' && sysInfo.value?.uptime) updateData.uptime = BigInt(sysInfo.value.uptime);

      await prisma.oLT.update({ where: { id: olt.id }, data: updateData });

      if (global.io) {
        global.io.to('all').emit('olt:update', { id: olt.id, ...updateData, uptime: updateData.uptime?.toString() });
        if (updateData.cpu_usage > 85) {
          global.io.to('all').emit('olt:cpu-high', { oltId: olt.id, name: olt.name, cpu: updateData.cpu_usage });
        }
      }
    } catch (err) {
      logger.error(`Poll OLT ${olt.name} (${olt.ip}): ${err.message}`);
      await prisma.oLT.update({ where: { id: olt.id }, data: { status: 'OFFLINE' } }).catch(() => {});
      if (global.io) global.io.to('all').emit('olt:offline', { id: olt.id, name: olt.name });
    }
  }
});

queue.on('failed', (job, err) => logger.error(`pollOLTs job failed: ${err.message}`));

function startPollOLTs(io) {
  const interval = parseInt(process.env.POLL_OLT_INTERVAL) || 60000;
  queue.add({}, { repeat: { every: interval }, removeOnComplete: 5, removeOnFail: 10 });
  logger.info(`OLT polling started, interval=${interval}ms`);
}

module.exports = { startPollOLTs, queue };
