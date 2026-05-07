/**
 * TelephonyProvider - Abstract base class for telephony providers
 * Defines the interface for outbound call management
 */

export class TelephonyProvider {
  /**
   * Initialize the provider with configuration
   * @param {Object} config - Provider configuration (API keys, phone numbers, etc.)
   */
  constructor(config) {
    this.config = config;
  }

  /**
   * Initiate an outbound call
   * @param {string} to - Destination phone number (E.164 format)
   * @param {string} from - Caller ID phone number (E.164 format)
   * @param {string} callbackUrl - Webhook URL for call events
   * @returns {Promise<string>} Provider call ID (e.g., Twilio CallSid)
   * @throws {Error} If call initiation fails
   */
  async initiateCall(to, from, callbackUrl) {
    throw new Error('initiateCall() must be implemented by subclass');
  }

  /**
   * Get current call status
   * @param {string} providerId - Provider call ID
   * @returns {Promise<Object>} Call status object {status, duration, direction, etc}
   * @throws {Error} If call lookup fails
   */
  async getCallStatus(providerId) {
    throw new Error('getCallStatus() must be implemented by subclass');
  }

  /**
   * Delete/cancel an outbound call
   * @param {string} providerId - Provider call ID
   * @returns {Promise<boolean>} True if call was deleted successfully
   * @throws {Error} If call deletion fails
   */
  async deleteCall(providerId) {
    throw new Error('deleteCall() must be implemented by subclass');
  }

  /**
   * Validate phone number format
   * @param {string} phoneNumber - Phone number to validate
   * @returns {Promise<boolean>} True if valid
   */
  async validatePhoneNumber(phoneNumber) {
    throw new Error('validatePhoneNumber() must be implemented by subclass');
  }

  /**
   * Get provider name
   * @returns {string} Provider identifier
   */
  getProviderName() {
    throw new Error('getProviderName() must be implemented by subclass');
  }
}

export default TelephonyProvider;
