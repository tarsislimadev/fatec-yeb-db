-- Phone List System - Database Schema
-- PostgreSQL 14+

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============ AUTHENTICATION TABLES ============

-- app_users
CREATE TABLE IF NOT EXISTS app_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  display_name VARCHAR(255),
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'locked', 'invited')),
  failed_login_attempts INT DEFAULT 0,
  locked_until TIMESTAMP WITH TIME ZONE,
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID,
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  deleted_by UUID
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_app_users_email ON app_users(email);
CREATE INDEX IF NOT EXISTS idx_app_users_status ON app_users(status);

-- auth_identities
CREATE TABLE IF NOT EXISTS auth_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  provider VARCHAR(50) NOT NULL CHECK (provider IN ('local', 'google', 'microsoft')),
  provider_subject VARCHAR(255) NOT NULL,
  email_at_provider VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID,
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  deleted_by UUID
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_auth_identities_provider_subject ON auth_identities(provider, provider_subject);
CREATE INDEX IF NOT EXISTS idx_auth_identities_user_id ON auth_identities(user_id);

-- password_reset_tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID,
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  deleted_by UUID
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);

-- ============ CORE TABLES ============

-- phones - canonical phone registry
CREATE TABLE IF NOT EXISTS phones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  e164_number VARCHAR(15) UNIQUE NOT NULL,
  country_code VARCHAR(2),
  type VARCHAR(50) DEFAULT 'unknown' CHECK (type IN ('mobile', 'landline', 'whatsapp', 'unknown')),
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'invalid', 'blocked')),
  is_primary BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMP WITH TIME ZONE,
  last_seen_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID,
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  deleted_by UUID
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_phones_e164_number ON phones(e164_number);
CREATE INDEX IF NOT EXISTS idx_phones_status ON phones(status);
CREATE INDEX IF NOT EXISTS idx_phones_created_at ON phones(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_phones_last_seen_at ON phones(last_seen_at DESC);

-- Keep existing databases aligned with E.164-only schema
ALTER TABLE phones DROP COLUMN IF EXISTS raw_number;
ALTER TABLE phones DROP COLUMN IF EXISTS national_number;

-- people
CREATE TABLE IF NOT EXISTS people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR(255) NOT NULL,
  full_name_normalized VARCHAR(255),
  role_title VARCHAR(255),
  email VARCHAR(255),
  email_normalized VARCHAR(255),
  document VARCHAR(20),
  document_normalized VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID,
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  deleted_by UUID
);

CREATE INDEX IF NOT EXISTS idx_people_email ON people(email);
CREATE UNIQUE INDEX IF NOT EXISTS idx_people_email_normalized_unique ON people(email_normalized) WHERE email_normalized IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_people_full_name ON people(full_name);
CREATE INDEX IF NOT EXISTS idx_people_full_name_normalized ON people(full_name_normalized);
CREATE UNIQUE INDEX IF NOT EXISTS idx_people_document_normalized_unique ON people(document_normalized) WHERE document_normalized IS NOT NULL AND deleted_at IS NULL;

-- businesses
CREATE TABLE IF NOT EXISTS businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cnpj VARCHAR(14) CONSTRAINT businesses_cnpj_length CHECK (cnpj IS NULL OR length(cnpj) = 14),
  legal_name VARCHAR(255) NOT NULL,
  trade_name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID,
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  deleted_by UUID
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_businesses_cnpj_unique ON businesses(cnpj) WHERE cnpj IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_businesses_legal_name ON businesses(legal_name);

-- Business enrichment metadata
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS status_cnpj VARCHAR(50);
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS primary_source VARCHAR(50);
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS last_validated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS data_hash VARCHAR(64);

CREATE INDEX IF NOT EXISTS idx_businesses_last_validated_at ON businesses(last_validated_at DESC);
CREATE INDEX IF NOT EXISTS idx_businesses_primary_source ON businesses(primary_source);

-- departments
CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID,
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  deleted_by UUID
);

CREATE INDEX IF NOT EXISTS idx_departments_business_id ON departments(business_id);
CREATE INDEX IF NOT EXISTS idx_departments_name ON departments(name);
CREATE UNIQUE INDEX IF NOT EXISTS idx_departments_business_name ON departments(business_id, name);

