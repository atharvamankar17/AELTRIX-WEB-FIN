/**
 * @file snapchat.js
 * @description Logic for the Snapchat Redirect Modal
 * @author Aeltrix Engineering
 */

export function initSnapchatModal() {
  const btn = document.getElementById('snapchat-trigger-btn');
  const modal = document.getElementById('snapchat-modal');
  const closeBtn = document.getElementById('snapchat-close-btn');

  if (!btn || !modal || !closeBtn) return;

  // Open Modal
  btn.addEventListener('click', () => {
    modal.classList.add('active');
  });

  // Close Modal
  closeBtn.addEventListener('click', () => {
    modal.classList.remove('active');
  });

  // Close on outside click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.remove('active');
    }
  });

  // Close on escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
      modal.classList.remove('active');
    }
  });
}

// Auto-initialize when the DOM is ready
document.addEventListener('DOMContentLoaded', initSnapchatModal);
