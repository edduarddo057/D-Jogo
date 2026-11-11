import { Plus, Users } from 'lucide-react';
import { Badge } from '@/components/Badge';
import { ButtonLink } from '@/components/Button';
import { EmptyState, ErrorState } from '@/components/EmptyState';
import { DateTile, List, ListItem } from '@/components/List';
import { PageHeader } from '@/components/PageHeader';
import { SkeletonList } from '@/components/Skeleton';
import { useMyGroups } from '@/features/groups';
import { avatarTone, formatMatchShort, initials } from '@/lib/format';
import styles from '../HomePage/HomePage.module.css';

/** /turmas — turmas em que a pessoa joga ou organiza. */
export function GroupsPage() {
  const groups = useMyGroups();
  const newGroup = (
    <ButtonLink to="/turmas/nova" icon={<Plus size={20} aria-hidden="true" />} size="sm">
      Nova turma
    </ButtonLink>
  );

  return (
    <div className={styles.page}>
      <PageHeader title="Turmas" actions={groups.data && groups.data.length > 0 ? newGroup : undefined} />

      {groups.isPending && <SkeletonList rows={3} label="Carregando turmas…" />}
      {groups.isError && <ErrorState onRetry={() => void groups.refetch()} retrying={groups.isRefetching} />}
      {groups.data?.length === 0 && (
        <EmptyState
          icon={Users}
          title="Você ainda não está em nenhuma turma"
          description="Crie a sua e convide a galera, ou entre pelo link de convite que o organizador mandar."
          action={newGroup}
        />
      )}
      {groups.data && groups.data.length > 0 && (
        <List label="Suas turmas">
          {groups.data.map((g) => (
            <ListItem
              key={g.id}
              to={`/turmas/${g.id}`}
              leading={<DateTile day={initials(g.name)} tone={avatarTone(g.id)} />}
              title={g.name}
              meta={
                g.nextMatch
                  ? `Próxima: ${formatMatchShort(g.nextMatch.startsAt)}`
                  : `${g.memberCount} ${g.memberCount === 1 ? 'jogador' : 'jogadores'}`
              }
              trailing={g.viewer.role === 'owner' ? <Badge tone="info">Organizador</Badge> : undefined}
            />
          ))}
        </List>
      )}
    </div>
  );
}
