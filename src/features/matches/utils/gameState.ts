import type { Schema } from '@/lib/http';

type Participation = Schema<'Participation'>;

/** O que um card de jogo precisa para decidir a próxima ação (Jogos, detalhe, turma, avisos). */
export interface GameLike {
  status: Schema<'MatchStatus'>;
  startsAt: string;
  listOpensAt?: string | null;
  responseDeadline?: string;
  withdrawalDeadline?: string | null;
  dropInFeeCents?: number;
  myParticipation?: Participation | null;
}

/**
 * Situação do jogador no jogo (manual 3.2), sempre com texto:
 * - not_open: "A lista abre seg, 9h."
 * - answer: "Você vai? Responda até sex, 9h" + Não vou / Vou
 * - going / not_going: "Você vai · Mudar" / "Você não vai · Mudar"
 * - pay: "Pague R$ 25 até sex, 21h" + Pagar R$ 25
 * - paid_review: Pix enviado, aguardando quem organiza conferir
 * - waitlist: "2º na fila. Se abrir vaga, você entra e a gente avisa."
 * - closed: lista fechada, sem vaga
 */
export type GameState =
  | { kind: 'not_open'; opensAt: string }
  | { kind: 'answer'; deadline: string | null }
  | { kind: 'going' }
  | { kind: 'not_going'; late: boolean }
  | { kind: 'pay'; amountCents: number; deadline: string | null; paymentId: string; rejected: string | null }
  | { kind: 'paid_review'; amountCents: number }
  | { kind: 'waitlist'; position: number | null }
  | { kind: 'closed' }
  | { kind: 'playing' }
  | { kind: 'finished' }
  | { kind: 'cancelled' };

export function gameState(game: GameLike, now: Date = new Date()): GameState {
  const p = game.myParticipation ?? null;
  if (game.status === 'cancelled') return { kind: 'cancelled' };
  if (game.status === 'finished') return { kind: 'finished' };
  if (game.status === 'in_progress')
    return p && (p.status === 'confirmed' || p.status === 'awaiting_payment')
      ? { kind: 'playing' }
      : { kind: 'closed' };

  if (p?.status === 'awaiting_payment') {
    const pay = p.payment;
    if (pay?.status === 'reported') return { kind: 'paid_review', amountCents: pay.amountCents };
    return {
      kind: 'pay',
      amountCents: pay?.amountCents ?? game.dropInFeeCents ?? 0,
      deadline: p.paymentDeadline ?? null,
      paymentId: pay?.id ?? '',
      rejected: pay?.status === 'rejected' ? (pay.rejectionReason ?? 'recusado') : null,
    };
  }
  if (p?.status === 'confirmed') return { kind: 'going' };
  if (p?.status === 'waitlisted') return { kind: 'waitlist', position: p.waitlistPosition ?? null };

  if (game.status === 'closed') {
    if (p && (p.status === 'declined' || p.status === 'left'))
      return { kind: 'not_going', late: Boolean(p.lateWithdrawal) };
    return { kind: 'closed' };
  }
  if (game.listOpensAt && new Date(game.listOpensAt) > now) return { kind: 'not_open', opensAt: game.listOpensAt };
  if (p && (p.status === 'declined' || p.status === 'left'))
    return { kind: 'not_going', late: Boolean(p.lateWithdrawal) };
  // pending (mensalista com vaga reservada), sem presença ainda (avulso) ou expirado/removido: pode responder
  return { kind: 'answer', deadline: p?.status === 'pending' ? (game.responseDeadline ?? null) : null };
}

/** A lista ainda aceita mudar a resposta? */
export const canChange = (game: GameLike) => game.status === 'open';
