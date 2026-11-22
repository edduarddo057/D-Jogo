import { HttpResponse } from 'msw';
import { API_URL, type ProblemCode } from '@/lib/http';
import { findUser, type DbUser } from './db';
import { RuleError } from './domain/attendance';

export const api = (path: string) => `${API_URL}${path}`;
export const APP_URL =
  import.meta.env.VITE_APP_URL ?? (typeof window === 'undefined' ? 'http://localhost:5173' : window.location.origin);

const STATUS_BY_CODE: Partial<Record<ProblemCode, number>> = {
  VALIDATION_ERROR: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  USER_NOT_FOUND: 404,
  NICKNAME_TAKEN: 409,
  ALREADY_MEMBER: 409,
  RATE_LIMITED: 429,
};

export function problem(
  status: number,
  code: ProblemCode,
  extra: { fields?: Record<string, string>; rule?: string } = {},
) {
  return HttpResponse.json(
    { type: `https://docs.dajogo.app/errors/${code}`, title: code, status, code, ...extra },
    { status, headers: { 'Content-Type': 'application/problem+json' } },
  );
}

/** Token dos mocks: "mock-token-<userId>". */
export const tokenFor = (userId: string) => `mock-token-${userId}`;

/** Lê o usuário do header Authorization; null se não houver sessão válida. */
export function currentUser(request: Request): DbUser | null {
  const header = request.headers.get('Authorization') ?? '';
  const match = /^Bearer mock-token-(.+)$/.exec(header);
  return match?.[1] ? (findUser(match[1]) ?? null) : null;
}

/** Atraso curto para os estados de carregamento aparecerem em dev (zero nos testes). */
export const latency = () => (import.meta.env.MODE === 'test' ? 0 : 200 + Math.random() * 250);

/**
 * Envolve um handler autenticado: 401 sem sessão; RuleError vira Problem Details.
 */
type HandlerArgs = { request: Request; params: Record<string, string | readonly string[] | undefined> };

export function authed(fn: (args: HandlerArgs, user: DbUser) => Response | Promise<Response>) {
  return async (args: HandlerArgs) => {
    const { delay } = await import('msw');
    await delay(latency());
    const user = currentUser(args.request);
    if (!user) return problem(401, 'UNAUTHENTICATED');
    try {
      return await fn(args, user);
    } catch (error) {
      if (error instanceof RuleError)
        return problem(STATUS_BY_CODE[error.code] ?? 422, error.code, error.rule ? { rule: error.rule } : {});
      throw error;
    }
  };
}

export const json = <T>(body: T, status = 200) => HttpResponse.json(body as never, { status });
export const noContent = () => new HttpResponse(null, { status: 204 });
export const fail = (code: ProblemCode, rule?: string): never => {
  throw new RuleError(code, rule);
};
