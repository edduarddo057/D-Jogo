import type { MyMatchesScope } from '../api/matchesApi';

export const matchKeys = {
  all: ['matches'] as const,
  detail: (matchId: string) => [...matchKeys.all, 'detail', matchId] as const,
  byGroup: (groupId: string, scope: 'upcoming' | 'past') => [...matchKeys.all, 'group', groupId, scope] as const,
  mine: (scope: MyMatchesScope) => [...matchKeys.all, 'mine', scope] as const,
};
