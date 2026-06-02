const { getAdapter } = require('../../utils/oltFactory');
const prisma = require('../../config/database');
const logger = require('../../middleware/logger');

async function configureTriplePlay(ontId, { dataVlan, voipVlan, iptvVlan }) {
  const ont = await prisma.oNT.findUnique({ where: { id: ontId }, include: { olt: true } });
  if (!ont) throw new Error('ONT not found');
  const adapter = getAdapter(ont.olt);
  await adapter.connect();
  const results = [];
  if (dataVlan) results.push(await adapter.sendCommand(`ont add-service ${ont.serial_number} data vlan ${dataVlan}`));
  if (voipVlan) results.push(await adapter.sendCommand(`ont add-service ${ont.serial_number} voip vlan ${voipVlan}`));
  if (iptvVlan) results.push(await adapter.sendCommand(`ont add-service ${ont.serial_number} iptv vlan ${iptvVlan}`));
  await adapter.disconnect();
  return { success: true, results };
}

module.exports = { configureTriplePlay };
