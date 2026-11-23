# Regras de negócio — Dá Jogo (MVP)

Cada regra tem um código (`RN-xx`) para ser citada em tarefas, testes e mensagens de erro. "Dono" é o responsável pela turma (P2: um só por turma no MVP). Os estados citados estão em [domain.md](./domain.md). Os códigos de erro (`ERRO_X`) são os da API ([openapi.yaml](../api/openapi.yaml), seção de erros).

> O back-end é a fonte da verdade de todas estas regras. O front pode antecipá-las para dar resposta rápida (desabilitar um botão, por exemplo), mas nunca é o único guardião.

---

## 0. Acesso e conta

**RN-01 · Login por código.** O login é feito pelo número de celular. O sistema envia um código de 6 dígitos por SMS ou WhatsApp (a pessoa escolhe; o padrão é WhatsApp).
- O código vale **5 minutos** e aceita **5 tentativas**. Depois disso, é preciso pedir outro (`OTP_EXPIRED`, `OTP_TOO_MANY_ATTEMPTS`).
- Um novo envio só fica disponível **60 segundos** depois do anterior, com no máximo **5 envios por hora** por número (`RATE_LIMITED`).
- A resposta não revela se o número já tem conta.

**RN-02 · Primeiro acesso.** Quem entra pela primeira vez completa o perfil antes de usar o app: nome, nickname, modalidade, posições e aceite dos termos. Gênero e foto são opcionais. O nível não é mais autodeclarado (v0.2.0): quem define é o organizador, na turma (RN-17). Se a pessoa chegou por um convite, o convite é aceito automaticamente ao terminar o perfil.

**RN-03 · Nickname.** De 3 a 20 caracteres (`a-z`, `0-9`, `.` e `_`), único no app, comparado sem diferenciar maiúsculas e acentos (`NICKNAME_TAKEN`). A checagem de disponibilidade devolve até 3 sugestões livres.

**RN-03a · Gênero.** Opcional, só `male` ou `female`. Serve apenas para o sorteio misto (RN-103). Visível só para o próprio jogador e para os donos das turmas dele; nunca para outros jogadores. Quem não informa entra no sorteio sem esse critério.

**RN-04 · Sessão.** A sessão fica aberta até o logout ou até 60 dias sem uso. O token de acesso dura pouco (sugestão: 15 minutos) e é renovado pelo token de renovação, que muda a cada uso. O logout revoga a renovação.

**RN-06 · Trocar número (2.0).** Em Perfil › Ajustes a pessoa troca o celular da conta: o código vai para o número novo e só depois de confirmado a troca vale (`/me/phone/otp` e `/me/phone/verify`). Número que já é de outra conta é recusado (`PHONE_IN_USE`).

**RN-05 · Termos.** O aceite guarda a versão dos termos. Se uma nova versão exigir novo aceite, a API responde `TERMS_UPDATE_REQUIRED` e o front pede o aceite (`POST /me/terms`). O front também compara `me.termsVersion` com a versão vigente e pede o aceite antes de abrir o app.

## 1. Turmas e vínculos

**RN-10 · Criar turma.** Qualquer usuário cria uma turma e vira o dono (`role = owner`), com vínculo `monthly` (pode trocar). A turma já nasce com as regras padrão (domain.md › GroupRules) e com um padrão de sorteio da modalidade (no vôlei, "6×6").

**RN-11 · Dono único.** Cada turma tem exatamente um dono. O dono não pode sair nem ser removido. Para encerrar a turma, ele a arquiva.

**RN-11a · Passar a turma (2.0).** O dono pode passar a turma para outro membro ativo, que vira o dono (`POST /groups/{id}/transfer`). Excluir a conta exige antes passar ou encerrar cada turma que a pessoa organiza (`OWNER_HAS_ACTIVE_GROUPS`).

**RN-12 · Convite para a turma.** O dono gera um link de convite (com QR Code) e define o tipo de vínculo de quem entrar: mensalista ou avulso.
- Aceitar o convite cria o vínculo ativo. Quem já é membro só é levado à turma, sem mudar nada.
- Convites revogados, expirados ou esgotados devolvem `INVITE_INVALID`.
- A prévia do convite (nome da turma, modalidade, local, nome do dono, próxima partida) é pública, para funcionar antes do login.

**RN-13 · Convidar avulso para uma partida.** O convite pode apontar para uma partida. Ao aceitar, a pessoa vira membro avulso, se ainda não for, e já entra na partida pelas regras do avulso (RN-23).

