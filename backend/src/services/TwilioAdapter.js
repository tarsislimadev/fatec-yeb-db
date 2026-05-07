import twilio from 'twilio';
import TelephonyProvider from './TelephonyProvider.js';

/**
 * TwilioAdapter - Twilio.com telephony provider implementation
 * Handles outbound voice calls via Twilio API
 */

export class TwilioAdapter extends TelephonyProvider {
  constructor(config) {
    super(config);
    
    const { accountSid, authToken, fromNumber } = config;
    
    if (!accountSid || !authToken || !fromNumber) {
      throw new Error('TwilioAdapter requires accountSid, authToken, and fromNumber in config');
    }
    
    this.client = twilio(accountSid, authToken);
    this.fromNumber = fromNumber;
    this.accountSid = accountSid;
  }

  /**
   * Initiate an outbound call
   * @param {string} to - Destination phone number (E.164 format)
   * @param {string} from - Caller ID (ignored - uses configured fromNumber)
   * @param {string} callbackUrl - Webhook URL for call events (StatusCallback)
   * @returns {Promise<string>} Twilio CallSid
   */
  async initiateCall(to, from, callbackUrl) {
    try {
      if (!to || !callbackUrl) {
        throw new Error('to and callbackUrl are required');
      }

      const call = await this.client.calls.create({
        to,
        from: this.fromNumber,
        url: callbackUrl, // TwiML URL or callback
        statusCallback: callbackUrl,
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
        statusCallbackMethod: 'POST',
        timeout: 30,
        record: false, // Recording disabled by default; set in config if needed
      });

      console.log(`[Twilio] Created call ${call.sid} to ${to}`);
      return call.sid;
    } catch (error) {
      console.error(`[Twilio] Failed to initiate call to ${to}:`, error.message);
      throw new Error(`Twilio call initiation failed: ${error.message}`);
    }
  }

  /**
   * Get current call status
   * @param {string} providerId - Twilio CallSid
   * @returns {Promise<Object>} Call status object
   */
  async getCallStatus(providerId) {
    try {
      const call = await this.client.calls(providerId).fetch();

      return {
        status: call.status, // 'queued', 'ringing', 'in-progress', 'completed', 'failed', 'busy', 'no-answer', 'canceled'
        direction: call.direction, // 'inbound' or 'outbound-api'
        duration: call.duration ? parseInt(call.duration) : 0,
        startTime: call.startTime,
        endTime: call.endTime,
        to: call.to,
        from: call.from,
        sid: call.sid,
        price: call.price,
        priceUnit: call.priceUnit,
      };
    } catch (error) {
      console.error(`[Twilio] Failed to get call status for ${providerId}:`, error.message);
      throw new Error(`Unable to fetch call status: ${error.message}`);
    }
  }

  /**
   * Delete/cancel a call
   * @param {string} providerId - Twilio CallSid
   * @returns {Promise<boolean>} True if successful
   */
  async deleteCall(providerId) {
    try {
      const call = await this.client.calls(providerId).update({
        status: 'completed',
      });

      console.log(`[Twilio] Deleted call ${providerId}`);
      return true;
    } catch (error) {
      console.error(`[Twilio] Failed to delete call ${providerId}:`, error.message);
      // Don't throw - call may already be completed
      return false;
    }
  }

  /**
   * Validate phone number format
   * @param {string} phoneNumber - Phone number in E.164 format
   * @returns {Promise<boolean>} True if valid
   */
  async validatePhoneNumber(phoneNumber) {
    try {
      // Twilio format validation: must start with + and be 10-15 digits
      const e164Regex = /^\+[1-9]\d{1,14}$/;
      return e164Regex.test(phoneNumber);
    } catch (error) {
      console.error('[Twilio] Phone number validation error:', error.message);
      return false;
    }
  }

  /**
   * Verify webhook signature
   * @param {string} url - Request URL (with query params)
   * @param {Object} params - POST params or query params
   * @param {string} signature - X-Twilio-Signature header value
   * @returns {boolean} True if signature is valid
   */
  validateWebhookSignature(url, params, signature) {
    try {
      const cryptoUtil = twilio.jwt;
      // Twilio validation util method
      const calculated = cryptoUtil.webhookSignature(
        this.config.authToken,
        url,
        params
      );
      return calculated === signature;
    } catch (error) {
      console.error('[Twilio] Webhook signature validation error:', error.message);
      return false;
    }
  }

  /**
   * Get provider name
   * @returns {string} 'twilio'
   */
  getProviderName() {
    return 'twilio';
  }

  /**
   * Get account info
   * @returns {Promise<Object>} Account details
   */
  async getAccountInfo() {
    try {
      const account = await this.client.api.accounts(this.accountSid).fetch();
      return {
        accountSid: account.sid,
        friendlyName: account.friendlyName,
        status: account.status,
        dateCreated: account.dateCreated,
      };
    } catch (error) {
      console.error('[Twilio] Failed to fetch account info:', error.message);
      throw error;
    }
  }
}

export default TwilioAdapter;
