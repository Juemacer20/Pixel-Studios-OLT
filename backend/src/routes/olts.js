const express = require('express');
const ctrl = require('../controllers/oltController');
const { verifyToken, checkRole } = require('../middleware/auth');
const { commands } = require('../middleware/rateLimiter');
const router = express.Router();

router.use(verifyToken);
router.get('/', ctrl.list);
router.post('/', checkRole('admin'), ctrl.create);
router.get('/:id', ctrl.getOne);
router.put('/:id', checkRole('noc'), ctrl.update);
router.delete('/:id', checkRole('admin'), ctrl.remove);
router.get('/:id/status', ctrl.getStatus);
router.get('/:id/ports', ctrl.getPorts);
router.get('/:id/ports/:port/onts', ctrl.getPortONTs);
router.post('/:id/command', checkRole('noc'), commands, ctrl.sendCommand);

module.exports = router;