**RN-14 · Gerenciar membros.** Só o dono troca o tipo de vínculo, adiciona e remove membros.
- Remover um membro tira a pessoa das partidas futuras (`removed`), libera as vagas (`SpotReleased`) e cancela cobranças de avulso ainda não pagas dessas partidas. O histórico é mantido.
- Trocar o tipo de vínculo vale da próxima partida publicada em diante.

**RN-15 · Sair da turma.** Qualquer membro, exceto o dono, pode sair. O efeito nas partidas futuras é o mesmo da RN-14.

**RN-16 · Dados visíveis.** Telefone, nível na turma e gênero dos membros só são visíveis para o dono da turma. Os outros jogadores veem nome, nickname, foto e posições.

**RN-17 · Nível na turma.** O dono define o nível (1 a 5) de cada membro, só para a própria turma. Sem nível definido, o sorteio usa 3 (meio da escala). O nível não aparece para os jogadores.

**RN-17a · Fundamentos (2.0).** Cada modalidade pode ter fundamentos (vôlei: saque, recepção, ataque, levantamento e passe; as outras, por enquanto, nenhum). O dono dá a cada membro uma nota de 1 a 10 em cada fundamento, na turma; fundamento sem nota fica em branco. Como o nível, só o dono vê. Se a pessoa não tem nível geral mas tem notas, o nível geral vale a média das notas ÷ 2 (arredondada, de 1 a 5).

**RN-18 · Pendências da turma.** Para o dono, a turma traz um resumo do que precisa ser resolvido: Pix informados aguardando validação, mensalidades do mês pendentes, mensalistas sem resposta e fila com vaga livre (promoção manual) na partida da vez, partidas em rascunho e partida da vez com prazo vencido e lista aberta. A partida da vez (`focusMatchId`) é a próxima não finalizada nem cancelada. Sorteio não é pendência: pertence ao modo ao vivo.

## 2. Partidas e presença

**RN-20 · Publicar partida e prazo do mensalista.** Só o dono cria e publica partidas.
- Ao publicar, cada mensalista ativo recebe uma presença `pending`.
- O prazo de resposta (`responseDeadline`) é calculado pela regra da turma: X dias antes, num horário fixo. O dono pode ajustar o prazo de cada partida, mas ele precisa terminar antes do início da partida.
- O mensalista sem resposta **mantém a vaga reservada** até o prazo. Essa é a prioridade do mensalista.

**RN-20a · Desfazer a publicação (2.0).** Enquanto ninguém respondeu, o dono desfaz a publicação e o jogo volta a rascunho (`POST /matches/{id}/unpublish`). Com resposta, é recusado (`ALREADY_ANSWERED`).

**RN-20b · Abertura da lista (2.0, nova).** A lista abre `listOpens.daysBefore` dias antes do jogo, no horário `listOpens.time` (padrão: 3 dias antes, 9h). Antes disso ninguém responde (`LIST_NOT_OPEN_YET`) e o card mostra "A lista abre seg, 9h". Ao abrir, os membros recebem o aviso "Lista aberta".

**RN-20c · Repetir toda semana (2.0).** "Repetir todo sábado" cria o jogo e os próximos 3 da série (`repeatWeekly`), cada um com as datas calculadas pelas regras da turma.

**RN-21 · Mensalista que não respondeu.** Quando o prazo vence:
- com `autoReleaseUnanswered = true`, a presença vira `expired` e a vaga é liberada (`SpotReleased`);
- com `false`, a vaga continua reservada e o dono decide (confirmar, remover ou esperar).

**RN-22 · Resposta do mensalista.** O mensalista responde "Vou jogar" (`confirmed`) ou "Não vou" (`declined`). Pode mudar a resposta enquanto a lista estiver aberta.
- Ao recusar uma presença confirmada, a vaga é liberada.
- Para voltar depois de recusar (ou depois de `expired`), ele precisa de vaga livre. Sem vaga, entra no fim da lista de espera, porque perdeu a prioridade ao recusar.
- Mensalista não paga por partida (a mensalidade é cobrada à parte, RN-63).

**RN-23 · Entrada do avulso.** O avulso diz "Quero jogar":
- com vaga livre e valor do avulso > 0 → `awaiting_payment`, com prazo de pagamento (RN-24) e cobrança criada (RN-60);
- com vaga livre e valor zero → `confirmed`;
- sem vaga → `waitlisted`, no fim da fila.
- Vagas livres = `capacity` − presenças que ocupam vaga (`confirmed`, `awaiting_payment`, `pending`).

