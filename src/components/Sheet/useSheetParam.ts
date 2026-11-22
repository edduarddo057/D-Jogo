import { useCallback } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router';

/** Parâmetro de busca que diz qual folha está aberta (?folha=pagar&jogo=m_1). */
export const SHEET_PARAM = 'folha';

/**
 * Folha ligada à URL: abrir empilha uma entrada no histórico, então o Voltar do celular fecha a folha
 * e a pessoa continua na tela de origem (manual 1.8 e 5). Os extras (ex.: `jogo`) vão junto na busca.
 */
export function useSheetParam(name: string) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isOpen = params.get(SHEET_PARAM) === name;

  const open = useCallback(
    (extra: Record<string, string> = {}) => {
      const next = new URLSearchParams(params);
      next.set(SHEET_PARAM, name);
      for (const [k, v] of Object.entries(extra)) next.set(k, v);
      const state = (location.state ?? {}) as Record<string, unknown>;
      // trocar de uma folha para outra não empilha: o Voltar volta para a tela, não para a folha anterior
      navigate(
        { search: `?${next.toString()}` },
        { state: { ...state, sheet: true }, replace: Boolean(params.get(SHEET_PARAM)) && state.sheet === true },
      );
    },
    [location.state, name, navigate, params],
  );

  const close = useCallback(
    (extraKeys: string[] = []) => {
      const state = (location.state ?? {}) as Record<string, unknown>;
      if (state.sheet === true && (window.history.state as { idx?: number } | null)?.idx) {
        navigate(-1);
        return;
      }
      const next = new URLSearchParams(params);
      next.delete(SHEET_PARAM);
      for (const k of extraKeys) next.delete(k);
      const { sheet: _sheet, ...rest } = state;
      const search = next.toString();
      navigate({ search: search ? `?${search}` : '' }, { replace: true, state: rest });
    },
    [location.state, navigate, params],
  );

  return { isOpen, open, close, param: (key: string) => params.get(key) };
}
