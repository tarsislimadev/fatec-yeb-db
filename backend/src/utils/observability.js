const startedAt = Date.now();

const baselineMetrics = {
  requests_total: 0,
  active_requests: 0,
  request_errors: 0,
  auth_failures: 0,
  throttled_requests: 0,
  readiness_checks: 0,
  readiness_failures: 0,
  db_checks: 0,
  db_failures: 0,
  redis_checks: 0,
  redis_failures: 0,
  last_request: null,
  last_error: null,
  last_throttle: null,
  last_readiness: null,
};

const metrics = { ...baselineMetrics };

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function increment(key, amount = 1) {
  metrics[key] = (metrics[key] || 0) + amount;
}

export function resetMetrics() {
  for (const key of Object.keys(baselineMetrics)) {
    metrics[key] = clone(baselineMetrics[key]);
  }
}

export function emitStructuredLog(level, event, details = {}) {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...details,
  };

  const logger = console[level] || console.log;
  logger.call(console, JSON.stringify(payload));
  return payload;
}

export function recordRequestStart() {
  increment('requests_total');
  increment('active_requests');
}

export function recordRequestFinish({ requestId, method, path, statusCode, durationMs }) {
  metrics.active_requests = Math.max(0, metrics.active_requests - 1);
  metrics.last_request = {
    request_id: requestId,
    method,
    path,
    status_code: statusCode,
    duration_ms: Math.round(durationMs),
  };

  if (statusCode >= 500) {
    increment('request_errors');
  }
}

export function recordAuthFailure({ reason, email = null, ip = null }) {
  increment('auth_failures');
  metrics.last_error = {
    category: 'auth',
    reason,
    email,
    ip,
    timestamp: new Date().toISOString(),
  };
}

export function recordThrottle({ scope, key, retryAfterSeconds }) {
  increment('throttled_requests');
  metrics.last_throttle = {
    scope,
    key,
    retry_after_seconds: retryAfterSeconds,
    timestamp: new Date().toISOString(),
  };
}

export function recordReadinessCheck({ service, ok, error = null }) {
  increment('readiness_checks');
  if (!ok) {
    increment('readiness_failures');
  }

  metrics.last_readiness = {
    service,
    ok,
    error,
    timestamp: new Date().toISOString(),
  };
}

export function recordDbCheck(ok, error = null) {
  increment('db_checks');
  if (!ok) {
    increment('db_failures');
  }

  metrics.last_readiness = {
    ...(metrics.last_readiness || {}),
    service: 'database',
    ok,
    error,
    timestamp: new Date().toISOString(),
  };
}

export function recordRedisCheck(ok, error = null) {
  increment('redis_checks');
  if (!ok) {
    increment('redis_failures');
  }

  metrics.last_readiness = {
    ...(metrics.last_readiness || {}),
    service: 'redis',
    ok,
    error,
    timestamp: new Date().toISOString(),
  };
}

export function getMetricsSnapshot() {
  return {
    uptime_seconds: Math.floor((Date.now() - startedAt) / 1000),
    ...clone(metrics),
  };
}
