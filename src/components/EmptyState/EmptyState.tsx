import { clsx } from 'clsx';
import { CircleAlert, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '../Button';
import styles from './EmptyState.module.css';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: ReactNode;
  /** Ação que resolve o vazio (ex.: <ButtonLink to="/turmas/nova">Criar turma</ButtonLink>). */
  action?: ReactNode;
  /** Nível do título; padrão h2 (a página já tem o h1). */
  titleAs?: 'h2' | 'h3';
  className?: string;
}

/** Lista vazia com orientação e ação (design system › estados de tela). */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  titleAs: Title = 'h2',
  className,
}: EmptyStateProps) {
  return (
    <div className={clsx(styles.state, className)}>
      {Icon && (
        <span className={styles.icon} aria-hidden="true">
          <Icon size={28} />
        </span>
      )}
      <Title className={styles.title}>{title}</Title>
      {description && <p className={styles.description}>{description}</p>}
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}

export interface ErrorStateProps {
  title?: string;
  description?: ReactNode;
  onRetry?: () => void;
  retrying?: boolean;
  className?: string;
}

/** Falha ao carregar, com "Tentar de novo" (design system › estados de tela). */
export function ErrorState({
  title = 'Não deu para carregar',
  description = 'Confira sua conexão e tente de novo.',
  onRetry,
  retrying = false,
  className,
}: ErrorStateProps) {
  return (
    <div className={clsx(styles.state, styles.error, className)} role="alert">
      <span className={styles.icon} aria-hidden="true">
        <CircleAlert size={28} />
      </span>
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.description}>{description}</p>
      {onRetry && (
        <div className={styles.action}>
          <Button variant="outline" onClick={onRetry} loading={retrying}>
            Tentar de novo
          </Button>
        </div>
      )}
    </div>
  );
}
