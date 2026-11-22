import { clsx } from 'clsx';
import styles from './BrandLogo.module.css';

export interface BrandLogoProps {
  /** "auto" segue o tema; "on-dark" para superfícies escuras (splash, cards da marca). */
  tone?: 'auto' | 'on-dark';
  size?: 'sm' | 'md' | 'lg';
  /** Só o símbolo, sem o "Dá Jogo". */
  symbolOnly?: boolean;
  className?: string;
}

/**
 * Logotipo (design system › Marca): o símbolo + "Dá Jogo" em itálico pesado, "Dá" na cor do texto e
 * "Jogo" em laranja. No tema claro, o branco do símbolo vira grafite (public/brand/symbol-on-light.png).
 */
export function BrandLogo({ tone = 'auto', size = 'md', symbolOnly, className }: BrandLogoProps) {
  return (
    <span
      className={clsx(styles.logo, styles[size], tone === 'on-dark' && styles.onDark, className)}
      role="img"
      aria-label="Dá Jogo"
    >
      <img className={styles.symbolLight} src="/brand/symbol-on-light.png" alt="" width="914" height="656" />
      <img className={styles.symbolDark} src="/brand/symbol.png" alt="" width="914" height="656" />
      {!symbolOnly && (
        <span className={styles.word} aria-hidden="true">
          Dá <span className={styles.accent}>Jogo</span>
        </span>
      )}
    </span>
  );
}
