import { http, type Schema } from '@/lib/http';

export type OtpChannel = 'whatsapp' | 'sms';
export type OtpChallenge = Schema<'OtpChallenge'>;
export type AuthSession = Schema<'AuthSession'>;

export async function requestOtp(phone: string, channel: OtpChannel = 'whatsapp'): Promise<OtpChallenge> {
  const { data } = await http.post<OtpChallenge>('/auth/otp', { phone, channel }, { skipAuthRefresh: true });
  return data;
}

export async function verifyOtp(challengeId: string, code: string): Promise<AuthSession> {
  const { data } = await http.post<AuthSession>('/auth/otp/verify', { challengeId, code }, { skipAuthRefresh: true });
  return data;
}

/** Entrar com Google: o `credential` é o ID token que o botão do Google entrega. */
export async function signInWithGoogle(credential: string): Promise<AuthSession> {
  const { data } = await http.post<AuthSession>('/auth/google', { credential }, { skipAuthRefresh: true });
  return data;
}

/** O token de renovação vai no cookie HttpOnly; o corpo fica vazio. */
export async function refreshSession(): Promise<AuthSession> {
  const { data } = await http.post<AuthSession>('/auth/refresh', {}, { skipAuthRefresh: true });
  return data;
}

export async function logout(): Promise<void> {
  await http.post('/auth/logout', undefined, { skipAuthRefresh: true });
}
