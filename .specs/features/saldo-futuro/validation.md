# Saldo dos próximos meses — Validação

## Validation: saldo-futuro — **PASS**

**Result**: PASS ✅ — rodada 2 (2026-10-30, `bbe9bf5`). As duas correções fecham as duas lacunas da
rodada 1, e só tocam teste.
- **F1** (`0cdf2c6`) põe em abril uma despesa já paga em março. H1, reaplicado sozinho, morre nela, e
  só nela.
- **F2** (`bbe9bf5`) exige o `dl` dentro do próprio cartão. U9 morre nela, e U9b, novo, também: U9b
  põe o `dl` em volta da régua inteira, fora dos cartões.
- Desde `69bd28f`, nenhum arquivo fora de teste e de spec mudou.
- Os mutantes D2, D5, U3 e P2 da rodada 1, repetidos, continuam morrendo.
- O gate está verde: unit 1668, e2e da fatia 15 de 15, `typecheck` e `lint`. A primeira execução do
  e2e caiu num hook de semeadura de `compra-parcelada.spec.ts`, fora da fatia, e a segunda passou
  inteira (ver [Rodada 2](#rodada-2)).
- Os 15 critérios e os 5 edge cases têm assertion sobre o resultado da spec, e todo mutante que
  quebra critério morre.

Detalhe na seção [Rodada 2](#rodada-2), no fim do arquivo. A rodada 1 segue abaixo como foi escrita.

**Rodada 1** (2026-10-30, `69bd28f`): FAIL ❌. Na HEAD o produto faz o que a spec pede: os 15
critérios e os 5 edge cases têm assertion sobre o valor que a spec define. O gate está verde: unit
1666, integração 364, e2e da fatia 15 de 15, `typecheck`, `lint` e `build`. Dos 22 mutantes, 20
morreram. O veredito vem de **dois mutantes vivos**, e nenhum deles é defeito de produto. Nos dois falta
um teste que discrimine, e o teste que falta foi provado numa sonda: passa na HEAD e morre com o
mutante.

1. **Média: a despesa futura paga adiantada não atravessa o handler (SALDO-02 AC 2, edge case 2;
   H1).**
   - A garantia "fora do comprometido e dentro do saldo" só tem prova no domínio
     (`src/domain/mes/projecao.test.ts:216-237`).
   - Nenhuma fixture de `handler.test.ts` nem de `e2e/saldo-futuro.spec.ts` tem uma despesa futura com
     `pagoEm` preenchido.
   - H1 faz o handler entregar à projeção só os lançamentos futuros pendentes
     (`src/application/mes/obter-visao-mensal/handler.ts:91`). Com ele, o unit inteiro (1666) e o e2e
     da fatia (4 de 4) passam.
   - Com esse defeito, o cartão de abril e o card "Saldo previsto" de abril divergem sempre que abril
     tiver conta paga adiantada. É o caso que a decisão "Despesa futura já paga" da spec existe para
     cobrir.
   - Antes desta fatia o filtro era legítimo, porque a projeção só lia o comprometido. A fatia mudou o
     que a projeção precisa receber, e nenhum teste do handler fixa isso. É o padrão da L-014.
2. **Baixa: a "lista de descrição" de SALDO-03 AC 2 não tem assertion (U9).**
   - O teste prova que cada `dt` é seguido do seu `dd`
     (`src/components/horizonte-futuro.test.tsx:62-71`), mas nada prova que os pares estão num `dl`.
   - Trocar o `<dl>` de `src/components/horizonte-futuro.tsx:137` por `<div>` passa nos 6 testes do
     componente e nos 4 do e2e da fatia.
   - O `dt` e o `dd` soltos são HTML inválido, e o leitor de tela perde a lista que a spec nomeia.

Sem lacuna de precisão da spec. Observações para o dono, fora do veredito, em
[Observações](#observações-para-o-dono).

**Data**: 2026-10-30
**Spec**: `.specs/features/saldo-futuro/spec.md` (SALDO-01 a SALDO-03, 15 critérios, 5 edge cases)
**Faixa do diff**: `1ada8af..69bd28f`, 4 commits: a spec (`de81bc4`), o domínio (`17e3933`), o teste
do handler (`bfc08ae`) e a tela (`69bd28f`). A base `1ada8af` é o `main`.
**Verificador**: sub-agente independente (autor ≠ verificador). Só leitura sobre o código e os testes da
fatia.

- **Onde as mutações rodaram**: uma `git worktree` descartável por mutante, em modo detached no
  `69bd28f`, no scratchpad da sessão, com `pnpm install --frozen-lockfile --prefer-offline` próprio.
- **Como**: cada mutante foi aplicado sozinho, por substituição exata de texto que tinha de casar uma
  vez só. Depois de cada um, a worktree foi removida e o `git status --porcelain` do worktree real foi
  comparado com o baseline (` M next-env.d.ts`). As 22 comparações deram iguais. Não houve `git stash`.

---

## Task Completion

Feature Medium, sem `tasks.md`: os passos ficaram implícitos nos commits.

| Passo | Commit | Status | Notas |
| --- | --- | --- | --- |
| 1. Spec | `de81bc4` | ✅ Done | - |
| 2. Domínio: `saldoPrevistoDaCompetencia` e o `saldo` da projeção | `17e3933` | ✅ Done | - |
| 3. Handler: o saldo futuro na visão mensal | `bfc08ae` | ⚠️ Partial | Só teste; a fixture não tem despesa futura paga (lacuna 1) |
| 4. Tela: os cartões dos próximos meses | `69bd28f` | ⚠️ Partial | O `dl` sem assertion (lacuna 2) |

---

## Spec-Anchored Acceptance Criteria

### SALDO-01: saldo de cada mês seguinte, numa definição só

| Critério | Resultado da spec | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| AC 1: entradas − despesas − investimentos, só não cancelados | 100000 − 30000 − 10000 = 60000; cancelados fora | `src/domain/mes/projecao.test.ts:176` - `expect(projecao).toEqual([{ competencia: ABRIL, comprometido: 30000, saldo: 60000 }])`; `:213` - `expect(projecao[0]?.saldo).toBe(100000)` (entrada, investimento e despesa cancelados fora); `:102` - `saldo: -940000` | ✅ PASS |
| AC 2: despesa paga no saldo e fora do comprometido | comprometido 0, saldo 100000 − 30000 = 70000 | `src/domain/mes/projecao.test.ts:236` - `toEqual([{ competencia: ABRIL, comprometido: 0, saldo: 70000 }])` | ✅ PASS (domínio; ver lacuna 1 no handler) |
| AC 3: cada competência isolada | `[100000, 0, -20000]`, sem levar março (500000) nem abril adiante | `src/domain/mes/projecao.test.ts:260` - `expect(projecao.map((p) => p.saldo)).toEqual([100000, 0, -20000])` | ✅ PASS |
| AC 4: mesma função do `competenciaView.saldo` | 123456 − 23456 − 1000 − 9000 = 90000, igual ao `resumoMensal` | `src/domain/mes/projecao.test.ts:285-286` - `toBe(90000)` e `toBe(cardDeAbril)`; estrutura: `src/domain/mes/resumo-mensal.ts:131` e `src/domain/mes/projecao.ts:47` chamam `saldoPrevistoDaCompetencia` (`resumo-mensal.ts:60`) | ✅ PASS |
| AC 5: competência sem lançamento vigente → 0 | `saldo: 0` | `src/domain/mes/projecao.test.ts:61` - `toEqual({ competencia: JUNHO, comprometido: 0, saldo: 0 })`; `src/application/mes/obter-visao-mensal/handler.test.ts:434` - `every((mes) => mes.saldo === 0)` | ✅ PASS |

### SALDO-02: a visão mensal entrega o saldo futuro

| Critério | Resultado da spec | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| AC 1: `futuro` com `competencia`, `comprometido` e `saldo` nos `MESES_DE_PROJECAO` meses | 3 linhas: abril 30000/70000, maio 0/−10000, junho 0/0 | `src/application/mes/obter-visao-mensal/handler.test.ts:389` - `toHaveLength(MESES_DE_PROJECAO)`; `:390-394` - `toEqual([...])` com os três valores | ✅ PASS |
| AC 2: `competenciaView.saldo` do mês seguinte igual ao projetado | abril 70000, maio −10000, dos dois lados | `src/application/mes/obter-visao-mensal/handler.test.ts:404-407` - `toBe(70000)`, `toBe(abril.competenciaView.saldo)`, `toBe(-10000)`, `toBe(maio.competenciaView.saldo)` | ⚠️ PASS com mutante vivo: a fixture não tem despesa futura paga, e H1 passa (lacuna 1) |

### SALDO-03: os cartões dos próximos meses mostram o saldo

| Critério | Resultado da spec | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| AC 1: seção "Próximos meses" | título h2 "Próximos meses"; o antigo some | `e2e/saldo-futuro.spec.ts:113` - `getByRole("heading", { name: "Próximos meses", level: 2 })).toBeVisible()`; `:114` - `getByText("Já comprometido nos próximos meses")).toHaveCount(0)` | ✅ PASS |
| AC 2: mês, "Comprometido" e rótulo do saldo, cada um em `dt`/`dd` numa lista de descrição | pares `[rótulo, DD, valor]` dentro de um `dl` | `src/components/horizonte-futuro.test.tsx:86-94` - `toHaveLength(3)` e `pares(...)).toEqual([["Comprometido", "DD", "R$ 300,00"], ["Vai sobrar", "DD", "R$ 700,00"]])`; `e2e/saldo-futuro.spec.ts:118-127` - `valorDe(...)).toHaveText(...)` | ⚠️ PASS com mutante vivo: a cláusula "numa lista de descrição" não tem assertion, e U9 passa (lacuna 2) |
| AC 3: positivo → "Vai sobrar", valor em `text-positivo` | "Vai sobrar", "R$ 700,00", `text-positivo` | `src/components/horizonte-futuro.test.tsx:104-106` - `textContent).toBe("R$ 700,00")`, `toContain("text-positivo")`, `not.toContain("text-negativo")`; rótulo em `:89` | ✅ PASS |
| AC 4: negativo → "Vai faltar", valor absoluto sem sinal, `text-negativo` | "Vai faltar", "R$ 500,00", sem `-`/`−` | `src/components/horizonte-futuro.test.tsx:115-119` - `toBe("Vai faltar")`, `toBe("R$ 500,00")`, `not.toMatch(/[-−]/)`, `toContain("text-negativo")`; `e2e/saldo-futuro.spec.ts:123` | ✅ PASS |
| AC 5: zero → "Vai sobrar" e "R$ 0,00" em `text-ink` | sem `text-positivo` nem `text-negativo` | `src/components/horizonte-futuro.test.tsx:128-134` - `pares(item)).toEqual([...["Vai sobrar", "DD", "R$ 0,00"]])`, `toContain("text-ink")`, `not.toContain` das duas | ✅ PASS |
| AC 6: seção nas duas visões, sem "Saldo previsto" nem "Saldo do período" | cartão presente em Movimentações; zero "Saldo previsto" lá | `e2e/saldo-futuro.spec.ts:151-153` - `"Saldo do período"` visível em modo estrito, `valorDe(abril, "Vai sobrar")).toHaveText("R$ 700,00")`, `getByText("Saldo previsto")).toHaveCount(0)`; `src/components/horizonte-futuro.test.tsx:142` - `queryByText(/Saldo previsto\|Saldo do período/)).toBeNull()`; Planejamento: `e2e/compra-parcelada.spec.ts:245` - `getByText("Saldo previsto")).toBeVisible()` (estrito: uma ocorrência) | ✅ PASS |
| AC 7: abrir o mês mostra no card o mesmo valor do cartão | abril "R$ 700,00"; maio "-R$ 500,00" | `e2e/saldo-futuro.spec.ts:136-143` - `toBe("R$ 700,00")`, `cardSaldoPrevisto(page)).toHaveText(sobraDeAbril)`, `toHaveText(\`-${faltaDeMaio}\`)` | ✅ PASS |
| AC 8: 400 px sem rolagem horizontal | `scrollWidth > clientWidth` falso | `e2e/saldo-futuro.spec.ts:161-164` - `expect(transborda).toBe(false)` | ✅ PASS |

**Status**: os 15 critérios têm assertion sobre o valor da spec. Dois deles (SALDO-02 AC 2 e SALDO-03
AC 2) têm cláusula ou caso que o sensor mostrou não discriminado. Nenhuma lacuna de precisão: todos os
resultados da spec são exatos.

---

## Edge Cases

- [x] Mês da janela sem lançamento: "Comprometido R$ 0,00" e "Vai sobrar R$ 0,00", sem cor —
  `src/components/horizonte-futuro.test.tsx:128-134`; zero no domínio em
  `src/domain/mes/projecao.test.ts:61` e no handler em
  `src/application/mes/obter-visao-mensal/handler.test.ts:393`.
- [~] Despesa futura já paga: fora do comprometido e dentro do saldo — provado só no domínio
  (`src/domain/mes/projecao.test.ts:236` e `:102`). No handler, nenhuma fixture tem o caso (lacuna 1).
- [x] Lançamento cancelado: fora do comprometido e do saldo — `src/domain/mes/projecao.test.ts:102`
  (`comprometido: 40000`, `saldo: -940000`, sem os 900000 cancelados) e `:213`.
- [x] Investimento futuro: fora do comprometido e subtraído do saldo —
  `src/domain/mes/projecao.test.ts:176` (`comprometido: 30000`, `saldo: 60000`) e
  `src/application/mes/obter-visao-mensal/handler.test.ts:392` (maio `comprometido: 0`, `saldo: -10000`).
- [x] Recorrência sem fim: o saldo só na janela — `src/domain/mes/projecao.test.ts:145-150` (24
  ocorrências, 3 linhas de `saldo: -30000`, `toHaveLength(3)`).

---

## Discrimination Sensor

**Profundidade**: ampliada (P1 com integridade de valor exibido): 22 mutantes de comportamento, 21 na
superfície do diff e 1 sonda fora dela (H1). Unit: `pnpm exec vitest run --project domain --project
componentes`, sem cobertura, para que só assertion mate. e2e: `pnpm exec playwright test
e2e/saldo-futuro.spec.ts`, um por vez.

| # | `file:line` | Mutação | Morto por |
| --- | --- | --- | --- |
| D1 | `src/domain/mes/resumo-mensal.ts:68` | o saldo não subtrai investimentos | ✅ unit, 8 testes (SALDO-01 AC 1, SALDO-02 AC 1 e 2, MOV-05) |
| D2 | `src/domain/mes/resumo-mensal.ts:67` | o saldo ignora a despesa paga | ✅ unit, 4 testes (SALDO-01 AC 2 e AC 4) |
| D3 | `src/domain/mes/projecao.ts:47` | o saldo acumula os meses anteriores da janela | ✅ unit, 8 testes (SALDO-01 AC 3, SALDO-02 AC 1) |
| D3b | `src/domain/mes/projecao.ts:47` | o saldo carrega o do mês corrente | ✅ unit, 3 testes (SALDO-01 AC 3) |
| D4 | `src/domain/mes/resumo-mensal.ts:64` | entrada e investimento cancelados entram no saldo | ✅ unit, 2 testes (SALDO-01 AC 1, MOV-01) |
| D5 | `src/domain/mes/projecao.ts:47` | a projeção calcula o saldo por conta própria, com a regra do comprometido | ✅ unit, 3 testes (SALDO-01 AC 2 e AC 4) |
| D6 | `src/domain/mes/projecao.ts:47` | o saldo lê a competência corrente | ✅ unit, 12 testes |
| D7 | `src/domain/mes/resumo-mensal.ts:131` | o card calcula o saldo por conta própria, sem investimentos | ✅ unit, 5 testes (SALDO-01 AC 4, SALDO-02 AC 2) |
| U1 | `src/components/horizonte-futuro.tsx:71` | condição do sinal invertida (`< 0` → `> 0`) | ✅ unit, 3 testes (SALDO-03 AC 2 a 4) |
| U2 | `src/components/horizonte-futuro.tsx:72,77` | cores trocadas entre sobra e falta | ✅ unit, 2 testes (AC 3 e AC 4) |
| U3 | `src/components/horizonte-futuro.tsx:72,75` | rótulos trocados | ✅ unit, 3 testes (AC 2, 4 e 5) |
| U4 | `src/components/horizonte-futuro.tsx:77` | zero pintado de verde (`> 0` → `>= 0`) | ✅ unit, 1 teste (AC 5) |
| U5 | `src/components/horizonte-futuro.tsx:71` | zero vira "Vai faltar" em vermelho (`< 0` → `<= 0`) | ✅ unit, 1 teste (AC 5) |
| U6 | `src/components/horizonte-futuro.tsx:72` | falta impressa com sinal (sem `Math.abs`) | ✅ unit, 2 testes (AC 2 e AC 4) |
| U7 | `src/components/horizonte-futuro.tsx:145` | rótulo do saldo num `span`, fora do par `dt`/`dd` | ✅ unit, 3 testes (AC 2, 4 e 5) |
| U8 | `src/components/horizonte-futuro.tsx:75` | a sobra rotulada "Saldo previsto" | ✅ unit, 3 testes (AC 2, 5 e 6) |
| U9 | `src/components/horizonte-futuro.tsx:137,150` | `<dl>` vira `<div>`: pares fora de uma lista de descrição | ❌ **sobreviveu**: unit 1666 de 1666 e e2e da fatia 4 de 4 → Fix 2 |
| P1 | `src/app/(app)/[competencia]/page.tsx:197` | título antigo da seção | ✅ e2e `saldo-futuro.spec.ts:108` (unit passa, como esperado) |
| P2 | `src/app/(app)/[competencia]/page.tsx:204` | a página passa o comprometido no lugar do saldo | ✅ e2e `saldo-futuro.spec.ts:108` (unit passa) |
| P3 | `src/app/(app)/[competencia]/page.tsx:195,207` | seção só no Planejamento | ✅ e2e `saldo-futuro.spec.ts:146` (AC 6) |
| P4 | `src/components/horizonte-futuro.tsx:127` | régua sem `overflow-x-auto` | ✅ e2e `saldo-futuro.spec.ts:156` (AC 8) |
| H1 | `src/application/mes/obter-visao-mensal/handler.ts:91` | sonda fora da superfície: o handler entrega à projeção só os futuros pendentes | ❌ **sobreviveu**: unit 1666 de 1666 e e2e da fatia 4 de 4 → Fix 1 |

**Resultado**: 20 de 22 mortos. Na superfície do diff, 20 de 21. FAIL ❌.

### Sondas das correções

Cada sonda acrescenta o teste sugerido numa worktree descartável e roda só ele, primeiro na HEAD e
depois com o mutante.

| Sonda | Teste acrescentado | HEAD | Com o mutante |
| --- | --- | --- | --- |
| F1 | `handler.test.ts`: abril com entrada fixa 100000, fixo 30000 e despesa 20000 paga em `2026-03-28`; `marco.futuro[0]` igual a `{ competencia: "2026-04", comprometido: 30000, saldo: 50000 }` e `abril.competenciaView.saldo` igual a 50000 | passa | H1: falha |
| F2 | `horizonte-futuro.test.tsx`: para os três cartões, `getAllByRole("term").map((t) => t.closest("dl") !== null)` igual a `[true, true]` | passa | U9: falha |

---

## Interactive UAT

Não feito: o verificador roda sem interação com o dono. A feature é visual, e a spec deixa cinco
decisões do autor sem confirmação do dono (ver [Observações](#observações-para-o-dono)).

---

## Code Quality

| Princípio | Status |
| --- | --- |
| Código mínimo | ✅ uma função nova (`saldoPrevistoDaCompetencia`), um campo no tipo, um helper de apresentação |
| Mudança cirúrgica | ✅ a página só troca o título e o mapeamento das props; o import órfão de `formatarBRL` saiu |
| Sem escopo extra | ✅ nada fora de SALDO-01 a SALDO-03 |
| Segue os padrões | ✅ domínio puro (AD-006), centavos inteiros (AD-001), nenhum `toFixed`, classes por extenso para o Tailwind |
| Assertion bate com o resultado da spec | ✅ valores exatos em todos os critérios |
| Cobertura por camada | ⚠️ domínio 1:1 com os ACs e 100% de branches; o handler não carrega o edge case da despesa paga (lacuna 1) |
| Todo teste mapeia para AC ou edge case | ✅ os 16 testes novos citam o AC no nome ou no `describe` |
| Guidelines do projeto | ✅ `AGENTS.md`: fixtures por valor matemático, nomes genéricos (AD-009), e2e preso à região (L-018), composição atravessada no e2e do AC 7 (L-014) |

---

## Gate Check

- **Comando**: as partes de `pnpm verify`, uma por vez, com `DATABASE_URL_TEST` apontando para
  `mybilling_test_trc` no `mybilling-db` (porta 5433). Depois, o e2e da fatia.
- `pnpm typecheck`: exit 0.
- `pnpm lint`: exit 0 (301 arquivos).
- `pnpm test:unit`: 1666 de 1666, 103 arquivos; cobertura de `src/domain` em 100% de branches (355 de
  355).
- `pnpm test:integration`: 364 de 364, 23 arquivos.
- `pnpm build`: exit 0.
- `pnpm exec playwright test e2e/saldo-futuro.spec.ts e2e/compra-parcelada.spec.ts`: 15 de 15, duas
  vezes (no começo e no fim da verificação).
- **Testes antes da fatia**: unit 1654 (rodada 3 de `cor-por-categoria`, no `1ada8af`).
- **Testes depois**: unit 1666, delta +12 (5 do domínio, 2 do handler e 5 do componente). Mais 4 de e2e.
- **Pulados**: nenhum. Nenhum `skip`, `only` ou `todo` nos arquivos da fatia.
- **Assertions removidas**: duas linhas de `projecao.test.ts` (`:61` e `:102` antigas) foram
  reescritas com o campo `saldo` a mais. Ficaram mais fortes, não mais fracas.
- **Nota sobre o baseline**: `next typegen` (do `typecheck`) e `next build` reescrevem o
  `next-env.d.ts` gerado para a forma da HEAD, e `next dev` (do e2e) o reescreve de volta. O baseline
  ` M next-env.d.ts` voltou depois do e2e final. O arquivo não entra no commit.

---

## Fix Plans

### Fix 1: provar a despesa futura paga no handler (Média)

- **Causa**: a garantia de SALDO-01 AC 2 está provada só no domínio. A composição do handler (SALDO-02
  AC 2) é provada com fixtures sem `pagoEm`, e o elo do meio pode filtrar o caso sem que a suíte veja.
- **Task**: em `src/application/mes/obter-visao-mensal/handler.test.ts`, no `describe` de SALDO-02,
  acrescentar a abril uma despesa com `pagoEm` antes de abril. Exigir que `futuro[0]` mantenha o
  comprometido sem ela e o saldo com ela, e que `competenciaView.saldo` de abril dê o mesmo número. A
  sonda F1 é a forma pronta, com 100000 − 30000 − 20000 = 50000.
- **Done when**: o teste passa na HEAD e H1, reaplicado sozinho, morre nele.
- **Opcional**: levar a mesma despesa paga para a fixture de `e2e/saldo-futuro.spec.ts`, para que o
  AC 7 também atravesse a página com o caso.

### Fix 2: provar a lista de descrição (Baixa)

- **Causa**: o teste de SALDO-03 AC 2 lê cada `dt` e o irmão seguinte, mas não o contêiner que a spec
  nomeia.
- **Task**: em `src/components/horizonte-futuro.test.tsx`, exigir que todo `dt` de cada cartão esteja
  dentro de um `dl`, como na sonda F2.
- **Done when**: o teste passa na HEAD e U9, reaplicado sozinho, morre nele.

---

## Requirement Traceability Update

A tabela de `spec.md` não muda nesta rodada: o veredito é FAIL. Proposta para a rodada 2:

| Requirement | Status anterior | Status proposto |
| --- | --- | --- |
| SALDO-01 | Implementing | Verified, se a rodada 2 confirmar: os 8 mutantes do domínio morreram |
| SALDO-02 | Implementing | Needs Fix (Fix 1) |
| SALDO-03 | Implementing | Needs Fix (Fix 2) |

---

## Observações para o dono

Fora do veredito.

1. **Cinco decisões do autor sem confirmação.** A tabela de Assumptions de `spec.md` marca como
   "n (decisão do autor)": a conta do saldo, a despesa paga dentro do saldo, os rótulos "Vai
   sobrar"/"Vai faltar", as cores e o título "Próximos meses". A tela segue as cinco, mas só o dono
   confirma.
2. **O mesmo número aparece em duas formas.** O cartão de maio diz "Vai faltar R$ 500,00", e o card
   "Saldo previsto" de maio diz "-R$ 500,00". É o que o AC 7 pede. A nota nova de `docs/design.md`
   ("Semântica de valor") abre a exceção ao "um `+` ou `−` repete a informação" do parágrafo de cima, e
   diz por quê.
3. **Em Movimentações, a régua mostra um saldo do eixo competência.** Ele fica abaixo do "Saldo do
   período", que é do eixo caixa. Nada soma os dois, e o rótulo não se repete (AC 6). O comprometido
   já aparecia assim antes desta fatia. A spec decide isso de propósito, mas vale o dono ver na tela.

---

## Lições

- **L-010** (U9): "AC com duas cláusulas precisa de uma assertion para cada uma". Repetiu numa segunda
  feature e foi promovida a confirmada.
- **L-042** (H1), candidata: "Teste de composição precisa de fixture com cada edge case cuja garantia
  mora num elo interno". Refina a L-014 em vez de penalizá-la. O autor aplicou a L-014: o e2e do AC 7
  atravessa a página, e `e2e/saldo-futuro.spec.ts:13-17` a cita. O que faltou foi o caso na fixture.

---

## Summary

**Overall**: ❌ Not Ready. Dois testes a acrescentar, sem mudança de código de produto.

**Spec-anchored check**: 15 de 15 critérios com assertion sobre o resultado da spec; 0 lacunas de
precisão; 2 critérios com mutante vivo (SALDO-02 AC 2 e SALDO-03 AC 2).
**Sensor**: 20 de 22 mortos (U9 e H1 vivos).
**Gate**: unit 1666, integração 364, e2e da fatia 15 de 15, `typecheck`, `lint` e `build` verdes.

**O que funciona**: a definição única do saldo, usada pelo card e pela projeção; o mês isolado; os
cancelados fora; o rótulo, a cor e o valor sem sinal no cartão; a seção nas duas visões; a igualdade com
o card ao abrir o mês; os 400 px.

**Próximo passo**: Fix 1 e Fix 2 por um implementador, depois a rodada 2 do Verifier, que reaplica H1
e U9.

---

## Rodada 2

**Data**: 2026-10-30
**Faixa do diff**: `b85aa31..bbe9bf5`, 2 commits: F1 (`0cdf2c6`) e F2 (`bbe9bf5`). Os dois só acrescentam
um caso de teste cada e atualizam a traceability de SALDO-02 e SALDO-03. Fora de teste e de spec, nada
mudou desde `69bd28f`: `git diff --stat 69bd28f..HEAD`, sem `.specs` nem `*.test.*`, sai vazio.
**Verificador**: o mesmo sub-agente independente da rodada 1 (autor ≠ verificador). Só leitura sobre o
código e os testes.

- **Onde as mutações rodaram**: como na rodada 1, uma `git worktree` descartável por mutante, detached
  no `bbe9bf5`, com `pnpm install --frozen-lockfile --prefer-offline` próprio. Não houve `git stash`.
- **Baseline**: nesta rodada, o worktree real começou limpo. O `next-env.d.ts` já tinha voltado à forma
  da HEAD antes da rodada. As 7 comparações depois de cada mutante deram iguais, e a do fim da rodada
  também, depois que o `typecheck` desfez o que o `next dev` do e2e escreve.

### As duas correções

| Fix | Caso novo | Assertion | Prova |
| --- | --- | --- | --- |
| F1 | `src/application/mes/obter-visao-mensal/handler.test.ts:412` - abril com entrada fixa 100000, fixo 30000 e despesa 20000 paga em `2026-03-28` | `:427` - `expect(marco.futuro[0]).toEqual({ competencia: "2026-04", comprometido: 30000, saldo: 50000 })`; `:428` - `expect(abril.competenciaView.saldo).toBe(50000)` | 100000 − 30000 − 20000 = 50000. A paga fica fora do comprometido e dentro do saldo, e o card de abril dá o mesmo número |
| F2 | `src/components/horizonte-futuro.test.tsx:98` - os três cartões | `:105-106` - `termo.closest("dl") !== null && item.contains(termo.closest("dl"))` igual a `[true, true]` em cada cartão | os dois termos de cada cartão dentro de um `dl` do próprio cartão |

As duas assertions são as das sondas F1 e F2 da rodada 1. A F2 ficou mais forte que a sonda, porque
exige também que o `dl` esteja dentro do cartão.

### Critérios que mudam de status

| Critério | Rodada 1 | Rodada 2 | Evidência |
| --- | --- | --- | --- |
| SALDO-02 AC 2 | ⚠️ PASS com H1 vivo | ✅ PASS | `src/application/mes/obter-visao-mensal/handler.test.ts:404-407` e `:427-428` |
| SALDO-03 AC 2 | ⚠️ PASS com U9 vivo | ✅ PASS | `src/components/horizonte-futuro.test.tsx:86-94` e `:105-106` |
| Edge case "despesa futura já paga" | [~] só no domínio | [x] domínio e handler | `src/domain/mes/projecao.test.ts:236` e `src/application/mes/obter-visao-mensal/handler.test.ts:427` |

Os outros 13 critérios e 4 edge cases ficam como na rodada 1, com as mesmas assertions. Os dois commits
só acrescentam linhas, e algumas citações da rodada 1 desceram:
- Em `src/components/horizonte-futuro.test.tsx`, tudo depois de `:94` desceu 13 linhas. AC 3 está
  agora em `:117-119`, AC 4 em `:128-132`, AC 5 em `:141-147` e AC 6 em `:155`.
- Em `src/application/mes/obter-visao-mensal/handler.test.ts`, a assertion do mês vazio (SALDO-01
  AC 5) desceu de `:434` para `:455`.
- As outras citações não mudaram.

Agora são 15 de 15 critérios com assertion sobre o resultado da spec, e nenhum tem mutante vivo. Sem
lacuna de precisão da spec.

### Sensor

Unit: `pnpm exec vitest run --project domain --project componentes`, sem cobertura. e2e:
`pnpm exec playwright test e2e/saldo-futuro.spec.ts`.

| # | `file:line` | Mutação | Rodada 1 | Rodada 2 |
| --- | --- | --- | --- | --- |
| H1 | `src/application/mes/obter-visao-mensal/handler.ts:91` | o handler entrega à projeção só os futuros pendentes | ❌ vivo | ✅ morto pelo unit, 1 teste: o caso da F1 (`handler.test.ts:412`) |
| U9 | `src/components/horizonte-futuro.tsx:137,150` | `<dl>` vira `<div>` | ❌ vivo | ✅ morto pelo unit, 1 teste: o caso da F2 (`horizonte-futuro.test.tsx:98`) |
| U9b | `src/components/horizonte-futuro.tsx:127,137,150,154` | novo: o `dl` sai do cartão e envolve a régua inteira | - | ✅ morto pelo unit, 1 teste: o caso da F2 (a cláusula `item.contains`) |
| D2 | `src/domain/mes/resumo-mensal.ts:67` | o saldo ignora a despesa paga | ✅ | ✅ morto pelo unit, 5 testes (agora também o da F1) |
| D5 | `src/domain/mes/projecao.ts:47` | a projeção calcula o saldo com a regra do comprometido | ✅ | ✅ morto pelo unit, 4 testes (agora também o da F1) |
| U3 | `src/components/horizonte-futuro.tsx:72,75` | rótulos trocados | ✅ | ✅ morto pelo unit, 3 testes |
| P2 | `src/app/(app)/[competencia]/page.tsx:204` | a página passa o comprometido no lugar do saldo | ✅ | ✅ morto pelo e2e `saldo-futuro.spec.ts:108` (unit passa, 1668 de 1668) |

**Resultado**: 7 de 7 mortos. Os dois vivos da rodada 1 morrem, cada um só no caso que a correção
acrescentou. Os outros 15 mortos da rodada 1 não foram repetidos. Os dois commits só acrescentam teste,
e nenhum deles toca o código que esses mutantes alteram.

### Lacuna nova?

Nenhuma.
- Os dois commits não tiram nem afrouxam assertion: o diff só tem linhas acrescentadas em teste.
- Os dois casos novos mapeiam para SALDO-02 AC 2 com o edge case, e para SALDO-03 AC 2.
- A F2 percorre `getAllByRole("listitem")`. Com zero cartões ela passaria sem checar nada, mas o
  `toHaveLength(3)` de `horizonte-futuro.test.tsx:86` impede esse caso.
- A F1 reusa a semeadura de SALDO-02 (`handler.test.ts:355-382`) e acrescenta uma despesa paga. O saldo
  de maio, que a semeadura também cria, não entra na assertion nova, e não precisa: H1 e D2 morrem no
  caso de abril.

### Gate

- `pnpm typecheck`: exit 0.
- `pnpm lint`: exit 0 (301 arquivos).
- `pnpm test:unit`: 1668 de 1668, 103 arquivos; `src/domain` com 100% de branches (355 de 355). São 2
  testes a mais que na rodada 1.
- e2e (`e2e/saldo-futuro.spec.ts` e `e2e/compra-parcelada.spec.ts`, com `DATABASE_URL_TEST` em
  `mybilling_test_trc`):
  - **Primeira execução**: 11 passaram, 1 falhou, 3 não rodaram (modo serial). A falha foi
    `compra-parcelada.spec.ts:381` (CART-02), dentro do `beforeEach` de `:38-41`, antes de qualquer
    assertion: `duplicate key value violates unique constraint "usuario_email_unique"` em
    `semearCadastroBase` (`src/infrastructure/db/testing/banco-de-teste.ts:55`). Os 4 testes de
    `saldo-futuro.spec.ts` passaram nessa mesma execução.
  - **Segunda execução**, logo em seguida e sem mudança nenhuma: 15 de 15.
  - **Leitura**: o arquivo e o código que ele exercita são os mesmos da rodada 1, que passou duas vezes.
    Causa plausível, não confirmada: `src/infrastructure/auth/sessao.ts:65` cria a usuária quando a
    sessão não a encontra. Um pedido do teste anterior ainda em voo pode recriar a Pessoa A entre o
    `limparDados` e o `semearCadastroBase`.
  - Fica como observação para o dono, fora do veredito.
- `pnpm test:integration` e `pnpm build` não foram repetidos. Fora de teste e de spec nada mudou, e os
  dois arquivos de teste alterados rodam no gate unit. Na rodada 1 deram 364 de 364 e exit 0.

### Requirement Traceability Update

| Requirement | Status anterior | Status novo |
| --- | --- | --- |
| SALDO-01 | Implementing | ✅ Verified |
| SALDO-02 | Implementing | ✅ Verified |
| SALDO-03 | Implementing | ✅ Verified |

Em `spec.md`, o Status dos três passa a começar com "Verified". A evidência fica, e "falta o Verifier"
sai.

### Lições

Nenhuma nova. A falha da primeira execução do e2e é de ambiente: um hook de semeadura, num arquivo fora
da fatia, que não se repetiu. Não é sinal de verificação deste código. As lições da rodada 1 (L-010
confirmada e L-042 candidata) continuam como estão.

### Resumo da rodada 2

**Overall**: ✅ Ready.

**Spec-anchored check**: 15 de 15 critérios com assertion sobre o resultado da spec; 0 lacunas de
precisão; 0 mutantes vivos.
**Sensor**: rodada 2, 7 de 7 mortos. Na soma das duas rodadas, 23 mutantes distintos, e todos morrem
na HEAD `bbe9bf5`. Os 15 não repetidos na rodada 2 não tiveram o código alterado pelos dois commits.
**Gate**: unit 1668, `typecheck`, `lint` e e2e da fatia 15 de 15 (na segunda execução) verdes.

**Para o dono**:
- As observações da rodada 1 continuam valendo: cinco decisões do autor sem confirmação, o mesmo
  número em duas formas e o saldo de competência em Movimentações.
- Uma nova: o `beforeEach` de `e2e/compra-parcelada.spec.ts` pode colidir com a criação da usuária
  pela sessão.
