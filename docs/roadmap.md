# Roadmap de execução — Dá Jogo (front-end + base do back-end)

Do zero até o MVP pronto. Cada etapa tem uma entrega e um critério de "pronto". A ordem das features segue as sprints do documento consolidado (Sprint 0 a 4). As etapas 1 a 3 são de documentação e destravam o resto; a partir da 4 é código.

Legenda: ✅ feito · 🟡 pronto do nosso lado, aguardando dependência externa · ⏭️ próxima · ⬜ pendente

---

## Fase A — Fundação de produto e design

### ✅ 1. Design system
- Tokens de cor (tema claro e escuro, contraste conferido por script), tipografia (Plus Jakarta Sans + Inter), espaçamento de 4px, raios, sombras, z-index e breakpoints.
- Regras de uso, voz, movimento, iconografia, acessibilidade e responsividade.
- 12 componentes base especificados: Button, TextField, OtpInput, Badge, Avatar, ListItem, HeroCard, SegmentedControl, ProgressBar, Navigation, Modal, Toast.
- No repositório: `docs/design-system/` (README, components, tokens.json, CSS de referência), `src/styles/tokens.css` (gerado, em rem) e `src/styles/global.css` (base 62.5%).

### ✅ 2. Protótipo visual das telas-chave
- 11 telas: entrar com código, início, partida (mensalista), avulso pagando a vaga, presenças, sorteio, regras da turma, financeiro, duas telas no tema escuro e a partida no desktop.
- **Pronto quando:** você e o PM aprovarem a direção visual e os fluxos (ou pedirem ajustes).

### ✅ 3. Documentação de arquitetura
- `docs/frontend/architecture.md`: pastas, convenções de nome, regra de importação entre features, roteamento (mapa de rotas, rotas protegidas, rota de convite), estratégia de dados (query keys, invalidação, otimismo), estado (stores Zustand), formulários, erros, PWA (cache, atualização, instalação no iOS), tema, testes.
- `docs/backend/domain.md`: entidades, relacionamentos e estados (máquina de estados da participação e do pagamento).
- `docs/backend/business-rules.md`: cada regra numerada (RN-01…), com quem pode, quando e o efeito; inclui as regras configuráveis da turma (P3 a P6).
- `docs/backend/modules.md`: módulos sugeridos (auth, users, groups, invites, matches, attendance, payments, team-draw, finance), responsabilidades e eventos entre eles (ex.: "vaga liberada" → promove fila).
- `docs/api/openapi.yaml`: contrato REST completo do MVP, com erros padronizados.
- **Pronto quando:** o contrato cobre todas as telas do protótipo e o time de back-end consegue implementar sem perguntar ao front.
- **Feito:** 64 operações validadas em OpenAPI 3.1; tabela de cobertura tela × operação em `frontend/architecture.md` § 18.

---

## Fase B — Base técnica (Sprint 0)

### ✅ 4. Esqueleto do projeto
- Vite + React + TypeScript (strict), aliases (`@/features`, `@/components`…), ESLint + Prettier, scripts `dev`, `build`, `test`, `lint`, `tokens`.
- `pnpm tokens`: gera `tokens.css` a partir de `docs/design-system/tokens.json`.
- GitHub Actions: lint + testes + build em todo PR.
- **Pronto quando:** `pnpm dev` abre a página em branco com fontes e tokens, e o CI passa.
- **Feito (10/11):** pnpm 10 + Node 22; React 19, Vite 8, TypeScript 5.9 (strict), Vitest 5, ESLint 10 (+ jsx-a11y, react-hooks, regras de importação entre camadas), Stylelint 17 (bloqueia cor e px soltos), Prettier. Scripts `tokens` e `api:types` (tipos gerados do OpenAPI). CI em `.github/workflows/ci.yml` confere tokens e tipos em dia, tipos, lint, formatação, testes com cobertura e build. Verificado localmente: todos os passos passam.

