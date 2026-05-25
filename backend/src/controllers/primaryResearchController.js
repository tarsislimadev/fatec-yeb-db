import { db } from '../db/index.js';
import { sendError, successResponse, getPaginationMeta } from '../utils/response.js';
import { normalizeCnpj } from '../utils/normalize.js';

const VALID_PRIORITIES = ['P1', 'P2', 'P3'];
const VALID_STATUSES = ['pending', 'in_progress', 'completed', 'escalated', 'paused'];
const VALID_REASON_CODES = [
  'missing_contact',
  'missing_role',
  'stale_data',
  'conflict',
  'invalid_contact',
  'low_confidence',
  'manual',
];
const VALID_CHANNEL_TYPES = ['call', 'whatsapp', 'email'];
const VALID_OUTCOMES = ['answered', 'no_answer', 'wrong_number', 'opted_out', 'failed'];
const VALID_CONSENT_VALUES = ['granted', 'revoked', 'unknown'];

const ATTEMPT_DAY_OFFSETS = [0, 2, 6];

function computeNextAttemptAt(createdAt, attemptCount) {
  if (attemptCount >= ATTEMPT_DAY_OFFSETS.length) {
    return null;
  }
  const base = new Date(createdAt);
  const next = new Date(base);
  next.setDate(base.getDate() + ATTEMPT_DAY_OFFSETS[attemptCount]);
  const now = new Date();
  return next < now ? now : next;
}

async function createReviewEscalation({ task, userId }) {
  const result = await db.query(
    `INSERT INTO review_queue (
      entity_type,
      entity_id,
      cnpj,
      reason_code,
      priority,
      confidence_score,
      sources,
      status,
      required_role,
      created_by,
      updated_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8, $9, $9)
    RETURNING id`,
    [
      'business',
      task.business_id || null,
      task.cnpj || null,
      'manual',
      task.priority || 'P1',
      null,
      { source: 'primary_research', task_id: task.id, reason_code: task.reason_code },
      task.priority === 'P1' ? 'operations_supervisor' : 'data_analyst',
      userId,
    ]
  );

  return result.rows[0].id;
}

async function updatePhoneConsentIfNeeded(task, consentStatus, userId) {
  if (!task.phone_id || consentStatus !== 'granted') {
    return;
  }

  await db.query(
    `UPDATE phones
     SET marketing_consent = 'granted',
         transactional_consent = 'granted',
         suppression_status = 'none',
         suppression_reason = NULL,
         consent_recorded_at = CURRENT_TIMESTAMP,
         suppression_updated_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP,
         updated_by = $2
     WHERE id = $1`,
    [task.phone_id, userId || null]
  );
}

