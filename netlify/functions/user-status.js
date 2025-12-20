import { authenticateRequest, corsPreflightResponse, successResponse, Errors, getSecurityHeaders } from './lib/auth.js';
import { getUser, getUserStatus } from './lib/storage.js';

export default async function handler(req, context) {
  const origin = req.headers.get('origin');

  if (req.method === 'OPTIONS') {
    return corsPreflightResponse(origin, 'GET, OPTIONS');
  }

  if (req.method !== 'GET') {
    return Errors.methodNotAllowed();
  }

  // Authenticate request
  const auth = authenticateRequest(Object.fromEntries(req.headers));
  if (auth.error) {
    return new Response(JSON.stringify({ error: auth.error }), {
      status: auth.status,
      headers: getSecurityHeaders(origin)
    });
  }

  try {
    const user = await getUser(auth.user.email);
    if (!user) {
      return Errors.notFound('User');
    }

    const status = getUserStatus(user);

    return successResponse({
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
    }, 200, origin);
  } catch (err) {
    console.error('User status error:', err);
    return Errors.internalError('Failed to get user status');
  }
}

export const config = {
  path: '/api/user/status'
};
