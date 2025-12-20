import { authenticateRequest, corsPreflightResponse, successResponse, Errors, getSecurityHeaders } from './lib/auth.js';
import { getUserSites, getSite } from './lib/storage.js';

export default async function handler(req, context) {
  const origin = req.headers.get('origin');

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
    const siteIds = await getUserSites(auth.user.id);

    // Fetch full site details
    const sites = await Promise.all(
      siteIds.map(async (siteId) => {
        const site = await getSite(siteId);
        return site;
      })
    );

    return successResponse({
      success: true,
      sites: sites.filter(Boolean)
    }, 200, origin);
  } catch (err) {
    console.error('Sites list error:', err);
    return Errors.internalError('Failed to list sites');
  }
}

export const config = {
  path: '/api/sites/list'
};
