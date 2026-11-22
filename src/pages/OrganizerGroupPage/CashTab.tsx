import { Award } from 'lucide-react';
import { useState } from 'react';
import { Avatar } from '@/components/Avatar';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Chips } from '@/components/Chips';
import { List, ListItem } from '@/components/List';
import { MoneyField } from '@/components/MoneyField';
import { SegmentedControl } from '@/components/SegmentedControl';
import { Section } from '@/components/Section';
import { Sheet } from '@/components/Sheet';
import { Skeleton, SkeletonList } from '@/components/Skeleton';
import { DateField, TextField } from '@/components/TextField';
import {
  CATEGORY_LABEL,
  MANUAL_CATEGORIES,
  useCreateLedgerEntry,
  useExportLedger,
  useFinanceSummary,
  useLedgerEntries,
  useReverseLedgerEntry,
  type LedgerCategory,
  type LedgerEntry,
} from '@/features/finance';
import { useMembers, type Group } from '@/features/groups';
import { useChargePayment, useGroupPayments } from '@/features/payments';
import { useUndoReminder } from '@/features/attendance';
import { formatCents, formatMoneyShort, monthName } from '@/lib/format';
import { isApiError, messageFor } from '@/lib/http';
import { toast } from '@/stores';
import styles from './OrganizerGroupPage.module.css';

const today = () => new Date(Date.now() - 3 * 3_600_000).toISOString().slice(0, 10);
const shortDate = (d: string) =>
  new Date(`${d}T12:00:00Z`)
    .toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', timeZone: 'UTC' })
    .replace('.', '')
    .replace(' de ', ' ');
const signed = (e: Pick<LedgerEntry, 'direction' | 'amountCents'>) =>
  `${e.direction === 'in' ? '+' : '−'} ${formatCents(e.amountCents)}`;
const first = (name: string) => name.split(' ')[0] ?? name;

function entryMeta(e: LedgerEntry) {
  const when = shortDate(e.occurredOn);
  if (e.source === 'reversal') return `${when} · estorno`;
  if (e.reversedBy) return `${when} · estornado`;
  if (e.source === 'payment')
    return `${when} · ${e.method === 'cash' ? 'em dinheiro' : e.reviewedByName ? `aprovado por ${e.reviewedByName}` : 'Pix'}`;
  return `${when} · ${CATEGORY_LABEL[e.category ?? 'other']}`;
}

/**
 * Caixa (manual 4.2): saldo, mensalidades do mês com quem falta pagar e Cobrar, os mais pontuais,
 * e o extrato com exportação. Correção sempre por estorno, nunca apagando. O + abre o novo lançamento.
 */
