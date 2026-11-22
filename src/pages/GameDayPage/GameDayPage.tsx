import { CloudOff, SlidersHorizontal, Trophy, UserPlus } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Avatar } from '@/components/Avatar';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { CheckRow } from '@/components/Check';
import { EmptyState } from '@/components/EmptyState';
import { List, ListItem } from '@/components/List';
import { fromState, NavBar, NavIconButton } from '@/components/NavBar';
import { Section } from '@/components/Section';
import { SegmentedControl } from '@/components/SegmentedControl';
import { ConfirmSheet, Sheet } from '@/components/Sheet';
import { SkeletonList } from '@/components/Skeleton';
import { Stepper } from '@/components/Stepper';
import { Steps } from '@/components/Steps';
import { Switch } from '@/components/Switch';
import { MEMBERSHIP_LABEL, useGroup, useMembers } from '@/features/groups';
import {
  addPoint,
  assignPoint,
  formatSummary,
  makeDraw,
  newClientId,
  removePoint,
  startLive,
  suggestFormat,
  teamColor,
  teamLetter,
  teamLevel,
  teamSkills,
  teamName,
  useGameDayStore,
  useGameDaySync,
  winnerStays,
  type GameDayPlayer,
  type GameDaySkill,
  type GameDaySession,
  type NextRound,
} from '@/features/live';
import { positionLabels, useSports } from '@/features/profile';
import { AddPersonForm } from '@/features/demo';
import { isDemoActive } from '@/lib/demo';
import { formatMoneyShort } from '@/lib/format';
import { isApiError, messageFor } from '@/lib/http';
import { toast } from '@/stores';
import { TeamTag } from '../shared/TeamTag';
import { Scoreboard } from './Scoreboard';
import styles from './GameDayPage.module.css';

const STEPS = ['Chegada', 'Times', 'Placar', 'Resultado'];
const STEP_INDEX = { arrival: 0, teams: 1, score: 2, end: 3 } as const;
const first = (name: string) => name.split(' ')[0] ?? name;

/** Tela acesa enquanto o placar está aberto (quando o navegador deixa). */
function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;
    let lock: { release: () => Promise<void> } | null = null;
    let alive = true;
    const request = () =>
      (
        navigator as unknown as { wakeLock: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }
      ).wakeLock
        .request('screen')
        .then((l) => {
          if (alive) lock = l;
          else void l.release();
        })
        .catch(() => undefined);
    void request();
    const onVisible = () => document.visibilityState === 'visible' && void request();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      alive = false;
      document.removeEventListener('visibilitychange', onVisible);
      void lock?.release();
    };
  }, [active]);
}

/**
 * Dia de jogo (manual 4.3): um fluxo contínuo em 4 etapas — Chegada, Times, Placar e Resultado (fim da rodada).
 * Tela cheia, sem abas, e funciona sem internet: tudo fica salvo neste celular a cada toque e vai
 * para o servidor quando a conexão voltar.
 */
