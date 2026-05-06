import { verifyToken, extractTokenFromHeader } from '../utils/auth.js';
import { sendError } from '../utils/response.js';
import { emitStructuredLog, recordAuthFailure } from '../utils/observability.js';

// Authentication middleware
export function authMiddleware(req, res, next) {
  const token = extractTokenFromHeader(req.headers.authorization);
  
  if (!token) {
    recordAuthFailure({ reason: 'missing_token', ip: req.ip });
    return sendError(res, 'UNAUTHORIZED', 'Missing authentication token');
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    recordAuthFailure({ reason: 'invalid_or_expired_token', ip: req.ip });
    return sendError(res, 'UNAUTHORIZED', 'Invalid or expired token');
  }

  req.user = decoded;
  next();
}

// Error handling middleware
export function errorHandlingMiddleware(err, req, res, next) {
  emitStructuredLog('error', 'unhandled_error', {
    request_id: req.requestId || null,
    method: req.method,
    path: req.originalUrl || req.path,
    error_code: err.code || null,
    message: err.message || 'Unknown error',
  });

  if (err.code === '23505') {
    // Unique constraint violation
    return sendError(res, 'CONFLICT', 'Record already exists', { database_error: true });
  }

  if (err.code === '23503') {
    // Foreign key violation
    return sendError(res, 'BUSINESS_RULE_VIOLATION', 'Referenced record not found');
  }

  if (err.message?.includes('validation')) {
    return sendError(res, 'VALIDATION_ERROR', err.message);
  }

  return sendError(res, 'INTERNAL_ERROR', 'An unexpected error occurred', {}, 500);
}

// 404 handler
export function notFoundHandler(req, res) {
  return sendError(res, 'NOT_FOUND', 'Endpoint not found');
}