-- ============ RELATION TABLES ============

-- phone_owners
CREATE TABLE IF NOT EXISTS phone_owners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_id UUID NOT NULL REFERENCES phones(id),
  owner_type VARCHAR(50) NOT NULL CHECK (owner_type IN ('person', 'business', 'department')),
  owner_id UUID NOT NULL,
  relation_label VARCHAR(100),
  confidence_score SMALLINT DEFAULT 100 CHECK (confidence_score BETWEEN 0 AND 100),
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID,
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  deleted_by UUID
);

CREATE INDEX IF NOT EXISTS idx_phone_owners_phone_id ON phone_owners(phone_id);
CREATE INDEX IF NOT EXISTS idx_phone_owners_owner_type_id ON phone_owners(owner_type, owner_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_phone_owners_composite ON phone_owners(phone_id, owner_type, owner_id) WHERE end_date IS NULL;

-- phone_sources
CREATE TABLE IF NOT EXISTS phone_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_id UUID NOT NULL REFERENCES phones(id) ON DELETE CASCADE,
  source_name VARCHAR(255) NOT NULL,
  source_url VARCHAR(1024),
  collector VARCHAR(50) CHECK (collector IN ('manual', 'import', 'crawler', 'enrichment')),
  collected_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID,
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  deleted_by UUID
);

CREATE INDEX IF NOT EXISTS idx_phone_sources_phone_id ON phone_sources(phone_id);
CREATE INDEX IF NOT EXISTS idx_phone_sources_collector ON phone_sources(collector);

-- contact_attempts
CREATE TABLE IF NOT EXISTS contact_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_id UUID NOT NULL REFERENCES phones(id) ON DELETE CASCADE,
  channel_type VARCHAR(50) NOT NULL CHECK (channel_type IN ('call', 'whatsapp', 'telegram', 'sms')),
  attempted_at TIMESTAMP WITH TIME ZONE NOT NULL,
  outcome VARCHAR(50) CHECK (outcome IN ('answered', 'no_answer', 'wrong_number', 'opted_out', 'failed')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID,
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  deleted_by UUID
);

CREATE INDEX IF NOT EXISTS idx_contact_attempts_phone_id ON contact_attempts(phone_id);
CREATE INDEX IF NOT EXISTS idx_contact_attempts_attempted_at ON contact_attempts(phone_id, attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_attempts_outcome ON contact_attempts(outcome);

-- Phase 3: outreach compliance fields
ALTER TABLE phones ADD COLUMN IF NOT EXISTS marketing_consent VARCHAR(20) DEFAULT 'unknown' CHECK (marketing_consent IN ('granted', 'revoked', 'unknown'));
ALTER TABLE phones ADD COLUMN IF NOT EXISTS transactional_consent VARCHAR(20) DEFAULT 'unknown' CHECK (transactional_consent IN ('granted', 'revoked', 'unknown'));
ALTER TABLE phones ADD COLUMN IF NOT EXISTS suppression_status VARCHAR(50) DEFAULT 'none' CHECK (suppression_status IN ('none', 'manual', 'consent_revoked', 'opted_out'));
ALTER TABLE phones ADD COLUMN IF NOT EXISTS suppression_reason TEXT;
ALTER TABLE phones ADD COLUMN IF NOT EXISTS consent_recorded_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE phones ADD COLUMN IF NOT EXISTS suppression_updated_at TIMESTAMP WITH TIME ZONE;


-- Phase 3: compliance audit log
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_id UUID REFERENCES phones(id) ON DELETE CASCADE,
  entity_type VARCHAR(50) NOT NULL,
  action VARCHAR(100) NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID
);

