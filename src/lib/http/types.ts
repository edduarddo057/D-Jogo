import type { components } from './schema';

/** Atalho para os schemas do contrato: `Schema<'Match'>`. */
export type Schema<Name extends keyof components['schemas']> = components['schemas'][Name];

export type Problem = Schema<'Problem'>;
export type ProblemCode = Problem['code'];

/** Formato padrão das listas paginadas por cursor. */
export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}
