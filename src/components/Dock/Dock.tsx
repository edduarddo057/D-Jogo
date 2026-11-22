import { clsx } from 'clsx';
import type { ReactNode } from 'react';
import styles from './Dock.module.css';

/** Ação principal fixa no rodapé, perto do polegar (manual 1.2). Uma por tela. */
export function Dock({
  children,
  note,
  label,
  className,
}: {
  children: ReactNode;
  note?: ReactNode;
  label?: string;
  className?: string;
}) {
  return (
    <div className={clsx(styles.dock, className)} role={label ? 'region' : undefined} aria-label={label}>
      {children}
      {note && <p className={styles.note}>{note}</p>}
    </div>
  );
}
