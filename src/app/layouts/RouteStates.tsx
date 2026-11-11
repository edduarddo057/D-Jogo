import { isRouteErrorResponse, Link, useRouteError } from 'react-router';
import { isApiError, messageFor } from '@/lib/http';
import styles from './RouteStates.module.css';

/** Carregando uma rota inteira (antes dos Skeletons por tela, que chegam com o design system). */
export function RouteLoading() {
  return (
    <div className={styles.loading} role="status" aria-live="polite">
      <span className={styles.spinner} aria-hidden="true" />
      <span className="visually-hidden">Carregando…</span>
    </div>
  );
}

/** Abertura do app enquanto a sessão é verificada e a primeira tela carrega. */
export function Splash() {
  return (
    // Igual à abertura estática do index.html (public/splash.css), para a troca não piscar
    <div id="splash" role="status" aria-label="Abrindo o Dá Jogo">
      <img src="/brand/logo-on-dark.svg" alt="" width="300" height="91" />
    </div>
  );
}

/** Rota inexistente (path "*"). Fica dentro do PublicLayout, que já tem o <main>. */
export function NotFound() {
  return (
    <div className={styles.error}>
      <h1 className={styles.errorTitle}>Página não encontrada</h1>
      <p className={styles.errorText}>O link pode estar errado ou a página não existe mais.</p>
      <Link className={styles.errorLink} to="/">
        Voltar para o início
      </Link>
    </div>
  );
}

/** errorElement das rotas: o app nunca fica em branco. */
export function RouteError() {
  const error = useRouteError();
  const notFound = (isRouteErrorResponse(error) && error.status === 404) || (isApiError(error) && error.status === 404);
  const message = isApiError(error) ? messageFor(error.code) : 'Algo deu errado ao abrir esta tela.';

  return (
    <main className={styles.error}>
      <h1 className={styles.errorTitle}>{notFound ? 'Página não encontrada' : 'Não deu para abrir'}</h1>
      <p className={styles.errorText}>{notFound ? 'O link pode estar errado ou a página não existe mais.' : message}</p>
      <Link className={styles.errorLink} to="/">
        Voltar para o início
      </Link>
    </main>
  );
}
