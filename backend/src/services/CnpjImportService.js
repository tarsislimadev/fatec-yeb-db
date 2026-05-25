import crypto from 'crypto';
import { db, redis } from '../db/index.js';
import { validateAndNormalizePhone } from '../utils/phone.js';
import { normalizeCnpj, normalizeDocument, normalizeEmail, normalizeName } from '../utils/normalize.js';
import { BrasilApiCnpjAdapter } from './BrasilApiCnpjAdapter.js';
import { CnpjaOpenAdapter } from './CnpjaOpenAdapter.js';

const DEFAULT_PROVIDERS = [
  () => new BrasilApiCnpjAdapter(),
  () => new CnpjaOpenAdapter(),
];

const CACHE_TTL_SECONDS = parseInt(process.env.CNPJ_CACHE_TTL_SECONDS || '86400', 10);
const RETRY_ATTEMPTS = parseInt(process.env.CNPJ_RETRY_ATTEMPTS || '2', 10);
const RETRY_BASE_MS = parseInt(process.env.CNPJ_RETRY_BASE_MS || '400', 10);

export class CnpjImportService {
  constructor({ providers = null, dbClient = null } = {}) {
    this.providers = providers || DEFAULT_PROVIDERS.map((create) => create());
    this.db = dbClient || db;
  }

