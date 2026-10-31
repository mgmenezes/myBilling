# Cadastros em abas, com o item aberto à direita: Validation

## Validation: cadastros-colunas, rodada 1 — FAIL ❌

**Date**: 2026-10-31
**Spec**: `.specs/features/cadastros-colunas/spec.md`
**Diff range**: `e8b1540..e4789ef`, a fatia inteira: 22 commits, um por task (T1 a T22).
**Verifier**: sub-agente independente (autor ≠ verificador), rodada 1

**Resumo do veredito.**
- **Gate verde, nas duas pontas.**
  - `pnpm verify` saiu 0: `typecheck`, `lint`, 2.087 unitários em 132 arquivos, branches de
    `src/domain` em 393/393, 406 de integração em 25 arquivos e `build`.
  - `pnpm test:e2e` inteiro saiu 0: 247 de 247 em 17 arquivos, na primeira passada, sem retentativa.
- **O miolo está provado.** O uso no mês, a materialização antes de contar, a concordância com o
  filtro de Lançamentos, a edição do meio do domínio à action, as recusas, o endereço com a corrida,
  o foco e a coluna de 1.536 px têm o resultado da spec afirmado, quase sempre na unidade e na
  página.
- **Sensor:** 46 mutantes, 40 mortos, 6 vivos: E7, E14b, E15, E17, E18 e E19. Todo mutante de
  domínio, de caso de uso, de action e de estado do componente morre. Os vivos são de layout:
  quatro mostram uma cláusula de AC sem medida no navegador (E14b, E17, E18 e E19), E7 cai na
  falta de AC de G4, e E15 não fere AC nenhum (ponto (d)).
- **Lacunas, em ordem** (seção 10):
  1. **G1, decisão do dono.** CADCOL-06, AC 8 pede "duas linhas de texto" abaixo de 768 px. O
     cartão de crédito ocupa três em 360, 400 e 500 px (sonda E). O desvio está só na Nota da T16;
     o teste de 400 px não mede o cartão, e a traceability dá o AC como provado.
  2. **G2.** As "duas linhas" de CADCOL-02 e CADCOL-06, AC 8 são medidas só em 400 px, longe do
     limiar. Em 767 px o teste mede o cabeçalho, o botão e o nome da contagem, mas não as duas
     linhas: E17 e E18 vivem (L-029).
  3. **G3.** CADCOL-10, AC 7 vale "em qualquer largura e ponteiro", mas os alvos só são medidos em
     400 px e com ponteiro grosso em 1.920 px. Com ponteiro fino a partir de 768 px, nenhum é
     medido: E19 vive.
  4. **G4, decisão do dono.** A tabela de categorias não tem folga em 768 px. "Supermercado", cuja
     cor automática tem o rótulo mais largo, faz a página rolar 10 px de lado com ponteiro fino e
     24 px no toque (sondas B2 e T). Nenhum AC proíbe rolagem lateral entre 401 e 1.535 px, e o
     teste de 768 px de Categorias não tem a cor mais larga. Um nome de uma palavra só, no limite de
     caracteres, rola a página em 400 px até com o item aberto (sonda B).
  5. **G5.** CADCOL-01, AC 6 diz que "+ Nova…" fica ao lado do título "em todas as larguras", e só
     a ordem do DOM está provada (L-055). E14 morre por acaso, e E14b, o cabeçalho em coluna só a
     partir de 1.536 px, vive.
- **O que o autor levantou** (seção 7): (a), (c) e (f) aceitáveis; (b) vira G4; (d) é observação:
  E15 vive, mas nenhum AC diz que a página fica onde está ao salvar; (e) é G1.

---

## 1. Integridade da rodada

- **As 22 tasks estão marcadas** em `tasks.md`, cada uma com o commit dela, e nenhuma caixa ficou
  aberta. Os 22 assuntos passam no `check_commit.py`.
- **Nenhum teste saiu sem equivalente.** `lista-de-categorias.test.tsx` saiu na T15 com 24 testes.
  Conferi cada um contra a tabela "Para onde vai cada teste" do design: os 24 têm o equivalente em
  `tabela-de-categorias.test.tsx` (`:104`, `:114`, `:120`, `:217`), `detalhe-da-categoria.test.tsx`
  (`:170` a `:422`) e `cadastro-de-categorias.test.tsx` (`:356`, "Fechar" descarta o digitado, no
  lugar de "Cancelar fecha o campo").
- **Nenhum teste afrouxado.** Em `e2e/categorias.spec.ts` as consultas trocam de estrutura (de
  `heading` e `listitem` para o botão da linha; de 6 × 11 opções para as 11 do painel), e a
  comparação da pill passa a `expect.poll` com o mesmo valor exato. Em `e2e/visao-tres-colunas.spec.ts`
  o laço de TRES-01, AC 8 vai de 1.920 para 1.535 px e ganha três telas.
- **Nenhum `skip`, `only`, `fixme`, `any` nem `// SPEC_DEVIATION`** no diff de `src` e `e2e`.
- **Contagens**, medidas aqui, em `e8b1540` e em `e4789ef`:
  - unitários: 1.832 em 115 arquivos → 2.087 em 132 (+255; saem os 24 de
    `lista-de-categorias.test.tsx`);
  - integração: 364 em 23 arquivos → 406 em 25 (+42);
  - e2e: 193 em 16 arquivos → 247 em 17 (+54, os de `e2e/cadastros-colunas.spec.ts`).

---

## 2. Task Completion

| Task | Status | Notes |
| --- | --- | --- |
| T1 a T7 | ✅ Done | Domínio, caso de uso, repositório, action e revalidação; sensor U1 a U7 e I1 a I4 mortos |
| T8 a T14 | ✅ Done | Componentes; sensor U8 a U21 mortos |
| T15 | ✅ Done | A aba Categorias de ponta a ponta |
| T16 | ⚠️ Done, com desvio | A Nota diz que o cartão quebra em duas linhas embaixo do nome em 400 px: o AC 8 de CADCOL-06 não foi revisto (G1) |
| T17 a T19 | ✅ Done | — |
| T20 | ⚠️ Done | O teste de 400 px não mede as duas linhas do cartão (G1); o de 767 px não mede as duas linhas (G2) |
| T21 | ✅ Done | A coluna de 1.536 px |
| T22 | ✅ Done | AD-022, roadmap, notas de substituição e `docs/design.md` conferidos |

---

## 3. Spec-Anchored Acceptance Criteria

Cada linha cita o teste e a assertion em `e4789ef`. "e2e" é `e2e/cadastros-colunas.spec.ts`, salvo
quando outro arquivo é nomeado; os componentes estão em `src/components/`.

### P1: Duas abas em Cadastros — CADCOL-01

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| 1 | `h1` "Cadastros" e, abaixo, a navegação "Cadastros" com os dois links | `cabecalho-de-cadastros.test.tsx:39-40` `textContent` "Cadastros", `antes(titulo, abas())`; e2e `:372` | ✅ |
| 2 | Os links levam às duas rotas no mês aberto | `cabecalho-de-cadastros.test.tsx:47-50` `toEqual([["Categorias", "/2026-03/cadastros/categorias"], …])`; e2e `:381-384` `href`, `:949` a URL depois do clique | ✅ |
| 3 | `aria-current="page"` só na aba aberta | `cabecalho-de-cadastros.test.tsx:55-67`, com cada aba; e2e `:373-380`, `:951-958` | ✅ |
| 4 | O item "Cadastros" abre Categorias | e2e `:369-371` `toHaveURL(…/cadastros/categorias$)`; `e2e/categorias.spec.ts:330-332` | ✅ |
| 5 | "Cadastros" ativo em toda aba | e2e `:385` e `:959` `aria-current` "page" | ✅ |
| 6 | "+ Nova categoria" e "+ Novo meio" ao lado do título, em todas as larguras | `cabecalho-de-cadastros.test.tsx:76-80` no mesmo bloco do `h1`, depois dele e fora das abas; `cadastro-de-categorias.test.tsx:150-158`; `cadastro-de-meios.test.tsx:164` | ⚠️ A ordem do DOM está provada; o lugar na tela, não (G5) |

