import { CircleUserRound, ClipboardCheck, UsersRound, Volleyball } from 'lucide-react';
import { Outlet } from 'react-router';
import { Navigation, type NavigationItem } from '@/components/Navigation';
import { useSheetParam } from '@/components/Sheet';
import { useOrganizes } from '@/features/groups';
import { PaySheet } from '@/features/payments';
import styles from './AppShell.module.css';
import { BrandLogo } from '@/components/BrandLogo';
import { OfflineBanner } from './OfflineBanner';
import { RouteAnnouncer } from './RouteAnnouncer';
import { SkipLink } from './SkipLink';

/**
 * Casca do app (manual 2): Jogos, Turmas, Organizar (só para quem é dono de alguma turma, com o
 * número de pendências) e Você. Barra inferior até 1023px e lateral a partir de 1024px.
 * A folha de Pix fica aqui: abre por cima de Jogos, Avisos ou Você e o Voltar volta para a origem.
 */
export function AppShell() {
  const { organizes, pendings } = useOrganizes();
  const items: NavigationItem[] = [
    { to: '/', label: 'Jogos', icon: Volleyball, end: true },
    { to: '/turmas', label: 'Turmas', icon: UsersRound },
    ...(organizes ? [{ to: '/organizar', label: 'Organizar', icon: ClipboardCheck, badge: pendings }] : []),
    { to: '/voce', label: 'Perfil', icon: CircleUserRound },
  ];
  const pay = useSheetParam('pagar');

  return (
    <div className={styles.shell}>
      <SkipLink />
      <Navigation items={items} brand={<BrandLogo />} label="Abas" />
      <div className={styles.column}>
        <OfflineBanner />
        <main className={styles.content} id="conteudo" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
      <PaySheet
        open={pay.isOpen}
        onClose={() => pay.close(['jogo', 'pagamento'])}
        matchId={pay.param('jogo')}
        paymentId={pay.param('pagamento')}
      />
      <RouteAnnouncer />
    </div>
  );
}
