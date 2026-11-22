import { clsx } from 'clsx';
import { X } from 'lucide-react';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import styles from './Modal.module.css';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  /** Botões do rodapé; a ação principal por último (à direita). */
  actions?: ReactNode;
  className?: string;
}

/**
 * Modal sobre o <dialog> nativo (design system › Modal): foco preso, Esc fecha e o foco volta ao gatilho.
 * Bottom sheet no celular; diálogo central a partir de 768px. Clicar fora também fecha.
 */
export function Modal({ open, onClose, title, description, children, actions, className }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    // Clique no fundo fecha; o equivalente de teclado é o Esc (evento cancel).
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <dialog
      ref={ref}
      className={clsx(styles.dialog, className)}
      aria-labelledby={`${id}-titulo`}
      aria-describedby={description ? `${id}-descricao` : undefined}
      onCancel={(e) => {
        e.preventDefault(); // quem fecha é o estado do pai
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {open && (
        <div className={styles.content}>
          <span className={styles.handle} aria-hidden="true" />
          <header className={styles.header}>
            <h2 id={`${id}-titulo`} className={styles.title}>
              {title}
            </h2>
            <button type="button" className={styles.close} onClick={onClose} aria-label="Fechar">
              <X size={22} aria-hidden="true" />
            </button>
          </header>
          {description && (
            <p id={`${id}-descricao`} className={styles.description}>
              {description}
            </p>
          )}
          {children}
          {actions && <div className={styles.actions}>{actions}</div>}
        </div>
      )}
    </dialog>
  );
}
