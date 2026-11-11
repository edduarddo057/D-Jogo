import { http } from 'msw';
import { activeMembers, db, findGroup, findMatch, membershipOf, newId, nowIso, type DbPayment } from '../db';
import { applyDeadlines, onPaymentApproved, onPaymentRejected, RuleError } from '../domain/attendance';
import { isOwner, toLedger, toPayment } from '../serializers';
import { api, authed, fail, json, noContent, problem } from '../utils';

const today = () => new Date().toISOString().slice(0, 10);
const monthOf = (isoDate: string) => isoDate.slice(0, 7);

function paymentOrFail(paymentId: string) {
  const p = db.payments.find((x) => x.id === paymentId);
  if (!p) return fail('NOT_FOUND');
  return p;
}

function ownerOfGroupOrFail(groupId: string, userId: string) {
  const g = findGroup(groupId);
  if (!g || !membershipOf(groupId, userId)) return fail('NOT_FOUND');
  if (g.ownerId !== userId) fail('FORBIDDEN');
  return g;
}

function describe(p: DbPayment) {
  if (p.kind === 'monthly_fee') return `Mensalidade ${p.referenceMonth ?? ''}`.trim();
  const m = p.matchId ? findMatch(p.matchId) : undefined;
  return `Avulso · ${m?.title ?? 'partida'}`;
}

/** Validação → entrada automática no caixa (RN-70). */
function markPaid(p: DbPayment, method: DbPayment['method']) {
  p.status = 'paid';
  p.method = method ?? p.method ?? 'pix';
  p.reviewedAt = nowIso();
  p.rejectionReason = null;
  db.ledger.push({
    id: newId('le'),
    groupId: p.groupId,
    direction: 'in',
    amountCents: p.amountCents,
    description: describe(p),
    occurredOn: today(),
    source: 'payment',
    paymentId: p.id,
  });
  onPaymentApproved(p.id);
}

