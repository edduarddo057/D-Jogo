import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { drawTeams, type DrawCriteriaInput, type DrawPlayer } from '../utils/draw';

/**
 * Dia de jogo no aparelho do organizador (manual 1.9 e 4.3): tudo fica salvo no celular a cada toque
 * e funciona sem internet. O que precisa ir para o servidor entra numa fila (`outbox`) e é enviado
 * quando a conexão volta, com ids gerados aqui para não duplicar (RN-109).
 */
export interface GameDayPlayer extends DrawPlayer {
  name: string;
  photoUrl: string | null;
  membershipType: 'monthly' | 'drop_in';
  owesCents: number | null;
}

export type GameDayStep = 'arrival' | 'teams' | 'score' | 'end';
export type NextRound = 'winner_stays' | 'same' | 'redraw';

export interface GameDayDraw {
  clientId: string;
  teamCount: number;
  playersPerTeam: number;
  criteria: DrawCriteriaInput;
  teams: string[][];
  bench: string[];
}

export interface GameDayRound {
  clientId: string;
  drawClientId: string;
  number: number;
  /** Índices dos dois times em quadra dentro do sorteio. */
  court: [number, number];
  scores: [number, number];
  scorers: Array<{ userId: string; points: number }>;
}

export interface PointEvent {
  pos: 0 | 1;
  userId: string | null;
}

export type OutboxOp =
  | { kind: 'arrival'; userId: string; arrived: boolean }
  | { kind: 'add'; userId: string }
  | { kind: 'draw'; draw: GameDayDraw }
  | { kind: 'round'; round: GameDayRound }
  | { kind: 'finish' };

export interface GameDaySession {
  matchId: string;
  groupId: string;
  teamSize: number;
  players: GameDayPlayer[];
  arrived: string[];
  step: GameDayStep;
  criteria: DrawCriteriaInput;
  /** null = sugestão automática pelos que chegaram. */
  format: { teamCount: number; playersPerTeam: number } | null;
  draw: GameDayDraw | null;
  /** Times em quadra (índices em draw.teams). */
  court: [number, number];
  /** Lados trocados no placar. */
  swapped: boolean;
  score: [number, number];
  rounds: GameDayRound[];
  next: NextRound;
  scorers: Record<string, number>;
  /**
   * Pontos da rodada em ordem: de que lado da quadra (0/1, como em `score`) e quem fez (null = sem nome).
   * O "−1" desfaz o último ponto daquele lado e tira também de quem tinha recebido.
   */
  pointLog?: PointEvent[];
  outbox: OutboxOp[];
  /** Ids do servidor para os sorteios já enviados: clientId → { drawId, teamIds }. */
  synced: Record<string, { drawId: string; teamIds: string[] }>;
  finished: boolean;
}

interface GameDayState {
  sessions: Record<string, GameDaySession>;
  start: (
    s: Pick<GameDaySession, 'matchId' | 'groupId' | 'teamSize' | 'players'> & {
      arrived?: string[];
      /** Envios que já nascem na fila (ex.: a chegada pré-marcada). Só numa sessão nova. */
      outbox?: OutboxOp[];
    },
  ) => void;
  update: (matchId: string, fn: (s: GameDaySession) => Partial<GameDaySession>) => void;
  clear: (matchId: string) => void;
}

