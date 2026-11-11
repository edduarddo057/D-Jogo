import { http } from 'msw';
import { db, findGroup, findMatch, membershipOf, newId, participationsOf, type DbMatch } from '../db';
import {
  addConfirmed,
  applyDeadlines,
  close,
  countsOf,
  occupied,
  promote,
  publish,
  releaseSpot,
  removeParticipation,
  respond,
  RuleError,
} from '../domain/attendance';
import { isOwner, toMatch, toMatchSummary, toParticipation } from '../serializers';
import { api, authed, fail, json, noContent, problem } from '../utils';

/** Turma da qual a pessoa não participa: 404, para não revelar que existe (business-rules › 8). */
function matchOrFail(matchId: string, userId: string): DbMatch {
  const m = findMatch(matchId);
  if (!m || !membershipOf(m.groupId, userId)) return fail('NOT_FOUND');
  return m;
}

function ownedMatchOrFail(matchId: string, userId: string): DbMatch {
  const m = matchOrFail(matchId, userId);
  if (!isOwner(m.groupId, userId)) fail('FORBIDDEN');
  return m;
}

const matchJson = (m: DbMatch, userId: string) => json(toMatch(m, userId));

/** Prazo padrão do mensalista (RN-20): X dias antes, no horário da regra, no fuso da turma (BRT, −03:00). */
export function defaultDeadline(groupId: string, startsAt: string): string {
  const rules = findGroup(groupId)?.rules;
  const start = new Date(startsAt).getTime();
  if (!rules) return new Date(start - 3_600_000).toISOString();
  const localDay = new Date(start - 3 * 3_600_000).toISOString().slice(0, 10);
  const base = new Date(`${localDay}T${rules.monthlyResponseDeadline.time}:00-03:00`).getTime();
  const deadline = base - rules.monthlyResponseDeadline.daysBefore * 86_400_000;
  return new Date(deadline < start ? deadline : start - 3_600_000).toISOString();
}

interface MatchBody {
  title?: string;
  startsAt?: string;
  endsAt?: string;
  location?: DbMatch['location'];
  capacity?: number;
  dropInFeeCents?: number;
  responseDeadline?: string;
  publish?: boolean;
}

function validate(body: MatchBody) {
  const fields: Record<string, string> = {};
  if (body.title !== undefined && body.title.trim().length < 3) fields.title = 'Mínimo de 3 letras';
  if (body.startsAt && body.endsAt && body.endsAt <= body.startsAt)
    fields.endsAt = 'O fim precisa ser depois do início';
  if (body.capacity !== undefined && (body.capacity < 2 || body.capacity > 60)) fields.capacity = 'Entre 2 e 60 vagas';
  return Object.keys(fields).length > 0 ? problem(400, 'VALIDATION_ERROR', { fields }) : null;
}

function transition(path: string, run: (m: DbMatch, body: Record<string, unknown>) => void) {
  return http.post(
    api(`/matches/:matchId/${path}`),
    authed(async ({ params, request }, user) => {
      const m = ownedMatchOrFail(String(params.matchId), user.id);
      const body = request.headers.get('Content-Type')?.includes('json')
        ? ((await request.json().catch(() => ({}))) as Record<string, unknown>)
        : {};
      run(m, body);
      return matchJson(m, user.id);
    }),
  );
}

