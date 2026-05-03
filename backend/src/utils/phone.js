import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js';

// Validate and normalize phone number
export function validateAndNormalizePhone(phoneNumber, countryCode = 'BR') {
  try {
    if (!/^\+[1-9]\d{1,14}$/.test(phoneNumber)) {
      return {
        valid: false,
        error: 'Phone number must be in E.164 format',
      };
    }

    const parsed = parsePhoneNumber(phoneNumber, countryCode);
    
    if (!parsed || !isValidPhoneNumber(phoneNumber, countryCode)) {
      return {
        valid: false,
        error: 'Invalid phone number format',
      };
    }

    return {
      valid: true,
      e164_number: parsed.format('E.164'),
      country_code: parsed.country,
      type: parsed.getType() || 'unknown',
    };
  } catch (err) {
    return {
      valid: false,
      error: 'Invalid phone number format',
    };
  }
}

// Check if phone number is valid
export function isValidPhone(phoneNumber, countryCode = 'BR') {
  return isValidPhoneNumber(phoneNumber, countryCode);
}
