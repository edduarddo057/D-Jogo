import { useParams } from 'react-router';
import { ErrorState } from '@/components/EmptyState';
import { PageHeader } from '@/components/PageHeader';
import { Skeleton } from '@/components/Skeleton';
import { AttendanceManager } from '@/features/attendance';
import { can } from '@/features/groups';
import { useMatch } from '@/features/matches';
import { PaymentsReview, useGroupPayments } from '@/features/payments';
import { formatMatchShort } from '@/lib/format';
import styles from '../PreferencesPage/PreferencesPage.module.css';
import local from './AttendancePage.module.css';

/** /partidas/:matchId/presencas — só o dono gerencia; os outros veem a lista na página da partida. */
export function AttendancePage() {
  const { matchId = '' } = useParams();
  const match = useMatch(matchId);
  const owner = match.data ? can(match.data.viewer, 'attendance.manage') : false;
  const payments = useGroupPayments(
    match.data?.group.id ?? '',
    { matchId, status: ['reported', 'pending', 'rejected'] },
    owner,
  );
  return (
    <div className={styles.page}>
      <PageHeader
        title="Presenças"
        subtitle={match.data ? `${match.data.title} · ${formatMatchShort(match.data.startsAt)}` : undefined}
        back={{ to: `/partidas/${matchId}`, label: 'Voltar para a partida' }}
      />
      {match.isPending && <Skeleton shape="card" height="32rem" />}
      {match.isError && <ErrorState onRetry={() => void match.refetch()} />}
      {match.data && !can(match.data.viewer, 'attendance.manage') && (
        <ErrorState title="Só quem organiza a turma gerencia as presenças." />
      )}
      {payments.data && payments.data.items.length > 0 && (
        <section className={styles.page} aria-labelledby="pagamentos-partida">
          <h2 id="pagamentos-partida" className={local.title}>
            Pagamentos dos avulsos
          </h2>
          <PaymentsReview payments={payments.data.items} label="Pagamentos dos avulsos" />
        </section>
      )}
      {match.data && owner && <AttendanceManager match={match.data} />}
    </div>
  );
}
