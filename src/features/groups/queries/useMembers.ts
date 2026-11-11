import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Group } from '../api/groupsApi';
import {
  addMember,
  leaveGroup,
  listMembers,
  removeMember,
  updateMember,
  updateRules,
  type GroupRulesPatch,
  type Member,
  type MembershipType,
} from '../api/membersApi';
import { groupKeys } from './groupKeys';

export const memberKeys = {
  list: (groupId: string) => ['groups', 'detail', groupId, 'members'] as const,
};

export function useMembers(groupId: string) {
  return useQuery({ queryKey: memberKeys.list(groupId), queryFn: () => listMembers(groupId) });
}

/** Membros mudam contadores da turma: invalida a turma junto (architecture.md § 6). */
function useInvalidateGroup(groupId: string) {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: groupKeys.detail(groupId) });
    void queryClient.invalidateQueries({ queryKey: groupKeys.mine });
  };
}

export function useAddMember(groupId: string) {
  const invalidate = useInvalidateGroup(groupId);
  return useMutation({
    mutationFn: (body: { nickname: string; type: MembershipType }) => addMember(groupId, body),
    meta: { silent: true },
    onSuccess: invalidate,
  });
}

export function useUpdateMember(groupId: string) {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateGroup(groupId);
  return useMutation({
    mutationFn: ({ memberId, type }: { memberId: string; type: MembershipType }) =>
      updateMember(groupId, memberId, type),
    onSuccess: (member) => {
      queryClient.setQueryData<Member[]>(memberKeys.list(groupId), (old) =>
        old?.map((m) => (m.id === member.id ? member : m)),
      );
      invalidate();
    },
  });
}

export function useRemoveMember(groupId: string) {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateGroup(groupId);
  return useMutation({
    mutationFn: (memberId: string) => removeMember(groupId, memberId),
    onSuccess: (_, memberId) => {
      queryClient.setQueryData<Member[]>(memberKeys.list(groupId), (old) => old?.filter((m) => m.id !== memberId));
      invalidate();
      void queryClient.invalidateQueries({ queryKey: ['matches'] });
    },
  });
}

export function useLeaveGroup(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => leaveGroup(groupId),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: groupKeys.detail(groupId) });
      void queryClient.invalidateQueries({ queryKey: groupKeys.mine });
      void queryClient.invalidateQueries({ queryKey: ['matches'] });
    },
  });
}

/** Regras: atualização otimista (cada switch salva na hora) com rollback se falhar. */
export function useUpdateRules(groupId: string) {
  const queryClient = useQueryClient();
  const key = groupKeys.detail(groupId);
  return useMutation({
    mutationFn: (patch: GroupRulesPatch) => updateRules(groupId, patch),
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Group>(key);
      if (previous?.rules) {
        queryClient.setQueryData<Group>(key, {
          ...previous,
          rules: { ...previous.rules, ...patch } as NonNullable<Group['rules']>,
        });
      }
      return { previous };
    },
    onError: (_e, _p, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(key, ctx.previous);
    },
    onSuccess: (rules) => {
      queryClient.setQueryData<Group>(key, (old) => (old ? { ...old, rules } : old));
    },
  });
}
