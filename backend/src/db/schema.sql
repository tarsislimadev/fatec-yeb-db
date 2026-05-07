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
  created_by UUID REFERENCES app_users(id),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID REFERENCES app_users(id),
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  deleted_by UUID REFERENCES app_users(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_app_users_email ON app_users(email);
CREATE INDEX IF NOT EXISTS idx_app_users_status ON app_users(status);

-- auth_identities
CREATE TABLE IF NOT EXISTS auth_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL CHECK (provider IN ('local', 'google', 'microsoft')),
  provider_subject VARCHAR(255) NOT NULL,
  email_at_provider VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES app_users(id),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID REFERENCES app_users(id),
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  deleted_by UUID REFERENCES app_users(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_auth_identities_provider_subject ON auth_identities(provider, provider_subject);
CREATE INDEX IF NOT EXISTS idx_auth_identities_user_id ON auth_identities(user_id);

-- password_reset_tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES app_users(id),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID REFERENCES app_users(id),
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  deleted_by UUID REFERENCES app_users(id)
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
  created_by UUID REFERENCES app_users(id),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID REFERENCES app_users(id),
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  deleted_by UUID REFERENCES app_users(id)
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
  role_title VARCHAR(255),
  email VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES app_users(id),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID REFERENCES app_users(id),
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  deleted_by UUID REFERENCES app_users(id)
);

CREATE INDEX IF NOT EXISTS idx_people_email ON people(email);
CREATE INDEX IF NOT EXISTS idx_people_full_name ON people(full_name);

-- businesses
CREATE TABLE IF NOT EXISTS businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cnpj VARCHAR(18),
  legal_name VARCHAR(255) NOT NULL,
  trade_name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES app_users(id),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID REFERENCES app_users(id),
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  deleted_by UUID REFERENCES app_users(id)
);

CREATE INDEX IF NOT EXISTS idx_businesses_cnpj ON businesses(cnpj);
CREATE INDEX IF NOT EXISTS idx_businesses_legal_name ON businesses(legal_name);

-- departments
CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES app_users(id),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID REFERENCES app_users(id),
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  deleted_by UUID REFERENCES app_users(id)
);

CREATE INDEX IF NOT EXISTS idx_departments_business_id ON departments(business_id);
CREATE INDEX IF NOT EXISTS idx_departments_name ON departments(name);
CREATE UNIQUE INDEX IF NOT EXISTS idx_departments_business_name ON departments(business_id, name);

-- ============ RELATION TABLES ============

-- phone_owners
CREATE TABLE IF NOT EXISTS phone_owners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_id UUID NOT NULL REFERENCES phones(id) ON DELETE CASCADE,
  owner_type VARCHAR(50) NOT NULL CHECK (owner_type IN ('person', 'business', 'department')),
  owner_id UUID NOT NULL,
  relation_label VARCHAR(100),
  confidence_score SMALLINT DEFAULT 100 CHECK (confidence_score BETWEEN 0 AND 100),
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES app_users(id),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID REFERENCES app_users(id),
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  deleted_by UUID REFERENCES app_users(id)
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
  created_by UUID REFERENCES app_users(id),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID REFERENCES app_users(id),
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  deleted_by UUID REFERENCES app_users(id)
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
  created_by UUID REFERENCES app_users(id),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID REFERENCES app_users(id),
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  deleted_by UUID REFERENCES app_users(id)
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

-- Phase 5: voice channel suppression
ALTER TABLE phones ADD COLUMN IF NOT EXISTS voice_suppressed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE phones ADD COLUMN IF NOT EXISTS voice_suppression_reason VARCHAR(100) CHECK (voice_suppression_reason IN ('opted_out_spoken', 'opted_out_consent', 'invalid_number', 'do_not_call_registry', 'manual'));


-- Phase 3: compliance audit log
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_id UUID REFERENCES phones(id) ON DELETE CASCADE,
  entity_type VARCHAR(50) NOT NULL,
  action VARCHAR(100) NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES app_users(id)
);

