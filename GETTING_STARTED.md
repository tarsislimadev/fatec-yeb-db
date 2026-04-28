# Phase 1 & 2 Implementation: Getting Started

**Project:** Phone List System MVP + CNPJ Enrichment  
**Duration:** 4 weeks (compressed from 50+ days)  
**Team Size:** 2–3 people  
**Status:** 🚀 Ready to Start Immediately

---

## Quick Links

📋 **[IMPLEMENTATION_ROADMAP.md](../IMPLEMENTATION_ROADMAP.md)** — Full timeline, all tasks, status tracking

**Week 1 Guides:**
- 🔴 [BE-1.1: Project Setup & Database](./TASK_BE-1.1_GUIDE.md)
- 🔴 [BE-1.3: JWT & Session Management](./TASK_BE-1.3_GUIDE.md)
- 🔴 [FE-3.1: Frontend Project Setup](./TASK_FE-3.1_GUIDE.md)

**Phase 1 Scope:** [phase-1-implementation.md](./phase-1-implementation.md)  
**Phase 2 Scope:** [phase-2-planning.md](./phase-2-planning.md)

---

## Team Roles & Tasks

### Backend Lead (Days 1–14, then 15–28)
**Phase 1 Focus:** Auth infrastructure, phone CRUD, API documentation  
**Phase 2 Focus:** Provider adapters, job pipeline, service integration

**Starting Tasks:**
1. ✅ **BE-1.1** (1 day): Project setup & database — [Guide](./TASK_BE-1.1_GUIDE.md)
2. ✅ **BE-1.3** (1 day): JWT & session management — [Guide](./TASK_BE-1.3_GUIDE.md)
3. **BE-1.7** (1.5 days): Google OAuth
4. **BE-2.2** (2 days): Phone CRUD endpoints
5. ... (see [IMPLEMENTATION_ROADMAP.md](../IMPLEMENTATION_ROADMAP.md) for full list)

---

### Backend Engineer (Days 1–14, then 15–28)
**Phase 1 Focus:** Password security, email service, signup/signin, phone search, relations, owner management  
**Phase 2 Focus:** Provider adapters (Brasil API, CNPJA), job queue, batch processing

**Starting Tasks:**
1. **BE-1.4** (0.5 day): Password security & lockout
2. **BE-1.5** (1 day): Signup/signin endpoints
3. **BE-1.2** (1 day): Email service integration
4. **BE-2.3** (1 day): Phone search & filtering
5. ... (see [IMPLEMENTATION_ROADMAP.md](../IMPLEMENTATION_ROADMAP.md) for full list)

---

### Frontend Engineer (Days 1–14, then 15–28)
**Phase 1 Focus:** All frontend pages (auth, phone list, detail, forms)  
**Phase 2 Focus:** Enrichment UI (single enrich, batch upload, progress tracking)

**Starting Tasks:**
1. ✅ **FE-3.1** (0.5 day): Project setup — [Guide](./TASK_FE-3.1_GUIDE.md)
2. **FE-3.2** (0.5 day): HTTP client & API integration
3. **FE-3.4** (1 day): Login page
4. **FE-3.8** (2 days): Phone list page
5. ... (see [IMPLEMENTATION_ROADMAP.md](../IMPLEMENTATION_ROADMAP.md) for full list)

---

### QA Lead (Days 12–14, then 26–28)
**Phase 1 Focus:** Write acceptance tests for auth & phone CRUD, manual UAT  
**Phase 2 Focus:** Test enrichment flows, verify no duplicates, UAT batch operations

**Starting Tasks (after Week 2):**
1. Write test plan for Phase 1 acceptance criteria
2. Execute manual UAT (Week 3)
3. Phase 2 test plan & UAT (Week 4)

---

## Day 1: Getting Started (Today!)

### Backend Lead

```bash
# Clone/navigate to project
cd /workspaces/fatec-yeb-db/backend

# Follow BE-1.1 guide: docs/TASK_BE-1.1_GUIDE.md
# Key steps:
# 1. Create .env from .env.example
npm install

# 2. Set up database
npm run migrate
npm run seed

# 3. Verify connection
npm run dev
curl http://localhost:3000/health

# Acceptance: Database ready, server listens on :3000
```

