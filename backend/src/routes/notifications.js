const express = require('express');
const { verifyToken, checkRole } = require('../middleware/auth');
const router = express.Router();
router.use(verifyToken);

router.get('/', async (req, res, next) => {
  try {
    const prisma = require('../config/database');
    const configs = await prisma.notificationConfig.findMany();
    res.json({ data: configs });
  } catch (err) { next(err); }
});

router.post('/', checkRole('admin'), async (req, res, next) => {
  try {
    const prisma = require('../config/database');
    const config = await prisma.notificationConfig.create({ data: req.body });
    res.status(201).json({ data: config });
  } catch (err) { next(err); }
});

router.put('/:id', checkRole('admin'), async (req, res, next) => {
  try {
    const prisma = require('../config/database');
    const config = await prisma.notificationConfig.update({ where: { id: req.params.id }, data: req.body });
    res.json({ data: config });
  } catch (err) { next(err); }
});

router.delete('/:id', checkRole('admin'), async (req, res, next) => {
  try {
    const prisma = require('../config/database');
    await prisma.notificationConfig.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
