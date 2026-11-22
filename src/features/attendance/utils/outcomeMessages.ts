import { formatCents } from '@/lib/format';
import type { RespondOutcome } from '../api/attendanceApi';

/** Mensagem depois de responder: o servidor diz o resultado final (RN-25: quem perde a corrida vai para a fila). */
export function outcomeMessage(
  outcome: RespondOutcome | undefined,
  feeCents: number,
  waitlistPosition?: number | null,
) {
  switch (outcome) {
    case 'confirmed':
      return { text: 'Você vai. Bom jogo!', tone: 'success' as const };
    case 'awaiting_payment':
      return { text: `Vaga guardada. Pague ${formatCents(feeCents)} para garantir.`, tone: 'success' as const };
    case 'waitlisted':
      return {
        text: waitlistPosition
          ? `Lista cheia: você é o ${waitlistPosition}º na fila. Se abrir vaga, a gente avisa.`
          : 'Lista cheia: você entrou na fila. Se abrir vaga, a gente avisa.',
        tone: 'neutral' as const,
      };
    case 'declined':
      return { text: 'Anotado: você não vai desta vez.', tone: 'neutral' as const };
    case 'left':
      return { text: 'Você saiu da lista.', tone: 'neutral' as const };
    default:
      return { text: 'Resposta salva.', tone: 'neutral' as const };
  }
}
