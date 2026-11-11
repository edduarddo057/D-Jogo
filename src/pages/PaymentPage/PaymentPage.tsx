import { ReceiptText } from 'lucide-react';
import { useParams } from 'react-router';
import { ButtonLink } from '@/components/Button';
import { EmptyState, ErrorState } from '@/components/EmptyState';
import { PageHeader } from '@/components/PageHeader';
import { Skeleton } from '@/components/Skeleton';
import { useMatch } from '@/features/matches';
import { PixPaymentCard } from '@/features/payments';
import { formatMatchShort } from '@/lib/format';
import styles from '../PreferencesPage/PreferencesPage.module.css';

/** /partidas/:matchId/pagamento — o avulso paga a vaga com o Pix da turma. */
export function PaymentPage() {
  const { matchId = '' } = useParams();
  const match = useMatch(matchId);
  const mine = match.data?.myParticipation;
  const payment = mine?.payment;

  return (
    <div className={styles.page}>
      <PageHeader
        title="Pagamento"
        subtitle={match.data ? `${match.data.title} · ${formatMatchShort(match.data.startsAt)}` : undefined}
        back={{ to: `/partidas/${matchId}`, label: 'Voltar para a partida' }}
      />
      {match.isPending && <Skeleton shape="card" height="36rem" />}
      {match.isError && <ErrorState onRetry={() => void match.refetch()} />}
      {match.data && !payment && (
        <EmptyState
          icon={ReceiptText}
          title="Nada para pagar aqui"
          description="Você não tem cobrança nesta partida."
          action={<ButtonLink to={`/partidas/${matchId}`}>Ver partida</ButtonLink>}
        />
      )}
      {match.data && payment && (
        <PixPaymentCard
          payment={payment}
          pix={match.data.group.pix}
          deadline={mine?.status === 'awaiting_payment' ? mine.paymentDeadline : null}
        />
      )}
    </div>
  );
}
