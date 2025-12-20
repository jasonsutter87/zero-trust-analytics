import { authenticateRequest, corsPreflightResponse, successResponse, Errors, getSecurityHeaders } from './lib/auth.js';
import { getUserSites } from './lib/storage.js';
import { getStats } from './lib/turso.js';

export default async function handler(req, context) {
  const origin = req.headers.get('origin');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return corsPreflightResponse(origin, 'GET, OPTIONS');
  }

  if (req.method !== 'GET') {
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
    const url = new URL(req.url);
    const siteId = url.searchParams.get('siteId');
    const period = url.searchParams.get('period') || '7d';
    const customStart = url.searchParams.get('startDate');
    const customEnd = url.searchParams.get('endDate');

    if (!siteId) {
      return Errors.validationError('Site ID required');
    }

    // Verify user owns this site
    const userSites = await getUserSites(auth.user.id);
    if (!userSites.includes(siteId)) {
      return Errors.forbidden('Access denied');
    }

    // Calculate date range
    let endDate, startDate;

    if (customStart && customEnd) {
      startDate = new Date(customStart);
      endDate = new Date(customEnd);
    } else {
      endDate = new Date();
      startDate = new Date();

      switch (period) {
        case '24h':
          startDate.setDate(startDate.getDate() - 1);
          break;
        case '7d':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(startDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(startDate.getDate() - 90);
          break;
        case '365d':
          startDate.setDate(startDate.getDate() - 365);
          break;
        default:
          startDate.setDate(startDate.getDate() - 7);
      }
    }

    // Format dates for database query
    const startStr = startDate.toISOString().replace('T', ' ').split('.')[0];
    const endStr = endDate.toISOString().replace('T', ' ').split('.')[0];

    // Query database for stats
    const stats = await getStats(siteId, startStr, endStr);

    return successResponse(stats, 200, origin);
  } catch (err) {
    console.error('Stats error:', err.message, err.stack);
    return Errors.internalError('Internal error');
  }
}

export const config = {
  path: '/api/stats'
};
