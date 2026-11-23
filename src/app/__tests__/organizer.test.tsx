import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useGameDayStore } from '@/features/live';
import { db } from '@/mocks/db';
import { expectNoA11yViolations } from '@/test/a11y';
import { renderApp } from '@/test/renderWithProviders';

/** Manual de usabilidade 2.0 — fluxos do organizador (seção 4) e a regra do Voltar (seção 5). */

describe('4.1 Organizar: "A resolver" sem sair da tela', () => {
  it('aprova na própria lista, mostra Feito com Desfazer e desfaz sem apagar nada do caixa', async () => {
    const user = userEvent.setup();
    const { container, router } = renderApp('/organizar');
    const pay = await screen.findByRole('button', { name: /Conferir pagamentos/ });
    expect(pay).toHaveAttribute('aria-expanded', 'true');
    await expectNoA11yViolations(container);

    const ledgerBefore = db.ledger.length;
    const [approve] = screen.getAllByRole('button', { name: 'Aprovar' });
    if (!approve) throw new Error('sem botão');
    await user.click(approve);
    expect(await screen.findByText('Aprovado · entrou no caixa')).toBeInTheDocument();
    expect(db.ledger).toHaveLength(ledgerBefore + 1);

    await user.click(screen.getByRole('button', { name: 'Desfazer' }));
    await waitFor(() => expect(db.ledger.at(-1)?.source).toBe('reversal'));
    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Aprovar' })).toHaveLength(2));
    expect(router.state.location.pathname).toBe('/organizar');
  });

  it('recusar abre a folha de motivo; quando a pendência termina, a próxima abre sozinha', async () => {
    const user = userEvent.setup();
    renderApp('/organizar');
    await screen.findByRole('button', { name: /Conferir pagamentos/ });
    for (const _ of [0, 1]) {
      const [refuse] = screen.getAllByRole('button', { name: 'Recusar' });
      if (!refuse) throw new Error('sem botão');
      await user.click(refuse);
      const sheet = await screen.findByRole('dialog', { name: 'Recusar pagamento' });
      await user.click(within(sheet).getByRole('button', { name: 'Pix não caiu' }));
      await user.click(within(sheet).getByRole('button', { name: 'Recusar e avisar' }));
      await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Recusar pagamento' })).not.toBeInTheDocument());
    }
    expect(db.payments.filter((p) => p.rejectionReason === 'Pix não caiu')).toHaveLength(2);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Mensalidades atrasadas/ })).toHaveAttribute('aria-expanded', 'true'),
    );
    expect(screen.getByRole('button', { name: /Conferir pagamentos/ })).toHaveTextContent('Feito');
  });

  it('cobra a mensalidade atrasada e lembra todos de uma vez', async () => {
    const user = userEvent.setup();
    renderApp('/organizar');
    await user.click(await screen.findByRole('button', { name: /Mensalidades atrasadas/ }));
    const [charge] = await screen.findAllByRole('button', { name: 'Cobrar' });
    if (!charge) throw new Error('sem botão');
    await user.click(charge);
    expect(await screen.findByText('Cobrança enviada')).toBeInTheDocument();
    expect(db.notifications.some((n) => n.kind === 'fee_charge')).toBe(true);

    await user.click(screen.getByRole('button', { name: /Sem resposta para/ }));
    await user.click(await screen.findByRole('button', { name: 'Lembrar todos de uma vez' }));
    await waitFor(() => expect(db.notifications.filter((n) => n.kind === 'response_reminder')).toHaveLength(5));
  });

  it('publica o rascunho ali mesmo e dá para desfazer', async () => {
    const user = userEvent.setup();
    renderApp('/organizar');
    await user.click(await screen.findByRole('button', { name: /Jogo em rascunho/ }));
    await user.click(await screen.findByRole('button', { name: 'Publicar' }));
    await waitFor(() => expect(db.matches.find((m) => m.id === 'm_sab_rascunho')?.status).toBe('open'));
    // a pendência terminou: a próxima abriu sozinha; o rascunho mostra "Feito" e guarda o Desfazer
    const draft = screen.getByRole('button', { name: /Jogo em rascunho/ });
    await waitFor(() => expect(draft).toHaveTextContent('Feito'));
    await user.click(draft);
    expect(await screen.findByText(/Publicado/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Desfazer' }));
    await waitFor(() => expect(db.matches.find((m) => m.id === 'm_sab_rascunho')?.status).toBe('draft'));
  });
});

