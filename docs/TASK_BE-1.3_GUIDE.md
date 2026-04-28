# BE-1.3: JWT & Session Management — Implementation Guide

**Task:** Implement JWT token generation/validation, refresh token logic, middleware  
**Estimated:** 1 day  
**Owner:** Backend Lead  
**Status:** Ready to Start (depends on BE-1.1 ✅)

---

## Overview

This task creates the authentication foundation:
- **Access Token:** Short-lived (1 hour), sent with each API request
- **Refresh Token:** Long-lived (7 days), used to get new access tokens
- **Token Blacklist:** Redis-backed revocation list (for logout)
- **Middleware:** Validates tokens on protected routes

---

## Checklist

- [ ] **1. JWT Utilities (1.5 hours)**
  - [ ] Create `backend/src/utils/jwt.js`
  - [ ] Implement `generateAccessToken(payload)` → returns JWT
  - [ ] Implement `generateRefreshToken(payload)` → returns JWT
  - [ ] Implement `verifyAccessToken(token)` → returns payload or throws
  - [ ] Implement `verifyRefreshToken(token)` → returns payload or throws
  - [ ] Use `jsonwebtoken` package, HS256 algorithm

- [ ] **2. Redis Client Setup (30 min)**
  - [ ] Create `backend/src/cache/redis.js`
  - [ ] Initialize Redis connection from `REDIS_URL` env var
  - [ ] Export methods: `get(key)`, `set(key, value, ttl)`, `del(key)`
  - [ ] Add error handling, graceful degradation if Redis unavailable

- [ ] **3. Token Blacklist Service (1 hour)**
  - [ ] Create `backend/src/services/tokenBlacklist.js`
  - [ ] Implement `addToBlacklist(tokenId, expiresAt)` → stores in Redis with TTL
  - [ ] Implement `isBlacklisted(tokenId)` → checks Redis
  - [ ] TTL = token expiration time (auto-cleanup via Redis)
  - [ ] Used on logout (BE-1.9)

