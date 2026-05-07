# Phase 5: Deployment & Smoke Test Checklist

**Version:** 1.0  
**Last Updated:** May 7, 2026  
**Go-Live Target:** May 7, 2026  

---

## Pre-Deployment Preparation

### 1. Infrastructure Setup
- [ ] Staging environment provisioned (mirrors production)
- [ ] PostgreSQL 14+ database created and initialized
- [ ] Redis server running and accessible
- [ ] SSL certificates configured for API endpoints
- [ ] Load balancer configured (if using)
- [ ] Monitoring tools deployed (CloudWatch, Datadog, etc.)
- [ ] Logging aggregation configured (ELK, Splunk, etc.)

### 2. Twilio Account Configuration
- [ ] Twilio account created and verified
- [ ] Phone number(s) provisioned and confirmed working
- [ ] Webhook URL registered in Twilio console
- [ ] Status callback URL set to: `https://api.example.com/api/v1/webhooks/calls/events`
- [ ] Twilio API credentials secured in secret manager
- [ ] Rate limits documented and notified to Twilio
- [ ] Test call successful (Twilio test number)

### 3. Environment Variables
- [ ] `TWILIO_ACCOUNT_SID` = Correct account SID
- [ ] `TWILIO_AUTH_TOKEN` = Valid auth token
- [ ] `TWILIO_FROM_NUMBER` = E.164 formatted phone number (e.g., +12025551001)
- [ ] `DATABASE_URL` = PostgreSQL connection string
- [ ] `REDIS_URL` = Redis connection string
- [ ] `NODE_ENV` = 'production'
- [ ] All env vars loaded into deployment system (Docker, K8s, etc.)

### 4. Database Preparation
- [ ] Run migrations: `npm run migrate`
  ```bash
  npm run migrate
  ```
- [ ] Verify 6 new Phase 5 tables created:
  ```sql
  \dt call_campaigns
  \dt calls
  \dt call_sessions
  \dt transcripts
  \dt call_outcomes
  \dt call_retry_log
  ```
- [ ] Verify indexes created:
  ```sql
  \di call_campaigns_user_id_idx
  \di calls_campaign_id_idx
  ```
- [ ] Test database connection from app server
- [ ] Backup database before go-live

### 5. Dependencies Installed
- [ ] Run: `npm install` in backend directory
- [ ] Verify `bull` package installed (v4.11.0+)
- [ ] Verify `twilio` package installed (v4.10.0+)
- [ ] Check `node_modules` size reasonable (~500MB)

### 6. Build & Compilation
- [ ] Backend builds without errors: `npm run build` (or verify no build step)
- [ ] Frontend builds: `npm run build` in frontend directory
- [ ] No build warnings or deprecations
- [ ] Verify file sizes reasonable

---

## Deployment Steps

### 1. Code Deployment
- [ ] Pull Phase 5 branch: `git clone/pull origin main`
- [ ] Verify all Phase 5 files present:
  - Backend services in `src/services/`
  - Controllers in `src/controllers/`
  - Routes in `src/routes/`
  - Migrations in `src/db/`
  - Frontend pages in `frontend/src/pages/`
- [ ] Run linter: `npm run lint` (if configured)
- [ ] No syntax errors

### 2. Database Migrations
- [ ] Connect to staging database
- [ ] Run migrations:
  ```bash
  npm run migrate
  ```
- [ ] Verify all 6 tables created
- [ ] Verify columns and indexes exist
- [ ] Verify foreign keys set correctly
- [ ] Check timestamps on migration files

### 3. Start Services
- [ ] Start backend server: `npm start`
- [ ] Verify server started on port 3000
- [ ] Check startup logs for errors
- [ ] Verify "Phase 5 voice services initialized" in logs
- [ ] Check for Twilio initialization errors

### 4. Frontend Deployment
- [ ] Build frontend: `cd frontend && npm run build`
- [ ] Deploy to web server/CDN
- [ ] Verify routes accessible at `/campaigns`, `/calls`, `/transcripts`
- [ ] Check API calls point to correct backend URL

---

## Smoke Tests (Manual)

