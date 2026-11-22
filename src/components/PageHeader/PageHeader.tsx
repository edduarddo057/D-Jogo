import { clsx } from 'clsx';
import { ChevronLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import styles from './PageHeader.module.css';

export interface PageHeaderProps {
  title: string;
  subtitle?: ReactNode;
  /** Botão voltar: destino e rótulo acessível (ex.: { to: '/partidas', label: 'Voltar para Partidas' }). */
  back?: { to: string; label: string };
  /** Ações à direita (no desktop) ou abaixo do título (no celular). */
  actions?: ReactNode;
  /** "display" para telas raiz (Início, Perfil); "title" para telas internas. */
  size?: 'display' | 'title';
  className?: string;
}

/** Cabeçalho de tela: um único h1 por página, com voltar e ações opcionais. */
export function PageHeader({ title, subtitle, back, actions, size = 'title', className }: PageHeaderProps) {
  return (
    <header className={clsx(styles.header, className)}>
      {back && (
        <Link to={back.to} className={styles.back} aria-label={back.label}>
          <ChevronLeft size={22} strokeWidth={2.5} aria-hidden="true" />
        </Link>
      )}
      <div className={styles.text}>
        <h1 className={clsx(styles.title, styles[size])} tabIndex={-1}>
          {title}
        </h1>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </header>
  );
}
