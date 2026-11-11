# Regras de negócio — Dá Jogo (MVP)

Cada regra tem um código (`RN-xx`) para ser citada em tarefas, testes e mensagens de erro. "Dono" é o responsável pela turma (P2: um só por turma no MVP). Os estados citados estão em [domain.md](./domain.md). Os códigos de erro (`ERRO_X`) são os da API ([openapi.yaml](../api/openapi.yaml), seção de erros).

> O back-end é a fonte da verdade de todas estas regras. O front pode antecipá-las para dar resposta rápida (desabilitar um botão, por exemplo), mas nunca é o único guardião.

---

## 0. Acesso e conta

**RN-01 · Login por código.** O login é feito pelo número de celular. O sistema envia um código de 6 dígitos por SMS ou WhatsApp (a pessoa escolhe; o padrão é WhatsApp).
- O código vale **5 minutos** e aceita **5 tentativas**. Depois disso, é preciso pedir outro (`OTP_EXPIRED`, `OTP_TOO_MANY_ATTEMPTS`).
- Um novo envio só fica disponível **60 segundos** depois do anterior, com no máximo **5 envios por hora** por número (`RATE_LIMITED`).
- A resposta não revela se o número já tem conta.

**RN-02 · Primeiro acesso.** Quem entra pela primeira vez completa o perfil antes de usar o app: nome, nickname, modalidade, posições, nível e aceite dos termos. Foto é opcional. Se a pessoa chegou por um convite, o convite é aceito automaticamente ao terminar o perfil.

**RN-03 · Nickname.** De 3 a 20 caracteres (`a-z`, `0-9`, `.` e `_`), único no app, comparado sem diferenciar maiúsculas e acentos (`NICKNAME_TAKEN`). A checagem de disponibilidade devolve até 3 sugestões livres.

**RN-04 · Sessão.** A sessão fica aberta até o logout ou até 60 dias sem uso. O token de acesso dura pouco (sugestão: 15 minutos) e é renovado pelo token de renovação, que muda a cada uso. O logout revoga a renovação.

**RN-05 · Termos.** O aceite guarda a versão dos termos. Se uma nova versão exigir novo aceite, a API responde `TERMS_UPDATE_REQUIRED` e o front pede o aceite (`POST /me/terms`). O front também compara `me.termsVersion` com a versão vigente e pede o aceite antes de abrir o app.

## 1. Turmas e vínculos

**RN-10 · Criar turma.** Qualquer usuário cria uma turma e vira o dono (`role = owner`), com vínculo `monthly` (pode trocar). A turma já nasce com as regras padrão (domain.md › GroupRules) e com um padrão de sorteio da modalidade (no vôlei, "6×6").

**RN-11 · Dono único.** Cada turma tem exatamente um dono. O dono não pode sair nem ser removido. Para encerrar a turma, ele a arquiva. Transferir a posse fica fora do MVP.

**RN-12 · Convite para a turma.** O dono gera um link de convite (com QR Code) e define o tipo de vínculo de quem entrar: mensalista ou avulso.
- Aceitar o convite cria o vínculo ativo. Quem já é membro só é levado à turma, sem mudar nada.
- Convites revogados, expirados ou esgotados devolvem `INVITE_INVALID`.
- A prévia do convite (nome da turma, modalidade, local, nome do dono, próxima partida) é pública, para funcionar antes do login.

**RN-13 · Convidar avulso para uma partida.** O convite pode apontar para uma partida. Ao aceitar, a pessoa vira membro avulso, se ainda não for, e já entra na partida pelas regras do avulso (RN-23).

**RN-14 · Gerenciar membros.** Só o dono troca o tipo de vínculo, adiciona e remove membros.
- Remover um membro tira a pessoa das partidas futuras (`removed`), libera as vagas (`SpotReleased`) e cancela cobranças de avulso ainda não pagas dessas partidas. O histórico é mantido.
- Trocar o tipo de vínculo vale da próxima partida publicada em diante.