export function GameDayPage() {
  const { groupId = '', matchId = '' } = useParams();
  const navigate = useNavigate();
  const session = useGameDayStore((s) => s.sessions[matchId]);
  const start = useGameDayStore((s) => s.start);
  const group = useGroup(groupId);
  const sports = useSports();
  const sync = useGameDaySync(matchId);
  const [error, setError] = useState<string | null>(null);
  const leaving = useRef(false);
  const exit = () => navigate(`/organizar/${groupId}/presenca`, { replace: true });

  // Começa o dia (precisa de internet uma vez): a lista de quem pode chegar fica salva no celular.
  // Na primeira vez todo mundo da lista já vem marcado: o organizador só desmarca quem faltou.
  useEffect(() => {
    if (session || leaving.current || !group.data || !sports.data || !navigator.onLine) return;
    let alive = true;
    startLive(matchId)
      .then((state) => {
        if (!alive) return;
        const sport = sports.data.find((s) => s.id === group.data.sportId);
        const fresh = state.arrivedUserIds.length === 0;
        const everyone = state.players.map((p) => p.id);
        start({
          matchId,
          groupId,
          teamSize: sport?.defaultTeamSize ?? 6,
          skills: sport?.skills ?? [],
          arrived: fresh ? everyone : state.arrivedUserIds,
          outbox: fresh ? everyone.map((userId) => ({ kind: 'arrival' as const, userId, arrived: true })) : [],
          players: state.players.map((p) => ({
            id: p.id,
            name: p.name,
            photoUrl: p.photoUrl ?? null,
            level: p.level ?? null,
            skills: p.skills ?? null,
            gender: p.gender ?? null,
            position: p.primaryPosition ?? null,
            membershipType: p.membershipType ?? 'monthly',
            owesCents: p.owesCents ?? null,
          })),
        });
      })
      .catch((e: unknown) => setError(isApiError(e) ? messageFor(e.code) : 'Não deu para começar o dia de jogo.'));
    return () => {
      alive = false;
    };
  }, [session, group.data, sports.data, matchId, groupId, start]);

  // Encerrou: assim que tudo sincronizar, abre o resumo (o Voltar volta para a turma)
  useEffect(() => {
    if (session?.finished && sync.pending === 0) {
      leaving.current = true;
      useGameDayStore.getState().clear(matchId);
      navigate(`/jogos/${matchId}/resumo`, {
        replace: true,
        state: fromState(`/organizar/${groupId}/presenca`, group.data?.name ?? 'Turma'),
      });
    }
  }, [session?.finished, sync.pending, matchId, groupId, navigate, group.data?.name]);

  const blocked =
    error ?? (!session && !sync.online ? 'Abra o dia de jogo uma vez com internet. Depois ele funciona sem.' : null);
  if (blocked)
    return (
      <div className={styles.screen}>
        <NavBar leading={{ label: 'Sair', onClick: exit }} title="Dia de jogo" />
        <EmptyState
          icon={CloudOff}
          title="Não deu para abrir"
          description={blocked}
          action={<Button onClick={exit}>Voltar para a turma</Button>}
        />
      </div>
    );
  if (!session) return <SkeletonList rows={6} label="Abrindo o dia de jogo…" />;

  if (session.finished)
    return (
      <div className={styles.screen}>
        <NavBar leading={{ label: 'Sair', onClick: exit }} title="Dia de jogo" />
        {!sync.online ? (
          <EmptyState
            icon={CloudOff}
            title="Tudo salvo neste celular"
            description={`Faltam ${sync.pending} ${sync.pending === 1 ? 'envio' : 'envios'}. O resumo fica pronto quando a internet voltar.`}
          />
        ) : sync.error ? (
          <EmptyState
            icon={CloudOff}
            title="Ainda não deu para enviar"
            description={`Tudo está salvo neste celular. Faltam ${sync.pending} ${sync.pending === 1 ? 'envio' : 'envios'} e a gente tenta de novo sozinho em alguns segundos.`}
            action={<Button onClick={sync.retry}>Tentar agora</Button>}
          />
        ) : (
          <EmptyState icon={Trophy} title="Fechando o dia…" description="Montando o resumo do dia." />
        )}
      </div>
    );

  return (
    <Flow
      session={session}
      online={sync.online}
      sportId={group.data?.sportId ?? 'volleyball'}
      groupName={group.data?.name ?? ''}
      onExit={exit}
    />
  );
}

