import { authenticateRequest } from './lib/auth.js';
import { getUser, getUserStatus } from './lib/storage.js';

export default async function handler(req, context) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
  }

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Authenticate request
  const auth = authenticateRequest(req.headers);
  if (auth.error) {
    return new Response(JSON.stringify({ error: auth.error }), {
      status: auth.status,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const user = await getUser(auth.user.email);
    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const status = getUserStatus(user);

    return new Response(JSON.stringify({
      id: user.id,
      email: user.email,
      plan: status.plan,
      status: status.status,
      canAccess: status.canAccess,
      trialEndsAt: status.trialEndsAt,
      daysLeft: status.daysLeft,
      subscription: status.subscription ? {
        status: status.subscription.status,
        currentPeriodEnd: status.subscription.currentPeriodEnd
      } : null
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (err) {
    console.error('User status error:', err);
    return new Response(JSON.stringify({ error: 'Failed to get user status' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export const config = {
  path: '/api/user/status'
};