CREATE INDEX IF NOT EXISTS idx_audit_log_phone_id ON audit_log(phone_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity_type ON audit_log(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);

-- ============ HUMAN REVIEW (PHASE 4) TABLES ============

CREATE TABLE IF NOT EXISTS review_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('business', 'person', 'phone', 'cnpj', 'other')),
  entity_id UUID,
  cnpj VARCHAR(14),
  reason_code VARCHAR(50) NOT NULL CHECK (reason_code IN ('conflict', 'low_confidence', 'sensitive_data', 'fraud_suspected', 'manual')),
  priority VARCHAR(2) NOT NULL DEFAULT 'P2' CHECK (priority IN ('P1', 'P2', 'P3')),
  confidence_score NUMERIC(4, 2) CHECK (confidence_score BETWEEN 0 AND 1),
  sources JSONB,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'escalated', 'resolved', 'dismissed')),
  required_role VARCHAR(50) NOT NULL DEFAULT 'data_analyst' CHECK (required_role IN ('data_analyst', 'operations_supervisor', 'compliance')),
  assigned_to UUID,
  due_at TIMESTAMP WITH TIME ZONE,
  resolution_status VARCHAR(50) CHECK (resolution_status IN ('kept', 'updated', 'discarded', 'escalated')),
  resolution_notes TEXT,
  resolution_evidence JSONB,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID
);

CREATE INDEX IF NOT EXISTS idx_review_queue_status ON review_queue(status);
CREATE INDEX IF NOT EXISTS idx_review_queue_priority ON review_queue(priority);
CREATE INDEX IF NOT EXISTS idx_review_queue_required_role ON review_queue(required_role);
CREATE INDEX IF NOT EXISTS idx_review_queue_assigned_to ON review_queue(assigned_to);
CREATE INDEX IF NOT EXISTS idx_review_queue_due_at ON review_queue(due_at);
CREATE INDEX IF NOT EXISTS idx_review_queue_entity_type ON review_queue(entity_type);
CREATE INDEX IF NOT EXISTS idx_review_queue_cnpj ON review_queue(cnpj);

CREATE TABLE IF NOT EXISTS review_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES review_queue(id),
  event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('created', 'assigned', 'status_changed', 'note', 'resolution', 'updated')),
  event_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actor_id UUID,
  details JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_review_events_review_id ON review_events(review_id);
CREATE INDEX IF NOT EXISTS idx_review_events_event_type ON review_events(event_type);
CREATE INDEX IF NOT EXISTS idx_review_events_event_at ON review_events(event_at DESC);

-- ============ CNPJ JOBS ============

CREATE TABLE IF NOT EXISTS cnpj_import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  total_items INT DEFAULT 0,
  processed_items INT DEFAULT 0,
  failed_items INT DEFAULT 0,
  provider_order JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_by UUID
);

CREATE INDEX IF NOT EXISTS idx_cnpj_import_jobs_status ON cnpj_import_jobs(status);
CREATE INDEX IF NOT EXISTS idx_cnpj_import_jobs_created_at ON cnpj_import_jobs(created_at DESC);

CREATE TABLE IF NOT EXISTS cnpj_import_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES cnpj_import_jobs(id) ON DELETE CASCADE,
  cnpj VARCHAR(14) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'skipped')),
  provider VARCHAR(50),
  business_id UUID REFERENCES businesses(id),
  error_message TEXT,
  cached BOOLEAN DEFAULT FALSE,
  result_summary JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cnpj_import_items_job_id ON cnpj_import_items(job_id);
CREATE INDEX IF NOT EXISTS idx_cnpj_import_items_cnpj ON cnpj_import_items(cnpj);

CREATE TABLE IF NOT EXISTS cnpj_reprocess_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  priority VARCHAR(2) NOT NULL CHECK (priority IN ('P1', 'P2', 'P3')),
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  total_items INT DEFAULT 0,
  processed_items INT DEFAULT 0,
  skipped_items INT DEFAULT 0,
  failed_items INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_by UUID
);

CREATE INDEX IF NOT EXISTS idx_cnpj_reprocess_jobs_status ON cnpj_reprocess_jobs(status);
CREATE INDEX IF NOT EXISTS idx_cnpj_reprocess_jobs_created_at ON cnpj_reprocess_jobs(created_at DESC);

CREATE TABLE IF NOT EXISTS cnpj_reprocess_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES cnpj_reprocess_jobs(id),
  cnpj VARCHAR(14) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'skipped', 'failed')),
  provider VARCHAR(50),
  business_id UUID REFERENCES businesses(id),
  reason VARCHAR(100),
  delta_detected BOOLEAN DEFAULT FALSE,
  previous_hash VARCHAR(64),
  new_hash VARCHAR(64),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cnpj_reprocess_items_job_id ON cnpj_reprocess_items(job_id);
