/**
 * Theme Loader — runs synchronously in <head> to prevent flash of wrong theme.
 * Reads from localStorage (not Firestore) for instant application.
 */
(function () {
  var theme = localStorage.getItem('theme') || 'dark';
  var fontSize = localStorage.getItem('fontSize') || 'medium';
  var accentColor = localStorage.getItem('accentColor') || '';

  if (theme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
  }

  if (fontSize === 'small') {
    document.documentElement.style.fontSize = '14px';
  } else if (fontSize === 'large') {
    document.documentElement.style.fontSize = '18px';
  }

  if (accentColor) {
    document.documentElement.style.setProperty('--accent-primary', accentColor);
  }

  var language = localStorage.getItem('language') || 'en';
  document.documentElement.setAttribute('data-language', language);
  if (language === 'ar') {
    document.documentElement.setAttribute('dir', 'rtl');
  }
})();