export const paymentHandlers = [
  // ── Cobranças da turma (dono)
  http.get(
    api('/groups/:groupId/payments'),
    authed(({ params, request }, user) => {
      const g = ownerOfGroupOrFail(String(params.groupId), user.id);
      const url = new URL(request.url);
      const statuses = url.searchParams.get('status')?.split(',').filter(Boolean);
      const kind = url.searchParams.get('kind');
      const matchId = url.searchParams.get('matchId');
      const month = url.searchParams.get('month');
      for (const m of db.matches.filter((x) => x.groupId === g.id)) applyDeadlines(m);
      const items = db.payments
        .filter((p) => p.groupId === g.id)
        .filter((p) => !statuses || statuses.includes(p.status))
        .filter((p) => !kind || p.kind === kind)
        .filter((p) => !matchId || p.matchId === matchId)
        .filter(
          (p) => !month || p.referenceMonth === month || (p.kind === 'match_fee' && monthOf(p.createdAt) === month),
        )
        .sort((a, b) => (b.reportedAt ?? b.createdAt).localeCompare(a.reportedAt ?? a.createdAt));
      return json({ items: items.map(toPayment), nextCursor: null });
    }),
  ),

  http.post(
    api('/groups/:groupId/payments'),
    authed(async ({ params, request }, user) => {
      const g = ownerOfGroupOrFail(String(params.groupId), user.id);
      const body = (await request.json()) as {
        userId: string;
        kind: DbPayment['kind'];
        matchId?: string;
        referenceMonth?: string;
        amountCents: number;
        method: NonNullable<DbPayment['method']>;
      };
      // Já existe cobrança em aberto para isso? Marca ela como paga (RN-64).
      const open = db.payments.find(
        (p) =>
          p.groupId === g.id &&
          p.userId === body.userId &&
          p.kind === body.kind &&
          (body.kind === 'monthly_fee' ? p.referenceMonth === body.referenceMonth : p.matchId === body.matchId) &&
          ['pending', 'reported', 'rejected'].includes(p.status),
      );
      if (open) {
        open.amountCents = body.amountCents;
        markPaid(open, body.method);
        return json(toPayment(open), 201);
      }
      const already = db.payments.find(
        (p) =>
          p.groupId === g.id &&
          p.userId === body.userId &&
          p.kind === 'monthly_fee' &&
          body.kind === 'monthly_fee' &&
          p.referenceMonth === body.referenceMonth &&
          p.status === 'paid',
      );
      if (already) return problem(409, 'PAYMENT_INVALID_TRANSITION');
      const p: DbPayment = {
        id: newId('pay'),
        groupId: g.id,
        userId: body.userId,
        kind: body.kind,
        matchId: body.matchId ?? null,
        referenceMonth: body.referenceMonth ?? null,
        amountCents: body.amountCents,
        status: 'pending',
        method: null,
        reportedAt: null,
        reportNote: null,
        reviewedAt: null,
        rejectionReason: null,
        createdAt: nowIso(),
      };
      db.payments.push(p);
      markPaid(p, body.method);
      return json(toPayment(p), 201);
    }),
  ),

  http.post(
    api('/groups/:groupId/monthly-fees'),
    authed(async ({ params, request }, user) => {
      const g = ownerOfGroupOrFail(String(params.groupId), user.id);
      const { month } = (await request.json()) as { month: string };
      let created = 0;
      let alreadyExisting = 0;
      for (const mb of activeMembers(g.id).filter((m) => m.type === 'monthly' && m.userId !== g.ownerId)) {
        const exists = db.payments.some(
          (p) =>
            p.groupId === g.id &&
            p.userId === mb.userId &&
            p.kind === 'monthly_fee' &&
            p.referenceMonth === month &&
            p.status !== 'cancelled',
        );
        if (exists) {
          alreadyExisting += 1;
          continue;
        }
        db.payments.push({
          id: newId('pay'),
          groupId: g.id,
          userId: mb.userId,
          kind: 'monthly_fee',
          matchId: null,
          referenceMonth: month,
          amountCents: g.monthlyFeeCents,
          status: 'pending',
          method: null,
          reportedAt: null,
          reportNote: null,
          reviewedAt: null,
          rejectionReason: null,
          createdAt: nowIso(),
        });
        created += 1;
      }
      return json({ created, alreadyExisting });
    }),
  ),

  // ── Jogador avisa; dono valida ou recusa
  http.post(
    api('/payments/:paymentId/report'),
    authed(async ({ params, request }, user) => {
      const p = paymentOrFail(String(params.paymentId));
      if (p.userId !== user.id) fail('FORBIDDEN');
      if (p.matchId) {
        const m = findMatch(p.matchId);
        if (m) applyDeadlines(m);
      }
      if (p.status === 'cancelled') fail('PAYMENT_WINDOW_EXPIRED', 'RN-24');
      if (p.status !== 'pending' && p.status !== 'rejected') fail('PAYMENT_INVALID_TRANSITION');
      const body = (await request.json().catch(() => ({}))) as { note?: string };
      p.status = 'reported';
      p.method = 'pix';
      p.reportedAt = nowIso();
      p.reportNote = body.note?.trim() || null;
      return json(toPayment(p));
    }),
  ),

  http.post(
    api('/payments/:paymentId/approve'),
    authed(async ({ params, request }, user) => {
      const p = paymentOrFail(String(params.paymentId));
      if (!isOwner(p.groupId, user.id)) fail('FORBIDDEN');
      if (p.status === 'paid' || p.status === 'cancelled') fail('PAYMENT_INVALID_TRANSITION', 'RN-62');
      const body = (await request.json().catch(() => ({}))) as { method?: DbPayment['method'] };
      markPaid(p, body.method ?? null);
      return json(toPayment(p));
    }),
  ),

  http.post(
    api('/payments/:paymentId/reject'),
    authed(async ({ params, request }, user) => {
      const p = paymentOrFail(String(params.paymentId));
      if (!isOwner(p.groupId, user.id)) fail('FORBIDDEN');
      if (p.status !== 'reported') fail('PAYMENT_INVALID_TRANSITION', 'RN-62');
      const { reason } = (await request.json()) as { reason: string };
      if (!reason || reason.trim().length < 3) throw new RuleError('VALIDATION_ERROR');
      p.status = 'rejected';
      p.rejectionReason = reason.trim();
      p.reviewedAt = nowIso();
      onPaymentRejected(p.id);
      return json(toPayment(p));
    }),
  ),

  // ── Caixa
  http.get(
    api('/groups/:groupId/finance/summary'),
    authed(({ params, request }, user) => {
      const g = ownerOfGroupOrFail(String(params.groupId), user.id);
      const month = new URL(request.url).searchParams.get('month') ?? today().slice(0, 7);
      const entries = db.ledger.filter((e) => e.groupId === g.id);
      const sum = (xs: typeof entries, dir: 'in' | 'out') =>
        xs.filter((e) => e.direction === dir).reduce((a, e) => a + e.amountCents, 0);
      const inMonth = entries.filter((e) => monthOf(e.occurredOn) === month);
      const [y, m] = month.split('-').map(Number) as [number, number];
      const series = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(Date.UTC(y, m - 1 - (5 - i), 1));
        const key = d.toISOString().slice(0, 7);
        const xs = entries.filter((e) => monthOf(e.occurredOn) === key);
        return { month: key, inCents: sum(xs, 'in'), outCents: sum(xs, 'out') };
      });
      const receivable = db.payments
        .filter((p) => p.groupId === g.id && (p.status === 'pending' || p.status === 'reported'))
        .reduce((a, p) => a + p.amountCents, 0);
      return json({
        month,
        balanceCents: sum(entries, 'in') - sum(entries, 'out'),
        receivedInMonthCents: sum(inMonth, 'in'),
        spentInMonthCents: sum(inMonth, 'out'),
        receivableCents: receivable,
        series,
      });
    }),
  ),

  http.get(
    api('/groups/:groupId/finance/entries'),
    authed(({ params, request }, user) => {
      const g = ownerOfGroupOrFail(String(params.groupId), user.id);
      const month = new URL(request.url).searchParams.get('month');
      const items = db.ledger
        .filter((e) => e.groupId === g.id && (!month || monthOf(e.occurredOn) === month))
        .sort((a, b) => b.occurredOn.localeCompare(a.occurredOn) || b.id.localeCompare(a.id))
        .map(toLedger);
      return json({ items, nextCursor: null });
    }),
  ),

  http.post(
    api('/groups/:groupId/finance/entries'),
    authed(async ({ params, request }, user) => {
      const g = ownerOfGroupOrFail(String(params.groupId), user.id);
      const body = (await request.json()) as {
        direction: 'in' | 'out';
        amountCents: number;
        description: string;
        occurredOn: string;
      };
      if (!body.description?.trim() || !(body.amountCents > 0))
        return problem(400, 'VALIDATION_ERROR', { fields: { amountCents: 'Informe o valor' } });
      const entry = {
        id: newId('le'),
        groupId: g.id,
        direction: body.direction,
        amountCents: body.amountCents,
        description: body.description.trim(),
        occurredOn: body.occurredOn,
        source: 'manual' as const,
        paymentId: null,
      };
      db.ledger.push(entry);
      return json(toLedger(entry), 201);
    }),
  ),

  http.delete(
    api('/groups/:groupId/finance/entries/:entryId'),
    authed(({ params }, user) => {
      const g = ownerOfGroupOrFail(String(params.groupId), user.id);
      const entry = db.ledger.find((e) => e.id === params.entryId && e.groupId === g.id);
      if (!entry) return problem(404, 'NOT_FOUND');
      if (entry.source !== 'manual') fail('LEDGER_ENTRY_NOT_MANUAL', 'RN-70');
      db.ledger = db.ledger.filter((e) => e.id !== entry.id);
      return noContent();
    }),
  ),
];
