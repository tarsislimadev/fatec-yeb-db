-- Add business enrichment metadata
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS status_cnpj VARCHAR(50);
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS primary_source VARCHAR(50);
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS last_validated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS data_hash VARCHAR(64);

CREATE INDEX IF NOT EXISTS idx_businesses_last_validated_at ON businesses(last_validated_at DESC);
CREATE INDEX IF NOT EXISTS idx_businesses_primary_source ON businesses(primary_source);

-- CNPJ import jobs
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
  created_by UUID REFERENCES app_users(id)
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

-- CNPJ reprocess jobs
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
  created_by UUID REFERENCES app_users(id)
);

CREATE INDEX IF NOT EXISTS idx_cnpj_reprocess_jobs_status ON cnpj_reprocess_jobs(status);
CREATE INDEX IF NOT EXISTS idx_cnpj_reprocess_jobs_created_at ON cnpj_reprocess_jobs(created_at DESC);

CREATE TABLE IF NOT EXISTS cnpj_reprocess_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES cnpj_reprocess_jobs(id) ON DELETE CASCADE,
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

-- Primary research tasks
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
  assigned_to UUID REFERENCES app_users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES app_users(id),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID REFERENCES app_users(id)
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
  task_id UUID NOT NULL REFERENCES primary_research_tasks(id) ON DELETE CASCADE,
  channel_type VARCHAR(50) NOT NULL CHECK (channel_type IN ('call', 'whatsapp', 'email')),
  outcome VARCHAR(50) NOT NULL CHECK (outcome IN ('answered', 'no_answer', 'wrong_number', 'opted_out', 'failed')),
  attempted_at TIMESTAMP WITH TIME ZONE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES app_users(id)
);

CREATE INDEX IF NOT EXISTS idx_primary_research_attempts_task_id ON primary_research_attempts(task_id);
CREATE INDEX IF NOT EXISTS idx_primary_research_attempts_attempted_at ON primary_research_attempts(task_id, attempted_at DESC);
