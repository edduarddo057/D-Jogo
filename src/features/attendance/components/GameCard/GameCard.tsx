import { clsx } from 'clsx';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router';
import { DateTile } from '@/components/List';
import { fromState } from '@/components/NavBar';
import type { MatchSummary } from '@/features/matches';
import { formatDayOfMonth, formatHour, formatWeekdayShort, formatWhen } from '@/lib/format';
import { Rsvp } from '../Rsvp/Rsvp';
import styles from './GameCard.module.css';

export interface GameCardProps {
  game: MatchSummary;
  /** Próximo jogo: borda de destaque e as vagas. */
  highlight?: boolean;
  onPay: (matchId: string) => void;
  /** De onde o detalhe foi aberto (para o Voltar). */
  from?: { to: string; label: string };
  /** Esconde o nome da turma (na própria turma). */
  hideGroup?: boolean;
}

/** Card do jogo: data, turma, horário e local, e a próxima ação no próprio card (manual 3.2). */
export function GameCard({ game, highlight, onPay, from = { to: '/', label: 'Jogos' }, hideGroup }: GameCardProps) {
  const c = game.counts;
  const full = c.freeSpots === 0;
  const opensLater = game.listOpensAt && new Date(game.listOpensAt) > new Date();
  const place = `${formatHour(game.startsAt)} · ${game.location?.name ?? ''}`;
  const spots = opensLater
    ? `A lista abre ${formatWhen(game.listOpensAt ?? '')}`
    : full
      ? `Lista cheia · ${c.capacity} de ${c.capacity}${c.waitlisted ? ` · ${c.waitlisted} na fila` : ''}`
      : `${c.capacity - c.freeSpots} de ${c.capacity} vagas${c.waitlisted ? ` · ${c.waitlisted} na fila` : ''}`;
  return (
    <article
      className={clsx(styles.card, highlight && styles.next)}
      aria-label={`${game.groupName}, ${formatWeekdayShort(game.startsAt)} ${formatDayOfMonth(game.startsAt)}`}
    >
      <Link to={`/jogos/${game.id}`} state={fromState(from.to, from.label)} className={styles.top}>
        <DateTile weekday={formatWeekdayShort(game.startsAt)} day={String(Number(formatDayOfMonth(game.startsAt)))} />
        <span className={styles.text}>
          <span className={styles.title}>{hideGroup ? place : game.groupName}</span>
          {!hideGroup && <span className={styles.sub}>{place}</span>}
          {(highlight || hideGroup || full || opensLater) && <span className={styles.sub}>{spots}</span>}
        </span>
        <ChevronRight className={styles.chev} size={18} strokeWidth={2.4} aria-hidden="true" />
      </Link>
      {!opensLater && <Rsvp matchId={game.id} game={game} onPay={onPay} />}
    </article>
  );
}
