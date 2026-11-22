import { MoreHorizontal, Receipt } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Avatar } from '@/components/Avatar';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { DateTile, List, ListItem } from '@/components/List';
import { NavIconButton } from '@/components/NavBar';
import { ProgressBar } from '@/components/ProgressBar';
import { SegmentedControl } from '@/components/SegmentedControl';
import { Section } from '@/components/Section';
import { ConfirmSheet, Sheet } from '@/components/Sheet';
import { SkeletonList } from '@/components/Skeleton';
import {
  useAddParticipation,
  useParticipations,
  usePromote,
  useRemind,
  useRemoveParticipation,
  useUndoReminder,
  type Participation,
} from '@/features/attendance';
import { MEMBERSHIP_LABEL, type Group } from '@/features/groups';
import { useMatchAction, type MatchSummary } from '@/features/matches';
import {
  RejectSheet,
  useApprovePayment,
  useReceivePayment,
  useRejectPayment,
  useUndoPaymentReview,
} from '@/features/payments';
import {
  formatDay,
  formatDayOfMonth,
  formatDayTime,
  formatMoneyShort,
  formatWeekdayShort,
  formatWhen,
} from '@/lib/format';
import { isApiError, messageFor } from '@/lib/http';
import { toast } from '@/stores';
import styles from './OrganizerGroupPage.module.css';

type Filter = 'pendentes' | 'fila' | 'confirmados';
const first = (name: string) => name.split(' ')[0] ?? name;

/**
 * Presença (manual 4.2): card do próximo jogo com vagas e o prazo da lista, Fechar lista e Iniciar jogo,
 * e o filtro na ordem do que pede ação: Pendentes (sem resposta, com "Lembrar os 5", e quem vai mas
 * falta pagar), Fila e Confirmados (já resolvidos). Na fila, mensalista vem antes de avulso.
 */
export function PresenceTab({
  group,
  game,
  onNewGame,
}: {
  group: Group;
  game: MatchSummary | null;
  onNewGame: () => void;
}) {
  if (!game)
    return (
      <EmptyState
        title="Nenhum jogo marcado"
        description="Crie o próximo jogo: já vem com o dia, o horário, o local e as vagas da turma."
        action={<Button onClick={onNewGame}>Novo jogo</Button>}
      />
    );
  return <Presence group={group} game={game} />;
}

