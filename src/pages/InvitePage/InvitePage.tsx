import { CalendarDays, CircleDollarSign, MapPin } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Dock } from '@/components/Dock';
import { EmptyState } from '@/components/EmptyState';
import { List, ListItem } from '@/components/List';
import { SkeletonList } from '@/components/Skeleton';
import { useAcceptInvite, useInvitePreview } from '@/features/invites';
import { useSports } from '@/features/profile';
import { formatDay, formatMoneyShort, formatSchedule } from '@/lib/format';
import { isApiError, messageFor } from '@/lib/http';
import { toast, useSessionStore } from '@/stores';
import styles from './InvitePage.module.css';

/**
 * Convite (manual 3.1, tela 1): a pessoa vê a turma — dia, local, vagas e valores — antes de
 * pedir qualquer dado. "Entrar na turma" leva ao celular; logada, entra direto e cai em Jogos.
 */
export function InvitePage() {
  const { code = '' } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const status = useSessionStore((s) => s.status);
  const preview = useInvitePreview(code);
  const sports = useSports();
  const accept = useAcceptInvite();
  const autoAccepted = useRef(false);

  const join = () => {
    if (status !== 'authenticated') {
      useSessionStore.getState().setPendingInvite(code.toUpperCase());
      navigate('/entrar');
      return;
    }
    accept.mutate(code, {
      onSuccess: ({ alreadyMember }) => {
        useSessionStore.getState().setPendingInvite(null);
        toast(alreadyMember ? 'Você já está nesta turma.' : 'Pronto, você entrou na turma.', { tone: 'success' });
        navigate('/', { replace: true });
      },
      onError: (e) =>
        toast(isApiError(e) ? messageFor(e.code) : 'Não deu para entrar. Tente de novo.', { tone: 'error' }),
    });
  };

  // Voltou do login com o perfil pronto: aceita sozinho (?aceitar=1)
  useEffect(() => {
    if (params.get('aceitar') === '1' && status === 'authenticated' && preview.data?.valid && !autoAccepted.current) {
      autoAccepted.current = true;
      join();
    }
  });

  if (preview.isPending) return <SkeletonList rows={4} />;
  if (preview.isError || !preview.data)
    return (
      <EmptyState
        title="Convite não encontrado"
        description="O link pode estar errado. Peça um novo a quem organiza."
      />
    );

  const p = preview.data;
  if (!p.valid)
    return <EmptyState title="Este convite não vale mais" description="Peça um link novo a quem organiza a turma." />;

  const sport = sports.data?.find((s) => s.id === p.group.sportId)?.name ?? 'Vôlei';
  const inviter = p.invitedBy.split(' ')[0];
  const m = p.match;

  return (
    <>
      <div className={styles.hero}>
        <Avatar name={p.group.name} id={p.group.name} size="lg" />
        <p className={styles.muted}>{inviter} te convidou para</p>
        <h1 className={styles.title}>{p.group.name}</h1>
        <p className={styles.muted}>
          {sport} · {p.group.memberCount} membros
        </p>
      </div>
      <List label="Sobre a turma">
        <ListItem
          leading={<CalendarDays size={22} aria-hidden="true" />}
          title={p.group.schedules?.length ? formatSchedule(p.group.schedules) : 'Dia e horário a combinar'}
          meta={[p.group.location.name, p.group.location.address].filter(Boolean).join(' · ')}
        />
        {m && (
          <ListItem
            leading={<MapPin size={22} aria-hidden="true" />}
            title={`Próximo jogo: ${formatDay(m.startsAt)}`}
            meta={
              m.capacity
                ? `${m.capacity - m.freeSpots} de ${m.capacity} vagas preenchidas`
                : `${m.freeSpots} vagas livres`
            }
          />
        )}
        <ListItem
          leading={<CircleDollarSign size={22} aria-hidden="true" />}
          title={`${formatMoneyShort(p.group.dropInFeeCents ?? m?.dropInFeeCents ?? 0)} por jogo`}
          meta={
            p.group.monthlyFeeCents ? `ou ${formatMoneyShort(p.group.monthlyFeeCents)}/mês como mensalista` : undefined
          }
        />
      </List>
      <Dock note="Leva menos de 1 minuto. Só pedimos seu celular.">
        <Button block loading={accept.isPending} onClick={join}>
          Entrar na turma
        </Button>
      </Dock>
    </>
  );
}
