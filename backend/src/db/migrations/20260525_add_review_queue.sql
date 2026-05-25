-- Add human review queue tables

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
  assigned_to UUID REFERENCES app_users(id),
  due_at TIMESTAMP WITH TIME ZONE,
  resolution_status VARCHAR(50) CHECK (resolution_status IN ('kept', 'updated', 'discarded', 'escalated')),
  resolution_notes TEXT,
  resolution_evidence JSONB,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES app_users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES app_users(id),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID REFERENCES app_users(id)
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
  review_id UUID NOT NULL REFERENCES review_queue(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('created', 'assigned', 'status_changed', 'note', 'resolution', 'updated')),
  event_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actor_id UUID REFERENCES app_users(id),
  details JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_review_events_review_id ON review_events(review_id);
CREATE INDEX IF NOT EXISTS idx_review_events_event_type ON review_events(event_type);
CREATE INDEX IF NOT EXISTS idx_review_events_event_at ON review_events(event_at DESC);