CREATE INDEX IF NOT EXISTS idx_cnpj_reprocess_items_cnpj ON cnpj_reprocess_items(cnpj);

-- ============ PRIMARY RESEARCH ============

CREATE TABLE IF NOT EXISTS primary_research_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  cnpj VARCHAR(14),
  phone_id UUID REFERENCES phones(id) ON DELETE SET NULL,
  priority VARCHAR(2) NOT NULL DEFAULT 'P2' CHECK (priority IN ('P1', 'P2', 'P3')),
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'escalated', 'paused')),
  reason_code VARCHAR(50) NOT NULL CHECK (reason_code IN ('missing_contact', 'missing_role', 'stale_data', 'conflict', 'invalid_contact', 'low_confidence', 'manual')),
  missing_fields JSONB,
  channel_order JSONB,
  timezone VARCHAR(50) DEFAULT 'America/Sao_Paulo',
  window_start_min SMALLINT DEFAULT 540,
  window_end_min SMALLINT DEFAULT 1080,
  attempts_count INT DEFAULT 0,
  next_attempt_at TIMESTAMP WITH TIME ZONE,
  last_attempt_at TIMESTAMP WITH TIME ZONE,
  consent_status VARCHAR(20) DEFAULT 'unknown' CHECK (consent_status IN ('granted', 'revoked', 'unknown')),
  consent_evidence JSONB,
  escalation_review_id UUID REFERENCES review_queue(id),
  assigned_to UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID
);

CREATE INDEX IF NOT EXISTS idx_primary_research_tasks_status ON primary_research_tasks(status);
CREATE INDEX IF NOT EXISTS idx_primary_research_tasks_priority ON primary_research_tasks(priority);
CREATE INDEX IF NOT EXISTS idx_primary_research_tasks_next_attempt_at ON primary_research_tasks(next_attempt_at);
CREATE INDEX IF NOT EXISTS idx_primary_research_tasks_business_id ON primary_research_tasks(business_id);
CREATE INDEX IF NOT EXISTS idx_primary_research_tasks_cnpj ON primary_research_tasks(cnpj);

CREATE UNIQUE INDEX IF NOT EXISTS idx_primary_research_tasks_unique_active
  ON primary_research_tasks(business_id)
  WHERE business_id IS NOT NULL AND status IN ('pending', 'in_progress', 'paused', 'escalated');

CREATE TABLE IF NOT EXISTS primary_research_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES primary_research_tasks(id),
  channel_type VARCHAR(50) NOT NULL CHECK (channel_type IN ('call', 'whatsapp', 'email')),
  outcome VARCHAR(50) NOT NULL CHECK (outcome IN ('answered', 'no_answer', 'wrong_number', 'opted_out', 'failed')),
  attempted_at TIMESTAMP WITH TIME ZONE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID
);

CREATE INDEX IF NOT EXISTS idx_primary_research_attempts_task_id ON primary_research_attempts(task_id);
CREATE INDEX IF NOT EXISTS idx_primary_research_attempts_attempted_at ON primary_research_attempts(task_id, attempted_at DESC);

-- ============ ENRICHMENT (PHASE 2) TABLES ============

-- enrichment_jobs
CREATE TABLE IF NOT EXISTS enrichment_jobs (
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

CREATE INDEX IF NOT EXISTS idx_enrichment_jobs_status ON enrichment_jobs(status);
CREATE INDEX IF NOT EXISTS idx_enrichment_jobs_created_at ON enrichment_jobs(created_at DESC);

-- enrichment_job_items
CREATE TABLE IF NOT EXISTS enrichment_job_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES enrichment_jobs(id) ON DELETE CASCADE,
  phone_id UUID NOT NULL REFERENCES phones(id),
  cnpj VARCHAR(18),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  result_id UUID,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_enrichment_job_items_job_id ON enrichment_job_items(job_id);
CREATE INDEX IF NOT EXISTS idx_enrichment_job_items_phone_id ON enrichment_job_items(phone_id);

-- enrichment_results
CREATE TABLE IF NOT EXISTS enrichment_results (
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

CREATE INDEX IF NOT EXISTS idx_enrichment_results_phone_id ON enrichment_results(phone_id);
CREATE INDEX IF NOT EXISTS idx_enrichment_results_cnpj ON enrichment_results(cnpj);
