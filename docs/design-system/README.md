# Dá Jogo

**Todo esporte fica melhor quando Dá Jogo.** O design system do app que organiza turmas e partidas de qualquer esporte.

O Dá Jogo é um PWA pensado primeiro para o celular, na mão de quem está chegando na quadra, mas funciona por completo no desktop, onde o organizador costuma cuidar de presenças e financeiro. Tem tema claro e escuro desde o MVP.

## Princípios

1. **Uma decisão por tela.** Cada tela responde a uma pergunta ("vou jogar?", "quem confirmou?", "quem pagou?") e tem uma ação primária óbvia em `color-primary`.
2. **Status antes de detalhe.** A situação do jogador (confirmado, pendente, na espera, pago) aparece no topo, em selo com texto, antes de datas e listas.
3. **Polegar primeiro.** Ações principais na metade inferior da tela, alvos de toque de 44px no mínimo (botões de 52px), navegação ao alcance do polegar.
4. **Marca com moderação.** O azul-marinho (`color-brand`) aparece em um único card de destaque por tela; o resto é superfície neutra e calma.
5. **Organizador e jogador no mesmo app.** O papel muda por turma; as ações do organizador aparecem na mesma tela, logo abaixo do conteúdo do jogador, com a variante `inverse`.

## Voz e conteúdo

- Português do Brasil, tom de quadra: próximo, curto, sem gíria forçada. "Bora para mais um jogo?", "Você está dentro!", "Vaga liberada para a lista de espera".
- Fale com a pessoa ("Você está na lista de espera, 2º lugar"), não sobre o sistema ("Usuário inserido na fila").
- Botões com verbo: Confirmar, Não vou, Convidar, Fechar lista, Sortear times. Nada de "OK" ou "Enviar".
- Datas: "Qua, 24 set · 20:00" em cards; "24 de setembro de 2026" no detalhe. Dinheiro sempre "R$ 25,00", com `font-variant-numeric: tabular-nums`.
- Separador de metadados: ponto médio com espaços ( · ).

## Cores

As cores são semânticas: o código nunca usa hex, só `var(--color-*)`. Cada token tem valor no tema **claro** e no **escuro**, e todo par texto/fundo listado abaixo foi conferido com no mínimo 4.5:1 nos dois temas (bordas de campo e foco: 3:1).

| Papel | Tokens | Uso |
| --- | --- | --- |
| Base | `color-bg`, `color-surface`, `color-surface-raised`, `color-surface-sunken` | Página, cards, modais, trilhos |
| Texto | `color-text`, `color-text-muted`, `color-text-disabled` | Títulos e corpo, metadados, desabilitado |
| Ação | `color-primary` + `color-on-primary`, `color-accent-text`, `color-accent-soft` | Botão principal, links, item ativo |
| Marca | `color-brand`, `color-brand-deep`, `color-on-brand*` | Card de destaque, login, cabeçalho da turma |
| Ênfase secundária | `color-inverse` + `color-on-inverse` | Ações do organizador, toast |
| Estados | `color-{success,warning,danger,info}-{bg,text}` | Selos e retornos |
| Outros | `color-focus`, `color-overlay`, `color-avatar-1..4`, `color-chart` | Foco, véu de modal, avatares, gráficos |

Regras:
- **Verde-menta é ação.** `color-primary` só aparece em coisas que se tocam (botão, FAB) e na barra de progresso. Texto verde sobre fundo claro usa `color-accent-text`, mais escuro, para passar contraste.
- **Estados nunca só por cor.** Todo selo tem texto; ícones de status vêm com rótulo.
- **Tema escuro não é inversão.** As superfícies escuras ganham luminosidade conforme sobem de camada (`bg` < `surface` < `surface-raised`); sombras quase somem e as bordas fazem a separação.
- **Avatares em cor sólida**, sem degradê, escolhidos por hash do id do usuário.

## Tipografia

Duas famílias, servidas pelo próprio app (pacotes Fontsource), para funcionar offline e não depender de terceiros:
- **Plus Jakarta Sans** (700/800), família `display`: títulos, saldo e números grandes, com tracking negativo (-0.02em). Conversa com o logotipo pesado e inclinado.
- **Inter** (variável), família `sans`: todo o resto.

Escala (px de referência → rem no código):

| Estilo | Tamanho / linha | Peso | Onde |
| --- | --- | --- | --- |
| `display` | 32/36 (40/44 no desktop) | 800 | Saudação, título da tela |
| `title-lg` | 26/32 | 800 | Card de destaque, cabeçalho da turma |
| `title` | 20/26 | 700 | Títulos de seção |
| `money` | 36/40 | 800 | Saldo |
| `body-lg` | 17/24 | 400 | Detalhes da partida |
| `body` | 16/24 | 400 | Texto padrão e inputs |
| `body-strong` | 16/22 | 600 | Nomes em listas |
| `body-sm` | 14/20 | 400 | Metadados |
| `label` | 14/20 | 600 | Rótulos e selos |
| `button` | 17/24 | 700 | Botões |
| `caption` | 12/16 | 600 | Navegação inferior, eixos |
| `overline` | 12/16 | 700, +0.14em, caixa alta | Sobretítulos |

Inputs ficam sempre em 16px ou mais para o iOS não dar zoom ao focar.

## Unidades: 1rem = 10px

O projeto define `html { font-size: 62.5%; }`, então **1rem = 10px** no padrão do navegador e continua respeitando o tamanho de fonte que a pessoa escolheu no sistema (se ela aumenta para 20px, 1rem passa a 12.5px e tudo escala junto). Os tokens deste documento estão em px para leitura; no código cada um vira rem dividindo por 10: `space-4` = 16px = `1.6rem`, `body` = `1.6rem`.

