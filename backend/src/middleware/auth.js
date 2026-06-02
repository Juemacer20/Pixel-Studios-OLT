const jwt = require('jsonwebtoken');
const prisma = require('../config/database');

const ROLES = { admin: 3, noc: 2, readonly: 1 };

function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) return res.status(401).json({ error: 'No token provided' });

  jwt.verify(token, process.env.JWT_SECRET || 'default-secret', (err, decoded) => {
    if (err) {
      if (err.name === 'TokenExpiredError') return res.status(401).json({ error: 'Token expired' });
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = decoded;
    next();
  });
}

function checkRole(minRole) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const userLevel = ROLES[req.user.role] || 0;
    const requiredLevel = ROLES[minRole] || 0;
    if (userLevel < requiredLevel) {
      return res.status(403).json({ error: `Role '${minRole}' required` });
    }
    next();
  };
}

function generateTokens(user) {
  const payload = { id: user.id, email: user.email, role: user.role, name: user.name };
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET || 'default-secret', {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  });
  const refreshToken = jwt.sign({ id: user.id }, process.env.JWT_REFRESH_SECRET || 'refresh-secret', {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  });
  return { accessToken, refreshToken };
}

module.exports = { verifyToken, checkRole, generateTokens, ROLES };