### ✅ 5. Infraestrutura do app
- React Router 7 (layouts, rotas protegidas, carregamento preguiçoso por página).
- TanStack Query (QueryClient, padrões de retry e staleTime).
- Axios: instância, token no header, tratamento de 401 com renovação de sessão, erro padronizado.
- Zustand: `useSessionStore` (token só em memória), `useThemeStore` (persistido), `useToastStore`.
- MSW: handlers a partir do OpenAPI, dados de exemplo das telas do protótipo; ligado em dev e nos testes.
- Vitest + React Testing Library + utilitário `renderWithProviders`.
- **Pronto quando:** existe um teste de exemplo passando que renderiza uma página com rota, query e mock.
- **Feito (10/11):**
  - **Rotas:** as 27 rotas do mapa de `architecture.md` § 5, com guardas `RequireAuth`, `RequireProfile` e `GuestOnly`, layouts (AppShell responsivo, Flow, Public), tela de abertura, página de erro e 404. As telas das sprints seguintes aparecem como "em construção", com a etapa indicada.
  - **HTTP (`lib/http`):** Axios com renovação de sessão em voo único, `ApiError` padronizado e mensagens em pt-BR para todo código de erro do contrato (o TypeScript falha se faltar uma). Tipos gerados do `openapi.yaml`.
  - **Dados:** QueryClient com os padrões definidos (sem retry em 4xx; erro de ação sem tratamento vira toast).
  - **Stores:** sessão, tema (sem piscar, integrado ao script do `index.html`) e toasts.
  - **Formatadores (`lib/format`):** dinheiro, datas no fuso da turma, telefone e iniciais, com testes.
  - **Features base:** `auth` (login, renovação, verificação da sessão ao abrir), `profile` (`useMe`), `groups` e `matches` (consultas e chaves).
  - **Mocks:** banco em memória com os dados do protótipo e regras de contagem de vagas. No login simulado, o código é 123456.
  - **Testes:** 21, entre eles o fluxo logado → Início com dados da API, os redirecionamentos de login e cadastro, o 404 e a renovação de sessão com chamadas simultâneas.

### ✅ 6. PWA, tema e marca
- vite-plugin-pwa: manifest (nome, cores, ícones), service worker com cache do app shell, aviso de "nova versão disponível", aviso de instalação (Android) e instruções para o iOS.
- Marca: SVGs do símbolo "O salto" e do logotipo em `public/brand/`, ícones 192/512/maskable, favicon; atualizar o design system publicado e o protótipo com o nome Dá Jogo.
- Tema: script inline no `index.html` que aplica o tema antes da primeira pintura, `theme-color` dinâmico, seletor no Perfil.
- **Pronto quando:** Lighthouse marca o app como instalável e a troca de tema não pisca.
- **Feito (10/11):**
  - **PWA:** manifest completo, service worker (Workbox) com app shell e fontes no precache, sem cache da API. Aviso "Nova versão disponível — Atualizar". Instalação em Perfil › Preferências: botão nativo no Android/desktop, passos do Safari no iPhone.
  - **Marca:** logotipo com o texto em contornos, símbolo (fundo claro e escuro), ícone do app, PNGs 192/512/maskable, apple-touch-icon e favicon. Design system publicado renomeado para "Dá Jogo", com os logos como arquivos e a capa nova. Protótipo atualizado na tela de login e no desktop.
  - **Tema:** seletor Automático/Claro/Escuro em Perfil › Preferências, aplicado sem piscar.
  - **Fontes:** servidas pelo app (F19).
  - **Toast:** componente antecipado da etapa 7 (F20).
  - **Verificado no Chrome:** o Lighthouse removeu a auditoria de PWA nas versões recentes, então usei a checagem nativa de instalabilidade do Chrome (`Page.getInstallabilityErrors`). Resultado:
    - zero erros de instalação e zero erros de manifest;
    - service worker controlando a página;
    - tema escuro aplicado antes da primeira pintura;
    - o app abre offline;
    - JS inicial de 138 KB comprimido (meta: ≤ 170 KB).
  - **Testes:** 28 passando.

