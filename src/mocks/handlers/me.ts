import { http } from 'msw';
import { db, findGroup, findMatch, membershipOf, newId, nowIso } from '../db';
import { removeParticipation } from '../domain/attendance';
import { toNotification } from '../domain/notify';
import {
  attendanceRateIn,
  highlightIdsOf,
  historyOf,
  summaryOf,
  toGroupSummary,
  toMatchSummary,
  toMe,
  toPayment,
} from '../serializers';
import { MOCK_OTP_CODE } from './auth';
import { api, authed, json, problem } from '../utils';
import { acceptInviteFor } from './invites';

const NICK = /^[a-z0-9._]{3,20}$/;
const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export const nicknameTaken = (nick: string, exceptUserId?: string) =>
  db.users.some((u) => u.id !== exceptUserId && normalize(u.nickname) === normalize(nick));

function suggestions(nick: string): string[] {
  const base =
    normalize(nick)
      .replace(/[^a-z0-9._]/g, '')
      .slice(0, 16) || 'jogador';
  const out: string[] = [];
  for (const candidate of [
    `${base}.vôlei`,
    `${base}${new Date().getFullYear() % 100}`,
    `${base}_jogo`,
    `${base}.${Math.floor(Math.random() * 90 + 10)}`,
  ]) {
    const c = normalize(candidate)
      .replace(/[^a-z0-9._]/g, '')
      .slice(0, 20);
    if (NICK.test(c) && !nicknameTaken(c) && !out.includes(c)) out.push(c);
    if (out.length === 3) break;
  }
  return out;
}

