/**
 * Design Theme Script
 * Handles design theme switching between Default (normal blog) and Tmux (terminal style)
 * (Uses data-theme attribute for design theme)
 */

// Get saved design theme (default to tmux for backwards compatibility)
function getDesignTheme(): string {
  if (typeof localStorage === 'undefined') return 'tmux';
  const saved = localStorage.getItem('designTheme');
  if (saved) return saved;
  return 'tmux'; // Default to tmux theme
}

// Apply design theme to document
function applyDesignTheme(theme: string): void {
  const root = document.documentElement;
  localStorage.setItem('designTheme', theme);
  root.setAttribute('data-theme', theme);

  // Update active button
  document.querySelectorAll('.design-btn').forEach(btn => {
    btn.classList.toggle('active', (btn as HTMLElement).dataset.theme === theme);
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
(window as any).setDesignTheme = applyDesignTheme;
(window as any).getDesignTheme = getDesignTheme;

export { getDesignTheme, applyDesignTheme };
