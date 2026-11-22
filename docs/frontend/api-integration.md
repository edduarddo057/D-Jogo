# Integração com a API real

O front foi construído contra o contrato (`docs/api/openapi.yaml`) com os mocks do MSW fazendo papel de back-end. Trocar pela API real não exige mudar telas: o mesmo contrato vale para os dois lados.

## O que já garante a troca

| Garantia | Onde |
| --- | --- |
| Tipos do front gerados do contrato | `pnpm api:types` → `src/lib/http/schema.d.ts` (o CI falha se estiver desatualizado) |
| Toda operação do contrato tem mock, e nenhum mock existe fora dele | `src/mocks/__tests__/contract.test.ts` |
| Erros no formato Problem Details, com `code` do contrato e mensagem em pt-BR para cada um | `src/lib/http/apiError.ts`, `errorMessages.ts` (o TypeScript falha se faltar mensagem para um código novo) |
| Regras de vaga, fila e pagamento iguais às do back-end | `src/mocks/domain/*.ts` seguem `docs/backend/business-rules.md` — servem de referência executável |

## Integração gradual, módulo por módulo

Com `VITE_API_MOCK=true` e `VITE_API_MOCK_ONLY` preenchido, só os módulos listados continuam simulados; o resto vai para `VITE_API_URL`:

```bash
# auth, me, groups e invites já na API de homologação; partidas, pagamentos e modo ao vivo ainda simulados
VITE_API_URL=https://api-hml.dajogo.app/v1
VITE_API_MOCK=true
VITE_API_MOCK_ONLY=matches,payments,live
```

Módulos dos mocks × módulos do back-end (`docs/backend/modules.md`):

| Mock | Cobre os módulos do back-end |
| --- | --- |
| `auth` | auth |
| `me`, `sports` | users |
| `groups` | groups |
| `invites` | invites |
| `matches` | matches + attendance |
| `payments` | payments + finance |
| `live` | live (modo ao vivo, sorteio, rodadas) |

Atenção: os dados simulados e os reais não se conhecem (ids diferentes). A troca parcial serve para testar um módulo novo da API com o resto do app funcionando; para validar fluxos inteiros, use a API completa.

## Ordem sugerida

Segue as dependências entre módulos e as sprints:

1. **auth + users** — login, sessão por cookie, cadastro, termos, exclusão e exportação.
2. **groups + invites** — turmas, regras, jogadores e convites.
3. **matches + attendance** — partidas, presença, fila e prazos (o scheduler do back-end precisa estar rodando).
4. **payments + finance** — cobranças, validação, caixa.
5. **live** — modo ao vivo, sorteio e placar.

## Checklist por módulo

Para cada módulo que chega na API de homologação:

- [ ] Rodar a suíte de contrato do back-end contra o `openapi.yaml` (ex.: Schemathesis ou Dredd) — status, campos obrigatórios e `code` dos erros.
- [ ] Tirar o módulo de `VITE_API_MOCK_ONLY` e repetir os fluxos das sprints correspondentes (roteiro do README).
- [ ] Conferir as permissões: o objeto `viewer` vem pronto da API e o front não recalcula papéis.
- [ ] Conferir prazos com o relógio do servidor (o front só exibe; quem expira vaga e cobrança é o back-end).
- [ ] Conferir `Idempotency-Key` nos POSTs que criam coisas (partida, convite, presença, pagamento).

## Requisitos da API para o front funcionar

- **CORS:** `Access-Control-Allow-Origin` com o domínio do app (não `*`), `Access-Control-Allow-Credentials: true`, cabeçalhos `Authorization`, `Content-Type` e `Idempotency-Key` liberados.
- **Sessão:** token de acesso curto no corpo da resposta (fica só na memória do app) e refresh em cookie `HttpOnly; Secure`. O front chama `POST /auth/refresh` ao abrir e quando recebe 401, uma vez só por vez (`src/lib/http/client.ts`).
- **Termos:** quando a versão aceita estiver desatualizada, qualquer chamada pode responder `TERMS_UPDATE_REQUIRED`; o front leva a pessoa para o novo aceite.
- **Fuso:** datas em ISO 8601 com fuso (UTC). O front exibe no fuso da turma (`America/Sao_Paulo` no MVP).

## Pronto quando

Produção com `VITE_API_MOCK` desligado e nenhum handler do MSW em uso fora dos testes. Os mocks continuam no repositório: são a base dos testes automatizados e da homologação sem back-end.
