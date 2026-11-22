import { CalendarDays, CircleDollarSign, MapPin, Share2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Avatar, AvatarStack } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { List, ListItem } from '@/components/List';
import { NavBar, NavIconButton } from '@/components/NavBar';
import { Section } from '@/components/Section';
import { Sheet, useSheetParam } from '@/components/Sheet';
import { SkeletonList } from '@/components/Skeleton';
import { GameCard } from '@/features/attendance';
import { MEMBERSHIP_LABEL, ruleLines, useGroup, useLeaveGroup, useMembers } from '@/features/groups';
import { useGroupMatches } from '@/features/matches';
import { useSports } from '@/features/profile';
import { mapsLink } from '@/lib/calendar';
import { formatMoneyShort, formatSchedule } from '@/lib/format';
import { toast } from '@/stores';
import styles from './GroupPage.module.css';
import { InviteSheet } from '../shared/organizer/InviteSheet';
import { MembersSheet } from './MembersSheet';

/**
 * Turma como jogador (manual 3.6), aberta pela aba Turmas — mesmo numa turma que você organiza.
 * Nada é editável aqui: próximo jogo com a resposta, dia e local, valores, regras, membros e Sair.
 */
export function GroupPage() {
  const { groupId = '' } = useParams();
  const navigate = useNavigate();
  const group = useGroup(groupId);
  const matches = useGroupMatches(groupId, 'upcoming');
  const members = useMembers(groupId);
  const sports = useSports();
  const leave = useLeaveGroup(groupId);
  const pay = useSheetParam('pagar');
  const membersSheet = useSheetParam('membros');
  const shareSheet = useSheetParam('compartilhar');
  const [confirmLeave, setConfirmLeave] = useState(false);

  if (group.isPending) return <SkeletonList rows={5} />;
  const g = group.data;
  if (!g) return <EmptyState title="Turma não encontrada" description="Você pode ter saído dela." />;

  const owner = g.viewer.role === 'owner';
  const next = matches.data?.items.find((m) => m.status !== 'draft');
  const people = members.data ?? [];
  const sport = sports.data?.find((s) => s.id === g.sportId)?.name ?? '';
  const subtitle = owner
    ? `${sport} · ${g.memberCount} membros`
    : `Você é ${MEMBERSHIP_LABEL[g.viewer.membershipType].toLowerCase()} · organizada por ${g.owner.name.split(' ')[0]}`;
  const firstNames = people.slice(0, 3).map((m) => m.user.name.split(' ')[0]);

  return (
    <>
      <NavBar
        back={{ to: '/turmas', label: 'Turmas' }}
        actions={
          // só quem organiza gera convites (RN-12)
          owner ? (
            <NavIconButton
              label="Compartilhar turma"
              icon={<Share2 size={22} aria-hidden="true" />}
              onClick={() => shareSheet.open()}
            />
          ) : undefined
        }
      />
      <div className={styles.hero}>
        <Avatar name={g.name} id={g.id} size="lg" />
        <h1 className={styles.title}>{g.name}</h1>
        <p className={styles.muted}>{subtitle}</p>
      </div>

      {next && (
        <Section title="Próximo jogo">
          <GameCard
            game={next}
            hideGroup
            onPay={(id) => pay.open({ jogo: id })}
            from={{ to: `/turmas/${g.id}`, label: g.name }}
          />
        </Section>
      )}

      <List label="Dia, local e valores">
        <ListItem
          leading={<CalendarDays size={22} aria-hidden="true" />}
          title={g.schedules?.length ? formatSchedule(g.schedules) : 'Dia e horário a combinar'}
        />
        <ListItem
          inline
          leading={<MapPin size={22} aria-hidden="true" />}
          title={g.location.name}
          meta={g.location.address ?? undefined}
          trailing={
            <a className={styles.link} href={mapsLink(g.location)} target="_blank" rel="noreferrer">
              Mapa
            </a>
          }
        />
        <ListItem
          leading={<CircleDollarSign size={22} aria-hidden="true" />}
          title={`${formatMoneyShort(g.dropInFeeCents)} por jogo`}
          meta={g.monthlyFeeCents ? `ou ${formatMoneyShort(g.monthlyFeeCents)}/mês como mensalista` : undefined}
        />
      </List>

      {g.publicRules && (
        <Section title="Regras">
          <List>
            {ruleLines(g.publicRules).map((r) => (
              <ListItem key={r.title} title={r.title} meta={r.detail} />
            ))}
          </List>
        </Section>
      )}

      <Section footnote={owner ? 'Você organiza esta turma. Para editar, use a aba Organizar.' : undefined}>
        <List>
          <ListItem
            leading={<AvatarStack people={people.slice(0, 3).map((m) => m.user)} total={people.length} max={3} />}
            title={`${g.memberCount} membros`}
            meta={
              firstNames.length
                ? `${firstNames.join(', ')}${g.memberCount > 3 ? ` e mais ${g.memberCount - 3}` : ''}`
                : undefined
            }
            onClick={() => membersSheet.open()}
          />
        </List>
      </Section>

      {!owner && (
        <List>
          <ListItem tone="danger" title="Sair da turma" onClick={() => setConfirmLeave(true)} />
        </List>
      )}

      {owner && (
        <InviteSheet
          open={shareSheet.isOpen}
          onClose={() => shareSheet.close()}
          group={g}
          game={next && next.status !== 'cancelled' ? next : null}
          title="Compartilhar turma"
        />
      )}

      <MembersSheet
        open={membersSheet.isOpen}
        onClose={() => membersSheet.close()}
        members={people}
        sportId={g.sportId}
        owner={owner}
      />

      <Sheet open={confirmLeave} onClose={() => setConfirmLeave(false)} title="Sair da turma">
        <p>Você sai dos próximos jogos da {g.name} e libera a sua vaga. O seu histórico continua no Perfil.</p>
        <Button
          variant="danger"
          block
          loading={leave.isPending}
          onClick={() =>
            leave.mutate(undefined, {
              onSuccess: () => {
                toast(`Você saiu da ${g.name}.`);
                navigate('/turmas', { replace: true });
              },
            })
          }
        >
          Sair da turma
        </Button>
      </Sheet>
    </>
  );
}
