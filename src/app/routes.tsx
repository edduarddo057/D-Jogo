import type { RouteObject } from 'react-router';
import { GuestOnly, OrganizerIndex, RequireAuth, RequireProfile } from './guards/guards';
import { AppShell } from './layouts/AppShell';
import { FlowLayout, FullscreenLayout, PublicLayout } from './layouts/FlowLayout';
import { RootLayout } from './layouts/RootLayout';
import { NotFound, RouteError, Splash } from './layouts/RouteStates';

/**
 * Mapa de rotas (manual de usabilidade 2.0 › 2. Navegação). URLs em pt-BR; cada página carrega sob demanda.
 * Tarefas curtas (Pagar, Novo jogo, Convidar, lançamento, membro…) não são rotas: são folhas ligadas
 * a `?folha=` na própria tela de origem, para o Voltar sempre voltar para ela.
 */
const lazyPage = (path: string, load: () => Promise<Record<string, unknown>>, name: string): RouteObject => ({
  path,
  lazy: async () => ({ Component: (await load())[name] as React.ComponentType }),
});

const authed = (children: React.ReactNode) => (
  <RequireAuth>
    <RequireProfile>{children}</RequireProfile>
  </RequireAuth>
);

export const routes: RouteObject[] = [
  {
    element: <RootLayout />,
    errorElement: <RouteError />,
    hydrateFallbackElement: <Splash />,
    children: [
      // ── Entrar (manual 3.1): Convite → Celular → Código → Perfil
      {
        element: (
          <GuestOnly>
            <FlowLayout />
          </GuestOnly>
        ),
        children: [
          lazyPage('entrar', () => import('@/pages/LoginPhonePage/LoginPhonePage'), 'LoginPhonePage'),
          lazyPage('entrar/codigo', () => import('@/pages/LoginCodePage/LoginCodePage'), 'LoginCodePage'),
        ],
      },
      {
        element: <PublicLayout />,
        children: [
          lazyPage('convite/:code', () => import('@/pages/InvitePage/InvitePage'), 'InvitePage'),
          lazyPage('termos', () => import('@/pages/LegalPages/TermsPage'), 'TermsPage'),
          lazyPage('privacidade', () => import('@/pages/LegalPages/PrivacyPage'), 'PrivacyPage'),
        ],
      },
      {
        element: (
          <RequireAuth>
            <FlowLayout />
          </RequireAuth>
        ),
        children: [
          lazyPage('entrar/perfil', () => import('@/pages/OnboardingPage/OnboardingPage'), 'OnboardingPage'),
          lazyPage('termos/aceitar', () => import('@/pages/AcceptTermsPage/AcceptTermsPage'), 'AcceptTermsPage'),
        ],
      },

      // ── App com as abas
      {
        element: authed(<AppShell />),
        errorElement: <RouteError />,
        children: [
          { index: true, lazy: async () => ({ Component: (await import('@/pages/GamesPage/GamesPage')).GamesPage }) },
          lazyPage('jogos/:matchId', () => import('@/pages/GamePage/GamePage'), 'GamePage'),
          lazyPage('jogos/:matchId/resumo', () => import('@/pages/DaySummaryPage/DaySummaryPage'), 'DaySummaryPage'),
          lazyPage('avisos', () => import('@/pages/NotificationsPage/NotificationsPage'), 'NotificationsPage'),
          lazyPage('turmas', () => import('@/pages/GroupsPage/GroupsPage'), 'GroupsPage'),
          lazyPage('turmas/:groupId', () => import('@/pages/GroupPage/GroupPage'), 'GroupPage'),
          lazyPage('organizar', () => import('@/pages/OrganizePage/OrganizePage'), 'OrganizePage'),
          { path: 'organizar/:groupId', element: <OrganizerIndex /> },
          lazyPage(
            'organizar/:groupId/:tab',
            () => import('@/pages/OrganizerGroupPage/OrganizerGroupPage'),
            'OrganizerGroupPage',
          ),
          lazyPage('voce', () => import('@/pages/YouPage/YouPage'), 'YouPage'),
          lazyPage('voce/estatisticas', () => import('@/pages/StatsPage/StatsPage'), 'StatsPage'),
          lazyPage('voce/ajustes', () => import('@/pages/SettingsPage/SettingsPage'), 'SettingsPage'),
        ],
      },

      // ── Criar turma: uma tela só, sem abas (manual 4.2)
      {
        element: authed(<FlowLayout />),
        errorElement: <RouteError />,
        children: [lazyPage('turmas/nova', () => import('@/pages/CreateGroupPage/CreateGroupPage'), 'CreateGroupPage')],
      },

      // ── Dia de jogo: tela cheia, sem abas, funciona sem internet (manual 4.3)
      {
        element: authed(<FullscreenLayout />),
        errorElement: <RouteError />,
        children: [
          lazyPage(
            'organizar/:groupId/dia-de-jogo/:matchId',
            () => import('@/pages/GameDayPage/GameDayPage'),
            'GameDayPage',
          ),
        ],
      },

      { element: <PublicLayout />, children: [{ path: '*', element: <NotFound /> }] },
    ],
  },
];
