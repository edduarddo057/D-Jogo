import { ArrowUp, Check, Plus, X } from 'lucide-react';
import { useState } from 'react';
import { Avatar } from '@/components/Avatar';
import { Button, IconButton } from '@/components/Button';
import { ErrorState } from '@/components/EmptyState';
import { List, ListItem } from '@/components/List';
import { Modal } from '@/components/Modal';
import { ProgressBar } from '@/components/ProgressBar';
import { SkeletonList } from '@/components/Skeleton';
import { useMembers } from '@/features/groups';
import type { Match } from '@/features/matches';
import { formatRemaining } from '@/lib/format';
import { isApiError, messageFor } from '@/lib/http';
import { toast } from '@/stores';
import type { Participation } from '../../api/attendanceApi';
import {
  useAddParticipation,
  useParticipations,
  usePromote,
  useRemoveParticipation,
} from '../../queries/useAttendance';
import { ParticipantsSections } from '../ParticipantsSections/ParticipantsSections';
import styles from './AttendanceManager.module.css';

const OCCUPYING = ['confirmed', 'pending', 'awaiting_payment'];
const fail = (error: unknown) =>
  toast(isApiError(error) ? messageFor(error.code) : 'Não deu para fazer isso.', { tone: 'error' });

/** Presenças (dono): confirmar, subir da fila, remover e adicionar jogadores (RN-26, RN-28, RN-31). */
export function AttendanceManager({ match }: { match: Match }) {
  const list = useParticipations(match.id);
  const members = useMembers(match.group.id);
  const add = useAddParticipation(match.id);
  const promote = usePromote(match.id);
  const remove = useRemoveParticipation(match.id);
  const [removing, setRemoving] = useState<Participation | null>(null);
  const [adding, setAdding] = useState(false);

  const editable = match.status === 'open' || match.status === 'closed';
  const counts = list.data?.counts ?? match.counts;
  const free = counts.freeSpots;
  const busy = (id: string) =>
    (promote.isPending && promote.variables === id) || (add.isPending && add.variables === id);

  const meta = (p: Participation) => {
    if (p.status !== 'awaiting_payment') return null;
    if (p.payment?.status === 'reported') return 'Pix informado';
    return p.paymentDeadline ? `paga em ${formatRemaining(p.paymentDeadline)}` : null;
  };

  const actions = (p: Participation) => {
    if (!editable) return null;
    const removeBtn =
      OCCUPYING.includes(p.status) || p.status === 'waitlisted' ? (
        <IconButton
          label={`Remover ${p.user.name}`}
          icon={<X size={20} aria-hidden="true" />}
          onClick={() => setRemoving(p)}
        />
      ) : null;
    if (p.status === 'waitlisted')
      return (
        <>
          <IconButton
            label={`Subir ${p.user.name} da fila`}
            title={free === 0 ? 'Sem vaga livre' : 'Subir da fila'}
            icon={<ArrowUp size={20} aria-hidden="true" />}
            disabled={free === 0 || busy(p.id)}
            onClick={() =>
              promote.mutate(p.id, {
                onSuccess: (r) => toast(`${r.user.name} subiu da fila.`, { tone: 'success' }),
                onError: fail,
              })
            }
          />
          {removeBtn}
        </>
      );
    if (
      p.status === 'pending' ||
      ((p.status === 'declined' || p.status === 'left' || p.status === 'expired') && free > 0)
    )
      return (
        <>
          <IconButton
            label={`Confirmar ${p.user.name}`}
            title="Confirmar"
            icon={<Check size={20} aria-hidden="true" />}
            disabled={busy(p.user.id)}
            onClick={() =>
              add.mutate(p.user.id, {
                onSuccess: () => toast(`${p.user.name} confirmado.`, { tone: 'success' }),
                onError: fail,
              })
            }
          />
          {removeBtn}
        </>
      );
    return removeBtn;
  };

  const inList = new Set(
    (list.data?.items ?? [])
      .filter((p) => OCCUPYING.includes(p.status) || p.status === 'waitlisted')
      .map((p) => p.user.id),
  );
  const candidates = (members.data ?? []).filter((m) => !inList.has(m.user.id));

  return (
    <div className={styles.manager}>
      <ProgressBar
        value={counts.confirmed}
        max={counts.capacity}
        label={`${counts.confirmed} de ${counts.capacity} confirmados`}
        detail={
          free > 0
            ? `${free} ${free === 1 ? 'vaga livre' : 'vagas livres'}`
            : `Lotada${counts.waitlisted ? ` · ${counts.waitlisted} na espera` : ''}`
        }
      />

      {editable && (
        <Button
          variant="outline"
          icon={<Plus size={20} aria-hidden="true" />}
          onClick={() => setAdding(true)}
          disabled={free === 0}
        >
          {free === 0 ? 'Sem vaga para adicionar' : 'Adicionar jogador'}
        </Button>
      )}

      {list.isPending && <SkeletonList rows={5} label="Carregando presenças…" />}
      {list.isError && <ErrorState onRetry={() => void list.refetch()} />}
      {list.data && (
        <ParticipantsSections items={list.data.items} meta={meta} actions={actions} showEmpty headingAs="h2" />
      )}

      <Modal
        open={removing !== null}
        onClose={() => setRemoving(null)}
        title={`Remover ${removing?.user.name ?? ''}?`}
        description={
          removing?.status === 'waitlisted'
            ? 'Sai da lista de espera desta partida.'
            : 'A vaga fica livre e, se a turma sobe a fila sozinha, o próximo da espera entra.'
        }
        actions={
          <>
            <Button variant="outline" onClick={() => setRemoving(null)}>
              Voltar
            </Button>
            <Button
              variant="danger"
              loading={remove.isPending}
              onClick={() =>
                removing &&
                remove.mutate(removing.id, {
                  onSuccess: () => {
                    toast(`${removing.user.name} saiu da partida.`, { tone: 'success' });
                    setRemoving(null);
                  },
                  onError: fail,
                })
              }
            >
              Remover
            </Button>
          </>
        }
      />

      <Modal
        open={adding}
        onClose={() => setAdding(false)}
        title="Adicionar jogador"
        description="Entra direto como confirmado, sem cobrança automática."
      >
        {candidates.length === 0 ? (
          <p className={styles.empty}>Todo mundo da turma já está na lista.</p>
        ) : (
          <List label="Jogadores da turma">
            {candidates.map((m) => (
              <ListItem
                key={m.id}
                leading={<Avatar id={m.user.id} name={m.user.name} src={m.user.photoUrl} size="sm" decorative />}
                title={m.user.name}
                meta={m.type === 'monthly' ? 'Mensalista' : 'Avulso'}
                actions={
                  <Button
                    size="sm"
                    variant="outline"
                    loading={busy(m.user.id)}
                    disabled={add.isPending}
                    aria-label={`Adicionar ${m.user.name}`}
                    onClick={() =>
                      add.mutate(m.user.id, {
                        onSuccess: () => {
                          toast(`${m.user.name} confirmado.`, { tone: 'success' });
                          setAdding(false);
                        },
                        onError: fail,
                      })
                    }
                  >
                    Adicionar
                  </Button>
                }
              />
            ))}
          </List>
        )}
      </Modal>
    </div>
  );
}
