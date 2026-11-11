import styles from './BrandLogo.module.css';

/** Logotipo com a versão certa para cada tema (arquivos em public/brand). */
export function BrandLogo() {
  return (
    <span className={styles.logo} role="img" aria-label="Dá Jogo">
      <img className={styles.light} src="/brand/logo.svg" alt="" width="132" height="44" />
      <img className={styles.dark} src="/brand/logo-on-dark.svg" alt="" width="132" height="44" />
    </span>
  );
}
