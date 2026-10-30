# Visão geral em três colunas: Specification

> Pedido do dono em 2026-10-30, depois do brainstorm de aproveitamento de tela inspirado na home da
> Coinbase: "vamos implementar a de 3 colunas". O protótipo aprovado é o quadro "A · Três colunas"
> do canvas https://claude.ai/artifact/Sys8vH52d2sD82UhN97znU (privado, só do dono).

## Problem Statement

O dono usa o myBilling num monitor de 1.920 px ou mais. O conteúdo para em 1.024 px e o menu
lateral fica dentro dessa largura, então mais da metade da tela fica vazia. Ao abrir o app, o dono
quer três coisas: lançar um gasto, ver se o mês fecha e achar um lançamento. A Visão geral só
resolve a segunda. Lançar e buscar exigem ir para Lançamentos, abrir um diálogo ou rolar a lista.
O dono também sente falta de hierarquia, sobra de botões e poucas linhas por tela.

## Goals

- [ ] Fazer as três tarefas de abertura (lançar, ver se o mês fecha e achar um lançamento) sem sair da Visão geral
- [ ] Usar a largura do monitor grande com mais colunas, e não com linhas mais compridas
- [ ] Uma moldura só para o app inteiro: menu na borda esquerda, sem a pílula no topo

## Out of Scope

| Feature | Reason |
| --- | --- |
| Redesenho de Lançamentos, Todo mês e Cadastros | Cada tela tem rodada própria; nesta, só a moldura muda |
| Linhas mais densas na tabela de Lançamentos | Faz parte da rodada de Lançamentos |
| Saber quando cada lançamento foi cadastrado | Decisão do dono: "Últimos lançamentos" usa a data, sem coluna nova nem migração |
| Resultado da busca dentro da coluna de ação | Decisão do dono: a busca abre Lançamentos filtrado |
| Formulário de lançamento novo, com menos campos | A coluna de ação reusa os formulários de hoje |
| Mudar os quatro cards de indicadores | Decisão do dono: os cards ficam como estão |
| Corrigir a hidratação do `TransicaoMes` com movimento reduzido | Defeito anterior a esta fatia, registrado à parte |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Estrutura da Visão geral | Três colunas: menu, mês no centro, coluna de ação à direita | Escolha do dono sobre o protótipo | y |
| Alcance do menu na borda | Todas as telas autenticadas, a home do ano inclusive | Escolha do dono | y |
| O que é "Últimos lançamentos" | Os do mês aberto, pela data do lançamento | Escolha do dono; não muda o banco | y |
| Onde fica "Importar planilha" | Rodapé do menu lateral, perto do nome | Escolha do dono | y |
| O que a busca faz | Abre Lançamentos da competência com o filtro de busca aplicado | Escolha do dono; reusa o filtro `busca` da URL | y |
| Cadastro na coluna de ação | Os mesmos formulários do diálogo de Lançamentos, com as abas Avulso e Parcelado, abertos | Reuso: um cadastro só, com as mesmas regras e mensagens. Revê, só na Visão geral, o AD-014 (cadastro em diálogo) e o objetivo de `painel-e-lancamentos` de tirar o formulário de quem só consulta: o dono quer lançar sem sair da Visão geral | n (decisão do autor) |
| Rótulo "Já saiu da conta" do formulário aberto | Fica como está, ao lado do card "Saiu da conta" da visão Movimentações | É rótulo de campo, não de indicador; o e2e de MOV-03 passa a procurar o rótulo exato do card | n (decisão do autor) |
| Seletor de competência | Fica no topo da área de conteúdo, em toda tela de competência, como hoje | O protótipo trocava o seletor por setas ao lado do título só na Visão geral; manter o seletor preserva o atalho "Mês atual" e a mesma navegação em todas as telas | n (decisão do autor) |
| Home do ano | Menu lateral com a marca e o rodapé, sem os itens de área | A home não tem competência aberta, e a decisão da `home-do-ano` é que nela a página é a navegação | n (decisão do autor) |
| Pontos de virada | Menu lateral a partir de 768 px, como hoje; coluna de ação ao lado do centro a partir de 1.280 px, abaixo dele antes disso | 1.280 px é o menor notebook comum, onde menu, centro e coluna de ação ainda cabem | n (decisão do autor) |
| Largura das outras telas | Conteúdo de Lançamentos, Todo mês e Cadastros limitado a 1.024 px, centrado à direita do menu | A razão dos 1.024 px (linha larga afasta a descrição do valor) continua valendo até a rodada de cada tela | n (decisão do autor) |
| Quantos últimos lançamentos | Até 8, só com data até hoje, desempate pela descrição | "Últimos" é o que já aconteceu; fixo com vencimento futuro não deve tomar o topo | n (decisão do autor) |
| "Próximos meses" no centro | Uma linha por mês, e não um cartão por mês | É o que o protótipo aprovado mostra; cabe ao lado de "Gastos por categoria" | n (decisão do autor) |
| "Qual é a diferença" | Continua com o texto ao lado do ícone | O protótipo mostrava só o ícone; o texto diz o que o botão faz sem depender de rótulo oculto | n (decisão do autor) |
| Celular | Barra inferior de navegação como hoje, e uma barra no topo com a marca, "Importar planilha", o tema e o nome | O menu lateral não cabe em 400 px, e o rodapé dele precisa continuar alcançável | n (decisão do autor) |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Uma moldura só, com o menu na borda ⭐ MVP — TRES-01

