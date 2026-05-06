import {
  createRateLimiter,
  requestContextMiddleware,
} from '../production.js';
import { resetMetrics } from '../../utils/observability.js';

describe('production middleware', () => {
  beforeEach(() => {
    resetMetrics();
  });

  test('request context middleware assigns a request id', () => {
    const req = {
      method: 'GET',
      path: '/health',
      originalUrl: '/health',
      headers: {},
    };
    const res = {
      locals: {},
      headers: {},
      setHeader: function(key, value) { 
        this.headers[key] = value; 
      },
      on: function() {}
    };
    let nextCalled = false;
    const next = () => { nextCalled = true; };

    requestContextMiddleware(req, res, next);

    expect(nextCalled).toBe(true);
    expect(req.requestId).toBeDefined();
    expect(typeof req.requestId).toBe('string');
    expect(res.locals.requestId).toBe(req.requestId);
    expect(res.headers['X-Request-Id']).toBe(req.requestId);
  });

  test('rate limiter is a function', () => {
    const limiter = createRateLimiter({
      scope: 'test',
      windowMs: 60_000,
      max: 1,
      keyGenerator: () => 'shared-key',
    });

    expect(typeof limiter).toBe('function');
  });

  test('rate limiter blocks requests over limit', () => {
    const limiter = createRateLimiter({
      scope: 'test',
      windowMs: 60_000,
      max: 1,
      keyGenerator: () => 'shared-key',
    });

    const req = {
      method: 'POST',
      path: '/api/v1/auth/signin',
      originalUrl: '/api/v1/auth/signin',
      ip: '127.0.0.1',
      requestId: 'req-1',
    };
    
    let responseStatusCode = 200;
    let responseBody = null;
    let nextCalledCount = 0;
    const res = {
      statusCode: 200,
      body: null,
      headers: {},
      locals: {},
      setHeader: function(key, value) { 
        this.headers[key] = value; 
      },
      status: function(code) {
        responseStatusCode = code;
        this.statusCode = code;
        return this;
      },
      json: function(body) {
        responseBody = body;
        this.body = body;
        return this;
      }
    };
    const next = () => { nextCalledCount++; };

    // First request should pass through
    limiter(req, res, next);
    expect(nextCalledCount).toBe(1);
    expect(responseStatusCode).toBe(200);

    // Second request should be rate limited
    responseStatusCode = 200;
    limiter(req, res, next);
    expect(nextCalledCount).toBe(1);
    expect(responseStatusCode).toBe(429);
    expect(responseBody?.error?.code).toBe('RATE_LIMITED');
    expect(res.headers['Retry-After']).toBeDefined();
  });
});
