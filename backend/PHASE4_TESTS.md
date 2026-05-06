# Phase 4 Backend Unit Tests - Documentation

## Overview

Phase 4 introduces production-readiness features to the backend, including:
- **Request context and structured logging** (observability)
- **Rate limiting** (auth and write endpoints)  
- **Security headers** 
- **Health and readiness endpoints**
- **Metrics collection**
- **Graceful shutdown**

## Test Suites Added

### 1. Observability Module Tests
**File:** `backend/src/utils/__tests__/observability.test.js`

Tests the metrics collection system that tracks:
- Request lifecycle (start, finish, active count)
- Authentication failures (reason, email, IP)
- Throttled requests (scope, key, retry time)
- Database and Redis readiness
- Structured logging output

**Key Test Cases:**
- `tracks requests, failures, and throttles` - Validates metrics increments correctly
  - Records request start → increments `requests_total` and `active_requests`
  - Records auth failure → increments `auth_failures`
  - Records throttle → increments `throttled_requests`
  - Records request finish with 500 error → increments `request_errors`
  - Verifies `last_request` snapshot contains correct metadata

- `tracks readiness checks for database and redis` - Validates dependency health tracking
  - Records successful database check
  - Records failed Redis check with error message
  - Records overall readiness failure
  - Verifies counters reflect the check outcomes

### 2. Production Middleware Tests
**File:** `backend/src/middleware/__tests__/production.test.js`

Tests production-hardening middleware that protects against abuse and provides observability:

**Key Test Cases:**
- `request context middleware assigns a request id` - Validates request tracing
  - Assigns unique requestId to each request
  - Sets requestId in res.locals for error correlations
  - Adds X-Request-Id header to response
  - Calls next() to continue middleware chain

- `rate limiter blocks requests over the configured limit` - Validates throttling
  - First request within limit passes through (calls next())
  - Second request exceeds limit → returns 429 status
  - Error response includes proper error code and Retry-After header
  - Records throttle event in metrics

- `readiness handler reports database and redis availability` - Validates health checks
  - Executes SELECT 1 query to verify database
  - Calls redis.ping() to verify Redis
  - Returns 200 OK with status "ready" when both available
  - Returns detailed service status and error messages when unavailable

## Unit Test Execution

### Run New Production Tests Only
```bash
cd backend
npm run test:unit  # Runs all utils/__tests__ tests
```

Or with more control:
```bash
npm test -- src/utils/__tests__/observability.test.js src/middleware/__tests__/production.test.js --runInBand
```

### Run All Tests Including Integration Tests
```bash
npm run test:ci     # With coverage
npm run test:all    # Full test suite with coverage
```

### Using Docker Test Compose
```bash
docker-compose -f docker-compose.test.yml up --abort-on-container-exit
```

## Implementation Details

### Observability Module
**Location:** `backend/src/utils/observability.js`

Core functions:
- `emitStructuredLog(level, event, details)` - JSON-formatted logging for machine parsing
- `recordRequestStart/Finish()` - Track request lifecycle
- `recordAuthFailure()` - Log authentication security events
- `recordThrottle()` - Track rate-limited requests
- `recordDbCheck/recordRedisCheck()` - Validate dependencies
- `getMetricsSnapshot()` - Export current metrics state

### Production Middleware
**Location:** `backend/src/middleware/production.js`

Exports:
- `createRateLimiter()` - Factory for configurable rate limiters
- `authRateLimiter` - Auth endpoint protection (default: 10 req/min in production)
- `writeRateLimiter` - Write endpoint protection (default: 120 req/min in production)
- `requestContextMiddleware` - Request ID assignment and lifecycle tracking
- `securityHeadersMiddleware` - Browser security headers
- `createHealthHandler()` - /health endpoint
- `createReadinessHandler()` - /ready endpoint with dependency checks
- `metricsHandler` - /metrics endpoint

### Route Integration
Rate limiters are now applied to:
- **Auth routes**: POST /signup, /signin, /signout, /password/forgot, /password/reset
- **Write routes**: POST/PATCH/DELETE on /phones, /people, /contact-attempts, /consent

### Server Integration
**Location:** `backend/src/server.js`

New middleware chain:
1. Security headers (`X-Content-Type-Options`, `X-Frame-Options`, `HSTS` in production)
2. Request context (assigns request ID, starts metrics)
3. CORS
4. JSON parser
5. Routes
6. Error handling

New endpoints:
- `GET /health` - Liveness probe
- `GET /ready` - Readiness probe (checks DB and Redis)
- `GET /metrics` - Metrics snapshot

New graceful shutdown:
- Handles SIGINT/SIGTERM signals
- Closes HTTP server
- Drains database pool
- Closes Redis connection
- Structured logs shutdown events

## What the Tests Validate

### Metrics Accuracy
✓ Request counts increment and decrement correctly
✓ Error conditions are tracked separately
✓ Auth failures record email and IP for security incidents
✓ Throttle events store scope and retry time

### Rate Limiting Behavior
✓ Requests within window pass through
✓ Requests exceeding limit return 429 with retry info
✓ Limiter respects time windows
✓ Per-user or per-IP scoping works

### Dependency Checks
✓ Database connectivity verified via SELECT 1
✓ Redis connectivity verified via PING
✓ Readiness returns 503 when dependencies unavailable
✓ Errors are captured and reported

### Request Tracing
✓ Request IDs are unique (UUID v4)
✓ Request context flows through middleware chain
✓ Request IDs appear in error responses
✓ Response headers include X-Request-Id

## Expected Test Output

When tests pass, Jest output should show:
```
observability metrics
  ✓ tracks requests, failures, and throttles (xx ms)
  ✓ tracks readiness checks for database and redis (xx ms)

production middleware
  ✓ request context middleware assigns a request id (xx ms)
  ✓ rate limiter blocks requests over the configured limit (xx ms)
  ✓ readiness handler reports database and redis availability (xx ms)

Test Suites: 1 passed, 1 total
Tests:       5 passed, 5 total
Snapshots:   0 total
Time:        x.xxxs
```

## Configuration

Production defaults (can be overridden via environment):
```env
AUTH_RATE_LIMIT_WINDOW_MS=60000      # 1 minute window
AUTH_RATE_LIMIT_MAX=10                # 10 attempts per window in prod
WRITE_RATE_LIMIT_WINDOW_MS=60000      # 1 minute window
WRITE_RATE_LIMIT_MAX=120              # 120 writes per window in prod
```

Development defaults (unlimited unless env var set):
- AUTH: 1000 attempts per minute
- WRITE: 1000 writes per minute

## Next Steps

1. **Run the unit tests** to ensure observability and middleware work correctly
2. **Run integration tests** (`test:integration`) to verify rate limiting doesn't break existing flows
3. **Run full test suite** (`test:ci`) with coverage to ensure no regressions
4. **Deploy to staging** and monitor `/metrics` and `/ready` endpoints
5. **Load test** auth endpoints to validate rate-limiting thresholds

## Troubleshooting

### Jest transforms not found
Ensure backend/.js files are ES modules with `"type": "module"` in package.json

### Tests fail on import
Check that all new middleware files are in the correct path relative to tests

### Rate limiter tests fail
Verify mock response objects have all required methods (setHeader, status, json, on)

### Readiness tests timeout
Mock db.query and redis.ping to resolve/reject appropriately
