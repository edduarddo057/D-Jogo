import { useQuery } from '@tanstack/react-query';
import { getGroup, listMyGroups, type Permission, type Viewer } from '../api/groupsApi';
import { groupKeys } from './groupKeys';

export function useMyGroups() {
  return useQuery({ queryKey: groupKeys.mine, queryFn: listMyGroups });
}

export function useGroup(groupId: string) {
  return useQuery({ queryKey: groupKeys.detail(groupId), queryFn: () => getGroup(groupId) });
}

/** As permissões vêm prontas da API (objeto `viewer`); o front não recalcula papéis. */
export const can = (viewer: Pick<Viewer, 'permissions'> | null | undefined, permission: Permission) =>
  viewer?.permissions.includes(permission) ?? false;