**User Story**: Como quem usa o app num monitor grande, quero o menu encostado na borda esquerda e o
conteúdo ocupando o resto da tela, para não ter metade do monitor vazia.

**Why P1**: É a base das outras histórias; a coluna de ação não cabe na moldura de 1.024 px.

**Acceptance Criteria**

1. WHEN uma tela autenticada é exibida em 768 px ou mais THEN o sistema SHALL exibir uma coluna
   lateral encostada na borda esquerda da janela, da altura da página, com a marca "myBilling" como
   link para a home do ano
2. The system SHALL não exibir o cabeçalho em pílula no topo de nenhuma tela autenticada
3. WHILE uma competência está aberta THE system SHALL exibir na coluna lateral a navegação "Áreas do
   myBilling" com os quatro itens de hoje e o item ativo marcado por peso, fundo e barra, como hoje
4. WHEN a home do ano é exibida THEN o sistema SHALL exibir a coluna lateral sem os itens de área
5. The system SHALL exibir no rodapé da coluna lateral o nome de quem está logado, o alternador de
   tema e o botão "Importar planilha"
6. WHEN "Importar planilha" é acionado em qualquer tela autenticada THEN o sistema SHALL abrir o
   diálogo de importação de hoje, com o nome de quem está logado e a competência esperada (IMP-08,
   ACs 2 a 10)
7. WHILE uma competência está aberta THE system SHALL exibir o seletor de competência no topo da
   área à direita da coluna lateral, acima do conteúdo da tela
8. WHILE Lançamentos, Todo mês ou Cadastros está aberto THE system SHALL limitar o conteúdo da tela a
   1.024 px de largura, centrado na área à direita da coluna lateral
9. WHEN a janela tem menos de 768 px THEN o sistema SHALL exibir a navegação na barra inferior, como
   hoje, e no topo uma barra com a marca, "Importar planilha", o alternador de tema e o nome
10. WHEN qualquer tela autenticada é exibida em 400 px de largura THEN o sistema SHALL caber sem
    rolagem horizontal da página

**Independent Test**: abrir Lançamentos em 1.920 px e ver o menu encostado na borda esquerda, sem a
pílula; acionar "Importar planilha" no rodapé do menu e ver o diálogo de importação.

---

### P1: A Visão geral em colunas ⭐ MVP — TRES-02

**User Story**: Como quem olha o mês, quero ver os números do mês no centro e as ações ao lado, para
saber se o mês fecha sem rolar e sem trocar de tela.

**Why P1**: É a tela que o dono escolheu mudar primeiro.

**Acceptance Criteria**

1. WHEN a Visão geral é exibida em 1.280 px ou mais THEN o sistema SHALL dispor o conteúdo em duas
   colunas à direita da coluna lateral: o mês no centro, sem largura máxima, e a coluna de ação à
   direita, separada do centro por uma linha fina
2. The system SHALL exibir no centro, nesta ordem: o título do mês com o alternador Planejamento e
   Movimentações e "Qual é a diferença"; os quatro cards de indicadores; e as seções "Gastos por
   categoria" e "Próximos meses", lado a lado quando houver largura para as duas