export const meHandlers = [
  http.get(
    api('/me'),
    authed((_a, user) => json(toMe(user))),
  ),

  http.patch(
    api('/me'),
    authed(async ({ request }, user) => {
      const body = (await request.json()) as { name?: string; nickname?: string; gender?: 'male' | 'female' | null };
      if (body.gender !== undefined) {
        if (body.gender !== null && body.gender !== 'male' && body.gender !== 'female')
          return problem(400, 'VALIDATION_ERROR', { fields: { gender: 'Masculino ou feminino' } });
        user.gender = body.gender; // RN-03a
      }
      if (body.nickname !== undefined) {
        if (!NICK.test(body.nickname))
          return problem(400, 'VALIDATION_ERROR', {
            fields: { nickname: 'Use de 3 a 20 letras, números, ponto ou _' },
          });
        if (nicknameTaken(body.nickname, user.id)) return problem(409, 'NICKNAME_TAKEN', { rule: 'RN-03' });
        user.nickname = body.nickname;
      }
      if (body.name !== undefined) user.name = body.name.trim();
      return json(toMe(user));
    }),
  ),

  http.post(
    api('/me/onboarding'),
    authed(async ({ request }, user) => {
      const body = (await request.json()) as {
        name: string;
        nickname: string;
        sportProfile: { sportId: string; positions: string[] };
        gender?: 'male' | 'female' | null;
        acceptedTermsVersion: string;
        inviteCode?: string;
      };
      if (!NICK.test(body.nickname ?? ''))
        return problem(400, 'VALIDATION_ERROR', { fields: { nickname: 'Nickname inválido' } });
      if (nicknameTaken(body.nickname, user.id)) return problem(409, 'NICKNAME_TAKEN', { rule: 'RN-03' });
      user.name = body.name.trim();
      user.nickname = body.nickname;
      user.sportProfile = { sportId: body.sportProfile.sportId, positions: body.sportProfile.positions };
      user.gender = body.gender ?? null;
      user.termsVersion = body.acceptedTermsVersion;
      user.termsAcceptedAt = nowIso();
      user.profileCompleted = true;
      let joinedGroupId: string | null = null;
      if (body.inviteCode) joinedGroupId = acceptInviteFor(body.inviteCode, user.id).groupId;
      return json({ me: toMe(user), joinedGroupId });
    }),
  ),

  http.put(
    api('/me/sport-profiles/:sportId'),
    authed(async ({ request, params }, user) => {
      const body = (await request.json()) as { positions: string[] };
      user.sportProfile = { sportId: String(params.sportId), positions: body.positions };
      return json(user.sportProfile);
    }),
  ),

  http.delete(
    api('/me'),
    authed((_a, user) => {
      if (
        db.groups.some(
          (g) =>
            g.ownerId === user.id &&
            !g.archivedAt &&
            db.memberships.some((m) => m.groupId === g.id && m.userId !== user.id && m.status === 'active'),
        )
      ) {
        return problem(422, 'OWNER_HAS_ACTIVE_GROUPS', { rule: 'RN-91' });
      }
      user.name = 'Jogador removido';
      user.phone = `+550000${newId('x').replace(/\D/g, '').padStart(7, '0')}`;
      user.photoUrl = null;
      // presenças futuras saem e liberam a vaga (RN-91)
      for (const p of db.participations.filter((x) => x.userId === user.id)) {
        const m = findMatch(p.matchId);
        if (m && (m.status === 'open' || m.status === 'draft' || m.status === 'closed')) removeParticipation(m, p.id);
      }
      db.memberships.filter((m) => m.userId === user.id).forEach((m) => (m.status = 'left'));
      db.session.userId = null;
      return new Response(null, { status: 204 });
    }),
  ),

  // Foto (UI na fase 2): o mock guarda a imagem como data URL
  http.put(
    api('/me/photo'),
    authed(async ({ request }, user) => {
      const form = await request.formData();
      const file = form.get('file');
      if (!(file instanceof File) || !/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 5 * 1024 * 1024)
        return problem(400, 'VALIDATION_ERROR', { fields: { file: 'Envie JPEG, PNG ou WebP de até 5 MB' } });
      const bytes = new Uint8Array(await file.arrayBuffer());
      let binary = '';
      bytes.forEach((b) => (binary += String.fromCharCode(b)));
      user.photoUrl = `data:${file.type};base64,${btoa(binary)}`;
      return json({ photoUrl: user.photoUrl });
    }),
  ),

  http.delete(
    api('/me/photo'),
    authed((_a, user) => {
      user.photoUrl = null;
      return new Response(null, { status: 204 });
    }),
  ),

  http.post(
    api('/me/terms'),
    authed(async ({ request }, user) => {
      const { version } = (await request.json()) as { version?: string };
      if (!version) return problem(400, 'VALIDATION_ERROR', { fields: { version: 'Informe a versão' } });
      user.termsVersion = version;
      user.termsAcceptedAt = nowIso();
      return json(toMe(user));
    }),
  ),

  http.get(
    api('/me/export'),
    authed((_a, user) => {
      const memberships = db.memberships
        .filter((m) => m.userId === user.id)
        .map((m) => {
          const g = findGroup(m.groupId);
          return {
            groupName: g?.name ?? '',
            type: m.type,
            role: g?.ownerId === user.id ? ('owner' as const) : ('player' as const),
            joinedAt: m.joinedAt,
          };
        });
      const participations = db.participations
        .filter((p) => p.userId === user.id)
        .map((p) => {
          const m = findMatch(p.matchId);
          return {
            matchTitle: m?.title ?? '',
            groupName: (m && findGroup(m.groupId)?.name) ?? '',
            startsAt: m?.startsAt ?? '',
            status: p.status,
          };
        });
      return json({
        generatedAt: nowIso(),
        termsVersion: user.termsVersion,
        account: toMe(user),
        memberships,
        participations,
        payments: db.payments.filter((p) => p.userId === user.id).map(toPayment),
      });
    }),
  ),

  http.get(
    api('/nicknames/:nickname/availability'),
    authed(({ params }, user) => {
      const nick = String(params.nickname);
      const available = NICK.test(nick) && !nicknameTaken(nick, user.id);
      return json({ available, suggestions: available ? [] : suggestions(nick) });
    }),
  ),

  http.get(
    api('/me/groups'),
    authed((_a, user) => {
      const items = db.memberships
        .filter((m) => m.userId === user.id && m.status === 'active')
        .map((m) => toGroupSummary(m.groupId, user.id))
        .filter((g) => g !== null);
      return json({ items });
    }),
  ),

  http.get(
    api('/me/matches'),
    authed(({ request }, user) => {
      const scope = new URL(request.url).searchParams.get('scope') ?? 'upcoming';
      const now = nowIso();
      const history = scope === 'history';
      const items = db.matches
        .filter((m) => m.status !== 'draft')
        .filter((m) =>
          history
            ? m.status === 'finished' && historyOf(m, user.id) !== null
            : membershipOf(m.groupId, user.id) &&
              (m.status === 'in_progress' || (m.endsAt >= now && m.status !== 'finished' && m.status !== 'cancelled')),
        )
        .sort((a, b) => (history ? b.startsAt.localeCompare(a.startsAt) : a.startsAt.localeCompare(b.startsAt)))
        .map((m) => toMatchSummary(m, user.id, history));
      return json({ items, nextCursor: null });
    }),
  ),

  http.get(
    api('/me/payments'),
    authed(({ request }, user) => {
      const statuses = new URL(request.url).searchParams.get('status')?.split(',');
      const items = db.payments
        .filter((p) => p.userId === user.id && (!statuses || statuses.includes(p.status)))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return json({ items: items.map(toPayment), nextCursor: null });
    }),
  ),

  // ── Os 3 números do Você (RN-93)
  http.get(
    api('/me/stats'),
    authed((_a, user) => {
      const finished = db.matches.filter((m) => m.status === 'finished');
      const attended = finished.filter((m) => historyOf(m, user.id)?.outcome === 'attended');
      return json({
        matches: attended.length,
        attendanceRate: attendanceRateIn(null, user.id) ?? 0,
        highlights: attended.filter((m) => highlightIdsOf(m.id).includes(user.id)).length,
      });
    }),
  ),

  // ── Estatísticas do mural (RN-94)
  http.get(
    api('/me/stats/details'),
    authed((_a, user) => json(statsDetailsOf(user.id))),
  ),

  // ── Trocar número (RN-06)
  http.post(
    api('/me/phone/otp'),
    authed(async ({ request }, user) => {
      const { phone } = (await request.json()) as { phone?: string; channel?: 'whatsapp' | 'sms' };
      if (!phone || !/^\+[1-9]\d{10,14}$/.test(phone))
        return problem(400, 'VALIDATION_ERROR', { fields: { phone: 'Número inválido' } });
      if (db.users.some((u) => u.id !== user.id && u.phone === phone))
        return problem(409, 'PHONE_IN_USE', { rule: 'RN-06' });
      const challengeId = `chp_${Date.now()}`;
      db.otp.set(challengeId, { phone, code: MOCK_OTP_CODE });
      const now = Date.now();
      return json(
        {
          challengeId,
          channel: 'whatsapp',
          expiresAt: new Date(now + 5 * 60_000).toISOString(),
          resendAvailableAt: new Date(now + 60_000).toISOString(),
        },
        202,
      );
    }),
  ),

  http.post(
    api('/me/phone/verify'),
    authed(async ({ request }, user) => {
      const { challengeId, code } = (await request.json()) as { challengeId: string; code: string };
      const challenge = db.otp.get(challengeId);
      if (!challenge) return problem(422, 'OTP_EXPIRED', { rule: 'RN-06' });
      if (challenge.code !== code) return problem(422, 'OTP_INVALID', { rule: 'RN-06' });
      db.otp.delete(challengeId);
      user.phone = challenge.phone;
      return json(toMe(user));
    }),
  ),

  // ── Avisos (RN-110 a RN-112)
  http.get(
    api('/me/notifications'),
    authed((_a, user) => {
      const mine = db.notifications
        .filter((n) => n.userId === user.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return json({ items: mine.map(toNotification), nextCursor: null, unread: mine.filter((n) => !n.readAt).length });
    }),
  ),

  http.post(
    api('/me/notifications/read'),
    authed(async ({ request }, user) => {
      const body = (await request.json().catch(() => ({}))) as { ids?: string[] };
      const at = nowIso();
      db.notifications
        .filter((n) => n.userId === user.id && !n.readAt && (!body.ids || body.ids.includes(n.id)))
        .forEach((n) => (n.readAt = at));
      return new Response(null, { status: 204 });
    }),
  ),

  http.get(
    api('/me/notification-settings'),
    authed((_a, user) => json(user.notificationSettings)),
  ),

  http.patch(
    api('/me/notification-settings'),
    authed(async ({ request }, user) => {
      const body = (await request.json()) as Partial<typeof user.notificationSettings>;
      for (const key of Object.keys(user.notificationSettings) as Array<keyof typeof user.notificationSettings>) {
        if (typeof body[key] === 'boolean') user.notificationSettings[key] = body[key];
      }
      return json(user.notificationSettings);
    }),
  ),
];

/** Estatísticas do mural (RN-94): só jogos finalizados em que a pessoa esteve. */
function statsDetailsOf(userId: string) {
  const finished = db.matches
    .filter((m) => m.status === 'finished')
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const inList = finished.filter((m) => historyOf(m, userId) !== null);
  const attended = inList.filter((m) => historyOf(m, userId)?.outcome === 'attended');

  // sequência: do mais recente para trás, até o primeiro jogo em que não foi
  let streak = 0;
  for (const m of [...inList].reverse()) {
    if (historyOf(m, userId)?.outcome !== 'attended') break;
    streak += 1;
  }
  let bestStreak = 0;
  let run = 0;
  for (const m of inList) {
    run = historyOf(m, userId)?.outcome === 'attended' ? run + 1 : 0;
    bestStreak = Math.max(bestStreak, run);
  }

  const myRounds = attended.flatMap((m) =>
    db.rounds
      .filter((r) => r.matchId === m.id && r.teams.some((t) => t.memberIds.includes(userId)))
      .sort((a, b) => a.number - b.number)
      .map((r) => {
        const team = r.teams.find((t) => t.memberIds.includes(userId));
        const points = r.scorers.filter((sc) => sc.userId === userId).reduce((n, sc) => n + sc.points, 0);
        return { m, r, team, won: team?.teamId === r.winnerTeamId, points };
      }),
  );

  const byMatch = new Map<string, { wins: number; rounds: number; points: number }>();
  const byGroup = new Map<string, { matches: Set<string>; rounds: number; wins: number }>();
  const partners = new Map<string, { rounds: number; wins: number }>();
  for (const x of myRounds) {
    const d = byMatch.get(x.m.id) ?? { wins: 0, rounds: 0, points: 0 };
    d.rounds += 1;
    d.wins += x.won ? 1 : 0;
    d.points += x.points;
    byMatch.set(x.m.id, d);
    const g = byGroup.get(x.m.groupId) ?? { matches: new Set<string>(), rounds: 0, wins: 0 };
    g.matches.add(x.m.id);
    g.rounds += 1;
    g.wins += x.won ? 1 : 0;
    byGroup.set(x.m.groupId, g);
    for (const id of x.team?.memberIds ?? []) {
      if (id === userId) continue;
      const p = partners.get(id) ?? { rounds: 0, wins: 0 };
      p.rounds += 1;
      p.wins += x.won ? 1 : 0;
      partners.set(id, p);
    }
  }

  const best = [...byMatch.entries()].sort((a, b) => b[1].wins - a[1].wins || b[1].points - a[1].points)[0];
  const bestMatch = best ? findMatch(best[0]) : undefined;
  const rate = (g: { rounds: number; wins: number }) => (g.rounds ? g.wins / g.rounds : 0);

  return {
    matches: attended.length,
    rounds: myRounds.length,
    wins: myRounds.filter((x) => x.won).length,
    points: myRounds.reduce((n, x) => n + x.points, 0),
    highlights: attended.filter((m) => highlightIdsOf(m.id).includes(userId)).length,
    attendanceRate: attendanceRateIn(null, userId) ?? 0,
    streak,
    bestStreak,
    bestDay:
      best && bestMatch
        ? {
            matchId: bestMatch.id,
            startsAt: bestMatch.startsAt,
            groupName: findGroup(bestMatch.groupId)?.name ?? '',
            ...best[1],
          }
        : null,
    groups: [...byGroup.entries()]
      .map(([groupId, g]) => ({
        groupId,
        name: findGroup(groupId)?.name ?? '',
        matches: g.matches.size,
        rounds: g.rounds,
        wins: g.wins,
      }))
      .sort((a, b) => rate(b) - rate(a) || b.wins - a.wins),
    partners: [...partners.entries()]
      .filter(([, p]) => p.rounds >= 2)
      .sort((a, b) => b[1].wins - a[1].wins || rate(b[1]) - rate(a[1]))
      .slice(0, 5)
      .map(([id, p]) => ({ user: summaryOf(id), ...p })),
    recentForm: myRounds.slice(-10).map((x) => (x.won ? ('win' as const) : ('loss' as const))),
  };
}
