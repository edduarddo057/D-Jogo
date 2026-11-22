import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addDemoPerson, type DemoPersonInput } from './api/demoApi';

/** Adiciona a pessoa e atualiza tudo (membros, turma, jogos): ela aparece em todas as telas. */
export function useAddDemoPerson(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: DemoPersonInput) => addDemoPerson(groupId, body),
    onSuccess: () => void queryClient.invalidateQueries(),
  });
}
