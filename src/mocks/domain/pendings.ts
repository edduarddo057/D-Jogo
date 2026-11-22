import { activeMembers, db, findGroup, participationsOf, type DbMatch } from '../db';
import { applyDeadlines, countsOf, listIsOpen } from './attendance';

/** Jogo da vez (RN-18): o próximo publicado que não terminou nem foi cancelado. */
export function focusMatchOf(groupId: string): DbMatch | undefined {
  const now = Date.now();
  return db.matches
    .filter(
      (m) =>
        m.groupId === groupId &&
        m.status !== 'draft' &&
        m.status !== 'cancelled' &&
        m.status !== 'finished' &&
        (m.status === 'in_progress' || new Date(m.endsAt).getTime() > now),
    )
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0];
}

/** Mensalidades atrasadas: pendentes ou recusadas de meses anteriores, ou do mês depois do vencimento (RN-63). */
export function overdueFeesOf(groupId: string) {
  const group = findGroup(groupId);
  const local = new Date(Date.now() - 3 * 3_600_000);
  const month = local.toISOString().slice(0, 7);
  const pastDue = local.getUTCDate() > (group?.monthlyFeeDueDay ?? 10);
  return db.payments.filter(
    (p) =>
      p.groupId === groupId &&
      p.kind === 'monthly_fee' &&
      (p.status === 'pending' || p.status === 'rejected') &&
      p.userId !== group?.ownerId &&
      p.referenceMonth !== null &&
      (p.referenceMonth < month || (p.referenceMonth === month && pastDue)),
  );
}

/** Pendências da turma para o dono (RN-18). */
export function pendingsOf(groupId: string) {
  const group = findGroup(groupId);
  const focus = focusMatchOf(groupId);
  if (focus) applyDeadlines(focus);
  const ps = focus ? participationsOf(focus.id) : [];
  const counts = focus ? countsOf(focus, true) : null;

  const paymentsToReview = db.payments.filter((p) => p.groupId === groupId && p.status === 'reported').length;
  const monthlyIds = new Set(
    activeMembers(groupId)
      .filter((m) => m.type === 'monthly')
      .map((m) => m.userId),
  );
  const overdueFees = overdueFeesOf(groupId).filter((p) => monthlyIds.has(p.userId)).length;
  const unanswered =
    focus?.status === 'open' && listIsOpen(focus) ? ps.filter((p) => p.status === 'pending').length : 0;
  const waitlisted =
    focus?.status === 'open' && !group?.rules.waitlistAutoPromote && (counts?.freeSpots ?? 0) > 0
      ? ps.filter((p) => p.status === 'waitlisted').length
      : 0;
  const toPublish = db.matches.filter((m) => m.groupId === groupId && m.status === 'draft').length;
  const toClose = focus?.status === 'open' && new Date(focus.responseDeadline).getTime() < Date.now() ? 1 : 0;

  return {
    // o badge da aba Organizar soma as 4 pendências do manual (4.1)
    total: paymentsToReview + overdueFees + unanswered + toPublish,
    paymentsToReview,
    overdueFees,
    unanswered,
    waitlisted,
    toPublish,
    toClose,
    focusMatchId: focus?.id ?? null,
  };
}
