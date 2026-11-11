import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSessionStore } from '@/stores';
import { acceptTerms, deleteAccount, exportMyData } from '../api/meApi';
import { meKeys } from './meKeys';

export function useAcceptTerms() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: acceptTerms,
    onSuccess: (me) => {
      queryClient.setQueryData(meKeys.me, me);
      useSessionStore.getState().setTermsUpdateRequired(false);
    },
  });
}

/** Baixa um arquivo JSON com os dados da conta (LGPD, art. 18). */
export function useExportMyData() {
  return useMutation({
    mutationFn: async () => {
      const data = await exportMyData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dajogo-meus-dados-${data.generatedAt.slice(0, 10)}.json`;
      document.body.append(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      return data;
    },
  });
}

export function useDeleteAccount() {
  return useMutation({ mutationFn: deleteAccount, meta: { silent: true } });
}
