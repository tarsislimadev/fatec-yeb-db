import { v4 as uuidv4 } from 'uuid';

// Format success response
export function successResponse(res, data, meta = null, statusCode = 200) {
  const response = { data };
  if (meta) {
    response.meta = meta;
  }
  return res.status(statusCode).json(response);
}

// Format error response
export function errorResponse(res, code, message, details = {}, statusCode = 400) {
  const errorResponse = {
    error: {
      code,
      message,
      details,
      request_id: uuidv4(),
      timestamp: new Date().toISOString(),
    },
  };
  return res.status(statusCode).json(errorResponse);
}

// Standard error codes mapping
export const ERROR_CODES = {
  VALIDATION_ERROR: { code: 'VALIDATION_ERROR', status: 400 },
  UNAUTHORIZED: { code: 'UNAUTHORIZED', status: 401 },
  FORBIDDEN: { code: 'FORBIDDEN', status: 403 },
  NOT_FOUND: { code: 'NOT_FOUND', status: 404 },
  CONFLICT: { code: 'CONFLICT', status: 409 },
  BUSINESS_RULE_VIOLATION: { code: 'BUSINESS_RULE_VIOLATION', status: 422 },
  RATE_LIMITED: { code: 'RATE_LIMITED', status: 429 },
  INTERNAL_ERROR: { code: 'INTERNAL_ERROR', status: 500 },
};

// Helper to send error with standard format
export function sendError(res, errorType, message, details = {}) {
  const error = ERROR_CODES[errorType] || ERROR_CODES.INTERNAL_ERROR;
  return errorResponse(res, error.code, message, details, error.status);
}

// Format pagination metadata
export function getPaginationMeta(page, pageSize, totalItems) {
  const totalPages = Math.ceil(totalItems / pageSize);
  return {
    page: parseInt(page),
    page_size: parseInt(pageSize),
    total_items: totalItems,
    total_pages: totalPages,
  };
}
