/** Duração da abertura animada (public/splash.css): a última peça termina em ~1,8 s. */
const SPLASH_MS = 1850;

/**
 * Tira a abertura animada do index.html quando a animação termina (nunca no meio) e o app já montou.
 * Com "reduzir movimento", sai assim que o app está pronto. Sempre com um fade curto.
 */
export function hideSplashWhenDone() {
  const el = document.getElementById('splash');
  if (!el) return;
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  // performance.now() conta desde o início da navegação, quando a animação começou
  const wait = reduce ? 0 : Math.max(0, SPLASH_MS - performance.now());
  window.setTimeout(() => {
    el.classList.add('splash-out');
    const remove = () => el.remove();
    el.addEventListener('transitionend', remove, { once: true });
    window.setTimeout(remove, 500); // garante, se a transição não disparar
  }, wait);
}
