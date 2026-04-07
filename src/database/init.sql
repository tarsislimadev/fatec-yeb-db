CREATE TABLE IF NOT EXISTS companies (
	id BIGSERIAL PRIMARY KEY,
	cnpj VARCHAR(14) NOT NULL UNIQUE,
	legal_name TEXT,
	trade_name TEXT,
	main_cnae TEXT,
	phone TEXT,
	email TEXT,
	status VARCHAR(24) NOT NULL DEFAULT 'pending',
	source VARCHAR(100) NOT NULL DEFAULT 'manual',
	verified BOOLEAN NOT NULL DEFAULT false,
	raw_data JSONB,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contacts (
	id BIGSERIAL PRIMARY KEY,
	company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
	name TEXT,
	role TEXT,
	phone TEXT,
	email TEXT,
	source VARCHAR(100) NOT NULL DEFAULT 'manual',
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lookup_audit (
	id BIGSERIAL PRIMARY KEY,
	company_id BIGINT REFERENCES companies(id) ON DELETE SET NULL,
	cnpj VARCHAR(14) NOT NULL,
	source VARCHAR(100) NOT NULL,
	status VARCHAR(24) NOT NULL,
	details TEXT,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS message_templates (
	id BIGSERIAL PRIMARY KEY,
	name VARCHAR(120) NOT NULL UNIQUE,
	language_code VARCHAR(10) NOT NULL DEFAULT 'pt_BR',
	body TEXT NOT NULL,
	variables JSONB NOT NULL DEFAULT '[]'::jsonb,
	active BOOLEAN NOT NULL DEFAULT true,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS outbound_messages (
	id BIGSERIAL PRIMARY KEY,
	company_id BIGINT REFERENCES companies(id) ON DELETE SET NULL,
	contact_id BIGINT REFERENCES contacts(id) ON DELETE SET NULL,
	contact_phone TEXT NOT NULL,
	template_name VARCHAR(120) NOT NULL,
	provider VARCHAR(80) NOT NULL DEFAULT 'meta',
	channel VARCHAR(30) NOT NULL DEFAULT 'whatsapp',
	campaign_id VARCHAR(80),
	idempotency_key VARCHAR(128) NOT NULL,
	status VARCHAR(30) NOT NULL DEFAULT 'queued',
	failure_reason TEXT,
	provider_message_id VARCHAR(180),
	payload JSONB NOT NULL DEFAULT '{}'::jsonb,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	UNIQUE (idempotency_key)
);

CREATE TABLE IF NOT EXISTS message_events (
	id BIGSERIAL PRIMARY KEY,
	message_id BIGINT REFERENCES outbound_messages(id) ON DELETE CASCADE,
	provider VARCHAR(80) NOT NULL,
	event_type VARCHAR(40) NOT NULL,
	provider_event_id VARCHAR(180),
	event_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	payload JSONB NOT NULL DEFAULT '{}'::jsonb,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contact_consent (
	id BIGSERIAL PRIMARY KEY,
	contact_id BIGINT REFERENCES contacts(id) ON DELETE CASCADE,
	phone TEXT NOT NULL,
	legal_basis VARCHAR(50) NOT NULL,
	consent_status VARCHAR(30) NOT NULL DEFAULT 'unknown',
	consent_source VARCHAR(120),
	observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS suppression_list (
	id BIGSERIAL PRIMARY KEY,
	phone TEXT NOT NULL UNIQUE,
	reason VARCHAR(120) NOT NULL,
	active BOOLEAN NOT NULL DEFAULT true,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_companies_cnpj ON companies(cnpj);
CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status);
CREATE INDEX IF NOT EXISTS idx_lookup_audit_cnpj ON lookup_audit(cnpj);
CREATE INDEX IF NOT EXISTS idx_outbound_messages_status ON outbound_messages(status);
CREATE INDEX IF NOT EXISTS idx_outbound_messages_provider_message_id ON outbound_messages(provider_message_id);
CREATE INDEX IF NOT EXISTS idx_suppression_list_phone_active ON suppression_list(phone, active);
