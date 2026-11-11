import { http, type Schema } from '@/lib/http';

export type Member = Schema<'Member'>;
export type MembershipType = Schema<'MembershipType'>;
export type GroupRules = Schema<'GroupRules'>;
export type GroupRulesPatch = Schema<'GroupRulesPatch'>;

const g = (groupId: string) => `/groups/${encodeURIComponent(groupId)}`;

export async function listMembers(
  groupId: string,
  params: { type?: MembershipType; q?: string } = {},
): Promise<Member[]> {
  const { data } = await http.get<{ items: Member[] }>(`${g(groupId)}/members`, { params: { ...params, limit: 100 } });
  return data.items;
}

export async function addMember(groupId: string, body: { nickname: string; type: MembershipType }): Promise<Member> {
  const { data } = await http.post<Member>(`${g(groupId)}/members`, body);
  return data;
}

export async function updateMember(groupId: string, memberId: string, type: MembershipType): Promise<Member> {
  const { data } = await http.patch<Member>(`${g(groupId)}/members/${encodeURIComponent(memberId)}`, { type });
  return data;
}

export async function removeMember(groupId: string, memberId: string): Promise<void> {
  await http.delete(`${g(groupId)}/members/${encodeURIComponent(memberId)}`);
}

export async function leaveGroup(groupId: string): Promise<void> {
  await http.post(`${g(groupId)}/leave`);
}

export async function updateRules(groupId: string, body: GroupRulesPatch): Promise<GroupRules> {
  const { data } = await http.patch<GroupRules>(`${g(groupId)}/rules`, body);
  return data;
}
