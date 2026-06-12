const prisma = require('../config/database');
const { getAdapter } = require('../utils/oltFactory');
const { encryptCredentials } = require('../utils/encryption');
const logger = require('../middleware/logger');

async function getAllOLTs(filters = {}) {
  const where = {};
  if (filters.status) where.status = filters.status;
  if (filters.brand) where.brand = { contains: filters.brand, mode: 'insensitive' };
  return prisma.oLT.findMany({
    where,
    include: { _count: { select: { onts: true, ponPorts: true } } },
    orderBy: { name: 'asc' },
  });
}

async function getOLTById(id) {
  return prisma.oLT.findUnique({
    where: { id },
    include: {
      ponPorts: { include: { _count: { select: { onts: true } } } },
      _count: { select: { onts: true, alerts: true } },
    },
  });
}

// Dispara el descubrimiento de ONUs en segundo plano. No bloquea el guardado
// ni lo hace fallar si la OLT no responde (se loguea y la OLT queda guardada).
// Se ejecuta al CREAR y al EDITAR una OLT (editar funciona como re-escaneo:
// si al crearla no tenia conexion o aparecieron ONUs nuevas, al editar las trae).
function autoScanONUs(olt) {
  if (!olt?.id) return;
  scanOLTOnts(olt.id)
    .then((r) => logger.info(`Auto-scan ONUs ${olt.name}: ${r?.saved ?? 0} guardadas / ${r?.scanned ?? 0} detectadas`))
    .catch((e) => logger.warn(`Auto-scan ONUs ${olt.name || olt.id} fallo: ${e.message}`));
}

async function createOLT(data) {
  const { credentials, ...rest } = data;
  const oltData = { ...rest };
  if (credentials) oltData.credentials_encrypted = encryptCredentials(credentials);
  const olt = await prisma.oLT.create({ data: oltData });
  autoScanONUs(olt);
  return olt;
}

async function updateOLT(id, data) {
  const { credentials, ...rest } = data;
  const updateData = { ...rest };
  if (credentials) updateData.credentials_encrypted = encryptCredentials(credentials);
  const olt = await prisma.oLT.update({ where: { id }, data: updateData });
  autoScanONUs(olt);
  return olt;
}

async function deleteOLT(id) {
  return prisma.oLT.delete({ where: { id } });
}

async function getOLTStatus(id) {
  const olt = await prisma.oLT.findUnique({ where: { id } });
  if (!olt) return null;
  try {
    const adapter = getAdapter(olt);
    await adapter.connect();
    const [sysInfo, cpu, temp] = await Promise.allSettled([
      adapter.getSystemInfo(),
      adapter.getCPUUsage(),
      adapter.getTemperature(),
    ]);
    await adapter.disconnect();

    const cpuVal = cpu.status === 'fulfilled' ? cpu.value : null;
    const tempVal = temp.status === 'fulfilled' ? temp.value : null;
    const sysVal = sysInfo.status === 'fulfilled' ? sysInfo.value : null;

    await prisma.oLT.update({
      where: { id },
      data: {
        status: 'ONLINE',
        cpu_usage: cpuVal,
        temperature: tempVal,
        uptime: sysVal?.uptime ? BigInt(sysVal.uptime) : undefined,
      },
    });

    return { id, name: olt.name, status: 'ONLINE', sysInfo: sysVal, cpu_usage: cpuVal, temperature: tempVal };
  } catch (err) {
    logger.error(`getOLTStatus ${olt.ip}: ${err.message}`);
    await prisma.oLT.update({ where: { id }, data: { status: 'OFFLINE' } });
    return { id, name: olt.name, status: 'OFFLINE', error: err.message };
  }
}

async function getOLTPorts(id) {
  return prisma.pONPort.findMany({
    where: { olt_id: id },
    include: { _count: { select: { onts: true } } },
    orderBy: { port_number: 'asc' },
  });
}

async function getPortONTs(oltId, portNumber) {
  const port = await prisma.pONPort.findFirst({ where: { olt_id: oltId, port_number: parseInt(portNumber) } });
  if (!port) return [];
  return prisma.oNT.findMany({
    where: { pon_port_id: port.id },
    include: { client: true },
    orderBy: { serial_number: 'asc' },
  });
}

