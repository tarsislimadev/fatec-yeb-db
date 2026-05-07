import { db } from '../db/index.js';
import { EventEmitter } from 'events';

/**
 * WebhookHandler - Processes call events from telephony provider
 * Features:
 * - Receives and validates webhook signatures
 * - Idempotent event processing
 * - Updates call state based on provider events
 * - Triggers transcript processing on call completion
 */

export class WebhookHandler extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = config;
  }

  /**
   * Handle incoming webhook event
   * @param {string} xTwilioSignature - X-Twilio-Signature header
   * @param {string} requestUrl - Full request URL with query params
   * @param {Object} body - POST body params
   * @param {TwilioAdapter} provider - Twilio provider instance
   * @returns {Promise<Object>} Result object
   */
  async handleWebhookEvent(xTwilioSignature, requestUrl, body, provider) {
    try {
      // 1. Validate webhook signature
      const isValid = this.validateSignature(xTwilioSignature, requestUrl, body, provider);
      if (!isValid) {
        console.warn('[WebhookHandler] Invalid webhook signature');
        return { success: false, error: 'Invalid signature', status: 403 };
      }

      // 2. Extract event data
      const { CallSid, CallStatus, RecordingUrl, CallDuration, Digits } = body;
      
      if (!CallSid) {
        console.warn('[WebhookHandler] Missing CallSid in webhook');
        return { success: false, error: 'Missing CallSid', status: 400 };
      }

      // 3. Find call by provider ID (idempotency - use unique constraint)
      const callResult = await db.query(
        `SELECT c.id, c.status FROM calls c
         JOIN call_sessions cs ON c.id = cs.call_id
         WHERE cs.provider_id = $1`,
        [CallSid]
      );

      if (callResult.rows.length === 0) {
        console.warn(`[WebhookHandler] Call not found for provider ID ${CallSid}`);
        // Still return 200 OK to acknowledge receipt
        return { success: false, error: 'Call not found', status: 404, acknowledged: true };
      }

      const call = callResult.rows[0];
      const callId = call.id;

      // 4. Map Twilio call status to our enum
      const mappedStatus = this.mapCallStatus(CallStatus);

      // 5. Update call and session atomically
      await db.query('BEGIN');
      
      try {
        // Update call record
        await db.query(
          `UPDATE calls 
           SET status = $1, 
               duration_seconds = $2,
               updated_at = NOW()
           WHERE id = $3`,
          [mappedStatus, CallDuration || 0, callId]
        );

        // Update call session with webhook data and recording
        await db.query(
          `UPDATE call_sessions
           SET webhook_data = $1,
               recording_url = $2,
               call_duration_seconds = $3,
               updated_at = NOW()
           WHERE call_id = $4`,
          [
            JSON.stringify(body),
            RecordingUrl || null,
            CallDuration || 0,
            callId,
          ]
        );

        // Store call outcome
        if (mappedStatus === 'completed' || mappedStatus === 'failed') {
          const outcomeResult = await db.query(
            `INSERT INTO call_outcomes (call_id, disposition, notes, created_at)
             VALUES ($1, $2, $3, NOW())
             RETURNING id`,
            [callId, this.mapDisposition(CallStatus, Digits), JSON.stringify({ CallStatus, Digits })]
          );

          if (outcomeResult.rows.length > 0) {
            console.log(`[WebhookHandler] Created call outcome for ${callId}`);
          }
        }

        await db.query('COMMIT');
        
        console.log(`[WebhookHandler] Updated call ${callId}: ${CallStatus} → ${mappedStatus}`);
        this.emit('call:updated', { callId, status: mappedStatus, providerId: CallSid });

        // 6. Trigger transcript processing if recording available
        if (RecordingUrl && (mappedStatus === 'completed' || mappedStatus === 'failed')) {
          this.emit('transcript:process_requested', { callId, recordingUrl: RecordingUrl });
        }

        return { success: true, callId, status: mappedStatus };
      } catch (error) {
        await db.query('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error('[WebhookHandler] Error processing webhook:', error.message);
      this.emit('error', error);
      return { success: false, error: error.message, status: 500 };
    }
  }

  /**
   * Validate webhook signature using provider
   * @param {string} signature - X-Twilio-Signature header
   * @param {string} url - Request URL
   * @param {Object} params - POST params
   * @param {TwilioAdapter} provider - Provider instance with validateWebhookSignature method
   * @returns {boolean} True if signature is valid
   */
  validateSignature(signature, url, params, provider) {
    try {
      if (!provider.validateWebhookSignature) {
        console.warn('[WebhookHandler] Provider does not support signature validation');
        return true; // In dev/test, allow unsigned webhooks
      }

      return provider.validateWebhookSignature(url, params, signature);
    } catch (error) {
      console.error('[WebhookHandler] Signature validation error:', error.message);
      return false;
    }
  }

  /**
   * Map Twilio call status to internal enum
   * @param {string} twilioStatus - Twilio status (queued, ringing, in-progress, completed, busy, no-answer, failed, canceled)
   * @returns {string} Internal status (pending, dialing, in-progress, completed, failed, skipped)
   */
  mapCallStatus(twilioStatus) {
    const statusMap = {
      'queued': 'dialing',
      'ringing': 'dialing',
      'in-progress': 'in-progress',
      'completed': 'completed',
      'failed': 'failed',
      'busy': 'failed',
      'no-answer': 'failed',
      'canceled': 'failed',
    };
    return statusMap[twilioStatus] || 'completed';
  }

  /**
   * Map Twilio disposition to outcome
   * @param {string} callStatus - Twilio call status
   * @param {string} digits - DTMF digits captured (if any)
   * @returns {string} Disposition
   */
  mapDisposition(callStatus, digits) {
    if (callStatus === 'completed') return 'answered';
    if (callStatus === 'no-answer') return 'no_answer';
    if (callStatus === 'busy') return 'busy';
    if (callStatus === 'canceled') return 'canceled';
    return 'failed';
  }

  /**
   * Get webhook URL for configuration
   * @param {string} baseUrl - Base URL of the application
   * @returns {string} Full webhook URL
   */
  getWebhookUrl(baseUrl = '') {
    const base = baseUrl || (process.env.WEBHOOK_BASE_URL || 'http://localhost:3000');
    return `${base}/api/v1/webhooks/calls/events`;
  }
}

export default WebhookHandler;
