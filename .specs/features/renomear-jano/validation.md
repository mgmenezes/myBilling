# O app se chama Jano: Validation (round 2)

**Date**: 2026-11-02
**Spec**: `.specs/features/renomear-jano/spec.md`
**Diff range**: `f9734c1..d8d7344` (9 commits, branch `feat/renomear-jano`); fixes in `8e39cbf`, `ae7e11c`, `d8d7344`
**Verifier**: independent sub-agent, round 2 (author ≠ verifier)

**Verdict**: PASS ✅. The three round-1 gaps are closed. The scan now exempts only the two absence tests
by name and reads every text type the spec lists, so the round-1 survivors P1 and P2 die, and so do four
fresh mutants. `docs/design.md` has the identifiers note. The README says "duas pessoas" again.

---

## Round 1 in short

Round 1 (`9c7621b`, range `f9734c1..0786619`) failed on two minor gaps and one cosmetic one. 14/16 ACs
matched; the sensor killed 19/21. Gaps: (1) NOME-03 AC 2: the scan exempted every `*.test.*` and skipped
`js`, `json` and `csv`, so P1 (`// myBilling` in `src/components/botao-pago.test.tsx`) and P2 (a line in a
CSV fixture) survived; (2) NOME-04 AC 1: `docs/design.md` lacked the identifiers note; (3) `README.md:6`
changed the audience, which no AC asked for. Gates in round 1: `pnpm verify` 0, `pnpm site:verificar` 0,
`pnpm test:e2e` 0 (282/282).

---

## Gap Closure

| Gap | Spec text now | Fix | `file:line` + evidence | Closed? |
| --- | --- | --- | --- | --- |
| 1. NOME-03 AC 2 scan | `spec.md:108-110`: "Each arquivo de texto em `src/` e `site/` (código, estilo, SQL, HTML, SVG, JSON, CSV e o pacote gerado), fora os dois testes que afirmam a ausência do nome, SHALL não conter "myBilling"" | `8e39cbf` | `src/lib/nome-publico.test.ts:19` `EXTENSOES = /\.(ts\|tsx\|js\|mjs\|css\|sql\|html\|svg\|json\|csv)$/` (adds `js`, `json`, `csv`); `:21` `FORA = new Set(["src/lib/nome-publico.test.ts", "site/estrutura.test.mjs"])` (exemption by name, the `*.test.*` regex is gone); `:37` `.filter((caminho) => !FORA.has(caminho))`; `:39` `expect(comONomeAntigo).toEqual([])`. The two exempt files do assert absence: `site/estrutura.test.mjs:582` `assert.doesNotMatch(html, /myBilling/, ...)` and the scan itself. The bundle `site/simulador.js` is now scanned, not exempt. Sensor P1, P2, Q1 to Q4 all killed | ✅ |
| 2. NOME-04 AC 1 `docs/design.md` | `spec.md:127-129`: the 7 docs "SHALL chamar o produto de Jano, e SHALL dizer que banco, contêiner e pacote continuam `mybilling`" | `ae7e11c` | `docs/design.md:1` "# Identidade visual do Jano"; `docs/design.md:3-4` "Os nomes técnicos continuam `mybilling`: banco, usuário e contêiner do Postgres, pacote, repositório e a chave do tema `mybilling:tema`." The other six still hold: `README.md:3-4`, `AGENTS.md:3-4`, `docs/deploy.md:3-4`, `docs/qa.md:3-4`, `docs/importacao.md:3-4`, `site/README.md:7-8` | ✅ |
| 3. README audience (scope) | no AC; out of scope | `d8d7344` | `README.md:6` "Gestão financeira doméstica para duas pessoas. Substitui uma planilha com uma aba por mês.", the same as `f9734c1:README.md` line 3 apart from the new title and note. Matches `AGENTS.md:6` "para duas pessoas" | ✅ |

The fix tasks are recorded as F1 to F3 in `tasks.md` ("Fix tasks (Verifier, rodada 1)"), each checked.
`check_commit.py` returns 0 for all three commit messages.

