# Dá Jogo

PWA para organizar turmas e partidas esportivas: presença, vagas, lista de espera, pagamentos, caixa e sorteio de times. Começa pelo vôlei. *Junta a galera. Dá jogo.*

## Requisitos

- Node 22+ (`.nvmrc`)
- pnpm 10 (`corepack enable` ativa a versão do `packageManager`)

## Começando

```bash
pnpm install
cp .env.example .env.local   # VITE_API_MOCK=true usa os mocks, sem back-end
pnpm dev                     # http://localhost:5173
```

Com os mocks, você entra como **Marina**, que organiza a turma de exemplo do manual, o **Vôlei de sábado** (16 membros, sábado às 9h no Clube Alto da Lapa, 12 vagas, avulso R$ 25, mensalista R$ 80/mês), e joga como avulsa no Vôlei de quarta. Para testar o login, use qualquer celular válido e o código **123456**.

### Roteiro com os mocks

Os dados ficam em memória: recarregar a página volta tudo ao início. Para trocar de pessoa, saia (Perfil › Ajustes › Sair) e entre com outro celular:

| Quem | Celular | Para ver |
| --- | --- | --- |
| Marina (organiza o Vôlei de sábado) | (11) 98765-4321 | Organizar › A resolver (aprovar, recusar, cobrar, lembrar, publicar, Desfazer), Presença › Iniciar jogo (dia de jogo, também sem internet), Membros, Caixa; e, como jogadora, Pagar R$ 30 no Vôlei de quarta |
| Eduardo (avulso no sábado) | (11) 98888-7777 | "Pague R$ 25 até sex, 21h", Pagar com Pix e o aviso de pagamento |
| Vini (avulso, 2º na fila) | (11) 97777-6666 | "2º na fila. Se abrir vaga, você entra e a gente avisa." e só 3 abas |
| Otávio (organiza o Vôlei de quarta) | (11) 96666-5555 | Outra turma, outra visão |
| Sofia (fora das turmas) | (11) 95555-4444 | Entrar pelo convite `/convite/SABADO25` |
| Qualquer outro número | — | Primeiro acesso: celular, código e perfil |

## Modo demonstração (`/demo`)

Para mostrar o app sem cadastro: em `/demo`, com senha, a pessoa entra como organizadora de uma **Turma Demo** pronta (13 jogadores e um jogo hoje, todo mundo confirmado) e roda uma partida completa no próprio celular. Tudo roda no navegador, com os mocks: nada vai para a API real.

- **Senha:** só a impressão digital fica no ambiente, em `VITE_DEMO_PASSWORD_HASH`. Gere com `pnpm demo:senha "sua senha"`. Vazio = demonstração fechada.
- **Dados:** ficam salvos no aparelho por `VITE_DEMO_DAYS` dias (padrão 30). "Sair" não apaga: voltando por `/demo` com a senha, a pessoa continua de onde parou. Em `/demo` dá para apagar e começar do zero.
- **Jogadores:** a turma já vem com 13 (edite `DEMO_PLAYERS` em `src/mocks/demo/seed.ts`), e dá para **adicionar pessoas na hora, só pelo nome**, sem conta: em Organizar › Membros ("Adicionar pessoa") ou no dia de jogo ("Adicionar quem não estava na lista" › Pessoa nova). A pessoa entra na turma e já fica confirmada no próximo jogo; se a lista estiver cheia antes do jogo, abre uma vaga a mais. Só existe na demonstração (rota interna dos mocks, `POST /demo/groups/{id}/players`, que não existe na API real).
- **Limite:** a senha é conferida no navegador. Ela impede o acesso casual, mas quem souber mexer no navegador consegue entrar. Como a demo não tem dados reais, o risco é só alguém ver a demonstração.

## Scripts

| Script | O que faz |
| --- | --- |
| `pnpm dev` | Servidor de desenvolvimento |
| `pnpm build` | Gera tokens, confere tipos e gera `dist/` |
| `pnpm preview` | Serve o build localmente |
| `pnpm test` / `pnpm test:watch` / `pnpm coverage` | Testes (Vitest) |
| `pnpm typecheck` | TypeScript |
| `pnpm lint` / `pnpm lint:css` | ESLint / Stylelint |
| `pnpm format` / `pnpm format:check` | Prettier |
| `pnpm tokens` | Gera `src/styles/tokens.css` de `docs/design-system/tokens.json` |
| `pnpm api:types` | Gera `src/lib/http/schema.d.ts` de `docs/api/openapi.yaml` |
| `pnpm icons` | Gera o símbolo transparente e os ícones do PWA a partir de `public/brand/source/simbolo-original.png` |
| `pnpm demo:senha "senha"` | Gera a impressão digital da senha do modo demonstração (`VITE_DEMO_PASSWORD_HASH`) |
| `pnpm budget` | Confere o orçamento de JS/CSS inicial (depois do build) |
| `pnpm qa:audit [url]` | Acessibilidade, rolagem horizontal e teclado no Chrome, em 25 telas e folhas × 4 larguras × 2 temas (precisa do app rodando com mocks e de um Chrome em `CHROME_PATH`) |
| `pnpm check` | Tudo o que o CI confere, de uma vez |

`tokens.css` e `schema.d.ts` são gerados: não edite à mão. O CI falha se estiverem desatualizados.

A marca fica em `public/brand/`: o original em `source/`, o símbolo para fundo escuro (`symbol.png`) e para fundo claro (`symbol-on-light.png`). O logotipo é o símbolo + "Dá Jogo" em texto (componente `BrandLogo`). Tudo sai de `pnpm icons` (`scripts/brand/build-symbol.mjs`). A versão anterior da marca (azul) está no git, na tag `tema-azul-original`.

## Documentação

Comece por [`docs/README.md`](docs/README.md). Os principais:

- [Roadmap de versões](docs/roadmap-versoes.md) (2.0.0: manual de usabilidade) e [decisões](docs/decisions.md)
- [Arquitetura do front-end](docs/frontend/architecture.md)
- [Design system](docs/design-system/README.md)
- [Publicação](docs/deploy.md) e [integração com a API real](docs/frontend/api-integration.md)
- [Contrato da API](docs/api/openapi.yaml), [domínio](docs/backend/domain.md) e [regras de negócio](docs/backend/business-rules.md)

## Estrutura

```
src/
├── app/         inicialização, providers, rotas, layouts, guardas
├── pages/       uma pasta por rota (só composição)
├── features/    um assunto por pasta (api, queries, components, schemas, types, index.ts)
├── components/  design system
├── lib/         utilitários sem React (http, format, storage)
├── stores/      Zustand (sessão, tema, toasts, PWA)
├── mocks/       MSW (handlers e banco em memória)
├── styles/      tokens.css (gerado) e global.css
└── test/        setup e utilitários de teste
```

As regras de importação entre essas pastas são verificadas pelo ESLint (ver `eslint.config.js`).
