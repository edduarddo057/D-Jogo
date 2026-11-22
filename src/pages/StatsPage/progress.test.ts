import { levelOf, xpOf } from './progress';

describe('nível do mural', () => {
  it('começa como Estreante e sobe com o XP', () => {
    expect(levelOf(0)).toMatchObject({ number: 1, name: 'Estreante', next: { name: 'Peladeiro', xp: 60 } });
    expect(levelOf(60).name).toBe('Peladeiro');
    expect(levelOf(5000)).toMatchObject({ number: 5, name: 'Lenda da quadra', next: null });
  });

  it('XP vem de jogos, vitórias, pontos e destaques', () => {
    expect(xpOf({ matches: 3, wins: 4, points: 10, highlights: 1 })).toBe(30 + 20 + 10 + 40);
  });
});
