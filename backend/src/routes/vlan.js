const express = require('express');
const { verifyToken, checkRole } = require('../middleware/auth');
const { configureVLAN, getVLANConfig } = require('../services/vlanService');
const router = express.Router();
router.use(verifyToken);
router.get('/ont/:id', async (req, res, next) => { try { res.json({ data: await getVLANConfig(req.params.id) }); } catch(e) { next(e); } });
router.post('/ont/:id', checkRole('noc'), async (req, res, next) => { try { const { portId, vlanId, mode } = req.body; res.json({ data: await configureVLAN(req.params.id, portId, vlanId, mode) }); } catch(e) { next(e); } });
module.exports = router;
