const { getAdapter } = require('../../utils/oltFactory');
const prisma = require('../../config/database');

async function getEPONONTs(oltId) {
  return prisma.oNT.findMany({
    where: { olt_id: oltId, protocol: 'EPON' },
    include: { client: true, ponPort: true },
  });
}

async function rebootEPONONT(ontId, userId) {
  const ont = await prisma.oNT.findUnique({ where: { id: ontId }, include: { olt: true } });
  if (!ont) throw new Error('ONT not found');
  const adapter = getAdapter(ont.olt);
  await adapter.connect();
  const result = await adapter.rebootONT(ont.serial_number);
  await adapter.disconnect();
  await prisma.auditLog.create({
    data: { user_id: userId, action: 'EPON_ONT_REBOOT', target: ontId, details: { serial: ont.serial_number } },
  });
  return result;
}

module.exports = { getEPONONTs, rebootEPONONT };
