import type { DrawTemplate } from '../api/drawApi';

/** "2 times de 6 · equilibra por nível · sobra vai para o banco" */
export const describeTemplate = (
  t: Pick<DrawTemplate, 'teamCount' | 'playersPerTeam' | 'balanceByLevel' | 'extraPlayers'>,
) =>
  [
    `${t.teamCount} times de ${t.playersPerTeam}`,
    t.balanceByLevel ? 'equilibra por nível' : 'aleatório',
    t.extraPlayers === 'bench' ? 'sobra vai para o banco' : 'sobra é espalhada',
  ].join(' · ');
