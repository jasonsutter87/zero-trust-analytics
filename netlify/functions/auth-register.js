import { hashPassword, createToken, corsPreflightResponse, successResponse, Errors, getSecurityHeaders } from './lib/auth.js';
import { createUser, getUser } from './lib/storage.js';
import { generateSiteId } from './lib/hash.js';
import { checkRateLimit, rateLimitResponse, hashIP } from './lib/rate-limit.js';

// SECURITY: Strong password validation
function validatePassword(password) {
  const errors = [];

  if (password.length < 12) {
    errors.push('Password must be at least 12 characters');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return errors;
}

export default async function handler(req, context) {
  const origin = req.headers.get('origin');

  if (req.method === 'OPTIONS') {
    return corsPreflightResponse(origin, 'POST, OPTIONS');
  }

  if (req.method !== 'POST') {
    return Errors.methodNotAllowed();
  }

  // Rate limiting for registration: 5 attempts per minute per IP
  const clientIP = context.ip || req.headers.get('x-forwarded-for') || 'unknown';
  const rateLimitKey = `register_${hashIP(clientIP)}`;
  const rateLimit = checkRateLimit(rateLimitKey, { limit: 5, windowMs: 60000 });

  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit);
  }

  try {
    const { email, password, plan } = await req.json();

    if (!email || !password) {
      return Errors.validationError('Email and password required');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return Errors.validationError('Invalid email format');
    }

    // Validate plan if provided
    const validPlans = ['solo', 'starter', 'pro', 'business', 'scale'];
    const selectedPlan = validPlans.includes(plan) ? plan : 'pro';

    // SECURITY: Strong password validation
    const passwordErrors = validatePassword(password);
    if (passwordErrors.length > 0) {
      return Errors.validationError('Password does not meet requirements', passwordErrors);
    }

    // Check if user exists
    const existing = await getUser(email);
    if (existing) {
      return new Response(JSON.stringify({ error: 'Email already registered' }), {
        status: 409,
        headers: getSecurityHeaders(origin)
      });
    }

    // Create user with selected plan and 14-day trial
    const passwordHash = await hashPassword(password);
    const user = await createUser(email, passwordHash, selectedPlan);

    // Create JWT token
    const token = createToken({ id: user.id, email: user.email });

    return successResponse({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        plan: user.plan,
        trialEndsAt: user.trialEndsAt
      }
    }, 201, origin);
  } catch (err) {
    console.error('Register error:', err);
    return Errors.internalError('Registration failed');
  }
}

export const config = {
  path: '/api/auth/register'
};
