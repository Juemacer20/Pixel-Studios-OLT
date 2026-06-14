const prisma = require('../config/database');
const { getAdapter } = require('../utils/oltFactory');
const logger = require('../middleware/logger');

const STALE_DAYS = parseInt(process.env.ENRICH_STALE_DAYS) || 7;

/** Agrupa una lista de ONTs por su olt_id. Devuelve Map<olt_id, ONT[]>. */
function groupOntsByOlt(onts) {
  const g = new Map();
  for (const o of onts) {
    if (!g.has(o.olt_id)) g.set(o.olt_id, []);
    g.get(o.olt_id).push(o);
  }
  return g;
}

/**
 * Selecciona un lote de ONTs a enriquecer: sin `model` o con `enriched_at` viejo,
 * de OLTs Huawei ONLINE. `oltId` opcional fuerza una OLT (ignora enriched_at).
 */
async function selectBatch(batchSize, oltId = null) {
  const staleBefore = new Date(Date.now() - STALE_DAYS * 86400000);
  const oltWhere = oltId
    ? { id: oltId }
    : { status: 'ONLINE', brand: { contains: 'huawei', mode: 'insensitive' } };
  const olts = await prisma.oLT.findMany({ where: oltWhere, select: { id: true } });
  const oltIds = olts.map((o) => o.id);
  if (!oltIds.length) return [];

  return prisma.oNT.findMany({
    where: {
      olt_id: { in: oltIds },
      board: { not: null }, // necesitamos ubicación física (la deja el scan)
      // Selección por enriched_at, NO por model: una ONT offline no devuelve model y
      // quedaría re-seleccionada en bucle si filtráramos por `model: null`. Con
      // enriched_at alcanza: ya intentada → se reintenta recién al volverse "stale".
      ...(oltId
        ? {}
        : { OR: [{ enriched_at: null }, { enriched_at: { lt: staleBefore } }] }),
    },
    select: {
      id: true, olt_id: true, serial_number: true,
      board: true, port: true, onu_id: true, description: true,
    },
    take: batchSize,
  });
}

/** Enriquece un lote ya seleccionado. Abre una sesión telnet por OLT. */
async function enrichBatch(batch) {
  const byOlt = groupOntsByOlt(batch);
  let updated = 0;
  for (const [oltId, onts] of byOlt) {
    const olt = await prisma.oLT.findUnique({ where: { id: oltId } });
    const adapter = getAdapter(olt);
    if (typeof adapter.getOntDetailInfoBatch !== 'function') continue; // VSOL/KingType: no-op
    // 🔴 comandos extra = +1..2 comandos/ONU. OFF por defecto (cuidar barrido de ~9000 en prod);
    // activar con ENRICH_WAN / ENRICH_SP=true (los usamos en dev). Ver docs/ENRIQUECIMIENTO_ONU_FASE2.md.
    const wan = process.env.ENRICH_WAN === 'true';
    const serviceport = process.env.ENRICH_SP === 'true';
    let details = [];
    try {
      details = await adapter.getOntDetailInfoBatch(onts, { wan, serviceport });
    } catch (e) {
      logger.warn(`enrichBatch ${olt.name}: ${e.message}`);
      // Marcar enriched_at igual para no reintentar en bucle hasta la ventana stale
      await prisma.oNT.updateMany({
        where: { id: { in: onts.map((o) => o.id) } },
        data: { enriched_at: new Date() },
      });
      continue;
    }
    const bySerial = new Map(details.map((d) => [d.serial_number, d]));
    for (const ont of onts) {
      const d = bySerial.get(ont.serial_number);
      const data = { enriched_at: new Date() };
      if (d) {
        for (const k of ['model', 'firmware', 'sw_version', 'distance', 'line_profile',
                         'srv_profile', 'last_down_cause', 'configuration_method',
                         // FASE 2 — GRUPO GRATIS (mismo `display ont info`, sin comando extra):
                         'temperature', 'cpu_pct', 'mem_pct', 'tr069_enabled', 'tr069_ip_index',
                         'online_duration', 'last_up', 'last_down', 'mgmt_ip', 'ports',
                         // FASE 2 — GRUPO 🔴 WAN (solo si ENRICH_WAN=true, vía display ont wan-info):
                         'ip_address', 'mac', 'wan_mode', 'pppoe_user', 'wan_ip_source',
                         'wan_encap', 'wan_mask', 'wan_gateway', 'wan_vlan', 'wan_info',
                         // FASE 2 — GRUPO 🔴 service-port + eth-port (solo si ENRICH_SP=true):
                         'vlan', 'gem', 'service_port_id', 'download_profile', 'upload_profile',
                         'download_mbps', 'upload_mbps', 'service_ports', 'eth_ports']) {
          if (d[k] != null) data[k] = d[k];
        }
      }
      await prisma.oNT.update({ where: { id: ont.id }, data });
      updated++;
    }
    logger.info(`enrichBatch ${olt.name}: ${onts.length} ONTs procesadas`);
  }
  return updated;
}

module.exports = { groupOntsByOlt, selectBatch, enrichBatch };
