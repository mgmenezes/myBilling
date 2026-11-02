# O app se chama Jano: Validation

**Date**: 2026-11-02
**Spec**: `.specs/features/renomear-jano/spec.md`
**Diff range**: `f9734c1..0786619` (5 commits, branch `feat/renomear-jano`)
**Verifier**: independent sub-agent (author ≠ verifier)

**Verdict**: FAIL. The app shows Jano everywhere the spec asks for, and every visible text is pinned by a
test that kills its mutant. Two small gaps block PASS: the `myBilling` scan exempts every test file and
skips some file types, so two mutants survived (NOME-03 AC 2), and `docs/design.md` lacks the note on the
technical identifiers (NOME-04 AC 1).

---

## Task Completion

| Task | Status | Notes |
| --- | --- | --- |
| T1 | ✅ Done | `cbb07c9` |
| T2 | ✅ Done | `cc2987e` |
| T3 | ⚠️ Partial | `ee4d0c1`. The scan is weaker than AC 2: see Fix 1 |
| T4 | ⚠️ Partial | `0786619`. `docs/design.md` has no identifiers note: see Fix 2 |

---

## Spec-Anchored Acceptance Criteria

### NOME-01: A marca do Jano no app

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| AC 1: link "Jano" with the two-arc symbol, to `/` | link name "Jano", `href="/"`, symbol present | `src/components/menu-lateral.test.tsx:39` `expect(within(menu).getByRole("link", { name: "Jano" }).getAttribute("href")).toBe("/")`; `:47-49` symbol inside the link, `aria-hidden` `"true"`, `querySelectorAll("path")` `toHaveLength(2)`; `e2e/visao-tres-colunas.spec.ts:175` `toHaveAttribute("href", "/")` | ✅ PASS |
| AC 2: "Menu do Jano" and "Áreas do Jano" | exact accessible names | `src/components/menu-lateral.test.tsx:32` `getByRole("complementary", { name: "Menu do Jano" })`; `:55-57` `getByRole("navigation", { name: "Áreas do Jano" })` with 5 links; e2e helpers in 6 specs (`e2e/visao-tres-colunas.spec.ts:121`, `e2e/cadastros-colunas.spec.ts:225`, ...) | ✅ PASS |
| AC 3: `<title>` "Jano", description "As contas da casa, mês a mês." | exact strings | `e2e/auth.spec.ts:98` `toHaveTitle("Jano")`; `e2e/auth.spec.ts:99-102` `meta[name="description"]` `toHaveAttribute("content", "As contas da casa, mês a mês.")` | ✅ PASS |
| AC 4: icon from `src/app/icon.svg` with the two arcs; no `src/app/favicon.ico` | one SVG icon link, 2 paths; no favicon.ico | `e2e/auth.spec.ts:104` `toHaveCount(1)` on `link[rel="icon"][type="image/svg+xml"]`; `:106` `resposta.ok()` `true`; `:108` `svg.match(/<path\b/g)` `toHaveLength(2)`; `:111` no `href*="favicon.ico"` link, `toHaveCount(0)`. File deleted in `cbb07c9` | ✅ PASS |

### NOME-02: O herói do login

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| AC 1: brand "Jano" with the two-arc symbol | text "Jano" + symbol | `e2e/auth.spec.ts:77-78` `getByText("Jano", { exact: true })` visible; `:79` `svg[data-marca='jano']` `toHaveCount(1)` (2 paths pinned for the shared component at `src/components/menu-lateral.test.tsx:49`) | ✅ PASS |
| AC 2: exact `<h1>` | "Antes de parcelar, pergunte ao Jano." | `e2e/auth.spec.ts:80-82` `getByRole("heading", { level: 1 })` `toHaveText("Antes de parcelar, pergunte ao Jano.")` | ✅ PASS |
| AC 3: exact subtitle | the two sentences of the spec | `e2e/auth.spec.ts:83-88` `getByText("Cadastre a compra parcelada e as contas fixas uma vez. O Jano mostra quanto vai sobrar em cada um dos próximos meses.", { exact: true })` visible | ✅ PASS |
| AC 4: button and restricted-access sentence remain | "Entrar com o Google"; "O acesso é restrito às pessoas autorizadas." | `e2e/auth.spec.ts:89` button visible; `:90` sentence visible; `:91` `not.toContainText("myBilling")` | ✅ PASS |

