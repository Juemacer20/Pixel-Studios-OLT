const MA5800 = require('../services/huawei/ma5800');
const MA5680T = require('../services/huawei/ma5680t');
const KingType = require('../services/kingtype/kingtype');
const VSOL = require('../services/vsol/vsol');
const logger = require('../middleware/logger');

const ADAPTERS = {
  huawei_ma5800: MA5800,
  huawei_ma5680t: MA5680T,
  huawei: MA5800,
  kingtype: KingType,
  vsol: VSOL,
};

function getAdapter(olt) {
  const brandLower = (olt.brand || '').toLowerCase().replace(/\s+/g, '_');
  const modelLower = (olt.model || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const key = `${brandLower}_${modelLower}`;
  const AdapterClass = ADAPTERS[key] || ADAPTERS[brandLower];

  if (!AdapterClass) {
    logger.warn(`No adapter for brand=${olt.brand} model=${olt.model}, using MA5800`);
    return new MA5800(olt);
  }
  return new AdapterClass(olt);
}

module.exports = { getAdapter };
