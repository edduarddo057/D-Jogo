import { toast, usePwaStore, type BeforeInstallPromptEvent } from '@/stores';
import { mocksEnabled } from './enableMocks';

/**
 * Registro do service worker, atualização e convite de instalação (architecture.md § 12).
 *
 * Versão nova publicada → o app não fica preso na antiga:
 * - procura atualização ao abrir, ao voltar para o app e a cada 30 min;
 * - aplica sozinho (recarrega) nos momentos seguros: logo depois de abrir, ou quando a pessoa sai
 *   do app e volta; no meio de algo, mostra "Nova versão — Atualizar";
 * - nunca recarrega sozinho no dia de jogo (placar ao vivo), só pelo aviso;
 * - se um pedaço do app sumiu do servidor (deploy no meio do uso), recarrega uma vez.
 * Com os mocks ligados, não registra (o worker do MSW ocupa o escopo).
 */
const CHECK_EVERY_MS = 30 * 60_000;
const FRESH_START_MS = 10_000;
const startedAt = Date.now();

const onLiveGame = () => window.location.pathname.includes('/dia-de-jogo');

function reloadOnceOnMissingChunk() {
  window.addEventListener('vite:preloadError', (event) => {
    const key = 'dajogo:recarregou-por-versao';
    const last = Number(sessionStorage.getItem(key) ?? 0);
    if (Date.now() - last < 60_000) return; // já tentou agora há pouco: deixa o erro aparecer
    event.preventDefault();
    sessionStorage.setItem(key, String(Date.now()));
    window.location.reload();
  });
}

export async function setupPwa(): Promise<void> {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault(); // guarda para oferecer na hora certa, nunca na primeira visita
    usePwaStore.getState().setDeferredPrompt(event as BeforeInstallPromptEvent);
  });
  window.addEventListener('appinstalled', () => usePwaStore.getState().setInstalled());
  reloadOnceOnMissingChunk();

  if (mocksEnabled || !('serviceWorker' in navigator) || import.meta.env.DEV) return;

  const { registerSW } = await import('virtual:pwa-register');
  let registration: ServiceWorkerRegistration | undefined;
  let pending = false;
  let reloading = false;

  // A versão nova assumiu a página: recarrega uma vez, já nela.
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!pending || reloading) return;
    reloading = true;
    window.location.reload();
  });

  /**
   * Troca já: manda a versão que está esperando assumir (SKIP_WAITING); o controllerchange recarrega.
   * Feito aqui e não pelo updateSW do plugin, que só recarrega quando foi ele que achou a versão nova
   * (versão achada pela verificação periódica ficava esperando para sempre).
   */
  const apply = async () => {
    const waiting = registration?.waiting ?? (await navigator.serviceWorker.getRegistration())?.waiting;
    if (waiting) waiting.postMessage({ type: 'SKIP_WAITING' });
    else window.location.reload();
  };

  registerSW({
    onRegisteredSW: (_url, r) => {
      registration = r;
      if (!r) return;
      const check = () => void r.update().catch(() => undefined);
      setInterval(check, CHECK_EVERY_MS);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check();
      });
    },
    onNeedRefresh: () => {
      if (pending) return;
      pending = true;
      usePwaStore.getState().setUpdate(apply);
      if (Date.now() - startedAt < FRESH_START_MS && !onLiveGame()) {
        void apply(); // acabou de abrir: troca já, antes de a pessoa começar a usar
        return;
      }
      toast('Nova versão disponível', {
        action: { label: 'Atualizar', onAction: () => void apply() },
        duration: Number.POSITIVE_INFINITY,
      });
    },
  });

  // saiu do app (outra aba ou outro app): aplica a versão nova para a volta já ser nela
  document.addEventListener('visibilitychange', () => {
    if (pending && document.visibilityState === 'hidden' && !onLiveGame()) void apply();
  });
}
