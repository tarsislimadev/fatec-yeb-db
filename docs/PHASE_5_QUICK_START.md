# Phase 5: Quick Reference & Team Guide

**Status:** 📋 Ready for Implementation  
**Date:** May 7, 2026

---

## 🎯 What is Phase 5?

Phase 5 adds **automated voice calling** to the system. Users can create campaigns, make outbound calls to prospects, capture transcripts, detect spoken opt-outs, and manage call history—all with built-in compliance checks.

**Duration:** 3-4 weeks | **Team:** 4-5 engineers | **Complexity:** Medium-High

---

## 📋 Task Checklist

### Week 1: Foundation (Days 1-4)

- [ ] **5.1** (0.5d) — Database schema & migrations
  - Create 6 new tables (campaigns, calls, sessions, transcripts, outcomes, retry_log)
  - Add indexes on campaign_id, prospect_id, status
  - Run migrations on staging

- [ ] **5.2** (1.5d) — Telephony adapter (Twilio)
  - Implement `TelephonyProvider` interface
  - Build `TwilioAdapter` with initiateCall, getStatus, deleteCall
  - Mock out `VonageAdapter` for future use
  - Add unit tests with mock responses

- [ ] **5.3** (1d) — Call job processor
  - Create `CallJobProcessor` service on Redis queue (Bull)
  - Implement retry logic with exponential backoff (30s, 5m, 30m)
  - Emit `call:initiated` events
  - Test with 100+ jobs in queue

- [ ] **5.4** (0.5d) — Webhook handler
  - POST `/api/v1/webhooks/calls/events` (public endpoint)
  - Validate Twilio signature
  - Update call status, store session data
  - Handle duplicate events (idempotency)

**Estimated Total:** ~4 days | **Dependencies:** None → can run in parallel

---

### Week 2: Core Features (Days 5-8)

- [ ] **5.5** (1d) — Transcript processing
  - Store transcripts with confidence scores
  - Detect opt-out keywords ("remove me", "unsubscribe", etc.)
  - Flag low-confidence (<70%) for manual review
  - Update suppression on opt-out detection

- [ ] **5.6** (1d) — Campaign management API
  - POST /campaigns (create)
  - GET /campaigns, GET /campaigns/{id}
  - PATCH /campaigns/{id} (update)
  - POST /campaigns/{id}/start, /pause, /resume, /stop
  - Populate job queue on start, clear on pause

- [ ] **5.7** (0.5d) — Call history endpoints
  - GET /calls (list, filter, paginate)
  - GET /calls/{id} (detail with transcript, timeline)
  - POST /calls/{id}/retry (manual retry)
  - POST /calls/bulk-retry

