import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { Button } from '@/components/Button';
import { MoneyField } from '@/components/MoneyField';
import { TextField } from '@/components/TextField';
import type { Group, GroupInput } from '../../api/groupsApi';
import { groupSchema, type GroupFormValues } from '../../schemas/groupSchema';
import styles from './GroupForm.module.css';

export type GroupFormOutput = Omit<GroupInput, 'sportId' | 'timezone'>;

// Na criação os valores começam vazios (e não "0,00") para a pessoa digitar direto.
const toValues = (g?: Group): Partial<GroupFormValues> => ({
  name: g?.name ?? '',
  locationName: g?.location.name ?? '',
  locationAddress: g?.location.address ?? '',
  defaultCapacity: g?.defaultCapacity ?? 12,
  monthlyFeeCents: g?.monthlyFeeCents,
  dropInFeeCents: g?.dropInFeeCents,
  pixKey: g?.pix?.key ?? '',
  pixHolder: g?.pix?.holderName ?? '',
});

const toOutput = (v: GroupFormValues): GroupFormOutput => ({
  name: v.name,
  location: { name: v.locationName, address: v.locationAddress || null },
  defaultCapacity: v.defaultCapacity,
  monthlyFeeCents: v.monthlyFeeCents,
  dropInFeeCents: v.dropInFeeCents,
  ...(v.pixKey ? { pix: { key: v.pixKey, holderName: v.pixHolder } } : {}),
});

export interface GroupFormProps {
  group?: Group;
  submitLabel: string;
  onSubmit: (values: GroupFormOutput) => Promise<unknown>;
}

/** Criar e editar turma: nome, local, vagas, valores e Pix. */
export function GroupForm({ group, submitLabel, onSubmit }: GroupFormProps) {
  const { register, control, handleSubmit, formState } = useForm<GroupFormValues>({
    resolver: zodResolver(groupSchema),
    mode: 'onTouched',
    defaultValues: toValues(group),
  });
  const e = formState.errors;

  return (
    <form className={styles.form} onSubmit={handleSubmit((v) => onSubmit(toOutput(v)))} noValidate>
      <section className={styles.section} aria-labelledby="gf-basico">
        <h2 id="gf-basico" className={styles.title}>
          A turma
        </h2>
        <TextField
          label="Nome da turma"
          placeholder="Ex.: Vôlei de quarta"
          {...register('name')}
          error={e.name?.message}
        />
        <TextField
          label="Onde vocês jogam"
          placeholder="Ex.: Quadra do Clube Laranjeiras"
          {...register('locationName')}
          error={e.locationName?.message}
        />
        <TextField
          label="Endereço (opcional)"
          autoComplete="street-address"
          {...register('locationAddress')}
          error={e.locationAddress?.message}
        />
        <TextField
          label="Vagas por partida"
          type="number"
          inputMode="numeric"
          min={2}
          max={60}
          hint="Dá para mudar em cada partida."
          {...register('defaultCapacity', { valueAsNumber: true })}
          error={e.defaultCapacity?.message}
        />
      </section>

      <section className={styles.section} aria-labelledby="gf-valores">
        <h2 id="gf-valores" className={styles.title}>
          Valores
        </h2>
        <div className={styles.row}>
          <Controller
            control={control}
            name="monthlyFeeCents"
            render={({ field, fieldState }) => (
              <MoneyField
                label="Mensalidade"
                hint="Por mês, para mensalistas. Use 0 se não cobrar."
                value={field.value ?? null}
                onChange={(c) => field.onChange(c ?? undefined)}
                onBlur={field.onBlur}
                name={field.name}
                error={fieldState.error?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="dropInFeeCents"
            render={({ field, fieldState }) => (
              <MoneyField
                label="Avulso"
                hint="Por partida, para avulsos."
                value={field.value ?? null}
                onChange={(c) => field.onChange(c ?? undefined)}
                onBlur={field.onBlur}
                name={field.name}
                error={fieldState.error?.message}
              />
            )}
          />
        </div>
      </section>

      <section className={styles.section} aria-labelledby="gf-pix">
        <h2 id="gf-pix" className={styles.title}>
          Pix para receber <span className={styles.optional}>(opcional)</span>
        </h2>
        <TextField
          label="Chave Pix"
          autoCapitalize="none"
          spellCheck={false}
          {...register('pixKey')}
          error={e.pixKey?.message}
        />
        <TextField label="Nome do titular" {...register('pixHolder')} error={e.pixHolder?.message} />
      </section>

      <Button type="submit" block loading={formState.isSubmitting}>
        {submitLabel}
      </Button>
    </form>
  );
}
