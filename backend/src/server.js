import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { db, initRedis, redis, testConnection } from './db/index.js';
import { migrate } from './db/migrate.js';
import { errorHandlingMiddleware, notFoundHandler } from './middleware/index.js';
import {
  createHealthHandler,
  createReadinessHandler,
  metricsHandler,
  requestContextMiddleware,
  securityHeadersMiddleware,
} from './middleware/production.js';
import authRoutes from './routes/auth.js';
import phoneRoutes from './routes/phones.js';
import peopleRoutes from './routes/people.js';
import outreachRoutes from './routes/outreach.js';
import campaignRoutes from './routes/campaigns.js';
import callRoutes from './routes/calls.js';
import transcriptRoutes from './routes/transcripts.js';
import webhookRoutes, { setWebhookServices } from './routes/webhooks.js';
import { emitStructuredLog } from './utils/observability.js';
import { CallJobProcessor } from './services/CallJobProcessor.js';
import { WebhookHandler } from './services/WebhookHandler.js';
import { TwilioAdapter } from './services/TwilioAdapter.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
let serverInstance = null;

app.set('trust proxy', 1);
app.disable('x-powered-by');

// ============ MIDDLEWARE ============

// Security headers
app.use(securityHeadersMiddleware);

// Request context and structured logging
app.use(requestContextMiddleware);

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// JSON parser
app.use(express.json());

// URL encoded parser (required for provider webhooks such as Twilio)
app.use(express.urlencoded({ extended: false }));

// ============ ROUTES ============

// Health check
app.get('/health', createHealthHandler());

// Readiness check
app.get('/ready', createReadinessHandler({ db, redis }));

// Metrics snapshot
app.get('/metrics', metricsHandler);

// API v1 routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/phones', phoneRoutes);
app.use('/api/v1/people', peopleRoutes);
app.use('/api/v1', outreachRoutes);
app.use('/api/v1/campaigns', campaignRoutes);
app.use('/api/v1/calls', callRoutes);
app.use('/api/v1/transcripts', transcriptRoutes);
app.use('/api/v1/webhooks', webhookRoutes);

// ============ ERROR HANDLING ============

// 404 handler
app.use(notFoundHandler);

// Error handling middleware
app.use(errorHandlingMiddleware);

// ============ SERVER STARTUP ============

function shutdown(reason) {
  emitStructuredLog('info', 'shutdown_requested', { reason });

  const tasks = [];

  if (serverInstance) {
    tasks.push(new Promise((resolve) => {
      serverInstance.close(() => resolve());
    }));
  }

  tasks.push(db.end().catch((error) => {
    emitStructuredLog('error', 'database_shutdown_failed', { reason, message: error.message });
  }));

  tasks.push(Promise.resolve().then(async () => {
    if (redis.isOpen) {
      await redis.quit();
    }
  }).catch((error) => {
    emitStructuredLog('error', 'redis_shutdown_failed', { reason, message: error.message });
  }));

  return Promise.allSettled(tasks);
}

async function startServer() {
  try {
    // Test database connection
    await testConnection();
    console.log('✓ Database connected');

    // Ensure schema exists before serving requests
    await migrate();
    console.log('✓ Database migrated');

    // Initialize Redis
    await initRedis();
    console.log('✓ Redis connected');

    // Initialize Phase 5 services (voice calling)
    try {
      const twilioConfig = {
        accountSid: process.env.TWILIO_ACCOUNT_SID,
        authToken: process.env.TWILIO_AUTH_TOKEN,
        fromNumber: process.env.TWILIO_FROM_NUMBER,
      };

      if (twilioConfig.accountSid && twilioConfig.authToken && twilioConfig.fromNumber) {
        const twilioAdapter = new TwilioAdapter(twilioConfig);
        const webhookHandler = new WebhookHandler();
        const callJobProcessor = new CallJobProcessor();

        // Register webhook services
        setWebhookServices(webhookHandler, twilioAdapter);

        // Initialize job processor (async, but don't block startup)
        callJobProcessor.initialize(twilioAdapter).catch((err) => {
          console.error('✗ Failed to initialize call job processor:', err);
        });

        console.log('✓ Phase 5 voice services initialized');
      } else {
        console.log('⚠ Phase 5 voice services disabled (Twilio env vars not configured)');
      }
    } catch (err) {
      console.warn('⚠ Phase 5 services initialization failed:', err.message);
    }

    // Start server
    serverInstance = app.listen(PORT, () => {
      console.log(`✓ Server running on http://localhost:${PORT}`);
      console.log(`✓ API base: http://localhost:${PORT}/api/v1`);
      console.log(`✓ Frontend: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
    });

    process.once('SIGINT', async () => {
      await shutdown('SIGINT');
      process.exit(0);
    });

    process.once('SIGTERM', async () => {
      await shutdown('SIGTERM');
      process.exit(0);
    });

    return serverInstance;
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === currentFile) {
  startServer();
}

export default app;
export { startServer, shutdown };
