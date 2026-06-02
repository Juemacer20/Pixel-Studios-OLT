const express = require('express');
const ctrl = require('../controllers/alertController');
const { verifyToken, checkRole } = require('../middleware/auth');
const router = express.Router();

router.use(verifyToken);
router.get('/', ctrl.list);
router.post('/', checkRole('noc'), ctrl.create);
router.get('/:id', ctrl.getOne);
router.post('/:id/acknowledge', ctrl.acknowledge);
router.post('/:id/resolve', checkRole('noc'), ctrl.resolve);
router.delete('/:id', checkRole('admin'), ctrl.remove);

module.exports = router;
