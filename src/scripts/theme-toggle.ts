/**
 * Theme Toggle Script
 * Handles theme switching between light, dark, and system modes
 */

// Get saved theme or system preference
function getTheme(): string {
  if (typeof localStorage === 'undefined') return 'system';
  const saved = localStorage.getItem('theme');
  if (saved) return saved;
  return 'system';
}

// Apply theme to document
function applyTheme(theme: string): void {
  const root = document.documentElement;

  if (theme === 'system') {
    localStorage.removeItem('theme');
    root.removeAttribute('data-theme');
  } else {
    localStorage.setItem('theme', theme);
    root.setAttribute('data-theme', theme);
  }

  // Update active button
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.classList.toggle('active', (btn as HTMLElement).dataset.theme === theme);
  });
}

// Initialize on load
document.addEventListener('astro:page-load', () => {
  const theme = getTheme();
  applyTheme(theme);
});

// Also run immediately for SSR pages
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    const theme = getTheme();
    applyTheme(theme);
  });
} else {
  const theme = getTheme();
  applyTheme(theme);
}

// Expose functions globally for inline onclick handlers
(window as any).setTheme = applyTheme;
(window as any).getTheme = getTheme;

export { getTheme, applyTheme };
