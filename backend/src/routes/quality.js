import express from 'express';
import { authMiddleware } from '../middleware/index.js';
import { getQualityAlerts, getQualityMetrics } from '../controllers/qualityController.js';

const router = express.Router();

router.use(authMiddleware);

// GET /api/v1/quality/metrics
router.get('/metrics', getQualityMetrics);

// GET /api/v1/quality/alerts
router.get('/alerts', getQualityAlerts);

export default router;