### NOME-03: Nenhum myBilling que se lê

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| AC 1: denied page, `ACESSO_NEGADO`, Visão geral sentence say Jano | the three sentences with "Jano" | denied page: `e2e/auth.spec.ts:171` status `403`, `:172` `getByText(/Esta conta não tem permissão para usar o Jano\./)` visible; message: `src/lib/nome-publico.test.ts:42` `toBe("Este e-mail não tem acesso ao Jano.")`; Visão geral: `e2e/compra-parcelada.spec.ts:260` `getByText(/O Jano nunca soma nem subtrai um do outro/)` visible | ✅ PASS |
| AC 2: no "myBilling" in `src/` and `site/` source, except the bundle and the tests that assert absence | scan returns `[]` | `src/lib/nome-publico.test.ts:34-38` `expect(comONomeAntigo).toEqual([])`. Current tree is clean (`git grep -n myBilling -- src site` hits only the two absence tests and `site/README.md`, which is documentation). But the scan exempts **every** `*.test.(ts,tsx,mjs)` (`:37`) and reads only `ts,tsx,css,sql,mjs,html,svg` (`:20`): mutants P1 and P2 survived | ❌ GAP (Fix 1) |
| AC 3: bundle regenerated and fresh (JANO-05) | built output equals versioned file | `site/simulador.test.mjs:48-52` `assert.equal(gerado.outputFiles[0].text, pacote, ...)`; bundle has `ACESSO_NEGADO: "Este e-mail não tem acesso ao Jano."` | ✅ PASS |
| AC 4: component and e2e tests look for "Jano" | no test looks for the old name as a positive | `src/components/menu-lateral.test.tsx:32,39,45,55,65`; `e2e/*.spec.ts` (7 files in the diff); `git grep myBilling -- e2e` hits only `e2e/auth.spec.ts:91` (`not.toContainText`) | ✅ PASS |

### NOME-04: Documentos vivos e gates

| Criterion | Spec-defined outcome | Evidence | Result |
| --- | --- | --- | --- |
| AC 1: README, AGENTS, docs/design, deploy, qa, importacao, site/README call it Jano **and** say database, container and package stay `mybilling` | both parts, in each of the 7 files | Name: `README.md:1`, `AGENTS.md:1`, `docs/design.md:1`, `docs/deploy.md:3`, `docs/qa.md:3`, `docs/importacao.md:3`, `site/README.md:7`. Note: `README.md:3-4`, `AGENTS.md:3-4`, `docs/deploy.md:3-4`, `docs/qa.md:3-4`, `docs/importacao.md:3-4`, `site/README.md:7-8`. **`docs/design.md` has no note** (only the title changed) | ❌ GAP (Fix 2) |
| AC 2: posicionamento "Nome" records that since 2026-11-02 the app is Jano outside too | sentence in section "Nome" | `docs/marketing/posicionamento.md:18-21` "Desde 2026-11-02 o app também se chama Jano por fora" | ✅ PASS |
| AC 3: STATE has AD-027 and Handoff; HANDOFF points here | present | `.specs/STATE.md:370` `### AD-027`; Handoff rewritten for `renomear-jano`; `.specs/HANDOFF.md:7-10` | ✅ PASS |
| AC 4: `pnpm verify`, `pnpm site:verificar`, `pnpm test:e2e` exit 0 | exit code 0 each | Verifier run: `pnpm verify` 0, `pnpm site:verificar` 0, `pnpm test:e2e` 0 (282/282) | ✅ PASS |

**Status**: ❌ 2 gaps (NOME-03 AC 2, NOME-04 AC 1). No spec-precision gaps on the ACs: every one names an exact string or state.

---

## Discrimination Sensor

