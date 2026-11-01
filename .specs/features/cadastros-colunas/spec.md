# Cadastros em abas, com o item aberto à direita: Specification

> Pedido do dono em 2026-10-30, na rodada de aproveitamento de tela inspirada na Coinbase, depois
> da Visão geral em três colunas (AD-019), de Lançamentos em lista densa (AD-020) e de Todo mês em
> linhas (AD-021). Ele escolheu a opção "A · Abas, linhas e detalhe numa coluna à direita" do canvas
> https://claude.ai/artifact/HwQMsbK2Myk8DVXqRmNrFx (privado, só do dono) e respondeu quatro
> perguntas no mesmo dia:
> - a estrutura é a opção A;
> - o escopo é o layout de Categorias, uma aba nova de Meios de pagamento que lista e cria, e a
>   edição do meio (renomear e corrigir os dias de fechamento e vencimento);
> - arquivar fica para a próxima fatia, e, quando existir, pode arquivar um meio que fixos ativos
>   usam, e os fixos continuam usando-o;
> - a linha mostra o uso no mês aberto: quantos fixos e quantos lançamentos do mês usam cada
>   categoria e cada meio.

## Problem Statement

"Cadastros" hoje é só a tela de Categorias (`cadastros/categorias/page.tsx:28-54`), e ela aproveita
mal o monitor grande:
- **Cartões altos:** cada categoria é um cartão com as onze opções de cor sempre abertas e um botão
  "Renomear" (`lista-de-categorias.tsx:197-299`). Com dez categorias, a lista passa da altura da
  tela.
- **Nada sobre o uso:** a tela não diz quais categorias o mês usa, nem quanto. Antes de mexer numa
  categoria, a pessoa não sabe onde ela aparece.
- **Meio de pagamento sem casa:** meio só se cria dentro de outro formulário (`CadastroInline`), não
  há lista de meios, e um nome ou um dia de fechamento digitado errado não tem conserto pela
  interface. A única action de meio é a de criar (`meios-de-pagamento.ts:33`).
- **Largura:** dentro da `AreaEstreita` de 1.024 px, a metade direita do monitor fica vazia.

## Goals

- [ ] Ver todas as categorias e todos os meios de pagamento numa tela, com o uso de cada um no mês
      aberto
- [ ] Trocar a cor, renomear e criar ao lado da lista, sem diálogo e sem perder a lista de vista
- [ ] Corrigir o nome de um meio e os dias de um cartão pela interface
- [ ] A contagem de lançamentos de cada categoria e de cada meio bate com o que Lançamentos mostra
      com o filtro dela, em qualquer mês

## Out of Scope

| Feature | Reason |
| --- | --- |
| Arquivar e reativar categoria e meio | Próxima fatia, por decisão do dono. O botão "Arquivar" e os blocos "Arquivadas" e "Arquivados" do protótipo ficam de fora. A regra para quando existir fica no roadmap (CADCOL-12, AC 2) |
| Mudar o tipo de um meio | O tipo não muda; para trocar, cadastra-se outro meio (decisão do autor, abaixo) |
| Mover compras pelos dias do cartão | Os dias não movem nada até a fatia de Faturas: `resolverCicloFatura` não tem chamador e a compra entra na competência do formulário (`form-compra.tsx:156`) |
| Mudar as regras de criar categoria e meio | Mesmas actions, mesmas validações e mesmas mensagens (COR-01, IMP-04, CART-02); só a revalidação cresce |
| Orçamento por categoria e pessoa como cadastro | Fatia 1 do roadmap, e pessoa não foi pedida |
| Todo mês e Lançamentos | Rodadas próprias (AD-021, AD-020) |
| Mudança de banco | Nenhuma coluna nova: nome e dias já existem, e as contagens saem do que a página já lê |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Estrutura | A opção A: "Cadastros" com duas abas, Categorias e Meios de pagamento; cada aba uma tabela de linhas baixas, sem botão de ação; clicar numa linha abre o item numa coluna à direita; "+ Nova categoria" e "+ Novo meio" abrem na mesma coluna | Escolha do dono sobre o protótipo, em 2026-10-30 | y |
| Escopo | O layout de Categorias (linhas e coluna); a aba Meios de pagamento, que lista e cria; a edição do meio: renomear e corrigir os dias de fechamento e vencimento | Resposta do dono em 2026-10-30 | y |
| Arquivar | Fora desta fatia. Quando existir, arquivar um meio que fixos ativos usam é permitido, e os fixos continuam usando-o; a regra vai para a linha do roadmap, sem código | Resposta do dono em 2026-10-30, no mesmo sentido da decisão de 2026-10-29 sobre a edição de fixo (`docs/roadmap.md:95-99`) | y |
| Conteúdo da linha | O uso no mês aberto: quantos fixos e quantos lançamentos do mês usam cada categoria e cada meio | Resposta do dono em 2026-10-30 | y |
| O que "Fixos" conta | Os fixos, de qualquer natureza, cujo período contém o mês aberto: começaram nele ou antes, e não têm fim ou terminam nele ou depois. O que começa depois e o que terminou antes ficam de fora | É o critério que decide se o mês tem ocorrência do fixo (`janelaMaterializacao`). Todo mês mostra também o fixo que começa depois (FIXO-07, AC 3), mas a pergunta aqui é de uso no mês, e ele não usa nada ainda | n (decisão do autor) |
| O que "Lançamentos" conta | Os lançamentos não cancelados da competência aberta com aquela categoria (ou aquele meio), de qualquer natureza e origem, inclusive a ocorrência de cada fixo: as mesmas linhas que Lançamentos mostra com o filtro dela | A contagem vira promessa verificável: "Ver em Lançamentos" abre a lista com esse número. Por isso o fixo do mês conta nas duas colunas, como plano em "Fixos" e como linha em "Lançamentos" | n (decisão do autor) |
| Materializar antes de contar | Sim, com a mesma chamada e a mesma janela de Lançamentos (`lancamentos/page.tsx:123-129`) | Sem isso, abrir Cadastros primeiro num mês nunca aberto contaria zero para a ocorrência de cada fixo, e Lançamentos mostraria mais linhas um clique depois (L-001). O GET que escreve já é decisão registrada, e Lançamentos, Todo mês e a Visão geral fazem o mesmo | n (decisão do autor) |
| Rótulo das contagens | "Fixos em <Mês>" e "Lançamentos em <Mês>" no cabeçalho da tabela; "Fixos em <Mês de Ano>" e "Lançamentos em <Mês de Ano>" no painel | O protótipo dizia só "Fixos"; com o mês nos dois rótulos, os dois números falam do mesmo recorte | n (decisão do autor) |
| Duas abas, duas rotas | `/<competencia>/cadastros/categorias`, a de hoje, e `/<competencia>/cadastros/meios-de-pagamento`; o item "Cadastros" da navegação continua abrindo Categorias | Link salvo continua valendo; cada aba lê só o que mostra; o item já acende em toda rota sob `cadastros` (`navegacao-principal.tsx:82-85`) | n (decisão do autor; proposta do protótipo) |
| Título | `h1` "Cadastros", com as abas logo abaixo e "+ Nova categoria" ou "+ Novo meio" ao lado do título | As duas abas são da mesma área; a aba ativa diz qual cadastro está aberto | n (decisão do autor) |
| Abas sem contagem | "Categorias" e "Meios de pagamento", sem o "10" e o "5" do protótipo | A tabela já mostra todos; contar a outra aba pediria ler o outro cadastro em toda página | n (decisão do autor) |
| Onde a coluna começa e as larguras | A partir de 1.536 px; coluna de 384 px, presa; título, abas e tabela com até 1.100 px, centrados entre o menu e a coluna. Abaixo de 1.536 px, uma coluna só de até 1.024 px, com o painel entre as abas e a tabela enquanto algo está aberto | O mesmo padrão de Todo mês (AD-021) e de Lançamentos (AD-020): o dono vê a mesma virada nas três telas | n (decisão do autor) |
| Coluna sem item aberto | "Nenhuma categoria aberta" ou "Nenhum meio aberto", com uma dica | Como Todo mês; sem "Arquivar", a dica do protótipo perde essa palavra | n (decisão do autor) |
| Linha inteira clicável | Um clique em qualquer ponto da linha abre o item; o botão do nome é o alvo do teclado | Como Todo mês | n (decisão do autor) |
| Estado na URL | A categoria aberta vai para `?categoria=<id>` e o meio para `?meio=<id>`, por `router.replace(…, { scroll: false })`, sem entrada nova no histórico (era `history.replaceState`; revisto na T14, como em Todo mês: L-058). O formulário de criação não vai para a URL; depois de criar, o item criado vai | Como Todo mês: recarregar ou mandar o link abre o mesmo item | n (decisão do autor) |
| Teclado | Abrir leva o foco ao título do painel; `Escape` dentro do painel, "Fechar" e "Cancelar" fecham e devolvem o foco ao botão da linha ou ao "+ Nova categoria" e "+ Novo meio" | Como Todo mês: o painel vem antes da tabela no DOM | n (decisão do autor) |
| Fechar ou trocar com algo digitado | Descarta o que foi digitado | Como Todo mês e como fechar o diálogo de edição de fixo (EDF-01, AC 3) | n (decisão do autor) |
| Renomear categoria | O campo "Nome" fica sempre aberto no painel, com "Salvar"; sem botão "Renomear" e sem "Cancelar" | É o protótipo; fechar o painel já descarta o que foi digitado. Revê a abertura do campo de COR-04, AC 6; o resto do AC continua | n (decisão do autor) |
| Opções de cor | As onze de hoje, só no painel da categoria aberta, com os rótulos de hoje ("Automática (Azul)") e gravando ao escolher | É o controle já provado de COR-04; o protótipo dizia "Automática · Azul, tirada do nome" | n (decisão do autor) |
| Texto da cor na linha | O nome da cor escolhida, como "Laranja", ou "Automática (<cor>)", o mesmo rótulo da opção | Uma redação só para a mesma coisa; o protótipo dizia "Automática · X" | n (decisão do autor) |
| Otimista | A pill do painel e a opção marcada mudam na hora; a pill da linha muda quando a gravação termina | O otimista mora no painel, como hoje no cartão (`lista-de-categorias.tsx:115-118`); a lista nova chega na mesma resposta da action | n (decisão do autor) |
| Nova categoria | Nasce na cor automática; depois de criada, o painel abre nela. Nome de uma ativa abre a existente e avisa "Essa categoria já existia."; nome de uma arquivada a reativa, abre e avisa "Categoria reativada." | `criarCategoria` já reaproveita e reativa (`categorias.ts:80-87`); o painel só diz o que aconteceu | n (decisão do autor; proposta do protótipo) |
| Novo meio | Os mesmos campos, regras e mensagens do cadastro inline de hoje; depois de criado, o painel abre nele | Um cadastro de meio só no app; abrir no criado confirma o que foi gravado | n (decisão do autor) |
| Tipo no formulário de criação | O seletor de hoje, com Cartão de crédito, Conta corrente e Rótulo, começando em Cartão de crédito | O protótipo mostrava três cartões; o seletor mantém um controle só para criar meio no app. Rótulo continua oferecido, como hoje | n (decisão do autor) |
| Tipo imutável | O painel mostra o tipo em texto, com "O tipo não muda. Para trocar, cadastre outro meio." | Trocar conta por cartão mudaria `gera_fatura` e reclassificaria lançamentos já feitos entre os blocos de Lançamentos (`idsDeMeiosComFatura`, BLOCO-01, AC 6) | n (decisão do autor; proposta do protótipo) |
| Nome do meio | Único entre os meios ativos, sem distinguir caixa, como na criação; mudar só a caixa grava; o nome de um meio arquivado é permitido | É a regra de hoje da criação (`buscarMeioDePagamentoAtivoPorNome`, `cadastro.repository.ts:75-94`); o banco não tem `UNIQUE` em `meio_pagamento.nome` | n (decisão do autor) |
| Nada mudou | Salvar com o nome e os dias iguais aos gravados, depois de normalizar espaços do nome, não grava e não avisa | A regra do nome igual de COR-04, aplicada ao meio | n (decisão do autor) |
| Nota dos dias | "Mudar os dias não move nenhuma compra: cada uma fica no mês em que foi lançada." | É o que o código faz: a compra entra na competência do formulário e `resolverCicloFatura` não tem chamador. Até a fatia de Faturas, os dias só mudam a descrição do cartão (`descreverMeio`, `formatar.ts:89-98`) | n (decisão do autor) |
| Meio arquivado na edição | Recusado como inexistente: "Esse meio de pagamento não existe mais." | Precedente de `trocarCategoria` (`trocar-categoria/handler.ts:68-71`); a aba lista só ativos e arquivar não tem tela | n (decisão do autor) |
| Revalidação | Criar e editar meio revalidam o layout raiz; criar categoria passa a revalidar as quatro telas da categoria, como trocar a cor e renomear | O meio aparece no diálogo de importação, que mora no layout de `(app)` (`layout.tsx:40-62`), e em quatro telas de mês. Hoje criar meio e criar categoria revalidam só Lançamentos | n (decisão do autor) |
| "Ver em Lançamentos" | Link para Lançamentos do mês aberto com o filtro da categoria (`?categoriaId=`) ou do meio (`?meioPagamentoId=`) | É o "Ver em Lançamentos" do protótipo, e prova a contagem | n (decisão do autor) |
| Parágrafo de explicação de hoje | Sai | Como em Todo mês; a coluna vazia e o rótulo "Automática (<cor>)" dizem o que importa | n (decisão do autor) |
| Ordem dos meios | Alfabética pt-BR, sem distinguir caixa nem acento, como as categorias | O banco ordena pela collation dele (`cadastro.repository.ts:61`), que põe "conta Azul" depois de "Rótulo Âmbar" | n (decisão do autor) |
| Celular | De 400 a 767 px, sem cabeçalho de tabela: a pill ou o nome sozinhos na primeira linha de texto e, embaixo, o resto, com o nome de cada contagem escrito ("1 fixo", "2 lançamentos"), quebrando em mais linhas quando não cabe; o painel acima da tabela, na largura toda | Como Todo mês; uma tabela de quatro ou seis colunas não cabe em 400 px. Era "duas linhas de texto", mas em 400 px o tipo, os dois dias e as duas contagens do cartão de crédito não cabem numa linha (sonda E da rodada 1). O dono escolheu "Aceitar a quebra" em 2026-10-31 | y |
| Rolagem lateral | Nenhuma, em largura nenhuma a partir de 400 px, nas duas abas, com nada aberto, com um item aberto e com o formulário de criação, na página e no painel. A palavra mais larga que a coluna quebra no meio, e a cor da categoria quebra entre 768 e 1.023 px | O dono escolheu "Nunca rolar de lado" em 2026-10-31, depois da rodada 1 do Verifier: em 768 px, "Automática (Verde-água)" fazia a página rolar 10 px, e um nome de uma palavra só a fazia rolar em 400, 768 e 1.024 px. O AC valia só em 400 px com um item aberto | y |
| A tela ao salvar | Fica parada: ao salvar a cor ou o nome da categoria, ou o nome e os dias do meio, a página e a coluna do painel ficam na rolagem em que estavam, e o controle acionado continua à vista. Criar não entra: o painel abre no item criado e leva o foco ao título, por desenho (CADCOL-10, AC 2) | O dono escolheu "Sim, como em Todo mês" em 2026-10-31, depois da rodada 1 do Verifier: uma rolagem até o alto depois de salvar (E15) passava com a suíte verde, e nenhum AC dizia onde a tela fica | y |
| Lista vazia | "Nenhuma categoria ainda. Crie a primeira pelo “+ Nova categoria”." e "Nenhum meio de pagamento ainda. Cadastre o primeiro pelo “+ Novo meio”." | O texto de hoje mandava para o formulário de lançamento, e agora o atalho está na própria tela | n (decisão do autor) |
| Densidade | Com ponteiro fino a partir de 768 px, só o botão da linha baixa para 36 px. Abas, "+ Nova…", "Fechar", os botões dos formulários, "Ver em Lançamentos" e as opções de cor ficam com 44 px em qualquer ponteiro | A linha cabe em 48 px sem baixar o resto; no toque, TOQUE-01 vale (L-044, candidata) | n (decisão do autor) |
| Componente da coluna | `ColunaDeCadastro`, compartilhada pelas duas abas desta fatia, sem depender de Todo mês | Todo mês desenha a grade dentro de `TodoMes`; extrair uma peça comum às três telas fica para quando as três estiverem no `main` | n (decisão do autor) |

