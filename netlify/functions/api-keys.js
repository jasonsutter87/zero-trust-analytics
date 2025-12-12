import { authenticateRequest } from './lib/auth.js';
import { createApiKey, getUserApiKeys, revokeApiKey, updateApiKeyName } from './lib/storage.js';

export default async function handler(req, context) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
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

  const userId = auth.user.id;

  // GET - List API keys
  if (req.method === 'GET') {
    try {
      const keys = await getUserApiKeys(userId);

      return new Response(JSON.stringify({ keys }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });

    } catch (err) {
      console.error('List API keys error:', err);
      return new Response(JSON.stringify({ error: 'Failed to list API keys' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
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

      return new Response(JSON.stringify({
        key: apiKey,
        message: 'API key created. Save the key now - you won\'t be able to see it again!'
      }), {
        status: 201,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });

    } catch (err) {
      console.error('Create API key error:', err);
      return new Response(JSON.stringify({ error: 'Failed to create API key' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  // PATCH - Update API key name
  if (req.method === 'PATCH') {
    try {
      const body = await req.json();
      const { keyId, name } = body;

      if (!keyId || !name) {
        return new Response(JSON.stringify({ error: 'Key ID and name required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const updated = await updateApiKeyName(keyId, userId, name);

      if (!updated) {
        return new Response(JSON.stringify({ error: 'API key not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ key: updated }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });

    } catch (err) {
      console.error('Update API key error:', err);
      return new Response(JSON.stringify({ error: 'Failed to update API key' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  // DELETE - Revoke API key
  if (req.method === 'DELETE') {
    const url = new URL(req.url);
    const keyId = url.searchParams.get('keyId');

    if (!keyId) {
      return new Response(JSON.stringify({ error: 'Key ID required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    try {
      const success = await revokeApiKey(keyId, userId);

      if (!success) {
        return new Response(JSON.stringify({ error: 'API key not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });

    } catch (err) {
      console.error('Revoke API key error:', err);
      return new Response(JSON.stringify({ error: 'Failed to revoke API key' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json' }
  });
}

export const config = {
  path: '/api/keys'
};