### P1: Uma linha por categoria — CADCOL-02

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| 1 | Tabela "Categorias": Categoria, Cor, "Fixos em <Mês>", "Lançamentos em <Mês>" | `tabela-de-categorias.test.tsx:92`; e2e `:713-718` `toHaveText(["Categoria", "Cor", "Fixos em Março", "Lançamentos em Março"])` | ✅ |
| 2 | Ordem pt-BR, sem caixa nem acento | `e2e/categorias.spec.ts:345-352` "categoria Beta", "Categoria Dois", "Categoria Ômega"…, fixture que a ordem do banco e a do código de caractere desmentem | ✅ |
| 3 | Pill com o nome, na cor em uso | `tabela-de-categorias.test.tsx:114`, `:120`; `e2e/categorias.spec.ts:355-363` o fundo computado de cada pill | ✅ |
| 4 | "Laranja" ou "Automática (<cor>)" | `tabela-de-categorias.test.tsx:132` "Laranja", `:138-139` "Automática (Azul)", "Automática (Ciano)"; `cor-de-categoria.test.ts:212`, `:216` nas dez cores | ✅ |
| 5 | Contagens de CADCOL-03, "0" sem uso | e2e `:343-346` "1 fixo", "2 lançamentos", "0 fixos", "0 lançamentos" na linha de cada uma | ✅ |
| 6 | Nenhum botão além do que abre | `tabela-de-categorias.test.tsx:165` `toHaveLength(1)` por linha | ✅ |
| 7 | ≥ 1.280 px, ponteiro fino: cada linha ≤ 48 px | e2e `:688-692` quinze linhas em 1.280 px, a de 59 caracteres inclusive; `:1728-1735` em 1.536 e 1.920 px, as curtas ≤ 48 px e toda linha só com o botão do nome mais 9,5 px | ✅ (com o Edge Case do nome longo; ponto (a)) |
| 8 | < 768 px: duas linhas de texto, pill em cima, cor e contagens embaixo com o nome, sem cabeçalho | e2e `:705` nenhum `columnheader` em 767 px, `:710` o nome da contagem à vista; `:759-763` em 400 px a cor e as contagens abaixo da pill, na mesma linha | ⚠️ As duas linhas só são medidas em 400 px (G2); em 360 px "Categoria Um" ocupa três (sonda E, G1) |
| 9 | Lista vazia: o aviso com "+ Nova categoria" | `tabela-de-categorias.test.tsx:217` | ✅ |

### P1: O uso no mês aberto — CADCOL-03

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| 1 | Fixos cujo período contém o mês, de qualquer natureza | `src/domain/cadastro/uso-no-mes.test.ts:62`, `:68`, `:72`, `:86-87` (três naturezas) | ✅ |
| 2 | Fora o que começa depois e o que terminou antes | `uso-no-mes.test.ts:107-108` e `:112-113`, cada borda colada dos dois lados; e2e `:343` "1 fixo" com o Fixo B (até fevereiro) e o Fixo C (desde abril) na fixture | ✅ |
| 3 | Lançamentos não cancelados da competência, toda natureza e origem, com a ocorrência do fixo | `uso-no-mes.test.ts:129`, `:144`, `:155`, `:170`, `:194`; e2e `:344` "2 lançamentos" com o Gasto B cancelado e o Gasto C de abril | ✅ |
| 4 | Igual ao que Lançamentos mostra com o filtro | `src/application/cadastros/obter-uso-no-mes/handler.test.ts:237-238`, `:249-250` contra `filtrarLancamentos`; e2e `:356-358` e `:933-935` "2 lançamentos com 1 filtro" depois de "Ver em Lançamentos" | ✅ |
| 5 | Materializa antes de contar, com a janela de Lançamentos | `handler.test.ts:112` e `:116-117`, `:144`; `handler.integration.test.ts:97-103`; e2e `:338` sem ocorrência antes de abrir | ✅ |
| 6 | Sem categoria: só para o meio | `uso-no-mes.test.ts:209-217`, `:236-238`; e2e `:918-919` "Conta Corrente" com 2 e 2, com a Entrada A sem categoria, e `:343` "Categoria Um" com 1 fixo | ✅ |

### P1: A categoria aberta na coluna — CADCOL-04

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| 1 | Clique na linha ou no botão abre, com a pill como título | `tabela-de-categorias.test.tsx:175`, `:184` (uma assertion para cada); `detalhe-da-categoria.test.tsx:152` | ✅ |
| 2 | "Renomear <nome>" com "Nome" preenchido e "Salvar" | `detalhe-da-categoria.test.tsx:161` | ✅ |
| 3 | "Cor de <nome>": dez cores e "Automática (<cor>)", tingidas, a em uso marcada | `detalhe-da-categoria.test.tsx:170-209` | ✅ |
| 4 | Grava sem outro clique, marca e pinta antes da resposta, "Cor trocada." | `detalhe-da-categoria.test.tsx:217`, `:238`; e2e `:585-586` | ✅ |
| 5 | A pill da linha na cor nova ao terminar | e2e `:588` `expect.poll(fundo(pillDaLinha)).toBe(verde)` | ✅ |
| 6 | Grava com a cor em uso, "Categoria renomeada.", painel aberto, linha no lugar novo | `detalhe-da-categoria.test.tsx:296-306`, `:309`; e2e `:593-599` | ✅ |
| 7 | Nome de outra, em qualquer caixa: "Já existe outra categoria com esse nome." junto do campo | `detalhe-da-categoria.test.tsx:340-346` `alert` e `aria-invalid`; `e2e/categorias.spec.ts:464`; `src/app/actions/categorias.integration.test.ts:381` | ✅ |
| 8 | Falha volta a cor ou o nome e diz o motivo no painel, sem aviso | `detalhe-da-categoria.test.tsx:274-292`, `:349` | ✅ |
| 9 | Nome igual depois de normalizar: não grava nem avisa | `detalhe-da-categoria.test.tsx:400` | ✅ |
| 10 | Só a caixa: grava e avisa | `detalhe-da-categoria.test.tsx:411` (U19 morre aqui) | ✅ |
| 11 | "Onde ela aparece" com "Fixos em <Mês de Ano>", "Lançamentos em <Mês de Ano>" e o link | `onde-aparece.test.tsx:19`; `detalhe-da-categoria.test.tsx:435`; e2e `:350` `["1", "2"]` | ✅ |
| 12 | O link abre Lançamentos do mês filtrado | e2e `:353-355` `?categoriaId=<id>$` | ✅ |
| 13 | Fundo diferente e `aria-expanded` | `tabela-de-categorias.test.tsx:196`, `:207`; e2e `:664-667` contra as treze outras | ✅ |
| 14 | Trocar de item ou abrir "+ Nova…" descarta o digitado | `cadastro-de-categorias.test.tsx:327`, `:342` | ✅ |
| 15 | "Fechar" fecha e desmarca | `coluna-de-cadastro.test.tsx:142`; `cadastro-de-categorias.test.tsx:286-287` | ✅ |

