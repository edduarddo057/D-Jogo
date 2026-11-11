import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import { ptBR } from 'date-fns/locale';

export const DEFAULT_TIMEZONE = 'America/Sao_Paulo';

const fmt = (iso: string, pattern: string, tz: string) => formatInTimeZone(iso, tz, pattern, { locale: ptBR });

/** Card: "Qua, 24 set · 20:00" */
export function formatMatchShort(iso: string, tz = DEFAULT_TIMEZONE): string {
  const weekday = fmt(iso, 'EEEE', tz).slice(0, 3); // "quinta-feira" → "qui"
  const day = fmt(iso, 'd MMM', tz).replace('.', '');
  return `${capitalize(weekday)}, ${day} · ${fmt(iso, 'HH:mm', tz)}`;
}

/** Detalhe: "Quarta, 24 de setembro de 2026" */
export function formatMatchLong(iso: string, tz = DEFAULT_TIMEZONE): string {
  return capitalize(fmt(iso, "EEEE, d 'de' MMMM 'de' yyyy", tz));
}

/** "20:00 às 22:00" */
export function formatTimeRange(startIso: string, endIso: string, tz = DEFAULT_TIMEZONE): string {
  return `${fmt(startIso, 'HH:mm', tz)} às ${fmt(endIso, 'HH:mm', tz)}`;
}

/** Dia do mês com dois dígitos para o bloco de data das listas: "24" */
export function formatDayOfMonth(iso: string, tz = DEFAULT_TIMEZONE): string {
  return fmt(iso, 'dd', tz);
}

/** Tempo restante até um prazo: "1h 52min", "15min", "0min" */
export function formatRemaining(deadlineIso: string, now: Date = new Date()): string {
  const totalMinutes = Math.max(0, Math.floor((new Date(deadlineIso).getTime() - now.getTime()) / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`;
}

/** Prazos: "24 set, 18:00" */
export function formatDeadline(iso: string, tz = DEFAULT_TIMEZONE): string {
  return `${fmt(iso, 'd MMM', tz).replace('.', '')}, ${fmt(iso, 'HH:mm', tz)}`;
}

/** Data e hora digitadas no fuso da turma → ISO (UTC). */
export function zonedToIso(date: string, time: string, tz = DEFAULT_TIMEZONE): string {
  return fromZonedTime(`${date}T${time}:00`, tz).toISOString();
}

/** ISO → campos de data ("2026-11-18") e hora ("20:00") no fuso da turma. */
export function isoToZoned(iso: string, tz = DEFAULT_TIMEZONE): { date: string; time: string } {
  return { date: formatInTimeZone(iso, tz, 'yyyy-MM-dd'), time: formatInTimeZone(iso, tz, 'HH:mm') };
}

/** Nome do dia para títulos: "quarta" */
export function weekdayName(iso: string, tz = DEFAULT_TIMEZONE): string {
  return fmt(iso, 'EEEE', tz).replace('-feira', '');
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
