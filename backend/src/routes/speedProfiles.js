const express = require('express');
const { verifyToken, checkRole } = require('../middleware/auth');
const { getSpeedProfiles, createSpeedProfile, applySpeedProfile } = require('../services/speedLimitService');
const router = express.Router();
router.use(verifyToken);
router.get('/', async (req, res, next) => { try { res.json({ data: await getSpeedProfiles() }); } catch(e) { next(e); } });
router.post('/', checkRole('admin'), async (req, res, next) => { try { res.status(201).json({ data: await createSpeedProfile(req.body) }); } catch(e) { next(e); } });
router.post('/apply/:ontId', checkRole('noc'), async (req, res, next) => { try { res.json({ data: await applySpeedProfile(req.params.ontId, req.body.profileId) }); } catch(e) { next(e); } });
module.exports = router;
