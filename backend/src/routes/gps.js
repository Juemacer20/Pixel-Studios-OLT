const express = require('express');
const { verifyToken } = require('../middleware/auth');
const { updateONTLocation, getONTLocation, getONTsWithLocation } = require('../services/gpsService');
const router = express.Router();
router.use(verifyToken);
router.get('/onts', async (req, res, next) => { try { res.json({ data: await getONTsWithLocation() }); } catch(e) { next(e); } });
router.get('/ont/:id', async (req, res, next) => { try { res.json({ data: await getONTLocation(req.params.id) }); } catch(e) { next(e); } });
router.put('/ont/:id', async (req, res, next) => { try { const { latitude, longitude } = req.body; res.json({ data: await updateONTLocation(req.params.id, latitude, longitude) }); } catch(e) { next(e); } });
module.exports = router;
