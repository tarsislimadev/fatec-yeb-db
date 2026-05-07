import { db } from '../db/index.js';
import { successResponse, sendError, getPaginationMeta } from '../utils/response.js';
import { v4 as uuidv4 } from 'uuid';

// ============ CREATE CAMPAIGN ============
export async function createCampaign(req, res) {
  try {
    const userId = req.user?.id;
    const { name, description, prospect_ids, config } = req.body;

    if (!userId) {
      return sendError(res, 'AUTH_ERROR', 'User not authenticated', {}, 401);
    }

    if (!name) {
      return sendError(res, 'VALIDATION_ERROR', 'Campaign name is required');
    }

    if (!Array.isArray(prospect_ids) || prospect_ids.length === 0) {
      return sendError(res, 'VALIDATION_ERROR', 'At least one prospect_id is required');
    }

    const campaignId = uuidv4();
    const result = await db.query(
      `INSERT INTO call_campaigns (id, user_id, name, description, status, prospect_ids, config, created_at, created_by)
       VALUES ($1, $2, $3, $4, 'draft', $5, $6, NOW(), $7)
       RETURNING *`,
      [
        campaignId,
        userId,
        name,
        description || null,
        prospect_ids,
        JSON.stringify(config || {}),
        userId,
      ]
    );

    const campaign = result.rows[0];
    console.log(`[CampaignController] Created campaign ${campaignId}`);

    return successResponse(res, campaign, {}, 201);
  } catch (err) {
    console.error('Create campaign error:', err);
    return sendError(res, 'INTERNAL_ERROR', 'Failed to create campaign', {}, 500);
  }
}

