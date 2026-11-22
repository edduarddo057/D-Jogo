import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createLedgerEntry,
  exportLedger,
  getFinanceSummary,
  listLedgerEntries,
  reverseLedgerEntry,
} from '../api/financeApi';

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

export function useReverseLedgerEntry(groupId: string) {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateFinance(groupId);
  return useMutation({
    mutationFn: (entryId: string) => reverseLedgerEntry(groupId, entryId),
    onSuccess: () => {
      invalidate();
      void queryClient.invalidateQueries({ queryKey: ['payments'] });
      void queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });
}

/** Baixa o extrato em CSV. */
export function useExportLedger(groupId: string, fileName: string) {
  return useMutation({
    mutationFn: async () => {
      const csv = await exportLedger(groupId);
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.append(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
  });
}
