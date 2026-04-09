# Phone List Project Redo Plan

## 1. Product Definition

Rebuild the project as a phone list system where each phone is a first-class record and is linked to detailed context.

Primary objective:
- Store, validate, and query phone numbers with clear relations to people, companies, departments, channels, consent, and interaction history.

## 2. Scope (MVP)

In scope:
- Canonical phone registry with normalization and uniqueness rules.
- Relations between phone and:
  - person
  - business
  - department
  - communication channels (call, WhatsApp, Telegram, SMS)
  - source/provenance
  - consent/suppression state
  - contact attempts and outcomes
- Search and filtering dashboard.
- CRUD + relation management APIs.
- Authentication for internal users:
  - email/password sign in
  - password recovery flow
  - social sign in and sign up buttons for Gmail (Google) and Outlook (Microsoft)

Out of scope (Phase 2+):
- AI voice bot and autonomous outbound calling.
- Large-scale enrichment pipelines.
- Advanced lead scoring.
- Note: automated phone-call acquisition is specified in Section 6 as a Phase 2 track.

## 3. Core Data Model

Main entities:
- phones
  - id (uuid)
  - e164_number (string, unique)
  - raw_number (string)
  - country_code (string)
  - national_number (string)
  - type (mobile, landline, whatsapp, unknown)
  - status (active, inactive, invalid, blocked)
  - is_primary (boolean)
  - verified_at (timestamp, nullable)
  - last_seen_at (timestamp, nullable)
  - created_at, updated_at

- people
  - id (uuid)
  - full_name
  - role_title
  - email
  - created_at, updated_at

- businesses
  - id (uuid)
  - cnpj (nullable for MVP if not required)
  - legal_name
  - trade_name
  - created_at, updated_at

- departments
  - id (uuid)
  - business_id (fk)
  - name

- app_users
  - id (uuid)
  - email (unique)
  - password_hash (nullable for social-only users)
  - display_name
  - status (active, locked, invited)
  - last_login_at (timestamp, nullable)
  - created_at, updated_at

- auth_identities
  - id (uuid)
  - user_id (fk)
  - provider (local, google, microsoft)
  - provider_subject (unique per provider)
  - email_at_provider
  - created_at

- password_reset_tokens
  - id (uuid)
  - user_id (fk)
  - token_hash
  - expires_at
  - used_at (timestamp, nullable)
  - created_at

Relation tables:
- phone_owners
  - id
  - phone_id (fk)
  - owner_type (person, business, department)
  - owner_id
  - relation_label (personal, reception, sales, support, finance)
  - confidence_score (0-100)
  - start_date, end_date

- phone_channels
  - id
  - phone_id (fk)
  - channel_type (call, whatsapp, telegram, sms)
  - is_enabled

- phone_sources
  - id
  - phone_id (fk)
  - source_name
  - source_url
  - collected_at
  - collector (manual, import, crawler)

- phone_consents
  - id
  - phone_id (fk)
  - consent_type (marketing, transactional)
  - status (granted, revoked, unknown)
  - recorded_at

- contact_attempts
  - id
  - phone_id (fk)
  - channel_type
  - attempted_at
  - outcome (answered, no_answer, wrong_number, opted_out, failed)
  - notes

Indexes and constraints:
- unique index on phones.e164_number
- unique index on app_users.email
- unique index on auth_identities(provider, provider_subject)
- composite indexes:
  - phone_owners(phone_id, owner_type, owner_id)
  - contact_attempts(phone_id, attempted_at desc)
  - phone_consents(phone_id, consent_type)

## 4. API Redesign

Namespace:
- /api/v1

Endpoints (MVP):
- POST /auth/signin
- POST /auth/signup
- POST /auth/password/forgot
- POST /auth/password/reset
- GET /auth/oauth/google/start
- GET /auth/oauth/google/callback
- GET /auth/oauth/microsoft/start
- GET /auth/oauth/microsoft/callback
- POST /auth/signout
- GET /phones
- POST /phones
- GET /phones/{id}
- PATCH /phones/{id}
- DELETE /phones/{id}
- POST /phones/{id}/owners
- DELETE /phones/{id}/owners/{ownerRelationId}
- POST /phones/{id}/channels
- POST /phones/{id}/consents
- POST /phones/{id}/attempts
- GET /owners/people
- POST /owners/people
- GET /owners/businesses
- POST /owners/businesses

