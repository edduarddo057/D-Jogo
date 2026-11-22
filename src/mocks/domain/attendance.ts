import type { Schema } from '@/lib/http';
import {
  db,
  findGroup,
  findMatch,
  localTimeBefore,
  membershipOf,
  newId,
  nowIso,
  participationsOf,
  type DbMatch,
  type DbParticipation,
} from '../db';
import { brl, notify, notifyListOpened, shortDate, shortWhen } from './notify';

/**
 * Regras de presença, vagas e lista de espera — as mesmas do back-end (docs/backend/business-rules.md).
 * Usadas pelos handlers dos mocks; prazos são avaliados de forma preguiçosa a cada leitura/escrita.
 */
type Status = Schema<'ParticipationStatus'>;
const OCCUPYING: Status[] = ['confirmed', 'awaiting_payment', 'pending'];

export class RuleError extends Error {
  constructor(
    readonly code: Schema<'Problem'>['code'],
    readonly rule?: string,
  ) {
    super(code);
  }
}

export const occupied = (matchId: string) =>
  participationsOf(matchId).filter((p) => OCCUPYING.includes(p.status)).length;
export const freeSpots = (m: DbMatch) => Math.max(0, m.capacity - occupied(m.id));

export function countsOf(m: DbMatch, forOwner: boolean): Schema<'MatchCounts'> {
  const ps = participationsOf(m.id);
  const by = (s: Status) => ps.filter((p) => p.status === s).length;
  const toReview = db.payments.filter((p) => p.matchId === m.id && p.status === 'reported').length;
  return {
    capacity: m.capacity,
    confirmed: by('confirmed'),
    pending: by('pending'),
    awaitingPayment: by('awaiting_payment'),
    waitlisted: by('waitlisted'),
    declined: by('declined'),
    freeSpots: freeSpots(m),
    ...(forOwner ? { paymentsToReview: toReview } : {}),
  };
}

/** Fila (RN-30, manual 4.2): mensalista vem antes de avulso; dentro de cada um, ordem de chegada. */
export const waitlist = (matchId: string) =>
  participationsOf(matchId)
    .filter((p) => p.status === 'waitlisted')
    .sort(
      (a, b) =>
        (a.membershipType === 'monthly' ? 0 : 1) - (b.membershipType === 'monthly' ? 0 : 1) ||
        (a.waitlistedAt ?? '').localeCompare(b.waitlistedAt ?? ''),
    );

/** Cobrança do avulso ao ganhar a vaga (RN-60). */
function createMatchFee(m: DbMatch, p: DbParticipation) {
  const id = newId('pay');
  db.payments.push({
    id,
    groupId: m.groupId,
    userId: p.userId,
    kind: 'match_fee',
    matchId: m.id,
    referenceMonth: null,
    amountCents: m.dropInFeeCents,
    status: 'pending',
    method: null,
    reportedAt: null,
    reportNote: null,
    reviewedAt: null,
    rejectionReason: null,
    createdAt: nowIso(),
    prevStatus: null,
  });
  p.paymentId = id;
}

/** Oferece a vaga: mensalista confirma; avulso paga dentro do prazo (RN-23, RN-24, RN-31). */
export function offerSpot(m: DbMatch, p: DbParticipation, fromWaitlist = false) {
  p.waitlistedAt = null;
  const group = findGroup(m.groupId);
  if (p.membershipType === 'monthly' || m.dropInFeeCents === 0) {
    p.status = 'confirmed';
    if (fromWaitlist)
      notify(p.userId, {
        kind: 'waitlist_promoted',
        category: 'waitlist',
        title: 'Abriu vaga: você entrou',
        detail: `${group?.name ?? ''} · ${shortDate(m.startsAt)}`,
        groupId: m.groupId,
        matchId: m.id,
      });
    return;
  }
  const windowMs = (group?.rules.dropInPaymentWindowMinutes ?? 120) * 60_000;
  const deadline = Math.min(Date.now() + windowMs, new Date(m.startsAt).getTime());
  p.status = 'awaiting_payment';
  p.offeredAt = nowIso();
  p.paymentDeadline = new Date(deadline).toISOString();
  if (!p.paymentId || db.payments.find((x) => x.id === p.paymentId)?.status === 'cancelled') createMatchFee(m, p);
  if (fromWaitlist)
    notify(p.userId, {
      kind: 'waitlist_promoted',
      category: 'waitlist',
      title: 'Abriu vaga: pague para garantir',
      detail: `${group?.name ?? ''} · ${brl(m.dropInFeeCents)} até ${shortWhen(p.paymentDeadline)}`,
      groupId: m.groupId,
      matchId: m.id,
      paymentId: p.paymentId,
    });
}

