import { clsx } from 'clsx';
import type { ReactNode } from 'react';
import styles from './ActionBar.module.css';

export interface ActionBarProps {
  /** Texto curto à esquerda, ex.: "3 pendências". */
  summary?: ReactNode;
  /** Botões; o principal por último (mais perto do polegar direito). */
  children: ReactNode;
  label: string;
  className?: string;
}

/**
 * Barra de ações fixa perto do polegar (revisão de usabilidade): fica grudada logo acima da
 * navegação inferior no celular e no rodapé da área de conteúdo no desktop.
 * Usar no fim da página; uma por tela.
 */
export function ActionBar({ summary, children, label, className }: ActionBarProps) {
  return (
    <section className={clsx(styles.bar, className)} aria-label={label}>
      {summary && <div className={styles.summary}>{summary}</div>}
      <div className={styles.actions}>{children}</div>
    </section>
  );
}
