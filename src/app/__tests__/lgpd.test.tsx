import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { db } from '@/mocks/db';
import { expectNoA11yViolations } from '@/test/a11y';
import { renderApp } from '@/test/renderWithProviders';

describe('Etapa 14 — LGPD e conteúdo legal', () => {
  it('termos e privacidade abrem sem login', async () => {
    db.session.userId = null;
    const { container } = renderApp('/privacidade');
    expect(await screen.findByRole('heading', { level: 1, name: 'Política de privacidade' })).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Dados, finalidade e base legal' })).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });

  it('termos desatualizados pedem novo aceite e voltam para onde a pessoa ia', async () => {
    const lucas = db.users.find((u) => u.id === 'u_lucas');
    if (lucas) lucas.termsVersion = '2025-01';
    const user = userEvent.setup();
    const { router } = renderApp('/partidas');
    expect(await screen.findByRole('heading', { level: 1, name: 'Atualizamos nossos termos' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Aceitar e continuar' }));
    expect(await screen.findByText('Marque a caixa para continuar.')).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: /Li e aceito/ }));
    await user.click(screen.getByRole('button', { name: 'Aceitar e continuar' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/partidas'));
    expect(lucas?.termsVersion).toBe('2026-11');
  });

  it('baixa os dados da conta em JSON', async () => {
    const created: Blob[] = [];
    URL.createObjectURL = (b: Blob) => {
      created.push(b);
      return 'blob:x';
    };
    URL.revokeObjectURL = () => {};
    const user = userEvent.setup();
    renderApp('/perfil/privacidade');
    await user.click(await screen.findByRole('button', { name: 'Baixar meus dados' }));
    await waitFor(() => expect(created).toHaveLength(1));
    const data = JSON.parse(await created[0]!.text()) as { account: { nickname: string }; memberships: unknown[] };
    expect(data.account.nickname).toBe('lucas');
    expect(data.memberships.length).toBeGreaterThan(0);
  });

  it('dono de turma ativa não exclui a conta; jogador exclui e é anonimizado', async () => {
    const user = userEvent.setup();
    const { unmount } = renderApp('/perfil/privacidade');
    await user.click(await screen.findByRole('button', { name: 'Excluir minha conta' }));
    await user.click(await screen.findByRole('checkbox', { name: /definitiva/ }));
    await user.click(screen.getByRole('button', { name: 'Excluir conta' }));
    expect(await screen.findByRole('dialog', { name: 'Antes, resolva suas turmas' })).toBeInTheDocument();
    unmount();

    db.session.userId = 'u_camila';
    const { useSessionStore } = await import('@/stores');
    useSessionStore.setState({ accessToken: null, status: 'unknown' });
    const { router } = renderApp('/perfil/privacidade');
    await user.click(await screen.findByRole('button', { name: 'Excluir minha conta' }));
    await user.click(await screen.findByRole('checkbox', { name: /definitiva/ }));
    await user.click(screen.getByRole('button', { name: 'Excluir conta' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/entrar'));
    const camila = db.users.find((u) => u.id === 'u_camila');
    expect(camila?.name).toBe('Jogador removido');
    expect(db.participations.find((p) => p.userId === 'u_camila' && p.matchId === 'm_quarta')?.status).toBe('removed');
  });
});
