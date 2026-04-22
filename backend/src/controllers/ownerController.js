import { db } from '../db/index.js';
import { successResponse, sendError } from '../utils/response.js';
import { v4 as uuidv4 } from 'uuid';

// ============ ADD PHONE OWNER ============
export async function addPhoneOwner(req, res) {
  try {
    const { id: phoneId } = req.params;
    const { owner_type, owner_id, relation_label, confidence_score, start_date } = req.body;

    // Validate input
    if (!owner_type || !owner_id) {
      return sendError(res, 'VALIDATION_ERROR', 'owner_type and owner_id are required');
    }

    const validTypes = ['person', 'business', 'department'];
    if (!validTypes.includes(owner_type)) {
      return sendError(res, 'VALIDATION_ERROR', `Invalid owner_type. Must be one of: ${validTypes.join(', ')}`);
    }

    // Check if phone exists
    const phoneResult = await db.query('SELECT id FROM phones WHERE id = $1', [phoneId]);
    if (phoneResult.rows.length === 0) {
      return sendError(res, 'NOT_FOUND', 'Phone not found', {}, 404);
    }

    // Check for duplicate active relation
    const existingResult = await db.query(
      `SELECT id FROM phone_owners 
       WHERE phone_id = $1 AND owner_type = $2 AND owner_id = $3 AND end_date IS NULL`,
      [phoneId, owner_type, owner_id]
    );

    if (existingResult.rows.length > 0) {
      return sendError(res, 'CONFLICT', 'Relation already exists', {}, 409);
    }

    // Check if owner exists
    if (owner_type === 'person') {
      const ownerResult = await db.query('SELECT id FROM people WHERE id = $1', [owner_id]);
      if (ownerResult.rows.length === 0) {
        return sendError(res, 'NOT_FOUND', 'Person not found', {}, 404);
      }
    } else if (owner_type === 'business') {
      const ownerResult = await db.query('SELECT id FROM businesses WHERE id = $1', [owner_id]);
      if (ownerResult.rows.length === 0) {
        return sendError(res, 'NOT_FOUND', 'Business not found', {}, 404);
      }
    } else if (owner_type === 'department') {
      const ownerResult = await db.query('SELECT id FROM departments WHERE id = $1', [owner_id]);
      if (ownerResult.rows.length === 0) {
        return sendError(res, 'NOT_FOUND', 'Department not found', {}, 404);
      }
    }

    // Create relation
    const ownerRelationId = uuidv4();
    const result = await db.query(
      `INSERT INTO phone_owners (
        id, phone_id, owner_type, owner_id, relation_label, confidence_score, start_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        ownerRelationId,
        phoneId,
        owner_type,
        owner_id,
        relation_label || null,
        confidence_score || 100,
        start_date || null,
      ]
    );

    return successResponse(res, result.rows[0], null, 201);
  } catch (err) {
    console.error('Add owner error:', err);
    return sendError(res, 'INTERNAL_ERROR', 'Failed to add owner', {}, 500);
  }
}

// ============ REMOVE PHONE OWNER ============
export async function removePhoneOwner(req, res) {
  try {
    const { id: phoneId, ownerRelationId } = req.params;

    // Check if relation exists
    const relationResult = await db.query(
      'SELECT id FROM phone_owners WHERE id = $1 AND phone_id = $2',
      [ownerRelationId, phoneId]
    );

    if (relationResult.rows.length === 0) {
      return sendError(res, 'NOT_FOUND', 'Relation not found', {}, 404);
    }

    // Delete relation
    await db.query('DELETE FROM phone_owners WHERE id = $1', [ownerRelationId]);

    return res.status(204).send();
  } catch (err) {
    console.error('Remove owner error:', err);
    return sendError(res, 'INTERNAL_ERROR', 'Failed to remove owner', {}, 500);
  }
}

// ============ UPDATE PHONE OWNER ============
export async function updatePhoneOwner(req, res) {
  try {
    const { id: phoneId, ownerRelationId } = req.params;
    const { relation_label, confidence_score, end_date } = req.body;

    // Check if relation exists
    const relationResult = await db.query(
      'SELECT id FROM phone_owners WHERE id = $1 AND phone_id = $2',
      [ownerRelationId, phoneId]
    );

    if (relationResult.rows.length === 0) {
      return sendError(res, 'NOT_FOUND', 'Relation not found', {}, 404);
    }

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (relation_label !== undefined) {
      updates.push(`relation_label = $${paramCount}`);
      values.push(relation_label);
      paramCount++;
    }

    if (confidence_score !== undefined) {
      updates.push(`confidence_score = $${paramCount}`);
      values.push(confidence_score);
      paramCount++;
    }

    if (end_date !== undefined) {
      updates.push(`end_date = $${paramCount}`);
      values.push(end_date);
      paramCount++;
    }

    if (updates.length === 0) {
      return sendError(res, 'VALIDATION_ERROR', 'No fields to update');
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(ownerRelationId);

    const query = `UPDATE phone_owners SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    const result = await db.query(query, values);

    return successResponse(res, result.rows[0]);
  } catch (err) {
    console.error('Update owner error:', err);
    return sendError(res, 'INTERNAL_ERROR', 'Failed to update owner', {}, 500);
  }
}
