## Development Strategy

1. Build core product first: phone registry, relations, auth, and search.
2. Add enrichment second: CNPJ ingestion and deduplicated upsert.
3. Add outreach third: call attempts, timeline, compliance controls.
4. Add automated voice calling as Phase 2 after stable MVP.

## Team Setup and Roles

1. Product owner: priorities, acceptance criteria, legal/compliance decisions.
2. Backend engineer: API, schema, jobs, provider adapters.
3. Frontend engineer: login/auth flows, list/detail screens, filters.
4. Data engineer or backend support: normalization, dedup, quality rules.
5. QA: test plans, regression, UAT checklists.
6. DevOps: environments, CI/CD, observability, backups.

## Architecture Baseline

1. Primary data store: PostgreSQL.
2. Performance layer: Redis.
3. Services: web app, API, workers, database, cache.
4. Queue model: background workers for enrichment and call workflows.
5. Auth model: local auth plus Google and Microsoft social login.

## Phase Plan

1. Phase 0, Discovery and Contracts, 1 week.
2. Phase 1, MVP Foundation, 3 weeks.
3. Phase 2, CNPJ Enrichment, 2 weeks.
4. Phase 3, Outreach and Timeline Hardening, 2 weeks.
5. Phase 4, Production Readiness, 2 weeks.
6. Phase 5, Automated Voice Calls, 3 to 4 weeks.

## Phase 0, Discovery and Contracts

1. Freeze MVP scope to the phone-first system only: phones, people, businesses, departments, auth, relation tables, search, and filters.
2. Confirm the core MVP entities and relation rules, including ownership, channels, consent, sources, and contact attempts.
3. Define the API contract and error model for all MVP endpoints.
4. Define legal and compliance constraints for outreach, but keep outreach features out of MVP delivery.
5. Exit criteria: approved scope freeze, API spec, schema draft, and acceptance tests.

## Phase 1, MVP Foundation

1. Implement auth: sign up, sign in, sign out.
2. Implement password recovery with one-time expiring tokens.
3. Implement social login buttons and OAuth callbacks for Google and Microsoft.
4. Implement phones CRUD and owners CRUD.
5. Implement relation tables: owners, channels, consents, attempts, sources.
6. Implement filters and pagination for phone list.
7. Build web pages: login, signup, forgot/reset, list, details.
8. Exit criteria: users manage phone lifecycle end to end in UI.

## Phase 2, CNPJ Enrichment

1. Build provider adapter interface.
2. Add Brasil API as primary adapter.
3. Add CNPJA as fallback adapter.
4. Add normalization and checksum validation.
5. Add deterministic upsert and source provenance.
6. Add Redis caching and idempotency keys.
7. Add batch job pipeline and job status endpoints.
8. Exit criteria: batch and single lookups enrich records without duplicates.

## Phase 3, Outreach and Timeline Hardening

1. Standardize contact attempt outcomes and audit events.
2. Add suppression and consent enforcement before outreach actions.
3. Build timeline view with attempts, events, and consent changes.
4. Add export/report endpoint for outreach history.
5. Exit criteria: complete audit trail for each contacted phone.

## Phase 4, Production Readiness

1. Security hardening: lockout, rate limits, session policy.
2. Observability: logs, metrics, tracing, alerts.
3. Reliability: retries, dead-letter handling, circuit breakers.
4. Data protection: backup, restore, retention policy.
5. Performance tests for list filters and enrichment workers.
6. Exit criteria: go-live checklist fully passed.

## Phase 5, Automated Voice Calls

1. Implement call campaigns, call jobs, and call sessions.
2. Integrate telephony provider through adapter.
3. Add webhook ingestion and event timeline.
4. Add transcript processing and identity extraction.
5. Add confidence thresholds and manual review queue.
6. Enforce spoken opt-out immediate suppression.
7. Exit criteria: identified people are linked with confidence and provenance.

## Data and Quality Rules

1. Normalize phone number on write and keep raw value.
2. Track ownership history with start and end dates.
3. Never hard-delete interaction history.
4. Store source metadata for every enrichment write.
5. Define duplicate resolution policy by deterministic precedence.

## Prospect Contact, Meeting, and Sales Rules

1. Prospect contact cadence must be rule-driven by status:
	- new prospect: up to 2 attempts in 48 hours
	- contacted no answer: wait at least 24 hours before next attempt
	- meeting scheduled: no additional cold outreach attempts
	- closed won or closed lost: outreach blocked except allowed follow-up policy
2. Respect suppression and consent before any outreach action (call, WhatsApp, SMS, email).
3. Meeting scheduling must require:
	- linked prospect and owner
	- date/time and timezone
	- channel (phone, video, in-person)
	- confirmation state (pending, confirmed, canceled, no_show)
4. Product sales registration must require:
	- linked opportunity and product
	- quantity, unit price, discount, and final amount
	- stage transitions with audit trail (proposal, negotiation, won, lost)
5. Every state change in contact, meeting, or sales flow must create a timeline event.

## Planned Frontend Pages

