const express = require('express');
const ctrl = require('../controllers/ontController');
const { verifyToken, checkRole } = require('../middleware/auth');
const router = express.Router();

router.use(verifyToken);
router.get('/', ctrl.list);
router.post('/', checkRole('noc'), ctrl.create);
router.get('/:id', ctrl.getOne);
router.put('/:id', checkRole('noc'), ctrl.update);
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
