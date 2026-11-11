import { findUser, newId, participationsOf, type DbDraw, type DbDrawTemplate, type DbMatch } from '../db';

type TemplateRules = DbDraw['template'];
const TEAM_NAMES = ['Time A', 'Time B', 'Time C', 'Time D', 'Time E', 'Time F', 'Time G', 'Time H'];

const levelOf = (userId: string) => findUser(userId)?.sportProfile?.level ?? 3;
const positionOf = (userId: string) => findUser(userId)?.sportProfile?.positions[0] ?? null;

function shuffle<T>(items: T[], random: () => number): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j] as T, a[i] as T];
  }
  return a;
}

/**
 * Sorteio base do MVP (RN-51 a RN-53):
 * 1. ordena os confirmados por nível (maior → menor), desempate aleatório;
 * 2. serpentina A, B, C, C, B, A… quando equilibra por nível; senão embaralha;
 * 3. distribui posições trocando jogadores de mesmo nível entre times;
 * 4. quem passa de times × jogadores vai para o banco (`bench`) ou é espalhado (`spread`).
 */
export function drawTeams(match: DbMatch, template: TemplateRules, random: () => number = Math.random): DbDraw {
  const confirmed = participationsOf(match.id)
    .filter((p) => p.status === 'confirmed')
    .map((p) => p.userId);

  const ordered = template.balanceByLevel
    ? shuffle(confirmed, random).sort((a, b) => levelOf(b) - levelOf(a))
    : shuffle(confirmed, random);

  const slots = template.teamCount * template.playersPerTeam;
  const starters = template.extraPlayers === 'bench' ? ordered.slice(0, slots) : ordered;
  const bench = template.extraPlayers === 'bench' ? ordered.slice(slots) : [];

  const teams: DbDraw['teams'] = Array.from({ length: template.teamCount }, (_, i) => ({
    id: `t${i + 1}`,
    name: TEAM_NAMES[i] ?? `Time ${i + 1}`,
    members: [],
  }));

  starters.forEach((userId, i) => {
    const round = Math.floor(i / template.teamCount);
    const k = i % template.teamCount;
    const index = template.balanceByLevel && round % 2 === 1 ? template.teamCount - 1 - k : k;
    teams[index]?.members.push({ userId, position: positionOf(userId), isReserve: false });
  });

  let positionsUnbalanced = false;
  if (template.distributePositions) positionsUnbalanced = !spreadPositions(teams, starters.length);

  // banco: reservas distribuídos entre os times, um por vez
  bench.forEach((userId, i) => {
    teams[i % template.teamCount]?.members.push({ userId, position: positionOf(userId), isReserve: true });
  });

  const warnings: DbDraw['warnings'] = [];
  if (confirmed.length < slots) warnings.push('fewer_players_than_template');
  if (positionsUnbalanced) warnings.push('positions_unbalanced');

  return { id: newId('dr'), matchId: match.id, status: 'draft', template, teams, warnings, publishedAt: null };
}

/** Troca jogadores de mesmo nível até cada time ter no máximo ⌈n/times⌉ de cada posição. */
function spreadPositions(teams: DbDraw['teams'], players: number): boolean {
  const limit = Math.ceil(players / teams.length / 2) || 1; // por posição, por time
  const count = (t: DbDraw['teams'][number], pos: string | null) => t.members.filter((m) => m.position === pos).length;
  for (let pass = 0; pass < 20; pass += 1) {
    let changed = false;
    for (const team of teams) {
      for (const member of team.members) {
        if (!member.position || count(team, member.position) <= limit) continue;
        // procura em outro time alguém de mesmo nível e outra posição, onde a posição dele falte
        for (const other of teams) {
          if (other === team) continue;
          const swap = other.members.find(
            (o) =>
              o.position !== member.position &&
              levelOf(o.userId) === levelOf(member.userId) &&
              count(other, member.position) < limit &&
              count(team, o.position) < limit,
          );
          if (swap) {
            team.members[team.members.indexOf(member)] = swap;
            other.members[other.members.indexOf(swap)] = member;
            changed = true;
            break;
          }
        }
      }
    }
    if (!changed) break;
  }
  return teams.every((t) => t.members.every((m) => !m.position || count(t, m.position) <= limit + 1));
}

export const templateRules = (t: DbDrawTemplate): TemplateRules => ({
  name: t.name,
  teamCount: t.teamCount,
  playersPerTeam: t.playersPerTeam,
  balanceByLevel: t.balanceByLevel,
  distributePositions: t.distributePositions,
  extraPlayers: t.extraPlayers,
});
