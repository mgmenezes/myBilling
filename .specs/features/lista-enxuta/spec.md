# Lista de Lançamentos enxuta: Specification

> Pedido do dono em 2026-10-29, com a lista de fevereiro aberta: "quanto mais fixos eu tenho mais
> eu tenho barra de rolagem, isso se torna ruim, vamos planejar filtros para as categorias". E
> sobre o bloco do cartão: "a tabela sai de uma margem determinada e o texto que fica em parcelas
> fica todo apertado". Plano aprovado no mesmo dia
> (`~/.claude/plans/stateless-roaming-lighthouse.md`).

## Problem Statement

Com dezenas de fixos e parcelas no mês, a lista de Lançamentos ocupa quase três telas. O dono a usa para
conferir o que falta pagar, achar um lançamento e ver quanto foi por categoria. Para isso, os
filtros existem só no topo, como selects: quem desceu até o meio da lista sobe de novo para mudar um
filtro, e o filtro de categoria não diz quanto foi para cada uma.

No bloco do Cartão de Crédito, as seis colunas não cabem na coluna de conteúdo: a tabela passa da
margem e a coluna Parcela fica tão estreita que "(faltam 3 depois desta)" quebra palavra por
palavra.

## Goals

- [ ] Filtrar por categoria com um toque, vendo o total de cada uma, sem subir até o topo da página
- [ ] Recolher um bloco inteiro e encontrá-lo recolhido na próxima visita
- [ ] Ir de uma categoria da Visão geral direto para os lançamentos dela
- [ ] Nenhuma tabela da lista passa da margem, e o texto da parcela fica legível

## Out of Scope

| Feature | Reason |
| --- | --- |
| Atalho "Falta pagar" | Oferecido e não escolhido pelo dono; o filtro de Situação continua no cartão de filtros |
| Filtrar por várias categorias ao mesmo tempo | O filtro atual é de uma categoria; manter a URL e os links que já existem |
| Agrupar a lista por categoria | Opção apresentada e preterida pelos chips |
| Recolher por mês ou por filtro | O estado recolhido é do bloco, igual em todos os meses |
| Densidade compacta no toque | Os alvos de 44×44 do celular continuam (UI-03) |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Forma do filtro de categoria | Chips com o total do mês | Decisão do dono | y |
| Extras desta rodada | Blocos que recolhem, barra compacta ao rolar, Visão geral leva à lista | Decisão do dono | y |
| Parcela no Cartão | Sob a descrição; a coluna Parcela sai e o BLOCO-01 AC 7 é substituído | Decisão do dono | y |
| Barra ao rolar | Barra compacta com busca, filtros ativos removíveis e "Filtros" | Decisão do dono | y |
| Seleção dos chips | Uma categoria por vez; tocar no chip ativo limpa | Mantém o parâmetro `categoriaId` e os links existentes | n (decisão do autor) |
| Quantos chips visíveis | 6, os de maior total, e "+N categorias" para o resto | Uma linha e meia no computador, sem cortar nenhum | n (decisão do autor) |
| Total do chip | O gasto da competência por categoria, de `resumoPorCategoria`, sem depender dos outros filtros | É o mesmo número de "Gastos por categoria" da Visão geral | n (decisão do autor) |
| Chave de "Sem categoria" | `sem-categoria`, a mesma que a Visão geral já usa | Uma chave só nas duas telas | n (decisão do autor) |
| Onde o estado recolhido fica | Cookie `blocos-recolhidos`, lido no servidor | Sem o cookie, a página abriria o bloco e só depois o fecharia | n (decisão do autor) |
| Densidade no computador | Com ponteiro fino, seletor de 36px e linha mais baixa | Menos rolagem onde não há toque | n (decisão do autor) |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Filtrar por categoria com o total ⭐ MVP — LST-01

**User Story**: Como quem confere o mês, quero tocar numa categoria e ver só os lançamentos dela,
sabendo quanto foi para ela, para não descer a lista inteira.

**Why P1**: É o pedido central do dono.

