import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { toApiError } from './apiError';
import { DEMO_HEADER, isDemoActive } from '@/lib/demo';

/**
 * Cliente HTTP único (docs/frontend/architecture.md § 6.1).
 * A sessão é injetada por `configureHttpAuth`, para `lib/` não depender das stores.
 */
export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3333/v1';

export const http = axios.create({
  baseURL: API_URL,
  timeout: 15_000,
  withCredentials: true,
  headers: { Accept: 'application/json' },
});

interface AuthHooks {
  /** Token de acesso atual (só em memória). */
  getAccessToken: () => string | null;
  /** Renova a sessão; resolve com o novo token ou rejeita se a sessão acabou. */
  refresh: () => Promise<string>;
  /** Chamado quando a renovação falha: limpar a sessão e ir para o login. */
  onSessionExpired: () => void;
}

let auth: AuthHooks | null = null;
let refreshInFlight: Promise<string> | null = null;

export function configureHttpAuth(hooks: AuthHooks): void {
  auth = hooks;
}

/** Garante uma única renovação por vez; chamadas que chegam junto esperam a mesma promessa. */
export function refreshOnce(): Promise<string> {
  if (!auth) return Promise.reject(new Error('configureHttpAuth não foi chamado'));
  refreshInFlight ??= auth.refresh().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean; skipAuthRefresh?: boolean };

http.interceptors.request.use((config) => {
  const token = auth?.getAccessToken();
  if (token) config.headers.set('Authorization', `Bearer ${token}`);
  // na demonstração, a API responde com a demo da conta (separada dos dados reais)
  if (isDemoActive()) config.headers.set(DEMO_HEADER, '1');
  return config;
});

http.interceptors.response.use(undefined, async (error: AxiosError) => {
  const config = error.config as RetriableConfig | undefined;
  const isUnauthenticated = error.response?.status === 401;

  if (isUnauthenticated && config && !config._retried && !config.skipAuthRefresh && auth) {
    config._retried = true;
    try {
      await refreshOnce();
      return http(config);
    } catch {
      auth.onSessionExpired();
    }
  }
  throw toApiError(error);
});

declare module 'axios' {
  interface AxiosRequestConfig {
    /** Não tenta renovar a sessão em 401 (usado pelas próprias rotas de auth). */
    skipAuthRefresh?: boolean;
  }
}
