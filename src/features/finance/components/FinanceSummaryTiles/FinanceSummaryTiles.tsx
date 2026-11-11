import { formatCents } from '@/lib/format';
import type { FinanceSummary } from '../../api/financeApi';
import styles from './FinanceSummaryTiles.module.css';

/** Saldo em destaque; recebido e gasto no mês escolhido e o total a receber como apoio (RN-71). */
export function FinanceSummaryTiles({ summary }: { summary: FinanceSummary }) {
  const negative = summary.balanceCents < 0;
  return (
    <dl className={styles.tiles}>
      <div className={`${styles.tile} ${styles.hero}`}>
        <dt>Saldo do caixa</dt>
        <dd className={negative ? styles.negative : undefined}>{formatCents(summary.balanceCents)}</dd>
      </div>
      <div className={styles.tile}>
        <dt>Recebido</dt>
        <dd>{formatCents(summary.receivedInMonthCents)}</dd>
      </div>
      <div className={styles.tile}>
        <dt>Gasto</dt>
        <dd>{formatCents(summary.spentInMonthCents ?? 0)}</dd>
      </div>
      <div className={styles.tile}>
        <dt>A receber</dt>
        <dd>{formatCents(summary.receivableCents)}</dd>
      </div>
    </dl>
  );
}