### P1: Nova categoria na coluna — CADCOL-05

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| 1 | Formulário "Nova categoria" com "Nome", a nota, "Criar categoria" e "Cancelar" | `nova-categoria.test.tsx:55`; `cadastro-de-categorias.test.tsx:218-224` | ✅ |
| 2 | Criada: na tabela, aberta, "Categoria criada." | `cadastro-de-categorias.test.tsx:238-244`, `:261-274`; e2e `:408-421` | ✅ |
| 3 | Nome de ativa: abre a existente, "Essa categoria já existia." | `nova-categoria.test.tsx:122`; e2e `:425-427` sem linha nova | ✅ |
| 4 | Nome de arquivada: reativa, "Categoria reativada." | `nova-categoria.test.tsx:132` (U21 morre aqui); e2e `:431-434` | ✅ |
| 5 | Vazio ou > 60: recusa no navegador, sem servidor, com a mensagem junto do campo | `nova-categoria.test.tsx:73`, `:85`, `:97` (60 chega) | ✅ |
| 6 | "Cancelar" fecha sem criar | `nova-categoria.test.tsx:160`; `cadastro-de-categorias.test.tsx:320-322` | ✅ |

### P1: Uma linha por meio de pagamento — CADCOL-06

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| 1 | Tabela com "Meio de pagamento", Tipo, Fecha, Vence e as duas contagens | `tabela-de-meios.test.tsx:99`; e2e `:1397-1404` | ✅ |
| 2 | Ordem pt-BR | e2e `:971-972` a fixture desmente o banco e o código de caractere; `:976` `toHaveText(ORDEM_DOS_MEIOS)` (E11 morre aqui) | ✅ |
| 3 | "Cartão de crédito", "Conta corrente" ou "Rótulo" | `tabela-de-meios.test.tsx:133`, `:139`, `:145`; e2e `:978`, `:986` | ✅ |
| 4 | "dia N" no cartão, "—" na conta e no rótulo | `tabela-de-meios.test.tsx:160-161`, `:169-170`; e2e `:979-988` | ✅ |
| 5 | Contagens de CADCOL-03, "0" sem uso | e2e `:918-923` (E12 morre aqui) | ✅ |
| 6 | Nenhum botão além do que abre | `tabela-de-meios.test.tsx:200-201` | ✅ |
| 7 | ≥ 1.280 px, ponteiro fino: cada linha ≤ 48 px | e2e `:1368-1372` dezessete linhas em 1.280 px, a de 40 caracteres inclusive; `:1728-1735` em 1.536 e 1.920 px | ✅ |
| 8 | < 768 px: **duas linhas de texto**, o nome em cima e o resto embaixo, com o nome escrito, sem cabeçalho | e2e `:1386` sem cabeçalho em 767 px, `:1393-1394` os nomes à vista; `:1448-1460` em 400 px o nome em cima e as células embaixo, a conta numa linha só | ❌ O cartão ocupa três linhas em 360, 400 e 500 px (sonda E); nenhum teste afirma as duas linhas do cartão (G1), nem as duas linhas em 767 px (G2) |
| 9 | Lista vazia: o aviso com "+ Novo meio" | `tabela-de-meios.test.tsx:247-251` | ✅ |

### P1: O meio aberto — CADCOL-07

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| 1 | Linha ou botão abre; nome como título e "Cartão de crédito · fecha dia N · vence dia M", "Conta corrente" ou "Rótulo" | `tabela-de-meios.test.tsx:205-221`; `detalhe-do-meio.test.tsx:146`, `:156`, `:163`; e2e `:1119-1121` | ✅ |
| 2 | "Editar <nome>", "Nome", o tipo em texto com a frase e "Salvar alterações" | `detalhe-do-meio.test.tsx:172`; `campos-do-meio.test.tsx:107` | ✅ |
| 3 | No cartão, os dias gravados e a nota | `detalhe-do-meio.test.tsx:192`, `:200` | ✅ |
| 4 | Nenhum controle de tipo, nem dia na conta e no rótulo | `detalhe-do-meio.test.tsx:183`; `campos-do-meio.test.tsx:127`, `:143`; `src/domain/cadastro/mudancas-do-meio.test.ts:127` | ✅ |
| 5 | Grava, "Meio de pagamento salvo.", nome e dias novos na linha e no painel | `detalhe-do-meio.test.tsx:211`, `:227`, `:242`; `src/app/actions/meios-de-pagamento.integration.test.ts:164`; e2e `:1014-1028` | ✅ |
| 6 | Nome de outro ativo: "Já existe outro meio de pagamento com esse nome." junto do campo, sem gravar | `src/application/cadastros/editar-meio-de-pagamento/handler.test.ts:154-156`; `meios-de-pagamento.integration.test.ts:253`; e2e `:1043-1053` | ✅ |
| 7 | Nome de arquivado grava | `handler.test.ts:159`; `meios-de-pagamento.integration.test.ts:205-213` | ✅ |
| 8 | Só a caixa grava | `mudancas-do-meio.test.ts:79`; `handler.test.ts:171`; `meios-de-pagamento.integration.test.ts:216-223` (U4 e U5 morrem aqui) | ✅ |
| 9 | Igual depois de normalizar: não grava nem avisa | `detalhe-do-meio.test.tsx:258-266` sem chamar o servidor; `handler.test.ts:136-139`; `meios-de-pagamento.integration.test.ts:228-245` | ✅ |
| 10 | Vazio, > 40 ou dia fora de 1 a 31: a mensagem junto do campo, no navegador e no servidor | `detalhe-do-meio.test.tsx:287`, `:297`, `:320`, `:331`, e `:307`, `:343` do lado aceito; `src/application/schemas/meio-pagamento.schema.test.ts:181`, `:192`, `:198`; `meios-de-pagamento.integration.test.ts:311-343` | ✅ |
| 11 | Dias fora do cartão, ou cartão sem dias: a mensagem do ciclo | `mudancas-do-meio.test.ts:101-119`; `handler.test.ts:104`, `:119`; `src/lib/erros.test.ts:5`; `meios-de-pagamento.integration.test.ts:292-308` | ✅ |
| 12 | Inexistente ou arquivado: "Esse meio de pagamento não existe mais.", sem gravar | `handler.test.ts:72`, `:87`; `meios-de-pagamento.integration.test.ts:286-289`; `detalhe-do-meio.test.tsx:429` | ✅ |
| 13 | "Onde ele aparece" e "Ver em Lançamentos" filtrado pelo meio | `detalhe-do-meio.test.tsx:436`; e2e `:927-935` | ✅ |
| 14 | A mudança na Visão geral, em Lançamentos, em Todo mês e no diálogo de importação, sem recarregar | `meios-de-pagamento.integration.test.ts:202` `revalidatePath.mock.calls` igual a `[["/", "layout"]]`; e2e `:1084-1092` o filtro de Lançamentos com "Cartão Lilás", sem recarga | ✅ (sonda I, seção 6) |
| 15 | Marcação da linha, troca de item e "Fechar" | `tabela-de-meios.test.tsx:226`; `cadastro-de-meios.test.tsx:311`, `:358`, `:371`; e2e `:1344-1347` | ✅ |

### P1: Novo meio na coluna — CADCOL-08

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| 1 | "Novo meio de pagamento" com "Nome", "Tipo" começando no cartão, "Criar meio", "Cancelar" | `novo-meio.test.tsx:103`, `:119-122` | ✅ |
| 2 | Os dias só com cartão | `novo-meio.test.tsx:130`; `campos-do-meio.test.tsx:150` | ✅ |
| 3 | Regras, ajudas e mensagens de hoje | `novo-meio.test.tsx:148`, `:158`, `:169-218` | ✅ (ponto (c)) |
| 4 | Criado: na tabela, aberto, "Meio de pagamento criado." | `cadastro-de-meios.test.tsx:264`, `:289`; `meios-de-pagamento.integration.test.ts:396`; e2e `:1117-1128` | ✅ |
| 5 | Nome de ativo: "Já existe um meio de pagamento com esse nome." junto do campo | `novo-meio.test.tsx:258`; `meios-de-pagamento.integration.test.ts:418-431`; e2e `:1137-1144` | ✅ |
| 6 | "Cancelar" fecha sem criar | `novo-meio.test.tsx:293`; `cadastro-de-meios.test.tsx:345` | ✅ |

