import { CalendarClock, CircleCheck, CircleDollarSign, FileText, MessageCircleQuestion, Receipt } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Accordion, AccordionItem } from '@/components/Accordion';
import { Avatar } from '@/components/Avatar';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { DateTile, List, ListItem } from '@/components/List';
import { fromState, PageTitle } from '@/components/NavBar';
import { Section } from '@/components/Section';
import { useSheetParam } from '@/components/Sheet';
import { SkeletonList } from '@/components/Skeleton';
import { useParticipations, useRemind, useUndoReminder, type Participation } from '@/features/attendance';
import { MEMBERSHIP_LABEL, useGroup, useOrganizes, type GroupSummary } from '@/features/groups';
import { useGroupMatches, useMatchAction, type MatchSummary } from '@/features/matches';
import {
  RejectSheet,
  useApprovePayment,
  useChargePayment,
  useGroupPayments,
  useReceivePayment,
  useRejectPayment,
  useUndoPaymentReview,
  type Payment,
} from '@/features/payments';
import {
  formatCents,
  formatDay,
  formatDayOfMonth,
  formatDayTime,
  formatMoneyShort,
  formatWeekdayShort,
  formatWhen,
  monthName,
} from '@/lib/format';
import { isApiError, messageFor } from '@/lib/http';
import { toast } from '@/stores';
import { NewGameSheet } from '../shared/organizer/NewGameSheet';
import styles from './OrganizePage.module.css';

const FROM = fromState('/organizar', 'Organizar');
type Kind = 'pay' | 'fees' | 'unanswered' | 'draft';
const ORDER: Kind[] = ['pay', 'fees', 'unanswered', 'draft'];
const first = (name: string) => name.split(' ')[0] ?? name;

/**
 * Organizar (manual 4.1): as turmas que você organiza e, embaixo, "A resolver" — cada pendência
 * abre ali mesmo, com as ações dentro. Quando uma termina, aparece "Feito" e a próxima abre sozinha.
 * Toda ação tem Desfazer.
 */
export function OrganizePage() {
  const { owned, isPending } = useOrganizes();
  return (
    <>
      <PageTitle title="Organizar" />
      {isPending ? (
        <SkeletonList rows={3} />
      ) : (
        <>
          <Section title="Suas turmas">
            <List>
              {owned.map((g) => (
                <ListItem
                  key={g.id}
                  leading={<Avatar name={g.name} id={g.id} decorative />}
                  title={g.name}
                  meta={g.nextMatch ? `Próximo jogo: ${formatDay(g.nextMatch.startsAt)}` : 'Nenhum jogo marcado'}
                  to={`/organizar/${g.id}/presenca`}
                  linkState={FROM}
                />
              ))}
            </List>
          </Section>
          {owned.map((g) => (
            <ResolveGroup key={g.id} summary={g} />
          ))}
        </>
      )}
    </>
  );
}

/** Junta o que está pendente com o que acabou de ser resolvido (para mostrar "Feito" e o Desfazer). */
function sticky<T extends { id: string }>(items: T[] | undefined, done: Record<string, DoneState>, kind: Kind): T[] {
  const current = items ?? [];
  const ids = new Set(current.map((i) => i.id));
  const resolved = Object.values(done)
    .filter((d) => d.kind === kind && !ids.has(d.item.id))
    .map((d) => d.item as T);
  return [...current, ...resolved];
}

interface DoneState {
  kind: Kind;
  item: { id: string };
  label: ReactNode;
  tone: 'success' | 'danger' | 'warning';
  undo: () => Promise<unknown>;
}
type DoneInput = Omit<DoneState, 'kind' | 'item'>;

