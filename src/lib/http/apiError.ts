import { isAxiosError } from 'axios';
import type { Problem, ProblemCode } from './types';

/** Códigos que só existem no cliente (falhas antes de haver uma resposta da API). */
export type ClientErrorCode = 'NETWORK_ERROR' | 'TIMEOUT' | 'UNKNOWN';
export type ApiErrorCode = ProblemCode | ClientErrorCode;

/**
 * Todo erro que sai de `lib/http` é um ApiError: a interface decide a mensagem pelo `code`,
 * nunca pelo texto vindo do servidor (docs/frontend/architecture.md § 6.1 e § 9).
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly fields: Record<string, string>;
  readonly rule: string | undefined;

  constructor(init: {
    status: number;
    code: ApiErrorCode;
    message?: string;
    fields?: Record<string, string>;
    rule?: string;
  }) {
    super(init.message ?? init.code);
    this.name = 'ApiError';
    this.status = init.status;
    this.code = init.code;
    this.fields = init.fields ?? {};
    this.rule = init.rule;
  }

  /** Erros 4xx não melhoram tentando de novo. */
  get isClientError(): boolean {
    return this.status >= 400 && this.status < 500;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

function isProblem(data: unknown): data is Problem {
  return typeof data === 'object' && data !== null && 'code' in data && 'status' in data;
}

export function toApiError(error: unknown): ApiError {
  if (isApiError(error)) return error;

  if (isAxiosError(error)) {
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return new ApiError({ status: 0, code: 'TIMEOUT', message: error.message });
    }
    const { response } = error;
    if (!response) return new ApiError({ status: 0, code: 'NETWORK_ERROR', message: error.message });
    if (isProblem(response.data)) {
      const problem = response.data;
      return new ApiError({
        status: response.status,
        code: problem.code,
        message: problem.detail ?? problem.title,
        fields: problem.fields,
        rule: problem.rule,
      });
    }
    return new ApiError({ status: response.status, code: response.status === 401 ? 'UNAUTHENTICATED' : 'UNKNOWN' });
  }

  return new ApiError({ status: 0, code: 'UNKNOWN', message: error instanceof Error ? error.message : String(error) });
}
