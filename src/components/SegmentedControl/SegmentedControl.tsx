import { clsx } from 'clsx';
import { useRef, type KeyboardEvent } from 'react';
import { NavLink } from 'react-router';
import styles from './SegmentedControl.module.css';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string> {
  /** Nome do grupo para leitores de tela. */
  label: string;
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Id do painel controlado (opcional): `${idBase}-${value}`. */
  panelIdBase?: string;
  className?: string;
}

/**
 * Abas internas no estado da tela (padrão WAI-ARIA tabs): setas trocam e focam, Home/End vão às pontas.
 * Para abas que são sub-rotas (Jogadores/Partidas/Financeiro), use `SegmentedNav`.
 */
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  panelIdBase,
  className,
}: SegmentedControlProps<T>) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const current = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );

  function onKeyDown(e: KeyboardEvent) {
    const last = options.length - 1;
    const next =
      e.key === 'ArrowRight'
        ? current === last
          ? 0
          : current + 1
        : e.key === 'ArrowLeft'
          ? current === 0
            ? last
            : current - 1
          : e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? last
              : null;
    if (next === null) return;
    e.preventDefault();
    const option = options[next];
    if (!option) return;
    onChange(option.value);
    refs.current[next]?.focus();
  }

  return (
    <div className={clsx(styles.track, className)} role="tablist" aria-label={label}>
      {options.map((o, i) => {
        const selected = o.value === value;
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={panelIdBase ? `${panelIdBase}-${o.value}` : undefined}
            tabIndex={selected ? 0 : -1}
            className={clsx(styles.segment, selected && styles.active)}
            onClick={() => onChange(o.value)}
            onKeyDown={onKeyDown}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export interface SegmentedNavProps {
  label: string;
  items: Array<{ to: string; label: string }>;
  className?: string;
}

/** Mesma aparência, mas cada segmento é um link de sub-rota (compartilhável, "voltar" funciona). */
export function SegmentedNav({ label, items, className }: SegmentedNavProps) {
  return (
    <nav className={clsx(styles.track, className)} aria-label={label}>
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end
          className={({ isActive }) => clsx(styles.segment, isActive && styles.active)}
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
