import { MessageCircle, UserMinus, ArrowLeftRight } from 'lucide-react';
import { useState } from 'react';
import { Avatar } from '@/components/Avatar';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { List, ListItem } from '@/components/List';
import { Modal } from '@/components/Modal';
import { useSports } from '@/features/profile';
import { formatE164Brazil } from '@/lib/format';
import { toast } from '@/stores';
import type { Member } from '../../api/membersApi';
import { useRemoveMember, useUpdateMember } from '../../queries/useMembers';
import { MEMBERSHIP_LABEL } from '../../utils/labels';
import styles from './MembersList.module.css';

/** Só o que pede atenção do dono aparece na lista; "paga" é o normal e fica sem selo. */
const FEE_BADGE = {
  paid: null,
  pending: { tone: 'warning', label: 'Mensalidade pendente' },
  reported: { tone: 'info', label: 'Pix informado' },
  rejected: { tone: 'danger', label: 'Pix recusado' },
  cancelled: null,
} as const;

export interface MembersListProps {
  groupId: string;
  members: Member[];
  /** Dono vê telefone, status da mensalidade e as ações de gestão. */
  canManage: boolean;
  label: string;
}

/** Aba Jogadores: lista da turma; o dono toca num jogador para gerenciar. */
export function MembersList({ groupId, members, canManage, label }: MembersListProps) {
  const sports = useSports();
  const positions = sports.data?.find((s) => s.id === 'volleyball')?.positions ?? [];
  const [selected, setSelected] = useState<Member | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const update = useUpdateMember(groupId);
  const remove = useRemoveMember(groupId);

  const close = () => {
    setSelected(null);
    setConfirmRemove(false);
  };

  const describe = (m: Member) => {
    const pos = positions.find((p) => p.id === m.user.primaryPosition)?.label;
    return [`@${m.user.nickname}`, pos].filter(Boolean).join(' · ');
  };

  const switchType = async (m: Member) => {
    const type = m.type === 'monthly' ? 'drop_in' : 'monthly';
    await update.mutateAsync({ memberId: m.id, type });
    toast(`${m.user.name} agora é ${MEMBERSHIP_LABEL[type].toLowerCase()}.`, { tone: 'success' });
    close();
  };

  const doRemove = async (m: Member) => {
    await remove.mutateAsync(m.id);
    toast(`${m.user.name} saiu da turma.`, { tone: 'success' });
    close();
  };

  return (
    <>
      <List label={label}>
        {members.map((m) => {
          const fee = canManage && m.monthlyFeeStatus ? FEE_BADGE[m.monthlyFeeStatus] : null;
          // A seção já diz se é mensalista ou avulso; o selo mostra só o que é exceção.
          const trailing =
            m.role === 'owner' ? (
              <Badge tone="info">Organizador</Badge>
            ) : fee ? (
              <Badge tone={fee.tone} dot>
                {fee.label}
              </Badge>
            ) : undefined;
          const common = {
            leading: <Avatar id={m.user.id} name={m.user.name} src={m.user.photoUrl} decorative />,
            title: m.user.name,
            meta: describe(m),
            trailing,
          };
          return canManage && m.role !== 'owner' ? (
            <ListItem key={m.id} {...common} onClick={() => setSelected(m)} />
          ) : (
            <ListItem key={m.id} {...common} />
          );
        })}
      </List>

      <Modal
        open={selected !== null}
        onClose={close}
        title={selected?.user.name ?? ''}
        description={selected ? `${MEMBERSHIP_LABEL[selected.type]} · ${describe(selected)}` : undefined}
      >
        {selected && !confirmRemove && (
          <div className={styles.actions}>
            {selected.phone && (
              <a
                className={styles.action}
                href={`https://wa.me/${selected.phone.replace(/\D/g, '')}`}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle size={20} aria-hidden="true" />
                <span>
                  Chamar no WhatsApp <span className={styles.sub}>{formatE164Brazil(selected.phone)}</span>
                </span>
              </a>
            )}
            <button
              type="button"
              className={styles.action}
              onClick={() => void switchType(selected)}
              disabled={update.isPending}
            >
              <ArrowLeftRight size={20} aria-hidden="true" />
              <span>
                Tornar {selected.type === 'monthly' ? 'avulso' : 'mensalista'}
                <span className={styles.sub}>
                  {selected.type === 'monthly'
                    ? 'Deixa de ter vaga garantida e de pagar mensalidade.'
                    : 'Passa a ter vaga garantida e mensalidade.'}
                </span>
              </span>
            </button>
            <button
              type="button"
              className={`${styles.action} ${styles.danger}`}
              onClick={() => setConfirmRemove(true)}
            >
              <UserMinus size={20} aria-hidden="true" />
              <span>Remover da turma</span>
            </button>
          </div>
        )}
        {selected && confirmRemove && (
          <div className={styles.confirm}>
            <p>
              {selected.user.name} sai da turma e das próximas partidas. Pagamentos já feitos continuam no financeiro.
            </p>
            <div className={styles.confirmButtons}>
              <Button variant="outline" onClick={() => setConfirmRemove(false)}>
                Voltar
              </Button>
              <Button variant="danger" loading={remove.isPending} onClick={() => void doRemove(selected)}>
                Remover
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
