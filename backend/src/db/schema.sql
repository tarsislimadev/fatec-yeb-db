-- Phone List System - Database Schema
-- PostgreSQL 14+

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============ CORE TABLES ============

-- phones - canonical phone registry
CREATE TABLE IF NOT EXISTS phones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  e164_number VARCHAR(15) UNIQUE NOT NULL,
  raw_number VARCHAR(255) NOT NULL,
  country_code VARCHAR(2),
  national_number VARCHAR(15),
  type VARCHAR(50) DEFAULT 'unknown' CHECK (type IN ('mobile', 'landline', 'whatsapp', 'unknown')),
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'invalid', 'blocked')),
  is_primary BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMP WITH TIME ZONE,
  last_seen_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_phones_e164_number ON phones(e164_number);
CREATE INDEX IF NOT EXISTS idx_phones_status ON phones(status);
CREATE INDEX IF NOT EXISTS idx_phones_created_at ON phones(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_phones_last_seen_at ON phones(last_seen_at DESC);

-- people
CREATE TABLE IF NOT EXISTS people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR(255) NOT NULL,
  role_title VARCHAR(255),
  email VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
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
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_businesses_cnpj ON businesses(cnpj);
CREATE INDEX IF NOT EXISTS idx_businesses_legal_name ON businesses(legal_name);

-- departments
CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_departments_business_id ON departments(business_id);
CREATE INDEX IF NOT EXISTS idx_departments_name ON departments(name);
CREATE UNIQUE INDEX IF NOT EXISTS idx_departments_business_name ON departments(business_id, name);

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
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
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
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
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
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);

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
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_phone_owners_phone_id ON phone_owners(phone_id);
CREATE INDEX IF NOT EXISTS idx_phone_owners_owner_type_id ON phone_owners(owner_type, owner_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_phone_owners_composite ON phone_owners(phone_id, owner_type, owner_id) WHERE end_date IS NULL;

-- phone_channels
CREATE TABLE IF NOT EXISTS phone_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_id UUID NOT NULL REFERENCES phones(id) ON DELETE CASCADE,
  channel_type VARCHAR(50) NOT NULL CHECK (channel_type IN ('call', 'whatsapp', 'telegram', 'sms')),
  is_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_phone_channels_phone_id ON phone_channels(phone_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_phone_channels_phone_type ON phone_channels(phone_id, channel_type);

-- phone_sources
CREATE TABLE IF NOT EXISTS phone_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_id UUID NOT NULL REFERENCES phones(id) ON DELETE CASCADE,
  source_name VARCHAR(255) NOT NULL,
  source_url VARCHAR(1024),
  collector VARCHAR(50) CHECK (collector IN ('manual', 'import', 'crawler', 'enrichment')),
  collected_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_phone_sources_phone_id ON phone_sources(phone_id);
CREATE INDEX IF NOT EXISTS idx_phone_sources_collector ON phone_sources(collector);

-- phone_consents
CREATE TABLE IF NOT EXISTS phone_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_id UUID NOT NULL REFERENCES phones(id) ON DELETE CASCADE,
  consent_type VARCHAR(50) NOT NULL CHECK (consent_type IN ('marketing', 'transactional')),
  status VARCHAR(50) DEFAULT 'unknown' CHECK (status IN ('granted', 'revoked', 'unknown')),
  recorded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_phone_consents_phone_id ON phone_consents(phone_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_phone_consents_phone_type ON phone_consents(phone_id, consent_type);

-- contact_attempts
CREATE TABLE IF NOT EXISTS contact_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_id UUID NOT NULL REFERENCES phones(id) ON DELETE CASCADE,
  channel_type VARCHAR(50) NOT NULL CHECK (channel_type IN ('call', 'whatsapp', 'telegram', 'sms')),
  attempted_at TIMESTAMP WITH TIME ZONE NOT NULL,
  outcome VARCHAR(50) CHECK (outcome IN ('answered', 'no_answer', 'wrong_number', 'opted_out', 'failed')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_contact_attempts_phone_id ON contact_attempts(phone_id);
CREATE INDEX IF NOT EXISTS idx_contact_attempts_attempted_at ON contact_attempts(phone_id, attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_attempts_outcome ON contact_attempts(outcome);
