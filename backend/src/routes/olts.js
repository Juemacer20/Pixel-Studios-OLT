const express = require('express');
const net = require('net');
const ctrl = require('../controllers/oltController');
const cfgCtrl = require('../controllers/oltConfigController');
const { verifyToken, checkRole } = require('../middleware/auth');
const { commands } = require('../middleware/rateLimiter');
const prisma = require('../config/database');
const router = express.Router();

router.use(verifyToken);
router.get('/', ctrl.list);

// Test de conectividad TCP (solo-lectura: abre y cierra un socket, no envía comandos)
router.get('/:id/test-connection', async (req, res, next) => {
  try {
    const olt = await prisma.oLT.findUnique({ where: { id: req.params.id } });
    if (!olt) return res.status(404).json({ error: 'OLT not found' });
    const port = olt.tcp_port || 23;
    const sock = new net.Socket();
    const start = Date.now();
    let finished = false;
    const done = (reachable, message) => {
      if (finished) return; finished = true; sock.destroy();
      res.json({ data: { reachable, ip: olt.ip, port, ms: Date.now() - start, message } });
    };
    sock.setTimeout(4000);
    sock.once('connect', () => done(true, `TCP connection established (${olt.ip}:${port})`));
    sock.once('timeout', () => done(false, 'Connection timeout (4s)'));
    sock.once('error', (e) => done(false, e.code || e.message));
    sock.connect(port, olt.ip);
  } catch (err) { next(err); }
});
router.post('/', checkRole('admin'), ctrl.create);
router.get('/:id', ctrl.getOne);
router.put('/:id', checkRole('noc'), ctrl.update);
router.delete('/:id', checkRole('admin'), ctrl.remove);
router.get('/:id/status', ctrl.getStatus);
router.get('/:id/ports', ctrl.getPorts);
router.get('/:id/ports/:port/onts', ctrl.getPortONTs);
router.post('/:id/scan', checkRole('noc'), ctrl.scanONTs);

// Config comparison: DB vs OLT real (solo lectura)
router.get('/:id/compare', checkRole('noc'), async (req, res, next) => {
  try {
    const { scanAndCompare } = require('../services/configComparisonService');
    res.json({ data: await scanAndCompare(req.params.id) });
  } catch (e) { next(e); }
});
router.post('/:id/command', checkRole('noc'), commands, ctrl.sendCommand);
router.get('/:id/config', checkRole('noc'), cfgCtrl.read);
router.post('/:id/config', checkRole('noc'), cfgCtrl.write);

module.exports = router;
