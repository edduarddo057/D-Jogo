import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { db } from '@/mocks/db';
import { usePwaStore } from '@/stores';
import { expectNoA11yViolations } from '@/test/a11y';
import { renderApp } from '@/test/renderWithProviders';

/** Manual de usabilidade 2.0 — navegação e fluxos do jogador (seções 2 e 3). */

describe('2. Navegação', () => {
  it('quem organiza vê 4 abas, com o número de pendências em Organizar', async () => {
    renderApp('/');
    const nav = await screen.findByRole('navigation', { name: 'Abas' });
    await within(nav).findByRole('link', { name: /Organizar, 10 pendências/ });
    expect(
      within(nav)
        .getAllByRole('link')
        .map((l) => l.textContent?.split(',')[0]?.replace(/\d+/g, '')),
    ).toEqual(['Jogos', 'Turmas', 'Organizar', 'Perfil']);
  });

  it('quem só joga vê 3 abas e nenhuma ferramenta de organizador', async () => {
    db.session.userId = 'u_vini';
    renderApp('/');
    const nav = await screen.findByRole('navigation', { name: 'Abas' });
    await screen.findByRole('heading', { level: 1, name: 'Jogos' });
    await waitFor(() => expect(within(nav).getAllByRole('link')).toHaveLength(3));
    expect(within(nav).queryByRole('link', { name: /Organizar/ })).not.toBeInTheDocument();
  });
});