function Flow({
  session: s,
  online,
  sportId,
  groupName,
  onExit,
}: {
  session: GameDaySession;
  online: boolean;
  sportId: string;
  groupName: string;
  onExit: () => void;
}) {
  const update = useGameDayStore((st) => st.update);
  const sports = useSports();
  const set = (fn: (s: GameDaySession) => Partial<GameDaySession>) => update(s.matchId, fn);
  const byId = useMemo(() => new Map(s.players.map((p) => [p.id, p])), [s.players]);
  const present = s.players.filter((p) => s.arrived.includes(p.id));
  const skills = s.skills ?? sports.data?.find((x) => x.id === sportId)?.skills ?? [];
  const format = s.format ?? suggestFormat(present.length, s.teamSize);
  useWakeLock(s.step === 'score');
  const [rulesOpen, setRulesOpen] = useState(false);

  const meta = (p: GameDayPlayer) =>
    [MEMBERSHIP_LABEL[p.membershipType], positionLabels(sports.data, sportId, p.position ? [p.position] : [])]
      .filter(Boolean)
      .join(' · ');
  const short = (id: string) => {
    const pos = byId.get(id)?.position;
    return sports.data?.find((x) => x.id === sportId)?.positions.find((x) => x.id === pos)?.short ?? '';
  };

  // ── ações
  const toggleArrival = (id: string) =>
    set((cur) => {
      const arrived = cur.arrived.includes(id);
      return {
        arrived: arrived ? cur.arrived.filter((x) => x !== id) : [...cur.arrived, id],
        outbox: [...cur.outbox, { kind: 'arrival', userId: id, arrived: !arrived }],
      };
    });
  const draw = (fmt = format) => set((cur) => ({ draw: makeDraw(cur, fmt), court: [0, 1], step: 'teams' }));
  const startRound = () =>
    set((cur) =>
      cur.draw
        ? {
            step: 'score',
            score: [0, 0],
            swapped: false,
            scorers: {},
            pointLog: [],
            outbox: [...cur.outbox, { kind: 'draw', draw: cur.draw }],
          }
        : {},
    );
  const endRound = () => set(() => ({ step: 'end', next: 'winner_stays' }));
  const winner: 0 | 1 = s.score[0] > s.score[1] ? 0 : 1;

  /** Guarda a rodada (com quem pontuou) na fila de envio. */
  const recordRound = (cur: GameDaySession) =>
    cur.draw
      ? [
          ...cur.outbox,
          {
            kind: 'round' as const,
            round: {
              clientId: newClientId('rodada'),
              drawClientId: cur.draw.clientId,
              number: cur.rounds.length + 1,
              court: cur.court,
              scores: cur.score,
              scorers: Object.entries(cur.scorers)
                .filter(([, n]) => n > 0)
                .map(([userId, points]) => ({ userId, points })),
            },
          },
        ]
      : cur.outbox;

  const nextRound = () =>
    set((cur) => {
      if (!cur.draw) return {};
      const outbox = recordRound(cur);
      const last = outbox[outbox.length - 1];
      const rounds = last?.kind === 'round' ? [...cur.rounds, last.round] : cur.rounds;
      const base = { rounds, score: [0, 0] as [number, number], scorers: {}, pointLog: [], swapped: false };
      if (cur.next === 'same') return { ...base, outbox, step: 'score' };
      if (cur.next === 'winner_stays') {
        const w = winnerStays(cur.draw, cur.court, cur.score[0] > cur.score[1] ? 0 : 1);
        return {
          ...base,
          draw: w.draw,
          court: w.court,
          outbox: [...outbox, { kind: 'draw', draw: w.draw }],
          step: 'score',
        };
      }
      return {
        ...base,
        outbox,
        draw: makeDraw(cur, cur.format ?? suggestFormat(cur.arrived.length, cur.teamSize)),
        court: [0, 1],
        step: 'teams',
      };
    });
  const endDay = () =>
    set((cur) => {
      const outbox = recordRound(cur);
      return { outbox: [...outbox, { kind: 'finish' }], finished: true };
    });

  const draw0 = s.draw;
  const teamOf = (side: 0 | 1) => s.court[side];
  const winnerIdx = teamOf(winner);
  const loserIdx = teamOf(winner === 0 ? 1 : 0);
  const waitingTeams = draw0 ? draw0.teams.map((_, i) => i).filter((i) => i !== s.court[0] && i !== s.court[1]) : [];
  const entering = draw0
    ? waitingTeams.length
      ? `${teamName(waitingTeams[0] ?? 0)} entra`
      : draw0.bench.length
        ? `${draw0.bench
            .slice(0, draw0.teams[loserIdx]?.length ?? 0)
            .map((id) => first(byId.get(id)?.name ?? ''))
            .join(', ')} ${draw0.bench.length === 1 ? 'entra' : 'entram'}`
        : ''
    : '';

  // Placar: tela cheia e travada, só o jogo (sem barra nem etapas)
  if (s.step === 'score' && draw0)
    return (
      <Scoreboard
        session={s}
        online={online}
        name={(id) => first(byId.get(id)?.name ?? '')}
        short={short}
        onAdd={(pos) => set((cur) => addPoint(cur, pos))}
        onAssign={(pos, id) => set((cur) => assignPoint(cur, pos, id))}
        onRemove={(pos) => set((cur) => removePoint(cur, pos))}
        onSwap={() => set((cur) => ({ swapped: !cur.swapped }))}
        onEnd={endRound}
      />
    );

  return (
    <div className={styles.screen}>
      {!online && (
        <div className={styles.offline} role="status">
          <CloudOff size={16} aria-hidden="true" /> Sem internet · o placar está salvo neste celular
        </div>
      )}
      <NavBar leading={{ label: 'Sair', onClick: onExit }} title="Dia de jogo" />
      <Steps steps={STEPS} current={STEP_INDEX[s.step]} />

      {s.step === 'arrival' && (
        <>
          <div>
            <div className={styles.titleRow}>
              <h1 className={styles.h1}>Quem chegou?</h1>
              <NavIconButton
                label="Regras do sorteio"
                icon={<SlidersHorizontal size={22} aria-hidden="true" />}
                onClick={() => setRulesOpen(true)}
              />
            </div>
            <p className={styles.muted}>
              <b>{present.length}</b> de {s.players.length} ·{' '}
              {formatSummary(format.teamCount, format.playersPerTeam, present.length)}
            </p>
          </div>
          <List flush label="Quem chegou">
            {s.players.map((p) => (
              <CheckRow
                key={p.id}
                on={s.arrived.includes(p.id)}
                onToggle={() => toggleArrival(p.id)}
                title={first(p.name)}
                meta={meta(p)}
                trailing={p.owesCents ? <Badge tone="warning">Deve {formatMoneyShort(p.owesCents)}</Badge> : undefined}
              />
            ))}
          </List>
          <AddMissing
            session={s}
            sportId={sportId}
            onAdd={(p) =>
              set((cur) => ({
                players: [...cur.players, p],
                arrived: [...cur.arrived, p.id],
                outbox: [
                  ...cur.outbox,
                  { kind: 'add', userId: p.id },
                  { kind: 'arrival', userId: p.id, arrived: true },
                ],
              }))
            }
          />
          <Sheet
            open={rulesOpen}
            onClose={() => setRulesOpen(false)}
            title="Regras do sorteio"
            action={{ label: 'OK', onClick: () => setRulesOpen(false) }}
          >
            <p className={styles.muted}>
              {formatSummary(format.teamCount, format.playersPerTeam, present.length)} · {criteriaText(s.criteria)}
            </p>
            <DrawSettings
              format={format}
              presentCount={present.length}
              criteria={s.criteria}
              skills={skills}
              onFormat={(f) => set(() => ({ format: f }))}
              onCriteria={(criteria) => set(() => ({ criteria }))}
            />
          </Sheet>
          <div className={styles.dock}>
            <Button block disabled={present.length < 2} onClick={() => draw()}>
              Sortear times com {present.length}
            </Button>
          </div>
        </>
      )}

      {s.step === 'teams' && draw0 && (
        <TeamsStep
          session={s}
          skills={skills}
          short={short}
          name={(id) => first(byId.get(id)?.name ?? '')}
          presentCount={present.length}
          onCriteria={(criteria) =>
            update(s.matchId, (cur) => ({ criteria, draw: makeDraw({ ...cur, criteria }, cur.format ?? format) }))
          }
          onFormat={(f) => update(s.matchId, (cur) => ({ format: f, draw: makeDraw(cur, f) }))}
          onRedraw={() => draw(s.format ?? format)}
          onStart={startRound}
          onBack={() => set(() => ({ step: 'arrival' }))}
        />
      )}

      {s.step === 'end' && draw0 && (
        <EndStep
          session={s}
          winnerIdx={winnerIdx}
          loserIdx={loserIdx}
          entering={entering}
          name={(id) => first(byId.get(id)?.name ?? '')}
          onScorers={(scorers) => set(() => ({ scorers }))}
          onNext={(next) => set(() => ({ next }))}
          onStart={nextRound}
          onEnd={endDay}
          groupName={groupName}
        />
      )}
    </div>
  );
}