function Presence({ group, game }: { group: Group; game: MatchSummary }) {
  const navigate = useNavigate();
  const parts = useParticipations(game.id);
  const action = useMatchAction(game.id);
  const remind = useRemind(game.id);
  const undoReminder = useUndoReminder();
  const [filter, setFilter] = useState<Filter>('pendentes');
  const [options, setOptions] = useState<Participation | null>(null);
  const items = parts.data?.items ?? [];
  const confirmed = items.filter((p) => p.status === 'confirmed');
  const unpaid = items.filter((p) => p.status === 'awaiting_payment');
  const queue = items
    .filter((p) => p.status === 'waitlisted')
    .sort((a, b) => (a.waitlistPosition ?? 0) - (b.waitlistPosition ?? 0));
  const silent = items.filter((p) => p.status === 'pending');
  const pendingCount = silent.length + unpaid.length;
  const c = game.counts;
  const taken = c.capacity - c.freeSpots;
  const opensLater = game.listOpensAt && new Date(game.listOpensAt) > new Date();
  const dayPath = `/organizar/${group.id}/dia-de-jogo/${game.id}`;

  const fail = (e: unknown) =>
    toast(isApiError(e) ? messageFor(e.code) : 'Não deu certo. Tente de novo.', { tone: 'error' });
  const runAction = (a: 'close' | 'reopen', ok: string, undo: 'close' | 'reopen') =>
    action.mutate(a, {
      onSuccess: () =>
        toast(ok, { action: { label: 'Desfazer', onAction: () => action.mutate(undo, { onError: fail }) } }),
      onError: fail,
    });

  const remindAll = () =>
    remind.mutate(undefined, {
      onSuccess: ({ reminderId, sent }) =>
        toast(`${sent} ${sent === 1 ? 'pessoa lembrada' : 'pessoas lembradas'}.`, {
          tone: 'success',
          action: { label: 'Desfazer', onAction: () => undoReminder.mutate(reminderId) },
        }),
      onError: fail,
    });

  const row = (p: Participation, label?: string) => {
    const pay = p.payment;
    // em "Falta pagar", o selo já diz o que falta (o valor, ou Conferir quando mandou o Pix)
    const meta =
      p.status === 'waitlisted'
        ? `${MEMBERSHIP_LABEL[p.membershipType]}${p.respondedAt ? ` · entrou ${formatWhen(p.respondedAt)}` : ''}`
        : MEMBERSHIP_LABEL[p.membershipType];
    const badge =
      p.status === 'awaiting_payment' ? (
        pay?.status === 'reported' ? (
          <Badge tone="warning">Conferir</Badge>
        ) : (
          <Badge tone="warning">{formatMoneyShort(pay?.amountCents ?? game.dropInFeeCents ?? 0)}</Badge>
        )
      ) : null;
    return (
      <ListItem
        key={p.id}
        inline
        leading={<Avatar name={p.user.name} id={p.user.id} src={p.user.photoUrl} decorative />}
        title={label ? `${label} ${first(p.user.name)}` : first(p.user.name)}
        meta={meta}
        trailing={badge ?? undefined}
        actions={
          <NavIconButton
            label={`Opções para ${first(p.user.name)}`}
            icon={<MoreHorizontal size={22} aria-hidden="true" />}
            onClick={() => setOptions(p)}
          />
        }
      />
    );
  };

  return (
    <>
      <Card padding="md" className={styles.gameCard}>
        <div className={styles.gameTop}>
          <DateTile weekday={formatWeekdayShort(game.startsAt)} day={String(Number(formatDayOfMonth(game.startsAt)))} />
          <span className={styles.gameText}>
            <span className={styles.gameTitle}>{formatDayTime(game.startsAt, { capital: true })}</span>
            <span className={styles.muted}>
              {taken} de {c.capacity} vão{c.waitlisted ? ` · ${c.waitlisted} na fila` : ''}
            </span>
            <span className={styles.muted}>
              {opensLater
                ? `A lista abre ${formatWhen(game.listOpensAt ?? '')}`
                : game.status === 'closed'
                  ? 'Lista fechada'
                  : `Prazo da lista: ${formatWhen(game.responseDeadline ?? game.startsAt)}`}
            </span>
          </span>
        </div>
        <ProgressBar
          value={taken}
          max={c.capacity}
          label={`${taken} de ${c.capacity} vagas`}
          className={styles.meter}
        />
        {game.status === 'in_progress' ? (
          <Button block onClick={() => navigate(dayPath)}>
            Continuar o dia de jogo
          </Button>
        ) : (
          <div className={styles.pair}>
            {game.status === 'closed' ? (
              <Button
                variant="secondary"
                loading={action.isPending}
                onClick={() => runAction('reopen', 'Lista reaberta.', 'close')}
              >
                Reabrir lista
              </Button>
            ) : (
              <Button
                variant="secondary"
                loading={action.isPending}
                onClick={() => runAction('close', 'Lista fechada.', 'reopen')}
              >
                Fechar lista
              </Button>
            )}
            <Button onClick={() => navigate(dayPath)}>Iniciar jogo</Button>
          </div>
        )}
      </Card>

      <SegmentedControl<Filter>
        label="Quem"
        options={[
          { value: 'pendentes', label: `Pendentes ${pendingCount}` },
          { value: 'fila', label: `Fila ${queue.length}` },
          { value: 'confirmados', label: `Confirmados ${confirmed.length}` },
        ]}
        value={filter}
        onChange={setFilter}
        panelIdBase="presenca"
      />

      <div id={`presenca-${filter}`} role="tabpanel" className={styles.panel}>
        {parts.isPending ? (
          <SkeletonList rows={4} />
        ) : filter === 'pendentes' ? (
          pendingCount === 0 ? (
            <p className={styles.muted}>Nada pendente: todo mundo respondeu e quem vai já pagou.</p>
          ) : (
            <>
              {silent.length > 0 && (
                <Section title={`Sem resposta · ${silent.length}`}>
                  <List label="Sem resposta">{silent.map((p) => row(p))}</List>
                  <Button variant="tint" block loading={remind.isPending} onClick={remindAll}>
                    Lembrar {silent.length === 1 ? first(silent[0]?.user.name ?? '') : `os ${silent.length}`}
                  </Button>
                </Section>
              )}
              {unpaid.length > 0 && (
                <Section
                  title={`Falta pagar · ${unpaid.length}`}
                  footnote="Já têm a vaga. Quem mandou o Pix aparece com Conferir."
                >
                  <List label="Falta pagar">{unpaid.map((p) => row(p))}</List>
                </Section>
              )}
            </>
          )
        ) : filter === 'fila' ? (
          <Section footnote="Quem desistir é trocado automaticamente pelo 1º da fila. Mensalista vem antes de avulso.">
            {queue.length ? (
              <List label="Fila">{queue.map((p) => row(p, `${p.waitlistPosition}º`))}</List>
            ) : (
              <p className={styles.muted}>Ninguém na fila.</p>
            )}
          </Section>
        ) : confirmed.length ? (
          <Section footnote="Vão e já está tudo certo: mensalistas e avulsos que pagaram.">
            <List label="Confirmados">{confirmed.map((p) => row(p))}</List>
          </Section>
        ) : (
          <p className={styles.muted}>Ninguém confirmado e pago ainda.</p>
        )}
      </div>

      {options && (
        <ParticipantSheet
          p={options}
          game={game}
          // quem entra se a pessoa sair: o 1º da fila, quando a troca é automática (RN-31)
          nextInLine={group.rules?.waitlistAutoPromote !== false ? (queue[0] ?? null) : null}
          onClose={() => setOptions(null)}
        />
      )}
    </>
  );
}

