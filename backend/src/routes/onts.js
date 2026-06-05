const express = require('express');
const ctrl = require('../controllers/ontController');
const { verifyToken, checkRole } = require('../middleware/auth');
const prisma = require('../config/database');
const router = express.Router();

router.use(verifyToken);
router.get('/', ctrl.list);
router.post('/', checkRole('noc'), ctrl.create);

// Must be before /:id to avoid route conflict
router.get('/unconfigured', async (req, res, next) => {
  try {
    const { olt_id } = req.query;
    const where = {
      ...(olt_id ? { olt_id } : {}),
      OR: [
        { description: null },
        { description: { startsWith: 'gpon-onu_' } },
        { description: { startsWith: '0/' } },
      ],
    };

    const onts = await prisma.oNT.findMany({
      where,
      include: { olt: { select: { id: true, name: true } } },
      orderBy: [{ olt_id: 'asc' }, { last_seen: 'desc' }],
      take: 2000,
    });

    // Group by OLT
    const grouped = {};
    for (const ont of onts) {
      const key = ont.olt_id;
      if (!grouped[key]) grouped[key] = { olt: ont.olt, onts: [] };
      grouped[key].onts.push(ont);
    }

    res.json({ data: { groups: Object.values(grouped), total: onts.length } });
  } catch (e) { next(e); }
});

router.get('/:id', ctrl.getOne);
router.put('/:id', checkRole('noc'), ctrl.update);
router.patch('/:id', checkRole('noc'), async (req, res, next) => {
  try {
    const { description, status } = req.body;
    const data = {};
    if (description !== undefined) data.description = description;
    if (status !== undefined) data.status = status;
    const ont = await prisma.oNT.update({ where: { id: req.params.id }, data });
    res.json({ data: ont });
  } catch (e) { next(e); }
});
router.delete('/:id', checkRole('admin'), ctrl.remove);
router.get('/:id/signal', ctrl.getSignal);
router.get('/:id/signal/history', ctrl.getSignalHistory);
router.post('/:id/reboot', checkRole('noc'), ctrl.reboot);
router.put('/:id/location', checkRole('noc'), ctrl.updateLocation);
router.get('/:id/dhcp-leases', ctrl.getDHCPLeases);
router.get('/:id/mac-table', ctrl.getMACTable);
router.post('/:id/provision', checkRole('noc'), ctrl.provision);
router.post('/:id/wan-config', checkRole('noc'), ctrl.wanConfig);

module.exports = router;
