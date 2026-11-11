import { clsx } from 'clsx';
import type { ReactNode } from 'react';
import styles from './Field.module.css';

export interface FieldBaseProps {
  label: string;
  hint?: ReactNode;
  /** Mensagem de erro (ex.: do Zod via React Hook Form). Liga `aria-invalid` e `aria-describedby`. */
  error?: string | undefined;
  /** Esconde o rótulo visualmente (continua para leitores de tela). Use com moderação. */
  hideLabel?: boolean;
  className?: string;
}

interface FieldShellProps extends FieldBaseProps {
  inputId: string;
  hintId: string | undefined;
  errorId: string | undefined;
  children: ReactNode;
}

/** Rótulo acima, campo, dica e erro abaixo (design system › TextField). */
export function FieldShell({
  label,
  hint,
  error,
  hideLabel,
  className,
  inputId,
  hintId,
  errorId,
  children,
}: FieldShellProps) {
  return (
    <div className={clsx(styles.field, className)}>
      <label className={clsx(styles.label, hideLabel && 'visually-hidden')} htmlFor={inputId}>
        {label}
      </label>
      {children}
      {error && (
        <span className={styles.error} id={errorId} role="alert">
          {error}
        </span>
      )}
      {hint && (
        <span className={styles.hint} id={hintId}>
          {hint}
        </span>
      )}
    </div>
  );
}