### 1. System Health Checks
- [ ] **Backend Health:** `GET /api/v1/health` returns 200
- [ ] **Database Connection:** Query succeeds on app startup
- [ ] **Redis Connection:** Bull queue initialized without errors
- [ ] **Twilio Connection:** No auth errors in logs
- [ ] **Frontend Loads:** CSS/JS load correctly, no 404s
- [ ] **API CORS:** Requests from frontend not blocked

### 2. Authentication Flow
- [ ] **Sign Up:** `POST /api/v1/auth/signup` returns token
- [ ] **Sign In:** `POST /api/v1/auth/signin` works
- [ ] **Protected Route:** Accessing `/campaigns` without token returns 401
- [ ] **Token Validation:** Invalid token rejected

### 3. Campaign Creation Flow
- [ ] **Create Person:** `POST /api/v1/people` works
- [ ] **Create Campaign:** `POST /api/v1/campaigns` with valid prospect_ids
  ```json
  {
    "name": "Test Campaign",
    "prospect_ids": ["uuid"]
  }
  ```
- [ ] Response has `id`, `status=draft`
- [ ] **List Campaigns:** `GET /api/v1/campaigns` shows created campaign
- [ ] **Get Campaign:** `GET /api/v1/campaigns/:id` returns details

### 4. Campaign Lifecycle
- [ ] **Update Campaign:** `PATCH /api/v1/campaigns/:id` updates description
- [ ] **Start Campaign:** `POST /api/v1/campaigns/:id/start` transitions to running
  - Logs show "Phase 5 voice services initialized"
  - No Twilio API errors
- [ ] **Pause Campaign:** `POST /api/v1/campaigns/:id/pause` → paused
- [ ] **Resume Campaign:** `POST /api/v1/campaigns/:id/resume` → running
- [ ] **Stop Campaign:** `POST /api/v1/campaigns/:id/stop` → completed with ended_at

### 5. Call Management
- [ ] **List Calls:** `GET /api/v1/calls` returns array
- [ ] **Call Detail:** `GET /api/v1/calls/:id` returns full call object with:
  - session (provider data)
  - transcript (if processing done)
  - outcome (disposition)
  - timeline (events)
  - retry_log (attempt history)
- [ ] **Call Filtering:** `GET /api/v1/calls?status=pending` filters correctly
- [ ] **Call Pagination:** `GET /api/v1/calls?page=1&page_size=10` pages correctly

### 6. Dashboard Metrics
- [ ] **Metrics Endpoint:** `GET /api/v1/calls/dashboard/metrics` returns:
  - `calls_total` (integer)
  - `calls_completed` (integer)
  - `success_rate` (percentage)
  - `avg_duration_seconds` (number)
  - `active_campaigns` (array)
  - `flagged_transcripts_count` (integer)
- [ ] **Metrics Accuracy:** Values are numeric and reasonable
- [ ] **Date Range Filter:** `?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD` works

### 7. Transcript Management
- [ ] **List Transcripts:** `GET /api/v1/transcripts` returns array
- [ ] **Get Transcript:** `GET /api/v1/transcripts/:id` returns detail
- [ ] **Approve Transcript:** `POST /api/v1/transcripts/:id/approve` updates status
- [ ] **Reject Transcript:** `POST /api/v1/transcripts/:id/reject` with notes
- [ ] **Confirm Opt-Out:** `POST /api/v1/transcripts/:id/confirm-opt-out`
  - returns phone_voice_suppressed_at timestamp
  - phone marked voice_suppressed_at in database

### 8. Compliance & Consent
- [ ] **Grant Consent:** `PATCH /api/v1/phones/:id/consent` with marketing_consent
- [ ] **Consent Persisted:** Subsequent calls check consent
- [ ] **Phone Suppression:** Voice-suppressed phones cannot be called
- [ ] **Audit Log:** Suppression decisions logged

### 9. Webhook Handling
- [ ] **Webhook Signature:** Requests with invalid signature rejected
- [ ] **Webhook Processing:** Valid Twilio callback updates call status
- [ ] **Webhook Idempotency:** Duplicate callback doesn't create duplicate call
- [ ] **Health Check:** `GET /api/v1/webhooks/health` returns 200

