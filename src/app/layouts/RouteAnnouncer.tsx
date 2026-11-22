import { useEffect, useRef } from 'react';
import { useLocation, useNavigation } from 'react-router';

const APP_NAME = 'Dá Jogo';

/**
 * A cada troca de rota (architecture.md § 13):
 * - o título da aba vira "<h1 da página> · Dá Jogo";
 * - o foco vai para o h1, para leitores de tela anunciarem a página nova
 *   (só depois de uma navegação, nunca na primeira carga, e só se a página não focou um campo).
 */
export function RouteAnnouncer() {
  const location = useLocation();
  const navigation = useNavigation();
  const firstLoad = useRef(true);

  useEffect(() => {
    if (navigation.state !== 'idle') return;
    // espera a página (lazy) pintar o h1
    const frame = window.requestAnimationFrame(() => {
      const heading = document.querySelector<HTMLElement>('main h1');
      const text = heading?.textContent?.trim();
      document.title = text ? `${text} · ${APP_NAME}` : APP_NAME;
      // Se a página já pôs o foco num campo dela (ex.: código do login), respeita.
      const active = document.activeElement;
      const pageTookFocus =
        active instanceof HTMLElement && active !== heading && active.tagName !== 'MAIN' && !!active.closest('main');
      if (!firstLoad.current && heading && !pageTookFocus) {
        if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1');
        heading.focus({ preventScroll: true });
      }
      firstLoad.current = false;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [location.pathname, navigation.state]);

  return null;
}
