import { CalendarDays, House, UserRound, UsersRound } from 'lucide-react';
import { Outlet } from 'react-router';
import { Navigation, type NavigationItem } from '@/components/Navigation';
import styles from './AppShell.module.css';
import { BrandLogo } from './BrandLogo';
import { OfflineBanner } from './OfflineBanner';
import { RouteAnnouncer } from './RouteAnnouncer';
import { SkipLink } from './SkipLink';

const NAV_ITEMS: NavigationItem[] = [
  { to: '/', label: 'Início', icon: House, end: true },
  { to: '/turmas', label: 'Turmas', icon: UsersRound },
  { to: '/partidas', label: 'Partidas', icon: CalendarDays },
  { to: '/perfil', label: 'Perfil', icon: UserRound },
];

/**
 * Casca do app autenticado (etapa 8): navegação inferior até 1023px e lateral a partir de 1024px,
 * área segura do iPhone, aviso de conexão, foco e título a cada troca de rota.
 */
export function AppShell() {
  return (
    <div className={styles.shell}>
      <SkipLink />
      <Navigation items={NAV_ITEMS} brand={<BrandLogo />} />
      <div className={styles.column}>
        <OfflineBanner />
        <main className={styles.content} id="conteudo" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
      <RouteAnnouncer />
    </div>
  );
}
