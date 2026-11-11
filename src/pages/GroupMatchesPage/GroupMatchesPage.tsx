import { CalendarDays, Plus } from 'lucide-react';
import { ButtonLink } from '@/components/Button';
import { EmptyState, ErrorState } from '@/components/EmptyState';
import { List } from '@/components/List';
import { SkeletonList } from '@/components/Skeleton';
import { can } from '@/features/groups';
import { MatchListItem, useGroupMatches } from '@/features/matches';
import { useGroupContext } from '../GroupPage/groupContext';
import styles from '../GroupPlayersPage/GroupPlayersPage.module.css';

/** Aba Partidas da turma: próximas (o dono vê rascunhos) e as já jogadas. */
export function GroupMatchesPage() {
  const { group } = useGroupContext();
  const upcoming = useGroupMatches(group.id, 'upcoming');
  const past = useGroupMatches(group.id, 'past');
  const canCreate = can(group.viewer, 'match.create');
  const create = (
    <ButtonLink to={`/turmas/${group.id}/partidas/nova`} icon={<Plus size={20} aria-hidden="true" />} size="sm">
      Nova partida
    </ButtonLink>
  );

  return (
    <div className={styles.tab}>
      {canCreate && upcoming.data && upcoming.data.items.length > 0 && <div>{create}</div>}

      <section className={styles.section} aria-labelledby="proximas-turma">
        <h2 id="proximas-turma" className={styles.sectionTitle}>
          Próximas
        </h2>
        {upcoming.isPending && <SkeletonList rows={2} label="Carregando partidas…" />}
        {upcoming.isError && <ErrorState onRetry={() => void upcoming.refetch()} />}
        {upcoming.data?.items.length === 0 && (
          <EmptyState
            icon={CalendarDays}
            titleAs="h3"
            title="Nenhuma partida marcada"
            description={
              canCreate
                ? 'Marque o próximo jogo e os mensalistas já recebem a vaga reservada.'
                : 'Quando o organizador marcar, aparece aqui.'
            }
            action={canCreate ? create : undefined}
          />
        )}
        {upcoming.data && upcoming.data.items.length > 0 && (
          <List label="Próximas partidas da turma">
            {upcoming.data.items.map((m) => (
              <MatchListItem key={m.id} match={m} showGroup={false} />
            ))}
          </List>
        )}
      </section>

      {past.data && past.data.items.length > 0 && (
        <section className={styles.section} aria-labelledby="passadas-turma">
          <h2 id="passadas-turma" className={styles.sectionTitle}>
            Anteriores
          </h2>
          <List label="Partidas anteriores da turma">
            {past.data.items.map((m) => (
              <MatchListItem key={m.id} match={m} showGroup={false} />
            ))}
          </List>
        </section>
      )}
    </div>
  );
}
