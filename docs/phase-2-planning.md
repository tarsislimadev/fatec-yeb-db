# Phase 2: CNPJ Enrichment Planning

**Duration:** 2 weeks  
**Status:** Planned (starts after Phase 1 UAT completion)  
**Dependencies:** Phase 1 MVP complete, accepted

## Objective

Enrich phone records with business information via CNPJ (Brazilian business registry) lookups. Implement deterministic upsert to prevent duplicates and maintain source provenance.

---

## Scope

### In Scope
- Provider adapter interface for CNPJ lookups
- Brasil API integration (primary)
- CNPJA integration (fallback)
- Phone normalization and checksum validation
- Deterministic upsert logic (no duplicates)
- Source provenance tracking
- Redis caching for lookups
- Idempotency key support
- Batch enrichment job pipeline
- Job status polling endpoints
- Single-phone enrichment endpoint

### Out of Scope
- Other enrichment providers (Phase 3+)
- Advanced lead scoring
- Automated calling integration
- Full customer data platform features

---

## Architecture Overview

```
┌─────────────────────────────────────────┐
│      Frontend (Phase 1)                  │
│  - Trigger single enrich                 │
│  - View job status                       │
│  - Batch upload CSV                      │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│      API Layer                           │
│  - POST /phones/{id}/enrich              │
│  - POST /enrichment/batch                │
│  - GET /enrichment/jobs/{jobId}          │
│  - GET /enrichment/jobs/{jobId}/status   │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│  Enrichment Service                      │
│  - Provider adapter interface            │
│  - Upsert logic (deterministic)          │
│  - Caching layer (Redis)                 │
│  - Idempotency management                │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼────────────────────┐
│  Job Queue (background workers)    │
│  - Bull/RabbitMQ/AWS SQS          │
│  - Single phone job                │
│  - Batch job processor             │
└──────────────┬────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│  Provider Adapters                       │
│  - Brasil API                            │
│  - CNPJA                                 │
└──────────────┬──────────────────────────┘
               │
       ┌───────▼───────┐
       │ External APIs │
       └───────────────┘
```

---

## Implementation Tasks

### Week 1: Adapter & Upsert Logic

#### Task 2.1: Provider Adapter Interface
**Description:**
Create abstract adapter interface for CNPJ providers with consistent contract.

**Acceptance:**
- Interface defined: `IEnrichmentProvider`
- Methods: `lookup(cnpj: string): Promise<EnrichmentResult>`
- Error handling: connection failures, invalid CNPJ, rate limits
- Type definitions included
- Unit tests for interface

**Estimated:** 1 day

---

#### Task 2.2: Brasil API Adapter
**Description:**
Implement Brasil API integration as primary provider.

**Scope:**
- API endpoint: POST /api/cnpj/{cnpj}
- Parse response: legal_name, trade_name, status, address
- Handle errors: invalid CNPJ, API timeout, rate limit
- Retry logic with exponential backoff
- Request logging for debugging

**Acceptance:**
- Lookups return business data
- Error handling tested
- Timeout < 5 seconds
- Rate limiting respected (100 req/minute)
- Unit + integration tests

**Estimated:** 1.5 days

---

#### Task 2.3: CNPJA Adapter (Fallback)
**Description:**
Implement CNPJA as fallback provider.

**Scope:**
- API endpoint: /api/company/{cnpj}
- Parse response: company name, status, address
- Handle errors: invalid CNPJ, API timeout, rate limit
- Retry logic
- Used if Brasil API fails

**Acceptance:**
- Lookups return business data
- Error handling tested
- Fallback triggered on Brasil API failure
- Unit + integration tests

**Estimated:** 1.5 days

---

#### Task 2.4: Phone Normalization & Validation
**Description:**
Implement checksum validation and normalization for phone numbers.

**Scope:**
- CNPJ checksum validation algorithm
- Phone number formatting standards
- Invalid CNPJ detection

**Acceptance:**
- Valid CNPJs pass validation
- Invalid CNPJs rejected
- Error messages clear
- Tested with 100+ test cases

**Estimated:** 1 day

---

#### Task 2.5: Deterministic Upsert Logic
**Description:**
Implement upsert logic to prevent duplicates based on CNPJ.

