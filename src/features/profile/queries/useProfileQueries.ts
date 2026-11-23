import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import {
  checkNickname,
  completeOnboarding,
  listSports,
  updateMe,
  upsertSportProfile,
  type Gender,
  type SportProfileInput,
} from '../api/meApi';
import { meKeys } from './meKeys';

export const sportKeys = { all: ['sports'] as const };

/** Catálogo de modalidades: muda raramente. */
export function useSports() {
  return useQuery({ queryKey: sportKeys.all, queryFn: listSports, staleTime: Number.POSITIVE_INFINITY });
}

/** Disponibilidade do nickname com debounce de 400 ms (architecture.md § 8). */
export function useNicknameAvailability(nickname: string, current?: string) {
  const [debounced, setDebounced] = useState(nickname);
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(nickname), 400);
    return () => window.clearTimeout(t);
  }, [nickname]);
  const valid = /^[a-z0-9._]{3,20}$/.test(debounced) && debounced !== current;
  return useQuery({
    queryKey: ['nickname', debounced],
    queryFn: () => checkNickname(debounced),
    enabled: valid,
    staleTime: 30_000,
  });
}

export function useCompleteOnboarding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: completeOnboarding,
    meta: { silent: true },
    onSuccess: ({ me }) => queryClient.setQueryData(meKeys.me, me),
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (v: {
      name: string;
      nickname: string;
      gender: Gender | null;
      sportProfile: SportProfileInput;
      phone?: string;
    }) => {
      const me = await updateMe({
        name: v.name,
        nickname: v.nickname,
        gender: v.gender,
        ...(v.phone ? { phone: v.phone } : {}),
      });
      const sportProfile = await upsertSportProfile(v.sportProfile);
      return { ...me, sportProfiles: [sportProfile] };
    },
    meta: { silent: true },
    onSuccess: (me) => {
      queryClient.setQueryData(meKeys.me, me);
      void queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });
}
