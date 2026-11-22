import type { Member } from '@/features/groups';
import { http } from '@/lib/http';

export interface DemoPersonInput {
  name: string;
  position: string | null;
  level: number | null;
  gender: 'male' | 'female' | null;
  type: 'monthly' | 'drop_in';
}

/**
 * Só no modo demonstração (rota dos mocks, não existe na API real): adiciona uma pessoa só pelo nome,
 * sem conta. Ela vira membro e já entra confirmada no próximo jogo da turma.
 */
export async function addDemoPerson(groupId: string, body: DemoPersonInput) {
  const { data } = await http.post<{ member: Member; matchId: string | null }>(
    `/demo/groups/${encodeURIComponent(groupId)}/players`,
    body,
  );
  return data;
}
