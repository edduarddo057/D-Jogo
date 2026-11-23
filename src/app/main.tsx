import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Fontes servidas pelo próprio app (entram no cache do PWA e funcionam offline)
import '@fontsource-variable/inter';
import '@fontsource/plus-jakarta-sans/700.css';
import '@fontsource/plus-jakarta-sans/800.css';
import '@fontsource/plus-jakarta-sans/700-italic.css';
import '@fontsource/plus-jakarta-sans/800-italic.css';
import '@/styles/global.css';
import { App } from './App';
import { enableMocksIfNeeded } from './enableMocks';
import { setupPwa } from './pwa';
import { openInviteFromQuery } from '@/pages/shared/invite';
import { hideSplashWhenDone } from './splash';

async function start() {
  const container = document.getElementById('root');
  if (!container) throw new Error('Elemento #root não encontrado no index.html');

  // Link de convite "?convite=CÓDIGO" → tela do convite (antes do roteador montar)
  openInviteFromQuery();

  // Os mocks precisam estar ativos antes da primeira chamada à API (verificação da sessão).
  await enableMocksIfNeeded();

  void setupPwa();

  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
  hideSplashWhenDone();
}

void start();
