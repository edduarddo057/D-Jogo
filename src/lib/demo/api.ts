import { http } from '@/lib/http';

/** A demo da conta (API, rotas fora do contrato público). */
export interface DemoStatus {
  exists: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export async function getDemoStatus(): Promise<DemoStatus> {
  const { data } = await http.get<DemoStatus>('/demo');
  return data;
}

/** Apaga a demo da conta: na próxima entrada, a turma volta ao começo. */
export async function deleteDemo(): Promise<void> {
  await http.delete('/demo');
}