### 10. Frontend UI Tests
- [ ] **Campaign List Page:** `/campaigns` loads campaign cards
  - Shows name, status, progress
  - Has "New Campaign" button
- [ ] **Create Campaign Page:** `/campaigns/new` loads
  - Form has name and prospect multi-select
  - Submit creates campaign
  - Redirects to `/campaigns` on success
- [ ] **Campaign Detail Page:** `/campaigns/detail?id=:id` loads
  - Shows campaign info and metrics
  - Actions: Start, Pause, Resume, Stop buttons appear correctly
  - Timeline visible
- [ ] **Calls List Page:** `/calls` loads
  - Shows call table with phone, status, duration
  - Filters by status work
  - Retry button appears for failed calls
- [ ] **Call Detail Page:** `/calls/detail?id=:id` loads
  - Shows session, transcript, outcome
  - Timeline visible
  - Recording player appears (if available)
- [ ] **Dashboard Page:** `/calls/dashboard` loads
  - Metrics cards show values
  - Active campaigns visible
  - Alerts for flagged transcripts
- [ ] **Transcripts Page:** `/transcripts` loads
  - Shows flagged transcripts
  - Approve/Reject/Confirm buttons work

### 11. Error Scenarios
- [ ] **Invalid Campaign ID:** `GET /api/v1/campaigns/invalid` returns 404
- [ ] **Unauthorized Access:** `GET /api/v1/campaigns` without token returns 401
- [ ] **Invalid State Transition:** Pause draft campaign returns 400/409
- [ ] **Database Error:** Connection timeout handled gracefully
- [ ] **Twilio Error:** API failure logged, doesn't crash server
- [ ] **Invalid Phone Number:** E.164 validation rejects malformed numbers

### 12. Load Testing (Optional but Recommended)
- [ ] **Create 100+ Campaigns:** System responsive
- [ ] **Query Large Dataset:** Pagination doesn't slow down
- [ ] **Concurrent Requests:** 10+ simultaneous requests handled
- [ ] **Job Queue Processing:** Queue doesn't overflow
- [ ] **Memory Leaks:** Server memory stable over time

---

## Production Readiness Checklist

### APM & Monitoring
- [ ] Errors logged to aggregation service
- [ ] Slow queries monitored
- [ ] Job queue backlog monitored
- [ ] CPU/Memory usage monitored
- [ ] Twilio API rate limit alerts configured
- [ ] Database connectivity alerts configured

### Backups & Recovery
- [ ] Database backups configured (daily minimum)
- [ ] Backup restoration tested
- [ ] Job queue can be rebuilt from database (no data loss)
- [ ] Code rollback plan documented

### Documentation
- [ ] Go-live runbook created
- [ ] Incident response plan documented
- [ ] Escalation contacts identified
- [ ] Support team trained on Phase 5

### Security
- [ ] SSL/TLS enabled on all endpoints
- [ ] Webhook signatures validated
- [ ] Environment variables not in code
- [ ] No hardcoded secrets
- [ ] SQL injection protection verified
- [ ] CORS properly configured
- [ ] Rate limiting configured

### Compliance
- [ ] TCPA pre-flight checks implemented
- [ ] Consent tracking verified
- [ ] Phone suppression logged
- [ ] Audit trail intact for compliance review

---

## Go-Live Sign-Off

| Component | Status | Signed By | Date |
|-----------|--------|-----------|------|
| Infrastructure | ☐ Ready | ___________ | __-__-____ |
| Database | ☐ Ready | ___________ | __-__-____ |
| Backend Code | ☐ Ready | ___________ | __-__-____ |
| Frontend Code | ☐ Ready | ___________ | __-__-____ |
| Twilio Config | ☐ Ready | ___________ | __-__-____ |
| Smoke Tests | ☐ Passed | ___________ | __-__-____ |
| Load Tests | ☐ Passed | ___________ | __-__-____ |
| Security Review | ☐ Passed | ___________ | __-__-____ |
| Monitoring | ☐ Active | ___________ | __-__-____ |
| Go-Live Approval | ☐ Approved | ___________ | __-__-____ |