export function CashTab({
  group,
  entryOpen,
  onEntryClose,
}: {
  group: Group;
  entryOpen: boolean;
  onEntryClose: () => void;
}) {
  const month = today().slice(0, 7);
  const summary = useFinanceSummary(group.id, month);
  const entries = useLedgerEntries(group.id, '');
  const fees = useGroupPayments(group.id, { kind: 'monthly_fee', month });
  const members = useMembers(group.id);
  const charge = useChargePayment();
  const undoReminder = useUndoReminder();
  const exportLedger = useExportLedger(
    group.id,
    `caixa-${group.name.toLowerCase().replace(/\s+/g, '-')}-${today()}.csv`,
  );
  const [charged, setCharged] = useState<Record<string, string>>({});
  const [detail, setDetail] = useState<LedgerEntry | null>(null);
  const [onTimeOpen, setOnTimeOpen] = useState(false);
  const [limit, setLimit] = useState(12);
  const [pastDue] = useState(() => new Date(Date.now() - 3 * 3_600_000).getUTCDate() > (group.monthlyFeeDueDay ?? 10));

  const s = summary.data;
  const monthFees = (fees.data?.items ?? []).filter((p) => p.status !== 'cancelled' && p.user.id !== group.owner.id);
  const paid = monthFees.filter((p) => p.status === 'paid');
  const missing = monthFees.filter((p) => p.status !== 'paid');
  const net = s ? s.receivedInMonthCents - (s.spentInMonthCents ?? 0) : 0;
  const onTime = (members.data ?? [])
    .filter((m) => m.type === 'monthly' && (m.monthsOnTime ?? 0) > 0)
    .sort((a, b) => (b.monthsOnTime ?? 0) - (a.monthsOnTime ?? 0));

  const doCharge = (paymentId: string, name: string) =>
    charge.mutate(paymentId, {
      onSuccess: ({ reminderId }) => {
        setCharged((c) => ({ ...c, [paymentId]: reminderId }));
        toast(`Cobrança enviada para ${name}.`, {
          action: {
            label: 'Desfazer',
            onAction: () =>
              undoReminder.mutate(reminderId, {
                onSuccess: () =>
                  setCharged((c) => {
                    const { [paymentId]: _x, ...rest } = c;
                    return rest;
                  }),
              }),
          },
        });
      },
      onError: (e) => toast(isApiError(e) ? messageFor(e.code) : 'Não deu para cobrar.', { tone: 'error' }),
    });

  return (
    <>
      {s ? (
        <Card padding="md" className={styles.balance}>
          <span className={styles.muted}>Saldo do caixa</span>
          <span className={styles.money}>{formatCents(s.balanceCents)}</span>
          <span className={styles.muted}>
            <span className={net >= 0 ? styles.pos : undefined}>
              {net >= 0 ? '+' : '−'} {formatCents(Math.abs(net))}
            </span>{' '}
            em {monthName(month)}
          </span>
        </Card>
      ) : (
        <Skeleton shape="card" height="11rem" />
      )}

      <Section title={`Mensalidades de ${monthName(month)} · ${paid.length} de ${monthFees.length}`}>
        <List>
          {missing.map((p) => (
            <ListItem
              key={p.id}
              inline
              leading={<Avatar name={p.user.name} id={p.user.id} src={p.user.photoUrl} decorative />}
              title={first(p.user.name)}
              meta={`${p.status === 'reported' ? 'Mandou Pix' : `${pastDue ? 'Venceu' : 'Vence'} dia ${group.monthlyFeeDueDay ?? 10}`} · ${formatMoneyShort(p.amountCents)}`}
              trailing={
                p.status === 'reported' ? (
                  <Badge tone="warning">Conferir</Badge>
                ) : charged[p.id] ? (
                  <Badge tone="warning">Cobrado</Badge>
                ) : (
                  <Button
                    variant="tint"
                    size="sm"
                    loading={charge.isPending && charge.variables === p.id}
                    onClick={() => doCharge(p.id, first(p.user.name))}
                  >
                    Cobrar
                  </Button>
                )
              }
            />
          ))}
          <ListItem
            leading={<Award size={22} aria-hidden="true" />}
            title="Mais pontuais"
            meta={
              onTime.length
                ? onTime
                    .slice(0, 3)
                    .map(
                      (m, i) =>
                        `${first(m.user.name)} (${m.monthsOnTime}${i === 0 ? (m.monthsOnTime === 1 ? ' mês' : ' meses') : ''})`,
                    )
                    .join(', ')
                : 'Aparece depois do primeiro mês'
            }
            onClick={() => setOnTimeOpen(true)}
          />
        </List>
      </Section>

      <Section
        title="Extrato"
        aside={
          <Button
            variant="ghost"
            size="sm"
            loading={exportLedger.isPending}
            onClick={() =>
              exportLedger.mutate(undefined, { onSuccess: () => toast('Extrato exportado.', { tone: 'success' }) })
            }
          >
            Exportar
          </Button>
        }
        footnote="O saldo é a soma dos lançamentos. Para corrigir, toque no lançamento e escolha Estornar."
      >
        {entries.isPending ? (
          <SkeletonList rows={4} />
        ) : (
          <List>
            {(entries.data ?? []).slice(0, limit).map((e) => (
              <ListItem
                key={e.id}
                inline
                title={e.description}
                meta={entryMeta(e)}
                trailing={<span className={e.direction === 'in' ? styles.pos : styles.neg}>{signed(e)}</span>}
                onClick={() => setDetail(e)}
              />
            ))}
          </List>
        )}
        {(entries.data?.length ?? 0) > limit && (
          <Button variant="ghost" block onClick={() => setLimit((n) => n + 20)}>
            Ver mais lançamentos
          </Button>
        )}
      </Section>

      <EntrySheet open={entryOpen} onClose={onEntryClose} groupId={group.id} />
      {detail && <EntryDetail entry={detail} groupId={group.id} onClose={() => setDetail(null)} />}
      <Sheet open={onTimeOpen} onClose={() => setOnTimeOpen(false)} title="Mais pontuais" closeLabel="Fechar">
        <List>
          {onTime.map((m) => (
            <ListItem
              key={m.id}
              inline
              leading={<Avatar name={m.user.name} id={m.user.id} src={m.user.photoUrl} decorative />}
              title={m.user.name}
              trailing={
                <span className={styles.value}>
                  {m.monthsOnTime} {m.monthsOnTime === 1 ? 'mês' : 'meses'}
                </span>
              }
            />
          ))}
        </List>
        <p className={styles.muted}>Meses seguidos com a mensalidade paga até o vencimento.</p>
      </Sheet>
    </>
  );
}

