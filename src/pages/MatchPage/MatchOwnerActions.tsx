import { Ban, Flag, Lock, LockOpen, Pencil, Play, Send, Shuffle, Ticket, UsersRound } from 'lucide-react';
import { useState } from 'react';
import { Button, ButtonLink } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { TextField } from '@/components/TextField';
import { InviteCard, useCreateInvite, type Invite } from '@/features/invites';
import { useCancelMatch, useMatchAction, type Match, type MatchAction } from '@/features/matches';
import { isApiError, messageFor } from '@/lib/http';
import { toast } from '@/stores';
import styles from './MatchPage.module.css';

const DONE: Record<MatchAction, string> = {
  publish: 'Partida publicada. Os mensalistas já podem responder.',
  close: 'Lista fechada.',
  reopen: 'Lista reaberta.',
  start: 'Partida iniciada. Bom jogo!',
  finish: 'Partida finalizada.',
};

/** Ações do dono conforme o estado da partida (RN-20, RN-40 a RN-43). */
export function MatchOwnerActions({ match }: { match: Match }) {
  const action = useMatchAction(match.id);
  const cancel = useCancelMatch(match.id);
  const createInvite = useCreateInvite(match.group.id);
  const [canceling, setCanceling] = useState(false);
  const [reason, setReason] = useState('');
  const [invite, setInvite] = useState<Invite | null>(null);
  const base = `/partidas/${match.id}`;

  const run = (a: MatchAction) =>
    action.mutate(a, {
      onSuccess: () => toast(DONE[a], { tone: 'success' }),
      onError: (e) => toast(isApiError(e) ? messageFor(e.code) : 'Não deu para fazer isso.', { tone: 'error' }),
    });
  const loading = (a: MatchAction) => action.isPending && action.variables === a;

  const inviteDropIn = () =>
    createInvite.mutate({ membershipType: 'drop_in', matchId: match.id }, { onSuccess: setInvite });

  const s = match.status;
  const toReview = match.counts.paymentsToReview ?? 0;

  return (
    <section className={styles.owner} aria-labelledby="organizar">
      <h2 id="organizar" className={styles.sectionTitle}>
        Organizar
      </h2>

      {toReview > 0 && (
        <p className={styles.alert} role="status">
          {toReview} {toReview === 1 ? 'pagamento aguarda' : 'pagamentos aguardam'} sua validação.
        </p>
      )}

      <div className={styles.ownerGrid}>
        {s === 'draft' && (
          <Button
            icon={<Send size={20} aria-hidden="true" />}
            loading={loading('publish')}
            onClick={() => run('publish')}
          >
            Publicar
          </Button>
        )}
        {s === 'open' && (
          <Button icon={<Lock size={20} aria-hidden="true" />} loading={loading('close')} onClick={() => run('close')}>
            Fechar lista
          </Button>
        )}
        {s === 'closed' && (
          <ButtonLink to={`${base}/sorteio`} icon={<Shuffle size={20} aria-hidden="true" />}>
            Sortear times
          </ButtonLink>
        )}
        {(s === 'closed' || s === 'teams_published') && (
          <Button
            variant={s === 'teams_published' ? 'primary' : 'outline'}
            icon={<Play size={20} aria-hidden="true" />}
            loading={loading('start')}
            onClick={() => run('start')}
          >
            Iniciar partida
          </Button>
        )}
        {s === 'in_progress' && (
          <Button
            icon={<Flag size={20} aria-hidden="true" />}
            loading={loading('finish')}
            onClick={() => run('finish')}
          >
            Finalizar partida
          </Button>
        )}
        {(s === 'open' || s === 'closed') && (
          <ButtonLink to={`${base}/presencas`} variant="outline" icon={<UsersRound size={20} aria-hidden="true" />}>
            Presenças
          </ButtonLink>
        )}
        {s === 'open' && (
          <Button
            variant="outline"
            icon={<Ticket size={20} aria-hidden="true" />}
            loading={createInvite.isPending}
            onClick={inviteDropIn}
          >
            Convidar avulso
          </Button>
        )}
        {s === 'closed' && (
          <Button
            variant="outline"
            icon={<LockOpen size={20} aria-hidden="true" />}
            loading={loading('reopen')}
            onClick={() => run('reopen')}
          >
            Reabrir lista
          </Button>
        )}
        {(s === 'draft' || s === 'open' || s === 'closed') && (
          <ButtonLink to={`${base}/editar`} variant="outline" icon={<Pencil size={20} aria-hidden="true" />}>
            Editar
          </ButtonLink>
        )}
        {(s === 'draft' || s === 'open' || s === 'closed' || s === 'teams_published') && (
          <Button
            variant="ghost"
            icon={<Ban size={20} aria-hidden="true" />}
            onClick={() => setCanceling(true)}
            className={styles.cancel}
          >
            Cancelar partida
          </Button>
        )}
      </div>

      <Modal
        open={canceling}
        onClose={() => setCanceling(false)}
        title="Cancelar partida?"
        description="Todos da lista ficam sabendo. Cobranças em aberto desta partida são canceladas."
        actions={
          <>
            <Button variant="outline" onClick={() => setCanceling(false)}>
              Voltar
            </Button>
            <Button
              variant="danger"
              disabled={reason.trim().length < 3}
              loading={cancel.isPending}
              onClick={() =>
                cancel.mutate(reason.trim(), {
                  onSuccess: () => {
                    toast('Partida cancelada.', { tone: 'success' });
                    setCanceling(false);
                  },
                })
              }
            >
              Cancelar partida
            </Button>
          </>
        }
      >
        <TextField
          label="Motivo"
          placeholder="Ex.: chuva, quadra interditada"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={200}
        />
      </Modal>

      <Modal
        open={invite !== null}
        onClose={() => setInvite(null)}
        title="Convite para esta partida"
        description="Quem entrar por este link vira avulso da turma e já entra na partida (ou na fila, se estiver lotada)."
      >
        {invite && <InviteCard invite={invite} groupName={match.group.name} />}
      </Modal>
    </section>
  );
}
