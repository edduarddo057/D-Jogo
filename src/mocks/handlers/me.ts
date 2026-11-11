import { http } from 'msw';
import { db, findGroup, findMatch, membershipOf, newId, nowIso } from '../db';
import { removeParticipation } from '../domain/attendance';
import { toGroupSummary, toMatchSummary, toMe, toPayment } from '../serializers';
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
      const body = (await request.json()) as { name?: string; nickname?: string };
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
        sportProfile: { sportId: string; positions: string[]; level: number };
        acceptedTermsVersion: string;
        inviteCode?: string;
      };
      if (!NICK.test(body.nickname ?? ''))
        return problem(400, 'VALIDATION_ERROR', { fields: { nickname: 'Nickname inválido' } });
      if (nicknameTaken(body.nickname, user.id)) return problem(409, 'NICKNAME_TAKEN', { rule: 'RN-03' });
      user.name = body.name.trim();
      user.nickname = body.nickname;
      user.sportProfile = body.sportProfile;
      user.termsVersion = body.acceptedTermsVersion;
      user.profileCompleted = true;
      let joinedGroupId: string | null = null;
      if (body.inviteCode) joinedGroupId = acceptInviteFor(body.inviteCode, user.id).groupId;
      return json({ me: toMe(user), joinedGroupId });
    }),
  ),

  http.put(
    api('/me/sport-profiles/:sportId'),
    authed(async ({ request, params }, user) => {
      const body = (await request.json()) as { positions: string[]; level: number };
      user.sportProfile = { sportId: String(params.sportId), positions: body.positions, level: body.level };
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
      const items = db.matches
        .filter((m) => membershipOf(m.groupId, user.id) && m.status !== 'draft')
        .filter((m) =>
          scope === 'history'
            ? m.status === 'finished' &&
              db.participations.some((p) => p.matchId === m.id && p.userId === user.id && p.status === 'confirmed')
            : m.endsAt >= now && m.status !== 'finished' && m.status !== 'cancelled',
        )
        .sort((a, b) =>
          scope === 'history' ? b.startsAt.localeCompare(a.startsAt) : a.startsAt.localeCompare(b.startsAt),
        )
        .map((m) => toMatchSummary(m, user.id));
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
];
