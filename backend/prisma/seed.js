const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const ARGENTINIAN_NAMES = ['Juan García', 'María López', 'Carlos Rodríguez', 'Ana Martínez', 'Pedro González', 'Laura Fernández', 'Diego Sánchez', 'Valentina Torres', 'Lucas Ramírez', 'Florencia Díaz', 'Matías Herrera', 'Camila Moreno', 'Nicolás Ruiz', 'Sofía Álvarez', 'Agustín Castro', 'Lucía Jiménez', 'Santiago Vargas', 'Isabella Romero', 'Facundo Medina', 'Martina Suárez'];
const STREETS = ['Av. Corrientes', 'Av. Rivadavia', 'Av. Santa Fe', 'Av. Cabildo', 'Av. Belgrano', 'Calle Florida', 'Av. Entre Ríos', 'Av. Callao'];
const CITIES = ['Buenos Aires', 'Córdoba', 'Rosario', 'Mendoza', 'La Plata', 'Mar del Plata', 'Tucumán', 'Salta'];

function randomItem(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randomFloat(min, max, dec = 2) { return parseFloat((Math.random() * (max - min) + min).toFixed(dec)); }
function randomSN(brand = 'HWTC') { return `${brand}${Math.random().toString(16).slice(2, 10).toUpperCase()}`; }
function randomMAC() { return Array.from({length: 6}, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join(':'); }
function randomContract() { return `CTR-${randomInt(100000, 999999)}-${randomInt(20, 25)}`; }

async function main() {
  console.log('🌱 Seeding Pixel Studios OLT database...');

  // Speed profiles
  const speedProfiles = await Promise.all([
    { name: 'Básico 10/5', download_mbps: 10, upload_mbps: 5, burst_down: 15, burst_up: 7 },
    { name: 'Hogar 25/10', download_mbps: 25, upload_mbps: 10, burst_down: 35, burst_up: 15 },
    { name: 'Hogar Plus 50/20', download_mbps: 50, upload_mbps: 20, burst_down: 75, burst_up: 30 },
    { name: 'Premium 100/30', download_mbps: 100, upload_mbps: 30, burst_down: 150, burst_up: 45 },
    { name: 'Empresarial 200/100', download_mbps: 200, upload_mbps: 100, burst_down: 300, burst_up: 150 },
    { name: 'Gigabit 1000/500', download_mbps: 1000, upload_mbps: 500, burst_down: 1000, burst_up: 500 },
  ].map(sp => prisma.speedProfile.create({ data: sp })));
  console.log(`✅ ${speedProfiles.length} speed profiles`);

  // Service profiles
  const svcProfiles = await Promise.all([
    { name: 'Residencial DHCP', data_vlan: 100, voip_vlan: 200, iptv_vlan: 300, speed_down: 100, speed_up: 30, wan_mode: 'DHCP' },
    { name: 'Empresarial PPPoE', data_vlan: 150, voip_vlan: 250, speed_down: 200, speed_up: 100, wan_mode: 'PPPOE' },
    { name: 'Residencial Básico', data_vlan: 100, speed_down: 25, speed_up: 10, wan_mode: 'DHCP' },
  ].map(sp => prisma.serviceProfile.upsert({ where: { name: sp.name }, create: sp, update: sp })));
  console.log(`✅ ${svcProfiles.length} service profiles`);

  // ZTP profiles
  await Promise.all([
    { name: 'ZTP Residencial', service_profile_id: svcProfiles[0].id, description: 'Perfil automático para clientes residenciales' },
    { name: 'ZTP Empresarial', service_profile_id: svcProfiles[1].id, description: 'Perfil automático para empresas' },
  ].map(p => prisma.zTPProfile.upsert({ where: { name: p.name }, create: p, update: p })));
  console.log('✅ ZTP profiles');

  // OLTs
  const oltsData = [
    { name: 'HW-MA5800-01', brand: 'Huawei', model: 'MA5800', ip: '10.0.1.1', community: 'public', status: 'ONLINE', cpu_usage: randomFloat(20, 45), temperature: randomFloat(35, 45), location: 'Data Center Principal - BA', uptime: BigInt(randomInt(86400, 8640000)) },
    { name: 'HW-MA5800-02', brand: 'Huawei', model: 'MA5800', ip: '10.0.1.2', community: 'public', status: 'ONLINE', cpu_usage: randomFloat(30, 60), temperature: randomFloat(38, 52), location: 'Nodo Norte - Córdoba', uptime: BigInt(randomInt(86400, 8640000)) },
    { name: 'KT-OLT-01', brand: 'KingType', model: 'C300', ip: '10.0.2.1', community: 'public', status: 'ONLINE', cpu_usage: randomFloat(15, 35), temperature: randomFloat(30, 42), location: 'Nodo Sur - Rosario', uptime: BigInt(randomInt(86400, 8640000)) },
    { name: 'VSOL-V2801-01', brand: 'VSOL', model: 'V2801', ip: '10.0.3.1', community: 'public', status: 'DEGRADED', cpu_usage: randomFloat(50, 75), temperature: randomFloat(45, 58), location: 'Nodo Este - Mendoza', uptime: BigInt(randomInt(86400, 8640000)) },
  ];

  const olts = [];
  for (const oltData of oltsData) {
    const olt = await prisma.oLT.upsert({ where: { name: oltData.name }, create: oltData, update: { status: oltData.status, cpu_usage: oltData.cpu_usage, temperature: oltData.temperature } });
    olts.push(olt);
  }
  console.log(`✅ ${olts.length} OLTs`);

  // PON Ports
  const ports = [];
  for (const olt of olts) {
    const portCount = olt.brand === 'VSOL' ? 4 : 8;
    for (let i = 0; i < portCount; i++) {
      const port = await prisma.pONPort.upsert({
        where: { olt_id_port_number: { olt_id: olt.id, port_number: i } },
        create: { olt_id: olt.id, port_number: i, capacity: 128, used: randomInt(5, 40), status: 'active' },
        update: {},
      });
      ports.push({ port, olt });
    }
  }
  console.log(`✅ ${ports.length} PON ports`);

  // NAP Boxes
  const napBoxes = await Promise.all(
    Array.from({length: 8}, (_, i) => prisma.nAPBox.create({
      data: {
        name: `NAP-${String(i + 1).padStart(3, '0')}`,
        latitude: randomFloat(-34.9, -34.5, 6),
        longitude: randomFloat(-58.5, -58.2, 6),
        address: `${randomItem(STREETS)} ${randomInt(100, 9999)}, ${randomItem(CITIES)}`,
        ports_total: 16,
        ports_used: randomInt(4, 14),
      },
    }))
  );
  console.log(`✅ ${napBoxes.length} NAP boxes`);

  // ONTs and Clients
  let ontCount = 0;
  let clientCount = 0;
  const statuses = ['ONLINE', 'ONLINE', 'ONLINE', 'ONLINE', 'ONLINE', 'ONLINE', 'OFFLINE', 'OFFLINE', 'LOS', 'PENDING'];
  const plans = ['Hogar 25/10', 'Hogar Plus 50/20', 'Premium 100/30', 'Básico 10/5', 'Empresarial 200/100'];

  for (let i = 0; i < 50; i++) {
    const { port, olt } = ports[i % ports.length];
    const status = randomItem(statuses);
    const rx = status === 'LOS' ? randomFloat(-30, -27.5) : status === 'OFFLINE' ? null : randomFloat(-22, -12);
    const tx = rx !== null ? rx + randomFloat(1, 3) : null;
    const snPrefix = olt.brand === 'KingType' ? 'KTCM' : olt.brand === 'VSOL' ? 'VSOL' : 'HWTC';
    const napBox = randomItem(napBoxes);

    let ont;
    try {
      ont = await prisma.oNT.create({
        data: {
          serial_number: randomSN(snPrefix),
          mac: randomMAC(),
          olt_id: olt.id,
          pon_port_id: port.id,
          status,
          rx_power: rx,
          tx_power: tx,
          last_seen: status !== 'OFFLINE' ? new Date(Date.now() - randomInt(0, 3600000)) : null,
          provisioned_at: status !== 'PENDING' ? new Date(Date.now() - randomInt(86400000, 31536000000)) : null,
          latitude: napBox.latitude + randomFloat(-0.01, 0.01, 6),
          longitude: napBox.longitude + randomFloat(-0.01, 0.01, 6),
          nap_box_id: napBox.id,
          speed_profile_id: randomItem(speedProfiles).id,
          protocol: 'GPON',
          description: `Instalación ${randomItem(CITIES)}`,
        },
      });
      ontCount++;
    } catch (e) {
      continue;
    }

    if (status !== 'PENDING' && Math.random() > 0.15) {
      const name = randomItem(ARGENTINIAN_NAMES);
      try {
        await prisma.client.create({
          data: {
            ont_id: ont.id,
            name,
            address: `${randomItem(STREETS)} ${randomInt(100, 9999)}, ${randomItem(CITIES)}`,
            phone: `+54 9 11 ${randomInt(1000, 9999)}-${randomInt(1000, 9999)}`,
            email: `${name.split(' ')[0].toLowerCase()}.${randomInt(1, 999)}@mail.com`,
            service_plan: randomItem(plans),
            contract_number: randomContract(),
          },
        });
        clientCount++;
      } catch (e) {}
    }

    // Signal history
    if (status === 'ONLINE' || status === 'LOS') {
      const historyPoints = Array.from({length: 24}, (_, h) => ({
        ont_id: ont.id,
        rx_power: rx !== null ? rx + randomFloat(-0.5, 0.5) : null,
        tx_power: tx !== null ? tx + randomFloat(-0.3, 0.3) : null,
        timestamp: new Date(Date.now() - (23 - h) * 3600000),
      }));
      try {
        await prisma.signalHistory.createMany({ data: historyPoints, skipDuplicates: true });
      } catch (e) {}
    }
  }
  console.log(`✅ ${ontCount} ONTs, ${clientCount} clientes`);

  // Sample alerts
  const onts = await prisma.oNT.findMany({ take: 10 });
  const alertTypes = [
    { type: 'LOS', severity: 'CRITICAL', message: 'Pérdida de señal detectada (LOS)' },
    { type: 'LOW_SIGNAL', severity: 'HIGH', message: 'Señal baja: -26 dBm' },
    { type: 'ONT_OFFLINE', severity: 'MEDIUM', message: 'ONT sin respuesta > 5 min' },
    { type: 'CPU_HIGH', severity: 'HIGH', message: 'Uso de CPU supera 80%' },
    { type: 'TEMP_HIGH', severity: 'MEDIUM', message: 'Temperatura alta: 55°C' },
  ];

  for (let i = 0; i < 8; i++) {
    const ont = onts[i % onts.length];
    const alertTemplate = randomItem(alertTypes);
    try {
      await prisma.alert.create({
        data: {
          ont_id: alertTemplate.type !== 'CPU_HIGH' && alertTemplate.type !== 'TEMP_HIGH' ? ont.id : null,
          olt_id: ['CPU_HIGH', 'TEMP_HIGH'].includes(alertTemplate.type) ? olts[i % olts.length].id : null,
          type: alertTemplate.type,
          severity: alertTemplate.severity,
          message: alertTemplate.message,
          acknowledged: Math.random() > 0.6,
          resolved: Math.random() > 0.7,
        },
      });
    } catch (e) {}
  }
  console.log('✅ Alertas de muestra');

  console.log('\n🎉 Seed completado!');
  console.log(`   OLTs: ${olts.length} | ONTs: ${ontCount} | Clientes: ${clientCount}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
