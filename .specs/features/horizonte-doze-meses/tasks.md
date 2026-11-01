# Horizonte de doze meses — Tasks

**Spec**: `.specs/features/horizonte-doze-meses/spec.md`
**Design**: nenhum (fatia média; as decisões de desenho estão nas Assumptions da spec)
**Status**: In Progress
**Total**: 8 tasks em 3 fases, um lote só (execução inline, sem sub-agentes).
**Ajuste na execução (2026-11-01)**: a T2 foi absorvida pela T1. `MovimentoRepositoryDrizzle`
implementa a interface, então acrescentar o método à port sem o Drizzle deixa `pnpm typecheck`
vermelho, e um commit que não compila não entra na história. Port, fake e Drizzle vão juntos, com os
testes unitários e de integração. A T2 fica marcada como absorvida, sem commit próprio.

**Pré-condição**: branch `feat/horizonte-doze-meses`, na worktree `.worktrees/horizonte-doze-meses`,
a partir de `main` (`ff395ba`). O Postgres de `pnpm db:up` precisa estar de pé para os gates
`full` e `build`.

---

## Execution Protocol (MANDATORY -- do not skip)

Implementar com a skill `tlc-spec-driven`, ativada pelo nome. Cada task segue esta ordem:
1. pré-implementação;
2. testes primeiro, derivados dos ACs do `spec.md`;
3. implementação;
4. gate;
5. Test Adequacy Review (evidence-or-zero, `file:line` + assertion);
6. marcar a task em `tasks.md` e a traceability no `spec.md`;
7. **um** commit atômico validado por `check_commit.py`.

Proibições:
- commitar antes do gate;
- enfraquecer, pular ou apagar teste;
- agrupar tasks;
- `git push`, deploy ou qualquer operação remota sem autorização separada.

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

## Test Coverage Matrix

> Gerada do código, de `AGENTS.md` e de `vitest.config.ts`. Guidelines encontradas: `AGENTS.md`
> (100% de branches em `src/domain`; demais camadas, todo ramo e todo caminho de erro; testes
> co-locados; integração só com Postgres real), `vitest.config.ts` (projetos `domain`,
> `componentes`, `integration`), `playwright.config.ts`.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Caso de uso (`src/application/**/handler.ts`) | unit (fakes em memória) | Todo ramo; 1:1 com os ACs; todo edge case listado | `src/application/**/handler.test.ts` | `pnpm test:unit` |
| Port e fake (`src/application/ports/*.ts`) | unit | Toda semântica do método provada no fake | `src/application/ports/fakes.test.ts` | `pnpm test:unit` |
| Repositório Drizzle (`src/infrastructure/db/repositories/*.ts`) | integration (Postgres em Docker) | Caminho principal, pontas inclusivas, cancelado fora, ordem, intervalo invertido | `src/infrastructure/**/*.integration.test.ts` | `pnpm test:integration` |
| Seed (`src/infrastructure/db/seed.ts`) | integration | Janela materializada igual ao horizonte | `src/infrastructure/db/seed.integration.test.ts` | `pnpm test:integration` |
| Página (`src/app/**/page.tsx`) | e2e (Playwright) | Caminho feliz e composição página → domínio (L-014) | `e2e/*.spec.ts` | `pnpm test:e2e` |
| Constante e documentação | none | gate de build | - | build gate only |

## Gate Check Commands

> Geradas de `package.json`.

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Task só com unitários | `pnpm test:unit` |
| Full | Task com integração ou e2e | `pnpm test:unit && pnpm test:integration` (mais `pnpm test:e2e` quando a task toca e2e) |
| Build | Fim de fase e task só de constante ou documentação | `pnpm verify` |

---

## Execution Plan

### Phase 1: A janela numa consulta (HORIZ-03)

```
T1 → T2 → T3
```

### Phase 2: Doze meses (HORIZ-01, HORIZ-02, HORIZ-04)

```
T3 → T4 → T5 → T7
     T4 → T6 → T7
```

### Phase 3: Registro

```
T7 → T8
```

---

## Task Breakdown

### T1: `listarEntre` na port, no fake e no Drizzle (absorve a T2) ✅ Concluída

**What**: Acrescentar `listarEntre(inicio, fim)` a `MovimentoRepository` e implementá-lo no fake em
memória e em `MovimentoRepositoryDrizzle`: não cancelados, competência entre as pontas inclusive,
ordem por competência, data do evento e id; intervalo invertido devolve vazio. Port, fake e Drizzle
mudam juntos porque as duas classes implementam a interface e nada compila sem as três.
**Where**: `src/application/ports/fakes.ts` (a assinatura entra na interface `MovimentoRepository` e a consulta em `movimento.repository.ts`, no mesmo commit)
**Depends on**: None
**Reuses**: `listarPorCompetencia` do fake (`fakes.ts:289`)
**Requirement**: HORIZ-03 (ACs 1, 2, 3)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `fakes.test.ts` prova as pontas inclusivas, o cancelado fora, a ordem e o intervalo invertido
- [x] `listarEntre(c, c)` devolve o mesmo que `listarPorCompetencia(c)`
- [x] `movimento.repository.integration.test.ts` prova o mesmo no Postgres (os itens da T2)
- [x] `pnpm typecheck` sai 0
- [x] Gate: `pnpm test:unit && pnpm test:integration` saem 0: 2.092 unitários (2.088 + 4) e 410 de integração (406 + 4)

