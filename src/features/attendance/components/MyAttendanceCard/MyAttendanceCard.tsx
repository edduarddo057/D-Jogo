import { CircleCheck, Clock, Hourglass, ListOrdered, XCircle } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button, ButtonLink } from '@/components/Button';
import type { Match } from '@/features/matches';
import { formatCents, formatDeadline, formatRemaining } from '@/lib/format';
import { isApiError, messageFor } from '@/lib/http';
import { toast } from '@/stores';
import { useRespond } from '../../queries/useAttendance';
import { outcomeMessage } from '../../utils/outcomeMessages';
import styles from './MyAttendanceCard.module.css';

interface View {
  icon: ReactNode;
  tone: 'success' | 'warning' | 'info' | 'neutral' | 'danger';
  title: string;
  text?: string;
  primary?: { label: string; response: 'going' | 'not_going' } | { label: string; to: string };
  secondary?: { label: string; response: 'going' | 'not_going' };
}

/** Decide o que mostrar no cartão "Sua presença" a partir do estado que vem da API. */
function viewFor(match: Match): View | null {
  const mine = match.myParticipation;
  const status = mine?.status;
  const dropIn = (mine?.membershipType ?? match.viewer.membershipType) === 'drop_in';
  const fee = formatCents(match.dropInFeeCents);
  const open = match.status === 'open';

  if (match.status === 'cancelled' || match.status === 'finished' || match.status === 'draft') return null;

  if (status === 'confirmed')
    return {
      icon: <CircleCheck size={24} aria-hidden="true" />,
      tone: 'success',
      title: 'Você está confirmado',
      text: open ? 'Se não puder ir, avise para liberar a vaga.' : 'Até lá!',
      ...(open
        ? { secondary: { label: dropIn ? 'Desistir da vaga' : 'Não vou mais', response: 'not_going' as const } }
        : {}),
    };

  if (!open) {
    if (status === 'waitlisted')
      return {
        icon: <ListOrdered size={24} aria-hidden="true" />,
        tone: 'neutral',
        title: 'Você não entrou desta vez',
        text: 'A lista fechou com você na espera.',
      };
    return {
      icon: <XCircle size={24} aria-hidden="true" />,
      tone: 'neutral',
      title: 'A lista está fechada',
      text: 'Fale com quem organiza se precisar de uma vaga.',
    };
  }

  if (status === 'pending')
    return {
      icon: <Clock size={24} aria-hidden="true" />,
      tone: 'warning',
      title: 'Sua vaga está reservada',
      text: `Responda até ${formatDeadline(match.responseDeadline)}.`,
      primary: { label: 'Vou jogar', response: 'going' },
      secondary: { label: 'Não vou', response: 'not_going' },
    };

  if (status === 'awaiting_payment') {
    const reported = mine?.payment?.status === 'reported';
    if (reported)
      return {
        icon: <Hourglass size={24} aria-hidden="true" />,
        tone: 'info',
        title: 'Pagamento informado',
        text: 'Quem organiza vai conferir o Pix e confirmar sua vaga.',
        primary: { label: 'Ver pagamento', to: `/partidas/${match.id}/pagamento` },
      };
    return {
      icon: <Hourglass size={24} aria-hidden="true" />,
      tone: 'warning',
      title: 'Vaga reservada: falta pagar',
      text: mine?.paymentDeadline
        ? `Pague ${fee} em até ${formatRemaining(mine.paymentDeadline)} ou a vaga volta a ficar livre.`
        : `Pague ${fee} para garantir a vaga.`,
      primary: { label: `Pagar ${fee} com Pix`, to: `/partidas/${match.id}/pagamento` },
      secondary: { label: 'Desistir', response: 'not_going' },
    };
  }

  if (status === 'waitlisted')
    return {
      icon: <ListOrdered size={24} aria-hidden="true" />,
      tone: 'info',
      title: mine?.waitlistPosition ? `Você é o ${mine.waitlistPosition}º da fila` : 'Você está na fila',
      text: 'Se abrir uma vaga, você é avisado.',
      secondary: { label: 'Sair da fila', response: 'not_going' },
    };

  // sem presença, recusou, desistiu ou expirou
  const free = match.counts.freeSpots > 0 && match.counts.waitlisted === 0;
  const declined = status === 'declined';
  return {
    icon: <CircleCheck size={24} aria-hidden="true" />,
    tone: 'neutral',
    title: declined ? 'Você disse que não vai' : status === 'expired' ? 'Seu prazo passou' : 'Bora jogar?',
    text: free
      ? dropIn && match.dropInFeeCents > 0
        ? `${match.counts.freeSpots} ${match.counts.freeSpots === 1 ? 'vaga livre' : 'vagas livres'} · ${fee} por partida.`
        : `${match.counts.freeSpots} ${match.counts.freeSpots === 1 ? 'vaga livre' : 'vagas livres'}.`
      : 'Está lotada. Você entra na lista de espera.',
    primary: {
      label: declined ? 'Mudei de ideia: vou' : free ? 'Quero jogar' : 'Entrar na fila',
      response: 'going',
    },
  };
}

/** Cartão "Sua presença" da página da partida. */
export function MyAttendanceCard({ match }: { match: Match }) {
  const respond = useRespond(match.id);
  const view = viewFor(match);
  if (!view) return null;

  const send = (response: 'going' | 'not_going') =>
    respond.mutate(response, {
      onSuccess: ({ outcome, participation }) => {
        const msg = outcomeMessage(outcome, match.dropInFeeCents, participation.waitlistPosition);
        toast(msg.text, { tone: msg.tone });
      },
      onError: (error) =>
        toast(isApiError(error) ? messageFor(error.code) : 'Não deu para responder.', { tone: 'error' }),
    });

  const pendingResponse = respond.isPending ? respond.variables : null;

  return (
    <section className={`${styles.card} ${styles[view.tone]}`} aria-labelledby="minha-presenca">
      <div className={styles.head}>
        <span className={styles.icon}>{view.icon}</span>
        <div>
          <h2 id="minha-presenca" className={styles.title}>
            {view.title}
          </h2>
          {view.text && <p className={styles.text}>{view.text}</p>}
        </div>
      </div>
      {(view.primary || view.secondary) && (
        <div className={styles.actions}>
          {view.primary &&
            ('to' in view.primary ? (
              <ButtonLink to={view.primary.to} block>
                {view.primary.label}
              </ButtonLink>
            ) : (
              <Button
                block
                loading={pendingResponse === view.primary.response}
                disabled={respond.isPending}
                onClick={() => send((view.primary as { response: 'going' | 'not_going' }).response)}
              >
                {view.primary.label}
              </Button>
            ))}
          {view.secondary && (
            <Button
              variant="outline"
              block
              loading={pendingResponse === view.secondary.response}
              disabled={respond.isPending}
              onClick={() => send(view.secondary!.response)}
            >
              {view.secondary.label}
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
