# Arquitetura do front-end — Dá Jogo

PWA em React, pensado primeiro para o celular e totalmente responsivo até o desktop. Este documento é o guia de decisões técnicas do front: onde cada coisa fica, como os dados fluem e quais convenções todo o time segue. Decisões registradas em [../decisions.md](../decisions.md) (F1–F12); visual em [../design-system/README.md](../design-system/README.md); contrato da API em [../api/openapi.yaml](../api/openapi.yaml).

## 1. Princípios

1. **O servidor é a fonte da verdade.** Dados da API vivem no TanStack Query. O Zustand guarda só o estado do próprio app (sessão, tema, toasts).
2. **Feature dona do seu assunto.** Tudo de um assunto (tipos, schemas, chamadas, hooks, componentes, estilos, testes) fica numa pasta de feature.
3. **Páginas finas.** Uma página só compõe features e define o layout da rota.
4. **Contrato primeiro.** Os tipos e os mocks seguem o `openapi.yaml`. O front não espera o back-end para avançar.
5. **Acessível e rápido por padrão.** HTML semântico, foco visível, JS inicial pequeno, rotas carregadas sob demanda.
6. **Código em inglês, interface em português.** Nomes de arquivos, variáveis e tipos em inglês; textos, rotas e mensagens em pt-BR.

## 2. Stack

| Necessidade | Escolha | Observação |
| --- | --- | --- |
| Base | React + Vite + TypeScript (`strict`) | Versões fixadas no `package.json` na etapa 4. |
| Rotas | React Router 7 (modo data, `createBrowserRouter`) | Rotas lazy, loaders para pré-carregar dados. |
| Dados do servidor | TanStack Query | Cache, revalidação, mutações otimistas. |
| HTTP | Axios | Instância única com interceptors. |
| Estado do cliente | Zustand (+ `persist`) | Sessão, tema, toasts, instalação do PWA. |
| Formulários | React Hook Form + `@hookform/resolvers/zod` | |
| Validação | Zod | Schemas de formulário e de resposta da API. |
| Estilos | CSS Modules + variáveis do design system | `clsx` para combinar classes. |
| PWA | `vite-plugin-pwa` (Workbox) | |
| Ícones | Lucide (import por ícone) | |
| Testes | Vitest + React Testing Library + `@testing-library/user-event` + MSW | `jsdom` como ambiente. |
| Qualidade | ESLint (typescript-eslint, react-hooks, jsx-a11y, regras de importação) + Prettier | |
| Datas | `Intl` nativo + `date-fns` (com `date-fns-tz` para o fuso da turma) |
| Fontes | Fontsource (`@fontsource-variable/inter`, `@fontsource/plus-jakarta-sans`), servidas pelo app | |

## 3. Estrutura de pastas

```
src/
├── app/                        # inicialização: nada de regra de negócio aqui
│   ├── main.tsx                # monta <App/>, registra o service worker
│   ├── App.tsx                 # providers (QueryClient, Router, Theme, Toasts)
│   ├── router.tsx              # mapa de rotas (seção 5)
│   ├── queryClient.ts          # padrões do TanStack Query
│   ├── layouts/                # AppShell, FlowLayout/PublicLayout, Toaster, RouteAnnouncer,
│   │                           # OfflineBanner, SkipLink, BrandLogo, RouteStates (splash, erro, 404)
│   └── guards/                 # RequireAuth, RequireProfile, RequirePermission
├── pages/                      # uma pasta por rota; só composição
│   ├── HomePage/
│   │   ├── HomePage.tsx
│   │   └── HomePage.module.css
│   └── …
├── features/
│   ├── auth/
│   ├── profile/
│   ├── groups/
│   ├── invites/
│   ├── matches/
│   ├── attendance/
│   ├── payments/
│   ├── finance/
│   └── team-draw/
├── components/                 # design system (sem regra de negócio, sem chamadas à API)
│   ├── Button/
│   │   ├── Button.tsx
│   │   ├── Button.module.css
│   │   ├── Button.test.tsx
│   │   └── index.ts
│   └── …
├── lib/                        # utilitários sem React e sem regra de negócio
│   ├── http/                   # instância Axios, ApiError, refresh de sessão
│   ├── format/                 # dinheiro, datas, telefone, iniciais
│   └── a11y/                   # helpers de foco e anúncio
├── stores/                     # stores Zustand globais (sessão, tema, toasts, pwa)
├── styles/                     # tokens.css (gerado), global.css
├── mocks/                      # MSW: handlers, fábricas de dados, cenários
│   ├── browser.ts
│   ├── server.ts
│   ├── db.ts                   # "banco" em memória para os mocks
│   └── handlers/               # um arquivo por feature
├── test/                       # setup do Vitest, renderWithProviders, utilitários
└── vite-env.d.ts
```

