import { clsx } from 'clsx';
import type { ComponentPropsWithRef, ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router';
import { Spinner } from '../Spinner';
import styles from './Button.module.css';
import { buttonClassName } from './buttonClassName';

export type ButtonVariant = 'primary' | 'secondary' | 'tint' | 'inverse' | 'danger' | 'outline' | 'ghost' | 'onBrand';
export type ButtonSize = 'md' | 'sm';

export interface ButtonStyleProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Ocupa toda a largura do container. */
  block?: boolean;
  /** Ícone antes do texto (decorativo). */
  icon?: ReactNode;
}

export interface ButtonProps extends ButtonStyleProps, Omit<ComponentPropsWithRef<'button'>, 'children'> {
  children: ReactNode;
  /** Mostra o spinner, mantém a largura e bloqueia cliques (aria-busy). */
  loading?: boolean;
}

/**
 * Botão de ação (design system › Button). Use `ButtonLink` para navegar.
 * Mínimo de 52px de altura (40px no `sm`), foco visível, `type="button"` por padrão.
 */
export function Button({
  variant,
  size,
  block,
  icon,
  loading = false,
  disabled,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClassName({ variant, size, block }, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Spinner size="sm" /> : icon}
      <span className={clsx(loading && styles.loadingLabel)}>{children}</span>
    </button>
  );
}

export interface ButtonLinkProps extends ButtonStyleProps, Omit<LinkProps, 'className'> {
  className?: string;
}

/** Link com aparência de botão (ex.: "Ver partida"). Semântica de link: navega. */
export function ButtonLink({ variant, size, block, icon, className, children, ...rest }: ButtonLinkProps) {
  return (
    <Link className={buttonClassName({ variant, size, block }, className)} {...rest}>
      {icon}
      <span>{children}</span>
    </Link>
  );
}

export interface IconButtonProps extends Omit<ComponentPropsWithRef<'button'>, 'children' | 'aria-label'> {
  /** Obrigatório: o botão não tem texto visível. */
  label: string;
  icon: ReactNode;
}

/** Botão só com ícone (voltar, fechar, menu ⋮). 48×48px. */
export function IconButton({ label, icon, className, type = 'button', ...rest }: IconButtonProps) {
  return (
    <button type={type} className={clsx(styles.iconButton, className)} aria-label={label} {...rest}>
      {icon}
    </button>
  );
}

export interface FabProps extends Omit<ComponentPropsWithRef<'button'>, 'children'> {
  children: ReactNode;
  icon?: ReactNode;
}

export interface FabRoundProps extends Omit<ComponentPropsWithRef<'button'>, 'children' | 'aria-label'> {
  label: string;
  icon: ReactNode;
}

/** Botão + redondo perto do dedão, para ações raras (manual 3.6). Fica fixo acima das abas. */
export function FabRound({ label, icon, className, type = 'button', ...rest }: FabRoundProps) {
  return (
    <button type={type} className={clsx(styles.fabRound, className)} aria-label={label} {...rest}>
      {icon}
    </button>
  );
}

/** Botão flutuante de criação (+ Jogador, + Lançamento). Fixo acima da navegação no celular. */
export function Fab({ icon, children, className, type = 'button', ...rest }: FabProps) {
  return (
    <button type={type} className={clsx(styles.fab, className)} {...rest}>
      {icon}
      <span>{children}</span>
    </button>
  );
}
