import { clsx } from 'clsx';
import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import styles from './List.module.css';

export interface ListProps {
  children: ReactNode;
  /** Sem respiro lateral (linhas que pintam o fundo inteiro, como a chegada). */
  flush?: boolean;
  /** Nome da lista para leitores de tela, quando não há título visível ligado. */
  label?: string;
  className?: string;
}

/** Lista agrupada num único card, com divisores (design system › ListItem). */
export function List({ children, label, flush, className }: ListProps) {
  return (
    <ul className={clsx(styles.list, flush && styles.flush, className)} aria-label={label}>
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
  /** `trailing` à direita também no celular (valores curtos: "Nível 4", "+ R$ 90,00"). */
  inline?: boolean;
  /** Linha de ação perigosa (Sair da turma, Excluir conta) ou de destaque (Sair). */
  tone?: 'danger' | 'accent';
  /** Conteúdo extra embaixo da linha (ex.: botões Vou / Não vou dentro de um aviso). */
  below?: ReactNode;
  /** `state` do link (ex.: de onde veio, para o Voltar). */
  linkState?: unknown;
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
export function ListItem({
  leading,
  title,
  meta,
  trailing,
  actions,
  inline,
  tone,
  below,
  linkState,
  to,
  onClick,
  className,
}: ListItemProps) {
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
    <li className={clsx(styles.item, inline && styles.inline, tone && styles[tone], className)}>
      {to !== undefined ? (
        <Link to={to} state={linkState} className={styles.target}>
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
      {below && <div className={styles.below}>{below}</div>}
    </li>
  );
}

/** Bloco de data dos jogos: dia da semana em cima, dia do mês embaixo ("SÁB 28"). */
export function DateTile({ weekday, day, className }: { weekday: string; day: string; className?: string }) {
  return (
    <span className={clsx(styles.dateTile, className)} aria-hidden="true">
      <small>{weekday}</small>
      <b>{day}</b>
    </span>
  );
}
