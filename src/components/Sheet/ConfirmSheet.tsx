import type { ReactNode } from 'react';
import { Button } from '../Button';
import { Sheet } from './Sheet';
import styles from './Sheet.module.css';

export interface ConfirmSheetProps {
  open: boolean;
  onClose: () => void;
  /** Pergunta curta no cabeçalho ("Tirar da lista?", "Encerrar o dia?"). */
  title: string;
  /** Contexto em cima: foto da pessoa ou um ícone. */
  leading?: ReactNode;
  /** Nome ou assunto, logo abaixo do contexto. */
  subject?: string;
  /** O que vai acontecer, uma frase por item. */
  consequences: string[];
  actionLabel: string;
  /** "danger" para tirar/remover; "primary" para ações finais que não apagam nada. */
  tone?: 'danger' | 'primary';
  loading?: boolean;
  onConfirm: () => void;
}

/**
 * Confirmação de ação importante (manual 1.3): diz antes o que vai acontecer, com Cancelar à
 * esquerda e um único botão de ação. Nunca "toque de novo para confirmar".
 */
export function ConfirmSheet({
  open,
  onClose,
  title,
  leading,
  subject,
  consequences,
  actionLabel,
  tone = 'danger',
  loading,
  onConfirm,
}: ConfirmSheetProps) {
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <div className={styles.confirm}>
        {leading}
        {subject && <p className={styles.confirmSubject}>{subject}</p>}
        <ul className={styles.consequences}>
          {consequences.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </div>
      <Button variant={tone === 'danger' ? 'danger' : 'primary'} block loading={loading} onClick={onConfirm}>
        {actionLabel}
      </Button>
    </Sheet>
  );
}
