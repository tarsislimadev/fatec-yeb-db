// Normalize phone number to E.164 format
// E.164 format: +[country code][phone number]
// Expected format for Brazil: +55 + area code (2) + phone number (8-9 digits)
export function normalizePhoneNumber(phoneNumber, countryCode = 'BR') {
  if (!phoneNumber || typeof phoneNumber !== 'string') {
    return null;
  }

  const cleaned = phoneNumber.trim();

  // If already in E.164 format, return as-is
  if (/^\+55\d{10,11}$/.test(cleaned)) {
    return cleaned;
  }

  // Remove common formatting characters
  let normalized = cleaned.replace(/\D/g, '');

  // Handle Brazil phone numbers
  if (countryCode === 'BR') {
    // If starts with 55 (country code), ensure it's +55 + area + number
    if (normalized.startsWith('55')) {
      normalized = '55' + normalized.slice(2);
    }

    // If 10-11 digits (area + number), add country code
    if (normalized.length === 10 || normalized.length === 11) {
      normalized = '55' + normalized;
    }

    // Format as E.164 if valid
    if (/^55\d{10,11}$/.test(normalized)) {
      return '+' + normalized;
    }
  }

  return null;
}

// Check if phone number is valid (E.164 format assumed)
export function isValidPhoneNumber(phoneNumber, countryCode = 'BR') {
  if (!phoneNumber || typeof phoneNumber !== 'string') {
    return false;
  }

  const cleaned = phoneNumber.trim();

  if (cleaned === '') {
    return false;
  }

  // For Brazil, check E.164 format: +55 + area code (2 digits) + number (8-9 digits)
  if (countryCode === 'BR') {
    return /^\+55\d{10,11}$/.test(cleaned);
  }

  // Generic E.164 validation
  return /^\+[1-9]\d{1,14}$/.test(cleaned);
}

// Validate and normalize phone number (legacy function, kept for compatibility)
export function validateAndNormalizePhone(phoneNumber, countryCode = 'BR') {
  try {
    const normalized = normalizePhoneNumber(phoneNumber, countryCode);
    
    if (!normalized) {
      return {
        valid: false,
        error: 'Invalid phone number format',
      };
    }

    return {
      valid: true,
      e164_number: normalized,
      country_code: 'BR',
      type: 'mobile', // simplified
    };
  } catch (err) {
    return {
      valid: false,
      error: 'Invalid phone number format',
    };
  }
}

// Check if phone number is valid (legacy function, kept for compatibility)
export function isValidPhone(phoneNumber, countryCode = 'BR') {
  return isValidPhoneNumber(phoneNumber, countryCode);
}
