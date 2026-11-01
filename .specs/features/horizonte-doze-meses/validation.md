# Horizonte de doze meses — Validation

**Date**: 2026-11-01
**Spec**: `.specs/features/horizonte-doze-meses/spec.md`
**Diff range**: `ff395ba..HEAD` (`23dc07a`, 8 commits, T1 a T8; T2 absorvida pela T1)
**Verifier**: independent sub-agent (author ≠ verifier)

**Verdict**: PASS ✅

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1 | ✅ Done | `9efd6e9`: port, fake e Drizzle juntos (absorve a T2) |
| T2 | ✅ Done | Absorvida pela T1, sem commit próprio; os itens de "Done when" da T2 estão provados em `movimento.repository.integration.test.ts:106-204` |
| T3 | ✅ Done | `d3a0e6a` |
| T4 | ✅ Done | `76a07b1` |
| T5 | ✅ Done | `8dcd978` |
| T6 | ✅ Done | `b68cc86` |
| T7 | ✅ Done | `7d1c7c6` |
| T8 | ✅ Done | `23dc07a`: AD-023, handoff, roadmap |

Nenhuma task bloqueada ou parcial. A traceability do `spec.md` tem os 4 IDs em `Implementing`.

---

## Spec-Anchored Acceptance Criteria

### HORIZ-01: O app enxerga doze meses à frente

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| AC 1: abrir uma página que materializa em C materializa, por recorrência vigente, C até C + 12, respeitando início e fim | 13 competências literais 2026-03..2027-03 para um fixo sem fim aberto em março; nenhuma além; fixo com fim dentro da janela para no fim | `src/application/recorrencias/materializar/handler.integration.test.ts:88-103` — `expect(rows.map(r => r.competencia)).toEqual(["2026-03-01", …, "2027-03-01"])` (13 literais) e `expect(await contar()).toBe(13)`; `:121-123` — fim em 2026-05 → `expect(await contar()).toBe(3)`; composição página → constante no navegador: `e2e/horizonte-doze-meses.spec.ts:76-90` — `expect(await competenciasDasOcorrencias()).toEqual([... 13 literais ...])` depois de `page.goto("/2026-03")`, e `:96-97` a linha "Conta de água" visível em `/2027-03/lancamentos` com `R$ 180,00`; Cadastros (via `obterUsoNoMes`): `src/application/cadastros/obter-uso-no-mes/handler.test.ts:161` — `expect(ocorrencias()).toHaveLength(13)` e `handler.integration.test.ts:112-113` — `expect(depoisDaPrimeira).toBe(13)` | ✅ PASS |
| AC 2: `obterVisaoMensal(C)` entrega em `futuro` exatamente 12 itens, C + 1..C + 12, em ordem, com `competencia`, `comprometido`, `saldo` | 12 objetos literais 2026-04..2027-03 a partir de março, com os valores de cada mês | `src/application/mes/obter-visao-mensal/handler.test.ts:399-413` — `expect(visao.futuro).toHaveLength(MESES_DE_PROJECAO)` e `expect(visao.futuro).toEqual([{ competencia: "2026-04", comprometido: 30000, saldo: 70000 }, { competencia: "2026-05", comprometido: 0, saldo: -10000 }, { competencia: "2026-06", comprometido: 0, saldo: 0 }, …, { competencia: "2027-03", comprometido: 0, saldo: 0 }])`; também `:343-356` (MOV-06, AC 3) com 12 objetos literais | ✅ PASS |
| AC 3: uma única constante para materialização e projeção | a constante reexportada pela materialização é a mesma da visão mensal e vale 12 | `src/application/recorrencias/materializar/handler.test.ts:71-72` — `expect(MESES_DE_PROJECAO).toBe(12)` e `expect(MESES_DE_PROJECAO).toBe(MESES_DA_VISAO)`; reexport em `src/application/recorrencias/materializar/handler.ts:91` | ✅ PASS |
| AC 4: C = novembro → `futuro` inclui dezembro e janeiro a novembro do ano seguinte | 12 competências literais 2026-12, 2027-01..2027-11 | `src/application/mes/obter-visao-mensal/handler.test.ts:423-436` — `expect(visao.futuro.map(m => m.competencia)).toEqual(["2026-12", "2027-01", …, "2027-11"])` | ✅ PASS |