Scratch: a file copy of `src/`, `site/`, `e2e/`, `public/`, `drizzle/` and configs, with an APFS clone of
`node_modules`, under the session scratchpad. The real worktree was never mutated: `git status --porcelain`
was empty before and after (only `next-env.d.ts`, rewritten by `next dev`, restored with `git checkout`).
`e2e/auth.spec.ts` runs in serial mode, so each e2e mutant on it ran alone with `-g`.

| # | File | Mutation | Test run | Killed? |
| --- | --- | --- | --- | --- |
| M1 | `src/components/menu-lateral.tsx:2` | adds the comment `// marca do myBilling` | `nome-publico.test.ts` | ✅ Killed |
| M2 | `src/lib/erros.ts:112` | `ACESSO_NEGADO` "ao Jano." → "ao app." | `nome-publico.test.ts` | ✅ Killed |
| M3 | `src/components/menu-lateral.tsx:37` | `aria-label` "Menu do Jano" → "Menu do app" | `menu-lateral.test.tsx` (5/5 fail) | ✅ Killed |
| M4 | `src/components/navegacao-principal.tsx:110` | `aria-label` "Áreas do Jano" → "Áreas do app" | `menu-lateral.test.tsx` | ✅ Killed |
| M5 | `src/components/marca-jano.tsx:12` | removes `data-marca="jano"` | `menu-lateral.test.tsx` | ✅ Killed |
| M6 | `src/components/marca-jano.tsx:21` | removes the second arc | `menu-lateral.test.tsx` | ✅ Killed |
| M7 | `src/components/marca-jano.tsx:16` | `aria-hidden="true"` → `"false"` | `menu-lateral.test.tsx` | ✅ Killed |
| M8 | `src/components/menu-lateral.tsx:45` | removes `<MarcaJano>` from the menu link | `menu-lateral.test.tsx` | ✅ Killed |
| M9 | `src/components/menu-lateral.tsx:46` | link text "Jano" → "Início" | `menu-lateral.test.tsx` (3 fail) | ✅ Killed |
| M10 | `site/estilos.css:2` | comment back to "landing do myBilling" | `nome-publico.test.ts` | ✅ Killed |
| M11 | `site/index.html` | adds `<!-- myBilling -->` | `nome-publico.test.ts` | ✅ Killed |
| M12 | `src/infrastructure/db/sql/limpar-para-importar.sql:2` | header back to "myBilling" | `nome-publico.test.ts` | ✅ Killed |
| E1 | `src/app/login/page.tsx:41` | `<h1>` → "Antes de parcelar, pergunte." | `auth.spec.ts` herói | ✅ Killed (Received "Antes de parcelar, pergunte.") |
| E2 | `src/app/icon.svg` | file deleted | `auth.spec.ts` aba | ✅ Killed (icon link count 0) |
| E3 | `src/app/forbidden.tsx:17` | "usar o Jano." → "usar o app." | `auth.spec.ts` 403 | ✅ Killed |
| E4 | `src/app/(app)/[competencia]/page.tsx:167` | "O Jano nunca soma" → "O app nunca soma" | `compra-parcelada.spec.ts` "as duas visões" | ✅ Killed |
| E5 | `src/app/login/page.tsx:36` | removes `<MarcaJano>` from the login | `auth.spec.ts` herói | ✅ Killed (svg count 0) |
| E6 | `src/app/layout.tsx:35` | description back to "Controle financeiro da casa" | `auth.spec.ts` aba | ✅ Killed |
| E7 | `src/app/favicon.ico` | old file restored from `f9734c1` | `auth.spec.ts` aba | ✅ Killed (favicon link count 1) |
| P1 | `src/components/botao-pago.test.tsx` | appends `// myBilling` to a test that does not assert absence | `nome-publico.test.ts` | ❌ Survived → Fix 1 |
| P2 | `src/domain/importacao/__fixtures__/Planilha 2026 - Outubro.csv` | appends a line `myBilling` | `nome-publico.test.ts` | ❌ Survived → Fix 1 |

