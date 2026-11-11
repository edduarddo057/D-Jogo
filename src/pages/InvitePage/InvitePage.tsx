import { CalendarDays, Link2Off, MapPin, Users } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { Badge } from '@/components/Badge';
import { Button, ButtonLink } from '@/components/Button';
import { EmptyState, ErrorState } from '@/components/EmptyState';
import { Skeleton } from '@/components/Skeleton';
import { useAcceptInvite, useInvitePreview } from '@/features/invites';
import { useMe } from '@/features/profile';
import { formatCents, formatMatchLong } from '@/lib/format';
import { isApiError, messageFor } from '@/lib/http';
import { toast, useSessionStore } from '@/stores';
import styles from './InvitePage.module.css';

const INVALID: Record<string, string> = {
  revoked: 'Quem organiza desativou este link.',
  expired: 'Este link expirou.',
  exhausted: 'Este link já foi usado o máximo de vezes.',
};

/**
 * /convite/:code — funciona logado ou não (RN-12).
 * Sem login: guarda o convite e vai para o login; volta com ?aceitar=1 e entra automaticamente.
 */
export function InvitePage() {
  const { code = '' } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const status = useSessionStore((s) => s.status);
  const preview = useInvitePreview(code);
  const me = useMe({ enabled: status === 'authenticated' });
  const accept = useAcceptInvite();
  const autoTried = useRef(false);

  const join = async () => {
    try {
      const result = await accept.mutateAsync(code);
      useSessionStore.getState().setPendingInvite(null);
      toast(result.alreadyMember ? 'Você já fazia parte desta turma.' : 'Você entrou na turma!', { tone: 'success' });
      navigate(`/turmas/${result.groupId}`, { replace: true });
    } catch (error) {
      toast(isApiError(error) ? messageFor(error.code) : 'Não deu para entrar na turma.', { tone: 'error' });
    }
  };

  const goLogin = () => {
    useSessionStore.getState().setPendingInvite(code);
    navigate(`/entrar?convite=${encodeURIComponent(code)}`);
  };

  const ready = status === 'authenticated' && me.data?.profileCompleted;

  // Voltou do login com ?aceitar=1: entra sem pedir outro toque.
  useEffect(() => {
    if (params.get('aceitar') === '1' && ready && preview.data?.valid && !autoTried.current) {
      autoTried.current = true;
      void join();
    }
    // join só depende do code, estável durante a página
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, ready, preview.data?.valid]);

  if (preview.isPending || status === 'unknown') {
    return (
      <div className={styles.page}>
        <Skeleton width="70%" height="3.2rem" />
        <Skeleton shape="card" height="24rem" />
      </div>
    );
  }

  if (preview.isError) {
    const notFound = isApiError(preview.error) && preview.error.status === 404;
    return notFound ? (
      <div className={styles.page}>
        <h1 className={styles.title}>Convite não encontrado</h1>
        <EmptyState
          icon={Link2Off}
          title="Esse link não existe"
          description="Confira se o link chegou inteiro ou peça um novo a quem organiza."
          action={<ButtonLink to="/">Ir para o Dá Jogo</ButtonLink>}
        />
      </div>
    ) : (
      <ErrorState onRetry={() => void preview.refetch()} retrying={preview.isRefetching} />
    );
  }

  const invite = preview.data;
  const type = invite.membershipType === 'monthly' ? 'mensalista' : 'avulso';

  if (!invite.valid) {
    return (
      <div className={styles.page}>
        <h1 className={styles.title}>Convite indisponível</h1>
        <EmptyState
          icon={Link2Off}
          title={invite.group.name}
          description={`${INVALID[invite.invalidReason ?? ''] ?? messageFor('INVITE_INVALID')} Peça um novo link a ${invite.invitedBy}.`}
        />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>{invite.invitedBy} te chamou para jogar</p>
        <h1 className={styles.title}>{invite.group.name}</h1>
        <Badge tone="info">Entrar como {type}</Badge>
      </header>

      <dl className={styles.facts}>
        <div className={styles.fact}>
          <dt>
            <MapPin size={18} aria-hidden="true" />
            <span className="visually-hidden">Local</span>
          </dt>
          <dd>
            {invite.group.location.name}
            {invite.group.location.address && <span className={styles.muted}>{invite.group.location.address}</span>}
          </dd>
        </div>
        <div className={styles.fact}>
          <dt>
            <Users size={18} aria-hidden="true" />
            <span className="visually-hidden">Jogadores</span>
          </dt>
          <dd>
            {invite.group.memberCount} {invite.group.memberCount === 1 ? 'jogador' : 'jogadores'} na turma
          </dd>
        </div>
        {invite.match && (
          <div className={styles.fact}>
            <dt>
              <CalendarDays size={18} aria-hidden="true" />
              <span className="visually-hidden">Próxima partida</span>
            </dt>
            <dd>
              {invite.match.title} · {formatMatchLong(invite.match.startsAt)}
              <span className={styles.muted}>
                {invite.match.freeSpots > 0
                  ? `${invite.match.freeSpots} ${invite.match.freeSpots === 1 ? 'vaga livre' : 'vagas livres'}`
                  : 'Lotada: você entra na lista de espera'}
                {invite.membershipType === 'drop_in' && ` · ${formatCents(invite.match.dropInFeeCents)} por partida`}
              </span>
            </dd>
          </div>
        )}
      </dl>

      <p className={styles.explain}>
        {invite.membershipType === 'monthly'
          ? 'Como mensalista você tem vaga garantida e só precisa confirmar presença em cada partida.'
          : 'Como avulso você entra quando houver vaga e paga por partida, pelo Pix da turma.'}
      </p>

      {status === 'authenticated' ? (
        me.data && !me.data.profileCompleted ? (
          <Button
            block
            onClick={() => {
              useSessionStore.getState().setPendingInvite(code);
              navigate('/cadastro');
            }}
          >
            Completar perfil e entrar
          </Button>
        ) : (
          <Button block loading={accept.isPending || me.isPending} onClick={() => void join()}>
            Entrar na turma
          </Button>
        )
      ) : (
        <>
          <Button block onClick={goLogin}>
            Entrar e participar
          </Button>
          <p className={styles.muted}>Leva menos de um minuto: só o celular e um código.</p>
        </>
      )}
    </div>
  );
}
