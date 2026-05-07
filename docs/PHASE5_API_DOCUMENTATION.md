# Phase 5: Voice Calling API Documentation

## Overview

Phase 5 introduces automated voice calling capabilities through Twilio integration. This document describes all campaign management, call history, and transcript review endpoints.

## Base URL
```
/api/v1
```

## Authentication
All endpoints require Bearer token authentication via `Authorization` header:
```
Authorization: Bearer <token>
```

---

## Campaigns

### Create Campaign
**POST** `/campaigns`

Create a new voice calling campaign.

**Request Body:**
```json
{
  "name": "Q2 Outreach Campaign",
  "description": "Optional description",
  "prospect_ids": ["uuid-1", "uuid-2"]
}
```

**Response (201):**
```json
{
  "data": {
    "id": "campaign-uuid",
    "user_id": "user-uuid",
    "name": "Q2 Outreach Campaign",
    "description": "Optional description",
    "status": "draft",
    "prospect_ids": ["uuid-1", "uuid-2"],
    "prospect_count": 2,
    "calls_total": 0,
    "calls_completed": 0,
    "created_at": "2026-05-07T10:00:00Z",
    "started_at": null,
    "ended_at": null
  }
}
```

**Errors:**
- `400`: Missing required fields or empty prospect_ids
- `401`: Unauthorized

---

### List Campaigns
**GET** `/campaigns`

List all campaigns for the authenticated user.

**Query Parameters:**
- `page` (int, default=1): Page number
- `page_size` (int, default=20, max=100): Items per page
- `status` (string, optional): Filter by status (draft, scheduled, running, paused, completed)
- `sort` (string, optional): Sort field (created_at, started_at, name)
- `order` (string, optional): Sort order (asc, desc)

**Response (200):**
```json
{
  "data": [
    {
      "id": "campaign-uuid",
      "name": "Q2 Campaign",
      "status": "running",
      "prospect_count": 50,
      "calls_total": 50,
      "calls_completed": 35,
      "created_at": "2026-05-01T10:00:00Z",
      "started_at": "2026-05-02T10:00:00Z",
      "ended_at": null
    }
  ]
}
```

---

### Get Campaign Detail
**GET** `/campaigns/:id`

Get detailed information about a specific campaign.

**Response (200):**
```json
{
  "data": {
    "id": "campaign-uuid",
    "name": "Q2 Campaign",
    "description": "Campaign for Q2",
    "status": "running",
    "prospect_ids": ["prospect-1", "prospect-2"],
    "prospect_count": 2,
    "calls_total": 2,
    "calls_completed": 1,
    "calls_failed": 0,
    "calls_pending": 1,
    "created_at": "2026-05-01T10:00:00Z",
    "started_at": "2026-05-02T10:00:00Z",
    "ended_at": null
  }
}
```

**Errors:**
- `404`: Campaign not found
- `403`: Not authorized to view this campaign

---

### Update Campaign
**PATCH** `/campaigns/:id`

Update campaign details. Only draft campaigns can be updated.

**Request Body:**
```json
{
  "name": "Updated Campaign Name",
  "description": "Updated description"
}
```

**Response (200):**
```json
{
  "data": {
    "id": "campaign-uuid",
    "name": "Updated Campaign Name",
    "description": "Updated description",
    "status": "draft"
  }
}
```

**Errors:**
- `400`: Campaign not in draft status
- `404`: Campaign not found

---

### Start Campaign
**POST** `/campaigns/:id/start`

Transition campaign from draft to running status and queue all calls.

**Response (200):**
```json
{
  "data": {
    "id": "campaign-uuid",
    "status": "running",
    "started_at": "2026-05-07T10:00:00Z"
  }
}
```

**Errors:**
- `400`: Campaign must be in draft status
- `404`: Campaign not found

---

### Pause Campaign
**POST** `/campaigns/:id/pause`

Pause an active campaign without losing progress.

**Response (200):**
```json
{
  "data": {
    "id": "campaign-uuid",
    "status": "paused"
  }
}
```

---

### Resume Campaign
**POST** `/campaigns/:id/resume`

Resume a paused campaign.

**Response (200):**
```json
{
  "data": {
    "id": "campaign-uuid",
    "status": "running"
  }
}
```

---

### Stop Campaign
**POST** `/campaigns/:id/stop`

Finalize a campaign and prevent future calls.

**Response (200):**
```json
{
  "data": {
    "id": "campaign-uuid",
    "status": "completed",
    "ended_at": "2026-05-07T12:00:00Z"
  }
}
```

---

### Delete Campaign
**DELETE** `/campaigns/:id`

Delete a campaign. Only draft campaigns can be deleted.

**Response (204):** No content

**Errors:**
- `400`: Campaign must be in draft status to delete

---

## Calls

### List Calls
**GET** `/calls`

List all calls with filtering and pagination.

**Query Parameters:**
- `page` (int, default=1): Page number
- `page_size` (int, default=20, max=100): Items per page
- `campaign_id` (string, optional): Filter by campaign
- `status` (string, optional): Filter by status
- `sort` (string, optional): Sort field (created_at, dialed_at, duration_seconds)
- `order` (string, optional): Sort order (asc, desc)