**RN-24 · Prazo do avulso para pagar.** O prazo é o momento da oferta + `dropInPaymentWindowMinutes` (regra da turma), limitado ao início da partida.
- Se o avulso **avisa que pagou** dentro do prazo, o relógio para; a vaga fica garantida até o dono validar ou recusar.
- Se o prazo vence sem aviso, a presença vira `expired`, a cobrança é cancelada e a vaga é liberada.

**RN-25 · Vagas sem disputa.** A alocação de vagas é atômica: duas pessoas nunca ficam com a mesma vaga, mesmo com cliques simultâneos. Quem perde a corrida vai para a fila e é avisado na resposta.

**RN-26 · Organizador adiciona jogador.** O dono pode colocar um membro direto como `confirmed`, sem cobrança automática. Isso respeita a capacidade; para passar do limite, ele aumenta a capacidade da partida antes (RN-27).

**RN-27 · Mudar capacidade.** Aumentar a capacidade libera as vagas novas (uma `SpotReleased` para cada). Diminuir abaixo do número de vagas ocupadas é recusado (`CAPACITY_BELOW_OCCUPIED`).

**RN-28a · Desistência tardia (2.0, nova).** Até `withdrawalDeadlineHours` antes do jogo (padrão: 24h) a desistência é sem penalidade. Depois disso a pessoa ainda consegue desistir enquanto a lista estiver aberta, mas a presença fica marcada com `lateWithdrawal` e aparece como "Desistência tardia" no histórico. Multa ou perda de prioridade continuam em aberto: por enquanto é só registro.

**RN-28 · Desistir.** Qualquer jogador desiste enquanto a lista estiver aberta, e a vaga é liberada. Com a lista fechada, só o dono remove. Um pagamento já validado continua `paid` e aparece marcado para o dono decidir sobre reembolso (política em aberto).

## 3. Lista de espera

**RN-30 · Ordem.** Na fila, mensalista vem antes de avulso (2.0, manual 4.2); dentro de cada um, vale a ordem de chegada (`waitlistedAt`). Cada pessoa vê a própria posição ("2º na fila").

**RN-31 · Quando abre uma vaga.**
- Com `waitlistAutoPromote = true`, o 1º da fila recebe a oferta automaticamente: mensalista vira `confirmed`; avulso vira `awaiting_payment`, com prazo (RN-24).
- Com `false`, a vaga fica livre e o dono escolhe quem sobe, sem precisar seguir a ordem.
- Enquanto houver fila, avulsos novos não "furam" a fila: ficam nela.

**RN-32 · Fila e fechamento.** Ao fechar a lista, quem está na fila permanece `waitlisted` e aparece como "não entrou" no histórico.

## 4. Fechamento e execução da partida

**RN-40 · Fechar lista.** Só o dono fecha.
- Fechar é recusado (`PAYMENTS_TO_REVIEW`) enquanto houver pagamento de avulso `reported` aguardando validação.
- Ao fechar: ofertas `awaiting_payment` sem aviso de pagamento expiram; mensalistas ainda `pending` viram `expired`.
- Depois de fechada, a lista só muda pelas mãos do dono.

**RN-41 · Reabrir.** O dono pode reabrir uma lista fechada antes de a partida começar.

**RN-42 · Iniciar e finalizar.** O dono inicia a partida a partir de `open` ou `closed` (entrar no modo ao vivo também inicia, RN-100) e a finaliza a partir de `in_progress`. A partida finalizada entra no histórico de quem estava `confirmed`.

**RN-43 · Cancelar.** O dono pode cancelar antes de iniciar, informando o motivo. Cobranças `pending`/`reported` da partida são canceladas. As `paid` ficam marcadas para reembolso (política em aberto).

## 5. Modo ao vivo, sorteio e placar (v0.2.0)

Substitui o sorteio por padrões com publicação (antigas RN-50 a RN-55). O modo ao vivo é do organizador e foca numa partida; nada trava.

**RN-100 · Iniciar o jogo (dia de jogo).** Só o dono, pelo botão "Iniciar jogo" da Presença. A partida passa para `in_progress` (se estava `open` ou `closed`); quem ainda está `pending` vira `expired`. O avulso que pegou a vaga e ainda não pagou **continua na lista** e aparece na chegada com "Deve R$ 25" (2.0, manual 4.3). Partida cancelada ou finalizada recusa (`LIVE_NOT_AVAILABLE`).

