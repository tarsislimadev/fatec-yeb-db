# Phase 5: Automated Voice Calling

**Duration:** 3-4 weeks  
**Status:** 📋 Planned  
**Start Date:** After Phase 4 completion & UAT approval  
**Dependencies:** Phases 0-4 complete, all services stable

## Objective

Enable the system to execute automated outbound voice calls to phone numbers, capture voice responses, process transcripts, and manage call-initiated contact suppression. This phase adds real-time voice as a communication channel alongside text-based outreach, with intelligent IVR workflows and compliance enforcement.

## Scope

### In Scope
- **Call Campaign Management:** Create, schedule, and manage call campaigns  
- **Telephony Provider Integration:** Adapter pattern for Twilio/Vonage voice APIs  
- **Call Job Execution:** Job queue for processing outbound calls  
- **Call Session Tracking:** Record call metadata (duration, disposition, recording)  
- **Webhook Ingestion:** Accept call events from telephony provider  
- **Transcript Processing:** Store transcripts, extract text, and derive signals  
- **Spoken Opt-Out Detection:** Identify and enforce opt-outs from call audio  
- **Call Timeline Events:** Add call attempts to prospect timeline  
- **Manual Review Queue:** Flag uncertain transcripts for human review  
- **Frontend Call Center UI:** Dashboard, call history, transcript review, campaign status  
- **Compliance Enforcement:** Respect suppression + consent before dialing  
- **Failure Handling:** Retry logic, dead-letter queue for failed calls

### Out of Scope
- IVR menu system (future phase)
- Call recording transcription via third-party ML service (manual review only)
- SMS/WhatsApp integration (separate phase)
- Voicemail detection and transcription
- Sentiment analysis on transcripts  
- Call routing and skill-based queuing
- Live agent takeover from IVR

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│ Frontend                                                     │
│ - Campaign list & create/edit forms                         │
│ - Call history & status dashboard                           │
│ - Transcript review queue (manual QA)                       │
│ - Call detail view (timeline, recording, notes)             │
└──────────────┬───────────────────────────────────────────────┘
               │
