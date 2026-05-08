import { db } from '../db/index.js';
import { successResponse, sendError, getPaginationMeta } from '../utils/response.js';
import { addCallJob } from '../services/callQueue.js';

// ============ LIST CALLS ============
export async function listCalls(req, res) {
  try {
    const { page = 1, page_size = 20, campaign_id, status, sort = 'created_at', order = 'desc' } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const pageSize = Math.min(100, Math.max(1, parseInt(page_size)));
    const offset = (pageNum - 1) * pageSize;

    let query = 'SELECT * FROM calls WHERE 1=1';
    const params = [];
    let paramCount = 1;

    // Filter by campaign
    if (campaign_id) {
      query += ` AND campaign_id = $${paramCount}`;
      params.push(campaign_id);
      paramCount++;
    }

    // Filter by status
    if (status) {
      query += ` AND status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    // Validate sort field
    const validSortFields = ['created_at', 'dialed_at', 'duration_seconds'];
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
    console.error('List calls error:', err);
    return sendError(res, 'INTERNAL_ERROR', 'Failed to list calls', {}, 500);
  }
}

// ============ CREATE / ENQUEUE CALL ============
export async function createCall(req, res) {
  try {
    const { phone_id, e164_number, prospect_id, campaign_id, scheduled_at } = req.body;

    if (!phone_id && !e164_number) {
      return sendError(res, 'VALIDATION_ERROR', 'phone_id or e164_number is required');
    }

    let phoneNumber = e164_number;
    let phoneId = phone_id;

    if (phoneId) {
      const phoneResult = await db.query('SELECT id, e164_number FROM phones WHERE id = $1', [phoneId]);
      if (phoneResult.rows.length === 0) {
        return sendError(res, 'NOT_FOUND', 'Phone not found', {}, 404);
      }
      phoneNumber = phoneResult.rows[0].e164_number;
    } else if (phoneNumber) {
      const phoneResult = await db.query('SELECT id, e164_number FROM phones WHERE e164_number = $1', [phoneNumber]);
      if (phoneResult.rows.length === 0) {
        return sendError(res, 'NOT_FOUND', 'Phone not registered. Create a phone record first', {}, 404);
      }
      phoneId = phoneResult.rows[0].id;
    }

    // Build job payload
    const jobPayload = {
      campaignId: campaign_id || null,
      prospectId: prospect_id || null,
      phoneId,
      phoneNumber,
      scheduledAt: scheduled_at ? new Date(scheduled_at) : new Date(),
    };

    const job = await addCallJob(jobPayload);

    return successResponse(res, { queued: true, jobId: job.id }, null, 202);
  } catch (err) {
    console.error('Create call error:', err);
    return sendError(res, 'INTERNAL_ERROR', 'Failed to enqueue call', {}, 500);
  }
}

// ============ GET CALL DETAIL ============
export async function getCallDetail(req, res) {
  try {
    const { id } = req.params;

    // Get call info
    const callResult = await db.query(
      `SELECT c.*, p.full_name as prospect_name
       FROM calls c
       LEFT JOIN people p ON c.prospect_id = p.id
       WHERE c.id = $1`,
      [id]
    );

    if (callResult.rows.length === 0) {
      return sendError(res, 'NOT_FOUND', 'Call not found', {}, 404);
    }

    const call = callResult.rows[0];

    // Get call session/recording info
    const sessionResult = await db.query(
      'SELECT * FROM call_sessions WHERE call_id = $1',
      [id]
    );

    // Get transcript if available
    const transcriptResult = await db.query(
      'SELECT * FROM transcripts WHERE call_id = $1 ORDER BY created_at DESC LIMIT 1',
      [id]
    );

    // Get call outcome
    const outcomeResult = await db.query(
      'SELECT * FROM call_outcomes WHERE call_id = $1 ORDER BY created_at DESC LIMIT 1',
      [id]
    );

    // Get retry log
    const retryLogResult = await db.query(
      'SELECT * FROM call_retry_log WHERE call_id = $1 ORDER BY created_at DESC',
      [id]
    );

    // Build timeline
    const timeline = [];
    timeline.push({
      event: 'call_created',
      timestamp: call.created_at,
    });

    if (call.dialed_at) {
      timeline.push({
        event: 'call_initiated',
        timestamp: call.dialed_at,
      });
    }

    if (call.status === 'in-progress') {
      timeline.push({
        event: 'call_in_progress',
        timestamp: call.updated_at,
      });
    }

    if (['completed', 'failed'].includes(call.status)) {
      timeline.push({
        event: `call_${call.status}`,
        timestamp: call.updated_at,
        duration: call.duration_seconds,
      });
    }

    if (transcriptResult.rows.length > 0) {
      timeline.push({
        event: 'transcript_processed',
        timestamp: transcriptResult.rows[0].created_at,
        optOutDetected: transcriptResult.rows[0].flagged_for_review,
      });
    }

    timeline.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    const response = {
      ...call,
      session: sessionResult.rows[0] || null,
      transcript: transcriptResult.rows[0] || null,
      outcome: outcomeResult.rows[0] || null,
      retryLog: retryLogResult.rows,
      timeline,
    };

    return successResponse(res, response);
  } catch (err) {
    console.error('Get call detail error:', err);
    return sendError(res, 'INTERNAL_ERROR', 'Failed to get call detail', {}, 500);
  }
}

// ============ RETRY FAILED CALL ============
export async function retryCall(req, res) {
  try {
    const { id } = req.params;

    // Get call
    const callResult = await db.query(
      'SELECT * FROM calls WHERE id = $1',
      [id]
    );

    if (callResult.rows.length === 0) {
      return sendError(res, 'NOT_FOUND', 'Call not found', {}, 404);
    }

    const call = callResult.rows[0];

    if (call.status !== 'failed') {
      return sendError(res, 'CONFLICT', 'Can only retry failed calls', {}, 409);
    }

    // Reset call for retry
    const result = await db.query(
      `UPDATE calls
       SET status = 'pending',
           retry_count = retry_count + 1,
           last_retry_at = NOW(),
           next_retry_at = NULL,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    console.log(`[CallController] Retrying call ${id}`);

    // Emit event to re-queue the call
    // This would be handled by the job processor when this endpoint is integrated

    return successResponse(res, result.rows[0]);
  } catch (err) {
    console.error('Retry call error:', err);
    return sendError(res, 'INTERNAL_ERROR', 'Failed to retry call', {}, 500);
  }
}

// ============ BULK RETRY CALLS ============
export async function bulkRetryCalls(req, res) {
  try {
    const { call_ids } = req.body;

    if (!Array.isArray(call_ids) || call_ids.length === 0) {
      return sendError(res, 'VALIDATION_ERROR', 'call_ids array is required');
    }

    if (call_ids.length > 100) {
      return sendError(res, 'VALIDATION_ERROR', 'Maximum 100 calls can be retried at once');
    }

    // Reset calls for retry
    const query = `
      UPDATE calls
      SET status = 'pending',
          retry_count = retry_count + 1,
          last_retry_at = NOW(),
          updated_at = NOW()
      WHERE id = ANY($1) AND status = 'failed'
      RETURNING id, status
    `;

    const result = await db.query(query, [call_ids]);
    const updatedCount = result.rows.length;

    console.log(`[CallController] Retrying ${updatedCount} calls`);

    return successResponse(
      res,
      {
        requested: call_ids.length,
        updated: updatedCount,
        calls: result.rows,
      },
      {},
      202
    );
  } catch (err) {
    console.error('Bulk retry calls error:', err);
    return sendError(res, 'INTERNAL_ERROR', 'Failed to retry calls', {}, 500);
  }
}

// ============ GET CALL CENTER DASHBOARD ============
export async function getDashboard(req, res) {
  try {
    const { start_date, end_date } = req.query;

    // Default to last 24 hours if not specified
    const endDate = new Date(end_date || Date.now());
    const startDate = new Date(start_date || Date.now() - 24 * 60 * 60 * 1000);

    // Get dashboard metrics
    const metricsResult = await db.query(
      `SELECT
         COUNT(*) as calls_total,
         SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as calls_completed,
         SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as calls_failed,
         SUM(CASE WHEN status = 'pending' OR status = 'dialing' THEN 1 ELSE 0 END) as calls_pending,
         AVG(COALESCE(duration_seconds, 0)) as avg_duration,
         MAX(dialed_at) as last_call_at
       FROM calls
       WHERE created_at >= $1 AND created_at <= $2`,
      [startDate, endDate]
    );

    const metrics = metricsResult.rows[0];

    // Get flagged transcripts count
    const transcriptsResult = await db.query(
      `SELECT COUNT(*) as flagged_count
       FROM transcripts
       WHERE flagged_for_review = TRUE AND status = 'pending'`,
      []
    );

    // Get opt-outs detected
    const optOutsResult = await db.query(
      `SELECT COUNT(*) as opt_outs_total
       FROM call_outcomes
       WHERE spoken_opt_out_flag = TRUE AND created_at >= $1 AND created_at <= $2`,
      [startDate, endDate]
    );

    // Get active campaigns
    const campaignsResult = await db.query(
      `SELECT id, name, status, started_at, 
              ARRAY_LENGTH(prospect_ids, 1) as prospect_count,
              COUNT(calls.id) as calls_total
       FROM call_campaigns
       LEFT JOIN calls ON call_campaigns.id = calls.campaign_id
       WHERE status IN ('running', 'paused')
       GROUP BY call_campaigns.id
       ORDER BY started_at DESC LIMIT 5`,
      []
    );

    // Get recent calls
    const recentCallsResult = await db.query(
      `SELECT c.id, c.phone_number, c.status, c.duration_seconds, c.dialed_at, p.full_name as prospect_name
       FROM calls c
       LEFT JOIN people p ON c.prospect_id = p.id
       WHERE c.created_at >= $1 AND c.created_at <= $2
       ORDER BY c.created_at DESC
       LIMIT 10`,
      [startDate, endDate]
    );

    const response = {
      metrics: {
        calls_total: parseInt(metrics.calls_total) || 0,
        calls_completed: parseInt(metrics.calls_completed) || 0,
        calls_failed: parseInt(metrics.calls_failed) || 0,
        calls_pending: parseInt(metrics.calls_pending) || 0,
        success_rate: metrics.calls_total > 0 ? 
          ((parseInt(metrics.calls_completed) / parseInt(metrics.calls_total)) * 100).toFixed(2) : 0,
        avg_duration: metrics.avg_duration ? parseInt(metrics.avg_duration) : 0,
        last_call_at: metrics.last_call_at,
      },
      flagged_transcripts: parseInt(transcriptsResult.rows[0].flagged_count) || 0,
      opt_outs_today: parseInt(optOutsResult.rows[0].opt_outs_total) || 0,
      active_campaigns: campaignsResult.rows,
      recent_calls: recentCallsResult.rows,
    };

    return successResponse(res, response);
  } catch (err) {
    console.error('Get dashboard error:', err);
    return sendError(res, 'INTERNAL_ERROR', 'Failed to get dashboard metrics', {}, 500);
  }
}

export default {
  listCalls,
  createCall,
  getCallDetail,
  retryCall,
  bulkRetryCalls,
  getDashboard,
};
