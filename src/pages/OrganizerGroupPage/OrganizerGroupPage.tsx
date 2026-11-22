import { CalendarPlus, Plus, UserPlus } from 'lucide-react';
import { Navigate, useParams } from 'react-router';
import { EmptyState } from '@/components/EmptyState';
import { NavBar, NavIconButton } from '@/components/NavBar';
import { SegmentedNav } from '@/components/SegmentedControl';
import { useSheetParam } from '@/components/Sheet';
import { SkeletonList } from '@/components/Skeleton';
import { useGroup } from '@/features/groups';
import { useGroupMatches } from '@/features/matches';
import { InviteSheet } from '../shared/organizer/InviteSheet';
import { NewGameSheet } from '../shared/organizer/NewGameSheet';
import { CashTab } from './CashTab';
import { MembersTab } from './MembersTab';
import { PresenceTab } from './PresenceTab';

const TABS = ['presenca', 'membros', 'caixa'] as const;
type Tab = (typeof TABS)[number];

/**
 * Visão de organizador da turma (manual 4.2), aberta só pela aba Organizar: Presença, Membros e
 * Caixa no topo. Novo jogo, Convidar e Novo lançamento abrem por cima. O Voltar sempre volta para Organizar.
 */
export function OrganizerGroupPage() {
  const { groupId = '', tab = 'presenca' } = useParams();
  const group = useGroup(groupId);
  const games = useGroupMatches(groupId, 'upcoming');
  const newGame = useSheetParam('novo-jogo');
  const invite = useSheetParam('convidar');
  const entry = useSheetParam('lancamento');

  if (!TABS.includes(tab as Tab)) return <Navigate to={`/organizar/${groupId}/presenca`} replace />;
  if (group.isPending) return <SkeletonList rows={5} />;
  const g = group.data;
  if (!g || g.viewer.role !== 'owner')
    return <EmptyState title="Turma não encontrada" description="Só quem organiza vê esta tela." />;

  const next = games.data?.items.find((m) => m.status !== 'draft' && m.status !== 'cancelled') ?? null;
  const actions =
    tab === 'presenca' ? (
      <>
        <NavIconButton
          label="Novo jogo"
          icon={<CalendarPlus size={22} aria-hidden="true" />}
          onClick={() => newGame.open()}
        />
        <NavIconButton
          label="Convidar"
          icon={<UserPlus size={22} aria-hidden="true" />}
          onClick={() => invite.open()}
        />
      </>
    ) : tab === 'membros' ? (
      <NavIconButton label="Convidar" icon={<UserPlus size={22} aria-hidden="true" />} onClick={() => invite.open()} />
    ) : (
      <NavIconButton
        label="Novo lançamento"
        icon={<Plus size={24} aria-hidden="true" />}
        onClick={() => entry.open()}
      />
    );

  return (
    <>
      <NavBar back={{ to: '/organizar', label: 'Organizar' }} title={g.name} actions={actions} />
      <h1 className="visually-hidden">{g.name}</h1>
      <SegmentedNav
        label="Visão de organizador"
        replace
        items={[
          { to: `/organizar/${g.id}/presenca`, label: 'Presença' },
          { to: `/organizar/${g.id}/membros`, label: 'Membros' },
          { to: `/organizar/${g.id}/caixa`, label: 'Caixa' },
        ]}
      />
      {tab === 'presenca' && <PresenceTab group={g} game={next} onNewGame={() => newGame.open()} />}
      {tab === 'membros' && <MembersTab group={g} />}
      {tab === 'caixa' && <CashTab group={g} entryOpen={entry.isOpen} onEntryClose={() => entry.close()} />}

      <NewGameSheet open={newGame.isOpen} onClose={() => newGame.close()} group={g} />
      <InviteSheet open={invite.isOpen} onClose={() => invite.close()} group={g} game={next} />
    </>
  );
}
