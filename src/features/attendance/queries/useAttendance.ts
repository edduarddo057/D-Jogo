import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MATCH_REFETCH_INTERVAL, matchKeys, type Match } from '@/features/matches';
import {
  addParticipation,
  listParticipations,
  promoteParticipation,
  removeParticipation,
  respondToMatch,
  type MatchCounts,
  type ParticipationStatus,
} from '../api/attendanceApi';

export const attendanceKeys = {
  list: (matchId: string) => [...matchKeys.detail(matchId), 'participations'] as const,
};

export function useParticipations(matchId: string) {
  return useQuery({
    queryKey: attendanceKeys.list(matchId),
    queryFn: () => listParticipations(matchId),
    refetchInterval: MATCH_REFETCH_INTERVAL,
    refetchIntervalInBackground: false,
  });
}

function useRefreshMatch(matchId: string) {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: matchKeys.detail(matchId) });
    void queryClient.invalidateQueries({ queryKey: matchKeys.all, predicate: (q) => q.queryKey[1] !== 'detail' });
  };
}

/** Contagem prevista para a resposta do mensalista (só ele tem vaga reservada; o resto o servidor decide). */
function predictCounts(c: MatchCounts, from: ParticipationStatus, to: ParticipationStatus): MatchCounts {
  const next = { ...c };
  const key = (s: ParticipationStatus) =>
    s === 'confirmed' ? 'confirmed' : s === 'pending' ? 'pending' : s === 'declined' ? 'declined' : null;
  const a = key(from);
  const b = key(to);
  if (a) next[a] = Math.max(0, next[a] - 1);
  if (b) next[b] += 1;
  const occupied = next.confirmed + next.pending + next.awaitingPayment;
  next.freeSpots = Math.max(0, next.capacity - occupied);
  return next;
}

/**
 * "Vou jogar" / "Não vou".
 * Mensalista com vaga reservada: atualização otimista com rollback (architecture.md § 6.4).
 * Avulso: espera o servidor (vaga, pagamento ou fila; o front não presume).
 */
export function useRespond(matchId: string) {
  const queryClient = useQueryClient();
  const key = matchKeys.detail(matchId);
  const refresh = useRefreshMatch(matchId);
  return useMutation({
    mutationFn: (response: 'going' | 'not_going') => respondToMatch(matchId, response),
    onMutate: async (response) => {
      const match = queryClient.getQueryData<Match>(key);
      const mine = match?.myParticipation;
      const optimistic =
        mine &&
        mine.membershipType === 'monthly' &&
        (mine.status === 'pending' || mine.status === 'confirmed' || mine.status === 'declined');
      if (!match || !mine || !optimistic) return { previous: undefined };
      await queryClient.cancelQueries({ queryKey: key });
      const to: ParticipationStatus = response === 'going' ? 'confirmed' : 'declined';
      // "Vou" de quem tinha recusado depende de vaga: não presume
      if (mine.status === 'declined' && to === 'confirmed') return { previous: undefined };
      queryClient.setQueryData<Match>(key, {
        ...match,
        myParticipation: { ...mine, status: to },
        counts: predictCounts(match.counts, mine.status, to),
      });
      return { previous: match };
    },
    onError: (_e, _r, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(key, ctx.previous);
    },
    onSuccess: ({ participation, counts }) => {
      queryClient.setQueryData<Match>(key, (old) => (old ? { ...old, myParticipation: participation, counts } : old));
    },
    onSettled: refresh,
  });
}

export function useAddParticipation(matchId: string) {
  const refresh = useRefreshMatch(matchId);
  return useMutation({ mutationFn: (userId: string) => addParticipation(matchId, userId), onSuccess: refresh });
}

export function usePromote(matchId: string) {
  const refresh = useRefreshMatch(matchId);
  return useMutation({
    mutationFn: (participationId: string) => promoteParticipation(matchId, participationId),
    onSuccess: refresh,
  });
}

export function useRemoveParticipation(matchId: string) {
  const refresh = useRefreshMatch(matchId);
  return useMutation({
    mutationFn: (participationId: string) => removeParticipation(matchId, participationId),
    onSuccess: refresh,
  });
}
