# Database Schema Draft

**Target Database:** PostgreSQL 14+  
**Version:** 1.0 (Phase 0 Draft)

## Core Tables

### 1. phones
Primary table for the canonical phone registry.

```sql
CREATE TABLE phones (
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

-- Indexes
CREATE UNIQUE INDEX idx_phones_e164_number ON phones(e164_number);
CREATE INDEX idx_phones_status ON phones(status);
CREATE INDEX idx_phones_created_at ON phones(created_at DESC);
CREATE INDEX idx_phones_last_seen_at ON phones(last_seen_at DESC);
```

### 2. people
Individuals linked to phones.

```sql
CREATE TABLE people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR(255) NOT NULL,
  role_title VARCHAR(255),
  email VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_people_email ON people(email);
CREATE INDEX idx_people_full_name ON people(full_name);
```

### 3. businesses
Organizations.

```sql
CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cnpj VARCHAR(18),
  legal_name VARCHAR(255) NOT NULL,
  trade_name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_businesses_cnpj ON businesses(cnpj);
CREATE INDEX idx_businesses_legal_name ON businesses(legal_name);
```

### 4. departments
Organization subdivisions.

```sql
CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_departments_business_id ON departments(business_id);
CREATE INDEX idx_departments_name ON departments(name);
CREATE UNIQUE INDEX idx_departments_business_name ON departments(business_id, name);
```

### 5. app_users
Internal system users for authentication.

```sql
CREATE TABLE app_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  display_name VARCHAR(255),
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'locked', 'invited')),
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE UNIQUE INDEX idx_app_users_email ON app_users(email);
CREATE INDEX idx_app_users_status ON app_users(status);
```

### 6. auth_identities
OAuth provider integrations.

```sql
CREATE TABLE auth_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL CHECK (provider IN ('local', 'google', 'microsoft')),
  provider_subject VARCHAR(255) NOT NULL,
  email_at_provider VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE UNIQUE INDEX idx_auth_identities_provider_subject 
  ON auth_identities(provider, provider_subject);
CREATE INDEX idx_auth_identities_user_id ON auth_identities(user_id);
```

### 7. password_reset_tokens
Single-use, time-limited password recovery tokens.

```sql
CREATE TABLE password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);
```

## Relation Tables

### 9. phone_sources
Provenance tracking for each phone.

```sql
CREATE TABLE phone_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_id UUID NOT NULL REFERENCES phones(id) ON DELETE CASCADE,
  source_name VARCHAR(255) NOT NULL,
  source_url VARCHAR(1024),
  collector VARCHAR(50) CHECK (collector IN ('manual', 'import', 'crawler', 'enrichment')),
  collected_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_phone_sources_phone_id ON phone_sources(phone_id);
CREATE INDEX idx_phone_sources_collector ON phone_sources(collector);
```
CREATE INDEX idx_phone_owners_phone_id ON phone_owners(phone_id);
CREATE INDEX idx_phone_owners_owner_type_id ON phone_owners(owner_type, owner_id);
CREATE UNIQUE INDEX idx_phone_owners_composite 
  ON phone_owners(phone_id, owner_type, owner_id)
  WHERE end_date IS NULL;
```

### 9. phone_channels
Available communication channels for each phone.

```sql
CREATE TABLE phone_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_id UUID NOT NULL REFERENCES phones(id) ON DELETE CASCADE,
  channel_type VARCHAR(50) NOT NULL CHECK (channel_type IN ('call', 'whatsapp', 'telegram', 'sms')),
  is_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_phone_channels_phone_id ON phone_channels(phone_id);
CREATE UNIQUE INDEX idx_phone_channels_phone_type 
  ON phone_channels(phone_id, channel_type);
```

### 10. phone_sources
Provenance tracking for each phone entry.

```sql
CREATE TABLE phone_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_id UUID NOT NULL REFERENCES phones(id) ON DELETE CASCADE,
  source_name VARCHAR(255) NOT NULL,
  source_url VARCHAR(1024),
  collector VARCHAR(50) CHECK (collector IN ('manual', 'import', 'crawler', 'enrichment')),
  collected_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_phone_sources_phone_id ON phone_sources(phone_id);