---

## Fase C — Design system em código

### ✅ 7. Componentes base
- Os 12 componentes em `src/components/`, cada um com `.tsx`, `.module.css`, testes e `index.ts`.
- Extras de formulário: MoneyField, DateField, TimeField, SelectField, Switch.
- Estados de tela: Skeleton, EmptyState, ErrorState.
- **Pronto quando:** todos têm teste de comportamento e de acessibilidade básica (papéis, rótulos, foco).
- **Feito (11/11):**
  - **Componentes:** Button (+ ButtonLink, IconButton, Fab), TextField, DateField, TimeField, MoneyField (digita reais, entrega centavos), SelectField, Switch, OtpInput (cola, preenchimento automático do SMS, setas e Backspace), Badge, Avatar (+ AvatarStack), List/ListItem (+ DateTile), Card, HeroCard, SegmentedControl (abas com teclado) e SegmentedNav (abas por sub-rota), ProgressBar, Navigation, Modal (`<dialog>` nativo: bottom sheet no celular, central no desktop), Toast, PageHeader, Skeleton/SkeletonList, EmptyState, ErrorState e Spinner.
  - **Testes:** todos com teste de comportamento e auditoria automática de acessibilidade (axe-core). Os campos foram testados com React Hook Form + Zod.
  - **Galeria:** `/dev/componentes` mostra todos os componentes. Só existe em dev e em homologação com mocks; não vai para produção.
  - **Revisão visual no Chrome:** celular e desktop, temas claro e escuro. Saíram dois ajustes: as abas quebram a linha em telas estreitas, e no celular o selo do ListItem desce para baixo dos metadados para o título não ser cortado.

### ✅ 8. Casca do app (layout)
- `AppShell`: navegação inferior abaixo de 1024px e barra lateral acima, área segura do iPhone, área de toasts, ErrorBoundary.
- `FlowLayout` para telas sem navegação (login, onboarding, criar partida).
- **Pronto quando:** as 4 abas navegam no celular e no desktop, com placeholders.
- **Feito (11/11):**
  - **AppShell:** usa o componente Navigation, com o logotipo na barra lateral (versão clara/escura conforme o tema). Inclui o link "Pular para o conteúdo", a faixa "Sem conexão", a área segura do iPhone (`env(safe-area-inset-*)`) e a área de toasts.
  - **Troca de rota:** o foco vai para o h1 e o título da aba vira "<Página> · Dá Jogo".
  - **ErrorBoundary:** um global, além do `errorElement` de cada rota.
  - **FlowLayout e PublicLayout:** coluna estreita, sem navegação.
  - **Páginas:** Início, Preferências e a página provisória passaram a usar o design system (cabeçalho, lista, selos, carregamento, erro e vazio).
  - **Testes:** as 4 abas navegam com aba ativa, título e foco; a aba fica ativa em sub-rotas; aviso de offline; telas de fluxo sem navegação.
  - **Números:** 66 testes no total; JS inicial de 142 KB comprimido.

---

## Fase D — Features (Sprints 1 a 4)

