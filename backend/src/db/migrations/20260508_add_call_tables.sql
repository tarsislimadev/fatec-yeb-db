-- Migration: Add/ensure call-related tables for Phase 5
-- Safe to run multiple times; uses IF NOT EXISTS

-- calls table (safe duplicate of core schema; kept here for controlled migration)
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
