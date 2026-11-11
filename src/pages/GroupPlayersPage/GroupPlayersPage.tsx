import { LogOut, Plus, Users } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '@/components/Button';
import { EmptyState, ErrorState } from '@/components/EmptyState';
import { Modal } from '@/components/Modal';
import { SkeletonList } from '@/components/Skeleton';
import { AddMemberModal, can, MembersList, useLeaveGroup, useMembers } from '@/features/groups';
import { toast } from '@/stores';
import { useGroupContext } from '../GroupPage/groupContext';
import styles from './GroupPlayersPage.module.css';

/** Aba Jogadores: mensalistas e avulsos separados; dono gerencia, jogador pode sair. */
export function GroupPlayersPage() {
  const { group } = useGroupContext();
  const members = useMembers(group.id);
  const leave = useLeaveGroup(group.id);
  const navigate = useNavigate();
  const [adding, setAdding] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const manage = can(group.viewer, 'group.manage_members');

  const monthly = members.data?.filter((m) => m.role === 'owner' || m.type === 'monthly') ?? [];
  const dropIn = members.data?.filter((m) => m.role !== 'owner' && m.type === 'drop_in') ?? [];

  const doLeave = async () => {
    await leave.mutateAsync();
    toast(`Você saiu de ${group.name}.`, { tone: 'success' });
    navigate('/turmas', { replace: true });
  };

  return (
    <div className={styles.tab}>
      <div className={styles.summary}>
        <p>
          <strong>{group.memberCount}</strong> {group.memberCount === 1 ? 'jogador' : 'jogadores'} ·{' '}
          {group.monthlyCount} {group.monthlyCount === 1 ? 'mensalista' : 'mensalistas'} · {group.dropInCount}{' '}
          {group.dropInCount === 1 ? 'avulso' : 'avulsos'}
        </p>
        {manage && (
          <Button
            variant="outline"
            size="sm"
            icon={<Plus size={18} aria-hidden="true" />}
            onClick={() => setAdding(true)}
          >
            Jogador
          </Button>
        )}
      </div>

      {members.isPending && <SkeletonList rows={4} label="Carregando jogadores…" />}
      {members.isError && <ErrorState onRetry={() => void members.refetch()} retrying={members.isRefetching} />}

      {members.data && (
        <>
          <section className={styles.section} aria-labelledby="mensalistas">
            <h2 id="mensalistas" className={styles.sectionTitle}>
              Mensalistas
            </h2>
            <MembersList groupId={group.id} members={monthly} canManage={manage} label="Mensalistas" />
          </section>

          <section className={styles.section} aria-labelledby="avulsos">
            <h2 id="avulsos" className={styles.sectionTitle}>
              Avulsos
            </h2>
            {dropIn.length > 0 ? (
              <MembersList groupId={group.id} members={dropIn} canManage={manage} label="Avulsos" />
            ) : (
              <EmptyState
                icon={Users}
                titleAs="h3"
                title="Nenhum avulso ainda"
                description={manage ? 'Mande o link de avulso para quem joga de vez em quando.' : undefined}
              />
            )}
          </section>
        </>
      )}

      {group.viewer.role !== 'owner' && (
        <Button
          variant="ghost"
          icon={<LogOut size={20} aria-hidden="true" />}
          onClick={() => setLeaving(true)}
          className={styles.leave}
        >
          Sair da turma
        </Button>
      )}

      {manage && <AddMemberModal groupId={group.id} open={adding} onClose={() => setAdding(false)} />}

      <Modal
        open={leaving}
        onClose={() => setLeaving(false)}
        title="Sair da turma?"
        description="Você sai das próximas partidas desta turma. Dá para voltar com um novo convite."
        actions={
          <>
            <Button variant="outline" onClick={() => setLeaving(false)}>
              Ficar
            </Button>
            <Button variant="danger" loading={leave.isPending} onClick={() => void doLeave()}>
              Sair
            </Button>
          </>
        }
      />
    </div>
  );
}