Cuidados que vêm com essa escolha:
- O `body` precisa redefinir `font-size: 1.6rem`, senão todo texto sem tamanho explícito sai com 10px.
- Media queries ficam em `em` (`@media (width >= 64em)` = 1024px), porque `em` em media query sempre usa o tamanho padrão do navegador, não o do `html`.
- Bibliotecas de terceiros que assumem 1rem = 16px ficam menores; ajustar caso a caso.

## Espaçamento e forma

- Escala de 4px: `space-1` (4) até `space-16` (64). Margem lateral da página: `space-5` no celular, `space-8` no tablet, `space-10` no desktop.
- Raios generosos: `radius-xl` (24) em cards e modais, `radius-lg` (18) em botões e campos, `radius-full` em selos e avatares.
- Cards têm borda de 1px `color-border` **e** sombra suave `shadow-card`; no escuro a borda faz o trabalho.
- Listas são agrupadas num card só, com divisores, e não um card por item.

## Layout responsivo

Mobile-first, com quatro faixas (`bp-*`):

| Faixa | Largura | Layout |
| --- | --- | --- |
| Base | < 480px | Uma coluna, margem 20px, navegação inferior |
| `bp-sm` | ≥ 480px | Uma coluna, pilhas de avatares maiores |
| `bp-md` | ≥ 768px | Conteúdo centralizado em 640px; modais viram diálogos centrais |
| `bp-lg` | ≥ 1024px | Barra lateral de 240px; telas de detalhe em 2 colunas (ex.: partida à esquerda, participantes à direita); FAB vira botão no cabeçalho |
| `bp-xl` | ≥ 1280px | Conteúdo limitado a 1120px |

O app usa `100dvh` (não `100vh`) e respeita `env(safe-area-inset-*)` quando instalado como PWA.

## Tema escuro

- Segue o sistema por padrão (`prefers-color-scheme`), e a pessoa pode escolher Claro, Escuro ou Automático no Perfil. A escolha fica salva (Zustand com `persist`) e é aplicada em `<html data-theme="dark">` antes da primeira pintura, por um script inline no `index.html`, para não piscar.
- `<meta name="theme-color">` acompanha o tema (`#f4f6f8` / `#0b1622`).
- Imagens e ilustrações não são invertidas.

## Movimento

- Durações: 120ms (toque e hover), 200ms (entrada de toast e troca de abas), 320ms (bottom sheet e transição de tela). Curva padrão `cubic-bezier(.2, .8, .2, 1)`.
- Só `transform` e `opacity` animam, além da largura da barra de progresso.
- Retorno de ação importante: o botão Confirmar mostra um check e a barra de progresso avança; não há confete nem som.
- `prefers-reduced-motion: reduce` desliga animações não essenciais.

## Iconografia

- Ícones de traço 2px, cantos arredondados, grid de 24px. Biblioteca sugerida: **Lucide**, importando ícone por ícone.
- Sempre com rótulo de texto ao lado, exceto botões de ícone universais (voltar, fechar, menu ⋮), que levam `aria-label`.
- Sem emoji na interface.

## Logotipo

**Símbolo "O salto":** o "j" minúsculo de "jogo" desenhado como um jogador subindo, com o pingo solto virando a bola no ponto mais alto. O traço é único, com pontas redondas; só a bola leva cor.

- **Logotipo completo:** símbolo + "dá jogo" em minúsculas, Plus Jakarta Sans 800, tracking -0.045em. O símbolo tem 1,5× a altura das letras.
- **Marca (2.0):** símbolo "D" com o atleta e a bola, em verde, sobre as cores da base (azul-marinho `color-brand`, menta `color-primary`). Títulos de tela em itálico pesado, como o "Dá Jogo". O original fica em `public/brand/source/`. A marca anterior está na tag git `tema-azul-original`.
- **Ícone do app (PWA, favicon):** o símbolo sobre o azul-marinho `#142a40`, gerado por `pnpm icons`.
- **Fundos claros:** haste `color-brand` e bola `color-primary` (menta). O amarelo-sol não aparece sobre fundos claros.
- **Fundos escuros:** haste branca e bola amarelo-sol.
- **Área de respiro:** em volta do símbolo, no mínimo o diâmetro da bola. **Tamanho mínimo:** 24px.
- Não inclinar, contornar, aplicar degradê nem trocar a cor da haste por cores de estado.
- Os arquivos fonte (SVG do símbolo, logotipo e ícones 192/512/maskable) ficam em `public/brand/` e são gerados na etapa 6 do roadmap. Referência visual: canvas "Nome e escudo do app", página "Dá Jogo".

**Slogan:** "Todo esporte fica melhor quando Dá Jogo." (antes: "Junta a galera. Dá jogo.")

## Acessibilidade

- Contraste conferido por script para todos os pares de tokens nos dois temas.
- Foco de teclado visível em tudo: anel de 3px em `color-focus` com 2px de afastamento.
- Formulários com `<label>` real, erros ligados por `aria-describedby` e anunciados.
- Botões são `<button>`, navegação é `<a>`; nunca `onClick` em `<div>`.
- Alvos de toque de no mínimo 44 × 44px.
- A ordem do DOM segue a ordem visual; o layout desktop em 2 colunas não muda a ordem de leitura.

## Componentes base

Button, TextField, OtpInput, Badge, Avatar, ListItem, HeroCard, SegmentedControl, ProgressBar, Navigation, Modal e Toast, com as prévias e regras de uso logo abaixo. O CSS de referência (`components/bundle.css`) mostra a intenção visual; na aplicação cada componente vive em `src/components/<Nome>/` com seu `.module.css`.
