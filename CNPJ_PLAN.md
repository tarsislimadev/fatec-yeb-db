# CNPJ Import Plan (People + Phones)

## Goals
- Import CNPJ records, people (QSA/representatives), and phones into the database.
- Normalize and de-duplicate data.
- Persist raw payloads for traceability.
- Support retries, caching, and provider fallback.

## Scope
- Sources: public CNPJ APIs (primary + fallback).
- Targets: `businesses`, `people`, `phones`, `phone_owners`, `phone_sources`, and `enrichment_results`.
- Batch and single-CNPJ import flows.

## Data Mapping
### Business
- `cnpj` -> `businesses.cnpj`
- `razao_social` -> `businesses.legal_name`
- `nome_fantasia` -> `businesses.trade_name`
- `situacao_cadastral` -> `enrichment_results.status` (also store in raw JSON)
- `endereco` -> `enrichment_results.address`

### People
- Use API fields for QSA/representatives.
- `nome` -> `people.full_name`
- `cargo` -> `people.role_title`
- `email` -> `people.email` (when available)
- Link person to business with `people_businesses`.

### Phones
- Normalize to E.164 where possible.
- Deduplicate by `phones.e164_number`.
- Use `phones.type` for phone type (mobile/landline/whatsapp).
- Link phones using `phone_owners` with `owner_type` = `person` or `business`.
- Record provenance in `phone_sources` (collector = `import` or `enrichment`).

## Provider Strategy
- Primary provider: Brasil API or CNPJA Open API (existing docs).
- Fallback provider: configure at least one additional free/no-auth API.
- Implement provider interface:
  - `lookup(cnpj) -> normalizedPayload`
  - `getProviderName() -> string`
- Draft adapters: `BrasilApiCnpjAdapter`, `CnpjaOpenAdapter`.

## Import Workflow
1. Receive CNPJ list (file upload or API endpoint).
2. Normalize CNPJ (14 digits).
3. For each CNPJ:
  - Check cache / recent import (Redis or DB `enrichment_results.cached`).
  - Call provider (primary, then fallback on error/timeout).
  - Upsert business record by CNPJ.
  - Extract people and phones; upsert people; link to business via `people_businesses`.
  - Upsert phones; link to person and/or business via `phone_owners`.
  - Store raw payload in `enrichment_results.raw_response` for each phone created (since `phone_id` is required).
4. Update job status with counts and errors.

## Database Additions (If Missing)
- `people_businesses` (many-to-many) join table:
  - `id`, `person_id`, `business_id`, `role_title`, timestamps, and soft-delete fields.

## API Endpoints
- `POST /api/cnpj/import` (batch import, returns job id).
- `GET /api/cnpj/import/:jobId` (job status, counts, errors).
- `POST /api/cnpj/lookup` (single lookup, already documented).

## Error Handling
- Retry on 429/5xx with exponential backoff.
- Circuit breaker per provider after N failures.
- Persist errors in `enrichment_job_items.error_message`.

## Observability
- Log provider, latency, and status for each lookup.
- Track cache hits vs live calls.
- Add metrics: success rate, avg latency, fallback usage.

## Testing
- Unit tests for normalization and mapping.
- Integration tests with mocked provider responses.
- E2E test for batch import flow and DB writes.

## Deliverables
- Provider interface + 2 provider adapters.
- Import service + job processor.
- New endpoints and DB migrations.
- Docs update in README.