export const newClientId = (prefix: string) =>
  `${prefix}-${typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;

const memoryStorage = () => {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  };
};

export const useGameDayStore = create<GameDayState>()(
  persist(
    (set) => ({
      sessions: {},
      start: ({ arrived = [], outbox = [], ...s }) =>
        set((state) => {
          const existing = state.sessions[s.matchId];
          if (existing && !existing.finished) {
            // já começou neste celular: só atualiza a lista de quem pode chegar
            const known = new Set(existing.players.map((p) => p.id));
            return {
              sessions: {
                ...state.sessions,
                [s.matchId]: {
                  ...existing,
                  players: [...existing.players, ...s.players.filter((p) => !known.has(p.id))],
                },
              },
            };
          }
          return {
            sessions: {
              ...state.sessions,
              [s.matchId]: {
                ...s,
                arrived,
                step: 'arrival',
                criteria: { level: true, gender: true, position: true },
                format: null,
                draw: null,
                court: [0, 1],
                swapped: false,
                score: [0, 0],
                rounds: [],
                next: 'winner_stays',
                scorers: {},
                pointLog: [],
                outbox,
                synced: {},
                finished: false,
              },
            },
          };
        }),
      update: (matchId, fn) =>
        set((state) => {
          const s = state.sessions[matchId];
          if (!s) return state;
          return { sessions: { ...state.sessions, [matchId]: { ...s, ...fn(s) } } };
        }),
      clear: (matchId) =>
        set((state) => {
          const { [matchId]: _gone, ...rest } = state.sessions;
          return { sessions: rest };
        }),
    }),
    {
      name: 'dajogo:dia-de-jogo',
      storage: createJSONStorage(() => {
        try {
          return window.localStorage;
        } catch {
          return memoryStorage();
        }
      }),
    },
  ),
);

/** Sorteia entre quem chegou, com os critérios da sessão. */
export function makeDraw(s: GameDaySession, format: { teamCount: number; playersPerTeam: number }): GameDayDraw {
  const present = s.players.filter((p) => s.arrived.includes(p.id));
  const { teams, bench } = drawTeams(present, format.teamCount, format.playersPerTeam, s.criteria);
  return { clientId: newClientId('sorteio'), ...format, criteria: s.criteria, teams, bench };
}

/**
 * "Vencedor fica" (manual 4.3): o vencedor continua; quem estava de fora entra primeiro e o
 * time que perdeu completa o desafiante. Com 3 times ou mais, o próximo time da fila entra.
 */
export function winnerStays(
  draw: GameDayDraw,
  court: [number, number],
  winner: 0 | 1,
): { draw: GameDayDraw; court: [number, number] } {
  const winnerIdx = court[winner];
  const loserIdx = court[winner === 0 ? 1 : 0];
  const winnerTeam = draw.teams[winnerIdx] ?? [];
  const loserTeam = draw.teams[loserIdx] ?? [];
  const waiting = draw.teams.filter((_, i) => i !== winnerIdx && i !== loserIdx);
  if (waiting.length > 0) {
    // fila de times: o primeiro que esperava entra, quem perdeu vai para o fim da fila
    const teams = [winnerTeam, ...waiting, loserTeam];
    return { draw: { ...draw, clientId: newClientId('sorteio'), teams, bench: draw.bench }, court: [0, 1] };
  }
  const pool = [...draw.bench, ...loserTeam];
  const size = loserTeam.length;
  const challenger = pool.slice(0, size);
  const bench = pool.slice(size);
  return { draw: { ...draw, clientId: newClientId('sorteio'), teams: [winnerTeam, challenger], bench }, court: [0, 1] };
}

/** Quem entra e quem sai no "vencedor fica" (para o texto da opção). */
export function winnerStaysPreview(draw: GameDayDraw, court: [number, number], winner: 0 | 1) {
  const loserIdx = court[winner === 0 ? 1 : 0];
  const waiting = draw.teams.findIndex((_, i) => i !== court[0] && i !== court[1]);
  return {
    loserIdx,
    enteringTeam: waiting >= 0 ? waiting : null,
    enteringPlayers: waiting >= 0 ? [] : draw.bench.slice(0, draw.teams[loserIdx]?.length ?? 0),
  };
}

/** +1 para um lado da quadra (quem fez entra depois, em `assignPoint`). */
export function addPoint(s: GameDaySession, pos: 0 | 1): Partial<GameDaySession> {
  const score: [number, number] = [...s.score];
  score[pos] += 1;
  return { score, pointLog: [...(s.pointLog ?? []), { pos, userId: null }] };
}

/** Diz quem fez o último ponto daquele lado (se ainda estiver sem nome). */
export function assignPoint(s: GameDaySession, pos: 0 | 1, userId: string): Partial<GameDaySession> {
  const log = [...(s.pointLog ?? [])];
  const i = log.map((e) => e.pos).lastIndexOf(pos);
  const last = log[i];
  if (!last || last.userId) return {};
  log[i] = { pos, userId };
  return { pointLog: log, scorers: { ...s.scorers, [userId]: (s.scorers[userId] ?? 0) + 1 } };
}

/** −1: tira o último ponto daquele lado e, se tinha nome, tira também dessa pessoa. */
export function removePoint(s: GameDaySession, pos: 0 | 1): Partial<GameDaySession> {
  if (s.score[pos] === 0) return {};
  const score: [number, number] = [...s.score];
  score[pos] -= 1;
  const log = [...(s.pointLog ?? [])];
  const i = log.map((e) => e.pos).lastIndexOf(pos);
  const last = i >= 0 ? log.splice(i, 1)[0] : undefined;
  const scorers = { ...s.scorers };
  if (last?.userId) scorers[last.userId] = Math.max(0, (scorers[last.userId] ?? 0) - 1);
  return { score, pointLog: log, scorers };
}
