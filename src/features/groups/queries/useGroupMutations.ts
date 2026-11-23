import { useMutation, useQueryClient } from '@tanstack/react-query';
import { squarePhoto } from '@/lib/image';
import {
  archiveGroup,
  createGroup,
  deleteGroupPhoto,
  transferGroup,
  updateGroup,
  uploadGroupPhoto,
  type Group,
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

/** Trocar ou tirar a foto da turma: reduz no aparelho, envia e atualiza turma e listas. */
export function useGroupPhoto(groupId: string) {
  const queryClient = useQueryClient();
  const refresh = (photoUrl: string | null) => {
    queryClient.setQueryData<Group>(groupKeys.detail(groupId), (g) => (g ? { ...g, photoUrl } : g));
    void queryClient.invalidateQueries({ queryKey: groupKeys.all });
  };
  const upload = useMutation({
    mutationFn: async (file: File) => uploadGroupPhoto(groupId, await squarePhoto(file)),
    meta: { silent: true },
    onSuccess: ({ photoUrl }) => refresh(photoUrl),
  });
  const remove = useMutation({
    mutationFn: () => deleteGroupPhoto(groupId),
    meta: { silent: true },
    onSuccess: () => refresh(null),
  });
  return { upload, remove };
}
