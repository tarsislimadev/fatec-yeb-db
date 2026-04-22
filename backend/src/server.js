import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { db, initRedis, testConnection } from './db/index.js';
import { migrate } from './db/migrate.js';
import { errorHandlingMiddleware, notFoundHandler } from './middleware/index.js';
import authRoutes from './routes/auth.js';
import phoneRoutes from './routes/phones.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ============ MIDDLEWARE ============

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// JSON parser
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// ============ ROUTES ============

// Health check
app.get('/health', (req, res) => {
  return res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API v1 routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/phones', phoneRoutes);

// ============ ERROR HANDLING ============

// 404 handler
app.use(notFoundHandler);

// Error handling middleware
app.use(errorHandlingMiddleware);

// ============ SERVER STARTUP ============

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

    // Start server
    app.listen(PORT, () => {
      console.log(`✓ Server running on http://localhost:${PORT}`);
      console.log(`✓ API base: http://localhost:${PORT}/api/v1`);
      console.log(`✓ Frontend: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();

export default app;
