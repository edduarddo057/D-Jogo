import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { matchKeys } from '@/features/matches';
import {
  createLiveDraw,
  finishRound,
  getDaySummary,
  getLive,
  setArrival,
  startLive,
  type LiveDrawInput,
  type LiveState,
  type RoundInput,
} from '../api/liveApi';

export const liveKeys = {
  state: (matchId: string) => [...matchKeys.detail(matchId), 'live'] as const,
  day: (matchId: string) => [...matchKeys.detail(matchId), 'day'] as const,
};

export function useLive(matchId: string) {
  return useQuery({ queryKey: liveKeys.state(matchId), queryFn: () => getLive(matchId) });
}

function useRefreshMatchLists() {
  const queryClient = useQueryClient();
  return (matchId: string) => {
    void queryClient.invalidateQueries({ queryKey: matchKeys.detail(matchId), exact: true });
    void queryClient.invalidateQueries({ queryKey: matchKeys.all, predicate: (q) => q.queryKey[1] !== 'detail' });
    void queryClient.invalidateQueries({ queryKey: ['groups'] });
  };
}

/** Entrar no modo ao vivo (RN-100): a partida passa a "em jogo". */
export function useStartLive(matchId: string) {
  const queryClient = useQueryClient();
  const refresh = useRefreshMatchLists();
  return useMutation({
    mutationFn: () => startLive(matchId),
    onSuccess: (state) => {
      queryClient.setQueryData(liveKeys.state(matchId), state);
      refresh(matchId);
    },
  });
}

/** Chegada: muda na hora (otimista), porque o organizador marca muita gente seguida. */
export function useSetArrival(matchId: string) {
  const queryClient = useQueryClient();
  const key = liveKeys.state(matchId);
  return useMutation({
    mutationFn: ({ userId, arrived }: { userId: string; arrived: boolean }) => setArrival(matchId, userId, arrived),
    onMutate: async ({ userId, arrived }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<LiveState>(key);
      if (previous) {
        const ids = new Set(previous.arrivedUserIds);
        if (arrived) ids.add(userId);
        else ids.delete(userId);
        queryClient.setQueryData<LiveState>(key, { ...previous, arrivedUserIds: [...ids] });
      }
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(key, ctx.previous);
    },
  });
}

export function useLiveDraw(matchId: string) {
  const queryClient = useQueryClient();
  const key = liveKeys.state(matchId);
  return useMutation({
    mutationFn: (body: LiveDrawInput) => createLiveDraw(matchId, body),
    onSuccess: (draw, body) => {
      queryClient.setQueryData<LiveState>(key, (old) =>
        old ? { ...old, currentDraw: draw, lastDrawSettings: body } : old,
      );
    },
  });
}

export function useFinishRound(matchId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: RoundInput) => finishRound(matchId, body),
    onSuccess: (round) => {
      queryClient.setQueryData<LiveState>(liveKeys.state(matchId), (old) =>
        old ? { ...old, rounds: [...old.rounds, round] } : old,
      );
      void queryClient.invalidateQueries({ queryKey: liveKeys.day(matchId) });
    },
  });
}

export function useDaySummary(matchId: string) {
  return useQuery({ queryKey: liveKeys.day(matchId), queryFn: () => getDaySummary(matchId) });
}