CREATE INDEX idx_phone_sources_collector ON phone_sources(collector);
```

### 11. contact_attempts
Interaction history and outcomes.

```sql
CREATE TABLE contact_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_id UUID NOT NULL REFERENCES phones(id) ON DELETE CASCADE,
  channel_type VARCHAR(50) NOT NULL CHECK (channel_type IN ('call', 'whatsapp', 'telegram', 'sms')),
  attempted_at TIMESTAMP WITH TIME ZONE NOT NULL,
  outcome VARCHAR(50) CHECK (outcome IN ('answered', 'no_answer', 'wrong_number', 'opted_out', 'failed')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_contact_attempts_phone_id ON contact_attempts(phone_id);
CREATE INDEX idx_contact_attempts_attempted_at ON contact_attempts(phone_id, attempted_at DESC);
CREATE INDEX idx_contact_attempts_outcome ON contact_attempts(outcome);
```

### 12. contact_attempts
Interaction history and outcomes.

```sql
CREATE TABLE contact_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_id UUID NOT NULL REFERENCES phones(id) ON DELETE CASCADE,
  channel_type VARCHAR(50) NOT NULL CHECK (channel_type IN ('call', 'whatsapp', 'telegram', 'sms')),
  attempted_at TIMESTAMP WITH TIME ZONE NOT NULL,
  outcome VARCHAR(50) CHECK (outcome IN ('answered', 'no_answer', 'wrong_number', 'opted_out', 'failed')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_contact_attempts_phone_id ON contact_attempts(phone_id);
CREATE INDEX idx_contact_attempts_attempted_at ON contact_attempts(phone_id, attempted_at DESC);
CREATE INDEX idx_contact_attempts_outcome ON contact_attempts(outcome);
```

## Constraints & Rules

### Primary Keys
All tables use UUID primary keys with `gen_random_uuid()` as default.

### Foreign Keys
All foreign key relationships use `ON DELETE CASCADE` to maintain referential integrity during deletions.

### Uniqueness Constraints
- `phones.e164_number` - prevents duplicate normalized numbers
- `app_users.email` - prevents duplicate user emails
- `auth_identities(provider, provider_subject)` - prevents duplicate OAuth identities
- `departments(business_id, name)` - prevents duplicate department names per business
- `phone_owners(phone_id, owner_type, owner_id)` - prevents duplicate active relations
-- `phone_sources(phone_id, collector)` - tracks provenance per phone

### Timestamps
- All tables include `created_at` and `updated_at` (except `password_reset_tokens` and `phone_sources` which don't need `updated_at`)
- All timestamps use `TIMESTAMP WITH TIME ZONE` for UTC consistency
- Default to `CURRENT_TIMESTAMP`

### Check Constraints
All enum-like fields use `CHECK` constraints to enforce valid values at the database level.

## Indexes Summary

**Unique Indexes:**
- phones.e164_number
- app_users.email
- auth_identities(provider, provider_subject)
- departments(business_id, name)
- phone_owners(phone_id, owner_type, owner_id) - conditional
- password_reset_tokens.token_hash

**Standard Indexes:**
- phones(status, created_at, last_seen_at)
- people(email, full_name)
- businesses(cnpj, legal_name)
- departments(business_id, name)
- app_users(status)
- auth_identities(user_id)
- password_reset_tokens(user_id, expires_at)
- phone_owners(phone_id, owner_type+owner_id)
- phone_sources(phone_id, collector)
- contact_attempts(phone_id, attempted_at DESC, outcome)

## Notes for Phase 1 Implementation

1. Create all tables with proper constraints
2. Run migrations with version control
3. Seed initial OAuth application credentials (Google, Microsoft)
4. Set up audit logging for sensitive operations (soft-delete timestamps)
5. Consider partitioning `contact_attempts` by month after MVP for performance
6. Set up monitoring for index usage and query performance

## Notes for Future Phases

- Phase 2: Add enrichment-related tables for provider caching and normalization status
- Phase 3: Add audit_log table for compliance and timeline features
- Phase 4: Add metrics and observability tables
- Phase 5: Add call_campaigns, call_jobs, and call_sessions tables
