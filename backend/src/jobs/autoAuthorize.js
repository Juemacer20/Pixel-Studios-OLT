// Auto-authorize job: cada 60s revisa ONUs no configuradas y, si hay un preset
// activo que matchea, las autoriza automáticamente.
//
// SEGURIDAD: por defecto corre en DRY-RUN (solo registra/emite lo que haría, sin
// enviar comandos Telnet a la OLT). Para habilitar la autorización real, setear
// AUTO_AUTHORIZE_ENABLED=true en el entorno del backend.
const Bull = require('bull');
const prisma = require('../config/database');
const ontService = require('../services/ontService');
const logger = require('../middleware/logger');

const queue = new Bull('auto-authorize', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
  },
});

function matchesPreset(ont, preset) {
  if (preset.olts && preset.olts !== 'all') {
    try { const ids = JSON.parse(preset.olts); if (Array.isArray(ids) && !ids.includes(ont.olt_id)) return false; }
    catch { /* preset.olts no es JSON → ignorar filtro */ }
  }
  if (preset.ponType && ont.protocol && preset.ponType !== ont.protocol) return false;
  if (preset.snPattern) {
    try { if (!new RegExp(preset.snPattern).test(ont.serial_number)) return false; }
    catch { return false; }
  }
  return true;
}

async function runOnce() {
  const presets = await prisma.autoActionPreset.findMany({ where: { isActive: true } });
  if (!presets.length) return { checked: 0, authorized: 0, presets: 0 };

  const unconfigured = await prisma.oNT.findMany({
    where: { OR: [
      { description: null },
      { description: { startsWith: 'gpon-onu_' } },
      { description: { startsWith: '0/' } },
    ] },
    include: { olt: true },
    take: 500,
  });

  const dryRun = process.env.AUTO_AUTHORIZE_ENABLED !== 'true';
  let authorized = 0;
  for (const ont of unconfigured) {
    const preset = presets.find((p) => matchesPreset(ont, p));
    if (!preset) continue;
    // Sin ubicación física no se puede provisionar; saltar (seguro).
    if (ont.board == null || ont.port == null) continue;

    const payload = {
      oltId: ont.olt_id, board: ont.board, port: ont.port, serialNumber: ont.serial_number,
      onuTypeId: preset.onuTypeId, name: preset.name + ' ' + ont.serial_number.slice(-4),
      svlanId: preset.svlanId, cvlanId: preset.cvlanId, tagTransform: preset.tagTransform,
      downloadSpeed: preset.downloadSpeed, uploadSpeed: preset.uploadSpeed,
      zone: preset.zoneId, odb: preset.odbId, mode: preset.mode,
    };

    if (dryRun) {
      logger.info(`[autoAuthorize DRY-RUN] would authorize ${ont.serial_number} via preset "${preset.name}"`);
      if (global.io) global.io.to('all').emit('ont:auto-authorize-preview', { ontId: ont.id, preset: preset.name });
      continue;
    }
    try {
      await ontService.authorizeONT(payload, null);
      authorized++;
      if (global.io) global.io.to('all').emit('ont:authorized', { ontId: ont.id, preset: preset.name });
    } catch (e) {
      logger.error(`autoAuthorize ${ont.serial_number}: ${e.message}`);
    }
  }
  return { checked: unconfigured.length, authorized, presets: presets.length, dryRun };
}

queue.process(async () => {
  try { return await runOnce(); }
  catch (e) { logger.error(`autoAuthorize job: ${e.message}`); return { error: e.message }; }
});

function startAutoAuthorize(io) {
  const interval = parseInt(process.env.AUTO_AUTHORIZE_INTERVAL_MS) || 60000;
  queue.add({}, { repeat: { every: interval }, removeOnComplete: 5, removeOnFail: 10 });
  logger.info(`autoAuthorize job started (every ${interval}ms, dryRun=${process.env.AUTO_AUTHORIZE_ENABLED !== 'true'})`);
}

module.exports = { startAutoAuthorize, runOnce, queue };