---

## Spec-Anchored Acceptance Criteria

The fixes touch only `src/lib/nome-publico.test.ts`, `docs/design.md`, `README.md`, `spec.md` and `tasks.md`.
No production code changed after round 1 (`git diff 9c7621b..d8d7344 -- src site e2e` touches only
`src/lib/nome-publico.test.ts`). The 14 ACs that passed in round 1 keep their evidence. The table repeats
it in short.

| Requirement | AC | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| NOME-01 | AC 1 to 4 | `src/components/menu-lateral.test.tsx:32,39,47-49,55-57`; `e2e/auth.spec.ts:98` `toHaveTitle("Jano")`, `:99-102` description, `:104-111` SVG icon with 2 paths and no `favicon.ico` | ✅ PASS (round 1) |
| NOME-02 | AC 1 to 4 | `e2e/auth.spec.ts:77-79` brand and symbol, `:80-82` `<h1>`, `:83-88` subtitle, `:89-91` button, sentence, `not.toContainText("myBilling")` | ✅ PASS (round 1) |
| NOME-03 | AC 1 | `src/lib/nome-publico.test.ts:43` `toBe("Este e-mail não tem acesso ao Jano.")`; `e2e/auth.spec.ts:171-172`; `e2e/compra-parcelada.spec.ts:260` | ✅ PASS (round 1) |
| NOME-03 | AC 2 | `src/lib/nome-publico.test.ts:19,21,37,39` (see Gap 1) | ✅ PASS (round 2) |
| NOME-03 | AC 3 | `site/simulador.test.mjs:48-52` `assert.equal(gerado.outputFiles[0].text, pacote, ...)`; `node --test` 59/59 this round | ✅ PASS |
| NOME-03 | AC 4 | `src/components/menu-lateral.test.tsx:32,39,45,55,65`; `git grep myBilling -- e2e` only hits `e2e/auth.spec.ts:91` (`not.toContainText`) | ✅ PASS (round 1) |
| NOME-04 | AC 1 | `docs/design.md:3-4` plus the six others (see Gap 2) | ✅ PASS (round 2) |
| NOME-04 | AC 2 | `docs/marketing/posicionamento.md:18-21` | ✅ PASS (round 1) |
| NOME-04 | AC 3 | `.specs/STATE.md:395` `### AD-028` (AD-027 no momento da rodada; renumerada no rebase); `.specs/HANDOFF.md:7-10` | ✅ PASS (round 1) |
| NOME-04 | AC 4 | round 1: `pnpm verify` 0, `pnpm site:verificar` 0, `pnpm test:e2e` 0 (282/282); round 2 gates below | ✅ PASS |

**Status**: 16/16 ACs matched the spec outcome. 0 spec-precision gaps that block (one note below).

---

## Discrimination Sensor

Scratch: a file copy of `src/`, `site/`, `vitest.config.ts`, `tsconfig.json` and `package.json`, with
`node_modules` symlinked, in the session scratchpad. Each mutant was applied in the copy, the scan ran with
`vitest run --project domain src/lib/nome-publico.test.ts`, and the file was restored (or the new file
deleted). After the run, `diff -rq` showed the copy's `src/` and `site/` identical to the worktree. The
real worktree was never mutated: `git status --porcelain` was empty before and after.

| # | File | Mutation | Killed? |
| --- | --- | --- | --- |
| P1 | `src/components/botao-pago.test.tsx` | appends `// myBilling` (a test that does not assert absence) | ✅ Killed (received `["src/components/botao-pago.test.tsx", ...]`) |
| P2 | `src/domain/importacao/__fixtures__/Planilha 2026 - Outubro.csv` | appends a line `myBilling` | ✅ Killed (received `[..., "src/domain/importacao/__fixtures__/Planilha 2026 - Outubro.csv"]`) |
| Q1 | `site/simulador.js` | appends `/* myBilling */` to the bundle | ✅ Killed |
| Q2 | `src/lib/marca.json` (new) | `{"nome": "myBilling"}` | ✅ Killed |
| Q3 | `site/index.html` | appends `<!-- myBilling -->` | ✅ Killed |
| Q4 | `site/simulador.test.mjs` | appends `// myBilling` (a test file that is not one of the two exempt ones) | ✅ Killed |
| C1 | `src/lib/erros.ts` | appends `// mybilling:tema` (control: lowercase technical identifier) | passes, as it should: the spec targets only the "myBilling" spelling |

