import { useQuery } from '@tanstack/react-query';
import { getMe } from '../api/meApi';
import { meKeys } from './meKeys';

/** Conta logada. Os dados do usuário vivem aqui, nunca copiados para o Zustand. */
export function useMe(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: meKeys.me,
    queryFn: getMe,
    staleTime: 5 * 60_000,
    enabled: options.enabled ?? true,
  });
}

/** "Lucas Almeida" → "Lucas" */
export const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name;
