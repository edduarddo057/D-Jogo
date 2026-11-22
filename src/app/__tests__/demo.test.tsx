import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { sha256Hex } from '@/lib/demo';
import { db, newId, replaceDb } from '@/mocks/db';
import { loadDemoDb, saveDemoDb } from '@/mocks/demo';
import { createDemoDb, DEMO_PLAYERS } from '@/mocks/demo/seed';
import { renderApp } from '@/test/renderWithProviders';

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