**Tests**: integration
**Gate**: full
**Commit**: `feat(ports): listar lançamentos entre duas competências`

---

### T2: `listarEntre` no repositório Drizzle (absorvida pela T1, sem commit próprio) ✅ Concluída na T1

**What**: Implementar `listarEntre` em `MovimentoRepositoryDrizzle` com um `WHERE competencia
BETWEEN` e `canceladoEm IS NULL`, ordenado por competência, data do evento e id.
**Where**: `src/infrastructure/db/repositories/movimento.repository.ts`
**Depends on**: T1
**Reuses**: `listarPorCompetencia` (`movimento.repository.ts:27`), `deCompetencia`, `paraLancamento`
**Requirement**: HORIZ-03 (ACs 1, 2, 3)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `movimento.repository.integration.test.ts` prova: lançamentos em março, abril e junho e um
      cancelado em maio → `listarEntre(2026-03, 2026-06)` devolve os três vigentes, na ordem
- [ ] Prova de concordância: o resultado é igual à união de `listarPorCompetencia` mês a mês
- [ ] `listarEntre(2026-06, 2026-03)` devolve vazio
- [ ] Gate: `pnpm test:unit && pnpm test:integration` saem 0

**Tests**: integration
**Gate**: full
**Commit**: `feat(db): listar lançamentos entre duas competências no Postgres`

---

### T3: `obterVisaoMensal` lê a janela numa chamada ✅ Concluída

**What**: Trocar o laço de `listarPorCompetencia` por uma chamada a `listarEntre(C + 1, C + N)`.
**Where**: `src/application/mes/obter-visao-mensal/handler.ts`
**Depends on**: T2
**Reuses**: `addMeses`, `projetarProximosMeses`
**Requirement**: HORIZ-03 (AC 4)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `handler.test.ts` prova, com espiões, que a janela é lida com **uma** chamada a
      `listarEntre` e nenhuma a `listarPorCompetencia` além da do mês aberto (`handler.test.ts:407-409`)
- [x] Os testes existentes de `futuro` continuam verdes sem mudança de valor
- [x] Gate: `pnpm test:unit` sai 0: 2.093 unitários (2.092 + 1)

**Tests**: unit
**Gate**: quick
**Commit**: `refactor(mes): ler a janela da projeção numa consulta`

---

### T4: O horizonte vira doze meses ✅ Concluída

**What**: `MESES_DE_PROJECAO` passa de 3 para 12 (materialização e projeção, a constante única);
`futuro` passa a ter 12 itens.
**Where**: `src/application/mes/obter-visao-mensal/handler.ts`
**Depends on**: T3
**Reuses**: `materializarRecorrencias` (reexporta a constante), `janelaMaterializacao`
**Requirement**: HORIZ-01 (ACs 1, 2, 3, 4)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `handler.test.ts` prova `futuro` com 12 itens, de C + 1 a C + 12, em ordem (AC 2,
      `handler.test.ts:401-412`), e a virada de ano a partir de novembro (AC 4, `:424-435`), com
      valores literais e não só pela constante
- [x] `materializar/handler.integration.test.ts` prova que materializar com a constante cria 13
      ocorrências de um fixo sem fim (AC 1, `:85-103`) e respeita `competenciaFim` dentro da janela
      (`:123`)
- [x] Um teste prova que a constante da materialização é a mesma da projeção e vale 12 (AC 3,
      `materializar/handler.test.ts:71-72`)
- [x] Os testes de `obter-uso-no-mes` e `obter-todo-mes`, que usam a constante, continuam verdes.
      Três testes que fixavam a janela antiga em literal (4 ocorrências em `obter-uso-no-mes`, unit e
      integração; 3 meses em MOV-06 AC 3) passaram a 13 e a 12, por mudança de spec, sem outra
      alteração
- [x] Gate: `pnpm test:unit && pnpm test:integration` saem 0: 2.095 unitários (+2) e 412 de
      integração (+2)

**Tests**: integration
**Gate**: full
**Commit**: `feat(mes): projetar e materializar doze meses à frente`

---

### T5: "Próximos meses" fica com três linhas ✅ Concluída

**What**: A Visão geral corta `futuro` nas primeiras linhas por uma constante própria
(`LINHAS_DE_PROXIMOS_MESES = 3`), distinta do horizonte.
**Where**: `src/app/(app)/[competencia]/page.tsx`
**Depends on**: T4
**Reuses**: `HorizonteFuturo`
**Requirement**: HORIZ-02 (ACs 1, 2, 3)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `e2e/saldo-futuro.spec.ts` continua a contar 3 itens na seção (`:117`, vermelho com 12 antes
      do corte) e a conferir "Saldo previsto" de abril e maio; o teste de contagem ganhou o comentário