/** Vaga liberada: promove a fila se a turma permite (RN-31). */
export function releaseSpot(m: DbMatch) {
  const group = findGroup(m.groupId);
  if (!group?.rules.waitlistAutoPromote || m.status !== 'open') return;
  while (freeSpots(m) > 0) {
    const next = waitlist(m.id)[0];
    if (!next) break;
    offerSpot(m, next, true);
  }
}

function cancelPendingFee(p: DbParticipation) {
  const pay = p.paymentId ? db.payments.find((x) => x.id === p.paymentId) : undefined;
  if (pay && (pay.status === 'pending' || pay.status === 'rejected')) pay.status = 'cancelled';
}

/** Avalia prazos vencidos (RN-21, RN-24). Chamado antes de qualquer leitura/escrita da partida. */
export function applyDeadlines(m: DbMatch) {
  if (m.status !== 'open') return;
  const now = Date.now();
  if (!m.openNotified && listIsOpen(m)) notifyListOpened(m.id);
  let released = false;
  for (const p of participationsOf(m.id)) {
    if (p.status === 'awaiting_payment' && p.paymentDeadline && new Date(p.paymentDeadline).getTime() < now) {
      const pay = p.paymentId ? db.payments.find((x) => x.id === p.paymentId) : undefined;
      if (pay?.status === 'reported') continue; // avisou que pagou: o relógio parou
      p.status = 'expired';
      cancelPendingFee(p);
      released = true;
    }
  }
  const group = findGroup(m.groupId);
  if (group?.rules.autoReleaseUnanswered && new Date(m.responseDeadline).getTime() < now) {
    for (const p of participationsOf(m.id)) {
      if (p.status === 'pending') {
        p.status = 'expired';
        released = true;
      }
    }
  }
  if (released) releaseSpot(m);
}

/** A lista já abriu para respostas? (RN-20b) */
export const listIsOpen = (m: DbMatch) => !m.listOpensAt || new Date(m.listOpensAt).getTime() <= Date.now();

/** Datas calculadas pelas regras da turma ao publicar (RN-20, RN-20b, RN-28a). */
export function scheduleDates(m: DbMatch) {
  const rules = findGroup(m.groupId)?.rules;
  if (!rules) return;
  const opens = localTimeBefore(m.startsAt, rules.listOpens.daysBefore, rules.listOpens.time);
  m.listOpensAt = opens.getTime() < new Date(m.startsAt).getTime() ? opens.toISOString() : null;
  m.withdrawalDeadline = new Date(
    new Date(m.startsAt).getTime() - rules.withdrawalDeadlineHours * 3_600_000,
  ).toISOString();
}

