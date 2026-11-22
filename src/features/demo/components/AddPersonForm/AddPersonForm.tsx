import { useState, type FormEvent } from 'react';
import { Button } from '@/components/Button';
import { Chips } from '@/components/Chips';
import { SegmentedControl } from '@/components/SegmentedControl';
import { TextField } from '@/components/TextField';
import type { Member } from '@/features/groups';
import { useSports } from '@/features/profile';
import { isApiError, messageFor } from '@/lib/http';
import { toast } from '@/stores';
import { useAddDemoPerson } from '../../useAddDemoPerson';
import styles from './AddPersonForm.module.css';

export interface AddPersonFormProps {
  groupId: string;
  sportId: string;
  /** Depois de adicionar (a pessoa já é membro e está confirmada no próximo jogo). */
  onAdded: (member: Member) => void;
  submitLabel?: string;
}

/**
 * Adicionar pessoa sem conta (modo demonstração): só o nome é obrigatório. Posição, nível, tipo e
 * gênero ajudam o sorteio, mas dá para deixar em branco.
 */
export function AddPersonForm({ groupId, sportId, onAdded, submitLabel = 'Adicionar' }: AddPersonFormProps) {
  const sports = useSports();
  const add = useAddDemoPerson(groupId);
  const [name, setName] = useState('');
  const [position, setPosition] = useState<string | null>(null);
  const [level, setLevel] = useState('0');
  const [type, setType] = useState<'drop_in' | 'monthly'>('drop_in');
  const [gender, setGender] = useState<'female' | 'male' | null>(null);
  const [error, setError] = useState<string | undefined>();
  const positions = sports.data?.find((s) => s.id === sportId)?.positions ?? [];

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) return setError('Digite o nome da pessoa.');
    add.mutate(
      { name: name.trim(), position, level: level === '0' ? null : Number(level), gender, type },
      {
        onSuccess: ({ member }) => {
          onAdded(member);
          setName('');
          setPosition(null);
          setLevel('0');
          setGender(null);
        },
        onError: (err) => toast(isApiError(err) ? messageFor(err.code) : 'Não deu para adicionar.', { tone: 'error' }),
      },
    );
  };

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <TextField
        label="Nome"
        placeholder="Ex.: Paula Mendes"
        autoComplete="off"
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          setError(undefined);
        }}
        error={error}
        hint="Sem conta nem cadastro: a pessoa existe só nesta demonstração."
      />
      {positions.length > 0 && (
        <Chips
          label="Posição"
          hint="opcional"
          options={positions.map((p) => ({ value: p.id, label: p.label.replace(/\(a\)$/, '') }))}
          value={position}
          onChange={(v) => setPosition(v === position ? null : v)}
        />
      )}
      <div className={styles.field}>
        <span className={styles.label} aria-hidden="true">
          Nível <span className={styles.hint}>opcional, para equilibrar o sorteio</span>
        </span>
        <SegmentedControl
          label="Nível"
          options={[
            { value: '0', label: '–' },
            ...[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: String(n) })),
          ]}
          value={level}
          onChange={setLevel}
        />
      </div>
      <div className={styles.field}>
        <span className={styles.label} aria-hidden="true">
          Tipo
        </span>
        <SegmentedControl
          label="Tipo"
          options={[
            { value: 'drop_in', label: 'Avulso' },
            { value: 'monthly', label: 'Mensalista' },
          ]}
          value={type}
          onChange={setType}
        />
      </div>
      <Chips
        label="Gênero"
        hint="opcional, só para o sorteio misto"
        options={[
          { value: 'female', label: 'Feminino' },
          { value: 'male', label: 'Masculino' },
        ]}
        value={gender}
        onChange={(v) => setGender(v === gender ? null : v)}
      />
      <Button type="submit" block loading={add.isPending}>
        {submitLabel}
      </Button>
    </form>
  );
}