// ============ LIST CAMPAIGNS ============
export async function listCampaigns(req, res) {
  try {
    const userId = req.user?.id;
    const { page = 1, page_size = 20, status, sort = 'created_at', order = 'desc' } = req.query;

    if (!userId) {
      return sendError(res, 'AUTH_ERROR', 'User not authenticated', {}, 401);
    }

    const pageNum = Math.max(1, parseInt(page));
    const pageSize = Math.min(100, Math.max(1, parseInt(page_size)));
    const offset = (pageNum - 1) * pageSize;

    let query = 'SELECT *, ARRAY_LENGTH(prospect_ids, 1) as prospect_count FROM call_campaigns WHERE user_id = $1';
    const params = [userId];
    let paramCount = 2;

    // Filter by status
    if (status) {
      query += ` AND status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    // Validate sort field
    const validSortFields = ['created_at', 'started_at', 'name'];
    const sortField = validSortFields.includes(sort) ? sort : 'created_at';
    const sortOrder = order === 'asc' ? 'ASC' : 'DESC';

    // Get total count
    const countQuery = query.replace('SELECT *, ARRAY_LENGTH(prospect_ids, 1) as prospect_count', 'SELECT COUNT(*) as total');
    const countResult = await db.query(countQuery, params);
    const totalItems = parseInt(countResult.rows[0].total);

    // Get paginated results with call counts
    const resultsQuery = `
      SELECT c.*,
             ARRAY_LENGTH(c.prospect_ids, 1) as prospect_count,
             COUNT(calls.id) as calls_total,
             SUM(CASE WHEN calls.status = 'completed' THEN 1 ELSE 0 END) as calls_completed
      FROM call_campaigns c
      LEFT JOIN calls ON c.id = calls.campaign_id
      WHERE c.user_id = $1
      ${status ? `AND c.status = $${paramCount}` : ''}
      GROUP BY c.id
      ORDER BY ${sortField} ${sortOrder}
      LIMIT $${paramCount + (status ? 1 : 0)} OFFSET $${paramCount + (status ? 2 : 1)}
    `;

    const finalParams = [userId, ...(status ? [status] : []), pageSize, offset];
    const result = await db.query(resultsQuery, finalParams);

    return successResponse(
      res,
      result.rows,
      getPaginationMeta(pageNum, pageSize, totalItems)
    );
  } catch (err) {
    console.error('List campaigns error:', err);
    return sendError(res, 'INTERNAL_ERROR', 'Failed to list campaigns', {}, 500);
  }
}

// ============ GET CAMPAIGN ============
export async function getCampaign(req, res) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return sendError(res, 'AUTH_ERROR', 'User not authenticated', {}, 401);
    }

    const result = await db.query(
      `SELECT c.*,
              ARRAY_LENGTH(c.prospect_ids, 1) as prospect_count,
              COUNT(calls.id) as calls_total,
              SUM(CASE WHEN calls.status = 'completed' THEN 1 ELSE 0 END) as calls_completed,
              SUM(CASE WHEN calls.status = 'failed' THEN 1 ELSE 0 END) as calls_failed
       FROM call_campaigns c
       LEFT JOIN calls ON c.id = calls.campaign_id
       WHERE c.id = $1 AND c.user_id = $2
       GROUP BY c.id`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return sendError(res, 'NOT_FOUND', 'Campaign not found', {}, 404);
    }

    const campaign = result.rows[0];
    return successResponse(res, campaign);
  } catch (err) {
    console.error('Get campaign error:', err);
    return sendError(res, 'INTERNAL_ERROR', 'Failed to get campaign', {}, 500);
  }
}

// ============ UPDATE CAMPAIGN ============
export async function updateCampaign(req, res) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { name, description, config } = req.body;

    if (!userId) {
      return sendError(res, 'AUTH_ERROR', 'User not authenticated', {}, 401);
    }

    // Check ownership and status
    const existing = await db.query(
      'SELECT status FROM call_campaigns WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (existing.rows.length === 0) {
      return sendError(res, 'NOT_FOUND', 'Campaign not found', {}, 404);
    }

    if (existing.rows[0].status !== 'draft') {
      return sendError(res, 'CONFLICT', 'Can only update draft campaigns', {}, 409);
    }

    const result = await db.query(
      `UPDATE call_campaigns
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           config = COALESCE($3, config),
           updated_at = NOW(),
           updated_by = $4
       WHERE id = $5 AND user_id = $6
       RETURNING *`,
      [
        name || null,
        description || null,
        config ? JSON.stringify(config) : null,
        userId,
        id,
        userId,
      ]
    );

    if (result.rows.length === 0) {
      return sendError(res, 'NOT_FOUND', 'Campaign not found', {}, 404);
    }

    return successResponse(res, result.rows[0]);
  } catch (err) {
    console.error('Update campaign error:', err);
    return sendError(res, 'INTERNAL_ERROR', 'Failed to update campaign', {}, 500);
  }
}

// ============ START CAMPAIGN ============
export async function startCampaign(req, res) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return sendError(res, 'AUTH_ERROR', 'User not authenticated', {}, 401);
    }

    // Check campaign ownership and status
    const campaign = await db.query(
      'SELECT * FROM call_campaigns WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (campaign.rows.length === 0) {
      return sendError(res, 'NOT_FOUND', 'Campaign not found', {}, 404);
    }

    if (campaign.rows[0].status !== 'draft') {
      return sendError(res, 'CONFLICT', 'Can only start draft campaigns', {}, 409);
    }

    await db.query('BEGIN');

    // Update campaign status
    const result = await db.query(
      `UPDATE call_campaigns
       SET status = 'running', started_at = NOW(), updated_at = NOW(), updated_by = $1
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [userId, id, userId]
    );

    const startedCampaign = result.rows[0];

    // Materialize pending calls for each campaign prospect using active person-owned phones.
    await db.query(
      `INSERT INTO calls (campaign_id, prospect_id, phone_id, phone_number, status, scheduled_at, created_at, created_by, updated_at, updated_by)
       SELECT $1,
              po.owner_id AS prospect_id,
              p.id AS phone_id,
              p.e164_number AS phone_number,
              'pending' AS status,
              NOW() AS scheduled_at,
              NOW() AS created_at,
              $2 AS created_by,
              NOW() AS updated_at,
              $2 AS updated_by
       FROM phone_owners po
       JOIN phones p ON p.id = po.phone_id
       WHERE po.owner_type = 'person'
         AND po.end_date IS NULL
         AND p.deleted_at IS NULL
         AND po.owner_id = ANY($3::uuid[])
         AND NOT EXISTS (
           SELECT 1 FROM calls c
           WHERE c.campaign_id = $1
             AND c.phone_id = p.id
             AND c.deleted_at IS NULL
         )`,
      [id, userId, startedCampaign.prospect_ids || []]
    );

    await db.query('COMMIT');

    console.log(`[CampaignController] Started campaign ${id}`);

    return successResponse(res, startedCampaign);
  } catch (err) {
    await db.query('ROLLBACK').catch(() => {});
    console.error('Start campaign error:', err);
    return sendError(res, 'INTERNAL_ERROR', 'Failed to start campaign', {}, 500);
  }
}