CREATE INDEX IF NOT EXISTS idx_audit_log_phone_id ON audit_log(phone_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity_type ON audit_log(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);

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

-- ============ VOICE CALLING (PHASE 5) TABLES ============

-- call_campaigns
CREATE TABLE IF NOT EXISTS call_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'running', 'paused', 'completed')),
  config JSONB DEFAULT '{}' NOT NULL,
  prospect_ids UUID[] DEFAULT '{}' NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES app_users(id),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID REFERENCES app_users(id),
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  deleted_by UUID REFERENCES app_users(id)
);

CREATE INDEX IF NOT EXISTS idx_call_campaigns_user_id ON call_campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_call_campaigns_status ON call_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_call_campaigns_created_at ON call_campaigns(created_at DESC);

-- calls
CREATE TABLE IF NOT EXISTS calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES call_campaigns(id) ON DELETE SET NULL,
  prospect_id UUID REFERENCES people(id) ON DELETE SET NULL,
  phone_id UUID NOT NULL REFERENCES phones(id) ON DELETE CASCADE,
  phone_number VARCHAR(15) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'dialing', 'in-progress', 'completed', 'failed', 'skipped')),
  disposition VARCHAR(100),
  scheduled_at TIMESTAMP WITH TIME ZONE,
  dialed_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INT,
  retry_count INT DEFAULT 0,
  last_retry_at TIMESTAMP WITH TIME ZONE,
  next_retry_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES app_users(id),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID REFERENCES app_users(id),
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  deleted_by UUID REFERENCES app_users(id)
);

CREATE INDEX IF NOT EXISTS idx_calls_campaign_id ON calls(campaign_id);
CREATE INDEX IF NOT EXISTS idx_calls_phone_id ON calls(phone_id);
CREATE INDEX IF NOT EXISTS idx_calls_status ON calls(status);
CREATE INDEX IF NOT EXISTS idx_calls_created_at ON calls(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_calls_dialed_at ON calls(dialed_at DESC);

-- call_sessions
CREATE TABLE IF NOT EXISTS call_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  provider_id VARCHAR(255) NOT NULL,
  provider_name VARCHAR(50) DEFAULT 'twilio',
  webhook_data JSONB,
  recording_url VARCHAR(1024),
  call_duration_seconds INT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_call_sessions_call_id ON call_sessions(call_id);
CREATE INDEX IF NOT EXISTS idx_call_sessions_provider_id ON call_sessions(provider_id);

-- transcripts
CREATE TABLE IF NOT EXISTS transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  raw_text TEXT,
  processed_text TEXT,
  confidence_score SMALLINT DEFAULT 0 CHECK (confidence_score BETWEEN 0 AND 100),
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'approved', 'rejected')),
  flagged_for_review BOOLEAN DEFAULT FALSE,
  review_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES app_users(id),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID REFERENCES app_users(id)
);

CREATE INDEX IF NOT EXISTS idx_transcripts_call_id ON transcripts(call_id);
CREATE INDEX IF NOT EXISTS idx_transcripts_status ON transcripts(status);
CREATE INDEX IF NOT EXISTS idx_transcripts_flagged_for_review ON transcripts(flagged_for_review);

-- call_outcomes
CREATE TABLE IF NOT EXISTS call_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  disposition VARCHAR(100),
  spoken_opt_out_flag BOOLEAN DEFAULT FALSE,
  opt_out_confidence SMALLINT DEFAULT 0 CHECK (opt_out_confidence BETWEEN 0 AND 100),
  opt_out_keywords VARCHAR(255)[],
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES app_users(id),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID REFERENCES app_users(id)
);

CREATE INDEX IF NOT EXISTS idx_call_outcomes_call_id ON call_outcomes(call_id);
CREATE INDEX IF NOT EXISTS idx_call_outcomes_spoken_opt_out ON call_outcomes(spoken_opt_out_flag);

-- call_retry_log
CREATE TABLE IF NOT EXISTS call_retry_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  attempt_number INT NOT NULL,
  error_code VARCHAR(50),
  error_message TEXT,
  next_retry_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_call_retry_log_call_id ON call_retry_log(call_id);
CREATE INDEX IF NOT EXISTS idx_call_retry_log_attempt_number ON call_retry_log(call_id, attempt_number);

