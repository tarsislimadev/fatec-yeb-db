import express from 'express';
import { listPeople, createPerson, getPerson, updatePerson, deletePerson } from '../controllers/peopleController.js';
import { authMiddleware } from '../middleware/index.js';
import { writeRateLimiter } from '../middleware/production.js';

const router = express.Router();

// Apply auth middleware to all People routes
router.use(authMiddleware);

// GET /api/v1/people - List People
router.get('/', listPeople);

// POST /api/v1/people - Create People
router.post('/', writeRateLimiter, createPerson);

// GET /api/v1/people/:id - Get People detail
router.get('/:id', getPerson);

// PATCH /api/v1/people/:id - Update People
router.patch('/:id', writeRateLimiter, updatePerson);

// DELETE /api/v1/people/:id - Delete People (soft delete)
router.delete('/:id', writeRateLimiter, deletePerson);

export default router;
