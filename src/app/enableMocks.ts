import { isDemoActive } from '@/lib/demo';

/**
 * Liga o MSW no navegador quando VITE_API_MOCK=true (dev e homologação) ou no modo demonstração (/demo).
 * Importado de forma dinâmica: fora desses casos, nada disso é baixado.
 * Com os mocks ligados, o service worker do PWA não é registrado (os dois disputariam o escopo "/").
 */
export const demoMode = isDemoActive();
export const mocksEnabled = import.meta.env.VITE_API_MOCK === 'true' || demoMode;

export async function enableMocksIfNeeded(): Promise<void> {
  if (!mocksEnabled) return;
  const { worker } = await import('@/mocks/browser');
  if (demoMode) {
    // a turma da demo, salva neste aparelho (src/mocks/demo)
    const { startDemoDb } = await import('@/mocks/demo');
    startDemoDb(worker);
  }
  // Fontes, assets e o próprio app passam direto. Chamadas à API sem handler aparecem na aba Network.
  // Worker e escopo seguem a base do build (ex.: /D-Jogo/ no GitHub Pages).
  await worker.start({
    onUnhandledFrame: 'bypass',
    quiet: true,
    serviceWorker: {
      url: `${import.meta.env.BASE_URL}mockServiceWorker.js`,
      options: { scope: import.meta.env.BASE_URL },
    },
  });
}
