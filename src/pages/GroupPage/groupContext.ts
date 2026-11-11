import { useOutletContext } from 'react-router';
import type { Group } from '@/features/groups';

export interface GroupOutletContext {
  group: Group;
}

/** As abas da turma leem a turma já carregada pelo layout. */
export const useGroupContext = () => useOutletContext<GroupOutletContext>();
