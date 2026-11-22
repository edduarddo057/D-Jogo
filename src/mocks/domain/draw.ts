import { drawTeams } from '@/features/live/utils/draw';
import { findUser, membershipOf, newId, nowIso, type DbLiveDraw, type DrawCriteria } from '../db';

const TEAM_NAMES = ['Time A', 'Time B', 'Time C', 'Time D', 'Time E', 'Time F', 'Time G', 'Time H'];

export interface LiveDrawRequest {
  matchId: string;
  groupId: string;
  playerIds: string[];
  teamCount: number;
  playersPerTeam: number;
  criteria: DrawCriteria;
}

/** Sorteio do dia de jogo no servidor (RN-102, RN-103): a mesma regra que roda no aparelho. */
export function liveDraw(req: LiveDrawRequest, random: () => number = Math.random): Omit<DbLiveDraw, 'clientId'> {
  const players = req.playerIds.map((id) => ({
    id,
    level: membershipOf(req.groupId, id)?.level ?? null,
    gender: findUser(id)?.gender ?? null,
    position: findUser(id)?.sportProfile?.positions[0] ?? null,
  }));
  const { teams, bench } = drawTeams(players, req.teamCount, req.playersPerTeam, req.criteria, random);
  return {
    id: newId('ld'),
    matchId: req.matchId,
    createdAt: nowIso(),
    teamCount: req.teamCount,
    playersPerTeam: req.playersPerTeam,
    criteria: req.criteria,
    teams: teams.map((memberIds, i) => ({
      id: newId('lt'),
      name: TEAM_NAMES[i] ?? `Time ${i + 1}`,
      colorIndex: i,
      memberIds,
    })),
    bench,
  };
}
