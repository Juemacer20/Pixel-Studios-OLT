require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const logger = require('./middleware/logger');
const redis = require('./config/redis');

const PORT = process.env.PORT || 3001;
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST'],
  },
  transports: ['websocket', 'polling'],
});

// Socket.io auth middleware
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Authentication required'));
  const jwt = require('jsonwebtoken');
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret');
    socket.user = decoded;
    next();
  } catch (e) {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  logger.info(`Socket connected: ${socket.id} user=${socket.user?.id}`);

  socket.on('subscribe:olt', (oltId) => {
    socket.join(`olt:${oltId}`);
    logger.debug(`Socket ${socket.id} subscribed to olt:${oltId}`);
  });

  socket.on('subscribe:ont', (ontId) => {
    socket.join(`ont:${ontId}`);
  });

  socket.on('subscribe:all', () => {
    socket.join('all');
  });

  socket.on('disconnect', () => {
    logger.info(`Socket disconnected: ${socket.id}`);
  });
});

// Make io accessible from routes/services
app.set('io', io);
global.io = io;

// Start Bull jobs after server is up
async function startJobs() {
  try {
    const { startPollOLTs } = require('./jobs/pollOLTs');
    const { startSignalHistory } = require('./jobs/signalHistory');
    const { startAlertEngine } = require('./jobs/alertEngine');
    startPollOLTs(io);
    startSignalHistory(io);
    startAlertEngine(io);

    // Snapshot del estado de red (online/offline) cada 5 min para el gráfico Network status
    const prisma = require('./config/database');
    const snapshot = async () => {
      try {
        const [online, powerfail, los, na] = await Promise.all([
          prisma.oNT.count({ where: { status: 'ONLINE' } }),
          prisma.oNT.count({ where: { status: 'DYING_GASP' } }),
          prisma.oNT.count({ where: { status: 'LOS' } }),
          prisma.oNT.count({ where: { status: 'OFFLINE' } }),
        ]);
        await prisma.netStatusHistory.create({
          data: { timestamp: new Date(), online, powerfail, los, na, offline: powerfail + los + na },
        }).catch(() => {});
      } catch {}
    };
    snapshot();
    setInterval(snapshot, 5 * 60 * 1000);

    logger.info('Background jobs started');
  } catch (err) {
    logger.error('Failed to start jobs:', err);
  }
}

server.listen(PORT, async () => {
  logger.info(`Pixel Studios OLT backend running on port ${PORT}`);
  await startJobs();
});

process.on('unhandledRejection', (reason) => logger.error('Unhandled Rejection:', reason));
process.on('uncaughtException', (err) => { logger.error('Uncaught Exception:', err); process.exit(1); });

module.exports = { server, io };