**Estimated: 2–3 hours**

---

### Frontend Engineer

```bash
# Navigate to project
cd /workspaces/fatec-yeb-db/frontend

# Follow FE-3.1 guide: docs/TASK_FE-3.1_GUIDE.md
# Key steps:
npm install

# 2. Verify Tailwind & Vite setup
npm run dev
# Browser opens to http://localhost:5173

# 3. Verify build
npm run build

# Acceptance: Dev server runs, React + Tailwind loaded, no build errors
```

**Estimated: 1–2 hours**

---

### Backend Engineer (start after BE-1.1 ✅)

```bash
# Follow BE-1.4 guide (not yet written, use comments below)
# Tasks:
# 1. Create backend/src/utils/bcrypt.js (password hashing utils)
# 2. Create backend/src/services/accountLockout.js (lockout tracking)
# 3. Write unit tests for both
# 4. Integration: password strength validation on signup

# Start with: npm test (to set up testing environment)
```

**Estimated: 2–3 hours**

---

### Frontend Engineer (start immediately after FE-3.1 ✅)

```bash
# Task: FE-3.2 HTTP Client & API Integration
# Create frontend/src/services/api.js with:
# - Axios instance with base URL from env
# - Authorization header injection
# - 401 response redirect to /login
# - Error interceptor for user-friendly messages

# Also: Enhance Zustand store for storing user data on login
```

**Estimated: 1–2 hours**

---

## Daily Standup Format (10 min)

**Questions each person answers:**
1. What did I complete yesterday? ✅
2. What am I working on today? 🔄
3. What's blocking me? 🚧

**Example:**
- **Backend Lead:** "✅ Database migration working. 🔄 Today: JWT generation & token verification. 🚧 Need Redis running."
- **Backend Eng:** "✅ JWT guide reviewed. 🔄 Starting password lockout service. 🚧 None."
- **Frontend Eng:** "✅ React + Vite + Tailwind set up. 🔄 Zustand store + Axios client. 🚧 API base URL config."

---

## Week 1 Overview

**Goal:** Working signup/signin, JWT tokens valid, basic UI pages (login, signup) + Backend Auth Foundation

| Day | Backend Lead | Backend Engineer | Frontend Engineer | Status |
|-----|--------------|------------------|---|--|
| 1 | BE-1.1 ✅ | — | FE-3.1 ✅ | 🟢 |
| 2 | BE-1.3 ✅ | BE-1.4 ✅ | FE-3.2 ✅ |  |
| 3 | BE-1.7 (OAuth) | BE-1.5 (Signin) | FE-3.3 (Components) |  |
| 4 | BE-1.7 (OAuth) | BE-1.2 (Email) | FE-3.4 (Login) |  |
| 5 | BE-1.8 (OAuth) | BE-1.6 (Recovery) | FE-3.5 (Signup) |  |

**Deliverable:** Signup/signin endpoints working, JWT tokens generated, login/signup pages rendering, password recovery in progress

---

## Critical Path (Minimum Viable Product)

To get from "nothing" to "first deploy" (Day 14), these tasks MUST complete first:

```
Day 1: BE-1.1, FE-3.1 (both teams start here)
Day 2: BE-1.3 (unlock all auth), FE-3.2 (unlock all API calls)
Day 3: BE-1.5 (signin works), FE-3.4 (login page works)
Day 4: BE-2.1 (phone validation), FE-3.7 (protected routes)
Day 5: BE-2.2 (phone CRUD starts), FE-3.8 (phone list starts)
...
Day 14: INFRA-3 (Docker Compose), Manual UAT ✅
```

Each day builds on the previous. **No skipping** — dependencies are real!

---

## Resources & Links

