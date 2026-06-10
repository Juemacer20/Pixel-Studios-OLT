// Seed de inventario real relevado de SmartOLT (data/smartolt-meta.json):
// Zones (70), ODBs→NAPBox (341), ONU types (27), Speed profiles (53 enriquecidos).
// Idempotente. Correr con: node prisma/seed-smartolt-inventory.js
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const META = path.join(__dirname, '..', 'data', 'smartolt-meta.json');

function parseKbps(speed) {
  // "5496 kbps" / "256 kbps" → 5496 ; "1 Gbps" → 1000000
  if (!speed) return null;
  const m = String(speed).match(/([\d.]+)\s*([a-zA-Z]*)/);
  if (!m) return null;
  const val = parseFloat(m[1]);
  const unit = (m[2] || 'kbps').toLowerCase();
  if (unit.startsWith('g')) return Math.round(val * 1000000);
  if (unit.startsWith('m')) return Math.round(val * 1000);
  return Math.round(val); // kbps
}

async function seedZones(zones) {
  let n = 0;
  for (const z of zones) {
    await prisma.zone.upsert({
      where: { name: z.name },
      update: { ont_count: z.onus ?? null },
      create: { name: z.name, ont_count: z.onus ?? null },
    });
    n++;
  }
  console.log(`✓ Zones: ${n}`);
}

async function seedOdbs(odbs) {
  // NAPBox = ODB. name no es unique en el schema; reseteo y recreo (idempotente).
  await prisma.nAPBox.deleteMany({});
  const rows = odbs.map((o) => ({
    name: o.name,
    zone: o.zone || null,
    ports_total: o.ports ?? 16,
    ports_used: o.onus ?? 0,
  }));
  const r = await prisma.nAPBox.createMany({ data: rows });
  console.log(`✓ ODBs (NAPBox): ${r.count}`);
}

async function seedOnuTypes(types) {
  let n = 0;
  for (const t of types) {
    const wifi = (t.wifi || 'No').toLowerCase() === 'yes' ? '2.4G+5G' : null;
    await prisma.onuType.upsert({
      where: { name: t.name },
      update: {
        ponType: t.pon_type || 'GPON',
        channels: t.channels ?? null,
        ethernetPorts: t.ethernet_ports ?? null,
        wifiBands: wifi,
        voipPorts: t.voip_ports ?? 0,
        hasCATV: (t.catv || 'No').toLowerCase() === 'yes',
      },
      create: {
        name: t.name,
        ponType: t.pon_type || 'GPON',
        channels: t.channels ?? null,
        ethernetPorts: t.ethernet_ports ?? null,
        wifiBands: wifi,
        voipPorts: t.voip_ports ?? 0,
        hasCATV: (t.catv || 'No').toLowerCase() === 'yes',
        allowCustomProfiles: false,
        capability: t.ethernet_ports > 1 ? 'HGU' : 'SFU',
      },
    });
    n++;
  }
  console.log(`✓ ONU types: ${n}`);
}

async function seedSpeedProfiles(profiles) {
  // Datos reales de SmartOLT: mismos nombres con velocidades/tipos distintos
  // (sin clave natural limpia). Reset + recreo cada perfil tal cual.
  // FK ONT.speed_profile_id es opcional (SetNull); el import vuelve a vincular.
  await prisma.oNT.updateMany({ where: { speed_profile_id: { not: null } }, data: { speed_profile_id: null } });
  await prisma.speedProfile.deleteMany({});
  const rows = profiles.map((p) => {
    const kbps = parseKbps(p.speed);
    const mbps = kbps ? Math.round(kbps / 1000) : 0;
    const type = (p.type || 'Internet').toUpperCase().includes('IPTV') ? 'IPTV' : 'INTERNET';
    return {
      name: p.name,
      direction: 'BOTH',
      speedKbps: kbps,
      download_mbps: mbps,
      upload_mbps: mbps,
      type,
      forPonType: 'ANY',
      ont_count: p.onus ?? null,
    };
  });
  const r = await prisma.speedProfile.createMany({ data: rows });
  console.log(`✓ Speed profiles: ${r.count}`);
}

async function main() {
  const meta = JSON.parse(fs.readFileSync(META, 'utf8'));
  await seedZones(meta.zones || []);
  await seedOdbs(meta.odbs || []);
  await seedOnuTypes(meta.onuTypes || []);
  await seedSpeedProfiles(meta.speedProfiles || []);
  console.log('Seed de inventario SmartOLT completado.');
}

main()
  .catch((e) => { console.error('Seed error:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
