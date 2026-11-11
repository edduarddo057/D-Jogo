import { http, type Schema } from '@/lib/http';

export type GroupSummary = Schema<'GroupSummary'>;
export type Group = Schema<'Group'>;
export type Viewer = Schema<'Viewer'>;
export type Permission = Schema<'Permission'>;

export async function listMyGroups(): Promise<GroupSummary[]> {
  const { data } = await http.get<{ items: GroupSummary[] }>('/me/groups');
  return data.items;
}

export async function getGroup(groupId: string): Promise<Group> {
  const { data } = await http.get<Group>(`/groups/${encodeURIComponent(groupId)}`);
  return data;
}

export type GroupInput = Schema<'GroupInput'>;
export type GroupPatch = Schema<'GroupPatch'>;

export async function createGroup(body: GroupInput): Promise<Group> {
  const { data } = await http.post<Group>('/groups', body);
  return data;
}

export async function updateGroup(groupId: string, body: GroupPatch): Promise<Group> {
  const { data } = await http.patch<Group>(`/groups/${encodeURIComponent(groupId)}`, body);
  return data;
}
