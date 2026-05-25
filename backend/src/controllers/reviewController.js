import { db } from '../db/index.js';
import { successResponse, sendError, getPaginationMeta } from '../utils/response.js';
import { normalizeCnpj } from '../utils/normalize.js';

const VALID_ENTITY_TYPES = ['business', 'person', 'phone', 'cnpj', 'other'];
const VALID_REASON_CODES = ['conflict', 'low_confidence', 'sensitive_data', 'fraud_suspected', 'manual'];
const VALID_PRIORITIES = ['P1', 'P2', 'P3'];
const VALID_STATUSES = ['pending', 'in_review', 'escalated', 'resolved', 'dismissed'];
const VALID_REQUIRED_ROLES = ['data_analyst', 'operations_supervisor', 'compliance'];
const VALID_RESOLUTION_STATUSES = ['kept', 'updated', 'discarded', 'escalated'];
const VALID_EVENT_TYPES = ['created', 'assigned', 'status_changed', 'note', 'resolution', 'updated'];

function computeDueAt(priority) {
  const now = Date.now();
  const hours = priority === 'P1' ? 48 : priority === 'P3' ? 24 * 10 : 24 * 5;
  return new Date(now + hours * 60 * 60 * 1000);
}

function resolveDefaultRole({ reasonCode, priority }) {
  if (reasonCode === 'sensitive_data') {
    return 'compliance';
  }
  if (priority === 'P1') {
    return 'operations_supervisor';
  }
  return 'data_analyst';
}

function normalizeSources(sources) {
  if (sources === undefined || sources === null) {
    return null;
  }
  const type = typeof sources;
  if (type === 'object') {
    return sources;
  }
  return '__invalid__';
}

async function insertReviewEvent(client, { reviewId, eventType, details, actorId }) {
  if (!VALID_EVENT_TYPES.includes(eventType)) {
    throw new Error(`Invalid review event type: ${eventType}`);
  }
  await client.query(
    `INSERT INTO review_events (review_id, event_type, actor_id, details)
     VALUES ($1, $2, $3, $4)`,
    [reviewId, eventType, actorId || null, details || {}]
  );
}

export async function createReview(req, res) {
  const {
    entity_type,
    entity_id,
    cnpj,
    reason_code,
    priority = 'P2',
    confidence_score,
    sources,
    required_role,
    note,
  } = req.body || {};

  if (!entity_type || !VALID_ENTITY_TYPES.includes(entity_type)) {
    return sendError(res, 'VALIDATION_ERROR', `entity_type must be one of: ${VALID_ENTITY_TYPES.join(', ')}`);
  }

  if (!reason_code || !VALID_REASON_CODES.includes(reason_code)) {
    return sendError(res, 'VALIDATION_ERROR', `reason_code must be one of: ${VALID_REASON_CODES.join(', ')}`);
  }

  if (!VALID_PRIORITIES.includes(priority)) {
    return sendError(res, 'VALIDATION_ERROR', `priority must be one of: ${VALID_PRIORITIES.join(', ')}`);
  }

  if (!entity_id && !cnpj) {
    return sendError(res, 'VALIDATION_ERROR', 'Either entity_id or cnpj is required');
  }

  const normalizedCnpj = cnpj ? normalizeCnpj(cnpj) : null;
  if (cnpj && !normalizedCnpj) {
    return sendError(res, 'VALIDATION_ERROR', 'Invalid CNPJ format. Expect 14 digits.');
  }

  if (confidence_score !== undefined && confidence_score !== null) {
    const numericScore = Number(confidence_score);
    if (Number.isNaN(numericScore) || numericScore < 0 || numericScore > 1) {
      return sendError(res, 'VALIDATION_ERROR', 'confidence_score must be between 0 and 1');
    }
  }

  const normalizedSources = normalizeSources(sources);
  if (normalizedSources === '__invalid__') {
    return sendError(res, 'VALIDATION_ERROR', 'sources must be an object or array');
  }

  if (required_role && !VALID_REQUIRED_ROLES.includes(required_role)) {
    return sendError(res, 'VALIDATION_ERROR', `required_role must be one of: ${VALID_REQUIRED_ROLES.join(', ')}`);
  }

  const dueAt = computeDueAt(priority);
  const resolvedRole = required_role || resolveDefaultRole({ reasonCode: reason_code, priority });

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const insertResult = await client.query(
      `INSERT INTO review_queue (
        entity_type,
        entity_id,
        cnpj,
        reason_code,
        priority,
        confidence_score,
        sources,
        required_role,
        due_at,
        created_by,
        updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)
      RETURNING *`,
      [
        entity_type,
        entity_id || null,
        normalizedCnpj,
        reason_code,
        priority,
        confidence_score !== undefined ? Number(confidence_score) : null,
        normalizedSources,
        resolvedRole,
        dueAt,
        req.user?.id || null,
      ]
    );

    const review = insertResult.rows[0];

    await insertReviewEvent(client, {
      reviewId: review.id,
      eventType: 'created',
      details: {
        reason_code,
        priority,
        required_role: resolvedRole,
        confidence_score: confidence_score !== undefined ? Number(confidence_score) : null,
        sources: normalizedSources,
        note: note || null,
      },
      actorId: req.user?.id,
    });

    if (note) {
      await insertReviewEvent(client, {
        reviewId: review.id,
        eventType: 'note',
        details: { note },
        actorId: req.user?.id,
      });
    }

    await client.query('COMMIT');

    return successResponse(res, review, null, 201);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Create review error:', err);
    return sendError(res, 'INTERNAL_ERROR', 'Failed to create review item', {}, 500);
  } finally {
    client.release();
  }
}