### P1: A coluna da direita a partir de 1.536 px — CADCOL-09

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| 1 | ≥ 1.536: coluna de 384 px, linha fina | e2e `:1594` à direita em 1.536 px; `:1642` `abs(largura − 384) ≤ 1`, `:1648` `{ largura: "1px", tipo: "solid" }` | ✅ |
| 2 | Título do painel à vista ao rolar | e2e `:1682-1685` em 1.536 × 480 e 1.920 × 480, nas duas abas | ✅ |
| 3 | Nada aberto ≥ 1.536: o vazio e a dica | e2e `:1598-1603`; `coluna-de-cadastro.test.tsx:104`; `cadastro-de-meios.test.tsx:191` | ✅ |
| 4 | Título, abas e tabela ≤ 1.100 px, centrados entre o menu e a coluna | e2e `:1656-1659` em 1.536 e 1.920 px | ✅ |
| 5 | < 1.536: uma coluna ≤ 1.024 px, centrada, painel entre as abas e a tabela | e2e `:1588-1589` em 1.535 px, `:1625-1628`; `:622-623`, `:1304-1305` em 1.280 px | ✅ |
| 6 | Nada aberto < 1.536: sem painel | e2e `:1580-1582`, `:1606-1607` em 1.535 px | ✅ |
| 7 | 400 px com um item aberto: sem rolagem lateral | e2e `:752`, `:785`, `:1440`, `:1483`; `e2e/visao-tres-colunas.spec.ts:604` | ✅ com os nomes da fixture; com um nome de uma palavra só no limite de caracteres, não (G4) |

### P1: Teclado, foco e toque — CADCOL-10

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| 1 | Botão da linha no `Tab`, abre com `Enter` ou espaço | e2e `:474-479`, `:490-492`; `:1185-1203` | ✅ |
| 2 | Abrir leva o foco ao título | `coluna-de-cadastro.test.tsx:182`, `:190`; `cadastro-de-categorias.test.tsx:180`, `:224`, `:244`; e2e `:479`, `:1123` | ✅ |
| 3 | `Escape` dentro do painel fecha | `coluna-de-cadastro.test.tsx:162`, `:171`; e2e `:482-486` | ✅ |
| 4 | O foco volta à linha, ou ao "+ Nova…" | `cadastro-de-categorias.test.tsx:288`, `:300`, `:311`, `:322`; e2e `:485`, `:1196` | ✅ |
| 5 | < 1.536: abrir traz o título para a janela | e2e `:635` fora antes, `:640` `toBeInViewport()`; `:1316`, `:1321` | ✅ |
| 6 | < 768 px ou ponteiro grosso: botão da linha ≥ 44 × 44 | e2e `:707` e `:1389` em 767 px; `:733-736`, `:1421-1424` com toque em 1.280 px; `:1779-1781`, `:1808-1810` em 1.920 px | ✅ |
| 7 | Abas, "+ Nova…", "Fechar", botões do formulário, "Ver em Lançamentos" e opções de cor ≥ 44 × 44, **em qualquer largura e ponteiro** | e2e `:766-788`, `:1467-1493` em 400 px; `:1784-1827` com toque em 1.920 px | ⚠️ Nenhum alvo é medido com ponteiro fino a partir de 768 px (G3) |

### P2: O item aberto no endereço — CADCOL-11

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| 1 | `?categoria=` e `?meio=` sem recarregar e sem entrada no histórico | `parametro-na-url.test.tsx:39`; `cadastro-de-categorias.test.tsx:189-192`; e2e `:453-457`, `:1163-1167`; a corrida `:532-544`, `:547-561`, `:1206-1235` | ✅ |
| 2 | Carregar com o parâmetro abre, sem foco | `cadastro-de-categorias.test.tsx:198-199`; `coluna-de-cadastro.test.tsx:199`; e2e `:459-460`, `:1169-1170` | ✅ |
| 3 | Id de fora: ignorado, sem erro | `cadastro-de-categorias.test.tsx:205-207`; e2e `:462-465`, `:1172-1175` | ✅ |
| 4 | Fechar ou abrir o cadastro tira o parâmetro, mantendo os outros | `parametro-na-url.test.tsx:52`, `:61`; `cadastro-de-categorias.test.tsx:222-223`, `:289-290`, `:412`, `:432`; e2e `:486`, `:544`, `:1197`, `:1218` | ✅ |

### P2: A decisão registrada — CADCOL-12

| AC | Spec-defined outcome | Evidência | Result |
| --- | --- | --- | --- |
| 1 | AD-022 com o que revê | `.specs/STATE.md:208` | ✅ |
| 2 | A regra de arquivar meio usado por fixo ativo no roadmap | `docs/roadmap.md:95-99` | ✅ |
| 3 | COR-04 e TRES-01, AC 8 apontam para o CADCOL | `.specs/features/cor-por-categoria/spec.md:154`, `:161`, `:167`, `:172`, `:207`; `.specs/features/visao-tres-colunas/spec.md:89` | ✅ |
| 4 | "Largura do conteúdo" com Cadastros | `docs/design.md:124-127` | ✅ |

**Status:** ❌ um AC sem o resultado da spec (CADCOL-06, AC 8) e quatro com a prova incompleta
(CADCOL-01, AC 6; CADCOL-02, AC 8; CADCOL-09, AC 7; CADCOL-10, AC 7).

---

## 4. Edge Cases

- [x] **Nome longo quebra linha, e só ela cresce:** e2e `:1728-1735`, em 1.536 e 1.920 px, toda
  linha mede só o botão do nome mais o respiro (E8 morre aqui). Vale para nome com espaço; o de uma
  palavra só não quebra (G4).
- [x] **Renomear muda a posição; o painel fica e a linha continua marcada:** e2e `:597-598`
  (categoria) e `:1074-1081` (meio, com "Cartão Marrom" na fixture; ponto (f)).
- [x] **Criar categoria com nome de ativa ou de arquivada:** e2e `:423-434`.
- [x] **Criar meio com nome de arquivado cria outro; renomear para ele grava:**
  `meios-de-pagamento.integration.test.ts:435-444` e `:205-213`.
- [x] **Só os dias não consulta o nome; só o nome não mexe nos dias:** `handler.test.ts:195-196`;
  `src/infrastructure/db/repositories/cadastro.repository.integration.test.ts:389` (I4 morre aqui).
- [x] **O item aberto sai da tabela:** `cadastro-de-categorias.test.tsx:372-383`;
  `cadastro-de-meios.test.tsx:397-408`; a lista que chega depois da resposta, `:254-274` e `:289`
  (U10 morre aqui).
- [x] **"Mês atual" mantém a aba, sem o item:** é o código de antes, que monta o destino com
  `usePathname` (sem a busca); `src/components/seletor-competencia.test.tsx:146`. Nenhum teste
  desta fatia passa por ele numa aba de Cadastros.
- [x] **Mês sem lançamento: "0":** e2e `:345-346` e `:922-923`, em linhas sem uso.
- [x] **Erro numa action: no painel, no mesmo modo:** `nova-categoria.test.tsx:144`,
  `novo-meio.test.tsx:275`, `detalhe-do-meio.test.tsx:399`.
- [x] **Formulário de novo meio mais alto que a janela, ≥ 1.536 px:** e2e `:1757-1765`.

