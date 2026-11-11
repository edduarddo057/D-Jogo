# Componentes base — regras de uso

Fonte: design system Dá Jogo Cada componente vive em `src/components/<Nome>/` com `<Nome>.tsx`, `<Nome>.module.css`, `<Nome>.test.tsx` e `index.ts`.

---

## Avatar

Foto do jogador ou, sem foto, as iniciais sobre uma das quatro cores `color-avatar-*`.

- A cor sai de um hash estável do id do usuário, então a mesma pessoa tem sempre a mesma cor.
- Tamanhos: `sm` 36px (pilhas e listas densas), `md` 48px (listas), `lg` 88px (perfil).
- Foto opcional (`src`); se a imagem falhar, volta para as iniciais.
- `AvatarStack` mostra até 5 e um contador "+N"; o conjunto tem `aria-label` com os nomes.
- As cores são sólidas, sem degradê, para manter o contraste do texto branco acima de 4.5:1.

---

## Badge

Selo de status compacto; a cor reforça, mas o texto sempre diz o estado.

| Tom | Usos |
| --- | --- |
| `success` | Confirmado, Pago, Mensalista |
| `warning` | Pendente, Aguardando confirmação, Aguardando pagamento |
| `info` | Avulso, Lista de espera (com posição) |
| `danger` | Recusou, Expirado |
| `neutral` | Lista fechada, Encerrada, Rascunho |

O mapeamento status → tom fica em cada feature (`attendance`, `payments`), não no componente. O ponto (`dot`) é opcional e marca estados que ainda pedem ação.

---

## Button

Botão de ação com cinco variantes, todas com no mínimo 52px de altura para toque confortável.

- **primary**: a ação principal da tela (Entrar, Confirmar, Ver partida). No máximo uma por área visível.
- **inverse**: ação forte de organizador que não é a principal do jogador (Gerenciar presenças, Convidar avulso).
- **danger**: recusa ou saída (Não vou, Sair). Sempre com rótulo explícito; nunca só um ícone.
- **outline**: ação neutra de par (Cancelar em modais).
- **ghost**: ação de texto (Ver todas, Criar conta), com área de toque de 44px.
- **FAB**: ação de criação na lista (+ Jogador, + Lançamento). Fica acima da navegação inferior no celular e vira botão comum no cabeçalho a partir de `bp-lg`.

Props previstas: `variant`, `size` (`md` | `sm`), `block`, `loading` (troca o rótulo por spinner e mantém a largura), `leftIcon`. Botões em `loading` ficam `aria-busy="true"` e desabilitados.

---

## HeroCard

Card de destaque sobre `color-brand`: a próxima partida na Home, o saldo no Financeiro e o cabeçalho da turma.

- Um por tela, sempre no topo; é o único lugar onde o azul de marca aparece dentro do app autenticado.
- Estrutura: sobretítulo (`overline`, `color-on-brand-accent`), título, metadados e, quando houver, um selo e uma ação primária.
- O anel decorativo (`f-hero__ring`) é o único ornamento da marca; fica `aria-hidden` e não recebe conteúdo.
- O status do jogador dita o selo e a ação: sem resposta → "Aguardando sua resposta" + "Responder"; confirmado → "Você está dentro" + "Ver partida"; lista de espera → posição na fila.

---

## ListItem

Linha de lista com início (avatar ou data), corpo (título + metadados) e fim (selo, menu ⋮ ou seta).

- As listas ficam agrupadas num card (`List`), com divisores entre itens; nada de um card por item.
- A linha inteira é o alvo de toque (`<a>` ou `<button>`), com no mínimo 72px de altura.
- O menu ⋮ do organizador é um botão separado de 44px, com `aria-label="Ações para <nome>"`.
- Título e metadados truncam com reticências numa linha; o selo nunca quebra por dentro.
- No celular, o conteúdo à direita (selo, valor, ações) desce para baixo dos metadados; a partir de 768px fica à direita (decisão F22).
- Variante de data: o início mostra o dia do mês sobre `color-avatar-*`, como nas próximas partidas.

---

## Modal

Sobreposição para tarefas curtas (convidar avulso, validar pagamento, confirmar recusa).