Independent Test da story (fixo de R$ 300 + entrada de R$ 1.000 → 12 itens com saldo 700): coberto em forma equivalente por `handler.test.ts:400-413` (fixo 300,00 + entrada 1.000,00 em abril → `saldo: 70000`) e, no navegador, por `e2e/saldo-futuro.spec.ts:120-129` ("Vai sobrar" R$ 700,00 em abril e junho).

Nota (não é gap): das quatro páginas que materializam, a Visão geral é exercida pelo e2e e a tela Cadastros pelo caso de uso `obterUsoNoMes`; a home (`src/app/(app)/page.tsx:67-70`) e Lançamentos (`src/app/(app)/[competencia]/lancamentos/page.tsx:125-128`) passam a mesma constante `MESES_DE_PROJECAO` que o AC 3 fixa em 12, e a Test Coverage Matrix de `tasks.md` classifica a constante como "build gate only".

### HORIZ-02: "Próximos meses" continua com três linhas

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| AC 1: a Visão geral de C mostra exatamente 3 itens, C + 1, C + 2 e C + 3 | 3 `listitem` na seção; abril, maio e junho de 2026 a partir de março | `e2e/saldo-futuro.spec.ts:117` — `await expect(proximosMeses(page).getByRole("listitem")).toHaveCount(3)`; `:119-129` — cartões "Abril de 2026", "Maio de 2026", "Junho de 2026" com `toHaveText("R$ 300,00")`, `("R$ 700,00")`, `("R$ 1.500,00")`, `("R$ 500,00")` | ✅ PASS |
| AC 2: abrir um dos três meses mostra no card "Saldo previsto" o mesmo valor da linha (SALDO-03, AC 7) | abril: "R$ 700,00"; maio: "-R$ 500,00" | `e2e/saldo-futuro.spec.ts:138-145` — `expect(sobraDeAbril).toBe("R$ 700,00")`, `expect(faltaDeMaio).toBe("R$ 500,00")`, `await expect(cardSaldoPrevisto(page)).toHaveText(sobraDeAbril ?? "")` em `/2026-04` e `toHaveText(\`-${faltaDeMaio}\`)` em `/2026-05` | ✅ PASS |
| AC 3: número de linhas numa constante própria, distinta do horizonte | constante separada de `MESES_DE_PROJECAO` | `src/app/(app)/[competencia]/page.tsx:36` — `const LINHAS_DE_PROXIMOS_MESES = 3;` e `:235` — `visaoMensal.futuro.slice(0, LINHAS_DE_PROXIMOS_MESES)`; a separação é provada pelo sensor (mutante M4: 3 → 4 derruba `saldo-futuro.spec.ts:117` sem tocar o horizonte) | ✅ PASS |

### HORIZ-03: A janela é lida numa consulta

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| AC 1: `listarEntre(inicio, fim)` devolve os não cancelados com competência entre as pontas, inclusive | março, abril e junho (as duas pontas dentro), maio cancelado fora, julho fora | Fake: `src/application/ports/fakes.test.ts:361` — `expect(entre.map(l => l.descricao)).toEqual(["março", "abril", "junho"])`; Postgres: `src/infrastructure/db/repositories/movimento.repository.integration.test.ts:141-142` — mesmo `toEqual(["março", "abril", "junho"])` e `expect(entre.map(l => l.competencia)).toEqual(["2026-03", "2026-04", "2026-06"])` | ✅ PASS |
| AC 2: igual à união de `listarPorCompetencia`, na ordem competência, data do evento, id | 4 lançamentos inseridos fora de ordem saem como março, abril cedo (id menor), abril cedo (id maior), abril tarde; conjunto igual à união | Fake: `fakes.test.ts:377-385` — `toEqual(["março", "abril cedo, segundo id", "abril cedo, terceiro id", "abril tarde"])` e união comparada por id; Postgres: `movimento.repository.integration.test.ts:177-185` — `expect(entre).toEqual(uniao)`, `expect(entre.map(l => l.dataEvento)).toEqual(["2026-03-31", "2026-04-02", "2026-04-02", "2026-04-20"])`, `expect(cedoA && cedoB && cedoA.id < cedoB.id).toBe(true)` | ✅ PASS |
| AC 3: `fim` anterior a `inicio` → lista vazia | `[]` para `listarEntre(2026-06, 2026-03)` com abril no banco | Fake: `fakes.test.ts:394` — `expect(entre).toEqual([])`; Postgres: `movimento.repository.integration.test.ts:193` — `expect(entre).toEqual([])` | ✅ PASS |
| AC 4: `obterVisaoMensal(C)` lê C + 1..C + 12 com uma única chamada a `listarEntre` | exatamente uma chamada `[C + 1, C + 12]` e nenhuma `listarPorCompetencia` além da do mês aberto | `src/application/mes/obter-visao-mensal/handler.test.ts:449-451` — `expect(entre.mock.calls).toEqual([[ABRIL, addMeses(MARCO, MESES_DE_PROJECAO)]])`, `expect(porCompetencia.mock.calls).toEqual([[MARCO]])`, `expect(visao.futuro[0]).toEqual({ competencia: "2026-04", comprometido: 30000, saldo: 70000 })` | ✅ PASS |

