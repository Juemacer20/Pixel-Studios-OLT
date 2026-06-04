// Importa/refresca el inventario REAL de ITELSA desde el crawl de SmartOLT.
// Idempotente: refresca SOLO las OLTs Huawei (gestionadas por SmartOLT) y sus ONUs,
// y preserva/asegura las OLTs VSOL (gestionadas fuera de SmartOLT).
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

const SRC = path.join(__dirname, '..', 'data', 'real-data.json');
const META_OUT = path.join(__dirname, '..', 'data', 'smartolt-meta.json');

// OLTs VSOL (no están en SmartOLT; se gestionan por la red interna). Siempre presentes.
const VSOL_OLTS = [
  { name: 'OLT Bernardi', ip: '10.200.188.50', model: 'V1600G1', location: 'Bernardi' },
  { name: 'OLT San Ramon', ip: '10.0.30.240', model: 'V1600G1', location: 'San Ramon' },
  { name: 'OLT Vizcaya', ip: '10.0.128.250', model: 'V1600G1', location: 'Vizcaya' },
];

function num(s) { const m = String(s ?? '').match(/-?\d+(\.\d+)?/); return m ? parseFloat(m[0]) : null; }
function parseClient(raw) {
  const parts = String(raw || '').split('___');
  if (parts.length >= 2) return { contract: parts[0].trim() || null, name: parts.slice(1).join(' ').replace(/_/g, ' ').trim() };
  return { contract: null, name: String(raw || '').replace(/_/g, ' ').trim() || 'Sin nombre' };
}

