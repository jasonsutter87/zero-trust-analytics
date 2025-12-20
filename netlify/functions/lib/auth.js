import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// SECURITY: Require JWT_SECRET - never use a fallback in production
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('CRITICAL: JWT_SECRET environment variable is required');
  // In production, this will cause the function to fail fast
  // which is better than running with a weak/default secret
}

const JWT_EXPIRY = process.env.JWT_EXPIRY || '7d';
const JWT_ALGORITHM = 'HS256';

// Allowed origins for CORS
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'https://ztas.io,https://www.ztas.io,http://localhost:3000').split(',');

// Standard error codes
export const ErrorCodes = {
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  METHOD_NOT_ALLOWED: 'METHOD_NOT_ALLOWED',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED'
};

// Get CORS origin based on request
export function getCorsOrigin(requestOrigin) {
  if (!requestOrigin) return ALLOWED_ORIGINS[0];
  return ALLOWED_ORIGINS.includes(requestOrigin) ? requestOrigin : ALLOWED_ORIGINS[0];
}

// Security headers for all responses
export function getSecurityHeaders(requestOrigin = null) {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': getCorsOrigin(requestOrigin),
    'Access-Control-Allow-Credentials': 'true',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  };
}

// Standard error response helper
export function errorResponse(message, status = 400, code = null, details = null, requestOrigin = null) {
  const body = {
    error: message,
    code: code || (status === 400 ? ErrorCodes.BAD_REQUEST :
                   status === 401 ? ErrorCodes.UNAUTHORIZED :
                   status === 403 ? ErrorCodes.FORBIDDEN :
                   status === 404 ? ErrorCodes.NOT_FOUND :
                   status === 405 ? ErrorCodes.METHOD_NOT_ALLOWED :
                   status === 429 ? ErrorCodes.RATE_LIMITED :
                   ErrorCodes.INTERNAL_ERROR)
  };

  if (details) {
    body.details = details;
  }

  return new Response(JSON.stringify(body), {
    status,
    headers: getSecurityHeaders(requestOrigin)
  });
}

// Common error responses
export const Errors = {
  methodNotAllowed: () => errorResponse('Method not allowed', 405, ErrorCodes.METHOD_NOT_ALLOWED),
  unauthorized: (message = 'Unauthorized') => errorResponse(message, 401, ErrorCodes.UNAUTHORIZED),
  forbidden: (message = 'Access denied') => errorResponse(message, 403, ErrorCodes.FORBIDDEN),
  notFound: (resource = 'Resource') => errorResponse(`${resource} not found`, 404, ErrorCodes.NOT_FOUND),
  badRequest: (message) => errorResponse(message, 400, ErrorCodes.BAD_REQUEST),
  validationError: (message, details = null) => errorResponse(message, 400, ErrorCodes.VALIDATION_ERROR, details),
  internalError: (message = 'Internal server error') => errorResponse(message, 500, ErrorCodes.INTERNAL_ERROR),
  tokenExpired: () => errorResponse('Token expired. Please log in again.', 401, ErrorCodes.TOKEN_EXPIRED)
};

// Hash password
export async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

// Verify password
export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

// Create JWT token
export function createToken(payload) {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRY,
    algorithm: JWT_ALGORITHM
  });
}

// Verify JWT token - SECURITY: Always enforce algorithm to prevent "none" algorithm attacks
export function verifyToken(token) {
  if (!JWT_SECRET) {
    console.error('JWT_SECRET is not configured');
    return null;
  }
  try {
    return jwt.verify(token, JWT_SECRET, {
      algorithms: [JWT_ALGORITHM] // Only allow HS256, prevent algorithm confusion attacks
    });
  } catch (err) {
    // Return error type for better error messages
    if (err.name === 'TokenExpiredError') {
      return { expired: true, expiredAt: err.expiredAt };
    }
    return null;
  }
}

// Extract token from Authorization header
export function getTokenFromHeader(headers) {
  const auth = headers.authorization || headers.Authorization;
  if (!auth) return null;

  const parts = auth.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;

  return parts[1];
}

// CORS preflight response helper
export function corsPreflightResponse(requestOrigin, methods = 'GET, POST, PUT, DELETE, OPTIONS') {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': getCorsOrigin(requestOrigin),
      'Access-Control-Allow-Methods': methods,
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400' // Cache preflight for 24 hours
    }
  });
}

// Success response helper with proper headers
export function successResponse(data, status = 200, requestOrigin = null) {
  return new Response(JSON.stringify(data), {
    status,
    headers: getSecurityHeaders(requestOrigin)
  });
}

// Middleware helper - verify auth and return user
export function authenticateRequest(headers) {
  const token = getTokenFromHeader(headers);
  if (!token) {
    return { error: 'No token provided', status: 401 };
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return { error: 'Invalid token', status: 401 };
  }

  // Check if token is expired
  if (decoded.expired) {
    return { error: 'Token expired. Please log in again.', status: 401, expired: true };
  }

  return { user: decoded };
}
