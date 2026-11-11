import { clsx } from 'clsx';
import { useState } from 'react';
import { Avatar } from '@/components/Avatar';
import { useSports } from '@/features/profile';
import type { TeamDraw } from '../../api/drawApi';
import styles from './TeamsBoard.module.css';

export interface TeamsBoardProps {
  draw: TeamDraw;
  /** Rascunho do dono: tocar em dois jogadores de times diferentes troca os dois (RN-54). */
  onSwap?: (userA: string, userB: string) => void;
  /** Destaca "você" no time. */
  meId?: string;
}

const level = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export function TeamsBoard({ draw, onSwap, meId }: TeamsBoardProps) {
  const sports = useSports();
  const positions = sports.data?.find((s) => s.id === 'volleyball')?.positions ?? [];
  const short = (id: string | null | undefined) => positions.find((p) => p.id === id)?.short ?? null;
  const [selected, setSelected] = useState<{ userId: string; teamId: string } | null>(null);
  const editable = Boolean(onSwap) && draw.status === 'draft';

  const pick = (userId: string, teamId: string) => {
    if (!selected) return setSelected({ userId, teamId });
    if (selected.userId === userId) return setSelected(null);
    if (selected.teamId === teamId) return setSelected({ userId, teamId });
    onSwap?.(selected.userId, userId);
    setSelected(null);
  };

  return (
    <div className={styles.board}>
      {editable && (
        <p className={styles.hint} aria-live="polite">
          {selected
            ? 'Agora toque em alguém de outro time para trocar.'
            : 'Para ajustar, toque em um jogador e depois em alguém de outro time.'}
        </p>
      )}
      <div className={styles.teams}>
        {draw.teams.map((team, ti) => (
          <section
            key={team.id}
            className={clsx(styles.team, styles[`tone${(ti % 4) + 1}`])}
            aria-labelledby={`team-${team.id}`}
          >
            <header className={styles.head}>
              <h2 id={`team-${team.id}`} className={styles.name}>
                {team.name}
              </h2>
              <span className={styles.level}>Nível médio {level(team.averageLevel)}</span>
            </header>
            <ul className={styles.members}>
              {team.members.map((m) => {
                const me = m.user.id === meId;
                const content = (
                  <>
                    <Avatar id={m.user.id} name={m.user.name} src={m.user.photoUrl} size="sm" decorative />
                    <span className={styles.who}>
                      <span className={styles.player}>
                        {m.user.name}
                        {me && <span className={styles.me}> (você)</span>}
                      </span>
                      <span className={styles.meta}>
                        {[
                          short(m.position),
                          m.user.level ? `nível ${m.user.level}` : null,
                          m.isReserve ? 'banco' : null,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    </span>
                  </>
                );
                return (
                  <li key={m.user.id} className={clsx(m.isReserve && styles.reserve)}>
                    {editable ? (
                      <button
                        type="button"
                        className={clsx(styles.row, styles.button, selected?.userId === m.user.id && styles.selected)}
                        aria-pressed={selected?.userId === m.user.id}
                        onClick={() => pick(m.user.id, team.id)}
                      >
                        {content}
                      </button>
                    ) : (
                      <div className={clsx(styles.row, me && styles.mine)}>{content}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
