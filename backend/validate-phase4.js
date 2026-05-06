#!/usr/bin/env node

/**
 * Phase 4 Backend Validation Script
 * Validates production-readiness modules can be imported and used correctly
 */

import {
  emitStructuredLog,
  recordRequestStart,
  recordRequestFinish,
  recordAuthFailure,
  recordThrottle,
  recordReadinessCheck,
  recordDbCheck,
  recordRedisCheck,
  getMetricsSnapshot,
  resetMetrics,
} from './src/utils/observability.js';

import {
  createRateLimiter,
  createReadinessHandler,
  requestContextMiddleware,
  securityHeadersMiddleware,
  createHealthHandler,
  metricsHandler,
  authRateLimiter,
  writeRateLimiter,
} from './src/middleware/production.js';

import { sendError, errorResponse } from './src/utils/response.js';

let passCount = 0;
let failCount = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passCount++;
  } catch (err) {
    console.error(`✗ ${name}: ${err.message}`);
    failCount++;
  }
}

console.log('\n=== Phase 4 Backend Validation ===\n');

// Test observability module
console.log('Testing observability module...');
test('resetMetrics clears metrics', () => {
  resetMetrics();
  const snapshot = getMetricsSnapshot();
  if (snapshot.requests_total !== 0) throw new Error('Metrics not reset');
});

test('recordRequestStart increments request count', () => {
  resetMetrics();
  recordRequestStart();
  const snapshot = getMetricsSnapshot();
  if (snapshot.requests_total !== 1) throw new Error('Request not counted');
  if (snapshot.active_requests !== 1) throw new Error('Active request not tracked');
});

test('recordRequestFinish decrements active requests', () => {
  resetMetrics();
  recordRequestStart();
  recordRequestFinish({
    requestId: 'test-1',
    method: 'GET',
    path: '/health',
    statusCode: 200,
    durationMs: 10,
  });
  const snapshot = getMetricsSnapshot();
  if (snapshot.active_requests !== 0) throw new Error('Active request not decremented');
  if (!snapshot.last_request) throw new Error('Last request not recorded');
});

test('recordAuthFailure tracks auth failures', () => {
  resetMetrics();
  recordAuthFailure({ reason: 'wrong_password', email: 'user@example.com', ip: '127.0.0.1' });
  const snapshot = getMetricsSnapshot();
  if (snapshot.auth_failures !== 1) throw new Error('Auth failure not counted');
  if (!snapshot.last_error) throw new Error('Last error not recorded');
});

test('recordThrottle tracks throttled requests', () => {
  resetMetrics();
  recordThrottle({ scope: 'auth', key: 'auth:127.0.0.1', retryAfterSeconds: 30 });
  const snapshot = getMetricsSnapshot();
  if (snapshot.throttled_requests !== 1) throw new Error('Throttle not counted');
});

test('recordDbCheck tracks database checks', () => {
  resetMetrics();
  recordDbCheck(true);
  const snapshot = getMetricsSnapshot();
  if (snapshot.db_checks !== 1) throw new Error('DB check not counted');
  if (snapshot.db_failures !== 0) throw new Error('DB failure incorrectly counted');
});

test('recordRedisCheck tracks redis checks', () => {
  resetMetrics();
  recordRedisCheck(true);
  const snapshot = getMetricsSnapshot();
  if (snapshot.redis_checks !== 1) throw new Error('Redis check not counted');
});

test('emitStructuredLog returns structured payload', () => {
  const log = emitStructuredLog('info', 'test_event', { custom: 'field' });
  if (!log.timestamp) throw new Error('Timestamp missing');
  if (log.level !== 'info') throw new Error('Level not set');
  if (log.event !== 'test_event') throw new Error('Event not set');
  if (log.custom !== 'field') throw new Error('Custom field not included');
});

// Test production middleware
console.log('\nTesting production middleware...');

test('createRateLimiter produces a function', () => {
  const limiter = createRateLimiter({
    scope: 'test',
    windowMs: 60000,
    max: 5,
  });
  if (typeof limiter !== 'function') throw new Error('Limiter is not a function');
});

test('authRateLimiter is exported', () => {
  if (typeof authRateLimiter !== 'function') throw new Error('authRateLimiter is not a function');
});

test('writeRateLimiter is exported', () => {
  if (typeof writeRateLimiter !== 'function') throw new Error('writeRateLimiter is not a function');
});

test('requestContextMiddleware is a function', () => {
  if (typeof requestContextMiddleware !== 'function') throw new Error('requestContextMiddleware is not a function');
});

test('securityHeadersMiddleware is a function', () => {
  if (typeof securityHeadersMiddleware !== 'function') throw new Error('securityHeadersMiddleware is not a function');
});

test('createHealthHandler returns a function', () => {
  const handler = createHealthHandler();
  if (typeof handler !== 'function') throw new Error('Health handler is not a function');
});

test('createReadinessHandler returns a function', () => {
  const handler = createReadinessHandler({ db: {}, redis: {} });
  if (typeof handler !== 'function') throw new Error('Readiness handler is not a function');
});

test('metricsHandler is a function', () => {
  if (typeof metricsHandler !== 'function') throw new Error('metricsHandler is not a function');
});

// Test response utilities
console.log('\nTesting response utilities...');

test('sendError is a function', () => {
  if (typeof sendError !== 'function') throw new Error('sendError is not a function');
});

test('errorResponse is a function', () => {
  if (typeof errorResponse !== 'function') throw new Error('errorResponse is not a function');
});

// Summary
console.log('\n=== Validation Results ===');
console.log(`Passed: ${passCount}`);
console.log(`Failed: ${failCount}`);

if (failCount === 0) {
  console.log('\n✓ All Phase 4 production-readiness modules validated successfully\n');
  process.exit(0);
} else {
  console.log(`\n✗ ${failCount} validation(s) failed\n`);
  process.exit(1);
}