/** "Vou jogar" / "Não vou" (RN-22, RN-23, RN-25, RN-28). */
export function respond(
  matchId: string,
  userId: string,
  going: boolean,
): { participation: DbParticipation; outcome: Schema<'Participation'>['status'] | 'left' } {
  const m = findMatch(matchId);
  if (!m) throw new RuleError('NOT_FOUND');
  const membership = membershipOf(m.groupId, userId);
  if (!membership) throw new RuleError('NOT_FOUND');
  if (m.status !== 'open') throw new RuleError('MATCH_NOT_OPEN', 'RN-28');
  if (!listIsOpen(m)) throw new RuleError('LIST_NOT_OPEN_YET', 'RN-20b');
  applyDeadlines(m);

  let p = participationsOf(m.id).find((x) => x.userId === userId);
  if (!p) {
    p = {
      id: newId('p'),
      matchId: m.id,
      userId,
      membershipType: membership.type,
      status: 'declined',
      source: 'self',
      waitlistedAt: null,
      offeredAt: null,
      paymentDeadline: null,
      respondedAt: null,
      paymentId: null,
      lateWithdrawal: false,
    };
    db.participations.push(p);
  }
  p.respondedAt = nowIso();

  if (!going) {
    const wasOccupying = OCCUPYING.includes(p.status);
    const wasWaiting = p.status === 'waitlisted';
    // desistiu de uma vaga depois do prazo: fica registrado como desistência tardia (RN-28a)
    p.lateWithdrawal =
      wasOccupying &&
      p.status !== 'pending' &&
      !!m.withdrawalDeadline &&
      new Date(m.withdrawalDeadline).getTime() < Date.now();
    p.status = p.membershipType === 'monthly' && !wasWaiting ? 'declined' : 'left';
    p.waitlistedAt = null;
    cancelPendingFee(p);
    if (wasOccupying) releaseSpot(m);
    return { participation: p, outcome: p.status === 'left' ? 'left' : 'declined' };
  }

  if (p.status === 'confirmed' || p.status === 'awaiting_payment' || p.status === 'waitlisted') {
    return { participation: p, outcome: p.status };
  }
  p.lateWithdrawal = false;
  if (p.status === 'pending') {
    p.status = 'confirmed'; // vaga já reservada (RN-20)
    return { participation: p, outcome: 'confirmed' };
  }
  // sem vaga reservada: precisa de vaga livre e de fila vazia (RN-22, RN-31)
  if (freeSpots(m) > 0 && waitlist(m.id).length === 0) {
    offerSpot(m, p);
  } else {
    p.status = 'waitlisted';
    p.waitlistedAt = nowIso();
  }
  return { participation: p, outcome: p.status };
}

/** Dono sobe alguém da fila (modo manual, RN-31). */
export function promote(m: DbMatch, participationId: string) {
  applyDeadlines(m);
  const p = participationsOf(m.id).find((x) => x.id === participationId);
  if (!p || p.status !== 'waitlisted') throw new RuleError('NOT_ON_WAITLIST', 'RN-31');
  if (freeSpots(m) <= 0) throw new RuleError('NO_FREE_SPOT', 'RN-31');
  offerSpot(m, p, true);
  return p;
}

/** Dono adiciona membro direto como confirmado (RN-26). */
export function addConfirmed(m: DbMatch, userId: string) {
  applyDeadlines(m);
  const membership = membershipOf(m.groupId, userId);
  if (!membership) throw new RuleError('NOT_FOUND');
  let p = participationsOf(m.id).find((x) => x.userId === userId);
  const alreadyOccupying = p && OCCUPYING.includes(p.status);
  // no dia de jogo, quem chegou e não estava na lista entra mesmo sem vaga (RN-101a)
  if (!alreadyOccupying && freeSpots(m) <= 0 && m.status !== 'in_progress')
    throw new RuleError('NO_FREE_SPOT', 'RN-26');
  if (!p) {
    p = {
      id: newId('p'),
      matchId: m.id,
      userId,
      membershipType: membership.type,
      status: 'confirmed',
      source: 'organizer',
      waitlistedAt: null,
      offeredAt: null,
      paymentDeadline: null,
      respondedAt: nowIso(),
      paymentId: null,
      lateWithdrawal: false,
    };
    db.participations.push(p);
  } else {
    p.status = 'confirmed';
    p.source = 'organizer';
    p.waitlistedAt = null;
  }
  return p;
}

export function removeParticipation(m: DbMatch, participationId: string) {
  const p = participationsOf(m.id).find((x) => x.id === participationId);
  if (!p) throw new RuleError('NOT_FOUND');
  const wasOccupying = OCCUPYING.includes(p.status);
  p.status = 'removed';
  p.waitlistedAt = null;
  cancelPendingFee(p);
  if (wasOccupying) releaseSpot(m);
}

