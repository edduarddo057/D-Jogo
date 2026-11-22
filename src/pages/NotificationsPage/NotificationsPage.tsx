import { clsx } from 'clsx';
import {
  BellRing,
  CalendarClock,
  CircleCheck,
  CircleDollarSign,
  CircleX,
  ClipboardCheck,
  Hourglass,
  Trophy,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { EmptyState } from '@/components/EmptyState';
import { fromState, NavBar } from '@/components/NavBar';
import { Section } from '@/components/Section';
import { useSheetParam } from '@/components/Sheet';
import { SkeletonList } from '@/components/Skeleton';
import { Rsvp } from '@/features/attendance';
import { gameState, useMyMatches, type MatchSummary } from '@/features/matches';
import { useMarkNotificationsRead, useNotifications, type Notification } from '@/features/notifications';
import { formatAgo } from '@/lib/format';
import styles from './NotificationsPage.module.css';

const FROM = fromState('/avisos', 'Avisos');

const ICON: Record<Notification['kind'], LucideIcon> = {
  list_opened: CalendarClock,
  response_reminder: BellRing,
  payment_due: CircleDollarSign,
  payment_approved: CircleCheck,
  payment_rejected: CircleX,
  payments_to_review: ClipboardCheck,
  fee_charge: CircleDollarSign,
  waitlist_promoted: Hourglass,
  match_changed: CalendarClock,
  match_cancelled: CircleX,
  day_summary_ready: Trophy,
};

/**
 * Avisos (manual 3.5): dá para responder "Vou / Não vou" no próprio aviso; o aviso de pagamento abre
 * a folha de Pix (o Voltar volta para cá); avisos para o organizador levam para a aba Organizar.
 */
export function NotificationsPage() {
  const notifications = useNotifications();
  const upcoming = useMyMatches('upcoming');
  const markRead = useMarkNotificationsRead();
  const pay = useSheetParam('pagar');
  // o que era novo quando a tela abriu continua em "Novos" até sair daqui
  const [fresh, setFresh] = useState<Set<string> | null>(null);
  const marked = useRef(false);

  useEffect(() => {
    if (!notifications.data || marked.current) return;
    marked.current = true;
    setFresh(new Set(notifications.data.items.filter((n) => !n.readAt).map((n) => n.id)));
    if (notifications.data.unread > 0) markRead.mutate(undefined);
  }, [notifications.data, markRead]);

  if (notifications.isPending) return <SkeletonList rows={5} />;
  const items = notifications.data?.items ?? [];
  const isNew = (n: Notification) => (fresh ? fresh.has(n.id) : !n.readAt);
  const games = new Map((upcoming.data?.items ?? []).map((g) => [g.id, g]));

  const row = (n: Notification) => (
    <NoticeRow
      key={n.id}
      n={n}
      unread={isNew(n)}
      game={n.matchId ? games.get(n.matchId) : undefined}
      onPay={pay.open}
    />
  );

  return (
    <>
      <NavBar back={{ to: '/', label: 'Jogos' }} title="Avisos" />
      <h1 className="visually-hidden">Avisos</h1>
      {items.length === 0 ? (
        <EmptyState
          icon={BellRing}
          title="Nenhum aviso"
          description="Quando abrir uma lista ou um pagamento mudar, avisamos aqui."
        />
      ) : (
        <>
          {items.some(isNew) && (
            <Section title="Novos">
              <ul className={styles.list}>{items.filter(isNew).map(row)}</ul>
            </Section>
          )}
          {items.some((n) => !isNew(n)) && (
            <Section title="Anteriores" footnote="Nada é enviado entre 22h e 8h. Avisos repetidos chegam juntos.">
              <ul className={styles.list}>{items.filter((n) => !isNew(n)).map(row)}</ul>
            </Section>
          )}
        </>
      )}
    </>
  );
}

function NoticeRow({
  n,
  unread,
  game,
  onPay,
}: {
  n: Notification;
  unread: boolean;
  game: MatchSummary | undefined;
  onPay: (extra: Record<string, string>) => void;
}) {
  const Icon = ICON[n.kind];
  const meta = `${n.detail} · ${formatAgo(n.createdAt)}`;
  const title = n.count > 1 && n.kind !== 'payments_to_review' ? `${n.title} (${n.count})` : n.title;
  const state = game ? gameState(game) : null;

  // destino ao tocar: Pix na própria tela, Organizar, resumo ou o jogo
  const payable = state?.kind === 'pay';
  let action: { to: string; state?: unknown } | { pay: Record<string, string> } | null = null;
  if (n.kind === 'payments_to_review') action = { to: '/organizar' };
  else if (n.kind === 'day_summary_ready' && n.matchId) action = { to: `/jogos/${n.matchId}/resumo`, state: FROM };
  else if (n.kind === 'fee_charge' && n.paymentId) action = { pay: { pagamento: n.paymentId } };
  else if (payable && n.matchId) action = { pay: { jogo: n.matchId } };
  else if (game && n.matchId && n.kind !== 'list_opened' && n.kind !== 'response_reminder')
    action = { to: `/jogos/${n.matchId}`, state: FROM };

  const inlineRsvp =
    game &&
    (n.kind === 'list_opened' || n.kind === 'response_reminder') &&
    state &&
    ['answer', 'going', 'not_going', 'waitlist'].includes(state.kind);

  const body = (
    <>
      <span className={styles.title}>{title}</span>
      <span className={styles.meta}>{meta}</span>
    </>
  );

  return (
    <li className={clsx(styles.item, unread && styles.unread)}>
      <span className={styles.dot} aria-label={unread ? 'Não lido' : undefined} role={unread ? 'img' : undefined} />
      <span className={styles.icon}>
        <Icon size={20} aria-hidden="true" />
      </span>
      <div className={styles.main}>
        {action && 'to' in action ? (
          <Link to={action.to} state={action.state} className={styles.target}>
            {body}
          </Link>
        ) : action && 'pay' in action ? (
          <button type="button" className={styles.target} onClick={() => onPay(action.pay)}>
            {body}
          </button>
        ) : (
          <div className={styles.static}>{body}</div>
        )}
        {inlineRsvp && game && (
          <div className={styles.rsvp}>
            <Rsvp matchId={game.id} game={game} onPay={(id) => onPay({ jogo: id })} variant="compact" />
          </div>
        )}
      </div>
    </li>
  );
}
