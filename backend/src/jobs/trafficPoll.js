// Polling de tráfico por interfaz (SNMP, read-only). Cada intervalo lee
// ifInOctets/ifOutOctets, computa el delta contra la lectura previa (en memoria)
// y guarda Mbps en olt_traffic_history. Alimenta los gráficos Traffic/Uplink.
const Bull = require('bull');
const prisma = require('../config/database');
const { getAdapter } = require('../utils/oltFactory');
const logger = require('../middleware/logger');

const queue = new Bull('traffic-poll', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
  },
});

// Última lectura por olt:ifIndex → { inOctets, outOctets, ts }
const prev = new Map();
const MAX_IFACES = 24;

async function pollOnce() {
  const olts = await prisma.oLT.findMany({ where: { status: 'ONLINE' } });
  let stored = 0;
  for (const olt of olts) {
    const adapter = getAdapter(olt);
    if (typeof adapter.getInterfaceTraffic !== 'function') continue;
    let ifaces = [];
    try {
      await adapter.connect();
      ifaces = await adapter.getInterfaceTraffic();
    } catch (e) { logger.warn(`trafficPoll ${olt.name}: ${e.message}`); continue; }
    finally { await adapter.disconnect().catch(() => {}); }

    const now = Date.now();
    // Priorizar uplinks, luego mayor tráfico; limitar cantidad.
    const ranked = ifaces.sort((a, b) => (b.isUplink - a.isUplink) || ((b.inOctets + b.outOctets) - (a.inOctets + a.outOctets))).slice(0, MAX_IFACES);
    const rows = [];
    for (const f of ranked) {
      const key = `${olt.id}:${f.ifIndex}`;
      const last = prev.get(key);
      prev.set(key, { inOctets: f.inOctets, outOctets: f.outOctets, ts: now });
      if (!last) continue;
      const dt = (now - last.ts) / 1000;
      if (dt <= 0) continue;
      // Mbps = (delta_bytes * 8) / dt / 1e6. Contador de 32 bits → ignorar wraps negativos.
      const dIn = f.inOctets - last.inOctets;
      const dOut = f.outOctets - last.outOctets;
      const rx = dIn >= 0 ? (dIn * 8) / dt / 1e6 : 0;
      const tx = dOut >= 0 ? (dOut * 8) / dt / 1e6 : 0;
      rows.push({ olt_id: olt.id, if_index: f.ifIndex, if_descr: f.descr, is_uplink: f.isUplink,
        rx_mbps: Math.round(rx * 100) / 100, tx_mbps: Math.round(tx * 100) / 100 });
    }
    if (rows.length) { await prisma.oltTrafficHistory.createMany({ data: rows }); stored += rows.length; }
  }
  return { olts: olts.length, stored };
}

queue.process(async () => {
  try { return await pollOnce(); }
  catch (e) { logger.error(`trafficPoll job: ${e.message}`); return { error: e.message }; }
});

function startTrafficPoll() {
  const interval = parseInt(process.env.TRAFFIC_POLL_MS) || 300000; // 5 min
  queue.add({}, { repeat: { every: interval }, removeOnComplete: 5, removeOnFail: 10 });
  // Retención: borra lecturas de más de 30 días una vez por arranque.
  prisma.oltTrafficHistory.deleteMany({ where: { timestamp: { lt: new Date(Date.now() - 30 * 864e5) } } }).catch(() => {});
  logger.info(`trafficPoll job started (every ${interval}ms)`);
}

module.exports = { startTrafficPoll, pollOnce, queue };
