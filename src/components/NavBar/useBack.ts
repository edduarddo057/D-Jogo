import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router';

/** De onde a pessoa veio: vai no `state` dos links (manual 5 — Regra do Voltar). */
export interface BackTarget {
  to: string;
  label: string;
}

export const fromState = (to: string, label: string) => ({ from: { to, label } satisfies BackTarget });

/**
 * O Voltar volta para a origem. Se a tela foi aberta de dentro do app, desfaz a navegação
 * (a origem continua no histórico, com rolagem e filtros); se foi aberta por link direto, vai
 * para o destino padrão da tela.
 */
export function useBack(fallback: BackTarget) {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: BackTarget } | null)?.from;
  const target = from ?? fallback;
  const go = useCallback(() => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) navigate(-1);
    else navigate(target.to, { replace: true });
  }, [navigate, target.to]);
  return { label: target.label, to: target.to, go };
}