**Acceptance Criteria**

1. WHEN a lista de Lançamentos é exibida THEN o sistema SHALL mostrar, no cartão de filtros e no
   lugar do select "Categoria", um chip por categoria com despesa na competência, com o nome e o
   gasto dela formatado, por exemplo "Categoria Um · R$ 300,00", em ordem decrescente de gasto
2. The system SHALL calcular o gasto de cada chip com `resumoPorCategoria`, o mesmo cálculo de
   "Gastos por categoria" da Visão geral, sem depender dos outros filtros ativos
3. WHERE há despesa sem categoria na competência the system SHALL mostrar o chip "Sem categoria",
   que filtra por `categoriaId=sem-categoria`
4. WHEN há mais de 6 categorias THEN o sistema SHALL mostrar as 6 de maior gasto e um botão "+N
   categorias", com `aria-expanded`, que revela as outras na mesma coleção, que quebra linha e não
   corta nenhum chip
5. WHEN a pessoa toca num chip THEN o sistema SHALL filtrar a lista por aquela categoria, gravando
   `categoriaId` na URL e mantendo os outros filtros
6. WHEN a pessoa toca no chip da categoria ativa THEN o sistema SHALL tirar o filtro de categoria
7. The system SHALL expor cada chip como botão com `aria-pressed` igual a "true" só no chip ativo
8. WHEN o filtro muda THEN o sistema SHALL anunciar a nova contagem uma vez, como frase, numa região
   `role="status"`
9. WHEN a URL traz `categoriaId=sem-categoria` THEN o sistema SHALL listar só os gastos sem
   categoria; a receita sem categoria não entra, porque a lista a mostra como "Receita" (TRC-01) e
   o total do chip "Sem categoria" não a soma

**Independent Test**: em fevereiro, tocar em "Assinaturas" deixa só as assinaturas na lista, e o
total do chip é o mesmo da barra de Assinaturas na Visão geral.

---

### P1: Blocos que recolhem ⭐ MVP — LST-02

**User Story**: Como quem não precisa ver os fixos agora, quero recolher o bloco inteiro e saber o
resumo dele, para chegar aos outros sem rolar.

**Why P1**: Escolhido pelo dono para esta rodada.

**Acceptance Criteria**

1. The system SHALL mostrar no cabeçalho de cada bloco (Entradas, Fixos, Cartão de Crédito e
   Gastos do Mês) a contagem, o total e quantos lançamentos estão a pagar, por exemplo "12 · R$
   1.200,00 · 8 a pagar", considerando os filtros ativos
2. WHEN a pessoa aciona o cabeçalho de um bloco THEN o sistema SHALL recolher ou expandir as linhas
   dele, com o botão expondo `aria-expanded` e `aria-controls`
3. WHEN um bloco é recolhido ou expandido THEN o sistema SHALL guardar o estado no cookie
   `blocos-recolhidos`
4. WHEN a página é carregada com o cookie THEN o sistema SHALL renderizar no servidor os blocos
   recolhidos já fechados
5. WHILE não há cookie o sistema SHALL mostrar todos os blocos abertos

**Independent Test**: recolher Fixos, recarregar a página e encontrar Fixos recolhido com o resumo
no cabeçalho.

---

### P1: Barra compacta de filtros ao rolar ⭐ MVP — LST-03

**User Story**: Como quem está no meio da lista, quero buscar ou tirar um filtro sem voltar ao
topo.

**Why P1**: Escolhido pelo dono para esta rodada.

**Acceptance Criteria**

1. WHILE o cartão de filtros está fora da tela o sistema SHALL mostrar fixa no topo uma barra com o
   campo de busca, os filtros ativos e o botão "Filtros"
2. WHILE o cartão de filtros está visível o sistema SHALL esconder a barra compacta
3. WHEN a pessoa digita na busca da barra THEN o sistema SHALL filtrar pelo mesmo parâmetro `busca`
   da URL, com a mesma espera de 250 ms do cartão