O financeiro aparece como feature própria (`finance`), separada de `payments`. Cobranças e caixa mudam por motivos diferentes e têm telas diferentes.

### 3.1 Anatomia de uma feature

```
features/attendance/
├── api/
│   ├── attendanceApi.ts         # funções que chamam a API (sem React)
│   └── attendanceApi.schemas.ts # schemas Zod das respostas (opcional, ver 6.2)
├── queries/
│   ├── attendanceKeys.ts        # fábrica de query keys
│   ├── useParticipations.ts     # useQuery
│   └── useRespondToMatch.ts     # useMutation (com otimismo)
├── components/
│   ├── AttendanceActions/       # "Vou jogar" / "Não vou"
│   ├── OccupancyCard/           # barra de vagas
│   ├── ParticipantList/
│   └── WaitlistPosition/
├── hooks/                       # hooks de UI da feature (sem chamadas à API)
├── schemas/                     # schemas de formulário (Zod)
├── types.ts                     # tipos da feature (derivados de Zod ou do contrato)
├── utils/                       # funções puras (ex.: status → tom do Badge)
├── constants.ts
└── index.ts                     # API pública da feature
```

Nem toda feature precisa de todas as pastas; crie só o que for usar.

**`index.ts` é a porta de entrada.** Só exporta o que outras partes podem usar:

```ts
// features/attendance/index.ts
export { AttendanceActions } from './components/AttendanceActions';
export { OccupancyCard } from './components/OccupancyCard';
export { ParticipantList } from './components/ParticipantList';
export { useParticipations } from './queries/useParticipations';
export { attendanceKeys } from './queries/attendanceKeys';
export type { Participation, ParticipationStatus } from './types';
```

## 4. Regras de dependência

```
app  →  pages  →  features  →  components, lib, stores
                      ↘ outras features (só pelo index.ts)
```

| Pode importar de… | app | pages | features | components | lib | stores | mocks |
| --- | :-: | :-: | :-: | :-: | :-: | :-: | :-: |
| **app** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (só em dev) |
| **pages** | — | — | ✅ (index) | ✅ | ✅ | ✅ | — |
| **features** | — | — | ✅ (index de outra) | ✅ | ✅ | ✅ | — |
| **components** | — | — | — | ✅ | ✅ | — | — |
| **lib** | — | — | — | — | ✅ | — | — |

- `components/` nunca chama a API nem conhece regra de negócio. Um `Badge` recebe `tone`; quem decide que `waitlisted` é `info` é a feature.
- Uma feature não importa arquivos internos de outra (`features/x/components/...`), só `features/x`.
- As regras são verificadas no lint (`no-restricted-imports` por camada, em `eslint.config.js`), e o CI falha se forem quebradas.
- Aliases: `@/app`, `@/pages`, `@/features/*`, `@/components/*`, `@/lib/*`, `@/stores/*`, `@/styles/*`.

## 5. Rotas

> Versão 2.0 (manual de usabilidade, foco vôlei). Abas: **Jogos**, **Turmas**, **Organizar** (só para dono de turma, com o número de pendências) e **Você**. Ver `docs/roadmap-versoes.md` › 2.0.0.

URLs em português, curtas e compartilháveis. **Tarefas curtas não são rotas:** abrem numa folha por cima da tela de origem, ligada ao parâmetro `?folha=` (`useSheetParam`). Abrir empilha uma entrada no histórico, então o Voltar do celular fecha a folha e a pessoa continua onde estava.

