import { delay, http, HttpResponse } from 'msw';
import { db, findUser } from '../db';
import { toMe } from '../serializers';
import { api, latency, problem, tokenFor } from '../utils';

/** Nos mocks, o código válido é sempre este. */
export const MOCK_OTP_CODE = '123456';

export const authHandlers = [
  http.post(api('/auth/otp'), async ({ request }) => {
    await delay(latency());
    const body = (await request.json()) as { phone?: string; channel?: 'whatsapp' | 'sms' };
    if (!body.phone || !/^\+[1-9]\d{10,14}$/.test(body.phone)) {
      return problem(400, 'VALIDATION_ERROR', { fields: { phone: 'Número inválido' } });
    }
    const challengeId = `ch_${Date.now()}`;
    db.otp.set(challengeId, { phone: body.phone, code: MOCK_OTP_CODE });
    const now = Date.now();
    return HttpResponse.json(
      {
        challengeId,
        channel: body.channel ?? 'whatsapp',
        expiresAt: new Date(now + 5 * 60_000).toISOString(),
        resendAvailableAt: new Date(now + 60_000).toISOString(),
      },
      { status: 202 },
    );
  }),

  http.post(api('/auth/otp/verify'), async ({ request }) => {
    await delay(latency());
    const { challengeId, code } = (await request.json()) as { challengeId: string; code: string };
    const challenge = db.otp.get(challengeId);
    if (!challenge) return problem(422, 'OTP_EXPIRED', { rule: 'RN-01' });
    if (challenge.code !== code) return problem(422, 'OTP_INVALID', { rule: 'RN-01' });
    db.otp.delete(challengeId);

    let user = db.users.find((u) => u.phone === challenge.phone);
    if (!user) {
      user = {
        id: `u_${Date.now()}`,
        phone: challenge.phone,
        name: '',
        nickname: '',
        photoUrl: null,
        gender: null,
        profileCompleted: false,
        termsVersion: null,
        termsAcceptedAt: null,
        sportProfile: null,
        notificationSettings: { lists: true, payments: true, waitlist: true, organizer: true, day_summary: false },
      };
      db.users.push(user);
    }
    db.session.userId = user.id;
    return HttpResponse.json({ accessToken: tokenFor(user.id), expiresIn: 900, user: toMe(user) });
  }),

  http.post(api('/auth/refresh'), async () => {
    await delay(latency());
    const user = db.session.userId ? findUser(db.session.userId) : undefined;
    if (!user) return problem(401, 'UNAUTHENTICATED');
    return HttpResponse.json({ accessToken: tokenFor(user.id), expiresIn: 900, user: toMe(user) });
  }),

  http.post(api('/auth/logout'), () => {
    db.session.userId = null;
    return new HttpResponse(null, { status: 204 });
  }),
];
