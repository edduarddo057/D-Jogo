/**
 * Liga o MSW no navegador quando VITE_API_MOCK=true (dev e homologação).
 * Importado de forma dinâmica: em produção sem mocks, nada disso entra no bundle.
 * Com os mocks ligados, o service worker do PWA não é registrado (os dois disputariam o escopo "/").
 */
export const mocksEnabled = import.meta.env.VITE_API_MOCK === 'true';

export async function enableMocksIfNeeded(): Promise<void> {
  if (!mocksEnabled) return;
  const { worker } = await import('@/mocks/browser');
  // Fontes, assets e o próprio app passam direto. Chamadas à API sem handler aparecem na aba Network.
  await worker.start({ onUnhandledFrame: 'bypass', quiet: true });
}
