import { normalizePhoneNumber, isValidPhoneNumber } from '../phone.js';

describe('Phone Utilities', () => {
  describe('normalizePhoneNumber', () => {
    test('converts Brazil mobile with area code', () => {
      const result = normalizePhoneNumber('(11) 99988-8877', 'BR');
      expect(result).toBe('+5511999888877');
    });

    test('converts Brazil landline', () => {
      const result = normalizePhoneNumber('(11) 3456-7890', 'BR');
      expect(result).toBe('+551134567890');
    });

    test('handles phone with mixed formatting', () => {
      const result = normalizePhoneNumber('11 99988-8877', 'BR');
      expect(result).toBe('+5511999888877');
    });

    test('returns null for invalid phone', () => {
      const result = normalizePhoneNumber('invalid', 'BR');
      expect(result).toBeNull();
    });

    test('handles international format', () => {
      const result = normalizePhoneNumber('+5511999888877', 'BR');
      expect(result).toBe('+5511999888877');
    });
  });

  describe('isValidPhoneNumber', () => {
    test('validates correct Brazil mobile', () => {
      expect(isValidPhoneNumber('+5511999888877')).toBe(true);
    });

    test('validates correct Brazil landline', () => {
      expect(isValidPhoneNumber('+551134567890')).toBe(true);
    });

    test('rejects invalid format', () => {
      expect(isValidPhoneNumber('invalid')).toBe(false);
    });

    test('rejects empty string', () => {
      expect(isValidPhoneNumber('')).toBe(false);
    });

    test('rejects null', () => {
      expect(isValidPhoneNumber(null)).toBe(false);
    });
  });
});
