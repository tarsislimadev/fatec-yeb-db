import express from 'express';
import { authMiddleware } from '../middleware/index.js';
import { writeRateLimiter } from '../middleware/production.js';
import { importCnpjs } from '../controllers/cnpjController.js';

const router = express.Router();

router.use(authMiddleware);

// POST /api/v1/cnpj/import - Batch import CNPJs
router.post('/import', writeRateLimiter, importCnpjs);

export default router;
