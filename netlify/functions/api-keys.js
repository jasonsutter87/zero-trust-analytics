import { authenticateRequest, corsPreflightResponse, successResponse, Errors, getSecurityHeaders } from './lib/auth.js';
import { createApiKey, getUserApiKeys, revokeApiKey, updateApiKeyName } from './lib/storage.js';

export default async function handler(req, context) {
  const origin = req.headers.get('origin');

  if (req.method === 'OPTIONS') {
    return corsPreflightResponse(origin, 'GET, POST, PATCH, DELETE, OPTIONS');
  }

  // Authenticate request
  const auth = authenticateRequest(req.headers);
  if (auth.error) {
    return new Response(JSON.stringify({ error: auth.error }), {
      status: auth.status,
      headers: getSecurityHeaders(origin)
    });
  }

  const userId = auth.user.id;

  // GET - List API keys
  if (req.method === 'GET') {
    try {
      const keys = await getUserApiKeys(userId);
      return successResponse({ keys }, 200, origin);
    } catch (err) {
      console.error('List API keys error:', err);
      return Errors.internalError('Failed to list API keys');
    }
  }

  // POST - Create new API key
  if (req.method === 'POST') {
    try {
      const body = await req.json();
      const { name, permissions } = body;

      // Validate permissions
      const validPermissions = ['read', 'write', 'admin'];
      const perms = (permissions || ['read']).filter(p => validPermissions.includes(p));

      if (perms.length === 0) {
        perms.push('read');
      }

      const apiKey = await createApiKey(userId, name, perms);

      return successResponse({
        key: apiKey,
        message: 'API key created. Save the key now - you won\'t be able to see it again!'
      }, 201, origin);
    } catch (err) {
      console.error('Create API key error:', err);
      return Errors.internalError('Failed to create API key');
    }
  }

  // PATCH - Update API key name
  if (req.method === 'PATCH') {
    try {
      const body = await req.json();
      const { keyId, name } = body;

      if (!keyId || !name) {
        return Errors.validationError('Key ID and name required');
      }

      const updated = await updateApiKeyName(keyId, userId, name);

      if (!updated) {
        return Errors.notFound('API key not found');
      }

      return successResponse({ key: updated }, 200, origin);
    } catch (err) {
      console.error('Update API key error:', err);
      return Errors.internalError('Failed to update API key');
    }
  }

  // DELETE - Revoke API key
  if (req.method === 'DELETE') {
    const url = new URL(req.url);
    const keyId = url.searchParams.get('keyId');

    if (!keyId) {
      return Errors.validationError('Key ID required');
    }

    try {
      const success = await revokeApiKey(keyId, userId);

      if (!success) {
        return Errors.notFound('API key not found');
      }

      return successResponse({ success: true }, 200, origin);
    } catch (err) {
      console.error('Revoke API key error:', err);
      return Errors.internalError('Failed to revoke API key');
    }
  }

  return Errors.methodNotAllowed();
}

export const config = {
  path: '/api/keys'
};
