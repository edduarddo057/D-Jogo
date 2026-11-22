import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Outlet, ScrollRestoration, useLocation } from 'react-router';
import { bootstrapSession } from '@/features/auth';
import { useSessionStore } from '@/stores';
import { Splash } from './RouteStates';

/** Raiz de todas as rotas: verifica a sessão uma vez e mostra a abertura enquanto isso. */
export function RootLayout() {
  const status = useSessionStore((s) => s.status);
  const queryClient = useQueryClient();

  const location = useLocation();
  const redirectTo = useSessionStore((s) => s.redirectTo);

  useEffect(() => {
    if (status === 'unknown') void bootstrapSession(queryClient);
  }, [status, queryClient]);

  // Destino pós-login cumprido: limpa para não redirecionar de novo depois
  useEffect(() => {
    if (status === 'authenticated' && redirectTo && `${location.pathname}${location.search}` === redirectTo) {
      useSessionStore.getState().setRedirectTo(null);
    }
  }, [status, redirectTo, location.pathname, location.search]);

  if (status === 'unknown') return <Splash />;

  return (
    <>
      <Outlet />
      <ScrollRestoration />
    </>
  );
}
