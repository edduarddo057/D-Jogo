import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLoginStore } from '@/features/auth';
import { db } from '@/mocks/db';
import { MOCK_OTP_CODE } from '@/mocks/handlers/auth';
import { expectNoA11yViolations } from '@/test/a11y';
import { renderApp } from '@/test/renderWithProviders';

const active = (groupId: string, userId: string) =>
  db.memberships.find((m) => m.groupId === groupId && m.userId === userId && m.status === 'active');

describe('Sprint 2 — convites, membros e regras', () => {
  beforeEach(() => {
    useLoginStore.getState().clear();
  });

  it('dono vê jogadores separados por vínculo e troca alguém para avulso', async () => {
    const user = userEvent.setup();
    const { container } = renderApp('/turmas/g_laranjeiras/jogadores');
    await screen.findByRole('heading', { level: 1, name: 'Vôlei — Laranjeiras' });
    const monthly = await screen.findByRole('list', { name: 'Mensalistas' });
    expect(within(monthly).getByText('Organizador')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Convidar' })).toBeInTheDocument();
    await expectNoA11yViolations(container);

    await user.click(within(monthly).getByRole('button', { name: /Camila Rocha/ }));
    await user.click(await screen.findByRole('button', { name: /Tornar avulso/ }));

    const dropIn = await screen.findByRole('list', { name: 'Avulsos' });
    await waitFor(() => expect(within(dropIn).getByText('Camila Rocha')).toBeInTheDocument());
    expect(active('g_laranjeiras', 'u_camila')?.type).toBe('drop_in');
  });

  it('dono remove um jogador com confirmação', async () => {
    const user = userEvent.setup();
    renderApp('/turmas/g_laranjeiras/jogadores');
    const monthly = await screen.findByRole('list', { name: 'Mensalistas' });
    await user.click(within(monthly).getByRole('button', { name: /Diego Ferreira/ }));
    await user.click(await screen.findByRole('button', { name: 'Remover da turma' }));
    await user.click(await screen.findByRole('button', { name: 'Remover' }));
    await waitFor(() => expect(screen.queryByText('Diego Ferreira')).not.toBeInTheDocument());
    expect(active('g_laranjeiras', 'u_diego')).toBeUndefined();
  });

  it('dono adiciona jogador pelo nickname', async () => {
    const user = userEvent.setup();
    renderApp('/turmas/g_laranjeiras/jogadores');
    await user.click(await screen.findByRole('button', { name: 'Jogador' }));
    await user.type(await screen.findByLabelText('Nickname'), '@ninguem');
    await user.click(screen.getByRole('button', { name: 'Adicionar' }));
    expect(await screen.findByText('Nenhum jogador com esse nickname.')).toBeInTheDocument();

    await user.clear(screen.getByLabelText('Nickname'));
    await user.type(screen.getByLabelText('Nickname'), '@sofia');
    await user.click(screen.getByRole('tab', { name: 'Avulso' }));
    await user.click(screen.getByRole('button', { name: 'Adicionar' }));
    const dropIn = await screen.findByRole('list', { name: 'Avulsos' });
    await waitFor(() => expect(within(dropIn).getByText('Sofia Andrade')).toBeInTheDocument());
    expect(active('g_laranjeiras', 'u_sofia')?.type).toBe('drop_in');
  });

  it('jogador não vê gestão e pode sair da turma', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/turmas/g_centro/jogadores');
    await screen.findByRole('heading', { level: 1, name: 'Vôlei — Centro' });
    await screen.findByRole('list', { name: 'Mensalistas' });
    expect(screen.queryByRole('link', { name: 'Convidar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Financeiro' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Gabriela/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Sair da turma' }));
    await user.click(await screen.findByRole('button', { name: 'Sair' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/turmas'));
    expect(active('g_centro', 'u_lucas')).toBeUndefined();
  });

  it('gera, mostra e desativa links de convite', async () => {
    const user = userEvent.setup();
    const { container } = renderApp('/turmas/g_laranjeiras/convidar');
    await screen.findByRole('heading', { level: 1, name: 'Convidar jogadores' });

    await user.click(await screen.findByRole('button', { name: 'Gerar link' }));
    const card = await screen.findByRole('article', { name: 'Link para mensalista' });
    expect(within(card).getByRole('link', { name: /WhatsApp/ })).toHaveAttribute(
      'href',
      expect.stringContaining('wa.me'),
    );
    await user.click(within(card).getByRole('button', { name: 'QR Code' }));
    expect(await within(card).findByRole('img', { name: 'QR Code do convite' })).toBeInTheDocument();
    await expectNoA11yViolations(container);

    await user.click(screen.getByRole('tab', { name: 'Avulso' }));
    const dropIn = await screen.findByRole('article', { name: 'Link para avulso' });
    expect(within(dropIn).getByText(/LARANJA7/)).toBeInTheDocument();
    await user.click(within(dropIn).getByRole('button', { name: 'Desativar este link' }));
    expect(await screen.findByRole('button', { name: 'Gerar link' })).toBeInTheDocument();
    expect(db.invites.find((i) => i.code === 'LARANJA7')?.revokedAt).not.toBeNull();
  });

  it('convite sem login: entra com o celular e já cai na turma', async () => {
    db.session.userId = null;
    const user = userEvent.setup();
    const { router, container } = renderApp('/convite/LARANJA7');
    await screen.findByRole('heading', { level: 1, name: 'Vôlei — Laranjeiras' });
    expect(screen.getByText('Entrar como avulso')).toBeInTheDocument();
    await expectNoA11yViolations(container);

    await user.click(screen.getByRole('button', { name: 'Entrar e participar' }));
    await user.type(await screen.findByLabelText('Seu celular'), '21980019998');
    await user.click(screen.getByRole('button', { name: 'Receber código' }));
    await user.click(await screen.findByLabelText('Dígito 1 de 6'));
    await user.keyboard(MOCK_OTP_CODE);

    await waitFor(() => expect(router.state.location.pathname).toBe('/turmas/g_laranjeiras/jogadores'));
    expect(active('g_laranjeiras', 'u_sofia')?.type).toBe('drop_in');
  });

  it('convite revogado mostra o motivo', async () => {
    const invite = db.invites.find((i) => i.code === 'LARANJA7');
    if (invite) invite.revokedAt = new Date().toISOString();
    renderApp('/convite/LARANJA7');
    expect(await screen.findByRole('heading', { level: 1, name: 'Convite indisponível' })).toBeInTheDocument();
    expect(screen.getByText(/desativou este link/)).toBeInTheDocument();
  });

  it('regras salvam na hora', async () => {
    const user = userEvent.setup();
    renderApp('/turmas/g_laranjeiras/regras');
    const toggle = await screen.findByRole('switch', { name: 'Subir da fila automaticamente' });
    expect(toggle).toBeChecked();
    await user.click(toggle);
    await waitFor(() => expect(db.groups[0]?.rules.waitlistAutoPromote).toBe(false));

    await user.selectOptions(screen.getByLabelText('Prazo para pagar a vaga'), '360');
    await waitFor(() => expect(db.groups[0]?.rules.dropInPaymentWindowMinutes).toBe(360));
  });

  it('edita os dados da turma', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/turmas/g_laranjeiras/editar');
    const name = await screen.findByLabelText('Nome da turma');
    await user.clear(name);
    await user.type(name, 'Vôlei de Quarta');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/turmas/g_laranjeiras/jogadores'));
    expect(await screen.findByRole('heading', { level: 1, name: 'Vôlei de Quarta' })).toBeInTheDocument();
  });
});
