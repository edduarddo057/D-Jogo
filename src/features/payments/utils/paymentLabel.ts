import type { Payment } from '../api/paymentsApi';

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
/** "Mensalidade nov/26" ou "Avulso" */
export const paymentLabel = (p: Payment) =>
  p.kind === 'monthly_fee' && p.referenceMonth
    ? `Mensalidade ${MONTHS[Number(p.referenceMonth.slice(5)) - 1] ?? ''}/${p.referenceMonth.slice(2, 4)}`
    : 'Avulso';
