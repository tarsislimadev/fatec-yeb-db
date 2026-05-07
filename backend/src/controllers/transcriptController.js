import { db } from '../db/index.js';
import { successResponse, sendError, getPaginationMeta } from '../utils/response.js';

// ============ GET FLAGGED TRANSCRIPTS ============
export async function getFlaggedTranscripts(req, res) {
  try {
    const { page = 1, page_size = 20, status } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const pageSize = Math.min(100, Math.max(1, parseInt(page_size)));
    const offset = (pageNum - 1) * pageSize;

    let query = `
      SELECT t.id, t.call_id, t.raw_text, t.confidence_score, t.status,
             c.phone_number, c.dialed_at, c.duration_seconds, p.full_name as prospect_name
      FROM transcripts t
      JOIN calls c ON t.call_id = c.id
      LEFT JOIN people p ON c.prospect_id = p.id
      WHERE t.flagged_for_review = TRUE
    `;
    const params = [];
    let paramCount = 1;

    // Filter by transcript status
    if (status) {
      query += ` AND t.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    // Get total count
    const countQuery = query.replace(
      'SELECT t.id, t.call_id, t.raw_text, t.confidence_score, t.status, c.phone_number, c.dialed_at, c.duration_seconds, p.full_name as prospect_name FROM',
      'SELECT COUNT(*) as total FROM'
    );
    const countResult = await db.query(countQuery, params);
    const totalItems = parseInt(countResult.rows[0].total);

    // Get paginated results
    query += ` ORDER BY t.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(pageSize, offset);

    const result = await db.query(query, params);

    return successResponse(
      res,
      result.rows,
      getPaginationMeta(pageNum, pageSize, totalItems)
    );
  } catch (err) {
    console.error('Get flagged transcripts error:', err);
    return sendError(res, 'INTERNAL_ERROR', 'Failed to get flagged transcripts', {}, 500);
  }
}

// ============ GET TRANSCRIPT DETAIL ============
export async function getTranscriptDetail(req, res) {
  try {
    const { id } = req.params;

    const result = await db.query(
      `SELECT t.*,
              c.id as call_id, c.phone_number, c.dialed_at, c.duration_seconds,
              p.full_name as prospect_name
       FROM transcripts t
       JOIN calls c ON t.call_id = c.id
       LEFT JOIN people p ON c.prospect_id = p.id
       WHERE t.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return sendError(res, 'NOT_FOUND', 'Transcript not found', {}, 404);
    }

    return successResponse(res, result.rows[0]);
  } catch (err) {
    console.error('Get transcript detail error:', err);
    return sendError(res, 'INTERNAL_ERROR', 'Failed to get transcript', {}, 500);
  }
}

// ============ APPROVE TRANSCRIPT ============
export async function approveTranscript(req, res) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return sendError(res, 'AUTH_ERROR', 'User not authenticated', {}, 401);
    }

    const result = await db.query(
      `UPDATE transcripts
       SET status = 'approved',
           flagged_for_review = FALSE,
           reviewed_at = NOW(),
           reviewed_by = $1,
           updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [userId, id]
    );

    if (result.rows.length === 0) {
      return sendError(res, 'NOT_FOUND', 'Transcript not found', {}, 404);
    }

    console.log(`[TranscriptController] Approved transcript ${id}`);
    return successResponse(res, result.rows[0]);
  } catch (err) {
    console.error('Approve transcript error:', err);
    return sendError(res, 'INTERNAL_ERROR', 'Failed to approve transcript', {}, 500);
  }
}

// ============ REJECT TRANSCRIPT ============
export async function rejectTranscript(req, res) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { notes } = req.body;

    if (!userId) {
      return sendError(res, 'AUTH_ERROR', 'User not authenticated', {}, 401);
    }

    const result = await db.query(
      `UPDATE transcripts
       SET status = 'rejected',
           flagged_for_review = FALSE,
           review_notes = COALESCE($1, review_notes),
           reviewed_at = NOW(),
           reviewed_by = $2,
           updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [notes || null, userId, id]
    );

    if (result.rows.length === 0) {
      return sendError(res, 'NOT_FOUND', 'Transcript not found', {}, 404);
    }

    console.log(`[TranscriptController] Rejected transcript ${id}`);
    return successResponse(res, result.rows[0]);
  } catch (err) {
    console.error('Reject transcript error:', err);
    return sendError(res, 'INTERNAL_ERROR', 'Failed to reject transcript', {}, 500);
  }
}

// ============ CONFIRM OPT-OUT ============
export async function confirmOptOut(req, res) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { notes } = req.body;

    if (!userId) {
      return sendError(res, 'AUTH_ERROR', 'User not authenticated', {}, 401);
    }

    // Get transcript with call info
    const transcriptResult = await db.query(
      `SELECT t.*, c.phone_id
       FROM transcripts t
       JOIN calls c ON t.call_id = c.id
       WHERE t.id = $1`,
      [id]
    );

    if (transcriptResult.rows.length === 0) {
      return sendError(res, 'NOT_FOUND', 'Transcript not found', {}, 404);
    }

    const transcript = transcriptResult.rows[0];
    const phoneId = transcript.phone_id;

    // Update transcript
    const transcriptUpdateResult = await db.query(
      `UPDATE transcripts
       SET status = 'approved',
           flagged_for_review = FALSE,
           review_notes = COALESCE($1, review_notes),
           reviewed_at = NOW(),
           reviewed_by = $2,
           updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [notes || null, userId, id]
    );

    // Auto-suppress phone on manual opt-out confirmation
    await db.query('BEGIN');
    
    try {
      await db.query(
        `UPDATE phones
         SET voice_suppressed_at = NOW(),
             voice_suppression_reason = 'opted_out_consent',
             suppression_status = 'opted_out',
             suppression_reason = $1,
             suppression_updated_at = NOW(),
             updated_at = NOW()
         WHERE id = $2`,
        [`Manual opt-out confirmation from transcript review: ${notes || ''}`, phoneId]
      );

      // Add audit log
      await db.query(
        `INSERT INTO audit_log (phone_id, entity_type, action, details, created_at, created_by)
         VALUES ($1, $2, $3, $4, NOW(), $5)`,
        [
          phoneId,
          'phone',
          'voice_suppression_manual',
          JSON.stringify({
            reason: 'opt_out_confirmed',
            transcriptId: id,
            notes,
          }),
          userId,
        ]
      );

      await db.query('COMMIT');
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }

    console.log(`[TranscriptController] Confirmed opt-out for transcript ${id}, suppressed phone ${phoneId}`);
    return successResponse(res, transcriptUpdateResult.rows[0]);
  } catch (err) {
    console.error('Confirm opt-out error:', err);
    return sendError(res, 'INTERNAL_ERROR', 'Failed to confirm opt-out', {}, 500);
  }
}

export default {
  getFlaggedTranscripts,
  getTranscriptDetail,
  approveTranscript,
  rejectTranscript,
  confirmOptOut,
};
