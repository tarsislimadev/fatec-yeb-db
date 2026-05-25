import express from 'express';
import { authMiddleware } from '../middleware/index.js';
import { writeRateLimiter } from '../middleware/production.js';
import {
  createPrimaryResearchAttempt,
  createPrimaryResearchTask,
  getPrimaryResearchTask,
  listPrimaryResearchTasks,
  scanPrimaryResearchTasks,
  updatePrimaryResearchTask,
} from '../controllers/primaryResearchController.js';

const router = express.Router();

router.use(authMiddleware);

// GET /api/v1/primary-research/tasks
router.get('/tasks', listPrimaryResearchTasks);

// POST /api/v1/primary-research/tasks
router.post('/tasks', writeRateLimiter, createPrimaryResearchTask);

// POST /api/v1/primary-research/tasks/scan
router.post('/tasks/scan', writeRateLimiter, scanPrimaryResearchTasks);

// GET /api/v1/primary-research/tasks/:id
router.get('/tasks/:id', getPrimaryResearchTask);

// PATCH /api/v1/primary-research/tasks/:id
router.patch('/tasks/:id', writeRateLimiter, updatePrimaryResearchTask);

// POST /api/v1/primary-research/tasks/:id/attempts
router.post('/tasks/:id/attempts', writeRateLimiter, createPrimaryResearchAttempt);

export default router;
