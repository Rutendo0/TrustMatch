import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { createServer } from 'http';

import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import photoRoutes from './routes/photos';
import matchRoutes from './routes/matches';
import messageRoutes from './routes/messages';
import verificationRoutes from './routes/verification';
import voiceNotesRoutes from './routes/voiceNotes';
import eventsRoutes from './routes/events';
import dateJournalRoutes from './routes/dateJournals';
import reviewRoutes from './routes/reviews';
import reportRoutes from './routes/reports';
import relationshipRoutes from './routes/relationshipMode';
import adminRoutes from './routes/admin';
import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';
import { adminMiddleware } from './middleware/adminAuth';
import { globalLimiter, authLimiter, uploadLimiter } from './middleware/rateLimiter';
import { prisma } from './lib/prisma';
import logger, { logStream } from './lib/logger';
import { initializeSocket } from './services/socketService';

dotenv.config();

// ── Validate required environment variables ─────────────────────────────────
const requiredEnvVars = ['JWT_SECRET', 'DATABASE_URL'];
const missingEnvVars = requiredEnvVars.filter((v) => !process.env[v]);
if (missingEnvVars.length > 0) {
  logger.error(`❌ Missing required environment variables: ${missingEnvVars.join(', ')}`);
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Create HTTP server for WebSocket support
const httpServer = createServer(app);

// ── Ensure upload directories exist ─────────────────────────────────────────
const uploadDirs = [
  'uploads/photos',
  'uploads/documents',
  'uploads/selfies',
  'uploads/voice-notes',
  'logs',
];
uploadDirs.forEach((dir) => {
  const fullPath = path.join(process.cwd(), dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

// ── Security headers ─────────────────────────────────────────────────────────
app.use(helmet());

// ── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : ['*'];

app.use(
  cors({
    origin: allowedOrigins.includes('*') ? '*' : allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ── Compression ───────────────────────────────────────────────────────────────
app.use(compression());

// ── Request logging with Winston ─────────────────────────────────────────────
app.use(morgan('combined', { stream: logStream }));

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Global rate limiter ───────────────────────────────────────────────────────
app.use(globalLimiter);

// ── Static uploads ────────────────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// ── Health check with database ping ─────────────────────────────────────────
app.get('/health', async (_req, res) => {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(), 
      env: NODE_ENV,
      database: 'connected'
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({ 
      status: 'error', 
      timestamp: new Date().toISOString(), 
      env: NODE_ENV,
      database: 'disconnected'
    });
  }
});

// ── API version check ───────────────────────────────────────────────────────
app.get('/api/version', (_req, res) => {
  res.json({ 
    version: '1.0.0', 
    environment: NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// ── Public routes ─────────────────────────────────────────────────────────────
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/verification', verificationRoutes);

// ── Authenticated routes ──────────────────────────────────────────────────────
app.use('/api/users/photos', authMiddleware, uploadLimiter, photoRoutes);
app.use('/api/users', authMiddleware, userRoutes);
app.use('/api/matches', authMiddleware, matchRoutes);
app.use('/api/messages', authMiddleware, messageRoutes);
app.use('/api/voice-notes', authMiddleware, voiceNotesRoutes);
app.use('/api/events', authMiddleware, eventsRoutes);
app.use('/api/date-journals', authMiddleware, dateJournalRoutes);
app.use('/api/reviews', authMiddleware, reviewRoutes);
app.use('/api/reports', authMiddleware, reportRoutes);
app.use('/api/relationship', authMiddleware, relationshipRoutes);

// ── Admin routes ─────────────────────────────────────────────────────────────
app.use('/api/admin', authMiddleware, adminMiddleware, adminRoutes);

// ── Global error handler ──────────────────────────────────────────────────────
app.use(errorHandler);

// ── Initialize WebSocket ─────────────────────────────────────────────────────
initializeSocket(httpServer);
logger.info('WebSocket server initialized');

// ── Start server ─────────────────────────────────────────────────────────────
httpServer.listen(PORT, () => {
  logger.info(`🚀 TrustMatch server running on port ${PORT} [${NODE_ENV}]`);
  logger.info(`📝 Logs directory: ${path.join(process.cwd(), 'logs')}`);
});

// ── Periodic cleanup of expired refresh tokens (every hour) ──────────────────
setInterval(async () => {
  try {
    const { count } = await prisma.refreshToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    if (count > 0) {
      logger.info(`🧹 Cleaned up ${count} expired refresh token(s)`);
    }
  } catch (err) {
    logger.error('Token cleanup error:', err);
  }
}, 60 * 60 * 1000);

// ── Periodic cleanup of old device fingerprints (daily) ─────────────────────
setInterval(async () => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { count } = await prisma.deviceFingerprint.deleteMany({
      where: {
        lastUsedAt: { lt: thirtyDaysAgo },
      },
    });
    if (count > 0) {
      logger.info(`🧹 Cleaned up ${count} old device fingerprint(s)`);
    }
  } catch (err) {
    logger.error('Device fingerprint cleanup error:', err);
  }
}, 24 * 60 * 60 * 1000);

// ── Graceful shutdown ─────────────────────────────────────────────────────────
const shutdown = async (signal: string) => {
  logger.info(`\n${signal} received — shutting down gracefully...`);
  
  httpServer.close(async () => {
    await prisma.$disconnect();
    logger.info('✅ Server closed');
    process.exit(0);
  });
  
  setTimeout(() => {
    logger.error('Force-closing server after timeout');
    process.exit(1);
  }, 10_000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export default app;
