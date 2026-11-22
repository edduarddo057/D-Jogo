import js from '@eslint/js';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * Regras de dependência entre camadas (docs/frontend/architecture.md § 4).
 * Dentro da própria feature, use caminhos relativos; para outra feature, só `@/features/<nome>`.
 */
const deepFeatureImport = {
  group: ['@/features/*/**'],
  message: 'Importe outra feature só pela porta de entrada: "@/features/<nome>".',
};
const restrict = (patterns) => ['error', { patterns }];

export default tseslint.config(
  {
    ignores: [
      'dist',
      'coverage',
      'dev-dist',
      'node_modules',
      'src/lib/http/schema.d.ts',
      'public/mockServiceWorker.js',
      'public/theme-init.js',
    ],
  },

  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'jsx-a11y': jsxA11y,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'smart'],
    },
  },

  // pages: compõem features; não conhecem a inicialização nem o miolo das features
  {
    files: ['src/pages/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': restrict([
        deepFeatureImport,
        { group: ['@/app/*', '@/app/**'], message: 'Páginas não importam de app/.' },
        { group: ['@/mocks/**'], message: 'Mocks só em app (dev) e testes.' },
      ]),
    },
  },

  // features: usam components, lib e stores; outra feature só pelo index
  {
    files: ['src/features/**/*.{ts,tsx}'],
    ignores: ['src/features/**/*.test.{ts,tsx}', 'src/features/**/__tests__/**'],
    rules: {
      'no-restricted-imports': restrict([
        deepFeatureImport,
        { group: ['@/pages/**', '@/app/**'], message: 'Features não importam de pages/ nem de app/.' },
        { group: ['@/mocks/**'], message: 'Mocks só em app (dev) e testes.' },
      ]),
    },
  },

  // components: design system puro, sem regra de negócio e sem API
  {
    files: ['src/components/**/*.{ts,tsx}'],
    ignores: ['src/components/**/*.test.tsx'],
    rules: {
      'no-restricted-imports': restrict([
        {
          group: ['@/features/**', '@/pages/**', '@/app/**', '@/stores/**', '@/mocks/**'],
          message: 'O design system não conhece features, páginas, app ou stores.',
        },
        {
          group: ['@/lib/http', '@/lib/http/**', 'axios', '@tanstack/react-query'],
          message: 'Componentes do design system não chamam a API.',
        },
      ]),
    },
  },

  // lib: utilitários sem React e sem regra de negócio
  {
    files: ['src/lib/**/*.ts'],
    ignores: ['src/lib/**/*.test.ts'],
    rules: {
      'no-restricted-imports': restrict([
        {
          group: ['@/features/**', '@/pages/**', '@/app/**', '@/components/**', '@/mocks/**'],
          message: 'lib/ não depende de camadas acima.',
        },
        { group: ['react', 'react-dom'], message: 'lib/ não usa React; coloque hooks na feature ou em components/.' },
      ]),
    },
  },

  // stores: estado do cliente, sem features nem páginas
  {
    files: ['src/stores/**/*.ts'],
    rules: {
      'no-restricted-imports': restrict([
        {
          group: ['@/features/**', '@/pages/**', '@/app/**', '@/components/**', '@/mocks/**'],
          message: 'stores/ não depende de camadas acima.',
        },
      ]),
    },
  },

  // scripts e configs em Node
  {
    files: ['scripts/**/*.mjs', '*.config.{js,ts}'],
    languageOptions: { globals: globals.node },
    extends: [js.configs.recommended],
  },
);
