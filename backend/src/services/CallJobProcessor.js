import Queue from 'bull';
import { EventEmitter } from 'events';
import { db } from '../db/index.js';

/**
 * CallJobProcessor - Processes outbound calls from job queue
 * Features:
 * - Async job processing with Redis queue (Bull)
 * - Exponential backoff retry (30s, 5m, 30m)
 * - Suppression + consent checks before dialing
 * - Dead-letter queue for failed calls
 * - Event emission for lifecycle events
 */

export class CallJobProcessor extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      queueName: config.queueName || 'call-jobs',
      redisUrl: config.redisUrl || process.env.REDIS_URL || 'redis://localhost:6379',
      maxRetries: config.maxRetries || 3,
      backoffDelays: config.backoffDelays || [30000, 300000, 1800000], // 30s, 5m, 30m
      concurrency: config.concurrency || 5,
      ...config,
    };

    this.queue = null;
    this.dlq = null; // Dead-letter queue
    this.telephonyProvider = null;
  }

  /**
   * Initialize the processor
   * @param {TelephonyProvider} provider - Telephony provider instance (e.g., TwilioAdapter)
   * @param {Object} options - Additional options
   */
  async initialize(provider, options = {}) {
    this.telephonyProvider = provider;

    // Create job queue
    this.queue = new Queue(this.config.queueName, this.config.redisUrl);
    this.dlq = new Queue(`${this.config.queueName}-dlq`, this.config.redisUrl);

    // Set up job event handlers
    this.queue.on('completed', (job) => this.handleJobCompleted(job));
    this.queue.on('failed', (job, err) => this.handleJobFailed(job, err));
    this.queue.on('error', (err) => this.handleQueueError(err));

    // Process jobs with specified concurrency
    await this.queue.process(this.config.concurrency, async (job) => {
      return await this.processJob(job);
    });

    console.log(`[CallJobProcessor] Initialized with ${this.config.concurrency} workers`);
    this.emit('initialized');
  }

  /**
   * Add a call job to the queue
   * @param {Object} jobData - Job data
   * @returns {Promise<Job>} Bull Job instance
   */
  async addJob(jobData) {
    if (!this.queue) {
      throw new Error('CallJobProcessor not initialized. Call initialize() first.');
    }

    const { campaignId, prospectId, phoneId, phoneNumber, scheduledAt } = jobData;

    if (!phoneId || !phoneNumber) {
      throw new Error('phoneId and phoneNumber are required');
    }

    const job = await this.queue.add(
      {
        campaignId,
        prospectId,
        phoneId,
        phoneNumber,
        scheduledAt: scheduledAt || new Date(),
      },
      {
        attempts: this.config.maxRetries,
        backoff: {
          type: 'fixed',
          delay: this.config.backoffDelays[0], // First delay
        },
        removeOnComplete: true,
        removeOnFail: false,
      }
    );

    console.log(`[CallJobProcessor] Added job ${job.id} for phone ${phoneNumber}`);
    this.emit('job:added', job.data);
    return job;
  }

  /**
   * Process a single call job
   * @param {Job} job - Bull job instance
   * @returns {Promise<Object>} Result object
   */
  async processJob(job) {
    const { campaignId, prospectId, phoneId, phoneNumber } = job.data;
    const callId = null;

    try {
      console.log(`[CallJobProcessor] Processing job ${job.id} for ${phoneNumber}`);

      // 1. Create call database record
      const callResult = await db.query(
        `INSERT INTO calls (campaign_id, prospect_id, phone_id, phone_number, status, scheduled_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         RETURNING id, phone_number, status`,
        [campaignId, prospectId, phoneId, phoneNumber, 'pending']
      );

      const call = callResult.rows[0];
      const currentCallId = call.id;

      // 2. Check compliance (suppression + consent)
      const compliance = await this.checkCompliance(phoneId);
      if (!compliance.allowed) {
        console.log(`[CallJobProcessor] Call skipped - compliance reason: ${compliance.reason}`);
        await db.query(
          `UPDATE calls SET status = $1, disposition = $2 WHERE id = $3`,
          ['skipped', compliance.reason, currentCallId]
        );
        this.emit('call:skipped_compliance', { callId: currentCallId, reason: compliance.reason });
        return { success: true, skipped: true, reason: compliance.reason };
      }

      // 3. Validate phone number format
      const isValid = await this.telephonyProvider.validatePhoneNumber(phoneNumber);
      if (!isValid) {
        throw new Error(`Invalid phone number format: ${phoneNumber}`);
      }

      // 4. Initiate call via provider
      const webhookUrl = process.env.WEBHOOK_URL || 'http://localhost:3000/api/v1/webhooks/calls/events';
      const providerId = await this.telephonyProvider.initiateCall(phoneNumber, null, webhookUrl);

      // 5. Update call record with provider ID and status
      await db.query(
        `UPDATE calls SET status = $1, dialed_at = NOW() WHERE id = $2`,
        ['dialing', currentCallId]
      );

      // 6. Create call session record
      await db.query(
        `INSERT INTO call_sessions (call_id, provider_id, provider_name, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())`,
        [currentCallId, providerId, this.telephonyProvider.getProviderName()]
      );

      console.log(`[CallJobProcessor] Call initiated: ${currentCallId} → ${providerId}`);
      this.emit('call:initiated', { callId: currentCallId, providerId, phoneNumber });
      
      return { success: true, callId: currentCallId, providerId };
    } catch (error) {
      console.error(`[CallJobProcessor] Job ${job.id} failed:`, error.message);

      // Log retry attempt
      if (callId) {
        const retryCount = job.attemptsMade;
        await db.query(
          `INSERT INTO call_retry_log (call_id, attempt_number, error_code, error_message, next_retry_at, created_at)
           VALUES ($1, $2, $3, $4, $5, NOW())`,
          [
            callId,
            retryCount,
            'CALL_INITIATION_FAILED',
            error.message,
            new Date(Date.now() + this.config.backoffDelays[Math.min(retryCount, this.config.backoffDelays.length - 1)]),
          ]
        );
      }

      // Move to dead-letter queue if max retries exceeded
      if (job.attemptsMade >= this.config.maxRetries) {
        await this.dlq.add(job.data, { attempts: 0 });
        this.emit('call:dead_letter', { jobId: job.id, error: error.message });
      }

      throw error;
    }
  }

  /**
   * Check compliance before calling
   * @param {UUID} phoneId - Phone ID
   * @returns {Promise<Object>} { allowed: boolean, reason?: string }
   */
  async checkCompliance(phoneId) {
    try {
      const result = await db.query(
        `SELECT suppression_status, suppression_reason, voice_suppressed_at, voice_suppression_reason,
                marketing_consent, transactional_consent
         FROM phones WHERE id = $1`,
        [phoneId]
      );

      if (result.rows.length === 0) {
        return { allowed: false, reason: 'phone_not_found' };
      }

      const phone = result.rows[0];

      // Check voice suppression
      if (phone.voice_suppressed_at) {
        return { allowed: false, reason: `voice_suppressed_${phone.voice_suppression_reason || 'unknown'}` };
      }

      // Check general suppression
      if (phone.suppression_status !== 'none') {
        return { allowed: false, reason: `suppressed_${phone.suppression_status}` };
      }

      // Check consent (at least one type of consent required for voice)
      if (phone.marketing_consent !== 'granted' && phone.transactional_consent !== 'granted') {
        return { allowed: false, reason: 'no_consent_granted' };
      }

      return { allowed: true };
    } catch (error) {
      console.error('[CallJobProcessor] Compliance check error:', error.message);
      return { allowed: false, reason: 'compliance_check_error' };
    }
  }

  /**
   * Handle job completion
   * @param {Job} job - Completed job
   */
  async handleJobCompleted(job) {
    console.log(`[CallJobProcessor] Job ${job.id} completed successfully`);
    this.emit('job:completed', job.data);
  }

  /**
   * Handle job failure
   * @param {Job} job - Failed job
   * @param {Error} error - Error that caused failure
   */
  async handleJobFailed(job, error) {
    console.error(`[CallJobProcessor] Job ${job.id} failed:`, error.message);
    this.emit('job:failed', { jobId: job.id, error: error.message, attempts: job.attemptsMade });
  }

  /**
   * Handle queue errors
   * @param {Error} error - Queue error
   */
  handleQueueError(error) {
    console.error('[CallJobProcessor] Queue error:', error.message);
    this.emit('error', error);
  }

  /**
   * Get queue statistics
   * @returns {Promise<Object>} Queue stats
   */
  async getQueueStats() {
    if (!this.queue) return null;

    const [counts, active, delayed, waiting] = await Promise.all([
      this.queue.getJobCounts(),
      this.queue.getActiveCount(),
      this.queue.getDelayedCount(),
      this.queue.getWaitingCount(),
    ]);

    return {
      total: counts.total,
      active,
      delayed,
      waiting,
      completed: counts.completed,
      failed: counts.failed,
    };
  }

  /**
   * Close the processor
   */
  async close() {
    if (this.queue) await this.queue.close();
    if (this.dlq) await this.dlq.close();
    console.log('[CallJobProcessor] Closed');
  }
}

export default CallJobProcessor;
