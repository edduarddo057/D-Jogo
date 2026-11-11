import type { RouteObject } from 'react-router';
import { GroupIndexRedirect } from './guards/GroupIndexRedirect';
import { GuestOnly, RequireAuth, RequireProfile } from './guards/guards';
import { AppShell } from './layouts/AppShell';
import { AuthLayout } from './layouts/AuthLayout';
import { FlowLayout, PublicLayout } from './layouts/FlowLayout';
import { RootLayout } from './layouts/RootLayout';
import { NotFound, RouteError, Splash } from './layouts/RouteStates';

/**
 * Mapa de rotas (docs/frontend/architecture.md § 5). URLs em pt-BR.
 * Cada página é carregada sob demanda.
 */
/** Página real, carregada sob demanda (o módulo exporta um componente com o mesmo nome). */
const lazyPage = (path: string, load: () => Promise<Record<string, unknown>>, name: string): RouteObject => ({
  path,
  lazy: async () => ({ Component: (await load())[name] as React.ComponentType }),
});

export const routes: RouteObject[] = [
  {
    element: <RootLayout />,
    errorElement: <RouteError />,
    hydrateFallbackElement: <Splash />,
    children: [
      // ── Públicas, só para quem não está logado
      {
        element: (
          <GuestOnly>
            <AuthLayout />
          </GuestOnly>
        ),
        children: [
          lazyPage('entrar', () => import('@/pages/LoginPhonePage/LoginPhonePage'), 'LoginPhonePage'),
          lazyPage('entrar/codigo', () => import('@/pages/LoginCodePage/LoginCodePage'), 'LoginCodePage'),
        ],
      },

      // ── Públicas
      {
        element: <PublicLayout />,
        children: [
          lazyPage('convite/:code', () => import('@/pages/InvitePage/InvitePage'), 'InvitePage'),
          lazyPage('termos', () => import('@/pages/LegalPages/TermsPage'), 'TermsPage'),
          lazyPage('privacidade', () => import('@/pages/LegalPages/PrivacyPage'), 'PrivacyPage'),
        ],
      },

      // ── Logado, perfil ainda incompleto
      {
        element: (
          <RequireAuth>
            <FlowLayout />
          </RequireAuth>
        ),
        children: [
          lazyPage('cadastro', () => import('@/pages/OnboardingPage/OnboardingPage'), 'OnboardingPage'),
          lazyPage('termos/aceitar', () => import('@/pages/AcceptTermsPage/AcceptTermsPage'), 'AcceptTermsPage'),
        ],
      },

      // ── App com navegação principal
      {
        element: (
          <RequireAuth>
            <RequireProfile>
              <AppShell />
            </RequireProfile>
          </RequireAuth>
        ),
        errorElement: <RouteError />,
        children: [
          {
            index: true,
            lazy: async () => ({ Component: (await import('@/pages/HomePage/HomePage')).HomePage }),
          },
          lazyPage('turmas', () => import('@/pages/GroupsPage/GroupsPage'), 'GroupsPage'),
          {
            path: 'turmas/:groupId',
            lazy: async () => ({ Component: (await import('@/pages/GroupPage/GroupPage')).GroupPage }),
            children: [
              { index: true, element: <GroupIndexRedirect /> },
              lazyPage('jogadores', () => import('@/pages/GroupPlayersPage/GroupPlayersPage'), 'GroupPlayersPage'),
              lazyPage('partidas', () => import('@/pages/GroupMatchesPage/GroupMatchesPage'), 'GroupMatchesPage'),
              lazyPage('financeiro', () => import('@/pages/GroupFinancePage/GroupFinancePage'), 'GroupFinancePage'),
            ],
          },
          lazyPage('partidas', () => import('@/pages/MatchesPage/MatchesPage'), 'MatchesPage'),
          lazyPage('partidas/:matchId', () => import('@/pages/MatchPage/MatchPage'), 'MatchPage'),
          lazyPage(
            'partidas/:matchId/presencas',
            () => import('@/pages/AttendancePage/AttendancePage'),
            'AttendancePage',
          ),
          lazyPage('partidas/:matchId/times', () => import('@/pages/TeamsPage/TeamsPage'), 'TeamsPage'),
          lazyPage('perfil', () => import('@/pages/ProfilePage/ProfilePage'), 'ProfilePage'),
          lazyPage('perfil/historico', () => import('@/pages/HistoryPage/HistoryPage'), 'HistoryPage'),
        ],
      },

      // ── Fluxos logados, sem navegação principal
      {
        element: (
          <RequireAuth>
            <RequireProfile>
              <FlowLayout />
            </RequireProfile>
          </RequireAuth>
        ),
        errorElement: <RouteError />,
        children: [
          lazyPage('turmas/nova', () => import('@/pages/CreateGroupPage/CreateGroupPage'), 'CreateGroupPage'),
          lazyPage('turmas/:groupId/editar', () => import('@/pages/EditGroupPage/EditGroupPage'), 'EditGroupPage'),
          lazyPage('turmas/:groupId/regras', () => import('@/pages/GroupRulesPage/GroupRulesPage'), 'GroupRulesPage'),
          lazyPage('turmas/:groupId/convidar', () => import('@/pages/InvitesPage/InvitesPage'), 'InvitesPage'),
          lazyPage(
            'turmas/:groupId/partidas/nova',
            () => import('@/pages/CreateMatchPage/CreateMatchPage'),
            'CreateMatchPage',
          ),
          lazyPage('partidas/:matchId/editar', () => import('@/pages/EditMatchPage/EditMatchPage'), 'EditMatchPage'),
          lazyPage('partidas/:matchId/pagamento', () => import('@/pages/PaymentPage/PaymentPage'), 'PaymentPage'),
          lazyPage('partidas/:matchId/sorteio', () => import('@/pages/TeamDrawPage/TeamDrawPage'), 'TeamDrawPage'),
          lazyPage('perfil/dados', () => import('@/pages/EditProfilePage/EditProfilePage'), 'EditProfilePage'),
          lazyPage(
            'perfil/privacidade',
            () => import('@/pages/PrivacyAccountPage/PrivacyAccountPage'),
            'PrivacyAccountPage',
          ),
          {
            path: 'perfil/preferencias',
            lazy: async () => ({
              Component: (await import('@/pages/PreferencesPage/PreferencesPage')).PreferencesPage,
            }),
          },
        ],
      },

      // ── Galeria do design system (só em dev e homologação com mocks)
      ...(import.meta.env.DEV || import.meta.env.VITE_API_MOCK === 'true'
        ? [
            {
              element: <PublicLayout />,
              children: [
                {
                  path: 'dev/componentes',
                  lazy: async () => ({
                    Component: (await import('@/pages/ComponentsGalleryPage/ComponentsGalleryPage'))
                      .ComponentsGalleryPage,
                  }),
                },
              ],
            },
          ]
        : []),

      // ── 404
      {
        element: <PublicLayout />,
        children: [{ path: '*', element: <NotFound /> }],
      },
    ],
  },
];
