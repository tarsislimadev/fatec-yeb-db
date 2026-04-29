# Implementation Roadmap: Phase 1 & 2

**Project:** Phone List System MVP + Enrichment  
**Status:** Ready to Start  
**Last Updated:** April 28, 2026  
**Expected Duration:** 4 weeks (compressed from 50+ days for 2–3 person team)  

---

## Quick Start

### Team Setup
- **Backend Lead:** Tasks with 🔴 (critical), architecture decisions
- **Backend Engineer:** Tasks with 🟡 (high), implementation
- **Frontend Engineer:** All FE tasks (🔴 critical, 🟡 high)
- **QA Lead:** Test planning & execution (Phase 2)

### Critical Commands
```bash
# Setup
cd backend && npm install && npm run migrate
cd frontend && npm install && npm run dev

# Testing
npm test                    # Run tests
npm run test:integration    # Integration tests

# Deploy
docker-compose up
docker-compose exec backend npm run seed
# Visit http://localhost (frontend) or http://localhost:3000/api/v1 (backend)
```

---

## PHASE 1: MVP Foundation (3 weeks)

### Week 1: Authentication (14 days estimated)

#### Backend Tasks (9 days)

| # | Task | Days | Blocker? | Owner | Status | Notes |
|-|------|------|----------|-------|--------|-------|
| BE-1.1 | 🔴 Project Setup & Database | 1 | START HERE | backend-lead | ⬜ | Init Node/Express, PostgreSQL connection, schema migration |
| BE-1.3 | 🔴 JWT & Session Management | 1 | BE-1.1 | backend-lead | ⬜ | Token generation, refresh, validation middleware |
| BE-1.4 | 🔴 Password Security & Lockout | 0.5 | BE-1.1, BE-1.3 | backend-eng | ⬜ | Bcrypt hashing, account lockout (5 attempts → 15min lock) |
| BE-1.5 | 🔴 Signup/Signin Endpoints | 1 | BE-1.1–1.4 | backend-eng | ⬜ | POST /auth/signup, POST /auth/signin |
| BE-1.2 | 🟡 Email Service Integration | 1 | BE-1.1 | backend-eng | ⬜ | SendGrid/Mailgun setup, templates |
| BE-1.6 | 🟡 Password Recovery | 1 | BE-1.2, BE-1.5 | backend-eng | ⬜ | POST /auth/password/forgot, POST /auth/password/reset |
| BE-1.7 | 🟡 Signout & Token Blacklist | 0.5 | BE-1.3 | backend-eng | ⬜ | Redis token blacklist, cleanup job |

#### Frontend Tasks (5 days)

| # | Task | Days | Blocker? | Owner | Status | Notes |
|-|------|------|----------|-------|--------|-------|
| FE-3.1 | 🔴 Project Setup | 0.5 | START HERE | frontend-eng | ⬜ | React 18 + Vite + Tailwind + Zustand |
| FE-3.2 | 🔴 HTTP Client & API | 0.5 | FE-3.1 | frontend-eng | ⬜ | Axios setup, JWT injection, 401 redirect |
| FE-3.3 | � Login Page | 1 | FE-3.2 | frontend-eng | ⬜ | Email/password form |
| FE-3.4 | 🟡 Signup Page | 1 | FE-3.2 | frontend-eng | ⬜ | Signup form + password strength validation |
| FE-3.5 | 🟡 Forgot Password Flow | 1 | FE-3.2 | frontend-eng | ⬜ | Email → reset link → new password |
| FE-3.6 | 🔴 Protected Routes | 0.5 | FE-3.1 | frontend-eng | ⬜ | ProtectedRoute component, token persistence |

**Week 1 Deliverable:** ✅ Signup/signin working, JWT tokens valid, login page functional, password recovery in progress

### Week 2: Phone CRUD (16 days estimated)

#### Backend Tasks (8 days)