async function main() {
  if (!fs.existsSync(SRC)) { console.error('No existe', SRC, '— corré el crawler primero.'); process.exit(1); }
  const d = JSON.parse(fs.readFileSync(SRC, 'utf8'));
  console.log(`[${new Date().toISOString()}] Fuente: ${d.olts.length} OLTs, ${d.onus.length} ONUs, ${d.speedProfiles.length} perfiles, ${d.zones.length} zonas`);

  // ── 1. OLTs VSOL (upsert, nunca se borran) ──
  for (const v of VSOL_OLTS) {
    await prisma.oLT.upsert({
      where: { name: v.name },
      update: { brand: 'VSOL', model: v.model, status: 'ONLINE', hw_version: `VSOL-${v.model}`, sw_version: 'V2.0', tcp_port: 23, udp_port: 161, telnet_user: 'admin', pon_type: 'GPON', snmp_read: 'public', snmp_write: 'private' },
      create: {
        name: v.name, brand: 'VSOL', model: v.model, ip: v.ip, community: 'public', port: 161,
        location: v.location, status: 'ONLINE', tcp_port: 23, udp_port: 161,
        hw_version: `VSOL-${v.model}`, sw_version: 'V2.0',
        snmp_read: 'public', snmp_write: 'private', telnet_user: 'admin', pon_type: 'GPON',
        uptime: BigInt(Math.floor(Math.random() * 5000000) + 86400),
        cpu_usage: Math.round(10 + Math.random() * 30), temperature: Math.round(33 + Math.random() * 12),
      },
    });
  }
  console.log(`  VSOL OLTs aseguradas: ${VSOL_OLTS.length}`);

  // ── 2. Refrescar OLTs Huawei (SmartOLT) ── fila: [View, id, status, name, ip, tcp, udp, hwver, swver]
  // Borrar primero las ONUs Huawei existentes (preservando VSOL)
  const huawei = await prisma.oLT.findMany({ where: { brand: 'Huawei' }, select: { id: true } });
  const huaweiIds = huawei.map(o => o.id);
  if (huaweiIds.length) {
    const onts = await prisma.oNT.findMany({ where: { olt_id: { in: huaweiIds } }, select: { id: true } });
    const ontIds = onts.map(o => o.id);
    await prisma.client.deleteMany({ where: { ont_id: { in: ontIds } } });
    await prisma.tR069Device.deleteMany({ where: { ont_id: { in: ontIds } } });
    await prisma.alert.deleteMany({ where: { OR: [{ ont_id: { in: ontIds } }, { olt_id: { in: huaweiIds } }] } });
    await prisma.oNT.deleteMany({ where: { olt_id: { in: huaweiIds } } }); // cascade signalHistory/dhcpLease
  }

  // Communities SNMP reales por OLT (relevadas de SmartOLT) si existen
  let comms = {};
  try { comms = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'olt-communities.json'), 'utf8')); } catch {}
  // Communities PROPIAS de la plataforma (creadas en la OLT) — tienen prioridad, no se pisan.
  let platformComms = {};
  try { platformComms = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'platform-communities.json'), 'utf8')); } catch {}

  const oltByNum = {};
  for (const row of d.olts) {
    const numId = row[1], name = row[3], ip = row[4] || `0.0.0.${numId}`;
    const cm = comms[numId] || {};
    const tcp = parseInt(cm.telnet_tcp) || parseInt(row[5]) || null;
    const udp = parseInt(cm.snmp_udp) || parseInt(row[6]) || null;
    const hw = (row[7] || 'Huawei-MA5800-X15').trim(), sw = (cm.sw || row[8] || '').replace(/\s*\(Detected\)/i, '').trim() || null;
    const model = hw.replace(/^Huawei-?/, '');
    const pc = platformComms[name] || {};
    const snmpFields = {
      snmp_read: pc.snmp_read || cm.snmp_read || null,   // la propia de la plataforma tiene prioridad
      snmp_write: pc.snmp_write || cm.snmp_write || null,
      telnet_user: cm.telnet_user || null, pon_type: 'GPON',
    };
    const created = await prisma.oLT.upsert({
      where: { name },
      update: { brand: 'Huawei', model, ip, status: 'ONLINE', tcp_port: tcp, udp_port: udp, hw_version: hw, sw_version: sw, ...snmpFields },
      create: {
        name, brand: 'Huawei', model, ip, community: cm.snmp_read || 'public', port: 161,
        location: name.replace(/^Itelsa-?/, ''), status: 'ONLINE',
        tcp_port: tcp, udp_port: udp, hw_version: hw, sw_version: sw, ...snmpFields,
        uptime: BigInt(Math.floor(Math.random() * 8000000) + 86400),
        cpu_usage: Math.round(15 + Math.random() * 35), temperature: Math.round(35 + Math.random() * 15),
      },
    });
    oltByNum[String(numId)] = created.id;
  }
  const firstOlt = Object.values(oltByNum)[0];
  console.log(`  Huawei OLTs (SmartOLT): ${Object.keys(oltByNum).length}`);

  // ── 3. Speed profiles (upsert) ──
  let spCount = 0;
  for (const row of d.speedProfiles) {
    const name = row[0]; if (!name) continue;
    const mbps = Math.max(1, Math.round((num(row[3]) || 0) / 1000));
    try {
      await prisma.speedProfile.upsert({
        where: { name }, update: { download_mbps: mbps, upload_mbps: mbps },
        create: { name, download_mbps: mbps, upload_mbps: mbps, burst_down: Math.round(mbps * 1.2), burst_up: Math.round(mbps * 1.2) },
      });
      spCount++;
    } catch (e) {}
  }
  console.log(`  Speed profiles: ${spCount}`);

  // ── 4. ONUs + Clients reales ──
  let ontCount = 0, cliCount = 0;
  const zoneAgg = {}, odbAgg = {}, typeAgg = {};
  const usedSN = new Set(), usedContract = new Set();
  for (const o of d.onus) {
    const c = o.cells; if (!c || c.length < 9) continue;
    const sn = (c[4] || '').trim(); if (!sn || usedSN.has(sn)) continue; usedSN.add(sn);
    const oltId = oltByNum[String(o.oltId)] || firstOlt;
    const ponMatch = (c[5] || '').match(/(gpon|epon)-onu_[\d/:]+/i);
    const pon = ponMatch ? ponMatch[0] : (c[5] || '').split(' ').pop();
    const zone = (c[6] || '').trim(), odb = (c[7] || '').trim(), rx = num(c[8]), vlan = num(c[10]);
    const type = (c[13] || '').trim() || null;
    const status = rx != null ? 'ONLINE' : 'OFFLINE';
    const { contract, name } = parseClient(c[3]);
    if (zone) zoneAgg[zone] = (zoneAgg[zone] || 0) + 1;
    if (odb) { odbAgg[odb] = odbAgg[odb] || { zone, count: 0 }; odbAgg[odb].count++; }
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
      await prisma.client.create({ data: { ont_id: ont.id, name: name || 'Sin nombre', contract_number: cn, service_plan: type ? `Plan ${type}` : null } });
      cliCount++;
    } catch (e) { if (!/Unique/.test(e.message)) console.log('  ONT err', sn, e.message.slice(0, 80)); }
  }
  console.log(`  ONTs: ${ontCount} | Clients: ${cliCount}`);

  // ── 5. Metadata ──
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
  console.log(`  Metadata: ${meta.zones.length} zones, ${meta.odbs.length} ODBs, ${meta.onuTypes.length} ONU types`);
  console.log('✓ Import OK.');
  await prisma.$disconnect();
}
main().catch(e => { console.error('FATAL', e); process.exit(1); });
