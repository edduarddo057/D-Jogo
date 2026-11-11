import type { QueryClient } from '@tanstack/react-query';
import { useSessionStore } from '@/stores';
import { meKeys } from '@/features/profile';
import { logout, refreshSession } from './api/authApi';

/** Renova a sessão e devolve o novo token de acesso. Usado pelo cliente HTTP em 401. */
export async function refreshAccessToken(): Promise<string> {
  const session = await refreshSession();
  useSessionStore.getState().setSession(session.accessToken);
  return session.accessToken;
}

let bootstrapping: Promise<void> | null = null;

/**
 * Ao abrir o app: tenta renovar pelo cookie. Deu certo → authenticated (e já guarda o "me" no cache);
 * não deu → anonymous. Chamadas repetidas reaproveitam a mesma tentativa.
 */
export function bootstrapSession(queryClient: QueryClient): Promise<void> {
  bootstrapping ??= refreshSession()
    .then((session) => {
      useSessionStore.getState().setSession(session.accessToken);
      queryClient.setQueryData(meKeys.me, session.user);
    })
    .catch(() => {
      useSessionStore.getState().setAnonymous();
    })
    .finally(() => {
      bootstrapping = null;
    });
  return bootstrapping;
}

export async function signOut(queryClient: QueryClient): Promise<void> {
  try {
    await logout();
  } finally {
    useSessionStore.getState().clear();
    queryClient.clear();
  }
}