  async lookupWithFallback(normalizedCnpj) {
    let lastError = null;

    for (const provider of this.providers) {
      try {
        const payload = await lookupWithRetry(provider, normalizedCnpj);
        return { providerName: provider.getProviderName(), payload };
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error('No providers configured');
  }

  async lookupSingle(cnpj, { forceRefresh = false } = {}) {
    const normalized = normalizeCnpj(cnpj);
    if (!normalized) {
      throw new Error('Invalid CNPJ format. Expect 14 digits.');
    }

    const cacheKey = buildCacheKey(normalized);

    if (!forceRefresh && redis?.isOpen) {
      const cachedValue = await redis.get(cacheKey);
      if (cachedValue) {
        const cached = JSON.parse(cachedValue);
        return {
          providerName: cached.providerName,
          payload: cached.payload,
          cached: true,
        };
      }
    }

    const result = await this.lookupWithFallback(normalized);

    if (redis?.isOpen) {
      await redis.set(cacheKey, JSON.stringify({
        providerName: result.providerName,
        payload: result.payload,
      }), { EX: CACHE_TTL_SECONDS });
    }

    return { ...result, cached: false };
  }

  async importCnpjs(cnpjs, { requestedBy = null, providerOrder = null } = {}) {
    const jobId = await createImportJob(this.db, cnpjs, { providerOrder, requestedBy });
    const results = [];

    await updateImportJob(this.db, jobId, { status: 'processing', started_at: new Date() });

    let processed = 0;
    let failed = 0;

    for (const cnpj of cnpjs) {
      const normalized = normalizeCnpj(cnpj);
      if (!normalized) {
        await updateImportItem(this.db, jobId, cnpj, {
          status: 'failed',
          error_message: 'Invalid CNPJ format. Expect 14 digits.',
        });
        failed += 1;
        continue;
      }

      try {
        const { providerName, payload, cached } = await this.lookupSingle(normalized);
        const importResult = await this.importPayload(payload, providerName, requestedBy, { cached });

        await updateImportItem(this.db, jobId, normalized, {
          status: 'completed',
          provider: providerName,
          business_id: importResult.business_id,
          cached,
          result_summary: {
            legal_name: payload.legalName || null,
            trade_name: payload.tradeName || null,
            status: payload.status || null,
          },
        });

        results.push({
          cnpj: payload.cnpj,
          provider: providerName,
          status: 'imported',
          cached,
          ...importResult,
        });
        processed += 1;
      } catch (error) {
        failed += 1;
        await updateImportItem(this.db, jobId, normalized, {
          status: 'failed',
          error_message: error.message,
        });
        results.push({
          cnpj: normalized,
          status: 'failed',
          error: error.message,
        });
      }
    }

    await updateImportJob(this.db, jobId, {
      status: failed === cnpjs.length ? 'failed' : 'completed',
      processed_items: processed,
      failed_items: failed,
      completed_at: new Date(),
    });

    return {
      job_id: jobId,
      total: cnpjs.length,
      succeeded: processed,
      failed,
      items: results,
    };
  }

  async importPayload(payload, providerName, requestedBy, { cached = false } = {}) {
    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      const businessId = await upsertBusiness(client, payload, providerName, requestedBy);
      const peopleIds = await upsertPeople(client, payload.people || [], businessId, requestedBy);
      const phoneIds = await upsertPhones(client, payload.phones || [], {
        businessId,
        providerName,
        requestedBy,
      });

      await recordEnrichmentResults(client, {
        phoneIds,
        payload,
        providerName,
        cached,
      });

      await client.query('COMMIT');

      return {
        business_id: businessId,
        people_count: peopleIds.length,
        phone_count: phoneIds.length,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async reprocessCnpjs({
    priority = 'P2',
    cnpjs = null,
    limit = 100,
    requestedBy = null,
  } = {}) {
    const targets = Array.isArray(cnpjs) && cnpjs.length > 0
      ? await fetchBusinessesByCnpj(this.db, cnpjs)
      : await fetchStaleBusinesses(this.db, priority, limit);

    const jobId = await createReprocessJob(this.db, priority, targets, requestedBy);
    await updateReprocessJob(this.db, jobId, { status: 'processing', started_at: new Date() });

    let processed = 0;
    let failed = 0;
    let skipped = 0;

    for (const target of targets) {
      const normalized = normalizeCnpj(target.cnpj);
      if (!normalized) {
        skipped += 1;
        await updateReprocessItem(this.db, jobId, target.cnpj, {
          status: 'skipped',
          reason: 'invalid_cnpj',
        });
        continue;
      }

      try {
        const { providerName, payload } = await this.lookupSingle(normalized, { forceRefresh: true });
        const newHash = buildBusinessHash({
          legalName: payload.legalName || payload.tradeName || null,
          tradeName: payload.tradeName || null,
          status: payload.status || null,
          address: payload.address || null,
        });
        const deltaDetected = Boolean(target.data_hash && newHash && target.data_hash !== newHash);

        const importResult = await this.importPayload(payload, providerName, requestedBy, { cached: false });

        processed += 1;
        await updateReprocessItem(this.db, jobId, normalized, {
          status: 'processed',
          provider: providerName,
          business_id: importResult.business_id,
          reason: target.reason || 'stale',
          delta_detected: deltaDetected,
          previous_hash: target.data_hash || null,
          new_hash: newHash,
        });
      } catch (error) {
        failed += 1;
        await updateReprocessItem(this.db, jobId, normalized, {
          status: 'failed',
          error_message: error.message,
        });
      }
    }

    await updateReprocessJob(this.db, jobId, {
      status: failed === targets.length && targets.length > 0 ? 'failed' : 'completed',
      processed_items: processed,
      failed_items: failed,
      skipped_items: skipped,
      completed_at: new Date(),
    });

    return {
      job_id: jobId,
      total: targets.length,
      processed,
      failed,
      skipped,
    };
  }
}

async function upsertBusiness(client, payload, providerName, requestedBy) {
  const cnpj = normalizeCnpj(payload.cnpj);
  if (!cnpj) {
    throw new Error('Invalid CNPJ payload');
  }
  const legalName = payload.legalName || payload.tradeName || `CNPJ ${cnpj}`;
  const tradeName = payload.tradeName || null;
  const statusCnpj = payload.status || null;
  const primarySource = providerName || null;
  const validatedAt = new Date();
  const dataHash = buildBusinessHash({
    legalName,
    tradeName,
    status: statusCnpj,
    address: payload.address || null,
  });

  const existing = await client.query(
    'SELECT id FROM businesses WHERE cnpj = $1',
    [cnpj]
  );

  if (existing.rows.length > 0) {
    const businessId = existing.rows[0].id;
    await client.query(
      `UPDATE businesses
       SET legal_name = COALESCE($2, legal_name),
           trade_name = COALESCE($3, trade_name),
           status_cnpj = COALESCE($4, status_cnpj),
           primary_source = COALESCE($5, primary_source),
           last_validated_at = $6,
           data_hash = $7,
           updated_at = CURRENT_TIMESTAMP,
           updated_by = $8
       WHERE id = $1`,
      [
        businessId,
        legalName,
        tradeName,
        statusCnpj,
        primarySource,
        validatedAt,
        dataHash,
        requestedBy,
      ]
    );

    return businessId;
  }

  const insertResult = await client.query(
    `INSERT INTO businesses (
      cnpj,
      legal_name,
      trade_name,
      status_cnpj,
      primary_source,
      last_validated_at,
      data_hash,
      created_by,
      updated_by
    )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
     RETURNING id`,
    [cnpj, legalName, tradeName, statusCnpj, primarySource, validatedAt, dataHash, requestedBy]
  );

  return insertResult.rows[0].id;
}

async function upsertPeople(client, people, businessId, requestedBy) {
  const ids = [];

  for (const person of people) {
    const normalizedName = normalizeName(person?.fullName);
    if (!normalizedName) {
      continue;
    }

    const email = person.email || null;
    const normalizedEmail = normalizeEmail(email);
    const document = person.document || null;
    const normalizedDocument = normalizeDocument(document);
    let personId = null;

    if (normalizedDocument) {
      const existing = await client.query(
        'SELECT id FROM people WHERE document_normalized = $1 AND deleted_at IS NULL',
        [normalizedDocument]
      );

      if (existing.rows.length > 0) {
        personId = existing.rows[0].id;
      }
    }

    if (!personId && normalizedEmail) {
      const existing = await client.query(
        'SELECT id FROM people WHERE email_normalized = $1 AND deleted_at IS NULL',
        [normalizedEmail]
      );

      if (existing.rows.length > 0) {
        personId = existing.rows[0].id;
      }
    }

    if (!personId) {
      const insertResult = await client.query(
        `INSERT INTO people (
           full_name,
           full_name_normalized,
           role_title,
           email,
           email_normalized,
           document,
           document_normalized,
           created_by,
           updated_by
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
         RETURNING id`,
        [
          person.fullName,
          normalizedName,
          person.roleTitle || null,
          email,
          normalizedEmail,
          document,
          normalizedDocument,
          requestedBy,
        ]
      );

      personId = insertResult.rows[0].id;
    } else {
      await client.query(
        `UPDATE people
         SET full_name = COALESCE($2, full_name),
             full_name_normalized = COALESCE($3, full_name_normalized),
             role_title = COALESCE($4, role_title),
             email = COALESCE($5, email),
             email_normalized = COALESCE($6, email_normalized),
             document = COALESCE($7, document),
             document_normalized = COALESCE($8, document_normalized),
             updated_at = CURRENT_TIMESTAMP,
             updated_by = $9
         WHERE id = $1`,
        [
          personId,
          person.fullName,
          normalizedName,
          person.roleTitle || null,
          email,
          normalizedEmail,
          document,
          normalizedDocument,
          requestedBy,
        ]
      );
    }

    await ensurePeopleBusinessLink(client, personId, businessId, person.roleTitle, requestedBy);
    ids.push(personId);
  }

  return ids;
}

async function ensurePeopleBusinessLink(client, personId, businessId, roleTitle, requestedBy) {
  const existing = await client.query(
    `SELECT id FROM people_businesses
     WHERE person_id = $1 AND business_id = $2 AND deleted_at IS NULL`,
    [personId, businessId]
  );

  if (existing.rows.length > 0) {
    return existing.rows[0].id;
  }

  const result = await client.query(
    `INSERT INTO people_businesses (person_id, business_id, role_title, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $4)
     RETURNING id`,
    [personId, businessId, roleTitle || null, requestedBy]
  );

  return result.rows[0].id;
}

async function upsertPhones(client, phones, { businessId, providerName, requestedBy }) {
  const phoneIds = [];
  const seenNumbers = new Set();

  for (const phone of phones) {
    const raw = phone?.raw || phone?.number || phone;
    if (!raw) {
      continue;
    }

    const normalized = validateAndNormalizePhone(String(raw));
    if (!normalized.valid) {
      continue;
    }

    if (seenNumbers.has(normalized.e164_number)) {
      continue;
    }

    seenNumbers.add(normalized.e164_number);

    const existing = await client.query(
      'SELECT id FROM phones WHERE e164_number = $1',
      [normalized.e164_number]
    );

    let phoneId = null;

    if (existing.rows.length > 0) {
      phoneId = existing.rows[0].id;
    } else {
      const insertResult = await client.query(
        `INSERT INTO phones (e164_number, country_code, type, status, created_by, updated_by)
         VALUES ($1, $2, $3, $4, $5, $5)
         RETURNING id`,
        [normalized.e164_number, normalized.country_code, normalized.type, 'active', requestedBy]
      );
      phoneId = insertResult.rows[0].id;
    }

    await ensurePhoneOwner(client, phoneId, businessId, requestedBy);
    await recordPhoneSource(client, phoneId, providerName, requestedBy);

    phoneIds.push(phoneId);
  }

  return phoneIds;
}

async function ensurePhoneOwner(client, phoneId, businessId, requestedBy) {
  const existing = await client.query(
    `SELECT id FROM phone_owners
     WHERE phone_id = $1 AND owner_type = 'business' AND owner_id = $2 AND end_date IS NULL`,
    [phoneId, businessId]
  );

  if (existing.rows.length > 0) {
    return existing.rows[0].id;
  }

  const result = await client.query(
    `INSERT INTO phone_owners (phone_id, owner_type, owner_id, relation_label, confidence_score, created_by, updated_by)
     VALUES ($1, 'business', $2, $3, $4, $5, $5)
     RETURNING id`,
    [phoneId, businessId, 'cnpj_import', 90, requestedBy]
  );

  return result.rows[0].id;
}

async function recordPhoneSource(client, phoneId, providerName, requestedBy) {
  await client.query(
    `INSERT INTO phone_sources (phone_id, source_name, collector, collected_at, created_by, updated_by)
     VALUES ($1, $2, $3, NOW(), $4, $4)`,
    [phoneId, providerName, 'enrichment', requestedBy]
  );
}

async function recordEnrichmentResults(client, { phoneIds, payload, providerName, cached }) {
  if (phoneIds.length === 0) {
    return;
  }

  for (const phoneId of phoneIds) {
    await client.query(
      `INSERT INTO enrichment_results (
        phone_id, cnpj, provider, legal_name, trade_name, status, address, raw_response, cached
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        phoneId,
        payload.cnpj,
        providerName,
        payload.legalName || null,
        payload.tradeName || null,
        payload.status || null,
        payload.address || null,
        payload.raw || null,
        cached === true,
      ]
    );
  }
}

function buildBusinessHash({ legalName, tradeName, status, address }) {
  const payload = {
    legal_name: legalName || null,
    trade_name: tradeName || null,
    status: status || null,
    address: address || null,
  };
  return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

function buildCacheKey(normalizedCnpj) {
  return `cnpj:lookup:${normalizedCnpj}`;
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldRetry(error) {
  const status = error.response?.status;
  if (!status) {
    return true;
  }
  return status === 429 || status >= 500;
}

async function lookupWithRetry(provider, cnpj) {
  let lastError = null;

  for (let attempt = 0; attempt <= RETRY_ATTEMPTS; attempt += 1) {
    try {
      return await provider.lookup(cnpj);
    } catch (error) {
      lastError = error;
      if (attempt >= RETRY_ATTEMPTS || !shouldRetry(error)) {
        break;
      }
      const backoff = RETRY_BASE_MS * (2 ** attempt);
      await sleep(backoff);
    }
  }

  throw lastError;
}

async function createImportJob(dbClient, cnpjs, { providerOrder, requestedBy }) {
  const result = await dbClient.query(
    `INSERT INTO cnpj_import_jobs (status, total_items, provider_order, created_by)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    ['pending', cnpjs.length, providerOrder || null, requestedBy]
  );

  const jobId = result.rows[0].id;
  const insertValues = [];
  const params = [];
  let index = 1;

  for (const rawCnpj of cnpjs) {
    insertValues.push(`($${index}, $${index + 1}, $${index + 2})`);
    params.push(jobId, normalizeCnpj(rawCnpj) || rawCnpj, 'pending');
    index += 3;
  }

  if (insertValues.length > 0) {
    await dbClient.query(
      `INSERT INTO cnpj_import_items (job_id, cnpj, status)
       VALUES ${insertValues.join(', ')}`,
      params
    );
  }

  return jobId;
}

async function updateImportJob(dbClient, jobId, updates) {
  const fields = [];
  const values = [];
  let index = 1;

  for (const [key, value] of Object.entries(updates)) {
    fields.push(`${key} = $${index}`);
    values.push(value);
    index += 1;
  }

  if (fields.length === 0) {
    return;
  }

  values.push(jobId);
  await dbClient.query(
    `UPDATE cnpj_import_jobs SET ${fields.join(', ')} WHERE id = $${index}`,
    values
  );
}

async function updateImportItem(dbClient, jobId, cnpj, updates) {
  const fields = [];
  const values = [];
  let index = 1;

  for (const [key, value] of Object.entries(updates)) {
    fields.push(`${key} = $${index}`);
    values.push(value);
    index += 1;
  }

  if (fields.length === 0) {
    return;
  }

  values.push(jobId, cnpj);
  await dbClient.query(
    `UPDATE cnpj_import_items
     SET ${fields.join(', ')}
     WHERE job_id = $${index} AND cnpj = $${index + 1}`,
    values
  );
}

async function createReprocessJob(dbClient, priority, targets, requestedBy) {
  const totalItems = targets.length;
  const result = await dbClient.query(
    `INSERT INTO cnpj_reprocess_jobs (priority, status, total_items, created_by)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [priority, 'pending', totalItems, requestedBy]
  );
  const jobId = result.rows[0].id;

  if (totalItems > 0) {
    const values = [];
    const params = [];
    let index = 1;

    for (const target of targets) {
      values.push(`($${index}, $${index + 1}, $${index + 2})`);
      params.push(jobId, target.cnpj, 'pending');
      index += 3;
    }

    await dbClient.query(
      `INSERT INTO cnpj_reprocess_items (job_id, cnpj, status)
       VALUES ${values.join(', ')}`,
      params
    );
  }

  return jobId;
}

async function updateReprocessJob(dbClient, jobId, updates) {
  const fields = [];
  const values = [];
  let index = 1;

  for (const [key, value] of Object.entries(updates)) {
    fields.push(`${key} = $${index}`);
    values.push(value);
    index += 1;
  }

  if (fields.length === 0) {
    return;
  }

  values.push(jobId);
  await dbClient.query(
    `UPDATE cnpj_reprocess_jobs SET ${fields.join(', ')} WHERE id = $${index}`,
    values
  );
}

async function updateReprocessItem(dbClient, jobId, cnpj, updates) {
  const fields = [];
  const values = [];
  let index = 1;

  for (const [key, value] of Object.entries(updates)) {
    fields.push(`${key} = $${index}`);
    values.push(value);
    index += 1;
  }

  if (fields.length === 0) {
    return;
  }

  values.push(jobId, cnpj);
  await dbClient.query(
    `UPDATE cnpj_reprocess_items
     SET ${fields.join(', ')}
     WHERE job_id = $${index} AND cnpj = $${index + 1}`,
    values
  );
}

function resolveReprocessDays(priority) {
  switch (priority) {
    case 'P1':
      return 1;
    case 'P3':
      return 7;
    default:
      return 3;
  }
}

async function fetchStaleBusinesses(dbClient, priority, limit) {
  const days = resolveReprocessDays(priority);
  const result = await dbClient.query(
    `SELECT id, cnpj, data_hash, 'stale'::text as reason
     FROM businesses
     WHERE cnpj IS NOT NULL
       AND deleted_at IS NULL
       AND (
         last_validated_at IS NULL
         OR last_validated_at < NOW() - ($1 || ' days')::interval
       )
     ORDER BY last_validated_at NULLS FIRST
     LIMIT $2`,
    [days, limit]
  );
  return result.rows;
}

async function fetchBusinessesByCnpj(dbClient, cnpjs) {
  const normalized = cnpjs.map((cnpj) => normalizeCnpj(cnpj)).filter(Boolean);
  if (normalized.length === 0) {
    return [];
  }
  const result = await dbClient.query(
    `SELECT id, cnpj, data_hash, 'manual'::text as reason
     FROM businesses
     WHERE cnpj = ANY($1::varchar[])`,
    [normalized]
  );
  const map = new Map(result.rows.map((row) => [row.cnpj, row]));
  return normalized.map((cnpj) => map.get(cnpj) || { id: null, cnpj, data_hash: null, reason: 'manual' });
}

export default CnpjImportService;
