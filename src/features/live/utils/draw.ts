/**
 * Sorteio do dia de jogo (RN-102, RN-103, RN-103a), sem React e sem rede: roda no aparelho do
 * organizador, para o dia de jogo funcionar sem internet (RN-109), e o servidor usa a mesma regra.
 *
 * Critérios combinados:
 * 1. Gênero: separa em feminino, masculino e sem gênero; cada grupo é distribuído por vez,
 *    continuando de onde o anterior parou, para cada time receber o mesmo número de cada.
 * 2. Nível, de dois jeitos (RN-103a):
 *    - nível geral: dentro de cada grupo, do maior para o menor, em serpentina (A, B, B, A…);
 *    - fundamentos: cada pessoa vai para o time onde menos desequilibra a soma de cada fundamento
 *      (saque, recepção…), e depois trocas entre times enquanto melhoram o equilíbrio.
 * 3. Posição: evita concentrar a mesma posição num time.
 * Vagas = times × jogadores; quem passar fica de fora (escolhido ao acaso, nunca pelo nível).
 */
export interface DrawPlayer {
  id: string;
  level: number | null;
  gender: 'male' | 'female' | null;
  position: string | null;
  /** Notas de 1 a 10 nos fundamentos (RN-17a); sem nota = nível geral × 2. */
  skills?: Record<string, number> | null;
}
export interface DrawCriteriaInput {
  level: boolean;
  gender: boolean;
  position: boolean;
  /** Com `level`: nível geral (padrão) ou fundamentos (RN-103a). */
  levelBy?: 'overall' | 'skills';
}
export interface DrawResult {
  teams: string[][];
  bench: string[];
}

export const DEFAULT_LEVEL = 3;

/** Nível geral: o do organizador; sem ele, a média dos fundamentos ÷ 2 (1 a 5); sem nada, 3 (RN-17a). */
export function overallOf(p: Pick<DrawPlayer, 'level' | 'skills'> | undefined): number {
  if (!p) return DEFAULT_LEVEL;
  if (p.level) return p.level;
  const notes = Object.values(p.skills ?? {}).filter((n) => typeof n === 'number');
  if (notes.length === 0) return DEFAULT_LEVEL;
  const avg = notes.reduce((a, b) => a + b, 0) / notes.length;
  return Math.min(5, Math.max(1, Math.round(avg / 2)));
}

