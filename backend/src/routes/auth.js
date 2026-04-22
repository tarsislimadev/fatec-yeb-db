import express from 'express';
import { signup, signin, signout, forgotPassword, resetPassword } from '../controllers/authController.js';

const router = express.Router();

// POST /api/v1/auth/signup
router.post('/signup', signup);

// POST /api/v1/auth/signin
router.post('/signin', signin);

// POST /api/v1/auth/signout
router.post('/signout', signout);

// POST /api/v1/auth/password/forgot
router.post('/password/forgot', forgotPassword);

// POST /api/v1/auth/password/reset
router.post('/password/reset', resetPassword);

// TODO: OAuth endpoints
// GET /api/v1/auth/oauth/google/start
// GET /api/v1/auth/oauth/google/callback
// GET /api/v1/auth/oauth/microsoft/start
// GET /api/v1/auth/oauth/microsoft/callback

export default router;
