import { http } from 'msw';
import { db, findGroup, findMatch, membershipOf, newId, nowIso, type DbDrawTemplate } from '../db';
import { drawTeams, templateRules } from '../domain/draw';
import { isOwner, toDraw, toTemplate } from '../serializers';
import { api, authed, fail, json, noContent, problem } from '../utils';

type TemplateBody = Omit<DbDrawTemplate, 'id' | 'groupId' | 'createdAt'> & { isDefault?: boolean };

function ownerGroupOrFail(groupId: string, userId: string) {
  const g = findGroup(groupId);
  if (!g || !membershipOf(groupId, userId)) return fail('NOT_FOUND');
  if (g.ownerId !== userId) fail('FORBIDDEN');
  return g;
}

function validTemplate(b: TemplateBody) {
  const fields: Record<string, string> = {};
  if (!b.name?.trim()) fields.name = 'Dê um nome';
  if (!(b.teamCount >= 2 && b.teamCount <= 8)) fields.teamCount = 'De 2 a 8 times';
  if (!(b.playersPerTeam >= 2 && b.playersPerTeam <= 12)) fields.playersPerTeam = 'De 2 a 12 por time';
  return Object.keys(fields).length ? problem(400, 'VALIDATION_ERROR', { fields }) : null;
}

const templatesOf = (groupId: string) =>
  db.drawTemplates.filter((t) => t.groupId === groupId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));

const currentDraw = (matchId: string) => db.draws.find((d) => d.matchId === matchId);