| # | Task | Days | Blocker? | Owner | Status | Notes |
|-|------|------|----------|-------|--------|-------|
| BE-2.1 | 🔴 Phone Normalization | 0.5 | None | backend-eng | ⬜ | E.164 validation, libphonenumber-js, unique enforcement |
| BE-2.2 | 🔴 Phone CRUD Endpoints | 2 | BE-1.1, BE-2.1 | backend-lead | ⬜ | GET/POST/PATCH/DELETE /phones, pagination |
| BE-2.3 | 🔴 Search & Filtering | 1 | BE-2.2 | backend-eng | ⬜ | Search by number, filter by status/type, sort, combine filters |
| BE-2.4 | 🟡 Owner Relations | 1 | BE-2.2 | backend-eng | ⬜ | POST/DELETE /phones/{id}/owners, prevent duplicates |
| BE-2.5 | 🟡 Phone Sources & Metadata | 0.5 | BE-2.2 | backend-eng | ⬜ | Track source on phone create, sources array in detail |
| BE-2.6 | 🟡 Integration & Unit Tests | 1 | BE-2.1–2.5 | backend-lead | ⬜ | ≥70% coverage, Jest + Supertest |
| BE-2.7 | 🟡 API Documentation | 0.5 | All endpoints | backend-lead | ⬜ | OpenAPI/Swagger spec, Postman collection |
| BE-2.8 | 🟡 Middleware Stack | 0.5 | BE-1.3 | backend-eng | ⬜ | Auth, error handling, logging middleware |

#### Frontend Tasks (8 days)

| # | Task | Days | Blocker? | Owner | Status | Notes |
|-|------|------|----------|-------|--------|-------|
| FE-3.7 | 🔴 Phone List Page | 2 | FE-3.6, FE-3.2 | frontend-lead | ⬜ | Table/list, pagination, search, filters, sort, click to detail |
| FE-3.8 | 🔴 Phone Detail Page | 2 | FE-3.7, FE-3.2 | frontend-lead | ⬜ | Tabs (info, owners, sources), edit/add/delete buttons |
| FE-3.9 | 🟡 Create/Edit Form | 1 | FE-3.7, FE-3.2 | frontend-eng | ⬜ | Phone number input, type dropdown, validation |
| FE-3.10 | 🟡 Owner Management UI | 1 | FE-3.8, FE-3.2 | frontend-eng | ⬜ | Add owner (search), delete, confidence_score, relation_label |
| FE-3.11 | 🟡 Navigation & Layout | 1 | FE-3.1 | frontend-eng | ⬜ | Header, user menu, signout, responsive nav, a11y |
| FE-3.12 | 🟡 Error Handling & Loading | 1 | FE-3.1 | frontend-eng | ⬜ | Error boundary, spinners, toast notifications, request ID |

**Week 2 Deliverable:** ✅ Phone CRUD API complete, phone list & detail pages working, ≥70% API code coverage, all acceptance tests passing

---

### Week 3: Frontend Polish & Deployment (11 days estimated)

#### Frontend Tasks (5 days)

| # | Task | Days | Blocker? | Owner | Status | Notes |
|-|------|------|----------|-------|--------|-------|
| FE-3.14 | 🟡 Testing & QA | 1.5 | All FE pages | frontend-lead | ⬜ | Component tests, E2E tests, ≥50% coverage, manual UAT |
| FE-3.15 | 🟡 Documentation | 0.5 | All FE steps | frontend-eng | ⬜ | README, setup, build, test, deploy, troubleshooting |

#### Backend Tasks (1.5 days)

| # | Task | Days | Blocker? | Owner | Status | Notes |
|-|------|------|----------|-------|--------|-------|
| BE-2.6–2.8 | 🟡 Final Testing/Docs | 1.5 | All BE | backend-lead | ⬜ | Final tests, API docs complete |

#### Infrastructure Tasks (3 days)

