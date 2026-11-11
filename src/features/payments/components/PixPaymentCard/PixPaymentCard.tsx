import { CircleCheck, Copy, Hourglass, TriangleAlert } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { formatCents, formatRemaining } from '@/lib/format';
import { isApiError, messageFor } from '@/lib/http';
import { toast } from '@/stores';
import type { Payment } from '../../api/paymentsApi';
import { useReportPayment } from '../../queries/usePayments';
import styles from './PixPaymentCard.module.css';

export interface PixPaymentCardProps {
  payment: Payment;
  pix: { key: string; holderName: string; bank?: string | null } | null | undefined;
  /** Prazo para avisar o pagamento (avulso). */
  deadline?: string | null;
}

/** Relógio que anda a cada 15 s: suficiente para "1h 52min". */
function useNow(intervalMs = 15_000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(t);
  }, [intervalMs]);
  return now;
}

/** Pagar com Pix (RN-61): chave da turma, copiar, prazo e "Já fiz o Pix". */
export function PixPaymentCard({ payment, pix, deadline }: PixPaymentCardProps) {
  const report = useReportPayment();
  const [note, setNote] = useState('');
  const now = useNow();
  const remainingMs = deadline ? new Date(deadline).getTime() - now.getTime() : null;
  const urgent = remainingMs !== null && remainingMs < 30 * 60_000;

  const copyKey = async () => {
    if (!pix) return;
    try {
      await navigator.clipboard.writeText(pix.key);
      toast('Chave Pix copiada.', { tone: 'success' });
    } catch {
      toast('Não deu para copiar. Selecione a chave e copie manualmente.', { tone: 'error' });
    }
  };

  const send = () =>
    report.mutate(
      { paymentId: payment.id, note: note.trim() || undefined },
      {
        onSuccess: () => toast('Pronto! Avisamos quem organiza para conferir.', { tone: 'success' }),
        onError: (e) =>
          toast(isApiError(e) ? messageFor(e.code) : 'Não deu para avisar o pagamento.', { tone: 'error' }),
      },
    );

  if (payment.status === 'paid')
    return (
      <section className={`${styles.card} ${styles.done}`} aria-labelledby="pix-titulo">
        <CircleCheck size={32} aria-hidden="true" />
        <h2 id="pix-titulo" className={styles.title}>
          Pagamento confirmado
        </h2>
        <p className={styles.muted}>{formatCents(payment.amountCents)} recebidos. Sua vaga está garantida.</p>
      </section>
    );

  if (payment.status === 'cancelled')
    return (
      <section className={styles.card} aria-labelledby="pix-titulo">
        <h2 id="pix-titulo" className={styles.title}>
          Cobrança cancelada
        </h2>
        <p className={styles.muted}>O prazo passou ou a partida mudou. Não é preciso pagar.</p>
      </section>
    );

  const reported = payment.status === 'reported';

  return (
    <section className={styles.card} aria-labelledby="pix-titulo">
      <div className={styles.amountBlock}>
        <span className={styles.label}>Valor</span>
        <span className={styles.amount}>{formatCents(payment.amountCents)}</span>
      </div>

      {deadline && !reported && (
        <p className={`${styles.deadline} ${urgent ? styles.urgent : ''}`} role="timer" aria-live="off">
          <Hourglass size={18} aria-hidden="true" />
          Faltam <strong>{formatRemaining(deadline, now)}</strong> para avisar o pagamento
        </p>
      )}

      {payment.status === 'rejected' && (
        <p className={styles.rejected} role="alert">
          <TriangleAlert size={18} aria-hidden="true" />
          <span>
            Quem organiza não encontrou o Pix{payment.rejectionReason ? `: “${payment.rejectionReason}”` : '.'} Confira
            e avise de novo.
          </span>
        </p>
      )}

      {pix ? (
        <div className={styles.pix}>
          <span className={styles.label}>Chave Pix da turma</span>
          <code className={styles.key}>{pix.key}</code>
          <span className={styles.muted}>
            {pix.holderName}
            {pix.bank ? ` · ${pix.bank}` : ''}
          </span>
          <Button variant="outline" icon={<Copy size={20} aria-hidden="true" />} onClick={() => void copyKey()}>
            Copiar chave
          </Button>
        </div>
      ) : (
        <p className={styles.muted}>
          A turma ainda não cadastrou uma chave Pix. Combine o pagamento com quem organiza.
        </p>
      )}

      {reported ? (
        <p className={styles.reported} role="status">
          <Hourglass size={18} aria-hidden="true" />
          Pagamento informado. Aguardando quem organiza conferir.
        </p>
      ) : (
        <>
          <TextField
            label="Observação (opcional)"
            placeholder="Ex.: paguei pela conta da minha esposa"
            maxLength={140}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <Button block loading={report.isPending} onClick={send}>
            Já fiz o Pix
          </Button>
        </>
      )}
    </section>
  );
}
