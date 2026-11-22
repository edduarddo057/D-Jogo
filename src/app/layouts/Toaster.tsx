import { useEffect } from 'react';
import { Toast } from '@/components/Toast';
import { useToastStore } from '@/stores';
import styles from './Toaster.module.css';

/** Mostra o toast atual da store e o tira depois do tempo definido. Um por vez. */
export function Toaster() {
  const current = useToastStore((s) => s.current);
  const dismiss = useToastStore((s) => s.dismiss);

  useEffect(() => {
    if (!current || !Number.isFinite(current.duration)) return;
    const timer = window.setTimeout(() => dismiss(current.id), current.duration);
    return () => window.clearTimeout(timer);
  }, [current, dismiss]);

  return (
    <div className={styles.region} aria-live="polite">
      {current && (
        <Toast
          key={current.id}
          message={current.message}
          tone={current.tone}
          onDismiss={() => dismiss(current.id)}
          {...(current.action
            ? {
                action: {
                  label: current.action.label,
                  onAction: () => {
                    current.action?.onAction();
                    dismiss(current.id);
                  },
                },
              }
            : {})}
        />
      )}
    </div>
  );
}