| # | Task | Days | Blocker? | Owner | Status | Notes |
|-|------|------|----------|-------|--------|-------|
| INFRA-1 | 🟡 Docker Backend | 1 | All BE code | devops/backend-lead | ⬜ | Multi-stage Dockerfile, health check, <200MB |
| INFRA-2 | 🟡 Docker Frontend | 1 | All FE code | devops/frontend-lead | ⬜ | Multi-stage, Nginx SPA routing, <50MB |
| INFRA-3 | 🟡 Docker Compose | 0.5 | INFRA-1, 2 | devops-lead | ⬜ | Services: backend, frontend, postgres, redis |
| INFRA-4 | 🟡 CI/CD Pipeline | 0.5 | INFRA-3 | devops-lead | ⬜ | GitHub Actions (test, build, push, deploy) |
| INFRA-5 | 🟡 Deployment Doc | 0.5 | All steps | devops-lead | ⬜ | Runbook, troubleshooting, monitoring |

**Week 3 Deliverable:** ✅ Full UI working, Docker stack running, staging deployment active, Phase 1 UAT complete, sign-off obtained

---

## PHASE 2: CNPJ Enrichment (2 weeks, starts after Phase 1 UAT)

### Week 1: Provider Adapters & Logic (9 days estimated)

| # | Task | Days | Blocker? | Owner | Status | Notes |
|-|------|------|----------|-------|--------|-------|
| BE-2.1 | 🔴 Provider Adapter Interface | 1 | None | backend-lead | ⬜ | Abstract base, type-safe contract, error enums |
| BE-2.2 | 🔴 Brasil API Adapter | 1.5 | BE-2.1 | backend-eng | ⬜ | POST /api/cnpj/{cnpj} integration, error handling |
| BE-2.3 | 🔴 CNPJA Adapter | 1.5 | BE-2.1 | backend-eng | ⬜ | Fallback provider, same error handling |
| BE-2.4 | 🔴 Provider Factory & Fallback | 0.5 | BE-2.2, 2.3 | backend-lead | ⬜ | Primary → fallback, retry across providers |
| BE-2.5 | 🟡 CNPJ Validation | 0.5 | None | backend-eng | ⬜ | Checksum validation, format normalization, 100+ test cases |
| BE-2.6 | 🟡 Redis Caching | 1 | BE-2.1 | backend-eng | ⬜ | 24-hour TTL, cache invalidation, hit/miss metrics |
| BE-2.7 | 🔴 Deterministic Upsert | 1.5 | BE-2.5 | backend-lead | ⬜ | Create/update business, source tracking, 0 duplicates verified |
| FE-2.1 | 🟡 Enrichment Components | 0.5 | FE-3.1 | frontend-eng | ⬜ | CNPJ input, status display, results display, file drop |

**Week 1 Deliverable:** ✅ Provider adapters tested, caching working, upsert verified (no duplicates), 0% duplicate business records

---

### Week 2: Job Pipeline, API & Frontend UI (14 days estimated)

#### Backend Tasks (9 days)

| # | Task | Days | Blocker? | Owner | Status | Notes |
|-|------|------|----------|-------|--------|-------|
| BE-2.8 | 🔴 Enrichment Job Model | 0.5 | None | backend-lead | ⬜ | enrichment_jobs, enrichment_job_items, enrichment_results tables |
| BE-2.9 | 🔴 Job Queue Setup | 1 | BE-2.8 | backend-eng | ⬜ | Bull/Redis job queue, event handlers, worker listener |
| BE-2.10 | 🔴 Single-Phone Enrichment | 1.5 | BE-2.9 | backend-eng | ⬜ | POST /enrichment/phones/{id}, job queueing, idempotency |
| BE-2.11 | 🔴 Job Status Endpoints | 1 | BE-2.10 | backend-eng | ⬜ | GET /enrichment/jobs/{id}, /status, /items (pagination) |
| BE-2.12 | 🟡 Batch Upload | 1.5 | BE-2.10 | backend-eng | ⬜ | CSV parsing, validation, job_item creation, error logging |
| BE-2.13 | 🔴 Worker & Processor | 1.5 | BE-2.9–2.12 | backend-lead | ⬜ | Dequeue, upsert, status tracking, failure handling, retries |
| BE-2.14 | 🟡 Service Integration | 1 | All BE tasks | backend-lead | ⬜ | Unified enrichment service, request tracing |
| BE-2.15 | 🟡 Metrics & Monitoring | 0.5 | BE-2.14 | backend-eng | ⬜ | GET /enrichment/metrics, Prometheus format, key metrics |
| BE-2.16 | 🟡 Testing & Integration | 1 | All BE tasks | backend-lead | ⬜ | ≥60% coverage, end-to-end flows, load test (1000 phones) |