function ResolveGroup({ summary }: { summary: GroupSummary }) {
  const groupId = summary.id;
  const focusId = summary.pendings?.focusMatchId ?? '';
  const group = useGroup(groupId);
  const reported = useGroupPayments(groupId, { status: ['reported'] });
  const fees = useGroupPayments(groupId, { kind: 'monthly_fee', status: ['pending', 'rejected'] });
  const parts = useParticipations(focusId, { enabled: Boolean(focusId) && (summary.pendings?.unanswered ?? 0) > 0 });
  const games = useGroupMatches(groupId, 'upcoming');
  const focus = games.data?.items.find((m) => m.id === focusId) ?? summary.nextMatch ?? null;

  const approve = useApprovePayment();
  const reject = useRejectPayment();
  const receive = useReceivePayment();
  const charge = useChargePayment();
  const undoPayment = useUndoPaymentReview();
  const remind = useRemind(focusId);
  const undoReminder = useUndoReminder();
  const editSheet = useSheetParam('editar-jogo');

  const [done, setDone] = useState<Record<string, DoneState>>({});
  const [open, setOpen] = useState<Kind | null | undefined>(undefined);
  const [rejecting, setRejecting] = useState<Payment | null>(null);

  const dueDay = group.data?.monthlyFeeDueDay ?? 10;
  const [localNow] = useState(() => new Date(Date.now() - 3 * 3_600_000));
  const month = localNow.toISOString().slice(0, 7);
  const overdue = (fees.data?.items ?? []).filter(
    (p) =>
      p.referenceMonth &&
      (p.referenceMonth < month || (p.referenceMonth === month && localNow.getUTCDate() > dueDay)) &&
      p.user.id !== group.data?.owner.id,
  );
  const unanswered = (parts.data?.items ?? []).filter((p) => p.status === 'pending');
  const drafts = (games.data?.items ?? []).filter((m) => m.status === 'draft');

  const payItems = sticky(reported.data?.items, done, 'pay');
  const feeItems = sticky(overdue, done, 'fees');
  const noAnswer = sticky(unanswered, done, 'unanswered');
  const draftItems = sticky(drafts, done, 'draft');

  const left: Record<Kind, number> = {
    pay: payItems.filter((p) => !done[p.id]).length,
    fees: feeItems.filter((p) => !done[p.id]).length,
    unanswered: noAnswer.filter((p) => !done[p.id]).length,
    draft: draftItems.filter((m) => !done[m.id]).length,
  };
  const total = left.pay + left.fees + left.unanswered + left.draft;
  const shown: Record<Kind, boolean> = {
    pay: payItems.length > 0,
    fees: feeItems.length > 0,
    unanswered: noAnswer.length > 0,
    draft: draftItems.length > 0,
  };
  const current = open === undefined ? (ORDER.find((k) => left[k] > 0) ?? null) : open;

  const loading = reported.isPending || fees.isPending || games.isPending || (parts.isLoading && Boolean(focusId));
  if (loading) return <SkeletonList rows={2} />;

  /** Resolve um item; se a pendência acabou, abre a próxima sozinha. */
  const finish = (kind: Kind, items: Array<{ id: string }>, state: DoneInput) => {
    const ids = items.map((i) => i.id);
    setDone((d) => ({ ...d, ...Object.fromEntries(items.map((item) => [item.id, { ...state, kind, item }])) }));
    const remaining = { ...left, [kind]: Math.max(0, left[kind] - ids.length) };
    if (remaining[kind] === 0) {
      const i = ORDER.indexOf(kind);
      const next = [...ORDER.slice(i + 1), ...ORDER.slice(0, i)].find((k) => remaining[k] > 0);
      setOpen(next ?? null);
    }
  };
  const undo = (ids: string[], kind: Kind) => {
    const state = done[ids[0] ?? ''];
    if (!state) return;
    void state
      .undo()
      .then(() => {
        setDone((d) => {
          const next = { ...d };
          for (const id of ids) delete next[id];
          return next;
        });
        setOpen(kind);
      })
      .catch((e: unknown) => toast(isApiError(e) ? messageFor(e.code) : 'Não deu para desfazer.', { tone: 'error' }));
  };
  const fail = (e: unknown) =>
    toast(isApiError(e) ? messageFor(e.code) : 'Não deu certo. Tente de novo.', { tone: 'error' });

  const doneRow = (id: string, kind: Kind) => {
    const d = done[id];
    if (!d) return null;
    return (
      <div className={styles.done}>
        <Badge tone={d.tone} icon={<CircleCheck />}>
          {d.label}
        </Badge>
        <Button variant="ghost" size="sm" onClick={() => undo([id], kind)}>
          Desfazer
        </Button>
      </div>
    );
  };
  const status = (k: Kind) =>
    left[k] > 0 ? (
      <Badge tone="warning">{left[k]}</Badge>
    ) : (
      <Badge tone="success" icon={<CircleCheck />}>
        Feito
      </Badge>
    );
  const toggle = (k: Kind) => setOpen(current === k ? null : k);
  const deadline = focus ? formatWhen(focus.responseDeadline ?? focus.startsAt) : '';

  if (!shown.pay && !shown.fees && !shown.unanswered && !shown.draft)
    return (
      <EmptyState
        icon={CircleCheck}
        title="Tudo em dia"
        description={`Nada para resolver na ${summary.name}.`}
        titleAs="h3"
      />
    );

  return (
    <Section title={total > 0 ? `A resolver · ${total}` : 'A resolver'} aside={summary.name}>
      <Accordion>
        {shown.pay && (
          <AccordionItem
            icon={<CircleDollarSign size={20} aria-hidden="true" />}
            title="Conferir pagamentos"
            subtitle={left.pay > 0 ? 'Confira no extrato do banco antes de aprovar' : 'Resolvido'}
            status={status('pay')}
            open={current === 'pay'}
            onToggle={() => toggle('pay')}
          >
            {payItems.map((p) => (
              <div key={p.id} className={styles.item}>
                <div className={styles.itemTop}>
                  <Avatar name={p.user.name} id={p.user.id} src={p.user.photoUrl} decorative />
                  <span className={styles.itemText}>
                    <span className={styles.itemTitle}>
                      {first(p.user.name)} · <b>{formatCents(p.amountCents)}</b>
                    </span>
                    <span className={styles.muted}>
                      {p.kind === 'monthly_fee' && p.referenceMonth
                        ? `Mensalidade de ${monthName(p.referenceMonth)}`
                        : `Avulso · ${focus && p.matchId === focus.id ? formatDay(focus.startsAt) : 'jogo'}`}
                    </span>
                  </span>
                  {p.reportNote && (
                    <span className={styles.receipt} title={p.reportNote}>
                      <Receipt size={18} aria-hidden="true" />
                      <span className="visually-hidden">Comprovante: {p.reportNote}</span>
                    </span>
                  )}
                </div>
                {done[p.id] ? (
                  doneRow(p.id, 'pay')
                ) : (
                  <div className={styles.pair}>
                    <Button variant="secondary" onClick={() => setRejecting(p)}>
                      Recusar
                    </Button>
                    <Button
                      loading={approve.isPending && approve.variables?.paymentId === p.id}
                      onClick={() =>
                        approve.mutate(
                          { paymentId: p.id },
                          {
                            onSuccess: () =>
                              finish('pay', [p], {
                                label: 'Aprovado · entrou no caixa',
                                tone: 'success',
                                undo: () => undoPayment.mutateAsync(p.id),
                              }),
                            onError: fail,
                          },
                        )
                      }
                    >
                      Aprovar
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </AccordionItem>
        )}

        {shown.fees && (
          <AccordionItem
            icon={<CalendarClock size={20} aria-hidden="true" />}
            title="Mensalidades atrasadas"
            subtitle={left.fees > 0 ? 'Cobre ou marque como recebida' : 'Resolvido'}
            status={status('fees')}
            open={current === 'fees'}
            onToggle={() => toggle('fees')}
          >
            {feeItems.map((p) => (
              <div key={p.id} className={styles.item}>
                <div className={styles.itemTop}>
                  <Avatar name={p.user.name} id={p.user.id} src={p.user.photoUrl} decorative />
                  <span className={styles.itemText}>
                    <span className={styles.itemTitle}>{first(p.user.name)}</span>
                    <span className={styles.muted}>
                      {p.referenceMonth
                        ? `${monthName(p.referenceMonth).replace(/^./, (c) => c.toUpperCase())} · `
                        : ''}
                      {formatMoneyShort(p.amountCents)} · venceu dia {dueDay}
                    </span>
                  </span>
                </div>
                {done[p.id] ? (
                  doneRow(p.id, 'fees')
                ) : (
                  <div className={styles.pair}>
                    <Button
                      variant="secondary"
                      loading={receive.isPending && receive.variables === p.id}
                      onClick={() =>
                        receive.mutate(p.id, {
                          onSuccess: () =>
                            finish('fees', [p], {
                              label: 'Marcada como paga',
                              tone: 'success',
                              undo: () => undoPayment.mutateAsync(p.id),
                            }),
                          onError: fail,
                        })
                      }
                    >
                      Recebi em mãos
                    </Button>
                    <Button
                      loading={charge.isPending && charge.variables === p.id}
                      onClick={() =>
                        charge.mutate(p.id, {
                          onSuccess: ({ reminderId }) =>
                            finish('fees', [p], {
                              label: 'Cobrança enviada',
                              tone: 'warning',
                              undo: () => undoReminder.mutateAsync(reminderId),
                            }),
                          onError: fail,
                        })
                      }
                    >
                      Cobrar
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </AccordionItem>
        )}

        {shown.unanswered && focus && (
          <AccordionItem
            icon={<MessageCircleQuestion size={20} aria-hidden="true" />}
            title={`Sem resposta para ${formatDay(focus.startsAt)}`}
            subtitle={left.unanswered > 0 ? `Prioridade dos mensalistas até ${deadline}` : 'Resolvido'}
            status={status('unanswered')}
            open={current === 'unanswered'}
            onToggle={() => toggle('unanswered')}
          >
            {left.unanswered > 1 && (
              <Button
                variant="tint"
                block
                loading={remind.isPending && !remind.variables}
                onClick={() => {
                  const pendingItems = noAnswer.filter((p) => !done[p.id]);
                  const ids = pendingItems.map((p) => p.id);
                  remind.mutate(undefined, {
                    onSuccess: ({ reminderId, sent }) => {
                      finish('unanswered', pendingItems, {
                        label: 'Lembrado',
                        tone: 'success',
                        undo: () => undoReminder.mutateAsync(reminderId),
                      });
                      toast(`${sent} ${sent === 1 ? 'pessoa lembrada' : 'pessoas lembradas'}.`, {
                        tone: 'success',
                        action: { label: 'Desfazer', onAction: () => undo(ids, 'unanswered') },
                      });
                    },
                    onError: fail,
                  });
                }}
              >
                Lembrar todos de uma vez
              </Button>
            )}
            {noAnswer.map((p: Participation) => (
              <div key={p.id} className={styles.itemTop}>
                <Avatar name={p.user.name} id={p.user.id} src={p.user.photoUrl} size="sm" decorative />
                <span className={styles.itemText}>
                  <span className={styles.itemTitle}>{first(p.user.name)}</span>
                  <span className={styles.muted}>{MEMBERSHIP_LABEL[p.membershipType]}</span>
                </span>
                {done[p.id] ? (
                  <>
                    <Badge tone="success">Lembrado</Badge>
                    <Button variant="ghost" size="sm" onClick={() => undo([p.id], 'unanswered')}>
                      Desfazer
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    loading={remind.isPending && remind.variables?.[0] === p.user.id}
                    onClick={() =>
                      remind.mutate([p.user.id], {
                        onSuccess: ({ reminderId }) =>
                          finish('unanswered', [p], {
                            label: 'Lembrado',
                            tone: 'success',
                            undo: () => undoReminder.mutateAsync(reminderId),
                          }),
                        onError: fail,
                      })
                    }
                  >
                    Lembrar
                  </Button>
                )}
              </div>
            ))}
          </AccordionItem>
        )}

        {shown.draft && (
          <AccordionItem
            icon={<FileText size={20} aria-hidden="true" />}
            title={draftItems.length > 1 ? 'Jogos em rascunho' : 'Jogo em rascunho'}
            subtitle={left.draft > 0 ? 'Só você vê até publicar' : 'Resolvido'}
            status={status('draft')}
            open={current === 'draft'}
            onToggle={() => toggle('draft')}
          >
            {draftItems.map((m) => (
              <DraftItem
                key={m.id}
                game={m}
                done={done[m.id]}
                onPublished={(game) =>
                  finish('draft', [m], {
                    label:
                      game.listOpensAt && new Date(game.listOpensAt) > new Date()
                        ? `Publicado · lista abre ${formatWhen(game.listOpensAt)}`
                        : 'Publicado · lista aberta',
                    tone: 'success',
                    undo: game.undo,
                  })
                }
                onUndo={() => undo([m.id], 'draft')}
                onEdit={() => editSheet.open({ jogo: m.id })}
                fail={fail}
              />
            ))}
          </AccordionItem>
        )}
      </Accordion>

      {rejecting && (
        <RejectSheet
          open
          who={first(rejecting.user.name)}
          loading={reject.isPending}
          onClose={() => setRejecting(null)}
          onConfirm={(reason) => {
            const p = rejecting;
            reject.mutate(
              { paymentId: p.id, reason },
              {
                onSuccess: () => {
                  setRejecting(null);
                  finish('pay', [p], {
                    label: 'Recusado · pessoa avisada',
                    tone: 'danger',
                    undo: () => undoPayment.mutateAsync(p.id),
                  });
                },
                onError: fail,
              },
            );
          }}
        />
      )}
      {group.data && editSheet.isOpen && (
        <NewGameSheet
          open
          onClose={() => editSheet.close(['jogo'])}
          group={group.data}
          draft={drafts.find((d) => d.id === editSheet.param('jogo')) ?? null}
        />
      )}
    </Section>
  );
}

function DraftItem({
  game,
  done,
  onPublished,
  onUndo,
  onEdit,
  fail,
}: {
  game: MatchSummary;
  done: DoneState | undefined;
  onPublished: (r: { listOpensAt: string | null | undefined; undo: () => Promise<unknown> }) => void;
  onUndo: () => void;
  onEdit: () => void;
  fail: (e: unknown) => void;
}) {
  const action = useMatchAction(game.id);
  return (
    <div className={styles.item}>
      <div className={styles.itemTop}>
        <DateTile weekday={formatWeekdayShort(game.startsAt)} day={String(Number(formatDayOfMonth(game.startsAt)))} />
        <span className={styles.itemText}>
          <span className={styles.itemTitle}>{formatDayTime(game.startsAt, { capital: true })}</span>
          <span className={styles.muted}>
            {game.location?.name} · {game.counts.capacity} vagas{game.repeatsWeekly ? ' · repete toda semana' : ''}
          </span>
        </span>
      </div>
      {done ? (
        <div className={styles.done}>
          <Badge tone="success" icon={<CircleCheck />}>
            {done.label}
          </Badge>
          <Button variant="ghost" size="sm" onClick={onUndo}>
            Desfazer
          </Button>
        </div>
      ) : (
        <div className={styles.pair}>
          <Button variant="secondary" onClick={onEdit}>
            Editar
          </Button>
          <Button
            loading={action.isPending}
            onClick={() =>
              action.mutate('publish', {
                onSuccess: (m) =>
                  onPublished({ listOpensAt: m.listOpensAt, undo: () => action.mutateAsync('unpublish') }),
                onError: fail,
              })
            }
          >
            Publicar
          </Button>
        </div>
      )}
    </div>
  );
}
