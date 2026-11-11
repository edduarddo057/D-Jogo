import { History } from 'lucide-react';
import { Badge } from '@/components/Badge';
import { EmptyState, ErrorState } from '@/components/EmptyState';
import { List, ListItem } from '@/components/List';
import { PageHeader } from '@/components/PageHeader';
import { SkeletonList } from '@/components/Skeleton';
import { MatchListItem, useMyMatches } from '@/features/matches';
import { paymentLabel, useMyPayments } from '@/features/payments';
import { formatCents } from '@/lib/format';
import styles from '../HomePage/HomePage.module.css';

const PAY_BADGE = {
  pending: { tone: 'warning', label: 'Pendente' },
  reported: { tone: 'info', label: 'Informado' },
  rejected: { tone: 'danger', label: 'Recusado' },
  paid: { tone: 'success', label: 'Pago' },
  cancelled: { tone: 'neutral', label: 'Cancelado' },
} as const;

/** /perfil/historico — partidas jogadas e pagamentos (histórico mínimo do MVP). */
export function HistoryPage() {
  const matches = useMyMatches('history');
  const payments = useMyPayments();

  return (
    <div className={styles.page}>
      <PageHeader title="Histórico" back={{ to: '/perfil', label: 'Voltar para o Perfil' }} />

      <section className={styles.section} aria-labelledby="jogadas">
        <h2 id="jogadas" className={styles.sectionTitle}>
          Partidas jogadas {matches.data && <span className="visually-hidden">({matches.data.items.length})</span>}
        </h2>
        {matches.isPending && <SkeletonList rows={2} label="Carregando partidas…" />}
        {matches.isError && <ErrorState onRetry={() => void matches.refetch()} />}
        {matches.data?.items.length === 0 && (
          <EmptyState
            icon={History}
            titleAs="h3"
            title="Nenhuma partida ainda"
            description="As partidas finalizadas em que você jogou aparecem aqui."
          />
        )}
        {matches.data && matches.data.items.length > 0 && (
          <List label="Partidas jogadas">
            {matches.data.items.map((m) => (
              <MatchListItem key={m.id} match={m} />
            ))}
          </List>
        )}
      </section>

      <section className={styles.section} aria-labelledby="pagamentos">
        <h2 id="pagamentos" className={styles.sectionTitle}>
          Pagamentos
        </h2>
        {payments.isPending && <SkeletonList rows={2} label="Carregando pagamentos…" />}
        {payments.data?.items.length === 0 && <p>Nenhum pagamento por aqui.</p>}
        {payments.data && payments.data.items.length > 0 && (
          <List label="Pagamentos">
            {payments.data.items.map((p) => {
              const b = PAY_BADGE[p.status];
              const common = {
                title: `${paymentLabel(p)} · ${formatCents(p.amountCents)}`,
                meta: new Date(p.createdAt).toLocaleDateString('pt-BR'),
                trailing: <Badge tone={b.tone}>{b.label}</Badge>,
              };
              const payable = p.matchId && (p.status === 'pending' || p.status === 'rejected');
              return payable ? (
                <ListItem key={p.id} {...common} to={`/partidas/${p.matchId}/pagamento`} />
              ) : (
                <ListItem key={p.id} {...common} />
              );
            })}
          </List>
        )}
      </section>
    </div>
  );
}
