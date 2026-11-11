import { Banknote, Check, X } from 'lucide-react';
import { useState } from 'react';
import { Avatar } from '@/components/Avatar';
import { Badge } from '@/components/Badge';
import { Button, IconButton } from '@/components/Button';
import { List, ListItem } from '@/components/List';
import { Modal } from '@/components/Modal';
import { TextField } from '@/components/TextField';
import { formatCents } from '@/lib/format';
import { isApiError, messageFor } from '@/lib/http';
import { toast } from '@/stores';
import type { Payment } from '../../api/paymentsApi';
import { useApprovePayment, useRejectPayment } from '../../queries/usePayments';
import { paymentLabel } from '../../utils/paymentLabel';
import styles from './PaymentsReview.module.css';

const STATUS = {
  pending: { tone: 'warning', label: 'Pendente' },
  reported: { tone: 'info', label: 'Pix informado' },
  rejected: { tone: 'danger', label: 'Recusado' },
  paid: { tone: 'success', label: 'Pago' },
  cancelled: { tone: 'neutral', label: 'Cancelado' },
} as const;

const fail = (e: unknown) => toast(isApiError(e) ? messageFor(e.code) : 'Não deu para fazer isso.', { tone: 'error' });

/**
 * Lista de cobranças para o dono (RN-62, RN-64):
 * Pix informado → validar ou recusar; pendente → marcar como pago (ex.: dinheiro).
 */
export function PaymentsReview({ payments, label }: { payments: Payment[]; label: string }) {
  const approve = useApprovePayment();
  const reject = useRejectPayment();
  const [rejecting, setRejecting] = useState<Payment | null>(null);
  const [reason, setReason] = useState('');

  const busy = (id: string) => approve.isPending && approve.variables?.paymentId === id;

  return (
    <>
      <List label={label}>
        {payments.map((p) => {
          const st = STATUS[p.status];
          return (
            <ListItem
              key={p.id}
              leading={<Avatar id={p.user.id} name={p.user.name} src={p.user.photoUrl} size="sm" decorative />}
              title={`${p.user.name} · ${formatCents(p.amountCents)}`}
              meta={[paymentLabel(p), p.reportNote ? `“${p.reportNote}”` : null].filter(Boolean).join(' · ')}
              trailing={<Badge tone={st.tone}>{st.label}</Badge>}
              actions={
                p.status === 'reported' ? (
                  <>
                    <IconButton
                      label={`Validar pagamento de ${p.user.name}`}
                      title="Validar"
                      icon={<Check size={20} aria-hidden="true" />}
                      disabled={busy(p.id)}
                      onClick={() =>
                        approve.mutate(
                          { paymentId: p.id },
                          {
                            onSuccess: () => toast(`Pagamento de ${p.user.name} validado.`, { tone: 'success' }),
                            onError: fail,
                          },
                        )
                      }
                    />
                    <IconButton
                      label={`Recusar pagamento de ${p.user.name}`}
                      title="Recusar"
                      icon={<X size={20} aria-hidden="true" />}
                      onClick={() => setRejecting(p)}
                    />
                  </>
                ) : p.status === 'pending' || p.status === 'rejected' ? (
                  <IconButton
                    label={`Marcar pagamento de ${p.user.name} como recebido em dinheiro`}
                    title="Recebi em dinheiro"
                    icon={<Banknote size={20} aria-hidden="true" />}
                    disabled={busy(p.id)}
                    onClick={() =>
                      approve.mutate(
                        { paymentId: p.id, method: 'cash' },
                        {
                          onSuccess: () => toast(`Pagamento de ${p.user.name} registrado.`, { tone: 'success' }),
                          onError: fail,
                        },
                      )
                    }
                  />
                ) : undefined
              }
            />
          );
        })}
      </List>

      <Modal
        open={rejecting !== null}
        onClose={() => setRejecting(null)}
        title="Recusar pagamento?"
        description="A pessoa vê o motivo e pode avisar de novo. Se for avulso, o prazo volta a contar."
        actions={
          <>
            <Button variant="outline" onClick={() => setRejecting(null)}>
              Voltar
            </Button>
            <Button
              variant="danger"
              disabled={reason.trim().length < 3}
              loading={reject.isPending}
              onClick={() =>
                rejecting &&
                reject.mutate(
                  { paymentId: rejecting.id, reason: reason.trim() },
                  {
                    onSuccess: () => {
                      toast('Pagamento recusado.', { tone: 'success' });
                      setRejecting(null);
                      setReason('');
                    },
                    onError: fail,
                  },
                )
              }
            >
              Recusar
            </Button>
          </>
        }
      >
        <div className={styles.form}>
          <TextField
            label="Motivo"
            placeholder="Ex.: não encontrei o Pix no extrato"
            value={reason}
            maxLength={140}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
      </Modal>
    </>
  );
}
