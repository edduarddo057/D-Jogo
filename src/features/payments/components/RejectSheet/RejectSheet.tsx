import { useState } from 'react';
import { Button } from '@/components/Button';
import { Chips } from '@/components/Chips';
import { Sheet } from '@/components/Sheet';
import { TextField } from '@/components/TextField';

const REASONS = ['Valor diferente', 'Pix não caiu', 'Comprovante ilegível', 'Outro'] as const;
type Reason = (typeof REASONS)[number];

export interface RejectSheetProps {
  open: boolean;
  /** Primeiro nome de quem pagou. */
  who: string;
  loading?: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

/** Recusar pagamento (manual 4.1): o motivo vai para a pessoa, que pode mandar de novo. */
export function RejectSheet({ open, who, loading, onClose, onConfirm }: RejectSheetProps) {
  const [reason, setReason] = useState<Reason>('Valor diferente');
  const [other, setOther] = useState('');
  const text = reason === 'Outro' ? other.trim() : reason;
  return (
    <Sheet open={open} onClose={onClose} title="Recusar pagamento">
      <p>O motivo vai para {who}, que pode mandar de novo.</p>
      <Chips
        label="Motivo"
        hideLabel
        options={REASONS.map((r) => ({ value: r, label: r }))}
        value={reason}
        onChange={setReason}
      />
      {reason === 'Outro' && (
        <TextField label="Qual o motivo?" value={other} maxLength={140} onChange={(e) => setOther(e.target.value)} />
      )}
      <Button variant="danger" block loading={loading} disabled={text.length < 3} onClick={() => onConfirm(text)}>
        Recusar e avisar
      </Button>
    </Sheet>
  );
}
