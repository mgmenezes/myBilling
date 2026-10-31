# Lançamentos em lista densa: Specification

> Pedido do dono em 2026-10-30, na rodada de aproveitamento de tela inspirada na Coinbase, depois da
> Visão geral em três colunas: "vamos começar agora na tela de lançamentos". Ele escolheu o quadro
> "A · Lista densa e filtros à direita" do canvas https://claude.ai/artifact/BudAVPGf3RQNqhr1TBWkBs
> (privado, só do dono).

## Problem Statement

Lançamentos é a tela onde o dono confere o mês linha a linha. Num monitor grande ela mostra poucas
linhas por vez:
- **Linhas altas:** cada linha mede uns 65 px, porque tem dois botões em pílula ("Previsto" ou
  "Pago" e "Excluir"). A linha da parcela ainda ganha uma segunda linha de texto.
- **Filtros no topo:** o cartão de filtros ocupa uns 330 px antes da primeira linha.
- **Ações espalhadas:** os botões repetidos em toda linha competem com a descrição e o valor, que
  são o que se lê.

## Goals

- [ ] Ver o dobro de lançamentos por tela no monitor grande, sem perder informação
- [ ] Filtros sempre à mão, sem empurrar a lista para baixo
- [ ] Menos botões à vista, com cada ação ainda a um clique

## Out of Scope

| Feature | Reason |
| --- | --- |
| Editar um lançamento avulso ou uma compra | Fatia própria (`editar-lancamentos`); o menu "⋯" nasce só com "Excluir" |
| Mudar o celular | Abaixo de 768 px, cada lançamento continua um cartão, como hoje |
| Mudar o que os filtros fazem | Mesmos parâmetros da URL, mesmas regras e mesmos totais (REDE-01, LST-01) |
| Mudar o cadastro | "+ Novo lançamento" continua abrindo o diálogo de hoje |
| Todo mês e Cadastros | Rodadas próprias |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Estrutura | Lista densa no centro e filtros numa coluna à direita (quadro A) | Escolha do dono sobre o protótipo | y |
| Texto da parcela | Curto e na mesma linha, ao lado da descrição: "2/4 · faltam 2", e "4/4 · última" na última | Escolha do dono; substitui a segunda linha de LST-05, AC 1 | y |
| Onde fica "Excluir" | Num menu "⋯" na célula da Situação do avulso, logo à direita do selo e do "Vencido", em todas as larguras, com a confirmação em dois toques de hoje | Escolha do dono; funciona igual com mouse, teclado e toque. Substitui a confirmação "na própria linha" de AVUL-03, AC 7: ela continua dentro da linha, no menu. O lugar foi confirmado pelo dono em 2026-10-30, quando perguntado depois da rodada 1 do Verifier: o protótipo punha o "⋯" no fim da linha, e ele preferiu ao lado do selo, para os valores ficarem alinhados numa coluna só e a tabela manter as cinco colunas (LST-05) | y |
| Como o menu "⋯" é feito | Um botão que mostra e esconde um painel dentro da própria linha, com `aria-expanded`; o "Excluir" de dentro é o botão de hoje | Mantém a confirmação em dois toques, que se desarma ao perder o foco, e as consultas presas à linha | n (decisão do autor) |
| Linha baixa | Só com ponteiro fino e a partir de 768 px; no toque e abaixo de 768 px, os alvos continuam com 44 px | TOQUE-01 vale para o toque; a densidade é do mouse, como o seletor de 36 px de LST-05 | n (decisão do autor) |
| Onde a coluna de filtros começa | A partir de 1.536 px; abaixo disso, os filtros ficam no topo, no cartão de hoje | Medido na T2: em 1.280 px, menu e coluna deixariam 656 px para a lista, menos que os 736 px de hoje, e a descrição espremeria. Em 1.536 px a lista tem 912 px | n (decisão do autor) |
| Onde a linha baixa é garantida | Até 48 px a partir de 1.280 px com ponteiro fino; em 1.024 px uma parcela pode quebrar para baixo | Em 1.024 px a descrição fica com cerca de 130 px, e "Compra B 2/4 · faltam 2" não cabe | n (decisão do autor) |
| Barra de filtros compacta | Não aparece a partir de 1.536 px; abaixo disso, funciona como hoje (LST-03) | Com a coluna presa ao rolar, os filtros já estão sempre à vista | n (decisão do autor) |
| Contagem e total do que está visível | Ficam no alto da coluna de filtros, como hoje no fim do cartão | É o resumo do filtro, e fica junto dele | n (decisão do autor) |
| Categorias na coluna | Os chips de hoje (cor, "Nome · R$ X", escolha única, "+N categorias"), quebrando linha na largura da coluna | O protótipo mostrava uma lista vertical; os chips na coluna estreita ficam quase um por linha e mantêm o controle já provado (LST-01, COR-03) | n (decisão do autor) |
| Situação na coluna | O mesmo seletor de hoje, com as mesmas opções | O protótipo mostrava um alternador; o seletor evita mudar o filtro nesta fatia | n (decisão do autor) |
| Título do bloco | Preso no alto ao rolar as linhas do bloco, com o resumo ao lado, a partir de 1.536 px | Ao rolar uma lista longa, a pessoa continua sabendo em que bloco está. Abaixo de 1.536 px a barra compacta ocupa o alto da tela, e os dois disputariam o lugar | n (decisão do autor) |
| Valor confirmável do fixo | "previsto" ou "confirmado · previa R$ X" na mesma linha, à esquerda do valor | Mantém os dois valores e a palavra "confirmado" à vista (FIXO-04, AC 3) sem segunda linha | n (decisão do autor) |
| Largura da lista e da coluna | Lista até 1.100 px, centrada entre o menu e a coluna; coluna de filtros com 288 px; células com 12 px de respiro lateral com ponteiro fino | Medido na T4: com a lista em 1.000 px e a coluna em 320 px, sobravam 936 px úteis, e a linha do fixo confirmado e vencido quebrava. A razão dos 1.024 px (descrição longe do valor) continua valendo: são cinco colunas ocupando a largura, e não uma linha esticada. Substitui TRES-01, AC 8 só em Lançamentos | n (decisão do autor) |
| Celular | Cartão por lançamento abaixo de 768 px, como hoje; só o "Excluir" vai para o menu "⋯" e a parcela fica curta | O dono usa sobretudo o monitor grande; o menu e a parcela valem para a lista inteira | n (decisão do autor) |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Uma linha por lançamento ⭐ MVP — DENS-01

