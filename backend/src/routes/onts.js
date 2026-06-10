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

// Authorize a new ONU (must be before /:id)
router.post('/authorize', checkRole('noc'), ctrl.authorize);

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

// ── ONU actions (Telnet to OLT, audit-logged) ───────────────────────────────
router.post('/:id/change-type',      checkRole('noc'), ctrl.ontAction('changeType'));
router.post('/:id/speed-profile',    checkRole('noc'), ctrl.ontAction('speedProfile'));
router.post('/:id/enable',           checkRole('noc'), ctrl.ontAction('enable'));
router.post('/:id/disable',          checkRole('noc'), ctrl.ontAction('disable'));
router.post('/:id/start',            checkRole('noc'), ctrl.ontAction('start'));
router.post('/:id/stop',             checkRole('noc'), ctrl.ontAction('stop'));
router.post('/:id/resync',           checkRole('noc'), ctrl.ontAction('resync'));
router.post('/:id/restore-defaults', checkRole('noc'), ctrl.ontAction('restoreDefaults'));
router.post('/:id/web-user-pass',    checkRole('noc'), ctrl.ontAction('webUserPass'));
router.post('/:id/replace-by-sn',    checkRole('noc'), ctrl.ontAction('replaceBySN'));
router.post('/:id/move',             checkRole('noc'), ctrl.ontAction('move'));
router.post('/:id/update-vlans',     checkRole('noc'), ctrl.ontAction('updateVLANs'));
router.get('/:id/running-config',    ctrl.ontAction('runningConfig'));
router.get('/:id/sw-info',           ctrl.ontAction('swInfo'));
// DB-only actions
router.patch('/:id/external-id',     checkRole('noc'), ctrl.updateExternalId);
router.post('/:id/update-location',  checkRole('noc'), ctrl.updateLocationDetails);

module.exports = router;
