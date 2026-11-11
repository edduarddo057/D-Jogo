import type { ReactNode } from 'react';
import { Avatar } from '@/components/Avatar';
import { List, ListItem } from '@/components/List';
import { useSports } from '@/features/profile';
import type { Participation, ParticipationStatus } from '../../api/attendanceApi';
import styles from './ParticipantsSections.module.css';

interface Section {
  id: string;
  title: string;
  statuses: ParticipationStatus[];
  /** Começa recolhida (gente que não vai). */
  collapsed?: boolean;
}

const SECTIONS: Section[] = [
  { id: 'confirmados', title: 'Confirmados', statuses: ['confirmed'] },
  { id: 'pagamento', title: 'Aguardando pagamento', statuses: ['awaiting_payment'] },
  { id: 'espera', title: 'Lista de espera', statuses: ['waitlisted'] },
  { id: 'sem-resposta', title: 'Ainda não responderam', statuses: ['pending'] },
  { id: 'nao-vao', title: 'Não vão', statuses: ['declined', 'left', 'expired'], collapsed: true },
];

export interface ParticipantsSectionsProps {
  items: Participation[];
  /** Detalhe extra por pessoa (ex.: status do Pix para o dono). */
  meta?: (p: Participation) => string | null;
  /** Ações por pessoa (tela de Presenças do dono). */
  actions?: (p: Participation) => ReactNode;
  /** Seções vazias aparecem com aviso (útil para o dono). */
  showEmpty?: boolean;
  /** Nível dos títulos das seções no documento. */
  headingAs?: 'h2' | 'h3';
}

/** Lista da partida separada por situação. A fila aparece na ordem de chegada (RN-30). */
export function ParticipantsSections({
  items,
  meta,
  actions,
  showEmpty = false,
  headingAs: Heading = 'h3',
}: ParticipantsSectionsProps) {
  const sports = useSports();
  const positions = sports.data?.find((s) => s.id === 'volleyball')?.positions ?? [];
  const position = (p: Participation) => positions.find((x) => x.id === p.user.primaryPosition)?.label;

  return (
    <div className={styles.sections}>
      {SECTIONS.map((section) => {
        const people = items
          .filter((p) => section.statuses.includes(p.status))
          .sort((a, b) => (a.waitlistPosition ?? 0) - (b.waitlistPosition ?? 0));
        if (people.length === 0 && !showEmpty) return null;

        const list =
          people.length === 0 ? (
            <p className={styles.empty}>Ninguém por aqui.</p>
          ) : (
            <List label={section.title}>
              {people.map((p) => (
                <ListItem
                  key={p.id}
                  leading={
                    section.id === 'espera' && p.waitlistPosition ? (
                      <span className={styles.position}>{p.waitlistPosition}º</span>
                    ) : (
                      <Avatar id={p.user.id} name={p.user.name} src={p.user.photoUrl} size="sm" decorative />
                    )
                  }
                  title={p.user.name}
                  meta={[p.membershipType === 'drop_in' ? 'Avulso' : null, position(p), meta?.(p)]
                    .filter(Boolean)
                    .join(' · ')}
                  actions={actions?.(p)}
                />
              ))}
            </List>
          );

        const heading = (
          <>
            {section.title} <span className={styles.count}>{people.length}</span>
          </>
        );

        return section.collapsed && !actions ? (
          <details key={section.id} className={styles.section}>
            <summary className={styles.summary}>{heading}</summary>
            {list}
          </details>
        ) : (
          <section key={section.id} className={styles.section} aria-labelledby={`sec-${section.id}`}>
            <Heading id={`sec-${section.id}`} className={styles.title}>
              {heading}
            </Heading>
            {list}
          </section>
        );
      })}
    </div>
  );
}
