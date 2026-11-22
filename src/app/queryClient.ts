import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { isApiError, messageFor, toApiError } from '@/lib/http';
import { toast, useSessionStore } from '@/stores';

/** Termos mudaram: qualquer chamada pode responder isso; o guarda leva para o novo aceite (RN-05). */
const flagTerms = (error: unknown) => {
  if (isApiError(error) && error.code === 'TERMS_UPDATE_REQUIRED')
    useSessionStore.getState().setTermsUpdateRequired(true);
};

/** Padrões do TanStack Query (docs/frontend/architecture.md § 6.3). */
export function createQueryClient(options: { retry?: boolean } = {}): QueryClient {
  const retryEnabled = options.retry ?? true;

  return new QueryClient({
    queryCache: new QueryCache({ onError: flagTerms }),
    mutationCache: new MutationCache({
      // Erro de mutação sem tratamento próprio vira toast com a mensagem do código.
      onError: (error, _vars, _ctx, mutation) => {
        flagTerms(error);
        if (isApiError(error) && error.code === 'TERMS_UPDATE_REQUIRED') return;
        if (mutation.options.onError || mutation.meta?.silent) return; // a tela trata o erro
        toast(messageFor(toApiError(error).code), { tone: 'error' });
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: true,
        networkMode: 'online',
        retry: (failureCount, error) => {
          if (!retryEnabled) return false;
          if (isApiError(error) && error.isClientError) return false; // 4xx não melhora tentando de novo
          return failureCount < 2;
        },
      },
      mutations: {
        retry: false,
        networkMode: 'online',
      },
    },
  });
}
