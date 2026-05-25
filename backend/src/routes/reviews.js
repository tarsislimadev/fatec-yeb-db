import express from 'express';
import { authMiddleware } from '../middleware/index.js';
import { writeRateLimiter } from '../middleware/production.js';
import { createReview, getReview, listReviews, updateReview } from '../controllers/reviewController.js';

const router = express.Router();

router.use(authMiddleware);

// GET /api/v1/reviews - List review queue
router.get('/', listReviews);

// POST /api/v1/reviews - Create review item
router.post('/', writeRateLimiter, createReview);

// GET /api/v1/reviews/:id - Get review item detail
router.get('/:id', getReview);

// PATCH /api/v1/reviews/:id - Update review item
router.patch('/:id', writeRateLimiter, updateReview);

export default router;
