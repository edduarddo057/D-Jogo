import { clsx } from 'clsx';
import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import styles from './List.module.css';

export interface ListProps {
  children: ReactNode;
  /** Nome da lista para leitores de tela, quando não há título visível ligado. */
  label?: string;
  className?: string;
}

/** Lista agrupada num único card, com divisores (design system › ListItem). */
export function List({ children, label, className }: ListProps) {
  return (
    <ul className={clsx(styles.list, className)} aria-label={label}>
      {children}
    </ul>
  );
}

interface ListItemBase {
  /** Avatar, bloco de data ou ícone. */
  leading?: ReactNode;
  title: ReactNode;
  meta?: ReactNode;
  /** Selo, valor ou ação secundária (fica fora do alvo principal quando é botão). */
  trailing?: ReactNode;
  /** Botões compactos (ícones) sempre à direita, na mesma linha. Só em linhas sem `to`/`onClick`. */
  actions?: ReactNode;
  className?: string;
}

export type ListItemProps =
  | (ListItemBase & { to: string; onClick?: never })
  | (ListItemBase & { onClick: () => void; to?: never })
  | (ListItemBase & { to?: undefined; onClick?: undefined });

/**
 * Linha da lista: a linha inteira é o alvo (link ou botão), com no mínimo 72px.
 * Com `to`, mostra a seta. `trailing` (selo, valor, ações) fica abaixo dos metadados no celular
 * e à direita a partir de 768px, para o título não ser cortado em telas estreitas.
 */
export function ListItem({ leading, title, meta, trailing, actions, to, onClick, className }: ListItemProps) {
  const body = (
    <>
      {leading && <span className={styles.leading}>{leading}</span>}
      <span className={styles.body}>
        <span className={styles.title}>{title}</span>
        {meta && (
          <span className={styles.meta}>
            <span className="visually-hidden">, </span>
            {meta}
          </span>
        )}
      </span>
    </>
  );

  return (
    <li className={clsx(styles.item, className)}>
      {to !== undefined ? (
        <Link to={to} className={styles.target}>
          {body}
          {trailing && <span className={styles.trailing}>{trailing}</span>}
          <ChevronRight className={styles.chevron} size={20} strokeWidth={2.5} aria-hidden="true" />
        </Link>
      ) : onClick ? (
        <button type="button" className={styles.target} onClick={onClick}>
          {body}
          {trailing && <span className={styles.trailing}>{trailing}</span>}
        </button>
      ) : (
        <div className={styles.target}>
          {body}
          {trailing && <span className={styles.trailing}>{trailing}</span>}
          {actions && <span className={styles.actions}>{actions}</span>}
        </div>
      )}
    </li>
  );
}

/** Bloco de data das listas de partidas ("24"). */
export function DateTile({ day, tone = 1 }: { day: string; tone?: 1 | 2 | 3 | 4 }) {
  return (
    <span className={clsx(styles.dateTile, styles[`tone${tone}`])} aria-hidden="true">
      {day}
    </span>
  );
}
