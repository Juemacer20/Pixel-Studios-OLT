const rateLimit = require('express-rate-limit');

// Saltea el rate limit para tráfico interno/proxy (vite/nginx en la misma máquina).
const isLocal = (req) => {
  const ip = req.ip || req.connection?.remoteAddress || '';
  return ip.includes('127.0.0.1') || ip.includes('::1') || ip.includes('::ffff:127.0.0.1');
};

const general = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10000,            // app de dashboard + polling hace muchas requests; límite alto
  standardHeaders: true,
  legacyHeaders: false,
  skip: isLocal,
  message: { error: 'Too many requests, please try again later.' },
});

const auth = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,              // antes 10: muy bajo cuando todo viene del proxy (misma IP)
  standardHeaders: true,
  legacyHeaders: false,
  skip: isLocal,
  message: { error: 'Too many auth attempts, please try again later.' },
});

const commands = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  skip: isLocal,
  message: { error: 'Too many commands, slow down.' },
});

module.exports = { general, auth, commands };
