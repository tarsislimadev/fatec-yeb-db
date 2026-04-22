# Phase 0: Discovery and Contracts

**Duration:** 1 week  
**Status:** In Progress

## 1. Scope Freeze Document

### MVP Scope (APPROVED)

**In Scope:**
- Canonical phone registry with normalization and uniqueness rules
- Relations: owner, channels, sources, consents, contact attempts
- Core entities: phones, people, businesses, departments, app_users, auth_identities
- CRUD operations for phones and owners
- Search and filtering dashboard
- Authentication system (email/password + Google OAuth + Microsoft OAuth)
- Password recovery flow with expiring tokens

**Out of Scope (Phase 2+):**
- AI voice bot and autonomous outbound calling
- Large-scale enrichment pipelines
- Advanced lead scoring
- CNPJ enrichment (Phase 2)
- Sales pipeline and meetings
- Automated calling workflows

**MVP Freeze Rules:**
- No additional business entities before Phase 1 planning is complete
- No enrichment provider integration in MVP
- No sales pipeline, meetings, or automated calling
- New feature requests must be captured as Phase 2+ unless directly supporting phone registry

## 2. Core Data Model - Approved Entity List

### Primary Entities
- **phones** - canonical phone registry with normalization
- **people** - individuals linked to phones
- **businesses** - organizations
- **departments** - organization subdivisions
- **app_users** - internal system users
- **auth_identities** - OAuth provider integrations

### Relation Tables
- **phone_owners** - links phones to people/businesses/departments with labels
- **phone_channels** - available communication channels (call, SMS, WhatsApp, Telegram)
- **phone_sources** - provenance tracking for each phone entry
- **phone_consents** - consent/suppression state management
- **contact_attempts** - interaction history and outcomes

## 3. API Contract - Standardized Response Model

### Success Response Format
```json
{
  "data": {} | [],
  "meta": {
    "page": 1,
    "page_size": 20,
    "total_items": 150,
    "total_pages": 8,
    "timestamp": "2026-04-22T10:30:00Z"
  }
}
```

### Error Response Format
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": {},
    "request_id": "uuid",
    "timestamp": "2026-04-22T10:30:00Z"
  }
}
```

### Standard Error Codes
- `VALIDATION_ERROR` (400)
- `UNAUTHORIZED` (401)
- `FORBIDDEN` (403)
- `NOT_FOUND` (404)
- `CONFLICT` (409)
- `BUSINESS_RULE_VIOLATION` (422)
- `RATE_LIMITED` (429)
- `INTERNAL_ERROR` (500)

### HTTP Status Mappings
- `201 Created` - successful creation
- `204 No Content` - successful deletion
- `400 Bad Request` - malformed payload
- `401 Unauthorized` - missing/invalid auth
- `403 Forbidden` - permission/suppression violation
- `404 Not Found` - resource missing
- `409 Conflict` - duplicate keys
- `422 Unprocessable Entity` - validation failure
- `429 Too Many Requests` - throttling
- `500 Internal Server Error` - unexpected failure

### Idempotency
- Mutable requests accept `Idempotency-Key` header
- Safe for retry on network failures

## 4. Legal & Compliance Constraints

### Data Privacy
- Phone numbers treated as sensitive PII
- Consent tracking mandatory for outreach
- Suppression list enforcement required

### Contact Compliance
- Do Not Call registry integration (Phase 3+)
- Consent-based filtering before any contact attempt
- Audit trail for all contact interactions
- Opt-out immediate suppression enforcement

### Authentication Security
- Password reset tokens: single-use, time-limited
- Session management: secure, stateful
- OAuth: state parameter validation, PKCE for mobile flows
- Rate limiting: 5 failed attempts → account lockout (Phase 4)

## 5. Exit Criteria ✅

- [x] Scope freeze document approved (see Section 1)
- [x] Data model entities confirmed (see Section 2)
- [x] API contract standardized (see Section 3)
- [x] Legal/compliance constraints defined (see Section 4)
- [x] Database schema draft created → `schema-draft.md`
- [x] API specification created → `api-spec.md`
- [x] Acceptance test plan created → `acceptance-tests.md`

**Phase 0 Status: COMPLETE** ✅

---

## Deliverables

1. **schema-draft.md** - Full database schema with all tables, fields, indexes, and constraints
2. **api-spec.md** - Complete OpenAPI-style API specification with all endpoints
3. **acceptance-tests.md** - User acceptance test scenarios for Phase 1 delivery
4. **phase-0-discovery-contracts.md** - This document
