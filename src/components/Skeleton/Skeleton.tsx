import { clsx } from 'clsx';
import styles from './Skeleton.module.css';

export interface SkeletonProps {
  width?: string;
  height?: string;
  /** Raio: texto, cartão ou círculo (avatar). */
  shape?: 'text' | 'card' | 'circle';
  className?: string;
}

/**
 * Forma de carregamento no lugar do conteúdo (design system: nunca spinner de tela cheia).
 * Decorativo: quem envolve deve marcar a região com aria-busy e um texto para leitores de tela.
 */
export function Skeleton({ width, height, shape = 'text', className }: SkeletonProps) {
  return (
    <span className={clsx(styles.skeleton, styles[shape], className)} style={{ width, height }} aria-hidden="true" />
  );
}

/** Lista de N linhas no formato do ListItem. */
export function SkeletonList({ rows = 3, label = 'Carregando…' }: { rows?: number; label?: string }) {
  return (
    <div className={styles.list} role="status" aria-busy="true">
      <span className="visually-hidden">{label}</span>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className={styles.row}>
          <Skeleton shape="circle" width="4.8rem" height="4.8rem" />
          <div className={styles.lines}>
            <Skeleton width="60%" height="1.6rem" />
            <Skeleton width="40%" height="1.4rem" />
          </div>
        </div>
      ))}
    </div>
  );
}
