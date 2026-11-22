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

// ── Formato do manual (6. Texto): "sáb, 28 nov · 9h"

const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

/** "9h", "21h30". */
export function formatHour(iso: string, tz = DEFAULT_TIMEZONE): string {
  const h = Number(formatInTimeZone(iso, tz, 'H'));
  const m = formatInTimeZone(iso, tz, 'mm');
  return m === '00' ? `${h}h` : `${h}h${m}`;
}

/** "9h às 11h". */
export function formatHourRange(startIso: string, endIso: string, tz = DEFAULT_TIMEZONE): string {
  return `${formatHour(startIso, tz)} às ${formatHour(endIso, tz)}`;
}

/** "sáb" (dia da semana abreviado, minúsculo). */
export function formatWeekdayShort(iso: string, tz = DEFAULT_TIMEZONE): string {
  return WEEKDAYS[Number(formatInTimeZone(iso, tz, 'i')) % 7] ?? '';
}

/** "sáb, 28 nov". Com `capital`, "Sáb, 28 nov" (início de frase ou título). */
export function formatDay(iso: string, options: { capital?: boolean; tz?: string } = {}): string {
  const tz = options.tz ?? DEFAULT_TIMEZONE;
  const text = `${formatWeekdayShort(iso, tz)}, ${fmt(iso, 'd MMM', tz).replace('.', '')}`;
  return options.capital ? capitalize(text) : text;
}

/** "sáb, 28 nov · 9h". */
export function formatDayTime(iso: string, options: { capital?: boolean; tz?: string } = {}): string {
  return `${formatDay(iso, options)} · ${formatHour(iso, options.tz)}`;
}

/**
 * Prazos curtos: "sex, 21h" se for nos próximos 6 dias, "hoje, 21h" no mesmo dia e
 * "sex, 4 dez, 21h" quando está mais longe.
 */
export function formatWhen(iso: string, now: Date = new Date(), tz = DEFAULT_TIMEZONE): string {
  const dayOf = (d: string | Date) => formatInTimeZone(d, tz, 'yyyy-MM-dd');
  const days = Math.round(
    (new Date(`${dayOf(iso)}T12:00:00Z`).getTime() - new Date(`${dayOf(now)}T12:00:00Z`).getTime()) / 86_400_000,
  );
  const hour = formatHour(iso, tz);
  if (days === 0) return `hoje, ${hour}`;
  if (days === 1) return `amanhã, ${hour}`;
  if (days > 1 && days < 7) return `${formatWeekdayShort(iso, tz)}, ${hour}`;
  return `${formatDay(iso, { tz })}, ${hour}`;
}

export interface ScheduleLike {
  weekday: number;
  startTime: string;
  endTime: string;
}

const clock = (t: string) => {
  const [h, m] = t.split(':');
  return m === '00' ? `${Number(h)}h` : `${Number(h)}h${m}`;
};

/** "a, b e c". */
const joinAnd = (items: string[]) =>
  items.length <= 1 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} e ${items.at(-1)}`;

/** Dias em ordem (dom → sáb), agrupados pelo mesmo horário, na ordem do primeiro dia de cada grupo. */
function byTime<T extends { weekday: number; startTime: string }>(schedules: T[], key: (s: T) => string) {
  const groups = new Map<string, T[]>();
  for (const s of [...schedules].sort((a, b) => a.weekday - b.weekday)) {
    const k = key(s);
    groups.set(k, [...(groups.get(k) ?? []), s]);
  }
  return [...groups.values()];
}

/**
 * Dias e horários da turma, em linguagem simples:
 * "Todo sábado, 9h às 11h" · "Segundas e quartas, 20h às 22h" · "Terças, 20h às 22h · Sábados, 9h às 11h".
 */
export function formatSchedule(schedules: ScheduleLike[]): string {
  const ONE = ['Todo domingo', 'Toda segunda', 'Toda terça', 'Toda quarta', 'Toda quinta', 'Toda sexta', 'Todo sábado'];
  const MANY = ['domingos', 'segundas', 'terças', 'quartas', 'quintas', 'sextas', 'sábados'];
  return byTime(schedules, (s) => `${s.startTime}-${s.endTime}`)
    .map((days) => {
      const first = days[0] as ScheduleLike;
      const when = `${clock(first.startTime)} às ${clock(first.endTime)}`;
      if (days.length === 1) return `${ONE[first.weekday] ?? ''}, ${when}`;
      return `${capitalize(joinAnd(days.map((d) => MANY[d.weekday] ?? '')))}, ${when}`;
    })
    .join(' · ');
}

/** "Sáb, 9h" · "Seg e qua, 20h" · "Ter 20h · Sáb 9h" para a lista de turmas. */
export function formatScheduleShort(schedules: Array<Pick<ScheduleLike, 'weekday' | 'startTime'>>): string {
  const groups = byTime(schedules, (s) => s.startTime);
  const sep = groups.length > 1 ? ' ' : ', ';
  return groups
    .map(
      (days) =>
        `${capitalize(joinAnd(days.map((d) => WEEKDAYS[d.weekday] ?? '')))}${sep}${clock(days[0]?.startTime ?? '')}`,
    )
    .join(' · ');
}

/** "novembro". */
export function monthName(yearMonth: string): string {
  return fmt(`${yearMonth}-15T12:00:00Z`, 'MMMM', 'UTC');
}

/** "há 2h", "há 5 min", "ontem", "12 nov". */
export function formatAgo(iso: string, now: Date = new Date(), tz = DEFAULT_TIMEZONE): string {
  const minutes = Math.max(0, Math.round((now.getTime() - new Date(iso).getTime()) / 60_000));
  if (minutes < 60) return `${Math.max(1, minutes)} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  if (hours < 48) return 'ontem';
  if (hours < 24 * 6) return formatWeekdayShort(iso, tz);
  return fmt(iso, 'd MMM', tz).replace('.', '');
}
