import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { db } from '@/mocks/db';
import { useSessionStore } from '@/stores';
import { expectNoA11yViolations } from '@/test/a11y';
import { renderApp } from '@/test/renderWithProviders';

const part = (matchId: string, userId: string) =>
  db.participations.find((p) => p.matchId === matchId && p.userId === userId);
const pay = (id: string) => db.payments.find((p) => p.id === id);

describe('Sprint 4 — pagamentos, financeiro, sorteio e histórico', () => {
  it('dono valida o Pix do avulso: vaga confirmada e entrada no caixa', async () => {
    const user = userEvent.setup();
    renderApp('/partidas/m_quarta/presencas');
    const list = await screen.findByRole('list', { name: 'Pagamentos dos avulsos' });
    await user.click(within(list).getByRole('button', { name: 'Validar pagamento de Bruno Martins' }));
    await waitFor(() => expect(pay('pay_bruno_quarta')?.status).toBe('paid'));
    expect(part('m_quarta', 'u_bruno')?.status).toBe('confirmed');
    expect(db.ledger.some((e) => e.paymentId === 'pay_bruno_quarta' && e.direction === 'in')).toBe(true);
  });

  it('avulso avisa o Pix; dono recusa com motivo e o prazo volta a contar', async () => {
    // Carla sobe da fila e recebe a cobrança
    const m = db.matches.find((x) => x.id === 'm_quarta');
    const { promote } = await import('@/mocks/domain/attendance');
    if (m) promote(m, `p_m_quarta_u_carla`);
    const paymentId = part('m_quarta', 'u_carla')?.paymentId ?? '';
    db.session.userId = 'u_carla';

    const user = userEvent.setup();
    const { container, unmount } = renderApp('/partidas/m_quarta');
    await user.click(await screen.findByRole('link', { name: 'Pagar R$ 25,00 com Pix' }));
    expect(await screen.findByText('Chave Pix da turma')).toBeInTheDocument();
    expect(screen.getByRole('timer')).toHaveTextContent(/Faltam/);
    await expectNoA11yViolations(container);
    await user.type(screen.getByLabelText('Observação (opcional)'), 'Pix da conta do Nubank');
    await user.click(screen.getByRole('button', { name: 'Já fiz o Pix' }));
    expect(await screen.findByText('Pagamento informado. Aguardando quem organiza conferir.')).toBeInTheDocument();
    expect(pay(paymentId)).toMatchObject({ status: 'reported', reportNote: 'Pix da conta do Nubank' });
    unmount();

    db.session.userId = 'u_lucas';
    useSessionStore.setState({ accessToken: null, status: 'unknown' });
    renderApp('/partidas/m_quarta/presencas');
    const list = await screen.findByRole('list', { name: 'Pagamentos dos avulsos' });
    await user.click(within(list).getByRole('button', { name: 'Recusar pagamento de Carla Dias' }));
    const dialog = await screen.findByRole('dialog', { name: 'Recusar pagamento?' });
    await user.type(within(dialog).getByLabelText('Motivo'), 'Não caiu na conta');
    await user.click(within(dialog).getByRole('button', { name: 'Recusar' }));
    await waitFor(() => expect(pay(paymentId)?.status).toBe('rejected'));
    expect(part('m_quarta', 'u_carla')?.status).toBe('awaiting_payment');
  });

  it('financeiro: resumo, mensalidade em dinheiro e lançamento manual', async () => {
    const user = userEvent.setup();
    const { container } = renderApp('/turmas/g_laranjeiras/financeiro');
    expect(await screen.findByText('Saldo do caixa')).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Entradas por mês' })).toBeInTheDocument();
    await expectNoA11yViolations(container);

    const fees = await screen.findByRole('list', { name: /Mensalidades de/ });
    await user.click(within(fees).getByRole('button', { name: /Marcar pagamento de Camila Rocha/ }));
    await waitFor(() =>
      expect(db.payments.find((p) => p.userId === 'u_camila' && p.kind === 'monthly_fee')?.status).toBe('paid'),
    );

    await user.click(screen.getByRole('button', { name: 'Lançamento' }));
    const dialog = await screen.findByRole('dialog', { name: 'Novo lançamento' });
    await user.type(within(dialog).getByLabelText('Descrição'), 'Bolas novas');
    await user.type(within(dialog).getByLabelText('Valor'), '180');
    await user.click(within(dialog).getByRole('button', { name: 'Salvar lançamento' }));
    const entries = await screen.findByRole('list', { name: 'Movimentações' });
    expect(await within(entries).findByText('Bolas novas')).toBeInTheDocument();
    expect(db.ledger.find((e) => e.description === 'Bolas novas')).toMatchObject({
      direction: 'out',
      amountCents: 18000,
    });

    await user.click(within(entries).getByRole('button', { name: 'Excluir lançamento Bolas novas' }));
    await waitFor(() => expect(db.ledger.some((e) => e.description === 'Bolas novas')).toBe(false));
  });

  it('sorteio: fecha a lista, sorteia, troca dois jogadores e publica', async () => {
    const user = userEvent.setup();
    // Pix do Bruno validado para poder fechar
    const bruno = pay('pay_bruno_quarta');
    if (bruno) bruno.status = 'paid';
    const { router } = renderApp('/partidas/m_quarta');
    await user.click(await screen.findByRole('button', { name: 'Fechar lista' }));
    await user.click(await screen.findByRole('link', { name: 'Sortear times' }));

    await user.click(await screen.findByRole('button', { name: 'Sortear times' }));
    const teamA = await screen.findByRole('region', { name: 'Time A' });
    const teamB = screen.getByRole('region', { name: 'Time B' });
    expect(screen.getByText(/menos confirmados que o padrão/)).toBeInTheDocument();

    const before = db.draws.find((d) => d.matchId === 'm_quarta');
    const firstA = before?.teams[0]?.members[0]?.userId;
    const firstB = before?.teams[1]?.members[0]?.userId;
    const [a] = within(teamA).getAllByRole('button');
    const [b] = within(teamB).getAllByRole('button');
    if (!a || !b) throw new Error('times vazios');
    await user.click(a);
    expect(a).toHaveAttribute('aria-pressed', 'true');
    await user.click(b);
    await waitFor(() => {
      const after = db.draws.find((d) => d.matchId === 'm_quarta');
      expect(after?.teams[0]?.members[0]?.userId).toBe(firstB);
      expect(after?.teams[1]?.members[0]?.userId).toBe(firstA);
    });

    await user.click(screen.getByRole('button', { name: 'Publicar times' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/partidas/m_quarta/times'));
    expect(db.matches.find((m) => m.id === 'm_quarta')?.status).toBe('teams_published');
    expect(await screen.findByRole('region', { name: 'Time A' })).toBeInTheDocument();
  });

  it('jogador vê o próprio time destacado', async () => {
    const bruno = pay('pay_bruno_quarta');
    if (bruno) bruno.status = 'paid';
    const m = db.matches.find((x) => x.id === 'm_quarta');
    const { close } = await import('@/mocks/domain/attendance');
    const { drawTeams } = await import('@/mocks/domain/draw');
    if (!m) throw new Error();
    close(m);
    const draw = drawTeams(m, {
      name: '6×6',
      teamCount: 2,
      playersPerTeam: 6,
      balanceByLevel: true,
      distributePositions: true,
      extraPlayers: 'bench',
    });
    draw.status = 'published';
    db.draws.push(draw);
    m.status = 'teams_published';
    db.session.userId = 'u_ana';
    renderApp('/partidas/m_quarta/times');
    expect(await screen.findByText(/Você está no/)).toBeInTheDocument();
    expect(screen.getByText('(você)')).toBeInTheDocument();
  });

  it('padrões de sorteio: cria um novo na tela de regras', async () => {
    const user = userEvent.setup();
    renderApp('/turmas/g_laranjeiras/regras');
    await user.click(await screen.findByRole('button', { name: 'Padrão' }));
    const dialog = await screen.findByRole('dialog', { name: 'Novo padrão' });
    await user.type(within(dialog).getByLabelText('Nome'), '3×3');
    await user.clear(within(dialog).getByLabelText('Times'));
    await user.type(within(dialog).getByLabelText('Times'), '4');
    await user.clear(within(dialog).getByLabelText('Jogadores por time'));
    await user.type(within(dialog).getByLabelText('Jogadores por time'), '3');
    await user.click(within(dialog).getByRole('button', { name: 'Salvar padrão' }));
    const list = await screen.findByRole('list', { name: 'Padrões de sorteio' });
    expect(await within(list).findByText('3×3')).toBeInTheDocument();
    expect(db.drawTemplates.find((t) => t.name === '3×3')).toMatchObject({ teamCount: 4, playersPerTeam: 3 });
  });

  it('histórico mostra partidas jogadas e pagamentos', async () => {
    renderApp('/perfil/historico');
    const played = await screen.findByRole('list', { name: 'Partidas jogadas' });
    expect(within(played).getByRole('link', { name: /quarta passada/ })).toBeInTheDocument();
    expect(await screen.findByRole('list', { name: 'Pagamentos' })).toBeInTheDocument();
  });
});