**Sensor depth**: lightweight plus the two round-1 survivors (6 mutants, 1 control). The fix touches only the scan.
**Result**: 6/6 killed, the control passes. PASS ✅

---

## Gate Check

Run by the Verifier in the worktree:

- `pnpm exec vitest run src/lib/nome-publico.test.ts`: exit 0, 2/2
- `pnpm lint`: exit 0 (biome, 394 files, no fixes)
- `pnpm typecheck`: exit 0 (`next typegen && tsc --noEmit`)
- `node --test 'site/*.test.mjs'`: exit 0, 59/59, 0 skipped
- `git status --porcelain`: empty before and after

Not re-run this round:
- `pnpm test:unit`: author reported exit 0 (2167 tests, `src/domain` branches 414/414) after the fixes.
- `pnpm test:e2e`, `pnpm verify` and `pnpm site:verificar`: round 1 ran all three with exit 0 (e2e 282/282).
  The fixes change one unit test and two docs and touch no app code, page, style or e2e spec, so the e2e
  suite and the build have nothing new to check.

No test deleted, skipped or weakened: the scan's exemption set got smaller and its file set got larger.

---

## Code Quality

| Principle | Status |
| --- | --- |
| Surgical changes | ✅ each fix touches only what its gap names, plus `spec.md` and `tasks.md` in the same commit |
| No scope creep | ✅ README audience reverted (`README.md:6`) |
| Spec and code agree | ✅ the AC 2 wording (`spec.md:108-110`), the test name (`nome-publico.test.ts:34`), the doc comment (`:10-14`) and `tasks.md` F1 all say the same: every text file, the bundle included, only two absence tests out |
| Technical identifiers kept | ✅ `git diff 9c7621b..d8d7344` does not touch `package.json`, `docker-compose.yml`, `.env*` or `playwright.config.ts` |

Notes, not blocking:
- `site/README.md:77` contains "myBilling" (it describes the absence test). `.md` is not in the AC 2 list of
  types, so the spec does not require the scan to read it, and the round-1 fix plan kept `.md` out on purpose.
  The NOME-03 "Independent Test" line (`git grep -n "myBilling" -- src site` returns "nada depois") is
  therefore looser than reality: it returns the two absence tests and `site/README.md:77`. The scan, not that
  grep line, is the AC 2 evidence.
- `src/lib/nome-publico.test.ts:13` is one line over the comment's usual width. Biome accepts it.
- `docs/marketing/copy-landing-simulador.md` still says "myBilling" (noted in round 1, outside NOME-04 AC 1). Left to the owner.

---

## Requirement Traceability Update

To apply in `spec.md` (the Verifier changes no file other than this report):

| Requirement | Previous Status | New Status |
| --- | --- | --- |
| NOME-01 | Implemented | ✅ Verified |
| NOME-02 | Implemented | ✅ Verified |
| NOME-03 | Implemented | ✅ Verified |
| NOME-04 | Implemented | ✅ Verified |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 16/16 ACs matched the spec outcome; 0 spec-precision gaps that block
**Sensor**: 6/6 mutations killed (P1 and P2 from round 1, Q1 to Q4 fresh); the lowercase control passes
**Gate**: scan 2/2, `pnpm lint` 0, `pnpm typecheck` 0, `node --test` 59/59; e2e not re-run (round 1 282/282, no app change since)

**Next steps**: mark NOME-01 to NOME-04 Verified in `spec.md` and close the feature.
