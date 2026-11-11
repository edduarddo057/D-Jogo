import { formatCents } from '@/lib/format';
import type { FinanceSummary } from '../../api/financeApi';
import styles from './MonthlyInChart.module.css';

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const monthLabel = (ym: string) => MONTHS[Number(ym.slice(5)) - 1] ?? ym;

/**
 * Entradas dos últimos 6 meses (uma série: o título dá o nome, sem legenda).
 * Barras finas ancoradas na base, cantos de 4px no topo, valor só no mês atual,
 * dica com o valor ao passar o mouse ou focar, e tabela para leitores de tela.
 */
export function MonthlyInChart({ series }: { series: FinanceSummary['series'] }) {
  const max = Math.max(1, ...series.map((s) => s.inCents));
  const last = series[series.length - 1];

  return (
    <figure className={styles.figure}>
      <figcaption className={styles.caption}>Entradas por mês</figcaption>
      <div className={styles.plot} aria-hidden="true">
        {series.map((s) => {
          const current = s === last;
          return (
            <div key={s.month} className={styles.col}>
              <span className={styles.value} data-current={current || undefined}>
                {formatCents(s.inCents).replace(',00', '')}
              </span>
              <span className={styles.bar} style={{ height: `${(s.inCents / max) * 100}%` }} />
              <span className={styles.month}>{monthLabel(s.month)}</span>
            </div>
          );
        })}
      </div>
      <table className="visually-hidden">
        <caption>Entradas por mês</caption>
        <thead>
          <tr>
            <th scope="col">Mês</th>
            <th scope="col">Entradas</th>
            <th scope="col">Saídas</th>
          </tr>
        </thead>
        <tbody>
          {series.map((s) => (
            <tr key={s.month}>
              <th scope="row">{s.month}</th>
              <td>{formatCents(s.inCents)}</td>
              <td>{formatCents(s.outCents)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
