import { clsx } from 'clsx';
import { useId, type ReactNode } from 'react';
import styles from './ProgressBar.module.css';

export interface ProgressBarProps {
  value: number;
  max: number;
  /** Rótulo visível à esquerda (ex.: "13 de 16 confirmados"). */
  label: string;
  /** Texto à direita: o que a pessoa precisa saber (ex.: "3 vagas", "Lotada · 2 na espera"). */
  detail?: ReactNode;
  className?: string;
}

/** Ocupação de vagas da partida (design system › ProgressBar). */
export function ProgressBar({ value, max, label, detail, className }: ProgressBarProps) {
  const id = useId();
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div className={clsx(styles.wrapper, className)}>
      <div className={styles.head}>
        <span id={id} className={styles.label}>
          {label}
        </span>
        {detail && <span className={styles.detail}>{detail}</span>}
      </div>
      <div
        className={styles.track}
        role="progressbar"
        aria-labelledby={id}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={typeof detail === 'string' ? `${label}, ${detail}` : label}
      >
        <div className={styles.bar} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
