import { hashPassword, createToken } from './lib/auth.js';
import { createUser, getUser } from './lib/storage.js';
import { generateSiteId } from './lib/hash.js';
import { checkRateLimit, rateLimitResponse, hashIP } from './lib/rate-limit.js';

export default async function handler(req, context) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
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
      return new Response(JSON.stringify({ error: 'Email and password required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate plan if provided
    const validPlans = ['solo', 'starter', 'pro', 'business', 'scale'];
    const selectedPlan = validPlans.includes(plan) ? plan : 'pro';

    if (password.length < 8) {
      return new Response(JSON.stringify({ error: 'Password must be at least 8 characters' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if user exists
    const existing = await getUser(email);
    if (existing) {
      return new Response(JSON.stringify({ error: 'Email already registered' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Create user with selected plan and 14-day trial
    const passwordHash = await hashPassword(password);
    const user = await createUser(email, passwordHash, selectedPlan);

    // Create JWT token
    const token = createToken({ id: user.id, email: user.email });

    return new Response(JSON.stringify({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        plan: user.plan,
        trialEndsAt: user.trialEndsAt
      }
    }), {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (err) {
    console.error('Register error:', err);
    return new Response(JSON.stringify({ error: 'Registration failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export const config = {
  path: '/api/auth/register'
};
