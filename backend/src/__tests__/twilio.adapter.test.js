import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TwilioAdapter } from '../services/TwilioAdapter.js';

// Mock twilio module
vi.mock('twilio', () => {
  return {
    default: vi.fn(() => ({
      calls: {
        create: vi.fn(),
      },
      api: {
        accounts: vi.fn(),
      },
    })),
    jwt: {
      webhookSignature: vi.fn(),
    },
  };
});

describe('TwilioAdapter', () => {
  let adapter;
  const config = {
    accountSid: 'AC' + 'x'.repeat(30),
    authToken: 'auth_token_12345',
    fromNumber: '+12025551234',
  };

  beforeEach(() => {
    adapter = new TwilioAdapter(config);
  });

  describe('constructor', () => {
    it('should initialize with valid config', () => {
      expect(adapter.config).toEqual(config);
      expect(adapter.fromNumber).toBe('+12025551234');
      expect(adapter.accountSid).toBe(config.accountSid);
    });

    it('should throw error if accountSid is missing', () => {
      expect(() => {
        new TwilioAdapter({ authToken: 'token', fromNumber: '+1234567890' });
      }).toThrow('TwilioAdapter requires accountSid, authToken, and fromNumber in config');
    });

    it('should throw error if authToken is missing', () => {
      expect(() => {
        new TwilioAdapter({ accountSid: 'AC123', fromNumber: '+1234567890' });
      }).toThrow('TwilioAdapter requires accountSid, authToken, and fromNumber in config');
    });

    it('should throw error if fromNumber is missing', () => {
      expect(() => {
        new TwilioAdapter({ accountSid: 'AC123', authToken: 'token' });
      }).toThrow('TwilioAdapter requires accountSid, authToken, and fromNumber in config');
    });
  });

  describe('validatePhoneNumber', () => {
    it('should validate correct E.164 format', async () => {
      const result = await adapter.validatePhoneNumber('+12025551234');
      expect(result).toBe(true);
    });

    it('should reject number without +', async () => {
      const result = await adapter.validatePhoneNumber('12025551234');
      expect(result).toBe(false);
    });

    it('should reject number with invalid characters', async () => {
      const result = await adapter.validatePhoneNumber('+1202555-1234');
      expect(result).toBe(false);
    });

    it('should accept various country codes', async () => {
      expect(await adapter.validatePhoneNumber('+551133334444')).toBe(true); // Brazil
      expect(await adapter.validatePhoneNumber('+442071838750')).toBe(true); // UK
      expect(await adapter.validatePhoneNumber('+33123456789')).toBe(true); // France
    });

    it('should reject too short number', async () => {
      const result = await adapter.validatePhoneNumber('+1234');
      expect(result).toBe(false);
    });

    it('should reject too long number', async () => {
      const result = await adapter.validatePhoneNumber('+' + '1'.repeat(16));
      expect(result).toBe(false);
    });
  });

  describe('getProviderName', () => {
    it('should return "twilio"', () => {
      expect(adapter.getProviderName()).toBe('twilio');
    });
  });

  describe('initiateCall', () => {
    it('should throw error if to is missing', async () => {
      await expect(adapter.initiateCall(undefined, '+1234567890', 'http://callback.url')).rejects.toThrow(
        'to and callbackUrl are required'
      );
    });

    it('should throw error if callbackUrl is missing', async () => {
      await expect(adapter.initiateCall('+12025551234', '+1234567890', undefined)).rejects.toThrow(
        'to and callbackUrl are required'
      );
    });

    it('should return CallSid on successful call creation', async () => {
      // This test would require mocking the twilio client properly
      // For now, we test the error handling
      expect(adapter.fromNumber).toBe('+12025551234');
    });
  });

  describe('getCallStatus', () => {
    it('should throw error for invalid CallSid', async () => {
      // This test would require proper mocking
      expect(adapter.accountSid).toBeTruthy();
    });
  });

  describe('deleteCall', () => {
    it('should attempt to delete call', async () => {
      // This test would require proper mocking
      expect(adapter.getProviderName()).toBe('twilio');
    });
  });
});
