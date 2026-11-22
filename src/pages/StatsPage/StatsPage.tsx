import { clsx } from 'clsx';
import { CalendarDays, ChevronRight, Crown, Flame, Volleyball } from 'lucide-react';
import { Link } from 'react-router';
import { Avatar } from '@/components/Avatar';
import { EmptyState, ErrorState } from '@/components/EmptyState';
import { fromState, NavBar, PageTitle } from '@/components/NavBar';
import { Section } from '@/components/Section';
import { SkeletonList } from '@/components/Skeleton';
import { firstName, useMyStatsDetails } from '@/features/profile';
import { formatDay } from '@/lib/format';
import { Medal } from '../shared/Medal';
import { achievementsOf, levelOf, xpOf } from './progress';
import styles from './StatsPage.module.css';

const FROM = fromState('/voce/estatisticas', 'Estatísticas');
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const pct = (wins: number, rounds: number) => (rounds ? Math.round((wins / rounds) * 100) : 0);

/**
 * Suas estatísticas (aberto pelo mural): nível, números, forma recente, onde vai melhor, parceiros
 * de vitória, melhor dia e conquistas — tudo do jeito de um álbum de figurinhas (RN-94).
 */
export function StatsPage() {
  const stats = useMyStatsDetails();

  if (stats.isPending)
    return (
      <>
        <NavBar back={{ to: '/', label: 'Jogos' }} />
        <SkeletonList rows={6} />
      </>
    );
  if (stats.isError || !stats.data)
    return (
      <>
        <NavBar back={{ to: '/', label: 'Jogos' }} />
        <ErrorState onRetry={() => void stats.refetch()} retrying={stats.isFetching} />
      </>
    );

  const s = stats.data;
  if (s.matches === 0)
    return (
      <>
        <NavBar back={{ to: '/', label: 'Jogos' }} />
        <PageTitle title="Suas estatísticas" />
        <EmptyState
          icon={Volleyball}
          title="Seu mural começa no primeiro jogo"
          description="Depois de jogar, aqui aparecem seu nível, suas vitórias, onde você vai melhor e as conquistas."
        />
      </>
    );

  const level = levelOf(xpOf(s));
  const achievements = achievementsOf(s);
  const unlocked = achievements.filter((a) => a.value >= a.goal).length;
  const formWins = s.recentForm.filter((r) => r === 'win').length;
  const showCrown = s.groups.length > 1;

  return (
    <>
      <NavBar back={{ to: '/', label: 'Jogos' }} />
      <PageTitle title="Suas estatísticas" />

      {/* Nível: a medalha grande e quanto falta para o próximo */}
      <section className={styles.level} aria-label="Seu nível">
        <Medal icon={level.number >= 4 ? Crown : Volleyball} tone={level.number >= 4 ? 'gold' : 'green'} size="lg" />
        <div className={styles.levelText}>
          <span className={styles.eyebrow}>Nível {level.number}</span>
          <span className={styles.levelName}>{level.name}</span>
          {level.next ? (
            <>
              <div
                className={styles.xpTrack}
                role="progressbar"
                aria-label={`XP até ${level.next.name}`}
                aria-valuemin={level.from}
                aria-valuemax={level.next.xp}
                aria-valuenow={level.xp}
              >
                <div
                  className={styles.xpBar}
                  style={{ width: `${((level.xp - level.from) / (level.next.xp - level.from)) * 100}%` }}
                />
              </div>
              <span className={styles.xpText}>
                {level.next.xp - level.xp} XP para <b>{level.next.name}</b>
              </span>
            </>
          ) : (
            <span className={styles.xpText}>Nível máximo. Respeita!</span>
          )}
        </div>
      </section>

      {/* Números do jeito de placar */}
      <dl className={styles.numbers} aria-label="Seus números">
        {[
          { label: 'rodadas', value: s.rounds },
          { label: s.wins === 1 ? 'vitória' : 'vitórias', value: s.wins },
          { label: 'de vitórias', value: `${pct(s.wins, s.rounds)}%` },
          { label: s.points === 1 ? 'ponto' : 'pontos', value: s.points },
          { label: 'presença', value: `${Math.round(s.attendanceRate * 100)}%` },
          { label: 'destaque', value: `${s.highlights}×` },
        ].map((n) => (
          <div key={n.label} className={styles.number}>
            <dt className={styles.numberLabel}>{n.label}</dt>
            <dd className={styles.numberValue}>{n.value}</dd>
          </div>
        ))}
      </dl>

      {s.streak > 0 && (
        <p className={styles.streak}>
          <Flame size={22} aria-hidden="true" />
          <span>
            <b>{plural(s.streak, 'jogo seguido', 'jogos seguidos')}</b>
            {s.bestStreak > s.streak ? ` · seu recorde é ${s.bestStreak}` : ' · seu recorde!'}
          </span>
        </p>
      )}

      {s.recentForm.length > 0 && (
        <Section
          title="Forma recente"
          aside={`${formWins} de ${s.recentForm.length}`}
          footnote="Últimas rodadas, da mais antiga para a mais recente."
        >
          <ol className={styles.form} aria-label={`Venceu ${formWins} das últimas ${s.recentForm.length} rodadas`}>
            {s.recentForm.map((r, i) => (
              <li key={i} className={clsx(styles.ball, r === 'win' ? styles.win : styles.loss)}>
                <Volleyball size={14} strokeWidth={2.4} aria-hidden="true" />
                <span className="visually-hidden">{r === 'win' ? 'Venceu' : 'Perdeu'}</span>
              </li>
            ))}
          </ol>
        </Section>
      )}

      {s.groups.length > 0 && (
        <Section title="Onde você vai melhor">
          <ul className={styles.groups}>
            {s.groups.map((g, i) => (
              <li key={g.groupId} className={styles.group}>
                <div className={styles.groupHead}>
                  <span className={styles.groupName}>
                    {showCrown && i === 0 && <Crown className={styles.crown} size={18} aria-label="Melhor turma" />}
                    {g.name}
                  </span>
                  <span className={styles.groupPct}>{pct(g.wins, g.rounds)}%</span>
                </div>
                <div className={styles.meter} aria-hidden="true">
                  <div className={styles.meterBar} style={{ width: `${pct(g.wins, g.rounds)}%` }} />
                </div>
                <span className={styles.muted}>
                  {plural(g.wins, 'vitória', 'vitórias')} em {plural(g.rounds, 'rodada', 'rodadas')} ·{' '}
                  {plural(g.matches, 'jogo', 'jogos')}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {s.partners.length > 0 && (
        <Section title="Parceiros de vitória" footnote="Com quem você mais vence no mesmo time.">
          <ol className={styles.partners}>
            {s.partners.map((p, i) => (
              <li key={p.user.id} className={styles.partner}>
                <span className={styles.rank} aria-hidden="true">
                  {i + 1}º
                </span>
                <Avatar name={p.user.name} id={p.user.id} src={p.user.photoUrl} decorative />
                <span className={styles.partnerText}>
                  <span className={styles.groupName}>{firstName(p.user.name)}</span>
                  <span className={styles.muted}>
                    {plural(p.wins, 'vitória', 'vitórias')} juntos · {pct(p.wins, p.rounds)}%
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </Section>
      )}

      {s.bestDay && (
        <Section title="Seu melhor dia">
          <Link to={`/jogos/${s.bestDay.matchId}/resumo`} state={FROM} className={styles.bestDay}>
            <span className={styles.bestIcon} aria-hidden="true">
              <CalendarDays size={22} />
            </span>
            <span className={styles.partnerText}>
              <span className={styles.groupName}>
                {formatDay(s.bestDay.startsAt, { capital: true })} · {s.bestDay.groupName}
              </span>
              <span className={styles.muted}>
                {plural(s.bestDay.wins, 'vitória', 'vitórias')} em {plural(s.bestDay.rounds, 'rodada', 'rodadas')}
                {s.bestDay.points > 0 ? ` · ${plural(s.bestDay.points, 'ponto', 'pontos')}` : ''}
              </span>
            </span>
            <ChevronRight className={styles.chev} size={20} aria-hidden="true" />
          </Link>
        </Section>
      )}

      <Section title="Conquistas" aside={`${unlocked} de ${achievements.length}`}>
        <ul className={styles.achievements}>
          {achievements.map((a) => {
            const done = a.value >= a.goal;
            return (
              <li key={a.key} className={clsx(styles.achievement, !done && styles.locked)}>
                <Medal icon={a.icon} tone={done ? a.metal : 'locked'} />
                <span className={styles.achTitle}>{a.title}</span>
                <span className={styles.achHow}>
                  {done ? 'Conquistada' : a.goal > 1 ? `${Math.min(a.value, a.goal)}/${a.goal}` : a.how}
                </span>
                <span className="visually-hidden">{done ? '' : `. ${a.how}`}</span>
              </li>
            );
          })}
        </ul>
      </Section>
    </>
  );
}