List filters:
- number fragment
- type
- status
- owner_type
- channel enabled
- consent status
- last contact window

## 5. CNPJ API Data Acquisition

Goal:
- Enrich businesses and phone relations from official company records and contact providers using CNPJ as the lookup key.

Provider strategy:
- Primary provider: Brasil API (lower cost and broad coverage).
- Secondary provider: CNPJA Open API as fallback when primary fails or returns incomplete data.
- Optional third provider: configurable provider adapter for future integrations.

Ingestion flow:
- Input source can be business list import or manual CNPJ search.
- Normalize CNPJ format before request (digits only).
- Validate CNPJ checksum before calling providers.
- Call provider adapter with timeout, retries, and circuit breaker.
- Map provider response into canonical business and phone records.
- Upsert businesses by CNPJ and link discovered phones through phone_sources.
- Store raw provider payload for traceability and reprocessing.

Data mapping rules:
- business.legal_name <- provider company legal name.
- business.trade_name <- provider trade name/fantasy name.
- phones.raw_number <- provider raw phone string.
- phones.e164_number <- normalized phone number.
- phone_sources.source_name <- provider name.
- phone_sources.source_url <- provider endpoint or reference URL when available.
- phone_owners.relation_label <- inferred from provider field (for example: reception, finance, sales).
- confidence_score <- provider confidence if available, else default rule-based score.

Reliability and cost controls:
- Redis cache for CNPJ lookups (TTL 7 to 30 days by status volatility).
- Idempotency key per CNPJ plus provider and date window.
- Exponential backoff on 429 and 5xx responses.
- Rate limiting per provider key.
- Daily quota tracker and provider failover when quota approaches limit.

Compliance and governance:
- Persist retrieval timestamp and legal basis metadata for each source.
- Keep audit trail for who triggered enrichment and what changed.
- Respect consent and suppression rules before any outbound contact usage.
- Mask sensitive payload fields in logs.

API and jobs to add:
- POST /api/v1/enrichment/cnpj/lookup
- POST /api/v1/enrichment/cnpj/batch
- GET /api/v1/enrichment/jobs/{jobId}
- Worker queue for batch enrichment and retries.

Acceptance checks for CNPJ ingestion:
- Same CNPJ does not create duplicate business records.
- Same phone from different providers merges into one canonical phone with multiple sources.
- Fallback provider is used automatically after primary failure threshold.
- Cache hit ratio and provider error rates are observable in metrics.

## 6. Automated Call Contact Acquisition (Phase 2)

Goal:
- Identify and register the person reached by automated calls on landline, mobile, or WhatsApp voice channel, then link the identified person to the canonical phone record.

Channel coverage:
- Landline call via telephony provider.
- Mobile call via telephony provider.
- WhatsApp call (when provider supports voice call workflow and policy requirements).

Acquisition flow:
- Select target phones based on consent and campaign policy.
- Create outbound call job with idempotency key and retry policy.
- Start call and capture call session metadata (provider call_id, timestamps, recording consent flag).
- IVR/voice agent asks qualification questions (name, role, company confirmation).
- Extract person identity from speech-to-text transcript and confidence scoring.
- If confidence passes threshold, upsert person and create or update phone_owners relation.
- Log full interaction outcome in contact_attempts and call_events timeline.

Data model additions:
- call_campaigns
  - id, name, objective, channel_type, active
- call_jobs
  - id, campaign_id, phone_id, status (queued, dialing, answered, completed, failed), retry_count, scheduled_at
- call_sessions
  - id, call_job_id, provider_name, provider_call_id, started_at, ended_at, duration_seconds
- call_transcripts
  - id, call_session_id, speaker (agent, callee), utterance, confidence, captured_at
- call_events
  - id, call_session_id, event_type (ringing, answered, transfer, hangup, opt_out), event_at, payload_json