export async function listPrimaryResearchTasks(req, res) {
  try {
    const {
      page = 1,
      page_size = 20,
      status,
      priority,
      reason_code,
      assigned_to,
      overdue,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const pageSize = Math.min(100, Math.max(1, parseInt(page_size)));
    const offset = (pageNum - 1) * pageSize;

    let query = 'SELECT * FROM primary_research_tasks WHERE 1=1';
    const params = [];
    let index = 1;

    if (status) {
      query += ` AND status = $${index}`;
      params.push(status);
      index += 1;
    }

    if (priority) {
      query += ` AND priority = $${index}`;
      params.push(priority);
      index += 1;
    }

    if (reason_code) {
      query += ` AND reason_code = $${index}`;
      params.push(reason_code);
      index += 1;
    }

    if (assigned_to) {
      query += ` AND assigned_to = $${index}`;
      params.push(assigned_to);
      index += 1;
    }

    if (overdue === 'true') {
      query += ` AND next_attempt_at IS NOT NULL AND next_attempt_at < NOW() AND status IN ('pending', 'in_progress')`;
    }

    const countResult = await db.query(query.replace('SELECT *', 'SELECT COUNT(*) as total'), params);
    const totalItems = parseInt(countResult.rows[0].total);

    query += ` ORDER BY priority ASC, next_attempt_at ASC NULLS LAST LIMIT $${index} OFFSET $${index + 1}`;
    params.push(pageSize, offset);

    const result = await db.query(query, params);

    return successResponse(res, result.rows, getPaginationMeta(pageNum, pageSize, totalItems));
  } catch (error) {
    console.error('List primary research tasks error:', error);
    return sendError(res, 'INTERNAL_ERROR', 'Failed to list primary research tasks', {}, 500);
  }
}

export async function getPrimaryResearchTask(req, res) {
  try {
    const { id } = req.params;
    const taskResult = await db.query('SELECT * FROM primary_research_tasks WHERE id = $1', [id]);
    if (taskResult.rows.length === 0) {
      return sendError(res, 'NOT_FOUND', 'Primary research task not found', {}, 404);
    }

    const attemptsResult = await db.query(
      `SELECT *
       FROM primary_research_attempts
       WHERE task_id = $1
       ORDER BY attempted_at DESC`,
      [id]
    );

    return successResponse(res, {
      ...taskResult.rows[0],
      attempts: attemptsResult.rows,
    });
  } catch (error) {
    console.error('Get primary research task error:', error);
    return sendError(res, 'INTERNAL_ERROR', 'Failed to load primary research task', {}, 500);
  }
}

export async function createPrimaryResearchTask(req, res) {
  try {
    const {
      business_id,
      cnpj,
      phone_id,
      priority = 'P2',
      reason_code = 'manual',
      channel_order,
      missing_fields,
      timezone = 'America/Sao_Paulo',
      window_start_min = 540,
      window_end_min = 1080,
    } = req.body || {};

    if (!VALID_PRIORITIES.includes(priority)) {
      return sendError(res, 'VALIDATION_ERROR', 'priority must be P1, P2, or P3');
    }

    if (!VALID_REASON_CODES.includes(reason_code)) {
      return sendError(res, 'VALIDATION_ERROR', `reason_code must be one of: ${VALID_REASON_CODES.join(', ')}`);
    }

    if (!business_id && !cnpj) {
      return sendError(res, 'VALIDATION_ERROR', 'business_id or cnpj is required');
    }

    const normalizedCnpj = cnpj ? normalizeCnpj(cnpj) : null;
    if (cnpj && !normalizedCnpj) {
      return sendError(res, 'VALIDATION_ERROR', 'Invalid CNPJ format. Expect 14 digits.');
    }

    const createdAt = new Date();
    const nextAttemptAt = computeNextAttemptAt(createdAt, 0);

    const result = await db.query(
      `INSERT INTO primary_research_tasks (
        business_id,
        cnpj,
        phone_id,
        priority,
        status,
        reason_code,
        missing_fields,
        channel_order,
        timezone,
        window_start_min,
        window_end_min,
        next_attempt_at,
        created_by,
        updated_by
      ) VALUES ($1, $2, $3, $4, 'pending', $5, $6, $7, $8, $9, $10, $11, $12, $12)
      RETURNING *`,
      [
        business_id || null,
        normalizedCnpj,
        phone_id || null,
        priority,
        // status,
        reason_code,
        missing_fields || null,
        null, // Array.isArray(channel_order) ? channel_order : ['call', 'whatsapp', 'email'],
        timezone,
        window_start_min,
        window_end_min,
        nextAttemptAt,
        req.user?.id || null,
      ]
    );

    return successResponse(res, result.rows[0], null, 201);
  } catch (error) {
    console.error('Create primary research task error:', error);
    if (error.code === '23505') {
      return sendError(res, 'CONFLICT', 'Primary research task already exists', {}, 409);
    }
    return sendError(res, 'INTERNAL_ERROR', 'Failed to create primary research task', {}, 500);
  }
}

export async function updatePrimaryResearchTask(req, res) {
  const { id } = req.params;
  const {
    status,
    priority,
    assigned_to,
    next_attempt_at,
    consent_status,
    consent_evidence,
  } = req.body || {};

  if (
    status === undefined
    && priority === undefined
    && assigned_to === undefined
    && next_attempt_at === undefined
    && consent_status === undefined
    && consent_evidence === undefined
  ) {
    return sendError(res, 'VALIDATION_ERROR', 'No updates provided');
  }

  if (status && !VALID_STATUSES.includes(status)) {
    return sendError(res, 'VALIDATION_ERROR', `status must be one of: ${VALID_STATUSES.join(', ')}`);
  }

  if (priority && !VALID_PRIORITIES.includes(priority)) {
    return sendError(res, 'VALIDATION_ERROR', 'priority must be P1, P2, or P3');
  }

  if (consent_status && !VALID_CONSENT_VALUES.includes(consent_status)) {
    return sendError(res, 'VALIDATION_ERROR', 'consent_status must be granted, revoked, or unknown');
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const taskResult = await client.query('SELECT * FROM primary_research_tasks WHERE id = $1', [id]);
    if (taskResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return sendError(res, 'NOT_FOUND', 'Primary research task not found', {}, 404);
    }

    const task = taskResult.rows[0];
    const updates = {};

    if (status) {
      updates.status = status;
    }

    if (priority) {
      updates.priority = priority;
    }

    if (assigned_to !== undefined) {
      updates.assigned_to = assigned_to || null;
    }

    if (next_attempt_at !== undefined) {
      updates.next_attempt_at = next_attempt_at;
    }

    if (consent_status) {
      updates.consent_status = consent_status;
    }

    if (consent_evidence !== undefined) {
      updates.consent_evidence = consent_evidence || null;
    }

    if (updates.consent_status === 'granted') {
      await updatePhoneConsentIfNeeded(task, updates.consent_status, req.user?.id);
    }

    if (status === 'escalated' && !task.escalation_review_id) {
      const reviewId = await createReviewEscalation({ task, userId: req.user?.id });
      updates.escalation_review_id = reviewId;
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

    let updated = task;
    if (setClauses.length > 0) {
      values.push(id);
      const updateResult = await client.query(
        `UPDATE primary_research_tasks SET ${setClauses.join(', ')} WHERE id = $${index} RETURNING *`,
        values
      );
      updated = updateResult.rows[0];
    }

    await client.query('COMMIT');
    return successResponse(res, updated);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update primary research task error:', error);
    return sendError(res, 'INTERNAL_ERROR', 'Failed to update primary research task', {}, 500);
  } finally {
    client.release();
  }
}

export async function createPrimaryResearchAttempt(req, res) {
  const { id } = req.params;
  const { channel_type, outcome, attempted_at, notes } = req.body || {};

  if (!VALID_CHANNEL_TYPES.includes(channel_type)) {
    return sendError(res, 'VALIDATION_ERROR', `channel_type must be one of: ${VALID_CHANNEL_TYPES.join(', ')}`);
  }

  if (!VALID_OUTCOMES.includes(outcome)) {
    return sendError(res, 'VALIDATION_ERROR', `outcome must be one of: ${VALID_OUTCOMES.join(', ')}`);
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const taskResult = await client.query('SELECT * FROM primary_research_tasks WHERE id = $1', [id]);
    if (taskResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return sendError(res, 'NOT_FOUND', 'Primary research task not found', {}, 404);
    }

    const task = taskResult.rows[0];
    const attemptAt = attempted_at ? new Date(attempted_at) : new Date();

    const attemptResult = await client.query(
      `INSERT INTO primary_research_attempts (
        task_id,
        channel_type,
        outcome,
        attempted_at,
        notes,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [id, channel_type, outcome, attemptAt, notes || null, req.user?.id || null]
    );

    const newAttemptCount = task.attempts_count + 1;
    let nextAttemptAt = computeNextAttemptAt(task.created_at, newAttemptCount);
    let nextStatus = task.status === 'pending' ? 'in_progress' : task.status;
    let escalationReviewId = task.escalation_review_id;

    if (newAttemptCount >= ATTEMPT_DAY_OFFSETS.length) {
      if (task.priority === 'P1') {
        nextStatus = 'escalated';
        if (!task.escalation_review_id) {
          escalationReviewId = await createReviewEscalation({ task, userId: req.user?.id });
        }
      } else {
        nextStatus = 'paused';
        nextAttemptAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      }
    }

    await client.query(
      `UPDATE primary_research_tasks
       SET attempts_count = $2,
           last_attempt_at = $3,
           next_attempt_at = $4,
           status = $5,
           escalation_review_id = $6,
           updated_at = CURRENT_TIMESTAMP,
           updated_by = $7
       WHERE id = $1`,
      [
        id,
        newAttemptCount,
        attemptAt,
        nextAttemptAt,
        nextStatus,
        escalationReviewId,
        req.user?.id || null,
      ]
    );

    if (outcome === 'opted_out' && task.phone_id) {
      await client.query(
        `UPDATE phones
         SET marketing_consent = 'revoked',
             transactional_consent = 'revoked',
             suppression_status = 'opted_out',
             suppression_reason = COALESCE($2, 'Primary research opt-out'),
             consent_recorded_at = CURRENT_TIMESTAMP,
             suppression_updated_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP,
             updated_by = $3
         WHERE id = $1`,
        [task.phone_id, notes || null, req.user?.id || null]
      );
    }

    await client.query('COMMIT');

    return successResponse(res, attemptResult.rows[0], null, 201);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create primary research attempt error:', error);
    return sendError(res, 'INTERNAL_ERROR', 'Failed to create primary research attempt', {}, 500);
  } finally {
    client.release();
  }
}

export async function scanPrimaryResearchTasks(req, res) {
  try {
    const { cnpjs, limit = 200 } = req.body || {};
    const normalizedCnpjs = Array.isArray(cnpjs)
      ? cnpjs.map((value) => normalizeCnpj(value)).filter(Boolean)
      : null;

    const queryParams = [];
    let clause = '';
    if (normalizedCnpjs && normalizedCnpjs.length > 0) {
      clause = 'AND b.cnpj = ANY($1::varchar[])';
      queryParams.push(normalizedCnpjs);
    }
    queryParams.push(Number(limit) || 200);

    const candidates = await db.query(
      `SELECT
        b.id,
        b.cnpj,
        b.last_validated_at,
        EXISTS (
          SELECT 1 FROM phone_owners po
          JOIN phones p ON p.id = po.phone_id
          WHERE po.owner_type = 'business'
            AND po.owner_id = b.id
            AND po.end_date IS NULL
        ) AS has_phone,
        EXISTS (
          SELECT 1 FROM phone_owners po
          JOIN phones p ON p.id = po.phone_id
          WHERE po.owner_type = 'business'
            AND po.owner_id = b.id
            AND po.end_date IS NULL
            AND p.status = 'active'
        ) AS has_active_phone,
        EXISTS (
          SELECT 1 FROM people_businesses pb
          JOIN people pe ON pe.id = pb.person_id
          WHERE pb.business_id = b.id
            AND pb.deleted_at IS NULL
            AND pe.email IS NOT NULL
        ) AS has_email,
        EXISTS (
          SELECT 1 FROM people_businesses pb
          JOIN people pe ON pe.id = pb.person_id
          WHERE pb.business_id = b.id
            AND pb.deleted_at IS NULL
            AND pe.role_title IS NOT NULL
        ) AS has_role,
        (SELECT COUNT(DISTINCT COALESCE(er.legal_name, ''))
         FROM enrichment_results er
         WHERE er.cnpj = b.cnpj) AS legal_name_variants,
        (SELECT COUNT(DISTINCT COALESCE(er.trade_name, ''))
         FROM enrichment_results er
         WHERE er.cnpj = b.cnpj) AS trade_name_variants,
        (SELECT COUNT(DISTINCT COALESCE(er.status, ''))
         FROM enrichment_results er
         WHERE er.cnpj = b.cnpj) AS status_variants,
        (SELECT AVG(CASE provider
          WHEN 'brasilapi' THEN 1.0
          WHEN 'cnpja_open' THEN 0.9
          ELSE 0.7
         END)
         FROM enrichment_results er
         WHERE er.cnpj = b.cnpj) AS confidence_score
       FROM businesses b
       WHERE b.deleted_at IS NULL
       ${clause}
       ORDER BY b.created_at DESC
       LIMIT $${queryParams.length}`,
      queryParams
    );

    const activeTasks = await db.query(
      `SELECT business_id FROM primary_research_tasks
       WHERE status IN ('pending', 'in_progress', 'paused', 'escalated')
         AND business_id IS NOT NULL`
    );
    const activeSet = new Set(activeTasks.rows.map((row) => row.business_id));

    const created = [];
    const skipped = [];

    for (const row of candidates.rows) {
      if (activeSet.has(row.id)) {
        skipped.push({ business_id: row.id, cnpj: row.cnpj, reason: 'already_active' });
        continue;
      }

      const missingContact = !row.has_active_phone && !row.has_email;
      const missingRole = !row.has_role;
      const conflict = row.legal_name_variants > 1 || row.trade_name_variants > 1 || row.status_variants > 1;
      const stale = !row.last_validated_at || new Date(row.last_validated_at) < new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
      const lowConfidence = row.confidence_score !== null && Number(row.confidence_score) < 0.8;
      const invalidContact = row.has_phone && !row.has_active_phone;

      let reason = null;
      let priority = null;
      if (conflict) {
        reason = 'conflict';
        priority = 'P1';
      } else if (missingContact) {
        reason = 'missing_contact';
        priority = 'P1';
      } else if (missingRole) {
        reason = 'missing_role';
        priority = 'P1';
      } else if (invalidContact) {
        reason = 'invalid_contact';
        priority = 'P2';
      } else if (stale) {
        reason = 'stale_data';
        priority = 'P2';
      } else if (lowConfidence) {
        reason = 'low_confidence';
        priority = 'P2';
      }

      if (!reason) {
        skipped.push({ business_id: row.id, cnpj: row.cnpj, reason: 'no_trigger' });
        continue;
      }

      const createdAt = new Date();
      const nextAttemptAt = computeNextAttemptAt(createdAt, 0);
      try {
        const insertResult = await db.query(
          `INSERT INTO primary_research_tasks (
            business_id,
            cnpj,
            priority,
            status,
            reason_code,
            missing_fields,
            channel_order,
            next_attempt_at,
            created_by,
            updated_by
          ) VALUES ($1, $2, $3, 'pending', $4, $5, $6, $7, $8, $8)
          RETURNING *`,
          [
            row.id,
            row.cnpj,
            priority,
            reason,
            {
              missing_contact: missingContact,
              missing_role: missingRole,
              conflict,
              invalid_contact: invalidContact,
              stale_data: stale,
              low_confidence: lowConfidence,
            },
            ['call', 'whatsapp', 'email'],
            nextAttemptAt,
            req.user?.id || null,
          ]
        );

        created.push(insertResult.rows[0]);
      } catch (error) {
        if (error.code === '23505') {
          skipped.push({ business_id: row.id, cnpj: row.cnpj, reason: 'already_active' });
          continue;
        }
        throw error;
      }
    }

    return successResponse(res, {
      created_count: created.length,
      skipped_count: skipped.length,
      created,
      skipped,
    });
  } catch (error) {
    console.error('Scan primary research tasks error:', error);
    return sendError(res, 'INTERNAL_ERROR', 'Failed to scan primary research tasks', {}, 500);
  }
}
