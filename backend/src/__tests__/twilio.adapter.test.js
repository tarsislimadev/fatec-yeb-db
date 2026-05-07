import { describe, test, expect } from '@jest/globals';
import { TwilioAdapter } from '../services/TwilioAdapter.js';

describe('TwilioAdapter', () => {
  const validConfig = {
    accountSid: 'AC' + '1'.repeat(32),
    authToken: 'auth_token_12345',
    fromNumber: '+12025551234',
  };

  test('constructor validates required config', () => {
    expect(() => new TwilioAdapter(validConfig)).not.toThrow();
    expect(() => new TwilioAdapter({ authToken: 'x', fromNumber: '+12025551234' })).toThrow(
      'TwilioAdapter requires accountSid, authToken, and fromNumber in config'
    );
  });

  test('validatePhoneNumber enforces E.164 format', async () => {
    const adapter = new TwilioAdapter(validConfig);

    await expect(adapter.validatePhoneNumber('+551133334444')).resolves.toBe(true);
    await expect(adapter.validatePhoneNumber('551133334444')).resolves.toBe(false);
    await expect(adapter.validatePhoneNumber('+12-34')).resolves.toBe(false);
  });

  test('getProviderName returns twilio', () => {
    const adapter = new TwilioAdapter(validConfig);
    expect(adapter.getProviderName()).toBe('twilio');
  });

  test('validateWebhookSignature returns false for invalid signature', () => {
    const adapter = new TwilioAdapter(validConfig);
    const isValid = adapter.validateWebhookSignature(
      'https://example.com/api/v1/webhooks/calls/events',
      { CallSid: 'CA123' },
      'invalid-signature'
    );

    expect(isValid).toBe(false);
  });
});
