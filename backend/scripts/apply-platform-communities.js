// Guarda las communities SNMP PROPIAS de la plataforma (creadas en cada OLT) en la DB
// y en data/platform-communities.json (para que el import periódico no las pise).
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { PrismaClient } = require('@prisma/client');
const fs = require('fs'); const path = require('path');
const prisma = new PrismaClient();
const OUT = path.join(__dirname, '..', 'data', 'platform-communities.json');

// Communities propias creadas en cada OLT (verificadas por SNMP). Distintas por OLT.
const PLATFORM = {
  'Itelsa-Huawei':   { snmp_read: 'pxlroe65ac7bd', snmp_write: 'pxlrwfd38e7f7' },
  'Itelsa-SantaAna': { snmp_read: 'pxlro41e92b85', snmp_write: 'pxlrw2f4f2df6' },
  'Itelsa-Huawei2':  { snmp_read: 'pxlroabe80369', snmp_write: 'pxlrwa9837682' },
};

(async () => {
  fs.writeFileSync(OUT, JSON.stringify(PLATFORM, null, 2));
  for (const [name, c] of Object.entries(PLATFORM)) {
    const r = await prisma.oLT.updateMany({ where: { name }, data: { snmp_read: c.snmp_read, snmp_write: c.snmp_write, community: c.snmp_read } });
    console.log(`  ${name}: ${r.count ? 'actualizada' : 'NO encontrada'} -> RO=${c.snmp_read} RW=${c.snmp_write}`);
  }
  console.log('Guardado', OUT);
  await prisma.$disconnect();
})().catch(e => { console.error(e); process.exit(1); });
