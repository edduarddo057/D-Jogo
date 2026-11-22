import { clsx } from 'clsx';
import type { ReactNode } from 'react';
import styles from './Banner.module.css';

export interface BannerProps {
  tone?: 'success' | 'warning' | 'danger' | 'info';
  icon?: ReactNode;
  children: ReactNode;
  role?: 'status' | 'alert';
  className?: string;
}

/** Aviso dentro da tela, com texto (a cor só reforça). */
export function Banner({ tone = 'info', icon, children, role, className }: BannerProps) {
  return (
    <div className={clsx(styles.banner, styles[tone], className)} role={role}>
      {icon && <span className={styles.icon}>{icon}</span>}
      <div>{children}</div>
    </div>
  );
}
