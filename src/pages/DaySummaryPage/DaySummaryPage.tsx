import { ChevronRight, Share2, Trophy } from 'lucide-react';
import { useState } from 'react';
import { useParams } from 'react-router';
import { Avatar } from '@/components/Avatar';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { List, ListItem } from '@/components/List';
import { NavBar, NavIconButton, PageTitle } from '@/components/NavBar';
import { Section } from '@/components/Section';
import { Sheet } from '@/components/Sheet';
import { SkeletonList } from '@/components/Skeleton';
import { Stats } from '@/components/Stats';
import { teamLetter, teamName, useDaySummary } from '@/features/live';
import { useMatch } from '@/features/matches';
import { firstName, positionLabels, useMe, useSports } from '@/features/profile';
import { formatDay } from '@/lib/format';
import { toast } from '@/stores';
import { TeamTag } from '../shared/TeamTag';
import styles from './DaySummaryPage.module.css';

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const join = (names: string[]) =>
  names.length <= 1 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} e ${names.at(-1)}`;

type Summary = NonNullable<ReturnType<typeof useDaySummary>['data']>;
const keyOf = (members: Array<{ id: string }>) =>
  members
    .map((u) => u.id)
    .sort()
    .join('+');

/**
 * Time (grupo de pessoas) que mais ganhou no dia, pelo conjunto exato de jogadores (RN-107): soma as
 * vitórias mesmo que o grupo tenha trocado de cor, sido desfeito e se formado de novo. Empates vêm juntos.
 */
function bestTeams(d: Summary) {
  const top = d.groups[0]?.wins ?? 0;
  if (top === 0) return [];
  const last = d.rounds.at(-1)?.number ?? 0;
  return d.groups
    .filter((g) => g.wins === top)
    .map((g) => {
      const played = d.rounds.filter((r) => r.teams.some((t) => keyOf(t.members) === g.key));
      const won = played.filter(
        (r) => keyOf(r.teams.find((t) => t.teamId === r.winnerTeamId)?.members ?? []) === g.key,
      );
      const colors = [...new Set(played.map((r) => r.teams.find((t) => keyOf(t.members) === g.key)?.colorIndex ?? 0))];
      const lastPlayed = played.at(-1)?.number ?? last;
      return {
        key: g.key,
        members: g.members,
        wins: g.wins,
        played: played.map((r) => r.number),
        won: won.map((r) => r.number),
        colors,
        splitAfter: lastPlayed < last ? lastPlayed : null,
      };
    });
}

/**
 * Resumo do dia (manual 4.3, visível para todos os membros): destaque do dia (mais vitórias,
 * desempate por pontos), números pessoais, rodadas com placar, vitórias por jogador e o grupo que
 * mais venceu junto. O Voltar volta para onde a pessoa abriu (Jogos, Avisos, Você ou a turma).
 */
export function DaySummaryPage() {
  const { matchId = '' } = useParams();
  const match = useMatch(matchId);
  const day = useDaySummary(matchId);
  const me = useMe();
  const sports = useSports();
  const [teamOpen, setTeamOpen] = useState<string | null>(null);

  if (match.isPending || day.isPending) return <SkeletonList rows={5} />;
  const m = match.data;
  const d = day.data;
  if (!m || !d) return <EmptyState title="Resumo não encontrado" />;

  const players = d.players.length;
  const highlight = d.mvp;
  const top = highlight[0] ? d.players.find((p) => p.user.id === highlight[0]?.id) : undefined;
  const mine = d.players.find((p) => p.user.id === me.data?.id);
  const best = bestTeams(d);

  const share = async () => {
    const text = `${m.group.name}, ${formatDay(m.startsAt)}: destaque do dia ${join(highlight.map((u) => firstName(u.name)))}.`;
    try {
      if (navigator.share) await navigator.share({ title: 'Resumo do dia', text, url: window.location.href });
      else {
        await navigator.clipboard.writeText(`${text} ${window.location.href}`);
        toast('Link copiado.', { tone: 'success' });
      }
    } catch {
      /* cancelado */
    }
  };

  return (
    <>
      <NavBar
        back={{ to: '/', label: 'Jogos' }}
        actions={
          <NavIconButton
            label="Compartilhar"
            icon={<Share2 size={22} aria-hidden="true" />}
            onClick={() => void share()}
          />
        }
      />
      <PageTitle
        eyebrow={m.group.name}
        title={formatDay(m.startsAt, { capital: true })}
        subtitle={`${plural(players, 'jogou', 'jogaram')} · ${plural(d.rounds.length, 'rodada', 'rodadas')}`}
      />

      {d.rounds.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="Sem rodadas neste dia"
          description="O resumo aparece quando o organizador registra as rodadas."
        />
      ) : (
        <>
          {top && (
            <Card padding="md" row>
              <Avatar name={top.user.name} id={top.user.id} src={top.user.photoUrl} size="lg" />
              <div>
                <span className={styles.muted}>Destaque do dia</span>
                <p className={styles.name}>{join(highlight.map((u) => firstName(u.name)))}</p>
                <span className={styles.muted}>
                  {plural(top.wins, 'vitória', 'vitórias')} · {plural(top.points, 'ponto', 'pontos')}
                </span>
              </div>
            </Card>
          )}

          {mine && (
            <Section title="Você">
              <Stats
                label="Seus números no dia"
                items={[
                  { value: mine.wins, label: mine.wins === 1 ? 'vitória' : 'vitórias' },
                  { value: mine.points, label: mine.points === 1 ? 'ponto' : 'pontos' },
                  { value: mine.rounds, label: mine.rounds === 1 ? 'rodada' : 'rodadas' },
                ]}
              />
            </Section>
          )}

          {best.length > 2 && (
            <Section title="Time que mais ganhou">
              <p className={styles.muted}>
                Nenhum time se destacou: {best.length} times diferentes venceram{' '}
                {plural(best[0]?.wins ?? 0, 'vez', 'vezes')} cada.
              </p>
            </Section>
          )}

          {best.length > 0 && best.length <= 2 && (
            <Section
              title={best.length > 1 ? 'Times que mais ganharam' : 'Time que mais ganhou'}
              footnote="Conta pelas pessoas que jogaram juntas, mesmo se o time mudou de cor ou foi desfeito."
            >
              {best.map((t) => (
                <Card
                  key={t.key}
                  as="button"
                  padding="md"
                  className={styles.best}
                  onClick={() => setTeamOpen(t.key)}
                  aria-label={`Ver o time: ${join(t.members.map((u) => firstName(u.name)))}, ${plural(t.wins, 'vitória', 'vitórias')}`}
                >
                  <div className={styles.bestTop}>
                    <span className={styles.tags}>
                      {t.colors.map((c) => (
                        <TeamTag key={c} index={c} letter={teamLetter(c)} size="md" />
                      ))}
                    </span>
                    <span className={styles.bestText}>
                      <span className={styles.name}>{plural(t.wins, 'vitória', 'vitórias')}</span>
                      <span className={styles.muted}>
                        em {plural(t.played.length, 'rodada', 'rodadas')} juntos · venceu{' '}
                        {t.won.length === 1 ? 'a rodada' : 'as rodadas'} {join(t.won.map(String))}
                      </span>
                    </span>
                    <ChevronRight className={styles.chev} size={20} aria-hidden="true" />
                  </div>
                  <span className={styles.members}>{join(t.members.map((u) => firstName(u.name)))}</span>
                  {t.splitAfter !== null && (
                    <span className={styles.mutedBlock}>
                      Jogou junto até a rodada {t.splitAfter}, depois o time mudou.
                    </span>
                  )}
                </Card>
              ))}
            </Section>
          )}

          {(() => {
            const t = best.find((x) => x.key === teamOpen);
            if (!t) return null;
            // pontos de cada um só nas rodadas em que jogou neste time
            const teamPoints = new Map<string, number>();
            for (const r of d.rounds.filter((x) => t.played.includes(x.number)))
              for (const sc of r.scorers) teamPoints.set(sc.userId, (teamPoints.get(sc.userId) ?? 0) + sc.points);
            return (
              <Sheet
                open
                onClose={() => setTeamOpen(null)}
                title={`Time · ${plural(t.wins, 'vitória', 'vitórias')}`}
                closeLabel="Fechar"
              >
                <Section
                  title={`Quem jogou · ${t.members.length}`}
                  footnote="Pontos marcados nas rodadas em que jogaram juntos."
                >
                  <List label="Quem jogou neste time">
                    {t.members.map((u) => {
                      const pts = teamPoints.get(u.id) ?? 0;
                      const pos = positionLabels(
                        sports.data,
                        m.group.sportId,
                        u.primaryPosition ? [u.primaryPosition] : [],
                      );
                      return (
                        <ListItem
                          key={u.id}
                          inline
                          leading={<Avatar name={u.name} id={u.id} src={u.photoUrl} decorative />}
                          title={u.name}
                          meta={[u.id === me.data?.id ? 'Você' : null, pos].filter(Boolean).join(' · ') || undefined}
                          trailing={
                            pts > 0 ? <span className={styles.value}>{plural(pts, 'ponto', 'pontos')}</span> : undefined
                          }
                        />
                      );
                    })}
                  </List>
                </Section>
                <Section
                  title="Rodadas juntos"
                  footnote={t.splitAfter !== null ? `Depois da rodada ${t.splitAfter} o time mudou.` : undefined}
                >
                  <List label="Rodadas juntos">
                    {d.rounds
                      .filter((r) => t.played.includes(r.number))
                      .map((r) => {
                        const mine = r.teams.find((x) => keyOf(x.members) === t.key);
                        const other = r.teams.find((x) => x !== mine);
                        if (!mine || !other) return null;
                        const won = r.winnerTeamId === mine.teamId;
                        return (
                          <ListItem
                            key={r.id}
                            inline
                            leading={<TeamTag index={mine.colorIndex} letter={teamLetter(mine.colorIndex)} />}
                            title={`Rodada ${r.number}`}
                            meta={won ? 'Venceu' : 'Perdeu'}
                            trailing={
                              <span className={styles.score}>
                                <b>{mine.score}</b>
                                <span aria-hidden="true">×</span>
                                <b>{other.score}</b>
                              </span>
                            }
                          />
                        );
                      })}
                  </List>
                </Section>
              </Sheet>
            );
          })()}

          <Section title="Rodadas">
            <List>
              {d.rounds.map((r) => {
                const [a, b] = r.teams;
                const winner = r.teams.find((t) => t.teamId === r.winnerTeamId);
                if (!a || !b) return null;
                return (
                  <ListItem
                    key={r.id}
                    inline
                    title={`Rodada ${r.number}`}
                    meta={winner ? `${teamName(winner.colorIndex)} venceu` : undefined}
                    trailing={
                      <span
                        className={styles.score}
                        aria-label={`${teamName(a.colorIndex)} ${a.score} a ${b.score} ${teamName(b.colorIndex)}`}
                      >
                        <TeamTag index={a.colorIndex} letter={teamLetter(a.colorIndex)} />
                        <b>{a.score}</b>
                        <span aria-hidden="true">×</span>
                        <b>{b.score}</b>
                        <TeamTag index={b.colorIndex} letter={teamLetter(b.colorIndex)} />
                      </span>
                    }
                  />
                );
              })}
            </List>
          </Section>

          <Section title="Vitórias por jogador">
            <List>
              {d.players.map((p) => (
                <ListItem
                  key={p.user.id}
                  inline
                  leading={<Avatar name={p.user.name} id={p.user.id} src={p.user.photoUrl} decorative />}
                  title={p.user.id === me.data?.id ? 'Você' : firstName(p.user.name)}
                  meta={plural(p.points, 'ponto', 'pontos')}
                  trailing={<span className={styles.value}>{plural(p.wins, 'vitória', 'vitórias')}</span>}
                />
              ))}
            </List>
          </Section>
        </>
      )}
    </>
  );
}