---

## 5. Discrimination Sensor

Numa `git worktree add --detach` em `e4789ef`, no scratchpad, com `pnpm install --offline
--frozen-lockfile` próprio. Unidade e integração pelo `vitest run --project …` dos arquivos de
cada camada; e2e por um `next dev` da worktree descartável na porta 3100, com o `playwright test
-g` dos testes que cobrem o trecho. Cada mutante foi aplicado, rodado e desfeito por
`git checkout` antes do seguinte; a sonda de controle, sem mutante, passou antes dos e2e.

| # | `file:line` | Falha injetada | Quem a mata | Killed? |
| --- | --- | --- | --- | --- |
| U1 | `src/domain/cadastro/uso-no-mes.ts:46` | O fim do fixo ignorado (`fim: null`): conta o que terminou antes do mês | `uso-no-mes.test.ts:99`, `:111`, `:269` | ✅ Morto |
| U2 | `uso-no-mes.ts:61` | O lançamento cancelado conta | `uso-no-mes.test.ts:148`, `:269` | ✅ Morto |
| U3 | `src/application/cadastros/obter-uso-no-mes/handler.ts:29` | Conta sem materializar | `handler.test.ts:105`, `:134`, `:149` e os da concordância (5 testes) | ✅ Morto |
| U4 | `src/domain/cadastro/mudancas-do-meio.ts:60` | O nome comparado sem caixa: mudar só a caixa vira "nada mudou" | `mudancas-do-meio.test.ts:79`; `editar-meio-de-pagamento/handler.test.ts:171` | ✅ Morto |
| U5 | `src/application/cadastros/editar-meio-de-pagamento/handler.ts:69` | Achar o próprio meio pelo nome recusa | `handler.test.ts:171` | ✅ Morto |
| U6 | `handler.ts:55` | O meio arquivado é editável | `handler.test.ts:77` | ✅ Morto |
| U7 | `handler.ts:64` | Nada mudou devolve `alterado: true` | `handler.test.ts:126` | ✅ Morto |
| U8 | `src/components/parametro-na-url.ts:37` | Compara com `window.location`, e não com o último pedido (L-058) | `parametro-na-url.test.tsx:81`, `:91`; `cadastro-de-meios.test.tsx:431` (6 testes) | ✅ Morto |
| U9 | `parametro-na-url.ts:48` | `router.push` no lugar de `router.replace`: entrada nova no histórico | `parametro-na-url.test.tsx:39` e outros 21 | ✅ Morto |
| U10 | `src/components/cadastro-de-categorias.tsx:120` | Fecha a aberta que não está na lista, sem olhar a anterior: fecha a recém-criada | `cadastro-de-categorias.test.tsx:254` | ✅ Morto |
| U11 | `src/components/cadastro-de-meios.tsx:141` | Depois de criar, o id não vai ao endereço | `cadastro-de-meios.test.tsx:264`, `:289` | ✅ Morto |
| U12 | `cadastro-de-categorias.tsx:141` | Fechar devolve o foco sempre ao "+ Nova categoria" | `cadastro-de-categorias.test.tsx:280`, `:293` | ✅ Morto |
| U13 | `src/components/coluna-de-cadastro.tsx:85` | Foca o título também na carga pelo endereço | `coluna-de-cadastro.test.tsx:199`; `cadastro-de-categorias.test.tsx:195`; `cadastro-de-meios.test.tsx:229` | ✅ Morto |
| U14 | `coluna-de-cadastro.tsx:117` | `Escape` não fecha | `coluna-de-cadastro.test.tsx:162`; o `Escape` de `cadastro-de-categorias.test.tsx:293` e de `cadastro-de-meios.test.tsx:324` | ✅ Morto |
| U15 | `src/components/detalhe-do-meio.tsx:131` | Sem a conferência de "nada mudou" no navegador: chama o servidor | `detalhe-do-meio.test.tsx:258` | ✅ Morto |
| U16 | `detalhe-do-meio.tsx:145` | Avisa mesmo com `alterado: false` | `detalhe-do-meio.test.tsx:269` | ✅ Morto |
| U17 | `src/components/campos-do-meio.tsx:92` | `maxLength` de 40 também no painel | `detalhe-do-meio.test.tsx:291`; `novo-meio.test.tsx:180` | ✅ Morto |
| U18 | `campos-do-meio.tsx:167` | O campo recusado sem `aria-invalid` | 12 testes de `detalhe-do-meio.test.tsx` e `novo-meio.test.tsx` | ✅ Morto |
| U19 | `src/components/detalhe-da-categoria.tsx:100` | Nome igual comparado sem caixa | `detalhe-da-categoria.test.tsx:411` | ✅ Morto |
| U20 | `src/components/tabela-de-meios.tsx:209` | "fixos" sempre no plural | `tabela-de-meios.test.tsx:183` | ✅ Morto |
| U21 | `src/components/nova-categoria.tsx:55` | "Essa categoria já existia." vence "Categoria reativada." | `nova-categoria.test.tsx:132` | ✅ Morto |
| I1 | `src/app/actions/meios-de-pagamento.ts:147` | Revalida mesmo sem mudança | `meios-de-pagamento.integration.test.ts:228` | ✅ Morto |
| I2 | `meios-de-pagamento.ts:163` | Revalida só a página de meios, e não o layout raiz | `meios-de-pagamento.integration.test.ts:195`, `:396`, `:435`. O e2e de `:1056` passa com ele (seção 6, sonda I) | ✅ Morto |
| I3 | `src/app/actions/categorias.ts:110` | Criar categoria revalida só Lançamentos | `categorias.integration.test.ts:193`, `:200`, `:210` | ✅ Morto |
| I4 | `src/infrastructure/db/repositories/cadastro.repository.ts:142` | Salvar só o nome zera o fechamento | `cadastro.repository.integration.test.ts:389` e o `it.each` de `:449` | ✅ Morto |
| E1 | `coluna-de-cadastro.tsx:94` | Coluna de 25 rem | e2e `:1642` | ✅ Morto |
| E2 | `coluna-de-cadastro.tsx:102` | Sem a linha fina | e2e `:1648` | ✅ Morto |
| E3 | `coluna-de-cadastro.tsx:95`, `:150` | Cabeçalho e lista com até 1.200 px | e2e `:1656`, em 1.920 px | ✅ Morto |
| E4 | `coluna-de-cadastro.tsx:135` | O painel sem `sticky` | e2e `:1685` | ✅ Morto |
| E5 | `coluna-de-cadastro.tsx`, todo `2xl:` | A coluna começa em 1.537 px | e2e `:1594` | ✅ Morto |
| E6 | `src/components/tabela-de-categorias.tsx:165` | O botão da linha baixa para 36 px com qualquer ponteiro | e2e `:735`, com toque em 1.280 px, e `:1774`, em 1.920 px | ✅ Morto |
| E7 | `tabela-de-meios.tsx:67` | `md:px-4`: o respiro do toque entre 768 e 1.023 px volta a 16 px | Nenhum. Com ponteiro fino o `md:pointer-fine:px-2` prevalece, e nenhum teste mede a tabela com toque em 768 px | ❌ Sobrevive (G4) |
| E7b | `tabela-de-meios.tsx:67` | `md:pointer-fine:px-3`: o respiro do mouse em 768 px volta a 12 px | e2e `:1407`: o nome quebra, e o botão volta a 44 px em 768 px | ✅ Morto |
| E8 | `tabela-de-meios.tsx:203` | O tipo quebra também a partir de 1.024 px | e2e `:1732`, em 1.536 px | ✅ Morto |
| E9 | `tabela-de-categorias.tsx:83` | Sem a largura mínima da coluna do nome | e2e `:720`, o botão com 44 px em 768 px | ✅ Morto |
| E10 | `tabela-de-meios.tsx:184` | O meio aberto com o fundo dos outros | e2e `:1346` | ✅ Morto |
| E11 | `src/app/(app)/[competencia]/cadastros/meios-de-pagamento/page.tsx:56` | Sem ordenar: a ordem do banco | e2e `:976` | ✅ Morto |
| E12 | `meios-de-pagamento/page.tsx:58` | O uso da categoria no lugar do uso do meio | e2e `:918` | ✅ Morto |
| E13 | `campos-do-meio.tsx:125` | Os dias lado a lado só em `@lg` | e2e `:1281`, em 778 px | ✅ Morto |
| E14 | `src/components/cabecalho-de-cadastros.tsx:38` | O cabeçalho em coluna: a ação embaixo do título | e2e `:1022`, **por acaso**: o cabeçalho mais alto empurra "Salvar alterações" 0,6% para fora da janela em 1.280 × 720. Nenhum teste afirma a ação ao lado do título | ✅ Morto |
| E14b | `cabecalho-de-cadastros.tsx:38` | O cabeçalho em coluna só a partir de 1.536 px | Nenhum: os 54 de `cadastros-colunas.spec.ts`, `categorias.spec.ts`, `visao-tres-colunas.spec.ts` e os unitários passam | ❌ Sobrevive (G5) |
| E15 | `detalhe-do-meio.tsx:144` | `window.scrollTo(0, 0)` depois de salvar | Nenhum: `:1022-1023` passam com a página no alto (sonda D) | ❌ Sobrevive (sem AC; ponto (d)) |
| E16 | `tabela-de-meios.tsx:151` | O "—" da conta à vista no cartão de duas linhas | e2e `:1460`: as contagens da conta saem da linha do tipo | ✅ Morto |
| E17 | `tabela-de-categorias.tsx:149` | `sm:table-row`: entre 640 e 767 px cada célula fica numa linha (a categoria vai a 108 px com quatro linhas de texto) | Nenhum: os 54 de `cadastros-colunas.spec.ts`, `categorias.spec.ts`, `visao-tres-colunas.spec.ts` e os unitários passam | ❌ Sobrevive (G2) |
| E18 | `tabela-de-meios.tsx:182` | O mesmo nos meios (o cartão vai a 150 px) | Nenhum, os mesmos | ❌ Sobrevive (G2) |
| E19 | `coluna-de-cadastro.tsx:142` | "Fechar" com 36 × 36 com ponteiro fino a partir de 768 px (medido: 36 × 36 em 1.280 px) | Nenhum, os mesmos | ❌ Sobrevive (G3) |