Independent Test da story (março, abril, junho + cancelado em maio; invertido vazio): é exatamente `fakes.test.ts:350-361, 388-394` e `movimento.repository.integration.test.ts:106-143, 188-194`.

### HORIZ-04: O seed deixa o banco como uma abertura de mês deixaria

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| AC 1: `pnpm db:seed` com base B materializa as recorrências de B até B + 12, pela mesma constante | 13 competências literais 2030-05..2031-05 com base 2030-05; materializar de novo a partir de B devolve 0 | `src/infrastructure/db/seed.integration.test.ts:277-291` — `expect(rows.map(r => r.competencia)).toEqual(["2030-05-01", …, "2031-05-01"])` (13 literais); `:293-302` — `materializarRecorrencias(…, "2030-05", MESES_DE_PROJECAO)` → `expect(criadas).toBe(0)` | ✅ PASS |

**Status**: ✅ All ACs covered (12/12), 0 spec-precision gaps.

---

## Edge Cases

- [x] Recorrência com `competenciaFim` dentro da janela: `materializar/handler.integration.test.ts:106-124` — fim em 2026-05, janela de 12 → `expect(await contar()).toBe(3)`; regra pura em `src/domain/recorrencia/janela-materializacao.test.ts:45-53` (pré-existente)
- [x] Mês da janela sem lançamento: `obter-visao-mensal/handler.test.ts:403-412` — junho a março seguintes com `comprometido: 0, saldo: 0`
- [x] Virada de ano na janela: `obter-visao-mensal/handler.test.ts:423-436` (HORIZ-01, AC 4); no banco, `materializar/handler.integration.test.ts:98-101` (2026-12 → 2027-01)
- [x] `listarEntre` com `inicio === fim`: `fakes.test.ts:404-405` — `expect(entre).toEqual(await movimentos.listarPorCompetencia(competencia("2026-03")))` e `toEqual(["março"])`; `movimento.repository.integration.test.ts:202-203` idem no Postgres
- [x] Abrir o mesmo mês duas vezes devolve zero: `seed.integration.test.ts:302` — `expect(criadas).toBe(0)`; `obter-uso-no-mes/handler.integration.test.ts:112-113` — contagem 13 antes e depois da segunda abertura

---

## Discrimination Sensor

Scratch isolado: `git worktree add <scratchpad>/sensor-horizonte HEAD` + `pnpm install --offline --frozen-lockfile`. Baseline `git status --porcelain` da worktree real antes do sensor: vazio. Um mutante por vez, arquivo restaurado com `git checkout --` entre eles; testes de integração e e2e nunca em paralelo (mesmo banco `mybilling_test`).

