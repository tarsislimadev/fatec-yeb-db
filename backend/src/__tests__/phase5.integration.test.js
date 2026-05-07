import { describe, test, expect } from '@jest/globals';
import { WebhookHandler } from '../services/WebhookHandler.js';

describe('Phase 5 core voice behaviors', () => {
  test('WebhookHandler maps Twilio statuses into internal call states', () => {
    const handler = new WebhookHandler();

    expect(handler.mapCallStatus('queued')).toBe('dialing');
    expect(handler.mapCallStatus('ringing')).toBe('dialing');
    expect(handler.mapCallStatus('in-progress')).toBe('in-progress');
    expect(handler.mapCallStatus('completed')).toBe('completed');
    expect(handler.mapCallStatus('no-answer')).toBe('failed');
    expect(handler.mapCallStatus('busy')).toBe('failed');
  });

  test('WebhookHandler maps outcome disposition from provider statuses', () => {
    const handler = new WebhookHandler();

    expect(handler.mapDisposition('completed')).toBe('answered');
    expect(handler.mapDisposition('no-answer')).toBe('no_answer');
    expect(handler.mapDisposition('busy')).toBe('busy');
    expect(handler.mapDisposition('canceled')).toBe('canceled');
    expect(handler.mapDisposition('failed')).toBe('failed');
  });

  test('Webhook URL points to Phase 5 event endpoint', () => {
    const handler = new WebhookHandler();
    const url = handler.getWebhookUrl('https://voice.example.com');

    expect(url).toBe('https://voice.example.com/api/v1/webhooks/calls/events');
  });
});
