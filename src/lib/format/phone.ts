/** Mantém só dígitos. */
export const onlyDigits = (value: string) => value.replace(/\D/g, '');

/** Máscara progressiva para digitação: "21998765432" → "(21) 99876-5432". */
export function maskBrazilianPhone(value: string): string {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** Celular brasileiro (DDD + 9 dígitos) → E.164. Retorna null se incompleto. */
export function toE164Brazil(value: string): string | null {
  const d = onlyDigits(value);
  const local = d.startsWith('55') && d.length === 13 ? d.slice(2) : d;
  return /^[1-9]{2}9\d{8}$/.test(local) ? `+55${local}` : null;
}

/** "+5521998765432" → "(21) 99876-5432" */
export function formatE164Brazil(e164: string): string {
  return maskBrazilianPhone(e164.replace(/^\+55/, ''));
}
