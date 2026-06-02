const { getAdapter } = require('../utils/oltFactory');
const prisma = require('../config/database');
const logger = require('../middleware/logger');

async function configureVLAN(ontId, portId, vlanId, mode = 'access') {
  const ont = await prisma.oNT.findUnique({ where: { id: ontId }, include: { olt: true } });
  if (!ont) throw new Error('ONT not found');

  const adapter = getAdapter(ont.olt);
  await adapter.connect();
  try {
    const cmd = buildVLANCommand(ont.serial_number, portId, vlanId, mode);
    const output = await adapter.sendCommand(cmd);
    await adapter.disconnect();
    logger.info(`VLAN configured: ONT=${ont.serial_number} port=${portId} vlan=${vlanId} mode=${mode}`);
    return { success: true, output };
  } catch (err) {
    await adapter.disconnect().catch(() => {});
    return { success: false, error: err.message };
  }
}

function buildVLANCommand(sn, portId, vlanId, mode) {
  if (mode === 'trunk') return `ont port native-vlan ${sn} eth ${portId} vlan ${vlanId}`;
  return `ont port vlan ${sn} eth ${portId} translation ${vlanId} ${vlanId} ${mode}`;
}

async function getVLANConfig(ontId) {
  const ont = await prisma.oNT.findUnique({ where: { id: ontId }, include: { olt: true } });
  if (!ont) throw new Error('ONT not found');
  const adapter = getAdapter(ont.olt);
  await adapter.connect();
  try {
    const output = await adapter.sendCommand(`display ont port info ${ont.serial_number}`);
    await adapter.disconnect();
    return { raw: output, ontId };
  } catch (err) {
    await adapter.disconnect().catch(() => {});
    throw err;
  }
}

module.exports = { configureVLAN, getVLANConfig };
