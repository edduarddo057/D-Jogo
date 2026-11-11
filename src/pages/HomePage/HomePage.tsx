import { CalendarDays, Plus, Users } from 'lucide-react';
import { ButtonLink } from '@/components/Button';
import { EmptyState, ErrorState } from '@/components/EmptyState';
import { List } from '@/components/List';
import { PageHeader } from '@/components/PageHeader';
import { Skeleton, SkeletonList } from '@/components/Skeleton';
import { useMyGroups } from '@/features/groups';
import { MatchListItem, useMyMatches } from '@/features/matches';
import { firstName, useMe } from '@/features/profile';
import styles from './HomePage.module.css';
import { NextMatchHero } from './NextMatchHero';

/** Início: próxima partida em destaque (com resposta rápida) e as seguintes. */
export function HomePage() {
  const me = useMe();
  const matches = useMyMatches('upcoming');
  const groups = useMyGroups();
  const noGroups = groups.data?.length === 0;
  const [next, ...others] = matches.data?.items ?? [];

  return (
    <div className={styles.page}>
      <PageHeader
        size="display"
        title={me.data ? `Olá, ${firstName(me.data.name)}!` : 'Olá!'}
        subtitle="Bora para mais um jogo?"
      />

      {noGroups && (
        <EmptyState
          icon={Users}
          title="Comece pela sua turma"
          description="Crie uma turma para marcar jogos e convidar a galera. Recebeu um convite? Abra o link que o organizador mandou."
          action={
            <ButtonLink to="/turmas/nova" icon={<Plus size={20} aria-hidden="true" />}>
              Criar turma
            </ButtonLink>
          }
        />
      )}

      {!noGroups && (
        <>
          {matches.isPending && <Skeleton shape="card" height="22rem" />}
          {matches.isError && <ErrorState onRetry={() => void matches.refetch()} retrying={matches.isRefetching} />}
          {matches.data?.items.length === 0 && (
            <EmptyState
              icon={CalendarDays}
              title="Nenhuma partida marcada"
              description="Quando sua turma marcar um jogo, ele aparece aqui."
            />
          )}
          {next && <NextMatchHero match={next} />}

          {others.length > 0 && (
            <section aria-labelledby="depois" className={styles.section}>
              <h2 id="depois" className={styles.sectionTitle}>
                Depois
              </h2>
              <List label="Próximas partidas">
                {others.map((m) => (
                  <MatchListItem key={m.id} match={m} />
                ))}
              </List>
            </section>
          )}
          {matches.isPending && <SkeletonList rows={1} label="Carregando partidas…" />}
        </>
      )}
    </div>
  );
}
