import { http, type Schema } from '@/lib/http';

export type Invite = Schema<'Invite'>;
export type InvitePreview = Schema<'InvitePreview'>;
export type MembershipType = Schema<'MembershipType'>;

export async function listInvites(groupId: string): Promise<Invite[]> {
  const { data } = await http.get<{ items: Invite[] }>(`/groups/${encodeURIComponent(groupId)}/invites`);
  return data.items;
}

export async function createInvite(
  groupId: string,
  body: { membershipType: MembershipType; matchId?: string; note?: string; maxUses?: number },
): Promise<Invite> {
  const { data } = await http.post<Invite>(`/groups/${encodeURIComponent(groupId)}/invites`, body);
  return data;
}

export async function getInvitePreview(code: string): Promise<InvitePreview> {
  const { data } = await http.get<InvitePreview>(`/invites/${encodeURIComponent(code)}`, { skipAuthRefresh: true });
  return data;
}

export async function revokeInvite(code: string): Promise<void> {
  await http.delete(`/invites/${encodeURIComponent(code)}`);
}

export async function acceptInvite(code: string): Promise<{ groupId: string; alreadyMember: boolean }> {
  const { data } = await http.post<{ groupId: string; alreadyMember: boolean }>(
    `/invites/${encodeURIComponent(code)}/accept`,
  );
  return data;
}
