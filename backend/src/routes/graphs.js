const express = require('express');
const prisma = require('../config/database');
const router = express.Router();

/**
 * Downsample an array of [timestamp, value] pairs to at most maxPoints entries
 * using Largest-Triangle-Three-Buckets (LTTB) approximation.
 * Falls back to simple even-stride sampling for simplicity.
 */
function downsample(arr, maxPoints) {
  if (!arr || arr.length <= maxPoints) return arr;
  const stride = arr.length / maxPoints;
  const result = [];
  for (let i = 0; i < maxPoints; i++) {
    result.push(arr[Math.floor(i * stride)]);
  }
  return result;
}

// ─── GET /api/v1/graphs/signal ──────────────────────────────────────────────
// Paginated ONTs with their signal history thumbnails.
router.get('/signal', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const { olt_id } = req.query;
    const hours = Math.max(1, parseInt(req.query.hours) || 168);
    const since = new Date(Date.now() - hours * 3600000);

    const baseWhere = {
      ...(olt_id ? { olt_id } : {}),
      signalHistory: { some: { timestamp: { gte: since } } },
    };

    const [onts, total] = await Promise.all([
      prisma.oNT.findMany({
        where: baseWhere,
        include: {
          olt: { select: { id: true, name: true } },
          signalHistory: {
            where: { timestamp: { gte: since } },
            orderBy: { timestamp: 'asc' },
            select: { timestamp: true, rx_power: true },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { last_seen: 'desc' },
      }),
      prisma.oNT.count({ where: baseWhere }),
    ]);

    const items = onts.map((ont) => {
      const points = downsample(
        ont.signalHistory.map((h) => [h.timestamp.getTime(), h.rx_power]),
        100
      );
      const values = ont.signalHistory
        .map((h) => h.rx_power)
        .filter((v) => v != null);
      const avg = values.length
        ? values.reduce((a, b) => a + b, 0) / values.length
        : null;
      const min = values.length ? Math.min(...values) : null;
      const current =
        values.length ? values[values.length - 1] : (ont.rx_power ?? null);

      return {
        id: ont.id,
        serial: ont.serial_number,
        description: ont.description,
        status: ont.status,
        rx_power: ont.rx_power,
        olt: ont.olt,
        points,
        stats: {
          current,
          avg: avg != null ? Math.round(avg * 100) / 100 : null,
          min,
        },
      };
    });

    res.json({ data: { items, total, page, pages: Math.ceil(total / limit) } });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/v1/graphs/olt-stats ───────────────────────────────────────────
// OLT temperature and CPU history.
router.get('/olt-stats', async (req, res, next) => {
  try {
    const { olt_id } = req.query;
    const hours = Math.max(1, parseInt(req.query.hours) || 48);
    const since = new Date(Date.now() - hours * 3600000);

    const olts = await prisma.oLT.findMany({
      where: olt_id ? { id: olt_id } : {},
      select: {
        id: true,
        name: true,
        brand: true,
        model: true,
        cpu_usage: true,
        temperature: true,
        status: true,
        oltHistory: {
          where: { timestamp: { gte: since } },
          orderBy: { timestamp: 'asc' },
          select: { timestamp: true, cpu_usage: true, temperature: true },
        },
      },
    });

    const data = olts.map((olt) => ({
      id: olt.id,
      name: olt.name,
      brand: olt.brand,
      model: olt.model,
      current: { cpu: olt.cpu_usage, temp: olt.temperature, status: olt.status },
      tempHistory: downsample(
        olt.oltHistory
          .filter((h) => h.temperature != null)
          .map((h) => [h.timestamp.getTime(), h.temperature]),
        100
      ),
      cpuHistory: downsample(
        olt.oltHistory
          .filter((h) => h.cpu_usage != null)
          .map((h) => [h.timestamp.getTime(), h.cpu_usage]),
        100
      ),
    }));

    res.json({ data });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/v1/graphs/pon-signal ──────────────────────────────────────────
// Signal aggregated by PON port.
router.get('/pon-signal', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const { olt_id, pon_port } = req.query;
    const hours = Math.max(1, parseInt(req.query.hours) || 168);
    const since = new Date(Date.now() - hours * 3600000);

    const onts = await prisma.oNT.findMany({
      where: {
        ...(olt_id ? { olt_id } : {}),
        ...(pon_port != null ? { pon_port_id: pon_port } : {}),
      },
      include: {
        olt: { select: { id: true, name: true } },
        signalHistory: {
          where: { timestamp: { gte: since }, rx_power: { not: null } },
          orderBy: { timestamp: 'asc' },
          select: { timestamp: true, rx_power: true },
        },
      },
    });

    // Group by (olt_id, pon_port_id)
    const portMap = new Map();
    for (const ont of onts) {
      const key = `${ont.olt_id}:${ont.pon_port_id || 'unknown'}`;
      if (!portMap.has(key)) {
        portMap.set(key, {
          olt: ont.olt,
          olt_id: ont.olt_id,
          port: ont.pon_port_id,
          ont_count: 0,
          allHistory: [],
        });
      }
      const entry = portMap.get(key);
      entry.ont_count += 1;
      entry.allHistory.push(...ont.signalHistory);
    }

    // Aggregate per-port: bucket by minute, average rx_power across ONTs
    const ports = Array.from(portMap.values());
    const total = ports.length;
    const paged = ports.slice((page - 1) * limit, page * limit);

    const items = paged.map((entry) => {
      // Sort combined history by timestamp
      entry.allHistory.sort((a, b) => a.timestamp - b.timestamp);

      // Bucket into ~200 buckets and average per bucket
      const bucketMs = Math.max(60000, (hours * 3600000) / 200);
      const bucketMap = new Map();
      for (const h of entry.allHistory) {
        const bucket = Math.floor(h.timestamp.getTime() / bucketMs) * bucketMs;
        if (!bucketMap.has(bucket)) bucketMap.set(bucket, []);
        bucketMap.get(bucket).push(h.rx_power);
      }
      const rawSeries = Array.from(bucketMap.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([t, vals]) => [
          t,
          Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100,
        ]);

      const series = downsample(rawSeries, 100);
      const values = rawSeries.map((p) => p[1]);
      const avg =
        values.length
          ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100
          : null;
      const min = values.length ? Math.min(...values) : null;
      const max = values.length ? Math.max(...values) : null;

      return {
        key: `${entry.olt_id}:${entry.port || 'unknown'}`,
        olt: entry.olt,
        port: entry.port,
        ont_count: entry.ont_count,
        series,
        stats: { avg, min, max },
      };
    });

    res.json({ data: { items, total, page, pages: Math.ceil(total / limit) } });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/v1/graphs/signal/:ontId ───────────────────────────────────────
// Full 30-day signal history for one ONT (modal detail).
router.get('/signal/:ontId', async (req, res, next) => {
  try {
    const { ontId } = req.params;
    const since = new Date(Date.now() - 30 * 24 * 3600000);

    const [ont, history] = await Promise.all([
      prisma.oNT.findUnique({
        where: { id: ontId },
        include: { olt: { select: { name: true } } },
      }),
      prisma.signalHistory.findMany({
        where: { ont_id: ontId, timestamp: { gte: since } },
        orderBy: { timestamp: 'asc' },
      }),
    ]);

    if (!ont) return res.status(404).json({ error: 'ONT not found' });

    res.json({ data: { ont, history } });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/graphs/traffic?olt_id=&range=24h — series rx/tx Mbps por interfaz.
async function trafficHandler(req, res, next, onlyUplink) {
  try {
    const { olt_id, range = '24h' } = req.query;
    const hours = { '1h': 1, '24h': 24, '7d': 168, '30d': 720 }[range] || 24;
    const since = new Date(Date.now() - hours * 3600 * 1000);
    const where = { timestamp: { gte: since } };
    if (olt_id) where.olt_id = olt_id;
    if (onlyUplink) where.is_uplink = true;
    const rows = await prisma.oltTrafficHistory.findMany({ where, orderBy: { timestamp: 'asc' }, take: 20000 });
    // Agrupar por olt_id + if_index
    const groups = {};
    for (const r of rows) {
      const key = `${r.olt_id}:${r.if_index}`;
      if (!groups[key]) groups[key] = { oltId: r.olt_id, ifIndex: r.if_index, ifDescr: r.if_descr, isUplink: r.is_uplink, points: [] };
      groups[key].points.push({ t: r.timestamp, rx: r.rx_mbps, tx: r.tx_mbps });
    }
    res.json({ data: Object.values(groups) });
  } catch (err) { next(err); }
}

router.get('/traffic', (req, res, next) => trafficHandler(req, res, next, false));
router.get('/uplink', (req, res, next) => trafficHandler(req, res, next, true));

module.exports = router;
