import { http, type Page, type Schema } from '@/lib/http';

export type Payment = Schema<'Payment'>;
export type PaymentStatus = Schema<'PaymentStatus'>;
export type PaymentMethod = Schema<'PaymentMethod'>;
export type PaymentKind = Schema<'PaymentKind'>;

const p = (paymentId: string) => `/payments/${encodeURIComponent(paymentId)}`;
const g = (groupId: string) => `/groups/${encodeURIComponent(groupId)}`;

export async function reportPayment(paymentId: string, note?: string): Promise<Payment> {
  const { data } = await http.post<Payment>(`${p(paymentId)}/report`, note ? { note } : {});
  return data;
}

export async function approvePayment(paymentId: string, method?: PaymentMethod): Promise<Payment> {
  const { data } = await http.post<Payment>(`${p(paymentId)}/approve`, method ? { method } : {});
  return data;
}

export async function rejectPayment(paymentId: string, reason: string): Promise<Payment> {
  const { data } = await http.post<Payment>(`${p(paymentId)}/reject`, { reason });
  return data;
}

export async function listGroupPayments(
  groupId: string,
  params: { status?: PaymentStatus[]; kind?: PaymentKind; matchId?: string; month?: string } = {},
): Promise<Page<Payment>> {
  const { data } = await http.get<Page<Payment>>(`${g(groupId)}/payments`, {
    params: { ...params, status: params.status?.join(','), limit: 100 },
  });
  return data;
}

export async function registerPayment(
  groupId: string,
  body: {
    userId: string;
    kind: PaymentKind;
    matchId?: string;
    referenceMonth?: string;
    amountCents: number;
    method: PaymentMethod;
  },
): Promise<Payment> {
  const { data } = await http.post<Payment>(`${g(groupId)}/payments`, body);
  return data;
}

export async function generateMonthlyFees(
  groupId: string,
  month: string,
): Promise<{ created: number; alreadyExisting: number }> {
  const { data } = await http.post<{ created: number; alreadyExisting: number }>(`${g(groupId)}/monthly-fees`, {
    month,
  });
  return data;
}

export async function listMyPayments(status?: PaymentStatus[]): Promise<Page<Payment>> {
  const { data } = await http.get<Page<Payment>>('/me/payments', { params: { status: status?.join(',') } });
  return data;
}