// ============ PAUSE CAMPAIGN ============
export async function pauseCampaign(req, res) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return sendError(res, 'AUTH_ERROR', 'User not authenticated', {}, 401);
    }

    const result = await db.query(
      `UPDATE call_campaigns
       SET status = 'paused', updated_at = NOW(), updated_by = $1
       WHERE id = $2 AND user_id = $3 AND status = 'running'
       RETURNING *`,
      [userId, id, userId]
    );

    if (result.rows.length === 0) {
      return sendError(res, 'CONFLICT', 'Campaign not found or is not running', {}, 409);
    }

    console.log(`[CampaignController] Paused campaign ${id}`);
    return successResponse(res, result.rows[0]);
  } catch (err) {
    console.error('Pause campaign error:', err);
    return sendError(res, 'INTERNAL_ERROR', 'Failed to pause campaign', {}, 500);
  }
}

// ============ RESUME CAMPAIGN ============
export async function resumeCampaign(req, res) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return sendError(res, 'AUTH_ERROR', 'User not authenticated', {}, 401);
    }

    const result = await db.query(
      `UPDATE call_campaigns
       SET status = 'running', updated_at = NOW(), updated_by = $1
       WHERE id = $2 AND user_id = $3 AND status = 'paused'
       RETURNING *`,
      [userId, id, userId]
    );

    if (result.rows.length === 0) {
      return sendError(res, 'CONFLICT', 'Campaign not found or is not paused', {}, 409);
    }

    console.log(`[CampaignController] Resumed campaign ${id}`);
    return successResponse(res, result.rows[0]);
  } catch (err) {
    console.error('Resume campaign error:', err);
    return sendError(res, 'INTERNAL_ERROR', 'Failed to resume campaign', {}, 500);
  }
}

// ============ STOP CAMPAIGN ============
export async function stopCampaign(req, res) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return sendError(res, 'AUTH_ERROR', 'User not authenticated', {}, 401);
    }

    const result = await db.query(
      `UPDATE call_campaigns
       SET status = 'completed', ended_at = NOW(), updated_at = NOW(), updated_by = $1
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [userId, id, userId]
    );

    if (result.rows.length === 0) {
      return sendError(res, 'NOT_FOUND', 'Campaign not found', {}, 404);
    }

    console.log(`[CampaignController] Stopped campaign ${id}`);
    return successResponse(res, result.rows[0]);
  } catch (err) {
    console.error('Stop campaign error:', err);
    return sendError(res, 'INTERNAL_ERROR', 'Failed to stop campaign', {}, 500);
  }
}

// ============ DELETE CAMPAIGN ============
export async function deleteCampaign(req, res) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return sendError(res, 'AUTH_ERROR', 'User not authenticated', {}, 401);
    }

    const campaign = await db.query(
      'SELECT status FROM call_campaigns WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (campaign.rows.length === 0) {
      return sendError(res, 'NOT_FOUND', 'Campaign not found', {}, 404);
    }

    if (campaign.rows[0].status !== 'draft') {
      return sendError(res, 'CONFLICT', 'Can only delete draft campaigns', {}, 409);
    }

    await db.query(
      'DELETE FROM call_campaigns WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    console.log(`[CampaignController] Deleted campaign ${id}`);
    return successResponse(res, { success: true, message: 'Campaign deleted' });
  } catch (err) {
    console.error('Delete campaign error:', err);
    return sendError(res, 'INTERNAL_ERROR', 'Failed to delete campaign', {}, 500);
  }
}
