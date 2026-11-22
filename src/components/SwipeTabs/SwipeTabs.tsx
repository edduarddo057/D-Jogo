import { clsx } from 'clsx';
import { useId, useRef, type ReactNode } from 'react';
import { SegmentedControl } from '../SegmentedControl';
import styles from './SwipeTabs.module.css';

export interface SwipeTab<T extends string> {
  value: T;
  label: string;
  content: ReactNode;
}

export interface SwipeTabsProps<T extends string> {
  label: string;
  tabs: SwipeTab<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

const THRESHOLD = 48; // px de arrasto horizontal para trocar de aba

/**
 * Abas que trocam arrastando para o lado (revisão de usabilidade › gaveta de pendências).
 * Teclado e leitor de tela usam as abas normais (setas, Home/End).
 */
export function SwipeTabs<T extends string>({ label, tabs, value, onChange, className }: SwipeTabsProps<T>) {
  const id = useId();
  const start = useRef<{ x: number; y: number } | null>(null);
  const index = Math.max(
    0,
    tabs.findIndex((t) => t.value === value),
  );
  const current = tabs[index];

  const go = (delta: number) => {
    const next = tabs[index + delta];
    if (next) onChange(next.value);
  };

  return (
    <div className={clsx(styles.tabs, className)}>
      <SegmentedControl
        label={label}
        options={tabs.map((t) => ({ value: t.value, label: t.label }))}
        value={value}
        onChange={onChange}
        panelIdBase={id}
      />
      <div
        id={`${id}-${value}`}
        role="tabpanel"
        aria-label={current?.label}
        className={styles.panel}
        onPointerDown={(e) => {
          if (e.pointerType !== 'mouse') start.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerUp={(e) => {
          const s = start.current;
          start.current = null;
          if (!s) return;
          const dx = e.clientX - s.x;
          const dy = e.clientY - s.y;
          if (Math.abs(dx) > THRESHOLD && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1);
        }}
        onPointerCancel={() => {
          start.current = null;
        }}
      >
        {current?.content}
      </div>
      {tabs.length > 1 && (
        <div className={styles.dots} aria-hidden="true">
          {tabs.map((t) => (
            <span key={t.value} className={clsx(styles.dot, t.value === value && styles.dotActive)} />
          ))}
        </div>
      )}
    </div>
  );
}
