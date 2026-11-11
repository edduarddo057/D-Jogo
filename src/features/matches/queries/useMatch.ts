import { useQuery } from '@tanstack/react-query';
import { getMatch } from '../api/matchesApi';
import { matchKeys } from './matchKeys';

/** Vagas mudam enquanto a pessoa olha: atualiza a cada 20 s com a aba visível (architecture.md § 6.3). */
export const MATCH_REFETCH_INTERVAL = 20_000;

export function useMatch(matchId: string) {
  return useQuery({
    queryKey: matchKeys.detail(matchId),
    queryFn: () => getMatch(matchId),
    refetchInterval: MATCH_REFETCH_INTERVAL,
    refetchIntervalInBackground: false,
  });
}

export const matchQuery = (matchId: string) => ({
  queryKey: matchKeys.detail(matchId),
  queryFn: () => getMatch(matchId),
});