- identity_claims
  - id, call_session_id, claimed_name, claimed_role, claimed_company, confidence_score, resolution_status

Matching and resolution rules:
- Phone-first resolution: start from phone_id and existing owners.
- If callee states a new person, create pending identity_claim with confidence.
- Auto-link to people table only above confidence threshold; otherwise queue for manual review.
- Keep previous owner history with end_date when ownership changes.

Compliance and safety:
- Verify consent and suppression status before dialing.
- Play mandatory disclosure message and capture disclosure timestamp.
- Respect quiet hours and regional call rules.
- Store recording only when legally allowed; otherwise keep transcript-only mode.
- Ensure opt-out spoken during call updates phone_consents and suppression list immediately.

APIs and jobs to add:
- POST /api/v1/outreach/calls/campaigns
- POST /api/v1/outreach/calls/jobs
- GET /api/v1/outreach/calls/jobs/{jobId}
- POST /api/v1/outreach/calls/webhook
- POST /api/v1/outreach/calls/sessions/{sessionId}/resolve-identity
- Background workers: dialer worker, transcript processor, identity resolver.

Metrics and monitoring:
- Contact rate by channel (landline, mobile, WhatsApp call).
- Human answer rate and identified-person rate.
- Auto-resolution vs manual-review ratio.
- Opt-out rate and compliance incidents.

Acceptance checks for automated calling:
- Every completed call has a call_session and outcome event trail.
- Identified person is linked to phone with confidence and provenance.
- Opt-out spoken in call blocks future outreach in less than 1 minute.
- Manual review queue receives low-confidence identity claims.

## 7. Frontend Redesign

Pages:
- Login
- Sign Up
- Forgot Password
- Reset Password
- Phone List (table + filters)
- Phone Details (all relations and timeline)
- Owner Management (people, businesses, departments)
- Consent and Suppression Review

Key UI behavior:
- Fast search by number or owner.
- Expand row to show owners/channels quickly.
- Timeline on details page for attempts and consent changes.
- Login and sign-up pages include "Continue with Gmail" and "Continue with Outlook" buttons.
- Password recovery supports request link and secure token reset flow.

## 8. Execution Plan (4 Sprints + Phase 2 Track)

Sprint 1: Data Foundation
- Finalize schema and migrations.
- Seed data for local development.
- Create repository layer and validation rules.
- Implement local auth (signup/signin/signout) and password hashing.
- Provision PostgreSQL as primary datastore and Redis as cache layer.
- Implement single CNPJ lookup endpoint and provider adapters.
- Definition of done: CRUD for phones working in API tests.

Sprint 2: Relations and History
- Implement owners, channels, sources, consents, attempts.
- Add query filters and pagination.
- Implement password recovery (forgot/reset) with expiring one-time tokens.
- Implement batch CNPJ enrichment worker and retry policy.
- Add LocalStack-backed integration tests for queue/event workflows.
- Definition of done: phone details endpoint returns complete relation graph.

Sprint 3: Web Interface
- Build list, detail, and owner screens.
- Build login, sign-up, forgot-password, and reset-password screens.
- Add Gmail and Outlook sign-in/sign-up buttons and callback handling.
- Connect filters and relation editing flows.
- Definition of done: internal user manages full phone lifecycle in UI.

Sprint 4: Hardening and Compliance
- Auth, audit logs, rate limiting.
- Input sanitation and PII protections.
- Provider quota monitoring and cache tuning.
- Enforce secure session policy and account lockout rules.
- Stabilize Docker test profile with LocalStack for reproducible CI runs.
- Backup and restore procedures.
- Definition of done: production readiness checklist approved.

Phase 2 Track: Automated Calls
- Implement call campaigns, call jobs, and provider webhooks.
- Implement transcript processing and identity resolution queue.
- Add manual review UI for low-confidence identity claims.
- Definition of done: identified person from calls is linked to phone with auditable confidence path.

## 9. Technical Decisions

Backend:
- Keep Python API service (as in current structure) or migrate only if velocity is blocked.
- Use PostgreSQL as source of truth.

