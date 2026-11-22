import styles from './SkipLink.module.css';

/** Primeiro item da tabulação: pula a navegação e vai direto ao conteúdo. */
export function SkipLink() {
  return (
    <a className={styles.skip} href="#conteudo">
      Pular para o conteúdo
    </a>
  );
}
