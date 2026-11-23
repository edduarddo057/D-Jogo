import { Copy, Share2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/Button';
import { NavIconButton } from '@/components/NavBar';
import { SegmentedControl } from '@/components/SegmentedControl';
import { Sheet } from '@/components/Sheet';
import { Skeleton } from '@/components/Skeleton';
import type { Group } from '@/features/groups';
import { inviteMessage, InviteQr, useCreateInvite, useInvites, useRevokeInvite, type Invite } from '@/features/invites';
import type { MatchSummary } from '@/features/matches';
import { formatDay } from '@/lib/format';
import { toast } from '@/stores';
import styles from './sheets.module.css';

export interface InviteSheetProps {
  open: boolean;
  onClose: () => void;
  group: Group;
  /** Próximo jogo, para o convite "Só para sáb, 28 nov". */
  game?: MatchSummary | null;
  /** Título da folha (padrão "Convidar"). */
  title?: string;
}

/** Convidar (manual 4.2): QR code e link para copiar e compartilhar; convite só para um jogo; link novo. */
export function InviteSheet({ open, onClose, group, game, title = 'Convidar' }: InviteSheetProps) {
  const [scope, setScope] = useState<'turma' | 'jogo'>('turma');
  const invites = useInvites(group.id);
  const create = useCreateInvite(group.id);
  const revoke = useRevokeInvite(group.id);
  const matchId = scope === 'jogo' ? (game?.id ?? null) : null;
  const invite: Invite | undefined = invites.data?.find((i) => (i.matchId ?? null) === matchId);

  // não existe convite para este escopo: cria um (avulso; o tipo muda depois em Membros)
  const tried = useRef(new Set<string>());
  useEffect(() => {
    const key = matchId ?? 'turma';
    if (!open || invites.isPending || invite || tried.current.has(key)) return;
    tried.current.add(key);
    create.mutate({ membershipType: 'drop_in', ...(matchId ? { matchId } : {}) });
  }, [open, invites.isPending, invite, create, matchId]);

  const copy = async () => {
    if (!invite) return;
    try {
      await navigator.clipboard.writeText(invite.url);
      toast('Link copiado.', { tone: 'success' });
    } catch {
      toast('Não deu para copiar. Segure o link para copiar.', { tone: 'error' });
    }
  };
  const share = async () => {
    if (!invite) return;
    const text = inviteMessage(group.name, invite);
    try {
      // só o texto: ele já termina com o link. Mandar `url` também faz o WhatsApp repetir o link.
      if (navigator.share) await navigator.share({ title: group.name, text });
      else window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
    } catch {
      /* cancelado */
    }
  };
  const renew = () => {
    if (!invite) return;
    revoke.mutate(invite.code, {
      onSuccess: () =>
        create.mutate(
          { membershipType: invite.membershipType, ...(matchId ? { matchId } : {}) },
          { onSuccess: () => toast('Link antigo desativado. Este é o novo.', { tone: 'success' }) },
        ),
    });
  };

  return (
    <Sheet open={open} onClose={onClose} title={title} closeLabel="Fechar">
      {game && (
        <SegmentedControl
          label="Para quem é o convite"
          options={[
            { value: 'turma', label: 'Para a turma' },
            { value: 'jogo', label: `Só para ${formatDay(game.startsAt)}` },
          ]}
          value={scope}
          onChange={setScope}
        />
      )}
      {invite ? (
        <>
          <div className={styles.qr}>
            <InviteQr url={invite.url} />
          </div>
          <div className={styles.linkRow}>
            <div className={styles.linkText}>
              <span className={styles.url}>{invite.url.replace(/^https?:\/\//, '')}</span>
              <span className={styles.muted}>
                {scope === 'jogo'
                  ? 'Quem abrir entra só neste jogo, como avulso'
                  : 'Quem abrir vê a turma antes de entrar'}
              </span>
            </div>
            <NavIconButton
              label="Copiar link"
              icon={<Copy size={20} aria-hidden="true" />}
              onClick={() => void copy()}
            />
          </div>
          <Button block icon={<Share2 size={20} aria-hidden="true" />} onClick={() => void share()}>
            Compartilhar
          </Button>
          <Button variant="ghost" block loading={revoke.isPending || create.isPending} onClick={renew}>
            Desativar este link e criar outro
          </Button>
        </>
      ) : (
        <Skeleton shape="card" height="28rem" />
      )}
    </Sheet>
  );
}
