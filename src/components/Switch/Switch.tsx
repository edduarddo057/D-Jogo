import { clsx } from 'clsx';
import { useId, type ReactNode } from 'react';
import styles from './Switch.module.css';

export interface SwitchProps {
  label: string;
  description?: ReactNode;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Liga/desliga com efeito imediato (ex.: "Subir automaticamente" nas regras da turma).
 * `role="switch"`, ativável por Espaço/Enter; a linha inteira é clicável.
 */
export function Switch({ label, description, checked, onCheckedChange, disabled = false, className }: SwitchProps) {
  const id = useId();
  const buttonId = `${id}-botao`;
  const descriptionId = description ? `${id}-descricao` : undefined;

  return (
    <div className={clsx(styles.row, disabled && styles.disabled, className)}>
      <div className={styles.text}>
        <label htmlFor={buttonId} className={styles.label}>
          {label}
        </label>
        {description && (
          <span id={descriptionId} className={styles.description}>
            {description}
          </span>
        )}
      </div>
      <button
        type="button"
        role="switch"
        id={buttonId}
        aria-checked={checked}
        aria-describedby={descriptionId}
        disabled={disabled}
        className={styles.switch}
        onClick={() => onCheckedChange(!checked)}
      >
        <span className={styles.thumb} aria-hidden="true" />
      </button>
    </div>
  );
}
