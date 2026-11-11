import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLoginStore } from '@/features/auth';
import { db } from '@/mocks/db';
import { MOCK_OTP_CODE } from '@/mocks/handlers/auth';
import { expectNoA11yViolations } from '@/test/a11y';
import { renderApp } from '@/test/renderWithProviders';

async function login(user: ReturnType<typeof userEvent.setup>, phone: string) {
  await user.type(await screen.findByLabelText('Seu celular'), phone);
  await user.click(screen.getByRole('button', { name: 'Receber código' }));
  await screen.findByRole('heading', { level: 1, name: 'Digite o código' });
  await user.click(screen.getByLabelText('Dígito 1 de 6'));
  await user.keyboard(MOCK_OTP_CODE);
}

describe('Sprint 1 — acesso, perfil e turma', () => {
  beforeEach(() => {
    db.session.userId = null;
    useLoginStore.getState().clear();
  });

  it('login com celular e código leva de volta para onde a pessoa ia', async () => {
    const user = userEvent.setup();
    const { router, container } = renderApp('/turmas');
    await screen.findByRole('heading', { level: 1, name: 'Entrar' });
    await expectNoA11yViolations(container);

    await login(user, '21998765432');

    await waitFor(() => expect(router.state.location.pathname).toBe('/turmas'));
    expect(await screen.findByRole('link', { name: /Vôlei — Laranjeiras/ })).toHaveAttribute(
      'href',
      '/turmas/g_laranjeiras',
    );
  });

  it('código errado mostra erro e não entra', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/entrar');
    await user.type(await screen.findByLabelText('Seu celular'), '21998765432');
    await user.click(screen.getByRole('button', { name: 'Receber código' }));
    await user.click(await screen.findByLabelText('Dígito 1 de 6'));
    await user.keyboard('000000');
    expect(await screen.findByRole('alert')).toHaveTextContent(/código/i);
    expect(router.state.location.pathname).toBe('/entrar/codigo');
  });

  it('primeiro acesso: cadastro completo e Início com convite para criar turma', async () => {
    const user = userEvent.setup();
    const { router, container } = renderApp('/');
    await screen.findByRole('heading', { level: 1, name: 'Entrar' });
    await login(user, '11912345678');

    await screen.findByRole('heading', { level: 1, name: 'Complete seu perfil' });
    expect(router.state.location.pathname).toBe('/cadastro');

    await user.type(screen.getByLabelText('Seu nome'), 'Marina Souza');
    await user.type(screen.getByLabelText(/Nickname/), 'marina');
    await user.click(await screen.findByRole('checkbox', { name: /Levantador/ }));
    await user.click(screen.getByRole('radio', { name: /Intermediário/ }));
    await expectNoA11yViolations(container);

    // Sem aceitar os termos não avança
    await user.click(screen.getByRole('button', { name: 'Concluir cadastro' }));
    expect(await screen.findByText('Para continuar, aceite os termos de uso')).toBeInTheDocument();

    await user.click(screen.getByRole('checkbox', { name: /Li e aceito/ }));
    await user.click(screen.getByRole('button', { name: 'Concluir cadastro' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Olá, Marina!' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/');
    expect(await screen.findByRole('heading', { name: 'Comece pela sua turma' })).toBeInTheDocument();
    const marina = db.users.find((u) => u.nickname === 'marina');
    expect(marina?.profileCompleted).toBe(true);
  });

  it('nickname em uso sugere alternativas', async () => {
    const user = userEvent.setup();
    renderApp('/');
    await screen.findByRole('heading', { level: 1, name: 'Entrar' });
    await login(user, '11912345678');
    await screen.findByRole('heading', { level: 1, name: 'Complete seu perfil' });

    await user.type(screen.getByLabelText(/Nickname/), 'lucas');
    expect(await screen.findByText('Esse nickname já está em uso.')).toBeInTheDocument();
    const [suggestion] = await screen.findAllByRole('button', { name: /^lucas/ });
    if (!suggestion) throw new Error('sem sugestões');
    await user.click(suggestion);
    expect(await screen.findByText('Disponível')).toBeInTheDocument();
  });

  it('cria uma turma e vira o organizador', async () => {
    db.session.userId = 'u_lucas';
    const user = userEvent.setup();
    const { router, container } = renderApp('/turmas/nova');
    await screen.findByRole('heading', { level: 1, name: 'Nova turma' });
    await expectNoA11yViolations(container);

    await user.click(screen.getByRole('button', { name: 'Criar turma' }));
    expect(await screen.findByText('Mínimo de 3 letras')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Nome da turma'), 'Vôlei de sábado');
    await user.type(screen.getByLabelText('Onde vocês jogam'), 'Praia do Leme');
    await user.type(screen.getByLabelText('Mensalidade'), '80');
    await user.type(screen.getByLabelText('Avulso'), '25');
    await user.click(screen.getByRole('button', { name: 'Criar turma' }));

    await waitFor(() => expect(router.state.location.pathname).toMatch(/^\/turmas\/g_[^/]+\/jogadores$/));
    const created = db.groups.find((g) => g.name === 'Vôlei de sábado');
    expect(created).toMatchObject({ ownerId: 'u_lucas', monthlyFeeCents: 8000, dropInFeeCents: 2500 });
  });

  it('perfil: edita os dados e sai da conta', async () => {
    db.session.userId = 'u_lucas';
    const user = userEvent.setup();
    const { router } = renderApp('/perfil');
    await screen.findByRole('heading', { level: 1, name: 'Perfil' });
    await user.click(await screen.findByRole('link', { name: /Seus dados/ }));

    const name = await screen.findByLabelText('Seu nome');
    await waitFor(() => expect(name).toHaveValue(db.users.find((u) => u.id === 'u_lucas')?.name));
    await user.clear(name);
    await user.type(name, 'Lucas Andrade');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/perfil'));
    expect(await screen.findByText('Lucas Andrade')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Sair' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/entrar'));
    expect(db.session.userId).toBeNull();
  });
});
