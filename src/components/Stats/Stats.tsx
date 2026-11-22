import { clsx } from 'clsx';
import styles from './Stats.module.css';

export interface StatsProps {
  items: Array<{ value: string | number; label: string }>;
  label?: string;
  className?: string;
}

/** Números lado a lado ("31 jogos · 86% frequência · 4 vezes destaque"). */
export function Stats({ items, label, className }: StatsProps) {
  return (
    <dl className={clsx(styles.stats, className)} aria-label={label}>
      {items.map((it) => (
        <div key={it.label} className={styles.stat}>
          <dt className={styles.label}>{it.label}</dt>
          <dd className={styles.value}>{it.value}</dd>
        </div>
      ))}
    </dl>
  );
}
