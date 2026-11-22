import { clsx } from 'clsx';
import { useId, type ReactNode } from 'react';
import styles from './Section.module.css';

export interface SectionProps {
  title?: ReactNode;
  /** À direita do título (contagem, link "Exportar"). */
  aside?: ReactNode;
  /** Nota curta embaixo do grupo. */
  footnote?: ReactNode;
  children: ReactNode;
  className?: string;
  titleAs?: 'h2' | 'h3';
}

/** Grupo de conteúdo com título pequeno e nota de rodapé (listas agrupadas). */
export function Section({ title, aside, footnote, children, className, titleAs: Title = 'h2' }: SectionProps) {
  const id = useId();
  return (
    <section className={clsx(styles.section, className)} aria-labelledby={title ? id : undefined}>
      {(title || aside) && (
        <div className={styles.header}>
          {title && (
            <Title id={id} className={styles.title}>
              {title}
            </Title>
          )}
          {aside && <span className={styles.aside}>{aside}</span>}
        </div>
      )}
      {children}
      {footnote && <p className={styles.footnote}>{footnote}</p>}
    </section>
  );
}