- [x] A constante `LINHAS_DE_PROXIMOS_MESES = 3` vive na página (`page.tsx:36`), separada de
      `MESES_DE_PROJECAO` (AC 3)
- [x] Gate: `pnpm test:unit && pnpm test:integration && pnpm test:e2e` saem 0: 2.095, 412 e 266 e2e

**Tests**: e2e
**Gate**: full
**Commit**: `feat(visao-geral): manter três linhas em Próximos meses com o horizonte de doze`

---

### T6: O seed materializa o horizonte ✅ Concluída

**What**: O seed chama `materializarRecorrencias` com `MESES_DE_PROJECAO` em vez de
`MESES_DE_AVULSOS − 1`.
**Where**: `src/infrastructure/db/seed.ts`
**Depends on**: T4
**Reuses**: `materializarRecorrencias`
**Requirement**: HORIZ-04 (AC 1)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `seed.integration.test.ts` prova que, depois do seed, as ocorrências de recorrência vão de B a
      B + 12 (13 competências literais) e que materializar de novo a partir de B devolve zero
      ("materializa os fixos da base até a base + 12"); vermelho antes da mudança no seed
- [x] Gate: `pnpm test:unit && pnpm test:integration` saem 0: 2.095 e 413 (+1)

**Tests**: integration
**Gate**: full
**Commit**: `feat(seed): materializar os fixos do seed no horizonte de doze meses`

---

### T7: Prova de composição no navegador ✅ Concluída

**What**: Um e2e que cadastra um fixo sem fim em março, abre março e depois março + 12, e vê a
ocorrência do fixo lá, sem ação nenhuma (L-014: a página passa a constante certa).
**Where**: `e2e/horizonte-doze-meses.spec.ts`
**Depends on**: T5, T6
**Reuses**: os helpers de cadastro de fixo de `e2e/recorrencias.spec.ts`
**Requirement**: HORIZ-01 (AC 1)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] O e2e cadastra o fixo, abre março e prova **no banco** que as ocorrências vão de 2026-03 a
      2027-03, 13 competências literais e nenhuma além (limite da janela, L-029); depois abre
      2027-03 e encontra a linha em Lançamentos (`e2e/horizonte-doze-meses.spec.ts`). A prova ficou
      no banco porque abrir o mês distante também materializa, e a linha lá não discriminaria
- [x] Gate: `pnpm test:e2e` sai 0 (resultado abaixo, no commit)

**Tests**: e2e
**Gate**: full
**Commit**: `test(e2e): provar que abrir um mês materializa doze meses à frente`

---

### T8: Registrar a decisão

**What**: AD-023 em `.specs/STATE.md` (horizonte de doze meses e constante separada de exibição),
o handoff, a nota em `docs/roadmap.md`, e `.specs/HANDOFF.md`.
**Where**: `.specs/STATE.md`
**Depends on**: T7
**Reuses**: o formato de AD-022
**Requirement**: HORIZ-01, HORIZ-02, HORIZ-03, HORIZ-04

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] AD-023 com Decision, Reason, Trade-off, Scope, Date, Status
- [ ] Traceability do `spec.md` com todos os IDs em `Implementing`, à espera do Verifier
- [ ] Gate: `pnpm verify` sai 0

**Tests**: none
**Gate**: build
**Commit**: `docs(horizonte): registrar o horizonte de doze meses em AD-023`

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3

Phase 1:  T1 ------→ T2 ------→ T3
Phase 2:  T3 ------→ T4 ------→ T5 ------→ T7
                     T4 ------→ T6 ------→ T7
Phase 3:  T7 ------→ T8
```

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1: port e fake | 1 método, em interface e fake que compilam juntos | ✅ Granular |
| T2: Drizzle | 1 método | ✅ Granular |
| T3: handler lê a janela | 1 função | ✅ Granular |
| T4: constante 12 | 1 constante e os testes que a provam | ✅ Granular |
| T5: página corta em 3 | 1 arquivo | ✅ Granular |
| T6: seed | 1 chamada | ✅ Granular |
| T7: e2e | 1 arquivo | ✅ Granular |
| T8: docs | registro | ✅ Granular |

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | None | início da fase 1 | ✅ Match |
| T2 | T1 | T1 → T2 | ✅ Match |
| T3 | T2 | T2 → T3 | ✅ Match |
| T4 | T3 | T3 → T4 | ✅ Match |
| T5 | T4 | T4 → T5 | ✅ Match |
| T6 | T4 | T4 → T6 | ✅ Match |
| T7 | T5, T6 | T5 → T7, T6 → T7 | ✅ Match |
| T8 | T7 | T7 → T8 | ✅ Match |

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1 | Port e fake | unit | unit | ✅ OK |
| T2 | Repositório Drizzle | integration | integration | ✅ OK |
| T3 | Caso de uso | unit | unit | ✅ OK |
| T4 | Caso de uso + materialização (integração) | integration | integration | ✅ OK |
| T5 | Página | e2e | e2e | ✅ OK |
| T6 | Seed | integration | integration | ✅ OK |
| T7 | Página (composição) | e2e | e2e | ✅ OK |
| T8 | Documentação | none | none | ✅ OK |