describe('3.2 Jogos', () => {
  it('Próximo em destaque e Depois, cada um com a ação no próprio card', async () => {
    const { container } = renderApp('/');
    await screen.findByRole('heading', { name: 'Próximo' });
    const quarta = await screen.findByRole('article', { name: /Vôlei de quarta/ });
    expect(within(quarta).getByText(/Pague/)).toBeInTheDocument();
    expect(within(quarta).getByRole('button', { name: /Pagar R\$ 30/ })).toBeInTheDocument();
    const [sabado] = screen.getAllByRole('article', { name: /Vôlei de sábado/ });
    if (!sabado) throw new Error('sem card');
    expect(within(sabado).getByText(/Responda até/)).toBeInTheDocument();
    expect(screen.getByText(/A lista abre/)).toBeInTheDocument();
    // quem já jogou vê os próprios números em cima; "Último jogo" não existe mais
    expect(await screen.findByLabelText('Seus números')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Último jogo' })).not.toBeInTheDocument();
    await expectNoA11yViolations(container);
  });

  it('tocar no mural abre as estatísticas: nível, números, onde vai melhor e conquistas', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/');
    await user.click(await screen.findByRole('link', { name: /Ver estatísticas/ }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Suas estatísticas' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Seu nível' })).toHaveTextContent(/Nível \d/);
    expect(screen.getByLabelText('Seus números')).toHaveTextContent(/de vitórias/);
    expect(screen.getByRole('heading', { name: 'Onde você vai melhor' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Conquistas' })).toBeInTheDocument();
    expect(screen.getByText('Estreia')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Voltar para Jogos' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
  });

  it('estatísticas de quem nunca jogou convidam a começar', async () => {
    db.session.userId = 'u_sofia';
    renderApp('/voce/estatisticas');
    expect(await screen.findByText('Seu mural começa no primeiro jogo')).toBeInTheDocument();
  });

  it('quem nunca jogou não vê números: começa direto pelos jogos', async () => {
    db.session.userId = 'u_sofia';
    renderApp('/');
    await screen.findByRole('heading', { level: 1, name: 'Jogos' });
    await screen.findByText(/Nenhum jogo por enquanto|Próximo/);
    expect(screen.queryByLabelText('Seus números')).not.toBeInTheDocument();
  });

  it('responde "Vou" sem sair da tela e dá para mudar', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/');
    const [sabado] = await screen.findAllByRole('article', { name: /Vôlei de sábado/ });
    if (!sabado) throw new Error('sem card');
    await user.click(within(sabado).getByRole('button', { name: 'Vou' }));
    expect(await within(sabado).findByText('Você vai')).toBeInTheDocument();
    await waitFor(() =>
      expect(db.participations.find((p) => p.matchId === 'm_sab' && p.userId === 'u_marina')?.status).toBe('confirmed'),
    );
    await user.click(within(sabado).getByRole('button', { name: 'Mudar' }));
    expect(within(sabado).getByRole('button', { name: 'Não vou' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/');
  });

  it('avulso com a lista cheia vê a posição na fila', async () => {
    db.session.userId = 'u_vini';
    renderApp('/');
    const [card] = await screen.findAllByRole('article', { name: /Vôlei de sábado, sáb/ });
    if (!card) throw new Error('sem card');
    expect(within(card).getByText('2º na fila')).toBeInTheDocument();
    expect(within(card).getByText(/Se abrir vaga, você entra e a gente avisa/)).toBeInTheDocument();
  });
});

describe('3.3 Pagar com Pix', () => {
  it('abre numa folha por cima de Jogos: copiar código, já paguei, e o Voltar volta para Jogos', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/');
    await user.click(await screen.findByRole('button', { name: /Pagar R\$ 30/ }));
    const sheet = await screen.findByRole('dialog', { name: 'Pagamento' });
    expect(router.state.location.pathname).toBe('/');
    expect(within(sheet).getByText('R$ 30,00')).toBeInTheDocument();
    expect(within(sheet).getByText('Pix para Otávio Prado')).toBeInTheDocument();
    await user.click(within(sheet).getByRole('button', { name: 'Copiar código Pix' }));
    await user.click(await within(sheet).findByRole('button', { name: 'Já paguei' }));
    expect(await within(sheet).findByText('Pagamento enviado')).toBeInTheDocument();
    expect(within(sheet).getByText(/Otávio vai conferir/)).toBeInTheDocument();
    expect(db.payments.find((p) => p.id === 'pay_marina_qua')?.status).toBe('reported');
    await user.click(within(sheet).getByRole('button', { name: 'Pronto' }));
    await waitFor(() => expect(router.state.location.search).toBe(''));
    expect(router.state.location.pathname).toBe('/');
  });
});

describe('3.4 Detalhe do jogo', () => {
  it('mostra a resposta, o local, o calendário, quem vai com a fila e as regras', async () => {
    const { container } = renderApp('/jogos/m_sab');
    expect(await screen.findByRole('heading', { level: 1, name: /Sáb,/ })).toBeInTheDocument();
    expect(screen.getByText(/Você vai\? Responda até/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Mapa' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Adicionar ao calendário/ })).toBeInTheDocument();
    expect(await screen.findByText(/Na fila: 1º Pedro, 2º Vini/)).toBeInTheDocument();
    expect(screen.getByText('Desistir sem penalidade')).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });

  it('tocar em quem vai abre a lista de confirmados e da fila', async () => {
    const user = userEvent.setup();
    renderApp('/jogos/m_sab');
    await screen.findByText(/Na fila: 1º Pedro, 2º Vini/);
    await user.click(screen.getByRole('button', { name: /Ver quem vai/ }));
    const sheet = await screen.findByRole('dialog', { name: /Quem vai/ });
    expect(within(sheet).getByRole('list', { name: 'Confirmados' })).toBeInTheDocument();
    const fila = within(sheet).getByRole('list', { name: 'Na fila' });
    expect(within(fila).getByText('1º na fila · Avulso')).toBeInTheDocument();
  });
});

describe('3.5 Avisos', () => {
  it('responde "Vou" no próprio aviso e o aviso de pagamento abre a folha de Pix, ficando em Avisos', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/avisos');
    const list = await screen.findByRole('heading', { name: 'Novos' });
    expect(list).toBeInTheDocument();
    const notice = (await screen.findByText('Lista aberta: Vôlei de sábado')).closest('li');
    if (!notice) throw new Error('sem aviso');
    await user.click(within(notice).getByRole('button', { name: 'Vou' }));
    expect(await within(notice).findByText('Você vai')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Pague para garantir a vaga/ }));
    expect(await screen.findByRole('dialog', { name: 'Pagamento' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/avisos');
  });
});

describe('3.6 Turmas', () => {
  it('lista as turmas e o + abre Entrar com convite e Criar turma', async () => {
    const user = userEvent.setup();
    renderApp('/turmas');
    expect(await screen.findByRole('link', { name: /Vôlei de sábado/ })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Entrar com convite ou criar turma' }));
    const sheet = await screen.findByRole('dialog');
    expect(within(sheet).getByRole('button', { name: /Entrar com convite/ })).toBeInTheDocument();
    expect(within(sheet).getByRole('button', { name: /Criar uma turma/ })).toBeInTheDocument();
  });

  it('turma como jogador: nada editável, regras simples e Sair da turma', async () => {
    db.session.userId = 'u_dudu';
    const { container } = renderApp('/turmas/g_sabado');
    expect(await screen.findByRole('heading', { level: 1, name: 'Vôlei de sábado' })).toBeInTheDocument();
    expect(screen.getByText(/Você é avulso · organizada por Marina/)).toBeInTheDocument();
    expect(await screen.findByText('Desistir sem penalidade')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sair da turma' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Novo jogo|Convidar|Remover/ })).not.toBeInTheDocument();
    await expectNoA11yViolations(container);
  });

  it('membros separados em Mensalistas e Avulsos, em ordem alfabética; gênero só para quem organiza', async () => {
    const user = userEvent.setup();
    db.session.userId = 'u_dudu';
    renderApp('/turmas/g_sabado');
    await user.click(await screen.findByRole('button', { name: /16 membros/ }));
    const sheet = await screen.findByRole('dialog', { name: /Membros/ });
    const mensalistas = within(sheet).getByRole('list', { name: 'Mensalistas' });
    const names = within(mensalistas)
      .getAllByRole('listitem')
      .map((li) => li.textContent ?? '');
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'pt-BR')));
    expect(within(sheet).getByRole('list', { name: 'Avulsos' })).toBeInTheDocument();
    const ordem = within(sheet).getByRole('group', { name: 'Ordenar por' });
    expect(
      within(ordem)
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual(['Nome', 'Posição']);
  });

  it('quem organiza compartilha a turma por QR Code ou link', async () => {
    const user = userEvent.setup();
    db.session.userId = 'u_marina';
    renderApp('/turmas/g_sabado');
    await user.click(await screen.findByRole('button', { name: 'Compartilhar turma' }));
    const sheet = await screen.findByRole('dialog', { name: 'Compartilhar turma' });
    expect(await within(sheet).findByRole('img', { name: 'QR Code do convite' })).toBeInTheDocument();
    expect(within(sheet).getByRole('button', { name: 'Copiar link' })).toBeInTheDocument();
    expect(within(sheet).getByRole('button', { name: 'Compartilhar' })).toBeInTheDocument();
  });

  it('quem só joga não tem o botão de compartilhar a turma', async () => {
    db.session.userId = 'u_dudu';
    renderApp('/turmas/g_sabado');
    await screen.findByRole('heading', { level: 1, name: 'Vôlei de sábado' });
    expect(screen.queryByRole('button', { name: 'Compartilhar turma' })).not.toBeInTheDocument();
  });

  it('quem organiza também ordena os membros por gênero', async () => {
    const user = userEvent.setup();
    db.session.userId = 'u_marina';
    renderApp('/turmas/g_sabado');
    await user.click(await screen.findByRole('button', { name: /16 membros/ }));
    const sheet = await screen.findByRole('dialog', { name: /Membros/ });
    await user.click(within(sheet).getByRole('button', { name: 'Gênero' }));
    expect(within(sheet).getAllByText(/Feminino/).length).toBeGreaterThan(0);
  });
});

describe('3.7 Você', () => {
  it('perfil, 3 números e histórico com Jogos / Pagamentos', async () => {
    const user = userEvent.setup();
    renderApp('/voce');
    expect(await screen.findByText('Marina Costa')).toBeInTheDocument();
    const stats = await screen.findByLabelText('Seus números');
    expect(within(stats).getByText('frequência')).toBeInTheDocument();
    expect(await screen.findByText('Desistência tardia')).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'Pagamentos' }));
    expect(await screen.findByText(/Recusado \(valor diferente\) e reenviado/)).toBeInTheDocument();
    expect(screen.getByText(/você é quem organiza e não é cobrado/)).toBeInTheDocument();
  });

  it('resumo mostra o time que mais ganhou pelas pessoas, mesmo se ele foi desfeito', async () => {
    renderApp('/jogos/m_sab_p1/resumo');
    const section = await screen.findByRole('region', { name: /Times? que mais ganh/ });
    expect(within(section).getByText(/rodadas? juntos · venceu/)).toBeInTheDocument();
    expect(within(section).getByText(/Jogou junto até a rodada \d, depois o time mudou/)).toBeInTheDocument();
    expect(screen.queryByText(/Time que mais venceu: /)).not.toBeInTheDocument();

    // tocar no card mostra quem jogou naquele time e as rodadas juntos
    const user = userEvent.setup();
    await user.click(within(section).getByRole('button', { name: /^Ver o time:/ }));
    const sheet = await screen.findByRole('dialog', { name: /^Time · \d vitórias?/ });
    const people = within(sheet).getByRole('list', { name: 'Quem jogou neste time' });
    expect(within(people).getAllByRole('listitem')).toHaveLength(6);
    expect(within(people).getByText('Bruno Teixeira')).toBeInTheDocument();
    const rounds = within(sheet).getByRole('list', { name: 'Rodadas juntos' });
    expect(within(rounds).getAllByText('Venceu').length).toBeGreaterThanOrEqual(2);
  });

  it('resumo aberto pelo Perfil: o Voltar volta para Perfil', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/voce');
    const [played] = await screen.findAllByRole('link', { name: /Sáb, .*vitórias/ });
    if (!played) throw new Error('sem jogo');
    await user.click(played);
    expect(await screen.findByText('Destaque do dia')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Voltar para Perfil' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/voce'));
  });

  it('Ajustes: dona de turma precisa passar a turma ou encerrar antes de excluir a conta', async () => {
    const user = userEvent.setup();
    renderApp('/voce/ajustes');
    expect(
      await screen.findByText(/Antes de excluir, passe a turma para outra pessoa ou encerre-a/),
    ).toBeInTheDocument();
    expect(await screen.findAllByRole('switch')).toHaveLength(5);
    await user.click(screen.getByRole('button', { name: 'Excluir conta' }));
    const sheet = await screen.findByRole('dialog', { name: 'Excluir conta' });
    expect(within(sheet).getByRole('button', { name: 'Passar turma' })).toBeInTheDocument();
    expect(within(sheet).getByRole('button', { name: 'Encerrar turma' })).toBeInTheDocument();
  });
});

describe('3.1 Entrar pelo convite', () => {
  it('convite → celular → código → perfil com o aceite → já entra na turma e cai em Jogos', async () => {
    const user = userEvent.setup();
    db.session.userId = null;
    const { router } = renderApp('/convite/SABADO25');
    expect(await screen.findByRole('heading', { name: 'Vôlei de sábado' })).toBeInTheDocument();
    expect(screen.getByText('Todo sábado, 9h às 11h')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Entrar na turma' }));

    await user.type(await screen.findByLabelText('Celular'), '11912345678');
    await user.click(screen.getByRole('button', { name: 'Enviar código' }));
    await user.type(await screen.findByLabelText('Dígito 1 de 6'), '123456');

    await screen.findByRole('heading', { name: 'Seu perfil' });
    await user.type(screen.getByLabelText('Nome'), 'Joana Prado');
    await user.type(screen.getByLabelText('Apelido'), 'joana');
    await user.click(screen.getByRole('button', { name: 'Ponteiro' }));
    await user.click(screen.getByRole('button', { name: 'Concluir e entrar na turma' }));
    expect(await screen.findByText(/aceite os termos/)).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Concluir e entrar na turma' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
    expect(await screen.findByRole('heading', { level: 1, name: 'Jogos' })).toBeInTheDocument();
    const joana = db.users.find((u) => u.nickname === 'joana');
    expect(
      db.memberships.some((m) => m.userId === joana?.id && m.groupId === 'g_sabado' && m.status === 'active'),
    ).toBe(true);
  });
});

describe('Instalar o app', () => {
  it('no iPhone: card em Jogos com o passo a passo, e o × dispensa', async () => {
    const user = userEvent.setup();
    usePwaStore.setState({ platform: 'ios' });
    renderApp('/');
    const banner = await screen.findByRole('complementary', { name: 'Instalar o app' });
    await user.click(within(banner).getByRole('button', { name: 'Instalar' }));
    const sheet = await screen.findByRole('dialog', { name: 'Instalar o app' });
    expect(within(sheet).getByText('Adicionar à Tela de Início')).toBeInTheDocument();
    await user.click(within(sheet).getByRole('button', { name: 'Fechar' }));
    await user.click(within(banner).getByRole('button', { name: 'Agora não' }));
    expect(screen.queryByRole('complementary', { name: 'Instalar o app' })).not.toBeInTheDocument();
    expect(localStorage.getItem('dajogo:instalar-dispensado')).not.toBeNull();
  });

  it('no Chrome: Perfil tem "Instalar o app" e o botão chama o instalador do sistema', async () => {
    const user = userEvent.setup();
    const prompt = vi.fn(() => Promise.resolve());
    usePwaStore.setState({
      platform: 'prompt',
      deferredPrompt: Object.assign(new Event('beforeinstallprompt'), {
        prompt,
        userChoice: Promise.resolve({ outcome: 'accepted' as const }),
      }),
    });
    renderApp('/voce');
    await screen.findByRole('heading', { level: 1, name: 'Perfil' });
    await user.click(screen.getByRole('button', { name: /Instalar o app/ }));
    const sheet = await screen.findByRole('dialog', { name: 'Instalar o app' });
    await user.click(within(sheet).getByRole('button', { name: 'Instalar' }));
    expect(prompt).toHaveBeenCalledOnce();
    expect(await screen.findByText(/está na sua tela inicial/)).toBeInTheDocument();
  });

  it('já instalado: nem o card nem a linha aparecem', async () => {
    usePwaStore.setState({ isStandalone: true, platform: 'ios' });
    renderApp('/voce');
    await screen.findByRole('heading', { level: 1, name: 'Perfil' });
    expect(screen.queryByRole('button', { name: /Instalar o app/ })).not.toBeInTheDocument();
  });
});
