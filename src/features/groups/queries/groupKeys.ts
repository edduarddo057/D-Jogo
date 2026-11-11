export const groupKeys = {
  all: ['groups'] as const,
  mine: ['groups', 'mine'] as const,
  detail: (groupId: string) => ['groups', 'detail', groupId] as const,
};
