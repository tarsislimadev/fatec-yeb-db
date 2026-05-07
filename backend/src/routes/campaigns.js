import express from 'express';
import {
  createCampaign,
  listCampaigns,
  getCampaign,
  updateCampaign,
  startCampaign,
  pauseCampaign,
  resumeCampaign,
  stopCampaign,
  deleteCampaign,
} from '../controllers/campaignController.js';
import { authMiddleware } from '../middleware/index.js';
import { writeRateLimiter } from '../middleware/production.js';

const router = express.Router();

// Apply auth middleware to all campaign routes
router.use(authMiddleware);

// GET /api/v1/campaigns - List campaigns
router.get('/', listCampaigns);

// POST /api/v1/campaigns - Create campaign
router.post('/', writeRateLimiter, createCampaign);

// GET /api/v1/campaigns/:id - Get campaign detail
router.get('/:id', getCampaign);

// PATCH /api/v1/campaigns/:id - Update campaign
router.patch('/:id', writeRateLimiter, updateCampaign);

// POST /api/v1/campaigns/:id/start - Start campaign
router.post('/:id/start', writeRateLimiter, startCampaign);

// POST /api/v1/campaigns/:id/pause - Pause campaign
router.post('/:id/pause', writeRateLimiter, pauseCampaign);

// POST /api/v1/campaigns/:id/resume - Resume campaign
router.post('/:id/resume', writeRateLimiter, resumeCampaign);

// POST /api/v1/campaigns/:id/stop - Stop campaign
router.post('/:id/stop', writeRateLimiter, stopCampaign);

// DELETE /api/v1/campaigns/:id - Delete campaign
router.delete('/:id', writeRateLimiter, deleteCampaign);

export default router;