**Open questions:** none - all resolved or logged above.

### Dimensões implícitas

| Dimensão | Como fica |
| --- | --- |
| Validação e limites | Nome de categoria até 60 caracteres e de meio até 40, normalizados (`nome.ts`); dias de 1 a 31; as mesmas regras no navegador e no servidor (CADCOL-05, AC 5; CADCOL-07, AC 10). `?categoria=` e `?meio=` que não são da lista são ignorados (CADCOL-11, AC 3) |
| Falha e falha parcial | Recusa da action aparece no painel, em alerta; o painel continua no mesmo modo. Falha do banco vira `ERRO_INESPERADO` com referência, sem gravar (UI-02, AC 8). A edição do meio grava nome e dias num `UPDATE` só |
| Idempotência e duplicata | A materialização ao abrir a tela é idempotente pela restrição única (FIXO-02). Criar categoria com nome existente reaproveita; criar meio com nome ativo é recusado |
| Autorização e limite de taxa | Toda action com `requireSession()` na primeira instrução e Zod no servidor. Limite de taxa: N/A, app privado de duas pessoas (AD-007) |
| Concorrência e ordem | A última gravação vale. Dois renomes simultâneos para o mesmo nome de meio podem passar, porque o banco não tem `UNIQUE`; aceito, como já é na criação (AD-007) |
| Ciclo de vida do dado | Só categorias e meios ativos aparecem; o arquivado é recusado na edição do meio (CADCOL-07, AC 12) |
| Observabilidade | A referência de correlação no log do servidor, como nas actions de hoje |
| Falha de dependência externa | N/A: nenhum serviço externo |
| Integridade de estado | Painel: vazio, criar, item aberto; trocar de item ou abrir o "+ Nova…" descarta o que foi digitado (CADCOL-04, AC 14); item que deixa a lista fecha o painel (Edge Cases) |

---

## User Stories

### P1: Duas abas em Cadastros ⭐ MVP — CADCOL-01

**User Story**: Como quem cuida dos cadastros da casa, quero categorias e meios de pagamento na
mesma área, em abas, para achar os dois no mesmo lugar.

**Why P1**: É a estrutura da opção A, e é onde o meio de pagamento ganha casa.

**Acceptance Criteria**

1. The system SHALL mostrar em Cadastros o título "Cadastros" e, abaixo dele, a navegação "Cadastros"
   com os links "Categorias" e "Meios de pagamento"
2. The system SHALL levar "Categorias" a `/<competencia>/cadastros/categorias` e "Meios de pagamento" a
   `/<competencia>/cadastros/meios-de-pagamento`, na competência aberta
3. The system SHALL marcar com `aria-current="page"` o link da aba aberta, e só ele
4. WHEN o item "Cadastros" da navegação principal é acionado THEN o sistema SHALL abrir a aba Categorias
   (COR-04, AC 1)
5. WHILE qualquer aba de Cadastros está aberta THE system SHALL manter ativo o item "Cadastros" da
   navegação principal
6. The system SHALL mostrar ao lado do título "+ Nova categoria" na aba Categorias e "+ Novo meio" na
   aba Meios de pagamento, em todas as larguras

**Independent Test**: abrir Cadastros pela navegação, ver "Categorias" marcada, clicar em "Meios de
pagamento" e ver a tabela de meios no mesmo mês, com "Cadastros" ainda ativo.

---

### P1: Uma linha por categoria ⭐ MVP — CADCOL-02

**User Story**: Como quem cuida das categorias, quero cada uma numa linha baixa, com a cor e o uso
no mês, para ver todas de uma vez.

**Why P1**: É a troca dos cartões altos pela lista, o centro do pedido.

