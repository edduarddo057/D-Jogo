import { screen, waitFor } from '@testing-library/react';
import { db } from '@/mocks/db';
import { renderApp } from '@/test/renderWithProviders';

/**
 * Teste de exemplo da etapa 5: rota + guardas + verificação de sessão + TanStack Query + Axios + MSW.
 */
describe('rotas e sessão', () => {
  it('logado: abre o Início com o nome do usuário e as próximas partidas vindas da API', async () => {
    const { router, container } = renderApp('/');

    expect(await screen.findByRole('heading', { level: 1, name: 'Olá, Lucas!' })).toBeInTheDocument();
    // a mais próxima vem em destaque; as outras na lista. Qual é qual depende do dia da semana.
    expect(await screen.findByText('Próxima partida')).toBeInTheDocument();
    await waitFor(() => expect(container.querySelector('a[href="/partidas/m_quarta"]')).not.toBeNull());
    expect(container.querySelector('a[href="/partidas/m_centro"]')).not.toBeNull();
    expect(router.state.location.pathname).toBe('/');
  });

  it('deslogado: vai para /entrar guardando para onde a pessoa ia', async () => {
    db.session.userId = null;
    const { router } = renderApp('/partidas/m_quarta');

    expect(await screen.findByRole('heading', { level: 1, name: 'Entrar' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/entrar');
    expect(router.state.location.search).toBe(`?voltar=${encodeURIComponent('/partidas/m_quarta')}`);
  });

  it('perfil incompleto: vai para o cadastro', async () => {
    const lucas = db.users.find((u) => u.id === 'u_lucas');
    if (lucas) lucas.profileCompleted = false;
    const { router } = renderApp('/turmas');

    expect(await screen.findByRole('heading', { level: 1, name: 'Complete seu perfil' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/cadastro');
  });

  it('logado tentando abrir o login: volta para o Início', async () => {
    const { router } = renderApp('/entrar');
    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
  });

  it('rota inexistente: mostra a página de não encontrado', async () => {
    renderApp('/nao-existe');
    expect(await screen.findByRole('heading', { level: 1, name: 'Página não encontrada' })).toBeInTheDocument();
  });

  it('turma sem aba: redireciona para Jogadores', async () => {
    const { router } = renderApp('/turmas/g_laranjeiras');
    await waitFor(() => expect(router.state.location.pathname).toBe('/turmas/g_laranjeiras/jogadores'));
  });
});
