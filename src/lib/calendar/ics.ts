/** Evento .ics para "Adicionar ao calendário" (funciona no iPhone, Android e no computador). */
export interface CalendarEvent {
  uid: string;
  title: string;
  start: string;
  end: string;
  location?: string;
  description?: string;
}

const stamp = (iso: string) =>
  new Date(iso)
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
const escape = (text: string) =>
  text
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/([,;])/g, '\\$1');

export function buildIcs(e: CalendarEvent): string {
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Da Jogo//PT-BR',
    'BEGIN:VEVENT',
    `UID:${e.uid}@dajogo.app`,
    `DTSTAMP:${stamp(new Date().toISOString())}`,
    `DTSTART:${stamp(e.start)}`,
    `DTEND:${stamp(e.end)}`,
    `SUMMARY:${escape(e.title)}`,
    ...(e.location ? [`LOCATION:${escape(e.location)}`] : []),
    ...(e.description ? [`DESCRIPTION:${escape(e.description)}`] : []),
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

/** Link do mapa: o do local, se houver; senão uma busca pelo nome e endereço. */
export const mapsLink = (location: { name: string; address?: string | null; mapsUrl?: string | null }) =>
  location.mapsUrl ??
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([location.name, location.address].filter(Boolean).join(', '))}`;