| Caminho | Página | Acesso | Layout |
| --- | --- | --- | --- |
| `/convite/:code` | InvitePage (vê a turma antes de pedir dados) | público | Public |
| `/entrar` | LoginPhonePage (Seu celular) | só deslogado | Flow |
| `/entrar/codigo` | LoginCodePage (Código) | só deslogado | Flow |
| `/entrar/perfil` | OnboardingPage (Seu perfil + aceite dos termos) | logado, perfil incompleto | Flow |
| `/termos/aceitar` | AcceptTermsPage (nova versão dos termos, RN-05) | logado | Flow |
| `/termos`, `/privacidade` | TermsPage, PrivacyPage | público | Public |
| `/` | GamesPage (Jogos: seus números, Próximo, Depois) | logado | AppShell |
| `/jogos/:matchId` | GamePage (detalhe do jogo) | membro | AppShell |
| `/jogos/:matchId/resumo` | DaySummaryPage (Resumo do dia) | membro | AppShell |
| `/avisos` | NotificationsPage | logado | AppShell |
| `/turmas` | GroupsPage (+ redondo: entrar com convite ou criar) | logado | AppShell |
| `/turmas/:groupId` | GroupPage (turma como jogador, nada editável) | membro | AppShell |
| `/turmas/nova` | CreateGroupPage (uma tela só) | logado | Flow |
| `/organizar` | OrganizePage (suas turmas + A resolver) | dono | AppShell |
| `/organizar/:groupId/presenca·membros·caixa` | OrganizerGroupPage (visão de organizador; trocar de aba não empilha histórico) | dono | AppShell |
| `/organizar/:groupId/dia-de-jogo/:matchId` | GameDayPage (Chegada, Times, Placar, Fim da rodada) | dono | Fullscreen |
| `/voce` | YouPage (perfil, 3 números, histórico) | logado | AppShell |
| `/voce/ajustes` | SettingsPage (tema, avisos, conta) | logado | AppShell |

**Folhas (`?folha=`)**

| Folha | Onde abre | Parâmetros |
| --- | --- | --- |
| `pagar` | qualquer tela do AppShell (Jogos, Avisos, Você, detalhe, turma) | `jogo` ou `pagamento` |
| `nova-turma` | Turmas | — |
| `membros` | Turma como jogador | — |
| `editar-perfil` | Você | — |
| `trocar-numero`, `excluir-conta` | Ajustes | — |
| `novo-jogo`, `convidar` | Presença (e Convidar em Membros) | — |
| `membro` | Membros | `pessoa` |
| `lancamento` | Caixa | — |
| `editar-jogo` | Organizar (rascunho) | `jogo` |

**Regra do Voltar (manual 5).** O `NavBar` usa `useBack`: se a tela foi aberta de dentro do app, o Voltar desfaz a navegação (a origem continua no histórico); se foi aberta por link, vai para o destino padrão. Links levam a origem no `state` (`fromState('/avisos', 'Avisos')`), e o botão mostra o nome dela. O Resumo do dia aberto ao encerrar o dia de jogo substitui a tela do jogo, então o Voltar cai na turma.

**Guardas**
- `RequireAuth`: sem sessão → `/entrar?voltar=<rota atual>`.
- `RequireProfile`: perfil incompleto → `/entrar/perfil`; termos desatualizados → `/termos/aceitar` (Ajustes continua aberto).
- A visão de organizador confere `viewer.role === 'owner'`; o back-end sempre valida de novo.

**Fluxo do convite sem login:** `/convite/:code` mostra a prévia pública. "Entrar na turma" guarda o código e leva a `/entrar`. Depois do código: perfil incompleto → `/entrar/perfil` (o convite é aceito ao concluir); perfil pronto → `/convite/:code?aceitar=1`, que aceita sozinho. Nos dois casos a pessoa cai em Jogos.

