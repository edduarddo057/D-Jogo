import { Shuffle } from 'lucide-react';
import { useParams } from 'react-router';
import { ButtonLink } from '@/components/Button';
import { EmptyState, ErrorState } from '@/components/EmptyState';
import { PageHeader } from '@/components/PageHeader';
import { Skeleton } from '@/components/Skeleton';
import { can } from '@/features/groups';
import { useMatch } from '@/features/matches';
import { useMe } from '@/features/profile';
import { TeamsBoard, useDraw } from '@/features/team-draw';
import { formatMatchShort } from '@/lib/format';
import styles from '../PreferencesPage/PreferencesPage.module.css';

/** /partidas/:matchId/times — times publicados; cada um vê o próprio destacado. */
export function TeamsPage() {
  const { matchId = '' } = useParams();
  const match = useMatch(matchId);
  const draw = useDraw(matchId);
  const me = useMe();
  const published = draw.data?.status === 'published' ? draw.data : null;
  const myTeam = published?.teams.find((t) => t.members.some((m) => m.user.id === me.data?.id));

  return (
    <div className={styles.page}>
      <PageHeader
        title="Times"
        subtitle={match.data ? `${match.data.title} · ${formatMatchShort(match.data.startsAt)}` : undefined}
        back={{ to: `/partidas/${matchId}`, label: 'Voltar para a partida' }}
      />
      {(draw.isPending || match.isPending) && <Skeleton shape="card" height="30rem" />}
      {draw.isError && <ErrorState onRetry={() => void draw.refetch()} />}
      {draw.data !== undefined && !published && (
        <EmptyState
          icon={Shuffle}
          title="Os times ainda não saíram"
          description="Quando quem organiza publicar o sorteio, os times aparecem aqui."
          action={
            match.data && can(match.data.viewer, 'draw.manage') ? (
              <ButtonLink to={`/partidas/${matchId}/sorteio`}>Ir para o sorteio</ButtonLink>
            ) : undefined
          }
        />
      )}
      {published && (
        <>
          {myTeam && (
            <p>
              Você está no <strong>{myTeam.name}</strong>.
            </p>
          )}
          <TeamsBoard draw={published} meId={me.data?.id} />
          {match.data && can(match.data.viewer, 'draw.manage') && match.data.status === 'teams_published' && (
            <ButtonLink to={`/partidas/${matchId}/sorteio`} variant="outline" block>
              Refazer sorteio
            </ButtonLink>
          )}
        </>
      )}
    </div>
  );
}
