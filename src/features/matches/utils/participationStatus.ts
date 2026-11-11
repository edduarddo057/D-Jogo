import type { BadgeTone } from '@/components/Badge';
import type { Schema } from '@/lib/http';

type ParticipationStatus = Schema<'ParticipationStatus'>;

/** Texto e tom do selo da minha presença numa partida (design system › Badge, tabela de tons). */
export const PARTICIPATION_BADGE: Record<ParticipationStatus, { label: string; tone: BadgeTone }> = {
  pending: { label: 'Pendente', tone: 'warning' },
  confirmed: { label: 'Confirmado', tone: 'success' },
  declined: { label: 'Não vou', tone: 'neutral' },
  awaiting_payment: { label: 'Aguardando pagamento', tone: 'warning' },
  waitlisted: { label: 'Na espera', tone: 'info' },
  expired: { label: 'Expirou', tone: 'danger' },
  left: { label: 'Desistiu', tone: 'neutral' },
  removed: { label: 'Removido', tone: 'neutral' },
};

/** Selo do estado da partida (só os que pedem atenção; "open" não leva selo). */
export const MATCH_STATUS_BADGE: Record<Schema<'MatchStatus'>, { label: string; tone: BadgeTone } | null> = {
  draft: { label: 'Rascunho', tone: 'neutral' },
  open: null,
  closed: { label: 'Lista fechada', tone: 'info' },
  teams_published: { label: 'Times prontos', tone: 'info' },
  in_progress: { label: 'Em jogo', tone: 'success' },
  finished: { label: 'Encerrada', tone: 'neutral' },
  cancelled: { label: 'Cancelada', tone: 'danger' },
};