1. Prospect contact queue page with priority and next-action date.
2. Prospect detail page with timeline, consent state, and relationship map.
3. Meeting calendar page with create/edit/cancel actions and status filters.
4. Opportunity pipeline page by stage and owner.
5. Opportunity detail page with products, pricing, discount, and close reason.
6. Sales reports page with conversion, revenue, and funnel metrics.

## Frontend Page Specification by Route

1. Route: /prospects
	- fields: search, owner, status, consent, next_action_date, last_contact_at, priority
	- actions: create prospect, assign owner, update status, register contact attempt, open details
	- states: loading list, empty list, filtered results, pagination loading, validation error, permission denied
2. Route: /prospects/{id}
	- fields: basic profile, linked phone/person/business, status, consent, suppression, next_action_at, timeline
	- actions: edit profile, change status, update consent, schedule meeting, create opportunity, log contact attempt
	- states: loading detail, not found, read-only mode, edit mode, save success, save error, conflict on stale update
3. Route: /meetings/calendar
	- fields: date range, timezone, channel, owner, status, prospect name
	- actions: create meeting, reschedule, cancel, confirm, open meeting detail
	- states: loading calendar, no meetings, day/week/month view, reminder pending, sync error
4. Route: /meetings/{id}
	- fields: prospect, owner, datetime, timezone, channel, status, notes, event history
	- actions: confirm, reschedule, cancel, mark no_show, mark completed
	- states: loading detail, pending, confirmed, canceled, no_show, completed, invalid transition error
5. Route: /opportunities
	- fields: stage, owner, expected_close_date, estimated_total, last_stage_change, win_probability
	- actions: create opportunity, move stage, assign owner, open detail, filter by stage
	- states: loading board, empty board, drag-drop updating, stage update success, stage update failure
6. Route: /opportunities/{id}
	- fields: stage, products, quantities, prices, discounts, totals, close reason, transition history
	- actions: add product, remove product, edit line item, transition stage, close won, close lost
	- states: loading detail, draft changes, recalculating totals, unsaved changes warning, save error, closed-readonly
7. Route: /sales/orders
	- fields: order number, opportunity, status, issued_at, paid_at, gross_total, net_total
	- actions: create order from won opportunity, issue order, register payment, cancel order, open order detail
	- states: loading list, empty list, draft, issued, paid, canceled, transition blocked
8. Route: /sales/reports
	- fields: date range, owner, stage funnel counts, conversion rate, revenue totals, average ticket
	- actions: apply filters, refresh metrics, export report
	- states: loading metrics, no data in period, partial data warning, export in progress, export complete, query timeout

## Planned Backend Endpoints

1. GET /api/v1/prospects
2. POST /api/v1/prospects
3. GET /api/v1/prospects/{prospectId}
4. PATCH /api/v1/prospects/{prospectId}
5. POST /api/v1/prospects/{prospectId}/contact-attempts
6. GET /api/v1/meetings
7. POST /api/v1/meetings
8. PATCH /api/v1/meetings/{meetingId}
9. POST /api/v1/meetings/{meetingId}/confirm
10. POST /api/v1/meetings/{meetingId}/cancel
11. GET /api/v1/opportunities
12. POST /api/v1/opportunities
13. PATCH /api/v1/opportunities/{opportunityId}
14. POST /api/v1/opportunities/{opportunityId}/products
15. POST /api/v1/opportunities/{opportunityId}/stage-transition
16. GET /api/v1/sales/reports/funnel

## Planned Database Tables

1. prospects
2. prospect_status_history
3. meeting_events
4. meetings
5. products
6. opportunities
7. opportunity_products
8. sales_orders
9. sales_order_items
10. stage_transitions
11. activity_timeline

## Testing Plan

1. Unit tests for normalization, dedup, and auth flows.
2. Integration tests for API contracts and database transactions.
3. Contract tests for CNPJ provider adapters.
## 4. End-to-end tests for key flows:

1. signup to login to create phone to add owner.
2. forgot password to reset password.
3. CNPJ lookup to upsert business and phones.
5. Load tests for list filtering and batch enrichment.
6. UAT scripts for business users.

## CI/CD Plan

1. Pull request checks: lint, tests, migrations validation.
2. Preview environment for UI and API validation.
3. Staging deployment with seed data and smoke tests.
4. Production deploy with rollback strategy and migration guardrails.

## Definition of Done for Every Story

1. API contract updated.
2. DB migration included and reversible.
3. Tests added and passing.
4. Logs and metrics added.
5. Documentation updated.
6. Security and compliance checklist reviewed.

## Risks and Mitigation

1. CNPJ provider instability: fallback providers, cache, retries.
2. Data quality inconsistency: strict normalization and confidence scoring.
3. Compliance risk in outreach: hard suppression enforcement and audit logs.
4. Scope creep: phase gates and frozen MVP acceptance criteria.
5. OAuth friction: start with tested libraries and provider sandbox environments.

## Suggested Timeline

1. Weeks 1 to 2: Discovery, schema, contracts, auth skeleton.
2. Weeks 3 to 5: MVP core entities, UI core, filters, tests.
3. Weeks 6 to 7: CNPJ enrichment pipeline.
4. Weeks 8 to 9: Outreach timeline and compliance hardening.
5. Weeks 10 to 11: production readiness and go-live.
6. Weeks 12 to 15: automated voice call Phase 2.
