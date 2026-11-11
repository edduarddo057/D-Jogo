import { Badge } from '@/components/Badge';
import { Button, ButtonLink } from '@/components/Button';
import { HeroCard } from '@/components/Card';
import { ProgressBar } from '@/components/ProgressBar';
import { useRespond } from '@/features/attendance';
import { PARTICIPATION_BADGE, type MatchSummary } from '@/features/matches';
import { formatMatchShort } from '@/lib/format';
import { isApiError, messageFor } from '@/lib/http';
import { toast } from '@/stores';
import styles from './HomePage.module.css';

/** Destaque da próxima partida. Mensalista com vaga reservada responde daqui mesmo. */
export function NextMatchHero({ match }: { match: MatchSummary }) {
  const respond = useRespond(match.id);
  const badge = match.myStatus ? PARTICIPATION_BADGE[match.myStatus] : null;
  const c = match.counts;
  const pending = match.myStatus === 'pending' && match.status === 'open';

  const send = (r: 'going' | 'not_going') =>
    respond.mutate(r, {
      onSuccess: () =>
        toast(r === 'going' ? 'Presença confirmada. Bom jogo!' : 'Anotado: você não vai desta vez.', {
          tone: r === 'going' ? 'success' : 'neutral',
        }),
      onError: (e) => toast(isApiError(e) ? messageFor(e.code) : 'Não deu para responder.', { tone: 'error' }),
    });

  return (
    <HeroCard
      eyebrow="Próxima partida"
      title={match.title}
      meta={[match.title === match.groupName ? null : match.groupName, formatMatchShort(match.startsAt)]
        .filter(Boolean)
        .join(' · ')}
    >
      {badge && (
        <Badge tone={badge.tone} className={styles.heroBadge}>
          {badge.label}
        </Badge>
      )}
      {/* o cartão é sempre escuro: usa os tokens do tema escuro para texto e trilho */}
      <div data-theme="dark" className={styles.heroProgress}>
        <ProgressBar
          value={c.confirmed}
          max={c.capacity}
          label={`${c.confirmed} de ${c.capacity} confirmados`}
          detail={c.freeSpots > 0 ? `${c.freeSpots} ${c.freeSpots === 1 ? 'vaga' : 'vagas'}` : 'Lotada'}
        />
      </div>
      <div className={styles.heroActions}>
        {pending ? (
          <>
            <Button
              variant="inverse"
              loading={respond.isPending && respond.variables === 'going'}
              disabled={respond.isPending}
              onClick={() => send('going')}
            >
              Vou jogar
            </Button>
            <Button
              variant="onBrand"
              loading={respond.isPending && respond.variables === 'not_going'}
              disabled={respond.isPending}
              onClick={() => send('not_going')}
            >
              Não vou
            </Button>
          </>
        ) : (
          <ButtonLink to={`/partidas/${match.id}`} variant="inverse">
            Ver partida
          </ButtonLink>
        )}
      </div>
      {pending && (
        <ButtonLink to={`/partidas/${match.id}`} variant="onBrand" size="sm" className={styles.heroMore}>
          Ver detalhes da partida
        </ButtonLink>
      )}
    </HeroCard>
  );
}
