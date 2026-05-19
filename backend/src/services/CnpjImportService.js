import { db } from '../db/index.js';
import { validateAndNormalizePhone } from '../utils/phone.js';
import { BrasilApiCnpjAdapter } from './BrasilApiCnpjAdapter.js';
import { CnpjaOpenAdapter } from './CnpjaOpenAdapter.js';

const DEFAULT_PROVIDERS = [
  () => new BrasilApiCnpjAdapter(),
  () => new CnpjaOpenAdapter(),
];

export class CnpjImportService {
  constructor({ providers = null, dbClient = null } = {}) {
    this.providers = providers || DEFAULT_PROVIDERS.map((create) => create());
    this.db = dbClient || db;
  }

  async lookupWithFallback(cnpj) {
    let lastError = null;

    for (const provider of this.providers) {
      try {
        const payload = await provider.lookup(cnpj);
        return { providerName: provider.getProviderName(), payload };
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error('No providers configured');
  }

  async importCnpjs(cnpjs, { requestedBy = null } = {}) {
    const results = [];

    for (const cnpj of cnpjs) {
      try {
        const { providerName, payload } = await this.lookupWithFallback(cnpj);
        const importResult = await this.importPayload(payload, providerName, requestedBy);

        results.push({
          cnpj: payload.cnpj,
          provider: providerName,
          status: 'imported',
          ...importResult,
        });
      } catch (error) {
        results.push({
          cnpj,
          status: 'failed',
          error: error.message,
        });
      }
    }

    const succeeded = results.filter((item) => item.status === 'imported').length;
    const failed = results.length - succeeded;

    return {
      total: results.length,
      succeeded,
      failed,
      items: results,
    };
  }

  async importPayload(payload, providerName, requestedBy) {
    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      const businessId = await upsertBusiness(client, payload, requestedBy);
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
}

async function upsertBusiness(client, payload, requestedBy) {
  const cnpj = payload.cnpj;
  const legalName = payload.legalName || payload.tradeName || `CNPJ ${cnpj}`;
  const tradeName = payload.tradeName || null;

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
           updated_at = CURRENT_TIMESTAMP,
           updated_by = $4
       WHERE id = $1`,
      [businessId, legalName, tradeName, requestedBy]
    );

    return businessId;
  }

  const insertResult = await client.query(
    `INSERT INTO businesses (cnpj, legal_name, trade_name, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $4)
     RETURNING id`,
    [cnpj, legalName, tradeName, requestedBy]
  );

  return insertResult.rows[0].id;
}

async function upsertPeople(client, people, businessId, requestedBy) {
  const ids = [];

  for (const person of people) {
    if (!person?.fullName) {
      continue;
    }

    const email = person.email || null;
    let personId = null;

    if (email) {
      const existing = await client.query(
        'SELECT id FROM people WHERE email = $1 AND deleted_at IS NULL',
        [email]
      );

      if (existing.rows.length > 0) {
        personId = existing.rows[0].id;
      }
    }

    if (!personId) {
      const insertResult = await client.query(
        `INSERT INTO people (full_name, role_title, email, created_by, updated_by)
         VALUES ($1, $2, $3, $4, $4)
         RETURNING id`,
        [person.fullName, person.roleTitle || null, email, requestedBy]
      );

      personId = insertResult.rows[0].id;
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

async function recordEnrichmentResults(client, { phoneIds, payload, providerName }) {
  if (phoneIds.length === 0) {
    return;
  }

  for (const phoneId of phoneIds) {
    await client.query(
      `INSERT INTO enrichment_results (
        phone_id, cnpj, provider, legal_name, trade_name, status, address, raw_response, cached
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, FALSE)`,
      [
        phoneId,
        payload.cnpj,
        providerName,
        payload.legalName || null,
        payload.tradeName || null,
        payload.status || null,
        payload.address || null,
        payload.raw || null,
      ]
    );
  }
}

export default CnpjImportService;