---

## Post-Deployment Monitoring (24-48 Hours)

### Real-Time Metrics
- [ ] Campaign creation rate normal
- [ ] Call success rate >80%
- [ ] Avg call duration reasonable (15-60s)
- [ ] Queue processing latency <1 minute
- [ ] Database queries responsive

### Error Rate
- [ ] No critical errors in logs
- [ ] Twilio API errors <1%
- [ ] Webhook processing 100% success
- [ ] Auth failures <0.5%
- [ ] Database errors none

### User Feedback
- [ ] No user complaints about performance
- [ ] No UI glitches reported
- [ ] Campaign creation flows work
- [ ] Dashboard loads quickly

### Incident Response
- [ ] On-call team monitoring alerts
- [ ] Escalation contacts available
- [ ] Rollback plan ready if needed
- [ ] Major incident logging working

---

## Rollback Plan

### If Critical Issues Found:

**Option 1: Hot Fix (Recommended)**
1. Fix code issue in staging
2. Test fix thoroughly
3. Deploy patch to production
4. Monitor metrics

**Option 2: Rollback to Phase 4**
1. Stop Phase 5 services
2. Revert database migrations (with data preservation)
3. Roll back code to Phase 4 version
4. Verify Phase 4 functionality restored
5. Plan Phase 5 relaunch for next week

**Option 3: Partial Disable**
1. Disable new campaign creation via feature flag
2. Keep existing campaigns running
3. Continue monitoring
4. Fix issues while system online

---

## Known Issues & Workarounds

### Issue 1: Twilio API Rate Limiting
**Symptom:** Call failures with 429 status  
**Workaround:** Reduce concurrent workers in CallJobProcessor config (default 5, reduce to 2-3)  
**Fix:** Contact Twilio for rate limit increase  

### Issue 2: Webhook Timeout
**Symptom:** Calls complete but no transcript processing  
**Workaround:** Manually retry call via API  
**Fix:** Increase webhook timeout in Twilio console to 30 seconds  

### Issue 3: High Memory Usage
**Symptom:** Node process memory >1GB  
**Workaround:** Restart service (queue persists in Redis)  
**Long-term:** Upgrade Redis memory or implement queue pruning  

---

## Appendix: Quick Commands

### Start Services
```bash
# Backend
cd backend && npm install && npm run migrate && npm start

# Frontend
cd frontend && npm install && npm run build
```

### Database Verification
```sql
-- Verify Phase 5 tables
SELECT tablename FROM pg_tables WHERE tablename LIKE 'call%';

-- Check migrations
SELECT * FROM schema_migrations ORDER BY version DESC;

-- Verify indexes
SELECT indexname FROM pg_indexes WHERE tablename LIKE 'call%';
```

### Twilio Test
```bash
# Test Twilio credentials
curl -u "$TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN" \
  https://api.twilio.com/2010-04-01/Accounts/$TWILIO_ACCOUNT_SID.json

# List phone numbers
curl -u "$TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN" \
  https://api.twilio.com/2010-04-01/Accounts/$TWILIO_ACCOUNT_SID/IncomingPhoneNumbers.json
```

### Redis Check
```bash
# Connect to Redis
redis-cli

# Check Bull job queues
KEYS bull:*

# Monitor queue health
CLIENT LIST
MONITOR
```

---

## Go-Live Summary

**Deployment Date:** May 7, 2026  
**Environment:** Production  
**Phase:** Phase 5 Voice Calling System  
**Status After Deployment:** ✅ Ready for Live Traffic  

**Key Metrics (First 24 Hours):**
- Target Campaigns Created: 0+ (waiting for users)
- Target Calls Processed: 0+ (waiting for campaigns)
- Target Success Rate: >80%
- Target Avg Response Time: <300ms

**Support Contacts:**
- On-Call Engineer: __________
- Team Lead: __________
- Twilio Support: 1-855-235-7546

---

**End of Checklist**