**Dia de jogo sem internet.** `features/live/stores/gameDayStore.ts` guarda a sessão no `localStorage` a cada toque (chegada, times, placar, rodadas) e uma fila de envio (`outbox`); `useGameDaySync` esvazia a fila quando há conexão. O sorteio roda no aparelho (`features/live/utils/draw.ts`, a mesma regra do mock do servidor).

## 6. Dados

### 6.1 Cliente HTTP (`lib/http`)

```ts
// lib/http/client.ts (resumo)
export const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 15_000,
  withCredentials: true, // cookie de renovação
});

http.interceptors.request.use((config) => {
  const token = useSessionStore.getState().accessToken; // só em memória
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

http.interceptors.response.use(undefined, async (error) => {
  if (isUnauthenticated(error) && !error.config._retried) {
    await refreshSessionOnce();          // uma renovação por vez, as outras esperam
    error.config._retried = true;
    return http(error.config);
  }
  throw toApiError(error);               // sempre ApiError { status, code, fields, rule }
});
```

- **`ApiError`** normaliza todo erro: rede, timeout e Problem Details (`code`, `fields`, `rule`).
- **Renovação em voo único:** se várias chamadas recebem 401 juntas, só uma renova; as outras esperam a mesma promessa. Se a renovação falhar, a sessão é limpa e o app vai para `/entrar`.
- **`Idempotency-Key`:** as mutações de vaga e dinheiro geram um UUID por tentativa do usuário (não por retry automático).
- Funções de API são finas e tipadas: `getMatch(matchId): Promise<Match>`, `respondToMatch(matchId, response)`.

### 6.2 Tipos do contrato

- Os tipos da API são **gerados do `openapi.yaml`** (ex.: `openapi-typescript`) em `src/lib/http/schema.d.ts`, com o script `pnpm api:types`. Nunca editar à mão.
- Cada feature reexporta os tipos que usa em `types.ts`, com nomes de domínio: `export type Match = components['schemas']['Match']`.
- Zod valida **formulários** sempre. Para **respostas da API**, valida só onde um formato errado causaria estrago silencioso (dinheiro, datas de prazo), em dev e nos testes, para não pesar em produção.

### 6.3 TanStack Query

Padrões (`app/queryClient.ts`):

| Opção | Valor | Por quê |
| --- | --- | --- |
| `staleTime` | 30 s | Partida e presença mudam com frequência, mas não a cada segundo. |
| `gcTime` | 5 min | |
| `retry` | até 2, **nunca** para 4xx | Erro de regra não melhora tentando de novo. |
| `refetchOnWindowFocus` | `true` | Ao voltar para o app, a lista atualiza. |
| `refetchInterval` (tela da partida e de presenças) | 20 s com a aba visível | Vagas mudam enquanto a pessoa olha. Tempo real (SSE/WebSocket) fica para a fase 2. |
| `networkMode` | `online` | Offline, as consultas pausam e aparece o aviso "Sem conexão". |

**Fábricas de chaves.** Uma por feature, hierárquicas, para invalidar com precisão:

```ts
export const matchKeys = {
  all: ['matches'] as const,
  detail: (id: string) => [...matchKeys.all, 'detail', id] as const,
  byGroup: (groupId: string, scope: 'upcoming' | 'past') => [...matchKeys.all, 'group', groupId, scope] as const,
  mine: (scope: 'upcoming' | 'history') => [...matchKeys.all, 'mine', scope] as const,
};
```

**O que cada mutação invalida**

