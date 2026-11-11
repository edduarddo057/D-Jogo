import { Outlet } from 'react-router';
import styles from './FlowLayout.module.css';
import { OfflineBanner } from './OfflineBanner';
import { RouteAnnouncer } from './RouteAnnouncer';

/**
 * Telas de fluxo (login, cadastro, criar partida, regras): sem a navegação principal,
 * uma coluna estreita e o "voltar" no PageHeader de cada página.
 */
export function FlowLayout() {
  return (
    <>
      <OfflineBanner />
      <main className={styles.flow} id="conteudo" tabIndex={-1}>
        <Outlet />
      </main>
      <RouteAnnouncer />
    </>
  );
}

/** Páginas públicas (convite, 404): mesma coluna, sem exigir sessão. */
export function PublicLayout() {
  return (
    <>
      <main className={styles.flow} id="conteudo" tabIndex={-1}>
        <Outlet />
      </main>
      <RouteAnnouncer />
    </>
  );
}
