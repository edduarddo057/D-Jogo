import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { MoneyField } from '@/components/MoneyField';
import { SegmentedControl } from '@/components/SegmentedControl';
import { DateField, TextField } from '@/components/TextField';
import { isApiError, messageFor } from '@/lib/http';
import { toast } from '@/stores';
import { useCreateLedgerEntry } from '../../queries/useFinance';
import styles from './LedgerEntryModal.module.css';

const schema = z.object({
  direction: z.enum(['in', 'out']),
  description: z.string().trim().min(2, 'Descreva o lançamento').max(80, 'Máximo de 80 caracteres'),
  amountCents: z.number({ error: 'Informe o valor' }).int().min(1, 'Informe o valor'),
  occurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Escolha a data'),
});
type Values = z.infer<typeof schema>;

const today = () => new Date().toISOString().slice(0, 10);

/** "+ Lançamento": entrada ou saída manual, ex.: aluguel da quadra (RN-70). */
export function LedgerEntryModal({ groupId, open, onClose }: { groupId: string; open: boolean; onClose: () => void }) {
  const create = useCreateLedgerEntry(groupId);
  const { register, control, handleSubmit, reset, formState } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { direction: 'out', description: '', occurredOn: today() },
  });

  const close = () => {
    reset({ direction: 'out', description: '', occurredOn: today() });
    onClose();
  };

  const submit = handleSubmit(async (v) => {
    try {
      await create.mutateAsync(v);
      toast('Lançamento salvo.', { tone: 'success' });
      close();
    } catch (e) {
      toast(isApiError(e) ? messageFor(e.code) : 'Não deu para salvar.', { tone: 'error' });
    }
  });

  return (
    <Modal open={open} onClose={close} title="Novo lançamento">
      <form className={styles.form} onSubmit={submit} noValidate>
        <Controller
          control={control}
          name="direction"
          render={({ field }) => (
            <SegmentedControl
              label="Tipo de lançamento"
              options={[
                { value: 'out', label: 'Saída' },
                { value: 'in', label: 'Entrada' },
              ]}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
        <TextField
          label="Descrição"
          placeholder="Ex.: aluguel da quadra"
          {...register('description')}
          error={formState.errors.description?.message}
        />
        <Controller
          control={control}
          name="amountCents"
          render={({ field, fieldState }) => (
            <MoneyField
              label="Valor"
              value={field.value ?? null}
              onChange={(c) => field.onChange(c ?? undefined)}
              onBlur={field.onBlur}
              name={field.name}
              error={fieldState.error?.message}
            />
          )}
        />
        <DateField label="Data" {...register('occurredOn')} error={formState.errors.occurredOn?.message} />
        <Button type="submit" block loading={formState.isSubmitting}>
          Salvar lançamento
        </Button>
      </form>
    </Modal>
  );
}
