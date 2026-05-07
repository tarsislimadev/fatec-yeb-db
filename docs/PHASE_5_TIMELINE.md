# Phase 5 Implementation Timeline

**Project:** Automated Voice Calling  
**Duration:** 3 weeks (minimum) - 4 weeks (comfortable)  
**Team:** 4-5 engineers  
**Generated:** May 7, 2026

---

## Gantt Chart (3-Week Compressed Timeline)

```
Week 1: Foundation & Integration
Mon     Tue     Wed     Thu     Fri
5.1     5.1     5.2     5.2     5.3
DB      DB      Twilio  Twilio  Queue
        5.2     5.3     5.3     5.4
        Twilio  Queue   Queue   Webhook

Week 2: Core Features & Processing
Mon     Tue     Wed     Thu     Fri
5.5     5.5     5.6     5.6     5.7
Trans   Trans   Campaign Campaign Calls
5.6     5.8     5.7     5.8     5.8
Campaign Comply Calls   Comply  Comply
        5.7     5.8
        Calls   Comply

Week 3: Frontend, Testing & Deploy
Mon     Tue     Wed     Thu     Fri
5.9     5.9     5.10    5.11    5.12
Campaign Campaign Dashboard Call Detail Tests
5.10    5.11    5.11    5.12    5.13
Dashboard Call   Call    Tests   Docs
                 Detail  5.13    5.14
                 5.12    Docs    Deploy
                 Tests   5.14
                         Deploy
```

---

## Task Dependencies

```
START (Phase 4 complete)
│
├─► 5.1 (DB Schema) ─────┬─┬─┬─────────────────┐
│   [0.5 days]           │ │ │                 │
│                        ▼ ▼ ▼                 │
│   ┌─────────► 5.3 (Queue)  5.4 (Webhook)    │
│   │           [1 day]      [0.5 day]        │
│   │           ┌────────────┴─────────┬───┐  │
│   │           │                      │   │  │
│   ├─► 5.5 (Transcript) ◄─────────┘   │  │
│   │   [1 day]                       │  │
│   │   ┌────────────────────┬────────┴┐ │
│   │   │                    │         ▼ ▼
│   ├─► 5.6 (Campaign API)   │         5.8 (Comply)
│   │   [1 day]              │         [0.5 day]
│   │   ┌────────────────────┴──┐      ▲
│   ├─► 5.7 (Call Endpoints)    │      │
│   │   [0.5 day]               ▼      │
│   │                          5.9 (UI) ◄─┘
│   │                          [2 days]
│   └────────────────────────┐
│                            │    5.10 (Dashboard) [1 day]
│                            ├──►
│                            │    5.11 (Call Detail) [1 day]
│                            ▼
│                          5.12 (Tests) [1.5 days]
│                            ▼
├─────────────────────────► 5.13 (Docs) [0.5 day]
│                            ▼
│                          5.14 (Deploy) [1 day]
│                            ▼
└────────────────────────► ✅ COMPLETE
                         (All tests pass, Go-live ready)
```

---

## Week-by-Week Breakdown

### Week 1: Foundation (Days 1-5)

| Day | Task | Owner | Hours | Status | Notes |
|-----|------|-------|-------|--------|-------|
| Mon | 5.1: DB Schema | Backend Lead | 4 | ⏳ | Create 6 tables, migrations, indexes |
| Mon-Tue | 5.2: Twilio Adapter | Backend Eng 1 | 12 | ⏳ | Interface + TwilioAdapter impl + unit tests |
| Tue-Wed | 5.3: Job Queue | Backend Eng 2 | 8 | ⏳ | Bull queue, retry logic, event emitter |
| Wed-Thu | 5.4: Webhook Handler | Backend Lead | 4 | ⏳ | POST endpoint, signature validation, idempotency |

**Week 1 Deliverable:** ✅ Database ready, Twilio integration working, job queue operational, webhooks receiving events

---

### Week 2: Core Features (Days 6-10)

| Day | Task | Owner | Hours | Status | Notes |
|-----|------|-------|-------|--------|-------|
| Mon | 5.5: Transcripts | Backend Eng 2 | 8 | ⏳ | Process text, detect opt-out, flag review |
| Mon-Tue | 5.6: Campaign API | Backend Lead | 8 | ⏳ | CRUD, start/pause/stop, job population |
| Tue | 5.7: Call Endpoints | Backend Eng 2 | 4 | ⏳ | List, detail, retry, bulk operations |
| Tue | 5.8: Compliance | Backend Eng 1 | 4 | ⏳ | Suppression checks, consent enforcement |
| Wed-Fri | 5.9: Campaign UI | Frontend Eng 1 | 16 | ⏳ | List, create, detail pages, status monitoring |
| Wed | 5.10: Dashboard | Frontend Eng 2 | 8 | ⏳ | Metrics, progress, alerts, real-time updates |

**Week 2 Deliverable:** ✅ All core APIs working, campaign lifecycle functional, frontend campaign management complete

---

### Week 3: Polish & Go-Live (Days 11-15)

