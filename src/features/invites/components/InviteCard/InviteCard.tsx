import { Copy, Link2Off, MessageCircle, QrCode, Share2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/Button';
import { toast } from '@/stores';
import type { Invite } from '../../api/invitesApi';
import { inviteMessage } from '../../utils/inviteMessage';
import { InviteQr } from '../InviteQr/InviteQr';
import styles from './InviteCard.module.css';

export interface InviteCardProps {
  invite: Invite;
  groupName: string;
  onRevoke?: () => void;
  revoking?: boolean;
}

const canShare = () => typeof navigator !== 'undefined' && typeof navigator.share === 'function';

/** Um link de convite com as formas de compartilhar (copiar, compartilhar, WhatsApp, QR Code). */
export function InviteCard({ invite, groupName, onRevoke, revoking }: InviteCardProps) {
  const [showQr, setShowQr] = useState(false);
  const message = inviteMessage(groupName, invite);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(invite.url);
      toast('Link copiado.', { tone: 'success' });
    } catch {
      toast('Não deu para copiar. Segure o link para copiar manualmente.', { tone: 'error' });
    }
  };

  const share = async () => {
    try {
      await navigator.share({ title: `Convite · ${groupName}`, text: message, url: invite.url });
    } catch {
      // a pessoa cancelou o compartilhamento
    }
  };

  const qrId = `qr-${invite.code}`;

  return (
    <article
      className={styles.card}
      aria-label={`Link para ${invite.membershipType === 'monthly' ? 'mensalista' : 'avulso'}`}
    >
      <div className={styles.linkRow}>
        <code className={styles.link}>{invite.url.replace(/^https?:\/\//, '')}</code>
        <span className={styles.uses}>
          {invite.uses === 0
            ? 'Ainda não usado'
            : `${invite.uses} ${invite.uses === 1 ? 'pessoa entrou' : 'pessoas entraram'}`}
          {invite.note ? ` · ${invite.note}` : ''}
        </span>
      </div>

      <div className={styles.actions}>
        <Button variant="primary" icon={<Copy size={20} aria-hidden="true" />} onClick={() => void copy()}>
          Copiar link
        </Button>
        <a
          className={styles.whatsapp}
          href={`https://wa.me/?text=${encodeURIComponent(message)}`}
          target="_blank"
          rel="noreferrer"
        >
          <MessageCircle size={20} aria-hidden="true" />
          WhatsApp
        </a>
        {canShare() && (
          <Button variant="outline" icon={<Share2 size={20} aria-hidden="true" />} onClick={() => void share()}>
            Compartilhar
          </Button>
        )}
        <Button
          variant="outline"
          icon={<QrCode size={20} aria-hidden="true" />}
          aria-expanded={showQr}
          aria-controls={qrId}
          onClick={() => setShowQr((v) => !v)}
        >
          QR Code
        </Button>
      </div>

      <div id={qrId} hidden={!showQr}>
        {showQr && <InviteQr url={invite.url} />}
      </div>

      {onRevoke && (
        <Button
          variant="ghost"
          size="sm"
          icon={<Link2Off size={18} aria-hidden="true" />}
          loading={revoking}
          onClick={onRevoke}
          className={styles.revoke}
        >
          Desativar este link
        </Button>
      )}
    </article>
  );
}
