/**
 * Theme Toggle Script
 * Handles color mode switching between light, dark, and system modes
 * (Uses data-mode attribute for color theme)
 */

// Get saved color mode or system preference
function getColorMode() {
  if (typeof localStorage === 'undefined') return 'system';
  const saved = localStorage.getItem('colorMode');
  if (saved) return saved;
  return 'system';
}

// Apply color mode to document
function applyColorMode(mode) {
  const root = document.documentElement;

  if (mode === 'system') {
    localStorage.removeItem('colorMode');
    // Remove data-mode to let system preference decide
    root.removeAttribute('data-mode');
  } else {
    localStorage.setItem('colorMode', mode);
    root.setAttribute('data-mode', mode);
  }

  // Update active button
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === mode);
  });
}

// Initialize on load
document.addEventListener('astro:page-load', () => {
  const mode = getColorMode();
  applyColorMode(mode);
});

// Also run immediately for SSR pages
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    const mode = getColorMode();
    applyColorMode(mode);
  });
} else {
  const mode = getColorMode();
  applyColorMode(mode);
}

// Expose functions globally for inline onclick handlers
window.setColorMode = applyColorMode;
window.getColorMode = getColorMode;
