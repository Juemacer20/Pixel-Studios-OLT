// Guarda las communities SNMP PROPIAS de la plataforma (creadas en cada OLT) en la DB
// y en data/platform-communities.json (para que el import periódico no las pise).
// También fija los puertos internos (telnet 23 / snmp 161) de las OLTs Huawei.
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { PrismaClient } = require('@prisma/client');
const fs = require('fs'); const path = require('path');
const prisma = new PrismaClient();
const OUT = path.join(__dirname, '..', 'data', 'platform-communities.json');

// Communities propias creadas en cada OLT. verified=true => confirmada por snmpget.
const PLATFORM = {
  'Itelsa-Huawei':    { snmp_read: 'pxlroe65ac7bd', snmp_write: 'pxlrwfd38e7f7', verified: true },
  'Itelsa-SantaAna':  { snmp_read: 'pxlro41e92b85', snmp_write: 'pxlrw2f4f2df6', verified: true },
  'Itelsa-Huawei2':   { snmp_read: 'pxlroabe80369', snmp_write: 'pxlrwa9837682', verified: true },
  'Itelsa-Feliciano': { snmp_read: 'pxlrod5902f15', snmp_write: 'pxlrwa232eb4a', verified: true },
  'Itelsa-Mocoreta':  { snmp_read: 'pxlroe9a1b564', snmp_write: 'pxlrwdb0934a3', verified: true },
  'Itelsa-Federal':   { snmp_read: 'pxlrode1a4e6f', snmp_write: 'pxlrw6cc65845', verified: true },
};

(async () => {
  fs.writeFileSync(OUT, JSON.stringify(PLATFORM, null, 2));
  for (const [name, c] of Object.entries(PLATFORM)) {
    const r = await prisma.oLT.updateMany({
      where: { name },
      // Puertos internos reales: telnet 23, SNMP 161 (los 2333/2361 eran el NAT de SmartOLT)
      data: { snmp_read: c.snmp_read, snmp_write: c.snmp_write, community: c.snmp_read, tcp_port: 23, udp_port: 161, telnet_user: 'smartolt' },
    });
    console.log(`  ${name}: ${r.count ? 'OK' : 'NO encontrada'} RO=${c.snmp_read} ${c.verified ? '(verificada)' : '(sin verificar SNMP)'}`);
  }
  console.log('Guardado', OUT);
  await prisma.$disconnect();
})().catch(e => { console.error(e); process.exit(1); });
