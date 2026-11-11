import { toast, usePwaStore, type BeforeInstallPromptEvent } from '@/stores';
import { mocksEnabled } from './enableMocks';

/**
 * Registro do service worker e captura do convite de instalação (architecture.md § 12).
 * - Com os mocks ligados, não registra (o worker do MSW ocupa o escopo "/").
 * - Versão nova: toast "Nova versão disponível — Atualizar". Nunca recarrega sozinho.
 */
export async function setupPwa(): Promise<void> {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault(); // guarda para oferecer na hora certa, nunca na primeira visita
    usePwaStore.getState().setDeferredPrompt(event as BeforeInstallPromptEvent);
  });
  window.addEventListener('appinstalled', () => usePwaStore.getState().setInstalled());

  if (mocksEnabled || !('serviceWorker' in navigator) || import.meta.env.DEV) return;

  const { registerSW } = await import('virtual:pwa-register');
  const updateSW = registerSW({
    onNeedRefresh: () => {
      const apply = () => updateSW(true);
      usePwaStore.getState().setUpdate(apply);
      toast('Nova versão disponível', {
        action: { label: 'Atualizar', onAction: () => void apply() },
        duration: Number.POSITIVE_INFINITY,
      });
    },
  });
}