**Acceptance Criteria**

1. The system SHALL mostrar as categorias disponíveis numa tabela "Categorias" com as colunas
   Categoria, Cor, "Fixos em <Mês>" e "Lançamentos em <Mês>"
2. The system SHALL ordenar as linhas pelo nome, em ordem alfabética do português, sem distinguir
   caixa nem acento (COR-04, AC 2)
3. The system SHALL mostrar na coluna Categoria a pill com o nome, na cor em uso (COR-04, AC 2)
4. The system SHALL mostrar na coluna Cor o nome da cor escolhida, como "Laranja", ou "Automática
   (<cor>)" quando não há escolha, com a cor que o nome dá
5. The system SHALL mostrar nas duas últimas colunas as contagens de CADCOL-03, com "0" quando não há
   uso
6. The system SHALL não mostrar na linha nenhum botão além do que abre a categoria
7. WHEN a tabela é exibida a partir de 1.280 px com ponteiro fino THEN o sistema SHALL desenhar cada
   linha com no máximo 48 px de altura
8. WHEN a janela tem de 400 a 767 px THEN o sistema SHALL mostrar cada categoria sem cabeçalho de
   tabela, com a pill sozinha na primeira linha de texto e, abaixo dela, a cor e as contagens com o
   nome escrito ("1 fixo", "2 lançamentos"), que quebram em mais linhas quando não cabem (decisão do
   dono em 2026-10-31)
9. IF não há categoria nenhuma THEN o sistema SHALL mostrar, no lugar da tabela, "Nenhuma categoria
   ainda. Crie a primeira pelo “+ Nova categoria”."

**Independent Test**: em março, "Categoria Um", com um fixo e um gasto do mês, mostra "Automática
(Ciano)", "1" e "2"; "Categoria Dois", sem uso, mostra "0" e "0".

---

### P1: O uso no mês aberto ⭐ MVP — CADCOL-03

**User Story**: Como quem vai mexer numa categoria ou num meio, quero ver quanto o mês aberto os
usa, para saber o que a mudança alcança.

**Why P1**: É a quarta resposta do dono: a linha mostra o uso no mês.

**Acceptance Criteria**

1. The system SHALL contar em "Fixos" os fixos da categoria (ou do meio), de qualquer natureza, cujo
   período contém o mês aberto: começo no mês aberto ou antes, e sem fim ou com fim no mês aberto ou
   depois
2. The system SHALL não contar em "Fixos" o fixo que começa depois do mês aberto nem o que termina
   antes dele
3. The system SHALL contar em "Lançamentos" os lançamentos não cancelados da competência aberta com
   aquela categoria (ou aquele meio), de qualquer natureza e origem, inclusive a ocorrência de cada
   fixo
4. The system SHALL dar em "Lançamentos" de cada categoria e de cada meio o mesmo número de
   lançamentos que Lançamentos mostra no mês aberto com o filtro dela ou dele
5. WHEN Cadastros é aberta numa competência cujas ocorrências de fixo ainda não existem THEN o sistema
   SHALL criá-las antes de contar, com a mesma materialização e a mesma janela de Lançamentos
6. The system SHALL contar o fixo e o lançamento sem categoria só para o meio deles, e para categoria
   nenhuma

**Independent Test**: num março nunca aberto, com "Fixo A" de "Categoria Um" vigente desde janeiro e
sem ocorrência gravada, abrir Cadastros primeiro e ver "Lançamentos em Março" contando a ocorrência
de "Fixo A"; depois, "Ver em Lançamentos" mostra o mesmo número.

---

### P1: A categoria aberta na coluna ⭐ MVP — CADCOL-04

**User Story**: Como quem cuida de uma categoria, quero abri-la ao lado da lista e trocar a cor e o
nome ali, vendo onde ela aparece.

**Why P1**: É a coluna da direita da opção A para Categorias.

**Acceptance Criteria**

1. WHEN a pessoa clica em qualquer ponto da linha de uma categoria, ou aciona o botão dela, THEN o
   sistema SHALL abrir essa categoria no painel, com a pill dela, na cor em uso, como título
2. The system SHALL mostrar no painel o formulário "Renomear <nome>" com o campo "Nome", preenchido
   com o nome gravado, e o botão "Salvar"
3. The system SHALL mostrar no painel o grupo "Cor de <nome>" com as dez cores e "Automática (<cor do
   nome>)", cada opção com o nome escrito sobre a pill tingida e a cor em uso marcada (COR-04, AC 3)
4. WHEN a pessoa escolhe uma cor THEN o sistema SHALL gravá-la sem outro clique, marcar a opção e
   pintar a pill do painel antes da resposta, e avisar "Cor trocada." (COR-04, ACs 4 e 5)
5. WHEN a gravação da cor termina THEN o sistema SHALL pintar a pill da linha da categoria com a cor
   nova
6. WHEN a pessoa salva um nome novo THEN o sistema SHALL gravá-lo com a cor em uso, avisar "Categoria
   renomeada." e manter o painel aberto na categoria, com a linha no lugar novo da ordem (COR-04, AC 6)
7. IF o nome novo pertence a outra categoria, ativa ou arquivada, em qualquer caixa, THEN o sistema
   SHALL recusar com "Já existe outra categoria com esse nome." junto do campo, sem mudar nada
   (COR-04, AC 7)
8. IF a gravação da cor ou do nome falha THEN o sistema SHALL voltar a cor ou o nome anterior e dizer o
   motivo no painel, sem aviso (COR-04, AC 8)
9. WHEN o nome salvo é igual ao gravado depois de normalizar espaços THEN o sistema SHALL não gravar e
   não avisar
10. WHEN o nome salvo difere do gravado só na caixa THEN o sistema SHALL gravá-lo e avisar "Categoria
    renomeada."
11. The system SHALL mostrar no painel a seção "Onde ela aparece", com "Fixos em <Mês de Ano>" e
    "Lançamentos em <Mês de Ano>" com as contagens da linha, e o link "Ver em Lançamentos"
12. WHEN "Ver em Lançamentos" é acionado THEN o sistema SHALL abrir Lançamentos do mês aberto filtrado
    por essa categoria
13. The system SHALL marcar a linha da categoria aberta com fundo diferente das outras e com
    `aria-expanded="true"` no botão dela, e todas as outras com `aria-expanded="false"`
14. WHEN outra categoria é aberta, ou "+ Nova categoria" é acionado, com o painel ocupado THEN o sistema
    SHALL mostrar o novo conteúdo, descartando o que estava digitado
15. WHEN "Fechar" é acionado THEN o sistema SHALL fechar o painel e desmarcar a linha
16. WHEN a pessoa salva a cor ou o nome THEN o sistema SHALL manter a página e a coluna do painel na
    rolagem em que estavam, com o controle acionado inteiro à vista (decisão do dono em 2026-10-31)

**Independent Test**: abrir "Categoria Um", escolher "Verde", ver a pill do painel e a da linha
verdes, renomear para "Categoria Dez" e ver o painel continuar aberto, com a pill verde.

---

### P1: Nova categoria na coluna ⭐ MVP — CADCOL-05

**User Story**: Como quem precisa de uma categoria nova, quero criá-la na tela de categorias, para
não depender de um formulário de lançamento.

**Why P1**: É o "+ Nova categoria" da opção A.

**Acceptance Criteria**

1. WHEN "+ Nova categoria" é acionado THEN o sistema SHALL abrir no painel, sem diálogo, o formulário
   "Nova categoria" com o campo "Nome", a nota "Começa na cor automática, tirada do nome. Depois de
   criar, ela abre aqui para você trocar a cor.", "Criar categoria" e "Cancelar"
2. WHEN a categoria é criada THEN o sistema SHALL mostrá-la na tabela, abri-la no painel e avisar
   "Categoria criada."
3. WHEN o nome é o de uma categoria ativa, em qualquer caixa, THEN o sistema SHALL abrir a existente no
   painel, sem criar outra, e avisar "Essa categoria já existia."
4. WHEN o nome é o de uma categoria arquivada THEN o sistema SHALL reativá-la, abri-la no painel e
   avisar "Categoria reativada."
5. IF o nome está vazio ou passa de 60 caracteres THEN o sistema SHALL recusar no navegador, sem chamar
   o servidor, com "Informe o nome da categoria." ou "O nome pode ter no máximo 60 caracteres." junto
   do campo
6. WHEN "Cancelar" é acionado THEN o sistema SHALL fechar o painel sem criar nada

**Independent Test**: criar "Categoria Nova" pelo painel e vê-la aberta, com "Automática (<cor>)"
marcada e a linha na tabela.

---

### P1: Uma linha por meio de pagamento ⭐ MVP — CADCOL-06

**User Story**: Como quem paga com cartões e contas diferentes, quero ver todos os meios numa
lista, com o tipo, os dias do cartão e o uso no mês.

**Why P1**: Hoje não existe lista de meios.

**Acceptance Criteria**

1. The system SHALL mostrar os meios de pagamento disponíveis numa tabela "Meios de pagamento" com as
   colunas "Meio de pagamento", Tipo, Fecha, Vence, "Fixos em <Mês>" e "Lançamentos em <Mês>"
2. The system SHALL ordenar as linhas pelo nome, em ordem alfabética do português, sem distinguir
   caixa nem acento
3. The system SHALL mostrar em Tipo "Cartão de crédito", "Conta corrente" ou "Rótulo"
4. The system SHALL mostrar em Fecha e em Vence "dia N" no cartão de crédito, e "—" na conta e no
   rótulo
5. The system SHALL mostrar nas duas últimas colunas as contagens de CADCOL-03, com "0" quando não há
   uso
6. The system SHALL não mostrar na linha nenhum botão além do que abre o meio
7. WHEN a tabela é exibida a partir de 1.280 px com ponteiro fino THEN o sistema SHALL desenhar cada
   linha com no máximo 48 px de altura
8. WHEN a janela tem de 400 a 767 px THEN o sistema SHALL mostrar cada meio sem cabeçalho de
   tabela, com o nome sozinho na primeira linha de texto e, abaixo dele, o tipo, os dias e as
   contagens com o nome escrito, que quebram em mais linhas quando não cabem (decisão do dono em
   2026-10-31)
