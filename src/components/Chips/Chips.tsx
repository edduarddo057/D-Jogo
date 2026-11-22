import { clsx } from 'clsx';
import { useId } from 'react';
import styles from './Chips.module.css';

export interface ChipOption<T extends string> {
  value: T;
  label: string;
}

interface ChipsBase<T extends string> {
  label: string;
  /** Texto curto ao lado do rótulo (ex.: "vôlei"). */
  hint?: string;
  hideLabel?: boolean;
  options: ChipOption<T>[];
  className?: string;
}

export type ChipsProps<T extends string> = ChipsBase<T> &
  (
    | { multiple: true; value: T[]; onChange: (value: T[]) => void }
    | { multiple?: false; value: T | null; onChange: (value: T) => void }
  );

/** Escolha por chips (posições, esporte, categoria, motivo): botões com aria-pressed. */
export function Chips<T extends string>(props: ChipsProps<T>) {
  const id = useId();
  const { label, hint, hideLabel, options, className } = props;
  const isOn = (v: T) => (props.multiple ? props.value.includes(v) : props.value === v);
  const toggle = (v: T) => {
    if (props.multiple) props.onChange(isOn(v) ? props.value.filter((x) => x !== v) : [...props.value, v]);
    else props.onChange(v);
  };
  return (
    <div className={clsx(styles.field, className)} role="group" aria-labelledby={id}>
      <span id={id} className={clsx(styles.label, hideLabel && 'visually-hidden')}>
        {label}
        {hint && <span className={styles.hint}> {hint}</span>}
      </span>
      <div className={styles.chips}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            className={clsx(styles.chip, isOn(o.value) && styles.on)}
            aria-pressed={isOn(o.value)}
            onClick={() => toggle(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
