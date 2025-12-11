// Zero Trust Analytics - Shared Auth Service

const TOKEN_KEY = 'zta_token';
const USER_KEY = 'zta_user';

/**
 * Store authentication credentials
 */
function setAuth(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

/**
 * Clear authentication credentials
 */
function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

/**
 * Get stored token
 */
function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Get stored user
 */
function getUser() {
  const user = localStorage.getItem(USER_KEY);
  return user ? JSON.parse(user) : null;
}

/**
 * Check if user is logged in
 */
function isLoggedIn() {
  return !!getToken();
}

/**
 * Get authorization headers for API requests
 */
function getAuthHeaders() {
  const token = getToken();
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

/**
 * Require authentication - redirects if not logged in
 */
function requireAuth() {
  if (!isLoggedIn()) {
    window.location.href = '/login/';
    return false;
  }
  return true;
}

/**
 * Logout and redirect
 */
function logout() {
  clearAuth();
  window.location.href = '/';
}

/**
 * Update UI elements based on auth state
 */
function updateAuthUI() {
  const token = getToken();
  const loggedIn = document.querySelectorAll('.auth-logged-in');
  const loggedOut = document.querySelectorAll('.auth-logged-out');

  if (token) {
    loggedIn.forEach(el => el.classList.remove('d-none'));
    loggedOut.forEach(el => el.classList.add('d-none'));
  } else {
    loggedIn.forEach(el => el.classList.add('d-none'));
    loggedOut.forEach(el => el.classList.remove('d-none'));
  }
}

// Export for module usage or attach to window
if (typeof window !== 'undefined') {
  window.ZTA = window.ZTA || {};
  window.ZTA.auth = {
    setAuth,
    clearAuth,
    getToken,
    getUser,
    isLoggedIn,
    getAuthHeaders,
    requireAuth,
    logout,
    updateAuthUI
  };

  // Also expose commonly used functions globally for backward compatibility
  window.getAuthHeaders = getAuthHeaders;
  window.isLoggedIn = isLoggedIn;
  window.logout = logout;
  window.requireAuth = requireAuth;
  window.updateAuthUI = updateAuthUI;
  window.clearAuth = clearAuth;
}