**RN-15 · Sair da turma.** Qualquer membro, exceto o dono, pode sair. O efeito nas partidas futuras é o mesmo da RN-14.

**RN-16 · Dados visíveis.** O telefone dos membros só é visível para o dono da turma. Os outros jogadores veem nome, nickname, foto, posições e nível.

## 2. Partidas e presença

**RN-20 · Publicar partida e prazo do mensalista.** Só o dono cria e publica partidas.
- Ao publicar, cada mensalista ativo recebe uma presença `pending`.
- O prazo de resposta (`responseDeadline`) é calculado pela regra da turma: X dias antes, num horário fixo. O dono pode ajustar o prazo de cada partida, mas ele precisa terminar antes do início da partida.
- O mensalista sem resposta **mantém a vaga reservada** até o prazo. Essa é a prioridade do mensalista.

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

**RN-28 · Desistir.** Qualquer jogador desiste enquanto a lista estiver aberta, e a vaga é liberada. Com a lista fechada, só o dono remove. Um pagamento já validado continua `paid` e aparece marcado para o dono decidir sobre reembolso (política em aberto).

## 3. Lista de espera

**RN-30 · Ordem.** A fila segue a ordem de chegada (`waitlistedAt`). Cada pessoa vê a própria posição ("2º da fila").

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

**RN-41 · Reabrir.** O dono pode reabrir uma lista fechada enquanto os times não tiverem sido publicados.

**RN-42 · Iniciar e finalizar.** O dono inicia a partida a partir de `closed` ou `teams_published` e a finaliza a partir de `in_progress`. A partida finalizada entra no histórico de quem estava `confirmed`.

**RN-43 · Cancelar.** O dono pode cancelar antes de iniciar, informando o motivo. Cobranças `pending`/`reported` da partida são canceladas. As `paid` ficam marcadas para reembolso (política em aberto).

## 5. Sorteio de times

**RN-50 · Padrões de sorteio.** O dono cria, edita, exclui e marca como padrão os padrões da turma (nome, nº de times, jogadores por time, equilibrar por nível, distribuir posições, o que fazer com quem sobra). Sempre existe um padrão marcado enquanto houver ao menos um. Excluir o padrão marcado passa a marca para o mais antigo.

**RN-51 · Quando sortear.** Só com a lista fechada e só entre os `confirmed`. Usa o padrão escolhido (o padrão da turma, se nenhum for informado).

**RN-52 · Quantidade de jogadores.** Se houver menos confirmados que `teamCount × playersPerTeam`, o sorteio monta os times o mais iguais possível e avisa. Quem sobra vai para o banco (`bench`) ou é espalhado pelos times (`spread`), conforme o padrão.

**RN-53 · Algoritmo base (MVP).** Detalhes finos estão em aberto; este é o comportamento mínimo:
1. Ordenar os confirmados por nível, do maior para o menor, desempatando de forma aleatória.
2. Distribuir em "serpentina" (A, B, C, D, D, C, B, A…) quando `balanceByLevel`; senão, embaralhar.
3. Com `distributePositions`, trocar jogadores de mesmo nível entre times até que cada time tenha no máximo ⌈n/times⌉ de cada posição principal.
4. Calcular a média de nível de cada time e a diferença entre a maior e a menor (`levelSpread`).

Sortear de novo gera outra distribuição e substitui o rascunho anterior.

**RN-54 · Ajuste manual.** No rascunho, o dono troca dois jogadores de time ou move um jogador. As médias são recalculadas.

**RN-55 · Publicar times.** Publicar trava o sorteio e move a partida para `teams_published`. Cada jogador passa a ver o próprio time. Refazer o sorteio volta a partida para `closed`.

## 6. Pagamentos

**RN-60 · Cobrança do avulso.** Quando o avulso recebe a vaga, nasce uma cobrança `match_fee` `pending` com o valor do avulso daquela partida.

