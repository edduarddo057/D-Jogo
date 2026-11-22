import { http } from 'msw';
import {
  activeMembers,
  db,
  findGroup,
  findMatch,
  firstNameOf,
  membershipOf,
  newId,
  nowIso,
  type DbLedgerEntry,
  type DbPayment,
} from '../db';
import { applyDeadlines, onPaymentApproved, onPaymentRejected, RuleError } from '../domain/attendance';
import { brl, notify, notifyPaymentsToReview, shortDate } from '../domain/notify';
import { isOwner, toLedger, toPayment } from '../serializers';
import { api, authed, fail, json, problem } from '../utils';

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
  return `${p.kind === 'monthly_fee' ? 'Mensalidade' : 'Avulso'} · ${firstNameOf(p.userId)}`;
}
const MONTHS = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];
const monthName = (ym: string | null) => (ym ? (MONTHS[Number(ym.slice(5, 7)) - 1] ?? ym) : '');
function whatFor(p: DbPayment) {
  const g = findGroup(p.groupId);
  if (p.kind === 'monthly_fee') return `${g?.name ?? ''} · mensalidade de ${monthName(p.referenceMonth)}`;
  const m = p.matchId ? findMatch(p.matchId) : undefined;
  return `${g?.name ?? ''}${m ? `, ${shortDate(m.startsAt)}` : ''}`;
}

/** Validação → entrada automática no caixa (RN-70). */
function markPaid(p: DbPayment, method: DbPayment['method'], reviewerId: string) {
  p.prevStatus = p.status;
  p.status = 'paid';
  p.method = method ?? p.method ?? 'pix';
  p.reviewedAt = nowIso();
  db.ledger.push({
    id: newId('le'),
    groupId: p.groupId,
    direction: 'in',
    amountCents: p.amountCents,
    description: describe(p),
    occurredOn: today(),
    source: 'payment',
    paymentId: p.id,
    category: 'fee',
    method: p.method,
    reviewedById: reviewerId,
    reversalOf: null,
    reversedBy: null,
  });
  onPaymentApproved(p.id);
}

/** Estorno: o lançamento contrário; nada é apagado (RN-70). */
function reverse(entry: DbLedgerEntry): DbLedgerEntry {
  if (entry.reversedBy || entry.source === 'reversal') throw new RuleError('LEDGER_ENTRY_ALREADY_REVERSED', 'RN-70');
  const rev: DbLedgerEntry = {
    id: newId('le'),
    groupId: entry.groupId,
    direction: entry.direction === 'in' ? 'out' : 'in',
    amountCents: entry.amountCents,
    description: `Estorno · ${entry.description}`,
    occurredOn: today(),
    source: 'reversal',
    paymentId: entry.paymentId,
    category: entry.category,
    method: null,
    reviewedById: null,
    reversalOf: entry.id,
    reversedBy: null,
  };
  entry.reversedBy = rev.id;
  db.ledger.push(rev);
  return rev;
}

