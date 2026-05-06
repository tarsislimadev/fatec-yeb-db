import { randomUUID } from 'crypto';
import { errorResponse } from '../utils/response.js';
import {
  emitStructuredLog,
  getMetricsSnapshot,
  recordDbCheck,
  recordReadinessCheck,
  recordRedisCheck,
  recordRequestFinish,
  recordRequestStart,
  recordThrottle,
} from '../utils/observability.js';

const rateLimitBuckets = new Map();

function parsePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function buildRateLimitKey(req, scope, keyGenerator) {
  const key = keyGenerator(req);
  return `${scope}:${key || req.ip || 'unknown'}`;
}

export function createRateLimiter({
  scope,
  windowMs,
  max,
  keyGenerator = (req) => req.user?.id || req.ip,
}) {
  return function rateLimiter(req, res, next) {
    const resolvedWindowMs = parsePositiveInteger(windowMs, 60_000);
    const resolvedMax = parsePositiveInteger(max, 1);
    const key = buildRateLimitKey(req, scope, keyGenerator);
    const now = Date.now();
    const cutoff = now - resolvedWindowMs;
    const bucket = (rateLimitBuckets.get(key) || []).filter((timestamp) => timestamp > cutoff);

    if (bucket.length >= resolvedMax) {
      const retryAfterSeconds = Math.max(1, Math.ceil((bucket[0] + resolvedWindowMs - now) / 1000));
      recordThrottle({ scope, key, retryAfterSeconds });
      emitStructuredLog('warn', 'rate_limited', {
        request_id: req.requestId || null,
        scope,
        key,
        method: req.method,
        path: req.originalUrl || req.path,
        retry_after_seconds: retryAfterSeconds,
      });
      res.setHeader('Retry-After', String(retryAfterSeconds));
      return errorResponse(
        res,
        'RATE_LIMITED',
        'Too many requests',
        { scope, retry_after_seconds: retryAfterSeconds },
        429,
        req.requestId || null,
      );
    }

    bucket.push(now);
    rateLimitBuckets.set(key, bucket);
    return next();
  };
}

const isProduction = process.env.NODE_ENV === 'production';
export const authRateLimiter = createRateLimiter({
  scope: 'auth',
  windowMs: process.env.AUTH_RATE_LIMIT_WINDOW_MS,
  max: isProduction ? process.env.AUTH_RATE_LIMIT_MAX || 10 : process.env.AUTH_RATE_LIMIT_MAX || 1000,
  keyGenerator: (req) => req.ip,
});

export const writeRateLimiter = createRateLimiter({
  scope: 'write',
  windowMs: process.env.WRITE_RATE_LIMIT_WINDOW_MS,
  max: isProduction ? process.env.WRITE_RATE_LIMIT_MAX || 120 : process.env.WRITE_RATE_LIMIT_MAX || 1000,
  keyGenerator: (req) => req.user?.id || req.ip,
});

export function requestContextMiddleware(req, res, next) {
  const requestId = req.headers['x-request-id']?.toString() || randomUUID();
  const startedAt = process.hrtime.bigint();

  req.requestId = requestId;
  res.locals.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  recordRequestStart();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    recordRequestFinish({
      requestId,
      method: req.method,
      path: req.originalUrl || req.path,
      statusCode: res.statusCode,
      durationMs,
    });

    emitStructuredLog(res.statusCode >= 500 ? 'error' : 'info', 'request_completed', {
      request_id: requestId,
      method: req.method,
      path: req.originalUrl || req.path,
      status_code: res.statusCode,
      duration_ms: Math.round(durationMs),
    });
  });

  next();
}

export function securityHeadersMiddleware(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  if (isProduction) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  next();
}

export function createHealthHandler() {
  return function healthHandler(req, res) {
    return res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime_seconds: Math.floor(process.uptime()),
      request_id: req.requestId || null,
    });
  };
}

export function createReadinessHandler({ db, redis }) {
  return async function readinessHandler(req, res) {
    let databaseReady = true;
    let redisReady = true;
    let databaseError = null;
    let redisError = null;

    try {
      await db.query('SELECT 1');
      recordDbCheck(true);
    } catch (error) {
      databaseReady = false;
      databaseError = error.message;
      recordDbCheck(false, error.message);
    }

    try {
      if (redis.isOpen) {
        await redis.ping();
        recordRedisCheck(true);
      } else {
        throw new Error('Redis client not connected');
      }
    } catch (error) {
      redisReady = false;
      redisError = error.message;
      recordRedisCheck(false, error.message);
    }

    const ready = databaseReady && redisReady;
    recordReadinessCheck({
      service: 'overall',
      ok: ready,
      error: ready ? null : 'One or more dependencies are unavailable',
    });

    return res.status(ready ? 200 : 503).json({
      status: ready ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      request_id: req.requestId || null,
      services: {
        database: databaseReady ? 'ready' : 'down',
        redis: redisReady ? 'ready' : 'down',
      },
      errors: {
        database: databaseError,
        redis: redisError,
      },
    });
  };
}

export function metricsHandler(req, res) {
  return res.json({
    data: getMetricsSnapshot(),
  });
}