4. The system SHALL mostrar cada filtro ativo na barra como um botão com o nome do filtro e "×", com
   nome acessível "Tirar o filtro <nome>", que tira só aquele filtro
5. WHEN a pessoa aciona "Filtros" THEN o sistema SHALL rolar até o cartão de filtros e focar o
   primeiro controle dele
6. The system SHALL reservar no topo da rolagem (`scroll-padding-top`) a altura da barra, para que
   ela não cubra o elemento com foco
7. WHILE a largura é de 400 px o sistema SHALL mostrar no máximo 2 filtros ativos na barra e "+N"
   para os outros, sem rolagem horizontal

**Independent Test**: com "Casa" filtrado, rolar até o fim da lista mostra a barra com "Casa ×";
tocar no "×" volta a mostrar todos os lançamentos.

---

### P1: Visão geral leva à lista ⭐ MVP — LST-04

**User Story**: Como quem vê uma categoria alta na Visão geral, quero tocar nela e ver os
lançamentos que a formam.

**Why P1**: Escolhido pelo dono para esta rodada.

**Acceptance Criteria**

1. WHEN a pessoa aciona uma categoria em "Gastos por categoria" THEN o sistema SHALL abrir a lista
   de Lançamentos da mesma competência filtrada por `categoriaId` daquela categoria
2. WHEN a categoria acionada é "Sem categoria" THEN o sistema SHALL abrir a lista com
   `categoriaId=sem-categoria`
3. The system SHALL manter no link o texto que a barra já tem (nome, valor e porcentagem), para que
   o leitor de tela diga aonde ele leva

**Independent Test**: tocar na barra "Assinaturas" de fevereiro abre Lançamentos de fevereiro com o
chip Assinaturas ativo.

---

### P1: Tabela do Cartão dentro da margem ⭐ MVP — LST-05

**User Story**: Como quem confere a fatura, quero ver as parcelas sem a tabela passar da margem nem
o texto quebrar palavra por palavra.

**Why P1**: Defeito de layout apontado pelo dono.

**Acceptance Criteria**

1. WHERE a despesa do bloco Cartão de Crédito é parcela de compra parcelada the system SHALL mostrar,
   numa segunda linha sob a descrição, o número e o total da parcela seguidos de "(faltam N depois
   desta)" ou "(última)", por exemplo "2/4 · (faltam 2 depois desta)"
2. The system SHALL não exibir a coluna "Parcela" em nenhum bloco; este AC substitui o BLOCO-01 AC 7
3. WHILE a largura é de 1024, 1280 ou 1440 px nenhuma tabela da lista SHALL ser mais larga que a
   coluna de conteúdo
4. WHILE o ponteiro é fino (`pointer: fine`) o seletor de categoria da linha SHALL ter 36 px de
   altura; no toque SHALL manter 44 px
5. The system SHALL dar ao seletor de categoria uma largura fixa a partir de `md`, com o nome
   inteiro da categoria escolhida no atributo `title`

**Independent Test**: num mês com compra parcelada, a 1280 px, a tabela do Cartão termina antes da margem direita e
"2/4 · (faltam 2 depois desta)" aparece sob "Compra B".

---

## Edge Cases

- WHEN o mês não tem despesa THEN o sistema SHALL não mostrar chips de categoria
- WHEN o filtro de categoria esconde todas as linhas de um bloco THEN o cabeçalho do bloco SHALL
  mostrar "0" e a frase de bloco vazio que já existe