- **Celular**: bottom sheet preso à base, com alça e fechamento por arrastar para baixo.
- **A partir de 768px**: diálogo central de até 480px.
- Usa o `<dialog>` nativo (`showModal()`) para foco preso e Esc; o foco volta ao gatilho ao fechar.
- Ações no rodapé: a principal à direita; a destrutiva usa a variante `danger`.
- Confirmações destrutivas (remover jogador, recusar pagamento) sempre passam por um Modal; ações reversíveis usam Toast com "Desfazer".

---

## Navigation

Navegação principal com quatro destinos: Início, Turmas, Partidas e Perfil.

- **Até 1023px**: barra inferior fixa, respeitando `env(safe-area-inset-bottom)`; o conteúdo ganha `padding-bottom` igual à altura da barra.
- **A partir de 1024px** (`bp-lg`): barra lateral de 240px com o logotipo no topo e o mesmo conjunto de links.
- O item ativo usa `aria-current="page"`, fundo `color-accent-soft` e texto `color-accent-text`; não depende só da cor, porque o fundo muda a forma.
- Ícones de traço 2px, sempre com rótulo de texto. Biblioteca sugerida: Lucide (traço consistente, tree-shaking).
- Telas de fluxo (login, onboarding, criar partida) escondem a navegação e mostram só o botão voltar.

---

## OtpInput

Entrada do código de 6 dígitos enviado por SMS ou WhatsApp no login.

- Aceita colar o código inteiro em qualquer casa e distribui os dígitos.
- O primeiro campo usa `autocomplete="one-time-code"` para o preenchimento automático do iOS e do Android.
- Avança sozinho ao digitar e volta com Backspace; envia o formulário ao completar o sexto dígito.
- Mostra o contador de reenvio abaixo; ao zerar, vira o botão ghost "Reenviar código".
- Erro de código inválido: limpa as casas, foca a primeira e anuncia a mensagem num `role="alert"`.

---

## ProgressBar

Barra de ocupação de vagas da partida, com o texto "X de Y confirmados" e as vagas restantes.

- O número à direita mostra o que o jogador precisa saber (vagas restantes, ou "Lotada · 3 na espera"), não uma porcentagem.
- `role="progressbar"` com `aria-valuenow` e `aria-valuemax`.
- A largura anima em 400ms quando muda; com `prefers-reduced-motion`, sem animação.

---

## SegmentedControl

Abas internas de uma tela (Jogadores / Partidas / Financeiro na turma), com 2 a 4 opções.

- Segue o padrão de tabs do WAI-ARIA: `role="tablist"`, setas esquerda/direita trocam a aba.
- Cada aba é uma sub-rota (`/turmas/:id/jogadores`), então o link pode ser compartilhado e o botão voltar funciona.
- Aba "Financeiro" só aparece para o organizador da turma.

---

## TextField

Campo de texto com rótulo visível, dica opcional e mensagem de erro, integrado ao React Hook Form.

- O rótulo fica sempre acima do campo; o placeholder nunca substitui o rótulo.
- Fonte de 16px no input para o iOS não dar zoom ao focar.
- O erro vem do schema Zod, aparece abaixo do campo, liga-se por `aria-describedby` e marca `aria-invalid="true"`.
- Use `type`, `inputmode` e `autocomplete` corretos (`tel`, `email`, `one-time-code`, `name`, `nickname`).
- Variações previstas: `TextField`, `MoneyField` (máscara R$), `DateField`, `TimeField`, `SelectField`.

Props previstas: `label`, `hint`, `error`, mais todas as do `<input>` repassadas por `forwardRef` para o `register` do React Hook Form.

---

## Toast

Mensagem curta de retorno depois de uma ação, sobre `color-inverse`.

- Aparece acima da navegação inferior (celular) ou no canto inferior direito (desktop) e some após 4s; com ação "Desfazer", após 6s.
- `role="status"` para sucesso; erros que bloqueiam usam `role="alert"`.
- Um por vez: o novo substitui o anterior.
- Disparado pelos `onSuccess`/`onError` das mutations do TanStack Query, por um store Zustand de toasts.
