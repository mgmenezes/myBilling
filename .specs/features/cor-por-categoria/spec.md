# Cor por categoria: Specification

> Pedido do dono em 2026-10-29, com a área "Todo mês" aberta: "estou sentindo falta de cores na
> nossa plataforma, principalmente nas pills das categorias, vamos planejar algo mais agradável pro
> usuário". Plano aprovado no mesmo dia (`~/.claude/plans/stateless-roaming-lighthouse.md`).

## Problem Statement

O app é todo cinza. A pill de categoria em "Todo mês", o seletor de categoria em cada linha de
Lançamentos, os chips de filtro e as barras de "Gastos por categoria" usam a mesma neutra. Para
reconhecer uma categoria é preciso ler o nome em cada lugar, e nada liga visualmente a barra do
gráfico à linha da lista.

O sistema recusa cor por categoria hoje, por decisão escrita (`docs/design.md`, "Escala do gráfico
de composição" e "Semântica de valor"; `src/app/globals.css`, comentário do gráfico): "vinte
matizes seria o anti-padrão". Esta fatia revisa essa decisão com limites: paleta curta e medida,
nome sempre impresso ao lado da cor, cor nunca sozinha.

## Goals

- [ ] Reconhecer a categoria pela cor, a mesma em "Todo mês", em Lançamentos e na Visão geral
- [ ] Escolher a cor de cada categoria numa tela própria, que também renomeia
- [ ] Toda cor legível nos dois temas, com contraste medido

## Out of Scope

| Feature | Reason |
| --- | --- |
| Cor nos cards de indicadores | O valor já é verde ou vermelho por natureza; preenchimento colorido fere a semântica de valor (`docs/design.md`) |
| Escolher a cor no cadastro inline dos formulários | Decisão do dono: a cor se escolhe na tela de Categorias; o inline continua só com nome |
| Arquivar categoria | Fica para a área Cadastros, junto do orçamento |
| Cor livre (hex) | A paleta é fechada para garantir o contraste medido |
| Tingir as `<option>` do seletor aberto | É lista nativa do navegador |
| Layout de painéis, densidade e hierarquia | Próxima rodada, com brainstorm próprio |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Para que serve a cor | Reconhecer a categoria de longe e ligar a lista ao gráfico | Decisão do dono | y |
| Onde se escolhe a cor | Tela nova de Categorias, na área Cadastros | Decisão do dono | y |
| Onde a cor aparece | Pill de "Todo mês", seletor da linha, chips de filtro, barras do gráfico | Decisão do dono | y |
| Estilo | Fundo tingido e texto em tinta da mesma família; barra do gráfico em tom médio | Decisão do dono | y |
| Azul na paleta | Entra, num tom pálido, distinto do azul de ação | Decisão do dono | y |
| Chip de filtro ativo | Continua invertido; só os inativos ficam tingidos | Decisão do dono | y |
| Cor de quem não escolheu | Automática, derivada do nome normalizado; `cor` nula no banco | O inline, a importação e o seed não mudam; a mesma categoria tem a mesma cor em qualquer ambiente | n (decisão do autor) |
| Renomear | A cor em uso antes do novo nome fica gravada | A categoria não muda de cor ao ser renomeada | n (decisão do autor) |
| Endereço da tela | `/<competencia>/cadastros/categorias`, 4º item "Cadastros" na navegação | Mantém o seletor de mês e a navegação do layout de competência | n (decisão do autor) |
| Como a cor é guardada | Pelo nome do matiz, nunca hex | O hex mora só nos tokens CSS e pode ser remedido sem migração | n (decisão do autor) |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: A categoria tem uma cor ⭐ MVP — COR-01

**User Story**: Como dono, quero que cada categoria tenha uma cor estável, escolhida por mim ou
automática, para reconhecê-la sempre igual.

**Why P1**: Sem o dado, nenhuma tela tem o que pintar.

**Acceptance Criteria**

1. The system SHALL oferecer exatamente dez cores de categoria, nesta ordem: vermelho, laranja,
   âmbar, verde, verde-água, ciano, azul, roxo, rosa e marrom
2. The system SHALL guardar na categoria a cor escolhida, ou nada quando a pessoa não escolheu
3. WHEN a categoria não tem cor escolhida THEN o sistema SHALL usar uma cor automática derivada do
   nome dela, a mesma para nomes que diferem só em caixa, acento ou espaços
4. The system SHALL recusar no banco qualquer cor fora das dez
5. WHEN uma categoria é criada pelo cadastro inline, pela importação ou pelo seed THEN o sistema
   SHALL criá-la sem cor escolhida

**Independent Test**: criar "Categoria Um" pelo formulário e ver a mesma cor automática que ela tem
em outro banco; escolher "Verde" e ver a escolha vencer a automática.

---

### P1: Paleta medida nos dois temas ⭐ MVP — COR-02

**User Story**: Como quem lê a tela no claro e no escuro, quero que toda cor de categoria seja
legível, para não trocar legibilidade por cor.

**Why P1**: A revisão da regra de design só se sustenta com contraste medido.

**Acceptance Criteria**

1. The system SHALL definir, para cada uma das dez cores, um fundo, um texto e uma barra, em claro
   e em escuro, como tokens de tema
2. The system SHALL garantir contraste de pelo menos 4,5:1 entre o texto e o fundo de cada cor, nos
   dois temas
3. The system SHALL garantir contraste de pelo menos 3:1 entre a barra de cada cor e o fundo do
   gráfico, nos dois temas
4. The system SHALL imprimir o nome da categoria ao lado de toda cor de categoria, para que nenhuma
   informação dependa só da cor
5. WHEN o lançamento não tem categoria, ou a categoria foi removida THEN o sistema SHALL mostrá-lo
   na cor neutra que existe hoje

**Independent Test**: com uma categoria de cada cor, medir no navegador o contraste do texto da
pill e da barra do gráfico nos temas claro e escuro.

---

### P1: A cor aparece onde a categoria aparece ⭐ MVP — COR-03

**User Story**: Como quem confere o mês, quero ver a cor da categoria na pill, no seletor, no chip
e na barra, para ligar a lista ao gráfico sem ler.

**Why P1**: É o pedido do dono.

**Acceptance Criteria**

1. WHEN "Todo mês" lista um fixo com categoria THEN o sistema SHALL mostrar a pill da categoria com
   o fundo e o texto da cor dela
2. WHEN Lançamentos mostra o seletor de categoria de uma linha THEN o sistema SHALL pintá-lo com o
   fundo e o texto da cor da categoria escolhida, mantendo o chevron
3. WHEN a pessoa troca a categoria no seletor THEN o sistema SHALL pintá-lo com a cor da nova
   escolha na hora, e, se a troca for recusada, SHALL voltar à cor anterior
4. WHEN o cartão de filtros mostra os chips de categoria THEN o sistema SHALL tingir cada chip
   inativo com a cor da categoria dele, e SHALL manter o chip ativo invertido, como hoje
5. WHEN a Visão geral mostra "Gastos por categoria" THEN o sistema SHALL pintar a barra de cada
   categoria com a barra da cor dela, mantendo o trilho neutro
6. The system SHALL manter o nome acessível de chips, seletores e barras como é hoje, sem o nome da
   cor
7. WHEN uma categoria estoura o orçamento THEN o sistema SHALL continuar sinalizando o estouro por
   ícone e texto, sem mudar a cor da barra

**Independent Test**: escolher "Verde" para "Categoria Um" e ver o mesmo fundo na pill de "Todo
mês", no seletor da linha e no chip de filtro, e a barra verde na Visão geral.

---

### P1: Tela de Categorias ⭐ MVP — COR-04

**User Story**: Como dono, quero uma tela que liste as categorias com a cor de cada uma, onde eu
troque a cor e renomeie, para cuidar do cadastro sem abrir um formulário de lançamento.

**Why P1**: É onde o dono escolhe a cor.

**Acceptance Criteria**

1. The system SHALL oferecer a tela Categorias em `/<competencia>/cadastros/categorias`, alcançável
   pelo item "Cadastros" da navegação, que fica ativo nela
2. The system SHALL listar as categorias disponíveis em ordem alfabética, cada uma com a pill na
   cor em uso
3. The system SHALL oferecer, para cada categoria, um grupo de opções de cor com as dez cores e
   "Automática", cada opção com o nome da cor escrito, e a cor em uso marcada
4. WHEN a pessoa escolhe uma cor THEN o sistema SHALL gravá-la sem botão de salvar, pintar a pill na
   hora e avisar "Cor trocada."
5. WHEN a pessoa escolhe "Automática" THEN o sistema SHALL apagar a cor escolhida e voltar à
   automática
6. WHEN a pessoa renomeia uma categoria THEN o sistema SHALL gravar o novo nome, avisar "Categoria
   renomeada." e manter a cor que estava em uso
7. IF o novo nome já pertence a outra categoria THEN o sistema SHALL recusar e dizer o motivo junto
   do campo, sem mudar nada
8. IF a gravação falhar THEN o sistema SHALL voltar a cor ou o nome anterior e dizer o motivo na
   linha da categoria
9. WHEN a cor ou o nome muda THEN o sistema SHALL mostrar a mudança em "Todo mês", em Lançamentos e
   na Visão geral na próxima visita, sem recarregar à força
10. The system SHALL caber em 400 px sem rolagem horizontal, com a navegação de quatro itens, e
    com alvos de 44×44 no toque

**Independent Test**: abrir Cadastros, escolher "Roxo" para "Categoria Um", ver o aviso, abrir
"Todo mês" e ver a pill roxa; renomear para "Categoria Dez" e ver a pill continuar roxa.

---

### P2: A decisão de design registrada — COR-05

**User Story**: Como quem mantém o app, quero que a revisão da regra de cor fique escrita com as
medições, para a próxima mudança saber por que a cor existe e até onde vai.

**Why P2**: Sem o registro, a próxima revisão desfaz a decisão ou a estende sem os limites.

**Acceptance Criteria**

1. The system SHALL registrar em `docs/design.md` a paleta com os valores, as medições de contraste,
   os limites (nome sempre ao lado, chip ativo invertido, estouro por ícone e texto) e o que o
   validador de paleta reprovou, com o motivo de não bloquear
2. The system SHALL revisar os trechos de `docs/design.md` e de `src/app/globals.css` que proibiam
   cor por categoria, apontando para a seção nova
3. The system SHALL registrar a decisão como AD em `.specs/STATE.md`

**Independent Test**: ler `docs/design.md` e achar a paleta, os limites e a revisão.

---

## Edge Cases

- WHEN o nome normalizado é vazio THEN a cor automática SHALL ser a primeira da lista
- WHEN o seletor mostra uma categoria arquivada, que não está entre as opções THEN o sistema SHALL
  pintá-lo na cor neutra
- WHEN não há categoria nenhuma THEN a tela Categorias SHALL dizer que não há categorias e como
  criar uma (pelo formulário de lançamento)
- WHEN o nome novo é igual ao atual THEN o sistema SHALL não gravar e não avisar

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| COR-01 | P1: A categoria tem uma cor | Execute | Implementing: `CORES_DE_CATEGORIA` com as dez cores na ordem do AC 1, `corAutomatica` sempre uma das dez, igual para nomes que diferem só em caixa, acento ou espaços, e derivada do nome, AC 3, nome normalizado vazio na primeira cor, Edge Case, `corDaCategoria` com a escolhida vencendo a automática e a automática quando nula, ACs 2 e 3, `ehCorDeCategoria` aceitando só as dez (T1); `categoria.cor` texto nulável com o `CHECK` `categoria_cor_valida`, que aceita as dez e recusa `dourado`, AC 4, migration `0004_cor_da_categoria` só com `ADD COLUMN` e `ADD CONSTRAINT`, categoria criada pelo repositório nascendo com `cor` nula, AC 5, e `atualizarCategoria` gravando a cor, apagando com `null` e gravando nome e cor numa escrita só, AC 2 (T2) |
| COR-02 | P1: Paleta medida nos dois temas | Execute | Implementing: `--cat-<cor>-fundo`, `-texto` e `-barra` com `light-dark()` para as dez, expostos como `--color-cat-*`, AC 1, texto ≥ 4,5:1 sobre o fundo e barra ≥ 3:1 sobre o canvas nos dois temas, calculados de `globals.css` pelo teste, ACs 2 e 3, e `CLASSES_DA_COR` com as classes por extenso, uma entrada por cor (T3) |
| COR-03 | P1: A cor aparece onde a categoria aparece | Tasks | Pending |
| COR-04 | P1: Tela de Categorias | Tasks | Pending |
| COR-05 | P2: A decisão de design registrada | Execute | Implemented: seção "Cor por categoria" em `docs/design.md` com a paleta, as medições, os limites e o que o validador de paleta reprovou, AC 1, os trechos de "Escala do gráfico de composição", "Semântica de valor" e os comentários do gráfico em `globals.css` revistos, AC 2, e a AD-018 em `.specs/STATE.md`, AC 3 (T3) |

**Coverage:** 5 total, 5 mapped to tasks, 0 unmapped.

---

## Success Criteria

- [ ] A mesma categoria tem a mesma cor em "Todo mês", em Lançamentos e na Visão geral
- [ ] Trocar a cor de uma categoria leva um toque, na tela de Categorias
- [ ] Todo par texto/fundo passa de 4,5:1 e toda barra passa de 3:1, medidos no navegador, nos dois
      temas