**RN-101 · Chegada.** O dono marca quem chegou entre os que estão na lista (`confirmed` e avulsos que ainda devem). Marcar e desmarcar é livre.

**RN-101a · Quem não estava na lista (2.0).** Membro que chegou sem estar na lista entra como confirmado ao ser marcado, mesmo sem vaga.

**RN-102 · Sortear.** Sorteia só entre quem chegou, quantas vezes quiser. Recebe nº de times e jogadores por time; se houver menos gente que as vagas, os times ficam o mais iguais possível; quem sobra fica no banco. Menos de 2 pessoas chegadas → `NOT_ENOUGH_PLAYERS`. O último formato e critérios ficam guardados para sugerir no próximo sorteio. Os times ficam só com o dono (não são publicados para os jogadores).

**RN-103 · Critérios combináveis.**

**RN-103a · Sorteio por fundamentos (2.0).** Com o critério de nível ligado, o organizador escolhe equilibrar pelo **nível geral** (padrão) ou pelos **fundamentos**: aí o sorteio tenta deixar a soma de cada fundamento o mais parecida possível entre os times (ninguém fica com todos os bons sacadores, por exemplo), mantendo o equilíbrio de gênero e de posições quando esses critérios estão ligados. Fundamento sem nota conta como nível geral × 2 (sem nível = 3 → 6).
- **Gênero (time misto):** distribui masculino e feminino por igual entre os times; quem não informou gênero é distribuído depois.
- **Nível:** dentro de cada grupo, ordena por nível na turma (RN-17) e distribui em serpentina (A, B, C, C, B, A…). Sem nível = 3.
- **Posição:** troca jogadores de mesmo nível entre times para não concentrar a mesma posição principal.
- Sem critérios: aleatório. Desempates sempre aleatórios.
- **Habilidade:** em aberto (definida depois).

**RN-104 · Times fixos.** Cada sorteio cria times que valem para várias rodadas, até o próximo sorteio.

**RN-105 · Rodada.** O placar é contado no aparelho do organizador; ao encerrar, a rodada é salva com os dois times que jogaram, o placar e o vencedor. Não existe empate: encerrar com placar igual é recusado (`ROUND_TIED`).

**RN-106 · Quem fez o ponto.** Opcional. Quando ligado, cada ponto pode registrar o jogador; os pontos por jogador são salvos com a rodada. Pontos "pulados" contam no placar e não vão para ninguém.

**RN-107 · Vitórias.** A vitória da rodada conta para cada jogador do time vencedor e para o **grupo de pessoas** daquele time (identificado pelo conjunto exato de jogadores). Se o mesmo grupo se formar de novo no mesmo dia, em outro sorteio, as vitórias somam.

**RN-108 · Resumo do dia.** Cada partida guarda o próprio dia: rodadas, grupos e vitórias, o grupo que mais venceu junto, vitórias e pontos de cada jogador e o **destaque do dia** (2.0: mais vitórias, desempate por pontos; empates aparecem juntos). Nada se soma entre dias por enquanto. Todos os membros da turma veem o resumo.

**RN-109 · Dia de jogo sem internet (2.0).** Chegada, sorteio, placar e rodadas ficam salvos no aparelho do organizador a cada toque. O sorteio roda no aparelho (mesma regra do servidor) e vai para a API com os times prontos (`LiveDrawInput.teams`); sorteios e rodadas levam um `clientId`, e reenviar o mesmo id não duplica. Ao encerrar o dia, a partida é finalizada e o resumo fica pronto para todos.

## 6. Pagamentos

**RN-60 · Cobrança do avulso.** Quando o avulso recebe a vaga, nasce uma cobrança `match_fee` `pending` com o valor do avulso daquela partida.

**RN-61 · Avisar que pagou.** O jogador marca "Já fiz o Pix" (pode anexar uma observação) e a cobrança vira `reported`. A chave Pix exibida é a da turma.

**RN-62 · Validação do dono.**
- **Validar** → `paid`: confirma a vaga (RN-24) e cria a entrada no caixa (RN-70).
- **Recusar** → `rejected`, com motivo. O relógio do prazo volta a contar, com no mínimo 30 minutos restantes, e o jogador pode avisar de novo.

**RN-63 · Mensalidades.** O dono gera as mensalidades de um mês para todos os mensalistas ativos (uma por pessoa por mês; repetir a geração não duplica). O valor é o `monthlyFeeCents` vigente.

