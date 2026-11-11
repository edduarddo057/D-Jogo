import type { QueryClient } from '@tanstack/react-query';
import { refreshAccessToken } from '@/features/auth';
import { configureHttpAuth } from '@/lib/http';
import { useSessionStore } from '@/stores';

/** Liga o cliente HTTP (lib) à sessão (store) sem que lib/ dependa de stores/. */
export function setupHttp(queryClient: QueryClient): void {
  configureHttpAuth({
    getAccessToken: () => useSessionStore.getState().accessToken,
    refresh: refreshAccessToken,
    onSessionExpired: () => {
      useSessionStore.getState().clear();
      queryClient.clear();
    },
  });
}
