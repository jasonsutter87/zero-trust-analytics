// Zero Trust Analytics - Shared API Utilities

const API_BASE = '/api';

/**
 * Make an authenticated API request with standard error handling
 * @param {string} endpoint - API endpoint (e.g., '/sites/list')
 * @param {object} options - Fetch options
 * @returns {Promise<object>} - Response data
 */
async function apiRequest(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;

  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
      ...options.headers
    },
    ...options
  };

  const res = await fetch(url, config);
  const data = await res.json();

  if (!res.ok) {
    if (res.status === 401) {
      // Token expired or invalid - clear auth and redirect
      clearAuth();
      window.location.href = '/login/';
      throw new Error('Session expired');
    }
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }

  return data;
}

/**
 * GET request helper
 */
async function apiGet(endpoint, params = {}) {
  const queryString = new URLSearchParams(params).toString();
  const url = queryString ? `${endpoint}?${queryString}` : endpoint;
  return apiRequest(url, { method: 'GET' });
}

/**
 * POST request helper
 */
async function apiPost(endpoint, body = {}) {
  return apiRequest(endpoint, {
    method: 'POST',
    body: JSON.stringify(body)
  });
}

// Export for module usage (if using bundler) or attach to window
if (typeof window !== 'undefined') {
  window.ZTA = window.ZTA || {};
  window.ZTA.api = { apiRequest, apiGet, apiPost, API_BASE };
}
