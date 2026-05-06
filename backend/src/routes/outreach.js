import express from 'express';
import { authMiddleware } from '../middleware/index.js';
import { writeRateLimiter } from '../middleware/production.js';
import { createContactAttempt, getOutreachReport, getPhoneTimeline, updatePhoneConsent } from '../controllers/outreachController.js';

const router = express.Router();

router.use(authMiddleware);

router.post('/phones/:id/contact-attempts', writeRateLimiter, createContactAttempt);
router.patch('/phones/:id/consent', writeRateLimiter, updatePhoneConsent);
router.get('/phones/:id/timeline', getPhoneTimeline);
router.get('/reports/outreach', getOutreachReport);

export default router;
