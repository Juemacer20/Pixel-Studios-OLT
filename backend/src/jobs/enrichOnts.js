const Bull = require('bull');
const { selectBatch, enrichBatch } = require('../services/enrichmentService');
const logger = require('../middleware/logger');

const queue = new Bull('enrich-onts', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
  },
});

queue.process(async (job) => {
  const batchSize = parseInt(process.env.ENRICH_BATCH_SIZE) || 50;
  const oltId = job.data && job.data.oltId ? job.data.oltId : null;
  const batch = await selectBatch(batchSize, oltId);
  if (!batch.length) return { updated: 0 };
  const updated = await enrichBatch(batch);
  logger.info(`enrichOnts: ${updated} ONTs enriquecidas${oltId ? ` (OLT ${oltId})` : ''}`);
  return { updated };
});

queue.on('failed', (job, err) => logger.error(`enrichOnts job failed: ${err.message}`));

/** Encola el enriquecimiento de una OLT puntual (ignora enriched_at). */
function enqueueOlt(oltId) {
  return queue.add({ oltId }, { removeOnComplete: 5, removeOnFail: 10 });
}

function startEnrichOnts() {
  const interval = parseInt(process.env.ENRICH_INTERVAL_MS) || 60000;
  queue.add({}, { repeat: { every: interval }, removeOnComplete: 5, removeOnFail: 10 });
  logger.info(`Enrich ONTs job started, interval=${interval}ms`);
}

module.exports = { startEnrichOnts, enqueueOlt, queue };
