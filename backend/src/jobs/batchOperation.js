// Operaciones masivas sobre ONUs (encoladas en Bull, ejecutadas con concurrencia).
// Disparado explícitamente por el operador desde la UI (POST /onts/batch).
const Bull = require('bull');
const ontService = require('../services/ontService');
const prisma = require('../config/database');
const logger = require('../middleware/logger');

const queue = new Bull('batch-operation', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
  },
});

// action → cómo aplicarla a un ONT individual.
async function applyBatchAction(id, action, params, userId) {
  switch (action) {
    case 'reboot':          return ontService.rebootONT(id, userId);
    case 'delete':          return ontService.deleteONT(id);
    case 'externalId':      return ontService.updateExternalId(id, params?.externalId, userId);
    case 'updateLocation':  return ontService.updateLocationDetails(id, params || {}, userId);
    case 'enable': case 'disable': case 'start': case 'stop':
    case 'resync': case 'restoreDefaults': case 'changeType':
    case 'speedProfile': case 'updateVLANs': case 'webUserPass': case 'move':
      return ontService.executeOntAction(id, action, params || {}, userId);
    default:
      throw new Error(`Unsupported batch action: ${action}`);
  }
}

queue.process(3, async (job) => {
  const { ontIds, action, params, userId } = job.data;
  let processed = 0, failed = 0;
  const errors = [];
  for (const id of ontIds) {
    try { await applyBatchAction(id, action, params, userId); processed++; }
    catch (e) { failed++; errors.push({ id, error: e.message }); }
    await job.progress(Math.round(((processed + failed) / ontIds.length) * 100));
  }
  await prisma.auditLog.create({
    data: { user_id: userId, action: `BATCH_${String(action).toUpperCase()}`, action_type: 'ONT_ACTION',
      target_type: 'ONT', details: { total: ontIds.length, processed, failed } },
  }).catch(() => {});
  logger.info(`Batch ${action}: ${processed} ok, ${failed} failed of ${ontIds.length}`);
  return { processed, failed, total: ontIds.length, errors: errors.slice(0, 50) };
});

async function enqueueBatch({ ontIds, action, params, userId }) {
  const job = await queue.add({ ontIds, action, params, userId }, { removeOnComplete: 50, removeOnFail: 50 });
  return { jobId: job.id, status: 'queued', total: ontIds.length };
}

async function getBatchStatus(jobId) {
  const job = await queue.getJob(jobId);
  if (!job) return null;
  const state = await job.getState();
  return { jobId: job.id, state, progress: job.progress(), result: job.returnvalue || null, total: job.data?.ontIds?.length };
}

module.exports = { queue, enqueueBatch, getBatchStatus };
