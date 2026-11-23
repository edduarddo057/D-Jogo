import { Copy, ExternalLink } from 'lucide-react';
import { Button } from '@/components/Button';
import { isAndroid, openInBrowserUrl } from '@/lib/inAppBrowser';
import { toast, useSessionStore } from '@/stores';
import styles from './InAppBrowserNotice.module.css';

/** Endereço para continuar fora do app de mensagens, levando o convite junto. */
function continueUrl(invite: string | null) {
  const base = `${window.location.origin}${import.meta.env.BASE_URL}`;
  return invite ? `${base}?convite=${encodeURIComponent(invite)}` : base;
}

/**
 * Aberto dentro do WhatsApp/Instagram: o Google não deixa entrar por ali. No Android, um toque
 * abre no Chrome; no iPhone, o app de mensagens não deixa abrir sozinho, então copiamos o link
 * e explicamos onde tocar.
 */
export function InAppBrowserNotice() {
  const invite = useSessionStore((s) => s.pendingInviteCode);
  const url = continueUrl(invite);
  const android = isAndroid();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast('Link copiado. Cole no Safari ou no Chrome.', { tone: 'success' });
    } catch {
      toast(url);
    }
  };

  return (
    <div className={styles.notice} role="note">
      <p className={styles.title}>Abra no navegador para entrar</p>
      <p className={styles.text}>
        {android
          ? 'O Google não deixa entrar por dentro deste app. Toque abaixo para continuar no Chrome.'
          : 'O Google não deixa entrar por dentro deste app. Toque em ⋯ ou no ícone de compartilhar e escolha “Abrir no navegador”, ou copie o link e cole no Safari.'}
        {invite && ' O convite vai junto.'}
      </p>
      {android ? (
        <Button
          block
          icon={<ExternalLink size={18} aria-hidden="true" />}
          onClick={() => window.location.assign(openInBrowserUrl(url))}
        >
          Abrir no navegador
        </Button>
      ) : (
        <Button block variant="secondary" icon={<Copy size={18} aria-hidden="true" />} onClick={() => void copy()}>
          Copiar link
        </Button>
      )}
    </div>
  );
}
