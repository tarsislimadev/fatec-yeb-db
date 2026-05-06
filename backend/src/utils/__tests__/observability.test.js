import {
  getMetricsSnapshot,
  recordAuthFailure,
  recordDbCheck,
  recordReadinessCheck,
  recordRedisCheck,
  recordRequestFinish,
  recordRequestStart,
  recordThrottle,
  resetMetrics,
} from '../observability.js';

describe('observability metrics', () => {
  beforeEach(() => {
    resetMetrics();
  });

  test('tracks requests, failures, and throttles', () => {
    recordRequestStart();
    recordAuthFailure({ reason: 'invalid_password', email: 'user@example.com', ip: '127.0.0.1' });
    recordThrottle({ scope: 'auth', key: 'auth:127.0.0.1', retryAfterSeconds: 30 });
    recordRequestFinish({
      requestId: 'req-1',
      method: 'POST',
      path: '/api/v1/auth/signin',
      statusCode: 500,
      durationMs: 42,
    });

    const snapshot = getMetricsSnapshot();
    expect(snapshot.requests_total).toBe(1);
    expect(snapshot.auth_failures).toBe(1);
    expect(snapshot.throttled_requests).toBe(1);
    expect(snapshot.request_errors).toBe(1);
    expect(snapshot.last_request.request_id).toBe('req-1');
  });

  test('tracks readiness checks for database and redis', () => {
    recordDbCheck(true);
    recordRedisCheck(false, 'Redis unavailable');
    recordReadinessCheck({ service: 'overall', ok: false, error: 'dependency failure' });

    const snapshot = getMetricsSnapshot();
    expect(snapshot.db_checks).toBe(1);
    expect(snapshot.redis_failures).toBe(1);
    expect(snapshot.readiness_failures).toBe(1);
  });
});