**Sensor depth**: P0-full manual, 46 mutantes: 21 de componente e domínio na unidade, 4 de action e
repositório no Postgres, 21 de página e layout no navegador.
**Result**: 40 de 46 mortos — FAIL ❌. Sobrevivem E7, E14b, E15, E17, E18 e E19.

E14b, E17, E18 e E19 foram aplicados juntos aos três arquivos de e2e que tocam as abas e aos seis
de componente; com tudo verde, cada um sobrevive sozinho. Antes, E14, E17, E18 e E19 juntos
derrubaram só `:1001`, e E14 sozinho derruba o mesmo teste: a queda é dele. Para confirmar que
E17, E18 e E19 são falhas de verdade, e não mutantes equivalentes, a sonda M mediu as linhas em
700 px (103 → 108 e 150 px) e a sonda F mediu o "Fechar" (36 × 36).

---

## 6. Sondas no navegador

Rodadas na worktree descartável, contra o `next dev` dela, com o banco `mybilling_test_cad`.

- **Sonda B, um nome de uma palavra só no limite** (`CartaoComUmNomeMuitoLongoSemEspacoAlgum4`, 40
  caracteres; uma categoria de 60). Rolagem lateral da página, sem nada aberto e com o item aberto:

  | Largura | Meios | Categorias |
  | --- | --- | --- |
  | 400 px | 24 e 183 px | 96 e 143 px |
  | 767 px | 0 e 0 | 0 e 0 |
  | 768 px | 237 e 237 px | 321 e 321 px |
  | 1.024 px | 113 e 113 px | 65 e 65 px |
  | 1.280 e 1.536 px | 0 | 0 |

  O botão da linha e o título do painel não quebram a palavra: a tabela passa da coluna.
- **Sonda B2, palavras comuns.** Uma por vez, em 768 e 1.024 px, com ponteiro fino:
  "Alimentação", "Investimentos", "Entretenimento", "Desenvolvimento", "Mercadopago", "Hipercard",
  "Contasalario" e "Bradescard" não rolam. **"Supermercado" rola 10 px em 768 px**: a cor automática
  dela é verde-água, e "Automática (Verde-água)" é o rótulo mais largo da coluna Cor, que não
  quebra (`md:whitespace-nowrap`, `tabela-de-categorias.tsx:171`).
- **Sonda T, toque em 768 px.** A tabela de meios cabe, com o nome de 40 caracteres; a de
  categorias, com "Supermercado", rola 24 px.
- **Sonda E, linhas de texto abaixo de 768 px.** A altura da linha e as linhas de texto, contadas
  pelas caixas do texto e conferidas pela altura (cada linha a mais soma de 21 a 25 px):

  | Largura | "Cartão Roxo" | "Conta Corrente" | "Categoria Um" |
  | --- | --- | --- | --- |
  | 360 px | 3 linhas, 128 px | 2 linhas, 103 px | 3 linhas, 124 px |
  | 400 px | 3 linhas, 128 px | 2 linhas, 103 px | 2 linhas, 103 px |
  | 500 px | 3 linhas, 128 px | 2 linhas, 103 px | — |
  | 767 px | 2 linhas, 103 px | 2 linhas, 103 px | — |

- **Sonda D, onde fica "Salvar alterações" em 1.280 × 720.** Ao abrir "Cartão Roxo", a página está
  em `scrollY` 0, e o botão vai de 643 a 687 px: à vista sem rolar. Em 1.920 × 1.080 o painel é
  preso. O `toBeInViewport({ ratio: 1 })` de `:1022` passa com a página no alto; E15 confirma.
- **Sonda I, o diálogo de importação depois de renomear.** Em 1.280 px, "Cartão Roxo" renomeado
  para "Cartão Lilás" pelo painel; Lançamentos pela navegação, sem recarregar; o diálogo, com a
  fixture de outubro, oferece "Cartão Lilás · cartão, fecha dia 25, vence dia 5" no passo 2. Com
  I2 (a revalidação só da página de meios) oferece o mesmo: a resposta da action redesenha o
  layout da rota aberta.

---

## 7. Os pontos que o autor levantou

Julgados só contra a spec, depois da passada própria.

