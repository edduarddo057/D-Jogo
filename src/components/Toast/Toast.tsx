import { clsx } from 'clsx';
import { CircleAlert, CircleCheck, X } from 'lucide-react';
import styles from './Toast.module.css';

export type ToastTone = 'neutral' | 'success' | 'error';

export interface ToastProps {
  message: string;
  tone?: ToastTone;
  action?: { label: string; onAction: () => void };
  onDismiss?: () => void;
  className?: string;
}

/**
 * Mensagem curta de retorno (design system › Toast). Só apresenta: quem decide quando mostrar
 * e por quanto tempo é o Toaster da aplicação. Erros usam role="alert"; o resto, role="status".
 */
export function Toast({ message, tone = 'neutral', action, onDismiss, className }: ToastProps) {
  const Icon = tone === 'success' ? CircleCheck : tone === 'error' ? CircleAlert : null;
  return (
    <div className={clsx(styles.toast, className)} role={tone === 'error' ? 'alert' : 'status'}>
      {Icon && <Icon className={styles.icon} size={18} strokeWidth={2.5} aria-hidden="true" />}
      <span className={styles.message}>{message}</span>
      {action && (
        <button type="button" className={styles.action} onClick={action.onAction}>
          {action.label}
        </button>
      )}
      {onDismiss && (
        <button type="button" className={styles.close} onClick={onDismiss} aria-label="Fechar aviso">
          <X size={18} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
