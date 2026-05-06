import express from 'express';
import { signup, signin, signout, forgotPassword, resetPassword } from '../controllers/authController.js';
import { authRateLimiter } from '../middleware/production.js';

const router = express.Router();

// POST /api/v1/auth/signup
router.post('/signup', authRateLimiter, signup);

// POST /api/v1/auth/signin
router.post('/signin', authRateLimiter, signin);

// POST /api/v1/auth/signout
router.post('/signout', authRateLimiter, signout);

// POST /api/v1/auth/password/forgot
router.post('/password/forgot', authRateLimiter, forgotPassword);

// POST /api/v1/auth/password/reset
router.post('/password/reset', authRateLimiter, resetPassword);

export default router;
