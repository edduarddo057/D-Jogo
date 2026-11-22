import { useQuery } from '@tanstack/react-query';
import { getGroup, listMyGroups, type Permission, type Viewer } from '../api/groupsApi';
import { groupKeys } from './groupKeys';

export function useMyGroups() {
  return useQuery({ queryKey: groupKeys.mine, queryFn: listMyGroups });
}

export function useGroup(groupId: string, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: groupKeys.detail(groupId),
    queryFn: () => getGroup(groupId),
    enabled: (options.enabled ?? true) && Boolean(groupId),
  });
}

/** A pessoa organiza alguma turma? (a aba Organizar só aparece para ela, manual 2). */
export function useOrganizes() {
  const groups = useMyGroups();
  const owned = groups.data?.filter((g) => g.viewer.role === 'owner') ?? [];
  return {
    organizes: owned.length > 0,
    owned,
    pendings: owned.reduce((n, g) => n + (g.pendings?.total ?? 0), 0),
    isPending: groups.isPending,
  };
}

/** As permissões vêm prontas da API (objeto `viewer`); o front não recalcula papéis. */
export const can = (viewer: Pick<Viewer, 'permissions'> | null | undefined, permission: Permission) =>
  viewer?.permissions.includes(permission) ?? false;
