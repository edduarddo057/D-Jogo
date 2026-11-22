# Roadmap de versões — Revisão de usabilidade

Base: o documento [Dá Jogo — Revisão de usabilidade das telas](https://claude.ai/artifact/2vUeEQygfLkWRWxJBZQ3Xj) (conversa com o Eduardo, 11/2026). O MVP entregue nas etapas 1 a 16 é a versão **0.1.0**; esta revisão leva o app até a **1.0.0**.

Princípio de todas as versões: **jogar e organizar em telas separadas**, e **cada ação onde a pessoa já está, perto do polegar**.

Legenda: ✅ feito · ⏭️ próxima · ⬜ pendente

| Versão | Tema | Telas |
| --- | --- | --- |
| 0.2.0 | Fundação: dados e contrato | — |
| 0.3.0 | Início do jogador | Início, Partidas |
| 0.4.0 | Aba Organizar e turma do organizador | Organizar, Turma (organizador), Jogadores |
| 0.5.0 | Modo ao vivo: chegada e sorteio rápido | Ao vivo |
| 0.6.0 | Placar e histórico do dia | Placar, Histórico da partida |
| 0.7.0 | Financeiro simples | Financeiro, Extrato, Mensalistas |
| 0.8.0 | Perfil, cadastro e acabamento | Cadastro, Perfil, Seus dados |
| 1.0.0 | Release candidate | Auditoria completa e documentação |

---

### ✅ 0.2.0 — Fundação: dados e contrato
O que as telas novas precisam existir antes delas.
- **Gênero do jogador:** campo opcional no perfil, só "masculino" ou "feminino". Visível só para o próprio jogador e para o organizador das turmas dele; serve apenas para o sorteio misto.
- **Nível por turma:** o organizador define o nível (1 a 5) de cada jogador na turma; sem nível definido vale 3. O nível autodeclarado sai do perfil e do cadastro.
- **Pendências da turma:** um resumo calculado pela API (`viewer` dono) com Pix para validar, mensalidades em atraso, sem resposta, fila aguardando, partida para publicar e lista para fechar.
- **Modo ao vivo no contrato:** chegada, sorteios sem trava, rodadas com placar e pontos, resumo do dia.
- Contrato (`openapi.yaml`), regras (`business-rules.md`), tipos e mocks atualizados juntos.
- **Pronto quando:** contrato e mocks cobrem tudo e o teste de contrato passa.
- **Feito (21/11):**
  - **Contrato 0.2.0:** `Gender`; `gender` em Me, cadastro e edição; `level` e `gender` do membro (só o dono vê) e `PATCH` do membro com `level`; `GroupSummary.pendings` (Pix a validar, mensalidades em atraso, sem resposta, fila com vaga, rascunhos, lista para fechar e a partida da vez); 6 operações novas do modo ao vivo (`/matches/{id}/live`, chegada, sorteios, rodadas e `/day-summary`). Saem os padrões de sorteio, a publicação de times e o estado `teams_published`. Validado com Redocly.
  - **Regras:** RN-03a (gênero), RN-17 (nível na turma), RN-18 (pendências) e RN-100 a RN-108 (modo ao vivo); `domain.md` e `modules.md` com as entidades LiveSession, LiveDraw, Round.
  - **Mocks:** sorteio com critérios combinados (time misto equilibra mulheres por time; nível em serpentina; posição), banco para quem sobra, rodadas sem empate, vitórias por jogador e por grupo, MVP. Dados de teste com gênero e nível por turma (Júlia e Marcos sem nível, vale 3).
  - **Adiantado da 0.8.0:** cadastro e "Seus dados" sem nível e com gênero opcional (Feminino, Masculino, Prefiro não informar) — o contrato novo exigia.
  - **Telas antigas de sorteio e times removidas** (voltam como modo ao vivo na 0.5.0).
  - **Números:** 106 testes (8 novos das regras do modo ao vivo, pendências e nível).

### ✅ 0.3.0 — Início do jogador
- O Início é só do jogador: a próxima partida em destaque com data, hora, local e vagas, e **uma ação principal conforme a situação** — vaga reservada (Vou jogar / Não vou), avulso com vaga (Quero jogar), aguardando Pix (Pagar com Pix + tempo que falta), na fila (posição + Sair da fila), confirmado (Desistir), times publicados (Você está no Time B).
- Nada de pendências do organizador no Início.
- As outras partidas saem do Início e ficam na aba Partidas.
- **Pronto quando:** o jogador resolve a presença e o pagamento sem abrir a partida.
- **Feito (21/11):**
  - Cartão "Sua próxima partida" com data, horário, local, vagas e a situação do jogador, com a ação certa ali mesmo: Vou jogar / Não vou, Quero jogar, Entrar na fila, Pagar com Pix (com o tempo que falta), Pix informado, posição na fila + Sair da fila, Não vou mais / Desistir da vaga.
  - A mesma lógica do cartão "Sua presença" da partida (`attendanceView` + `useAttendanceActions`), então Início e partida nunca divergem.
  - A lista "Depois" saiu; no lugar, "Ver todas as partidas" leva para a aba Partidas.
  - "Times publicados" saiu: na revisão, os times do modo ao vivo ficam só com o organizador.
  - **Números:** 110 testes (4 novos: confirmar, sair da fila, pagar e desistir pelo Início).

### ✅ 0.4.0 — Aba Organizar e turma do organizador
- **Nova aba "Organizar"** na navegação, só para quem organiza alguma turma: lista das turmas com selos de pendência (ícone + número + texto, ex.: "2 Pix", "3 sem resposta", "Fechar lista").
- **Turma do organizador** abre focada na **partida mais próxima**:
  - topo só com informação (turma, partida, "3 pendências");
  - confirmados como fotinhas lado a lado ("13 confirmados"), que abrem a lista completa;
  - "Precisa de atenção" em lista aberta (sem resposta, Pix pendente, na fila);
  - **barra fixa embaixo** com "Resolver" que abre uma **gaveta com abas** (Pagamentos, Presenças) e Validar/Recusar ao alcance do polegar;
  - **menu da turma**: outras partidas, jogadores (nível e gênero), financeiro, convidar, regras, editar e modo ao vivo fora do dia (com confirmação).
- No dia do jogo, "Iniciar modo ao vivo" aparece na barra de baixo.
- A aba Turmas continua sendo a visão de jogador.
- **Pronto quando:** o organizador valida um Pix e confirma alguém sem sair da turma.
- **Feito (21/11):**
  - **Navegação:** Início, Partidas, Turmas, **Organizar** (só para quem organiza alguma turma) e Perfil.
  - **Organizar:** turmas que a pessoa organiza com selos de pendência (ícone + número + texto: "1 Pix", "2 mensalidades", "2 sem resposta", "1 rascunho", "Fechar lista") vindos de `GroupSummary.pendings`.
  - **Turma do organizador** (`/organizar/:id`): topo só com nome e "6 pendências"; cartão da **partida da vez** (data, local, vagas, status); **confirmados como fotinhas** que abrem a lista; **"Precisa de atenção"** com Pix informado, Pix pendente (com prazo), sem resposta e posição na fila.
  - **Barra fixa perto do polegar** ("6 pendências · Resolver") que abre a **gaveta com abas que trocam arrastando** (Pagamentos, Presenças, Partida): validar/recusar Pix, marcar mensalidade em dinheiro, confirmar ou liberar quem não respondeu, subir da fila, publicar rascunho e fechar lista. No dia do jogo, "Modo ao vivo" aparece na mesma barra.
  - **Menu da turma:** outras partidas, nova partida, jogadores, financeiro, convidar, regras, editar e modo ao vivo (fora do dia do jogo pede confirmação: "Hoje não é dia de jogo").
  - **Jogadores do organizador:** nível na turma (—, 1 a 5) num toque, gênero visível só para ele, aviso de quantos estão sem nível.
  - **Turmas** virou visão de jogador: abas Jogadores e Partidas; o dono vê "Organizar esta turma". O financeiro mudou para `/organizar/:id/financeiro` (o link antigo redireciona).
  - **Design system:** `ActionBar` (barra fixa acima da navegação) e `SwipeTabs` (abas com arrasto lateral + teclado); `PageHeader` mantém as ações na mesma linha do título.
  - **Números:** 117 testes (7 novos).

### ✅ 0.5.0 — Modo ao vivo: chegada e sorteio rápido
- Em cima: fotinhas dos confirmados em grade; um toque marca quem chegou ("8 de 16 chegaram").
- Embaixo, perto do polegar: formato com mais/menos ("4 contra 4", sugerido pelos presentes), critérios que ligam e desligam (Nível, Gênero, Posição) lembrando a última escolha, e "Sortear".
- Sorteia só entre quem chegou, quantas vezes quiser; nada trava (sai a exigência de lista fechada e a publicação).
- O sorteio fica só na tela do organizador.
- **Pronto quando:** dá para fazer uma rodada rápida com quem já chegou e sortear de novo quando o resto chegar.
- **Feito (21/11):**
  - **`/partidas/:id/ao-vivo`** (sem a navegação, focado na partida). Entrar já inicia a partida (RN-100); pelo menu da turma, fora do dia do jogo, há a confirmação.
  - **Chegada:** grade de fotinhas dos confirmados; um toque marca (colorida + ✓), quem falta fica apagado; "9 de 12 chegaram". Muda na hora (otimista).
  - **Sorteio rápido no rodapé fixo:** times e jogadores por time com −/+ ("4 contra 4", "3 times de 4"), sugerido pelos presentes até a pessoa mexer; critérios Nível, Gênero e Posição que ligam e desligam e lembram a última escolha; aviso de quantos ficam no banco ou faltam; "Sortear" / "Sortear de novo" + "Abrir placar" lado a lado.
  - **Times atuais** com a cor de cada time e as vitórias do dia; banco listado.
  - **Tokens novos:** `color-team-1` a `color-team-8` (azul × laranja primeiro, seguro para daltonismo; texto branco ≥ 4,5:1).

### ✅ 0.6.0 — Placar e histórico do dia
- **Placar:** tela dividida ao meio, toque na metade soma ponto, −1 para corrigir, botão central troca os times de lado (placar e cor juntos), tela sempre acesa, funciona deitado.
- Menu do placar: "Encerrar rodada" (só com um time na frente) e "Marcar quem fez o ponto" (lista lateral do time, um toque registra, "Pular" para não travar).
- **Salvo por rodada:** times, placar, pontos por jogador e vitória do vencedor — para cada jogador e para o **grupo de pessoas** (mesmo grupo no mesmo dia soma vitórias).
- **Histórico da partida:** rodadas, grupos e vitórias, time que mais ganhou, vitórias e pontos por jogador, MVP (empates mostram todos). Tudo vale só para aquele dia.
- **Pronto quando:** um dia de jogo com dois sorteios mostra o time que mais ganhou e o MVP no histórico.
- **Feito (21/11):**
  - **`/partidas/:id/placar`** em tela cheia: metades com a cor do time e o placar gigante; toque soma, "−" tira, botão do centro troca os lados (placar e cor juntos). Em pé divide em cima/embaixo; deitado, lado a lado. Tela sempre acesa (Wake Lock, quando o navegador permite).
  - **Menu do placar:** "Marcar quem fez o ponto" (lista do time num toque, "Pular" para não travar), escolher os times em quadra quando há mais de dois, zerar e **Encerrar rodada** (desabilitado no empate: "alguém precisa ganhar").
  - **Contagem no aparelho** (`localStorage`), resistente a internet ruim e a recarregar; só a rodada encerrada vai para a API.
  - **Histórico do dia** (`/partidas/:id/historico`, para todos da turma): MVP (empates juntos), time que mais ganhou, tabela de vitórias/rodadas/pontos por jogador, grupos que jogaram juntos com vitórias somadas, e as rodadas com placar e vencedor.
  - **Números:** 120 testes (3 novos de ponta a ponta: chegada e sorteio, placar completo até o histórico, empate bloqueado).

### ✅ 0.7.0 — Financeiro simples
- Tela principal: saldo em destaque, gráfico pequeno da evolução do caixa, mensalidades do mês ("12 de 15 pagas" + fotinhas de quem não pagou), "Quem está em dia" (3 mensalistas com mais meses seguidos) e "+ Lançamento" embaixo.
- Toque no saldo ou no gráfico → **Extrato** (entradas, saídas, troca de mês). Toque nas mensalidades → **Mensalistas** (histórico de cada um).
- Pix para validar sai do Financeiro (está nas pendências da turma).
- **Pronto quando:** o organizador vê caixa e mensalidades sem rolar.
- **Feito (21/11):**
  - **Tela principal** (`/organizar/:id/financeiro`): cartão do saldo com a linha de evolução dos últimos 6 meses (último ponto destacado, rótulo acessível com os valores), recebido no mês e a receber; cartão "11 de 13 pagas" com barra e as fotinhas de quem falta; "Quem está em dia" (3 mensalistas com mais meses seguidos); "+ Lançamento" na barra fixa. Sem mensalidades no mês, o cartão vira "Gerar mensalidades".
  - **Extrato** (toque no saldo): troca de mês, totais, entradas por mês, movimentações com exclusão dos lançamentos manuais e "+ Lançamento".
  - **Mensalistas** (toque nas mensalidades): cada mensalista com os últimos 6 meses (✓ paga, ! em aberto, … Pix informado — com texto para leitor de tela), sequência em dia e "Recebi em dinheiro" no mês atual.
  - Pix para validar saiu daqui (está na gaveta de pendências da turma).
  - Dados de teste com 6 meses de mensalidades e alguns furos, para a sequência fazer sentido.

### ✅ 0.8.0 — Perfil, cadastro e acabamento
- Cadastro: nome, nickname, posições e gênero opcional (sem nível).
- Perfil: cartão só para mostrar (foto, nome, @nickname, posições); edição em "Seus dados" (com gênero).
- Preferências, Histórico, Privacidade e conta, Sair continuam.
- **Pronto quando:** o cadastro novo tem um passo a menos.
- **Feito (21/11, adiantado junto com a 0.2.0):** cadastro sem nível e com gênero opcional (Feminino, Masculino, Prefiro não informar — com a explicação de que só quem organiza vê); "Seus dados" edita o gênero; o cartão do Perfil mostra nome, @nickname e posições, sem nível.

### ✅ 1.0.0 — Release candidate
- Auditoria completa (`pnpm qa:audit`) nas telas novas, Lighthouse, orçamento de JS, testes de ponta a ponta dos fluxos novos.
- Documentação: arquitetura (rotas), design system (gaveta, barra fixa, placar), regras de negócio, decisões.
- **Pronto quando:** `pnpm check`, `pnpm budget` e `pnpm qa:audit` passam sem problemas.
- **Feito (21/11):** auditoria de acessibilidade em 34 rotas (claro/escuro, 390 e 1280 px) sem problemas, depois de corrigir a chegada do modo ao vivo (quem falta agora aparece em cinza com contorno tracejado, sem transparência que derrubava o contraste; o nome lido pelo leitor de tela começa pelo nome visível) e os cartões do financeiro. JS inicial 146 KB gzip (limite 170), CSS 9,9 KB (limite 20). 120 testes passando. Rotas novas em `frontend/architecture.md`; barra fixa, abas com arraste, selos, cores de time e placar em `design-system/components.md`. O Lighthouse não rodou aqui (sem Chrome com rede neste ambiente): rodar na homologação.

### ✅ 2.0.0 — Manual de usabilidade (vôlei)
Base: `Dá Jogo — Resumo de usabilidade (foco: vôlei)` e o protótipo `Dá Jogo v2 — Telas e protótipo` (referência de estrutura; as cores do Dá Jogo ficam).
- **Navegação:** Jogos, Turmas, Organizar (só para dono, com o número de pendências) e Você.
- **Jogador:** entrar pelo convite em 4 telas (convite, celular, código, perfil com o aceite); Jogos com Próximo/Depois/Último jogo e a ação no card; detalhe do jogo; Pagar com Pix numa folha (código copia e cola); Avisos com "Vou / Não vou" no aviso; Turmas com o + perto do dedão; turma como jogador; Você com 3 números, histórico Jogos/Pagamentos e Ajustes (tema, 5 interruptores, trocar número, termos, baixar dados, sair, excluir conta passando ou encerrando a turma).
- **Organizador:** Organizar com "A resolver" (conferir pagamentos, mensalidades atrasadas, sem resposta, rascunho) resolvido ali mesmo, com Desfazer e a próxima abrindo sozinha; Presença, Membros e Caixa; folhas de Novo jogo, Convidar, Membro, Novo lançamento e estorno; Criar turma numa tela.
- **Dia de jogo:** Chegada → Times → Placar → Fim da rodada, salvo no celular, sem internet; Resumo do dia para todos.
- **Contrato 0.3.0:** avisos e preferências, lembrar/cobrar/desfazer, recebi em mãos, estorno e CSV, trocar número, passar turma, repetir toda semana, abertura da lista, desistência tardia, números do Você, sorteio feito no aparelho.
- **Testes:** fluxos novos de ponta a ponta (navegação, Jogos, Pix, detalhe, Avisos, Turmas, Você, convite, A resolver, Presença, Membros, Caixa, Novo jogo, Voltar, dia de jogo).

## Em aberto
- Quais são as **habilidades** do critério de sorteio (fica desligado até definir).
- Ranking entre dias (por enquanto tudo vale para um dia só).