- WHEN o cookie traz um nome de bloco que não existe THEN o sistema SHALL ignorá-lo

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| LST-01 | P1: Filtrar por categoria com o total | Execute | Implemented (2026-10-29); Needs Fix na rodada 1 do Verifier (`validation.md`, 2026-10-29: AC 1, o texto visível do chip), corrigido pela F1, e AC 9 reescrito pela F4 como "só os gastos sem categoria", sem a receita; aguardando o Verifier na rodada 2: `categoriaId=sem-categoria` lista só os gastos de categoria nula, sem a receita, que a lista mostra como Receita, e combina com os outros filtros por interseção; um id continua filtrando por ele e, sem `categoriaId`, nada muda, AC 9 (T1); chips como botões "Nome · R$ 1.234,56" na ordem recebida, AC 1, `aria-pressed="true"` só no ativo, inclusive na ativa além das 6 primeiras, AC 7, tocar chamando `aoEscolher(id)` e, no ativo, `aoEscolher(null)`, ACs 5 e 6, 6 chips e "+3 categorias" com `aria-expanded` que revela as 9 na mesma coleção, que quebra linha e não corta nenhum chip, AC 4, e nada sem categorias, Edge Case (T2); no cartão de filtros, os chips no lugar do select "Categoria", com Meio, Pessoa e Situação mantidos, AC 1, escolher um chip gravando `categoriaId` e mantendo busca, meio, pessoa e situação, AC 5, o chip ativo tirando só `categoriaId`, AC 6, o chip da URL pressionado, AC 7, e a contagem como frase na única região `role="status"` do cartão, AC 8; `totaisPorCategoria` tirando os totais de `resumoPorCategoria`, centavo por centavo, do maior para o menor, com `sem-categoria` e o nome "Sem categoria" para o grupo nulo e nada num mês sem despesa, ACs 1 a 3 e Edge Case, e a página passando a ele a lista do mês antes do filtro (T3); de ponta a ponta, os seis chips do maior para o menor no lugar do select, o total de Categoria Dois igual ao da barra dela na Visão geral, os totais iguais com a busca ativa, o chip mantendo a busca e o ativo tirando só a categoria, "+4 categorias" revelando as quatro outras dentro do cartão e "Sem categoria" listando só o gasto sem categoria (T8); na tela, e não só no `textContent`, um espaço entre o "·" e o total: nome, separador e valor num único item do flex do chip, e pelo menos 2 px entre o glifo "·" e o total nos seis chips, medidos no navegador, AC 1 (F1) |
| LST-02 | P1: Blocos que recolhem | Execute | Verified na rodada 1 (`validation.md`, 2026-10-29); aguardando o Verifier na rodada 2, que fecha a fatia: resumo "N · R$ X · M a pagar" no cabeçalho dos quatro blocos, contado sobre as linhas recebidas, com o vencido como a pagar, AC 1, e "0 · R$ 0,00 · 0 a pagar" com a frase de bloco vazio, Edge Case; o título como botão com `aria-expanded` e `aria-controls`, que esconde e devolve as linhas do bloco e só dele, AC 2; cada clique gravando em `blocos-recolhidos`, com `path=/` e um ano, as chaves recolhidas naquele momento, AC 3; `recolhidos={["FIXOS"]}` fechando Fixos no HTML do servidor e no primeiro render, AC 4, e a página lendo o cookie com `cookies()`; sem cookie, os quatro abertos, AC 5, e chave desconhecida ignorada, Edge Case (T4); de ponta a ponta, "10 · R$ 200,00 · 10 a pagar" no cabeçalho de Fixos, recolher, recarregar e encontrar Fixos recolhido com o resumo, e o HTML do servidor já com `linhas-fixos` `hidden` (T8) |
| LST-03 | P1: Barra compacta de filtros ao rolar | Execute | Verified na rodada 1 (`validation.md`, 2026-10-29); aguardando o Verifier na rodada 2, que fecha a fatia: a barra observando o cartão pelo id e aparecendo fixa no topo, com busca, filtros ativos e "Filtros", só com o cartão fora da tela, e sumindo quando ele volta, ACs 1 e 2; a busca da barra gravando `busca` aos 250 ms e não antes, com os outros parâmetros mantidos, e o cartão seguindo o termo da barra sem desfazê-lo, AC 3; cada filtro ativo como botão "Casa ×" chamado "Tirar o filtro Casa" que tira só o seu parâmetro, e `filtrosAtivos` dando a cada parâmetro o nome que a pessoa lê, sem a busca, AC 4; "Filtros" rolando até o cartão e focando o primeiro controle, AC 5; `--altura-da-barra-de-filtros` em `globals.css`, usada no `scroll-padding-top` do `html` e na altura da barra, AC 6; a partir do terceiro filtro, escondido abaixo de `sm`, com "+1" só abaixo de `sm` e o rótulo longo truncado no botão, AC 7, por classe; a medição em 400 px fica com a T8 (T5); de ponta a ponta, a barra ausente com o cartão na tela, presente ao rolar até o fim com busca, "Filtros" e "Categoria Um ×", o × tirando o filtro e a barra sumindo de volta ao topo, e em 400 px dois filtros, "+1" e nenhuma rolagem horizontal, AC 7 (T8) |
| LST-04 | P1: Visão geral leva à lista | Execute | Verified na rodada 1 (`validation.md`, 2026-10-29); aguardando o Verifier na rodada 2, que fecha a fatia: cada barra de "Gastos por categoria" como link para `/<competencia>/lancamentos?categoriaId=<id>`, uma por fatia e na ordem do gráfico, AC 1; "Sem categoria" levando a `categoriaId=sem-categoria`, com a página usando `SEM_CATEGORIA` no lugar do literal, AC 2; o nome acessível do link igual ao texto da barra, "Categoria Um R$ 300,00 75,00%", AC 3; a página passando a competência aberta ao gráfico; o percurso da Visão geral até o chip ativo fica com a T8 (T7); de ponta a ponta, a barra de Categoria Dois abrindo a lista com o chip dela pressionado e só a compra dela, e a de Sem categoria abrindo `categoriaId=sem-categoria` com o chip pressionado (T8) |
| LST-05 | P1: Tabela do Cartão dentro da margem | Execute | Implemented (2026-10-29); Needs Fix na rodada 1 do Verifier (`validation.md`, 2026-10-29: AC 1, o limiar de "(última)"; AC 3, só a tabela do Cartão medida), corrigido pela F2 e pela F3; aguardando o Verifier na rodada 2: a parcela como segunda linha da célula de descrição, menor e apagada, "2/4 · (faltam 2 depois desta)" e "4/4 · (última)", com o número `tabular` e os textos de PARC-08 iguais, AC 1; nenhum `columnheader` "Parcela" nos quatro blocos, e o BLOCO-01 AC 7 anotado como substituído, AC 2; o seletor com `pointer-fine:min-h-9` e `min-h-11`, AC 4, e com `md:w-44`, reticências e o nome inteiro da escolhida, a otimista inclusive, no `title`, AC 5; a linha com `md:pointer-fine:py-2.5`; a medição a 1024, 1280 e 1440 px fica com a T8, AC 3 (T6); abaixo de `md`, o seletor com `w-full`, para o nome longo não alargar a tabela em 400 px (ajuste achado pela T8); de ponta a ponta, em 1024, 1280 e 1440 px, a tabela do Cartão dentro da coluna de conteúdo pelo `boundingBox`, sem rolagem horizontal, com as colunas Descrição, Categoria, Data, Situação e Valor, e "2/4 · (faltam 2 depois desta)" na célula da descrição, abaixo do texto dela, AC 3 (T8); na penúltima, "3/4 · (faltam 1 depois desta)", e não "(última)", AC 1 (F2); em 1024, 1280 e 1440 px, todas as tabelas da lista, Fixos, Cartão de Crédito e Gastos do Mês, dentro da coluna de conteúdo, AC 3, e, com ponteiro fino, os seletores com 36 px de altura e 176 px de largura medidos no navegador, ACs 4 e 5 (F3) |

**Coverage:** 5 total, 5 mapped to tasks, 5 implemented, 0 unmapped

---

## Success Criteria

- [ ] Filtrar por uma categoria leva um toque, de qualquer altura da lista
- [ ] Recolher Fixos reduz a rolagem de fevereiro para menos de uma tela e meia, e continua
      recolhido depois de recarregar
- [ ] A tabela do Cartão cabe na margem a 1024, 1280 e 1440 px
