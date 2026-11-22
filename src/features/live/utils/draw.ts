/**
 * Sorteio do dia de jogo (RN-102, RN-103), sem React e sem rede: roda no aparelho do organizador,
 * para o dia de jogo funcionar sem internet (RN-109), e o servidor usa a mesma regra para conferir.
 *
 * Critérios combinados:
 * 1. Gênero: separa em feminino, masculino e sem gênero; cada grupo é distribuído por vez,
 *    continuando de onde o anterior parou, para cada time receber o mesmo número de cada.
 * 2. Nível: dentro de cada grupo, do maior para o menor, em serpentina (A, B, B, A…). Sem nível = 3.
 * 3. Posição: troca jogadores de mesmo nível entre times para não concentrar a mesma posição.
 * Vagas = times × jogadores; quem passar fica de fora (escolhido ao acaso, nunca pelo nível).
 */
export interface DrawPlayer {
  id: string;
  level: number | null;
  gender: 'male' | 'female' | null;
  position: string | null;
}
export interface DrawCriteriaInput {
  level: boolean;
  gender: boolean;
  position: boolean;
}
export interface DrawResult {
  teams: string[][];
  bench: string[];
}

export const DEFAULT_LEVEL = 3;

function shuffle<T>(items: T[], random: () => number): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j] as T, a[i] as T];
  }
  return a;
}

export function drawTeams(
  players: DrawPlayer[],
  teamCount: number,
  playersPerTeam: number,
  criteria: DrawCriteriaInput,
  random: () => number = Math.random,
): DrawResult {
  const byId = new Map(players.map((p) => [p.id, p]));
  const level = (id: string) => byId.get(id)?.level ?? DEFAULT_LEVEL;
  const gender = (id: string) => byId.get(id)?.gender ?? null;
  const position = (id: string) => byId.get(id)?.position ?? null;

  const slots = teamCount * playersPerTeam;
  const shuffled = shuffle(
    players.map((p) => p.id),
    random,
  );
  const playing = shuffled.slice(0, slots);
  const bench = shuffled.slice(slots);

  const byLevel = (ids: string[]) => (criteria.level ? [...ids].sort((a, b) => level(b) - level(a)) : ids);
  const buckets = criteria.gender
    ? [
        playing.filter((id) => gender(id) === 'female'),
        playing.filter((id) => gender(id) === 'male'),
        playing.filter((id) => !gender(id)),
      ]
    : [playing];

  const teams: string[][] = Array.from({ length: teamCount }, () => []);
  let cursor = 0;
  for (const bucket of buckets) {
    const ordered = byLevel(bucket);
    ordered.forEach((id, i) => {
      const round = Math.floor((cursor + i) / teamCount);
      const k = (cursor + i) % teamCount;
      const index = criteria.level && round % 2 === 1 ? teamCount - 1 - k : k;
      teams[index]?.push(id);
    });
    cursor += ordered.length;
  }

  if (criteria.position) {
    const count = (team: string[], pos: string | null) => team.filter((id) => position(id) === pos).length;
    const total = teams.reduce((n, t) => n + t.length, 0);
    const limit = Math.max(1, Math.ceil(total / teams.length / 2));
    for (let pass = 0; pass < 20; pass += 1) {
      let changed = false;
      for (const team of teams) {
        for (const id of [...team]) {
          const pos = position(id);
          if (!pos || count(team, pos) <= limit) continue;
          for (const other of teams) {
            if (other === team) continue;
            const swap = other.find(
              (o) =>
                position(o) !== pos &&
                level(o) === level(id) &&
                gender(o) === gender(id) &&
                count(other, pos) < limit &&
                count(team, position(o)) < limit,
            );
            if (swap) {
              team[team.indexOf(id)] = swap;
              other[other.indexOf(swap)] = id;
              changed = true;
              break;
            }
          }
        }
      }
      if (!changed) break;
    }
  }
  return { teams, bench };
}

/** Soma de níveis de um time ("nível 13"). */
export const teamLevel = (ids: string[], players: DrawPlayer[]) =>
  ids.reduce((sum, id) => sum + (players.find((p) => p.id === id)?.level ?? DEFAULT_LEVEL), 0);

/**
 * Sugestão automática a partir de quem chegou (manual 4.3): o tamanho padrão da modalidade
 * quando dá; senão, dois times com o máximo de gente. Ex.: 13 no vôlei → "2 times de 6 · 1 de fora".
 */
export function suggestFormat(present: number, defaultTeamSize: number): { teamCount: number; playersPerTeam: number } {
  if (present < 2) return { teamCount: 2, playersPerTeam: 1 };
  const size = Math.max(1, defaultTeamSize);
  if (present >= size * 2) {
    const teamCount = Math.min(8, Math.max(2, Math.floor(present / size)));
    return { teamCount, playersPerTeam: size };
  }
  return { teamCount: 2, playersPerTeam: Math.floor(present / 2) };
}

/** "2 times de 6 · 1 de fora". */
export function formatSummary(teamCount: number, playersPerTeam: number, present: number) {
  const out = Math.max(0, present - teamCount * playersPerTeam);
  const base = `${teamCount} times de ${playersPerTeam}`;
  return out > 0 ? `${base} · ${out} de fora` : base;
}
