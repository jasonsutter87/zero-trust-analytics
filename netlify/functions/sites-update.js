import { authenticateRequest, corsPreflightResponse, successResponse, Errors, getSecurityHeaders } from './lib/auth.js';
import { getSite, updateSite, getUser } from './lib/storage.js';

export default async function handler(req, context) {
  const origin = req.headers.get('origin');

  if (req.method === 'OPTIONS') {
    return corsPreflightResponse(origin, 'POST, OPTIONS');
  }

  if (req.method !== 'POST') {
    return Errors.methodNotAllowed();
  }

  // Authenticate using shared helper
  const auth = authenticateRequest(Object.fromEntries(req.headers));
  if (auth.error) {
    return new Response(JSON.stringify({ error: auth.error }), {
      status: auth.status,
      headers: getSecurityHeaders(origin)
    });
  }

  try {
    const { siteId, domain, nickname } = await req.json();

    if (!siteId) {
      return Errors.validationError('Site ID required');
    }

    // Verify site belongs to user
    const site = await getSite(siteId);
    if (!site) {
      return Errors.notFound('Site');
    }

    const user = await getUser(auth.user.email);
    if (!user || site.userId !== user.id) {
      return Errors.forbidden('Not authorized to update this site');
    }

    // Build update object
    const updates = {};
    if (domain) {
      updates.domain = domain.toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
    }
    if (nickname !== undefined) {
      updates.nickname = nickname.trim() || null;
    }

    const updated = await updateSite(siteId, updates);

    return successResponse({ success: true, site: updated }, 200, origin);
  } catch (err) {
    console.error('Update site error:', err);
    return Errors.internalError('Internal error');
  }
}

export const config = {
  path: '/api/sites/update'
};
