import type { LucideIcon } from 'lucide-react';
import { CalendarCheck, Flame, HeartHandshake, Star, Target, Trophy, Volleyball, Zap } from 'lucide-react';
import type { MyStatsDetails } from '@/features/profile';
import type { MedalTone } from '../shared/Medal';

/** Níveis do mural: o nome é a graça, o XP é só o caminho até ele. */
export const LEVELS = [
  { name: 'Estreante', xp: 0 },
  { name: 'Peladeiro', xp: 60 },
  { name: 'Titular', xp: 150 },
  { name: 'Craque', xp: 300 },
  { name: 'Lenda da quadra', xp: 600 },
] as const;

/** XP: jogo 10, rodada vencida 5, ponto 1, destaque do dia 40. */
export function xpOf(s: Pick<MyStatsDetails, 'matches' | 'wins' | 'points' | 'highlights'>) {
  return s.matches * 10 + s.wins * 5 + s.points + s.highlights * 40;
}

export function levelOf(xp: number) {
  let i = 0;
  while (i + 1 < LEVELS.length && xp >= (LEVELS[i + 1]?.xp ?? Infinity)) i += 1;
  const current = LEVELS[i] ?? LEVELS[0];
  const next = LEVELS[i + 1] ?? null;
  return { number: i + 1, name: current.name, xp, from: current.xp, next };
}

export interface Achievement {
  key: string;
  title: string;
  /** Como conquistar, em uma linha. */
  how: string;
  icon: LucideIcon;
  /** Metal quando conquistada. */
  metal: Exclude<MedalTone, 'locked'>;
  value: number;
  goal: number;
}

/** Conquistas a partir dos números do mural: conquistada quando value ≥ goal. */
export function achievementsOf(s: MyStatsDetails): Achievement[] {
  const pct = Math.round(s.attendanceRate * 100);
  return [
    {
      key: 'estreia',
      title: 'Estreia',
      how: 'Jogar o primeiro jogo',
      icon: Volleyball,
      metal: 'green',
      value: s.matches,
      goal: 1,
    },
    {
      key: 'primeira',
      title: 'Primeira vitória',
      how: 'Vencer uma rodada',
      icon: Zap,
      metal: 'green',
      value: s.wins,
      goal: 1,
    },
    {
      key: 'destaque',
      title: 'Destaque do dia',
      how: 'Ser quem mais vence no dia',
      icon: Trophy,
      metal: 'gold',
      value: s.highlights,
      goal: 1,
    },
    {
      key: 'pontuador',
      title: 'Pontuador',
      how: 'Marcar 20 pontos',
      icon: Target,
      metal: 'bronze',
      value: s.points,
      goal: 20,
    },
    {
      key: 'em-chamas',
      title: 'Em chamas',
      how: 'Ir a 5 jogos seguidos',
      icon: Flame,
      metal: 'bronze',
      value: s.bestStreak,
      goal: 5,
    },
    {
      key: 'assiduo',
      title: 'Assíduo',
      how: 'Jogar 10 jogos',
      icon: CalendarCheck,
      metal: 'green',
      value: s.matches,
      goal: 10,
    },
    {
      key: 'fiel',
      title: 'Fiel',
      how: 'Ter 80% de presença',
      icon: HeartHandshake,
      metal: 'green',
      value: pct,
      goal: 80,
    },
    {
      key: 'vencedor',
      title: 'Vencedor',
      how: 'Vencer 25 rodadas',
      icon: Star,
      metal: 'gold',
      value: s.wins,
      goal: 25,
    },
  ];
}
