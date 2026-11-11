import { formatCents } from '@/lib/format';
import type { RespondOutcome } from '../api/attendanceApi';

/** Toast depois de responder: o servidor diz o resultado final (RN-25: quem perde a corrida vai para a fila). */
export function outcomeMessage(
  outcome: RespondOutcome | undefined,
  feeCents: number,
  waitlistPosition?: number | null,
) {
  switch (outcome) {
    case 'confirmed':
      return { text: 'Presença confirmada. Bom jogo!', tone: 'success' as const };
    case 'awaiting_payment':
      return {
        text: `Vaga reservada! Pague ${formatCents(feeCents)} pelo Pix para garantir.`,
        tone: 'success' as const,
      };
    case 'waitlisted':
      return {
        text: waitlistPosition
          ? `Você é o ${waitlistPosition}º da lista de espera.`
          : 'Você entrou na lista de espera.',
        tone: 'neutral' as const,
      };
    case 'declined':
      return { text: 'Anotado: você não vai desta vez.', tone: 'neutral' as const };
    case 'left':
      return { text: 'Você saiu da partida.', tone: 'neutral' as const };
    default:
      return { text: 'Resposta salva.', tone: 'neutral' as const };
  }
}
