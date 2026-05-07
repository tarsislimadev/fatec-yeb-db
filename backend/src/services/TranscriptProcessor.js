import { db } from '../db/index.js';
import { EventEmitter } from 'events';

/**
 * TranscriptProcessor - Processes call transcripts
 * Features:
 * - Stores transcripts with confidence scores
 * - Detects spoken opt-out keywords
 * - Flags low-confidence transcripts for manual review
 * - Auto-suppresses phone on opt-out detection
 */

export class TranscriptProcessor extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      lowConfidenceThreshold: config.lowConfidenceThreshold || 70,
      optOutKeywords: config.optOutKeywords || [
        'remove',
        'unsubscribe',
        'do not call',
        'don\'t call',
        'stop calling',
        'opt out',
        'opt-out',
        'not interested',
        'never call',
        'remove my number',
        'take me off',
      ],
      ...config,
    };
  }

  /**
   * Process a call transcript
   * @param {UUID} callId - Call ID
   * @param {string} rawText - Transcript text (from STT or manual entry)
   * @param {number} confidence - Confidence score (0-100)
   * @returns {Promise<Object>} Processing result
   */
  async processTranscript(callId, rawText, confidence = 0) {
    try {
      if (!callId || !rawText) {
        throw new Error('callId and rawText are required');
      }

      // 1. Get call and phone info
      const callResult = await db.query(
        `SELECT c.phone_id FROM calls c WHERE c.id = $1`,
        [callId]
      );

      if (callResult.rows.length === 0) {
        throw new Error(`Call not found: ${callId}`);
      }

      const phoneId = callResult.rows[0].phone_id;

      // 2. Detect opt-out keywords
      const { hasOptOut, keywords, optOutConfidence } = this.detectOptOut(rawText);

      // 3. Determine if transcript should be flagged for review
      const flagForReview = confidence < this.config.lowConfidenceThreshold || hasOptOut;

      // 4. Store transcript in database
      let status = 'pending';
      if (hasOptOut && confidence >= 80) {
        status = 'approved'; // High confidence opt-out auto-approved
      }

      const transcriptResult = await db.query(
        `INSERT INTO transcripts (call_id, raw_text, processed_text, confidence_score, status, flagged_for_review, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         RETURNING id`,
        [callId, rawText, rawText, confidence, status, flagForReview]
      );

      const transcriptId = transcriptResult.rows[0].id;
      console.log(`[TranscriptProcessor] Stored transcript ${transcriptId} for call ${callId}`);

      // 5. If opt-out detected, suppress phone immediately
      if (hasOptOut) {
        await this.suppressPhoneOnOptOut(phoneId, keywords, optOutConfidence);
      }

      const result = {
        transcriptId,
        rawText,
        confidence,
        flagForReview,
        optOutDetected: hasOptOut,
        optOutKeywords: keywords,
        optOutConfidence,
      };

      this.emit('transcript:processed', result);

      if (hasOptOut) {
        this.emit('transcript:opt_out_detected', { transcriptId, phoneId, keywords });
      }

      if (flagForReview) {
        this.emit('transcript:flagged_for_review', { transcriptId, reason: hasOptOut ? 'opt_out_detected' : 'low_confidence' });
      }

      return result;
    } catch (error) {
      console.error('[TranscriptProcessor] Error processing transcript:', error.message);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Detect spoken opt-out keywords in transcript
   * @param {string} text - Transcript text
   * @returns {Object} { hasOptOut, keywords, optOutConfidence }
   */
  detectOptOut(text) {
    const lowerText = text.toLowerCase();
    const foundKeywords = [];
    let maxConfidence = 0;

    for (const keyword of this.config.optOutKeywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        foundKeywords.push(keyword);
        // Higher confidence for longer keywords (more specific)
        const confidence = Math.min(100, 50 + (keyword.length * 2));
        maxConfidence = Math.max(maxConfidence, confidence);
      }
    }

    return {
      hasOptOut: foundKeywords.length > 0,
      keywords: foundKeywords,
      optOutConfidence: foundKeywords.length > 0 ? Math.min(100, maxConfidence) : 0,
    };
  }

  /**
   * Suppress phone on spoken opt-out
   * @param {UUID} phoneId - Phone ID
   * @param {Array<string>} keywords - Opt-out keywords detected
   * @param {number} confidence - Opt-out confidence score
   */
  async suppressPhoneOnOptOut(phoneId, keywords, confidence) {
    try {
      await db.query('BEGIN');

      try {
        // Update phone suppression
        await db.query(
          `UPDATE phones
           SET voice_suppressed_at = NOW(),
               voice_suppression_reason = $1,
               suppression_status = $2,
               suppression_reason = $3,
               suppression_updated_at = NOW(),
               updated_at = NOW()
           WHERE id = $4`,
          [
            'opted_out_spoken',
            'opted_out',
            `Spoken opt-out detected: ${keywords.join(', ')} (confidence: ${confidence}%)`,
            phoneId,
          ]
        );

        // Add audit log
        await db.query(
          `INSERT INTO audit_log (phone_id, entity_type, action, details, created_at)
           VALUES ($1, $2, $3, $4, NOW())`,
          [
            phoneId,
            'phone',
            'voice_suppression_auto',
            JSON.stringify({
              reason: 'spoken_opt_out',
              keywords,
              confidence,
              timestamp: new Date().toISOString(),
            }),
          ]
        );

        await db.query('COMMIT');
        console.log(`[TranscriptProcessor] Suppressed phone ${phoneId} due to spoken opt-out`);
        this.emit('phone:voice_suppressed', { phoneId, keywords, confidence });
      } catch (error) {
        await db.query('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error('[TranscriptProcessor] Error suppressing phone:', error.message);
      throw error;
    }
  }

  /**
   * Review and approve/reject a transcript
   * @param {UUID} transcriptId - Transcript ID
   * @param {string} action - 'approve', 'reject', or 'confirm_opt_out'
   * @param {string} notes - Review notes
   * @param {UUID} reviewedBy - User ID of reviewer
   * @returns {Promise<Object>} Updated transcript
   */
  async reviewTranscript(transcriptId, action, notes, reviewedBy) {
    try {
      const validActions = ['approve', 'reject', 'confirm_opt_out'];
      if (!validActions.includes(action)) {
        throw new Error(`Invalid action: ${action}. Must be one of: ${validActions.join(', ')}`);
      }

      let status = action === 'approve' ? 'approved' : 'rejected';
      if (action === 'confirm_opt_out') {
        status = 'approved'; // Confirmed opt-outs are marked approved
      }

      const result = await db.query(
        `UPDATE transcripts
         SET status = $1,
             flagged_for_review = FALSE,
             review_notes = $2,
             reviewed_at = NOW(),
             reviewed_by = $3,
             updated_at = NOW()
         WHERE id = $4
         RETURNING id, call_id, status`,
        [status, notes, reviewedBy, transcriptId]
      );

      if (result.rows.length === 0) {
        throw new Error(`Transcript not found: ${transcriptId}`);
      }

      const transcript = result.rows[0];

      // If confirm opt-out, suppress the phone
      if (action === 'confirm_opt_out') {
        const callResult = await db.query(
          `SELECT phone_id FROM calls WHERE id = $1`,
          [transcript.call_id]
        );
        if (callResult.rows.length > 0) {
          await this.suppressPhoneOnOptOut(
            callResult.rows[0].phone_id,
            ['manual_confirmation'],
            100
          );
        }
      }

      console.log(`[TranscriptProcessor] Reviewed transcript ${transcriptId}: ${action}`);
      this.emit('transcript:reviewed', { transcriptId, action, status });

      return transcript;
    } catch (error) {
      console.error('[TranscriptProcessor] Error reviewing transcript:', error.message);
      throw error;
    }
  }

  /**
   * Get flagged transcripts for review
   * @param {Object} options - Filter options { limit, offset, callId, status }
   * @returns {Promise<Array>} List of flagged transcripts
   */
  async getFlaggedTranscripts(options = {}) {
    const { limit = 20, offset = 0, callId = null, status = 'pending' } = options;

    let query = `
      SELECT t.id, t.call_id, t.raw_text, t.confidence_score, t.flagged_for_review,
             c.phone_number, c.dialed_at, c.duration_seconds
      FROM transcripts t
      JOIN calls c ON t.call_id = c.id
      WHERE t.flagged_for_review = TRUE
    `;
    const params = [];

    if (callId) {
      query += ` AND t.call_id = $${params.length + 1}`;
      params.push(callId);
    }

    if (status) {
      query += ` AND t.status = $${params.length + 1}`;
      params.push(status);
    }

    query += ` ORDER BY t.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await db.query(query, params);
    return result.rows;
  }
}

export default TranscriptProcessor;
