# Phase 3: Outreach & Timeline Planning

**Duration:** 2 weeks  
**Status:** Conceptual planning, ready to refine after Phase 2  
**Dependencies:** Phase 2 complete, consent rules finalized, timeline data contract approved

## Objective

Add the outreach and compliance layer needed to manage contact attempts safely, show a complete interaction timeline, and expose export/report endpoints for operational review.

---

## Scope

### In Scope
- Standardized contact attempt outcomes and audit events
- Suppression and consent enforcement before outreach actions
- Timeline view for attempts, events, and consent changes
- Export/report endpoint for outreach history
- Audit log table for compliance and traceability
- Frontend timeline and compliance UI

### Out of Scope
- Automated voice calling
- Telephony provider integration
- Advanced marketing automation
- Production observability hardening beyond Phase 3 needs

---

## Architecture Overview

```
┌──────────────────────────────────────────┐
│ Frontend                                 │
│ - Phone detail timeline                  │
│ - Consent and suppression controls       │
│ - Export/report actions                  │
└──────────────┬───────────────────────────┘
               │
┌──────────────▼───────────────────────────┐
│ API Layer                                │
│ - POST /phones/{id}/contact-attempts     │
│ - PATCH /phones/{id}/consent             │
│ - GET /timeline/{phoneId}                │
│ - GET /reports/outreach                  │
└──────────────┬───────────────────────────┘
               │
┌──────────────▼───────────────────────────┐
│ Outreach Service                         │
│ - Consent and suppression gate           │
│ - Contact outcome normalization          │
│ - Timeline event builder                 │
│ - Export/report formatter                │
└──────────────┬───────────────────────────┘
               │
┌──────────────▼───────────────────────────┐
│ PostgreSQL                               │
│ - contact_attempts                       │
│ - consent states/history                 │
│ - audit_log                              │
└──────────────────────────────────────────┘
```

---

## Data Model Notes

- Reuse `contact_attempts` as the source of truth for outreach history.
- Add `audit_log` for compliance-relevant mutations and timeline aggregation.
- Preserve consent history instead of overwriting current state in place.
- Keep suppression decisions explicit so the UI can explain why an action is blocked.

---

## Implementation Tasks

### Week 1: Compliance Core

#### Task 3.1: Audit Log Table
**Description:**
Add a structured audit log to capture compliance-sensitive changes.

**Scope:**
- Create `audit_log` table
- Store actor, entity type, entity id, action, metadata, and timestamp
- Index by entity and created time

**Acceptance:**
- All outreach-sensitive writes create audit rows
- Queryable history per phone and per actor
- Migration and rollback covered

**Estimated:** 1 day

---

#### Task 3.2: Consent and Suppression Model
**Description:**
Define and enforce consent state transitions for outreach actions.

**Scope:**
- Model marketing and transactional consent states
- Model suppression reasons and expiry where applicable
- Block outbound actions when consent or suppression rules fail

**Acceptance:**
- Consent changes are recorded with timestamps
- Suppressed phones cannot be contacted
- Error messages explain the rule violation

**Estimated:** 1.5 days

---

#### Task 3.3: Contact Attempt Normalization
**Description:**
Standardize contact outcomes and timeline event payloads.

**Scope:**
- Normalize outcomes such as answered, no_answer, wrong_number, opted_out, failed
- Map each attempt to a timeline event
- Store notes and channel metadata consistently

**Acceptance:**
- Same outcome vocabulary used across API and UI
- Timeline events render correctly from stored data
- Invalid outcomes rejected

**Estimated:** 1 day

---

### Week 2: Timeline, Export, and UI

#### Task 3.4: Timeline API
**Description:**
Implement a single read endpoint that merges attempts, consent changes, and audit events.

**Scope:**
- `GET /timeline/{phoneId}`
- Sort by newest first
- Support pagination or bounded lookback if needed

**Acceptance:**
- Timeline returns a complete interaction history
- Empty timelines handled cleanly
- Response format documented and tested

**Estimated:** 1.5 days

---

#### Task 3.5: Outreach Export/Report Endpoint
**Description:**
Provide exportable outreach history for operational use.

**Scope:**
- `GET /reports/outreach`
- Filter by date range, outcome, channel, and owner
- Support CSV or JSON output

**Acceptance:**
- Exports match timeline data
- Filters are validated
- Large result sets handled safely

**Estimated:** 1 day

---

#### Task 3.6: Phone Detail Timeline UI
**Description:**
Display the timeline on the phone detail page.

**Scope:**
- Timeline card/list component
- Consent state summary
- Suppression banner and action blocking state

**Acceptance:**
- Timeline is readable on desktop and mobile
- Consent and suppression state are obvious
- Blocked actions are explained in the UI

**Estimated:** 1.5 days

---

#### Task 3.7: Export UI and QA
**Description:**
Add export action and validate the phase with focused QA.

**Scope:**
- Export button and feedback states
- Regression checks for consent blocking and timeline rendering
- UAT scenarios for outreach history

**Acceptance:**
- Export works for filtered and unfiltered views
- QA covers positive and blocked flows
- Acceptance criteria documented

**Estimated:** 1 day

---

## Success Criteria

- Contact attempts, consent changes, and audit events can be reviewed per phone.
- Outreach actions are blocked when consent or suppression rules fail.
- Timeline endpoint returns a coherent chronological history.
- Export/report output matches the underlying timeline records.
- UAT confirms no silent compliance violations.

---

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Consent rules drift from implementation | Keep rule logic centralized in the outreach service |
| Timeline data becomes fragmented | Build the timeline from a single aggregation path |
| Export results leak sensitive data | Apply the same authorization and suppression checks as the API |
| Audit volume grows quickly | Index by entity and created_at; keep payloads lean |

---

## Exit Criteria

1. Timeline endpoint is implemented and documented.
2. Outreach suppression and consent enforcement are active.
3. Audit logging captures compliance-sensitive changes.
4. Export/reporting endpoint is available.
5. QA and UAT sign off on the phase.
