require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const { httpLogger } = require('./middleware/logger');
const { general } = require('./middleware/rateLimiter');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const { verifyToken } = require('./middleware/auth');

const app = express();

// Detrás de proxy (vite dev / nginx): usar X-Forwarded-For para la IP real del cliente.
app.set('trust proxy', 1);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.CORS_ORIGIN || ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.set('json replacer', (key, value) => typeof value === 'bigint' ? Number(value) : value);
app.use(cookieParser());
app.use(httpLogger);
app.use('/api', general);

app.get('/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime(), ts: new Date() }));

// Routes
app.use('/api/v1/auth', require('./routes/auth'));
app.use('/api/v1/olts', require('./routes/olts'));
app.use('/api/v1/onts', require('./routes/onts'));
app.use('/api/v1/alerts', require('./routes/alerts'));
app.use('/api/v1/clients', require('./routes/clients'));
app.use('/api/v1/dashboard', require('./routes/dashboard'));
app.use('/api/v1/reports', require('./routes/reports'));
app.use('/api/v1/ztp', require('./routes/ztp'));
app.use('/api/v1/tr069', require('./routes/tr069'));
app.use('/api/v1/notifications', require('./routes/notifications'));
app.use('/api/v1/map', require('./routes/map'));
app.use('/api/v1/dhcp', require('./routes/dhcp'));
app.use('/api/v1/gps', require('./routes/gps'));
app.use('/api/v1/vlan', require('./routes/vlan'));
app.use('/api/v1/speed-profiles', require('./routes/speedProfiles'));
app.use('/api/v1/graphs', verifyToken, require('./routes/graphs'));
app.use('/api/v1/diagnostics', verifyToken, require('./routes/diagnostics'));
const inventory = require('./routes/inventory');
app.use('/api/v1/zones', inventory.zones);
app.use('/api/v1/odbs', inventory.odbs);
app.use('/api/v1/onu-types', inventory.onuTypes);
app.use('/api/v1/auth-presets', inventory.authPresets);
app.use('/api/v1/auto-action-presets', require('./routes/autoActions'));
app.use('/api/v1/settings', require('./routes/settings'));
app.use('/api/v1/api-keys', require('./routes/apiKeys'));
app.use('/api/v1/vsol', require('./routes/vsol.routes'));

app.use(notFound);
app.use(errorHandler);

module.exports = app;
