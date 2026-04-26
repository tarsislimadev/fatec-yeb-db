import { db } from '../db/index.js';
import { validateAndNormalizePhone } from '../utils/phone.js';
import { successResponse, sendError, getPaginationMeta } from '../utils/response.js';
import { v4 as uuidv4 } from 'uuid';

// ============ LIST PHONES ============
export async function listPhones(req, res) {
  try {
    const { page = 1, page_size = 20, status, type, search, sort = 'created_at', order = 'desc' } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const pageSize = Math.min(100, Math.max(1, parseInt(page_size)));
    const offset = (pageNum - 1) * pageSize;

    let query = 'SELECT * FROM phones WHERE 1=1';
    const params = [];
    let paramCount = 1;

    // Filters
    if (status) {
      query += ` AND status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (type) {
      query += ` AND type = $${paramCount}`;
      params.push(type);
      paramCount++;
    }

    if (search) {
      query += ` AND (e164_number ILIKE $${paramCount} OR raw_number ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    // Validate sort field
    const validSortFields = ['created_at', 'last_seen_at', 'e164_number'];
    const sortField = validSortFields.includes(sort) ? sort : 'created_at';
    const sortOrder = order === 'asc' ? 'ASC' : 'DESC';

    // Get total count
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
    const countResult = await db.query(countQuery, params);
    const totalItems = parseInt(countResult.rows[0].total);

    // Get paginated results
    query += ` ORDER BY ${sortField} ${sortOrder} LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(pageSize, offset);

    const result = await db.query(query, params);

    return successResponse(
      res,
      result.rows,
      getPaginationMeta(pageNum, pageSize, totalItems)
    );
  } catch (err) {
    console.error('List phones error:', err);
    return sendError(res, 'INTERNAL_ERROR', 'Failed to list phones', {}, 500);
  }
}

// ============ CREATE PHONE ============
export async function createPhone(req, res) {
  try {
    const { e164_number, raw_number, type, country_code } = req.body;
    const idempotencyKey = req.headers['idempotency-key'];

    if (!e164_number) {
      return sendError(res, 'VALIDATION_ERROR', 'Phone number (e164_number) is required');
    }

    // Check for existing phone
    const existing = await db.query(
      'SELECT id FROM phones WHERE e164_number = $1',
      [e164_number]
    );

    if (existing.rows.length > 0) {
      return sendError(res, 'CONFLICT', 'Phone number already exists', { e164_number }, 409);
    }

    // Normalize phone
    const normalized = validateAndNormalizePhone(raw_number || e164_number, country_code || 'BR');
    if (!normalized.valid) {
      return sendError(res, 'VALIDATION_ERROR', normalized.error);
    }

    const phoneId = uuidv4();
    const result = await db.query(
      `INSERT INTO phones (
        id, e164_number, raw_number, country_code, national_number, type, status
      ) VALUES ($1, $2, $3, $4, $5, $6, 'active')
      RETURNING *`,
      [
        phoneId,
        normalized.e164_number,
        normalized.raw_number,
        normalized.country_code,
        normalized.national_number,
        type || normalized.type,
      ]
    );

    const phone = result.rows[0];

    // Create default channels
    const channels = ['call', 'sms', 'whatsapp', 'telegram'];
    for (const channel of channels) {
      await db.query(
        `INSERT INTO phone_channels (phone_id, channel_type, is_enabled) VALUES ($1, $2, $3)`,
        [phoneId, channel, true]
      );
    }

    // Create default consents
    const consents = ['marketing', 'transactional'];
    for (const consent of consents) {
      await db.query(
        `INSERT INTO phone_consents (phone_id, consent_type, status) VALUES ($1, $2, 'unknown')`,
        [phoneId, consent]
      );
    }

    return successResponse(res, phone, null, 201);
  } catch (err) {
    console.error('Create phone error:', err);
    if (err.code === '23505') {
      return sendError(res, 'CONFLICT', 'Phone already exists', {}, 409);
    }
    return sendError(res, 'INTERNAL_ERROR', 'Failed to create phone', {}, 500);
  }
}

// ============ GET PHONE DETAIL ============
export async function getPhone(req, res) {
  try {
    const { id } = req.params;

    const phoneResult = await db.query('SELECT * FROM phones WHERE id = $1', [id]);
    if (phoneResult.rows.length === 0) {
      return sendError(res, 'NOT_FOUND', 'Phone not found', {}, 404);
    }

    const phone = phoneResult.rows[0];

    // Get owners
    const ownersResult = await db.query(
      `SELECT id, phone_id, owner_type, owner_id, relation_label, confidence_score, start_date, end_date
       FROM phone_owners WHERE phone_id = $1`,
      [id]
    );

    // Get channels
    const channelsResult = await db.query(
      `SELECT id, phone_id, channel_type, is_enabled FROM phone_channels WHERE phone_id = $1`,
      [id]
    );

    // Get consents
    const consentsResult = await db.query(
      `SELECT id, phone_id, consent_type, status FROM phone_consents WHERE phone_id = $1`,
      [id]
    );

    return successResponse(res, {
      ...phone,
      owners: ownersResult.rows,
      channels: channelsResult.rows,
      consents: consentsResult.rows,
    });
  } catch (err) {
    console.error('Get phone error:', err);
    return sendError(res, 'INTERNAL_ERROR', 'Failed to get phone', {}, 500);
  }
}

// === GET PHONE CHANNEL DETAIL ===
export async function getPhoneChannel(req, res) {
  try {
    const { id } = req.params;

    const channelResult = await db.query(
      `SELECT id, phone_id, channel_type, is_enabled FROM phone_channels WHERE id = $1`,
      [id]
    );

    if (channelResult.rows.length === 0) {
      return sendError(res, 'NOT_FOUND', 'Phone channel not found', {}, 404);
    }

    return successResponse(res, channelResult.rows[0]);
  } catch (err) {
    console.error('Get phone channel error:', err);
    return sendError(res, 'INTERNAL_ERROR', 'Failed to get phone channel', {}, 500);
  }
}

export async function updatePhoneChannel(req, res) {
  try {
    const { id } = req.params;
    const { is_enabled } = req.body;

    if (is_enabled === undefined) {
      return sendError(res, 'VALIDATION_ERROR', 'is_enabled field is required');
    }

    const channelResult = await db.query(
      `UPDATE phone_channels SET is_enabled = $1 WHERE id = $2 RETURNING *`,
      [is_enabled, id]
    );

    if (channelResult.rows.length === 0) {
      return sendError(res, 'NOT_FOUND', 'Phone channel not found', {}, 404);
    }

    return successResponse(res, channelResult.rows[0]);
  } catch (err) {
    console.error('Update phone channel error:', err);
    return sendError(res, 'INTERNAL_ERROR', 'Failed to update phone channel', {}, 500);
  }
}

// === UPDATE PHONE CONSENT ===
export async function updatePhoneConsent(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['granted', 'denied', 'unknown'].includes(status)) {
      return sendError(res, 'VALIDATION_ERROR', 'Invalid consent status');
    }

    const consentResult = await db.query(
      `UPDATE phone_consents SET status = $1 WHERE id = $2 RETURNING *`,
      [status, id]
    );

    if (consentResult.rows.length === 0) {
      return sendError(res, 'NOT_FOUND', 'Phone consent not found', {}, 404);
    }

    return successResponse(res, consentResult.rows[0]);
  } catch (err) {
    console.error('Update phone consent error:', err);
    return sendError(res, 'INTERNAL_ERROR', 'Failed to update phone consent', {}, 500);
  }
}

// ============ UPDATE PHONE ============
export async function updatePhone(req, res) {
  try {
    const { id } = req.params;
    const { type, status, is_primary } = req.body;

    // Update channel if channel_id is provided
    if (req.body.channel_id) {
      return updatePhoneChannel(req, res);
    }

    // Update consent if consent_id is provided
    if (req.body.consent_id) {
      return updatePhoneConsent(req, res);
    }

    // Check if phone exists
    const phoneResult = await db.query('SELECT id FROM phones WHERE id = $1', [id]);
    if (phoneResult.rows.length === 0) {
      return sendError(res, 'NOT_FOUND', 'Phone not found', {}, 404);
    }

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (type !== undefined) {
      updates.push(`type = $${paramCount}`);
      values.push(type);
      paramCount++;
    }

    if (status !== undefined) {
      updates.push(`status = $${paramCount}`);
      values.push(status);
      paramCount++;
    }

    if (is_primary !== undefined) {
      updates.push(`is_primary = $${paramCount}`);
      values.push(is_primary);
      paramCount++;
    }

    if (updates.length === 0) {
      return sendError(res, 'VALIDATION_ERROR', 'No fields to update');
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `UPDATE phones SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    const result = await db.query(query, values);

    return successResponse(res, result.rows[0]);
  } catch (err) {
    console.error('Update phone error:', err);
    return sendError(res, 'INTERNAL_ERROR', 'Failed to update phone', {}, 500);
  }
}

// ============ DELETE PHONE ============
export async function deletePhone(req, res) {
  try {
    const { id } = req.params;

    // Check if phone exists
    const phoneResult = await db.query('SELECT id FROM phones WHERE id = $1', [id]);
    if (phoneResult.rows.length === 0) {
      return sendError(res, 'NOT_FOUND', 'Phone not found', {}, 404);
    }

    // Check for active relations
    const relationsResult = await db.query(
      `SELECT COUNT(*) as count FROM phone_owners WHERE phone_id = $1 AND end_date IS NULL`,
      [id]
    );

    if (parseInt(relationsResult.rows[0].count) > 0) {
      return sendError(
        res,
        'BUSINESS_RULE_VIOLATION',
        'Cannot delete phone with active relations',
        { active_relations: parseInt(relationsResult.rows[0].count) },
        422
      );
    }

    // Mark as inactive instead of deleting
    await db.query(
      `UPDATE phones SET status = 'inactive', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [id]
    );

    return res.status(204).send();
  } catch (err) {
    console.error('Delete phone error:', err);
    return sendError(res, 'INTERNAL_ERROR', 'Failed to delete phone', {}, 500);
  }
}
