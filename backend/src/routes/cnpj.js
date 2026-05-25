import express from 'express';
import { authMiddleware } from '../middleware/index.js';
import { writeRateLimiter } from '../middleware/production.js';
import { getImportJob, getReprocessJob, importCnpjs, lookupCnpj, reprocessCnpjs } from '../controllers/cnpjController.js';

const router = express.Router();

router.use(authMiddleware);

// POST /api/v1/cnpj/import - Batch import CNPJs
router.post('/import', writeRateLimiter, importCnpjs);

// GET /api/v1/cnpj/import/:jobId - Import job status
router.get('/import/:jobId', getImportJob);

// POST /api/v1/cnpj/lookup - Single lookup with cache
router.post('/lookup', writeRateLimiter, lookupCnpj);

// POST /api/v1/cnpj/reprocess - Incremental reprocess job
router.post('/reprocess', writeRateLimiter, reprocessCnpjs);

// GET /api/v1/cnpj/reprocess/:jobId - Reprocess job status
router.get('/reprocess/:jobId', getReprocessJob);

export default router;