| Mutação | Invalida |
| --- | --- |
| `respondToMatch` | `matchKeys.detail(id)`, `attendanceKeys.list(id)`, `matchKeys.mine(*)`, `groupKeys.mine` |
| `addParticipation`, `promoteParticipation`, `removeParticipation` | `matchKeys.detail(id)`, `attendanceKeys.list(id)` |
| `publish/close/reopen/start/finish/cancelMatch`, `updateMatch` | `matchKeys.detail(id)`, `matchKeys.byGroup(groupId, *)`, `matchKeys.mine(*)` |
| `reportPayment` | `paymentKeys.mine`, `matchKeys.detail(matchId)` |
| `approvePayment`, `rejectPayment` | `paymentKeys.byGroup(groupId)`, `attendanceKeys.list(matchId)`, `matchKeys.detail(matchId)`, `financeKeys.all(groupId)` |
| `createLedgerEntry`, `deleteLedgerEntry`, `registerPayment`, `generateMonthlyFees` | `financeKeys.all(groupId)`, `paymentKeys.byGroup(groupId)` |
| `updateGroup`, `updateGroupRules` | `groupKeys.detail(groupId)`, `groupKeys.mine` |
| `addMember`, `updateMember`, `removeMember`, `acceptInvite`, `leaveGroup` | `memberKeys.list(groupId)`, `groupKeys.detail(groupId)`, `groupKeys.mine` |
| `drawTeams`, `moveDrawPlayers`, `publishDraw` | `drawKeys.match(matchId)`, `matchKeys.detail(matchId)` |
| `updateMe`, `completeOnboarding`, `uploadPhoto` | `meKeys.me` |

**Atualização otimista.** Só no "Vou jogar"/"Não vou" do **mensalista**, onde o resultado é previsível: o botão e a contagem mudam na hora, e um erro desfaz a mudança e mostra um toast. Para o **avulso**, o resultado depende da vaga (pode ir para a fila), então a interface mostra carregando e usa o `outcome` da resposta para escolher a mensagem.

**Prazos na tela.** Contagens regressivas ("Pague até 22:15 · faltam 1h 52min") são calculadas no cliente a partir do `paymentDeadline`. Ao zerar, o app refaz a busca da partida, porque o servidor é quem decide o estado.

### 6.4 Mocks (MSW)

- `src/mocks/handlers/<feature>.ts` implementa os endpoints do contrato sobre um banco em memória (`mocks/db.ts`), **incluindo as regras de vaga e fila**. Assim o front testa fluxos reais sem back-end.
- Os dados iniciais reproduzem o protótipo (Vôlei — Laranjeiras, 16 vagas, 13 confirmados…).
- **Cenários** prontos (`?cenario=lotada`, `?cenario=avulso-pagando`, `?cenario=organizador`) para desenvolver e demonstrar estados difíceis.
- Em dev, `VITE_API_MOCK=true` liga o MSW no navegador (`src/app/enableMocks.ts`; o script do worker é servido pelo plugin `msw/vite`). Nos testes, `mocks/server.ts` é usado sempre, com `onUnhandledFrame: 'error'`: chamada sem mock derruba o teste.
- Login nos mocks: qualquer celular válido, código **123456**. O usuário inicial é o Lucas (dono da turma Vôlei — Laranjeiras).
- Com os mocks ligados, o service worker do PWA não é registrado (os dois disputariam o escopo `/`).
- Quando o back-end real ficar pronto, basta desligar a variável; nenhum código de feature muda (roadmap, etapa 15).

## 7. Estado do cliente (Zustand)

| Store | Conteúdo | Persistência |
| --- | --- | --- |
| `useSessionStore` | `accessToken` (memória), `status` (`unknown` \| `authenticated` \| `anonymous`), `pendingInviteCode`, `redirectTo`; ações `setSession`, `setAnonymous`, `clear` | Só `pendingInviteCode` e `redirectTo`, em `sessionStorage`. |
| `useThemeStore` | `preference` (`system` \| `light` \| `dark`), `resolved`; aplica `data-theme` no `<html>` e o `theme-color` | `localStorage` |
| `useToastStore` | fila com um toast visível por vez; `show({ message, tone, action })` | — |
| `usePwaStore` | evento de instalação adiado, `isStandalone`, `updateAvailable` | — |

Regras:
- **Nunca copiar dados da API para o Zustand.** Os dados do usuário logado vêm de `useMe()` (TanStack Query).
- Seletores pequenos (`useThemeStore((s) => s.resolved)`) para evitar renderizações à toa.
- Stores ficam em `src/stores/`; estado que só uma feature usa fica dentro dela (`features/x/stores/`).