/** ⋯ de cada pessoa: as ações que fazem sentido para a situação dela. */
function ParticipantSheet({
  p,
  game,
  nextInLine,
  onClose,
}: {
  p: Participation;
  game: MatchSummary;
  nextInLine: Participation | null;
  onClose: () => void;
}) {
  const remove = useRemoveParticipation(game.id);
  const promote = usePromote(game.id);
  const add = useAddParticipation(game.id);
  const receive = useReceivePayment();
  const remind = useRemind(game.id);
  const approve = useApprovePayment();
  const reject = useRejectPayment();
  const undoReview = useUndoPaymentReview();
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const name = first(p.user.name);
  const done = (msg: string, undo?: () => void) => {
    toast(msg, { tone: 'success', ...(undo && { action: { label: 'Desfazer', onAction: undo } }) });
    onClose();
  };
  const fail = (e: unknown) =>
    toast(isApiError(e) ? messageFor(e.code) : 'Não deu certo. Tente de novo.', { tone: 'error' });
  const unpaid = p.status === 'awaiting_payment' && p.payment && p.payment.status !== 'paid';

  return (
    <Sheet open onClose={onClose} title={name} closeLabel="Fechar">
      <div className={styles.who}>
        <Avatar name={p.user.name} id={p.user.id} src={p.user.photoUrl} size="lg" />
        <div>
          <p className={styles.gameTitle}>{p.user.name}</p>
          <p className={styles.muted}>{MEMBERSHIP_LABEL[p.membershipType]}</p>
        </div>
      </div>
      {/* Conferir o Pix aqui mesmo, sem ir para A resolver */}
      {unpaid && p.payment?.status === 'reported' && (
        <Card padding="md" className={styles.review}>
          <div className={styles.reviewTop}>
            <span>
              <span className={styles.gameTitle}>Mandou o Pix de {formatMoneyShort(p.payment.amountCents)}</span>
              <span className={styles.muted}>
                {p.payment.reportedAt ? `${formatWhen(p.payment.reportedAt)} · ` : ''}Confira no extrato do banco antes
                de aprovar.
              </span>
            </span>
          </div>
          {p.payment.reportNote && (
            <p className={styles.note}>
              <Receipt size={16} aria-hidden="true" /> {p.payment.reportNote}
            </p>
          )}
          <div className={styles.pair}>
            <Button variant="secondary" onClick={() => setRejecting(true)}>
              Recusar
            </Button>
            <Button
              loading={approve.isPending}
              onClick={() => {
                const id = p.payment?.id;
                if (!id) return;
                approve.mutate(
                  { paymentId: id },
                  {
                    onSuccess: () =>
                      done(`Pix de ${name} aprovado · entrou no caixa.`, () =>
                        undoReview.mutate(id, { onError: fail }),
                      ),
                    onError: fail,
                  },
                );
              }}
            >
              Aprovar
            </Button>
          </div>
        </Card>
      )}
      {rejecting && p.payment && (
        <RejectSheet
          open
          who={name}
          loading={reject.isPending}
          onClose={() => setRejecting(false)}
          onConfirm={(reason) => {
            const id = p.payment?.id;
            if (!id) return;
            reject.mutate(
              { paymentId: id, reason },
              {
                onSuccess: () => {
                  setRejecting(false);
                  done(`Pix de ${name} recusado · ${name} foi avisado.`, () =>
                    undoReview.mutate(id, { onError: fail }),
                  );
                },
                onError: fail,
              },
            );
          }}
        />
      )}
      <List>
        {p.status === 'pending' && (
          <>
            <ListItem
              title="Confirmar presença"
              meta="Ele avisou por fora que vai"
              onClick={() => add.mutate(p.user.id, { onSuccess: () => done(`${name} vai.`), onError: fail })}
            />
            <ListItem
              title="Lembrar"
              meta="Manda um aviso para responder"
              onClick={() => remind.mutate([p.user.id], { onSuccess: () => done(`${name} lembrado.`), onError: fail })}
            />
          </>
        )}
        {p.status === 'waitlisted' && game.counts.freeSpots > 0 && (
          <ListItem
            title="Subir para a lista"
            meta="Usa a vaga livre"
            onClick={() => promote.mutate(p.id, { onSuccess: () => done(`${name} subiu da fila.`), onError: fail })}
          />
        )}
        {unpaid && p.payment?.status !== 'reported' && p.payment && (
          <ListItem
            title="Recebi em mãos"
            meta={`Marca ${formatMoneyShort(p.payment.amountCents)} como pago`}
            onClick={() =>
              p.payment &&
              receive.mutate(p.payment.id, { onSuccess: () => done('Pagamento registrado no caixa.'), onError: fail })
            }
          />
        )}
        {(p.status === 'confirmed' ||
          p.status === 'awaiting_payment' ||
          p.status === 'waitlisted' ||
          p.status === 'pending') && (
          <ListItem tone="danger" title="Tirar da lista" onClick={() => setConfirmRemove(true)} />
        )}
      </List>
      {confirmRemove && (
        <RemoveSheet
          p={p}
          game={game}
          nextInLine={nextInLine}
          loading={remove.isPending}
          onClose={() => setConfirmRemove(false)}
          onConfirm={() =>
            remove.mutate(p.id, {
              onSuccess: () => {
                setConfirmRemove(false);
                done(`${name} saiu da lista.`);
              },
              onError: fail,
            })
          }
        />
      )}
    </Sheet>
  );
}

