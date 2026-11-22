import { clsx } from 'clsx';
import { ChevronDown } from 'lucide-react';
import { useId, type ReactNode } from 'react';
import styles from './Accordion.module.css';

export interface AccordionItemProps {
  icon?: ReactNode;
  title: string;
  subtitle?: ReactNode;
  /** Selo à direita (ex.: "3" ou "Feito"). */
  status?: ReactNode;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
  className?: string;
}

/** Pendência que abre ali mesmo, com as ações dentro (manual 4.1). */
export function AccordionItem({
  icon,
  title,
  subtitle,
  status,
  open,
  onToggle,
  children,
  className,
}: AccordionItemProps) {
  const id = useId();
  return (
    <div className={clsx(styles.item, open && styles.open, className)}>
      <h3 className={styles.heading}>
        <button
          type="button"
          className={styles.header}
          aria-expanded={open}
          aria-controls={`${id}-painel`}
          id={`${id}-botao`}
          onClick={onToggle}
        >
          {icon && <span className={styles.icon}>{icon}</span>}
          <span className={styles.text}>
            <span className={styles.title}>{title}</span>
            {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
          </span>
          {status}
          <ChevronDown className={styles.chevron} size={20} aria-hidden="true" />
        </button>
      </h3>
      {open && (
        <div className={styles.panel} id={`${id}-painel`} role="region" aria-labelledby={`${id}-botao`}>
          {children}
        </div>
      )}
    </div>
  );
}

export function Accordion({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx(styles.accordion, className)}>{children}</div>;
}