export async function listReviews(req, res) {
  try {
    const {
      page = 1,
      page_size = 20,
      status,
      priority,
      reason_code,
      required_role,
      assigned_to,
      entity_type,
      cnpj,
      overdue,
      sort = 'created_at',
      order = 'desc',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const pageSize = Math.min(100, Math.max(1, parseInt(page_size)));
    const offset = (pageNum - 1) * pageSize;

    let query = 'SELECT * FROM review_queue WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (status) {
      query += ` AND status = $${paramCount}`;
      params.push(status);
      paramCount += 1;
    }

    if (priority) {
      query += ` AND priority = $${paramCount}`;
      params.push(priority);
      paramCount += 1;
    }

    if (reason_code) {
      query += ` AND reason_code = $${paramCount}`;
      params.push(reason_code);
      paramCount += 1;
    }

    if (required_role) {
      query += ` AND required_role = $${paramCount}`;
      params.push(required_role);
      paramCount += 1;
    }

    if (assigned_to) {
      query += ` AND assigned_to = $${paramCount}`;
      params.push(assigned_to);
      paramCount += 1;
    }

    if (entity_type) {
      query += ` AND entity_type = $${paramCount}`;
      params.push(entity_type);
      paramCount += 1;
    }

    if (cnpj) {
      query += ` AND cnpj = $${paramCount}`;
      params.push(cnpj);
      paramCount += 1;
    }

    if (overdue === 'true') {
      query += ` AND due_at IS NOT NULL AND due_at < NOW() AND status NOT IN ('resolved', 'dismissed')`;
    }

    const validSortFields = ['created_at', 'updated_at', 'due_at', 'priority', 'status'];
    const sortField = validSortFields.includes(sort) ? sort : 'created_at';
    const sortOrder = order === 'asc' ? 'ASC' : 'DESC';

    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
    const countResult = await db.query(countQuery, params);
    const totalItems = parseInt(countResult.rows[0].total);

    query += ` ORDER BY ${sortField} ${sortOrder} LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(pageSize, offset);

    const result = await db.query(query, params);

    return successResponse(
      res,
      result.rows,
      getPaginationMeta(pageNum, pageSize, totalItems)
    );
  } catch (err) {
    console.error('List reviews error:', err);
    return sendError(res, 'INTERNAL_ERROR', 'Failed to list review queue', {}, 500);
  }
}

export async function getReview(req, res) {
  try {
    const { id } = req.params;

    const reviewResult = await db.query('SELECT * FROM review_queue WHERE id = $1', [id]);
    if (reviewResult.rows.length === 0) {
      return sendError(res, 'NOT_FOUND', 'Review item not found', {}, 404);
    }

    const eventsResult = await db.query(
      `SELECT id, review_id, event_type, event_at, actor_id, details
       FROM review_events
       WHERE review_id = $1
       ORDER BY event_at ASC`,
      [id]
    );

    return successResponse(res, {
      ...reviewResult.rows[0],
      events: eventsResult.rows,
    });
  } catch (err) {
    console.error('Get review error:', err);
    return sendError(res, 'INTERNAL_ERROR', 'Failed to load review item', {}, 500);
  }
}

export async function updateReview(req, res) {
  const { id } = req.params;
  const {
    status,
    assigned_to,
    priority,
    required_role,
    due_at,
    resolution_status,
    resolution_notes,
    resolution_evidence,
    confidence_score,
    sources,
    note,
  } = req.body || {};

  if (
    status === undefined
    && assigned_to === undefined
    && priority === undefined
    && required_role === undefined
    && due_at === undefined
    && resolution_status === undefined
    && resolution_notes === undefined
    && resolution_evidence === undefined
    && confidence_score === undefined
    && sources === undefined
    && !note
  ) {
    return sendError(res, 'VALIDATION_ERROR', 'No review updates provided');
  }

  if (status && !VALID_STATUSES.includes(status)) {
    return sendError(res, 'VALIDATION_ERROR', `status must be one of: ${VALID_STATUSES.join(', ')}`);
  }

  if (priority && !VALID_PRIORITIES.includes(priority)) {
    return sendError(res, 'VALIDATION_ERROR', `priority must be one of: ${VALID_PRIORITIES.join(', ')}`);
  }

  if (required_role && !VALID_REQUIRED_ROLES.includes(required_role)) {
    return sendError(res, 'VALIDATION_ERROR', `required_role must be one of: ${VALID_REQUIRED_ROLES.join(', ')}`);
  }

  if (resolution_status && !VALID_RESOLUTION_STATUSES.includes(resolution_status)) {
    return sendError(res, 'VALIDATION_ERROR', `resolution_status must be one of: ${VALID_RESOLUTION_STATUSES.join(', ')}`);
  }
  if (resolution_status && status && status !== 'resolved') {
    return sendError(res, 'VALIDATION_ERROR', 'resolution_status can only be set when status is resolved');
  }

  if (confidence_score !== undefined && confidence_score !== null) {
    const numericScore = Number(confidence_score);
    if (Number.isNaN(numericScore) || numericScore < 0 || numericScore > 1) {
      return sendError(res, 'VALIDATION_ERROR', 'confidence_score must be between 0 and 1');
    }
  }

  const normalizedSources = normalizeSources(sources);
  if (normalizedSources === '__invalid__') {
    return sendError(res, 'VALIDATION_ERROR', 'sources must be an object or array');
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const existingResult = await client.query('SELECT * FROM review_queue WHERE id = $1', [id]);
    if (existingResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return sendError(res, 'NOT_FOUND', 'Review item not found', {}, 404);
    }

    const existing = existingResult.rows[0];
    const updates = {};

    if (status) {
      updates.status = status;
    }

    if (assigned_to !== undefined) {
      updates.assigned_to = assigned_to || null;
    }

    if (priority) {
      updates.priority = priority;
    }

    if (required_role) {
      updates.required_role = required_role;
    }

    if (due_at) {
      updates.due_at = due_at;
    }

    if (resolution_status) {
      updates.resolution_status = resolution_status;
      if (!updates.status) {
        updates.status = 'resolved';
      }
    }

    if (resolution_notes !== undefined) {
      updates.resolution_notes = resolution_notes || null;
    }

    if (resolution_evidence !== undefined) {
      updates.resolution_evidence = resolution_evidence || null;
    }

    if (confidence_score !== undefined) {
      updates.confidence_score = confidence_score !== null ? Number(confidence_score) : null;
    }

    if (sources !== undefined) {
      updates.sources = normalizedSources;
    }

    if (updates.priority && !updates.due_at) {
      updates.due_at = computeDueAt(updates.priority);
    }

    const finalStatus = updates.status || existing.status;
    const finalResolution = updates.resolution_status || existing.resolution_status;
    if (finalStatus === 'resolved' && !finalResolution) {
      await client.query('ROLLBACK');
      return sendError(res, 'VALIDATION_ERROR', 'resolution_status is required when resolving a review item');
    }

    const statusChanged = updates.status && updates.status !== existing.status;
    if (statusChanged && (updates.status === 'resolved' || updates.status === 'dismissed')) {
      updates.resolved_at = new Date();
      updates.resolved_by = req.user?.id || null;
    }

    updates.updated_at = new Date();
    updates.updated_by = req.user?.id || null;

    const setClauses = [];
    const values = [];
    let index = 1;

    for (const [key, value] of Object.entries(updates)) {
      setClauses.push(`${key} = $${index}`);
      values.push(value);
      index += 1;
    }

    let updatedReview = existing;
    if (setClauses.length > 0) {
      values.push(id);
      const updateQuery = `UPDATE review_queue SET ${setClauses.join(', ')} WHERE id = $${index} RETURNING *`;
      const updateResult = await client.query(updateQuery, values);
      updatedReview = updateResult.rows[0];
    }

    if (finalStatus !== existing.status) {
      await insertReviewEvent(client, {
        reviewId: id,
        eventType: 'status_changed',
        details: { from: existing.status, to: finalStatus },
        actorId: req.user?.id,
      });
    }

    if (assigned_to !== undefined && assigned_to !== existing.assigned_to) {
      await insertReviewEvent(client, {
        reviewId: id,
        eventType: 'assigned',
        details: { from: existing.assigned_to, to: assigned_to || null },
        actorId: req.user?.id,
      });
    }

    if (
      (priority && priority !== existing.priority)
      || (required_role && required_role !== existing.required_role)
      || (due_at && due_at !== existing.due_at)
      || (confidence_score !== undefined && updates.confidence_score !== existing.confidence_score)
      || (sources !== undefined)
    ) {
      await insertReviewEvent(client, {
        reviewId: id,
        eventType: 'updated',
        details: {
          priority: updates.priority ?? existing.priority,
          required_role: updates.required_role ?? existing.required_role,
          due_at: updates.due_at ?? existing.due_at,
          confidence_score: updates.confidence_score ?? existing.confidence_score,
          sources: updates.sources ?? existing.sources,
        },
        actorId: req.user?.id,
      });
    }

    if (resolution_status || resolution_notes !== undefined || resolution_evidence !== undefined) {
      await insertReviewEvent(client, {
        reviewId: id,
        eventType: 'resolution',
        details: {
          resolution_status: updates.resolution_status ?? existing.resolution_status,
          resolution_notes: updates.resolution_notes ?? existing.resolution_notes,
          resolution_evidence: updates.resolution_evidence ?? existing.resolution_evidence,
        },
        actorId: req.user?.id,
      });
    }

    if (note) {
      await insertReviewEvent(client, {
        reviewId: id,
        eventType: 'note',
        details: { note },
        actorId: req.user?.id,
      });
    }

    await client.query('COMMIT');

    return successResponse(res, updatedReview);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Update review error:', err);
    return sendError(res, 'INTERNAL_ERROR', 'Failed to update review item', {}, 500);
  } finally {
    client.release();
  }
}
