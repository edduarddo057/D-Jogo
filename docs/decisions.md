# Decisões do projeto Dá Jogo

Registro das decisões já tomadas. Toda mudança de decisão entra aqui com data e motivo; nada é apagado.

## Produto e regras de negócio

| # | Decisão | Data |
| --- | --- | --- |
| P1 | Login por número de celular + código de 6 dígitos (SMS ou WhatsApp). Mesmo login para organizador e jogador. | 30/09/2026 |
| P2 | O papel é definido por turma. **No MVP, cada turma tem um único responsável (quem a criou); não existe co-organizador.** | 10/11/2026 |
| P3 | **Lista de espera:** o organizador escolhe, por turma, se o 1º da fila sobe automaticamente quando uma vaga abre ou se ele aprova manualmente. | 10/11/2026 |
| P4 | **Avulso aguardando pagamento:** o organizador define, por turma, quanto tempo o avulso tem para pagar (ou dar sinal) depois de ganhar a vaga. Esgotado o prazo, a vaga vai para o próximo da fila. | 10/11/2026 |
| P5 | **Mensalista sem resposta até o prazo:** o organizador define, por turma, se a vaga é liberada automaticamente ou não. | 10/11/2026 |
| P6 | **Sorteio:** o organizador cria e salva padrões de sorteio (ex.: 4×4, 6×6), personalizáveis, e marca um como padrão da turma. | 10/11/2026 |
| P7 | Pagamento no MVP é manual: o jogador informa o Pix, o organizador valida, o status vai de Pendente para Pago. | 30/09/2026 |

## Marca

| # | Decisão | Data |
| --- | --- | --- |
| M1 | Nome do app: **Dá Jogo** (substitui o nome de trabalho F.L.E.W.). Pendente: busca de marca no INPI e de domínio. | 10/11/2026 |
| M2 | Símbolo **"O salto"**: o "j" de jogo como jogador saltando, com o pingo virando a bola. | 10/11/2026 |
| M3 | Ícone do app em azul-marinho com a bola **amarelo-sol** (`color-brand-ball`, só na marca). Menta segue como cor de ação da interface. | 10/11/2026 |
| M4 | Slogan: **"Junta a galera. Dá jogo."** | 10/11/2026 |

## Front-end

| # | Decisão | Data |
| --- | --- | --- |
| F1 | PWA instalável (vite-plugin-pwa), mobile-first e **totalmente responsivo**: funciona no celular e no desktop. | 10/11/2026 |
| F2 | React + Vite + **TypeScript**. | 10/11/2026 |
| F3 | Rotas: **React Router 7**. | 10/11/2026 |
| F4 | Estado global do cliente: **Zustand** (sessão, tema, toasts). Dados do servidor ficam no **TanStack Query**. | 10/11/2026 |
| F5 | Formulários com **React Hook Form** + validação com **Zod**. | 10/11/2026 |
| F6 | HTTP com **Axios** (instância única com interceptors). | 10/11/2026 |
| F7 | Estilos com **CSS Modules** + variáveis CSS do design system. | 10/11/2026 |
| F8 | Testes com **Vitest** + React Testing Library + MSW (mocks da API). | 10/11/2026 |
| F9 | Estrutura: `app/`, `pages/` (finas), `features/` por assunto (auth, profile, groups, invites, matches, attendance, payments, team-draw), `components/` (design system), `lib/`, `styles/`, `test/`. Uma feature só importa outra pelo `index.ts` dela. | 10/11/2026 |
| F10 | `html { font-size: 62.5% }`: **1rem = 10px**. Media queries em `em`. | 10/11/2026 |
| F11 | **Tema escuro no MVP**: Automático (segue o sistema), Claro ou Escuro, escolhido no Perfil. | 10/11/2026 |
| F13 | **Aprovado (10/11):** ferramentas de apoio — `openapi-typescript` (tipos do contrato), `date-fns`/`date-fns-tz` (prazos no fuso da turma), `clsx`, Lucide (ícones), Stylelint (bloqueia hex/px soltos), `eslint-plugin-jsx-a11y` e regras de importação entre camadas. | 10/11/2026 |
| F14 | Sessão: token de acesso só em memória; token de renovação em cookie `HttpOnly` (a confirmar com o back-end). | 10/11/2026 |
| F15 | Respostas da API não ficam em cache no service worker; o TanStack Query cuida dos dados. | 10/11/2026 |
| F16 | Gerenciador de pacotes: **pnpm 10**, Node 22. | 10/11/2026 |
| F17 | Versões: React 19, Vite 8, Vitest 5, React Router 7.18 (a 8 já existe; seguimos na 7 como decidido), TanStack Query 5, Zod 4, MSW 3. **TypeScript 5.9** (o 6/7 ainda não é suportado por typescript-eslint/openapi-typescript) e **Stylelint 17** (plugin de valores estritos ainda não suporta o 18). Revisar a cada trimestre. | 10/11/2026 |
| F18 | Regras de camadas no ESLint com `no-restricted-imports` (nativo), no lugar de `eslint-plugin-boundaries`. | 10/11/2026 |
| F19 | Fontes servidas pelo app (Fontsource) em vez do Google Fonts: funcionam offline no PWA e não expõem o IP do usuário a terceiros. | 10/11/2026 |
| F20 | O componente Toast foi antecipado da etapa 7 para a 6 (necessário para o aviso de nova versão do PWA). | 10/11/2026 |
| F21 | Testes de componentes incluem auditoria automática de acessibilidade (axe-core); contraste segue conferido por script nos tokens. | 11/11/2026 |
| F22 | ListItem: no celular, o conteúdo à direita (selo, valor, ações) desce para baixo dos metadados; à direita só a partir de 768px. | 11/11/2026 |
| F23 | Galeria do design system em `/dev/componentes`, disponível só em dev e homologação com mocks. | 11/11/2026 |
| F24 | Escala de nível provisória de 1 a 5 (Iniciante, Básico, Intermediário, Avançado, Competitivo), autodeclarada. Vem do catálogo `/sports`, então mudar a escala não exige mudar o front. | 11/11/2026 |
| F25 | Foto de perfil fica para a fase 2 (precisa de upload e armazenamento no back-end). | 11/11/2026 |
| F26 | Resposta do mensalista com vaga reservada é otimista (muda na hora, desfaz se o servidor recusar); entrada de avulso espera o servidor, que decide vaga, pagamento ou fila. | 11/11/2026 |
| F27 | O anúncio de troca de rota só leva o foco ao h1 se a página não tiver focado um campo dela (ex.: código do login). | 11/11/2026 |
| F28 | `ListItem.actions`: botões de ícone sempre na mesma linha, à direita (Presenças, Financeiro, padrões de sorteio). Ações com texto continuam em `trailing`. | 11/11/2026 |
| F29 | QR Code gerado no próprio app (`uqr`, carregado só ao abrir o QR); nenhum serviço externo vê o link do convite. | 11/11/2026 |
| F30 | "Gerar mensalidades" não cobra o próprio organizador. | 11/11/2026 |
| F12 | O protótipo enviado é referência de estilo, não especificação; as telas seguem o design system Dá Jogo | 10/11/2026 |

