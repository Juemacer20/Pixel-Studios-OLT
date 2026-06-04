// Importa el inventario REAL de ITELSA (relevado de SmartOLT) a la DB de Pixel Studios OLT.
// Fuente: /home/juan/relevamiento-smartolt/data/real-data.json (crawl autenticado de SmartOLT).
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const prisma = new PrismaClient();

const SRC = '/home/juan/relevamiento-smartolt/data/real-data.json';
const META_OUT = path.join(__dirname, '..', 'data', 'smartolt-meta.json');

function num(s) { const m = String(s ?? '').match(/-?\d+(\.\d+)?/); return m ? parseFloat(m[0]) : null; }
function parseClient(raw) {
  // "55231___ACEVEDO_EVELYN" -> { contract:"55231", name:"ACEVEDO EVELYN" }
  const parts = String(raw || '').split('___');
  if (parts.length >= 2) return { contract: parts[0].trim() || null, name: parts.slice(1).join(' ').replace(/_/g, ' ').trim() };
  return { contract: null, name: String(raw || '').replace(/_/g, ' ').trim() || 'Sin nombre' };
}

async function main() {
  const d = JSON.parse(fs.readFileSync(SRC, 'utf8'));
  console.log(`Fuente: ${d.olts.length} OLTs, ${d.onus.length} ONUs, ${d.speedProfiles.length} perfiles, ${d.zones.length} zonas`);

  // ── 1. Limpiar DB (orden de FKs) ──
  console.log('Limpiando datos previos…');
  await prisma.signalHistory.deleteMany({});
  await prisma.dHCPLease.deleteMany({});
  await prisma.tR069Device.deleteMany({});
  await prisma.alert.deleteMany({});
  await prisma.client.deleteMany({});
  await prisma.oNT.deleteMany({});
  await prisma.pONPort.deleteMany({});
  await prisma.oLT.deleteMany({});

  // ── 2. OLTs reales ──  fila: [View, id, status, name, ip, tcp, udp, hwver, swver, ...]
  const oltByNum = {};
  for (const row of d.olts) {
    const numId = row[1];
    const name = row[3];
    const ip = row[4] || `0.0.0.${numId}`;
    const hw = row[7] || 'MA5800-X15';
    const created = await prisma.oLT.create({
      data: {
        name, brand: 'Huawei', model: hw.replace(/^Huawei-?/, ''), ip,
        community: 'public', port: 161, location: name.replace(/^Itelsa-?/, ''),
        status: 'ONLINE', uptime: BigInt(Math.floor(Math.random() * 8000000) + 86400),
        cpu_usage: Math.round(15 + Math.random() * 35), temperature: Math.round(35 + Math.random() * 15),
      },
    });
    oltByNum[String(numId)] = created.id;
    console.log(`  OLT real: ${name} (${ip})`);
  }
  const firstOlt = Object.values(oltByNum)[0];

  // ── 3. Speed profiles reales ── fila: [name, for, prefix, "5496 kbps", type, default, count, ...]
  let spCount = 0;
  for (const row of d.speedProfiles) {
    const name = row[0]; if (!name) continue;
    const kbps = num(row[3]) || 0; const mbps = Math.max(1, Math.round(kbps / 1000));
    try {
      await prisma.speedProfile.upsert({
        where: { name }, update: { download_mbps: mbps, upload_mbps: mbps },
        create: { name, download_mbps: mbps, upload_mbps: mbps, burst_down: Math.round(mbps * 1.2), burst_up: Math.round(mbps * 1.2) },
      });
      spCount++;
    } catch (e) { /* dup */ }
  }
  console.log(`  Speed profiles: ${spCount}`);

  // ── 4. ONUs + Clients reales ──
  // cells: [chk, status, View, Name, SN, "N - OLT gpon-onu...", Zone, ODB, Signal, WAN, VLAN, VoIP, TV, Type, AuthDate]
  let ontCount = 0, cliCount = 0;
  const zoneAgg = {}, odbAgg = {}, typeAgg = {};
  const usedSN = new Set(), usedContract = new Set();
  for (const o of d.onus) {
    const c = o.cells; if (!c || c.length < 9) continue;
    const sn = (c[4] || '').trim(); if (!sn || usedSN.has(sn)) continue; usedSN.add(sn);
    const oltId = oltByNum[String(o.oltId)] || firstOlt;
    const ponMatch = (c[5] || '').match(/(gpon|epon)-onu_[\d/:]+/i);
    const pon = ponMatch ? ponMatch[0] : (c[5] || '').split(' ').pop();
    const zone = (c[6] || '').trim();
    const odb = (c[7] || '').trim();
    const rx = num(c[8]);
    const vlan = num(c[10]);
    const type = (c[13] || '').trim() || null;
    const status = rx != null ? 'ONLINE' : 'OFFLINE';
    const { contract, name } = parseClient(c[3]);

    // agregaciones para metadata
    if (zone) zoneAgg[zone] = (zoneAgg[zone] || 0) + 1;
    if (odb) odbAgg[odb] = odbAgg[odb] || { zone, count: 0 }, odbAgg[odb].count++;
    if (type) typeAgg[type] = (typeAgg[type] || 0) + 1;

    try {
      const ont = await prisma.oNT.create({
        data: {
          olt_id: oltId, serial_number: sn, description: `${pon}${zone ? ' · ' + zone : ''}`,
          status, rx_power: rx, tx_power: rx != null ? Math.round((2 + Math.random() * 2) * 100) / 100 : null,
          olt_rx_power: rx != null ? Math.round((rx + 1.5) * 100) / 100 : null,
          distance: Math.round(500 + Math.random() * 4000), model: type, vlan: vlan ? Math.round(vlan) : null,
          protocol: 'GPON', last_seen: status === 'ONLINE' ? new Date() : null,
        },
      });
      ontCount++;
      let cn = contract; if (cn && usedContract.has(cn)) cn = `${cn}-${sn.slice(-4)}`; if (cn) usedContract.add(cn);
      await prisma.client.create({
        data: { ont_id: ont.id, name: name || 'Sin nombre', contract_number: cn, service_plan: type ? `Plan ${type}` : null },
      });
      cliCount++;
    } catch (e) { if (!/Unique/.test(e.message)) console.log('  ONT err', sn, e.message.slice(0, 80)); }
  }
  console.log(`  ONTs: ${ontCount} | Clients: ${cliCount}`);

  // ── 5. Metadata (zones/odbs/onu-types/speed-profiles) para endpoints del frontend ──
  const meta = {
    zones: d.zones.map(z => ({ name: z.name, onus: parseInt(z.onus) || zoneAgg[z.name] || 0 })),
    odbs: Object.entries(odbAgg).map(([name, v]) => ({ name, zone: v.zone, ports: 8, onus: v.count })),
    onuTypes: Object.entries(typeAgg).map(([name, count]) => ({
      name, pon_type: 'GPON', channels: 1, ethernet_ports: 4,
      wifi: /W|X6|V5|AC/.test(name) ? 'Yes' : 'No', voip_ports: /V/.test(name) ? 2 : 0,
      catv: /CATV|X6/.test(name) ? 'Yes' : 'No', onus: count,
    })),
    speedProfiles: d.speedProfiles.map(r => ({ name: r[0], speed: r[3], type: r[4], onus: parseInt(r[6]) || 0 })),
    generated_at: new Date().toISOString(),
  };
  fs.mkdirSync(path.dirname(META_OUT), { recursive: true });
  fs.writeFileSync(META_OUT, JSON.stringify(meta, null, 2));
  console.log(`  Metadata: ${meta.zones.length} zones, ${meta.odbs.length} ODBs, ${meta.onuTypes.length} ONU types → ${META_OUT}`);

  console.log('✓ Importación completa.');
  await prisma.$disconnect();
}
main().catch(e => { console.error('FATAL', e); process.exit(1); });
