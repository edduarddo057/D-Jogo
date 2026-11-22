/** Duração da abertura animada (public/splash.css), contada a partir de quando ela começa. */
const SPLASH_MS = 1850;

declare global {
  interface Window {
    /** Quando a abertura começou (public/theme-init.js marca, depois que as peças do logo carregam). */
    __splashStart?: number;
  }
}

/**
 * Tira a abertura animada do index.html quando a animação termina (nunca no meio) e o app já montou.
 * A animação só começa quando as peças do logo carregam: espera esse início antes de contar.
 * Com "reduzir movimento", sai assim que o app está pronto. Sempre com um fade curto.
 */
export function hideSplashWhenDone() {
  const el = document.getElementById('splash');
  if (!el) return;
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const fadeOut = () => {
    el.classList.add('splash-out');
    const remove = () => el.remove();
    el.addEventListener('transitionend', remove, { once: true });
    window.setTimeout(remove, 600); // garante, se a transição não disparar
  };
  if (reduce) return fadeOut();
  const waitForEnd = (tries = 0) => {
    const start = window.__splashStart;
    if (start === undefined && tries < 60) return void window.setTimeout(() => waitForEnd(tries + 1), 50);
    const elapsed = start === undefined ? SPLASH_MS : performance.now() - start;
    window.setTimeout(fadeOut, Math.max(0, SPLASH_MS - elapsed));
  };
  waitForEnd();
}
