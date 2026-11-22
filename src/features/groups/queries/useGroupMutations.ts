import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  archiveGroup,
  createGroup,
  transferGroup,
  updateGroup,
  type GroupInput,
  type GroupPatch,
} from '../api/groupsApi';
import { groupKeys } from './groupKeys';

export function useCreateGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: GroupInput) => createGroup(body),
    meta: { silent: true },
    onSuccess: (group) => {
      queryClient.setQueryData(groupKeys.detail(group.id), group);
      void queryClient.invalidateQueries({ queryKey: groupKeys.mine });
    },
  });
}

export function useUpdateGroup(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: GroupPatch) => updateGroup(groupId, body),
    meta: { silent: true },
    onSuccess: (group) => {
      queryClient.setQueryData(groupKeys.detail(group.id), group);
      void queryClient.invalidateQueries({ queryKey: groupKeys.mine });
    },
  });
}

/** Passar a turma para outra pessoa (antes de excluir a conta). */
export function useTransferGroup(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) => transferGroup(groupId, memberId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['groups'] }),
  });
}

/** Encerrar a turma (arquiva; RN-11). */
export function useArchiveGroup(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => archiveGroup(groupId),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: groupKeys.detail(groupId) });
      void queryClient.invalidateQueries({ queryKey: ['groups'] });
      void queryClient.invalidateQueries({ queryKey: ['matches'] });
    },
  });
}
