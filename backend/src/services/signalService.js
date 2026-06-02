const prisma = require('../config/database');
const logger = require('../middleware/logger');

async function saveSignalHistory(ontId, rxPower, txPower) {
  try {
    return await prisma.signalHistory.create({
      data: { ont_id: ontId, rx_power: rxPower, tx_power: txPower, timestamp: new Date() },
    });
  } catch (err) {
    logger.error(`saveSignalHistory: ${err.message}`);
    return null;
  }
}

async function getRecentSignal(ontId, hours = 24) {
  const since = new Date(Date.now() - hours * 3600 * 1000);
  return prisma.signalHistory.findMany({
    where: { ont_id: ontId, timestamp: { gte: since } },
    orderBy: { timestamp: 'asc' },
  });
}

async function getSignalStats(ontId) {
  const history = await getRecentSignal(ontId, 24);
  if (!history.length) return null;
  const rxValues = history.map(h => h.rx_power).filter(v => v !== null);
  if (!rxValues.length) return null;
  return {
    min: Math.min(...rxValues),
    max: Math.max(...rxValues),
    avg: rxValues.reduce((a, b) => a + b, 0) / rxValues.length,
    count: rxValues.length,
    latest: history[history.length - 1],
  };
}

module.exports = { saveSignalHistory, getRecentSignal, getSignalStats };