## Qualidade, LGPD e publicação

| # | Decisão | Data |
| --- | --- | --- |
| Q1 | `"sideEffects": ["**/*.css", ...]` no `package.json`: o bundler descarta módulos não usados importados pelos `index.ts` das features (JS inicial de 187 para 143 KB gzip). Código com efeito colateral no topo do módulo precisa entrar nessa lista. | 11/11/2026 |
| Q2 | Abertura estática no `index.html` (logotipo sobre o azul da marca), trocada pelo app ao montar. Melhora o LCP e evita tela branca em rede lenta. | 11/11/2026 |
| Q3 | Orçamento de performance no CI: JS inicial ≤ 170 KB e CSS ≤ 20 KB gzip (`pnpm budget`). | 11/11/2026 |
| Q4 | Auditoria de acessibilidade e responsividade no Chrome real (`pnpm qa:audit`), além do axe nos testes (jsdom não calcula contraste nem layout). | 11/11/2026 |
| L1 | Termos e privacidade publicados como minuta versionada; o aceite grava a versão e uma versão nova pede novo aceite (`POST /me/terms`). | 11/11/2026 |
| L2 | Exclusão de conta no app, com anonimização (RN-91); quem organiza turma com participantes precisa resolver a turma antes. | 11/11/2026 |
| L3 | "Baixar meus dados" (`GET /me/export`, JSON) antecipado da fase 2 para o MVP: é barato e atende o direito de acesso e portabilidade (LGPD, art. 18). | 11/11/2026 |
| L4 | CSP sem `unsafe-inline`: nenhum script ou estilo inline no HTML (`public/theme-init.js`, `public/splash.css`). | 11/11/2026 |
| P8 | Hospedagem estática com configurações prontas para Vercel, Netlify e Cloudflare Pages; a escolha final fica com quem tiver a conta. | 11/11/2026 |
| P9 | Homologação pode rodar só com mocks (sem back-end) e, depois, com integração gradual por módulo (`VITE_API_MOCK_ONLY`). | 11/11/2026 |

## Back-end

| # | Decisão | Data |
| --- | --- | --- |
| B1 | A tecnologia do back-end será escolhida depois. Agora documentamos **sem depender de tecnologia**: modelo de dados, regras de negócio, contrato OpenAPI. O front usa esse contrato via MSW até a API existir. | 10/11/2026 |

## Documentação

| # | Decisão | Data |
| --- | --- | --- |
| D1 | Documentação técnica em Markdown dentro do repositório, na pasta `docs/`. | 10/11/2026 |

## Ainda em aberto

- Detalhes do algoritmo de sorteio: pesos de nível × posição, o que fazer com reservas, número ímpar de jogadores.
- Política de cancelamento e reembolso do avulso que já pagou e desiste.
- Notificações no MVP: só dentro do app, ou também push (Web Push) e WhatsApp?
- Escala de nível do jogador: provisória de 1 a 5 (F24). Falta decidir se o organizador pode corrigir o nível autodeclarado.
- Provedor de SMS/WhatsApp para o código de acesso (impacta só o back-end).
- Domínio e nome jurídico, termos de uso e política de privacidade (LGPD).
