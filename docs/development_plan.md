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

1. Freeze product scope for MVP and Phase 2.
2. Define final entities and relation rules.
3. Define API contracts and error model.
4. Define legal and compliance constraints for outreach.
5. Exit criteria: approved API spec, schema draft, and acceptance tests.

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
