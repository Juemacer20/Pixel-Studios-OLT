// Importa TODAS las ONUs directamente de las OLTs vía telnet + optical info.
// Crea registros nuevos en DB para ONUs que no existen, actualiza las que sí.
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
process.chdir(require('path').join(__dirname, '..'));

const prisma = require('../src/config/database');
const { getAdapter } = require('../src/utils/oltFactory');
const { saveSignalHistory } = require('../src/services/signalService');
const logger = require('../src/middleware/logger');

async function importOLT(olt) {
  const adapter = getAdapter(olt);
  console.log(`\n→ ${olt.name} (${olt.ip})`);

  // Step 1: list all ONTs via telnet
  const telnetOnts = await adapter.listONTs();
  if (!telnetOnts.length) { console.log('  Sin ONUs'); return; }
  console.log(`  ONUs en OLT: ${telnetOnts.length}`);

  // Step 2: optical info (Huawei only)
  let optMap = new Map();
  const hasOptical = typeof adapter.getOpticalInfo === 'function';
  const hasSlot = telnetOnts.some(o => o.slot != null);

  if (hasOptical && hasSlot) {
    const seen = new Set();
    const slotPorts = [];
    for (const o of telnetOnts) {
      const k = `${o.slot}/${o.pon_port}`;
      if (!seen.has(k)) { seen.add(k); slotPorts.push({ slot: o.slot, port: o.pon_port }); }
    }
    try {
      const rows = await adapter.getOpticalInfo(slotPorts);
      for (const r of rows) optMap.set(`${r.slot}/${r.port}/${r.ont_id}`, r);
      console.log(`  Optical rows: ${rows.length}`);
    } catch(e) {
      console.log(`  Optical error: ${e.message}`);
    }
  }

  // Step 3: load existing ONTs for this OLT
  const existing = await prisma.oNT.findMany({
    where: { olt_id: olt.id },
    select: { id: true, serial_number: true },
  });
  const dbMap = new Map(existing.map(o => [o.serial_number, o.id]));
  console.log(`  En DB: ${dbMap.size}`);

  const now = new Date();
  let created = 0, updated = 0, withSignal = 0;

  for (const ont of telnetOnts) {
    const optical = hasSlot ? optMap.get(`${ont.slot}/${ont.pon_port}/${ont.onu_id}`) : null;

    const data = {
      status: ont.status,
      last_seen: now,
      ...(optical?.rx_power    != null ? { rx_power:     optical.rx_power    } : {}),
      ...(optical?.tx_power    != null ? { tx_power:     optical.tx_power    } : {}),
      ...(optical?.olt_rx_power!= null ? { olt_rx_power: optical.olt_rx_power} : {}),
      ...(optical?.temperature != null ? { temperature:  optical.temperature } : {}),
      ...(optical?.voltage     != null ? { voltage:      optical.voltage     } : {}),
      ...(optical?.bias_current!= null ? { bias_current: optical.bias_current} : {}),
      ...(optical?.distance    != null ? { distance:     optical.distance    } : {}),
    };

    let ontId = dbMap.get(ont.serial_number);

    if (!ontId) {
      // Crear nueva ONU
      try {
        const created_ont = await prisma.oNT.create({
          data: {
            olt_id: olt.id,
            serial_number: ont.serial_number,
            mac: ont.mac || null,
            description: ont.interface || null,
            ...data,
          },
        });
        ontId = created_ont.id;
        dbMap.set(ont.serial_number, ontId);
        created++;
      } catch(e) {
        if (!e.message.includes('Unique')) {
          console.log(`  Create error ${ont.serial_number}: ${e.message}`);
        }
        continue;
      }
    } else {
      await prisma.oNT.update({ where: { id: ontId }, data });
      updated++;
    }

    if (data.rx_power != null || data.tx_power != null) {
      await saveSignalHistory(ontId, data.rx_power ?? null, data.tx_power ?? null);
      withSignal++;
    }
  }

  console.log(`  ✓ Creadas: ${created} | Actualizadas: ${updated} | Con señal: ${withSignal}`);
}

(async () => {
  // Filtro opcional por nombre: node import-from-olts.js "Itelsa-SantaAna" "Itelsa-Mocoreta"
  const names = process.argv.slice(2).filter(Boolean);
  const where = { status: { not: 'MAINTENANCE' } };
  if (names.length) where.name = { in: names };
  const olts = await prisma.oLT.findMany({ where });
  console.log(`Importando desde ${olts.length} OLTs${names.length ? ' (filtro: ' + names.join(', ') + ')' : ''}...`);
  for (const olt of olts) {
    try { await importOLT(olt); }
    catch(e) { console.log(`  ✗ ${olt.name}: ${e.message}`); }
  }
  const total = await prisma.oNT.count();
  console.log(`\n✓ Listo. Total ONUs en DB: ${total}`);
  await prisma.$disconnect();
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
