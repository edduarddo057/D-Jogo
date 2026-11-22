import { clsx } from 'clsx';
import type { ReactNode } from 'react';
import styles from './Badge.module.css';

export type BadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export interface BadgeProps {
  tone?: BadgeTone;
  /** Ponto antes do texto: marca estados que ainda pedem ação (ex.: Pendente). */
  dot?: boolean;
  /** Ícone antes do texto (decorativo): status sempre com texto e ícone, e só depois a cor. */
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * Selo de status (design system › Badge). A cor reforça, o texto sempre diz o estado.
 * O mapeamento status → tom fica em cada feature, não aqui.
 */
export function Badge({ tone = 'neutral', dot = false, icon, children, className }: BadgeProps) {
  return (
    <span className={clsx(styles.badge, styles[tone], className)}>
      {dot && <span className={styles.dot} aria-hidden="true" />}
      {icon && (
        <span className={styles.icon} aria-hidden="true">
          {icon}
        </span>
      )}
      {children}
    </span>
  );
}
