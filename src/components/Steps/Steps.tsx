import { clsx } from 'clsx';
import { Check } from 'lucide-react';
import styles from './Steps.module.css';

/**
 * Etapas de um fluxo contínuo (dia de jogo: Chegada, Times, Placar, Resultado): bolinhas numeradas
 * ligadas por uma linha, com o nome centralizado embaixo. A atual fica cheia, as feitas com ✓.
 */
export function Steps({ steps, current, className }: { steps: string[]; current: number; className?: string }) {
  return (
    <ol className={clsx(styles.steps, className)} aria-label={`Etapa ${current + 1} de ${steps.length}`}>
      {steps.map((s, i) => (
        <li
          key={s}
          className={clsx(styles.step, i < current && styles.done, i === current && styles.on)}
          aria-current={i === current ? 'step' : undefined}
        >
          <span className={styles.dot} aria-hidden="true">
            {i < current ? <Check size={14} strokeWidth={3} /> : i + 1}
          </span>
          <span className={styles.label}>{s}</span>
          {i < current && <span className="visually-hidden"> (feito)</span>}
        </li>
      ))}
    </ol>
  );
}
