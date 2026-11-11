const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** 2500 → "R$ 25,00". Usa espaço comum no lugar do não separável, para testes e cópia. */
export function formatCents(cents: number): string {
  return brl.format(cents / 100).replace(/\u00a0/g, ' ');
}

/** "25,00", "R$ 1.260,5", "25" → centavos (2500, 126050, 2500). Retorna null se não for um valor. */
export function parseMoneyToCents(input: string): number | null {
  const cleaned = input
    .replace(/[R$\s]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  if (cleaned === '' || !/^\d+(\.\d{0,2})?$/.test(cleaned)) return null;
  return Math.round(Number.parseFloat(cleaned) * 100);
}
