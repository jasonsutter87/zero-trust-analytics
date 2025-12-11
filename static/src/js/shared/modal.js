// Zero Trust Analytics - Shared Modal Utilities

/**
 * Show a Bootstrap modal
 */
function showModal(modalId) {
  const el = document.getElementById(modalId);
  if (!el) return null;
  const modal = new bootstrap.Modal(el);
  modal.show();
  return modal;
}

/**
 * Hide a Bootstrap modal
 */
function hideModal(modalId) {
  const el = document.getElementById(modalId);
  if (!el) return;
  const modal = bootstrap.Modal.getInstance(el);
  if (modal) modal.hide();
}

/**
 * Get modal instance
 */
function getModal(modalId) {
  const el = document.getElementById(modalId);
  if (!el) return null;
  return bootstrap.Modal.getInstance(el) || new bootstrap.Modal(el);
}

// Export for module usage or attach to window
if (typeof window !== 'undefined') {
  window.ZTA = window.ZTA || {};
  window.ZTA.modal = { showModal, hideModal, getModal };

  // Global shortcuts
  window.showModal = showModal;
  window.hideModal = hideModal;
}
