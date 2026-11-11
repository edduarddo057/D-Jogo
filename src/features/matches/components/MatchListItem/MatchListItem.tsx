import { Badge } from '@/components/Badge';
import { DateTile, ListItem } from '@/components/List';
import { avatarTone, formatDayOfMonth, formatMatchShort } from '@/lib/format';
import type { MatchSummary } from '../../api/matchesApi';
import { MATCH_STATUS_BADGE, PARTICIPATION_BADGE } from '../../utils/participationStatus';

/** Linha de partida: data, título, turma/horário e o selo que mais importa para quem vê. */
export function MatchListItem({ match, showGroup = true }: { match: MatchSummary; showGroup?: boolean }) {
  const statusBadge = MATCH_STATUS_BADGE[match.status];
  const mine = match.myStatus ? PARTICIPATION_BADGE[match.myStatus] : null;
  const badge =
    match.status === 'cancelled' || match.status === 'draft' || match.status === 'finished'
      ? statusBadge
      : (mine ?? statusBadge);
  const spots =
    match.status === 'open'
      ? match.counts.freeSpots > 0
        ? `${match.counts.freeSpots} ${match.counts.freeSpots === 1 ? 'vaga' : 'vagas'}`
        : `Lotada${match.counts.waitlisted ? ` · ${match.counts.waitlisted} na espera` : ''}`
      : null;
  const meta = [showGroup ? match.groupName : null, formatMatchShort(match.startsAt), !badge ? spots : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <ListItem
      to={`/partidas/${match.id}`}
      leading={<DateTile day={formatDayOfMonth(match.startsAt)} tone={avatarTone(match.groupId)} />}
      title={match.title}
      meta={meta}
      trailing={badge ? <Badge tone={badge.tone}>{badge.label}</Badge> : undefined}
    />
  );
}
