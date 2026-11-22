import { teamColor } from '@/features/live';
import styles from './TeamTag.module.css';

/** Letra do time na cor dele (manual 6: nada depende só da cor). */
export function TeamTag({ index, letter, size = 'sm' }: { index: number; letter: string; size?: 'sm' | 'md' }) {
  return (
    <span
      className={size === 'md' ? `${styles.tag} ${styles.md}` : styles.tag}
      style={{ background: teamColor(index) }}
      aria-hidden="true"
    >
      {letter}
    </span>
  );
}
