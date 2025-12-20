import { getPasswordResetToken } from './lib/storage.js';
import { checkRateLimit, rateLimitResponse, hashIP } from './lib/rate-limit.js';
import { corsPreflightResponse, successResponse, Errors } from './lib/auth.js';

export default async function handler(req, context) {
  const origin = req.headers.get('origin');

  if (req.method === 'OPTIONS') {
    return corsPreflightResponse(origin, 'GET, OPTIONS');
  }

  if (req.method !== 'GET') {
    return Errors.methodNotAllowed();
  }

  // Rate limit by IP (10 per minute)
  const ip = context?.ip || req.headers.get?.('x-forwarded-for')?.split(',')[0] || 'unknown';
  const rateLimitKey = hashIP(ip);
  const rateLimit = checkRateLimit(rateLimitKey, { limit: 10, windowMs: 60000 });

  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit);
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');

    if (!token) {
      return Errors.validationError('Token is required');
    }

    // Validate token (without consuming it)
    const tokenData = await getPasswordResetToken(token);
    if (!tokenData) {
      return Errors.badRequest('Invalid or expired reset link');
    }

    return successResponse({
      valid: true,
      expiresAt: tokenData.expiresAt
    }, 200, origin);
  } catch (err) {
    console.error('Verify token error:', err);
    return Errors.internalError('An error occurred');
  }
}

export const config = {
  path: '/api/auth/verify-reset-token'
};
