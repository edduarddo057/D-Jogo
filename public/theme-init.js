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

// Abertura animada: só começa quando as peças do logo estão prontas (senão animaria peças invisíveis).
// Marca o início em window.__splashStart para src/app/splash.ts esperar o fim da animação.
document.addEventListener('DOMContentLoaded', function () {
  var splash = document.getElementById('splash');
  if (!splash) return;
  var go = function () {
    if (splash.classList.contains('splash-go')) return;
    splash.classList.add('splash-go');
    window.__splashStart = performance.now();
  };
  var imgs = Array.prototype.slice.call(splash.querySelectorAll('img'));
  Promise.all(
    imgs.map(function (img) {
      return img.decode ? img.decode().catch(function () {}) : Promise.resolve();
    }),
  ).then(go);
  setTimeout(go, 2500); // rede muito lenta: começa assim mesmo
});