**Response (200):**
```json
{
  "data": [
    {
      "id": "call-uuid",
      "campaign_id": "campaign-uuid",
      "prospect_id": "prospect-uuid",
      "phone_id": "phone-uuid",
      "phone_number": "+12025551234",
      "status": "completed",
      "duration_seconds": 45,
      "retry_count": 0,
      "dialed_at": "2026-05-07T10:00:00Z",
      "created_at": "2026-05-07T09:55:00Z"
    }
  ]
}
```

---

### Get Call Detail
**GET** `/calls/:id`

Get complete call information including session, transcript, and timeline.

**Response (200):**
```json
{
  "data": {
    "id": "call-uuid",
    "campaign_id": "campaign-uuid",
    "phone_number": "+12025551234",
    "status": "completed",
    "duration_seconds": 45,
    "dialed_at": "2026-05-07T10:00:00Z",
    "session": {
      "id": "session-uuid",
      "provider_id": "CA1234567890abcdef",
      "recording_url": "https://api.twilio.com/...",
      "call_duration_seconds": 45
    },
    "transcript": {
      "id": "transcript-uuid",
      "raw_text": "Hello, this is test call...",
      "confidence_score": 85,
      "flagged_for_review": false,
      "status": "approved"
    },
    "outcome": {
      "id": "outcome-uuid",
      "disposition": "answered",
      "spoken_opt_out_flag": false
    },
    "retry_log": [],
    "timeline": [
      {
        "type": "call_initiated",
        "timestamp": "2026-05-07T10:00:00Z",
        "details": "Call queued for execution"
      },
      {
        "type": "call_completed",
        "timestamp": "2026-05-07T10:00:45Z",
        "details": "Call completed"
      }
    ]
  }
}
```

---

### Retry Call
**POST** `/calls/:id/retry`

Manually retry a failed call.

**Response (200):**
```json
{
  "data": {
    "id": "call-uuid",
    "status": "pending",
    "retry_count": 1
  }
}
```

**Errors:**
- `400`: Call must be in failed status
- `429`: Too many retries

---

### Bulk Retry Calls
**POST** `/calls/bulk-retry`

Retry multiple failed calls at once.

**Request Body:**
```json
{
  "call_ids": ["call-uuid-1", "call-uuid-2"]
}
```

**Response (200):**
```json
{
  "data": {
    "requested": 2,
    "updated": 2,
    "calls": [
      { "id": "call-uuid-1", "status": "pending" },
      { "id": "call-uuid-2", "status": "pending" }
    ]
  }
}
```

**Errors:**
- `400`: Maximum 100 calls per request
- `400`: All calls must be in failed status

---

### Get Dashboard Metrics
**GET** `/calls/dashboard/metrics`

Get call center dashboard metrics and KPIs.

**Query Parameters:**
- `start_date` (ISO 8601, optional): Start of date range (default: 24h ago)
- `end_date` (ISO 8601, optional): End of date range (default: now)

**Response (200):**
```json
{
  "data": {
    "calls_total": 150,
    "calls_completed": 120,
    "calls_failed": 20,
    "calls_pending": 10,
    "success_rate": 85.7,
    "avg_duration_seconds": 42,
    "opt_outs_today": 3,
    "flagged_transcripts_count": 5,
    "active_campaigns": [
      {
        "id": "campaign-uuid",
        "name": "Q2 Campaign",
        "status": "running",
        "started_at": "2026-05-01T10:00:00Z",
        "prospect_count": 50,
        "calls_total": 50,
        "calls_completed": 35
      }
    ]
  }
}
```

---

## Transcripts

### List Flagged Transcripts
**GET** `/transcripts`

List transcripts pending manual review.

**Query Parameters:**
- `page` (int, default=1)
- `page_size` (int, default=20, max=100)
- `status` (string, optional): pending, reviewed, approved, rejected

**Response (200):**
```json
{
  "data": [
    {
      "id": "transcript-uuid",
      "call_id": "call-uuid",
      "phone_number": "+12025551234",
      "prospect_name": "John Doe",
      "raw_text": "Yes I'd like to opt out",
      "confidence_score": 92,
      "flagged_for_review": true,
      "status": "pending",
      "dialed_at": "2026-05-07T10:00:00Z"
    }
  ]
}
```

---

### Get Transcript Detail
**GET** `/transcripts/:id`

Get complete transcript with call and review history.

**Response (200):**
```json
{
  "data": {
    "id": "transcript-uuid",
    "call_id": "call-uuid",
    "raw_text": "Yes I'd like to opt out please",
    "processed_text": "Yes I'd like to opt out please",
    "confidence_score": 92,
    "flagged_for_review": true,
    "status": "pending",
    "reviewed_by": null,
    "reviewed_at": null,
    "opt_out_detected": true,
    "opt_out_keywords": ["opt out"],
    "opt_out_confidence": 95
  }
}
```

---

### Approve Transcript
**POST** `/transcripts/:id/approve`

