const express = require('express');
const bcrypt = require('bcryptjs');
const { generateTokens, verifyToken } = require('../middleware/auth');
const { auth: authLimiter } = require('../middleware/rateLimiter');
const router = express.Router();

// Credenciales de la plataforma. Se pueden sobrescribir por env (AUTH_*_EMAIL/HASH).
// Generadas 2026-06-04 — reemplazan a las demo. Cambiables por ENV en prod.
const RW_HASH = process.env.AUTH_RW_HASH || '$2a$10$hgT5za2DNHV9Z/tkSu2KFepyIT5PRw3ShW.BlV77tUwTpsMa34gNW';
const RO_HASH = process.env.AUTH_RO_HASH || '$2a$10$z.3gKg/Ia/4N8dh.dz2ayOF.E7UX7SgXd/FAMQv6hCDtdiel12hr6';

const users = [
  // Usuario de ESCRITURA (lectura+escritura, gestión completa)
  { id: '1', email: process.env.AUTH_RW_EMAIL || 'admin@itelsa.com.ar', password: RW_HASH, role: 'admin', name: 'Administrador ITELSA' },
  // Usuario de LECTURA (solo consulta)
  { id: '2', email: process.env.AUTH_RO_EMAIL || 'lectura@itelsa.com.ar', password: RO_HASH, role: 'readonly', name: 'Lectura ITELSA' },
];

router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const user = users.find(u => u.email === email);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const { accessToken, refreshToken } = generateTokens(user);
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 3600 * 1000,
    });
    res.json({ accessToken, user: { id: user.id, email: user.email, role: user.role, name: user.name } });
  } catch (err) { next(err); }
});

router.post('/refresh', (req, res, next) => {
  const token = req.cookies?.refreshToken;
  if (!token) return res.status(401).json({ error: 'No refresh token' });
  const jwt = require('jsonwebtoken');
  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET || 'refresh-secret');
    const user = users.find(u => u.id === decoded.id);
    if (!user) return res.status(401).json({ error: 'User not found' });
    const { accessToken, refreshToken } = generateTokens(user);
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 3600 * 1000,
    });
    res.json({ accessToken });
  } catch (e) { res.status(401).json({ error: 'Invalid refresh token' }); }
});

router.post('/logout', (req, res) => {
  res.clearCookie('refreshToken');
  res.json({ message: 'Logged out' });
});

router.get('/me', verifyToken, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