### ✅ 9. Sprint 1 — Acesso, perfil e criar turma
- `features/auth`: telefone → código → sessão persistente; reenviar código; erro de código.
- `features/profile`: primeiro acesso (nome, nickname único com checagem em tempo real, foto opcional, esporte, posição, nível); editar perfil; preferências (tema).
- `features/groups`: criar turma (nome, esporte, local, limite, mensalidade, avulso, chave Pix) e listar Minhas Turmas.
- Página Início com estado vazio ("Crie ou entre numa turma").
- **Pronto quando:** um usuário novo entra, completa o perfil e cria uma turma.
- **Feito (11/11):**
  - **Login:** tela de marca (fundo azul, tema escuro local), celular com máscara, WhatsApp ou SMS, código de 6 dígitos com reenvio após 60 s e "Trocar número". Volta para onde a pessoa ia (`?voltar=`) ou segue para o convite (`?convite=`). Nos mocks o código é sempre **123456**.
  - **Cadastro:** nome, nickname com checagem em tempo real (400 ms) e sugestões livres, até 3 posições (a primeira é a principal), nível de 1 a 5 (Iniciante → Competitivo) e aceite dos termos. Se veio de convite, já entra na turma.
  - **Perfil:** resumo (avatar, @nickname, posições e nível), Seus dados (edição), Preferências, Histórico (Sprint 4) e Sair.
  - **Turmas:** lista com próxima partida e selo "Organizador"; Nova turma (nome, local, endereço, vagas, mensalidade, avulso, Pix opcional com chave + titular juntos). Quem cria vira o organizador e a turma nasce com o padrão de sorteio 6×6.
  - **Início:** estado vazio "Comece pela sua turma" para quem ainda não tem turma.
  - **Mocks:** banco em memória refeito com todas as entidades do domínio (turmas, vínculos, convites, partidas, presenças, pagamentos, lançamentos, padrões de sorteio) e regras de vaga/fila em `mocks/domain/attendance.ts`, prontos para as Sprints 2–4.
  - **Ajustes:** o anúncio de troca de rota não rouba mais o foco quando a página já focou um campo (ex.: código do login).
  - **Fora desta sprint:** foto de perfil (precisa de upload no backend) — fica para a fase 2.
  - **Números:** 72 testes (6 novos de ponta a ponta: login, código errado, primeiro acesso, nickname em uso, criar turma, editar perfil e sair).

### ✅ 10. Sprint 2 — Convites, membros e regras
- `features/invites`: gerar link e QR Code, compartilhar (Web Share API e WhatsApp), rota `/convite/:codigo` que funciona logado ou não (login rápido e entra na turma).
- `features/groups`: membros (mensalista/avulso, remover), aba Jogadores.
- **Regras da turma**: subir da fila automaticamente, prazo de pagamento do avulso, prazo e liberação automática de mensalistas, padrões de sorteio.
- **Pronto quando:** um segundo usuário entra pelo link e aparece na turma com o vínculo certo.
- **Feito (11/11):**
  - **Página da turma:** cabeçalho com local e, para o dono, Convidar, Regras e Editar; abas Jogadores, Partidas e Financeiro (Financeiro só aparece para quem tem `group.view_finance`). Cada aba é uma sub-rota.
  - **Jogadores:** mensalistas e avulsos em seções separadas; o dono vê selo só quando a mensalidade pede atenção (pendente, Pix informado, recusado). Tocando num jogador: chamar no WhatsApp, trocar mensalista ↔ avulso e remover (com confirmação). "+ Jogador" adiciona pelo nickname quem já tem conta. Jogador comum pode sair da turma.
  - **Convidar:** um link por tipo (mensalista/avulso) com Copiar, WhatsApp (mensagem pronta), Compartilhar (quando o aparelho suporta) e QR Code (biblioteca `uqr`, carregada só ao abrir o QR). Desativar link e gerar outro.
  - **/convite/:código:** prévia pública (quem convidou, local, jogadores, próxima partida com vagas e preço do avulso). Sem login → celular e código → volta com `?aceitar=1` e entra sozinho; primeiro acesso entra direto pelo cadastro. Links desativados/expirados/esgotados explicam o motivo.
  - **Regras da turma:** subir da fila automaticamente, prazo de pagamento do avulso, prazo de resposta do mensalista (dias antes + horário) e liberar vaga de quem não responder. Cada mudança salva na hora (atualização otimista com rollback). Os padrões de sorteio entram na Sprint 4.
  - **Editar turma:** mesmo formulário da criação.
  - **Tokens novos:** `color-whatsapp`, `color-on-whatsapp` e `color-qr-background` (o QR fica sempre claro para a câmera ler).
  - **Números:** 81 testes (9 novos: trocar vínculo, remover, adicionar por nickname, jogador sair, links e QR, convite sem login de ponta a ponta, convite revogado, regras e editar turma).

