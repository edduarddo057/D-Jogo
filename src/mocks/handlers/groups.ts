import { http } from 'msw';
import {
  db,
  defaultRules,
  findGroup,
  findUser,
  membershipOf,
  newId,
  nowIso,
  participationsOf,
  type DbGroup,
} from '../db';
import { releaseSpot } from '../domain/attendance';
import { isOwner, toGroup, toMember } from '../serializers';
import { SPORTS } from './sports';
import { api, authed, fail, json, noContent, problem, smallImageDataUrl } from '../utils';

const groupOrFail = (groupId: string, userId: string) => {
  const g = findGroup(groupId);
  if (!g || !membershipOf(groupId, userId)) return fail('NOT_FOUND');
  return g;
};
const ownerOrFail = (groupId: string, userId: string) => {
  const g = groupOrFail(groupId, userId);
  if (g.ownerId !== userId) fail('FORBIDDEN');
  return g;
};

/** Tira o membro das partidas futuras e libera as vagas (RN-14, RN-15). */
function leaveFutureMatches(groupId: string, userId: string) {
  for (const m of db.matches.filter((x) => x.groupId === groupId && (x.status === 'open' || x.status === 'draft'))) {
    const p = participationsOf(m.id).find((x) => x.userId === userId);
    if (p && p.status !== 'removed') {
      const occupying = ['confirmed', 'awaiting_payment', 'pending'].includes(p.status);
      p.status = 'removed';
      const pay = p.paymentId ? db.payments.find((x) => x.id === p.paymentId) : undefined;
      if (pay && pay.status === 'pending') pay.status = 'cancelled';
      if (occupying) releaseSpot(m);
    }
  }
}

