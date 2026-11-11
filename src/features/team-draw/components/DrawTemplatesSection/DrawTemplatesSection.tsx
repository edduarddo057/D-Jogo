import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { Badge } from '@/components/Badge';
import { Button, IconButton } from '@/components/Button';
import { List, ListItem } from '@/components/List';
import { Modal } from '@/components/Modal';
import { SelectField } from '@/components/SelectField';
import { Skeleton } from '@/components/Skeleton';
import { Switch } from '@/components/Switch';
import { TextField } from '@/components/TextField';
import { isApiError, messageFor } from '@/lib/http';
import { toast } from '@/stores';
import type { DrawTemplate } from '../../api/drawApi';
import { useDeleteDrawTemplate, useDrawTemplates, useSaveDrawTemplate } from '../../queries/useDraw';
import { describeTemplate } from '../../utils/describeTemplate';
import styles from './DrawTemplatesSection.module.css';

const schema = z.object({
  name: z.string().trim().min(1, 'Dê um nome, ex.: 4×4').max(20, 'Máximo de 20 caracteres'),
  teamCount: z.number({ error: 'Informe' }).int().min(2, 'Mínimo 2').max(8, 'Máximo 8'),
  playersPerTeam: z.number({ error: 'Informe' }).int().min(2, 'Mínimo 2').max(12, 'Máximo 12'),
  balanceByLevel: z.boolean(),
  distributePositions: z.boolean(),
  extraPlayers: z.enum(['bench', 'spread']),
  isDefault: z.boolean(),
});
type Values = z.infer<typeof schema>;

const NEW: Values = {
  name: '',
  teamCount: 2,
  playersPerTeam: 4,
  balanceByLevel: true,
  distributePositions: true,
  extraPlayers: 'bench',
  isDefault: false,
};

function TemplateForm({
  groupId,
  template,
  onDone,
}: {
  groupId: string;
  template: DrawTemplate | null;
  onDone: () => void;
}) {
  const save = useSaveDrawTemplate(groupId);
  const { register, control, handleSubmit, formState } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: template ? { ...template } : NEW,
  });
  const e = formState.errors;

  const submit = handleSubmit(async (body) => {
    try {
      await save.mutateAsync({ id: template?.id, body });
      toast('Padrão salvo.', { tone: 'success' });
      onDone();
    } catch (err) {
      toast(isApiError(err) ? messageFor(err.code) : 'Não deu para salvar.', { tone: 'error' });
    }
  });

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <TextField label="Nome" placeholder="Ex.: 4×4" {...register('name')} error={e.name?.message} />
      <div className={styles.row}>
        <TextField
          label="Times"
          type="number"
          inputMode="numeric"
          min={2}
          max={8}
          {...register('teamCount', { valueAsNumber: true })}
          error={e.teamCount?.message}
        />
        <TextField
          label="Jogadores por time"
          type="number"
          inputMode="numeric"
          min={2}
          max={12}
          {...register('playersPerTeam', { valueAsNumber: true })}
          error={e.playersPerTeam?.message}
        />
      </div>
      <Controller
        control={control}
        name="balanceByLevel"
        render={({ field }) => (
          <Switch
            label="Equilibrar por nível"
            description="Distribui os mais fortes entre os times."
            checked={field.value}
            onCheckedChange={field.onChange}
          />
        )}
      />
      <Controller
        control={control}
        name="distributePositions"
        render={({ field }) => (
          <Switch
            label="Distribuir posições"
            description="Evita dois levantadores no mesmo time, por exemplo."
            checked={field.value}
            onCheckedChange={field.onChange}
          />
        )}
      />
      <SelectField
        label="Quem sobra"
        options={[
          { value: 'bench', label: 'Fica no banco (revezamento)' },
          { value: 'spread', label: 'Entra nos times (times maiores)' },
        ]}
        {...register('extraPlayers')}
      />
      <Controller
        control={control}
        name="isDefault"
        render={({ field }) => (
          <Switch
            label="Usar como padrão da turma"
            checked={field.value}
            onCheckedChange={field.onChange}
            disabled={template?.isDefault}
          />
        )}
      />
      <Button type="submit" block loading={formState.isSubmitting}>
        Salvar padrão
      </Button>
    </form>
  );
}

/** Padrões de sorteio da turma (RN-50), na tela de Regras. */
export function DrawTemplatesSection({ groupId }: { groupId: string }) {
  const templates = useDrawTemplates(groupId);
  const remove = useDeleteDrawTemplate(groupId);
  const [editing, setEditing] = useState<DrawTemplate | 'new' | null>(null);

  return (
    <section className={styles.section} aria-labelledby="padroes-sorteio">
      <div className={styles.header}>
        <h2 id="padroes-sorteio" className={styles.title}>
          Padrões de sorteio
        </h2>
        <Button
          variant="outline"
          size="sm"
          icon={<Plus size={18} aria-hidden="true" />}
          onClick={() => setEditing('new')}
        >
          Padrão
        </Button>
      </div>
      {templates.isPending && <Skeleton shape="card" height="12rem" />}
      {templates.data && (
        <List label="Padrões de sorteio">
          {templates.data.map((t) => (
            <ListItem
              key={t.id}
              title={t.name}
              meta={describeTemplate(t)}
              trailing={t.isDefault ? <Badge tone="info">Padrão</Badge> : undefined}
              actions={
                <>
                  <IconButton
                    label={`Editar padrão ${t.name}`}
                    icon={<Pencil size={18} aria-hidden="true" />}
                    onClick={() => setEditing(t)}
                  />
                  {templates.data.length > 1 && (
                    <IconButton
                      label={`Excluir padrão ${t.name}`}
                      icon={<Trash2 size={18} aria-hidden="true" />}
                      disabled={remove.isPending}
                      onClick={() =>
                        remove.mutate(t.id, { onSuccess: () => toast('Padrão excluído.', { tone: 'success' }) })
                      }
                    />
                  )}
                </>
              }
            />
          ))}
        </List>
      )}
      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'Novo padrão' : 'Editar padrão'}
      >
        {editing !== null && (
          <TemplateForm
            key={editing === 'new' ? 'new' : editing.id}
            groupId={groupId}
            template={editing === 'new' ? null : editing}
            onDone={() => setEditing(null)}
          />
        )}
      </Modal>
    </section>
  );
}
