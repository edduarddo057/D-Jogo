import { clsx } from 'clsx';
import type { ComponentPropsWithRef, ElementType, ReactNode } from 'react';
import styles from './Card.module.css';

export interface CardProps extends ComponentPropsWithRef<'div'> {
  /** Elemento semântico (section, article…). Padrão: div. */
  as?: ElementType;
  padding?: 'md' | 'lg';
  /** Conteúdo lado a lado (avatar + texto + ação). */
  row?: boolean;
  children: ReactNode;
}

/** Superfície agrupadora com borda, raio e sombra suave (design system › Card). */
export function Card({ as: Tag = 'div', padding = 'lg', row, className, children, ...rest }: CardProps) {
  return (
    <Tag className={clsx(styles.card, styles[padding], row && styles.row, className)} {...rest}>
      {children}
    </Tag>
  );
}

export interface HeroCardProps {
  /** Sobretítulo em caixa alta (ex.: "Próxima partida"). */
  eyebrow?: string;
  title: ReactNode;
  /** Nível do título no documento. */
  titleAs?: 'h1' | 'h2' | 'h3';
  meta?: ReactNode;
  /** Selo de status e ações. */
  children?: ReactNode;
  className?: string;
}

/**
 * Card de destaque sobre color-brand (design system › HeroCard): próxima partida, saldo, cabeçalho
 * da turma. Um por tela. O anel decorativo é o ornamento da marca.
 */
export function HeroCard({ eyebrow, title, titleAs: Title = 'h2', meta, children, className }: HeroCardProps) {
  return (
    <article className={clsx(styles.hero, className)}>
      <span className={styles.ring} aria-hidden="true" />
      {eyebrow && <span className={styles.eyebrow}>{eyebrow}</span>}
      <div className={styles.heading}>
        <Title className={styles.heroTitle}>{title}</Title>
        {meta && <span className={styles.heroMeta}>{meta}</span>}
      </div>
      {children && <div className={styles.heroBody}>{children}</div>}
    </article>
  );
}