**User Story**: Como quem confere o mês, quero cada lançamento numa linha baixa, para ver o dobro
deles por tela.

**Why P1**: É o incômodo "poucas linhas por tela", o maior da tela.

**Acceptance Criteria**

1. WHEN a lista é exibida a partir de 1.280 px com ponteiro fino THEN o sistema SHALL desenhar
   cada linha das tabelas com no máximo 48 px de altura, inclusive a de parcela, a de fixo com
   valor confirmado e a de lançamento vencido
2. The system SHALL mostrar a parcela logo depois da descrição, na mesma célula, em texto menor e
   apagado, como "2/4 · faltam 2" e, na última parcela, "4/4 · última"
3. The system SHALL mostrar a situação como um selo compacto, "Pago" ou "Previsto", que ao ser
   acionado alterna o pagamento como o botão de hoje, com o mesmo nome acessível
4. WHEN o lançamento está vencido THEN o sistema SHALL mostrar "Vencido" ao lado do selo, como hoje
5. WHEN a linha é de um fixo com valor confirmável THEN o sistema SHALL mostrar "previsto" ou
   "confirmado · previa R$ X" na mesma linha do valor, à esquerda dele
6. The system SHALL manter as colunas Descrição, Categoria, Data, Situação e Valor, e o seletor de
   categoria na linha, com o comportamento de hoje (TRC)

**Independent Test**: em 1.920 px, com uma compra em 3 parcelas, um fixo confirmado e um avulso,
toda linha mede até 48 px e a parcela mostra "2/3 · faltam 1" ao lado da descrição.

---

### P1: Excluir no menu da linha ⭐ MVP — DENS-02

**User Story**: Como quem lê a lista, quero as ações fora do caminho, para a linha mostrar só o
que importa.

**Why P1**: É o incômodo "muita coisa em botão".

**Acceptance Criteria**

1. The system SHALL mostrar, na célula da Situação de cada lançamento avulso, logo depois do selo e
   do "Vencido", um botão "⋯" com o nome acessível "Mais ações para <descrição>" (lugar confirmado
   pelo dono em 2026-10-30)
2. The system SHALL não mostrar o botão "⋯" nas linhas de parcela e de fixo, que não têm ação
   além das que já estão na linha
3. WHEN o botão "⋯" é acionado THEN o sistema SHALL abrir um menu com "Excluir"
4. WHEN "Excluir" é acionado no menu THEN o sistema SHALL pedir a confirmação em dois toques de
   hoje e, confirmada, excluir o lançamento como hoje
