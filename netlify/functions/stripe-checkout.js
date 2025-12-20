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

    // Check if already subscribed
    if (user.subscription && user.subscription.status === 'active') {
      return Errors.badRequest('Already subscribed');
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: auth.user.email,
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID, // Stripe price ID from env
          quantity: 1
        }
      ],
      success_url: `${process.env.URL || 'https://zero-trust-analytics.netlify.app'}/dashboard/?success=true`,
      cancel_url: `${process.env.URL || 'https://zero-trust-analytics.netlify.app'}/dashboard/?canceled=true`,
      metadata: {
        userId: user.id,
        email: auth.user.email
      }
    });

    return successResponse({ url: session.url }, 200, origin);
  } catch (err) {
    console.error('Stripe checkout error:', err);
    return Errors.internalError('Failed to create checkout session');
  }
}

export const config = {
  path: '/api/stripe/checkout'
};