/** Novo lançamento (manual 4.2): entrada ou saída, valor, descrição, categoria e data. */
function EntrySheet({ open, onClose, groupId }: { open: boolean; onClose: () => void; groupId: string }) {
  const create = useCreateLedgerEntry(groupId);
  const [direction, setDirection] = useState<'in' | 'out'>('out');
  const [amount, setAmount] = useState<number | null>(null);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<LedgerCategory>('rent');
  const [date, setDate] = useState(today());
  const [errors, setErrors] = useState<Record<string, string>>({});

  const reset = () => {
    setDirection('out');
    setAmount(null);
    setDescription('');
    setCategory('rent');
    setDate(today());
    setErrors({});
  };
  const save = () => {
    const next: Record<string, string> = {};
    if (!amount || amount <= 0) next.amount = 'Digite o valor.';
    if (description.trim().length < 2) next.description = 'Descreva o lançamento.';
    setErrors(next);
    if (Object.keys(next).length) return;
    create.mutate(
      { direction, amountCents: amount ?? 0, description: description.trim(), occurredOn: date, category },
      {
        onSuccess: () => {
          toast('Lançamento salvo.', { tone: 'success' });
          reset();
          onClose();
        },
        onError: (e) => toast(isApiError(e) ? messageFor(e.code) : 'Não deu para salvar.', { tone: 'error' }),
      },
    );
  };

  return (
    <Sheet
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Novo lançamento"
      action={{ label: 'Salvar', onClick: save, loading: create.isPending }}
    >
      <SegmentedControl<'in' | 'out'>
        label="Tipo"
        options={[
          { value: 'in', label: 'Entrada' },
          { value: 'out', label: 'Saída' },
        ]}
        value={direction}
        onChange={setDirection}
      />
      <MoneyField label="Valor" value={amount} onChange={setAmount} error={errors.amount} />
      <TextField
        label="Descrição"
        placeholder="Aluguel da quadra · dezembro"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        error={errors.description}
        maxLength={80}
      />
      <Chips
        label="Categoria"
        options={MANUAL_CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABEL[c] }))}
        value={category}
        onChange={setCategory}
      />
      <DateField label="Data" value={date} onChange={(e) => setDate(e.target.value)} />
    </Sheet>
  );
}

/** Lançamento: detalhes e Estornar (cria o lançamento contrário; nada é apagado). */
function EntryDetail({ entry, groupId, onClose }: { entry: LedgerEntry; groupId: string; onClose: () => void }) {
  const reverse = useReverseLedgerEntry(groupId);
  const [confirm, setConfirm] = useState(false);
  const canReverse = entry.source !== 'reversal' && !entry.reversedBy;
  return (
    <Sheet open onClose={onClose} title="Lançamento" closeLabel="Fechar">
      <div className={styles.centerBlock}>
        <span className={styles.muted}>{entry.description}</span>
        <span className={`${styles.money} ${entry.direction === 'in' ? styles.pos : ''}`}>{signed(entry)}</span>
        <span className={styles.muted}>{entryMeta(entry)}</span>
      </div>
      {canReverse ? (
        <Button
          variant="danger"
          block
          loading={reverse.isPending}
          onClick={() =>
            confirm
              ? reverse.mutate(entry.id, {
                  onSuccess: () => {
                    toast('Estorno lançado no extrato.', { tone: 'success' });
                    onClose();
                  },
                  onError: (e) =>
                    toast(isApiError(e) ? messageFor(e.code) : 'Não deu para estornar.', { tone: 'error' }),
                })
              : setConfirm(true)
          }
        >
          {confirm ? `Confirmar estorno de ${formatCents(entry.amountCents)}` : 'Estornar'}
        </Button>
      ) : (
        <p className={styles.muted}>
          {entry.source === 'reversal' ? 'Este lançamento é um estorno.' : 'Este lançamento já foi estornado.'}
        </p>
      )}
      <p className={styles.muted}>O estorno entra como um lançamento contrário. O original continua no extrato.</p>
    </Sheet>
  );
}
