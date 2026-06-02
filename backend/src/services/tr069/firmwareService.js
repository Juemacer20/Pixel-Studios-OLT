const logger = require('../../middleware/logger');

async function pushFirmware(deviceIds, firmwareUrl) {
  logger.info(`Firmware push queued: ${deviceIds.length} devices, URL=${firmwareUrl}`);
  return { queued: deviceIds.length, firmwareUrl };
}
module.exports = { pushFirmware };