#### Frontend Tasks (1.5 days)

| # | Task | Days | Blocker? | Owner | Status | Notes |
|-|------|------|----------|-------|--------|-------|
| FE-2.2 | 🟡 Single Enrichment UI | 0.5 | FE-2.1, FE-3.9 | frontend-eng | ⬜ | "Enrich" button modal, CNPJ input, job status polling |
| FE-2.3 | 🟡 Results Display | 0.25 | FE-2.2 | frontend-eng | ⬜ | Enrichment tab on detail page, source badge, data formatting |
| FE-2.4 | 🟡 Batch Upload Page | 0.75 | FE-2.1 | frontend-eng | ⬜ | File drop, CSV template, progress bar, results table, export |

#### QA Tasks (1.5 days)

| # | Task | Days | Blocker? | Owner | Status | Notes |
|-|------|------|----------|-------|--------|-------|
| QA-2.1 | 🟡 Test Plan | 0.25 | All tasks | qa-lead | ⬜ | All scenarios: happy path, errors, edge cases |
| QA-2.2 | 🟡 Manual UAT | 1 | All code | qa-lead | ⬜ | Execute all test scenarios, log issues |
| QA-2.3 | 🟡 Bug Triage & Sign-Off | 0.25 | QA-2.2 | qa-lead | ⬜ | Categorize bugs, prioritize, get approval |

**Week 2 Deliverable:** ✅ End-to-end enrichment working, single + batch jobs processing, cache hit rate ≥50%, zero duplicates, Phase 2 UAT approved, production-ready

---

## Success Criteria (Phase 1 & 2)

### Phase 1 Must-Have ✅
- [ ] All 17 API endpoints working (5 auth + 12 phone ops)
- [ ] All 60+ acceptance tests passing
- [ ] Zero critical bugs in deployment
- [ ] API response times < 2 seconds (p95)
- [ ] Frontend pages: login, signup, forgot password, phone list, phone detail, owner management
- [ ] Docker stack builds and runs (docker-compose up)
- [ ] Staging deployment active
- [ ] UAT sign-off received

### Phase 2 Must-Have ✅
- [ ] Single phone enrichment <10 seconds
- [ ] Batch enrichment processing 100+ phones
- [ ] Zero duplicate business records
- [ ] Cache hit rate ≥50% for repeated lookups
- [ ] Provider fallback tested (Brasil API → CNPJA)
- [ ] Job status polling working, progress accurate
- [ ] All 60+ Phase 2 acceptance tests passing
- [ ] UAT sign-off received

---

## Risk Mitigation

| Risk | Mitigation | Owner |
|------|-----------|-------|
| Database schema changes | Version migrations, seed data | backend-lead |
| Frontend state management | Zustand (simpler than Redux) | frontend-lead |
| Provider API downtime | Implement fallback, cache, retry logic | backend-lead |
| Deployment failures | Staging env before production, docker-compose test | devops-lead |
| Test flakiness | Mock external APIs, deterministic fixtures | qa-lead |

---

## Next Steps

1. **Assign roles** to team members (see Team Setup section)
2. **Start Week 1 Backend** immediately: BE-1.1 (create project & DB)
3. **Start Week 1 Frontend** immediately: FE-3.1 (create project)
4. **Run daily standups** (10 min, blockers & today's work)
5. **Track progress** in this document (update status column)
6. **Test frequently** (don't wait until week 3 to discover bugs)

---

## Progress Tracking

**Start Date:** April 28, 2026  
**Phase 1 Target:** May 19, 2026 (3 weeks)  
**Phase 2 Start:** May 20, 2026  
**Phase 2 Target:** June 2, 2026 (2 weeks)  

**Current Status:** 🚀 **Ready to Start Week 1**