**Scope:**
- If CNPJ exists → update fields, skip if no changes
- If CNPJ new → create business record
- Track source in phone_sources table
- Maintain phone_owners relations

**Acceptance:**
- No duplicate business records created
- Updates preserve existing relations
- Source tracked correctly
- Deterministic (same input = same result)
- Tested with duplicate inputs

**Estimated:** 1.5 days

---

#### Task 2.6: Redis Caching Layer
**Description:**
Implement caching to reduce provider API calls.

**Scope:**
- Cache key: `enrich:cnpj:{cnpj}`
- TTL: 24 hours
- Cache invalidation on manual updates
- Cache hit tracking for metrics

**Acceptance:**
- First lookup hits provider
- Second lookup within 24h uses cache
- Cache cleared on manual update
- Metrics show cache hit rate

**Estimated:** 1 day

---

### Week 2: Job Pipeline & API

#### Task 2.7: Job Data Model
**Description:**
Create database tables for job tracking.

**Tables:**
- enrichment_jobs (id, status, type, created_at, started_at, completed_at)
- enrichment_job_items (id, job_id, phone_id, cnpj, status, result)
- enrichment_results (enriched data from providers)

**Acceptance:**
- Tables created and indexed
- Status enums: pending, processing, completed, failed
- Job type enums: single, batch

**Estimated:** 0.5 days

---

#### Task 2.8: Single Phone Enrichment
**Description:**
Implement single-phone enrichment endpoint and job processor.

**Endpoint:**
- POST /phones/{id}/enrich
- Body: { cnpj: "11.222.333/0001-81" }
- Response: { job_id: "uuid" }

**Scope:**
- Validate phone exists
- Validate CNPJ format
- Create job record
- Queue background job
- Idempotency key support

**Acceptance:**
- Endpoint returns job_id
- Idempotent with same input
- Job processed within 10 seconds
- Result stored in enrichment_results

**Estimated:** 1.5 days

---

#### Task 2.9: Batch Enrichment Job Pipeline
**Description:**
Implement batch enrichment for CSV/bulk uploads.

**Scope:**
- POST /enrichment/batch endpoint
- Accept CSV with CNPJ column
- Parse and validate CNPJs
- Create batch job record
- Queue individual phone enrichment jobs
- Track overall progress

**Acceptance:**
- CSV parsed correctly
- Invalid CNPJs tracked
- Jobs queued for all valid rows
- Batch job tracks progress
- Error handling for bad CSV

**Estimated:** 2 days

---

#### Task 2.10: Job Status Endpoints
**Description:**
Implement polling endpoints for job tracking.

**Endpoints:**
- GET /enrichment/jobs/{jobId} - job details
- GET /enrichment/jobs/{jobId}/status - quick status
- GET /enrichment/jobs/{jobId}/items - item-level results

**Scope:**
- Return job status (pending, processing, completed, failed)
- Return progress metrics (% complete)
- Return individual item results
- Support long-polling for real-time updates (Phase 2.5)

**Acceptance:**
- Status endpoint responds instantly
- Items endpoint shows per-phone results
- Progress metrics accurate
- Long-polling supported

**Estimated:** 1.5 days

---

#### Task 2.11: Background Job Processor
**Description:**
Implement worker for processing enrichment jobs.

**Scope:**
- Listen to job queue (Bull/RabbitMQ)
- Load phone record
- Call provider adapter (with fallback)
- Store result in enrichment_results
- Update job_item status
- Handle failures with retry

**Acceptance:**
- Jobs processed sequentially
- Failures don't block other jobs
- Retry logic tested
- Errors logged with context

**Estimated:** 1.5 days

---

#### Task 2.12: Frontend: Enrichment UI
**Description:**
Add enrichment features to phone detail page.

**Scope:**
- "Enrich" button on detail page
- CNPJ input form
- Job status display (in-progress spinner)
- Result display (success/failure)
- Batch upload page (file drop, progress)

**Acceptance:**
- User can trigger single enrichment
- User can upload CSV for batch
- Job status updates in real-time
- Results display enriched data

**Estimated:** 1.5 days

---

#### Task 2.13: Monitoring & Metrics
**Description:**
Add observability for enrichment pipeline.