| Mutation | File:line | Description | Tests run | Killed? |
| --- | --- | --- | --- | --- |
| M1 | `src/application/mes/obter-visao-mensal/handler.ts:44` | `MESES_DE_PROJECAO = 12` → `11` | unit: `obter-visao-mensal/handler.test.ts`, `materializar/handler.test.ts`, `obter-uso-no-mes/handler.test.ts` | ✅ Killed (5 falhas: `handler.test.ts:400`, `:343`, `:423`; `materializar/handler.test.ts:71`; `obter-uso-no-mes/handler.test.ts:161`) |
| M2 | `src/infrastructure/db/repositories/movimento.repository.ts:47` | `between(...)` → `gt(inicio) AND lte(fim)` (ponta inicial exclusiva) | integration: `movimento.repository.integration.test.ts` | ✅ Killed (3 falhas: `:141`, `:177`, `:202`) |
| M3a | `src/application/ports/fakes.ts:304-309` | `.sort(...)` removido de `listarEntre` do fake | unit: `fakes.test.ts` | ✅ Killed (2 falhas: `:361`, `:377`) |
| M3b | `src/application/ports/fakes.ts:300` | filtro `m.canceladoEm === null` removido do fake | unit: `fakes.test.ts` | ✅ Killed (1 falha: `:361`) |
| M4 | `src/app/(app)/[competencia]/page.tsx:36` | `LINHAS_DE_PROXIMOS_MESES = 3` → `4` | e2e: `e2e/saldo-futuro.spec.ts` (no scratch, `next dev` próprio) | ✅ Killed (`saldo-futuro.spec.ts:117` — `toHaveCount(3)`, recebeu 4) |
| M5 | `src/application/mes/obter-visao-mensal/handler.ts:94-97` | `listarEntre` trocado pelo laço antigo de `listarPorCompetencia` | unit: `obter-visao-mensal/handler.test.ts` | ✅ Killed (1 falha: `:449-450`, espiões) |
| M6 | `src/infrastructure/db/seed.ts:450` | `MESES_DE_PROJECAO` → `MESES_DE_AVULSOS - 1` | integration: `seed.integration.test.ts` | ✅ Killed (1 falha: `:277-291`) |
| M7 | `src/application/mes/obter-visao-mensal/handler.ts:96` | fim da janela `addMeses(C, MESES_DE_PROJECAO)` → `MESES_DE_PROJECAO - 1` (off-by-one) | unit: `obter-visao-mensal/handler.test.ts` | ✅ Killed (1 falha: `:449`, espião do argumento) |

**Sensor depth**: expandido (8 mutantes, ≥5), por ser a fatia de base do simulador.
**Result**: 8/8 killed — PASS ✅

Isolamento: ao final, `git worktree remove --force` do scratch e `git worktree prune`. O `git status --porcelain` da worktree real mostrou `M next-env.d.ts` depois da confirmação do e2e rodada na própria worktree (o `next dev` regrava esse arquivo, como `AGENTS.md` avisa); restaurado com `git checkout -- next-env.d.ts`, e o porcelain voltou ao baseline vazio. Nenhum arquivo de código ou teste da worktree real foi alterado.

Observação (não é gap): M7 morreu só pelo espião de `:449` (argumentos exatos de `listarEntre`); os testes por valor não discriminam o fim da janela porque as fixtures de `semearMesesSeguintes` só povoam abril e maio. O AC 4 define a forma da chamada, então a prova é a correta; um lançamento em C + 12 e outro em C + 13 nas fixtures tornaria o fim da janela visível também pelo valor. Fica como sugestão para a fatia `simular`, que vai depender desse limite.

---

## Interactive UAT Results

Não realizado: a fatia não muda interação nem visual (a Visão geral continua com 3 linhas e os mesmos números, provado pelo e2e). Os checks automatizados bastam.

---

## Code Quality

| Principle | Status |
| --- | --- |
| Minimum code | ✅ Um método de port com duas implementações, uma constante nova na página, um `slice`, uma troca de argumento no seed |
| Surgical changes | ✅ 21 arquivos no diff, todos exigidos pelas tasks; nenhum arquivo fora do escopo |
| No scope creep | ✅ Nada de `/simular`, landing ou 12 linhas na tela; `MESES_DE_AVULSOS` intocado, como o Out of Scope pede |
| Matches patterns | ✅ Mesma ordem e filtro de `listarPorCompetencia` no Drizzle e no fake; testes co-locados; integração só em Postgres real (AD-010); `competencia` como `'YYYY-MM'` e dinheiro em centavos inteiros (AD-001, AD-002); nenhum `any`, `toFixed` ou `float` no diff |
| Spec-anchored outcome check (asserted values match spec) | ✅ Todos os ACs assertam valores literais que a spec define; nenhum teste deriva o esperado da mesma aritmética que o código, salvo a nota sobre `:449` |
| Per-layer Coverage Expectation met | ✅ Caso de uso com unit 1:1 (ACs 2, 4 de HORIZ-01; AC 4 de HORIZ-03); port e fake com toda a semântica (`fakes.test.ts:350-405`); repositório com caminho principal, pontas, cancelado, ordem e invertido; seed com integração; página com e2e (composição, L-014) |
| Every test maps to a spec requirement — no unclaimed tests | ✅ Os 11 testes novos/alterados citam o AC no nome ou no comentário; os três ajustes de literal (4 → 13; 3 → 12 meses) estão justificados por HORIZ-01, AC 1, e marcados no próprio teste |
| Documented guidelines followed | ✅ `AGENTS.md` (AD-001, AD-002, AD-003, AD-006, AD-009, AD-010); AD-011 não se aplica (a fatia não toca `src/domain/parcelamento` nem `competencia.ts`); `.specs/STATE.md` AD-023 registrado com Decision/Reason/Trade-off/Scope/Date/Status |
| AD-009: nenhum dado real | ✅ Fixtures com "Conta de água", "pessoa-a@example.com", valores de 100, 180,00, 300,00 e 1.000,00 escolhidos por valor matemático |