function AddMissing({
  session,
  sportId,
  onAdd,
}: {
  session: GameDaySession;
  sportId: string;
  onAdd: (p: GameDayPlayer) => void;
}) {
  const demo = isDemoActive();
  const members = useMembers(session.groupId);
  const [open, setOpen] = useState(false);
  const known = new Set(session.players.map((p) => p.id));
  const others = (members.data ?? []).filter((m) => !known.has(m.user.id));
  return (
    <>
      <Button variant="ghost" block icon={<UserPlus size={18} aria-hidden="true" />} onClick={() => setOpen(true)}>
        Adicionar quem não estava na lista
      </Button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Quem chegou sem estar na lista" closeLabel="Fechar">
        {/* Demonstração: dá para incluir alguém novo só pelo nome, sem conta */}
        {demo && (
          <Section title="Pessoa nova">
            <AddPersonForm
              groupId={session.groupId}
              sportId={sportId}
              submitLabel="Adicionar e marcar que chegou"
              onAdded={(m) => {
                onAdd({
                  id: m.user.id,
                  name: m.user.name,
                  photoUrl: m.user.photoUrl ?? null,
                  level: m.level ?? null,
                  skills: m.skills ?? null,
                  gender: m.gender ?? null,
                  position: m.user.primaryPosition ?? null,
                  membershipType: m.type,
                  owesCents: null,
                });
                toast(`${first(m.user.name)} chegou.`, { tone: 'success' });
                setOpen(false);
              }}
            />
          </Section>
        )}
        {(() => {
          const list = members.isPending ? (
            <SkeletonList rows={3} />
          ) : others.length === 0 ? (
            !demo && <p>Todo mundo da turma já está na lista.</p>
          ) : (
            <List>
              {others.map((m) => (
                <ListItem
                  key={m.id}
                  leading={<Avatar name={m.user.name} id={m.user.id} src={m.user.photoUrl} decorative />}
                  title={m.user.name}
                  meta={MEMBERSHIP_LABEL[m.type]}
                  onClick={() => {
                    onAdd({
                      id: m.user.id,
                      name: m.user.name,
                      photoUrl: m.user.photoUrl ?? null,
                      level: m.level ?? null,
                      skills: m.skills ?? null,
                      gender: m.gender ?? null,
                      position: m.user.primaryPosition ?? null,
                      membershipType: m.type,
                      owesCents: null,
                    });
                    toast(`${first(m.user.name)} chegou.`, { tone: 'success' });
                  }}
                />
              ))}
            </List>
          );
          // na demonstração, a lista da turma vem depois de "Pessoa nova", com título
          return demo && others.length > 0 ? <Section title="Da turma">{list}</Section> : list;
        })()}
      </Sheet>
    </>
  );
}