Approve a transcript after manual review.

**Response (200):**
```json
{
  "data": {
    "id": "transcript-uuid",
    "status": "approved",
    "reviewed_by": "user-uuid",
    "reviewed_at": "2026-05-07T14:00:00Z"
  }
}
```

---

### Reject Transcript
**POST** `/transcripts/:id/reject`

Reject a transcript (e.g., poor quality or inaccuracy).

**Request Body:**
```json
{
  "notes": "Transcript quality too low, retry recommended"
}
```

**Response (200):**
```json
{
  "data": {
    "id": "transcript-uuid",
    "status": "rejected",
    "reviewed_by": "user-uuid",
    "reviewed_at": "2026-05-07T14:00:00Z",
    "review_notes": "Transcript quality too low..."
  }
}
```

---

### Confirm Opt-Out
**POST** `/transcripts/:id/confirm-opt-out`

Confirm detected opt-out and permanently suppress the phone number.

**Request Body:**
```json
{
  "notes": "Opt-out confirmed - caller asked to be removed from list"
}
```

**Response (200):**
```json
{
  "data": {
    "id": "transcript-uuid",
    "status": "approved",
    "phone_id": "phone-uuid",
    "phone_voice_suppressed_at": "2026-05-07T14:00:00Z",
    "phone_voice_suppression_reason": "opted_out_spoken"
  }
}
```

---

## Webhooks

### Handle Call Events
**POST** `/webhooks/calls/events`

**Public endpoint** - Receives Twilio StatusCallback events.

Headers:
```
X-Twilio-Signature: <signature>
```

Body (application/x-www-form-urlencoded):
```
CallSid=CA1234567890abcdef
CallStatus=completed
RecordingUrl=https://api.twilio.com/...
CallDuration=45
```

**Response (200):**
```json
{
  "success": true,
  "callId": "call-uuid",
  "status": "completed"
}
```

### Webhook Health
**GET** `/webhooks/health`

**Public endpoint** - Health check for webhook configuration.

**Response (200):**
```json
{
  "status": "ok",
  "version": "1.0"
}
```

---

## Error Codes

| Code | Meaning |
|------|---------|
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Missing/invalid token |
| 403 | Forbidden - Not authorized for resource |
| 404 | Not Found - Resource doesn't exist |
| 409 | Conflict - Invalid state transition |
| 429 | Too Many Requests - Rate limited |
| 500 | Server Error - Internal problem |

---

## Status Values

### Campaign Status
- `draft` - Created but not started
- `scheduled` - Scheduled for future execution
- `running` - Currently executing calls
- `paused` - Paused, can be resumed
- `completed` - Finalized

### Call Status
- `pending` - Queued for execution
- `dialing` - Currently dialing
- `in-progress` - Call in progress
- `completed` - Call completed
- `failed` - Call failed
- `skipped` - Call skipped (compliance)

### Transcript Status
- `pending` - Awaiting manual review
- `approved` - Approved by reviewer
- `rejected` - Rejected due to quality
- `reviewed` - Reviewed but not approved

###  Disposition
- `answered` - Call was answered
- `no_answer` - No answer
- `busy` - Line busy
- `canceled` - Call was canceled
- `failed` - Call failed

---

## Rate Limiting

API requests are rate-limited based on campaign size:
- Small campaigns (<100 calls): Standard limits
- Medium campaigns (100-1000): Elevated limits
- Large campaigns (>1000): Please contact support

Current limits:
- Campaigns: 100 req/min per user
- Calls: 1000 req/min per user
- Transcripts: 500 req/min per user

---

## Compliance & Consent

All calls are subject to compliance checks:

1. **Phone Suppression Check**: Is the phone voice-suppressed?
2. **Suppression Reason Check**: Why was it suppressed?
3. **Consent Validation**: Does the recipient have required consent?
4. **Phone Number Validation**: Is the number in valid E.164 format?

Calls are blocked if:
- Phone is voice-suppressed
- No marketing or transactional consent granted
- Phone number is invalid
- TCPA restrictions apply

Opt-outs are detected automatically from transcripts and phones are auto-suppressed.

---

## Examples

### Create Campaign Flow
```bash
# 1. Create campaign
POST /api/v1/campaigns
{
  "name": "Q2 Outreach",
  "prospect_ids": ["prospect-uuid"]
}

# 2. Start campaign
POST /api/v1/campaigns/{id}/start

# 3. View calls
GET /api/v1/calls?campaign_id={id}

# 4. Check metrics
GET /api/v1/calls/dashboard/metrics

# 5. Review flagged transcripts
GET /api/v1/transcripts

# 6. Approve transcript
POST /api/v1/transcripts/{id}/approve
```

### Retry Failed Calls
```bash
# Get failed calls
GET /api/v1/calls?status=failed

# Retry individual call
POST /api/v1/calls/{id}/retry

# Or bulk retry
POST /api/v1/calls/bulk-retry
{
  "call_ids": ["call-1", "call-2"]
}
```

---

## Support

For issues or questions, please contact the development team or check the implementation guide at `docs/phase-5-planning.md`.
