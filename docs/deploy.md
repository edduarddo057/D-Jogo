# Publicação e ambientes

O front é um site estático (pasta `dist/`). Qualquer hospedagem de sites estáticos com HTTPS serve; o projeto já vem configurado para três:

| Hospedagem | Arquivos usados |
| --- | --- |
| **Vercel** | `vercel.json` (rotas da SPA, cabeçalhos e cache) |
| **Netlify** | `netlify.toml` + `public/_headers` + `public/_redirects` |
| **Cloudflare Pages** | `public/_headers` + `public/_redirects` |

Comando de build: `pnpm build`. Pasta publicada: `dist`. Node 22.

## Ambientes

| Ambiente | Para quê | Variáveis |
| --- | --- | --- |
| **Homologação** | O PM valida cada sprint, sem depender do back-end | `VITE_API_MOCK=true`, `VITE_API_URL=/v1` |
| **Homologação integrada** | Front + API de homologação | `VITE_API_URL=https://api-hml.dajogo.app/v1` |
| **Produção** | Usuários reais | `VITE_API_URL=https://api.dajogo.app/v1`, `VITE_APP_URL=https://dajogo.app`, `VITE_TERMS_VERSION`, `VITE_PRIVACY_CONTACT` |

- Com `VITE_API_MOCK=true` o app sobe com os dados de teste (MSW) e **não** registra o service worker do PWA, para os dois não brigarem. Os dados ficam no navegador e voltam ao início ao recarregar.
- `VITE_API_URL=/v1` (mesma origem) na homologação com mocks faz a política de segurança (`connect-src 'self'`) valer sem ajuste.
- No Netlify, deploy previews e o branch `homologacao` já usam os mocks (`netlify.toml`). Na Vercel e no Cloudflare, crie as variáveis por ambiente no painel.

## Antes do primeiro deploy de produção

1. **API:** troque `https://api.dajogo.app` pelo endereço real em `connect-src`, nos dois lugares (`vercel.json` e `public/_headers`).
2. **Cookie de sessão:** a API precisa responder com `Access-Control-Allow-Origin` = domínio do app, `Access-Control-Allow-Credentials: true` e o cookie de refresh `HttpOnly; Secure; SameSite=Lax` (ou `None` se API e app ficarem em domínios diferentes). Ver `frontend/architecture.md` § 7.
3. **Domínio e HTTPS:** aponte o domínio (registro.br) para a hospedagem; o certificado é automático nas três. O `Strict-Transport-Security` já está ligado — só envie o domínio para a lista de preload depois de confirmar que todos os subdomínios têm HTTPS.
4. **Termos:** publique a versão revisada pelo jurídico e ajuste `VITE_TERMS_VERSION`. Quem aceitou uma versão anterior vê a tela de novo aceite.
5. **Ícones e marca:** os ícones em `public/` saem de `public/brand/*.svg` com `pnpm icons`. Se a marca mudar, gere de novo.
6. **Conferir:** `pnpm check`, depois `pnpm qa:audit` contra o endereço publicado (acessibilidade, rolagem horizontal e teclado) e o Lighthouse no celular.

## Segurança configurada

| Cabeçalho | Valor e motivo |
| --- | --- |
| `Content-Security-Policy` | Só scripts, estilos e fontes do próprio domínio; imagens também `data:`/`blob:` (QR Code e foto). Nenhum script inline: o tema inicial vem de `public/theme-init.js`. |
| `Strict-Transport-Security` | Força HTTPS por 2 anos. |
| `X-Content-Type-Options` | `nosniff`. |
| `Referrer-Policy` | `strict-origin-when-cross-origin`: links de convite não vazam o caminho para outros sites. |
| `Permissions-Policy` | Câmera, microfone, localização e pagamento desligados (o app não usa). |
| `frame-ancestors 'none'` | O app não pode ser embutido em outro site (clickjacking). |

## Cache

- `/assets/*` (arquivos com hash no nome): 1 ano, imutável.
- `index.html`, `sw.js` e o manifesto: sempre revalidados, para a versão nova chegar logo. O app avisa "Nova versão disponível" e atualiza quando a pessoa tocar (etapa 6).

## Checklist de testes manuais em aparelhos

O que a automação não cobre e precisa de gente, antes de cada publicação de produção:

| Aparelho | Conferir |
| --- | --- |
| iPhone, Safari | Login, colar o código do SMS (autopreenchimento), Pix "Copiar chave", compartilhar convite, área segura (notch e barra de gestos) |
| iPhone, app instalado (Adicionar à Tela de Início) | Abre sem barra do Safari, ícone e nome certos, volta logado |
| iPhone, VoiceOver | Login, confirmar presença, pagar, ver time — tudo anunciado e na ordem certa |
| Android, Chrome | Instalar pelo aviso do app, offline (faixa "Sem conexão"), compartilhar no WhatsApp |
| Android, TalkBack | Mesmo roteiro do VoiceOver |
| Desktop: Chrome, Safari e Firefox | Barra lateral, tamanhos de 1024 a 1920 px, navegação só com teclado |
| Tema escuro (sistema) | Todas as telas acima, sem texto apagado |