9. IF não há meio nenhum THEN o sistema SHALL mostrar, no lugar da tabela, "Nenhum meio de pagamento
   ainda. Cadastre o primeiro pelo “+ Novo meio”."

**Independent Test**: em março, "Cartão Roxo" mostra "Cartão de crédito", "dia 25" e "dia 5"; "Conta
Corrente" mostra "Conta corrente", "—" e "—".

---

### P1: O meio aberto: renomear e corrigir os dias ⭐ MVP — CADCOL-07

**User Story**: Como quem digitou o nome ou o dia de fechamento errado, quero corrigir pela
interface, sem recriar o meio.

**Why P1**: É a terceira parte do escopo que o dono pediu.

**Acceptance Criteria**

1. WHEN a pessoa clica em qualquer ponto da linha de um meio, ou aciona o botão dele, THEN o sistema
   SHALL abrir o meio no painel, com o nome como título e, abaixo, "Cartão de crédito · fecha dia N ·
   vence dia M", "Conta corrente" ou "Rótulo"
2. The system SHALL mostrar no painel o formulário "Editar <nome>" com o campo "Nome", o tipo em texto
   com "O tipo não muda. Para trocar, cadastre outro meio." e o botão "Salvar alterações"
3. WHERE o meio é cartão de crédito the system SHALL mostrar no formulário "Dia de fechamento" e "Dia
   de vencimento", preenchidos com os gravados, e a nota "Mudar os dias não move nenhuma compra: cada
   uma fica no mês em que foi lançada."
4. The system SHALL não oferecer no painel controle nenhum para mudar o tipo do meio, nem campo de dia
   na conta e no rótulo
5. WHEN a pessoa salva um nome ou dias novos THEN o sistema SHALL gravá-los, avisar "Meio de pagamento
   salvo." e mostrar o nome e os dias novos na linha e no painel
6. IF o nome novo é o de outro meio ativo, em qualquer caixa, THEN o sistema SHALL recusar com "Já
   existe outro meio de pagamento com esse nome." junto do campo, sem gravar nada
7. WHEN o nome novo é o de um meio arquivado THEN o sistema SHALL gravá-lo
8. WHEN o nome novo difere do gravado só na caixa THEN o sistema SHALL gravá-lo
9. WHEN o nome e os dias são iguais aos gravados, depois de normalizar espaços do nome, THEN o sistema
   SHALL não gravar e não avisar
10. IF o nome está vazio ou passa de 40 caracteres, ou um dia está fora de 1 a 31, THEN o sistema SHALL
    recusar com a mensagem do cadastro de meio de hoje junto do campo, no navegador e no servidor
11. IF o pedido traz dias para um meio que não é cartão, ou um cartão sem os dois dias, THEN o sistema
    SHALL recusar com "Dia de fechamento e de vencimento existem só no cartão de crédito, e nele são
    obrigatórios.", sem gravar
12. IF o meio não existe mais ou está arquivado THEN o sistema SHALL recusar com "Esse meio de
    pagamento não existe mais." no painel, sem gravar
13. The system SHALL mostrar no painel a seção "Onde ele aparece", com "Fixos em <Mês de Ano>",
    "Lançamentos em <Mês de Ano>" e o link "Ver em Lançamentos", que abre Lançamentos do mês aberto
    filtrado por esse meio
14. WHEN o nome ou os dias mudam THEN o sistema SHALL mostrar a mudança na Visão geral, em Lançamentos,
    em Todo mês e no diálogo de importação na próxima visita, sem recarregar à força
15. The system SHALL aplicar ao meio aberto a marcação da linha, a troca de item e o "Fechar" de
    CADCOL-04, ACs 13 a 15
16. WHEN a pessoa salva o nome ou os dias THEN o sistema SHALL manter a página e a coluna do painel na
    rolagem em que estavam, com "Salvar alterações" inteiro à vista (decisão do dono em 2026-10-31)

**Independent Test**: abrir "Cartão Roxo", trocar os dias para 10 e 17, salvar e ver "dia 10" e "dia
17" na linha; tentar renomear para "conta corrente" e ver a recusa junto do campo.

---

### P1: Novo meio na coluna ⭐ MVP — CADCOL-08

**User Story**: Como quem tem um cartão novo, quero cadastrá-lo na lista de meios, para não precisar
abrir um lançamento.

**Why P1**: É o "+ Novo meio" da opção A.

**Acceptance Criteria**

1. WHEN "+ Novo meio" é acionado THEN o sistema SHALL abrir no painel, sem diálogo, o formulário "Novo
   meio de pagamento" com "Nome", "Tipo" (Cartão de crédito, Conta corrente e Rótulo, começando em
   Cartão de crédito), "Criar meio" e "Cancelar"
2. WHILE o tipo escolhido é Cartão de crédito THE system SHALL mostrar "Dia de fechamento" e "Dia de
   vencimento" no formulário, e só então
3. The system SHALL aplicar ao formulário as regras, os textos de ajuda e as mensagens do cadastro de
   meio de hoje: nome de 1 a 40 caracteres, dias de 1 a 31, só no cartão
4. WHEN o meio é criado THEN o sistema SHALL mostrá-lo na tabela, abri-lo no painel e avisar "Meio de
   pagamento criado."
5. IF o nome é o de um meio ativo, em qualquer caixa, THEN o sistema SHALL recusar com "Já existe um
   meio de pagamento com esse nome." junto do campo, sem criar
6. WHEN "Cancelar" é acionado THEN o sistema SHALL fechar o painel sem criar nada

**Independent Test**: criar "Cartão Novo", cartão de crédito com fechamento 3 e vencimento 10, e vê-lo
aberto no painel e na tabela.

---

### P1: A coluna da direita a partir de 1.536 px ⭐ MVP — CADCOL-09

**User Story**: Como quem usa o monitor grande, quero a lista e o item aberto lado a lado, para não
perder um de vista ao mexer no outro.

**Why P1**: É o aproveitamento de tela que motiva a rodada.

**Acceptance Criteria**

1. WHEN uma aba de Cadastros é exibida a partir de 1.536 px THEN o sistema SHALL mostrar o painel numa
   coluna de 384 px à direita da tabela, separada dela por uma linha fina
2. WHILE a página rola a partir de 1.536 px THE system SHALL manter o título do painel à vista
3. WHILE nada está aberto a partir de 1.536 px THE system SHALL mostrar na coluna "Nenhuma categoria
   aberta" e "Escolha uma categoria na lista para trocar a cor, renomear e ver onde ela aparece.", ou
   "Nenhum meio aberto" e "Escolha um meio na lista para renomear, corrigir os dias do cartão e ver
   onde ele aparece."
4. WHEN uma aba é exibida a partir de 1.536 px THEN o sistema SHALL limitar o título, as abas e a
   tabela a 1.100 px de largura, centrados no espaço entre o menu e a coluna
5. WHEN uma aba é exibida com menos de 1.536 px THEN o sistema SHALL mostrar a tela numa coluna só, de
   até 1.024 px, centrada, com o painel entre as abas e a tabela enquanto algo está aberto
6. WHILE nada está aberto com menos de 1.536 px THE system SHALL não mostrar o painel
7. WHEN uma aba é exibida em qualquer largura a partir de 400 px, com nada aberto, com um item aberto
   ou com o formulário de criação aberto, THEN o sistema SHALL caber sem rolagem lateral, na página e
   no painel (TRES-01, AC 10; decisão do dono em 2026-10-31)

**Independent Test**: em 1.920 px, abrir uma categoria, rolar até o fim e ver o painel ainda à
direita; em 1.535 px, o painel aparece entre as abas e a tabela.

---

### P1: Teclado, foco e toque ⭐ MVP — CADCOL-10

**User Story**: Como quem usa o teclado ou o toque, quero chegar ao painel quando abro um item e
voltar à linha quando fecho, com alvos que o dedo acerta.

**Why P1**: O painel vem antes da tabela no DOM, em toda largura; sem o foco, ele fica fora do
caminho de quem usa teclado.

**Acceptance Criteria**

1. The system SHALL fazer do botão de cada linha um alvo do `Tab`, que abre o item com `Enter` ou
   espaço
2. WHEN a pessoa abre um item, ou um formulário de criação, THEN o sistema SHALL levar o foco ao
   título do painel
3. WHEN `Escape` é pressionado com o foco dentro do painel THEN o sistema SHALL fechar o painel
4. WHEN o painel é fechado por `Escape`, "Fechar" ou "Cancelar" THEN o sistema SHALL devolver o foco
   ao botão da linha do item, ou ao "+ Nova categoria" e "+ Novo meio" quando o painel tinha o
   formulário de criação
5. WHEN um item é aberto com menos de 1.536 px THEN o sistema SHALL trazer o título do painel para
   dentro da janela
6. WHILE a janela tem menos de 768 px, ou o ponteiro é grosso em qualquer largura, THE system SHALL
   desenhar o botão de cada linha com ao menos 44 por 44 px (TOQUE-01)
7. The system SHALL desenhar as abas, "+ Nova categoria", "+ Novo meio", "Fechar", cada botão dos
   formulários do painel, "Ver em Lançamentos" e cada opção de cor com ao menos 44 por 44 px, em
   qualquer largura e ponteiro (COR-04, AC 10)

**Independent Test**: com o teclado, levar o foco a "Categoria Um", apertar `Enter`, ver o foco no
título do painel, apertar `Escape` e ver o foco de volta na linha.

---

### P2: O item aberto no endereço — CADCOL-11

**User Story**: Como quem recarrega a página ou manda um link, quero que o mesmo item continue
aberto, para não procurá-lo de novo.

**Why P2**: Útil, mas a tela funciona sem ele.

**Acceptance Criteria**

1. WHEN uma categoria é aberta THEN o sistema SHALL pôr o id dela na URL como `?categoria=<id>`, e o de
   um meio como `?meio=<id>`, sem recarregar a página e sem criar entrada nova no histórico
2. WHEN a página é carregada com `?categoria=<id>` ou `?meio=<id>` de um item da tabela THEN o sistema
   SHALL mostrá-lo aberto no painel, sem levar o foco a ele
