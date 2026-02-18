/**
 * Design Theme Script
 * Handles design theme switching between Default (normal blog) and Tmux (terminal style)
 * (Uses data-theme attribute for design theme)
 */

// Get saved design theme (default to tmux for backwards compatibility)
function getDesignTheme() {
  if (typeof localStorage === 'undefined') return 'tmux';
  const saved = localStorage.getItem('designTheme');
  if (saved) return saved;
  return 'tmux'; // Default to tmux theme
}

// Apply design theme to document
function applyDesignTheme(theme) {
  const root = document.documentElement;
  localStorage.setItem('designTheme', theme);
  root.setAttribute('data-theme', theme);

  // Update active button
  document.querySelectorAll('.design-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === theme);
  });
}

// Initialize on load
document.addEventListener('astro:page-load', () => {
  const theme = getDesignTheme();
  applyDesignTheme(theme);
});

// Also run immediately for SSR pages
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    const theme = getDesignTheme();
    applyDesignTheme(theme);
  });
} else {
  const theme = getDesignTheme();
  applyDesignTheme(theme);
}

// Expose functions globally for inline onclick handlers
window.setDesignTheme = applyDesignTheme;
window.getDesignTheme = getDesignTheme;
