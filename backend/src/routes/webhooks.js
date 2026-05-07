import express from 'express';
import { db } from '../db/index.js';
import { WebhookHandler } from '../services/WebhookHandler.js';
import { TwilioAdapter } from '../services/TwilioAdapter.js';
import { sendError, successResponse } from '../utils/response.js';

const router = express.Router();

// Initialize services (will be set by server.js)
let webhookHandler = null;
let twilioAdapter = null;

// Set services helper
export function setWebhookServices(handler, adapter) {
  webhookHandler = handler;
  twilioAdapter = adapter;
}

/**
 * POST /api/v1/webhooks/calls/events
 * Receive call status callbacks from Twilio
 * Public endpoint (no auth required - validate via signature)
 */
router.post('/calls/events', async (req, res) => {
  try {
    // Get Twilio signature from headers
    const xTwilioSignature = req.headers['x-twilio-signature'] || '';
    
    // Get full request URL with query parameters
    const requestUrl = `${process.env.WEBHOOK_URL || 'http://localhost:3000'}${req.originalUrl}`;

    if (!webhookHandler || !twilioAdapter) {
      console.error('[WebhookRoute] Services not initialized');
      return sendError(res, 'SERVICE_UNAVAILABLE', 'Webhook service not available', {}, 503);
    }

    // Handle webhook event
    const result = await webhookHandler.handleWebhookEvent(
      xTwilioSignature,
      requestUrl,
      req.body,
      twilioAdapter
    );

    // Always return 200 OK to prevent Twilio from retrying
    if (result.success) {
      return successResponse(res, { acknowledged: true, callId: result.callId });
    } else {
      // Log the error but still return 200 OK
      console.warn(`[WebhookRoute] Webhook processing error: ${result.error}`, { status: result.status });
      return successResponse(res, { acknowledged: true, error: result.error }, {}, 200);
    }
  } catch (error) {
    console.error('[WebhookRoute] Webhook error:', error.message);
    // Always return 200 OK even on errors - don't let Twilio retry
    return successResponse(res, { acknowledged: true, error: error.message }, {}, 200);
  }
});

/**
 * Health check endpoint for webhook deliverability
 * GET /api/v1/webhooks/health
 */
router.get('/health', (req, res) => {
  return successResponse(res, { status: 'healthy', service: 'webhook' });
});

export default router;