**Scope:**
- Job counts by status
- Average enrichment time
- Provider error rates
- Cache hit rate
- Queue depth monitoring

**Acceptance:**
- Metrics exposed via /metrics endpoint
- Dashboard shows pipeline health
- Alerts configured for failures

**Estimated:** 1 day

---

#### Task 2.14: Testing & UAT
**Description:**
Test enrichment end-to-end.

**Scope:**
- Unit tests for adapters (60%+ coverage)
- Integration tests for upsert logic
- E2E test for batch enrichment
- UAT checklist for enrich features

**Acceptance:**
- Tests pass locally and CI
- UAT scenarios completed
- Performance benchmarks met

**Estimated:** 1 day

---

## Data Model Additions

### enrichment_jobs Table
```sql
CREATE TABLE enrichment_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL CHECK (type IN ('single', 'batch')),
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  total_items INT DEFAULT 0,
  processed_items INT DEFAULT 0,
  failed_items INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);
```

### enrichment_job_items Table
```sql
CREATE TABLE enrichment_job_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES enrichment_jobs(id) ON DELETE CASCADE,
  phone_id UUID NOT NULL REFERENCES phones(id),
  cnpj VARCHAR(18),
  status VARCHAR(50) DEFAULT 'pending',
  result_id UUID,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### enrichment_results Table
```sql
CREATE TABLE enrichment_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_id UUID NOT NULL REFERENCES phones(id),
  cnpj VARCHAR(18),
  provider VARCHAR(50) NOT NULL,
  legal_name VARCHAR(255),
  trade_name VARCHAR(255),
  status VARCHAR(50),
  address JSONB,
  raw_response JSONB,
  cached BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

---

## Phase 2 Acceptance Criteria

### Single Enrichment
- [x] User clicks "Enrich" on phone detail
- [x] CNPJ input form appears
- [x] Submit triggers job creation
- [x] Job processes within 10 seconds
- [x] Result displays (business name, address)
- [x] Source tracked as "enrichment"

### Batch Enrichment
- [x] User navigates to batch upload page
- [x] User selects CSV file with CNPJ column
- [x] File uploaded and parsed
- [x] Job created for each valid CNPJ
- [x] Progress bar shows completion
- [x] Results available per-phone

### Caching
- [x] First CNPJ lookup hits provider
- [x] Second lookup within 24h uses cache
- [x] Cache hit rate > 50% for repeated lookups

### Deterministic Upsert
- [x] Same CNPJ always creates same business record
- [x] Duplicate CNPJ doesn't create duplicates
- [x] Phone-business relations preserved
- [x] Source metadata tracked

### Error Handling
- [x] Invalid CNPJ rejected with error
- [x] Provider timeout fallback to CNPJA
- [x] Both providers fail → job failed, user notified
- [x] Rate limits respected

---

## Phase 2 Exit Criteria

1. ✅ Provider adapters implemented and tested
2. ✅ Upsert logic prevents duplicates
3. ✅ Single and batch enrichment working
4. ✅ Job status polling functional
5. ✅ Caching improves performance
6. ✅ All acceptance criteria met
7. ✅ Documentation updated
8. ✅ UAT passed

---

## Estimated Effort

| Component | Days |
|-----------|------|
| Adapters & Upsert | 6 |
| Job Pipeline & API | 7 |
| Frontend UI | 1.5 |
| Testing & UAT | 1.5 |
| **Total** | **~14 days** |

---

## Success Metrics

✅ Average enrichment time: < 2 seconds (cache) / < 5 seconds (provider)  
✅ Cache hit rate: > 50%  
✅ Provider error rate: < 1%  
✅ Duplicate business records: 0  
✅ UAT approval: 100%

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Provider API down | CNPJA fallback, cache fallback |
| Slow provider response | Async job processing, timeout handling |
| Invalid CNPJs | Checksum validation, error handling |
| Duplicate records | Deterministic upsert logic, unique constraints |
| Rate limiting | Queue throttling, retry with backoff |

---

## Next Phase (Phase 3)

Once Phase 2 completes, Phase 3 will add:
- Contact attempt tracking
- Timeline view
- Compliance controls
- Export/reporting