export const matchHandlers = [
  // ── Partidas da turma
  http.get(
    api('/groups/:groupId/matches'),
    authed(({ params, request }, user) => {
      const groupId = String(params.groupId);
      if (!membershipOf(groupId, user.id)) fail('NOT_FOUND');
      const owner = isOwner(groupId, user.id);
      const scope = new URL(request.url).searchParams.get('scope') ?? 'upcoming';
      const now = new Date().toISOString();
      const items = db.matches
        .filter((m) => m.groupId === groupId && (owner || m.status !== 'draft'))
        .filter((m) =>
          scope === 'past'
            ? m.status === 'finished' || m.status === 'cancelled' || m.endsAt < now
            : m.status !== 'finished' && m.status !== 'cancelled' && m.endsAt >= now,
        )
        .sort((a, b) =>
          scope === 'past' ? b.startsAt.localeCompare(a.startsAt) : a.startsAt.localeCompare(b.startsAt),
        )
        .map((m) => toMatchSummary(m, user.id));
      return json({ items, nextCursor: null });
    }),
  ),

  http.post(
    api('/groups/:groupId/matches'),
    authed(async ({ params, request }, user) => {
      const groupId = String(params.groupId);
      const group = findGroup(groupId);
      if (!group || !membershipOf(groupId, user.id)) return fail('NOT_FOUND');
      if (group.ownerId !== user.id) fail('FORBIDDEN');
      const body = (await request.json()) as MatchBody & { title: string; startsAt: string; endsAt: string };
      const invalid = validate(body);
      if (invalid) return invalid;
      const responseDeadline = body.responseDeadline ?? defaultDeadline(groupId, body.startsAt);
      if (responseDeadline >= body.startsAt) fail('DEADLINE_AFTER_START', 'RN-20');
      const m: DbMatch = {
        id: newId('m'),
        groupId,
        title: body.title.trim(),
        startsAt: body.startsAt,
        endsAt: body.endsAt,
        location: body.location ?? group.location,
        capacity: body.capacity ?? group.defaultCapacity,
        dropInFeeCents: body.dropInFeeCents ?? group.dropInFeeCents,
        responseDeadline,
        status: 'draft',
        cancelReason: null,
      };
      db.matches.push(m);
      if (body.publish !== false) publish(m);
      return json(toMatch(m, user.id), 201);
    }),
  ),

  // ── Detalhe e edição
  http.get(
    api('/matches/:matchId'),
    authed(({ params }, user) => {
      const m = matchOrFail(String(params.matchId), user.id);
      if (m.status === 'draft' && !isOwner(m.groupId, user.id)) fail('NOT_FOUND');
      return matchJson(m, user.id);
    }),
  ),

  http.patch(
    api('/matches/:matchId'),
    authed(async ({ params, request }, user) => {
      const m = ownedMatchOrFail(String(params.matchId), user.id);
      if (m.status === 'finished' || m.status === 'cancelled' || m.status === 'in_progress')
        fail('MATCH_INVALID_TRANSITION');
      const body = (await request.json()) as MatchBody;
      const invalid = validate({ ...m, ...body });
      if (invalid) return invalid;
      applyDeadlines(m);
      if (body.capacity !== undefined && body.capacity < occupied(m.id)) fail('CAPACITY_BELOW_OCCUPIED', 'RN-27');
      const startsAt = body.startsAt ?? m.startsAt;
      const deadline = body.responseDeadline ?? m.responseDeadline;
      if (deadline >= startsAt) fail('DEADLINE_AFTER_START', 'RN-20');
      const grew = body.capacity !== undefined && body.capacity > m.capacity;
      Object.assign(m, {
        ...(body.title !== undefined && { title: body.title.trim() }),
        ...(body.startsAt !== undefined && { startsAt: body.startsAt }),
        ...(body.endsAt !== undefined && { endsAt: body.endsAt }),
        ...(body.location !== undefined && { location: body.location }),
        ...(body.capacity !== undefined && { capacity: body.capacity }),
        ...(body.dropInFeeCents !== undefined && { dropInFeeCents: body.dropInFeeCents }),
        responseDeadline: deadline,
      });
      if (grew) releaseSpot(m); // RN-27
      return matchJson(m, user.id);
    }),
  ),

  // ── Ciclo de vida (RN-20, RN-40 a RN-43)
  transition('publish', (m) => publish(m)),
  transition('close', (m) => close(m)),
  transition('reopen', (m) => {
    if (m.status !== 'closed') throw new RuleError('MATCH_INVALID_TRANSITION', 'RN-41');
    db.draws = db.draws.filter((d) => d.matchId !== m.id);
    m.status = 'open';
  }),
  transition('start', (m) => {
    if (m.status !== 'closed' && m.status !== 'teams_published')
      throw new RuleError('MATCH_INVALID_TRANSITION', 'RN-42');
    m.status = 'in_progress';
  }),
  transition('finish', (m) => {
    if (m.status !== 'in_progress') throw new RuleError('MATCH_INVALID_TRANSITION', 'RN-42');
    m.status = 'finished';
  }),
  transition('cancel', (m, body) => {
    if (['in_progress', 'finished', 'cancelled'].includes(m.status))
      throw new RuleError('MATCH_INVALID_TRANSITION', 'RN-43');
    const reason = String(body.reason ?? '').trim();
    if (reason.length < 3) throw new RuleError('VALIDATION_ERROR');
    m.status = 'cancelled';
    m.cancelReason = reason;
    for (const pay of db.payments.filter(
      (p) => p.matchId === m.id && (p.status === 'pending' || p.status === 'reported'),
    ))
      pay.status = 'cancelled';
  }),

  // ── Presenças
  http.get(
    api('/matches/:matchId/participations'),
    authed(({ params, request }, user) => {
      const m = matchOrFail(String(params.matchId), user.id);
      applyDeadlines(m);
      const statuses = new URL(request.url).searchParams.get('status')?.split(',').filter(Boolean);
      const items = participationsOf(m.id)
        .filter((p) => !statuses || statuses.includes(p.status))
        .map(toParticipation)
        .sort(
          (a, b) => (a.waitlistPosition ?? 0) - (b.waitlistPosition ?? 0) || a.user.name.localeCompare(b.user.name),
        );
      return json({ items, counts: countsOf(m, isOwner(m.groupId, user.id)) });
    }),
  ),

  http.post(
    api('/matches/:matchId/participations'),
    authed(async ({ params, request }, user) => {
      const m = ownedMatchOrFail(String(params.matchId), user.id);
      if (m.status !== 'open' && m.status !== 'closed') fail('MATCH_NOT_OPEN');
      const { userId } = (await request.json()) as { userId: string };
      return json(toParticipation(addConfirmed(m, userId)), 201);
    }),
  ),

  http.put(
    api('/matches/:matchId/participations/me'),
    authed(async ({ params, request }, user) => {
      const m = matchOrFail(String(params.matchId), user.id);
      const { response } = (await request.json()) as { response: 'going' | 'not_going' };
      const { participation, outcome } = respond(m.id, user.id, response === 'going');
      return json({
        participation: toParticipation(participation),
        counts: countsOf(m, isOwner(m.groupId, user.id)),
        outcome,
      });
    }),
  ),

  http.post(
    api('/matches/:matchId/participations/:participationId/promote'),
    authed(({ params }, user) => {
      const m = ownedMatchOrFail(String(params.matchId), user.id);
      return json(toParticipation(promote(m, String(params.participationId))));
    }),
  ),

  http.delete(
    api('/matches/:matchId/participations/:participationId'),
    authed(({ params }, user) => {
      const m = ownedMatchOrFail(String(params.matchId), user.id);
      removeParticipation(m, String(params.participationId));
      return noContent();
    }),
  ),
];
