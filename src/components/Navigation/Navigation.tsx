import { clsx } from 'clsx';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { NavLink } from 'react-router';
import styles from './Navigation.module.css';

export interface NavigationItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Só ativo na rota exata (ex.: Jogos em "/"). */
  end?: boolean;
  /** Número de pendências (aba Organizar). */
  badge?: number;
}

export interface NavigationProps {
  items: NavigationItem[];
  /** Marca exibida no topo da barra lateral (desktop). */
  brand?: ReactNode;
  label?: string;
  className?: string;
}

/**
 * Navegação principal (design system › Navigation): barra inferior fixa até 1023px,
 * barra lateral de 240px a partir de 1024px. O item ativo tem aria-current="page".
 */
export function Navigation({ items, brand, label = 'Principal', className }: NavigationProps) {
  return (
    <nav className={clsx(styles.nav, className)} aria-label={label}>
      {brand && <div className={styles.brand}>{brand}</div>}
      <ul className={styles.list}>
        {items.map(({ to, label: text, icon: Icon, end, badge }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end ?? false}
              className={({ isActive }) => clsx(styles.link, isActive && styles.active)}
            >
              <span className={styles.iconWrap}>
                <Icon className={styles.icon} size={22} strokeWidth={2} aria-hidden="true" />
                {badge ? (
                  <span className={styles.badge} aria-hidden="true">
                    {badge > 99 ? '99+' : badge}
                  </span>
                ) : null}
              </span>
              <span>{text}</span>
              {badge ? (
                <span className="visually-hidden">
                  , {badge} {badge === 1 ? 'pendência' : 'pendências'}
                </span>
              ) : null}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
