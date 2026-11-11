import { ChevronLeft, ChevronRight, Plus, ReceiptText } from 'lucide-react';
import { useState } from 'react';
import { Button, IconButton } from '@/components/Button';
import { EmptyState, ErrorState } from '@/components/EmptyState';
import { Skeleton } from '@/components/Skeleton';
import { can } from '@/features/groups';
import {
  FinanceSummaryTiles,
  LedgerEntryModal,
  LedgerList,
  MonthlyInChart,
  useFinanceSummary,
  useLedgerEntries,
} from '@/features/finance';
import { PaymentsReview, useGenerateMonthlyFees, useGroupPayments } from '@/features/payments';
import { formatCents } from '@/lib/format';
import { toast } from '@/stores';
import { useGroupContext } from '../GroupPage/groupContext';
import styles from './GroupFinancePage.module.css';

const MONTHS = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];
const thisMonth = () => new Date().toISOString().slice(0, 7);
const shift = (ym: string, delta: number) => {
  const [y, m] = ym.split('-').map(Number) as [number, number];
  return new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 7);
};
const label = (ym: string) => {
  const name = MONTHS[Number(ym.slice(5)) - 1] ?? '';
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} de ${ym.slice(0, 4)}`;
};

/** Aba Financeiro (dono): resumo, Pix a validar, mensalidades do mês e movimentações (RN-62 a RN-71). */
export function GroupFinancePage() {
  const { group } = useGroupContext();
  const allowed = can(group.viewer, 'group.view_finance');
  const [month, setMonth] = useState(thisMonth);
  const summary = useFinanceSummary(group.id, month);
  const entries = useLedgerEntries(group.id, month);
  const toReview = useGroupPayments(group.id, { status: ['reported'] }, allowed);
  const fees = useGroupPayments(group.id, { kind: 'monthly_fee', month }, allowed);
  const generate = useGenerateMonthlyFees(group.id);
  const [adding, setAdding] = useState(false);

  if (!allowed) return <ErrorState title="Só quem organiza vê o financeiro da turma." />;

  const paidFees = fees.data?.items.filter((p) => p.status === 'paid').length ?? 0;
  const feeItems = fees.data?.items.filter((p) => p.status !== 'cancelled') ?? [];

  return (
    <div className={styles.tab}>
      <div className={styles.monthNav}>
        <IconButton
          label="Mês anterior"
          icon={<ChevronLeft size={22} aria-hidden="true" />}
          onClick={() => setMonth((m) => shift(m, -1))}
        />
        <h2 className={styles.month} aria-live="polite">
          {label(month)}
        </h2>
        <IconButton
          label="Próximo mês"
          icon={<ChevronRight size={22} aria-hidden="true" />}
          disabled={month >= thisMonth()}
          onClick={() => setMonth((m) => shift(m, 1))}
        />
      </div>

      {summary.isPending && <Skeleton shape="card" height="20rem" />}
      {summary.isError && <ErrorState onRetry={() => void summary.refetch()} />}
      {summary.data && (
        <>
          <FinanceSummaryTiles summary={summary.data} />
          <MonthlyInChart series={summary.data.series} />
        </>
      )}

      {toReview.data && toReview.data.items.length > 0 && (
        <section className={styles.section} aria-labelledby="validar">
          <h2 id="validar" className={styles.sectionTitle}>
            Pix para validar
          </h2>
          <PaymentsReview payments={toReview.data.items} label="Pix para validar" />
        </section>
      )}

      <section className={styles.section} aria-labelledby="mensalidades">
        <div className={styles.sectionHead}>
          <h2 id="mensalidades" className={styles.sectionTitle}>
            Mensalidades
          </h2>
          {feeItems.length > 0 && (
            <span className={styles.muted}>
              {paidFees} de {feeItems.length} pagas
            </span>
          )}
        </div>
        {fees.isPending && <Skeleton shape="card" height="10rem" />}
        {fees.data && feeItems.length === 0 && (
          <EmptyState
            icon={ReceiptText}
            titleAs="h3"
            title="Nenhuma mensalidade gerada"
            description={`Gera uma cobrança de ${formatCents(group.monthlyFeeCents)} para cada mensalista (${group.monthlyCount - 1} pessoas, sem contar você).`}
            action={
              <Button
                loading={generate.isPending}
                onClick={() =>
                  generate.mutate(month, {
                    onSuccess: (r) => toast(`${r.created} mensalidades geradas.`, { tone: 'success' }),
                  })
                }
              >
                Gerar mensalidades de {MONTHS[Number(month.slice(5)) - 1]}
              </Button>
            }
          />
        )}
        {feeItems.length > 0 && <PaymentsReview payments={feeItems} label={`Mensalidades de ${label(month)}`} />}
      </section>

      <section className={styles.section} aria-labelledby="movimentacoes">
        <div className={styles.sectionHead}>
          <h2 id="movimentacoes" className={styles.sectionTitle}>
            Movimentações
          </h2>
          <Button
            variant="outline"
            size="sm"
            icon={<Plus size={18} aria-hidden="true" />}
            onClick={() => setAdding(true)}
          >
            Lançamento
          </Button>
        </div>
        {entries.isPending && <Skeleton shape="card" height="12rem" />}
        {entries.data?.length === 0 && <p className={styles.muted}>Nenhuma movimentação neste mês.</p>}
        {entries.data && entries.data.length > 0 && <LedgerList groupId={group.id} entries={entries.data} />}
      </section>

      <LedgerEntryModal groupId={group.id} open={adding} onClose={() => setAdding(false)} />
    </div>
  );
}