**RN-61 · Avisar que pagou.** O jogador marca "Já fiz o Pix" (pode anexar uma observação) e a cobrança vira `reported`. A chave Pix exibida é a da turma.

**RN-62 · Validação do dono.**
- **Validar** → `paid`: confirma a vaga (RN-24) e cria a entrada no caixa (RN-70).
- **Recusar** → `rejected`, com motivo. O relógio do prazo volta a contar, com no mínimo 30 minutos restantes, e o jogador pode avisar de novo.

**RN-63 · Mensalidades.** O dono gera as mensalidades de um mês para todos os mensalistas ativos (uma por pessoa por mês; repetir a geração não duplica). O valor é o `monthlyFeeCents` vigente.

**RN-64 · Registro direto.** O dono pode marcar uma cobrança como paga sem aviso do jogador (ex.: pagamento em dinheiro), informando o método.

**RN-65 · Mensalidade atrasada.** No MVP, mensalidade em aberto **não** impede o mensalista de confirmar presença; o status só aparece para o dono e para o próprio jogador. (A confirmar: ver pendências.)

## 7. Caixa da turma

**RN-70 · Lançamentos.** Cada pagamento validado gera uma entrada automática no caixa. O dono também lança entradas e saídas manuais (ex.: aluguel da quadra). Só lançamentos manuais podem ser excluídos.

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
| Sortear, ajustar e publicar times | ✅ | — | — |
| Ver o próprio time publicado | ✅ | ✅ | — |

Erros: sem login → `UNAUTHENTICATED` (401); sem permissão → `FORBIDDEN` (403); recurso de turma da qual a pessoa não participa → `NOT_FOUND` (404), para não revelar que a turma existe.

As respostas da API trazem um objeto `viewer` com o papel da pessoa e as ações permitidas, para o front não recalcular permissões.

## 9. Privacidade (LGPD)

**RN-90 · Minimização.** Só é coletado o necessário: telefone, nome, nickname, foto opcional e perfil esportivo. O telefone nunca aparece para outros jogadores (RN-16).

**RN-91 · Exclusão de conta.** O usuário pode excluir a conta no Perfil. O efeito:
- nome e foto são apagados e o nome passa a aparecer como "Jogador removido";
- o telefone é removido;
- o nickname é liberado após 90 dias;
- presenças futuras são removidas.

Pagamentos e lançamentos já feitos ficam anonimizados, porque fazem parte da contabilidade da turma. O dono de turma com membros ativos precisa arquivar a turma antes de excluir a conta.

**RN-92 · Exportação.** O usuário baixa uma cópia dos próprios dados em JSON no Perfil › Privacidade e conta (conta, turmas, presenças e pagamentos). Antecipado da fase 2 para o MVP (decisão L3).

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
| `LIST_NOT_CLOSED` | 422 | Sortear com a lista aberta (RN-51). |
| `NOT_ENOUGH_PLAYERS` | 422 | Menos confirmados que o necessário para 2 times. |
| `DRAW_ALREADY_PUBLISHED` | 422 | Ajustar times publicados sem refazer o sorteio (RN-55). |
| `LEDGER_ENTRY_NOT_MANUAL` | 422 | Excluir lançamento automático (RN-70). |

Respostas a `respondToMatch` que mandam a pessoa para a fila **não** são erro: voltam 200 com `outcome: "waitlisted"`.

## Pendências que afetam regras

| Tema | Regras afetadas |
| --- | --- |
| Escala de nível (1–5?) e se o dono pode corrigir o nível autodeclarado | RN-02, RN-53 |
| Pesos finos do sorteio, número ímpar de jogadores, reservas | RN-52, RN-53 |
| Política de reembolso de avulso que desiste depois de pagar, e de partida cancelada | RN-28, RN-43 |
| Mensalidade atrasada bloqueia ou não a confirmação | RN-65 |
| Canais de notificação (no app, push, WhatsApp) para ofertas da fila e prazos | RN-24, RN-31 |
