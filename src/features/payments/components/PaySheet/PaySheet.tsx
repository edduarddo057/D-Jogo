import { CircleCheck, Copy, Landmark, Paperclip } from 'lucide-react';
import { useRef, useState } from 'react';
import { Badge } from '@/components/Badge';
import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { List, ListItem } from '@/components/List';
import { Sheet } from '@/components/Sheet';
import { SkeletonList } from '@/components/Skeleton';
import { useGroup } from '@/features/groups';
import { useMatch } from '@/features/matches';
import { formatCents, formatDay, formatWhen, monthName } from '@/lib/format';
import { isApiError, messageFor } from '@/lib/http';
import { buildBrCode } from '@/lib/pix';
import { toast } from '@/stores';
import type { Payment } from '../../api/paymentsApi';
import { useMyPayments, useReportPayment } from '../../queries/usePayments';
import styles from './PaySheet.module.css';

export interface PaySheetProps {
  open: boolean;
  onClose: () => void;
  /** Jogo do avulso… */
  matchId?: string | null;
  /** …ou uma cobrança direta (mensalidade). */
  paymentId?: string | null;
}

/** Pagar com Pix numa folha só (manual 3.3): valor, prazo e destinatário → Copiar código Pix → Já paguei. */
export function PaySheet({ open, onClose, matchId, paymentId }: PaySheetProps) {
  return (
    <Sheet open={open} onClose={onClose} title="Pagamento" closeLabel="Fechar">
      {open &&
        (matchId ? (
          <ByMatch matchId={matchId} onClose={onClose} />
        ) : paymentId ? (
          <ByPayment paymentId={paymentId} onClose={onClose} />
        ) : null)}
    </Sheet>
  );
}

function ByMatch({ matchId, onClose }: { matchId: string; onClose: () => void }) {
  const match = useMatch(matchId);
  if (match.isPending) return <SkeletonList rows={3} />;
  const m = match.data;
  const p = m?.myParticipation;
  if (!m || !p?.payment) return <p className={styles.muted}>Não há nada para pagar neste jogo.</p>;
  return (
    <PixFlow
      payment={p.payment}
      pix={m.group.pix ?? null}
      what={`${m.group.name} · ${formatDay(m.startsAt)}`}
      deadline={p.paymentDeadline ?? null}
      onClose={onClose}
    />
  );
}

function ByPayment({ paymentId, onClose }: { paymentId: string; onClose: () => void }) {
  const mine = useMyPayments();
  const payment = mine.data?.items.find((x) => x.id === paymentId);
  const group = useGroup(payment?.groupId ?? '', { enabled: Boolean(payment) });
  if (mine.isPending || (payment && group.isPending)) return <SkeletonList rows={3} />;
  if (!payment || !group.data) return <p className={styles.muted}>Não encontramos essa cobrança.</p>;
  const what =
    payment.kind === 'monthly_fee' && payment.referenceMonth
      ? `${group.data.name} · mensalidade de ${monthName(payment.referenceMonth)}`
      : group.data.name;
  return <PixFlow payment={payment} pix={group.data.pix ?? null} what={what} deadline={null} onClose={onClose} />;
}

interface PixFlowProps {
  payment: Payment;
  pix: { key: string; holderName: string } | null;
  what: string;
  deadline: string | null;
  onClose: () => void;
}

function PixFlow({ payment, pix, what, deadline, onClose }: PixFlowProps) {
  const report = useReportPayment();
  const [copied, setCopied] = useState(false);
  const [receipt, setReceipt] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const first = pix?.holderName.split(' ')[0];

  if (payment.status === 'reported' || report.isSuccess)
    return (
      <div className={styles.result} role="status">
        <span className={styles.mark}>
          <CircleCheck size={32} aria-hidden="true" />
        </span>
        <h3 className={styles.resultTitle}>Pagamento enviado</h3>
        <p className={styles.muted}>
          {first ? `${first} vai conferir` : 'Quem organiza vai conferir'} e você recebe um aviso. Sua vaga fica
          guardada enquanto isso.
        </p>
        <Button block onClick={onClose}>
          Pronto
        </Button>
      </div>
    );

  if (payment.status === 'paid')
    return (
      <div className={styles.result} role="status">
        <span className={styles.mark}>
          <CircleCheck size={32} aria-hidden="true" />
        </span>
        <h3 className={styles.resultTitle}>Pagamento aprovado</h3>
        <p className={styles.muted}>{formatCents(payment.amountCents)} recebidos. Nada a fazer.</p>
        <Button block onClick={onClose}>
          Pronto
        </Button>
      </div>
    );

  if (payment.status === 'cancelled')
    return <p className={styles.muted}>Esta cobrança foi cancelada. Não é preciso pagar.</p>;

  const copy = async () => {
    if (!pix) return;
    const code = buildBrCode({
      key: pix.key,
      amountCents: payment.amountCents,
      merchantName: pix.holderName,
      txid: payment.id.replace(/[^A-Za-z0-9]/g, '').slice(0, 25),
    });
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      toast('Não deu para copiar. Use a chave Pix abaixo.', { tone: 'error' });
      setCopied(true);
    }
  };

  const send = () =>
    report.mutate(
      { paymentId: payment.id, note: receipt ?? undefined },
      {
        onError: (e) =>
          toast(isApiError(e) ? messageFor(e.code) : 'Não deu para enviar. Tente de novo.', { tone: 'error' }),
      },
    );

  return (
    <>
      <div className={styles.amountBlock}>
        <span className={styles.muted}>{what}</span>
        <span className={styles.amount}>{formatCents(payment.amountCents)}</span>
        {deadline && (
          <Badge tone="warning" className={styles.deadline}>
            Pague até {formatWhen(deadline)}
          </Badge>
        )}
      </div>

      {payment.status === 'rejected' && (
        <Banner tone="danger" role="alert">
          Recusado: {(payment.rejectionReason ?? 'pagamento não encontrado').toLowerCase()}. Envie de novo.
        </Banner>
      )}

      {pix ? (
        <List>
          <ListItem
            leading={<Landmark size={22} aria-hidden="true" />}
            title={`Pix para ${pix.holderName}`}
            meta={pix.key}
          />
        </List>
      ) : (
        <Banner tone="warning">A turma ainda não tem chave Pix. Combine o pagamento com quem organiza.</Banner>
      )}

      {pix && !copied && (
        <Button block icon={<Copy size={20} aria-hidden="true" />} onClick={() => void copy()}>
          Copiar código Pix
        </Button>
      )}
      {pix && copied && (
        <>
          <Banner tone="success" role="status">
            <b>Código copiado.</b> Cole no app do seu banco em Pix copia e cola. Valor e chave já vão juntos.
          </Banner>
          <Button block loading={report.isPending} onClick={send}>
            Já paguei
          </Button>
        </>
      )}

      <p className={styles.help}>
        Depois de pagar, toque em “Já paguei”.{' '}
        <button type="button" className={styles.link} onClick={() => fileRef.current?.click()}>
          <Paperclip size={14} aria-hidden="true" /> {receipt ? `Comprovante: ${receipt}` : 'Anexar comprovante'}
        </button>{' '}
        é opcional.
      </p>
      <input
        ref={fileRef}
        type="file"
        accept="image/*,application/pdf"
        className="visually-hidden"
        tabIndex={-1}
        aria-label="Comprovante (opcional)"
        onChange={(e) => setReceipt(e.target.files?.[0]?.name ?? null)}
      />
    </>
  );
}
