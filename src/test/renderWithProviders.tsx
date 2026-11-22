import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { render, type RenderOptions } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { createMemoryRouter, MemoryRouter, RouterProvider } from 'react-router';
import { createQueryClient } from '@/app/queryClient';
import { routes } from '@/app/routes';
import { Toaster } from '@/app/layouts/Toaster';
import { setupHttp } from '@/app/setupHttp';

function newTestQueryClient(): QueryClient {
  const client = createQueryClient({ retry: false });
  setupHttp(client);
  return client;
}

/** Renderiza um componente com QueryClient (sem retry) e um roteador em memória. */
export function renderWithProviders(
  ui: ReactElement,
  options: { route?: string } & Omit<RenderOptions, 'wrapper'> = {},
) {
  const { route = '/', ...renderOptions } = options;
  const queryClient = newTestQueryClient();
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
    </QueryClientProvider>
  );
  return { queryClient, ...render(ui, { wrapper: Wrapper, ...renderOptions }) };
}

/** Renderiza o app inteiro (rotas reais, guardas, layouts) a partir de uma URL. */
export function renderApp(path = '/') {
  const queryClient = newTestQueryClient();
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const result = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster />
    </QueryClientProvider>,
  );
  return { queryClient, router, ...result };
}
