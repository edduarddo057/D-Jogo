import { QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { watchSystemTheme } from '@/stores';
import { AppErrorBoundary } from './AppErrorBoundary';
import { Toaster } from './layouts/Toaster';
import { createQueryClient } from './queryClient';
import { routes } from './routes';
import { setupHttp } from './setupHttp';

/** Providers e roteador. Criados uma vez por montagem do app. */
export function App() {
  const [queryClient] = useState(() => {
    const client = createQueryClient();
    setupHttp(client);
    return client;
  });
  const [router] = useState(() => createBrowserRouter(routes, { basename: import.meta.env.BASE_URL }));

  useEffect(() => watchSystemTheme(), []);

  return (
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        <Toaster />
      </QueryClientProvider>
    </AppErrorBoundary>
  );
}
