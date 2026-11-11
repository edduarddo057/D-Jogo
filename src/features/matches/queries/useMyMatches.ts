import { useQuery } from '@tanstack/react-query';
import { listMyMatches, type MyMatchesScope } from '../api/matchesApi';
import { matchKeys } from './matchKeys';

export function useMyMatches(scope: MyMatchesScope = 'upcoming') {
  return useQuery({
    queryKey: matchKeys.mine(scope),
    queryFn: () => listMyMatches(scope),
  });
}