**Sessão.** O token de acesso fica só em memória. O token de renovação vem em cookie `HttpOnly; Secure; SameSite=Lax`, fora do alcance de scripts. Ao abrir o app, `bootstrapSession()` chama `/auth/refresh`: se der certo, `status = authenticated`; se não, `anonymous`. Enquanto o status for `unknown`, aparece a tela de abertura com o logo. Se o back-end não puder usar cookie, a alternativa é guardar o token de renovação no `localStorage`, aceitando o risco de XSS, mitigado por CSP rígida. Essa decisão é do back-end e está registrada no contrato.

## 8. Formulários

- Um schema Zod por formulário em `features/x/schemas/`; o tipo vem de `z.infer`.
- `useForm({ resolver: zodResolver(schema), mode: 'onTouched' })`: o erro aparece ao sair do campo e some ao corrigir.
- Os campos do design system (`TextField`, `MoneyField`, `DateField`, `TimeField`, `SelectField`, `Switch`, `OtpInput`) usam `forwardRef` e funcionam com `register`. Componentes controlados usam `Controller`.
- **Erros do servidor:** `ApiError.fields` é aplicado com `setError(campo, { message })`; erros sem campo vão para um alerta no topo do formulário.
- **Dinheiro:** a pessoa digita "25,00"; o formulário guarda centavos (`2500`). Formatação com `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`.
- **Telefone:** máscara `(21) 99876-5432` na tela, envio em E.164.
- **Datas:** entrada no fuso da turma, envio em ISO com offset (`lib/format/dates.ts`).
- O botão de envio fica desabilitado só durante o envio (com `loading`); erros de validação aparecem ao tentar enviar, não escondendo o botão.
- Nickname: checagem de disponibilidade com debounce de 400 ms, mostrando as sugestões da API.

## 9. Erros, carregamento e retorno

| Situação | Padrão |
| --- | --- |
| Carregando a primeira vez | `Skeleton` no formato do conteúdo; nunca spinner de tela cheia, exceto na abertura do app. |
| Revalidando em segundo plano | Nada visível; os dados antigos continuam. |
| Lista vazia | `EmptyState` com ação ("Crie sua primeira turma"). |
| Erro ao carregar | `ErrorState` com "Tentar de novo". 404/403 têm mensagem própria. |
| Erro em ação | Toast com a mensagem do `code`. Se a ação puder ser repetida, com "Tentar de novo". |
| Ação bem-sucedida | Toast curto ("Presença confirmada"). Se puder ser desfeita, com "Desfazer". |
| Sem conexão | Faixa fixa "Sem conexão — mostrando o que já foi carregado". Mutações ficam desabilitadas. |
| Erro inesperado de renderização | `ErrorBoundary` por rota; o app não fica em branco. |

**Mensagens por código.** `lib/http/errorMessages.ts` mapeia cada `code` do contrato para um texto em pt-BR (ex.: `PAYMENTS_TO_REVIEW` → "Valide os pagamentos pendentes antes de fechar a lista."). Um teste garante que todo `code` do `openapi.yaml` tem mensagem.

## 10. Estilos

- **CSS Modules** por componente (`Button.module.css`); classes em camelCase (`.primaryAction`), combinadas com `clsx`.
- **Só variáveis do design system** (`var(--color-*)`, `var(--space-*)`, `var(--radius-*)`). Hex solto ou px solto no CSS de componente falham no lint (Stylelint com `declaration-strict-value`).
- **1rem = 10px** (`html { font-size: 62.5% }`). O `body` volta para `var(--text-body-size)` (1.6rem).
- **Media queries em `em`**, mobile-first: `@media (width >= 64em)` = 1024px. Os breakpoints estão no fim do `tokens.css`.
- **Layout fluido**: `max-width` com `var(--content-max)`, grids com `minmax`, `100dvh` no lugar de `100vh`, `env(safe-area-inset-*)` nas bordas fixas.
- Nada de estilo global além de `global.css` (reset, base, `.visually-hidden`).
- Animações só com `transform` e `opacity`, usando `--duration-*` e `--ease-standard`, e respeitando `prefers-reduced-motion`.

## 11. Tema