3. The system SHALL manter os quatro cards de indicadores com os rótulos, valores, links e o card de
   ênfase de hoje, nas duas visões
4. The system SHALL exibir "Próximos meses" como uma linha por mês, com o nome do mês e os pares
   "Comprometido" e "Vai sobrar" ou "Vai faltar", mantendo as regras de valor, cor e rótulo de
   SALDO-03 (ACs 2 a 7)
5. WHEN a Visão geral é exibida com menos de 1.280 px THEN o sistema SHALL exibir a coluna de ação
   abaixo do centro
6. The system SHALL não exibir o botão "Importar planilha" no conteúdo da Visão geral, só na moldura
   (TRES-01, AC 5), o que substitui IMP-08, AC 1

**Independent Test**: em 1.920 px, a Visão geral mostra os cards e as duas seções no centro e a
coluna de ação à direita, sem rolagem horizontal; em 1.024 px, a coluna de ação aparece abaixo.

---

### P1: Lançar pela Visão geral ⭐ MVP — TRES-03

**User Story**: Como quem acabou de gastar, quero lançar o gasto direto na Visão geral, para ver o
mês atualizado na mesma tela.

**Why P1**: Lançar é a tarefa mais frequente de abertura.

**Acceptance Criteria**

1. The system SHALL exibir na coluna de ação o cadastro de lançamento aberto, sem diálogo, com as
   abas "Avulso" e "Parcelado" e os mesmos campos, padrões e mensagens do cadastro de Lançamentos
2. WHEN um lançamento é gravado pela coluna de ação THEN o sistema SHALL atualizar os cards,
   "Gastos por categoria", "Próximos meses" e "Últimos lançamentos" da Visão geral sem recarga
   manual
3. WHEN um lançamento é gravado pela coluna de ação THEN o sistema SHALL manter o cadastro na tela,
   com a confirmação de hoje, pronto para o próximo
4. The system SHALL manter em Lançamentos o botão "+ Novo lançamento" e o diálogo de hoje

**Independent Test**: na Visão geral de outubro, lançar um gasto avulso de R$ 100,00 na coluna de
ação e ver "Despesas do mês" crescer R$ 100,00 e o gasto no topo de "Últimos lançamentos".

---

### P1: Buscar pela Visão geral ⭐ MVP — TRES-04

**User Story**: Como quem procura um lançamento, quero buscar direto da Visão geral, para chegar à
lista já filtrada.

**Why P1**: Achar um lançamento é uma das três tarefas de abertura.

**Acceptance Criteria**

1. The system SHALL exibir na coluna de ação um campo de busca com o rótulo acessível "Buscar
   lançamento"
2. WHEN a pessoa envia a busca com um termo THEN o sistema SHALL abrir Lançamentos da mesma
   competência com o filtro de busca preenchido com esse termo
3. WHEN a pessoa envia a busca vazia THEN o sistema SHALL abrir Lançamentos da mesma competência
   sem filtro de busca

**Independent Test**: na Visão geral de outubro, buscar "Item B" e cair em Lançamentos de outubro
com o campo de busca valendo "Item B" e só os lançamentos que casam.

---

### P1: Últimos lançamentos do mês ⭐ MVP — TRES-05

**User Story**: Como quem acabou de lançar ou quer conferir o mês, quero ver os lançamentos mais
recentes na Visão geral, para confirmar sem abrir a lista inteira.

**Why P1**: É a confirmação visível de lançar pela Visão geral e o atalho para achar um lançamento.

**Acceptance Criteria**

1. The system SHALL exibir na coluna de ação, sob o título "Últimos lançamentos", até 8
   lançamentos não cancelados da competência aberta, com data até hoje no fuso da casa, do mais
   recente para o mais antigo pela data
2. WHEN dois lançamentos têm a mesma data THEN o sistema SHALL ordená-los pela descrição, em ordem
   alfabética
3. The system SHALL exibir em cada linha a descrição, a data, a categoria com a cor dela ("Receita"
   neutra na entrada e "Sem categoria" neutra no gasto sem categoria) e o valor com o sinal e a cor
   da natureza como na lista de Lançamentos
4. WHEN a competência aberta não tem lançamento com data até hoje THEN o sistema SHALL exibir
   "Nenhum lançamento até hoje neste mês."