export const drawHandlers = [
  // ── Padrões (RN-50)
  http.get(
    api('/groups/:groupId/draw-templates'),
    authed(({ params }, user) => {
      const groupId = String(params.groupId);
      if (!membershipOf(groupId, user.id)) fail('NOT_FOUND');
      return json({ items: templatesOf(groupId).map(toTemplate) });
    }),
  ),

  http.post(
    api('/groups/:groupId/draw-templates'),
    authed(async ({ params, request }, user) => {
      const g = ownerGroupOrFail(String(params.groupId), user.id);
      const body = (await request.json()) as TemplateBody;
      const invalid = validTemplate(body);
      if (invalid) return invalid;
      const { isDefault, ...rest } = body;
      const t: DbDrawTemplate = {
        ...rest,
        name: rest.name.trim(),
        id: newId('dt'),
        groupId: g.id,
        createdAt: nowIso(),
      };
      db.drawTemplates.push(t);
      if (isDefault || !g.rules.defaultDrawTemplateId) g.rules.defaultDrawTemplateId = t.id;
      return json(toTemplate(t), 201);
    }),
  ),

  http.put(
    api('/groups/:groupId/draw-templates/:templateId'),
    authed(async ({ params, request }, user) => {
      const g = ownerGroupOrFail(String(params.groupId), user.id);
      const t = db.drawTemplates.find((x) => x.id === params.templateId && x.groupId === g.id);
      if (!t) return problem(404, 'NOT_FOUND');
      const body = (await request.json()) as TemplateBody;
      const invalid = validTemplate(body);
      if (invalid) return invalid;
      const { isDefault, ...rest } = body;
      Object.assign(t, rest, { name: rest.name.trim() });
      if (isDefault) g.rules.defaultDrawTemplateId = t.id;
      return json(toTemplate(t));
    }),
  ),

  http.delete(
    api('/groups/:groupId/draw-templates/:templateId'),
    authed(({ params }, user) => {
      const g = ownerGroupOrFail(String(params.groupId), user.id);
      db.drawTemplates = db.drawTemplates.filter((x) => !(x.id === params.templateId && x.groupId === g.id));
      // sempre há um padrão marcado enquanto existir algum: passa para o mais antigo
      if (g.rules.defaultDrawTemplateId === params.templateId)
        g.rules.defaultDrawTemplateId = templatesOf(g.id)[0]?.id ?? null;
      return noContent();
    }),
  ),

  // ── Sorteio da partida (RN-51 a RN-55)
  http.get(
    api('/matches/:matchId/draw'),
    authed(({ params }, user) => {
      const m = findMatch(String(params.matchId));
      if (!m || !membershipOf(m.groupId, user.id)) return problem(404, 'NOT_FOUND');
      const d = currentDraw(m.id);
      if (!d || (d.status === 'draft' && !isOwner(m.groupId, user.id))) return problem(404, 'NOT_FOUND');
      return json(toDraw(d));
    }),
  ),

  http.post(
    api('/matches/:matchId/draw'),
    authed(async ({ params, request }, user) => {
      const m = findMatch(String(params.matchId));
      if (!m || !membershipOf(m.groupId, user.id)) return problem(404, 'NOT_FOUND');
      const g = ownerGroupOrFail(m.groupId, user.id);
      if (m.status === 'teams_published') m.status = 'closed'; // refazer volta para "lista fechada" (RN-55)
      if (m.status !== 'closed') fail('LIST_NOT_CLOSED', 'RN-51');
      const body = (await request.json().catch(() => ({}))) as { templateId?: string };
      const t =
        db.drawTemplates.find(
          (x) => x.id === (body.templateId ?? g.rules.defaultDrawTemplateId) && x.groupId === g.id,
        ) ?? templatesOf(g.id)[0];
      if (!t) return problem(404, 'NOT_FOUND');
      const confirmed = db.participations.filter((p) => p.matchId === m.id && p.status === 'confirmed').length;
      if (confirmed < t.teamCount) fail('NOT_ENOUGH_PLAYERS', 'RN-52');
      const draw = drawTeams(m, templateRules(t));
      db.draws = [...db.draws.filter((d) => d.matchId !== m.id), draw];
      return json(toDraw(draw), 201);
    }),
  ),

  http.post(
    api('/matches/:matchId/draw/moves'),
    authed(async ({ params, request }, user) => {
      const m = findMatch(String(params.matchId));
      if (!m || !isOwner(m.groupId, user.id)) return problem(404, 'NOT_FOUND');
      const d = currentDraw(m.id);
      if (!d) return problem(404, 'NOT_FOUND');
      if (d.status === 'published') fail('DRAW_ALREADY_PUBLISHED', 'RN-55');
      const body = (await request.json()) as
        | { kind: 'swap'; userA: string; userB: string }
        | { kind: 'move'; userId: string; toTeamId: string; asReserve?: boolean };
      const locate = (userId: string) => {
        for (const team of d.teams) {
          const i = team.members.findIndex((x) => x.userId === userId);
          if (i >= 0) return { team, i };
        }
        return null;
      };
      if (body.kind === 'swap') {
        const a = locate(body.userA);
        const b = locate(body.userB);
        if (!a || !b) return problem(404, 'NOT_FOUND');
        const ma = a.team.members[a.i];
        const mb = b.team.members[b.i];
        if (!ma || !mb) return problem(404, 'NOT_FOUND');
        a.team.members[a.i] = { ...mb, isReserve: ma.isReserve };
        b.team.members[b.i] = { ...ma, isReserve: mb.isReserve };
      } else {
        const a = locate(body.userId);
        const target = d.teams.find((t) => t.id === body.toTeamId);
        if (!a || !target) return problem(404, 'NOT_FOUND');
        const [member] = a.team.members.splice(a.i, 1);
        if (member) target.members.push({ ...member, isReserve: body.asReserve ?? false });
      }
      return json(toDraw(d));
    }),
  ),

  http.post(
    api('/matches/:matchId/draw/publish'),
    authed(({ params }, user) => {
      const m = findMatch(String(params.matchId));
      if (!m || !isOwner(m.groupId, user.id)) return problem(404, 'NOT_FOUND');
      const d = currentDraw(m.id);
      if (!d) return problem(404, 'NOT_FOUND');
      if (m.status !== 'closed') fail('LIST_NOT_CLOSED', 'RN-55');
      d.status = 'published';
      d.publishedAt = nowIso();
      m.status = 'teams_published';
      return json(toDraw(d));
    }),
  ),
];
