import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useGameDayStore } from '@/features/live';
import { sha256Hex, startDemo } from '@/lib/demo';
import { db, newId, replaceDb } from '@/mocks/db';
import { loadDemoDb, saveDemoDb } from '@/mocks/demo';
import { createDemoDb, DEMO_PLAYERS } from '@/mocks/demo/seed';
import { renderApp } from '@/test/renderWithProviders';

/** Espera a fila do dia de jogo esvaziar, para nada vazar para o próximo teste (os ids da demo se repetem). */
const syncDone = () => waitFor(() => expect(useGameDayStore.getState().sessions.demo_jogo?.outbox.length ?? 0).toBe(0));

/** Modo demonstração: turma pronta, sem cadastro, dados salvos no aparelho. */
describe('Modo demonstração', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('o organizador da demo entra direto e vê o jogo de hoje com a turma toda confirmada', async () => {
    replaceDb(createDemoDb());
    renderApp('/');
    const card = await screen.findByRole('article', { name: /Turma Demo/ });
    expect(within(card).getByText(/14 de 14/)).toBeInTheDocument();
  });

  it('o dia de jogo da demo já começa com os 14 marcados e sorteia', async () => {
    replaceDb(createDemoDb());
    const user = userEvent.setup();
    renderApp('/organizar/demo_turma/dia-de-jogo/demo_jogo');
    await screen.findByRole('heading', { name: 'Quem chegou?' });
    await user.click(screen.getByRole('button', { name: `Sortear times com ${DEMO_PLAYERS.length + 1}` }));
    expect(await screen.findByRole('button', { name: 'Começar' })).toBeInTheDocument();
    await syncDone();
  });

  it('o organizador da demo já tem os termos aceitos na versão que o app exige (não para em "aceitar termos")', async () => {
    const { TERMS_VERSION } = await import('@/lib/config');
    vi.stubEnv('VITE_TERMS_VERSION', '');
    const demo = createDemoDb();
    expect(demo.users.find((u) => u.id === demo.session.userId)?.termsVersion).toBe(TERMS_VERSION);
  });

  it('o que foi feito fica salvo no aparelho e volta igual, sem repetir ids', () => {
    replaceDb(createDemoDb());
    db.rounds.push({
      id: newId('rd'),
      matchId: 'demo_jogo',
      drawId: 'x',
      number: 1,
      finishedAt: new Date().toISOString(),
      teams: [],
      winnerTeamId: '',
      scorers: [],
      clientId: null,
    });
    const lastId = newId('x');
    saveDemoDb(db);

    replaceDb(createDemoDb()); // como se o app tivesse fechado
    expect(db.rounds).toHaveLength(0);
    expect(loadDemoDb()).not.toBeNull();
    expect(db.rounds).toHaveLength(1);
    expect(newId('x')).not.toBe(lastId);
  });

  it('em Membros, adiciona pessoa só pelo nome: sem conta, já confirmada no jogo (mesmo cheio)', async () => {
    startDemo();
    replaceDb(createDemoDb());
    const user = userEvent.setup();
    renderApp('/organizar/demo_turma/membros');
    await user.click(await screen.findByRole('button', { name: 'Adicionar pessoa' }));
    const sheet = await screen.findByRole('dialog', { name: 'Adicionar pessoa' });
    await user.type(within(sheet).getByLabelText('Nome'), 'Paula Mendes');
    await user.click(within(sheet).getByRole('button', { name: 'Adicionar' }));

    await waitFor(() => expect(db.users.find((u) => u.name === 'Paula Mendes')).toBeDefined());
    const paula = db.users.find((u) => u.name === 'Paula Mendes');
    expect(db.memberships.find((m) => m.userId === paula?.id)?.status).toBe('active');
    const jogo = db.matches.find((m) => m.id === 'demo_jogo');
    expect(db.participations.find((p) => p.userId === paula?.id && p.matchId === 'demo_jogo')?.status).toBe(
      'confirmed',
    );
    expect(jogo?.capacity).toBe(15); // abriu uma vaga a mais
    expect(await screen.findByText(/Paula entrou na turma/)).toBeInTheDocument();
  });

  it('no dia de jogo, pessoa nova entra já marcada como chegou', async () => {
    startDemo();
    replaceDb(createDemoDb());
    const user = userEvent.setup();
    renderApp('/organizar/demo_turma/dia-de-jogo/demo_jogo');
    await user.click(await screen.findByRole('button', { name: 'Adicionar quem não estava na lista' }));
    const sheet = await screen.findByRole('dialog', { name: 'Quem chegou sem estar na lista' });
    await user.type(within(sheet).getByLabelText('Nome'), 'Rui Teixeira');
    await user.click(within(sheet).getByRole('button', { name: 'Adicionar e marcar que chegou' }));
    expect(await screen.findByRole('button', { name: 'Sortear times com 15' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Rui/ })).toBeInTheDocument();
    await syncDone();
  });

  it('fora da demonstração, "Adicionar pessoa" não aparece', async () => {
    renderApp('/organizar/g_sabado/membros');
    await screen.findByText(/Nível e gênero só você vê/);
    expect(screen.queryByRole('button', { name: 'Adicionar pessoa' })).not.toBeInTheDocument();
  });

  it('/demo pede a senha: errada avisa, certa liga a demonstração', async () => {
    vi.stubEnv('VITE_DEMO_PASSWORD_HASH', await sha256Hex('BoraJogar2026'));
    const user = userEvent.setup();
    renderApp('/demo');
    await screen.findByRole('heading', { name: 'Modo demonstração' });
    await user.type(screen.getByLabelText('Senha da demonstração'), 'errada');
    await user.click(screen.getByRole('button', { name: 'Entrar na demonstração' }));
    expect(await screen.findByText('Senha incorreta.')).toBeInTheDocument();
    expect(localStorage.getItem('dajogo:demo')).toBeNull();

    await user.clear(screen.getByLabelText('Senha da demonstração'));
    await user.type(screen.getByLabelText('Senha da demonstração'), 'BoraJogar2026');
    await user.click(screen.getByRole('button', { name: 'Entrar na demonstração' }));
    await waitFor(() => expect(JSON.parse(localStorage.getItem('dajogo:demo') ?? '{}').active).toBe(true));
  });

  it('sem senha configurada, /demo fica fechada', async () => {
    vi.stubEnv('VITE_DEMO_PASSWORD_HASH', '');
    renderApp('/demo');
    expect(await screen.findByText('Demonstração fechada')).toBeInTheDocument();
  });
});
