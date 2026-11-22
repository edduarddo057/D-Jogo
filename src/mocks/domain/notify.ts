import type { Schema } from '@/lib/http';
import { db, findGroup, findMatch, newId, nowIso, type DbNotification } from '../db';
import { brl, shortDate, shortWhen } from './format';

export { brl, shortDate, shortWhen };

/**
 * Avisos (RN-110 a RN-112). Repetidos chegam agrupados: um aviso não lido do mesmo tipo,
 * turma e jogo soma no `count` em vez de criar outro. O horário de silêncio (22h–8h) vale
 * para o push; aqui no app o aviso sempre aparece na lista.
 */
type Input = Omit<
  DbNotification,
  'id' | 'userId' | 'count' | 'readAt' | 'createdAt' | 'groupId' | 'matchId' | 'paymentId'
> &
  Partial<Pick<DbNotification, 'groupId' | 'matchId' | 'paymentId'>>;

export function notify(userId: string, input: Input): DbNotification {
  const same = db.notifications.find(
    (n) =>
      n.userId === userId &&
      !n.readAt &&
      n.kind === input.kind &&
      n.groupId === (input.groupId ?? null) &&
      n.matchId === (input.matchId ?? null),
  );
  if (same) {
    same.count += 1;
    same.createdAt = nowIso();
    same.title = input.title;
    same.detail = input.detail;
    return same;
  }
  const n: DbNotification = {
    id: newId('n'),
    userId,
    count: 1,
    readAt: null,
    createdAt: nowIso(),
    groupId: null,
    matchId: null,
    paymentId: null,
    ...input,
  };
  db.notifications.push(n);
  return n;
}

/** Lista aberta: avisa os membros do jogo uma vez (RN-110). */
export function notifyListOpened(matchId: string) {
  const m = findMatch(matchId);
  const g = m && findGroup(m.groupId);
  if (!m || !g || m.openNotified) return;
  m.openNotified = true;
  for (const mb of db.memberships.filter((x) => x.groupId === g.id && x.status === 'active')) {
    notify(mb.userId, {
      kind: 'list_opened',
      category: 'lists',
      title: `Lista aberta: ${g.name}`,
      detail: `${shortDate(m.startsAt)} · responda até ${shortWhen(m.responseDeadline)}`,
      groupId: g.id,
      matchId: m.id,
    });
  }
}

/** Pix informado → o dono recebe "N pagamentos para conferir" agrupado por turma. */
export function notifyPaymentsToReview(groupId: string) {
  const g = findGroup(groupId);
  if (!g) return;
  const n = db.payments.filter((p) => p.groupId === groupId && p.status === 'reported').length;
  if (n === 0) return;
  const existing = db.notifications.find(
    (x) => x.userId === g.ownerId && !x.readAt && x.kind === 'payments_to_review' && x.groupId === groupId,
  );
  const title = n === 1 ? '1 pagamento para conferir' : `${n} pagamentos para conferir`;
  if (existing) {
    existing.title = title;
    existing.count = n;
    existing.createdAt = nowIso();
    return;
  }
  notify(g.ownerId, {
    kind: 'payments_to_review',
    category: 'organizer',
    title,
    detail: `${g.name} · resolva na aba Organizar`,
    groupId,
  });
}

export const toNotification = (n: DbNotification): Schema<'Notification'> => ({
  id: n.id,
  kind: n.kind,
  category: n.category,
  title: n.title,
  detail: n.detail,
  createdAt: n.createdAt,
  readAt: n.readAt,
  count: n.count,
  groupId: n.groupId,
  matchId: n.matchId,
  paymentId: n.paymentId,
});