/** Nota num fundamento; sem nota, o nível geral × 2 (RN-103a). */
export const skillOf = (p: DrawPlayer | undefined, skill: string) => p?.skills?.[skill] ?? overallOf(p) * 2;

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
  /** Fundamentos da modalidade (ids), para o modo por fundamentos. */
  skillIds: string[] = [],
): DrawResult {
  const byId = new Map(players.map((p) => [p.id, p]));
  const level = (id: string) => overallOf(byId.get(id));
  const gender = (id: string) => byId.get(id)?.gender ?? null;
  const position = (id: string) => byId.get(id)?.position ?? null;
  const bySkills = criteria.level && criteria.levelBy === 'skills' && skillIds.length > 0;

  const slots = teamCount * playersPerTeam;
  const shuffled = shuffle(
    players.map((p) => p.id),
    random,
  );
  const playing = shuffled.slice(0, slots);
  const bench = shuffled.slice(slots);

  const buckets = criteria.gender
    ? [
        playing.filter((id) => gender(id) === 'female'),
        playing.filter((id) => gender(id) === 'male'),
        playing.filter((id) => !gender(id)),
      ]
    : [playing];

  if (bySkills)
    return { teams: drawBySkills(buckets, teamCount, playersPerTeam, criteria, byId, skillIds, random), bench };

  const byLevel = (ids: string[]) => (criteria.level ? [...ids].sort((a, b) => level(b) - level(a)) : ids);
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

/**
 * Por fundamentos (RN-103a): o objetivo é que a soma de cada fundamento seja parecida em todos os
 * times. Mede pelo quadrado das somas (com o total fixo, menor = mais parelho) e, com o critério de
 * posição, soma uma penalidade para cada posição repetida acima do limite no mesmo time.
 * Faz várias tentativas, cada uma começando de uma ordem um pouco diferente e melhorada com trocas,
 * e fica com a mais parelha (uma tentativa só às vezes para num arranjo bom, mas não o melhor).
 */
function drawBySkills(
  buckets: string[][],
  teamCount: number,
  playersPerTeam: number,
  criteria: DrawCriteriaInput,
  byId: Map<string, DrawPlayer>,
  skillIds: string[],
  random: () => number,
): string[][] {
  const vec = new Map<string, number[]>();
  for (const bucket of buckets)
    for (const id of bucket)
      vec.set(
        id,
        skillIds.map((k) => skillOf(byId.get(id), k)),
      );
  const v = (id: string) => vec.get(id) ?? skillIds.map(() => DEFAULT_LEVEL * 2);
  const total = (id: string) => v(id).reduce((a, b) => a + b, 0);
  const position = (id: string) => byId.get(id)?.position ?? null;
  const bucketOf = new Map<string, number>();
  buckets.forEach((b, i) => b.forEach((id) => bucketOf.set(id, i)));

  const playing = buckets.reduce((n, b) => n + b.length, 0);
  const posLimit = Math.max(1, Math.ceil(playing / teamCount / 2));
  const POSITION_WEIGHT = 400; // uma posição repetida a mais pesa mais que pequenas diferenças de nota

  // 30 tentativas: em 600 grupos aleatórios, 83% saíram no melhor arranjo possível e o resto ficou, em
  // média, a meio ponto dele; 36 pessoas em 6 times levam ~25 ms no computador
  const ATTEMPTS = 30;
  let bestTeams: string[][] = [];
  let bestTotal = Infinity;
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    // a 1ª tentativa vai do mais forte para o mais fraco; as outras embaralham um pouco essa ordem
    const jitter = attempt === 0 ? 0 : 6;
    const noise = new Map<string, number>();
    for (const bucket of buckets) for (const id of bucket) noise.set(id, (random() - 0.5) * jitter);
    const teams: string[][] = Array.from({ length: teamCount }, () => []);
    const sums: number[][] = Array.from({ length: teamCount }, () => skillIds.map(() => 0));
    const add = (t: number, id: string, sign: 1 | -1) =>
      v(id).forEach((x, k) => ((sums[t] as number[])[k]! += sign * x));
    const squares = (t: number) => (sums[t] as number[]).reduce((a, x) => a + x * x, 0);
    const posPenalty = (team: string[]) => {
      if (!criteria.position) return 0;
      const counts = new Map<string, number>();
      for (const id of team) {
        const p = position(id);
        if (p) counts.set(p, (counts.get(p) ?? 0) + 1);
      }
      let pen = 0;
      for (const c of counts.values()) if (c > posLimit) pen += (c - posLimit) ** 2;
      return pen * POSITION_WEIGHT;
    };
    const cost = (t: number) => squares(t) + posPenalty(teams[t] as string[]);

    // 1) cada um, do mais forte para o mais fraco, vai para o time onde a soma fica mais parelha
    for (let b = 0; b < buckets.length; b += 1) {
      const ordered = [...(buckets[b] as string[])].sort(
        (x, y) => total(y) + (noise.get(y) ?? 0) - (total(x) + (noise.get(x) ?? 0)),
      );
      for (const id of ordered) {
        const inBucket = (t: number) => (teams[t] as string[]).filter((x) => bucketOf.get(x) === b).length;
        const open = teams.map((_, t) => t).filter((t) => (teams[t] as string[]).length < playersPerTeam);
        const fewest = Math.min(...open.map(inBucket));
        let best = -1;
        let bestCost = Infinity;
        for (const t of open) {
          if (inBucket(t) !== fewest) continue; // mantém o equilíbrio de gênero
          add(t, id, 1);
          (teams[t] as string[]).push(id);
          const c = cost(t);
          (teams[t] as string[]).pop();
          add(t, id, -1);
          if (c < bestCost) {
            bestCost = c;
            best = t;
          }
        }
        if (best >= 0) {
          (teams[best] as string[]).push(id);
          add(best, id, 1);
        }
      }
    }

    // 2) trocas entre times enquanto melhoram (só entre pessoas do mesmo grupo de gênero)
    for (let pass = 0; pass < 40; pass += 1) {
      let improved = false;
      for (let a = 0; a < teamCount; a += 1)
        for (let b = a + 1; b < teamCount; b += 1) {
          const A = teams[a] as string[];
          const B = teams[b] as string[];
          for (let i = 0; i < A.length; i += 1)
            for (let j = 0; j < B.length; j += 1) {
              const x = A[i] as string;
              const y = B[j] as string;
              if (bucketOf.get(x) !== bucketOf.get(y)) continue;
              const before = cost(a) + cost(b);
              add(a, x, -1);
              add(a, y, 1);
              add(b, y, -1);
              add(b, x, 1);
              A[i] = y;
              B[j] = x;
              if (cost(a) + cost(b) < before - 1e-9) {
                improved = true;
                continue;
              }
              // desfaz
              A[i] = x;
              B[j] = y;
              add(a, y, -1);
              add(a, x, 1);
              add(b, x, -1);
              add(b, y, 1);
            }
        }
      if (!improved) break;
    }
    const totalCost = teams.reduce((acc, _, t) => acc + cost(t), 0);
    if (totalCost < bestTotal - 1e-9) {
      bestTotal = totalCost;
      bestTeams = teams.map((t) => [...t]);
    }
  }
  return bestTeams;
}

/** Soma de níveis de um time ("nível 13"). */
export const teamLevel = (ids: string[], players: DrawPlayer[]) =>
  ids.reduce((sum, id) => sum + overallOf(players.find((p) => p.id === id)), 0);

/** Média de cada fundamento no time, com uma casa ("Saq 6,5"), na ordem de `skillIds`. */
export function teamSkills(ids: string[], players: DrawPlayer[], skillIds: string[]): number[] {
  const byId = new Map(players.map((p) => [p.id, p]));
  return skillIds.map((k) => {
    if (ids.length === 0) return 0;
    const sum = ids.reduce((acc, id) => acc + skillOf(byId.get(id), k), 0);
    return Math.round((sum / ids.length) * 10) / 10;
  });
}

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
