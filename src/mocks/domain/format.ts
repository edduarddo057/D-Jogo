/** Textos curtos dos avisos no fuso de Brasília (sem depender do banco). */
const WEEKDAY = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
/** "sáb, 28 nov" no fuso de Brasília. */
export function shortDate(isoDate: string) {
  const d = new Date(new Date(isoDate).getTime() - 3 * 3_600_000);
  const month = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'][d.getUTCMonth()];
  return `${WEEKDAY[d.getUTCDay()]}, ${d.getUTCDate()} ${month}`;
}
/** "sex, 9h" / "sex, 21h30". */
export function shortWhen(isoDate: string) {
  const d = new Date(new Date(isoDate).getTime() - 3 * 3_600_000);
  const h = d.getUTCHours();
  const m = d.getUTCMinutes();
  return `${WEEKDAY[d.getUTCDay()]}, ${h}h${m ? String(m).padStart(2, '0') : ''}`;
}
export const brl = (cents: number) =>
  `R$ ${(cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: cents % 100 ? 2 : 0 })}`;