export const groupHandlers = [
  http.post(
    api('/groups'),
    authed(async ({ request }, user) => {
      const body = (await request.json()) as Omit<
        DbGroup,
        'id' | 'ownerId' | 'rules' | 'archivedAt' | 'timezone' | 'pix' | 'schedules' | 'monthlyFeeDueDay'
      > & {
        pix?: DbGroup['pix'];
        timezone?: string;
        schedules?: DbGroup['schedules'];
        monthlyFeeDueDay?: number;
        rules?: Partial<DbGroup['rules']>;
      };
      if (!body.name || body.name.trim().length < 3)
        return problem(400, 'VALIDATION_ERROR', { fields: { name: 'Mínimo de 3 letras' } });
      const id = newId('g');
      const group: DbGroup = {
        id,
        name: body.name.trim(),
        sportId: body.sportId,
        ownerId: user.id,
        location: {
          name: body.location.name,
          address: body.location.address ?? null,
          mapsUrl: body.location.mapsUrl ?? null,
        },
        schedules: body.schedules ?? [],
        defaultCapacity: body.defaultCapacity,
        monthlyFeeCents: body.monthlyFeeCents,
        monthlyFeeDueDay: body.monthlyFeeDueDay ?? 10,
        dropInFeeCents: body.dropInFeeCents,
        pix: body.pix ?? null,
        timezone: body.timezone ?? 'America/Sao_Paulo',
        rules: { ...defaultRules(), ...(body.rules ?? {}) },
        archivedAt: null,
        photoUrl: null,
      };
      db.groups.push(group);
      db.memberships.push({
        id: newId('mb'),
        groupId: id,
        userId: user.id,
        type: 'monthly',
        status: 'active',
        joinedAt: nowIso(),
        level: null,
        skills: null,
      });
      return json(toGroup(group, user.id), 201);
    }),
  ),

  http.get(
    api('/groups/:groupId'),
    authed(({ params }, user) => json(toGroup(groupOrFail(String(params.groupId), user.id), user.id))),
  ),

  http.patch(
    api('/groups/:groupId'),
    authed(async ({ params, request }, user) => {
      const g = ownerOrFail(String(params.groupId), user.id);
      const body = (await request.json()) as Partial<DbGroup>;
      Object.assign(g, {
        ...(body.name !== undefined && { name: body.name.trim() }),
        ...(body.location !== undefined && {
          location: {
            name: body.location.name,
            address: body.location.address ?? null,
            mapsUrl: body.location.mapsUrl ?? null,
          },
        }),
        ...(body.schedules !== undefined && { schedules: body.schedules }),
        ...(body.monthlyFeeDueDay !== undefined && { monthlyFeeDueDay: body.monthlyFeeDueDay }),
        ...(body.defaultCapacity !== undefined && { defaultCapacity: body.defaultCapacity }),
        ...(body.monthlyFeeCents !== undefined && { monthlyFeeCents: body.monthlyFeeCents }),
        ...(body.dropInFeeCents !== undefined && { dropInFeeCents: body.dropInFeeCents }),
        ...(body.pix !== undefined && { pix: body.pix }),
      });
      return json(toGroup(g, user.id));
    }),
  ),

  http.delete(
    api('/groups/:groupId'),
    authed(({ params }, user) => {
      const g = ownerOrFail(String(params.groupId), user.id);
      g.archivedAt = nowIso();
      return noContent();
    }),
  ),

  http.patch(
    api('/groups/:groupId/rules'),
    authed(async ({ params, request }, user) => {
      const g = ownerOrFail(String(params.groupId), user.id);
      const body = (await request.json()) as Partial<DbGroup['rules']>;
      g.rules = { ...g.rules, ...body };
      return json(g.rules);
    }),
  ),

  http.post(
    api('/groups/:groupId/leave'),
    authed(({ params }, user) => {
      const g = groupOrFail(String(params.groupId), user.id);
      if (g.ownerId === user.id) return problem(422, 'OWNER_CANNOT_LEAVE', { rule: 'RN-11' });
      const mb = membershipOf(g.id, user.id);
      if (mb) mb.status = 'left';
      leaveFutureMatches(g.id, user.id);
      return noContent();
    }),
  ),

  http.get(
    api('/groups/:groupId/members'),
    authed(({ params, request }, user) => {
      const g = groupOrFail(String(params.groupId), user.id);
      const url = new URL(request.url);
      const type = url.searchParams.get('type');
      const q = (url.searchParams.get('q') ?? '').toLowerCase();
      const items = db.memberships
        .filter((m) => m.groupId === g.id && m.status === 'active' && (!type || m.type === type))
        .filter((m) => {
          const u = findUser(m.userId);
          return !q || (u && (u.name.toLowerCase().includes(q) || u.nickname.includes(q)));
        })
        .sort((a, b) =>
          isOwner(g.id, a.userId)
            ? -1
            : isOwner(g.id, b.userId)
              ? 1
              : (findUser(a.userId)?.name ?? '').localeCompare(findUser(b.userId)?.name ?? ''),
        )
        .map((m) => toMember(m, user.id));
      return json({ items, nextCursor: null });
    }),
  ),

  http.post(
    api('/groups/:groupId/members'),
    authed(async ({ params, request }, user) => {
      const g = ownerOrFail(String(params.groupId), user.id);
      const body = (await request.json()) as { nickname: string; type: 'monthly' | 'drop_in' };
      const target = db.users.find((u) => u.nickname === body.nickname.replace(/^@/, '').toLowerCase());
      if (!target) return problem(404, 'USER_NOT_FOUND');
      if (membershipOf(g.id, target.id)) return problem(409, 'ALREADY_MEMBER');
      const old = db.memberships.find((m) => m.groupId === g.id && m.userId === target.id);
      const mb = old ?? {
        id: newId('mb'),
        groupId: g.id,
        userId: target.id,
        type: body.type,
        status: 'active' as const,
        joinedAt: nowIso(),
        level: null,
        skills: null,
      };
      mb.status = 'active';
      mb.type = body.type;
      if (!old) db.memberships.push(mb);
      return json(toMember(mb, user.id), 201);
    }),
  ),

  http.patch(
    api('/groups/:groupId/members/:memberId'),
    authed(async ({ params, request }, user) => {
      const g = ownerOrFail(String(params.groupId), user.id);
      const mb = db.memberships.find((m) => m.id === params.memberId && m.groupId === g.id && m.status === 'active');
      if (!mb) return problem(404, 'NOT_FOUND');
      const body = (await request.json()) as {
        type?: 'monthly' | 'drop_in';
        level?: number | null;
        skills?: Record<string, number> | null;
      };
      if (body.level !== undefined) {
        if (body.level !== null && !(Number.isInteger(body.level) && body.level >= 1 && body.level <= 5))
          return problem(400, 'VALIDATION_ERROR', { fields: { level: 'De 1 a 5' } });
        mb.level = body.level; // RN-17
      }
      if (body.skills !== undefined) {
        // RN-17a: só fundamentos da modalidade, notas inteiras de 1 a 10; null apaga
        const allowed = new Set(SPORTS.find((s) => s.id === findGroup(mb.groupId)?.sportId)?.skills.map((k) => k.id));
        const entries = Object.entries(body.skills ?? {});
        if (entries.some(([k, n]) => !allowed.has(k) || !(Number.isInteger(n) && n >= 1 && n <= 10)))
          return problem(400, 'VALIDATION_ERROR', {
            fields: { skills: 'Notas de 1 a 10 nos fundamentos da modalidade' },
          });
        mb.skills = entries.length ? Object.fromEntries(entries) : null;
      }
      if (body.type) mb.type = body.type;
      return json(toMember(mb, user.id));
    }),
  ),

  http.delete(
    api('/groups/:groupId/members/:memberId'),
    authed(({ params }, user) => {
      const g = ownerOrFail(String(params.groupId), user.id);
      const mb = db.memberships.find((m) => m.id === params.memberId && m.groupId === g.id && m.status === 'active');
      if (!mb) return problem(404, 'NOT_FOUND');
      if (mb.userId === g.ownerId) return problem(422, 'OWNER_CANNOT_LEAVE', { rule: 'RN-11' });
      mb.status = 'removed';
      leaveFutureMatches(g.id, mb.userId);
      return noContent();
    }),
  ),

  // ── Passar a turma (RN-11a)
  http.post(
    api('/groups/:groupId/transfer'),
    authed(async ({ params, request }, user) => {
      const g = ownerOrFail(String(params.groupId), user.id);
      const { memberId } = (await request.json()) as { memberId: string };
      const mb = db.memberships.find((m) => m.id === memberId && m.groupId === g.id && m.status === 'active');
      if (!mb || mb.userId === user.id) return problem(404, 'NOT_FOUND');
      g.ownerId = mb.userId;
      return json(toGroup(g, user.id));
    }),
  ),

  // ── Foto da turma: o app já manda reduzida (256×256); aqui só confere tipo e tamanho
  http.put(
    api('/groups/:groupId/photo'),
    authed(async ({ params, request }, user) => {
      const g = ownerOrFail(String(params.groupId), user.id);
      const photoUrl = await smallImageDataUrl(request);
      if (!photoUrl)
        return problem(400, 'VALIDATION_ERROR', { fields: { file: 'Envie uma foto JPEG, PNG ou WebP de até 300 KB' } });
      g.photoUrl = photoUrl;
      return json({ photoUrl });
    }),
  ),

  http.delete(
    api('/groups/:groupId/photo'),
    authed(({ params }, user) => {
      const g = ownerOrFail(String(params.groupId), user.id);
      g.photoUrl = null;
      return noContent();
    }),
  ),
];