**RN-64 · Recebi em mãos.** O dono pode marcar uma cobrança como paga sem aviso do jogador (ex.: dinheiro), pelo "Recebi em mãos" (`POST /payments/{id}/receive`) ou pelo registro direto.

**RN-65 · Mensalidade atrasada e Cobrar.** Mensalidade em aberto depois do dia de vencimento da turma (`monthlyFeeDueDay`, padrão 10) é "atrasada" e entra em "A resolver". Ela **não** impede o mensalista de confirmar presença. "Cobrar" manda um aviso para a pessoa (`POST /payments/{id}/charge`).

**RN-66 · Desfazer (2.0).** Toda decisão do dono tem Desfazer: aprovar, recusar e recebi em mãos voltam o pagamento ao estado anterior (`POST /payments/{id}/undo`); se já tinha entrado no caixa, o caixa ganha um **estorno** (nada é apagado). Lembrar e Cobrar se desfazem apagando os avisos ainda não lidos (`DELETE /reminders/{id}`).

## 7. Caixa da turma

**RN-70 · Lançamentos.** Cada pagamento validado gera uma entrada automática no caixa. O dono também lança entradas e saídas manuais com categoria (aluguel, material, bola, coletes, festa, outro). **Nada é apagado** (2.0): a correção é sempre por estorno, um lançamento contrário que aponta para o original (`reversalOf`/`reversedBy`); estornar duas vezes é recusado (`LEDGER_ENTRY_ALREADY_REVERSED`). O extrato exporta em CSV.

**RN-71 · Resumo.** O resumo do financeiro mostra:
- o saldo (todas as entradas − todas as saídas);
- o recebido no mês escolhido;
- o total "a receber" (`pending` + `reported`);
- as entradas dos últimos 6 meses.

## 8. Permissões

| Ação | Dono | Membro | Não membro |
| --- | :-: | :-: | :-: |
| Ver turma, partidas, lista de confirmados e fila | ✅ | ✅ | — |
| Ver prévia de convite | ✅ | ✅ | ✅ |
| Responder presença / entrar na fila / desistir | ✅ | ✅ | — |
| Avisar pagamento próprio | ✅ | ✅ | — |
| Editar turma e regras; gerar convites | ✅ | — | — |
| Gerenciar membros (tipo, adicionar, remover) | ✅ | — | — |
| Criar, editar, publicar, fechar, iniciar, finalizar e cancelar partida | ✅ | — | — |
| Adicionar/remover/promover presenças de outros | ✅ | — | — |
| Validar/recusar pagamentos; gerar mensalidades | ✅ | — | — |
| Ver caixa e telefones dos membros | ✅ | — | — |
| Modo ao vivo: chegada, sorteio e placar | ✅ | — | — |
| Definir nível dos membros na turma | ✅ | — | — |
| Ver o histórico do dia da partida | ✅ | ✅ | — |

Erros: sem login → `UNAUTHENTICATED` (401); sem permissão → `FORBIDDEN` (403); recurso de turma da qual a pessoa não participa → `NOT_FOUND` (404), para não revelar que a turma existe.

As respostas da API trazem um objeto `viewer` com o papel da pessoa e as ações permitidas, para o front não recalcular permissões.

## 9. Privacidade (LGPD)

**RN-90 · Minimização.** Só é coletado o necessário: telefone, nome, nickname, foto opcional, gênero opcional (só para o sorteio misto) e posições. O telefone nunca aparece para outros jogadores (RN-16).

**RN-91 · Exclusão de conta.** O usuário pode excluir a conta no Perfil. O efeito:
- nome e foto são apagados e o nome passa a aparecer como "Jogador removido";
- o telefone é removido;
- o nickname é liberado após 90 dias;
- presenças futuras são removidas.

Pagamentos e lançamentos já feitos ficam anonimizados, porque fazem parte da contabilidade da turma. O dono de turma com membros ativos precisa arquivar a turma antes de excluir a conta.

**RN-92 · Exportação.** O usuário baixa uma cópia dos próprios dados em JSON em Perfil › Ajustes › Baixar meus dados (conta, turmas, presenças e pagamentos).

**RN-93 · Números do Você (2.0).** Jogos = finalizados em que a pessoa esteve; frequência = jogos em que foi ÷ jogos em que estava na lista; vezes destaque = dias em que foi o destaque (RN-108).

