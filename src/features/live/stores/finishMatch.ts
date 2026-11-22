import { runMatchAction } from '@/features/matches';

/** Encerrar o dia de jogo: a partida vai para "finalizada" e o resumo fica pronto para todos. */
export async function runFinish(matchId: string) {
  await runMatchAction(matchId, 'finish');
}