┌──────────────▼───────────────────────────────────────────────┐
│ API Layer (v1)                                               │
│ - POST /campaigns, GET /campaigns/{id}                      │
│ - POST /campaigns/{id}/start, /pause, /stop                │
│ - GET /calls, POST /calls/retry                             │
│ - POST /webhooks/calls/* (Twilio/Vonage events)            │
│ - PATCH /transcripts/{id} (manual review feedback)          │
│ - GET /call-center/dashboard (metrics & status)             │
└──────────────┬───────────────────────────────────────────────┘
               │
┌──────────────▼───────────────────────────────────────────────┐
│ Job Pipeline & Event Bus                                    │
│ - Call Job Queue (Redis)                                   │
│ - Campaign Scheduler (cron: initiate calls per campaign)   │
│ - Webhook Handler (async, retry with backoff)              │
│ - Dead-Letter Queue (failed/invalid calls)                 │
│ - Event Emitter (call_initiated, call_completed, etc.)    │
└──────────────┬───────────────────────────────────────────────┘
               │
┌──────────────▼───────────────────────────────────────────────┐
│ Voice Service Layer                                           │
│ - Provider Adapter (Twilio/Vonage via interface)            │
│ - Call Initiator (check suppression, invoke provider)       │
│ - Transcript Processor (extract text, detect opt-out)       │
│ - Retry & Backoff Handler (intelligent call retry)          │
│ - Compliance Checker (suppression, consent, TCPA)           │
└──────────────┬───────────────────────────────────────────────┘
               │
┌──────────────▼───────────────────────────────────────────────┐
│ Data & Persistence                                           │
│ - call_campaigns (id, name, prospect_ids, config)          │
│ - calls (id, campaign_id, prospect_id, status, duration)   │
│ - call_sessions (id, call_id, provider_id, webhook_data)   │
│ - transcripts (id, call_id, raw_text, confidence, status)  │
│ - call_outcomes (id, call_id, disposition, opt_out_flag)   │
│ - call_retry_log (id, call_id, attempt_n, error_type)      │
│ - PostgreSQL (primary store)                               │
│ - Redis (job queue, campaign scheduling)                   │
└──────────────────────────────────────────────────────────────┘
```

## Implementation Tasks

### Week 1: Foundation & Integration

#### Task 5.1: Database Schema & Migrations
**Description:**
Create PostgreSQL tables to track campaigns, calls, sessions, transcripts, and outcomes. Ensure indexes for call history lookups and campaign progress.

**Scope:**
- `call_campaigns` table (id, user_id, name, description, status, config_json, started_at, ended_at)
- `calls` table (id, campaign_id, prospect_id, phone_number, status, scheduled_at, dialed_at, duration_seconds, disposition)
- `call_sessions` table (id, call_id, provider_id, webhook_data_json, recording_url, created_at)
- `transcripts` table (id, call_id, raw_text, confidence_score, status=pending|reviewed|approved, flagged_for_review, created_at)
- `call_outcomes` table (id, call_id, disposition, spoken_opt_out_flag, notes, created_at)
- `call_retry_log` table (id, call_id, attempt_number, error_code, error_msg, next_retry_at)
- Indexes on (campaign_id, prospect_id, status, created_at)
- Foreign keys ensuring referential integrity with prospects, call_campaigns

**Acceptance:**
- All migrations run cleanly on fresh database
- Seed data includes 3 sample campaigns with 5 calls each
- Schema is queryable and indexed for list/filter operations
- No orphaned FK references

**Estimated:** 0.5 day

#### Task 5.2: Telephony Provider Adapter (Twilio)
**Description:**
Implement provider adapter interface using Twilio as the primary telephony backend. Support outbound call initiation and webhook event ingestion.

**Scope:**
- Create `TelephonyProvider` interface with methods:
  - `initiateCall(to, from, callbackUrl)` → provider_id
  - `getCallStatus(provider_id)` → status enum
  - `deleteCall(provider_id)` → boolean
- Implement `TwilioAdapter` extending `TelephonyProvider`
  - Use `twilio` npm package
  - Twilio Account SID, Auth Token, Phone Number from environment
  - Construct callback URL for webhook ingestion
  - Handle provider response → local call record
- Implement `VonageAdapter` (optional, similar pattern)
- Error handling for network timeouts, invalid phone numbers, rate limits
- Unit tests for adapter methods with mock responses

**Acceptance:**
- Outbound call initiation logs provider call SID
- Call status lookup returns accurate state (dialing, completed, failed)
- Adapter is testable with mocks (no real calls during CI)
- Rate limit errors are caught and retried with backoff

**Estimated:** 1.5 days

#### Task 5.3: Call Job Processor & Queue
**Description:**
Set up a job queue (Bull/Redis) to process outbound calls asynchronously, with intelligent retry and backoff behavior.

**Scope:**
- Create `CallJobProcessor` service
  - Job schema: { campaignId, prospectId, phoneNumber, scheduledAt }
  - Process jobs from Redis queue
  - Check suppression + consent before invoking provider
  - Create call record and call_session on success
  - Push to dead-letter queue on failure (max 3 retries)
  - Emit `call:initiated` event
- Implement exponential backoff: 30s, 5m, 30m
- Graceful shutdown (drain queue before exit)
- Job monitoring: success/failure counts, queue depth metrics
- Error isolation (one failed call doesn't block others)

**Acceptance:**
- Jobs are processed in order (FIFO)
- Failed jobs retry 3 times with exponential backoff
- Suppression + consent checks prevent non-compliant calls
- Dead-letter queue captures unrecoverable errors
- Queue depth is observable via metrics

**Estimated:** 1 day

#### Task 5.4: Webhook Handler & Event Ingestion
**Description:**
Implement endpoint to receive call events from telephony provider and update call state.

**Scope:**
- Create `POST /api/v1/webhooks/calls/events` endpoint (public, no auth required)
  - Accept Twilio webhook payload (CallSid, CallStatus, Duration, Recording, etc.)
  - Validate webhook signature (Twilio request validator)
  - Find call by provider_id (CallSid)
  - Update call status (in-progress, completed, failed)
  - Store session data (duration, recording_url)
  - Trigger transcript processing if recording available
  - Emit `call:completed` event
  - Return 200 OK to provider (fire-and-forget)
- Implement idempotency (webhook may fire multiple times)
- Error handling for malformed/missing events
- Webhook signature validation for security

**Acceptance:**
- Webhook receives and processes call completion events
- Signature validation prevents spoofed webhooks
- Duplicate events are idempotent (same call, same state)
- Recording URL is stored for later transcription
- Call state transitions are logged

**Estimated:** 0.5 day

**Dependencies:** Task 5.1, 5.2

### Week 2: Core Features & Processing

#### Task 5.5: Transcript Processing Pipeline
**Description:**
Process call transcripts to extract text, detect spoken opt-out signals, and flag uncertain content for manual review.

**Scope:**
- Create `TranscriptProcessor` service
  - Accept raw transcript text from webhook (initially manual input or stubbed)
  - Store transcript in `transcripts` table with status=pending
  - Detect opt-out keywords ("remove me", "unsubscribe", "do not call")
  - Flag transcripts with low confidence (<70%) for manual review
  - Mark transcript as reviewed/approved or rejected
  - Emit `transcript:processed` event
- Implement keyword-based opt-out detection (regex or simple string match)
- Support manual review feedback (confidence adjustment, opt-out confirmation)
- Batch transcript processing (if multiple recording URLs available)
- No external ML service yet (manual review only)

**Acceptance:**
- Transcripts are stored with confidence scores
- Spoken opt-out keywords are detected with >90% accuracy on test data
- Low-confidence transcripts are flagged for review
- Manual feedback updates transcript status
- Opt-out signals trigger immediate suppression

**Estimated:** 1 day

#### Task 5.6: Campaign Management API
**Description:**
Build REST endpoints to CRUD campaigns and manage their lifecycle (create, schedule, start, pause, stop).

**Scope:**
- POST `/api/v1/campaigns` — Create campaign
  - Input: name, description, prospect_ids[], config (max_calls_per_hour, start_time, end_time)
  - Output: campaign object with status=draft
- GET `/api/v1/campaigns` — List campaigns with filters and pagination
  - Filter by status (draft, scheduled, running, paused, completed)
  - Sort by created_at, started_at
  - Include aggregate counts (calls_total, calls_completed, calls_failed)
- GET `/api/v1/campaigns/{id}` — Campaign detail
  - Include linked calls (summary only)
  - Include progress (calls_completed / calls_total)
- PATCH `/api/v1/campaigns/{id}` — Update campaign (name, description, config)
- POST `/api/v1/campaigns/{id}/start` — Transition to running
  - Populate call job queue with jobs for all prospect_ids
  - Emit `campaign:started` event
- POST `/api/v1/campaigns/{id}/pause` — Transition to paused
  - Clear pending jobs from queue
  - Emit `campaign:paused` event
- POST `/api/v1/campaigns/{id}/resume` — Resume from paused
  - Re-queue incomplete calls
- POST `/api/v1/campaigns/{id}/stop` — Finalize campaign
  - Transition to completed
  - Clear any remaining jobs
- Authorization: Only campaign owner (user_id) can modify

**Acceptance:**
- Campaigns can be created, started, paused, and stopped
- Campaign progress is accurately tracked
- Job queue is populated on start, cleared on pause
- Only authorized users can modify campaigns
- Status transitions are validated (no invalid paths)

**Estimated:** 1 day

**Dependencies:** Task 5.1, 5.3

#### Task 5.7: Call History & Status Endpoints
**Description:**
Provide endpoints for querying call history, individual call details, and retry capabilities.

**Scope:**
- GET `/api/v1/calls` — List all calls with filters
  - Filter by campaign_id, prospect_id, status (pending, dialing, completed, failed)
  - Include call duration, disposition, created_at, attempted_at
  - Pagination (limit, offset)
  - Searchable by phone number
- GET `/api/v1/calls/{id}` — Call detail
  - Include call_session (provider_id, recording_url)
  - Include transcript (if available)
  - Include retry history
  - Include timeline of events (initiated, in-progress, completed, opt-out_detected, etc.)
- POST `/api/v1/calls/{id}/retry` — Manually retry a failed call
  - Only available for failed calls
  - Re-queue with new job
  - Increment retry_count
  - Reset next_retry_at
- PATCH `/api/v1/calls/{id}` — Manual call updates
  - Allow notes, suppression flags, disposition override
- Bulk retry: POST `/api/v1/calls/bulk-retry` with call_ids[]

**Acceptance:**
- Calls can be queried by status, campaign, prospect
- Call detail includes full history and transcript
- Manual retry is available for failed calls
- Bulk retry works for up to 100 calls

**Estimated:** 0.5 day

**Dependencies:** Task 5.1, 5.3

#### Task 5.8: Compliance & Suppression Enforcement
**Description:**
Extend suppression system to respect consent and opted-out states before call initiation.

**Scope:**
- Extend existing `Suppression` model to include voice channel
  - New field: `voice_suppressed_at` (NULL or timestamp)
  - Reason enum: opted_out_spoken, opted_out_consent, invalid_number, do_not_call_registry
- Create `ComplianceChecker` service
  - Method: `canCallProspect(prospectId, phoneNumber)` → boolean
  - Check: is prospect in suppression list for voice?
  - Check: does prospect have consent for voice calls?
  - Check: is phone_number valid (E.164, not blacklisted)?
  - Return: { allowed, reason_if_blocked }
- Integrate ComplianceChecker into Call Job Processor
  - Skip non-compliant calls (don't error, just skip)
  - Log suppression skips as skipped_calls
  - Emit `call:skipped_compliance` event
- Extend transcript processor to update suppression on opt-out detection
  - Auto-create suppression record with voice_suppressed_at
  - Emit `prospect:voice_suppressed` event
- Unit tests for all compliance rules

**Acceptance:**
- Non-consenting prospects are not called
- Suppressed numbers are skipped without error
- Spoken opt-outs immediately create suppression records
- Compliance rules are logged and observable

**Estimated:** 0.5 day

**Dependencies:** Task 5.5, 5.3

### Week 2-3: Frontend & Integration

#### Task 5.9: Frontend Campaign Management UI
**Description:**
Build React pages for campaign CRUD, status monitoring, and call history viewing.

**Scope:**
- Route: `/campaigns` — Campaign list page
  - Table showing campaigns (name, status, created_at, progress bar)
  - Create campaign button → modal or dedicated form
  - Filter by status
  - Actions: view detail, start, pause, stop, delete draft
  - Pagination
- Route: `/campaigns/new` — Create campaign form
  - Text input: name, description
  - Multi-select: prospect_ids (searchable dropdown)
  - Toggle/input: max_calls_per_hour, time window (start/end)
  - Submit → create campaign
  - Validation: at least 1 prospect, valid time window
- Route: `/campaigns/{id}` — Campaign detail page
  - Header: name, status, progress (calls_completed / calls_total)
  - Tabs:
    - **Overview:** Status, metrics, start/pause/stop buttons
    - **Calls:** List of calls in campaign (paginated), click to view call detail
    - **Transcripts:** Flagged transcripts for review (count, filter by status)
  - Real-time updates (WebSocket or polling)
- Component: `<TranscriptReviewQueue />`
  - List flagged transcripts (status=flagged_for_review)
  - Show raw/processed text
  - Button: "Approve", "Reject", "Confirm Opt-Out"
  - Bulk actions for multiple transcripts
- Styling: Tailwind, consistent with existing app
- Error handling for long-running operations (progress bar, cancel option)

**Acceptance:**
- Campaigns can be created with name, description, and prospect selection
- Campaign status and progress are displayed in real-time
- Call history is visible and paginated
- Transcripts can be reviewed and approved/rejected
- Non-owner users cannot modify campaigns

**Estimated:** 2 days

**Dependencies:** Task 5.6, 5.7

#### Task 5.10: Call Center Dashboard
**Description:**
Build a dashboard showing real-time call metrics, campaign progress, and quality indicators.

**Scope:**
- Route: `/call-center/dashboard`
  - Metric cards:
    - Calls Today (total)
    - Calls Completed (with success rate %)
    - Avg Call Duration (mm:ss)
    - Calls Pending (in queue)
    - Opt-outs Detected (today)
  - Campaign Progress Chart (calls_completed vs calls_total by campaign)
  - Active Campaigns List (mini cards showing status and ETA)
  - Recent Calls (last 10, status indicator, click to detail)
  - Flagged Transcripts Alert (count, link to review queue)
  - Refresh button, auto-refresh every 30 seconds
- API endpoint: GET `/api/v1/call-center/dashboard` (aggregated metrics)
- Real-time updates (WebSocket for live counts, or polling every 30s)

**Acceptance:**
- Metrics are accurate and update in real-time
- Dashboard is responsive and loads in <2 seconds
- Charts are readable and informative
- Alerts for high failure rates or pending tasks are visible

**Estimated:** 1 day

**Dependencies:** Task 5.7, 5.8

#### Task 5.11: Call Detail & Transcript Review
**Description:**
Create detailed view for individual calls with transcript playback and manual feedback.

**Scope:**
- Route: `/calls/{id}` — Call detail page
  - Header: prospect name/phone, call datetime, duration, status
  - Call info card:
    - Date/time (local timezone)
    - Duration (mm:ss)
    - Disposition (answered, no-answer, voicemail, failed)
    - Recording link (if available)
  - Transcript section:
    - Raw text (if available)
    - Highlighted opt-out keywords (if detected)
    - Confidence score
    - Status (pending, reviewed, approved, rejected)
    - Manual feedback form (if flagged for review)
  - Timeline of events:
    - call_initiated → initiated at [time]
    - call_in_progress → connected at [time]
    - call_completed → ended at [time], duration [mm:ss]
    - transcript_processed → processed at [time], confidence [%]
    - opted_out_detected → opt-out detected in transcript
  - Actions:
    - Retry call (if failed)
    - Mark as duplicate/spam
    - Download transcript

**Acceptance:**
- Call detail loads with all metadata
- Transcripts display with highlighted keywords
- Timeline shows accurate event sequence
- Manual feedback can be submitted

**Estimated:** 1 day

**Dependencies:** Task 5.5, 5.7

### Week 3: Testing & Documentation

#### Task 5.12: Unit & Integration Tests
**Description:**
Achieve ≥75% code coverage for telephony layer, with integration tests for end-to-end call flow.

**Scope:**
- Unit tests:
  - TelephonyProvider adapter (mock Twilio, test initiateCall, getStatus)
  - ComplianceChecker (test suppression logic, consent rules)
  - TranscriptProcessor (test opt-out detection, confidence scoring)
  - CallJobProcessor (test job processing, retry logic, queue management)
  - Campaign service (test CRUD, status transitions)
- Integration tests:
  - End-to-end call flow: create campaign → start → process job → webhook → transcript → review
  - Suppression bypass: ensure suppressed prospects are skipped
  - Manual test cases for opt-out scenarios
  - Retry mechanism with dead-letter queue
- Performance tests:
  - Campaign with 1000 prospects (job processing time)
  - Bulk retry (100 calls)
  - Transcript processing (concurrent processing of 10 transcripts)
- Test data: Seeded campaigns, calls, transcripts
- Coverage report (target: ≥75%)

**Acceptance:**
- Unit tests pass with ≥75% coverage
- Integration tests cover critical paths
- Performance tests show acceptable throughput
- All edge cases (invalid phone, network errors, duplicate events) are tested

**Estimated:** 1.5 days

**Dependencies:** All tasks in Weeks 1-2

#### Task 5.13: API Documentation & Postman Collection
**Description:**
Document all new endpoints with request/response examples and update Postman collection.

**Scope:**
- Update OpenAPI/Swagger spec with:
  - POST /campaigns
  - GET /campaigns
  - GET /campaigns/{id}
  - PATCH /campaigns/{id}
  - POST /campaigns/{id}/start, /pause, /resume, /stop
  - GET /calls
  - GET /calls/{id}
  - POST /calls/{id}/retry
  - POST /webhooks/calls/events
  - PATCH /transcripts/{id}
  - GET /call-center/dashboard
- Include request/response examples for all endpoints
- Document error codes and retry behavior
- Update Postman collection with all new requests
- Add collection tests for happy path scenarios

**Acceptance:**
- API spec is complete and accurate
- Postman collection is importable and runnable
- All examples are tested and working

**Estimated:** 0.5 day

#### Task 5.14: Deployment & Smoke Tests
**Description:**
Deploy Phase 5 to staging, validate end-to-end flow, and prepare go-live checklist.

**Scope:**
- Docker: Update `Dockerfile.backend` with new env vars (Twilio SID, Token, Phone)
- CI/CD: Add Phase 5 tests to pipeline
- Staging deployment:
  - Deploy with test Twilio account
  - Run smoke tests (create campaign, initiate test call, verify webhook)
  - Validate database migrations on staging
  - Performance baseline (response times, throughput)
- Go-live checklist:
  - Compliance review (TCPA, consent enforcement verified)
  - Production Twilio account provisioned
  - Error monitoring & alerting configured
  - Backup/restore procedures documented
  - Runbook for on-call support
- Document known limitations (no sentiment analysis, manual transcript review only)

**Acceptance:**
- All Phase 5 code deploys cleanly to staging
- End-to-end test flow passes
- Go-live checklist is complete and reviewed

**Estimated:** 1 day

**Dependencies:** All tasks in Weeks 1-3

### Week 3-4: Polish & Hardening (Optional, if time permits)

#### Task 5.15: Advanced Error Handling & Retry (Optional)
**Description:**
Implement circuit breaker for telephony provider, handle edge cases, and improve observability.

**Scope:**
- Circuit breaker for Twilio adapter:
  - Open if failure rate >20% in 5-minute window
  - Half-open: allow 1 test call
  - Closed: normal operation
  - Graceful degradation: queue calls when circuit open
- Enhanced retry logic:
  - Different retry strategies by error type (timeout vs. invalid_number)
  - Jitter in backoff to prevent thundering herd
  - Per-campaign rate limiting
- Observability:
  - Structured logging for call initiation, completion, errors
  - Metrics: calls_initiated, calls_completed, calls_failed, opt_outs_detected
  - Traces: request ID propagation for call flows

**Estimated:** 1 day (optional)

#### Task 5.16: Voicemail & Advanced IVR (Optional)
**Description:**
Add voicemail detection and initial IVR menu (future enhancement).

**Scope:**
- Voicemail detection: Detect beep/recording start
- IVR menu: Simple options (press 1 for yes, 2 for no)
- Response capture: Extract DTMF input
- This task is scoped as optional and deferred if timeline is tight

**Estimated:** 2 days (optional, defer to Phase 6)

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Twilio API rate limits / failures | Calls pending indefinitely | Implement circuit breaker, queue retries, alert on high failure rate |
| Webhook timeout or idempotency issues | Duplicate call records or missed events | Implement idempotency key, deduplicate on provider_id, test webhook retry scenarios |
| Transcript quality (if auto-generated) | False opt-out detection | Start with manual review only, add ML model later with tuning |
| TCPA compliance gaps | Legal/regulatory risk | Enforce consent & suppression checks, log all decisions, document audit trail |
| Concurrent job processing bottleneck | Calls queued longer than expected | Profile Job Processor, scale horizontally, use job concurrency limits |
| Schema migration complexity | Data loss or downtime | Test migrations on staging, provide rollback plan, use feature flags for gradual rollout |

## Success Metrics

- ✅ All 13-16 tasks completed (optional tasks 5.15-5.16 can be deferred)
- ✅ ≥75% code coverage for voice layer
- ✅ 0 critical bugs before go-live
- ✅ Call success rate >95% (answered calls / total calls)
- ✅ Average call duration >30 seconds (indicates connection)
- ✅ Opt-out detection accuracy >90% on test recordings
- ✅ Webhook processing latency <2 seconds
- ✅ Campaign processing throughput >50 calls/minute
- ✅ All compliance rules enforced (0 non-consenting calls placed)
- ✅ Go-live checklist fully signed off

## Exit Criteria

Phase 5 is **complete** when:

1. ✅ All database migrations applied and tested on staging
2. ✅ Telephony provider adapter (Twilio) verified and working
3. ✅ Campaign CRUD API endpoints fully functional and documented
4. ✅ Call job processor handling queue with retry/backoff
5. ✅ Webhook handler ingesting events and updating call state
6. ✅ Transcript processing pipeline working (manual review available)
7. ✅ Compliance checker enforcing suppression + consent
8. ✅ Frontend campaign management UI complete and usable
9. ✅ Call center dashboard showing real-time metrics
10. ✅ Call detail & transcript review pages functional
11. ✅ Unit tests passing with ≥75% coverage
12. ✅ Integration tests covering end-to-end flows
13. ✅ API documentation complete (OpenAPI + Postman)
14. ✅ Staging deployment successful
15. ✅ Go-live checklist reviewed and approved
16. ✅ Runbook and on-call documentation provided

## Team Allocation

- **Backend Lead:** Tasks 5.1, 5.2, 5.3, 5.4, 5.8, 5.12, 5.14
- **Backend Engineer:** Tasks 5.5, 5.6, 5.7, 5.10
- **Frontend Engineer:** Tasks 5.9, 5.11, 5.10
- **DevOps/QA:** Task 5.14 (deployment), Task 5.12 (test execution)

## Dependencies & Critical Path

```
0 days: Phase 4 complete
Day 1:  Task 5.1 (DB Schema) + Task 5.2 (Twilio Adapter) [parallel]
Day 2:  Task 5.3 (Job Queue) [depends on 5.1]
        Task 5.4 (Webhook) [depends on 5.1]
        Task 5.6 (Campaign API) [depends on 5.1, 5.3]
Day 3:  Task 5.5 (Transcripts) [depends on 5.1]
        Task 5.7 (Call Endpoints) [depends on 5.1]
        Task 5.8 (Compliance) [depends on 5.5, 5.3]
Day 4:  Task 5.9 (Frontend Campaigns) [depends on 5.6]
        Task 5.10 (Dashboard) [depends on 5.7]
Day 5:  Task 5.11 (Call Detail) [depends on 5.5, 5.7]
        Task 5.12 (Tests) [depends on all Week 1-2 tasks]
Day 6:  Task 5.13 (Documentation) [depends on all APIs]
        Task 5.14 (Deploy) [depends on all features]
Day 7:  Optional: Task 5.15, 5.16 (Advanced features)
```

## Next Steps

1. **Review & Approval:** Share this plan with stakeholders, collect feedback
2. **Setup Phase 5 Branch:** `git checkout -b phase-5-voice-calling`
3. **Create Phase 5 Tracking Issue:** Link to this document
4. **Day 1 Standup:** Assign team members, confirm dependencies, start Task 5.1

---

**Document Version:** 1.0  
**Created:** May 7, 2026  
**Last Updated:** May 7, 2026
