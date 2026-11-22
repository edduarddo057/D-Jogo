import { Bell, Volleyball } from 'lucide-react';
import { useNavigate } from 'react-router';
import { EmptyState, ErrorState } from '@/components/EmptyState';
import { fromState, NavIconButton, PageTitle } from '@/components/NavBar';
import { Section } from '@/components/Section';
import { useSheetParam } from '@/components/Sheet';
import { Skeleton } from '@/components/Skeleton';
import { GameCard } from '@/features/attendance';
import { useMyMatches } from '@/features/matches';
import { useNotifications } from '@/features/notifications';
import { useMyStats } from '@/features/profile';
import { InstallBanner } from '../shared/InstallApp';
import { HonorBoard } from './HonorBoard';

const FROM = { to: '/', label: 'Jogos' };

/**
 * Jogos (manual 3.2): só os jogos da pessoa, sem nada de organizador. Em cima, o mural de honra de
 * quem já jogou (quem ainda não jogou começa direto pelo próximo jogo); depois Próximo em destaque e
 * Depois. Cada card traz a próxima ação no próprio card.
 */
export function GamesPage() {
  const navigate = useNavigate();
  const upcoming = useMyMatches('upcoming');
  const stats = useMyStats();
  const notifications = useNotifications();
  const pay = useSheetParam('pagar');
  const unread = notifications.data?.unread ?? 0;
  const [next, ...later] = upcoming.data?.items ?? [];
  const played = (stats.data?.matches ?? 0) > 0;

  return (
    <>
      <PageTitle
        title="Jogos"
        actions={
          <NavIconButton
            label={unread > 0 ? `Avisos, ${unread} ${unread === 1 ? 'novo' : 'novos'}` : 'Avisos'}
            icon={<Bell size={24} aria-hidden="true" />}
            dot={unread > 0}
            onClick={() => navigate('/avisos', { state: fromState(FROM.to, FROM.label) })}
          />
        }
      />
      {stats.data && played && (
        <HonorBoard
          matches={stats.data.matches}
          attendanceRate={stats.data.attendanceRate}
          highlights={stats.data.highlights}
        />
      )}
      <InstallBanner />

      {upcoming.isPending ? (
        <Skeleton shape="card" height="20rem" />
      ) : upcoming.isError ? (
        <ErrorState onRetry={() => void upcoming.refetch()} retrying={upcoming.isFetching} />
      ) : !next ? (
        <EmptyState
          icon={Volleyball}
          title="Nenhum jogo por enquanto"
          description="Quando a sua turma marcar um jogo, ele aparece aqui. Para entrar numa turma, use o convite que recebeu."
        />
      ) : (
        <>
          <Section title="Próximo">
            <GameCard game={next} highlight onPay={(id) => pay.open({ jogo: id })} from={FROM} />
          </Section>
          {later.length > 0 && (
            <Section title="Depois">
              {later.map((g) => (
                <GameCard key={g.id} game={g} onPay={(id) => pay.open({ jogo: id })} from={FROM} />
              ))}
            </Section>
          )}
        </>
      )}
    </>
  );
}
