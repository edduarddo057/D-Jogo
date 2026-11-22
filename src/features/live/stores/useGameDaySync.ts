import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { isApiError } from '@/lib/http';
import { matchKeys } from '@/features/matches';
import { addParticipation } from '@/features/attendance';
import { createLiveDraw, finishRound, setArrival, startLive } from '../api/liveApi';
import { runFinish } from './finishMatch';
import { useGameDayStore, type GameDaySession, type OutboxOp } from './gameDayStore';

/** Está com internet? (atualiza quando a conexão cai ou volta). */
export function useIsOnline() {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}

/** Tempo até tentar de novo quando o envio falha sem ser por regra (rede, servidor fora). */
export const RETRY_MS = 5000;

/** Operação que nunca vai poder ser enviada (ex.: rodada de um sorteio que o servidor recusou). */
class Unsendable extends Error {}

/** Envia uma operação; devolve o que muda na sessão (ids do servidor). */
async function send(matchId: string, op: OutboxOp, s: GameDaySession): Promise<Partial<GameDaySession>> {
  switch (op.kind) {
    case 'arrival':
      await setArrival(matchId, op.userId, op.arrived);
      return {};
    case 'add':
      try {
        await addParticipation(matchId, op.userId);
      } catch (e) {
        if (!(isApiError(e) && e.isClientError)) throw e; // já está na lista: segue
      }
      return {};
    case 'draw': {
      const d = op.draw;
      const res = await createLiveDraw(matchId, {
        clientId: d.clientId,
        teamCount: d.teams.length,
        playersPerTeam: d.playersPerTeam,
        criteria: d.criteria,
        teams: d.teams.map((memberIds) => ({ memberIds })),
        bench: d.bench,
      });
      return { synced: { ...s.synced, [d.clientId]: { drawId: res.id, teamIds: res.teams.map((t) => t.id) } } };
    }
    case 'round': {
      const r = op.round;
      const map = s.synced[r.drawClientId];
      // o sorteio desta rodada foi recusado pelo servidor: a rodada não tem como ir
      if (!map) throw new Unsendable('sorteio da rodada não foi aceito');
      await finishRound(matchId, {
        clientId: r.clientId,
        drawId: map.drawId,
        teams: [
          { teamId: map.teamIds[r.court[0]] ?? '', score: r.scores[0] },
          { teamId: map.teamIds[r.court[1]] ?? '', score: r.scores[1] },
        ],
        scorers: r.scorers,
      });
      return {};
    }
    case 'finish':
      await runFinish(matchId);
      return {};
  }
}

/**
 * Envia; se o servidor perdeu o modo ao vivo (ex.: reiniciou), abre de novo e reenvia uma vez.
 * Assim a chegada, os sorteios e as rodadas guardados no celular não se perdem.
 */
async function sendOrRestart(matchId: string, op: OutboxOp, s: GameDaySession) {
  try {
    return await send(matchId, op, s);
  } catch (e) {
    if (!(isApiError(e) && e.code === 'LIVE_NOT_AVAILABLE')) throw e;
    await startLive(matchId);
    return send(matchId, op, s);
  }
}

/**
 * Esvazia a fila do dia de jogo em ordem, sempre que houver internet. Erro de regra (ou operação
 * que não tem como ir) descarta a operação para não travar o resto; erro de rede ou do servidor
 * para a fila e tenta de novo sozinho em alguns segundos (e na hora em que a conexão voltar).
 */
export function useGameDaySync(matchId: string) {
  const online = useIsOnline();
  const outboxLength = useGameDayStore((st) => st.sessions[matchId]?.outbox.length ?? 0);
  const running = useRef(false);
  const queryClient = useQueryClient();
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const retryTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(retryTimer.current), []);

  useEffect(() => {
    if (!online || outboxLength === 0 || running.current) return;
    window.clearTimeout(retryTimer.current);
    running.current = true;
    void (async () => {
      try {
        for (;;) {
          const s = useGameDayStore.getState().sessions[matchId];
          const op = s?.outbox[0];
          if (!s || !op) break;
          try {
            const patch = await sendOrRestart(matchId, op, s);
            useGameDayStore.getState().update(matchId, (cur) => ({ ...patch, outbox: cur.outbox.slice(1) }));
            setError(false);
          } catch (e) {
            if (e instanceof Unsendable || (isApiError(e) && e.isClientError)) {
              useGameDayStore.getState().update(matchId, (cur) => ({ outbox: cur.outbox.slice(1) }));
              continue;
            }
            setError(true);
            retryTimer.current = window.setTimeout(() => setAttempt((n) => n + 1), RETRY_MS);
            break;
          }
        }
      } finally {
        running.current = false;
        void queryClient.invalidateQueries({ queryKey: matchKeys.detail(matchId) });
      }
    })();
  }, [matchId, online, outboxLength, queryClient, attempt]);

  /** Tentar de novo agora, sem esperar. */
  const retry = () => setAttempt((n) => n + 1);

  return { online, pending: outboxLength, error, retry };
}
