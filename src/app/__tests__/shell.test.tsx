import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '@/test/renderWithProviders';

/** Etapa 8 — pronto quando: as 4 abas navegam (celular e desktop usam o mesmo componente; o CSS muda o layout). */
describe('casca do app', () => {
  it('as 4 abas navegam, marcam a aba ativa e atualizam título e foco', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/');
    await screen.findByRole('heading', { level: 1, name: 'Olá, Lucas!' });
    const nav = screen.getByRole('navigation', { name: 'Principal' });

    const tabs: Array<[string, string, string]> = [
      ['Turmas', '/turmas', 'Turmas'],
      ['Partidas', '/partidas', 'Partidas'],
      ['Perfil', '/perfil', 'Perfil'],
      ['Início', '/', 'Olá, Lucas!'],
    ];
    for (const [label, path, heading] of tabs) {
      await user.click(within(nav).getByRole('link', { name: label }));
      await waitFor(() => expect(router.state.location.pathname).toBe(path));
      const h1 = await screen.findByRole('heading', { level: 1, name: heading });
      expect(within(nav).getByRole('link', { name: label })).toHaveAttribute('aria-current', 'page');
      await waitFor(() => expect(document.title).toBe(`${heading} · Dá Jogo`));
      await waitFor(() => expect(h1).toHaveFocus());
    }
  });

  it('aba fica ativa em subrotas e tem o link "Pular para o conteúdo"', async () => {
    renderApp('/partidas/m_quarta/presencas');
    const nav = await screen.findByRole('navigation', { name: 'Principal' });
    expect(within(nav).getByRole('link', { name: 'Partidas' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Pular para o conteúdo' })).toHaveAttribute('href', '#conteudo');
    expect(screen.getByRole('main')).toHaveAttribute('id', 'conteudo');
  });

  it('mostra "Sem conexão" quando a internet cai e esconde quando volta', async () => {
    renderApp('/');
    await screen.findByRole('heading', { level: 1, name: 'Olá, Lucas!' });
    const onLine = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(screen.getByText(/Sem conexão/)).toBeInTheDocument();
    onLine.mockReturnValue(true);
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    expect(screen.queryByText(/Sem conexão/)).not.toBeInTheDocument();
    onLine.mockRestore();
  });

  it('telas de fluxo não mostram a navegação principal', async () => {
    renderApp('/turmas/nova');
    await screen.findByRole('heading', { level: 1, name: 'Nova turma' });
    expect(screen.queryByRole('navigation', { name: 'Principal' })).not.toBeInTheDocument();
  });
});
