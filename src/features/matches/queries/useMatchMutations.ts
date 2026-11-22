import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  cancelMatch,
  createMatch,
  listGroupMatches,
  runMatchAction,
  updateMatch,
  type Match,
  type MatchAction,
  type MatchInput,
  type MatchPatch,
} from '../api/matchesApi';
import { matchKeys } from './matchKeys';

export function useGroupMatches(groupId: string, scope: 'upcoming' | 'past') {
  return useQuery({ queryKey: matchKeys.byGroup(groupId, scope), queryFn: () => listGroupMatches(groupId, scope) });
}

/** Qualquer mudança numa partida mexe nas listas (Início, Partidas, turma): grava o detalhe e invalida o resto. */
function useStoreMatch() {
  const queryClient = useQueryClient();
  return (match: Match) => {
    queryClient.setQueryData(matchKeys.detail(match.id), match);
    void queryClient.invalidateQueries({ queryKey: matchKeys.all, predicate: (q) => q.queryKey[1] !== 'detail' });
    void queryClient.invalidateQueries({ queryKey: ['matches', 'detail', match.id, 'participations'] });
    void queryClient.invalidateQueries({ queryKey: ['groups'] });
  };
}

export function useCreateMatch(groupId: string) {
  const store = useStoreMatch();
  return useMutation({
    mutationFn: (body: MatchInput) => createMatch(groupId, body),
    meta: { silent: true },
    onSuccess: store,
  });
}

export function useUpdateMatch(matchId: string) {
  const store = useStoreMatch();
  return useMutation({
    mutationFn: (body: MatchPatch) => updateMatch(matchId, body),
    meta: { silent: true },
    onSuccess: store,
  });
}

export function useMatchAction(matchId: string) {
  const store = useStoreMatch();
  return useMutation({
    mutationFn: (action: MatchAction) => runMatchAction(matchId, action),
    onSuccess: store,
  });
}

export function useCancelMatch(matchId: string) {
  const store = useStoreMatch();
  return useMutation({
    mutationFn: (reason: string) => cancelMatch(matchId, reason),
    onSuccess: store,
  });
}
