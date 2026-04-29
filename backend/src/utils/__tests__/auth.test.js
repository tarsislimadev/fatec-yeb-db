import * as authUtils from '../auth.js';

describe('Auth Utilities', () => {
  describe('Password Validation', () => {
    test('validates strong password', () => {
      expect(authUtils.isValidPassword('TestPassword123!')).toBe(true);
    });

    test('rejects short password', () => {
      expect(authUtils.isValidPassword('Test123!')).toBe(false);
    });

    test('rejects password without uppercase', () => {
      expect(authUtils.isValidPassword('testpassword123!')).toBe(false);
    });

    test('rejects password without number', () => {
      expect(authUtils.isValidPassword('TestPassword!')).toBe(false);
    });

    test('rejects password without special char', () => {
      expect(authUtils.isValidPassword('TestPassword123')).toBe(false);
    });

    test('accepts 8-char password with all requirements', () => {
      expect(authUtils.isValidPassword('Test1234!')).toBe(true);
    });
  });

  describe('JWT Token Generation', () => {
    test('generates valid JWT token', () => {
      const token = authUtils.generateToken({ id: '123', email: 'test@example.com' });
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    test('token contains payload', () => {
      const userId = '123';
      const token = authUtils.generateToken({ id: userId });
      const decoded = authUtils.verifyToken(token);
      expect(decoded.id).toBe(userId);
    });
  });

  describe('Token Verification', () => {
    test('verifies valid token', () => {
      const payload = { id: '123', email: 'test@example.com' };
      const token = authUtils.generateToken(payload);
      const decoded = authUtils.verifyToken(token);
      expect(decoded.id).toBe(payload.id);
      expect(decoded.email).toBe(payload.email);
    });

    test('rejects invalid token', () => {
      expect(() => authUtils.verifyToken('invalid.token.here')).toThrow();
    });

    test('rejects malformed token', () => {
      expect(() => authUtils.verifyToken('notatoken')).toThrow();
    });
  });
});
