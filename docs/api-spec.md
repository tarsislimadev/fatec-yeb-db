# API Specification v1.0

**Base URL:** `/api/v1`  
**Authentication:** JWT Bearer Token  
**Content-Type:** `application/json`  
**Timestamps:** ISO 8601 UTC

## Authentication Endpoints

### POST /auth/signup
Create a new user account with email and password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "display_name": "John Doe"
}
```

**Response 201 Created:**
```json
{
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "display_name": "John Doe",
    "status": "active",
    "created_at": "2026-04-22T10:30:00Z"
  }
}
```

**Errors:**
- `400 Bad Request` - invalid email format
- `409 Conflict` - email already registered
- `422 Unprocessable Entity` - weak password

---

### POST /auth/signin
Authenticate user and receive JWT token.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response 200 OK:**
```json
{
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "token_type": "Bearer",
    "expires_in": 3600,
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "display_name": "John Doe"
    }
  }
}
```

**Errors:**
- `401 Unauthorized` - invalid credentials
- `403 Forbidden` - account locked (after 5 failed attempts)

---

### POST /auth/signout
Invalidate user session and token.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response 204 No Content**

---

### POST /auth/password/forgot
Request password reset token (sent via email).

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response 200 OK:**
```json
{
  "data": {
    "message": "Password reset email sent",
    "email_masked": "us***@example.com"
  }
}
```

**Notes:**
- Token valid for 1 hour
- Token is single-use
- No error disclosed if email not found (security)

---

### POST /auth/password/reset
Reset password using token from email.

**Request:**
```json
{
  "token": "token_from_email",
  "new_password": "NewSecurePassword456!"
}
```

**Response 200 OK:**
```json
{
  "data": {
    "message": "Password reset successful",
    "redirect_to": "/auth/signin"
  }
}
```

**Errors:**
- `400 Bad Request` - invalid or expired token
- `422 Unprocessable Entity` - weak password

---

### GET /auth/oauth/google/start
Redirect to Google OAuth consent screen.

**Query Parameters:**
- `redirect_uri` - where to redirect after consent
- `state` - CSRF token (optional, auto-generated if missing)

**Response 302 Found**
Redirects to Google OAuth endpoint.

---

### GET /auth/oauth/google/callback
Google OAuth callback handler.

**Query Parameters:**
- `code` - authorization code from Google
- `state` - CSRF token validation

**Response 302 Found**
Redirects to original redirect_uri with:
- `access_token` in URL fragment (SPA-friendly)
- `user_id` in URL fragment

---

### GET /auth/oauth/microsoft/start
Redirect to Microsoft OAuth consent screen.

**Query Parameters:**
- `redirect_uri` - where to redirect after consent
- `state` - CSRF token (optional, auto-generated if missing)

**Response 302 Found**
Redirects to Microsoft OAuth endpoint.

---

### GET /auth/oauth/microsoft/callback
Microsoft OAuth callback handler.

**Query Parameters:**
- `code` - authorization code from Microsoft
- `state` - CSRF token validation

**Response 302 Found**
Redirects to original redirect_uri with:
- `access_token` in URL fragment
- `user_id` in URL fragment

---

## Phone Endpoints

### GET /phones
List all phones with filtering and pagination.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Query Parameters:**
- `page` - page number (default: 1)
- `page_size` - items per page (default: 20, max: 100)
- `status` - filter by status (active|inactive|invalid|blocked)
- `type` - filter by type (mobile|landline|whatsapp|unknown)
- `search` - search by e164_number or raw_number
- `sort` - sort field (e.g., created_at, last_seen_at)
- `order` - sort order (asc|desc, default: desc)

**Response 200 OK:**
```json
{
  "data": [
    {
      "id": "uuid",
      "e164_number": "+55119876543210",
      "raw_number": "(11) 98765-43210",
      "country_code": "BR",
      "national_number": "98765-43210",
      "type": "mobile",
      "status": "active",
      "is_primary": true,
      "verified_at": "2026-04-22T10:30:00Z",
      "last_seen_at": "2026-04-22T10:30:00Z",
      "created_at": "2026-04-22T10:30:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "page_size": 20,
    "total_items": 150,
    "total_pages": 8
  }
}
```

**Errors:**
- `401 Unauthorized` - missing token
- `403 Forbidden` - insufficient permissions

---

### POST /phones
Create a new phone record.

**Headers:**
```
Authorization: Bearer {access_token}
Idempotency-Key: uuid (optional, for safe retry)
```

**Request:**
```json
{
  "e164_number": "+55119876543210",
  "raw_number": "(11) 98765-43210",
  "country_code": "BR",
  "type": "mobile",
  "is_primary": true
}
```

**Response 201 Created:**
```json
{
  "data": {
    "id": "uuid",
    "e164_number": "+55119876543210",
    "raw_number": "(11) 98765-43210",
    "country_code": "BR",
    "national_number": "98765-43210",
    "type": "mobile",
    "status": "active",
    "is_primary": true,
    "verified_at": null,
    "created_at": "2026-04-22T10:30:00Z"
  }
}
```

**Errors:**
- `400 Bad Request` - invalid phone format
- `409 Conflict` - phone already exists
- `422 Unprocessable Entity` - validation failure

---

### GET /phones/{id}
Retrieve phone details by ID.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response 200 OK:**
```json
{
  "data": {
    "id": "uuid",
    "e164_number": "+55119876543210",
    "raw_number": "(11) 98765-43210",
    "country_code": "BR",
    "national_number": "98765-43210",
    "type": "mobile",
    "status": "active",
    "is_primary": true,
    "verified_at": "2026-04-22T10:30:00Z",
    "last_seen_at": "2026-04-22T10:30:00Z",
    "created_at": "2026-04-22T10:30:00Z",
    "owners": [
      {
        "id": "uuid",
        "owner_type": "person",
        "owner_id": "uuid",
        "relation_label": "personal",
        "confidence_score": 95
      }
    ],
    "channels": [
      {
        "id": "uuid",
        "channel_type": "call",
        "is_enabled": true
      }
    ],
    "consents": [
      {
        "id": "uuid",
        "consent_type": "marketing",
        "status": "granted"
      }
    ]
  }
}
```

**Errors:**
- `401 Unauthorized` - missing token
- `404 Not Found` - phone not found

---

### PATCH /phones/{id}
Update phone record fields.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Request:**
```json
{
  "type": "mobile",
  "status": "inactive",
  "is_primary": false
}
```

**Response 200 OK:**
Returns updated phone object (same format as GET /phones/{id})

**Errors:**
- `400 Bad Request` - invalid update
- `404 Not Found` - phone not found
- `409 Conflict` - stale update (use version field)

---

### DELETE /phones/{id}
Delete a phone record (soft delete - marks inactive).

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response 204 No Content**

**Errors:**
- `404 Not Found` - phone not found
- `403 Forbidden` - cannot delete (active relations exist)

---

## Phone Owner Endpoints

### POST /phones/{id}/owners
Link a phone to a person, business, or department.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Request:**
```json
{
  "owner_type": "person",
  "owner_id": "uuid",
  "relation_label": "personal",
  "confidence_score": 95,
  "start_date": "2026-01-15"
}
```

**Response 201 Created:**
```json
{
  "data": {
    "id": "uuid",
    "phone_id": "uuid",
    "owner_type": "person",
    "owner_id": "uuid",
    "relation_label": "personal",
    "confidence_score": 95,
    "start_date": "2026-01-15",
    "created_at": "2026-04-22T10:30:00Z"
  }
}
```

**Errors:**
- `400 Bad Request` - invalid owner_type
- `404 Not Found` - phone or owner not found
- `409 Conflict` - relation already exists

---

### DELETE /phones/{id}/owners/{ownerRelationId}
Remove a phone-to-owner relation.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response 204 No Content**

**Errors:**
- `404 Not Found` - relation not found

---

## Related Resource Endpoints (Implicit via GET /phones/{id})

The following are accessible via the detailed phone object:

### Phone Channels
- `channels` array in GET /phones/{id}
- Channel types: `call`, `whatsapp`, `telegram`, `sms`
- Status: `is_enabled` (boolean)

### Phone Consents
- `consents` array in GET /phones/{id}
- Consent types: `marketing`, `transactional`
- Status: `granted`, `revoked`, `unknown`

### Contact Attempts
- Accessible via future timeline endpoint (Phase 3)
- Tracked in `contact_attempts` table

### Phone Sources
- Accessible via detail page (metadata only)
- Tracks provenance of phone number entry

---

## Error Response Examples

### 400 Bad Request
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid phone number format",
    "details": {
      "field": "e164_number",
      "reason": "must start with +"
    },
    "request_id": "uuid",
    "timestamp": "2026-04-22T10:30:00Z"
  }
}
```

### 401 Unauthorized
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Missing or invalid authentication token",
    "details": {},
    "request_id": "uuid",
    "timestamp": "2026-04-22T10:30:00Z"
  }
}
```

### 409 Conflict
```json
{
  "error": {
    "code": "CONFLICT",
    "message": "Phone number already exists",
    "details": {
      "e164_number": "+55119876543210",
      "existing_id": "uuid"
    },
    "request_id": "uuid",
    "timestamp": "2026-04-22T10:30:00Z"
  }
}
```

### 422 Unprocessable Entity
```json
{
  "error": {
    "code": "BUSINESS_RULE_VIOLATION",
    "message": "Cannot delete phone with active relations",
    "details": {
      "active_relations": 2
    },
    "request_id": "uuid",
    "timestamp": "2026-04-22T10:30:00Z"
  }
}
```

---

## Rate Limiting

- Standard: 1000 requests per hour per user
- Auth endpoints: 10 requests per minute (login brute-force protection)
- Response headers include:
  - `X-RateLimit-Limit`
  - `X-RateLimit-Remaining`
  - `X-RateLimit-Reset`

---

## Pagination

- Default page size: 20
- Maximum page size: 100
- Default sort: `created_at DESC`
- Out-of-range pages return 200 OK with empty data array

---

## Security Headers

All responses include:
```
Strict-Transport-Security: max-age=31536000
Content-Security-Policy: default-src 'self'
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
```

---

## Phase 2+ Endpoints (Planned)

- `POST /phones/{id}/enrich` - trigger CNPJ enrichment
- `GET /enrichment/jobs/{jobId}` - poll enrichment job status
- `POST /enrichment/batch` - bulk enrichment request
- `GET /timeline/{phoneId}` - complete interaction timeline