/** "Equilibra nível, gênero e posição" — os critérios ligados, numa linha. */
function criteriaText(c: GameDaySession['criteria']) {
  const level = c.levelBy === 'skills' ? 'fundamentos' : 'nível';
  const on = [c.level && level, c.gender && 'gênero', c.position && 'posição'].filter(Boolean) as string[];
  if (on.length === 0) return 'Sorteio livre, sem critérios';
  return `Equilibra ${on.length === 1 ? on[0] : `${on.slice(0, -1).join(', ')} e ${on.at(-1)}`}`;
}

/** Ajustes do sorteio (formato e critérios), na Chegada e em Times. */
function DrawSettings({
  format,
  presentCount,
  criteria,
  skills,
  onFormat,
  onCriteria,
}: {
  format: { teamCount: number; playersPerTeam: number };
  presentCount: number;
  criteria: GameDaySession['criteria'];
  /** Fundamentos da modalidade: com eles, dá para equilibrar por fundamentos (RN-103a). */
  skills: GameDaySkill[];
  onFormat: (f: { teamCount: number; playersPerTeam: number }) => void;
  onCriteria: (c: GameDaySession['criteria']) => void;
}) {
  return (
    <div className={styles.adjust}>
      <div className={styles.row}>
        <span className={styles.bold}>Times</span>
        <Stepper
          label="Número de times"
          value={format.teamCount}
          min={2}
          max={8}
          onChange={(v) =>
            onFormat({
              teamCount: v,
              playersPerTeam: Math.max(1, Math.min(format.playersPerTeam, Math.floor(presentCount / v))),
            })
          }
        />
      </div>
      <div className={styles.row}>
        <span className={styles.bold}>Por time</span>
        <Stepper
          label="Jogadores por time"
          value={format.playersPerTeam}
          min={1}
          max={12}
          onChange={(v) => onFormat({ teamCount: format.teamCount, playersPerTeam: v })}
        />
      </div>
      <Switch
        label="Equilibrar por nível"
        checked={criteria.level}
        onCheckedChange={(v) => onCriteria({ ...criteria, level: v })}
      />
      {criteria.level && skills.length > 0 && (
        <div className={styles.levelBy}>
          <SegmentedControl
            label="Equilibrar o nível por"
            options={[
              { value: 'overall', label: 'Nível geral' },
              { value: 'skills', label: 'Fundamentos' },
            ]}
            value={criteria.levelBy ?? 'overall'}
            onChange={(v) => onCriteria({ ...criteria, levelBy: v })}
          />
          <span className={styles.levelByHelp}>
            {criteria.levelBy === 'skills'
              ? `Equilibra cada fundamento entre os times: ${skills.map((k) => k.label.toLowerCase()).join(', ')}.`
              : 'Usa o nível de cada um (1 a 5) para deixar os times parelhos.'}
          </span>
        </div>
      )}
      <Switch
        label="Equilibrar por gênero"
        checked={criteria.gender}
        onCheckedChange={(v) => onCriteria({ ...criteria, gender: v })}
      />
      <Switch
        label="Espalhar as posições"
        description="Evita juntar a mesma posição num time"
        checked={criteria.position}
        onCheckedChange={(v) => onCriteria({ ...criteria, position: v })}
      />
    </div>
  );
}

