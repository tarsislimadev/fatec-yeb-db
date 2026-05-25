import { db } from '../db/index.js';
import { sendError, successResponse } from '../utils/response.js';
import { CnpjImportService } from '../services/CnpjImportService.js';
import { BrasilApiCnpjAdapter } from '../services/BrasilApiCnpjAdapter.js';
import { CnpjaOpenAdapter } from '../services/CnpjaOpenAdapter.js';

const MAX_CNPJ_BATCH = 100;

function buildProviders(order = []) {
  const registry = {
    brasilapi: () => new BrasilApiCnpjAdapter(),
    cnpja_open: () => new CnpjaOpenAdapter(),
  };

  if (!Array.isArray(order) || order.length === 0) {
    return [registry.brasilapi(), registry.cnpja_open()];
  }

  const providers = order
    .map((name) => registry[name]?.())
    .filter(Boolean);

  return providers.length > 0 ? providers : [registry.brasilapi(), registry.cnpja_open()];
}

export async function importCnpjs(req, res) {
  try {
    const { cnpjs, provider_order } = req.body || {};

    if (!Array.isArray(cnpjs) || cnpjs.length === 0) {
      return sendError(res, 'VALIDATION_ERROR', 'cnpjs must be a non-empty array');
    }

    if (cnpjs.length > MAX_CNPJ_BATCH) {
      return sendError(res, 'VALIDATION_ERROR', `cnpjs must have at most ${MAX_CNPJ_BATCH} items`);
    }

    const service = new CnpjImportService({
      providers: buildProviders(provider_order),
    });

    const result = await service.importCnpjs(cnpjs, {
      requestedBy: req.user?.id || null,
      providerOrder: provider_order || null,
    });

    return successResponse(res, result, null, 200);
  } catch (error) {
    console.error('CNPJ import failed:', error.message);
    return sendError(res, 'INTERNAL_ERROR', 'Failed to import CNPJs');
  }
}

export async function lookupCnpj(req, res) {
  try {
    const { cnpj, provider_order, force_refresh } = req.body || {};
    if (!cnpj) {
      return sendError(res, 'VALIDATION_ERROR', 'cnpj is required');
    }

    const service = new CnpjImportService({
      providers: buildProviders(provider_order),
    });

    const result = await service.lookupSingle(cnpj, { forceRefresh: Boolean(force_refresh) });

    return successResponse(res, {
      cnpj: result.payload.cnpj,
      provider: result.providerName,
      cached: result.cached,
      payload: result.payload,
    });
  } catch (error) {
    console.error('CNPJ lookup failed:', error.message);
    return sendError(res, 'INTERNAL_ERROR', 'Failed to lookup CNPJ');
  }
}

export async function getImportJob(req, res) {
  try {
    const { jobId } = req.params;
    const jobResult = await db.query('SELECT * FROM cnpj_import_jobs WHERE id = $1', [jobId]);
    if (jobResult.rows.length === 0) {
      return sendError(res, 'NOT_FOUND', 'Import job not found', {}, 404);
    }

    const itemsResult = await db.query(
      `SELECT *
       FROM cnpj_import_items
       WHERE job_id = $1
       ORDER BY created_at ASC`,
      [jobId]
    );

    return successResponse(res, {
      job: jobResult.rows[0],
      items: itemsResult.rows,
    });
  } catch (error) {
    console.error('Get import job failed:', error.message);
    return sendError(res, 'INTERNAL_ERROR', 'Failed to load import job');
  }
}

export async function reprocessCnpjs(req, res) {
  try {
    const { priority = 'P2', cnpjs, limit = 100, provider_order } = req.body || {};
    if (!['P1', 'P2', 'P3'].includes(priority)) {
      return sendError(res, 'VALIDATION_ERROR', 'priority must be P1, P2, or P3');
    }

    const service = new CnpjImportService({
      providers: buildProviders(provider_order),
    });

    const result = await service.reprocessCnpjs({
      priority,
      cnpjs: Array.isArray(cnpjs) ? cnpjs : null,
      limit: Number(limit) || 100,
      requestedBy: req.user?.id || null,
    });

    return successResponse(res, result, null, 202);
  } catch (error) {
    console.error('CNPJ reprocess failed:', error.message);
    return sendError(res, 'INTERNAL_ERROR', 'Failed to reprocess CNPJs');
  }
}

export async function getReprocessJob(req, res) {
  try {
    const { jobId } = req.params;
    const jobResult = await db.query('SELECT * FROM cnpj_reprocess_jobs WHERE id = $1', [jobId]);
    if (jobResult.rows.length === 0) {
      return sendError(res, 'NOT_FOUND', 'Reprocess job not found', {}, 404);
    }

    const itemsResult = await db.query(
      `SELECT *
       FROM cnpj_reprocess_items
       WHERE job_id = $1
       ORDER BY created_at ASC`,
      [jobId]
    );

    return successResponse(res, {
      job: jobResult.rows[0],
      items: itemsResult.rows,
    });
  } catch (error) {
    console.error('Get reprocess job failed:', error.message);
    return sendError(res, 'INTERNAL_ERROR', 'Failed to load reprocess job');
  }
}

export default {
  importCnpjs,
  lookupCnpj,
  getImportJob,
  reprocessCnpjs,
  getReprocessJob,
};
