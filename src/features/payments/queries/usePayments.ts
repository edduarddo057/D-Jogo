import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { matchKeys } from '@/features/matches';
import {
  approvePayment,
  chargePayment,
  generateMonthlyFees,
  receivePayment,
  undoPaymentReview,
  listGroupPayments,
  listMyPayments,
  registerPayment,
  rejectPayment,
  reportPayment,
  type PaymentKind,
  type PaymentMethod,
  type PaymentStatus,
} from '../api/paymentsApi';

export const paymentKeys = {
  all: ['payments'] as const,
  group: (groupId: string, filter: object) => ['payments', 'group', groupId, filter] as const,
  mine: (status?: PaymentStatus[]) => ['payments', 'mine', status ?? 'all'] as const,
};

export function useGroupPayments(
  groupId: string,
  filter: { status?: PaymentStatus[]; kind?: PaymentKind; matchId?: string; month?: string },
  enabled = true,
) {
  return useQuery({
    queryKey: paymentKeys.group(groupId, filter),
    queryFn: () => listGroupPayments(groupId, filter),
    enabled,
  });
}

export function useMyPayments(status?: PaymentStatus[]) {
  return useQuery({ queryKey: paymentKeys.mine(status), queryFn: () => listMyPayments(status) });
}

/** Pagamento muda vaga (partida), caixa (financeiro) e selos (jogadores): invalida tudo que depende dele. */
function useInvalidatePayments() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: paymentKeys.all });
    void queryClient.invalidateQueries({ queryKey: matchKeys.all });
    void queryClient.invalidateQueries({ queryKey: ['groups'] });
    void queryClient.invalidateQueries({ queryKey: ['finance'] });
  };
}

export function useReportPayment() {
  const invalidate = useInvalidatePayments();
  return useMutation({
    mutationFn: ({ paymentId, note }: { paymentId: string; note?: string }) => reportPayment(paymentId, note),
    onSuccess: invalidate,
  });
}

export function useApprovePayment() {
  const invalidate = useInvalidatePayments();
  return useMutation({
    mutationFn: ({ paymentId, method }: { paymentId: string; method?: PaymentMethod }) =>
      approvePayment(paymentId, method),
    onSuccess: invalidate,
  });
}

export function useRejectPayment() {
  const invalidate = useInvalidatePayments();
  return useMutation({
    mutationFn: ({ paymentId, reason }: { paymentId: string; reason: string }) => rejectPayment(paymentId, reason),
    onSuccess: invalidate,
  });
}

export function useRegisterPayment(groupId: string) {
  const invalidate = useInvalidatePayments();
  return useMutation({
    mutationFn: (body: Parameters<typeof registerPayment>[1]) => registerPayment(groupId, body),
    onSuccess: invalidate,
  });
}

export function useGenerateMonthlyFees(groupId: string) {
  const invalidate = useInvalidatePayments();
  return useMutation({ mutationFn: (month: string) => generateMonthlyFees(groupId, month), onSuccess: invalidate });
}

export function useChargePayment() {
  return useMutation({ mutationFn: (paymentId: string) => chargePayment(paymentId) });
}

export function useReceivePayment() {
  const invalidate = useInvalidatePayments();
  return useMutation({ mutationFn: (paymentId: string) => receivePayment(paymentId, 'cash'), onSuccess: invalidate });
}

export function useUndoPaymentReview() {
  const invalidate = useInvalidatePayments();
  return useMutation({ mutationFn: (paymentId: string) => undoPaymentReview(paymentId), onSuccess: invalidate });
}
