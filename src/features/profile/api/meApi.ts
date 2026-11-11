import { http, type Schema } from '@/lib/http';

export type Me = Schema<'Me'>;
export type Sport = Schema<'Sport'>;
export type SportProfileInput = Schema<'SportProfileInput'>;

export async function getMe(): Promise<Me> {
  const { data } = await http.get<Me>('/me');
  return data;
}

export async function updateMe(body: { name?: string; nickname?: string }): Promise<Me> {
  const { data } = await http.patch<Me>('/me', body);
  return data;
}

export async function completeOnboarding(body: {
  name: string;
  nickname: string;
  sportProfile: SportProfileInput;
  acceptedTermsVersion: string;
  inviteCode?: string;
}): Promise<{ me: Me; joinedGroupId?: string | null }> {
  const { data } = await http.post<{ me: Me; joinedGroupId?: string | null }>('/me/onboarding', body);
  return data;
}

export async function upsertSportProfile(body: SportProfileInput): Promise<SportProfileInput> {
  const { sportId, ...rest } = body;
  const { data } = await http.put<SportProfileInput>(`/me/sport-profiles/${sportId}`, { sportId, ...rest });
  return data;
}

export async function deleteAccount(): Promise<void> {
  await http.delete('/me');
}

export async function checkNickname(nickname: string): Promise<{ available: boolean; suggestions: string[] }> {
  const { data } = await http.get<{ available: boolean; suggestions: string[] }>(
    `/nicknames/${encodeURIComponent(nickname)}/availability`,
  );
  return data;
}

export async function listSports(): Promise<Sport[]> {
  const { data } = await http.get<{ items: Sport[] }>('/sports');
  return data.items;
}

export type DataExport = Schema<'DataExport'>;

export async function acceptTerms(version: string): Promise<Me> {
  const { data } = await http.post<Me>('/me/terms', { version });
  return data;
}

export async function exportMyData(): Promise<DataExport> {
  const { data } = await http.get<DataExport>('/me/export');
  return data;
}