### ✅ 11. Sprint 3 — Partidas, presença e lista de espera
- `features/matches`: criar e publicar partida (data, hora, local, vagas, preço do avulso, prazo de confirmação); lista de partidas; detalhe.
- `features/attendance`: Vou jogar / Não vou do mensalista; avulso pega vaga livre ou entra na fila; posição na fila; promoção (automática ou aprovada); prazos; tela de Presenças do organizador (adicionar/remover).
- Atualizações otimistas com rollback no Confirmar/Não vou.
- **Pronto quando:** os cenários de vaga (confirmar, recusar, lotar, fila sobe, prazo expira) passam em testes com MSW.
- **Feito (11/11):**
  - **Criar/editar partida:** nome sugerido ("Partida de quarta"), data, início/fim, local, vagas e valor do avulso vindos da turma; prazo dos mensalistas pela regra da turma ou definido na partida; publicar agora ou salvar rascunho. Datas no fuso da turma (`zonedToIso`/`isoToZoned`).
  - **Página da partida:** quando/onde, ocupação ("12 de 16 confirmados · 1 vaga livre"), avatares, valor do avulso, aviso de cancelamento e a lista separada em Confirmados, Aguardando pagamento, Lista de espera (com posição), Sem resposta e Não vão (recolhida). Atualiza a cada 20 s com a aba visível.
  - **Sua presença:** um cartão que muda conforme o caso — vaga reservada (Vou jogar / Não vou, com prazo), confirmado (desistir), avulso com vaga livre (Quero jogar + valor), lotada (Entrar na fila), na fila ("Você é o 2º da fila"), vaga reservada aguardando Pix (link para pagar, contador) e Pix informado.
  - **Otimista com rollback:** a resposta do mensalista muda na hora (contagem inclusa) e volta se o servidor recusar. Avulso espera o servidor, que diz o resultado (vaga, pagamento ou fila).
  - **Início:** próxima partida em destaque com "Vou jogar / Não vou" direto do cartão; as outras em "Depois".
  - **Organizar (dono):** publicar, fechar lista (recusa se há Pix para validar), reabrir, sortear (Sprint 4), iniciar, finalizar, editar, cancelar com motivo e "Convidar avulso" (link direto para a partida).
  - **Presenças (dono):** confirmar quem não respondeu, subir da fila, remover (a vaga vai para o próximo da fila se a turma sobe automaticamente) e adicionar jogador da turma.
  - **Partidas:** abas Próximas/Jogadas; aba Partidas da turma com rascunhos (dono) e anteriores.
  - **Mocks:** todos os endpoints de partidas e presenças, com prazo padrão calculado pela regra da turma (RN-20) e as regras de vaga/fila em `mocks/domain/attendance.ts`.
  - **Design system:** `ListItem` ganhou `actions` (botões de ícone sempre na mesma linha), usado na tela de Presenças.
  - **Números:** 90 testes (9 novos: confirmar e desistir, rollback do otimista, avulso desiste e a fila sobe, entrar na fila com posição, criar e publicar com prazo da regra, gerenciar presenças, fechar com Pix pendente e cancelar, ciclo de vida completo, lista de partidas).

