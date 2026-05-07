import express from 'express';
import {
  getFlaggedTranscripts,
  getTranscriptDetail,
  approveTranscript,
  rejectTranscript,
  confirmOptOut,
} from '../controllers/transcriptController.js';
import { authMiddleware } from '../middleware/index.js';
import { writeRateLimiter } from '../middleware/production.js';

const router = express.Router();

// Apply auth middleware to all transcript routes
router.use(authMiddleware);

// GET /api/v1/transcripts - Get flagged transcripts for review
router.get('/', getFlaggedTranscripts);

// GET /api/v1/transcripts/:id - Get transcript detail
router.get('/:id', getTranscriptDetail);

// POST /api/v1/transcripts/:id/approve - Approve transcript
router.post('/:id/approve', writeRateLimiter, approveTranscript);

// POST /api/v1/transcripts/:id/reject - Reject transcript
router.post('/:id/reject', writeRateLimiter, rejectTranscript);

// POST /api/v1/transcripts/:id/confirm-opt-out - Confirm opt-out and suppress phone
router.post('/:id/confirm-opt-out', writeRateLimiter, confirmOptOut);

export default router;