describe('4.2 Visão de organizador da turma', () => {
  it('Presença: card do jogo, Fechar lista e Iniciar jogo, filtro Pendentes / Fila / Confirmados e Lembrar os 5', async () => {
    const user = userEvent.setup();
    const { container } = renderApp('/organizar/g_sabado/presenca');
    expect(await screen.findByRole('button', { name: 'Fechar lista' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Iniciar jogo' })).toBeInTheDocument();
    // Pendentes abre primeiro: sem resposta e quem vai mas falta pagar
    const tabs = await screen.findAllByRole('tab');
    expect(tabs.map((t) => t.textContent?.replace(/\s*\d+$/, ''))).toEqual(['Pendentes', 'Fila', 'Confirmados']);
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByRole('list', { name: 'Sem resposta' })).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Falta pagar' })).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'Fila 2' }));
    expect(await screen.findByText(/Mensalista vem antes de avulso/)).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: /^Confirmados/ }));
    expect(await screen.findByRole('list', { name: 'Confirmados' })).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: /^Pendentes/ }));
    await user.click(await screen.findByRole('button', { name: 'Lembrar os 5' }));
    await waitFor(() => expect(db.notifications.filter((n) => n.kind === 'response_reminder')).toHaveLength(5));
    await expectNoA11yViolations(container);
  });

  it('Pix enviado: confere e aprova na própria folha da pessoa, sem ir para A resolver', async () => {
    const user = userEvent.setup();
    renderApp('/organizar/g_sabado/presenca');
    await user.click(await screen.findByRole('button', { name: 'Opções para Samuel' }));
    const sheet = await screen.findByRole('dialog', { name: 'Samuel' });
    expect(within(sheet).getByText(/Mandou o Pix de R\$ 25/)).toBeInTheDocument();
    expect(within(sheet).queryByText(/A resolver/)).not.toBeInTheDocument();
    await user.click(within(sheet).getByRole('button', { name: 'Aprovar' }));
    await waitFor(() =>
      expect(db.payments.find((x) => x.userId === 'u_samuel' && x.matchId === 'm_sab')?.status).toBe('paid'),
    );
    expect(await screen.findByText(/Pix de Samuel aprovado/)).toBeInTheDocument();
  });

  it('Pix enviado: recusar com o motivo também fica na folha da pessoa', async () => {
    const user = userEvent.setup();
    renderApp('/organizar/g_sabado/presenca');
    await user.click(await screen.findByRole('button', { name: 'Opções para Samuel' }));
    const sheet = await screen.findByRole('dialog', { name: 'Samuel' });
    await user.click(within(sheet).getByRole('button', { name: 'Recusar' }));
    const why = await screen.findByRole('dialog', { name: 'Recusar pagamento' });
    await user.click(within(why).getByRole('button', { name: 'Pix não caiu' }));
    await user.click(within(why).getByRole('button', { name: 'Recusar e avisar' }));
    await waitFor(() =>
      expect(db.payments.find((x) => x.userId === 'u_samuel' && x.matchId === 'm_sab')?.status).toBe('rejected'),
    );
  });

  it('Tirar da lista pede confirmação numa folha que diz quem entra no lugar', async () => {
    const user = userEvent.setup();
    renderApp('/organizar/g_sabado/presenca');
    await user.click(await screen.findByRole('button', { name: 'Opções para Eduardo' }));
    const sheet = await screen.findByRole('dialog', { name: 'Eduardo' });
    await user.click(within(sheet).getByRole('button', { name: 'Tirar da lista' }));
    const confirm = await screen.findByRole('dialog', { name: 'Tirar da lista?' });
    expect(within(confirm).getByText(/Eduardo perde a vaga/)).toBeInTheDocument();
    expect(within(confirm).getByText(/1º da fila, entra no lugar/)).toBeInTheDocument();
    // ainda não tirou: só depois do botão vermelho
    const before = db.participations.find((x) => x.matchId === 'm_sab' && x.userId === 'u_dudu')?.status;
    expect(before).toBe('awaiting_payment');
    await user.click(within(confirm).getByRole('button', { name: 'Tirar Eduardo da lista' }));
    await waitFor(() =>
      expect(db.participations.find((x) => x.matchId === 'm_sab' && x.userId === 'u_dudu')?.status).not.toBe(
        'awaiting_payment',
      ),
    );
    expect(await screen.findByText('Eduardo saiu da lista.')).toBeInTheDocument();
  });

  it('Remover da turma pede confirmação numa folha que diz o que acontece', async () => {
    const user = userEvent.setup();
    renderApp('/organizar/g_sabado/membros');
    await user.click(await screen.findByRole('button', { name: /Hugo/ }));
    const sheet = await screen.findByRole('dialog', { name: 'Hugo' });
    await user.click(within(sheet).getByRole('button', { name: 'Remover da turma' }));
    const confirm = await screen.findByRole('dialog', { name: 'Remover da turma?' });
    expect(within(confirm).getByText(/O histórico de jogos e pagamentos continua guardado/)).toBeInTheDocument();
    const hugo = () => db.memberships.find((m) => m.groupId === 'g_sabado' && m.userId === 'u_hugo')?.status;
    expect(hugo()).toBe('active');
    await user.click(within(confirm).getByRole('button', { name: 'Remover Hugo' }));
    await waitFor(() => expect(hugo()).not.toBe('active'));
  });

  it('Membros: a folha muda o tipo e o nível; nível e gênero só o organizador vê', async () => {
    const user = userEvent.setup();
    renderApp('/organizar/g_sabado/membros');
    expect(await screen.findByText(/Nível e gênero só você vê/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Hugo/ }));
    const sheet = await screen.findByRole('dialog', { name: 'Hugo' });
    await user.click(within(sheet).getByRole('tab', { name: '4' }));
    await user.click(within(sheet).getByRole('tab', { name: 'Avulso' }));
    await user.click(within(sheet).getByRole('button', { name: 'OK' }));
    await waitFor(() =>
      expect(db.memberships.find((m) => m.id === 'mb_sab_u_hugo')).toMatchObject({ level: 4, type: 'drop_in' }),
    );
  });

  it('Membros: fundamentos de 1 a 10 na folha da pessoa (vôlei), salvos no OK', async () => {
    const user = userEvent.setup();
    renderApp('/organizar/g_sabado/membros');
    await user.click(await screen.findByRole('button', { name: /Hugo/ }));
    const sheet = await screen.findByRole('dialog', { name: 'Hugo' });
    const fundamentos = within(sheet).getByRole('group', { name: 'Fundamentos, de 1 a 10' });
    expect(
      within(fundamentos)
        .getAllByRole('group')
        .map((g) => g.getAttribute('aria-label')),
    ).toEqual(['Saque', 'Recepção', 'Ataque', 'Levantamento', 'Passe']);
    const saque = within(fundamentos).getByRole('group', { name: 'Saque' });
    await user.click(within(saque).getByRole('button', { name: 'Mais' })); // do "–" vai para 5
    await user.click(within(saque).getByRole('button', { name: 'Mais' }));
    expect(saque).toHaveTextContent('6');
    await user.click(within(sheet).getByRole('button', { name: 'OK' }));
    await waitFor(() => expect(db.memberships.find((m) => m.id === 'mb_sab_u_hugo')?.skills).toEqual({ serve: 6 }));
  });

  it('Caixa: novo lançamento pelo + e correção por estorno, nunca apagando', async () => {
    const user = userEvent.setup();
    renderApp('/organizar/g_sabado/caixa');
    expect(await screen.findByText('Saldo do caixa')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Novo lançamento' }));
    const sheet = await screen.findByRole('dialog', { name: 'Novo lançamento' });
    await user.type(within(sheet).getByLabelText('Valor'), '320');
    await user.type(within(sheet).getByLabelText('Descrição'), 'Aluguel de dezembro');
    await user.click(within(sheet).getByRole('button', { name: 'Salvar' }));
    await waitFor(() =>
      expect(
        db.ledger.some(
          (e) => e.description === 'Aluguel de dezembro' && e.category === 'rent' && e.amountCents === 32000,
        ),
      ).toBe(true),
    );

    const count = db.ledger.length;
    await user.click(await screen.findByRole('button', { name: /Aluguel de dezembro/ }));
    const detail = await screen.findByRole('dialog', { name: 'Lançamento' });
    await user.click(within(detail).getByRole('button', { name: 'Estornar' }));
    await user.click(within(detail).getByRole('button', { name: /Confirmar estorno/ }));
    await waitFor(() => expect(db.ledger).toHaveLength(count + 1));
    expect(db.ledger.some((e) => e.description === 'Aluguel de dezembro')).toBe(true);
  });

  it('Novo jogo já vem com os dados da turma e dá para salvar como rascunho', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/organizar/g_sabado/presenca');
    await user.click(await screen.findByRole('button', { name: 'Novo jogo' }));
    const sheet = await screen.findByRole('dialog', { name: 'Novo jogo' });
    expect(within(sheet).getByLabelText('Local')).toHaveValue('Clube Alto da Lapa');
    expect(within(sheet).getByRole('switch', { name: /Repetir todo sábado/ })).toBeChecked();
    const before = db.matches.length;
    await user.click(within(sheet).getByRole('button', { name: 'Salvar como rascunho' }));
    await waitFor(() => expect(db.matches.length).toBe(before + 4));
    expect(db.matches.at(-1)?.status).toBe('draft');
    expect(router.state.location.pathname).toBe('/organizar/g_sabado/presenca');
  });

  it('o Voltar da visão de organizador sempre volta para Organizar, mesmo trocando de aba', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/organizar');
    await user.click(await screen.findByRole('link', { name: /Vôlei de sábado/ }));
    await user.click(await screen.findByRole('link', { name: 'Membros' }));
    await user.click(await screen.findByRole('link', { name: 'Caixa' }));
    await user.click(screen.getByRole('button', { name: 'Voltar para Organizar' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/organizar'));
  });

  it('quem não organiza não vê a turma como organizador', async () => {
    db.session.userId = 'u_dudu';
    renderApp('/organizar/g_sabado/presenca');
    expect(await screen.findByText('Só quem organiza vê esta tela.')).toBeInTheDocument();
  });
});