| Day | Task | Owner | Hours | Status | Notes |
|-----|------|-------|-------|--------|-------|
| Mon-Tue | 5.11: Call Detail UI | Frontend Eng 1 | 8 | ⏳ | Detail page, transcript review, timeline |
| Tue-Wed | 5.12: Tests | Backend Lead + QA | 12 | ⏳ | Unit tests, integration, ≥75% coverage |
| Wed | 5.13: Documentation | Backend Lead | 4 | ⏳ | OpenAPI, Postman, error codes |
| Wed-Thu | 5.14: Deployment | DevOps/Backend | 8 | ⏳ | Docker, CI/CD, staging, smoke tests |
| Thu-Fri | 5.15: Hardening (Optional) | Backend Eng 1 | 8 | ⏳ | Circuit breaker, error handling, observability |

**Week 3 Deliverable:** ✅ Production-ready code, full test coverage, documentation complete, ready for go-live

---

### Week 4 (Optional, if timeline permits)

| Day | Task | Owner | Hours | Status | Notes |
|-----|------|-------|-------|--------|-------|
| Mon-Tue | 5.16: IVR & Voicemail (Optional) | Backend Eng 1 | 16 | ⏳ | Voicemail detection, simple menu, DTMF |
| Wed-Fri | Polish & Hardening | Team | 24 | ⏳ | Performance tuning, edge case handling |

**Week 4 Deliverable:** 🎉 Advanced features (if time permits), performance optimized, ready for high-volume production use

---

## Team Hours Estimate

### Total Effort by Task
| Task | Hours | Days | Owner |
|------|-------|------|-------|
| 5.1 | 4 | 0.5 | Backend Lead |
| 5.2 | 12 | 1.5 | Backend Eng 1 |
| 5.3 | 8 | 1 | Backend Eng 2 |
| 5.4 | 4 | 0.5 | Backend Lead |
| 5.5 | 8 | 1 | Backend Eng 2 |
| 5.6 | 8 | 1 | Backend Lead |
| 5.7 | 4 | 0.5 | Backend Eng 2 |
| 5.8 | 4 | 0.5 | Backend Eng 1 |
| 5.9 | 16 | 2 | Frontend Eng 1 |
| 5.10 | 8 | 1 | Frontend Eng 2 |
| 5.11 | 8 | 1 | Frontend Eng 1 |
| 5.12 | 12 | 1.5 | Backend Lead + QA |
| 5.13 | 4 | 0.5 | Backend Lead |
| 5.14 | 8 | 1 | DevOps |
| **Total Core** | **120** | **15** | **~4 people** |

### Optional Tasks
| Task | Hours | Days | Owner |
|------|-------|------|-------|
| 5.15 | 8 | 1 | Backend Eng 1 |
| 5.16 | 16 | 2 | Backend Eng 1 |
| **Total Optional** | **24** | **3** | **~1 person** |

**Summary:**
- **Minimum (3 weeks):** 120 hours = 15 person-days with 4 people (40h/wk each)
- **Comfortable (4 weeks):** 144 hours = 18 person-days (includes optional advanced work)
- **Best case (4 weeks with extras):** Team can complete all 16 tasks + hardening

---

## Critical Milestones

### End of Week 1 ✓
- [ ] Database fully migrated and indexed
- [ ] Twilio adapter tested (no real calls, mocks only)
- [ ] Job queue processing calls asynchronously
- [ ] Webhook handler receiving and processing events

### End of Week 2 ✓
- [ ] Campaign CRUD API 100% functional
- [ ] Transcript processing and opt-out detection working
- [ ] Compliance checks preventing non-consented calls
- [ ] Frontend campaign list/detail views working
- [ ] Call center dashboard showing live metrics

### End of Week 3 ✓
- [ ] Call detail page with transcript review
- [ ] 26+ unit tests passing (≥75% coverage)
- [ ] Integration test: campaign → calls → webhooks → transcripts
- [ ] API docs complete (OpenAPI + Postman)
- [ ] **READY FOR GO-LIVE** ✅

---

## Common Timeline Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Task 5.2 blocked | Twilio account not ready | Pre-provision in Week 0, use mocks for early testing |
| Task 5.9 stalled on API | Backend APIs not stable | Strict API contracts, parallel mocking for frontend |
| Task 5.12 discovers bugs | Tests written too late | Write tests as features complete (TDD where possible) |
| Deployment fails | Env vars missing | Document all Twilio env vars in Task 5.14 checklist |
| Webhook spam | No idempotency | Enforce unique constraint on (provider_id, event_id) |

---

## Success Checkpoints

Print this and track daily:

```
PHASE 5 PROGRESS
30-MAY        ████░░░░░░░░░░░░░░░░  Week 1: 25%
06-JUN        ████████████░░░░░░░░░░ Week 2: 60%
13-JUN        ███████████████████░░░ Week 3: 95%
20-JUN        ████████████████████░░ Week 4: 100% (Optional)

Legend:
████ = Completed
░░░░ = Not yet started
```

---

**Next:** Print this document and post in your dev room or Slack as reference!

Questions? See [phase-5-planning.md](phase-5-planning.md) for detailed task specs.