| Ponto | Juízo | Por quê |
| --- | --- | --- |
| (a) Em 1.536 px, "cada linha ≤ 48 px" contra "nome longo quebra linha" | **Aceitável** | O AC 7 e o Edge Case leem-se juntos, como em DENS-01 e FIXCOL-01, já validados assim. O teste de `:1728-1735` é o certo: as curtas até 48 px e toda linha só com o botão do nome mais o respiro, o que pega uma linha crescida por outra coluna (E8 morre). A spec poderia citar o Edge Case no próprio AC; não muda o resultado |
| (b) A tabela de meios em 768 px sem folga; nome longo de uma palavra sem teste | **Lacuna, G4** | A de meios cabe em 768 px com os nomes da fixture, com ponteiro fino e com toque (sondas B2 e T). A de categorias, não: "Supermercado" rola. E a palavra longa rola as duas, em 400, 768 e 1.024 px (sonda B). Nenhum AC diz o que fazer com rolagem lateral entre 401 e 1.535 px, nem com uma palavra que não cabe |
| (c) `erros` em `CamposDoMeio` tira o `maxLength` | **Aceitável** | CADCOL-07, AC 10 e CADCOL-08, AC 3 pedem a mensagem do limite junto do campo, no navegador; com o corte do navegador, o 41º caractere nunca chegaria à validação. É a mesma escolha de CADCOL-05, AC 5. O inline continua cortando, provado em `campos-do-meio.test.tsx:196`, e U17 morre nos dois formulários do painel |
| (d) A medida de "à vista" (L-057) no painel do meio pegaria uma rolagem até o alto? | **Não pega; sem lacuna na spec** | Em 1.280 × 720 a página está no alto quando se salva, e "Salvar alterações" já está à vista (sonda D); em 1.920 px o painel é preso. E15 (`window.scrollTo(0, 0)` depois de salvar) sobrevive. Nenhum AC desta fatia diz que a página fica onde está ao salvar, e o aviso é `fixed`, sempre à vista. Se o dono quiser a garantia, ela precisa de um AC e de uma janela baixa o bastante para "Salvar alterações" começar fora dela |
| (e) CADCOL-06, AC 8 diz "duas linhas", e o cartão tem três em 400 px | **Desvio da spec, G1** | O AC diz duas, sem exceção, e a Nota da T16 registrou três sem rever o AC (L-047). A traceability dá o AC 8 como provado por `:1432`, que não mede o cartão. Só o dono decide entre rever o AC e mudar a linha |
| (f) "Cartão Marrom" na fixture da T20 | **Aceitável** | Sem ele, "Cartão Lilás" ficaria no lugar de "Cartão Roxo" e o teste não provaria a linha no lugar novo. O nome é genérico (AD-009), e a fixture foi escolhida pelo que discrimina (L-036). `:1063` confere a posição antes e `:1074-1080` depois |

---

## 8. Code Quality

| Principle | Status |
| --- | --- |
| Minimum code | ✅ |
| Surgical changes | ✅ Os arquivos fora do Where estão nas Notas (T3, T8, T15, T17) |
| No scope creep | ✅ |
| Matches patterns | ✅ A grade, a célula densa e o endereço seguem Todo mês e Lançamentos |
| Spec-anchored outcome check (asserted values match spec) | ⚠️ CADCOL-06, AC 8 sem o valor da spec; quatro ACs com a prova incompleta |
| Per-layer Coverage Expectation met (domain 1:1 ACs; routes happy+edge+error) | ✅ 393/393 branches em `src/domain`; cada recusa da action com mensagem e campo |
| Every test maps to a spec requirement - no unclaimed tests | ✅ Os testes além do Done-when estão presos a um AC ou a uma lição nas Notas |
| Documented guidelines followed: `AGENTS.md` | ✅ |

**`AGENTS.md`, regras 1 a 5, no diff:**
1. **AD-009:** só nomes genéricos ("Pessoa A", "Cartão Roxo", "Cartão Lilás", "Cartão Marrom",
   "Categoria Um") e valores redondos (10000, 5000, 7000, 100000, 2000 centavos). Nenhum nome de
   banco, de pessoa ou valor real no diff nem nas mensagens dos 22 commits.
2. **Centavos:** a fatia só conta linhas; nenhum campo monetário novo, nenhum `toFixed`, `float` ou
   `DECIMAL`.
3. **Competência:** `usoNoMes` compara `Competencia` e usa `janelaMaterializacao`; nenhum `Date` em
   `src/domain`. O único `new Date` do diff está num teste de integração.
4. **Domínio puro:** `uso-no-mes.ts` e `mudancas-do-meio.ts` importam só de `../`, devolvem
   `Result`, não lançam e não são `async`; `arquitetura.test.ts` passa no gate.
5. **Só `movimento` é somável:** `usoNoMes` conta, não soma (AD-003), e não lê valor nenhum.
- **Server Actions:** `editarMeioDePagamento` e `criarMeioDePagamento` chamam `requireSession()` na
  primeira instrução (`src/app/actions/meios-de-pagamento.ts:48`, `:127`) e revalidam com Zod
  (`:53`, `:132`); provado em `meios-de-pagamento.integration.test.ts:126-131` e `:133-160`.
  `criarCategoria` entra no `it.each` de `categorias.integration.test.ts:143`.

---

## 9. Gate Check

- **Gate command:** `pnpm verify` (`typecheck && lint && test:unit && test:integration && build`) e
  depois `pnpm test:e2e` inteiro, com `DATABASE_URL_TEST` no banco `mybilling_test_cad`.
- **`pnpm verify`:** saiu 0.
  - `typecheck` 0; `lint` 0 (368 arquivos);
  - 2.087 unitários em 132 arquivos, todos passando; `src/domain` com 100% de statements,
    branches (393/393), funções e linhas;
  - 406 de integração em 25 arquivos, todos passando;
  - `build` 0, com `/[competencia]/cadastros/categorias` e `/[competencia]/cadastros/meios-de-pagamento`.
- **`pnpm test:e2e`:** saiu 0; 247 de 247 em 17 arquivos, em 9,3 min, sem retentativa; 54 em
  `e2e/cadastros-colunas.spec.ts`. O `next-env.d.ts` reescrito pelo `next dev` voltou por
  `git checkout`.
- **Skipped tests:** nenhum.
- **Failures:** nenhuma.
- **Test count before feature** (`e8b1540`, rodado aqui): 1.832 unitários, 364 de integração, 193 e2e.
- **Test count after feature**: 2.087, 406 e 247.
- **Delta**: +255, +42 e +54. Nenhum teste saiu sem equivalente (seção 1).

---

## 10. Fix Plans

Em ordem de prioridade. F1 e F4 esperam o dono; F2, F3 e F5 vão direto a um implementador. Cada
uma começa pelo teste que falha antes da correção, com o mutante que ele mata.

> **Decisões do dono em 2026-10-31**, depois deste relatório:
> - F1: "Aceitar a quebra" (saída A).
> - F4: "Nunca rolar de lado", isto é, "sim" às duas perguntas.
> - E15 (seção 7, ponto d): "Sim, como em Todo mês". A tela fica parada ao salvar. Vira um AC novo e
>   a F6 da `tasks.md`.

### F1 — CADCOL-06, AC 8: o cartão de crédito em três linhas (G1) — **decisão do dono**

- **Root cause:** em 400 px, a linha de baixo do cartão leva o tipo, os dois dias e as duas
  contagens, cada um com o nome escrito; são uns 450 px de texto em 336 px. A Nota da T16 mediu e
  registrou a quebra, mas o AC continuou dizendo "duas linhas de texto", e a traceability o dá por
  provado por `:1432`, que não mede o cartão.
- **O dono escolhe:**
  - **A. Rever o AC:** "o nome em cima e, embaixo, o tipo, os dias e as contagens com o nome escrito,
    que quebram quando não cabem". E dizer a largura mínima em que vale (400 px, como TRES-01, AC 10):
    em 360 px até "Categoria Um" ocupa três linhas (sonda E), e o "menos de 768 px" de CADCOL-02 e
    CADCOL-06, AC 8 não tem piso.
  - **B. Manter duas linhas** e encurtar a de baixo do cartão: por exemplo, os dois dias numa célula
    só ("fecha 25 · vence 5").
- **Fix task:**
  - A: `spec.md`, CADCOL-02 e CADCOL-06, AC 8; o teste de `:1432` passa a afirmar a regra nova no
    cartão.
  - B: `src/components/tabela-de-meios.tsx`; antes, em `:1432`, as linhas de texto da linha de
    "Cartão Roxo" em 400 px, contadas pelas caixas do texto como na sonda E, iguais a 2. Hoje são 3.
