import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createLedgerEntry, deleteLedgerEntry, getFinanceSummary, listLedgerEntries } from '../api/financeApi';

export const financeKeys = {
  summary: (groupId: string, month: string) => ['finance', groupId, 'summary', month] as const,
  entries: (groupId: string, month: string) => ['finance', groupId, 'entries', month] as const,
};

export function useFinanceSummary(groupId: string, month: string) {
  return useQuery({ queryKey: financeKeys.summary(groupId, month), queryFn: () => getFinanceSummary(groupId, month) });
}

export function useLedgerEntries(groupId: string, month: string) {
  return useQuery({ queryKey: financeKeys.entries(groupId, month), queryFn: () => listLedgerEntries(groupId, month) });
}

function useInvalidateFinance(groupId: string) {
  const queryClient = useQueryClient();
  return () => void queryClient.invalidateQueries({ queryKey: ['finance', groupId] });
}

export function useCreateLedgerEntry(groupId: string) {
  const invalidate = useInvalidateFinance(groupId);
  return useMutation({
    mutationFn: (body: Parameters<typeof createLedgerEntry>[1]) => createLedgerEntry(groupId, body),
    meta: { silent: true },
    onSuccess: invalidate,
  });
}

export function useDeleteLedgerEntry(groupId: string) {
  const invalidate = useInvalidateFinance(groupId);
  return useMutation({ mutationFn: (entryId: string) => deleteLedgerEntry(groupId, entryId), onSuccess: invalidate });
}
