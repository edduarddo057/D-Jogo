import { clsx } from 'clsx';
import type { LucideIcon } from 'lucide-react';
import styles from './Medal.module.css';

export type MedalTone = 'green' | 'bronze' | 'gold' | 'locked';

/**
 * Medalha de pódio (mural e conquistas): fita em V e moeda metálica com o ícone gravado.
 * "locked" = ainda não conquistada: prateada e apagada. Decorativa (o texto fica ao lado).
 */
export function Medal({
  icon: Icon,
  tone,
  size = 'md',
  className,
}: {
  icon: LucideIcon;
  tone: MedalTone;
  size?: 'md' | 'lg';
  className?: string;
}) {
  return (
    <span className={clsx(styles.coin, styles[tone], size === 'lg' && styles.lg, className)} aria-hidden="true">
      <span className={styles.ribbon} />
      <span className={styles.face}>
        <Icon size={size === 'lg' ? 30 : 20} strokeWidth={2.4} />
      </span>
    </span>
  );
}
