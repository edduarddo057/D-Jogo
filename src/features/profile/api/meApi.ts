import { squarePhoto } from '@/lib/image';
import { http, type Schema } from '@/lib/http';

export type Me = Schema<'Me'>;
export type Sport = Schema<'Sport'>;
export type SportProfileInput = Schema<'SportProfileInput'>;

export async function getMe(): Promise<Me> {
  const { data } = await http.get<Me>('/me');
  return data;
}

export type Gender = Schema<'Gender'>;

export async function updateMe(body: {
  name?: string;
  nickname?: string;
  gender?: Gender | null;
  /** Celular de contato (conta que entra pelo Google). */
  phone?: string;
}): Promise<Me> {
  const { data } = await http.patch<Me>('/me', body);
  return data;
}

export async function completeOnboarding(body: {
  name: string;
  nickname: string;
  sportProfile?: SportProfileInput;
  gender?: Gender | null;
  acceptedTermsVersion: string;
  phone?: string;
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

export type MyStats = Schema<'MyStats'>;

export async function getMyStats(): Promise<MyStats> {
  const { data } = await http.get<MyStats>('/me/stats');
  return data;
}

export type MyStatsDetails = Schema<'MyStatsDetails'>;

/** Estatísticas do mural (RN-94). */
export async function getMyStatsDetails(): Promise<MyStatsDetails> {
  const { data } = await http.get<MyStatsDetails>('/me/stats/details');
  return data;
}

export async function requestPhoneChange(
  phone: string,
  channel: 'whatsapp' | 'sms' = 'whatsapp',
): Promise<Schema<'OtpChallenge'>> {
  const { data } = await http.post<Schema<'OtpChallenge'>>('/me/phone/otp', { phone, channel });
  return data;
}

export async function confirmPhoneChange(challengeId: string, code: string): Promise<Me> {
  const { data } = await http.post<Me>('/me/phone/verify', { challengeId, code });
  return data;
}

export async function uploadPhoto(file: File): Promise<{ photoUrl: string }> {
  const form = new FormData();
  form.append('file', await squarePhoto(file)); // 256×256: fotos de câmera têm vários MB
  const { data } = await http.put<{ photoUrl: string }>('/me/photo', form);
  return data;
}
