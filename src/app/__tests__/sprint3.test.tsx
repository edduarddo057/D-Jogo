import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { db } from '@/mocks/db';
import { expectNoA11yViolations } from '@/test/a11y';
import { renderApp } from '@/test/renderWithProviders';

const part = (matchId: string, userId: string) =>
  db.participations.find((p) => p.matchId === matchId && p.userId === userId);

describe('Sprint 3 — partidas, presença e lista de espera', () => {
  it('mensalista com vaga reservada confirma e depois desiste', async () => {
    const user = userEvent.setup();
    const { container } = renderApp('/partidas/m_quarta');
    expect(await screen.findByRole('heading', { name: 'Sua vaga está reservada' })).toBeInTheDocument();
    expect(screen.getByText('12 de 16 confirmados')).toBeInTheDocument();
    await expectNoA11yViolations(container);

    await user.click(screen.getByRole('button', { name: 'Vou jogar' }));
    // otimista: muda na hora
    expect(await screen.findByRole('heading', { name: 'Você está confirmado' })).toBeInTheDocument();
    expect(screen.getByText('13 de 16 confirmados')).toBeInTheDocument();
    await waitFor(() => expect(part('m_quarta', 'u_lucas')?.status).toBe('confirmed'));

    await user.click(screen.getByRole('button', { name: 'Não vou mais' }));
    expect(await screen.findByRole('heading', { name: 'Você disse que não vai' })).toBeInTheDocument();
    await waitFor(() => expect(part('m_quarta', 'u_lucas')?.status).toBe('declined'));
  });

  it('erro no servidor desfaz a resposta otimista', async () => {
    const user = userEvent.setup();
    renderApp('/partidas/m_quarta');
    await screen.findByRole('heading', { name: 'Sua vaga está reservada' });
    const m = db.matches.find((x) => x.id === 'm_quarta');
    if (m) m.status = 'closed'; // fechou enquanto a pessoa olhava
    await user.click(screen.getByRole('button', { name: 'Vou jogar' }));
    expect(await screen.findByText('A lista desta partida já está fechada.')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'A lista está fechada' })).toBeInTheDocument();
  });

  it('avulso que desiste libera a vaga e o primeiro da fila sobe sozinho', async () => {
    db.session.userId = 'u_rafael';
    const user = userEvent.setup();
    renderApp('/partidas/m_quarta');
    await screen.findByRole('heading', { name: 'Você está confirmado' });
    expect(screen.queryByRole('heading', { name: 'Organizar' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Desistir da vaga' }));
    expect(await screen.findByText('Você saiu da partida.')).toBeInTheDocument();
    expect(part('m_quarta', 'u_rafael')?.status).toBe('left');
    expect(part('m_quarta', 'u_carla')?.status).toBe('awaiting_payment');
    const espera = await screen.findByRole('list', { name: 'Lista de espera' });
    await waitFor(() => expect(within(espera).queryByText('Carla Dias')).not.toBeInTheDocument());
  });

  it('avulso novo com fila: entra na lista de espera com a posição', async () => {
    db.memberships.push({
      id: 'mb_x',
      groupId: 'g_laranjeiras',
      userId: 'u_sofia',
      type: 'drop_in',
      status: 'active',
      joinedAt: '2026-11-01T00:00:00Z',
    });
    db.session.userId = 'u_sofia';
    const user = userEvent.setup();
    renderApp('/partidas/m_quarta');
    await user.click(await screen.findByRole('button', { name: 'Entrar na fila' }));
    expect(await screen.findByRole('heading', { name: 'Você é o 3º da fila' })).toBeInTheDocument();
    expect(screen.getByText('Você é o 3º da lista de espera.')).toBeInTheDocument();
  });

  it('dono cria e publica uma partida; mensalistas ficam com vaga reservada', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/turmas/g_laranjeiras/partidas/nova');
    const title = await screen.findByLabelText('Nome da partida');
    expect(title).toHaveValue('Partida de quarta');
    await user.clear(title);
    await user.type(title, 'Jogo especial');
    await user.clear(screen.getByLabelText('Data'));
    await user.type(screen.getByLabelText('Data'), '2026-12-02');
    await user.click(screen.getByRole('button', { name: 'Criar partida' }));

    await waitFor(() => expect(router.state.location.pathname).toMatch(/^\/partidas\/m_/));
    expect(await screen.findByRole('heading', { level: 1, name: 'Jogo especial' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Sua vaga está reservada' })).toBeInTheDocument();
    const created = db.matches.find((m) => m.title === 'Jogo especial');
    expect(created?.status).toBe('open');
    expect(db.participations.filter((p) => p.matchId === created?.id && p.status === 'pending')).toHaveLength(14);
    // prazo padrão da turma: 1 dia antes, 18h (BRT)
    expect(created?.responseDeadline).toBe('2026-12-01T21:00:00.000Z');
  });

  it('dono gerencia presenças: sobe da fila e remove', async () => {
    const user = userEvent.setup();
    const { container } = renderApp('/partidas/m_quarta/presencas');
    await screen.findByRole('heading', { level: 1, name: 'Presenças' });
    await user.click(await screen.findByRole('button', { name: 'Subir Carla Dias da fila' }));
    await waitFor(() => expect(part('m_quarta', 'u_carla')?.status).toBe('awaiting_payment'));
    await expectNoA11yViolations(container);

    await user.click(await screen.findByRole('button', { name: 'Remover Ana Nogueira' }));
    await user.click(await screen.findByRole('button', { name: 'Remover' }));
    await waitFor(() => expect(part('m_quarta', 'u_ana')?.status).toBe('removed'));
    // a vaga liberada vai para o próximo da fila
    await waitFor(() => expect(part('m_quarta', 'u_pedro')?.status).toBe('awaiting_payment'));
  });

  it('fechar lista com Pix para validar é recusado; cancelar pede motivo', async () => {
    const user = userEvent.setup();
    renderApp('/partidas/m_quarta');
    expect(await screen.findByText('1 pagamento aguarda sua validação.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Fechar lista' }));
    expect(await screen.findByText('Valide os pagamentos pendentes antes de fechar a lista.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cancelar partida' }));
    const dialog = await screen.findByRole('dialog', { name: 'Cancelar partida?' });
    const confirm = within(dialog).getByRole('button', { name: 'Cancelar partida' });
    expect(confirm).toBeDisabled();
    await user.type(within(dialog).getByLabelText('Motivo'), 'Chuva forte');
    await user.click(confirm);
    expect(await screen.findByText(/Partida cancelada\./)).toBeInTheDocument();
    expect(db.matches.find((m) => m.id === 'm_quarta')?.cancelReason).toBe('Chuva forte');
    expect(db.payments.find((p) => p.id === 'pay_bruno_quarta')?.status).toBe('cancelled');
  });

  it('rascunho: publica, fecha, reabre, inicia e finaliza', async () => {
    const user = userEvent.setup();
    renderApp('/partidas/m_quarta_2');
    await user.click(await screen.findByRole('button', { name: 'Publicar' }));
    await user.click(await screen.findByRole('button', { name: 'Fechar lista' }));
    expect(await screen.findByText('Lista fechada', { selector: 'span' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Reabrir lista' }));
    await user.click(await screen.findByRole('button', { name: 'Fechar lista' }));
    await user.click(await screen.findByRole('button', { name: 'Iniciar partida' }));
    await user.click(await screen.findByRole('button', { name: 'Finalizar partida' }));
    await waitFor(() => expect(db.matches.find((m) => m.id === 'm_quarta_2')?.status).toBe('finished'));
  });

  it('lista "Partidas" separa próximas e jogadas', async () => {
    const user = userEvent.setup();
    renderApp('/partidas');
    const upcoming = await screen.findByRole('list', { name: 'Próximas partidas' });
    expect(within(upcoming).getByRole('link', { name: /Partida de quarta/ })).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'Jogadas' }));
    const played = await screen.findByRole('list', { name: 'Partidas jogadas' });
    expect(within(played).getByRole('link', { name: /quarta passada/ })).toBeInTheDocument();
  });
});
