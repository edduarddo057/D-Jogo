import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { matchKeys } from '@/features/matches';
import { isApiError } from '@/lib/http';
import {
  createDrawTemplate,
  deleteDrawTemplate,
  drawTeams,
  getDraw,
  listDrawTemplates,
  moveDrawPlayers,
  publishDraw,
  updateDrawTemplate,
  type DrawMove,
  type DrawTemplateInput,
  type TeamDraw,
} from '../api/drawApi';

export const drawKeys = {
  templates: (groupId: string) => ['groups', 'detail', groupId, 'draw-templates'] as const,
  draw: (matchId: string) => [...matchKeys.detail(matchId), 'draw'] as const,
};

export function useDrawTemplates(groupId: string, enabled = true) {
  return useQuery({ queryKey: drawKeys.templates(groupId), queryFn: () => listDrawTemplates(groupId), enabled });
}

function useInvalidateTemplates(groupId: string) {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: drawKeys.templates(groupId) });
    void queryClient.invalidateQueries({ queryKey: ['groups', 'detail', groupId], exact: true });
  };
}

export function useSaveDrawTemplate(groupId: string) {
  const invalidate = useInvalidateTemplates(groupId);
  return useMutation({
    mutationFn: ({ id, body }: { id?: string; body: DrawTemplateInput }) =>
      id ? updateDrawTemplate(groupId, id, body) : createDrawTemplate(groupId, body),
    meta: { silent: true },
    onSuccess: invalidate,
  });
}

export function useDeleteDrawTemplate(groupId: string) {
  const invalidate = useInvalidateTemplates(groupId);
  return useMutation({ mutationFn: (id: string) => deleteDrawTemplate(groupId, id), onSuccess: invalidate });
}

/** Sorteio atual; 404 = ainda não sorteado (não é erro para a tela). */
export function useDraw(matchId: string) {
  return useQuery({
    queryKey: drawKeys.draw(matchId),
    queryFn: async () => {
      try {
        return await getDraw(matchId);
      } catch (e) {
        if (isApiError(e) && e.status === 404) return null;
        throw e;
      }
    },
  });
}

function useStoreDraw(matchId: string, refreshMatch = false) {
  const queryClient = useQueryClient();
  return (draw: TeamDraw) => {
    queryClient.setQueryData(drawKeys.draw(matchId), draw);
    if (refreshMatch) {
      void queryClient.invalidateQueries({ queryKey: matchKeys.detail(matchId), exact: true });
      void queryClient.invalidateQueries({ queryKey: matchKeys.all, predicate: (q) => q.queryKey[1] !== 'detail' });
    }
  };
}

export function useDrawTeams(matchId: string) {
  const store = useStoreDraw(matchId, true);
  return useMutation({ mutationFn: (templateId?: string) => drawTeams(matchId, templateId), onSuccess: store });
}

export function useMoveDrawPlayers(matchId: string) {
  const store = useStoreDraw(matchId);
  return useMutation({ mutationFn: (move: DrawMove) => moveDrawPlayers(matchId, move), onSuccess: store });
}

export function usePublishDraw(matchId: string) {
  const store = useStoreDraw(matchId, true);
  return useMutation({ mutationFn: () => publishDraw(matchId), onSuccess: store });
}
