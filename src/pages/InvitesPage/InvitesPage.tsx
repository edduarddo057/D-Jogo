import { Link2 } from 'lucide-react';
import { useState } from 'react';
import { useParams } from 'react-router';
import { Button } from '@/components/Button';
import { EmptyState, ErrorState } from '@/components/EmptyState';
import { PageHeader } from '@/components/PageHeader';
import { SegmentedControl } from '@/components/SegmentedControl';
import { Skeleton } from '@/components/Skeleton';
import { useGroup, type MembershipType } from '@/features/groups';
import { InviteCard, useCreateInvite, useInvites, useRevokeInvite } from '@/features/invites';
import { toast } from '@/stores';
import styles from './InvitesPage.module.css';

const COPY: Record<MembershipType, { title: string; text: string }> = {
  monthly: {
    title: 'Link para mensalista',
    text: 'Quem entrar por aqui tem vaga garantida nas partidas e paga a mensalidade.',
  },
  drop_in: {
    title: 'Link para avulso',
    text: 'Quem entrar por aqui joga quando houver vaga e paga por partida.',
  },
};

/** /turmas/:groupId/convidar — links por tipo de vínculo, com copiar, WhatsApp, compartilhar e QR Code. */
export function InvitesPage() {
  const { groupId = '' } = useParams();
  const group = useGroup(groupId);
  const invites = useInvites(groupId);
  const create = useCreateInvite(groupId);
  const revoke = useRevokeInvite(groupId);
  const [type, setType] = useState<MembershipType>('monthly');

  const links = invites.data?.filter((i) => i.membershipType === type && !i.matchId) ?? [];

  const generate = () =>
    create.mutate(
      { membershipType: type },
      { onSuccess: () => toast('Link pronto para compartilhar.', { tone: 'success' }) },
    );

  return (
    <div className={styles.page}>
      <PageHeader
        title="Convidar jogadores"
        subtitle={group.data?.name}
        back={{ to: `/turmas/${groupId}/jogadores`, label: 'Voltar para a turma' }}
      />

      <SegmentedControl
        label="Tipo de convite"
        options={[
          { value: 'monthly', label: 'Mensalista' },
          { value: 'drop_in', label: 'Avulso' },
        ]}
        value={type}
        onChange={setType}
      />

      <section className={styles.section} aria-labelledby="tipo-convite">
        <div>
          <h2 id="tipo-convite" className={styles.title}>
            {COPY[type].title}
          </h2>
          <p className={styles.text}>{COPY[type].text}</p>
        </div>

        {(invites.isPending || group.isPending) && <Skeleton shape="card" height="20rem" />}
        {invites.isError && <ErrorState onRetry={() => void invites.refetch()} />}

        {invites.data && group.data && links.length === 0 && (
          <EmptyState
            icon={Link2}
            titleAs="h3"
            title="Nenhum link ativo"
            description="Gere um link e mande no grupo da galera."
            action={
              <Button loading={create.isPending} onClick={generate}>
                Gerar link
              </Button>
            }
          />
        )}

        {group.data &&
          links.map((invite) => (
            <InviteCard
              key={invite.code}
              invite={invite}
              groupName={group.data.name}
              revoking={revoke.isPending && revoke.variables === invite.code}
              onRevoke={() =>
                revoke.mutate(invite.code, {
                  onSuccess: () => toast('Link desativado. Quem tiver o link antigo não consegue mais entrar.'),
                })
              }
            />
          ))}

        {links.length > 0 && (
          <Button variant="ghost" size="sm" loading={create.isPending} onClick={generate} className={styles.more}>
            Gerar outro link
          </Button>
        )}
      </section>
    </div>
  );
}