### ✅ 12. Sprint 4 — Pagamentos, sorteio e encerramento
- `features/payments`: avulso informa Pix (com contador do prazo); organizador valida ou recusa; mensalidades do mês (Pago/Pendente).
- Financeiro da turma: saldo, recebido, a receber, lançamentos manuais (ex.: aluguel da quadra), gráfico mensal.
- `features/team-draw`: fechar lista, sortear com o padrão escolhido (nível + posição + equilíbrio), trocar jogadores, sortear de novo, publicar.
- Iniciar e finalizar partida; histórico mínimo no Perfil.
- **Pronto quando:** o ciclo completo do documento (login → … → finalizar/histórico) roda de ponta a ponta com mocks.
- **Feito (11/11):**
  - **Pagar com Pix (avulso):** valor, chave Pix da turma com "Copiar chave", contador do prazo (fica laranja nos últimos 30 min), observação opcional e "Já fiz o Pix". Mostra "Pix informado", recusado (com o motivo do organizador) e confirmado.
  - **Validar (dono):** em Presenças e no Financeiro — validar, recusar com motivo (o prazo do avulso volta a contar, mínimo 30 min) ou marcar como recebido em dinheiro. Validar confirma a vaga e lança a entrada no caixa.
  - **Financeiro da turma:** navegação por mês, saldo em destaque, recebido/gasto/a receber, gráfico de entradas dos últimos 6 meses (com tabela para leitores de tela), Pix para validar, mensalidades do mês (gerar para todos os mensalistas, "x de y pagas") e movimentações com "+ Lançamento" e exclusão dos manuais.
  - **Padrões de sorteio:** criar, editar, excluir e marcar como padrão, na tela de Regras (nº de times, jogadores por time, equilibrar por nível, distribuir posições, banco ou espalhar quem sobra).
  - **Sorteio:** escolhe o padrão, sorteia (serpentina por nível + distribuição de posições), mostra a diferença de nível e avisos, ajuste tocando em dois jogadores de times diferentes, sortear de novo e publicar.
  - **Times:** times publicados para todos, com "Você está no Time B" e a própria linha destacada; o dono pode refazer.
  - **Histórico:** partidas jogadas e pagamentos no Perfil.
  - **Fim das telas provisórias:** todas as rotas do mapa têm tela real; `PlaceholderPage` saiu do projeto.
  - **Mocks:** cobranças, mensalidades, validação/recusa, caixa e resumo, padrões e sorteio (algoritmo do RN-53 em `mocks/domain/draw.ts`).
  - **Números:** 97 testes (7 novos: validar Pix, avisar e recusar, financeiro, sorteio com troca e publicação, ver o próprio time, criar padrão, histórico).

---

## Fase E — Qualidade e entrega

### ✅ 13. Acessibilidade, performance e responsividade
- Revisão de teclado, leitor de tela (VoiceOver e TalkBack) e contraste nas telas reais, nos dois temas.
- Orçamento: JS inicial < 170 KB gzip, LCP < 2,5s em 4G, nenhuma página com mais de uma rolagem horizontal.
- Testes manuais em: iPhone (Safari e PWA instalado), Android (Chrome), desktop (Chrome, Safari, Firefox).
- **Feito (11/11):**
  - **Auditoria automática no Chrome de verdade** (`pnpm qa:audit`): 27 telas × 4 larguras (320, 390, 768 e 1280 px) × 2 temas. Confere axe-core (WCAG 2.1 AA + boas práticas, com contraste real), rolagem horizontal, h1 em toda tela, erros de JavaScript e teclado (o 1º Tab vai para "Pular para o conteúdo" e todo foco é visível). Resultado: **nenhum problema**. Corrigido no caminho: `<main>` duplicado na página "não encontrada".
  - **JS inicial: de 187 para 143 KB gzip.** O Zod e os formulários estavam entrando na primeira carga pelos `index.ts` das features; `"sideEffects"` no `package.json` deixou o bundler descartar o que não é usado. CSS inicial: 10 KB.
  - **LCP de 3,4 s para 2,2 s** (Lighthouse, celular em 4G lento): abertura estática no `index.html` com o logotipo, que pinta antes do JavaScript e é trocada pelo app sem piscar.
  - **Lighthouse (login, celular):** desempenho 96, acessibilidade 100, boas práticas 96 (o 4 que falta é o erro de rede de não ter API no teste).
  - **Orçamento no CI** (`pnpm budget`): o build falha se o JS inicial passar de 170 KB ou o CSS de 20 KB.
  - **Fica para gente de verdade:** VoiceOver/TalkBack e os aparelhos da lista — o roteiro está em `docs/deploy.md` › Checklist de testes manuais.