/** Cria as presenças `pending` dos mensalistas ao publicar (RN-20). */
export function publish(m: DbMatch) {
  if (m.status !== 'draft') throw new RuleError('MATCH_INVALID_TRANSITION');
  m.status = 'open';
  scheduleDates(m);
  m.openNotified = false;
  for (const mb of db.memberships.filter(
    (x) => x.groupId === m.groupId && x.status === 'active' && x.type === 'monthly',
  )) {
    if (!participationsOf(m.id).some((p) => p.userId === mb.userId)) {
      db.participations.push({
        id: newId('p'),
        matchId: m.id,
        userId: mb.userId,
        membershipType: 'monthly',
        status: 'pending',
        source: 'auto',
        waitlistedAt: null,
        offeredAt: null,
        paymentDeadline: null,
        respondedAt: null,
        paymentId: null,
        lateWithdrawal: false,
      });
    }
  }
  if (listIsOpen(m)) notifyListOpened(m.id);
}

/** Desfaz a publicação enquanto ninguém respondeu (RN-20a). */
export function unpublish(m: DbMatch) {
  if (m.status !== 'open') throw new RuleError('MATCH_INVALID_TRANSITION', 'RN-20a');
  if (participationsOf(m.id).some((p) => p.respondedAt)) throw new RuleError('ALREADY_ANSWERED', 'RN-20a');
  db.participations = db.participations.filter((p) => p.matchId !== m.id);
  db.notifications = db.notifications.filter((n) => !(n.matchId === m.id && n.kind === 'list_opened' && !n.readAt));
  m.status = 'draft';
  m.openNotified = false;
}

/** Fechar lista (RN-40). */
export function close(m: DbMatch) {
  if (m.status !== 'open') throw new RuleError('MATCH_INVALID_TRANSITION');
  applyDeadlines(m);
  if (db.payments.some((p) => p.matchId === m.id && p.status === 'reported'))
    throw new RuleError('PAYMENTS_TO_REVIEW', 'RN-40');
  for (const p of participationsOf(m.id)) {
    if (p.status === 'awaiting_payment' || p.status === 'pending') {
      p.status = 'expired';
      cancelPendingFee(p);
    }
  }
  m.status = 'closed';
}

/** Confirma o avulso quando o pagamento é validado (RN-62). */
export function onPaymentApproved(paymentId: string) {
  const p = db.participations.find((x) => x.paymentId === paymentId);
  if (p && (p.status === 'awaiting_payment' || p.status === 'expired')) {
    p.status = 'confirmed';
    p.paymentDeadline = null;
  }
}

/** Recusa: o prazo volta a contar com no mínimo 30 minutos (RN-62). */
export function onPaymentRejected(paymentId: string) {
  const p = db.participations.find((x) => x.paymentId === paymentId);
  if (p?.status === 'awaiting_payment') {
    const min = Date.now() + 30 * 60_000;
    const current = p.paymentDeadline ? new Date(p.paymentDeadline).getTime() : 0;
    p.paymentDeadline = new Date(Math.max(min, current)).toISOString();
  }
}

/**
 * Iniciar o jogo (RN-100): quem ainda não respondeu expira. O avulso que pegou a vaga e ainda não
 * pagou continua na lista e aparece na chegada com "Deve R$ 25" (manual 4.3) — nada trava o jogo.
 */
export function startForLive(m: DbMatch) {
  if (m.status === 'cancelled' || m.status === 'finished') throw new RuleError('LIVE_NOT_AVAILABLE', 'RN-100');
  if (m.status === 'in_progress') return;
  if (m.status === 'draft') throw new RuleError('MATCH_INVALID_TRANSITION', 'RN-100');
  applyDeadlines(m);
  for (const p of participationsOf(m.id)) {
    if (p.status === 'pending') p.status = 'expired';
    if (p.status === 'awaiting_payment') p.paymentDeadline = null;
  }
  m.status = 'in_progress';
}