describe('4.3 Dia de jogo', () => {
  it('Chegada → Times → Placar → Fim da rodada → Resumo, e empate não encerra', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/organizar/g_sabado/dia-de-jogo/m_sab');
    expect(await screen.findByRole('heading', { name: 'Quem chegou?' })).toBeInTheDocument();
    expect(screen.getAllByText(/Deve R\$ 25/)).toHaveLength(2);
    // todo mundo já vem marcado: desmarca quem faltou
    for (const name of ['Rafa', 'Eduardo', 'Samuel'])
      await user.click(screen.getByRole('button', { name: new RegExp(`^${name}`) }));
    await user.click(screen.getByRole('button', { name: 'Sortear times com 4' }));

    expect(await screen.findByText('2 times de 2')).toBeInTheDocument();
    expect(screen.getByText('Só você vê os times.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Começar' }));

    expect(await screen.findByRole('heading', { name: 'Rodada 1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Empate não pode ser encerrado' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Ponto para o Azul' }));
    await user.click(screen.getByRole('button', { name: 'Ponto para o Azul' }));
    await user.click(screen.getByRole('button', { name: 'Tirar ponto do Azul' }));
    await user.click(screen.getByRole('button', { name: 'Ponto para o Laranja' }));
    expect(screen.getByRole('button', { name: 'Empate não pode ser encerrado' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Ponto para o Laranja' }));
    await user.click(screen.getByRole('button', { name: 'Encerrar rodada' }));

    expect(await screen.findByRole('heading', { name: /Laranja venceu/ })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Laranja fica/ })).toHaveAttribute('aria-checked', 'true');
    await user.click(screen.getByRole('button', { name: 'Encerrar o dia de jogo' }));
    // confirmação em folha, dizendo o que acontece
    const confirm = await screen.findByRole('dialog', { name: 'Encerrar o dia?' });
    expect(within(confirm).getByText(/vai para todos da turma Vôlei de sábado/)).toBeInTheDocument();
    await user.click(within(confirm).getByRole('button', { name: 'Encerrar e enviar o resumo' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/jogos/m_sab/resumo'));
    expect(await screen.findByText('Destaque do dia')).toBeInTheDocument();
    expect(db.rounds.filter((r) => r.matchId === 'm_sab')).toHaveLength(1);
    expect(db.matches.find((m) => m.id === 'm_sab')?.status).toBe('finished');
    await user.click(screen.getByRole('button', { name: /^Voltar para/ }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/organizar/g_sabado/presenca'));
  });

  it('na chegada todo mundo já vem marcado e dá para ajustar o sorteio antes de sortear', async () => {
    const user = userEvent.setup();
    renderApp('/organizar/g_sabado/dia-de-jogo/m_sab');
    await screen.findByRole('heading', { name: 'Quem chegou?' });
    expect(screen.getByRole('button', { name: 'Sortear times com 7' })).toBeEnabled();
    await waitFor(() => expect(db.liveSessions.find((x) => x.matchId === 'm_sab')?.arrivedUserIds).toHaveLength(7));

    expect(screen.getByText(/2 times de 3 · 1 de fora/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Regras do sorteio' }));
    const sheet = await screen.findByRole('dialog', { name: 'Regras do sorteio' });
    const porTime = within(sheet).getByRole('group', { name: 'Jogadores por time' });
    await user.click(within(porTime).getByRole('button', { name: 'Menos' }));
    await user.click(within(sheet).getByRole('switch', { name: 'Equilibrar por gênero' }));
    expect(within(sheet).getByText('2 times de 2 · 3 de fora · Equilibra nível e posição')).toBeInTheDocument();
    await user.click(within(sheet).getByRole('button', { name: 'OK' }));

    await user.click(screen.getByRole('button', { name: 'Sortear times com 7' }));
    expect(await screen.findByText('2 times de 2 · 3 de fora')).toBeInTheDocument();
  });

  it('sorteio por fundamentos: escolhe nas regras, vê as médias de cada time e o servidor recebe', async () => {
    const user = userEvent.setup();
    renderApp('/organizar/g_sabado/dia-de-jogo/m_sab');
    await screen.findByRole('heading', { name: 'Quem chegou?' });
    await user.click(screen.getByRole('button', { name: 'Regras do sorteio' }));
    const rules = await screen.findByRole('dialog', { name: 'Regras do sorteio' });
    await user.click(within(rules).getByRole('tab', { name: 'Fundamentos' }));
    expect(within(rules).getByText(/Equilibra cada fundamento entre os times: saque, recepção/)).toBeInTheDocument();
    expect(within(rules).getByText(/Equilibra fundamentos, gênero e posição/)).toBeInTheDocument();
    await user.click(within(rules).getByRole('button', { name: 'OK' }));

    await user.click(screen.getByRole('button', { name: /^Sortear times com/ }));
    const medias = await screen.findByLabelText('Médias do Azul nos fundamentos');
    expect(medias).toHaveTextContent(/Saq .*Rec .*Ata .*Lev .*Pas /);
    await user.click(screen.getByRole('button', { name: 'Começar' }));
    await waitFor(() =>
      expect(db.liveDraws.filter((d) => d.matchId === 'm_sab').at(-1)?.criteria.levelBy).toBe('skills'),
    );
    await waitFor(() => expect(useGameDayStore.getState().sessions.m_sab?.outbox.length ?? 0).toBe(0));
  });

  it('placar em tela cheia e travado: +1 abre quem fez, −1 tira também de quem recebeu', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/organizar/g_sabado/dia-de-jogo/m_sab');
    await screen.findByRole('heading', { name: 'Quem chegou?' });
    for (const name of ['Rafa', 'Eduardo', 'Samuel'])
      await user.click(screen.getByRole('button', { name: new RegExp(`^${name}`) }));
    await user.click(screen.getByRole('button', { name: 'Sortear times com 4' }));
    await user.click(await screen.findByRole('button', { name: 'Começar' }));

    // só o jogo: sem a barra de etapas e sem o "Sair"
    await screen.findByRole('heading', { name: 'Rodada 1' });
    expect(screen.queryByRole('list', { name: /Etapa/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sair' })).not.toBeInTheDocument();
    const session = () => useGameDayStore.getState().sessions.m_sab;

    // +1 abre a lista do time; um toque diz quem fez
    await user.click(screen.getByRole('button', { name: 'Ponto para o Azul' }));
    let drawer = await screen.findByRole('dialog', { name: 'Ponto do Azul' });
    // tocar no espaço vazio da gaveta não fecha (não vira "Ninguém")
    await user.click(drawer);
    expect(screen.getByRole('dialog', { name: 'Ponto do Azul' })).toBeInTheDocument();
    const [firstPlayer] = within(drawer).getAllByRole('listitem');
    if (!firstPlayer) throw new Error('time vazio');
    await user.click(within(firstPlayer).getByRole('button'));
    const scorer = Object.keys(session()?.scorers ?? {})[0] ?? '';
    expect(session()?.scorers[scorer]).toBe(1);

    await user.click(screen.getByRole('button', { name: 'Ponto para o Azul' }));
    drawer = await screen.findByRole('dialog', { name: 'Ponto do Azul' });
    await user.click(within(within(drawer).getAllByRole('listitem')[0] as HTMLElement).getByRole('button'));
    expect(session()?.scorers[scorer]).toBe(2);
    expect(screen.getByLabelText('Azul: 2 pontos')).toBeInTheDocument();

    // −1 tira o ponto do time e de quem recebeu por último
    await user.click(screen.getByRole('button', { name: 'Tirar ponto do Azul' }));
    expect(screen.getByLabelText('Azul: 1 pontos')).toBeInTheDocument();
    expect(session()?.scorers[scorer]).toBe(1);

    // ponto sem nome: conta para o time e não para ninguém
    await user.click(screen.getByRole('button', { name: 'Ponto para o Azul' }));
    drawer = await screen.findByRole('dialog', { name: 'Ponto do Azul' });
    await user.click(within(drawer).getByRole('button', { name: 'Ninguém' }));
    expect(screen.getByLabelText('Azul: 2 pontos')).toBeInTheDocument();
    expect(session()?.scorers[scorer]).toBe(1);

    // travado: sair da tela não funciona; destravado, funciona
    const here = router.state.location.pathname;
    await act(() => router.navigate('/organizar'));
    expect(router.state.location.pathname).toBe(here);
    await user.click(screen.getByRole('button', { name: 'Destravar a tela' }));
    await act(() => router.navigate('/organizar'));
    await waitFor(() => expect(router.state.location.pathname).toBe('/organizar'));
  });

  it('se o servidor perde o modo ao vivo no meio do dia, abre de novo e o resumo sai sem travar', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/organizar/g_sabado/dia-de-jogo/m_sab');
    await screen.findByRole('heading', { name: 'Quem chegou?' });
    // todo mundo já vem marcado: desmarca quem faltou
    for (const name of ['Rafa', 'Eduardo', 'Samuel'])
      await user.click(screen.getByRole('button', { name: new RegExp(`^${name}`) }));
    await user.click(screen.getByRole('button', { name: 'Sortear times com 4' }));
    // o servidor reinicia (como recarregar a página com os mocks): o modo ao vivo some
    const others = db.liveSessions.filter((x) => x.matchId !== 'm_sab');
    db.liveSessions.splice(0, db.liveSessions.length, ...others);

    await user.click(await screen.findByRole('button', { name: 'Começar' }));
    await user.click(await screen.findByRole('button', { name: 'Ponto para o Azul' }));
    await user.click(screen.getByRole('button', { name: 'Encerrar rodada' }));
    await user.click(await screen.findByRole('button', { name: 'Encerrar o dia de jogo' }));
    await user.click(await screen.findByRole('button', { name: 'Encerrar e enviar o resumo' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/jogos/m_sab/resumo'));
    expect(db.rounds.filter((r) => r.matchId === 'm_sab')).toHaveLength(1);
  });

  it('cada toque fica salvo no celular: recarregar não perde o placar', async () => {
    const user = userEvent.setup();
    const first = renderApp('/organizar/g_sabado/dia-de-jogo/m_sab');
    for (const name of ['Bruno', 'Diego', 'Rafa', 'Eduardo', 'Samuel'])
      await user.click(await screen.findByRole('button', { name: new RegExp(`^${name}`) }));
    await user.click(screen.getByRole('button', { name: 'Sortear times com 2' }));
    await user.click(await screen.findByRole('button', { name: 'Começar' }));
    await user.click(await screen.findByRole('button', { name: 'Ponto para o Azul' }));
    first.unmount();

    renderApp('/organizar/g_sabado/dia-de-jogo/m_sab');
    expect(await screen.findByRole('heading', { name: 'Rodada 1' })).toBeInTheDocument();
    expect(screen.getByLabelText('Azul: 1 pontos')).toBeInTheDocument();
  });
});

describe('4.2 Criar turma', () => {
  it('escolhe mais de um dia, cada um com o seu horário', async () => {
    const user = userEvent.setup();
    const { container } = renderApp('/turmas/nova');
    await user.type(await screen.findByLabelText('Nome da turma'), 'Futevôlei');
    await user.type(screen.getByLabelText('Local'), 'Praia');

    const dias = screen.getByRole('group', { name: /Dias/ });
    await user.click(within(dias).getByRole('button', { name: 'Ter' }));
    // dia novo copia o horário do último escolhido
    expect(screen.getByLabelText('Terça, começa')).toHaveValue('09:00');
    await user.clear(screen.getByLabelText('Terça, começa'));
    await user.type(screen.getByLabelText('Terça, começa'), '20:00');
    await user.clear(screen.getByLabelText('Terça, termina'));
    await user.type(screen.getByLabelText('Terça, termina'), '22:00');
    await expectNoA11yViolations(container);

    await user.click(screen.getByRole('button', { name: 'Criar' }));
    await waitFor(() => expect(db.groups.find((g) => g.name === 'Futevôlei')).toBeDefined());
    expect(db.groups.find((g) => g.name === 'Futevôlei')?.schedules).toEqual([
      { weekday: 2, startTime: '20:00', endTime: '22:00' },
      { weekday: 6, startTime: '09:00', endTime: '11:00' },
    ]);
  });
});
