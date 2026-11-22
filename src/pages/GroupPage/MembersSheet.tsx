import { useState } from 'react';
import { Avatar } from '@/components/Avatar';
import { Chips } from '@/components/Chips';
import { List, ListItem } from '@/components/List';
import { Section } from '@/components/Section';
import { Sheet } from '@/components/Sheet';
import type { Member, MembershipType } from '@/features/groups';
import { positionLabels, useSports } from '@/features/profile';
import styles from './GroupPage.module.css';

type SortBy = 'name' | 'position' | 'gender';

const GENDER_LABEL = { female: 'Feminino', male: 'Masculino' } as const;
const GENDER_ORDER = { female: 0, male: 1 } as const;
const TYPES: Array<{ type: MembershipType; title: string }> = [
  { type: 'monthly', title: 'Mensalistas' },
  { type: 'drop_in', title: 'Avulsos' },
];

const byName = (a: Member, b: Member) => a.user.name.localeCompare(b.user.name, 'pt-BR', { sensitivity: 'base' });

export interface MembersSheetProps {
  open: boolean;
  onClose: () => void;
  members: Member[];
  sportId: string;
  /** Quem organiza também ordena por gênero: só o dono vê o gênero dos membros (RN-03a, RN-16). */
  owner: boolean;
}

/**
 * Membros da turma separados em Mensalistas e Avulsos, cada grupo em ordem alfabética,
 * por posição (na ordem da modalidade) ou, para quem organiza, por gênero.
 */
export function MembersSheet({ open, onClose, members, sportId, owner }: MembersSheetProps) {
  const sports = useSports();
  const [sortBy, setSortBy] = useState<SortBy>('name');
  const positions = sports.data?.find((s) => s.id === sportId)?.positions ?? [];

  // sem posição ou sem gênero informado vai para o fim, e o empate fica em ordem alfabética
  const positionRank = (m: Member) => {
    const i = positions.findIndex((p) => p.id === m.user.primaryPosition);
    return i === -1 ? positions.length : i;
  };
  const genderRank = (m: Member) => (m.gender ? GENDER_ORDER[m.gender] : 2);
  const sort = (a: Member, b: Member) => {
    if (sortBy === 'position') return positionRank(a) - positionRank(b) || byName(a, b);
    if (sortBy === 'gender') return genderRank(a) - genderRank(b) || byName(a, b);
    return byName(a, b);
  };

  const options: Array<{ value: SortBy; label: string }> = [
    { value: 'name', label: 'Nome' },
    { value: 'position', label: 'Posição' },
    ...(owner ? [{ value: 'gender' as const, label: 'Gênero' }] : []),
  ];

  return (
    <Sheet open={open} onClose={onClose} title={`Membros · ${members.length}`} closeLabel="Fechar">
      <Chips label="Ordenar por" options={options} value={sortBy} onChange={setSortBy} />
      {TYPES.map(({ type, title }) => {
        const list = members.filter((m) => m.type === type).sort(sort);
        if (list.length === 0) return null;
        return (
          <Section key={type} title={`${title} · ${list.length}`} className={styles.membersGroup}>
            <List label={title}>
              {list.map((m) => (
                <ListItem
                  key={m.id}
                  leading={<Avatar name={m.user.name} id={m.user.id} src={m.user.photoUrl} decorative />}
                  title={m.user.name}
                  meta={[
                    m.role === 'owner' ? 'Organiza' : null,
                    positionLabels(sports.data, sportId, m.user.primaryPosition ? [m.user.primaryPosition] : []),
                    sortBy === 'gender' ? (m.gender ? GENDER_LABEL[m.gender] : 'Gênero não informado') : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                />
              ))}
            </List>
          </Section>
        );
      })}
    </Sheet>
  );
}
