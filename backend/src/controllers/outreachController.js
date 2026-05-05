import { db } from '../db/index.js';
import { successResponse, sendError } from '../utils/response.js';

const VALID_CHANNEL_TYPES = ['call', 'whatsapp', 'telegram', 'sms'];
const VALID_OUTCOMES = ['answered', 'no_answer', 'wrong_number', 'opted_out', 'failed'];
const VALID_CONSENT_VALUES = ['granted', 'revoked', 'unknown'];
const VALID_SUPPRESSION_VALUES = ['none', 'manual', 'consent_revoked', 'opted_out'];

async function ensurePhoneExists(phoneId) {
  const phoneResult = await db.query('SELECT * FROM phones WHERE id = $1', [phoneId]);
  return phoneResult.rows[0] || null;
}

async function insertAuditLog({ phoneId, entityType, action, details, userId }) {
  await db.query(
    `INSERT INTO audit_log (phone_id, entity_type, action, details, created_by)
     VALUES ($1, $2, $3, $4, $5)`,
    [phoneId, entityType, action, JSON.stringify(details || {}), userId || null]
  );
}

function buildTimelineItem(row) {
  if (row.event_type === 'contact_attempt') {
    return {
      id: row.id,
      event_type: row.event_type,
      event_at: row.event_at,
      channel_type: row.channel_type,
      outcome: row.outcome,
      notes: row.notes,
    };
  }

  return {
    id: row.id,
    event_type: row.event_type,
    event_at: row.event_at,
    action: row.action,
    details: row.details,
  };
}

function normalizeConsentUpdate(body) {
  const updates = {};

  if (body.marketing_consent !== undefined) {
    updates.marketing_consent = body.marketing_consent;
  }

  if (body.transactional_consent !== undefined) {
    updates.transactional_consent = body.transactional_consent;
  }

  if (body.suppression_status !== undefined) {
    updates.suppression_status = body.suppression_status;
  }

  if (body.suppression_reason !== undefined) {
    updates.suppression_reason = body.suppression_reason;
  }

  return updates;
}

export async function updatePhoneConsent(req, res) {
  try {
    const { id: phoneId } = req.params;
    const phone = await ensurePhoneExists(phoneId);

    if (!phone) {
      return sendError(res, 'NOT_FOUND', 'Phone not found', {}, 404);
    }

    const updates = normalizeConsentUpdate(req.body);

    if (Object.keys(updates).length === 0) {
      return sendError(res, 'VALIDATION_ERROR', 'No consent fields to update');
    }

    if (updates.marketing_consent && !VALID_CONSENT_VALUES.includes(updates.marketing_consent)) {
      return sendError(res, 'VALIDATION_ERROR', 'Invalid marketing_consent value');
    }

    if (updates.transactional_consent && !VALID_CONSENT_VALUES.includes(updates.transactional_consent)) {
      return sendError(res, 'VALIDATION_ERROR', 'Invalid transactional_consent value');
    }

    if (updates.suppression_status && !VALID_SUPPRESSION_VALUES.includes(updates.suppression_status)) {
      return sendError(res, 'VALIDATION_ERROR', 'Invalid suppression_status value');
    }

    const setClauses = [];
    const values = [];
    let index = 1;

    for (const [key, value] of Object.entries(updates)) {
      setClauses.push(`${key} = $${index}`);
      values.push(value);
      index += 1;
    }

    const marketingConsent = updates.marketing_consent || phone.marketing_consent;
    const transactionalConsent = updates.transactional_consent || phone.transactional_consent;
    const suppressionStatus = updates.suppression_status || phone.suppression_status;

    if ((marketingConsent === 'revoked' || transactionalConsent === 'revoked') && suppressionStatus === 'none') {
      setClauses.push(`suppression_status = $${index}`);
      values.push('consent_revoked');
      index += 1;
    }

    if (
      marketingConsent === 'granted'
      && transactionalConsent === 'granted'
      && phone.suppression_status === 'consent_revoked'
      && updates.suppression_status === undefined
    ) {
      setClauses.push(`suppression_status = $${index}`);
      values.push('none');
      index += 1;
      setClauses.push(`suppression_reason = $${index}`);
      values.push(null);
      index += 1;
    }

    if (updates.suppression_status || updates.marketing_consent || updates.transactional_consent) {
      setClauses.push(`consent_recorded_at = CURRENT_TIMESTAMP`);
      setClauses.push(`suppression_updated_at = CURRENT_TIMESTAMP`);
      setClauses.push(`updated_at = CURRENT_TIMESTAMP`);
    }

    values.push(phoneId);

    const query = `UPDATE phones SET ${setClauses.join(', ')} WHERE id = $${index} RETURNING *`;
    const result = await db.query(query, values);

    await insertAuditLog({
      phoneId,
      entityType: 'phone',
      action: 'consent_updated',
      details: {
        marketing_consent: result.rows[0].marketing_consent,
        transactional_consent: result.rows[0].transactional_consent,
        suppression_status: result.rows[0].suppression_status,
        suppression_reason: result.rows[0].suppression_reason,
      },
      userId: req.user?.id,
    });

    return successResponse(res, result.rows[0]);
  } catch (err) {
    console.error('Update phone consent error:', err);
    return sendError(res, 'INTERNAL_ERROR', 'Failed to update phone consent', {}, 500);
  }
}

