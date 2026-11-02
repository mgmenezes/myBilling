# Excluir compra parcelada desta parcela em diante — Validação

## Validation: excluir-compra — **FAIL**

**Result**: FAIL ❌ — rodada 1 (2026-11-02, `b9bd7ba`).

O código de produto faz o que a spec pede nas camadas verificadas e o gate está verde. O veredito vem
de **um mutante vivo que quebra uma cláusula da spec**: o M12, que dá o menu "⋯" à **entrada fixa**,
passa no unit e na integração, e nenhum e2e lê a linha da entrada fixa (EXC-01 AC 3, a cláusula "ou
de entrada fixa"). A correção é só de teste, sem tocar em código de produto (Fix 1). Há ainda duas
lacunas de precisão da spec (EXC-02 AC 9 e EXC-04 AC 4), que pedem decisão do dono e não bloqueiam.

**Corte de escopo pelo dono (no meio da verificação).** Duas instruções chegaram pelo coordenador
durante o sensor: (1) parar o sensor no que já estava feito e terminar; (2) não rodar mais teste de
integração, nem no checkout nem na worktree. Efeito neste relatório:

- O gate de integração **rodou uma vez**, antes da instrução (436 passaram); nada de integração rodou
  depois dela. O autor também relata 436 e `pnpm verify` verde no lote 2.
- O sensor parou em 22 mutantes: 20 de comportamento (cada um com a suíte unit **e** a de
  integração, antes do corte) e os 2 de AD-011 (só unit, depois do corte). O M21 (o `buscarPorId` do
  Drizzle escondendo o cancelado) foi preparado e **não rodou** ("integração cortada pelo dono").
  Nenhum mutante de e2e rodou; o reposicionamento do painel (`useLayoutEffect`) está sem mutante.
- A Code Quality foi revista só nos arquivos lidos para os ACs; não houve passada arquivo por
  arquivo.
- Todos os ACs e edge cases foram re-derivados antes do corte; nenhum ficou "não re-checado".

**Data**: 2026-11-02
**Spec**: `.specs/features/excluir-compra/spec.md` (EXC-01 a EXC-05, 32 critérios, 6 edge cases)
**Faixa do diff**: `10ae97e..b9bd7ba`, 15 commits de implementação e docs depois do commit de
planejamento `10ae97e` (que fica de fora): T1 `25c59f1` a T13 `199ce52`, a correção `b34ea54` e
`b9bd7ba`.
**Verificador**: sub-agente independente (autor ≠ verificador). Leitura apenas no checkout real.
Mutações numa `git worktree` descartável e destacada no `b9bd7ba`, com `node_modules` por link
simbólico e um banco próprio (`mybilling_test_exc_mut`, criado e apagado no Postgres local).
**Nenhum `git stash`.** O porcelain do checkout foi gravado antes (vazio) e conferido no fim
(vazio). O `next dev` do e2e reescreveu `next-env.d.ts`, que voltou ao commitado com `git checkout`.

---

## Task Completion

| Task | Status | Notas |
| --- | --- | --- |
| T1 | ✅ Done | `planejarExclusaoDestaEmDiante`, `restantesDepois`, `NADA_A_EXCLUIR`; mensagem com `SPEC_DEVIATION` em `src/lib/erros.ts:113-115` (`25c59f1`) |
| T2 | ✅ Done | Conservação, `reprecificar` e `buscarUma` ignoram cancelada (`5edfed0`) |
| T3 | ✅ Done | `parcelasVigentes` e `excluirParcelas` na port, no fake e no Drizzle (`599b951`) |
| T4 | ✅ Done | A visão mensal traz `exclusao` e o "faltam" das vigentes (`54670db`) |
| T5 | ✅ Done | Schema estrito (`0bf9d61`) |
| T6 | ✅ Done | Caso de uso (`39c32e2`) |
| T7 | ✅ Done | Action e mensagens (`dd4fb58`) |
| T8 | ✅ Done | Textos do aviso e do toast (`5bd24c1`) |
| T9 | ✅ Done | `MenuDaLinha` com `children` (`cfa21b6`); trocado depois por `useFecharMenu` (`b34ea54`) |
| T10 | ✅ Done | `ExcluirParcelas` (`a76c8d7`) |
| T11 | ⚠️ Done, com lacuna | Tabela monta o menu na parcela (`24a186e`). "Entrada fixa sem ⋯" não tem teste: M12 vivo |
| T12 | ✅ Done | `e2e/excluir-compra.spec.ts`, 6 percursos (`bf89d1a`) |
| T13 | ✅ Done | Handoff e specs antigas (`199ce52`) |

13 tasks, todos os itens marcados.

---

## Critérios de aceitação, ancorados na spec

Legenda: ✅ a assertion afirma o resultado que a spec define (e o mutante que o quebra, quando houve,
morreu) · ❌ cláusula sem prova, com mutante vivo · ⚠️ lacuna de precisão da spec.

### EXC-01 — "⋯" com "Excluir" na parcela

| AC | Resultado definido pela spec | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| 1 | Parcela não cancelada tem o "⋯" com nome "Mais ações para <descrição>" | `src/components/tabela-lancamentos.test.tsx:785-787` — `getByRole("button", { name: "Mais ações para Compra parcelada A" })` clicado; `e2e/excluir-compra.spec.ts:210-211` — `gatilho(parcela, "Compra A")` abre o menu (`aria-expanded` `"true"`, `:145`); `e2e/lancamentos-densos.spec.ts:386-389` — "Compra A" com o "⋯" | ✅ M11 morto |
| 2 | Aberto, o menu mostra "Excluir" | `tabela-lancamentos.test.tsx:788` — `getByRole("button", { name: "Excluir, Compra parcelada A" })`; `e2e/excluir-compra.spec.ts:212` — `menu.getByRole("button", { name: excluirDe("Compra A") })` visível dentro do painel (L-018); `e2e/lancamento-avulso.spec.ts:301-304` | ✅ M11 morto |
| 3 | Ocorrência de **gasto fixo ou de entrada fixa** sem "⋯" | Gasto fixo: `tabela-lancamentos.test.tsx:807-808` — `queryByRole("button", { name: /^Mais ações/ })` nulo; `e2e/excluir-compra.spec.ts:215` e `e2e/lancamentos-densos.spec.ts:391-392` — `toHaveCount(0)` em "Fixo A"/"Fixo B" (despesas). Entrada fixa: **nenhuma assertion**. O e2e semeia "Entrada A" como receita fixa (`e2e/excluir-compra.spec.ts:41`) e não a lê | ❌ gasto fixo provado; entrada fixa sem prova: **M12 vivo** |
| 4 | Avulso continua em dois toques, "Excluir" e "Confirmar?", sem o aviso | `tabela-lancamentos.test.tsx:956-958` — `"Confirmar?, excluir Almoço"` presente, "Excluir desta em diante" e `/desta parcela em diante/` ausentes; `e2e/excluir-compra.spec.ts:220-225`; `menu-da-linha.test.tsx:62-67` | ✅ M11 morto (o avulso continua) |
| 5 | Abaixo de 768 px, "⋯" e "Excluir" do cartão da parcela com ≥ 44 × 44 | `e2e/excluir-compra.spec.ts:340-343` — `boundingBox` do "⋯" e do "Excluir" em 400 px, `toBeGreaterThanOrEqual(44)` nas duas medidas; `excluir-parcelas.test.tsx:221-230` — `min-h-11`/`min-w-11` nos três botões | ✅ (e2e rodou verde; sem mutante de e2e) |

### EXC-02 — O aviso antes de excluir

| AC | Resultado definido pela spec | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| 1 | Tocar "Excluir" mostra o aviso dentro do menu aberto, sem excluir | `excluir-parcelas.test.tsx:91-92` — o texto do aviso presente e `acao` não chamada; `tabela-lancamentos.test.tsx:889-891` — `within(painel).getByText(AVISO)`, painel achado pelo `aria-controls`; `e2e/excluir-compra.spec.ts:240-242`, `:252-255` — o menu contém o aviso, e depois de "Cancelar" o banco ainda tem 4 parcelas vigentes | ✅ |
| 2 | `k > 1`: "Saem <k> parcelas, de <primeiro> a <último>, somando <total>." | `texto-da-exclusao.test.ts:28-30` (k = 3) e `:34-41` (k = 2, o lado de cima do limiar, L-029) — `toBe` do texto inteiro; `e2e/excluir-compra.spec.ts:240-242` (k = 3) e `:272-274` (k = 2) lidos na tela (L-054) | ✅ M7 morto |
| 3 | `k = 1`: "Sai 1 parcela, em <primeiro>, de <total>." | `texto-da-exclusao.test.ts:45-52` — `toBe("… Sai 1 parcela, em Janeiro de 2027, de R$ 10,00. As anteriores ficam.")`; `e2e/excluir-compra.spec.ts:346-350` — o texto exato em 400 px | ✅ M7 morto |
| 4 | Com parcela vigente antes: começa com "Excluir <descrição> desta parcela em diante?" e termina com "As anteriores ficam." | `texto-da-exclusao.test.ts:28-30`, `:79-82` — `toBe` do texto inteiro (começo e fim); `e2e/excluir-compra.spec.ts:240-242` | ✅ M6, M19 mortos |
| 5 | Sem parcela vigente antes: começa com "Excluir a compra <descrição> inteira?" e não diz "As anteriores ficam." | `texto-da-exclusao.test.ts:63-65` — `toBe` do texto inteiro; `:71-72` — `not.toContain("As anteriores ficam.")` (L-010, as duas cláusulas); `excluir-desta-em-diante.test.ts:54`, `:62` — `inteira` `true` também quando as anteriores foram canceladas; `e2e/excluir-compra.spec.ts:346-350` — o aviso de "inteira" pela página | ✅ M6, M19 mortos |
| 6 | `p = 1`: "1 parcela já paga fica."; `p > 1`: "<p> parcelas já pagas ficam." | `texto-da-exclusao.test.ts:79-82` (p = 1), `:97-100` (p = 2, `not.toContain` do singular), `:106-107` (p = 0, nenhuma das duas); `e2e/excluir-compra.spec.ts:272-274` (p = 1 na tela) | ✅ |
| 7 | "Excluir desta em diante" e "Cancelar", foco em "Cancelar" | `excluir-parcelas.test.tsx:102-103`; `:112` — `document.activeElement` é "Cancelar" com `fireEvent` (sem foco do toque); `e2e/excluir-compra.spec.ts:243-244` — `toBeFocused()` | ✅ M14 morto |
| 8 | "Excluir desta em diante" executa a exclusão | `excluir-parcelas.test.tsx:135-136` — `toHaveBeenCalledTimes(1)` e `toHaveBeenCalledWith({ lancamentoId: "lanc-2" })`; `tabela-lancamentos.test.tsx:905-906` — a action que a página passou, com o id da parcela, e não a do avulso; `e2e/excluir-compra.spec.ts:276-279` | ✅ |
| 9 | "Cancelar", `Escape` ou clique fora fecham sem excluir, **com o foco de volta no "⋯"**; reabrir mostra "Excluir" sem o aviso | "Cancelar": `excluir-parcelas.test.tsx:166-168`, `tabela-lancamentos.test.tsx:917-920`, `e2e/excluir-compra.spec.ts:248-249` — fechado, foco no "⋯", action não chamada. `Escape`: `tabela-lancamentos.test.tsx:929-934` — fechado, foco no "⋯", reaberto com "Excluir" e sem aviso. Clique fora: `tabela-lancamentos.test.tsx:945-947` — fechado, sem aviso, action não chamada; **sem assertion de foco**, e o código não o devolve (`src/components/menu-da-linha.tsx:94-97`, só `setAberto(false)`) | ⚠️ Lacuna de precisão: ver G2 |
| 10 | Desabilitado enquanto grava | `excluir-parcelas.test.tsx:152` — `disabled` `true` com a resposta pendente; `:155` — `false` depois | ✅ |

### EXC-03 — O alcance da exclusão

| AC | Resultado definido pela spec | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| 1 | Sai toda parcela de número ≥ `n` não paga nem cancelada | `excluir-desta-em-diante.test.ts:40-48` — `numeros: [2, 3, 4]`; `:79-87` — `[2, 4]` com a 3 paga; `src/app/actions/compras.integration.test.ts:427-445` — no Postgres, 2 e 4 canceladas, 1 e 3 não; `e2e/excluir-compra.spec.ts:279-283` | ✅ M1, M2, M3 mortos |
| 2 | As de número < `n` sem mudança (valor, número, data, categoria, pagamento) | `compra.repository.integration.test.ts:658` — `depois[0]` igual a `antes[0]`, linha com valor, competência, data, categoria, `pago_em`; `compras.integration.test.ts:440` | ✅ M2 morto |
| 3 | Paga no alcance fica, com o mesmo valor e `pago_em` | `excluir-desta-em-diante.test.ts:79-87`, `:93-96`, `:102-106`; `compra.repository.integration.test.ts:669-674` — `{ numero: 3, valor: "1000", pago: "2027-02-10", cancelado: null }`; `:683-686` — paga na lista não é cancelada e tudo volta; `e2e/excluir-compra.spec.ts:286-288` — a 3/4 continua em fevereiro com o selo "Pago" | ✅ M1, M16 mortos |
| 4 | Total = amortizado anterior + soma das não canceladas que ficaram | `excluir-desta-em-diante.test.ts:47`, `:86`; `compra.repository.integration.test.ts:660`, `:718` (com amortizado 42000); `compras.integration.test.ts:446` — `total` = `amortizado + 2000` | ✅ M3, M15 mortos |
| 5 | Nenhuma outra compra, avulso ou ocorrência de fixo muda | `compra.repository.integration.test.ts:767` — `expect(await fora()).toEqual(antes)`, linhas inteiras de outra compra, de um avulso e de uma ocorrência de fixo | ✅ |
| 6 | Falha numa escrita desfaz todas | `compra.repository.integration.test.ts:683-686`, `:694-699` — `ViolacaoDeConservacao`, parcelas e total iguais aos de antes; `compras.integration.test.ts:488-493` — `ERRO_INESPERADO` e `fotografia()` igual | ✅ M3, M16 mortos |
| 7 | A mesma exclusão de novo, em parcela já cancelada, responde sem erro e sem mudar nada | `src/application/compras/excluir-desta-em-diante/handler.test.ts:89-90` — `{ ok: true, value: { alterou: false, parcelasExcluidas: 0 } }` e estado igual; `:101-102` — a outra aba entre as duas leituras | ✅ M10 morto (no fake; ver nota N3) |

### EXC-04 — Depois de excluir

| AC | Resultado definido pela spec | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| 1 | A linha sai da lista do mês aberto sem recarregar | `e2e/excluir-compra.spec.ts:279` — `toHaveCount(0)` em janeiro depois do clique, sem `reload`; `compras.integration.test.ts:466-472` — revalidação das 4 rotas | ✅ M9 morto |
| 2 | Cada mês com parcela excluída deixa de mostrá-la | `e2e/excluir-compra.spec.ts:283` (março); `compras.integration.test.ts:458-459` — `janeiro.lancamentos` e `marco.lancamentos` vazios | ✅ |
| 3 | Totais do mês, "Saldo previsto", "Gastos por categoria", "Próximos meses" e "Dá pra comprar?" deixam de contar | `compras.integration.test.ts:460` — `totalGastos` 0 (totais do mês; e "Gastos por categoria", que `src/app/(app)/[competencia]/page.tsx:113` monta de `visaoMensal.lancamentos`, vazio em `:458`); `:461` — `comprometido` 0 em março; `e2e/excluir-compra.spec.ts:299-304` — "Vai sobrar" de "Próximos meses" e "Saldo previsto" de janeiro e março sobem 1000, fevereiro igual; `compras.integration.test.ts:471` — Simular revalidado | ✅ (ver nota N1 sobre "Dá pra comprar?") |
| 4 | Toast "<k> parcelas excluídas." (k > 1) e "1 parcela excluída." (k = 1) | `texto-da-exclusao.test.ts:121`, `:125`; `excluir-parcelas.test.tsx:180` — `"2 parcelas excluídas."` pela resposta do servidor, não pelo aviso (que dizia 3); `:190`; `e2e/excluir-compra.spec.ts:278` | ✅ M8, M20 mortos · ⚠️ k = 0 sem texto na spec: ver G1 |
| 5 | "<n>/<t> · última" sem vigente de número maior; senão "faltam <r>" com as vigentes de número maior | `excluir-desta-em-diante.test.ts:143`, `:147`; `obter-visao-mensal/handler.test.ts:395` — `restantes` 0 com 3/4 e 4/4 canceladas; `compras.integration.test.ts:457`; `e2e/excluir-compra.spec.ts:287` — `"3/4 · última"`, `:291` — `"1/4 · faltam 1"` | ✅ M5 morto |

### EXC-05 — Recusar sem gravar

| AC | Resultado definido pela spec | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| 1 | `requireSession()` antes de qualquer leitura | `compras.integration.test.ts:332` — primeira instrução contém `requireSession()`; `:344-347` — `NAO_AUTENTICADO`, `buscarPorId` não chamado, banco igual, sem revalidação | ✅ |
| 2 | Payload que não é `{ lancamentoId }` uuid sem campo a mais → `VALIDACAO` sem ler o banco | `exclusao-de-compra.schema.test.ts:15-22` (ausente, vazio, não uuid, campo a mais); `compras.integration.test.ts:365-368` — `VALIDACAO`, sem leitura, banco igual | ✅ M17 morto |
| 3 | Inexistente → `LANCAMENTO_NAO_ENCONTRADO`, "Esse lançamento não existe mais." | `compras.integration.test.ts:379-383` — `toEqual({ code, mensagem })` e banco igual; `handler.test.ts:110` | ✅ |
| 4 | Não é parcela → código próprio, sem gravar, mensagem em `erros.ts` | `compras.integration.test.ts:399-403` — `LANCAMENTO_NAO_E_PARCELA`, "Só parcela de compra se exclui por aqui.", banco igual; `handler.test.ts:139-140` — avulso e ocorrência de fixo | ✅ |
| 5 | Nada a excluir: o aviso diz "Todas as parcelas desta em diante já foram pagas. Nada a excluir.", sem "Excluir desta em diante", e o servidor recusa com código próprio sem gravar | Aviso: `texto-da-exclusao.test.ts:113-115`; `excluir-parcelas.test.tsx:210-214`; `e2e/excluir-compra.spec.ts:317-320` — texto e `toHaveCount(0)` do botão. Servidor: `compras.integration.test.ts:414-418` — `NADA_A_EXCLUIR` com o mesmo texto, banco igual; `excluir-desta-em-diante.test.ts:131` | ✅ M1, M13 mortos |
| 6 | Erro não previsto → `ERRO_INESPERADO` com referência | `compras.integration.test.ts:488-492` — código, mensagem com `[0-9a-f]{8}` e sem detalhe interno | ✅ |
| 7 | Recusa: mensagem em `role="alert"`, sem toast, e a linha continua | `excluir-parcelas.test.tsx:199-200` — `alert` com o texto e nenhum `status`; a linha continua porque a recusa não revalida (`compras.integration.test.ts:384`, `:404`, `:419`) | ✅ |

**Status**: ❌ 1 cláusula sem prova (EXC-01 AC 3, entrada fixa) · ⚠️ 2 lacunas de precisão da spec.

---

## Edge Cases

- [x] Escolhida é a primeira vigente → compra inteira sai, menos as pagas: `excluir-desta-em-diante.test.ts:54-56`, `:62-63`; `e2e/excluir-compra.spec.ts:346-350` (1/4 com a 3/4 paga: "inteira", "1 parcela já paga fica.").
- [x] Escolhida é a última → `k` 1 e texto de EXC-02 AC 3: `excluir-desta-em-diante.test.ts:69-73`; `texto-da-exclusao.test.ts:45-52`.
- [x] Escolhida paga com não pagas depois → a escolhida fica, saem as seguintes: `excluir-desta-em-diante.test.ts:102-106`.
- [x] Mês passado → mesmo alcance: a regra não lê a competência corrente (`planejarExclusaoDestaEmDiante` só recebe parcelas e número); `obter-visao-mensal/handler.test.ts` (8/10 de 2026-03 visto de março) com `inteira: true`.
- [x] Reprecificada com valores diferentes → `<total>` é a soma gravada: `excluir-desta-em-diante.test.ts:116`.
- [x] Lista filtrada → a linha sai também da filtrada: a filtragem é sobre a lista revalidada; não há teste próprio com filtro ativo (nota N2).

---

## Discriminação (sensor)

Profundidade expandida (≥ 5 mutantes de comportamento + 2 de AD-011). M1 a M20 rodaram, cada um
sozinho, contra a suíte unit inteira (`--project domain --project componentes`) **e** a de
integração inteira, na worktree. AD011-A e AD011-B rodaram depois do corte, só com `--project
domain`. A linha de base da worktree, sem mutante, passou nas duas suítes (2.238 e 436).

| Mutante | Arquivo:linha | Falha injetada | Resultado |
| --- | --- | --- | --- |
| M1 | `src/domain/parcelamento/excluir-desta-em-diante.ts:55` | parcela paga do alcance sai junto (`saem = alcance`) | ✅ morto (unit e integração) |
| M2 | `excluir-desta-em-diante.ts:54` | alcance com `>` em vez de `>=` | ✅ morto (unit e integração) |
| M3 | `src/infrastructure/db/repositories/compra.repository.ts:242` | assert de `excluirParcelas` soma também as canceladas | ✅ morto (integração) |
| M4 | `compra.repository.ts:129` | assert de `reprecificar` volta a somar as canceladas (T2) | ✅ morto (integração) |
| M5 | `src/application/mes/obter-visao-mensal/handler.ts:168` | "faltam" volta a `total - numero` | ✅ morto (unit e integração) |
| M6 | `excluir-desta-em-diante.ts:69` | `inteira` só quando `aPartirDe === 1` (ignora anteriores canceladas) | ✅ morto (unit) |
| M7 | `src/components/texto-da-exclusao.ts:22` | aviso no singular também para `k` = 2 | ✅ morto (unit) |
| M8 | `texto-da-exclusao.ts:39` | toast no singular também para `k` = 2 | ✅ morto (unit) |
| M9 | `src/app/actions/compras.ts:154` | action não revalida Simular | ✅ morto (integração) |
| M10 | `src/application/compras/excluir-desta-em-diante/handler.ts:59-60` | segunda exclusão de parcela já cancelada vira `LANCAMENTO_NAO_ENCONTRADO` | ✅ morto (unit) |
| M11 | `src/components/tabela-lancamentos.tsx:375` | tabela não monta o menu na parcela | ✅ morto (unit) |
| M12 | `tabela-lancamentos.tsx:384` | **entrada fixa ganha o menu** (`origem === "AVULSO" \|\| natureza === "RECEITA"`) | ❌ **vivo** (unit e integração verdes; nenhum e2e lê a linha da entrada fixa) |
| M13 | `src/components/excluir-parcelas.tsx:77` | "Excluir desta em diante" aparece também com `NADA` | ✅ morto (unit) |
| M14 | `excluir-parcelas.tsx:52` | o foco não vai para "Cancelar" | ✅ morto (unit) |
| M15 | `excluir-desta-em-diante.ts:62` | total novo esquece as pagas que ficam | ✅ morto (unit e integração) |
| M16 | `compra.repository.ts:225` | o `UPDATE` cancela parcela paga | ✅ morto (integração) |
| M17 | `src/application/schemas/exclusao-de-compra.schema.ts:11` | `z.object` aceita campo a mais | ✅ morto (unit e integração) |
| M18 | `compra.repository.ts:259` | `buscarUma` devolve parcela cancelada (T2) | ✅ morto (integração) |
| M19 | `texto-da-exclusao.ts:31` | "As anteriores ficam." também na compra inteira | ✅ morto (unit) |
| M20 | `excluir-parcelas.tsx:60` | toast usa o número do aviso, não o do servidor | ✅ morto (unit) |
| M21 | `src/infrastructure/db/repositories/movimento.repository.ts:56` | `buscarPorId` do Drizzle esconde o cancelado | ⏭️ não rodou (integração cortada pelo dono) |
| AD011-A | `src/domain/parcelamento/ratear-parcelas.ts:36` | resíduo por truncamento simples | ✅ morto (unit, domain) |
| AD011-B | `src/domain/shared/competencia.ts:45` | `addMeses` sem virada de ano | ✅ morto (unit, domain) |

**Sensor depth**: expandida.
**Result**: 21 rodados, 20 mortos, 1 vivo (M12); 1 não rodado (M21) — **FAIL ❌**.

---

## Gate Check

| Gate | Comando | Resultado |
| --- | --- | --- |
| unit | `pnpm test:unit` | ✅ 141 arquivos, 2.238 testes; cobertura de `src/domain` 100% de branches (422/422) |
| integração | `pnpm test:integration` | ✅ 25 arquivos, 436 testes. Rodou **uma vez**, antes da instrução do dono; não foi re-rodado depois. O autor relata o mesmo número e `pnpm verify` verde no lote 2. O EDF-06 não falhou |
| tipos | `pnpm typecheck` | ✅ |
| lint | `pnpm lint` | ✅ 402 arquivos, nenhum ajuste |
| e2e | `pnpm exec playwright test e2e/excluir-compra.spec.ts e2e/lancamentos-densos.spec.ts e2e/lancamento-avulso.spec.ts` | ✅ 43 passaram (1,2 min) |
| build | `pnpm build` | não rodado pelo Verificador (corte de escopo); o autor relata `pnpm verify` verde |

- **Testes no diff**: +91 casos `it` / `it.each` nos unitários e de integração, 2 removidos, ambos
  renomeados com a assertion invertida que EXC-01 exige (`tabela-lancamentos.test.tsx:758`) ou
  ampliada (`obter-visao-mensal/handler.test.ts`); e2e: +8 `test`, 2 renomeados. Nenhum `skip`.
- **Assertions enfraquecidas**: nenhuma. As duas que provavam "sem ⋯ na parcela" foram invertidas
  porque a spec inverteu a regra (EXC-01 AC 1; nota em `painel-e-lancamentos/spec.md` e
  `lancamento-avulso/spec.md`).

---

## Code Quality

| Princípio | Status |
| --- | --- |
| Minimum code | ✅ |
| Surgical changes | ✅ (`BASE` exportado de `botao-excluir.tsx` para o estilo comum; o resto é da fatia) |
| No scope creep | ✅ |
| Matches patterns | ✅ action, caso de uso, repositório e fake no formato de `trocarCategoria`/`reprecificar` |
| Spec-anchored outcome check | ❌ EXC-01 AC 3 (entrada fixa) |
| Per-layer Coverage Expectation | ✅ domínio 1:1 e 100% de branches; repositório, action e e2e com caminho feliz, recusas e falha |
| Every test maps to a spec requirement | ✅ |
| Documented guidelines followed | ✅ `AGENTS.md` (centavos, competência em string, domínio puro, `requireSession` primeiro, Zod estrito, mensagens em `erros.ts`, AD-009 nas fixtures) |

Revisão limitada aos arquivos lidos para os ACs (corte de escopo).

---

## Pontos que o autor relatou

- **(a) `MenuDaLinha` com `children` comum e `useFecharMenu()`**, e não o "`children` + callback
  `fechar`" do design. Aceito. A tabela é Server Component e função não atravessa para o cliente
  (`b34ea54`, achado pelo e2e). O comportamento que o design pedia do `fechar` está provado:
  `menu-da-linha.test.tsx:175-177` e `excluir-parcelas.test.tsx:166-168`. O `design.md` ainda
  descreve o callback (desvio de documentação, sem efeito em AC).
- **(b) Painel reposicionado com `useLayoutEffect` e `ResizeObserver`, só com e2e.** O e2e de 400 px
  prova que o aviso fica inteiro na tela e que a página não rola para o lado
  (`e2e/excluir-compra.spec.ts:350`, `:354`). Nenhum AC da fatia pede isso: o resultado vem da regra
  geral de 16 px de respiro (UI-03). Mutante de e2e não rodou (corte de escopo), então a
  discriminação desse e2e não está medida.
- **(c) Toast "0 parcelas excluídas." quando o servidor não exclui nada.** Acontece na repetição
  (EXC-03 AC 7) e quando outra aba já excluiu. A spec só define `k` = 1 e `k` > 1: lacuna de
  precisão (G1). Nenhum teste fixa o texto de `k` = 0.
- **(d) Mensagem de `NADA_A_EXCLUIR` entrou em T1, com `SPEC_DEVIATION`** (`src/lib/erros.ts:113-115`).
  O desvio é de ordem de task, não de comportamento: o texto é o de EXC-05 AC 5, e a união
  `CodigoErro` exige a mensagem no `Record` para compilar. Aceito. É a mesma causa da lição L-027
  (`trocar-categoria`).

---

## Fix Plans

### Fix 1: Provar que a entrada fixa não tem "⋯" (EXC-01 AC 3; M12)

- **Root cause**: a cláusula "ou de entrada fixa" não tem assertion. O teste da tabela prova só o
  gasto fixo (`tabela-lancamentos.test.tsx:790-809`), e os e2e leem "Fixo A"/"Fixo B", que são
  despesas. O e2e de `excluir-compra` semeia "Entrada A" como receita fixa e não a lê.
- **Fix task** (só teste, sem código de produto):
  - `src/components/tabela-lancamentos.test.tsx`: um caso com `origem: "RECORRENCIA"`,
    `natureza: "RECEITA"`, `recorrenciaId`, que espera `queryByRole("button", { name: /^Mais ações/ })`
    nulo.
  - `e2e/excluir-compra.spec.ts:215`: a mesma assertion `toHaveCount(0)` na linha "Entrada A".
- **Verify**: com o M12 aplicado (`tabela-lancamentos.tsx:384`, `|| lancamento.natureza ===
  "RECEITA"`), os dois testes falham; sem ele, passam.
- **Priority**: Major (cláusula de AC sem prova; o comportamento de produção está certo hoje).

### Decisões do dono (não são fix tasks de código)

- **G1** — EXC-04 AC 4: dizer o toast quando `k` = 0 (repetição ou outra aba). Hoje sai "0 parcelas
  excluídas.". Opções: nenhum toast, ou um texto próprio.
- **G2** — EXC-02 AC 9: dizer se "com o foco de volta no '⋯'" vale também para o clique fora. O
  código devolve o foco só em "Cancelar" e `Escape`; no clique fora o foco fica onde a pessoa clicou
  (padrão de disclosure, igual ao DENS-02 AC 5 já verificado). Sugestão: reescrever o AC para limitar
  o foco a "Cancelar" e `Escape`.

---

## Notas (sem fix task)

- **N1** — "Dá pra comprar?" (EXC-04 AC 3) não tem assertion própria. O simulador lê
  `obterHorizonteDeSaldos`, que usa as mesmas leituras `listarPorCompetencia`/`listarEntre` de
  `obterVisaoMensal` (filtro `cancelado_em IS NULL` em `movimento.repository.ts:32`, `:48`), e a
  rota é revalidada (`compras.integration.test.ts:471`). Prova indireta.
- **N2** — Edge case "lista filtrada": sem teste com filtro ativo; o filtro corre no cliente sobre a
  lista que a revalidação já trouxe sem a linha.
- **N3** — EXC-03 AC 7 está provado com fakes. No Postgres depende de `buscarPorId` do Drizzle
  devolver o cancelado (`movimento.repository.ts:55-59`, que devolve hoje). O M21, que mede isso, não
  rodou.

---

## Requirement Traceability Update

Nenhuma linha muda para `Verified` nesta rodada (FAIL).

| Requirement | Status anterior | Status novo |
| --- | --- | --- |
| EXC-01 | Implemented | ❌ Needs Fix (Fix 1) |
| EXC-02 | Implemented | Implemented (⚠️ G2 aguarda o dono) |
| EXC-03 | Implemented | Implemented |
| EXC-04 | Implemented | Implemented (⚠️ G1 aguarda o dono) |
| EXC-05 | Implemented | Implemented |

---

## Summary

**Overall**: ❌ Not Ready — uma fix task de teste.

**Spec-anchored check**: 31/32 critérios com assertion sobre o resultado da spec; 1 cláusula sem
prova (EXC-01 AC 3, entrada fixa); 2 lacunas de precisão (EXC-02 AC 9, EXC-04 AC 4).
**Sensor**: 20/21 mortos (M12 vivo), M21 não rodado; AD-011 A e B mortos.
**Gate**: unit 2.238 ✅, integração 436 ✅ (uma vez, antes do corte), typecheck ✅, lint ✅, e2e 43 ✅.

**What works**: o alcance (pagas ficam, anteriores ficam), a conservação no banco com rollback, o
"faltam"/"última" das vigentes, os textos do aviso e do toast nos dois lados de cada limiar, as
recusas sem gravar, e a composição página → domínio → banco no e2e.

**Next steps**: Fix 1 → nova rodada do Verificador; o dono decide G1 e G2.

---

## Lições destiladas

| Sinal | Fonte | Lição |
| --- | --- | --- |
| `surviving_mutant` | M12; EXC-01 AC 3 | L-078 (candidata): AC que nomeia dois tipos de linha com o mesmo comportamento precisa de fixture e assertion para cada tipo |
| `spec_precision_gap` | EXC-04 AC 4 (G1) | L-079 (candidata): AC de texto com contagem precisa dizer o caso zero |
| `spec_precision_gap` | EXC-02 AC 9 (G2) | L-080 (candidata): AC com vários gestos de fechar precisa dizer a quais o efeito de foco se aplica |
| `spec_deviation` | `src/lib/erros.ts:113-115` | L-027, segunda feature: promovida a confirmada |
| penalidade | L-010 | `penalize` (harmful = 1): confirmada, carregada em `tasks.md`, e a mesma falha voltou (AC de duas cláusulas, uma sem prova) |