- [ ] **5.8** (0.5d) — Compliance enforcement
  - Check suppression + consent before dialing
  - Skip non-compliant calls (don't error)
  - Auto-suppress on spoken opt-out
  - Log all compliance decisions

**Estimated Total:** ~3.5 days

---

### Week 2-3: Frontend & UI (Days 9-11)

- [ ] **5.9** (2d) — Campaign management UI
  - /campaigns (list, create, filter by status)
  - /campaigns/new (create form)
  - /campaigns/{id} (detail with progress, calls, transcripts)
  - Start/pause/stop buttons, progress bar

- [ ] **5.10** (1d) — Call center dashboard
  - Real-time metrics (calls today, success rate, avg duration)
  - Campaign progress chart
  - Recent calls list
  - Flagged transcripts alert
  - Auto-refresh every 30s

- [ ] **5.11** (1d) — Call detail & transcript review
  - /calls/{id} (full details, timeline, recording link)
  - Transcript display with highlighted keywords
  - Manual review form (approve/reject/opt-out)
  - Download transcript

**Estimated Total:** ~4 days | **Deliverable:** Fully functional voice UI

---

### Week 3: Testing & Go-Live (Days 12-14)

- [ ] **5.12** (1.5d) — Unit & integration tests
  - ≥75% code coverage for voice layer
  - Test adapter, processor, API endpoints
  - Integration test: campaign → job → webhook → transcript
  - Performance test: 1000 prospects, 100 bulk retry

- [ ] **5.13** (0.5d) — API documentation
  - Update OpenAPI/Swagger spec
  - Add request/response examples
  - Postman collection with tests
  - Document error codes and retry behavior

- [ ] **5.14** (1d) — Deployment & smoke tests
  - Docker: Add Twilio env vars
  - CI/CD: Add Phase 5 tests to pipeline
  - Staging: Deploy, run smoke tests
  - Go-live checklist & sign-off

**Estimated Total:** ~3 days | **Deliverable:** Production-ready voice calling

---

### Optional: Advanced Features (Days 15-21)

- [ ] **5.15** (1d) — Circuit breaker & resilience
  - Add circuit breaker for Twilio adapter
  - Enhanced error handling by type
  - Jitter in backoff to prevent thundering herd
  - Structured logging & metrics

- [ ] **5.16** (2d) — Voicemail & IVR (deferred to Phase 6)
  - Voicemail detection
  - Simple IVR menu (press 1/2)
  - DTMF response capture
  - Status: ⏸️ Defer if timeline tight

**Estimated Total:** ~3 days (can skip if needed)

---

## 🎯 Success Criteria

| Metric | Target | Status |
|--------|--------|--------|
| Tasks Completed | 14/14 core | ⏳ Plan → Execution |
| Code Coverage | ≥75% | ⏳ TBD |
| Call Success Rate | >95% | ⏳ TBD |
| Opt-Out Detection | >90% accurate | ⏳ TBD |
| Webhook Latency | <2 seconds | ⏳ TBD |
| Campaign Throughput | >50 calls/min | ⏳ TBD |
| Go-Live Checklist | ✅ Approved | ⏳ TBD |

---

## 🔗 Critical Path (Parallel Tracks)

```
Day 1     Day 2-3    Day 4    Day 5-6   Day 7     Day 8 ... Day 14
─────┬───────┬────────┬────────┬────────┬────────┬────────┬─────
  5.1  5.2─┐ 5.3─┐ 5.4│ 5.5  │ 5.6   │ 5.7    │ 5.9 5.10│
       └─── 5.3─┤ 5.4│ 5.8   │ (API)  │ (Tests)│ 5.11   │
            └── 5.4   │       │        │        │ (UI)  │
                      └───────┴────────┴────────┴────────┴─ Deployment
```

**Critical Dependencies:**
- 5.1 (DB) blocks everything
- 5.2 (Twilio adapter) can start day 1
- 5.3, 5.4 depend on 5.1
- 5.9, 5.10, 5.11 depend on 5.6, 5.7

---

## 📖 Documentation

**Full Plan:** [phase-5-planning.md](phase-5-planning.md)  
**Project Status:** [IMPLEMENTATION-STATUS.md](../IMPLEMENTATION-STATUS.md)  
**Phase Roadmap:** [phase-summary-roadmap.md](phase-summary-roadmap.md)

---

## 💻 Key Technologies

- **Backend:** Node.js + Express
- **Database:** PostgreSQL (6 new tables)
- **Job Queue:** Redis + Bull
- **Telephony:** Twilio (primary adapter)
- **Frontend:** React 18 + Tailwind + Zustand
- **Testing:** Jest + Supertest + Postman

---

## 🚀 Getting Started

### Before Day 1
1. Read [phase-5-planning.md](phase-5-planning.md) (15 min summary)
2. Set up Twilio account (free trial or staging)
3. Review database schema diagrams
4. Assign team members to tasks

### Day 1 Standup
1. **Backend Lead:** Start 5.1 (DB schema)
2. **Backend Engineer 1:** Start 5.2 (Twilio adapter)
3. **Backend Engineer 2:** Prepare 5.3 (queue setup)
4. **Frontend:** Review 5.9-5.11 UI specs
5. **DevOps/QA:** Review 5.14 deployment checklist

### Daily Standups
- What did you complete yesterday?
- What are you working on today?
- Any blockers?
- Update task status in [phase-5-planning.md](phase-5-planning.md)

---

## 🛑 Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Twilio API timeout | Calls pending | Retry with backoff + circuit breaker |
| Webhook duplicate | Duplicate records | Idempotency key on provider_id |
| Transcript quality | False opt-outs | Manual review + confidence threshold |
| TCPA compliance | Legal risk | Pre-flight suppression checks |
| High job queue | Call delays | Profile + scale job processor |

---

## 📞 Support

- **Questions?** Check [phase-5-planning.md](phase-5-planning.md) task details
- **Blocked?** Open GitHub issue, tag @team
- **Escalations:** Weekly sync with stakeholders
- **On-Call:** See runbook (created in Task 5.14)

---

**Good luck! 🎉 Let's ship Phase 5!**
