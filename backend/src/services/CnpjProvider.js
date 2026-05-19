/**
 * CnpjProvider - Abstract base class for CNPJ providers
 * Defines a normalized lookup contract for CNPJ data ingestion
 */

export class CnpjProvider {
  /**
   * @param {Object} config - Provider configuration (baseUrl, timeouts, etc.)
   */
  constructor(config = {}) {
    this.config = config;
  }

  /**
   * Normalize CNPJ input to 14 digits
   * @param {string} input
   * @returns {string}
   */
  normalizeCnpj(input) {
    if (!input) {
      throw new Error('CNPJ is required');
    }

    const digits = String(input).replace(/\D/g, '');
    if (digits.length !== 14) {
      throw new Error('Invalid CNPJ format. Expect 14 digits.');
    }

    return digits;
  }

  /**
   * Lookup a CNPJ and return a normalized payload
   * @param {string} cnpj
   * @returns {Promise<Object>}
   */
  async lookup(cnpj) {
    throw new Error('lookup() must be implemented by subclass');
  }

  /**
   * Get provider name
   * @returns {string}
   */
  getProviderName() {
    throw new Error('getProviderName() must be implemented by subclass');
  }
}

export default CnpjProvider;