function TeamsStep({
  session: s,
  skills,
  short,
  name,
  presentCount,
  onCriteria,
  onFormat,
  onRedraw,
  onStart,
  onBack,
}: {
  session: GameDaySession;
  skills: GameDaySkill[];
  short: (id: string) => string;
  name: (id: string) => string;
  presentCount: number;
  onCriteria: (c: GameDaySession['criteria']) => void;
  onFormat: (f: { teamCount: number; playersPerTeam: number }) => void;
  onRedraw: () => void;
  onStart: () => void;
  onBack: () => void;
}) {
  const [adjust, setAdjust] = useState(false);
  const d = s.draw;
  if (!d) return null;
  const present = s.players.filter((p) => s.arrived.includes(p.id));
  const bench = d.bench.map(name);
  const bySkills = s.criteria.level && s.criteria.levelBy === 'skills' && skills.length > 0;
  const skillIds = skills.map((k) => k.id);
  return (
    <>
      <div className={styles.summary}>
        <div>
          <p className={styles.bold}>{formatSummary(d.teams.length, d.playersPerTeam, presentCount)}</p>
          {bench.length > 0 && (
            <p className={styles.muted}>
              {bench.join(', ')} {bench.length === 1 ? 'fica de fora e entra' : 'ficam de fora e entram'} na próxima
            </p>
          )}
        </div>
        <Button variant="secondary" size="sm" aria-expanded={adjust} onClick={() => setAdjust((v) => !v)}>
          Ajustar
        </Button>
      </div>
      {adjust && (
        <DrawSettings
          format={{ teamCount: d.teams.length, playersPerTeam: d.playersPerTeam }}
          presentCount={presentCount}
          criteria={s.criteria}
          skills={skills}
          onFormat={onFormat}
          onCriteria={onCriteria}
        />
      )}
      {d.teams.map((team, i) => (
        <Section
          key={i}
          title={
            <span className={styles.teamHead}>
              <TeamTag index={i} letter={teamLetter(i)} /> {teamName(i)}
            </span>
          }
          aside={s.criteria.level && !bySkills ? `nível ${teamLevel(team, present)}` : undefined}
        >
          {bySkills && (
            <p className={styles.teamSkills} aria-label={`Médias do ${teamName(i)} nos fundamentos`}>
              {teamSkills(team, present, skillIds).map((avg, k) => (
                <span key={skillIds[k]} className={styles.skillChip}>
                  {skills[k]?.short} <b>{avg.toLocaleString('pt-BR')}</b>
                </span>
              ))}
            </p>
          )}
          <List>
            {team.map((id) => (
              <ListItem key={id} inline title={name(id)} trailing={<span className={styles.muted}>{short(id)}</span>} />
            ))}
          </List>
        </Section>
      ))}
      <p className={styles.footnote}>Só você vê os times.</p>
      <Button variant="ghost" onClick={onBack}>
        Voltar para a chegada
      </Button>
      <div className={`${styles.dock} ${styles.pair}`}>
        <Button variant="secondary" onClick={onRedraw}>
          Sortear de novo
        </Button>
        <Button onClick={onStart}>Começar</Button>
      </div>
    </>
  );
}

