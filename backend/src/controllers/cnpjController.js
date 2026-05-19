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

    const result = await service.importCnpjs(cnpjs, { requestedBy: req.user?.id || null });

    return successResponse(res, result, null, 200);
  } catch (error) {
    console.error('CNPJ import failed:', error.message);
    return sendError(res, 'INTERNAL_ERROR', 'Failed to import CNPJs');
  }
}

export default {
  importCnpjs,
};
