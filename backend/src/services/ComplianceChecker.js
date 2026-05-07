import { db } from '../db/index.js';

/**
 * ComplianceChecker - Validates compliance before call initiation
 * Features:
 * - Checks voice suppression status
 * - Validates consent levels
 * - Enforces TCPA rules
 * - Logs all compliance decisions
 */

export class ComplianceChecker {
  constructor(config = {}) {
    this.config = config;
  }

  /**
   * Check if a prospect can be called
   * @param {UUID} prospectId - Prospect/person ID
   * @param {UUID} phoneId - Phone number ID
   * @param {string} phoneNumber - Phone number (E.164)
   * @returns {Promise<Object>} { allowed: boolean, reason?: string, details?: string }
   */
  async canCallProspect(prospectId, phoneId, phoneNumber) {
    try {
      // 1. Get phone record
      const phoneResult = await db.query(
        `SELECT id, voice_suppressed_at, voice_suppression_reason,
                suppression_status, marketing_consent, transactional_consent
         FROM phones WHERE id = $1`,
        [phoneId]
      );

      if (phoneResult.rows.length === 0) {
        return { allowed: false, reason: 'phone_not_found' };
      }

      const phone = phoneResult.rows[0];

      // 2. Check voice-specific suppression
      if (phone.voice_suppressed_at) {
        return {
          allowed: false,
          reason: 'voice_suppressed',
          details: `Suppressed since ${phone.voice_suppressed_at} (${phone.voice_suppression_reason})`,
        };
      }

      // 3. Check general suppression
      if (phone.suppression_status && phone.suppression_status !== 'none') {
        return {
          allowed: false,
          reason: 'general_suppression',
          details: `Suppression status: ${phone.suppression_status}`,
        };
      }

      // 4. Check phone validity
      if (!this.isValidPhoneNumber(phoneNumber)) {
        return {
          allowed: false,
          reason: 'invalid_phone_number',
          details: `Phone number ${phoneNumber} is not in valid E.164 format`,
        };
      }

      // 5. Check consent (at least one type required)
      const hasConsent =
        phone.marketing_consent === 'granted' ||
        phone.transactional_consent === 'granted';

      if (!hasConsent) {
        return {
          allowed: false,
          reason: 'no_consent',
          details: 'Marketing and transactional consent not granted',
        };
      }

      // 6. All checks passed
      return { allowed: true };
    } catch (error) {
      console.error('[ComplianceChecker] Error checking compliance:', error.message);
      return {
        allowed: false,
        reason: 'compliance_check_error',
        details: error.message,
      };
    }
  }

  /**
   * Validate phone number format
   * @param {string} phoneNumber - Phone number
   * @returns {boolean} True if valid E.164 format
   */
  isValidPhoneNumber(phoneNumber) {
    if (!phoneNumber) return false;
    // E.164 format: +[country code][number] 10-15 digits
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    return e164Regex.test(phoneNumber);
  }

  /**
   * Log a compliance check decision
   * @param {UUID} phoneId - Phone ID
   * @param {string} decision - 'allowed' or 'blocked'
   * @param {string} reason - Reason code
   * @param {Object} details - Additional details
   */
  async logComplianceCheck(phoneId, decision, reason, details = {}) {
    try {
      await db.query(
        `INSERT INTO audit_log (phone_id, entity_type, action, details, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [
          phoneId,
          'phone',
          `compliance_check_${decision}`,
          JSON.stringify({
            reason,
            ...details,
            timestamp: new Date().toISOString(),
          }),
        ]
      );
    } catch (error) {
      console.error('[ComplianceChecker] Error logging compliance check:', error.message);
    }
  }

  /**
   * Grant consent for a phone number
   * @param {UUID} phoneId - Phone ID
   * @param {string} consentType - 'marketing' or 'transactional'
   * @returns {Promise<boolean>} Success
   */
  async grantConsent(phoneId, consentType = 'marketing') {
    try {
      if (!['marketing', 'transactional'].includes(consentType)) {
        throw new Error(`Invalid consent type: ${consentType}`);
      }

      const columnName = `${consentType}_consent`;
      await db.query(
        `UPDATE phones
         SET ${columnName} = 'granted',
             consent_recorded_at = NOW(),
             updated_at = NOW()
         WHERE id = $1`,
        [phoneId]
      );

      await this.logComplianceCheck(phoneId, 'allowed', 'consent_granted', { consentType });
      return true;
    } catch (error) {
      console.error('[ComplianceChecker] Error granting consent:', error.message);
      throw error;
    }
  }

  /**
   * Revoke consent for a phone number
   * @param {UUID} phoneId - Phone ID
   * @param {string} consentType - 'marketing' or 'transactional'
   * @returns {Promise<boolean>} Success
   */
  async revokeConsent(phoneId, consentType = 'marketing') {
    try {
      if (!['marketing', 'transactional'].includes(consentType)) {
        throw new Error(`Invalid consent type: ${consentType}`);
      }

      const columnName = `${consentType}_consent`;
      await db.query(
        `UPDATE phones
         SET ${columnName} = 'revoked',
             suppression_status = 'consent_revoked',
             suppression_updated_at = NOW(),
             updated_at = NOW()
         WHERE id = $1`,
        [phoneId]
      );

      await this.logComplianceCheck(phoneId, 'blocked', 'consent_revoked', { consentType });
      return true;
    } catch (error) {
      console.error('[ComplianceChecker] Error revoking consent:', error.message);
      throw error;
    }
  }
}

export default ComplianceChecker;