5. WHEN o menu está aberto e a pessoa aperta `Escape` ou clica fora THEN o sistema SHALL fechar o
   menu e, no `Escape`, devolver o foco ao botão "⋯"
6. The system SHALL não mostrar o botão "Excluir" fora do menu em nenhuma largura
7. WHEN a lista é exibida abaixo de 768 px ou com ponteiro grosso THEN o sistema SHALL desenhar o
   botão "⋯" e o "Excluir" do menu com ao menos 44 por 44 px (TOQUE-01)

**Independent Test**: em 1.920 px, abrir o "⋯" de um avulso, excluir e confirmar; a linha some e
o total do bloco cai.

---

### P1: Filtros numa coluna à direita ⭐ MVP — DENS-03

**User Story**: Como quem procura um lançamento, quero os filtros sempre à vista ao lado da lista,
para filtrar sem rolar até o topo.

**Why P1**: É o que libera o alto da tela para a lista.

**Acceptance Criteria**

1. WHEN Lançamentos é exibida a partir de 1.536 px THEN o sistema SHALL mostrar os filtros numa
   coluna à direita da lista, separada por uma linha fina, com a busca, as categorias com o total
   de cada uma, a situação, o meio de pagamento e a pessoa
2. WHILE a página rola a partir de 1.536 px THE system SHALL manter a coluna de filtros à vista
3. The system SHALL mostrar no alto da coluna a contagem e o total do que está visível, como hoje
4. The system SHALL mostrar as categorias da coluna com os chips de hoje, com a cor, o total, a
   escolha e o "+N categorias" de hoje (LST-01, COR-03), quebrando linha na largura da coluna
5. WHEN Lançamentos é exibida com menos de 1.536 px THEN o sistema SHALL mostrar os filtros no topo,
   como hoje
6. WHILE a página rola a partir de 1.536 px THE system SHALL não mostrar a barra de filtros compacta
7. The system SHALL manter os mesmos parâmetros da URL e o mesmo resultado de cada filtro (REDE-01,
   LST-01)
8. WHEN Lançamentos é exibida a partir de 1.536 px THEN o sistema SHALL limitar a lista a 1.100 px
   de largura, centrada no espaço entre o menu e a coluna de filtros

**Independent Test**: em 1.920 px, filtrar por uma categoria na coluna, rolar até o fim e ver a
coluna ainda à vista, sem a barra compacta; em 1.535 px, os filtros estão no topo.

---

### P2: Títulos dos blocos presos ao rolar — DENS-04

**User Story**: Como quem rola uma lista longa, quero ver em que bloco estou, para não confundir um
fixo com um gasto do mês.

**Why P2**: Com linhas mais baixas, o bloco fica mais longo na tela e o título sai de vista mais
rápido.

**Acceptance Criteria**

1. WHILE as linhas de um bloco passam pelo alto da tela a partir de 1.536 px THE system SHALL manter
   o título desse bloco, com o resumo, preso no alto
2. The system SHALL manter o recolher e expandir de cada bloco, com a escolha guardada, como hoje
   (LST-02)

**Independent Test**: em 1.920 px, rolar até o meio de "Fixos" e ver o título "Fixos" no alto da
tela.

---

## Edge Cases

- Bloco recolhido: o título continua no lugar, sem linhas para prender
- Lançamento vencido e pago ao mesmo tempo não existe: pago nunca é vencido (`situacaoDe`)
- Descrição longa: quebra linha, e só aquela linha fica mais alta (decisão do autor: cortar com
  reticências pediria largura fixa na coluna e arriscaria a tabela sair da margem, LST-05, AC 3)
- Avulso com confirmação de excluir aberta e a pessoa clica fora: o menu fecha e a confirmação se
  desfaz
- Entre 768 px e 1.536 px: linhas densas, filtros no topo, barra compacta como hoje e títulos dos
  blocos sem prender; entre 768 px e 1.280 px, a parcela de uma descrição longa pode quebrar para
  baixo
- Valor do fixo em edição: o campo e os botões de confirmar ocupam mais de uma linha enquanto a
  edição está aberta, como hoje
- Erro ao trocar a categoria: a mensagem aparece embaixo do seletor e a linha cresce, como hoje

## O que esta fatia substitui

- LST-05, AC 1: a parcela deixa a segunda linha e fica curta, logo depois da descrição (DENS-01,
  ACs 1 e 2)
- LST-05, AC 3: a partir de 1.536 px, a "coluna de conteúdo" das tabelas é a lista, e não o cartão de
  filtros, que virou a coluna da direita
