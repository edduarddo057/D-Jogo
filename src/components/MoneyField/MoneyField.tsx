import { clsx } from 'clsx';
import { useState, type ComponentPropsWithRef } from 'react';
import { parseMoneyToCents } from '@/lib/format';
import { FieldShell, fieldAffixClasses, fieldControlClass, useFieldA11y, type FieldBaseProps } from '../Field';

export interface MoneyFieldProps
  extends
    FieldBaseProps,
    Omit<ComponentPropsWithRef<'input'>, 'value' | 'defaultValue' | 'onChange' | 'type' | 'className'> {
  /** Valor em centavos (null = vazio). */
  value: number | null;
  onChange: (cents: number | null) => void;
}

const toText = (cents: number | null) =>
  cents === null ? '' : (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Valor em reais: a pessoa digita "25" ou "25,00"; o formulário recebe centavos (2500).
 * Formata ao sair do campo. Use com `Controller` do React Hook Form.
 */
export function MoneyField({
  label,
  hint,
  error,
  hideLabel,
  className,
  id,
  value,
  onChange,
  onBlur,
  ...inputProps
}: MoneyFieldProps) {
  const a11y = useFieldA11y(id, hint, error);
  // Enquanto edita, mostra o que a pessoa digita; fora disso, o valor formatado (inclui resets do formulário).
  const [draft, setDraft] = useState<string | null>(null);
  const text = draft ?? toText(value);

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
      <div className={fieldAffixClasses.wrapper}>
        <span className={fieldAffixClasses.prefix} aria-hidden="true">
          R$
        </span>
        <input
          id={a11y.inputId}
          className={clsx(fieldControlClass)}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          aria-invalid={a11y.invalid || undefined}
          aria-describedby={a11y.describedBy}
          value={text}
          onFocus={() => setDraft(toText(value))}
          onChange={(e) => {
            const next = e.target.value.replace(/[^\d.,]/g, '');
            setDraft(next);
            onChange(parseMoneyToCents(next));
          }}
          onBlur={(e) => {
            setDraft(null);
            onBlur?.(e);
          }}
          {...inputProps}
        />
      </div>
    </FieldShell>
  );
}