1. Um script inline no `index.html` lê a preferência salva antes do React carregar e aplica `data-theme` no `<html>`. Assim a tela não pisca no tema errado.
2. `useThemeStore` mantém a preferência (`system` \| `light` \| `dark`) e escuta `prefers-color-scheme` quando é `system`.
3. O `<meta name="theme-color">` muda junto (`#f4f6f8` claro / `#0b1622` escuro).
4. Componentes nunca checam o tema; usam só tokens semânticos, que já mudam de valor.

## 12. PWA

| Item | Decisão |
| --- | --- |
| Plugin | `vite-plugin-pwa`, estratégia `generateSW`, `registerType: 'prompt'`. |
| Manifest | `name: "Dá Jogo"`, `short_name: "Dá Jogo"`, `display: standalone`, `start_url: "/"`, `scope: "/"`, `lang: pt-BR`, `background_color: #142a40`, `theme_color: #142a40`, ícones 192, 512 e `maskable` gerados do símbolo "O salto" (`public/brand/`). |
| Cache | Precache do app shell (HTML, JS, CSS, ícones) e das fontes, que são servidas pelo próprio app (Fontsource, só subconjuntos latinos no precache). **Respostas da API não ficam no service worker**: o TanStack Query cuida dos dados, para nunca mostrar vaga ou pagamento desatualizado como se fosse atual. |
| Atualização | Quando há versão nova, aparece um toast "Nova versão disponível — Atualizar" (`src/app/pwa.ts`). A atualização nunca acontece sozinha. Com os mocks ligados, o service worker do PWA não é registrado. |
| Instalação (Android/desktop) | Guardar o `beforeinstallprompt` (`usePwaStore`) e oferecer "Instalar app" em Perfil › Preferências (`InstallAppCard`) e depois da primeira presença confirmada, nunca na primeira visita. |
| Instalação (iPhone) | Sem aviso nativo: um card com 3 passos ("Compartilhar → Adicionar à Tela de Início") aparece no Safari quando o app não está instalado. |
| Tela de abertura | Fundo `#142a40` com o símbolo; no iOS, `apple-touch-icon` e as metatags de status bar. |
| Offline | Abre o app shell e mostra os últimos dados em memória com o aviso "Sem conexão". |

## 13. Acessibilidade

- Marcos semânticos (`header`, `nav`, `main`), um `h1` por página, ordem de títulos coerente.
- Ao trocar de rota, o foco vai para o `h1` da nova página e o título é anunciado (`document.title` = "Página · Dá Jogo").
- Todo controle é `<button>` ou `<a>`, com alvo mínimo de 44×44px e foco visível (`--color-focus`).
- Mudanças assíncronas importantes (presença confirmada, vaga liberada) são anunciadas por região `aria-live="polite"` (o próprio Toast).
- Contagens regressivas não são anunciadas a cada segundo, só nos marcos (30, 10 e 1 minuto).
- Lint com `jsx-a11y` e testes de componentes buscando por papel (`getByRole`).

## 14. Testes

| Tipo | Onde | Ferramentas | Cobre |
| --- | --- | --- | --- |
| Unitário | `*.test.ts` ao lado do arquivo | Vitest | `utils/`, `lib/format`, schemas Zod, mapeamentos de status. |
| Componente | `*.test.tsx` ao lado | Vitest + RTL + user-event | Design system e componentes de feature (estados, teclado, papéis ARIA). |
| Integração de feature | `features/x/__tests__/*.test.tsx` | Vitest + RTL + MSW | Fluxos: confirmar presença, avulso entra na fila, validar pagamento, sortear. |
| Contrato | `mocks/__tests__/contract.test.ts` | Vitest + validador OpenAPI | As respostas dos handlers MSW seguem o `openapi.yaml`. |

- `test/renderWithProviders.tsx` monta QueryClient (sem retry), Router de memória e stores limpos.
- Busca por papel e texto visível (`getByRole('button', { name: 'Vou jogar' })`), nunca por classe CSS.
- Relógio falso (`vi.useFakeTimers`) para prazos.
- Metas para o CI: `lib/` e `utils/` ≥ 90% de linhas cobertas; features ≥ 70%. Um fluxo de integração por regra crítica (RN-22, 23, 24, 31, 40, 62).

