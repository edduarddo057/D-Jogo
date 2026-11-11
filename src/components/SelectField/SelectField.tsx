import { clsx } from 'clsx';
import { ChevronDown } from 'lucide-react';
import type { ComponentPropsWithRef } from 'react';
import { FieldShell, fieldControlClass, useFieldA11y, type FieldBaseProps } from '../Field';
import styles from './SelectField.module.css';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectFieldProps
  extends FieldBaseProps, Omit<ComponentPropsWithRef<'select'>, 'className' | 'children'> {
  options: SelectOption[];
  /** Texto da opção vazia inicial (ex.: "Escolha a posição"). */
  placeholder?: string;
}

/** Lista de opções com o <select> nativo (melhor experiência no celular). Funciona com `register`. */
export function SelectField({
  label,
  hint,
  error,
  hideLabel,
  className,
  id,
  options,
  placeholder,
  ...selectProps
}: SelectFieldProps) {
  const a11y = useFieldA11y(id, hint, error);
  return (
    <FieldShell
      label={label}
      hint={hint}
      error={error}
      hideLabel={hideLabel}
      className={className}
      inputId={a11y.inputId}
      hintId={a11y.hintId}
      errorId={a11y.errorId}
    >
      <div className={styles.wrapper}>
        <select
          id={a11y.inputId}
          className={clsx(fieldControlClass, styles.select)}
          aria-invalid={a11y.invalid || undefined}
          aria-describedby={a11y.describedBy}
          {...selectProps}
        >
          {placeholder !== undefined && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((o) => (
            <option key={o.value} value={o.value} disabled={o.disabled}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown className={styles.chevron} size={20} aria-hidden="true" />
      </div>
    </FieldShell>
  );
}
