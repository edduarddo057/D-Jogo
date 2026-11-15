import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { msw } from 'msw/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const withMocks = command === 'serve' || env.VITE_API_MOCK === 'true';
  // GitHub Pages publica em https://<usuário>.github.io/D-Jogo/. Dev e testes continuam na raiz.
  // Outra hospedagem na raiz do domínio (Vercel, Netlify, Cloudflare): BASE_PATH=/ pnpm build
  const base = command === 'build' ? (process.env.BASE_PATH ?? '/D-Jogo/') : '/';
  const escapedBase = base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  return {
    base,
    // msw/vite só serve o script do worker (/mockServiceWorker.js); quem liga os mocks é src/app/enableMocks.ts.
    // Fica fora do build de produção quando os mocks estão desligados.
    plugins: [
      react(),
      ...(withMocks ? [msw({ mode: 'worker-only' })] : []),
      VitePWA({
        // Registro manual em src/app/pwa.ts: só sem mocks, e com aviso de atualização (architecture.md § 12)
        registerType: 'prompt',
        injectRegister: false,
        includeAssets: ['favicon.svg', 'favicon-32x32.png', 'apple-touch-icon.png', 'brand/*.svg'],
        manifest: {
          id: base,
          name: 'Dá Jogo',
          short_name: 'Dá Jogo',
          description: 'Junta a galera, organiza a turma e fecha o time.',
          lang: 'pt-BR',
          dir: 'ltr',
          start_url: base,
          scope: base,
          display: 'standalone',
          orientation: 'portrait',
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