export async function createContactAttempt(req, res) {
  try {
    const { id: phoneId } = req.params;
    const { channel_type, outcome, attempted_at, notes } = req.body;

    const phone = await ensurePhoneExists(phoneId);
    if (!phone) {
      return sendError(res, 'NOT_FOUND', 'Phone not found', {}, 404);
    }

    if (!channel_type || !VALID_CHANNEL_TYPES.includes(channel_type)) {
      return sendError(res, 'VALIDATION_ERROR', `channel_type must be one of: ${VALID_CHANNEL_TYPES.join(', ')}`);
    }

    if (!outcome || !VALID_OUTCOMES.includes(outcome)) {
      return sendError(res, 'VALIDATION_ERROR', `outcome must be one of: ${VALID_OUTCOMES.join(', ')}`);
    }

    if (phone.suppression_status && phone.suppression_status !== 'none' && outcome !== 'opted_out') {
      return sendError(
        res,
        'BUSINESS_RULE_VIOLATION',
        'Cannot create contact attempt for a suppressed phone',
        { suppression_status: phone.suppression_status },
        422
      );
    }

    if (outcome !== 'opted_out' && phone.marketing_consent !== 'granted') {
      return sendError(
        res,
        'BUSINESS_RULE_VIOLATION',
        'Marketing consent is required before logging contact attempts',
        { marketing_consent: phone.marketing_consent },
        422
      );
    }

    const attemptedAt = attempted_at || new Date().toISOString();
    const result = await db.query(
      `INSERT INTO contact_attempts (
        phone_id, channel_type, attempted_at, outcome, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [phoneId, channel_type, attemptedAt, outcome, notes || null, req.user?.id || null]
    );

    if (outcome === 'opted_out') {
      await db.query(
        `UPDATE phones
         SET marketing_consent = 'revoked',
             transactional_consent = 'revoked',
             suppression_status = 'opted_out',
             suppression_reason = COALESCE($2, 'Contact requested opt-out'),
             consent_recorded_at = CURRENT_TIMESTAMP,
             suppression_updated_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [phoneId, notes || null]
      );
    }

    await insertAuditLog({
      phoneId,
      entityType: 'contact_attempt',
      action: 'created',
      details: {
        channel_type,
        outcome,
        attempted_at: attemptedAt,
        notes: notes || null,
      },
      userId: req.user?.id,
    });

    return successResponse(res, result.rows[0], null, 201);
  } catch (err) {
    console.error('Create contact attempt error:', err);
    return sendError(res, 'INTERNAL_ERROR', 'Failed to create contact attempt', {}, 500);
  }
}

export async function getPhoneTimeline(req, res) {
  try {
    const { id: phoneId } = req.params;
    const phone = await ensurePhoneExists(phoneId);

    if (!phone) {
      return sendError(res, 'NOT_FOUND', 'Phone not found', {}, 404);
    }

    const attemptResult = await db.query(
      `SELECT
         id,
         'contact_attempt' AS event_type,
         attempted_at AS event_at,
         channel_type,
         outcome,
         notes,
         created_at
       FROM contact_attempts
       WHERE phone_id = $1
       ORDER BY attempted_at DESC, created_at DESC`,
      [phoneId]
    );

    const auditResult = await db.query(
      `SELECT
         id,
         'audit' AS event_type,
         created_at AS event_at,
         action,
         details,
         created_at
       FROM audit_log
       WHERE phone_id = $1
       ORDER BY created_at DESC`,
      [phoneId]
    );

    const items = [...attemptResult.rows, ...auditResult.rows]
      .sort((left, right) => new Date(right.event_at) - new Date(left.event_at))
      .map(buildTimelineItem);

    return successResponse(res, {
      phone_id: phoneId,
      items,
      total_items: items.length,
      phone: {
        id: phone.id,
        e164_number: phone.e164_number,
        marketing_consent: phone.marketing_consent,
        transactional_consent: phone.transactional_consent,
        suppression_status: phone.suppression_status,
        suppression_reason: phone.suppression_reason,
      },
    });
  } catch (err) {
    console.error('Get phone timeline error:', err);
    return sendError(res, 'INTERNAL_ERROR', 'Failed to load phone timeline', {}, 500);
  }
}

export async function getOutreachReport(req, res) {
  try {
    const { phone_id, channel_type, outcome, format = 'json' } = req.query;

    const conditions = [];
    const params = [];
    let index = 1;

    if (phone_id) {
      conditions.push(`phone_id = $${index}`);
      params.push(phone_id);
      index += 1;
    }

    if (channel_type) {
      conditions.push(`channel_type = $${index}`);
      params.push(channel_type);
      index += 1;
    }

    if (outcome) {
      conditions.push(`outcome = $${index}`);
      params.push(outcome);
      index += 1;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await db.query(
      `SELECT
         ca.id,
         ca.phone_id,
         p.e164_number,
         ca.channel_type,
         ca.attempted_at,
         ca.outcome,
         ca.notes
       FROM contact_attempts ca
       INNER JOIN phones p ON p.id = ca.phone_id
       ${whereClause}
       ORDER BY ca.attempted_at DESC`,
      params
    );

    const summary = result.rows.reduce(
      (accumulator, row) => {
        accumulator.total += 1;
        accumulator.by_outcome[row.outcome] = (accumulator.by_outcome[row.outcome] || 0) + 1;
        return accumulator;
      },
      { total: 0, by_outcome: {} }
    );

    if (format === 'csv') {
      const header = 'id,phone_id,e164_number,channel_type,attempted_at,outcome,notes';
      const lines = result.rows.map((row) => [
        row.id,
        row.phone_id,
        row.e164_number,
        row.channel_type,
        row.attempted_at,
        row.outcome,
        (row.notes || '').replace(/\n/g, ' '),
      ].map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','));

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      return res.status(200).send([header, ...lines].join('\n'));
    }

    return successResponse(res, {
      items: result.rows,
      summary,
      filters: { phone_id: phone_id || null, channel_type: channel_type || null, outcome: outcome || null },
    });
  } catch (err) {
    console.error('Get outreach report error:', err);
    return sendError(res, 'INTERNAL_ERROR', 'Failed to load outreach report', {}, 500);
  }
}
