import { Check, CircleDollarSign, Clock, Hourglass, Users } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/Badge';
import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { canChange, gameState, type GameLike } from '@/features/matches';
import { formatMoneyShort, formatWhen } from '@/lib/format';
import { isApiError, messageFor } from '@/lib/http';
import { toast } from '@/stores';
import { useRespond } from '../../queries/useAttendance';
import { outcomeMessage } from '../../utils/outcomeMessages';
import styles from './Rsvp.module.css';

export interface RsvpProps {
  matchId: string;
  game: GameLike;
  /** Abre a folha de Pix (manual 3.3). */
  onPay: (matchId: string) => void;
  /** "compact" dentro de um aviso: só os botões ou o resultado. */
  variant?: 'card' | 'compact';
  /** Quem confere o Pix (Marina), quando se sabe. */
  organizerName?: string;
}

/** Status sempre por escrito (manual 1.4): texto e ícone, e só depois a cor. */
export function StatusPill({ game }: { game: GameLike }) {
  const s = gameState(game);
  switch (s.kind) {
    case 'pay':
      return (
        <Badge tone="warning" icon={<CircleDollarSign />}>
          Pagar
        </Badge>
      );
    case 'waitlist':
      return (
        <Badge tone="info" icon={<Hourglass />}>
          {s.position ? `${s.position}º na fila` : 'Na fila'}
        </Badge>
      );
    case 'paid_review':
      return (
        <Badge tone="info" icon={<Clock />}>
          Conferindo
        </Badge>
      );
    default:
      return null;
  }
}

/**
 * A ação fica onde está a informação (manual 1.1): Vou / Não vou, Pagar, fila ou "lista abre",
 * sempre no próprio card, no detalhe e no aviso.
 */
export function Rsvp({ matchId, game, onPay, variant = 'card', organizerName }: RsvpProps) {
  const respond = useRespond(matchId);
  const [changing, setChanging] = useState(false);
  const state = gameState(game);
  const compact = variant === 'compact';
  const lateFrom =
    game.withdrawalDeadline && new Date(game.withdrawalDeadline) < new Date() ? game.withdrawalDeadline : null;

  const answer = (response: 'going' | 'not_going') =>
    respond.mutate(response, {
      onSuccess: ({ outcome, participation }) => {
        setChanging(false);
        const msg = outcomeMessage(outcome, game.dropInFeeCents ?? 0, participation.waitlistPosition);
        toast(msg.text, { tone: msg.tone });
      },
      onError: (e) =>
        toast(isApiError(e) ? messageFor(e.code) : 'Não deu para responder. Tente de novo.', { tone: 'error' }),
    });

  const buttons = (deadline: string | null) => (
    <>
      {!compact && (
        <p className={styles.msg}>
          Você vai?
          {deadline ? (
            <>
              {' '}
              Responda até <b>{formatWhen(deadline)}</b>.
            </>
          ) : null}
        </p>
      )}
      {changing && lateFrom && <p className={styles.note}>Desistir agora fica registrado como desistência tardia.</p>}
      <div className={styles.pair}>
        <Button
          variant="secondary"
          onClick={() => answer('not_going')}
          loading={respond.isPending && respond.variables === 'not_going'}
          disabled={respond.isPending}
        >
          Não vou
        </Button>
        <Button
          icon={<Check size={20} strokeWidth={2.6} aria-hidden="true" />}
          onClick={() => answer('going')}
          loading={respond.isPending && respond.variables === 'going'}
          disabled={respond.isPending}
        >
          Vou
        </Button>
      </div>
    </>
  );

  const done = (pill: React.ReactNode, text?: React.ReactNode) => (
    <div className={styles.done}>
      {pill}
      {text && !compact && <span className={styles.muted}>{text}</span>}
      {canChange(game) && (
        <Button variant="ghost" size="sm" className={styles.change} onClick={() => setChanging(true)}>
          Mudar
        </Button>
      )}
    </div>
  );

  if (changing && canChange(game)) return <div className={styles.rsvp}>{buttons(null)}</div>;

  switch (state.kind) {
    case 'answer':
      return <div className={styles.rsvp}>{buttons(state.deadline)}</div>;
    case 'going':
      return done(
        <Badge tone="success" icon={<Check />}>
          Você vai
        </Badge>,
        'Nada a fazer.',
      );
    case 'not_going':
      return done(
        <Badge tone="neutral" icon={<Clock />}>
          {state.late ? 'Desistência tardia' : 'Você não vai'}
        </Badge>,
        'Se mudar de ideia, toque em Mudar.',
      );
    case 'pay':
      return (
        <div className={styles.rsvp}>
          {state.rejected ? (
            <Banner tone="danger" role="alert">
              Recusado: {state.rejected.toLowerCase()}. Envie de novo.
            </Banner>
          ) : (
            !compact && (
              <p className={styles.msg}>
                Pague <b>{formatMoneyShort(state.amountCents)}</b>
                {state.deadline ? (
                  <>
                    {' '}
                    até <b>{formatWhen(state.deadline)}</b>
                  </>
                ) : null}{' '}
                para garantir a vaga.
              </p>
            )
          )}
          <Button block icon={<CircleDollarSign size={20} aria-hidden="true" />} onClick={() => onPay(matchId)}>
            Pagar {formatMoneyShort(state.amountCents)}
          </Button>
        </div>
      );
    case 'paid_review':
      return (
        <div className={styles.done}>
          <Badge tone="info" icon={<Clock />}>
            Pagamento enviado
          </Badge>
          {!compact && (
            <span className={styles.muted}>
              {organizerName ? `${organizerName} vai conferir.` : 'Quem organiza vai conferir.'} Sua vaga fica guardada.
            </span>
          )}
        </div>
      );
    case 'waitlist':
      return (
        <div className={styles.done}>
          <Badge tone="info" icon={<Hourglass />}>
            {state.position ? `${state.position}º na fila` : 'Na fila'}
          </Badge>
          {!compact && <span className={styles.muted}>Se abrir vaga, você entra e a gente avisa.</span>}
          {canChange(game) && (
            <Button
              variant="ghost"
              size="sm"
              className={styles.change}
              onClick={() => answer('not_going')}
              loading={respond.isPending}
            >
              Sair da fila
            </Button>
          )}
        </div>
      );
    case 'not_open':
      return <p className={styles.muted}>A lista abre {formatWhen(state.opensAt)}.</p>;
    case 'closed':
      return <p className={styles.muted}>Lista fechada.</p>;
    case 'playing':
      return (
        <div className={styles.done}>
          <Badge tone="success" icon={<Users />}>
            Jogo em andamento
          </Badge>
        </div>
      );
    case 'cancelled':
      return (
        <Badge tone="danger" icon={<Clock />}>
          Jogo cancelado
        </Badge>
      );
    case 'finished':
      return null;
  }
}
