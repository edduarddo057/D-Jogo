import { Check, Download, EllipsisVertical, PlusSquare, Share, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/Button';
import { ListItem } from '@/components/List';
import { Sheet } from '@/components/Sheet';
import { toast, usePwaStore } from '@/stores';
import styles from './InstallApp.module.css';

const DISMISS_KEY = 'dajogo:instalar-dispensado';
const DISMISS_FOR = 30 * 86_400_000;

const isPhone = () => typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;

/**
 * Dá para oferecer a instalação? Não, se já está aberto como app. Sim, com o botão do sistema
 * (Chrome/Android), com o passo a passo (iPhone) ou, em outro navegador de celular, pelo menu.
 */
function useInstallOffer() {
  const isStandalone = usePwaStore((s) => s.isStandalone);
  const platform = usePwaStore((s) => s.platform);
  const show = !isStandalone && (platform === 'prompt' || platform === 'ios' || isPhone());
  return { show, platform };
}

/** Linha "Instalar o app" (Perfil): fica enquanto não estiver instalado. */
export function InstallRow() {
  const { show } = useInstallOffer();
  const [open, setOpen] = useState(false);
  if (!show) return null;
  return (
    <>
      <ListItem
        leading={<Download size={22} aria-hidden="true" />}
        title="Instalar o app"
        meta="Abre direto da tela inicial, sem o navegador"
        onClick={() => setOpen(true)}
      />
      <InstallSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}

/** Card discreto em Jogos, com ×: dispensado, volta só depois de 30 dias. */
export function InstallBanner() {
  const { show } = useInstallOffer();
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    const at = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
    return Date.now() - at < DISMISS_FOR;
  });
  if (!show || dismissed) return null;
  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setDismissed(true);
  };
  return (
    <aside className={styles.banner} aria-label="Instalar o app">
      <span className={styles.text}>
        <span className={styles.title}>Instale o Dá Jogo</span>
        <span className={styles.muted}>Abre como app, direto da tela inicial.</span>
      </span>
      <Button size="sm" onClick={() => setOpen(true)}>
        Instalar
      </Button>
      <button type="button" className={styles.close} aria-label="Agora não" onClick={dismiss}>
        <X size={18} aria-hidden="true" />
      </button>
      <InstallSheet open={open} onClose={() => setOpen(false)} />
    </aside>
  );
}

/** Como instalar neste aparelho. */
function InstallSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const platform = usePwaStore((s) => s.platform);
  const deferred = usePwaStore((s) => s.deferredPrompt);
  const [busy, setBusy] = useState(false);

  const install = async () => {
    if (!deferred) return;
    setBusy(true);
    try {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      // o convite do navegador só pode ser usado uma vez
      usePwaStore.getState().setDeferredPrompt(null);
      if (outcome === 'accepted') {
        toast('Pronto! O Dá Jogo está na sua tela inicial.', { tone: 'success' });
        onClose();
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Instalar o app" closeLabel="Fechar">
      <ul className={styles.perks}>
        <li>Abre direto da tela inicial, sem a barra do navegador.</li>
        <li>No dia de jogo, o placar funciona mesmo sem internet.</li>
      </ul>
      {platform === 'prompt' && deferred ? (
        <Button block loading={busy} icon={<Download size={20} aria-hidden="true" />} onClick={() => void install()}>
          Instalar
        </Button>
      ) : platform === 'ios' ? (
        <ol className={styles.steps}>
          <li>
            <span className={styles.stepIcon} aria-hidden="true">
              <Share size={20} />
            </span>
            <span>
              Toque em <b>Compartilhar</b>, na barra do Safari.
            </span>
          </li>
          <li>
            <span className={styles.stepIcon} aria-hidden="true">
              <PlusSquare size={20} />
            </span>
            <span>
              Escolha <b>Adicionar à Tela de Início</b>.
            </span>
          </li>
          <li>
            <span className={styles.stepIcon} aria-hidden="true">
              <Check size={20} />
            </span>
            <span>
              Toque em <b>Adicionar</b>, no canto de cima.
            </span>
          </li>
        </ol>
      ) : (
        <ol className={styles.steps}>
          <li>
            <span className={styles.stepIcon} aria-hidden="true">
              <EllipsisVertical size={20} />
            </span>
            <span>
              Abra o <b>menu do navegador</b>.
            </span>
          </li>
          <li>
            <span className={styles.stepIcon} aria-hidden="true">
              <Download size={20} />
            </span>
            <span>
              Toque em <b>Instalar app</b> ou <b>Adicionar à tela inicial</b>.
            </span>
          </li>
        </ol>
      )}
    </Sheet>
  );
}
