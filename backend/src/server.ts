import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import session from 'express-session';
import RedisStore from 'connect-redis';
import passport from 'passport';
import { logger } from './config/logger';
import { env, validateSSOConfig } from './config/environment';
import { connectDatabase, disconnectDatabase } from './config/database';
import { connectRedis, disconnectRedis, getRedisClient } from './config/redis';
import { AuthMiddleware } from './middleware/auth.middleware';
import { ErrorMiddleware } from './middleware/error.middleware';
import { SecurityMiddleware } from './middleware/security.middleware';
import { authRoutes } from './routes/auth.routes';
import { applicationsRoutes } from './routes/applications.routes.simple';

const app = express();
const authMiddleware = new AuthMiddleware();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
}));

// Additional security middleware
app.use(SecurityMiddleware.securityHeaders());
app.use(SecurityMiddleware.requestLogger());
app.use(SecurityMiddleware.sanitizeInput());
app.use(SecurityMiddleware.suspiciousActivityDetection());
app.use(SecurityMiddleware.trackFailedLogins());

// CORS configuration
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
  });
});

// Basic API route
app.get('/api/status', (req, res) => {
  res.json({
    message: 'Logogear Internal Portal API is running',
    version: '1.0.0',
    environment: env.NODE_ENV,
  });
});

// Error handling middleware
app.use(ErrorMiddleware.handle());

// 404 handler
app.use(ErrorMiddleware.notFound());

async function startServer(): Promise<void> {
  try {
    // Validate environment configuration
    validateSSOConfig();

    // Connect to databases
    await connectDatabase();
    
    // Try to connect to Redis, but don't fail if it's not available
    let redisStore;
    try {
      await connectRedis();
      const redisClient = getRedisClient();
      redisStore = new RedisStore({
        client: redisClient,
        prefix: 'logogear:sess:',
      });
      logger.info('Redis connected for session storage');
    } catch (error) {
      logger.warn('Redis not available, using memory store for sessions:', error);
      redisStore = undefined;
    }

    // Configure session store
    app.use(session({
      store: redisStore,
      secret: env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      name: 'logogear.sid',
      cookie: {
        secure: env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: 'lax',
      },
    }));

    // Initialize Passport
    app.use(authMiddleware.initialize());
    app.use(authMiddleware.session());

    // API Routes
    app.use('/auth', authRoutes);
    app.use('/api/applications', applicationsRoutes);

    // Start server
    const server = app.listen(env.PORT, () => {
      logger.info(`Server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
      logger.info(`Frontend URL: ${env.FRONTEND_URL}`);
      logger.info(`Health check: http://localhost:${env.PORT}/health`);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Starting graceful shutdown...`);
      
      server.close(async () => {
        logger.info('HTTP server closed');
        
        try {
          await disconnectDatabase();
          try {
            await disconnectRedis();
          } catch (error) {
            // Redis might not be connected
            logger.debug('Redis disconnect error (expected if Redis not available):', error);
          }
          logger.info('All connections closed. Exiting process.');
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown:', error);
          process.exit(1);
        }
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
if (require.main === module) {
  startServer();
}

export { app };