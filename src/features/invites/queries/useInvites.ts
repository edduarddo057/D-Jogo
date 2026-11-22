import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  acceptInvite,
  createInvite,
  getInvitePreview,
  listInvites,
  revokeInvite,
  type Invite,
  type MembershipType,
} from '../api/invitesApi';

export const inviteKeys = {
  list: (groupId: string) => ['groups', 'detail', groupId, 'invites'] as const,
  preview: (code: string) => ['invites', 'preview', code.toUpperCase()] as const,
};

export function useInvites(groupId: string) {
  return useQuery({ queryKey: inviteKeys.list(groupId), queryFn: () => listInvites(groupId) });
}

export function useCreateInvite(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { membershipType: MembershipType; matchId?: string; note?: string }) =>
      createInvite(groupId, body),
    onSuccess: (invite) =>
      queryClient.setQueryData<Invite[]>(inviteKeys.list(groupId), (old) => [invite, ...(old ?? [])]),
  });
}

export function useRevokeInvite(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => revokeInvite(code),
    onSuccess: (_, code) =>
      queryClient.setQueryData<Invite[]>(inviteKeys.list(groupId), (old) => old?.filter((i) => i.code !== code)),
  });
}

export function useInvitePreview(code: string) {
  return useQuery({ queryKey: inviteKeys.preview(code), queryFn: () => getInvitePreview(code), retry: false });
}

export function useAcceptInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => acceptInvite(code),
    meta: { silent: true },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['groups'] });
      void queryClient.invalidateQueries({ queryKey: ['matches'] });
    },
  });
}
