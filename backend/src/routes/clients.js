const express = require('express');
const ctrl = require('../controllers/clientController');
const { verifyToken, checkRole } = require('../middleware/auth');
const router = express.Router();

router.use(verifyToken);
router.get('/', ctrl.list);
router.post('/', checkRole('noc'), ctrl.create);
router.get('/:id', ctrl.getOne);
router.put('/:id', checkRole('noc'), ctrl.update);
router.delete('/:id', checkRole('admin'), ctrl.remove);

module.exports = router;