### ✅ 14. LGPD e conteúdo legal
- Termos de uso e política de privacidade linkados no login, consentimento registrado, exclusão de conta no Perfil, minimização dos dados exibidos (telefone só para o organizador).
- **Feito (11/11):**
  - **/termos e /privacidade** abertas sem login, com versão e aviso de minuta. A política lista dado × finalidade × base legal, quem vê o quê, com quem compartilhamos, armazenamento no aparelho, retenção, direitos do titular e o contato do encarregado (`VITE_PRIVACY_CONTACT`).
  - **Consentimento:** o cadastro grava a versão aceita. Se os termos mudarem (`VITE_TERMS_VERSION`) ou a API responder `TERMS_UPDATE_REQUIRED`, o app pede o novo aceite e volta para onde a pessoa estava. Novo endpoint `POST /me/terms`.
  - **Perfil › Privacidade e conta:** documentos (com a versão aceita), **Baixar meus dados** (JSON com conta, turmas, presenças e pagamentos; novo `GET /me/export`, antecipado da fase 2) e **Excluir conta** (confirmação explícita; quem organiza turma ativa é orientado a resolver antes). A exclusão anonimiza e libera as vagas futuras.
  - **Minimização revisada:** telefone e status de mensalidade só para o organizador; convite público mostra só nome, local e próxima partida; nada de cookies de rastreamento.
  - **Segurança:** política de segurança de conteúdo sem `unsafe-inline` (o script de tema saiu do HTML para `public/theme-init.js`).
  - **Números:** 103 testes (4 de LGPD e 2 de contrato).
  - **Depende de:** revisão jurídica dos textos (minuta pronta).

### 🟡 15. Integração com a API real
- Trocar MSW pela API conforme os módulos ficam prontos, feature por feature, com o mesmo contrato.
- **Pronto quando:** nenhum handler MSW é usado fora dos testes.
- **Preparado (11/11):**
  - **Teste de contrato dos mocks:** toda operação do `openapi.yaml` tem handler, e nenhum handler existe fora do contrato (faltavam os de foto; entraram).
  - **Integração gradual:** `VITE_API_MOCK_ONLY=matches,payments,draws` mantém só esses módulos simulados e manda o resto para a API real.
  - **Guia:** `docs/frontend/api-integration.md` — ordem dos módulos, checklist por módulo, requisitos de CORS, cookie de sessão, termos e fuso.
  - **Depende de:** API em homologação.

### 🟡 16. Publicação
- Deploy do front (ex.: Vercel, Netlify ou Cloudflare Pages), domínio, HTTPS, ícones finais, ambiente de homologação para o PM validar cada sprint.
- **Preparado (11/11):**
  - **Configurações prontas** para Vercel (`vercel.json`), Netlify (`netlify.toml`) e Cloudflare Pages (`public/_headers` e `_redirects`): rotas da SPA, cache (assets imutáveis por 1 ano; `index.html` e service worker sempre revalidados) e cabeçalhos de segurança (CSP, HSTS, nosniff, Referrer-Policy, Permissions-Policy, anti-clickjacking).
  - **Homologação sem back-end:** build com `VITE_API_MOCK=true` e `VITE_API_URL=/v1`; no Netlify, deploy previews e o branch `homologacao` já saem assim.
  - **Guia:** `docs/deploy.md` — ambientes, passo a passo do primeiro deploy, segurança, cache e checklist de testes em aparelhos.
  - **Depende de:** conta na hospedagem, domínio (registro.br), endereço da API para o `connect-src` e textos legais revisados.

---

## Dependências externas (precisam chegar antes da etapa indicada)

| O quê | Quem | Até a etapa |
| --- | --- | --- |
| Aprovação do protótipo | PM + você | 3 |
| Respostas em aberto (`decisions.md`) | PM | 3 |
| Aprovação final do símbolo e verificação de marca/domínio (INPI, registro.br) | Você + PM | 6 |
| Repositório oficial no GitHub | Lucas | 4 |
| Termos e política de privacidade | PM/Jurídico | 14 |
| API em homologação | Back-end | 15 |