3. IF o id não corresponde a nenhum item da tabela THEN o sistema SHALL ignorá-lo, com o painel
   fechado e sem mensagem de erro
4. WHEN o painel é fechado, ou o formulário de criação é aberto, THEN o sistema SHALL tirar o
   parâmetro da URL, mantendo os outros

**Independent Test**: abrir "Categoria Um", recarregar a página e ver "Categoria Um" aberta no
painel.

---

### P2: A decisão registrada — CADCOL-12

**User Story**: Como quem mantém o app, quero a decisão e a regra de arquivar escritas, para a
próxima fatia partir delas.

**Why P2**: Sem o registro, a fatia de arquivar desfaz a escolha do dono ou a reinventa.

**Acceptance Criteria**

1. The system SHALL registrar o AD-022 em `.specs/STATE.md`, com o que ele revê
2. The system SHALL registrar no roadmap, na linha de arquivar cadastro, a regra do dono: arquivar um
   meio que fixos ativos usam é permitido, e os fixos continuam usando-o
3. The system SHALL anotar em COR-04 (ACs 3, 6, 8 e 10 e o Edge Case da lista vazia) e em TRES-01, AC
   8 o critério desta fatia que os substitui
4. The system SHALL atualizar a seção "Largura do conteúdo" de `docs/design.md` com Cadastros

**Independent Test**: ler o roadmap e achar a regra de arquivar meio usado por fixo ativo.

---

## Edge Cases

- Nome longo: quebra linha, e só aquela linha fica mais alta (como DENS e FIXCOL). Uma palavra só,
  mais larga que a coluna, quebra no meio, na linha e no painel
- Renomear muda a posição da linha na ordem alfabética: o painel, fora da tabela, não se move, e a
  linha aberta continua marcada no lugar novo
- Criar categoria com o nome de uma ativa abre a existente; com o de uma arquivada, a reativa
  (CADCOL-05, ACs 3 e 4)
- Criar meio com o nome de um arquivado cria outro meio, como hoje; renomear para esse nome também
  grava (CADCOL-07, AC 7)
- Salvar só os dias de um cartão não consulta o nome; salvar só o nome não mexe nos dias
- O item aberto deixa de estar na tabela depois de uma resposta do servidor (por exemplo, arquivado
  em outra aba, quando arquivar existir): o painel volta ao vazio, e `?categoria=` ou `?meio=` sai
- Trocar de mês pelo seletor: as setas levam à Visão geral do outro mês, como hoje; o atalho "Mês
  atual" mantém a aba, sem o item aberto
- Mês sem lançamento nenhum: toda contagem é "0", e "Ver em Lançamentos" abre a lista vazia
- Erro numa action: a mensagem aparece no painel, e o painel continua no mesmo modo
- O formulário de criação de meio mais alto que a janela, a partir de 1.536 px: a coluna rola por
  conta própria, presa no alto

## O que esta fatia substitui

- COR-04, AC 3: as onze opções de cor aparecem só para a categoria aberta, no painel, e não em cada
  categoria (CADCOL-04, AC 3)
- COR-04, AC 6: renomear é o campo "Nome" sempre aberto no painel, sem o botão "Renomear"; gravar,
  avisar e manter a cor continuam (CADCOL-04, AC 6)
- COR-04, AC 8: o motivo da recusa aparece no painel da categoria, e não "na linha" (CADCOL-04, AC 8)
- COR-04, AC 10: os alvos de 44 por 44 px valem para as opções do painel e para o botão de cada
  linha, no toque e abaixo de 768 px (CADCOL-10, ACs 6 e 7)
- COR-04, Edge Case da lista vazia: o texto manda para "+ Nova categoria", e não para o formulário de
  lançamento (CADCOL-02, AC 9)
- TRES-01, AC 8, e AD-019 em Cadastros: a partir de 1.536 px, as duas abas deixam a `AreaEstreita`
  (CADCOL-09, AC 4)
- `docs/design.md`, "Largura do conteúdo": Categorias sai da lista de telas em 1.024 px a partir de
  1.536 px
- `docs/roadmap.md`, "Dívida de interface": renomear meio de pagamento passa a ter tela

