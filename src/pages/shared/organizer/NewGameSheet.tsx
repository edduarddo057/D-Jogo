import { useState } from 'react';
import { Button } from '@/components/Button';
import { Section } from '@/components/Section';
import { Sheet } from '@/components/Sheet';
import { Stepper } from '@/components/Stepper';
import { Switch } from '@/components/Switch';
import { DateField, TextField, TimeField } from '@/components/TextField';
import type { Group } from '@/features/groups';
import { useCreateMatch, useGroupMatches, useUpdateMatch, type MatchSummary } from '@/features/matches';
import { formatWhen, isoToZoned, zonedToIso } from '@/lib/format';
import { isApiError, messageFor } from '@/lib/http';
import { toast } from '@/stores';
import styles from './sheets.module.css';

const WEEKDAY_EVERY = [
  'todo domingo',
  'toda segunda',
  'toda terça',
  'toda quarta',
  'toda quinta',
  'toda sexta',
  'todo sábado',
];

const weekdayOf = (date: string) => new Date(`${date}T12:00:00Z`).getUTCDay();

/** Horário da turma naquele dia da semana, se for um dos dias fixos. */
const scheduleOn = (group: Group, date: string) => group.schedules?.find((s) => s.weekday === weekdayOf(date));

/** Próximo dia fixo da turma (qualquer um deles) depois do último jogo marcado (ou de hoje). */
function nextDate(group: Group, after: string | null): string {
  const tz = group.timezone;
  const base = after ? new Date(after) : new Date();
  const days = group.schedules?.length ? group.schedules.map((s) => s.weekday) : [base.getDay()];
  for (let i = 1; i <= 7; i += 1) {
    const d = new Date(base.getTime() + i * 86_400_000);
    const local = isoToZoned(d.toISOString(), tz).date;
    if (days.includes(weekdayOf(local))) return local;
  }
  return isoToZoned(base.toISOString(), tz).date;
}

/** Quando a lista abre, pela regra da turma (o servidor confirma ao publicar). */
function opensAt(group: Group, date: string, start: string) {
  const r = group.rules?.listOpens ?? group.publicRules?.listOpens;
  if (!r) return null;
  const startIso = zonedToIso(date, start, group.timezone);
  const day = new Date(new Date(`${date}T12:00:00Z`).getTime() - r.daysBefore * 86_400_000).toISOString().slice(0, 10);
  const opens = zonedToIso(day, r.time, group.timezone);
  return opens < startIso ? opens : null;
}

export interface NewGameSheetProps {
  open: boolean;
  onClose: () => void;
  group: Group;
  /** Rascunho para editar (o "Editar" da pendência). */
  draft?: MatchSummary | null;
}

/**
 * Novo jogo (manual 4.2): já vem com data, horário, local e vagas da turma e a opção de repetir.
 * Publicar ou Salvar como rascunho. O Voltar sempre volta para onde abriu (Organizar).
 */
export function NewGameSheet(props: NewGameSheetProps) {
  // o formulário monta quando a folha abre, já com os valores da turma (ou do rascunho)
  return props.open ? <NewGameForm {...props} /> : null;
}

