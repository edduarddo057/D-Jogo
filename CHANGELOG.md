# Changelog

As versões seguem o [roadmap de versões](docs/roadmap-versoes.md). Decisões de cada mudança em [docs/decisions.md](docs/decisions.md).

## 2.1.0 — 23/11/2026

Contrato da API **0.4.0** (só acréscimos: quem usa a 0.3.0 continua funcionando).

### Novo
- **Fundamentos e sorteio por fundamentos** (RN-17a, RN-103a): no vôlei, nota de 1 a 10 em saque, recepção, ataque, levantamento e passe, dada pelo organizador na folha do membro (só ele vê). No sorteio, "Equilibrar por nível" escolhe entre **Nível geral** e **Fundamentos**, que deixa a soma de cada fundamento parecida entre os times, mantendo gênero e posições. Os times mostram as médias de cada fundamento.
- **Modo demonstração** em `/demo`, com senha: turma pronta, sem conta nem cadastro, dados salvos no aparelho por 30 dias; dá para adicionar pessoas só pelo nome.
- **Placar em tela cheia e travado**, que também funciona com o celular deitado: o +1 abre, do lado do time, quem fez o ponto; o −1 tira também de quem recebeu; "Ninguém" para ponto sem nome.
- **Mural de honra** em Jogos (para quem já jogou) e **Suas estatísticas**: nível, números, forma recente, onde vai melhor, parceiros de vitória, melhor dia e conquistas (RN-94).
- **Time que mais ganhou** no resumo do dia, pelas pessoas que jogaram juntas, mesmo se o time mudou de cor ou foi desfeito; toque para ver quem jogou e as rodadas.
- **Vários dias fixos por turma**, cada um com o seu horário (`schedules`).
- **Compartilhar a turma** (organizador) por QR Code ou link.
- **Membros** separados em Mensalistas e Avulsos, com ordenação por nome, posição e, para o organizador, gênero.
- **Quem vai** no detalhe do jogo abre a lista de confirmados e da fila.
- **Conferir Pix na hora**, na folha da pessoa em Presença, sem ir para A resolver.
- **Presença** com Pendentes (sem resposta e falta pagar), Fila e Confirmados.
- **Chegada** com todo mundo já marcado e as regras do sorteio na própria tela.
- **Instalar o app**: detecta se já está instalado e oferece a instalação (Android, iPhone com o passo a passo).
- **Uso em pé**: fora do placar, o app trava em pé onde o aparelho deixa e pede para girar onde não deixa.
- **Nova marca**: símbolo "D" com o atleta e a bola, em verde, abertura animada que monta o logo com as próprias peças, títulos em itálico.

### Mudou
- Aba **Você** agora se chama **Perfil**.
- Confirmações importantes (tirar da lista, remover da turma, encerrar o dia) abrem uma folha que diz o que vai acontecer, em vez de "toque de novo para confirmar".
- Etapas do dia de jogo com bolinhas numeradas; "Fim da rodada" virou "Resultado".
- Jogos não mostra mais "Último jogo" (o histórico fica no Perfil).
- Textos de listas quebram em várias linhas em vez de cortar com "…".

### Corrigido
- O dia de jogo não trava mais em "Fechando o dia…" quando o servidor perde o modo ao vivo: reabre e reenvia, descarta o que não tem como ir e tenta de novo sozinho.
- Folha aberta não rola mais a tela de trás.
- Gaveta do placar não fecha ao tocar no espaço vazio dentro dela.
- Cabeçalho das folhas não sobrepõe título longo aos botões.

## 2.0.0
Manual de usabilidade (vôlei). Detalhes em [docs/roadmap-versoes.md](docs/roadmap-versoes.md).
