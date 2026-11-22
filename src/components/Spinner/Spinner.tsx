import { clsx } from 'clsx';
import styles from './Spinner.module.css';

export interface SpinnerProps {
  /** Texto para leitores de tela; omita quando o contexto já anuncia o carregamento. */
  label?: string;
  size?: 'sm' | 'md';
  className?: string;
}

export function Spinner({ label, size = 'md', className }: SpinnerProps) {
  return (
    <span
      className={clsx(styles.spinner, styles[size], className)}
      role={label ? 'status' : undefined}
      aria-hidden={label ? undefined : true}
    >
      {label && <span className="visually-hidden">{label}</span>}
    </span>
  );
}
