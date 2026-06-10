const { getAdapter } = require('../utils/oltFactory');
const prisma = require('../config/database');
const logger = require('../middleware/logger');

async function applySpeedProfile(ontId, speedProfileId) {
  const ont = await prisma.oNT.findUnique({ where: { id: ontId }, include: { olt: true } });
  if (!ont) throw new Error('ONT not found');

  const profile = await prisma.speedProfile.findUnique({ where: { id: speedProfileId } });
  if (!profile) throw new Error('Speed profile not found');

  const adapter = getAdapter(ont.olt);
  await adapter.connect();

  let output = '';
  try {
    const cmd = buildDBACommand(ont, profile);
    output = await adapter.sendCommand(cmd);
    await adapter.disconnect();
    await prisma.oNT.update({ where: { id: ontId }, data: { speed_profile_id: speedProfileId } });
    logger.info(`Speed profile applied: ONT=${ont.serial_number} profile=${profile.name}`);
    return { success: true, output, profile };
  } catch (err) {
    await adapter.disconnect().catch(() => {});
    logger.error(`applySpeedProfile: ${err.message}`);
    return { success: false, error: err.message };
  }
}

function buildDBACommand(ont, profile) {
  const down = profile.download_mbps * 1000;
  const up = profile.upload_mbps * 1000;
  return `ont modify dba-profile ${ont.serial_number} fixed ${up} assured ${up} maximum ${down}`;
}

async function getSpeedProfiles() {
  return prisma.speedProfile.findMany({ orderBy: { name: 'asc' } });
}

const PROFILE_FIELDS = ['name', 'direction', 'speedKbps', 'download_mbps', 'upload_mbps', 'burst_down', 'burst_up', 'type', 'isDefault', 'forPonType'];
function pickProfile(data) {
  return PROFILE_FIELDS.reduce((acc, k) => (data[k] !== undefined ? (acc[k] = data[k], acc) : acc), {});
}

async function createSpeedProfile(data) {
  return prisma.speedProfile.create({ data: pickProfile(data) });
}

async function updateSpeedProfile(id, data) {
  return prisma.speedProfile.update({ where: { id }, data: pickProfile(data) });
}

async function deleteSpeedProfile(id) {
  await prisma.oNT.updateMany({ where: { speed_profile_id: id }, data: { speed_profile_id: null } });
  return prisma.speedProfile.delete({ where: { id } });
}

module.exports = { applySpeedProfile, getSpeedProfiles, createSpeedProfile, updateSpeedProfile, deleteSpeedProfile };
