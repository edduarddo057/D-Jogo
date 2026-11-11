import { clsx } from 'clsx';
import type { ComponentPropsWithRef } from 'react';
import { FieldShell, fieldControlClass, useFieldA11y, type FieldBaseProps } from '../Field';

export interface TextFieldProps extends FieldBaseProps, Omit<ComponentPropsWithRef<'input'>, 'className'> {
  inputClassName?: string;
}

/**
 * Campo de texto com rótulo visível, dica e erro (design system › TextField).
 * Funciona direto com `register` do React Hook Form (o `ref` é repassado ao <input>).
 * Fonte de 16px para o iOS não dar zoom ao focar.
 */
export function TextField({
  label,
  hint,
  error,
  hideLabel,
  className,
  inputClassName,
  id,
  ...inputProps
}: TextFieldProps) {
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
      <input
        id={a11y.inputId}
        className={clsx(fieldControlClass, inputClassName)}
        aria-invalid={a11y.invalid || undefined}
        aria-describedby={a11y.describedBy}
        {...inputProps}
      />
    </FieldShell>
  );
}

/** Data (seletor nativo do sistema, o melhor no celular). Valor "AAAA-MM-DD". */
export function DateField(props: Omit<TextFieldProps, 'type'>) {
  return <TextField type="date" {...props} />;
}

/** Hora (seletor nativo). Valor "HH:mm". */
export function TimeField(props: Omit<TextFieldProps, 'type'>) {
  return <TextField type="time" step={300} {...props} />;
}
