import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useMe } from '@/features/profile';
import { TERMS_VERSION } from '@/lib/config';
import { useSessionStore } from '@/stores';
import { RouteLoading } from '../layouts/RouteStates';

/** Sem sessão → /entrar?voltar=<rota atual>. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const status = useSessionStore((s) => s.status);
  const location = useLocation();
  if (status === 'anonymous') {
    const back = `${location.pathname}${location.search}`;
    return <Navigate to={`/entrar?voltar=${encodeURIComponent(back)}`} replace />;
  }
  return <>{children}</>;
}

/**
 * Perfil incompleto → /cadastro (RN-02). Termos desatualizados → /termos/aceitar (RN-05).
 * Espera o "me" carregar. Privacidade e conta continua aberta, para quem não aceitar poder sair.
 */
export function RequireProfile({ children }: { children: ReactNode }) {
  const { data: me, isPending } = useMe();
  const termsFlag = useSessionStore((s) => s.termsUpdateRequired);
  const location = useLocation();
  if (isPending) return <RouteLoading />;
  if (me && !me.profileCompleted) {
    return <Navigate to="/cadastro" replace state={{ from: location.pathname }} />;
  }
  const outdated = me && (termsFlag || me.termsVersion !== TERMS_VERSION);
  if (outdated && location.pathname !== '/perfil/privacidade') {
    return <Navigate to="/termos/aceitar" replace state={{ from: `${location.pathname}${location.search}` }} />;
  }
  return <>{children}</>;
}

/** Telas de login: quem já está logado vai para o destino calculado no login (ou para o Início). */
export function GuestOnly({ children }: { children: ReactNode }) {
  const status = useSessionStore((s) => s.status);
  const redirectTo = useSessionStore((s) => s.redirectTo);
  if (status === 'authenticated') {
    const target = redirectTo && redirectTo.startsWith('/') ? redirectTo : '/';
    return <Navigate to={target} replace />;
  }
  return <>{children}</>;
}
