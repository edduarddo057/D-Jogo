import { clsx } from 'clsx';
import { Check as CheckIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import styles from './Check.module.css';

/** Bolinha de marcado (decorativa: quem anuncia é o botão ou o checkbox). */
export function CheckMark({ on, className }: { on: boolean; className?: string }) {
  return (
    <span className={clsx(styles.mark, on && styles.on, className)} aria-hidden="true">
      <CheckIcon size={16} strokeWidth={3} />
    </span>
  );
}

export interface CheckRowProps {
  on: boolean;
  onToggle: () => void;
  title: ReactNode;
  meta?: ReactNode;
  trailing?: ReactNode;
  /** Opção única (escolha da próxima rodada) em vez de marcar vários. */
  radio?: boolean;
}

/** Linha inteira que marca e desmarca (chegada, opções). */
export function CheckRow({ on, onToggle, title, meta, trailing, radio }: CheckRowProps) {
  return (
    <li className={styles.item}>
      <button
        type="button"
        className={clsx(styles.row, on && styles.rowOn)}
        onClick={onToggle}
        {...(radio ? { role: 'radio', 'aria-checked': on } : { 'aria-pressed': on })}
      >
        <CheckMark on={on} />
        <span className={styles.body}>
          <span className={styles.title}>{title}</span>
          {meta && <span className={styles.meta}>{meta}</span>}
        </span>
        {trailing}
      </button>
    </li>
  );
}

export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
  error?: string;
}

/** Checkbox de verdade (formulários), com a mesma bolinha. */
export function Checkbox({ checked, onChange, children, error }: CheckboxProps) {
  return (
    <div className={styles.checkboxField}>
      <label className={styles.checkbox}>
        <input
          type="checkbox"
          className="visually-hidden"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-invalid={Boolean(error) || undefined}
        />
        <CheckMark on={checked} />
        <span>{children}</span>
      </label>
      {error && (
        <span className={styles.error} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
