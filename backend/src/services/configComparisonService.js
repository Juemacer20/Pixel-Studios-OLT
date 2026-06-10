// Compara la configuración de ONUs en la DB contra la OLT real (solo lectura).
// Usa adapter.listONTs() (Telnet read-only) y reporta diferencias por serial.
const prisma = require('../config/database');
const { getAdapter } = require('../utils/oltFactory');
const logger = require('../middleware/logger');

async function scanAndCompare(oltId) {
  const olt = await prisma.oLT.findUnique({ where: { id: oltId } });
  if (!olt) throw Object.assign(new Error('OLT not found'), { status: 404 });

  const adapter = getAdapter(olt);
  let live = [];
  try {
    await adapter.connect();
    live = await adapter.listONTs();
  } finally {
    await adapter.disconnect().catch(() => {});
  }

  const dbOnts = await prisma.oNT.findMany({ where: { olt_id: oltId }, select: { serial_number: true, status: true, description: true } });
  const dbBySn = new Map(dbOnts.map((o) => [o.serial_number, o]));
  const liveBySn = new Map(live.map((o) => [o.serial_number, o]));

  const mismatches = [];
  // En la OLT pero no en la DB
  for (const [sn, l] of liveBySn) {
    if (!dbBySn.has(sn)) {
      mismatches.push({ type: 'missing_in_db', serial: sn, field: 'existence', dbValue: '—', oltValue: l.status || 'present' });
    } else {
      const db = dbBySn.get(sn);
      const liveStatus = (l.status || '').toUpperCase();
      if (liveStatus && db.status && liveStatus !== db.status) {
        mismatches.push({ type: 'status', serial: sn, field: 'status', dbValue: db.status, oltValue: liveStatus });
      }
    }
  }
  // En la DB pero no en la OLT
  for (const [sn] of dbBySn) {
    if (!liveBySn.has(sn)) {
      mismatches.push({ type: 'missing_in_olt', serial: sn, field: 'existence', dbValue: 'present', oltValue: '—' });
    }
  }

  logger.info(`configCompare ${olt.name}: db=${dbOnts.length} live=${live.length} mismatches=${mismatches.length}`);
  return {
    oltId, oltName: olt.name, scanned: new Date().toISOString(),
    counts: { db: dbOnts.length, olt: live.length, mismatches: mismatches.length },
    mismatches: mismatches.slice(0, 1000),
  };
}

// Aplica la corrección sincronizando la DB con la OLT (solo DB, sin Telnet de
// escritura): crea las ONUs presentes en la OLT y faltantes en DB, y marca como
// OFFLINE las que están en DB pero ya no en la OLT.
async function applyFix(oltId, userId) {
  const olt = await prisma.oLT.findUnique({ where: { id: oltId } });
  if (!olt) throw Object.assign(new Error('OLT not found'), { status: 404 });

  const adapter = getAdapter(olt);
  let live = [];
  try { await adapter.connect(); live = await adapter.listONTs(); }
  finally { await adapter.disconnect().catch(() => {}); }

  const dbOnts = await prisma.oNT.findMany({ where: { olt_id: oltId }, select: { id: true, serial_number: true } });
  const dbSns = new Set(dbOnts.map((o) => o.serial_number));
  const liveSns = new Set(live.map((o) => o.serial_number));

  let created = 0, markedOffline = 0;
  for (const l of live) {
    if (!l.serial_number || dbSns.has(l.serial_number)) continue;
    await prisma.oNT.create({
      data: {
        olt_id: oltId, serial_number: l.serial_number,
        status: (l.status || 'OFFLINE').toUpperCase() === 'ONLINE' ? 'ONLINE' : 'OFFLINE',
        board: l.slot ?? null, port: l.pon_port ?? null, onu_id: l.onu_id ?? null, last_seen: new Date(),
      },
    }).then(() => created++).catch(() => {});
  }
  for (const o of dbOnts) {
    if (!liveSns.has(o.serial_number)) {
      await prisma.oNT.update({ where: { id: o.id }, data: { status: 'OFFLINE' } }).then(() => markedOffline++).catch(() => {});
    }
  }
  await prisma.auditLog.create({
    data: { user_id: userId, action: 'CONFIG_FIX', action_type: 'OLT_ACTION', target: oltId, target_type: 'OLT', details: { created, markedOffline } },
  }).catch(() => {});
  logger.info(`configFix ${olt.name}: created=${created} offline=${markedOffline}`);
  return { oltId, oltName: olt.name, created, markedOffline };
}

module.exports = { scanAndCompare, applyFix };