**RN-94 · Estatísticas do mural (2.0).** Contam só os jogos finalizados em que a pessoa esteve. Aproveitamento = rodadas vencidas ÷ rodadas jogadas. Sequência = jogos seguidos em que foi, do mais recente para trás (não ir quebra a sequência; jogo em que não estava na lista não conta). Parceiros = quem jogou no mesmo time em pelo menos 2 rodadas, ordenados por vitórias juntos. Melhor dia = mais vitórias, desempate por pontos.

## 10. Avisos (2.0)

**RN-110 · Avisos.** Lista aberta, lembretes, prazo de pagamento, aprovado/recusado, fila e mudanças no jogo, pagamentos para conferir (organizador) e resumo do dia pronto. Avisos repetidos do mesmo tipo, turma e jogo, ainda não lidos, chegam agrupados (`count`).

**RN-111 · Lembrar.** O dono lembra quem não respondeu, todos de uma vez ou um por um (`POST /matches/{id}/reminders`). Desfazer apaga os avisos ainda não lidos.

**RN-112 · Preferências.** Cinco interruptores em Ajustes (lista e lembretes, pagamentos, fila e mudanças, para o organizador, resumo do dia) controlam o envio por push. Nada é enviado entre 22h e 8h. O aviso sempre aparece na lista de Avisos do app.

---

## Códigos de erro × regras

| Código | HTTP | Quando |
| --- | --- | --- |
| `VALIDATION_ERROR` | 400 | Formato inválido; `fields` traz o erro de cada campo. |
| `UNAUTHENTICATED` / `FORBIDDEN` / `NOT_FOUND` | 401 / 403 / 404 | Seção 8. |
| `RATE_LIMITED` | 429 | RN-01. |
| `OTP_INVALID` / `OTP_EXPIRED` / `OTP_TOO_MANY_ATTEMPTS` | 422 | RN-01. |
| `TERMS_UPDATE_REQUIRED` / `PROFILE_INCOMPLETE` | 422 | RN-05 / RN-02 (ação exige perfil completo). |
| `NICKNAME_TAKEN` | 409 | RN-03. |
| `USER_NOT_FOUND` / `ALREADY_MEMBER` | 404 / 409 | RN-14 (adicionar por nickname). |
| `OWNER_CANNOT_LEAVE` | 422 | RN-11, RN-15. |
| `OWNER_HAS_ACTIVE_GROUPS` | 422 | RN-91. |
| `INVITE_INVALID` | 422 | RN-12. |
| `MATCH_NOT_OPEN` | 422 | Responder, entrar na fila ou desistir com a lista fechada (RN-28). |
| `MATCH_INVALID_TRANSITION` | 422 | Ação fora da ordem do ciclo da partida (domain.md › Estados). |
| `DEADLINE_AFTER_START` | 422 | RN-20. |
| `CAPACITY_BELOW_OCCUPIED` | 422 | RN-27. |
| `NO_FREE_SPOT` | 422 | Dono adiciona ou promove sem vaga livre (RN-26, RN-31). |
| `NOT_ON_WAITLIST` | 422 | Promover quem não está na fila. |
| `PAYMENTS_TO_REVIEW` | 422 | RN-40. |
| `PAYMENT_INVALID_TRANSITION` | 422 | Ex.: avisar pagamento já pago (domain.md › Pagamento). |
| `PAYMENT_WINDOW_EXPIRED` | 422 | Avisar pagamento depois do prazo (RN-24). |
| `NOT_ENOUGH_PLAYERS` | 422 | Menos de 2 pessoas chegadas para sortear (RN-102). |
| `ROUND_TIED` | 422 | Encerrar rodada empatada (RN-105). |
| `LIVE_NOT_AVAILABLE` | 422 | Modo ao vivo em partida cancelada ou finalizada (RN-100). |
| `LEDGER_ENTRY_NOT_MANUAL` | 422 | Excluir lançamento automático (RN-70). |

Respostas a `respondToMatch` que mandam a pessoa para a fila **não** são erro: voltam 200 com `outcome: "waitlisted"`.

## Pendências que afetam regras

| Tema | Regras afetadas |
| --- | --- |
| Escala de nível: 1 a 5, definida pelo dono na turma (resolvido na v0.2.0, RN-17) | — |
| Habilidades do critério de sorteio; pesos finos entre critérios | RN-103 |
| Política de reembolso de avulso que desiste depois de pagar, e de partida cancelada | RN-28, RN-43 |
| Mensalidade atrasada bloqueia ou não a confirmação | RN-65 |
| Canais de notificação (no app, push, WhatsApp) para ofertas da fila e prazos | RN-24, RN-31 |
