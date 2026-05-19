-- Migration: Add normalization and deduplication keys

-- Normalize business CNPJ values
UPDATE businesses
SET cnpj = regexp_replace(cnpj, '\\D', '', 'g')
WHERE cnpj IS NOT NULL;

UPDATE businesses
SET cnpj = NULL
WHERE cnpj IS NOT NULL AND length(cnpj) <> 14;

WITH ranked AS (
  SELECT
    id,
    cnpj,
    ROW_NUMBER() OVER (PARTITION BY cnpj ORDER BY created_at NULLS LAST, id) AS rn
  FROM businesses
  WHERE cnpj IS NOT NULL
)
UPDATE businesses b
SET cnpj = NULL
FROM ranked r
WHERE b.id = r.id AND r.rn > 1;

ALTER TABLE businesses
  ALTER COLUMN cnpj TYPE VARCHAR(14);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'businesses_cnpj_length'
  ) THEN
    ALTER TABLE businesses
      ADD CONSTRAINT businesses_cnpj_length
      CHECK (cnpj IS NULL OR length(cnpj) = 14);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_businesses_cnpj_unique
  ON businesses(cnpj)
  WHERE cnpj IS NOT NULL AND deleted_at IS NULL;

-- Add normalized columns for people
ALTER TABLE people ADD COLUMN IF NOT EXISTS full_name_normalized VARCHAR(255);
ALTER TABLE people ADD COLUMN IF NOT EXISTS email_normalized VARCHAR(255);
ALTER TABLE people ADD COLUMN IF NOT EXISTS document VARCHAR(20);
ALTER TABLE people ADD COLUMN IF NOT EXISTS document_normalized VARCHAR(20);

UPDATE people
SET full_name_normalized = lower(trim(full_name))
WHERE full_name IS NOT NULL;

UPDATE people
SET email_normalized = lower(trim(email))
WHERE email IS NOT NULL;

UPDATE people
SET document_normalized = regexp_replace(document, '\\D', '', 'g')
WHERE document IS NOT NULL;

UPDATE people
SET document_normalized = NULL
WHERE document_normalized = '';

WITH ranked_email AS (
  SELECT
    id,
    email_normalized,
    ROW_NUMBER() OVER (PARTITION BY email_normalized ORDER BY created_at NULLS LAST, id) AS rn
  FROM people
  WHERE email_normalized IS NOT NULL AND deleted_at IS NULL
)
UPDATE people p
SET email_normalized = NULL
FROM ranked_email r
WHERE p.id = r.id AND r.rn > 1;

WITH ranked_doc AS (
  SELECT
    id,
    document_normalized,
    ROW_NUMBER() OVER (PARTITION BY document_normalized ORDER BY created_at NULLS LAST, id) AS rn
  FROM people
  WHERE document_normalized IS NOT NULL AND deleted_at IS NULL
)
UPDATE people p
SET document_normalized = NULL
FROM ranked_doc r
WHERE p.id = r.id AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_people_email_normalized_unique
  ON people(email_normalized)
  WHERE email_normalized IS NOT NULL AND deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_people_document_normalized_unique
  ON people(document_normalized)
  WHERE document_normalized IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_people_full_name_normalized
  ON people(full_name_normalized);