5. The system SHALL exibir junto do título o link "Ver todos", que abre Lançamentos da competência

**Independent Test**: em outubro, com 10 lançamentos até hoje e 1 com data futura, a lista mostra
os 8 mais recentes, nenhum com data futura, na ordem da data.

---

## Edge Cases

- Mês futuro aberto: "Últimos lançamentos" vazio, com a mensagem; o resto da Visão geral igual
- Mês sem lançamento nenhum: cards zerados, a mensagem de categorias de hoje e "Últimos lançamentos"
  vazio
- Lançamento cancelado: fora de "Últimos lançamentos"
- Busca com espaços nas pontas: Lançamentos recebe o termo como o filtro de hoje o trata
- Janela entre 768 px e 1.280 px: menu ao lado, coluna de ação abaixo do centro
- Gravação recusada pelo servidor na coluna de ação: a mensagem pt-BR aparece no cadastro, como no
  diálogo de hoje, e nada muda no centro
- Trocar de mês com o cadastro preenchido pela metade: o Next remonta a página do mês, e o que foi
  digitado se perde, como acontece hoje com o diálogo aberto de Lançamentos
- Carregamento da Visão geral: o esqueleto tem a forma da tela nova, com o centro e a coluna de
  ação (REDE-03, AC 5)

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| TRES-01 | P1: Uma moldura só, com o menu na borda | Execute | In progress: `navegacao-principal.test.tsx` prova que, sem competência válida na rota, a navegação não desenha nada, AC 4, e que com ela os quatro itens apontam para o mês e marcam o ativo, AC 3 (T2); `menu-lateral.test.tsx` prova a marca para a home, AC 1, as áreas no menu, AC 3, o menu da home sem áreas, AC 4, e o pé com o nome, o tema e o importar, AC 5; `e2e/visao-tres-colunas.spec.ts` mede o menu em x = 0 e da altura da página, sem `banner`, ACs 1 e 2, abre o importar do pé em Lançamentos e vê "Tudo entra em nome de Pessoa A", AC 6, mede o seletor acima do `h1` e à direita do menu, AC 7, Lançamentos em até 1.024 px e centrado, AC 8, as áreas na base e o topo com a marca, o importar, o tema e o nome em 400 px, AC 9, e nenhuma rolagem horizontal em cinco telas, AC 10 (T3) |
| TRES-02 | P1: A Visão geral em colunas | Execute | In progress: `e2e/visao-tres-colunas.spec.ts` prova o importar só no menu, fora do `<main>` da Visão geral, AC 6 (T3); `e2e/visao-tres-colunas.spec.ts` mede as três linhas de "Próximos meses" na mesma coluna, uma embaixo da outra, e a lista sem rolagem lateral, e `horizonte-futuro.test.tsx` e `saldo-futuro.spec.ts` seguem provando as regras de SALDO-03, AC 4 (T5) |
| TRES-03 | P1: Lançar pela Visão geral | Execute | In progress: o cadastro com as abas Avulso e Parcelado virou `CadastroDeLancamento`, que Lançamentos monta no diálogo; `lancamento-avulso.spec.ts` e `compra-parcelada.spec.ts` passam sem mudar o que afirmam, AC 4 (T4) |
| TRES-04 | P1: Buscar pela Visão geral | Design | Pending |
| TRES-05 | P1: Últimos lançamentos do mês | Execute | In progress: `ultimos-lancamentos.test.ts` prova o cancelado e o de data futura fora, o de hoje dentro, a ordem pela data e o corte em 8, AC 1, o empate pela descrição em ordem pt-BR, AC 2, e a lista vazia do mês futuro (T1); `valor-da-natureza.test.tsx` prova o sinal, a cor e o rótulo para leitor de tela de cada natureza, a peça que a lista e os últimos lançamentos usam, AC 3 (T4) |

---

## Success Criteria

- [ ] Em 1.920 px, a Visão geral mostra menu, mês e coluna de ação sem vazio dos lados
- [ ] Lançar, ver se o mês fecha e achar um lançamento acontecem sem sair da Visão geral
- [ ] Toda tela autenticada cabe em 400 px sem rolagem horizontal
- [ ] Nenhuma mudança de banco: a fatia publica só com `git push`
