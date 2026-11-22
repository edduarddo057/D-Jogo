import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest';
import { resetDb } from '@/mocks/db';
import { server } from '@/mocks/server';
import { useGameDayStore } from '@/features/live';
import { usePwaStore, useSessionStore, useToastStore } from '@/stores';

// Rotas carregadas sob demanda: a primeira importação de uma página pode passar de 1 s em máquina fria (CI).
configure({ asyncUtilTimeout: 4000 });

// jsdom não implementa matchMedia; o tema usa para ler prefers-color-scheme.
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

// jsdom não implementa <dialog>.showModal()/close(): versão mínima para os testes do Modal.
if (typeof HTMLDialogElement !== 'undefined' && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
}

// jsdom não implementa scrollTo (o roteador rola ao trocar de página).
window.scrollTo = () => {};

// Toda chamada à API sem handler falha o teste: o mock precisa cobrir o contrato.
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));

beforeEach(() => {
  resetDb();
  useSessionStore.setState({
    accessToken: null,
    status: 'unknown',
    pendingInviteCode: null,
    redirectTo: null,
    termsUpdateRequired: false,
  });
  useToastStore.setState({ current: null });
  // dia de jogo guardado no aparelho: cada teste começa sem nenhum
  useGameDayStore.setState({ sessions: {} });
  // navegador comum, sem convite de instalação: a oferta de instalar não aparece
  usePwaStore.setState({ isStandalone: false, platform: 'unsupported', deferredPrompt: null });
  sessionStorage.clear();
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
});

afterAll(() => server.close());
