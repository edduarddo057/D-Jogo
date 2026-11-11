import { CalendarDays, Clock, MapPin, SearchX } from 'lucide-react';
import { useParams } from 'react-router';
import { AvatarStack } from '@/components/Avatar';
import { Badge } from '@/components/Badge';
import { ButtonLink } from '@/components/Button';
import { EmptyState, ErrorState } from '@/components/EmptyState';
import { PageHeader } from '@/components/PageHeader';
import { ProgressBar } from '@/components/ProgressBar';
import { Skeleton } from '@/components/Skeleton';
import { MyAttendanceCard, ParticipantsSections, useParticipations } from '@/features/attendance';
import { can } from '@/features/groups';
import { MATCH_STATUS_BADGE, useMatch } from '@/features/matches';
import { formatCents, formatMatchLong, formatTimeRange } from '@/lib/format';
import { isApiError } from '@/lib/http';
import { MatchOwnerActions } from './MatchOwnerActions';
import styles from './MatchPage.module.css';

/** /partidas/:matchId — detalhe, minha presença, lista e (para o dono) ações. */
export function MatchPage() {
  const { matchId = '' } = useParams();
  const query = useMatch(matchId);
  const participants = useParticipations(matchId);

  if (query.isPending) {
    return (
      <div className={styles.page}>
        <Skeleton width="60%" height="3.2rem" />
        <Skeleton shape="card" height="18rem" />
        <Skeleton shape="card" height="12rem" />
      </div>
    );
  }
  if (query.isError) {
    if (isApiError(query.error) && query.error.status === 404)
      return (
        <div className={styles.page}>
          <PageHeader title="Partida não encontrada" back={{ to: '/partidas', label: 'Voltar para Partidas' }} />
          <EmptyState
            icon={SearchX}
            title="Não achamos essa partida"
            description="Ela pode ser de uma turma da qual você não faz parte."
            action={<ButtonLink to="/partidas">Ver minhas partidas</ButtonLink>}
          />
        </div>
      );
    return <ErrorState onRetry={() => void query.refetch()} retrying={query.isRefetching} />;
  }

  const match = query.data;
  const c = match.counts;
  const statusBadge = MATCH_STATUS_BADGE[match.status];
  const owner = can(match.viewer, 'match.manage');
  const spotsText =
    c.freeSpots > 0
      ? `${c.freeSpots} ${c.freeSpots === 1 ? 'vaga livre' : 'vagas livres'}`
      : `Lotada${c.waitlisted ? ` · ${c.waitlisted} na espera` : ''}`;

  return (
    <div className={styles.page}>
      <PageHeader
        title={match.title}
        subtitle={match.group.name}
        back={{ to: `/turmas/${match.group.id}/partidas`, label: 'Voltar para as partidas da turma' }}
      />

      {match.status === 'cancelled' && (
        <p className={styles.cancelled} role="status">
          <strong>Partida cancelada.</strong> {match.cancelReason}
        </p>
      )}

      <section className={styles.info} aria-label="Quando e onde">
        {statusBadge && <Badge tone={statusBadge.tone}>{statusBadge.label}</Badge>}
        <ul className={styles.facts}>
          <li>
            <CalendarDays size={18} aria-hidden="true" /> {formatMatchLong(match.startsAt)}
          </li>
          <li>
            <Clock size={18} aria-hidden="true" /> {formatTimeRange(match.startsAt, match.endsAt)}
          </li>
          <li>
            <MapPin size={18} aria-hidden="true" />
            <span>
              {match.location.name}
              {match.location.address && <span className={styles.muted}> · {match.location.address}</span>}
            </span>
          </li>
        </ul>
        <ProgressBar
          value={c.confirmed}
          max={c.capacity}
          label={`${c.confirmed} de ${c.capacity} confirmados`}
          detail={spotsText}
        />
        <div className={styles.infoFoot}>
          {match.participantsPreview && match.participantsPreview.length > 0 && (
            <AvatarStack people={match.participantsPreview} total={c.confirmed} />
          )}
          {match.dropInFeeCents > 0 && (
            <span className={styles.muted}>Avulso: {formatCents(match.dropInFeeCents)}</span>
          )}
        </div>
      </section>

      <MyAttendanceCard match={match} />

      {match.status === 'teams_published' || (match.status === 'in_progress' && match.myTeamId) ? (
        <ButtonLink to={`/partidas/${match.id}/times`} variant="outline" block>
          Ver times
        </ButtonLink>
      ) : null}

      {owner && <MatchOwnerActions match={match} />}

      {match.status !== 'draft' && (
        <section className={styles.listSection} aria-labelledby="lista">
          <h2 id="lista" className={styles.sectionTitle}>
            Lista da partida
          </h2>
          {participants.isPending && <Skeleton shape="card" height="16rem" />}
          {participants.data && <ParticipantsSections items={participants.data.items} />}
        </section>
      )}
    </div>
  );
}
