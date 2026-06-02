const { getAdapter } = require('../utils/oltFactory');
const prisma = require('../config/database');
const logger = require('../middleware/logger');

async function getMACTable(ontId) {
  const ont = await prisma.oNT.findUnique({ where: { id: ontId }, include: { olt: true } });
  if (!ont) throw new Error('ONT not found');
  try {
    const adapter = getAdapter(ont.olt);
    await adapter.connect();
    const output = await adapter.sendCommand(`display ont mac-address ${ont.serial_number}`);
    await adapter.disconnect();
    return parseMACTable(output);
  } catch (err) {
    logger.error(`getMACTable: ${err.message}`);
    return [];
  }
}

function parseMACTable(output) {
  const macs = [];
  const lines = output.split('\n');
  for (const line of lines) {
    const match = line.match(/([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}/);
    if (match) macs.push({ mac: match[0], raw: line.trim() });
  }
  return macs;
}

module.exports = { getMACTable };
