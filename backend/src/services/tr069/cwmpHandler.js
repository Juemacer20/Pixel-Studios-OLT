const logger = require('../../middleware/logger');

function handleGetParameterValues(device, params) {
  return params.map(p => ({ name: p, value: device.parameters?.[p] || '' }));
}
function handleSetParameterValues(device, params) {
  return { success: true, params };
}
module.exports = { handleGetParameterValues, handleSetParameterValues };