/** Confirmação de "Tirar da lista": diz o que acontece com a vaga antes de tirar (RN-28, RN-31). */
function RemoveSheet({
  p,
  game,
  nextInLine,
  loading,
  onClose,
  onConfirm,
}: {
  p: Participation;
  game: MatchSummary;
  nextInLine: Participation | null;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const name = first(p.user.name);
  const day = formatDay(game.startsAt);
  const hasSpot = p.status === 'confirmed' || p.status === 'awaiting_payment';
  const lines = hasSpot
    ? [
        `${name} perde a vaga no jogo de ${day}.`,
        nextInLine
          ? `${first(nextInLine.user.name)}, 1º da fila, entra no lugar.`
          : 'A vaga fica livre para outra pessoa.',
        ...(p.payment?.status === 'paid'
          ? [
              `O pagamento de ${formatMoneyShort(p.payment.amountCents)} continua no caixa para você decidir se devolve.`,
            ]
          : []),
      ]
    : p.status === 'waitlisted'
      ? [`${name} sai da fila do jogo de ${day}.`]
      : [`${name} deixa de ser esperado no jogo de ${day}.`];
  return (
    <ConfirmSheet
      open
      onClose={onClose}
      title="Tirar da lista?"
      leading={<Avatar name={p.user.name} id={p.user.id} src={p.user.photoUrl} size="lg" />}
      subject={p.user.name}
      consequences={lines}
      actionLabel={`Tirar ${name} da lista`}
      loading={loading}
      onConfirm={onConfirm}
    />
  );
}