- **Priority:** Minor.

### F2 — As duas linhas medidas colado no limiar de 768 px (G2)

- **Root cause:** os testes de 767 px (`:700`, `:1380`) medem o cabeçalho, o botão e o nome da
  contagem; as duas linhas, só em 400 px (`:759-763`, `:1444-1460`).
- **Fix task:** nos dois testes de 767 px, as assertions de 400 px: a pill ou o nome em cima; a cor e
  as contagens, ou o tipo, os dias e as contagens, abaixo dele, na mesma linha. Antes, com E17 e E18
  (`md:table-row` → `sm:table-row`), os dois testes têm de cair. A regra do cartão segue F1.
- **Where:** `e2e/cadastros-colunas.spec.ts`.
- **Needs owner:** não. **Priority:** Minor.

### F3 — Os alvos de 44 × 44 com ponteiro fino a partir de 768 px (G3)

- **Root cause:** CADCOL-10, AC 7 vale "em qualquer largura e ponteiro". Os alvos são medidos em
  400 px, abaixo do `md`, e com toque em 1.920 px. O `md:pointer-fine:` que baixa o botão da linha
  para 36 px poderia baixar qualquer outro alvo sem a suíte ver.
- **Fix task:** um teste com ponteiro fino em 768 e em 1.536 px, nas duas abas, com o painel aberto e
  com os dois formulários de criação abertos pela ação (L-060). Abas, "+ Nova categoria", "+ Novo
  meio", "Fechar", "Salvar", "Salvar alterações", "Criar categoria", "Criar meio", "Cancelar", "Ver em
  Lançamentos" e as onze opções de cor, cada um com ao menos 44 × 44. Antes, com E19 ("Fechar" com
  `md:pointer-fine:min-h-9 md:pointer-fine:min-w-9`), ele tem de cair.
- **Where:** `e2e/cadastros-colunas.spec.ts`.
- **Needs owner:** não. **Priority:** Minor.

### F4 — A tabela sem folga em 768 px e a palavra que não quebra (G4) — **decisão do dono**

- **Root cause:**
  - em 768 px a tabela de categorias tem 480 px e nenhuma folga (Nota da T15: 136 px na coluna do
    nome; com 144, passava 2 px);
  - a coluna Cor não quebra (`md:whitespace-nowrap`, `tabela-de-categorias.tsx:171`), e o teste de
    768 px usa só "Categoria Um" e "Categoria Dois", de cor ciano e rosa, e não a de rótulo mais
    largo, verde-água;
  - o botão da linha e o título do painel não quebram uma palavra só.
- **O dono decide:**
  - se "sem rolagem lateral" vale de 400 a 1.535 px nas duas abas, e não só em 400 px com um item
    aberto (CADCOL-09, AC 7);
  - se um nome de uma palavra só quebra no meio, como "Nome longo: quebra linha" sugere.
- **Fix task** (com as duas respostas "sim"):
  - em `src/components/tabela-de-categorias.tsx`, a cor quebra entre 768 e 1.023 px (`lg:` no lugar
    de `md:whitespace-nowrap`), como o tipo do meio na T16; ou a coluna do nome com outra largura
    mínima;
  - `[overflow-wrap:anywhere]` no botão da linha das duas tabelas e no `TituloDoPainel`.
- **Testes que falham antes:**
  - em 768 px, com ponteiro fino e com toque, uma categoria de cor automática verde-água, como
    "Supermercado", sem rolagem lateral (hoje 10 e 24 px). O de toque mata E7;
  - em 400 px com o item aberto, um meio de 40 caracteres e uma categoria de 60, de uma palavra só,
    sem rolagem lateral (hoje 183 e 143 px).
- **Priority:** Minor.

### F5 — "+ Nova…" ao lado do título, medido no navegador (G5)

- **Root cause:** CADCOL-01, AC 6 diz onde a ação fica "em todas as larguras", e só a ordem do DOM
  está provada (L-055). E14 (o cabeçalho em coluna) morre só por acaso: empurra "Salvar alterações"
  0,6% para fora da janela em `:1022`. E14b (em coluna só a partir de 1.536 px) sobrevive à suíte
  inteira.
- **Fix task:** em 400, 1.535 e 1.536 px, nas duas abas, a caixa da ação na mesma faixa vertical do
  `h1` e à direita dele. Hoje vale nas seis larguras da sonda H. Antes, com E14b, o teste tem de cair.
- **Where:** `e2e/cadastros-colunas.spec.ts`.
- **Needs owner:** não. **Priority:** Cosmetic.

---

## 11. Requirement Traceability Update

| Requirement | Previous Status | New Status |
| --- | --- | --- |
| CADCOL-01 | In progress | ❌ Needs Fix (AC 6, G5) |
| CADCOL-02 | In progress | ❌ Needs Fix (AC 8, G2) |
| CADCOL-03 | In progress | ✅ Verified |
| CADCOL-04 | In progress | ✅ Verified |
| CADCOL-05 | In progress | ✅ Verified |
| CADCOL-06 | In progress | ❌ Needs Fix (AC 8, G1 e G2) |
| CADCOL-07 | In progress | ✅ Verified |
| CADCOL-08 | In progress | ✅ Verified |
| CADCOL-09 | In progress | ⚠️ Verified com a fixture; G4 espera o dono |
| CADCOL-10 | In progress | ❌ Needs Fix (AC 7, G3) |
| CADCOL-11 | In progress | ✅ Verified |
| CADCOL-12 | In progress | ✅ Verified |

A traceability do `spec.md` não foi tocada: o Verifier só escreve este arquivo.

---

## 12. Lições

Gravadas por `lessons.py add`, uma por falha com sinal:
- **L-062** (`spec_deviation`, G1): a medida que desmente um AC de layout volta ao AC antes do
  commit.
- **L-063** (`surviving_mutant`, G2; E17 e E18): cada cláusula de um AC com limiar precisa de
  assertion no caso colado.
- **L-064** (`surviving_mutant`, G3; E19): alvo "em qualquer largura e ponteiro" medido com ponteiro
  fino acima do breakpoint.
- **L-065** (`spec_precision_gap`, G4; E7 cai aqui): "sem rolagem lateral" em cada faixa em que a
  tabela é tabela, com o texto mais largo e uma palavra só.
- **L-055** (`surviving_mutant`, G5; E14b): a mesma lição de Todo mês, com o mesmo texto; passa a
  `confirmed`, em duas fatias.
- **L-066** (`surviving_mutant`, ponto (d); E15): a medida de "continua à vista" pede uma janela em
  que o alvo começa fora dela.

---

## 13. Summary

**Overall**: ❌ Not Ready

**Spec-anchored check**: 89 de 94 ACs com o resultado da spec provado; CADCOL-06, AC 8 sem ele, e
quatro com a prova incompleta (CADCOL-01, AC 6; CADCOL-02, AC 8; CADCOL-09, AC 7; CADCOL-10, AC 7).
**Sensor**: 40 de 46 mortos; vivos E7, E14b, E15, E17, E18 e E19.
**Gate**: `pnpm verify` 0 (2.087 + 406 + build); `pnpm test:e2e` 247 de 247.

**What works**: o uso no mês e a concordância com Lançamentos; a edição do meio, do domínio à
action, com cada recusa; as duas abas e o painel, com o foco, o `Escape` e o endereço com a
corrida; a coluna de 1.536 px; o toque acima de 768 px no botão da linha.

**Issues found**: G1 a G5, na seção 10.

**Next steps**: o dono decide G1 e G4; F1 a F5 seguem para um implementador; rodada 2 depois.
