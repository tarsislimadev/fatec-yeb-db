import express from 'express';
import {
  listCalls,
  createCall,
  getCallDetail,
  retryCall,
  bulkRetryCalls,
  getDashboard,
} from '../controllers/callController.js';
import { authMiddleware } from '../middleware/index.js';
import { writeRateLimiter } from '../middleware/production.js';

const router = express.Router();

// Apply auth middleware to all call routes
router.use(authMiddleware);

// GET /api/v1/calls - List calls
router.get('/', listCalls);

// POST /api/v1/calls - Enqueue an outbound call
router.post('/', writeRateLimiter, createCall);

// POST /api/v1/calls/bulk-retry - Retry multiple failed calls
router.post('/bulk-retry', writeRateLimiter, bulkRetryCalls);

// GET /api/v1/calls/dashboard/metrics - Get call center dashboard
router.get('/dashboard/metrics', getDashboard);

// GET /api/v1/calls/:id - Get call detail
router.get('/:id', getCallDetail);

// POST /api/v1/calls/:id/retry - Retry a failed call
router.post('/:id/retry', writeRateLimiter, retryCall);

export default router;
