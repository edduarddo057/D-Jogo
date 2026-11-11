import { CalendarDays, History } from 'lucide-react';
import { useState } from 'react';
import { EmptyState, ErrorState } from '@/components/EmptyState';
import { List } from '@/components/List';
import { PageHeader } from '@/components/PageHeader';
import { SegmentedControl } from '@/components/SegmentedControl';
import { SkeletonList } from '@/components/Skeleton';
import { MatchListItem, useMyMatches, type MyMatchesScope } from '@/features/matches';
import styles from '../HomePage/HomePage.module.css';

/** /partidas — partidas de todas as minhas turmas. */
export function MatchesPage() {
  const [scope, setScope] = useState<MyMatchesScope>('upcoming');
  const matches = useMyMatches(scope);
  const upcoming = scope === 'upcoming';

  return (
    <div className={styles.page}>
      <PageHeader title="Partidas" />
      <SegmentedControl
        label="Quais partidas"
        options={[
          { value: 'upcoming', label: 'Próximas' },
          { value: 'history', label: 'Jogadas' },
        ]}
        value={scope}
        onChange={setScope}
      />
      {matches.isPending && <SkeletonList rows={3} label="Carregando partidas…" />}
      {matches.isError && <ErrorState onRetry={() => void matches.refetch()} retrying={matches.isRefetching} />}
      {matches.data?.items.length === 0 && (
        <EmptyState
          icon={upcoming ? CalendarDays : History}
          title={upcoming ? 'Nenhuma partida marcada' : 'Nenhuma partida jogada ainda'}
          description={
            upcoming
              ? 'Quando sua turma marcar um jogo, ele aparece aqui.'
              : 'As partidas em que você jogou aparecem aqui.'
          }
        />
      )}
      {matches.data && matches.data.items.length > 0 && (
        <List label={upcoming ? 'Próximas partidas' : 'Partidas jogadas'}>
          {matches.data.items.map((m) => (
            <MatchListItem key={m.id} match={m} />
          ))}
        </List>
      )}
    </div>
  );
}