async function sendOLTCommand(id, cmd, userId) {
  const olt = await prisma.oLT.findUnique({ where: { id } });
  if (!olt) throw Object.assign(new Error('OLT not found'), { status: 404 });
  const adapter = getAdapter(olt);
  await adapter.connect();
  const output = await adapter.sendCommand(cmd);
  await adapter.disconnect();
  await prisma.auditLog.create({
    data: { user_id: userId, action: 'CLI_COMMAND', target: id, details: { cmd, output: String(output || '').slice(0, 500) } },
  });
  return { output, cmd };
}

async function scanOLTOnts(id) {
  const olt = await prisma.oLT.findUnique({ where: { id } });
  if (!olt) throw Object.assign(new Error('OLT not found'), { status: 404 });

  const adapter = getAdapter(olt);
  // connect() is best-effort — SNMP-based adapters (VSOL) discover without SSH
  try { await adapter.connect(); } catch (e) { logger.warn(`scanOLTOnts connect: ${e.message}`); }
  const rawOnts = await adapter.listONTs();
  try { await adapter.disconnect(); } catch {}

  const saved = [];
  for (const ont of rawOnts) {
    if (!ont.serial_number) continue;
    // Scope lookup to this OLT — serials can repeat across different OLTs
    const existing = await prisma.oNT.findFirst({ where: { serial_number: ont.serial_number, olt_id: id } });
    if (existing) {
      // No sobrescribir description si ya tiene un nombre real (no auto-generado)
      const desc = ont.interface ?? undefined;
      const isAutoGen = desc && /^(gpon-onu_|0\/|GPON)/i.test(desc);
      const keepExisting = existing.description && !isAutoGen;
      const updated = await prisma.oNT.update({
        where: { id: existing.id },
        data: {
          olt_id: id,
          status: ont.status,
          rx_power: ont.rx_power ?? undefined,
          tx_power: ont.tx_power ?? undefined,
          temperature: ont.temperature ?? undefined,
          mac: ont.mac ?? undefined,
          description: keepExisting ? existing.description : desc,
          external_id: ont.external_id ?? undefined,
          contact: ont.contact ?? undefined,
          zone: ont.zone ?? undefined,
          odb: ont.odb ?? undefined,
          last_seen: new Date(),
        },
      });
      saved.push(updated);
    } else {
      try {
        const created = await prisma.oNT.create({
          data: {
            olt_id: id,
            serial_number: ont.serial_number,
            mac: ont.mac ?? null,
            description: ont.interface ?? null,
            status: ont.status || 'OFFLINE',
            rx_power: ont.rx_power ?? null,
            tx_power: ont.tx_power ?? null,
            temperature: ont.temperature ?? null,
            external_id: ont.external_id ?? null,
            contact: ont.contact ?? null,
            zone: ont.zone ?? null,
            odb: ont.odb ?? null,
            last_seen: new Date(),
            protocol: 'GPON',
          },
        });
        saved.push(created);
      } catch (e) {
        // Duplicate serial from another OLT — reassign to this OLT
        if (e.code === 'P2002') {
          const dup = await prisma.oNT.findFirst({ where: { serial_number: ont.serial_number } });
          if (dup) {
            const desc2 = ont.interface ?? undefined;
            const isAutoGen2 = desc2 && /^(gpon-onu_|0\/|GPON)/i.test(desc2);
            const keepExisting2 = dup.description && !isAutoGen2;
            const updated = await prisma.oNT.update({
              where: { id: dup.id },
              data: { olt_id: id, status: ont.status, mac: ont.mac ?? undefined, description: keepExisting2 ? dup.description : desc2, last_seen: new Date() },
            });
            saved.push(updated);
          }
        }
      }
    }
  }

  // Óptica: NO se trae en el scan (para que sea rápido). La actualiza el job de
  // señal (signalHistory) cada 5 min vía adapter.getOpticalInfo. El scan solo deja
  // el inventario + cliente/zona/ODB; RX/TX se completan en el primer poll.
  const opticalUpdated = 0;

  await prisma.oLT.update({ where: { id }, data: { status: 'ONLINE' } });
  return { scanned: rawOnts.length, saved: saved.length, opticalUpdated, onts: saved };
}

module.exports = { getAllOLTs, getOLTById, createOLT, updateOLT, deleteOLT, getOLTStatus, getOLTPorts, getPortONTs, sendOLTCommand, scanOLTOnts };