function NewGameForm({ onClose, group, draft }: NewGameSheetProps) {
  const upcoming = useGroupMatches(group.id, 'upcoming');
  const create = useCreateMatch(group.id);
  const update = useUpdateMatch(draft?.id ?? '');
  const items = upcoming.data?.items ?? [];
  const last = items.length ? (items[items.length - 1]?.startsAt ?? null) : null;
  const initial = draft ? isoToZoned(draft.startsAt, group.timezone) : null;

  const [date, setDate] = useState(() => initial?.date ?? nextDate(group, last));
  const [start, setStart] = useState(() => initial?.time ?? scheduleOn(group, date)?.startTime ?? '20:00');
  const [end, setEnd] = useState(() =>
    draft?.endsAt ? isoToZoned(draft.endsAt, group.timezone).time : (scheduleOn(group, date)?.endTime ?? '22:00'),
  );
  // trocar a data para outro dia fixo da turma já traz o horário daquele dia
  const changeDate = (next: string) => {
    setDate(next);
    const s = next ? scheduleOn(group, next) : undefined;
    if (s) {
      setStart(s.startTime);
      setEnd(s.endTime);
    }
  };
  const [place, setPlace] = useState(() => draft?.location?.name ?? group.location.name);
  const [capacity, setCapacity] = useState(() => draft?.counts.capacity ?? group.defaultCapacity);
  const [repeat, setRepeat] = useState(() => (draft ? Boolean(draft.repeatsWeekly) : true));
  const [saving, setSaving] = useState<'publish' | 'draft' | null>(null);

  const weekday = date ? weekdayOf(date) : (group.schedules?.[0]?.weekday ?? 6);
  const opens = date ? opensAt(group, date, start) : null;

  const save = async (publish: boolean) => {
    const startsAt = zonedToIso(date, start, group.timezone);
    let endsAt = zonedToIso(date, end, group.timezone);
    if (endsAt <= startsAt) endsAt = new Date(new Date(startsAt).getTime() + 2 * 3_600_000).toISOString();
    const location = place.trim() === group.location.name ? group.location : { name: place.trim(), address: null };
    setSaving(publish ? 'publish' : 'draft');
    try {
      if (draft) {
        await update.mutateAsync({ startsAt, endsAt, location, capacity, repeatWeekly: repeat });
        toast('Rascunho salvo.', { tone: 'success' });
      } else {
        await create.mutateAsync({
          title: group.name,
          startsAt,
          endsAt,
          location,
          capacity,
          publish,
          repeatWeekly: repeat,
        });
        toast(publish ? 'Jogo publicado.' : 'Salvo como rascunho. Só você vê até publicar.', { tone: 'success' });
      }
      onClose();
    } catch (e) {
      toast(isApiError(e) ? messageFor(e.code) : 'Não deu para salvar o jogo.', { tone: 'error' });
    } finally {
      setSaving(null);
    }
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title={draft ? 'Editar jogo' : 'Novo jogo'}
      action={
        draft
          ? { label: 'Salvar', onClick: () => void save(false), loading: saving === 'draft', disabled: !date }
          : { label: 'Publicar', onClick: () => void save(true), loading: saving === 'publish', disabled: !date }
      }
    >
      <p className={styles.muted}>Já vem com local, horário e regras da turma. Mude só o que for diferente.</p>
      <div className={styles.card}>
        <DateField label="Data" value={date} onChange={(e) => changeDate(e.target.value)} />
        <div className={styles.pair}>
          <TimeField label="Começa" value={start} onChange={(e) => setStart(e.target.value)} />
          <TimeField label="Termina" value={end} onChange={(e) => setEnd(e.target.value)} />
        </div>
        <TextField label="Local" value={place} onChange={(e) => setPlace(e.target.value)} />
        <div className={styles.row}>
          <span className={styles.rowLabel}>Vagas</span>
          <Stepper label="Vagas" value={capacity} min={2} max={60} onChange={setCapacity} />
        </div>
      </div>
      <Section
        footnote={
          opens
            ? `A lista abre ${formatWhen(opens)} e os confirmados são avisados.`
            : 'A lista abre ao publicar e os confirmados são avisados.'
        }
      >
        <div className={styles.card}>
          <Switch
            label={`Repetir ${WEEKDAY_EVERY[weekday]}`}
            description="Cria os próximos jogos sozinho"
            checked={repeat}
            onCheckedChange={setRepeat}
          />
        </div>
      </Section>
      {!draft && (
        <Button
          variant="ghost"
          block
          loading={saving === 'draft'}
          disabled={!date || saving !== null}
          onClick={() => void save(false)}
        >
          Salvar como rascunho
        </Button>
      )}
    </Sheet>
  );
}
