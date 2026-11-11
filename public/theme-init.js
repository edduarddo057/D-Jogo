// Aplica o tema antes da primeira pintura, para não piscar (docs/frontend/architecture.md § 11).
// Arquivo externo (e não inline) para a Content-Security-Policy não precisar de 'unsafe-inline'.
(function () {
  try {
    var stored = JSON.parse(localStorage.getItem('dajogo:theme') || 'null');
    var pref = (stored && stored.state && stored.state.preference) || 'system';
    var dark = pref === 'dark' || (pref === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    document.querySelector('meta[name="theme-color"]').setAttribute('content', dark ? '#0b1622' : '#f4f6f8');
  } catch (e) {
    /* sem localStorage: fica no tema claro */
  }
})();
