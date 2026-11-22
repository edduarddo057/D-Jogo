import { http, HttpResponse } from 'msw';
import { api } from '../utils';
import { authHandlers } from './auth';
import { demoHandlers } from './demo';
import { groupHandlers } from './groups';
import { inviteHandlers } from './invites';
import { matchHandlers } from './matches';
import { liveHandlers } from './live';
import { meHandlers } from './me';
import { paymentHandlers } from './payments';
import { sportHandlers } from './sports';

/** Preflight de CORS (o jsdom envia nos testes; a API real responde o mesmo). */
const corsPreflight = http.options(api('/*'), ({ request }) => {
  return new HttpResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': request.headers.get('Origin') ?? '*',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type, Idempotency-Key',
    },
  });
});

/** Um arquivo por módulo da API (docs/backend/modules.md). */
export const handlersByModule = {
  auth: authHandlers,
  me: meHandlers,
  groups: groupHandlers,
  invites: inviteHandlers,
  matches: matchHandlers,
  payments: paymentHandlers,
  live: liveHandlers,
  sports: sportHandlers,
  /** Só do modo demonstração: adicionar pessoa sem conta (não existe na API real). */
  demo: demoHandlers,
};
export type MockModule = keyof typeof handlersByModule;

export const handlers = [corsPreflight, ...Object.values(handlersByModule).flat()];

/**
 * Integração gradual (etapa 15): com VITE_API_MOCK_ONLY="draws,payments", só esses módulos
 * continuam simulados e o resto vai para a API real em VITE_API_URL.
 */
export function handlersFor(only: string | undefined) {
  if (!only?.trim()) return handlers;
  const wanted = only.split(',').map((m) => m.trim()) as MockModule[];
  return [corsPreflight, ...wanted.flatMap((m) => handlersByModule[m] ?? [])];
}

export { MOCK_OTP_CODE } from './auth';
