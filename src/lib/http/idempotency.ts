/**
 * Uma chave por tentativa do usuário (não por retry automático):
 * gere ao clicar e reaproveite se a mesma ação for reenviada (docs/api/openapi.yaml › Idempotency-Key).
 */
export function newIdempotencyKey(): string {
  return crypto.randomUUID();
}

export const idempotencyHeader = (key: string) => ({ 'Idempotency-Key': key });
