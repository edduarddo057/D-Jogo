import { Minus, Plus } from 'lucide-react';
import styles from './Stepper.module.css';

export interface StepperProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
  /** Como mostrar o número (ex.: 0 → "–" para "sem nota"). */
  format?: (value: number) => string;
}

/** − número + (vagas). */
export function Stepper({ label, value, min = 0, max = 99, onChange, format }: StepperProps) {
  return (
    <div className={styles.stepper} role="group" aria-label={label}>
      <button
        type="button"
        aria-label="Menos"
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
      >
        <Minus size={18} aria-hidden="true" />
      </button>
      <output aria-live="polite">{format ? format(value) : value}</output>
      <button
        type="button"
        aria-label="Mais"
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
      >
        <Plus size={18} aria-hidden="true" />
      </button>
    </div>
  );
}
