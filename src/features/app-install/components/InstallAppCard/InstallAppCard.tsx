import { Share, SquarePlus } from 'lucide-react';
import { useState } from 'react';
import { usePwaStore } from '@/stores';
import styles from './InstallAppCard.module.css';

/**
 * Oferece a instalação do app (architecture.md § 12):
 * Android/desktop pelo convite nativo; iPhone com os passos do Safari; já instalado, só confirma.
 */
export function InstallAppCard() {
  const { isStandalone, platform, deferredPrompt, setDeferredPrompt, setInstalled } = usePwaStore();
  const [installing, setInstalling] = useState(false);

  async function install() {
    if (!deferredPrompt) return;
    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setInstalled();
      setDeferredPrompt(null); // o evento só pode ser usado uma vez
    } finally {
      setInstalling(false);
    }
  }

  return (
    <section className={styles.card} aria-labelledby="instalar-titulo">
      <h2 id="instalar-titulo" className={styles.title}>
        Instalar o app
      </h2>

      {isStandalone && <p className={styles.text}>Você já está usando o Dá Jogo instalado. Tudo certo!</p>}

      {!isStandalone && platform === 'prompt' && (
        <>
          <p className={styles.text}>Coloque o Dá Jogo na tela inicial e abra direto, como um app.</p>
          <button
            type="button"
            className={styles.button}
            onClick={install}
            disabled={installing}
            aria-busy={installing}
          >
            {installing ? 'Instalando…' : 'Instalar app'}
          </button>
        </>
      )}

      {!isStandalone && platform === 'ios' && (
        <>
          <p className={styles.text}>No iPhone, a instalação é pelo Safari:</p>
          <ol className={styles.steps}>
            <li>
              Toque em <Share className={styles.inlineIcon} size={18} aria-hidden="true" />{' '}
              <strong>Compartilhar</strong>, na barra do Safari.
            </li>
            <li>
              Escolha <SquarePlus className={styles.inlineIcon} size={18} aria-hidden="true" />{' '}
              <strong>Adicionar à Tela de Início</strong>.
            </li>
            <li>
              Confirme em <strong>Adicionar</strong>.
            </li>
          </ol>
        </>
      )}

      {!isStandalone && platform === 'unsupported' && (
        <p className={styles.text}>
          Para instalar, abra o Dá Jogo no Chrome (Android ou computador) ou no Safari (iPhone).
        </p>
      )}
    </section>
  );
}
