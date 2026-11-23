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
    // O último quadro da abertura animada (public/splash.css), parado: fica por baixo dela, então a troca
    // não pisca nem reinicia a animação
    <div className="splash splash-static" role="status" aria-label="Abrindo o Dá Jogo">
      <div className="splash-mark">
        <img className="splash-logo" src="/brand/symbol.png" alt="" width="914" height="656" />
      </div>
      <p className="splash-word" aria-hidden="true">
        Dá <span>Jogo</span>
      </p>
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
