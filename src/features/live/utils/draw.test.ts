import { drawTeams, overallOf, teamSkills, type DrawPlayer } from './draw';

/** Gerador fixo, para o teste ser sempre igual. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const SKILLS = ['serve', 'reception', 'attack', 'setting', 'pass'];

// 12 pessoas de mesmo nível geral: 6 sacam muito e levantam mal, 6 o contrário
const players: DrawPlayer[] = Array.from({ length: 12 }, (_, i) => {
  const server = i < 6;
  return {
    id: `p${i}`,
    level: 3,
    gender: i % 2 === 0 ? 'female' : 'male',
    position: i % 3 === 0 ? 'setter' : 'outside',
    skills: {
      serve: server ? 10 : 2,
      reception: 6,
      attack: 6,
      setting: server ? 2 : 10,
      pass: 6,
    },
  };
});
const servesPerTeam = (teams: string[][]) => teams.map((t) => t.filter((id) => Number(id.slice(1)) < 6).length);

describe('sorteio por fundamentos (RN-103a)', () => {
  it('reparte os bons sacadores e os bons levantadores igualmente', () => {
    for (let seed = 1; seed <= 20; seed += 1) {
      const { teams } = drawTeams(
        players,
        2,
        6,
        { level: true, levelBy: 'skills', gender: false, position: false },
        seeded(seed),
        SKILLS,
      );
      expect(servesPerTeam(teams)).toEqual([3, 3]);
      const [a, b] = teams.map((t) => teamSkills(t, players, SKILLS));
      expect(a).toEqual(b); // médias iguais em todos os fundamentos
    }
  });

  it('pelo nível geral, os mesmos jogadores podem cair desequilibrados (todos têm nível 3)', () => {
    const lopsided = Array.from({ length: 20 }, (_, i) => i + 1).some((seed) => {
      const { teams } = drawTeams(players, 2, 6, { level: true, gender: false, position: false }, seeded(seed));
      return servesPerTeam(teams).some((n) => n !== 3);
    });
    expect(lopsided).toBe(true);
  });

  it('mantém o equilíbrio de gênero e espalha as posições junto com os fundamentos', () => {
    const { teams } = drawTeams(
      players,
      2,
      6,
      { level: true, levelBy: 'skills', gender: true, position: true },
      seeded(7),
      SKILLS,
    );
    for (const team of teams) {
      expect(team).toHaveLength(6);
      expect(team.filter((id) => players.find((p) => p.id === id)?.gender === 'female')).toHaveLength(3);
      expect(team.filter((id) => players.find((p) => p.id === id)?.position === 'setter').length).toBeLessThanOrEqual(
        3,
      );
    }
    expect(servesPerTeam(teams)).toEqual([3, 3]);
  });

  it('quem não tem nota nos fundamentos conta pelo nível geral × 2; sem nível, pela média das notas', () => {
    expect(overallOf({ level: null, skills: { serve: 8, pass: 10 } })).toBe(5); // média 9 ÷ 2 ≈ 4,5 → 5
    expect(overallOf({ level: 2, skills: { serve: 10 } })).toBe(2); // nível do organizador manda
    expect(overallOf({ level: null, skills: null })).toBe(3);
    const mixed: DrawPlayer[] = [
      { id: 'a', level: 5, gender: null, position: null },
      { id: 'b', level: null, gender: null, position: null, skills: { serve: 4 } },
    ];
    expect(teamSkills(['a'], mixed, ['serve'])).toEqual([10]);
    expect(teamSkills(['b'], mixed, ['serve'])).toEqual([4]);
  });
});
