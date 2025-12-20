import Stripe from 'stripe';
import { authenticateRequest, corsPreflightResponse, successResponse, Errors, getSecurityHeaders } from './lib/auth.js';
import { getUser } from './lib/storage.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, context) {
  const origin = req.headers.get('origin');

  if (req.method === 'OPTIONS') {
    return corsPreflightResponse(origin, 'POST, OPTIONS');
  }

  if (req.method !== 'POST') {
    return Errors.methodNotAllowed();
  }

  // Authenticate
  const auth = authenticateRequest(Object.fromEntries(req.headers));
  if (auth.error) {
    return new Response(JSON.stringify({ error: auth.error }), {
      status: auth.status,
      headers: getSecurityHeaders(origin)
    });
  }

  try {
    const user = await getUser(auth.user.email);

    if (!user.subscription || !user.subscription.customerId) {
      return Errors.badRequest('No active subscription');
    }

    // Create billing portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: user.subscription.customerId,
      return_url: `${process.env.URL || 'https://zero-trust-analytics.netlify.app'}/dashboard/`
    });

    return successResponse({ url: session.url }, 200, origin);
  } catch (err) {
    console.error('Stripe portal error:', err);
    return Errors.internalError('Failed to create portal session');
  }
}

export const config = {
  path: '/api/stripe/portal'
};
