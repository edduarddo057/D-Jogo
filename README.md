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

Com os mocks, você entra como **Lucas** (dono da turma Vôlei — Laranjeiras). Para testar o login, use qualquer celular válido e o código **123456**.

### Roteiro com os mocks

Os dados ficam em memória: recarregar a página volta tudo ao início. Para trocar de pessoa, saia (Perfil › Sair) e entre com outro celular:

| Quem | Celular | Para ver |
| --- | --- | --- |
| Lucas (dono da Laranjeiras, mensalista no Centro) | (21) 99876-5432 | Organizar: presenças, validar Pix, financeiro, sorteio |
| Rafael (avulso confirmado na quarta) | (21) 98000-2222 | Desistir da vaga e ver a fila subir |
| Carla (avulsa, 1ª da fila) | (21) 98001-5554 | Lista de espera e, ao subir, pagar com Pix |
| Tiago (dono do Centro) | (21) 98000-6666 | Outra turma, outra visão |
| Sofia (fora das turmas) | (21) 98001-9998 | Entrar pelo convite `/convite/LARANJA7` |
| Qualquer outro número | — | Primeiro acesso e cadastro |

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
| `pnpm icons` | Gera os ícones PNG do PWA a partir de `public/brand/app-icon*.svg` |
| `pnpm budget` | Confere o orçamento de JS/CSS inicial (depois do build) |
| `pnpm qa:audit [url]` | Acessibilidade, rolagem horizontal e teclado no Chrome, em 27 telas × 4 larguras × 2 temas (precisa do app rodando com mocks e de um Chrome em `CHROME_PATH`) |
| `pnpm check` | Tudo o que o CI confere, de uma vez |

`tokens.css` e `schema.d.ts` são gerados: não edite à mão. O CI falha se estiverem desatualizados.

A marca fica em `public/brand/` (símbolo, logotipo e ícone em SVG). Os SVGs saem de `scripts/brand/build-brand-svgs.py` (Python + fonttools), e os PNGs, de `pnpm icons`.

## Documentação

Comece por [`docs/README.md`](docs/README.md). Os principais:

- [Roadmap](docs/roadmap.md) e [decisões](docs/decisions.md)
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