- LST-03, ACs 1 e 2: a barra compacta vale abaixo de 1.536 px (DENS-03, AC 6)
- AVUL-03, AC 7, e TOQUE-01, AC 2: a confirmação de excluir e o alvo de 44 px ficam no menu da
  linha (DENS-02)
- TRES-01, AC 8, e AD-019: Lançamentos deixa a `AreaEstreita` (DENS-03, AC 8)

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| DENS-01 | P1: Uma linha por lançamento | Execute | In progress: `texto-da-parcela.test.ts` prova "faltam 2", "faltam 1" e "última"; `tabela-lancamentos.test.tsx` prova "2/4 · faltam 2", "3/4 · faltam 1" e "4/4 · última" na célula da descrição, em linha e com o número tabular; `lista-enxuta.spec.ts` mede a parcela na mesma altura da descrição, e `compra-parcelada.spec.ts` lê "8/10 · faltam 2" e "10/10 · última", AC 2 (T1); `lancamentos-densos.spec.ts` mede toda linha com até 48 px em 1.280 e 1.920 px, inclusive a parcela, o fixo confirmado e o vencido, AC 1, o selo com o mesmo nome e o mesmo `aria-pressed` alternando o pagamento, AC 3, "Vencido" à direita do selo, AC 4, e "confirmado · previa R$ 100,00" à esquerda do valor, na mesma altura, AC 5; os e2e de TRC, FIXO-04, VENC-01 e TOQUE-01 passam sem mudança, AC 6 (T2); a altura medida também em 1.536 px, a janela mais estreita com a coluna aberta (T4) |
| DENS-02 | P1: Excluir no menu da linha | Execute | In progress: `menu-da-linha.test.tsx` prova o "⋯" com o nome "Mais ações para Almoço" e sem "Excluir" à vista, AC 1, o menu aberto com "Excluir", AC 3, os dois toques com o menu aberto, AC 4, e o `Escape` e o clique fora fechando, com o foco de volta ao "⋯", AC 5; `tabela-lancamentos.test.tsx` prova o "⋯" no avulso e na receita avulsa e a ausência dele na parcela e no fixo, AC 2; `lancamentos-densos.spec.ts` prova, em 1.920 px, o "⋯" só nos avulsos e nenhum "Excluir" fora do menu, ACs 1, 2 e 6, e o `Escape`, o foco e a exclusão em dois toques baixando o bloco de R$ 50,00 para R$ 30,00, ACs 3 a 5; `acessibilidade.spec.ts` mede o selo, o "⋯" e o "Excluir" do menu com 44 × 44 em 400 px, AC 7; os e2e de AVUL-03 abrem o menu antes (T3); `lancamentos-densos.spec.ts` mede, em 1.920 px, a caixa do "⋯" de Entrada A, Item A e Item B dentro da célula da Situação e à direita do selo, e a do vencido também à direita de "Vencido", AC 1 (F1) |
| DENS-03 | P1: Filtros numa coluna à direita | Execute | In progress: `lancamentos-densos.spec.ts` prova, em 1.920 px, os filtros à direita da lista com o `border-left` computado de 1px e com busca, chips, meio, pessoa e situação, AC 1, a contagem acima da busca, AC 3, o chip "Categoria Um" dentro da coluna filtrando a lista, ACs 4 e 7, e a lista com até 1.100 px, centrada, AC 8; rolando até o fim em 1.920 × 480, a busca à vista e nenhuma barra compacta, ACs 2 e 6; em 1.535 px o cartão acima da lista e em 1.536 px à direita dela, ACs 1 e 5; `busca-e-filtros.spec.ts`, `lista-enxuta.spec.ts` e `categorias.spec.ts` passam sem mudança, AC 7 (T4) |
| DENS-04 | P2: Títulos dos blocos presos ao rolar | Execute | In progress: `lancamentos-densos.spec.ts` rola até o meio de "Fixos" e mede o título no alto, com "Fixo B" à vista, em 1.536 px, e o título fora da tela em 1.535 px, AC 1; recolher e expandir "Fixos" escondem e mostram as linhas com o título preso, e `lista-enxuta.spec.ts` (LST-02) passa sem mudança, AC 2 (T5) |

---

## Success Criteria

- [ ] Em 1.920 px, a lista mostra pelo menos o dobro de linhas que mostrava antes na mesma altura
- [ ] Nenhum filtro, total ou ação some: tudo continua a no máximo um clique
- [ ] Nenhuma mudança de banco
