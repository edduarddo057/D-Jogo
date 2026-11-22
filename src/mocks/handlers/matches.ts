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
  scheduleDates,
  unpublish,
} from '../domain/attendance';
import { notify, shortDate, shortWhen } from '../domain/notify';
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
  repeatWeekly?: boolean;
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
      const seriesId = body.repeatWeekly ? newId('s') : null;
      const make = (weeks: number): DbMatch => {
        const shift = (iso: string) => new Date(new Date(iso).getTime() + weeks * 7 * 86_400_000).toISOString();
        const m: DbMatch = {
          id: newId('m'),
          groupId,
          title: body.title.trim(),
          startsAt: shift(body.startsAt),
          endsAt: shift(body.endsAt),
          location: body.location ?? group.location,
          capacity: body.capacity ?? group.defaultCapacity,
          dropInFeeCents: body.dropInFeeCents ?? group.dropInFeeCents,
          responseDeadline: weeks === 0 ? responseDeadline : defaultDeadline(groupId, shift(body.startsAt)),
          listOpensAt: null,
          withdrawalDeadline: null,
          repeatsWeekly: Boolean(body.repeatWeekly),
          seriesId,
          status: 'draft',
          cancelReason: null,
          openNotified: false,
        };
        scheduleDates(m);
        db.matches.push(m);
        if (body.publish !== false) publish(m);
        return m;
      };
      const first = make(0);
      // "Repetir todo sábado": os próximos 3 jogos já ficam criados (RN-20c)
      if (body.repeatWeekly) for (let w = 1; w <= 3; w += 1) make(w);
      return json(toMatch(first, user.id), 201);
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
        ...(body.repeatWeekly !== undefined && { repeatsWeekly: body.repeatWeekly }),
        responseDeadline:
          body.startsAt !== undefined && body.responseDeadline === undefined
            ? defaultDeadline(m.groupId, startsAt)
            : deadline,
      });
      if (body.startsAt !== undefined) scheduleDates(m);
      if (grew) releaseSpot(m); // RN-27
      if (m.status === 'open' && (body.startsAt !== undefined || body.location !== undefined)) {
        const g = findGroup(m.groupId);
        for (const p of participationsOf(m.id).filter((x) =>
          ['confirmed', 'awaiting_payment', 'pending', 'waitlisted'].includes(x.status),
        ))
          notify(p.userId, {
            kind: 'match_changed',
            category: 'waitlist',
            title: 'Jogo alterado',
            detail: `${g?.name ?? ''} · agora ${shortDate(m.startsAt)}, ${shortWhen(m.startsAt).split(', ')[1] ?? ''}`,
            groupId: m.groupId,
            matchId: m.id,
          });
      }
      return matchJson(m, user.id);
    }),
  ),

  // ── Ciclo de vida (RN-20, RN-40 a RN-43)
  transition('publish', (m) => publish(m)),
  transition('unpublish', (m) => unpublish(m)),
  transition('close', (m) => close(m)),
  transition('reopen', (m) => {
    if (m.status !== 'closed') throw new RuleError('MATCH_INVALID_TRANSITION', 'RN-41');
    m.status = 'open';
  }),
  transition('start', (m) => {
    if (m.status !== 'closed' && m.status !== 'open') throw new RuleError('MATCH_INVALID_TRANSITION', 'RN-42');
    if (m.status === 'open') close(m);
    m.status = 'in_progress';
  }),
  transition('finish', (m) => {
    if (m.status !== 'in_progress') throw new RuleError('MATCH_INVALID_TRANSITION', 'RN-42');
    m.status = 'finished';
    // Resumo do dia pronto: visível para todos os membros (RN-108)
    if (db.rounds.some((r) => r.matchId === m.id)) {
      const g = findGroup(m.groupId);
      for (const mb of db.memberships.filter((x) => x.groupId === m.groupId && x.status === 'active'))
        notify(mb.userId, {
          kind: 'day_summary_ready',
          category: 'day_summary',
          title: 'Resumo do dia pronto',
          detail: `${g?.name ?? ''}, ${shortDate(m.startsAt)}`,
          groupId: m.groupId,
          matchId: m.id,
        });
    }
  }),
  transition('cancel', (m, body) => {
    if (['in_progress', 'finished', 'cancelled'].includes(m.status))
      throw new RuleError('MATCH_INVALID_TRANSITION', 'RN-43');
    const reason = String(body.reason ?? '').trim();
    if (reason.length < 3) throw new RuleError('VALIDATION_ERROR');
    m.status = 'cancelled';
    m.cancelReason = reason;
    const g = findGroup(m.groupId);
    for (const p of participationsOf(m.id).filter((x) =>
      ['confirmed', 'awaiting_payment', 'pending', 'waitlisted'].includes(x.status),
    ))
      notify(p.userId, {
        kind: 'match_cancelled',
        category: 'waitlist',
        title: 'Jogo cancelado',
        detail: `${g?.name ?? ''}, ${shortDate(m.startsAt)} · ${reason}`,
        groupId: m.groupId,
        matchId: m.id,
      });
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
      if (m.status !== 'open' && m.status !== 'closed' && m.status !== 'in_progress') fail('MATCH_NOT_OPEN');
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

  // ── Lembrar quem não respondeu (RN-111)
  http.post(
    api('/matches/:matchId/reminders'),
    authed(async ({ params, request }, user) => {
      const m = ownedMatchOrFail(String(params.matchId), user.id);
      if (m.status !== 'open') fail('MATCH_NOT_OPEN');
      applyDeadlines(m);
      const body = (await request.json().catch(() => ({}))) as { userIds?: string[] };
      const g = findGroup(m.groupId);
      const targets = participationsOf(m.id)
        .filter((p) => p.status === 'pending' && (!body.userIds || body.userIds.includes(p.userId)))
        .map((p) => p.userId);
      const ids = targets.map(
        (userId) =>
          notify(userId, {
            kind: 'response_reminder',
            category: 'lists',
            title: `Você vai? ${g?.name ?? ''}`,
            detail: `${shortDate(m.startsAt)} · responda até ${shortWhen(m.responseDeadline)}`,
            groupId: m.groupId,
            matchId: m.id,
          }).id,
      );
      const reminder = { id: newId('rem'), notificationIds: ids };
      db.reminders.push(reminder);
      return json({ reminderId: reminder.id, sent: ids.length }, 201);
    }),
  ),

  http.delete(
    api('/reminders/:reminderId'),
    authed(({ params }) => {
      const reminder = db.reminders.find((r) => r.id === params.reminderId);
      if (reminder) {
        db.notifications = db.notifications.filter((n) => !(reminder.notificationIds.includes(n.id) && !n.readAt));
        db.reminders = db.reminders.filter((r) => r !== reminder);
      }
      return noContent();
    }),
  ),
];