const CSV_CATEGORY: Record<DbLedgerEntry['category'], string> = {
  fee: 'Mensalidade/avulso',
  rent: 'Aluguel',
  equipment: 'Material',
  ball: 'Bola',
  bibs: 'Coletes',
  party: 'Festa',
  other: 'Outro',
};

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
        markPaid(open, body.method, user.id);
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
        prevStatus: null,
      };
      db.payments.push(p);
      markPaid(p, body.method, user.id);
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
          prevStatus: null,
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
      notifyPaymentsToReview(p.groupId);
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
      markPaid(p, body.method ?? null, user.id);
      notify(p.userId, {
        kind: 'payment_approved',
        category: 'payments',
        title: 'Pagamento aprovado',
        detail: whatFor(p),
        groupId: p.groupId,
        matchId: p.matchId,
        paymentId: p.id,
      });
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
      p.prevStatus = p.status;
      p.status = 'rejected';
      p.rejectionReason = reason.trim();
      p.reviewedAt = nowIso();
      onPaymentRejected(p.id);
      notify(p.userId, {
        kind: 'payment_rejected',
        category: 'payments',
        title: `Pagamento recusado: ${p.rejectionReason.toLowerCase()}`,
        detail: `${whatFor(p)} · envie de novo`,
        groupId: p.groupId,
        matchId: p.matchId,
        paymentId: p.id,
      });
      return json(toPayment(p));
    }),
  ),

  // ── Cobrar, recebi em mãos e desfazer (RN-64 a RN-66)
  http.post(
    api('/payments/:paymentId/charge'),
    authed(({ params }, user) => {
      const p = paymentOrFail(String(params.paymentId));
      if (!isOwner(p.groupId, user.id)) fail('FORBIDDEN');
      if (p.status !== 'pending' && p.status !== 'rejected') fail('PAYMENT_INVALID_TRANSITION', 'RN-65');
      const g = findGroup(p.groupId);
      const n = notify(p.userId, {
        kind: 'fee_charge',
        category: 'payments',
        title: `Mensalidade de ${monthName(p.referenceMonth)} em aberto`,
        detail: `${g?.name ?? ''} · ${brl(p.amountCents)}`,
        groupId: p.groupId,
        paymentId: p.id,
      });
      const reminder = { id: newId('rem'), notificationIds: [n.id] };
      db.reminders.push(reminder);
      return json({ reminderId: reminder.id, sent: 1 }, 201);
    }),
  ),

  http.post(
    api('/payments/:paymentId/receive'),
    authed(async ({ params, request }, user) => {
      const p = paymentOrFail(String(params.paymentId));
      if (!isOwner(p.groupId, user.id)) fail('FORBIDDEN');
      if (p.status === 'paid' || p.status === 'cancelled') fail('PAYMENT_INVALID_TRANSITION', 'RN-64');
      const body = (await request.json().catch(() => ({}))) as { method?: DbPayment['method'] };
      markPaid(p, body.method ?? 'cash', user.id);
      return json(toPayment(p));
    }),
  ),

  http.post(
    api('/payments/:paymentId/undo'),
    authed(({ params }, user) => {
      const p = paymentOrFail(String(params.paymentId));
      if (!isOwner(p.groupId, user.id)) fail('FORBIDDEN');
      if (!p.prevStatus || (p.status !== 'paid' && p.status !== 'rejected'))
        fail('PAYMENT_INVALID_TRANSITION', 'RN-66');
      if (p.status === 'paid') {
        const entry = db.ledger.find((e) => e.paymentId === p.id && e.source === 'payment' && !e.reversedBy);
        if (entry) reverse(entry);
        const part = db.participations.find((x) => x.paymentId === p.id);
        if (part?.status === 'confirmed') part.status = 'awaiting_payment';
      }
      // o aviso de aprovado/recusado ainda não lido some
      db.notifications = db.notifications.filter(
        (n) => !(n.paymentId === p.id && !n.readAt && (n.kind === 'payment_approved' || n.kind === 'payment_rejected')),
      );
      p.status = p.prevStatus ?? 'reported';
      p.prevStatus = null;
      p.reviewedAt = null;
      if (p.status !== 'rejected') p.rejectionReason = null;
      if (p.status === 'pending') p.method = null;
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
        .map((e) => toLedger(e, user.id));
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
        category?: DbLedgerEntry['category'];
      };
      if (!(body.amountCents > 0))
        return problem(400, 'VALIDATION_ERROR', { fields: { amountCents: 'Informe o valor' } });
      if (!body.description?.trim() || body.description.trim().length < 2)
        return problem(400, 'VALIDATION_ERROR', { fields: { description: 'Descreva o lançamento' } });
      const entry: DbLedgerEntry = {
        id: newId('le'),
        groupId: g.id,
        direction: body.direction,
        amountCents: body.amountCents,
        description: body.description.trim(),
        occurredOn: body.occurredOn,
        source: 'manual',
        paymentId: null,
        category: body.category ?? 'other',
        method: null,
        reviewedById: null,
        reversalOf: null,
        reversedBy: null,
      };
      db.ledger.push(entry);
      return json(toLedger(entry, user.id), 201);
    }),
  ),

  http.post(
    api('/groups/:groupId/finance/entries/:entryId/reverse'),
    authed(({ params }, user) => {
      const g = ownerOfGroupOrFail(String(params.groupId), user.id);
      const entry = db.ledger.find((e) => e.id === params.entryId && e.groupId === g.id);
      if (!entry) return problem(404, 'NOT_FOUND');
      const rev = reverse(entry);
      // estornar a entrada de um pagamento volta a cobrança para "pendente"
      const p = entry.paymentId ? db.payments.find((x) => x.id === entry.paymentId) : undefined;
      if (p && p.status === 'paid' && entry.direction === 'in') {
        p.status = 'pending';
        p.method = null;
        p.reviewedAt = null;
        p.prevStatus = null;
      }
      return json(toLedger(rev, user.id), 201);
    }),
  ),

  http.get(
    api('/groups/:groupId/finance/entries/export'),
    authed(({ params, request }, user) => {
      const g = ownerOfGroupOrFail(String(params.groupId), user.id);
      const month = new URL(request.url).searchParams.get('month');
      const rows = db.ledger
        .filter((e) => e.groupId === g.id && (!month || monthOf(e.occurredOn) === month))
        .sort((a, b) => a.occurredOn.localeCompare(b.occurredOn))
        .map((e) =>
          [
            e.occurredOn.split('-').reverse().join('/'),
            e.direction === 'in' ? 'Entrada' : 'Saída',
            `"${e.description.replace(/"/g, '""')}"`,
            CSV_CATEGORY[e.category],
            (((e.direction === 'in' ? 1 : -1) * e.amountCents) / 100).toFixed(2).replace('.', ','),
          ].join(';'),
        );
      const csv = ['Data;Tipo;Descrição;Categoria;Valor (R$)', ...rows].join('\r\n');
      return new Response(`\uFEFF${csv}`, { headers: { 'Content-Type': 'text/csv; charset=utf-8' } });
    }),
  ),
];
