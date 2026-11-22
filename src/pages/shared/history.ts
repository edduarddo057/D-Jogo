import type { Schema } from '@/lib/http';

/** "Você venceu 4 de 6 rodadas", "avisou antes", "desistiu 3h antes". */
export function historyLine(h: Schema<'MyHistory'> | null | undefined): string {
  if (!h) return 'Ver o resumo do dia';
  if (h.outcome === 'attended') return h.rounds ? `Você venceu ${h.wins ?? 0} de ${h.rounds} rodadas` : 'Você foi';
  if (h.outcome === 'late_withdrawal')
    return h.hoursBefore !== null && h.hoursBefore !== undefined
      ? `desistiu ${h.hoursBefore}h antes`
      : 'desistiu depois do prazo';
  return h.notice === 'in_advance' ? 'avisou antes' : 'não respondeu';
}
