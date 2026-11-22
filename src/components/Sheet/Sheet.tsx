import { clsx } from 'clsx';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Spinner } from '../Spinner';
import styles from './Sheet.module.css';

export interface SheetAction {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  /** Envia um <form> pelo id (o botão fica no cabeçalho, fora do form). */
  form?: string;
}

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Título só para leitor de tela (a folha mostra o conteúdo direto). */
  hideTitle?: boolean;
  /** Botão da esquerda: "Cancelar" (padrão) ou "Fechar". */
  closeLabel?: 'Cancelar' | 'Fechar';
  /** Ação da direita (Salvar, Publicar, OK). */
  action?: SheetAction;
  children: ReactNode;
  className?: string;
}

/**
 * Folha (manual 1.3): tarefa curta que abre por cima da tela. A tela de origem continua visível,
 * o "Cancelar" fica sempre à esquerda e a ação, à direita. Sobre o <dialog> nativo: foco preso,
 * Esc fecha e o foco volta ao gatilho. Centralizada a partir de 768px.
 */
export function Sheet({
  open,
  onClose,
  title,
  hideTitle,
  closeLabel = 'Cancelar',
  action,
  children,
  className,
}: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const id = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      // o foco vai para o título: o leitor de tela anuncia a folha e nenhum botão fica destacado no toque
      titleRef.current?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    // Clique no fundo fecha; o equivalente de teclado é o Esc (evento cancel).
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <dialog
      ref={ref}
      className={clsx(styles.sheet, className)}
      aria-labelledby={`${id}-titulo`}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {open && (
        <div className={styles.content}>
          <span className={styles.grip} aria-hidden="true" />
          <header className={styles.header}>
            <div className={styles.side}>
              <button type="button" className={styles.headerButton} onClick={onClose}>
                {closeLabel}
              </button>
            </div>
            <h2
              id={`${id}-titulo`}
              ref={titleRef}
              tabIndex={-1}
              className={clsx(styles.title, hideTitle && 'visually-hidden')}
            >
              {title}
            </h2>
            <div className={clsx(styles.side, styles.end)}>
              {action && (
                <button
                  type={action.form ? 'submit' : 'button'}
                  form={action.form}
                  className={clsx(styles.headerButton, styles.strong)}
                  onClick={action.onClick}
                  disabled={action.disabled || action.loading}
                  aria-busy={action.loading || undefined}
                >
                  {action.loading ? <Spinner size="sm" /> : action.label}
                </button>
              )}
            </div>
          </header>
          <div className={styles.body}>{children}</div>
        </div>
      )}
    </dialog>
  );
}