### Code Guides (Task-by-Task Implementation)
- [BE-1.1](./TASK_BE-1.1_GUIDE.md) — Database setup (ready)
- [BE-1.3](./TASK_BE-1.3_GUIDE.md) — JWT tokens (ready)
- [FE-3.1](./TASK_FE-3.1_GUIDE.md) — Frontend setup (ready)
- BE-1.4, BE-1.5, FE-3.2, FE-3.3, etc. — Will be added as Week 1 progresses

### Architecture & Design
- [Phase 1 Implementation Plan](./phase-1-implementation.md) — All 27 tasks in detail
- [Phase 2 Enrichment Plan](./phase-2-planning.md) — All 19 tasks (starts Day 15)
- [API Specification](./api-spec.md) — Request/response formats, error codes
- [Database Schema](./schema-draft.md) — Tables, relationships, indexes
- [Acceptance Tests](./acceptance-tests.md) — 60+ UAT scenarios

### Project Configuration
- [QUICKSTART.md](../QUICKSTART.md) — Local development setup
- [docker-compose.yml](../docker-compose.yml) — Multi-service orchestration
- [backend/README.md](../backend/README.md) — Backend documentation
- [frontend/README.md](../frontend/README.md) — Frontend documentation

---

## Troubleshooting

### "PostgreSQL connection failed"
```bash
# Check if postgres is running
psql --version

# Start postgres (macOS)
brew services start postgresql

# Or use Docker
docker run -d --name postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:14
```

### "Node modules missing"
```bash
# Reinstall dependencies
cd backend && rm -rf node_modules && npm install
cd frontend && rm -rf node_modules && npm install
```

### "Port 3000 already in use"
```bash
# Kill process using port 3000
lsof -i :3000
kill -9 <PID>

# Or use different port
PORT=3001 npm run dev
```

### "Redis connection failed"
```bash
# Start Redis
brew services start redis
# Or Docker
docker run -d --name redis -p 6379:6379 redis:7
```

---

## Success Checklist (Week 1)

- [ ] Database schema applied (12 tables created)
- [ ] Backend server starts (port 3000, no errors)
- [ ] Frontend dev server starts (port 5173, no errors)
- [ ] Signup endpoint working (POST /auth/signup)
- [ ] Signin endpoint working (POST /auth/signin returns JWT)
- [ ] JWT validation middleware enforcing token on protected routes
- [ ] Login page renders without errors
- [ ] Signup page renders without errors
- [ ] frontend/src/services/api.js properly injects JWT tokens
- [ ] All unit tests passing (>50% coverage target)

---

## Week 2 Preview

After Week 1 succeeds, Week 2 focuses on **Phone CRUD**:

**Backend:** Phone normalization, full CRUD endpoints, search/filtering, owner relations, sources  
**Frontend:** Phone list page, phone detail page, forms, owner management UI  
**Goal:** Complete phone lifecycle (create → read → update → delete → relate)

Detailed guide for Week 2 will be provided once Week 1 completes.

---

## Week 3 Preview

After Week 2, Week 3 is **Polish & Deploy**:

**Backend:** Final tests, API docs, middleware stack complete  
**Frontend:** Navigation, error handling, testing, documentation  
**DevOps:** Docker setup, CI/CD pipeline, staging deployment  
**QA:** Full UAT, sign-off  
**Goal:** Production-ready Phase 1 MVP

---

## Questions?

1. **Stuck on a task?** Check the task-specific guide in `/docs/TASK_*.md`
2. **Need code template?** See examples in the guide files
3. **Unsure about dependencies?** See IMPLEMENTATION_ROADMAP.md critical path
4. **Want to know overall status?** Update the tracking spreadsheet in IMPLEMENTATION_ROADMAP.md

---

## 🚀 NEXT: Pick up a task!

**Backend Lead:** Start with [BE-1.1](./TASK_BE-1.1_GUIDE.md)  
**Backend Engineer:** Wait for BE-1.1 ✅, then start [BE-1.4](./TASK_BE-1.3_GUIDE.md) (guide coming)  
**Frontend Engineer:** Start with [FE-3.1](./TASK_FE-3.1_GUIDE.md)

**Good luck! 💪**

