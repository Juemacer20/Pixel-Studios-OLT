const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { generateTokens, verifyToken, checkRole } = require('../middleware/auth');
const { auth: authLimiter } = require('../middleware/rateLimiter');
const prisma = require('../config/database');
const logger = require('../middleware/logger');
const router = express.Router();

// Credenciales base (fallback si la DB no tiene el usuario). Sobrescribibles por env.
const RW_HASH = process.env.AUTH_RW_HASH || '$2a$10$uOf5LE50T4XBc7MykSaxeuJOEKB.1TW4y65Aew.OIPytUOe2NpEDi';
const RO_HASH = process.env.AUTH_RO_HASH || '$2a$10$uOf5LE50T4XBc7MykSaxeuJOEKB.1TW4y65Aew.OIPytUOe2NpEDi';
const SEED_USERS = [
  { email: process.env.AUTH_RW_EMAIL || 'admin@itelsa.com.ar', password_hash: RW_HASH, group: 'admin', name: 'Administrador ITELSA' },
  { email: process.env.AUTH_RO_EMAIL || 'lectura@itelsa.com.ar', password_hash: RO_HASH, group: 'readonly', name: 'Lectura ITELSA' },
];

// Siembra idempotente de los usuarios base en la tabla users.
async function ensureSeed() {
  try {
    for (const u of SEED_USERS) {
      await prisma.user.upsert({ where: { email: u.email }, update: { password_hash: u.password_hash, group: u.group, name: u.name }, create: u });
    }
  } catch (e) { logger.warn(`auth ensureSeed: ${e.message}`); }
}
ensureSeed();

const roleOf = (u) => u.group || u.role || 'noc';
const toToken = (u) => ({ id: u.id, email: u.email, role: roleOf(u), name: u.name });

// Busca usuario en DB; si no está, cae al SEED hardcodeado (login nunca se rompe).
async function findUser(email) {
  try {
    const dbUser = await prisma.user.findUnique({ where: { email } });
    if (dbUser) return dbUser;
  } catch (e) { logger.warn(`auth findUser DB: ${e.message}`); }
  const seed = SEED_USERS.find((u) => u.email === email);
  return seed ? { id: 'seed-' + email, ...seed } : null;
}

router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const { email, password, remember } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    if (req.body.identity && !email) { /* compat */ }
    const user = await findUser(email);
    if (!user || user.status === 'inactive' || !(await bcrypt.compare(password, user.password_hash || user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const tk = toToken(user);
    const { accessToken, refreshToken } = generateTokens(tk);
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 7 * 24 * 3600 * 1000,
    });
    // Remember me: token persistente 30 días (cookie httpOnly) si el usuario existe en DB.
    if (remember && !String(user.id).startsWith('seed-')) {
      const rememberToken = crypto.randomBytes(32).toString('hex');
      await prisma.user.update({ where: { id: user.id }, data: { remember_token: rememberToken } }).catch(() => {});
      res.cookie('remember_token', rememberToken, {
        httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 30 * 24 * 3600 * 1000,
      });
    }
    res.json({ accessToken, user: tk });
  } catch (err) { next(err); }
});

router.post('/refresh', async (req, res) => {
  const jwt = require('jsonwebtoken');
  const token = req.cookies?.refreshToken;
  // 1) refresh token normal
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET || 'refresh-secret');
      let user = null;
      try { user = await prisma.user.findUnique({ where: { id: decoded.id } }); } catch {}
      if (!user) user = SEED_USERS.find((u) => ('seed-' + u.email) === decoded.id) ? { id: decoded.id, ...SEED_USERS.find((u) => ('seed-' + u.email) === decoded.id) } : null;
      if (user) {
        const { accessToken } = generateTokens(toToken(user));
        return res.json({ accessToken });
      }
    } catch { /* cae a remember */ }
  }
  // 2) remember_token cookie (30 días)
  const rt = req.cookies?.remember_token;
  if (rt) {
    try {
      const user = await prisma.user.findFirst({ where: { remember_token: rt } });
      if (user) {
        const tk = toToken(user);
        const { accessToken, refreshToken } = generateTokens(tk);
        res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 7 * 24 * 3600 * 1000 });
        return res.json({ accessToken, user: tk });
      }
    } catch {}
  }
  return res.status(401).json({ error: 'No valid session' });
});

router.post('/logout', async (req, res) => {
  const rt = req.cookies?.remember_token;
  if (rt) { await prisma.user.updateMany({ where: { remember_token: rt }, data: { remember_token: null } }).catch(() => {}); }
  res.clearCookie('refreshToken');
  res.clearCookie('remember_token');
  res.json({ message: 'Logged out' });
});

router.get('/me', verifyToken, (req, res) => res.json({ user: req.user }));

// ── Users management (admin) ──
const safeUser = (u) => ({ id: u.id, email: u.email, name: u.name, group: u.group, status: u.status, twofa_enabled: u.twofa_enabled, ip_access: u.ip_access, installer_limit: u.installer_limit, created_at: u.created_at });

router.get('/users', verifyToken, checkRole('admin'), async (req, res, next) => {
  try { res.json({ data: (await prisma.user.findMany({ orderBy: { created_at: 'asc' } })).map(safeUser) }); }
  catch (e) { next(e); }
});

router.post('/register', verifyToken, checkRole('admin'), async (req, res, next) => {
  try {
    const { email, password, name, group } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });
    const password_hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({ data: { email, password_hash, name, group: group || 'noc' } });
    res.status(201).json({ data: safeUser(user) });
  } catch (e) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'Email already exists' });
    next(e);
  }
});

router.patch('/users/:id', verifyToken, checkRole('admin'), async (req, res, next) => {
  try {
    const { name, group, status, twofa_enabled, ip_access, installer_limit, password } = req.body;
    const data = {};
    for (const [k, v] of Object.entries({ name, group, status, twofa_enabled, ip_access, installer_limit })) if (v !== undefined) data[k] = v;
    if (password) data.password_hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.update({ where: { id: req.params.id }, data });
    res.json({ data: safeUser(user) });
  } catch (e) { next(e); }
});

router.delete('/users/:id', verifyToken, checkRole('admin'), async (req, res, next) => {
  try { await prisma.user.delete({ where: { id: req.params.id } }); res.json({ message: 'deleted' }); }
  catch (e) { next(e); }
});

module.exports = router;
