import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MATCH_REFETCH_INTERVAL, matchKeys, type Match, type MatchSummary } from '@/features/matches';
import type { Page } from '@/lib/http';
import {
  addParticipation,
  listParticipations,
  promoteParticipation,
  remindParticipants,
  removeParticipation,
  respondToMatch,
  undoReminder,
  type MatchCounts,
  type ParticipationStatus,
} from '../api/attendanceApi';

export const attendanceKeys = {
  list: (matchId: string) => [...matchKeys.detail(matchId), 'participations'] as const,
};

export function useParticipations(matchId: string, options: { enabled?: boolean } = {}) {
  return useQuery({
    enabled: options.enabled ?? true,
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
    void queryClient.invalidateQueries({ queryKey: attendanceKeys.list(matchId) });
    // pendências da aba Organizar (RN-18)
    void queryClient.invalidateQueries({ queryKey: ['groups'] });
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
 * "Vou" / "Não vou" no card, no detalhe e no aviso (manual 3.2 e 3.5).
 * Mensalista com vaga reservada: muda na hora (otimista) e volta se falhar.
 * Avulso: espera o servidor (vaga, pagamento ou fila; o front não presume).
 */
export function useRespond(matchId: string) {
  const queryClient = useQueryClient();
  const key = matchKeys.detail(matchId);
  const mineKey = matchKeys.mine('upcoming');
  const refresh = useRefreshMatch(matchId);
  return useMutation({
    mutationFn: (response: 'going' | 'not_going') => respondToMatch(matchId, response),
    meta: { silent: true },
    onMutate: async (response) => {
      const match = queryClient.getQueryData<Match>(key);
      const list = queryClient.getQueryData<Page<MatchSummary>>(mineKey);
      const mine = match?.myParticipation ?? list?.items.find((x) => x.id === matchId)?.myParticipation;
      const optimistic =
        mine &&
        mine.membershipType === 'monthly' &&
        (mine.status === 'pending' ||
          mine.status === 'confirmed' ||
          (mine.status === 'declined' && response === 'not_going'));
      if (!mine || !optimistic) return { previous: undefined, previousList: undefined };
      await queryClient.cancelQueries({ queryKey: key });
      await queryClient.cancelQueries({ queryKey: mineKey });
      const to: ParticipationStatus = response === 'going' ? 'confirmed' : 'declined';
      const next = { ...mine, status: to };
      if (match)
        queryClient.setQueryData<Match>(key, {
          ...match,
          myParticipation: next,
          counts: predictCounts(match.counts, mine.status, to),
        });
      if (list)
        queryClient.setQueryData<Page<MatchSummary>>(mineKey, {
          ...list,
          items: list.items.map((x) =>
            x.id === matchId ? { ...x, myParticipation: next, counts: predictCounts(x.counts, mine.status, to) } : x,
          ),
        });
      return { previous: match, previousList: list };
    },
    onError: (_e, _r, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(key, ctx.previous);
      if (ctx?.previousList) queryClient.setQueryData(mineKey, ctx.previousList);
    },
    onSuccess: ({ participation, counts }) => {
      queryClient.setQueryData<Match>(key, (old) => (old ? { ...old, myParticipation: participation, counts } : old));
      queryClient.setQueryData<Page<MatchSummary>>(mineKey, (old) =>
        old
          ? {
              ...old,
              items: old.items.map((x) => (x.id === matchId ? { ...x, myParticipation: participation, counts } : x)),
            }
          : old,
      );
    },
    onSettled: refresh,
  });
}

export function useAddParticipation(matchId: string) {
  const refresh = useRefreshMatch(matchId);
  return useMutation({ mutationFn: (userId: string) => addParticipation(matchId, userId), onSuccess: refresh });
}

/** Lembrar e desfazer o lembrete atualizam as pendências da aba Organizar. */
export function useRefreshAfterReminder(matchId: string) {
  return useRefreshMatch(matchId);
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

export function useRemind(matchId: string) {
  return useMutation({
    mutationFn: (userIds?: string[]) => remindParticipants(matchId, userIds),
  });
}

export function useUndoReminder() {
  return useMutation({ mutationFn: (reminderId: string) => undoReminder(reminderId) });
}