- [ ] **4. Authentication Middleware (1.5 hours)**
  - [ ] Create `backend/src/middleware/auth.js`
  - [ ] Implement `authenticateToken` middleware:
    - Extract token from `Authorization: Bearer <token>` header
    - Verify token signature using JWT secret
    - Check if token in blacklist
    - Attach `req.user = { id, email }` to request
    - Return 401 if invalid/missing/blacklisted
  - [ ] Implement `optionalAuth` middleware (same, but doesn't fail if missing)
  - [ ] Export both for use in route handlers

- [ ] **5. Test Coverage (1 hour)**
  - [ ] Write unit tests for JWT utilities:
    - [ ] Token generation succeeds with valid payload
    - [ ] Token verification succeeds with valid token
    - [ ] Token verification fails with expired token
    - [ ] Token verification fails with wrong secret
  - [ ] Write unit tests for token blacklist:
    - [ ] Token added to blacklist succeeds
    - [ ] Blacklist check returns true for blacklisted token
    - [ ] Blacklist check returns false for non-blacklisted token
  - [ ] Write integration tests for auth middleware:
    - [ ] Request with valid token succeeds
    - [ ] Request without token returns 401
    - [ ] Request with expired token returns 401
    - [ ] Request with blacklisted token returns 401

---

## Key Files

### `backend/src/utils/jwt.js`

```javascript
import jwt from 'jsonwebtoken';

const ACCESS_TOKEN_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
const REFRESH_TOKEN_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

export function generateAccessToken(payload) {
  return jwt.sign(
    { ...payload, type: 'access' },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
  );
}

export function generateRefreshToken(payload) {
  return jwt.sign(
    { ...payload, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
  );
}

export function verifyAccessToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.type !== 'access') {
      throw new Error('Invalid token type');
    }
    return decoded;
  } catch (err) {
    throw new Error(`Token verification failed: ${err.message}`);
  }
}

export function verifyRefreshToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }
    return decoded;
  } catch (err) {
    throw new Error(`Token verification failed: ${err.message}`);
  }
}

export function getTokenExpiration(token) {
  try {
    const decoded = jwt.decode(token);
    return decoded?.exp ? new Date(decoded.exp * 1000) : null;
  } catch {
    return null;
  }
}
```

### `backend/src/cache/redis.js`

```javascript
import redis from 'redis';

const client = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: {
    reconnectStrategy: (retries) => Math.min(retries * 50, 500),
  },
});

client.on('error', (err) => {
  console.error('Redis error:', err);
});

client.on('connect', () => {
  console.log('Redis connected');
});

await client.connect().catch((err) => {
  console.warn('Redis connection failed (non-fatal):', err.message);
});

export async function get(key) {
  try {
    return await client.get(key);
  } catch (err) {
    console.warn(`Redis get failed for ${key}:`, err.message);
    return null;
  }
}

export async function set(key, value, ttl = 3600) {
  try {
    if (ttl) {
      await client.setEx(key, ttl, value);
    } else {
      await client.set(key, value);
    }
  } catch (err) {
    console.warn(`Redis set failed for ${key}:`, err.message);
  }
}

export async function del(key) {
  try {
    await client.del(key);
  } catch (err) {
    console.warn(`Redis del failed for ${key}:`, err.message);
  }
}

export async function exists(key) {
  try {
    const result = await client.exists(key);
    return result > 0;
  } catch (err) {
    console.warn(`Redis exists failed for ${key}:`, err.message);
    return false;
  }
}

export default client;
```

### `backend/src/services/tokenBlacklist.js`

```javascript
import * as redis from '../cache/redis.js';
import { getTokenExpiration } from '../utils/jwt.js';

export async function addToBlacklist(tokenId, token) {
  try {
    const expiresAt = getTokenExpiration(token);
    const ttl = expiresAt
      ? Math.floor((expiresAt.getTime() - Date.now()) / 1000)
      : 3600; // Default 1 hour

    if (ttl > 0) {
      await redis.set(`blacklist:${tokenId}`, '1', ttl);
      console.log(`Token ${tokenId} added to blacklist (TTL: ${ttl}s)`);
    }
  } catch (err) {
    console.error('Failed to add token to blacklist:', err);
    throw err;
  }
}

export async function isBlacklisted(tokenId) {
  try {
    const exists = await redis.exists(`blacklist:${tokenId}`);
    return exists;
  } catch (err) {
    console.error('Failed to check blacklist:', err);
    return false; // Fail open (allow request if Redis down)
  }
}

export async function getBlacklistStats() {
  // Returns stats (optional: for monitoring)
  try {
    // Scan for all blacklist keys
    const keys = await redis.client.keys('blacklist:*');
    return { count: keys.length };
  } catch (err) {
    console.warn('Failed to get blacklist stats:', err.message);
    return { count: 0 };
  }
}
```

### `backend/src/middleware/auth.js`

```javascript
import { verifyAccessToken } from '../utils/jwt.js';
import * as tokenBlacklist from '../services/tokenBlacklist.js';
import crypto from 'crypto';

function getTokenId(token) {
  // Use sha256 hash of token to avoid storing full token
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : null;

    if (!token) {
      return res.status(401).json({
        error_code: 'MISSING_TOKEN',
        message: 'Authorization token required',
      });
    }

    // Verify JWT signature
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (err) {
      return res.status(401).json({
        error_code: 'INVALID_TOKEN',
        message: err.message,
      });
    }

    // Check if token is blacklisted
    const tokenId = getTokenId(token);
    const isBlacklisted = await tokenBlacklist.isBlacklisted(tokenId);
    if (isBlacklisted) {
      return res.status(401).json({
        error_code: 'BLACKLISTED_TOKEN',
        message: 'Token has been revoked',
      });
    }

    // Attach user to request
    req.user = {
      id: decoded.id,
      email: decoded.email,
    };
    req.token = token;
    req.tokenId = tokenId;

    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    res.status(500).json({
      error_code: 'AUTH_ERROR',
      message: 'Authentication failed',
    });
  }
}

export async function optionalAuth(req, res, next) {
  // Same as authenticateToken but doesn't fail if no token
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : null;

    if (token) {
      try {
        const decoded = verifyAccessToken(token);
        const tokenId = getTokenId(token);
        const isBlacklisted = await tokenBlacklist.isBlacklisted(tokenId);

        if (!isBlacklisted) {
          req.user = { id: decoded.id, email: decoded.email };
          req.token = token;
          req.tokenId = tokenId;
        }
      } catch (err) {
        // Silently fail, user not set
      }
    }

    next();
  } catch (err) {
    console.error('Optional auth middleware error:', err);
    next(); // Always continue, even on error
  }
}
```

### `backend/src/middleware/index.js`

```javascript
export { authenticateToken, optionalAuth } from './auth.js';
// Export other middleware as needed
```

---

## Usage Examples

### In Routes

```javascript
import { authenticateToken } from '../middleware/index.js';

// Protected route
router.get('/phones', authenticateToken, phoneController.listPhones);

// Public route
router.post('/auth/signin', authController.signin);
```

### In Controllers

```javascript
export async function signin(req, res) {
  try {
    const { email, password } = req.body;

    // Verify credentials...
    const user = await verifyCredentials(email, password);

    // Generate tokens
    const accessToken = generateAccessToken({ id: user.id, email: user.email });
    const refreshToken = generateRefreshToken({ id: user.id, email: user.email });

    res.json({
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: 3600, // seconds
    });
  } catch (err) {
    res.status(401).json({ error_code: 'INVALID_CREDENTIALS' });
  }
}
```

---

## Testing

### Unit Test Example

```javascript
import { test, expect } from 'vitest';
import { generateAccessToken, verifyAccessToken } from '../utils/jwt';

test('generates and verifies access token', () => {
  const payload = { id: 123, email: 'test@example.com' };
  const token = generateAccessToken(payload);

  const decoded = verifyAccessToken(token);
  expect(decoded.id).toBe(123);
  expect(decoded.email).toBe('test@example.com');
  expect(decoded.type).toBe('access');
});

test('verifyAccessToken rejects expired token', () => {
  // This test would need to mock time or create an already-expired token
  // Use jest.useFakeTimers() for this
});
```

### Integration Test Example

```javascript
import request from 'supertest';
import app from '../server';

test('authenticateToken rejects missing token', async () => {
  const res = await request(app).get('/api/v1/phones');
  expect(res.status).toBe(401);
  expect(res.body.error_code).toBe('MISSING_TOKEN');
});

test('authenticateToken accepts valid token', async () => {
  const token = generateAccessToken({ id: 1, email: 'test@example.com' });
  const res = await request(app)
    .get('/api/v1/phones')
    .set('Authorization', `Bearer ${token}`);
  expect(res.status).not.toBe(401);
});
```

---

## Environment Variables

Ensure `.env` has:

```bash
JWT_SECRET=your-super-secret-key-change-in-production
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d
REDIS_URL=redis://localhost:6379
```

---

## Acceptance Criteria

✅ Access tokens generated with 1-hour expiration  
✅ Refresh tokens generated with 7-day expiration  
✅ Token verification validates signature correctly  
✅ Expired tokens rejected with clear error  
✅ Blacklist service stores/retrieves tokens in Redis  
✅ Auth middleware extracts token from Authorization header  
✅ Auth middleware returns 401 for missing/invalid/blacklisted tokens  
✅ `req.user` set correctly with id & email  
✅ All unit tests pass (token generation, verification, blacklist)  
✅ All integration tests pass (middleware in routes)

---

## Next Tasks

After completing BE-1.3:
- **BE-1.4:** Password Security & Account Lockout
- **BE-1.5:** Signup/Signin Endpoints (use JWT from here)