Database architecture decision (Relational vs NoSQL vs Cache):
- Primary database type: Relational.
  - Choice: PostgreSQL.
  - Reason: domain requires strong relations, constraints, joins, and transactional consistency (phones, owners, consent, attempts, identity history).
- Cache database type: Support only.
  - Choice: Redis.
  - Usage: CNPJ lookup cache, session/cache tokens, rate-limit counters, idempotency keys, short-lived job states.
- NoSQL database type: Optional future add-on.
  - Use only for high-volume semi-structured telemetry/event workloads if needed.
  - Not required for MVP and not the system of record.

Decision summary:
- Best fit for this project is relational + cache: PostgreSQL (system of record) and Redis (performance layer).

Local integration testing with AWS LocalStack:
- Yes, project testing can use AWS LocalStack in Docker.
- Purpose: emulate selected AWS services locally for deterministic integration tests without using real cloud accounts.
- Recommended usage in this project:
  - SQS emulation for background job queue tests.
  - SNS emulation for event fan-out tests if adopted.
  - S3 emulation for storing test artifacts (for example transcripts or payload snapshots) if adopted.
- Boundaries:
  - PostgreSQL remains the system of record.
  - Redis remains the runtime cache.
  - LocalStack is test infrastructure only, not a primary data store.
- Implementation approach:
  - Add a dedicated docker-compose test profile for localstack.
  - Use endpoint override configuration in API and workers (AWS endpoint -> localstack).
  - Seed queues/buckets during test startup and teardown after runs.
  - Keep provider adapters interface-driven so queue backend can be swapped.

Data quality:
- Normalize to E.164 at write time.
- Keep raw input for traceability.
- Never hard delete contact history; use soft delete where needed.

Integration style:
- Use provider adapters with a unified interface so providers can be swapped without changing core services.
- Persist provider raw payload in a dedicated table for audit and reprocessing.

Authentication style:
- Use OAuth 2.0/OpenID Connect for Google and Microsoft providers.
- Keep local auth and social auth unified under app_users plus auth_identities.
- Store only hashed password-reset tokens and enforce short token expiry.

Call orchestration:
- Use event-driven workers for call lifecycle and post-call identity extraction.
- Keep telephony provider integration behind adapter interfaces.

## 10. Migration Strategy from Current Repo

- Keep current folders:
  - src/api
  - src/database
  - src/www
- Replace placeholder docs and route stubs with phone-centric contracts.
- Add SQL migration set under src/database/migrations.
- Add API contract tests and minimal end-to-end test for create phone -> add owner -> log attempt.
- Add enrichment worker service in compose or as API background worker profile.
- Add call orchestration worker profile and webhook endpoint routing.
- Add auth migration set (app_users, auth_identities, password_reset_tokens) and OAuth provider config.
- Add docker-compose test profile with localstack and test bootstrap scripts.

## 11. Acceptance Criteria

- A phone can be linked to multiple owners over time.
- A person or business can own multiple phones.
- Every phone has channel capabilities and consent state.
- Every outbound contact is auditable by timeline.
- Filters can answer: "show active WhatsApp phones for sales departments with consent granted and no successful contact in last 30 days".
- CNPJ enrichment can be triggered manually and by batch import with deterministic upsert behavior.
- Automated call flows can identify contacted people and persist identity confidence plus provenance.
- Users can sign up/sign in with email/password and with Gmail/Outlook buttons.
- Users can request password recovery and complete reset through one-time expiring token.

## 12. Immediate Next Actions

1. Rewrite src/database README into final schema + migration order.
2. Rewrite src/api README with definitive endpoint contracts and payloads.
3. Rewrite src/www README with page components and user flows.
4. Add first SQL migration for base entities and relation tables.
5. Add cnpj_enrichment_jobs and cnpj_provider_payloads tables plus indexes.
6. Add call_sessions, call_events, call_transcripts, and identity_claims tables plus worker contracts.
7. Add auth tables and endpoints for signup, social login, and password recovery.
8. Add Redis cache configuration and cache-key strategy for CNPJ, sessions, and rate limits.
9. Add LocalStack service to Docker test profile and write first SQS-backed worker integration test.