## 15. Variáveis de ambiente

| Variável | Exemplo | Uso |
| --- | --- | --- |
| `VITE_API_URL` | `http://localhost:3333/v1` | Base da API. |
| `VITE_API_MOCK` | `true` | Liga o MSW no navegador (só dev/homologação). |
| `VITE_APP_URL` | `https://[domínio]` | Monta links de convite e o QR Code. |
| `VITE_TERMS_VERSION` | `2026-11` | Versão dos termos aceitos no cadastro. |

Nada secreto vai para variáveis `VITE_*`, porque elas ficam visíveis no bundle.

## 16. Convenções de código

| Item | Convenção | Exemplo |
| --- | --- | --- |
| Componente | PascalCase; pasta + arquivo com o mesmo nome; export nomeado | `OccupancyCard/OccupancyCard.tsx` |
| Hook | `useAlgo.ts` | `useRespondToMatch.ts` |
| Função de API | verbo + recurso, igual ao `operationId` | `respondToMatch`, `getMatch` |
| Query keys | `<recurso>Keys` | `matchKeys.detail(id)` |
| Schema Zod / tipo | `createMatchSchema` / `CreateMatchForm` | |
| CSS Module | `Componente.module.css`, classes camelCase | `.headerTitle` |
| Teste | `Arquivo.test.ts(x)` ao lado | |
| Constantes | `UPPER_SNAKE_CASE` | `MAX_POSITIONS` |
| Booleanos | `is/has/can/should` | `canManage` |
| Textos de interface | pt-BR, junto do componente; sem i18n no MVP, mas sem texto montado por concatenação | |
| Exports | Nomeados; `default` só em páginas lazy | |

**Git e revisão**
- Branches `feat/…`, `fix/…`, `chore/…`; commits em Conventional Commits (`feat(attendance): lista de espera`).
- PR pequeno, com print ou vídeo curto quando houver mudança visual nos dois temas e em celular/desktop.
- Checklist do PR: testes, lint, nenhum hex ou px solto, sem import fora da regra, textos revisados, acessibilidade por teclado.

## 17. Orçamento de desempenho

| Métrica | Meta (celular médio, 4G) |
| --- | --- |
| JS inicial (gzip) | ≤ 170 KB |
| LCP | ≤ 2,5 s |
| INP | ≤ 200 ms |
| CLS | ≤ 0,1 |
| Lighthouse PWA / Acessibilidade | Instalável / ≥ 95 |

Ferramentas: `rollup-plugin-visualizer` para ver o tamanho do bundle e Lighthouse CI no PR de homologação.

## 18. Cobertura das telas do protótipo 2.0

| Tela do protótipo | Onde está |
| --- | --- |
| Convite para a turma; Entrar — celular, código, seu perfil | `InvitePage`, `LoginPhonePage`, `LoginCodePage`, `OnboardingPage` |
| Jogos; Jogo — detalhe; Pagar com Pix (de Jogos, Avisos e Você) | `GamesPage`, `GamePage`, folha `pagar` (`PaySheet`) |
| Resumo do dia (de Jogos, Avisos, Você e do fim do dia de jogo) | `DaySummaryPage` |
| Avisos | `NotificationsPage` |
| Turmas (+ e a folha Nova turma); Turma como jogador | `GroupsPage`, `GroupPage` |
| Você; Ajustes | `YouPage`, `SettingsPage` |
| Organizar — resolver aqui mesmo (com Recusar pagamento) | `OrganizePage` (+ `RejectSheet`) |
| Turma — presença, membros, Membro, caixa, Novo lançamento | `OrganizerGroupPage` (`PresenceTab`, `MembersTab`, `CashTab`) |
| Novo jogo; Convidar | `pages/shared/organizer/NewGameSheet`, `InviteSheet` |
| Criar turma | `CreateGroupPage` |
| Dia de jogo — Chegada, Times, Placar, Fim da rodada | `GameDayPage` |
