import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { msw } from 'msw/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';

// GitHub Pages publica em https://<usuário>.github.io/D-Jogo/ (uma subpasta). Dev e testes ficam na raiz.
// Hospedagem na raiz do domínio (Vercel, Netlify, Cloudflare): BASE_PATH=/ pnpm build
export default defineConfig(({ command, isPreview }) => {
  // o preview (pnpm preview) serve o build: precisa da mesma base
  const base = command === 'build' || isPreview ? (process.env.BASE_PATH ?? '/D-Jogo/') : '/';
  const escapedBase = base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return {
    base,
    // msw/vite só serve o script do worker (/mockServiceWorker.js); quem liga os mocks é src/app/enableMocks.ts.
    // Vai sempre no build: o modo demonstração (/demo) liga os mocks em produção. O código dos mocks em si
    // só é baixado por quem entra na demo (import dinâmico).
    plugins: [
      react(),
      msw({ mode: 'worker-only' }),
      VitePWA({
        // Registro manual em src/app/pwa.ts: só sem mocks, e com aviso de atualização (architecture.md § 12)
        registerType: 'prompt',
        injectRegister: false,
        includeAssets: ['favicon-32x32.png', 'apple-touch-icon.png', 'brand/*.png'],
        manifest: {
          id: base,
          name: 'Dá Jogo',
          short_name: 'Dá Jogo',
          description: 'Todo esporte fica melhor quando Dá Jogo. Lista, Pix e times sorteados num lugar só.',
          lang: 'pt-BR',
          dir: 'ltr',
          start_url: base,
          scope: base,
          display: 'standalone',
          // em pé é forçado no código (OrientationGuard); 'any' deixa o placar do dia de jogo deitar
          orientation: 'any',
          background_color: '#142a40',
          theme_color: '#142a40',
          categories: ['sports', 'social', 'lifestyle'],
          icons: [
            { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: 'maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          // App shell + fontes do app (só subconjuntos latinos). Respostas da API NÃO entram no cache (F15).
          globPatterns: ['**/*.{js,css,html,svg,png}', 'assets/*latin*.woff2'],
          // Mocks do modo demonstração: só quem entra em /demo baixa; não vão para o cache de todo mundo
          globIgnores: ['**/node_modules/**', 'mockServiceWorker.js', 'assets/browser-*.js', 'assets/demo-*.js'],
          navigateFallback: `${base}index.html`,
          navigateFallbackDenylist: [
            new RegExp(`^${escapedBase}mockServiceWorker\\.js$`),
            new RegExp(`^${escapedBase}api/`),
          ],
          cleanupOutdatedCaches: true,
        },
        devOptions: { enabled: false },
      }),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: 5173,
    },
    css: {
      modules: {
        localsConvention: 'camelCaseOnly',
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      // mesma origem da API dos testes: sem CORS entre o jsdom e os mocks
      environmentOptions: { jsdom: { url: 'http://localhost:3333/' } },
      env: {
        VITE_API_URL: 'http://localhost:3333/v1',
        VITE_APP_URL: 'http://localhost:5173',
        VITE_TERMS_VERSION: '2026-11',
      },
      setupFiles: ['./src/test/setup.ts'],
      css: { modules: { classNameStrategy: 'non-scoped' } },
      coverage: {
        provider: 'v8',
        include: ['src/**/*.{ts,tsx}'],
        exclude: ['src/**/*.test.{ts,tsx}', 'src/mocks/**', 'src/test/**', 'src/**/*.d.ts', 'src/app/main.tsx'],
      },
    },
  };
});