function EndStep({
  session: s,
  winnerIdx,
  loserIdx,
  entering,
  name,
  onScorers,
  onNext,
  onStart,
  onEnd,
  groupName,
}: {
  session: GameDaySession;
  winnerIdx: number;
  loserIdx: number;
  entering: string;
  name: (id: string) => string;
  onScorers: (s: Record<string, number>) => void;
  onNext: (n: NextRound) => void;
  onStart: () => void;
  onEnd: () => void;
  groupName: string;
}) {
  const [scorersOpen, setScorersOpen] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const d = s.draw;
  if (!d) return null;
  const hi = Math.max(...s.score);
  const lo = Math.min(...s.score);
  const scored = Object.entries(s.scorers).filter(([, n]) => n > 0);
  const onCourt = [...(d.teams[s.court[0]] ?? []), ...(d.teams[s.court[1]] ?? [])];
  const options: Array<{ value: NextRound; title: string; detail: string }> = [
    {
      value: 'winner_stays',
      title: `${teamName(winnerIdx)} fica`,
      detail: entering
        ? `${teamName(loserIdx)} sai e ${entering}`
        : `Ninguém de fora: ${teamName(loserIdx)} joga de novo`,
    },
    { value: 'same', title: 'Mesmos times', detail: 'Joga de novo do jeito que está' },
    { value: 'redraw', title: 'Sortear de novo', detail: 'Entre todos que estão aqui' },
  ];
  return (
    <>
      <div className={styles.result}>
        <span className={styles.trophy} style={{ background: teamColor(winnerIdx) }}>
          <Trophy size={30} aria-hidden="true" />
        </span>
        <h1 className={styles.h1}>
          {teamLetter(winnerIdx)} · {teamName(winnerIdx)} venceu
        </h1>
        <p className={styles.muted}>
          {hi} × {lo}
        </p>
      </div>
      <List>
        <ListItem
          title="Quem pontuou"
          meta={scored.length ? scored.map(([id, n]) => `${name(id)} ${n}`).join(', ') : 'Opcional'}
          onClick={() => setScorersOpen(true)}
        />
      </List>
      <Section title="Próxima rodada">
        <List flush label="Próxima rodada">
          {options.map((o) => (
            <CheckRow
              key={o.value}
              radio
              on={s.next === o.value}
              onToggle={() => onNext(o.value)}
              title={o.title}
              meta={o.detail}
            />
          ))}
        </List>
      </Section>
      <div className={styles.dock}>
        <Button block onClick={onStart}>
          Começar próxima rodada
        </Button>
        <Button variant="ghost" block onClick={() => setConfirmEnd(true)}>
          Encerrar o dia de jogo
        </Button>
      </div>
      {confirmEnd && (
        <ConfirmSheet
          open
          onClose={() => setConfirmEnd(false)}
          title="Encerrar o dia?"
          tone="primary"
          leading={
            <span className={styles.trophy} style={{ background: teamColor(winnerIdx) }}>
              <Trophy size={30} aria-hidden="true" />
            </span>
          }
          consequences={[
            `${s.rounds.length + 1} ${s.rounds.length + 1 === 1 ? 'rodada registrada' : 'rodadas registradas'}, contando esta.`,
            groupName
              ? `O resumo do dia, com o destaque, vai para todos da turma ${groupName}.`
              : 'O resumo do dia, com o destaque, vai para todos da turma.',
            'Depois disso, não dá para registrar mais rodadas neste jogo.',
          ]}
          actionLabel="Encerrar e enviar o resumo"
          onConfirm={() => {
            setConfirmEnd(false);
            onEnd();
          }}
        />
      )}
      <Sheet
        open={scorersOpen}
        onClose={() => setScorersOpen(false)}
        title="Quem pontuou"
        closeLabel="Fechar"
        action={{ label: 'OK', onClick: () => setScorersOpen(false) }}
      >
        <p className={styles.muted}>Opcional. Conta para o desempate do destaque do dia.</p>
        <List>
          {onCourt.map((id) => (
            <ListItem
              key={id}
              inline
              title={name(id)}
              trailing={
                <Stepper
                  label={`Pontos de ${name(id)}`}
                  value={s.scorers[id] ?? 0}
                  min={0}
                  max={99}
                  onChange={(v) => onScorers({ ...s.scorers, [id]: v })}
                />
              }
            />
          ))}
        </List>
      </Sheet>
    </>
  );
}
