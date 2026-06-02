const express = require('express');
const { verifyToken } = require('../middleware/auth');
const { getLeasesForONT } = require('../services/dhcpService');
const router = express.Router();
router.use(verifyToken);
router.get('/ont/:ontId', async (req, res, next) => {
  try { res.json({ data: await getLeasesForONT(req.params.ontId) }); } catch (e) { next(e); }
});
module.exports = router;
