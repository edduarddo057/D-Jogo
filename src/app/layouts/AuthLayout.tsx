import { Outlet } from 'react-router';
import styles from './AuthLayout.module.css';
import { RouteAnnouncer } from './RouteAnnouncer';

/**
 * Login e código: fundo de marca (protótipo, tela 01). O conteúdo usa os tokens do tema escuro
 * localmente (data-theme="dark"), então campos e textos se ajustam ao fundo azul sem CSS especial.
 */
export function AuthLayout() {
  return (
    <div className={styles.screen} data-theme="dark">
      <span className={styles.ring} aria-hidden="true" />
      <main className={styles.main} id="conteudo" tabIndex={-1}>
        <div className={styles.brand}>
          <img
            src={`${import.meta.env.BASE_URL}brand/logo-on-dark.svg`}
            alt="Dá Jogo"
            width="180"
            height="60"
            className={styles.logo}
          />
          <p className={styles.tagline}>Junta a galera. Dá jogo.</p>
        </div>
        <div className={styles.content}>
          <Outlet />
        </div>
        <p className={styles.legal}>
          Ao entrar você aceita os <a href={`${import.meta.env.BASE_URL}termos`}>Termos de uso</a> e a{' '}
          <a href={`${import.meta.env.BASE_URL}privacidade`}>Política de privacidade</a>.
        </p>
      </main>
      <RouteAnnouncer />
    </div>
  );
}