Nota de qualidade (não bloqueia): o comentário em `src/application/recorrencias/materializar/handler.ts:87` ainda diz "a régua de comprometimento futuro projeta três meses"; a frase ficou desatualizada com o horizonte de doze. É só texto, fora da superfície mudada pelo diff; vale corrigir numa próxima passagem.

---

## Gate Check

- **Gate command**: `pnpm verify` (typecheck && lint && test:unit && test:integration && build), rodado na worktree com o Postgres do Docker na porta 5433
- **Result**: exit 0. Biome: 369 arquivos, sem apontamento. Unitários: 132 arquivos, **2.095 passed**, 0 failed. Integração: 25 arquivos, **413 passed**, 0 failed. `next build`: "Compiled successfully".
- **e2e**: `pnpm exec playwright test e2e/horizonte-doze-meses.spec.ts e2e/saldo-futuro.spec.ts` rodado por mim na worktree: **5 passed**, 0 failed (14,6 s). A suíte completa (267 e2e, exit 0) foi rodada no gate da T7 e está registrada em `tasks.md` e no handoff de `STATE.md`; aceito esse registro.
- **Test count before feature**: 2.088 unitários, 406 de integração, 266 e2e
- **Test count after feature**: 2.095 unitários, 413 de integração, 267 e2e
- **Delta**: +7 unitários, +7 de integração, +1 e2e
- **Skipped tests**: nenhum
- **Failures**: nenhuma
- **Test Integrity**: nenhuma contagem diminuiu; nenhuma assertion enfraquecida. Três literais mudaram por mudança de spec (`obter-uso-no-mes/handler.test.ts:161` 4 → 13; `handler.integration.test.ts:112-113` 4 → 13; `obter-visao-mensal/handler.test.ts:343-356` 3 → 12 objetos), cada um ganhando mais valores assertados, não menos.

---

## Fix Plans

Nenhum: sem gap de AC, sem mutante sobrevivente, sem spec-precision gap, sem `SPEC_DEVIATION`.

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| --- | --- | --- |
| HORIZ-01 | Implementing | ✅ Verified |
| HORIZ-02 | Implementing | ✅ Verified |
| HORIZ-03 | Implementing | ✅ Verified |
| HORIZ-04 | Implementing | ✅ Verified |

(O Verifier não edita `spec.md`; a atualização acima fica para o orquestrador aplicar no fechamento.)

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 12/12 ACs matched spec outcome, 0 spec-precision gaps
**Sensor**: 8/8 mutations killed
**Gate**: `pnpm verify` exit 0 (2.095 unit + 413 integration, build ok); e2e da fatia 5/5

**What works**: materialização e projeção de 12 meses pela mesma constante; `futuro` com 12 itens literais, inclusive na virada de ano; "Próximos meses" cortado em 3 por constante própria; `listarEntre` inclusivo, sem cancelados, ordenado e vazio quando invertido, no fake e no Postgres; a janela lida numa chamada; o seed cobre o horizonte e a reabertura não cria nada.

**Issues found**: nenhum bloqueante. Duas observações: comentário desatualizado em `materializar/handler.ts:87`; a prova do fim da janela em `obter-visao-mensal/handler.test.ts:449` é por espião, não por valor (sugestão de fixture em C + 12 / C + 13 para a fatia `simular`).

**Next steps**: orquestrador marca os 4 IDs como Verified no `spec.md`; segue para a fatia 2 (`simular`). Merge e `git push` continuam exigindo autorização separada.