COR-04, ACs 1, 2, 4, 5, 7 e 9 continuam valendo como estão; o que muda nos testes deles é a estrutura
consultada (linha de tabela e painel, e não cartão). A decisão nova é o AD-022.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| CADCOL-01 | P1: Duas abas em Cadastros | Execute | In progress: `cabecalho-de-cadastros.test.tsx` prova o `h1` "Cadastros" antes da navegação "Cadastros", AC 1, os links "Categorias" e "Meios de pagamento" para `/2026-03/cadastros/categorias` e `/2026-03/cadastros/meios-de-pagamento`, nessa ordem, AC 2, `aria-current="page"` só no link da aba recebida, com cada aba, AC 3, e a ação recebida junto do título, depois dele e fora das abas, com cada aba, AC 6 (T10); `cadastro-de-categorias.test.tsx` prova o "+ Nova categoria" junto do título e antes do painel e da tabela, AC 6, e a aba Categorias com `aria-current`, AC 3 (T14); `e2e/cadastros-colunas.spec.ts:435` prova, pela página, o item "Cadastros" abrindo a aba Categorias, o `h1` "Cadastros", a aba com `aria-current` e a outra sem, o link de Meios de pagamento para a rota do mês e o item "Cadastros" ativo, ACs 1 a 5; `e2e/categorias.spec.ts:326` também confere o `h1` e a aba (T15); `cadastro-de-meios.test.tsx` prova o "+ Novo meio" junto do título e antes do painel e da tabela, AC 6, e a aba Meios de pagamento com `aria-current` e a de Categorias sem, AC 3 (T19); `e2e/cadastros-colunas.spec.ts:1025` prova, pela página, a aba "Meios de pagamento" levando a `/2026-03/cadastros/meios-de-pagamento`, com `aria-current` nela e não em "Categorias", o item "Cadastros" ativo e o "+ Novo meio" no cabeçalho, ACs 2, 3, 5 e 6 (T20); `e2e/cadastros-colunas.spec.ts:2117` prova, pela página, em 400, 1.535 e 1.536 px, nas duas abas, a caixa de "+ Nova categoria" e a de "+ Novo meio" na faixa vertical do `h1` "Cadastros" e à direita dele, AC 6 (F5) |
| CADCOL-02 | P1: Uma linha por categoria | Execute | In progress: `tabela-de-categorias.test.tsx` prova a tabela "Categorias" com Categoria, Cor, "Fixos em Março" e "Lançamentos em Março", AC 1; as linhas na ordem recebida, AC 2 (a ordem pt-BR é da página); a pill da linha na cor escolhida e na automática, procurada dentro da linha, AC 3; "Laranja" na escolhida e "Automática (Azul)" e "Automática (Ciano)" sem escolha, AC 4; "0 fixos" e "0 lançamentos" sem uso, e "1 fixo", "2 lançamentos", "2 fixos" e "1 lançamento" no texto da célula, ACs 5 e 8 (o texto; a medida é do e2e); um botão só por linha, AC 6; o aviso da lista vazia no lugar da tabela, AC 9; `cor-de-categoria.test.ts` prova `NOME_DA_COR` e `textoDaCor` nas dez cores, escolhidas e automáticas, AC 4 (T11); `e2e/cadastros-colunas.spec.ts:399` prova, na página, "1 fixo" e "2 lançamentos" na linha de "Categoria Um" e "0 fixos" e "0 lançamentos" na de "Categoria Dois", AC 5; `e2e/cadastros-colunas.spec.ts:740` toda linha com até 48 px em 1.280 px com ponteiro fino, quinze linhas com uma de 59 caracteres, AC 7; `e2e/cadastros-colunas.spec.ts:770` em 767 px nenhum cabeçalho à vista e o nome da contagem escrito, e em 768 px os quatro cabeçalhos e o nome só para leitor de tela, AC 8; `e2e/cadastros-colunas.spec.ts:821` em 400 px a cor e as contagens na mesma linha, abaixo da pill, AC 8; `e2e/categorias.spec.ts:326` a ordem pt-BR dos botões das linhas e a cor de cada pill, ACs 2 e 3 (T15); `e2e/cadastros-colunas.spec.ts:1802` prova, em 1.536 e em 1.920 px com ponteiro fino, toda linha de nome curto das quinze categorias com até 48 px, e toda linha, a de 59 caracteres inclusive, só com o botão do nome mais o respiro da célula, AC 7 e o Edge Case do nome longo (T21); `e2e/cadastros-colunas.spec.ts:834` prova, em 400 px e pelas caixas do texto, a regra do AC 8 revista pelo dono: a pill de "Categoria Um" sozinha na primeira linha de texto, nenhuma caixa da cor e das contagens na faixa dela e todas abaixo dela, e `:835` a linha em duas linhas de texto, porque o resto cabe (F1); `e2e/cadastros-colunas.spec.ts:784-787` prova a mesma regra colada no limiar, em 767 px: a pill de "Categoria Dois" e a de "Categoria Um" sozinhas na primeira linha de texto, e a cor e as contagens abaixo dela, numa linha só, porque cabem (F2) |
| CADCOL-03 | P1: O uso no mês aberto | Execute | In progress: `uso-no-mes.test.ts` prova a contagem do fixo que começou antes sem fim, do que começa e do que termina no mês aberto, AC 1, e deixa fora o que começa no mês seguinte e o que terminou no anterior, cada borda com o caso colado dos dois lados, AC 2; conta o lançamento da competência de toda natureza e origem e deixa fora o cancelado e o de outra competência, AC 3; o fixo do mês em `fixos` e a ocorrência dele em `lancamentos`, cada um com a sua assertion, ACs 1 e 3; o fixo e o lançamento sem categoria, e a receita fixa, só para o meio, AC 6 (T1); `obter-uso-no-mes/handler.test.ts` prova, com os fakes, que num mês nunca aberto a ocorrência do fixo entra em `lancamentos` da categoria e do meio, materializada na janela de `MESES_DE_PROJECAO`, AC 5, e que a contagem de cada categoria e de cada meio é igual a `filtrarLancamentos` sobre `obterVisaoMensal`, com o avulso cancelado, o de abril, a parcela, a receita fixa sem categoria e o fixo encerrado em fevereiro, AC 4; `handler.integration.test.ts` prova contra o Postgres o fixo sem ocorrência contado ao abrir, o cancelado e o de abril fora, e abrir duas vezes sem ocorrência nova, ACs 3 e 5 (T2); `e2e/cadastros-colunas.spec.ts:399` prova, abrindo Categorias de março antes de qualquer outra tela e sem ocorrência gravada, a contagem com o fixo do mês e a ocorrência criada ao abrir, sem o fixo encerrado em fevereiro, o que começa em abril, o cancelado e o de abril, ACs 1 a 3 e 5, e "Ver em Lançamentos" levando a "2 lançamentos com 1 filtro", AC 4 (T15); `e2e/cadastros-colunas.spec.ts:989` prova, abrindo Meios de pagamento de março antes de qualquer outra tela e sem ocorrência gravada, "Conta Corrente" com 2 fixos e 2 lançamentos (o fixo do mês e a entrada sem categoria contando para o meio), "Cartão Roxo" com 0 e 1 (o fixo de abril fora) e "conta Azul" com 0 e 0, ACs 1 a 3, 5 e 6, e "Ver em Lançamentos" de "Conta Corrente" levando a "2 lançamentos com 1 filtro", AC 4 (T20) |
| CADCOL-04 | P1: A categoria aberta na coluna | Execute | In progress: `coluna-de-cadastro.test.tsx` prova o "Fechar" dentro do painel chamando `aoFechar` uma vez, AC 15 (T9); `tabela-de-categorias.test.tsx` prova o clique na célula de uma contagem e o `Enter` no botão abrindo a categoria da linha, uma vez cada, AC 1, e `aria-expanded` verdadeiro só no botão da aberta, falso nos outros e sem nada aberto, com `aria-controls="painel-da-categoria"` em todos, AC 13 (T11); `cadastro-de-categorias.test.tsx` prova a linha abrindo a categoria no painel, AC 1; trocar de categoria, abrir o "+ Nova categoria" e fechar descartando o nome digitado, sem gravar, e reabrir com o gravado, AC 14; "Fechar" fechando e desmarcando a linha, AC 15 (T14); `detalhe-da-categoria.test.tsx` prova o título com a pill na cor em uso, AC 1; o formulário "Renomear Categoria Um" com "Nome" preenchido e "Salvar", AC 2; o grupo "Cor de Categoria Um" com as dez cores e "Automática (Ciano)", cada opção tingida, a escolhida marcada e a Automática com a cor do nome, AC 3; a cor mandada uma vez com "Cor trocada.", a Automática como `null`, e a pill do título e a opção mudando antes da resposta, AC 4; o nome novo mandado, "Categoria renomeada." e o campo aberto com ele, e a pill do título com o nome novo na cor de antes enquanto grava, AC 6; o nome de outra categoria em `alert` junto do campo, com `aria-invalid` e `aria-describedby`, e o nome de volta, AC 7; a cor recusada de volta com o motivo em `alert`, a falha sem campo na mensagem geral, sem aviso, AC 8; o vazio e os 61 caracteres recusados sem chamar o servidor, e os 60 mandados; o nome igual com espaço sobrando sem gravar nem avisar, AC 9; só a caixa gravando e avisando, AC 10; o servidor dizendo que nada mudou sem aviso; "Onde ela aparece" com 1 e 2 e o link para `/2026-03/lancamentos?categoriaId=<id>`, ACs 11 e 12; `onde-aparece.test.tsx` prova as duas contagens com "Fixos em Março de 2026" e "Lançamentos em Março de 2026", o 0 sem uso e o link recebido, ACs 11 e 12 (T12); `e2e/cadastros-colunas.spec.ts:643` prova, em 1.280 × 720 e 1.920 × 1.080, "Cor trocada." e "Categoria renomeada." à vista, a pill da linha na cor nova, o painel continuando na categoria e a linha no lugar novo, ACs 4 a 6; `e2e/cadastros-colunas.spec.ts:713` a linha aberta com fundo computado diferente das outras treze, AC 13; `e2e/cadastros-colunas.spec.ts:399` "Onde ela aparece" com 1 e 2 e o link para Lançamentos filtrado, ACs 11 e 12; `e2e/categorias.spec.ts:366` e `:464` a cor e o nome pelo painel, e a recusa junto do campo, ACs 3, 6 e 7 (T15); `e2e/cadastros-colunas.spec.ts:2233` prova, em 400 × 700, 1.280 × 480 e 1.920 × 480, com a página levada até o fim e de volta até o controle, que salvar a cor, por "Verde", e o nome, por "Salvar", deixa a rolagem da página e a da coluna do painel como estavam (± 1 px), depois do aviso e da página relida com a linha já mudada, e `:2258` o controle inteiro à vista, AC 16 (F6) |
| CADCOL-05 | P1: Nova categoria na coluna | Execute | In progress: `cadastro-de-categorias.test.tsx` prova o "+ Nova categoria" fechando a aberta e mostrando o formulário, AC 1; depois de criar, o painel na criada, o id no endereço e o aviso, com a criada já na lista e com a lista chegando depois de uma página relida sem ela, ACs 2 a 4; "Cancelar" fechando sem criar, AC 6 (T14); `categorias.integration.test.ts` prova `criarCategoria` revalidando as quatro telas da categoria ao criar, ao reaproveitar uma ativa e ao reativar uma arquivada, uma assertion para cada caminho, ACs 2 a 4, o nome vazio recusado sem criar nem revalidar, e `requireSession` como primeira instrução (T7); `nova-categoria.test.tsx` prova o título "Nova categoria" com `tabindex=-1`, o campo "Nome" vazio, a nota da cor, "Criar categoria" e "Cancelar", AC 1; o nome normalizado mandado e "Categoria criada." com o id, AC 2; "Essa categoria já existia.", AC 3; "Categoria reativada." com `jaExistia` e `reativada` verdadeiros, AC 4; o vazio e os 61 caracteres recusados junto do campo, com `aria-invalid`, sem chamar o servidor, e os 60 mandados, AC 5; a recusa do servidor em `alert`, sem abrir nada; "Cancelar" sem chamar o servidor, AC 6 (T13); `e2e/cadastros-colunas.spec.ts:463` prova, pela página, "Categoria criada." à vista, a linha nova e o painel nela com "Automática (Verde)" marcada e o id no endereço, AC 2; "categoria um" abrindo "Categoria Um" com "Essa categoria já existia.", sem linha nova, AC 3; e "Categoria Antiga", arquivada, reativada com "Categoria reativada.", AC 4 (T15) |
| CADCOL-06 | P1: Uma linha por meio de pagamento | Execute | In progress: `tabela-de-meios.test.tsx` prova a tabela "Meios de pagamento" com "Meio de pagamento", Tipo, Fecha, Vence, "Fixos em Março" e "Lançamentos em Março", AC 1; as linhas na ordem recebida, AC 2 (a ordem pt-BR é da página); "Cartão de crédito", "Conta corrente" e "Rótulo", um caso para cada, AC 3; "fecha dia 25" e "vence dia 5" no cartão e "—" em Fecha e em Vence na conta e no rótulo, AC 4; "0 fixos" e "0 lançamentos" sem uso, e "2 fixos", "2 lançamentos", "1 fixo" e "1 lançamento" no texto da célula, ACs 5 e 8 (o texto; a medida é do e2e); um botão só por linha, com o nome, AC 6; o aviso da lista vazia no lugar da tabela, AC 9 (T16); `e2e/cadastros-colunas.spec.ts:1046` prova, pela página, a ordem "Cartão Roxo", "conta Azul", "Conta Corrente", "Rótulo Âmbar", conferida diferente da do banco e da do código de caractere, AC 2, e, dentro de cada linha, "Cartão de crédito", "fecha dia 25" e "vence dia 5" no cartão e o tipo e "—" nas outras, ACs 3 e 4; `e2e/cadastros-colunas.spec.ts:989` as contagens de cada linha, AC 5; `:1433` toda linha com até 48 px em 1.280 px com ponteiro fino, dezessete linhas com um nome de 40 caracteres, AC 7; `:1463` em 767 px nenhum cabeçalho à vista e o nome do dia e da contagem escritos, e em 768 px os seis cabeçalhos, os nomes só para leitor de tela e nenhuma rolagem lateral, AC 8; `:1522` em 400 px o nome em cima e o resto embaixo, o "—" fora da tela na conta e o tipo e as contagens da conta na mesma linha, AC 8 (T20); `e2e/cadastros-colunas.spec.ts:1802` prova, em 1.536 e em 1.920 px com ponteiro fino, toda linha de nome curto dos dezessete meios com até 48 px, e toda linha, a de 40 caracteres inclusive, só com o botão do nome mais o respiro, AC 7 e o Edge Case do nome longo (T21); `e2e/cadastros-colunas.spec.ts:1536` prova, em 400 px e pelas caixas do texto, a regra do AC 8 revista pelo dono: em "Cartão Roxo", nenhuma caixa do tipo, dos dias e das contagens na faixa do nome e todas abaixo dele, onde quebram; `:1537-1541` "Conta Corrente", sem dias, com o nome sozinho em cima e em duas linhas de texto (F1); `e2e/cadastros-colunas.spec.ts:1481-1484` prova a mesma regra colada no limiar, em 767 px: o nome de cada um dos quatro meios sozinho na primeira linha de texto, e o tipo, os dias e as contagens abaixo dele, numa linha só, no cartão também (F2) |
| CADCOL-07 | P1: O meio aberto: renomear e corrigir os dias | Execute | In progress: `tabela-de-meios.test.tsx` prova o clique na célula de uma contagem e o `Enter` no botão abrindo o meio da linha, uma vez cada, AC 1, e `aria-expanded` verdadeiro só no botão do aberto, falso nos outros e sem nada aberto, com `aria-controls="painel-do-meio"` em todos, AC 15 (T16); `mudancas-do-meio.test.ts` prova, no cartão, o nome, o fechamento e o vencimento diferentes voltando cada um sozinho e os três juntos, AC 5, o nome que difere só na caixa como mudança, AC 8, tudo igual como `null` no cartão e na conta, AC 9, a conta e o rótulo com ciclo e o cartão sem ciclo recusados com `CICLO_NAO_CORRESPONDE_AO_TIPO`, uma assertion para cada, AC 11, e o tipo fora do resultado, AC 4; `erros.test.ts` prova a mensagem do código, AC 11 (T3); `cadastro.repository.integration.test.ts` prova contra o Postgres `atualizarMeioDePagamento` gravando só o nome ou só os dias, com tipo, `gera_fatura`, o fechamento na fatura seguinte e `arquivado_em` lidos do banco como estavam, os dias 1 e 31 gravados, os dias 0 e 32 recusados por `meio_pagamento_dias_validos`, dias numa conta recusados por `meio_pagamento_cartao_tem_ciclo` e o id inexistente lançando, sem gravar; `fakes.test.ts` prova o mesmo contrato no fake e a busca por nome entre os ativos, sem caixa, ACs 5, 7, 8 e 10 (T4); `editar-meio-de-pagamento/handler.test.ts` prova o meio inexistente e o arquivado recusados com `MEIO_PAGAMENTO_NAO_ENCONTRADO`, uma assertion para cada, sem gravar, AC 12, o ciclo da conta e o cartão sem dias recusados sem gravar, AC 11, nada mudou com `alterado: false`, sem consultar o nome nem gravar, AC 9, o nome de outro ativo em outra caixa recusado com `MEIO_PAGAMENTO_JA_EXISTE`, AC 6, o nome de um arquivado e a mudança só de caixa gravados, ACs 7 e 8, e só os dias gravados sem consultar o nome, com o meio gravado e `alterado: true` de volta, AC 5 (T5); `meio-pagamento.schema.test.ts` prova `entradaEdicaoDoMeioSchema` estrito, com o id uuid, o nome normalizado, vazio e com 41 caracteres recusados e 40 aceito, os dias 0 e 32 recusados e 1 e 31 aceitos com as mensagens da criação, e `ciclo: null` aceito, AC 10; `meios-de-pagamento.integration.test.ts` prova contra o Postgres `requireSession` primeiro, o nome e os dias gravados e lidos de volta com o layout raiz revalidado uma vez, ACs 5 e 14, nada mudou sem gravar nem revalidar, AC 9, e cada recusa com a mensagem e o campo, sem gravar nem revalidar: o nome de outro ativo em `nome`, AC 6, o meio inexistente e o arquivado, AC 12, o ciclo que não corresponde ao tipo, AC 11, e `VALIDACAO` em `nome`, `ciclo.diaFechamento` e `ciclo.diaVencimento`, AC 10; falha do banco vira `ERRO_INESPERADO` com referência (T6); `campos-do-meio.test.tsx` prova, com `tipos` igual a `null`, o tipo em texto com "O tipo não muda. Para trocar, cadastre outro meio." no bloco do Tipo, na conta e no rótulo também, AC 2, e nenhum `combobox` nem `radio`, AC 4; no cartão, os dois dias preenchidos com os valores recebidos, e na conta e no rótulo nenhum campo de dia, ACs 3 e 4 (T8); `onde-aparece.test.tsx` prova "Onde ele aparece" com as contagens e o link recebido, AC 13 (T12); `detalhe-do-meio.test.tsx` prova o nome como título de nível 2, com `tabindex=-1`, e logo abaixo "Cartão de crédito · fecha dia 25 · vence dia 5", "Conta corrente" ou "Rótulo", AC 1; o formulário "Editar Cartão Roxo" com "Nome" preenchido, o tipo em texto com a frase e "Salvar alterações", AC 2, e nenhum `combobox` nem `radio`, AC 4; no cartão os dois dias gravados e a nota, e na conta nem dias nem nota, AC 3; o nome novo normalizado com os dias do cartão, os dias novos em números e `ciclo: null` na conta, cada um com "Meio de pagamento salvo.", e o nome gravado no campo, AC 5; o nome de outro meio em `alert` junto de "Nome", com `aria-invalid` e `aria-describedby`, sem aviso, AC 6; tudo igual, com espaço sobrando, sem chamar o servidor nem avisar, e o servidor dizendo que nada mudou sem aviso, AC 9; o nome vazio, o de 41 caracteres, o dia 0 e o dia 32 recusados junto do campo sem chamar o servidor, os 40 caracteres e os dias 1 e 31 mandados, e o dia recusado pelo servidor junto do campo do dia, AC 10; a recusa sem campo e o meio inexistente no alerta do formulário, sem marcar campo, ACs 11 e 12; "Onde ele aparece" com 0 e 1 e o link para `/2026-03/lancamentos?meioPagamentoId=<id>`, AC 13; `campos-do-meio.test.tsx` prova o nome cortado em 40 sem `erros`, como no cadastro inline (T17); `cadastro-de-meios.test.tsx` prova a linha abrindo o meio no painel com o formulário "Editar Cartão Roxo", AC 1; trocar de meio, abrir o "+ Novo meio" e fechar descartando o nome digitado, sem gravar, e reabrir com o gravado, a linha aberta marcada e a outra não, e o painel no nome novo numa página relida que ainda tem o meio, AC 15 (T19); `e2e/cadastros-colunas.spec.ts:1084` prova, em 1.280 × 720 e 1.920 × 1.080, os dias de "Cartão Roxo" corrigidos para 10 e 17 com "Meio de pagamento salvo.", "fecha dia 10" e "vence dia 17" na linha e no subtítulo, gravados no banco, e "Salvar alterações" e o subtítulo inteiros na janela depois da página relida, AC 5; `:1115` o renome para "conta azul" recusado junto do campo, sem aviso, sem mudar a linha nem o banco, AC 6; `:1139` o renome para "Cartão Lilás" mudando a linha de lugar, aberta e marcada, e o filtro de meio de Lançamentos, aberto pela navegação sem recarregar, com o nome novo e sem o velho, ACs 5 e 14; `:989` "Onde ele aparece" com 2 e 2 e o link para Lançamentos filtrado pelo meio, AC 13; `:1407` a linha aberta com fundo computado diferente das outras três, AC 15 (T20); `e2e/cadastros-colunas.spec.ts:2233` prova o mesmo ao salvar os dias de "Cartão Roxo" por "Salvar alterações", nas três janelas, com a coluna presa rolada até o botão em 1.920 × 480, AC 16 (F6) |
| CADCOL-08 | P1: Novo meio na coluna | Execute | In progress: `meios-de-pagamento.integration.test.ts` prova `criarMeioDePagamento` criando o cartão com os dias e revalidando o layout raiz uma vez, AC 4, recusando o nome de um ativo em qualquer caixa com "Já existe um meio de pagamento com esse nome." em `nome`, sem criar nem revalidar, AC 5, e criando outro meio com o nome de um arquivado (T6); `campos-do-meio.test.tsx` prova o seletor "Tipo" só com os tipos recebidos, na ordem do app, com o do valor marcado, e a troca mandando só o tipo, AC 1; trocar para Conta corrente tira os dias, e voltar a Cartão de crédito os traz, AC 2 (T8); `novo-meio.test.tsx` prova o título "Novo meio de pagamento" com `tabindex=-1`, "Nome" vazio, "Tipo" com Cartão de crédito, Conta corrente e Rótulo, começando no cartão, "Criar meio" e "Cancelar", AC 1; os dias saindo com Conta corrente e voltando com Cartão de crédito, AC 2; a ajuda de hoje no cartão e na conta e a do rótulo, e o nome vazio, o de 41 caracteres, o dia 0 e o dia 32 recusados junto do campo sem chamar o servidor, com os 40 caracteres e os dias 1 e 31 mandados, AC 3; o cartão com os dias e a conta sem eles mandados, com o id entregue a `aoCriado`, AC 4; "Já existe um meio de pagamento com esse nome." junto do campo, sem `aoCriado`, AC 5; "Cancelar" com o formulário válido, sem chamar o servidor, AC 6 (T18); `cadastro-de-meios.test.tsx` prova o "+ Novo meio" fechando o aberto e mostrando o formulário, AC 1; depois de criar, o painel no criado, o id no endereço e "Meio de pagamento criado.", com o criado já na lista e com a lista chegando depois de uma página relida sem ele, AC 4; "Cancelar" fechando sem criar, AC 6 (T19); `e2e/cadastros-colunas.spec.ts:1186` prova, em 1.280 × 720 e 1.920 × 1.080, "Cartão Novo", cartão com fechamento 3 e vencimento 10, criado pelo painel com "Meio de pagamento criado.", a linha marcada, o painel nele com o foco no título e o título e o subtítulo inteiros na janela, e o id no endereço, AC 4; "conta corrente" recusado junto do campo com "Já existe um meio de pagamento com esse nome.", sem linha nem meio novo no banco, AC 5 (T20) |
| CADCOL-09 | P1: A coluna da direita a partir de 1.536 px | Execute | In progress: `coluna-de-cadastro.test.tsx` prova, sem nada aberto, nenhum painel e o título e a dica do vazio no DOM, numa coluna `hidden 2xl:block`, ACs 3 e 6 (os textos; a medida é do e2e); com algo aberto, a coluna sem `hidden` e, na ordem do DOM, o cabeçalho, o painel e a lista, AC 5 (T9); `e2e/cadastros-colunas.spec.ts:678` prova, em 1.280 px, nenhum painel e a dica escondida sem nada aberto, AC 6, e o painel aberto entre as abas e a tabela, AC 5; `e2e/cadastros-colunas.spec.ts:821` em 400 px, sem rolagem lateral com uma categoria aberta e com o formulário de criação, AC 7 (T15); `cadastro-de-meios.test.tsx` prova, sem nada aberto, nenhum painel e "Nenhum meio aberto" com a dica no DOM, AC 3 (os textos) (T19); `e2e/cadastros-colunas.spec.ts:1373` prova, em 1.280 px na aba de meios, nenhum painel e a dica escondida sem nada aberto, AC 6, e o painel aberto entre as abas e a tabela, AC 5; `:1522` em 400 px, sem rolagem lateral com "Cartão Roxo" aberto e com o formulário de criação, AC 7; `e2e/visao-tres-colunas.spec.ts:606` o laço de TRES-01, AC 10 com a aba de meios, AC 7 (T20); `e2e/cadastros-colunas.spec.ts:1674` prova, nas duas abas, em 1.535 px o painel aberto entre as abas e a tabela e, sem nada aberto, nenhum painel e o vazio e a dica escondidos, ACs 5 e 6, e em 1.536 px o painel à direita da tabela e, sem nada aberto, "Nenhuma categoria aberta" ou "Nenhum meio aberto" com a dica, à direita da tabela, ACs 1 e 3; `:1711` em 1.535 px o cabeçalho, o painel e a tabela com até 1.024 px, centrados, AC 5; `:1734` em 1.536 e em 1.920 px a coluna com 384 px e `border-left` de 1 px sólido, o cabeçalho e a tabela com até 1.100 px, centrados entre o menu e a coluna, e a tabela logo abaixo do cabeçalho com o painel mais alto que os dois, ACs 1 e 4; `:1774` rolando até o fim em 1.536 × 480 e 1.920 × 480, com linhas a mais, o título do painel à vista, AC 2; `:1844` em 1.920 × 480 o formulário de novo meio rolando dentro da coluna presa no alto (Edge Case); `e2e/visao-tres-colunas.spec.ts:220` TRES-01, AC 8 em 1.535 px com Lançamentos, Todo mês, Categorias e Meios de pagamento (T21); `e2e/cadastros-colunas.spec.ts:2077` prova, com ponteiro fino, nas duas abas, sem nada aberto, com o item de nome numa palavra só aberto e com o formulário de criação aberto pela ação, nenhuma rolagem lateral na página nem no painel em 400, 767, 768, 1.023, 1.024, 1.279, 1.280, 1.535, 1.536 e 1.920 px, as 60 medidas, com "Categoria C" (cor automática verde-água), um meio de 40 caracteres e uma categoria de 60, numa palavra só, AC 7 e o Edge Case da palavra que quebra no meio; `:2098` o mesmo com toque em 768 px, AC 7 (F4) |
| CADCOL-10 | P1: Teclado, foco e toque | Execute | In progress: `coluna-de-cadastro.test.tsx` prova o `Escape` num campo do painel fechando e fora dele não, AC 3; o foco no título quando o painel nasce junto com o pedido e quando um pedido novo chega com ele aberto, AC 2; o botão desabilitado que perde o foco sem destino passando-o ao título com `preventScroll`, e o botão habilitado e o campo não (T9); `cadastro-de-categorias.test.tsx` prova o foco no título ao abrir uma linha, ao abrir o formulário e depois de criar, inclusive com a lista chegando depois, AC 2; "Fechar" e `Escape` devolvendo o foco ao botão da linha, e "Fechar" e "Cancelar" do formulário ao "+ Nova categoria", AC 4 (T14); `e2e/cadastros-colunas.spec.ts:538` prova `Tab` até a linha, `Enter` e espaço abrindo com o foco no título, e `Escape` fechando, devolvendo o foco e tirando o parâmetro, ACs 1 a 4; `e2e/cadastros-colunas.spec.ts:696` a última linha aberta com a página rolada trazendo o título para a janela, AC 5; `e2e/cadastros-colunas.spec.ts:770` o botão da linha com 44 px em 767 px e com menos em 768 px, e `e2e/cadastros-colunas.spec.ts:805` com 44 × 44 com ponteiro grosso em 1.280 px, AC 6; `e2e/cadastros-colunas.spec.ts:821` as onze opções, "Salvar", "Fechar", "Ver em Lançamentos", as abas, "+ Nova categoria", "Criar categoria" e "Cancelar" com 44 × 44 em 400 px, AC 7; `e2e/categorias.spec.ts:531` as onze opções, os botões das linhas, "Salvar" e "Fechar" com 44 × 44 (T15); `cadastro-de-meios.test.tsx` prova o foco no título ao abrir uma linha, ao abrir o formulário e depois de criar, inclusive com a lista chegando depois, AC 2; "Fechar" e `Escape` devolvendo o foco ao botão da linha, e "Fechar" e "Cancelar" do formulário ao "+ Novo meio", AC 4 (T19); `e2e/cadastros-colunas.spec.ts:1261` prova, na aba de meios, `Tab` até a linha, `Enter` e espaço abrindo com o foco no título, e `Escape` fechando, devolvendo o foco e tirando o parâmetro, ACs 1 a 4; `:1391` a última de dezesseis linhas aberta com a página rolada trazendo o título para a janela, AC 5; `:1463` o botão da linha com 44 px em 767 px e com menos em 768 px, e `:1506` com 44 × 44 com ponteiro grosso em 1.280 px, AC 6; `:1522` os dois dias, "Salvar alterações", "Fechar", "Ver em Lançamentos", as abas, "+ Novo meio", "Criar meio" e "Cancelar" com 44 × 44 em 400 px, AC 7 (T20); `e2e/cadastros-colunas.spec.ts:1875` prova, com ponteiro grosso em 1.920 px e o painel aberto nas duas abas, o botão de cada linha com 44 × 44, AC 6, e "Fechar", as abas, "+ Nova categoria", "+ Novo meio", as onze opções de cor, "Salvar", "Salvar alterações", "Ver em Lançamentos" e os botões dos dois formulários de criação com 44 × 44, AC 7 (T21); `e2e/cadastros-colunas.spec.ts:1940` prova, com ponteiro fino em 768 e em 1.536 px, nas duas abas, com o painel aberto e com os dois formulários de criação abertos pela ação, as abas, "+ Nova categoria", "+ Novo meio", "Fechar", "Salvar", "Salvar alterações", "Criar categoria", "Criar meio", "Cancelar", "Ver em Lançamentos" e as onze opções de cor com ao menos 44 × 44, AC 7 (F3) |
| CADCOL-11 | P2: O item aberto no endereço | Execute | In progress: `coluna-de-cadastro.test.tsx` prova que montar já aberto, com `focarTitulo` 0, não leva o foco, AC 2 (T9); `parametro-na-url.test.tsx` prova o parâmetro pedido ao `router.replace` com `{ scroll: false }`, mantendo os outros, sem `push` nem `pushState`, AC 1, tirado mantendo os outros e sem `?` quando é o único, AC 4, e a comparação com o último valor pedido, com a barra ainda de antes; `cadastro-de-categorias.test.tsx` prova `?categoria=<id>` pedido ao abrir, AC 1, `categoriaInicial` da lista aberta sem foco, AC 2, a de fora da lista ignorada, sem alerta, AC 3, o parâmetro tirado ao fechar, pelo `Escape` e ao abrir o formulário, mantendo `outro`, AC 4, a aberta que deixa a lista tirando o parâmetro, e a navegação pendente de abrir e fechar, de fechar e reabrir, e do id de fora da lista saindo ao abrir o formulário (T14); `e2e/cadastros-colunas.spec.ts:511` prova `?categoria=<id>` sem recarregar e sem entrada no histórico, AC 1, a categoria aberta depois de recarregar, AC 2, e o id inexistente com o painel fechado e sem alerta no `main`, AC 3; `e2e/cadastros-colunas.spec.ts:602` e `:617` a corrida com a rede lenta: abrir e logo fechar termina sem o parâmetro, e fechar e logo reabrir termina com ele, ACs 1 e 4 (T15); `cadastro-de-meios.test.tsx` prova `?meio=<id>` pedido ao `router.replace` com `{ scroll: false }`, mantendo `outro`, sem `push` nem `pushState`, AC 1, `meioInicial` da lista aberto sem foco, AC 2, o de fora da lista ignorado, sem alerta, AC 3, o parâmetro tirado ao fechar, pelo `Escape` e ao abrir o formulário, AC 4, o meio aberto que deixa a lista tirando o parâmetro, e a navegação pendente de abrir e fechar, de fechar e reabrir, e do id de fora da lista saindo ao abrir o formulário (T19); `e2e/cadastros-colunas.spec.ts:1235` prova `?meio=<id>` sem recarregar e sem entrada no histórico, AC 1, o meio aberto depois de recarregar, AC 2, e o id inexistente com o painel fechado e sem alerta no `main`, AC 3; `:1289` e `:1304` a corrida com a rede lenta: abrir e logo fechar termina sem o parâmetro, e fechar e logo reabrir termina com ele, ACs 1 e 4 (T20) |
| CADCOL-12 | P2: A decisão registrada | Execute | In progress: `.specs/STATE.md` registra o AD-022, com o que ele revê, AD-019 e TRES-01, AC 8 em Cadastros e COR-04, ACs 3, 6, 8 e 10 e o Edge Case da lista vazia, AC 1; `docs/roadmap.md` registra na linha de arquivar que renomear meio já tem tela e a regra do dono, arquivar um meio que fixos ativos usam é permitido e os fixos continuam usando-o, ao lado da decisão de 2026-10-29 sobre a edição de fixo, e a dívida das três grades e das duas cópias do endereço, AC 2; `.specs/features/cor-por-categoria/spec.md` anota em COR-04, ACs 3, 6, 8 e 10 e no Edge Case da lista vazia o CADCOL que os substitui, e `.specs/features/visao-tres-colunas/spec.md` em TRES-01, AC 8, AC 3; `docs/design.md`, "Largura do conteúdo", diz que Cadastros tem a coluna a partir de 1.536 px e que a `AreaEstreita` fica com a home do ano e a tela de erro, AC 4 (T22) |

**Coverage:** 12 total, 12 mapeados para tasks (T1 a T22), 0 sem task.

---

## Success Criteria

- [ ] Em 1.920 px, a tabela inteira e o item aberto cabem na mesma tela, sem diálogo
- [ ] Em qualquer mês, "Lançamentos em <Mês>" de cada categoria e de cada meio é igual à contagem que
      Lançamentos mostra com o filtro dele
- [ ] Nenhuma ação some: trocar a cor, renomear e criar continuam a no máximo dois cliques
- [ ] Nome e dias de um meio se corrigem pela interface, sem tocar em lançamento nenhum
- [ ] Nenhuma mudança de banco