**Sensor depth**: expanded (21 mutations; the feature is text, but AC 2 is a guard meant to catch future regressions)
**Result**: 19/21 killed. FAIL ❌ (P1 and P2 are the same weakness: the scan's exemption list and file types)

---

## Code Quality

| Principle | Status |
| --- | --- |
| Minimum code | ✅ `MarcaJano` is used in two places (menu, login), so the component is justified |
| Surgical changes | ⚠️ `README.md:6` also changed the audience from "para duas pessoas" to "sozinho ou a dois". No AC asks for it, and `AGENTS.md:6` still says "para duas pessoas". Fix 3 |
| No scope creep | ⚠️ same as above |
| Matches patterns | ✅ named export, `readonly` props, Portuguese domain names, co-located test |
| Technical identifiers kept | ✅ `package.json:2` `"name": "mybilling"`; `docker-compose.yml:17` `container_name: mybilling-db`; `src/components/alternador-de-tema.tsx:30` `CHAVE_TEMA = "mybilling:tema"` (not in diff); `.env.example:6`, `playwright.config.ts:15`, `src/infrastructure/db/testing/banco-de-teste.ts:17` keep `mybilling` URLs. `git diff --stat f9734c1..0786619 -- docker-compose.yml package.json .env* playwright.config.ts` is empty |
| History untouched | ✅ `git diff --stat f9734c1..0786619 -- .specs/features` touches only `renomear-jano/`; `docs/referencias` untouched; `STATE.md` only adds AD-027 and replaces the rolling Handoff; `HANDOFF.md` only prepends 5 lines |
| Spec-anchored outcome check | ✅ every asserted string is the exact spec string |
| Per-layer Coverage Expectation (tasks.md matrix) | ✅ component, scan, e2e, `node:test` and grep layers all present |
| Every test maps to a spec requirement | ✅ each new test names its AC (`NOME-01 AC 1`, `NOME-02 ACs 1 a 4`, `NOME-01 ACs 3 e 4`, `NOME-03 AC 1/2`) |
| Documented guidelines followed: `AGENTS.md`, `coding-principles.md` | ✅ no weakened or skipped test; the 6 e2e edits only swap the accessible name |

Minor notes, not blocking:
- `src/lib/nome-publico.test.ts:21` `FORA = new Set(["site/simulador.js"])` is dead: `.js` is not in `EXTENSOES` (`:20`), so the bundle is never read. Fix 1 makes it live.
- The tasks.md deviation for T3 says the scan excludes "os testes que afirmam a ausência do nome", but the code excludes all tests. Fix 1 aligns code with the text.
- `docs/marketing/copy-landing-simulador.md` still says "myBilling" 23 times. The spec does not list it in NOME-04 AC 1 nor in Out of Scope. It reads like a superseded draft, so it is left to the owner.

---

## Edge Cases

- [x] `mybilling:tema` stays: `src/components/alternador-de-tema.tsx:30` unchanged in the diff. Static evidence only: no test pins the literal key (`src/components/alternador-de-tema.test.tsx` imports `CHAVE_TEMA` by reference).
- [x] `DATABASE_URL` with `mybilling` still works: `playwright.config.ts:15` and `banco-de-teste.ts:17` unchanged; the gate below ran integration and e2e against `mybilling_test_jano` on the `mybilling` user.
- [x] Old specs and ADs still say myBilling: no file under `.specs/features/` other than `renomear-jano/` in the diff; AD-001 to AD-026 unchanged.

---

## Gate Check

- **Gate command** (tasks.md, `build`): `pnpm verify && pnpm site:verificar && pnpm test:e2e`, run by the Verifier with `DATABASE_URL_TEST=postgres://mybilling:mybilling@localhost:5433/mybilling_test_jano`
- **`pnpm verify`**: exit 0. typecheck 0, lint 0 (394 files), unit 2167/2167 (137 files), branches in `src/domain` 100% (414/414), integration 413/413 (25 files), `next build` compiled
- **`pnpm site:verificar`**: exit 0. `node:test` 59/59; browser check 0 violations at 360, 768 and 1440 px, light and dark
- **`pnpm test:e2e`**: exit 0. **282/282 passed** (14.8 min). MOV-06 passed in this run
- **Targeted runs**: `menu-lateral.test.tsx` 5/5, `nome-publico.test.ts` 2/2, `auth` + `compra-parcelada` + `visao-tres-colunas` e2e 45/45
- **Test count**: `menu-lateral.test.tsx` 4 → 5 tests; `nome-publico.test.ts` new (2 tests); `e2e/auth.spec.ts` +2 tests and +2 assertions in the 403 test. No test deleted, skipped or weakened: the 6 e2e edits only swap the accessible name
- **Skipped tests**: none
- **Failures**: none

---

## e2e failure in the author's gate (MOV-06)

`e2e/compra-parcelada.spec.ts:463` "marcar pago move o indicador do painel" is **not related** to this slice.
The test clicks the paid button, waits for `aria-pressed="true"`, and navigates to `/2026-03` right away to
read "Ainda não pago". `src/components/botao-pago.tsx:54` uses `useOptimistic`, so `aria-pressed` flips
before the Server Action commits; under load the navigation can read the indicator before the write lands.
The diff does not touch `botao-pago.tsx`, the action, the indicator or `valorDoIndicador`: the only change
in that spec is the regex at `:260`, in another test, and the only change in the page is a sentence inside
`<details>` that does not start with "Ainda não pago". The race is pre-existing; a hardening (wait for the
action's response or for the pending state to clear before `page.goto`) belongs to a separate task. In the Verifier's full run it passed (282/282).

---

## Fix Plans

### Fix 1: the scan exempts every test and skips some file types (NOME-03 AC 2)

- **Root cause**: `src/lib/nome-publico.test.ts:37` drops any `*.test.(ts|tsx|mjs)`; `:20` reads only `ts,tsx,css,sql,mjs,html,svg`. A test comment or a `.csv`/`.js`/`.json` file with "myBilling" passes.
- **Fix task**: replace the regex exemption with the explicit set of absence tests (`src/lib/nome-publico.test.ts`, `site/estrutura.test.mjs`); add `js`, `json` and `csv` to `EXTENSOES` so `FORA` (`site/simulador.js`) is live. Keep `.md` out (documentation, not source).
- **Verify**: rerun P1 and P2 in a scratch copy; both must fail the scan. `pnpm test:unit` 0.
- **Priority**: Minor

### Fix 2: `docs/design.md` lacks the identifiers note (NOME-04 AC 1)

- **Root cause**: T4 changed only the title.
- **Fix task**: add the same note used in the other docs (banco, contêiner e pacote continuam `mybilling`), or amend NOME-04 AC 1 to drop `docs/design.md` from the note clause, since the document cites no technical identifier. Either way, spec and file must agree.
- **Verify**: `grep -n mybilling docs/design.md` shows the note, or the AC no longer requires it.
- **Priority**: Minor

### Fix 3: unrequested audience change in `README.md:6`

- **Root cause**: T4 rewrote "para duas pessoas" while renaming.
- **Fix task**: revert to the original sentence, or record it as an author decision in tasks.md and align `AGENTS.md:6`.
- **Priority**: Cosmetic

---

## Requirement Traceability Update

To apply in `spec.md` (the Verifier changes no file other than this report):

| Requirement | Previous Status | New Status |
| --- | --- | --- |
| NOME-01 | Implemented | ✅ Verified |
| NOME-02 | Implemented | ✅ Verified |
| NOME-03 | Implemented | ❌ Needs Fix (AC 2, Fix 1) |
| NOME-04 | Implemented | ❌ Needs Fix (AC 1, Fix 2) |

---

## Summary

**Overall**: ❌ Not Ready (two minor fixes)

**Spec-anchored check**: 14/16 ACs matched the spec outcome; 0 spec-precision gaps
**Sensor**: 19/21 mutations killed
**Gate**: `pnpm verify` 0 (2167 unit, 414/414 branches, 413 integration, build), `pnpm site:verificar` 0 (59), `pnpm test:e2e` 0 (282/282)

**What works**: menu, login hero, tab title, description and icon, denied page, error message and
Visão geral sentence all say Jano, and each is pinned by a test that killed its mutant. Technical
identifiers and history are untouched.

**Issues found**: Fix 1 (scan exemptions), Fix 2 (`docs/design.md` note), Fix 3 (README audience).

**Next steps**: route Fix 1 to Fix 3 to the implementer, then re-run the Verifier.
