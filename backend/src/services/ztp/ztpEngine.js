const prisma = require('../../config/database');
const { getAdapter } = require('../../utils/oltFactory');
const logger = require('../../middleware/logger');

async function onNewONTDetected(serialNumber, oltId, ponPortId) {
  const existing = await prisma.oNT.findUnique({ where: { serial_number: serialNumber } });
  if (existing) return existing;

  const ont = await prisma.oNT.create({
    data: { serial_number: serialNumber, olt_id: oltId, pon_port_id: ponPortId, status: 'PENDING' },
  });

  logger.info(`New ONT detected: ${serialNumber}, created with PENDING status`);

  if (global.io) {
    global.io.to('all').emit('ztp:new-ont', { id: ont.id, serial_number: serialNumber, oltId, ponPortId });
  }

  return ont;
}

async function applyProfile(ontId, profileId) {
  const [ont, profile] = await Promise.all([
    prisma.oNT.findUnique({ where: { id: ontId }, include: { olt: true } }),
    prisma.zTPProfile.findUnique({ where: { id: profileId }, include: { serviceProfile: true } }),
  ]);

  if (!ont || !profile) throw new Error('ONT or ZTP profile not found');

  const adapter = getAdapter(ont.olt);
  await adapter.connect();

  try {
    const sp = profile.serviceProfile;
    if (sp) {
      if (sp.data_vlan) await adapter.sendCommand(`ont add ${ont.serial_number} service-type internet data-vlan ${sp.data_vlan}`);
      if (sp.voip_vlan) await adapter.sendCommand(`ont add ${ont.serial_number} service-type voip voip-vlan ${sp.voip_vlan}`);
    }
    await adapter.disconnect();

    await prisma.oNT.update({
      where: { id: ontId },
      data: { status: 'ONLINE', provisioned_at: new Date() },
    });

    logger.info(`ZTP profile applied: ONT=${ont.serial_number} profile=${profile.name}`);
    return { success: true, ont, profile };
  } catch (err) {
    await adapter.disconnect().catch(() => {});
    logger.error(`applyProfile: ${err.message}`);
    return { success: false, error: err.message };
  }
}

async function authorizeONT(ontId, profileId) {
  const ont = await prisma.oNT.findUnique({ where: { id: ontId } });
  if (!ont) throw new Error('ONT not found');
  if (ont.status !== 'PENDING') throw new Error('ONT is not in PENDING state');
  return applyProfile(ontId, profileId);
}

async function getPendingONTs() {
  return prisma.oNT.findMany({
    where: { status: 'PENDING' },
    include: { olt: { select: { name: true, brand: true } }, ponPort: { select: { port_number: true } } },
    orderBy: { created_at: 'desc' },
  });
}

module.exports = { onNewONTDetected, applyProfile, authorizeONT, getPendingONTs };
