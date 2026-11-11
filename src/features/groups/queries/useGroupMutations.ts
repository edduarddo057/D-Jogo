import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createGroup, updateGroup, type GroupInput, type GroupPatch } from '../api/groupsApi';
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
