import { clsx } from 'clsx';
import { ChevronLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import styles from './NavBar.module.css';
import { useBack, type BackTarget } from './useBack';

export interface NavBarProps {
  /** Destino padrão do Voltar e o rótulo (o nome da tela de origem). */
  back?: BackTarget;
  /** Troca o Voltar por outro texto e ação (ex.: "Sair" no dia de jogo). */
  leading?: { label: string; onClick: () => void };
  title?: string;
  actions?: ReactNode;
  className?: string;
}

/** Barra do topo das telas internas: Voltar com o nome da origem, título e ações à direita. */
export function NavBar({ back, leading, title, actions, className }: NavBarProps) {
  return (
    <header className={clsx(styles.nav, className)}>
      <div className={styles.side}>
        {leading ? (
          <button type="button" className={styles.back} onClick={leading.onClick}>
            <ChevronLeft size={24} strokeWidth={2.4} aria-hidden="true" />
            {leading.label}
          </button>
        ) : (
          back && <BackButton target={back} />
        )}
      </div>
      <div className={styles.title}>{title}</div>
      <div className={clsx(styles.side, styles.end)}>{actions}</div>
    </header>
  );
}

function BackButton({ target }: { target: BackTarget }) {
  const { label, go } = useBack(target);
  return (
    <button type="button" className={styles.back} onClick={go} aria-label={`Voltar para ${label}`}>
      <ChevronLeft size={24} strokeWidth={2.4} aria-hidden="true" />
      <span aria-hidden="true">{label}</span>
    </button>
  );
}

export interface PageTitleProps {
  title: string;
  /** Linha acima do título (ex.: nome da turma). */
  eyebrow?: ReactNode;
  /** Linha abaixo (ex.: horário). */
  subtitle?: ReactNode;
  actions?: ReactNode;
  leading?: ReactNode;
  size?: 'large' | 'medium';
  className?: string;
}

/** Título grande das telas (um h1 por tela). */
export function PageTitle({ title, eyebrow, subtitle, actions, leading, size = 'large', className }: PageTitleProps) {
  return (
    <div className={clsx(styles.large, className)}>
      {leading}
      <div className={styles.titleText}>
        {eyebrow && <span className={styles.muted}>{eyebrow}</span>}
        <h1 className={clsx(styles.h1, size === 'medium' && styles.medium)} tabIndex={-1}>
          {title}
        </h1>
        {subtitle && <span className={styles.muted}>{subtitle}</span>}
      </div>
      {actions && <div className={styles.titleActions}>{actions}</div>}
    </div>
  );
}

export interface NavIconButtonProps {
  label: string;
  icon: ReactNode;
  onClick?: () => void;
  /** Ponto vermelho de "novo" (ex.: Avisos). */
  dot?: boolean;
  className?: string;
}

/** Botão de ícone das barras (44×44). */
export function NavIconButton({ label, icon, onClick, dot, className }: NavIconButtonProps) {
  return (
    <button type="button" className={clsx(styles.iconButton, className)} aria-label={label} onClick={onClick}>
      {icon}
      {dot && <span className={styles.dot} aria-hidden="true" />}
    </button>
  );
}
