const express = require('express');
const { verifyToken } = require('../middleware/auth');
const router = express.Router();
router.use(verifyToken);

router.get('/pending', async (req, res, next) => {
  try {
    const prisma = require('../config/database');
    const onts = await prisma.oNT.findMany({ where: { status: 'PENDING' }, include: { olt: true } });
    res.json({ data: onts });
  } catch (err) { next(err); }
});

router.post('/authorize/:id', async (req, res, next) => {
  try {
    const prisma = require('../config/database');
    const { profileId } = req.body;
    const ont = await prisma.oNT.update({ where: { id: req.params.id }, data: { status: 'ONLINE', speed_profile_id: profileId } });
    res.json({ data: ont });
  } catch (err) { next(err); }
});

router.get('/profiles', async (req, res, next) => {
  try {
    const prisma = require('../config/database');
    const profiles = await prisma.zTPProfile.findMany({ include: { serviceProfile: true } });
    res.json({ data: profiles });
  } catch (err) { next(err); }
});

module.exports = router;
