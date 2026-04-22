import express from 'express';
import { listPhones, createPhone, getPhone, updatePhone, deletePhone } from '../controllers/phoneController.js';
import { addPhoneOwner, removePhoneOwner, updatePhoneOwner } from '../controllers/ownerController.js';
import { authMiddleware } from '../middleware/index.js';

const router = express.Router();

// Apply auth middleware to all phone routes
router.use(authMiddleware);

// GET /api/v1/phones - List phones
router.get('/', listPhones);

// POST /api/v1/phones - Create phone
router.post('/', createPhone);

// GET /api/v1/phones/:id - Get phone detail
router.get('/:id', getPhone);

// PATCH /api/v1/phones/:id - Update phone
router.patch('/:id', updatePhone);

// DELETE /api/v1/phones/:id - Delete phone (soft delete)
router.delete('/:id', deletePhone);

// POST /api/v1/phones/:id/owners - Add owner relation
router.post('/:id/owners', addPhoneOwner);

// DELETE /api/v1/phones/:id/owners/:ownerRelationId - Remove owner relation
router.delete('/:id/owners/:ownerRelationId', removePhoneOwner);

// PATCH /api/v1/phones/:id/owners/:ownerRelationId - Update owner relation
router.patch('/:id/owners/:ownerRelationId', updatePhoneOwner);

export default router;
