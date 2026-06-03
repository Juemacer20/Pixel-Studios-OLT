const express = require('express');
const bcrypt = require('bcryptjs');
const { generateTokens, verifyToken } = require('../middleware/auth');
const { auth: authLimiter } = require('../middleware/rateLimiter');
const router = express.Router();

// bcrypt hash of "password" — change in production or use DB-backed auth
const DEMO_HASH = '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';

const users = [
  { id: '1', email: 'admin@pixel-studios.com', password: DEMO_HASH, role: 'admin', name: 'Administrador' },
  { id: '2', email: 'noc@pixel-studios.com', password: DEMO_HASH, role: 'noc', name: 'Operador NOC' },
  { id: '3', email: 'viewer@pixel-studios.com', password: DEMO_HASH, role: 'readonly', name: 'Solo Lectura' },
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
