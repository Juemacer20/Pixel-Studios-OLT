const express = require('express');
const { verifyToken } = require('../middleware/auth');
const prisma = require('../config/database');
const router = express.Router();

router.use(verifyToken);

// GET /api/v1/reports/signal-summary  (existing)
router.get('/signal-summary', async (req, res, next) => {
  try {
    const { ontId, range = '24h' } = req.query;
    const ranges = { '24h': 24, '7d': 168, '30d': 720 };
    const hours = ranges[range] || 24;
    const since = new Date(Date.now() - hours * 3600 * 1000);

    const where = { timestamp: { gte: since } };
    if (ontId) where.ont_id = ontId;

    const data = await prisma.signalHistory.findMany({
      where,
      orderBy: { timestamp: 'asc' },
      take: 1000,
    });
    res.json({ data, range, count: data.length });
  } catch (err) { next(err); }
});

// GET /api/v1/reports/tasks
// Audit log of operations performed on ONTs/OLTs
router.get('/tasks', async (req, res, next) => {
  try {
    const { user, action, from, to, page = 1, limit = 50 } = req.query;
    const where = {};
    if (user) where.user_id = { contains: user, mode: 'insensitive' };
    if (action && action !== 'Any') where.action = { contains: action, mode: 'insensitive' };
    if (from || to) {
      where.created_at = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to   ? { lte: new Date(to + 'T23:59:59Z') } : {}),
      };
    }

    const pageNum  = parseInt(page, 10)  || 1;
    const pageSize = parseInt(limit, 10) || 50;

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (pageNum - 1) * pageSize,
        take: pageSize,
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({
      data: {
        items,
        total,
        page: pageNum,
        pages: Math.ceil(total / pageSize),
      },
    });
  } catch (err) { next(err); }
});

// GET /api/v1/reports/authorizations
// History of ONT authorizations
router.get('/authorizations', async (req, res, next) => {
  try {
    const { search, from, to, page = 1, limit = 50 } = req.query;
    const where = {
      action: { in: ['CREATE_ONT', 'authorize', 'AUTHORIZE_ONT', 'ZTP_AUTHORIZE', 'AUTHORIZE'] },
    };
    if (from || to) {
      where.created_at = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to   ? { lte: new Date(to + 'T23:59:59Z') } : {}),
      };
    }
    if (search) {
      where.OR = [
        { user_id:  { contains: search, mode: 'insensitive' } },
        { target:   { contains: search, mode: 'insensitive' } },
        { action:   { contains: search, mode: 'insensitive' } },
      ];
    }

    const pageNum  = parseInt(page, 10)  || 1;
    const pageSize = parseInt(limit, 10) || 50;

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (pageNum - 1) * pageSize,
        take: pageSize,
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({
      data: {
        items,
        total,
        page: pageNum,
        pages: Math.ceil(total / pageSize),
      },
    });
  } catch (err) { next(err); }
});

// GET /api/v1/reports/export-data
// Returns ONTs for client-side CSV export
router.get('/export-data', async (req, res, next) => {
  try {
    const { olt_id, status, search } = req.query;
    const where = {};
    if (olt_id)  where.olt_id = olt_id;
    if (status && status !== 'Any') where.status = status.toUpperCase();
    if (search) {
      where.OR = [
        { serial_number: { contains: search, mode: 'insensitive' } },
        { mac:           { contains: search, mode: 'insensitive' } },
        { description:   { contains: search, mode: 'insensitive' } },
      ];
    }

    const onts = await prisma.oNT.findMany({
      where,
      include: { olt: { select: { name: true } } },
      orderBy: { serial_number: 'asc' },
      take: 5000,
    });

    res.json({ data: onts });
  } catch (err) { next(err); }
});

module.exports = router;
