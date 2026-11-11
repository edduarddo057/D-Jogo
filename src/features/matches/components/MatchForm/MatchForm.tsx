import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/Button';
import { MoneyField } from '@/components/MoneyField';
import { Switch } from '@/components/Switch';
import { DateField, TextField, TimeField } from '@/components/TextField';
import { isoToZoned, zonedToIso } from '@/lib/format';
import type { Match, MatchInput } from '../../api/matchesApi';
import styles from './MatchForm.module.css';

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Hora inválida');
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Escolha a data');

const schema = z
  .object({
    title: z.string().trim().min(3, 'Mínimo de 3 letras').max(60, 'Máximo de 60 caracteres'),
    date,
    start: time,
    end: time,
    locationName: z.string().trim().min(2, 'Diga onde vai ser').max(80),
    capacity: z.number({ error: 'Informe as vagas' }).int().min(2, 'Mínimo de 2 vagas').max(60, 'Máximo de 60 vagas'),
    dropInFeeCents: z.number({ error: 'Informe o valor' }).int().min(0),
    customDeadline: z.boolean(),
    deadlineDate: z.string(),
    deadlineTime: z.string(),
    publish: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (v.end <= v.start)
      ctx.addIssue({ code: 'custom', path: ['end'], message: 'O fim precisa ser depois do início' });
    if (v.customDeadline) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(v.deadlineDate))
        ctx.addIssue({ code: 'custom', path: ['deadlineDate'], message: 'Escolha a data' });
      else if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(v.deadlineTime))
        ctx.addIssue({ code: 'custom', path: ['deadlineTime'], message: 'Hora inválida' });
      else if (`${v.deadlineDate}T${v.deadlineTime}` >= `${v.date}T${v.start}`)
        ctx.addIssue({ code: 'custom', path: ['deadlineTime'], message: 'O prazo precisa terminar antes do jogo' });
    }
  });
type Values = z.infer<typeof schema>;

export type MatchFormOutput = MatchInput;

export interface MatchFormProps {
  /** Valores da turma para uma partida nova. */
  defaults: {
    title: string;
    date: string;
    start: string;
    end: string;
    locationName: string;
    capacity: number;
    dropInFeeCents: number;
  };
  match?: Match;
  submitLabel: string;
  onSubmit: (values: MatchFormOutput) => Promise<unknown>;
}

function initial(defaults: MatchFormProps['defaults'], match?: Match): Values {
  if (!match) return { ...defaults, customDeadline: false, deadlineDate: '', deadlineTime: '', publish: true };
  const s = isoToZoned(match.startsAt);
  const e = isoToZoned(match.endsAt);
  const d = isoToZoned(match.responseDeadline);
  return {
    title: match.title,
    date: s.date,
    start: s.time,
    end: e.time,
    locationName: match.location.name,
    capacity: match.capacity,
    dropInFeeCents: match.dropInFeeCents,
    customDeadline: true,
    deadlineDate: d.date,
    deadlineTime: d.time,
    publish: match.status !== 'draft',
  };
}

/** Criar e editar partida (RN-20, RN-27). Datas e horas no fuso da turma. */
export function MatchForm({ defaults, match, submitLabel, onSubmit }: MatchFormProps) {
  const { register, control, handleSubmit, formState, watch } = useForm<Values>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: initial(defaults, match),
  });
  const e = formState.errors;
  // eslint-disable-next-line react-hooks/incompatible-library -- watch só alterna a seção do prazo
  const customDeadline = watch('customDeadline');

  const submit = handleSubmit((v) => {
    const startsAt = zonedToIso(v.date, v.start);
    const out: MatchInput = {
      title: v.title,
      startsAt,
      endsAt: zonedToIso(v.date, v.end),
      location: { name: v.locationName, address: match?.location.address ?? null },
      capacity: v.capacity,
      dropInFeeCents: v.dropInFeeCents,
      publish: v.publish,
      ...(v.customDeadline ? { responseDeadline: zonedToIso(v.deadlineDate, v.deadlineTime) } : {}),
    };
    return onSubmit(out);
  });

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <TextField label="Nome da partida" {...register('title')} error={e.title?.message} />
      <DateField label="Data" {...register('date')} error={e.date?.message} />
      <div className={styles.row}>
        <TimeField label="Começa" {...register('start')} error={e.start?.message} />
        <TimeField label="Termina" {...register('end')} error={e.end?.message} />
      </div>
      <TextField label="Local" {...register('locationName')} error={e.locationName?.message} />
      <div className={styles.row}>
        <TextField
          label="Vagas"
          type="number"
          inputMode="numeric"
          min={2}
          max={60}
          {...register('capacity', { valueAsNumber: true })}
          error={e.capacity?.message}
        />
        <Controller
          control={control}
          name="dropInFeeCents"
          render={({ field, fieldState }) => (
            <MoneyField
              label="Valor do avulso"
              value={field.value ?? null}
              onChange={(c) => field.onChange(c ?? 0)}
              onBlur={field.onBlur}
              name={field.name}
              error={fieldState.error?.message}
            />
          )}
        />
      </div>

      <Controller
        control={control}
        name="customDeadline"
        render={({ field }) => (
          <Switch
            label="Definir prazo dos mensalistas"
            description={
              field.value
                ? 'Até quando os mensalistas respondem se vão. Depois disso vale a regra da turma para quem não respondeu.'
                : 'Usa o prazo da regra da turma.'
            }
            checked={field.value}
            onCheckedChange={field.onChange}
          />
        )}
      />
      {customDeadline && (
        <div className={styles.row}>
          <DateField label="Responder até" {...register('deadlineDate')} error={e.deadlineDate?.message} />
          <TimeField label="Às" {...register('deadlineTime')} error={e.deadlineTime?.message} />
        </div>
      )}

      {(!match || match.status === 'draft') && (
        <Controller
          control={control}
          name="publish"
          render={({ field }) => (
            <Switch
              label="Publicar agora"
              description={
                field.value
                  ? 'Os mensalistas recebem a vaga reservada e já podem responder.'
                  : 'Fica como rascunho, só você vê.'
              }
              checked={field.value}
              onCheckedChange={field.onChange}
            />
          )}
        />
      )}

      <Button type="submit" block loading={formState.isSubmitting}>
        {submitLabel}
      </Button>
    </form>
  );
}
