# landing-jano Validation

**Date**: 2026-11-02
**Spec**: `.specs/features/landing-jano/spec.md`
**Diff range**: `f219110..dad29f9` (16 commits), branch `feat/landing-jano`. Rodada 2 olha `1b672b9..dad29f9`: F1 `a59b6b4`, F2 `bb99fb3`, F3 `588add7`, F4 `0d8865d`, e os dois commits dos achados menores, `318dd99` e `dad29f9`
**Verifier**: independent sub-agent (author ≠ verifier), rodada 2 do ciclo fix→re-verify (iteração 1 de 3)

**Veredito: PASS ✅.** Os quatro gaps da rodada 1 fecharam: cada mutante sobrevivente (m8, m17, m4,
m18) agora morre, e as asserções novas esperam o que a spec e o domínio dizem. Os dois mutantes novos
desta rodada (m19, m20) também morrem. Os commits dos achados menores não mudam comportamento. Gate
verde.

---

## Rodada 1 (resumo)

Relatório anterior commitado em `1b672b9`, diff `f219110..d4ab37d`. Veredito da rodada 1: FAIL, com
36 de 40 ACs com evidência e 14 de 18 mutantes mortos. Os quatro sobreviventes eram gaps de teste,
não defeitos de produto:

| Fix | AC | Mutante sobrevivente | Causa |
| --- | --- | --- | --- |
| Fix 1 | JANO-04 AC 2 | m8 `FUSO = "UTC"` | os dois instantes do teste caíam no mesmo mês em UTC e em São Paulo |
| Fix 2 | JANO-02 AC 4 | m4 `vermelho: depois <= 0` | nenhum mês da fixture terminava em exatamente zero |
| Fix 3 | JANO-02 AC 3 | m17 sem o listener `input` do valor | o navegador só mudava o campo das vezes |
| Fix 4 | JANO-02 AC 5 | m18 sem o veredito no `aria-label` | ninguém lia o `aria-label` depois de ligar |

Achados menores da rodada 1, sem fix task: comentário "O único script" em `site/index.html`, nome
de teste com "a seguir" em `site/estrutura.test.mjs`, comentário do fuso errado, `textoEnxergaAte`
chamado duas vezes em `resposta-da-simulacao.tsx`.

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1 a T8 | ✅ Done | conferidos na rodada 1; nada do produto mudou desde então além do refactor de `318dd99` |
| F1 | ✅ Done | `a59b6b4`; m8 morre |
| F2 | ✅ Done | `bb99fb3`; m4 morre |
| F3 | ✅ Done | `588add7`; m17 morre |
| F4 | ✅ Done | `0d8865d`; m18 morre |

`tasks.md` marca F1 a F4 como `[x]` na seção "Fix tasks (Verifier, rodada 1)".

---

## Fechamento dos gaps

| Gap | Spec-defined outcome | `file:line` + assertion nova | Valor esperado confere com | Mutante | Result |
| --- | --- | --- | --- | --- | --- |
| Fix 1, JANO-04 AC 2 | horizonte começa no mês corrente do fuso `America/Sao_Paulo` | `site/simulador.test.mjs:96` `assert.equal(S.competenciaCorrente("2026-04-01T02:00:00.000Z"), "2026-03")`; `:98` `assert.equal(S.competenciaCorrente("2026-04-01T03:00:00.000Z"), "2026-04")` | 02h UTC de 1º/04 = 23h de 31/03 em São Paulo (UTC-3, sem horário de verão desde 2019), março; 03h UTC = 00h de 1º/04, abril. O pacote real devolve `2026-03` e `2026-04`. O comentário de `:94-95` agora está certo | m8 (`"UTC"`) falha em `:96`; m19 (`"America/Noronha"`, UTC-2) falha em `:96` com `'2026-04' !== '2026-03'`. O par de instantes prende exatamente UTC-3 | ✅ Fechado |
| Fix 2, JANO-02 AC 4 | os meses que ficam no vermelho ganham `--negativo` e negrito | `site/simulador.test.mjs:132` `responder({ valor: "2.050,00", vezes: "10", horizonte })`; `:135` `assert.equal(sexto.depois, 0)`; `:136` `assert.equal(sexto.vermelho, false)`; `:137` zero colunas vermelhas; `:138` `cabe === true`; `:139` veredito "Cabe. Nenhum mês fica no vermelho." | O domínio: `src/domain/mes/simular-compra.ts:111` `cabe: linhas.every((linha) => linha.jaFaltava \|\| linha.saldoDepois >= 0)`, e a frase do app conta como derrubado só `saldoDepois < 0` (`src/components/texto-do-veredito.ts:67`). Zero cabe e não é vermelho. Conta: 205,00 por mês; sexto saldo da casa 20500 (`site/fonte/casa-inventada.ts:14`) - 20500 = 0; quinto 21500 - 20500 = 1000. O pacote real devolve `depois` `[61500,20500,35500,48500,1000,0,…]` | m4 (`<= 0`) falha em `:136` com `true !== false` | ✅ Fechado |
| Fix 3, JANO-02 AC 3 | mudar qualquer campo recalcula sem recarregar e sem rede | `site/verificar-navegador.mjs:86` `pagina.fill("#simulador-valor", "4.800,00")`; `:88` `/^Em 12x não cabe: .+ no vermelho\. Em \d+x cabe\.$/` sobre o veredito; `:91` nome do gráfico de novo; a checagem de rede (`:92-99`) roda depois dessa troca | Antes da troca o estado é 12x com "Cabe." (`:76-78`), então só um recálculo pelo campo do valor tira o veredito de lá. O pacote real devolve "Em 12x não cabe: março de 2027 e abril de 2027 ficam no vermelho. Em 24x cabe." no horizonte de nov/2026; a regex aceita a forma, porque o mês depende do relógio | m17 (sem o listener do valor) e m20 (`campoValor.defaultValue` no lugar de `.value`) falham nas seis combinações: "com R$ 4.800,00 em 12x o veredito foi \"Cabe. Nenhum mês fica no vermelho.\"" | ✅ Fechado |
| Fix 4, JANO-02 AC 5 | o gráfico tem um nome acessível que repete o veredito | `site/verificar-navegador.mjs:32-38` `conferirNomeDoGrafico`: `texto === "" \|\| !nome.endsWith(texto)` reprova, com `nome` = `getAttribute("aria-label")` de `#simulador-grafico` e `texto` = `#simulador-veredito`; chamado em `:50` (ao carregar), `:80` (em 12x) e `:91` (com R$ 4.800,00) | "Repete o veredito": o `aria-label` termina com o texto que está na região `aria-live`, lido do DOM depois de cada resposta (`site/fonte/simulador.ts:255-258` monta o prefixo fixo + `resposta.veredito`) | m18 (sem `${resposta.veredito}`) falha nos três momentos e nas seis combinações | ✅ Fechado |

### Os outros 36 ACs

A evidência da rodada 1 continua valendo: nada de `site/fonte`, `site/index.html` (fora do
comentário), `site/estilos.css`, `site/simulador.js` nem `src/domain` mudou em `1b672b9..dad29f9`
(`git diff 1b672b9..dad29f9 -- site/simulador.js` vazio). As citações de linha em
`site/estrutura.test.mjs` não mudaram (o único ajuste trocou o nome de um teste na mesma linha, `:485`).
As de `site/simulador.test.mjs` e `site/verificar-navegador.mjs` desceram com as inserções; as
atuais são:

| AC | Rodada 1 | Agora |
| --- | --- | --- |
| JANO-03 AC 3 (333,34, 333,33, 333,33) | `site/simulador.test.mjs:102` | `site/simulador.test.mjs:104` |
| JANO-04 AC 4 e JANO-03 ACs 1 e 2 (10x, 2 derrubados, 12) | `:108-114` | `:111`, `:116` |
| JANO-03 ACs 1 e 2 (12x cabe) | `:124` | `:126` |
| JANO-02 AC 4 (12 colunas, nov e mar) | `:130`, `:139`, `:143` | `:144`, `:153`, `:157` |
| JANO-03 AC 4 (sem valor) | `:154-156` | `:168` em diante |
| JANO-03 AC 5 (1 a 120) | `:163-165` | `:178` em diante |
| JANO-03 AC 7 (Enxergo até) | `:176`, `:178` | `:190`, `:192` |
| JANO-02 AC 2 (veredito inicial) | `site/verificar-navegador.mjs:39` | `site/verificar-navegador.mjs:47` |
| JANO-02 AC 4 (12 colunas, 2 vermelhas, cor e peso) | `:43`, `:47`, `:63` | `:52`, `:56`, `:72` |
| JANO-03 AC 6 (o exemplo some com JS) | `:35` | `:43` |

**Status**: ✅ 40 de 40 ACs com evidência `file:line` e valor esperado igual ao da spec.

---

## Os commits dos achados menores

- `318dd99` `src/components/resposta-da-simulacao.tsx:50` guarda `textoEnxergaAte(simulacao)` numa
  constante e `:59` usa a constante nos dois lugares. Mesma condição (`=== null`), mesmo elemento, mesma
  classe. `git diff 1b672b9..dad29f9 -- src` só mostra esse arquivo (+2 −3).
  `git diff f219110..dad29f9 -- 'src/**/*.test.*'` vazio: `resposta-da-simulacao.test.tsx` e
  `simulador.test.tsx` não mudaram (JANO-03 AC 8). Os dois passam: 2 arquivos, 25 testes.
  `site/fonte` não importa `resposta-da-simulacao.tsx`, e o teste de frescor (JANO-05 AC 2) segue verde.
- `dad29f9` muda só um comentário em `site/index.html:32-33` e o nome de um teste em
  `site/estrutura.test.mjs:485`, que agora cita JANO-06 AC 1 e o rodapé. As asserções do teste são as
  mesmas.
- O comentário do fuso (`site/simulador.test.mjs:94-95`) foi corrigido dentro do F1.
- Ficou de fora, por escolha, a duplicação de três linhas de `inteiro` (`site/fonte/simulador.ts:85-88`),
  que a rodada 1 já tinha aceitado.

---

## Discrimination Sensor

Scratch: cópia de `site/`, `src/`, `tsconfig.json` e `package.json` em
`/private/tmp/claude-502/-Users-moisesmenezes-Documents-myBilling/e646bb6a-8036-4875-a13a-7da7f1fb7f7c/scratchpad/sensor2/`,
`node_modules` em symlink para o do worktree, uma cópia limpa por mutante, reconstrução com
`node site/construir.mjs` em cada uma. A base do scratch ficou verde antes dos mutantes: reconstrução
idêntica byte a byte ao `site/simulador.js` versionado (`cmp`), 59/59 `node:test`, navegador com
0 violações e sem rolagem nas seis combinações. O scratch foi apagado. `git status --porcelain` do
worktree saiu vazio antes e depois, idêntico.

| Mutation | File:line | Description | `node --test site/simulador.test.mjs` | `node site/verificar-navegador.mjs` | Killed? |
| -------- | --------- | ----------- | ---- | ---- | ------- |
| m8 | `site/fonte/simulador.ts:34` | `FUSO = "America/Sao_Paulo"` → `"UTC"` | exit 1, "JANO-04 AC 2: o mês corrente sai do fuso de São Paulo" | exit 0 (o relógio de hoje não vira de mês) | ✅ Killed |
| m17 | `site/fonte/simulador.ts:262` | tira `campoValor.addEventListener("input", atualizar)` | exit 0 | exit 1, nas seis combinações | ✅ Killed |
| m4 | `site/fonte/simulador.ts:148` | `vermelho: depois < 0` → `depois <= 0` | exit 1, `site/simulador.test.mjs:136` `true !== false` | exit 0 | ✅ Killed |
| m18 | `site/fonte/simulador.ts:258` | tira `${resposta.veredito}` do `aria-label` | exit 0 | exit 1, "o nome do gráfico não repete o veredito" ao carregar, em 12x e com R$ 4.800,00 | ✅ Killed |
| m19 (novo) | `site/fonte/simulador.ts:34` | `FUSO` → `"America/Noronha"` (UTC-2): fuso errado que não é UTC | exit 1, `:96` `'2026-04' !== '2026-03'` | exit 0 | ✅ Killed |
| m20 (novo) | `site/fonte/simulador.ts:243` | `responder({ valor: campoValor.defaultValue, … })`: o listener existe, mas lê o valor inicial | exit 0 | exit 1, "com R$ 4.800,00 em 12x o veredito foi \"Cabe. Nenhum mês fica no vermelho.\"" nas seis combinações | ✅ Killed |

**Sensor depth**: expandida, como na rodada 1. Os quatro sobreviventes de novo, mais dois mutantes
escolhidos para testar a força das asserções novas: m19 prova que o teste do fuso prende UTC-3, e
não só "diferente de UTC"; m20 prova que o teste do campo do valor percebe uma leitura velha, e não só
a falta do listener.
**Result**: 6/6 killed - PASS ✅. Somando a rodada 1, 20 de 20 mutantes morrem com a suíte atual.

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ os quatro fixes só somam asserções; o produto não muda |
| Surgical changes | ✅ F1 troca dois instantes e o comentário; F2 é um teste novo; F3 e F4 somam passos a `conferirSimulador`; `318dd99` é um refactor de uma constante |
| No scope creep | ✅ nada fora de `site/*.test.mjs`, `site/verificar-navegador.mjs`, um comentário, um nome de teste, `tasks.md` e o refactor |
| Matches patterns | ✅ mesmo estilo de `falhas.push` do verificador; o teste novo do pacote segue o padrão dos vizinhos (`HORIZONTE` fixo, `local()` só onde compara objeto) |
| Spec-anchored outcome check (asserted values match spec) | ✅ 40/40; os quatro valores novos conferidos contra o domínio e contra o pacote |
| Per-layer Coverage Expectation met | ✅ pacote: fuso com instante que discrimina e limite zero; navegador: os dois campos e o nome acessível depois de cada resposta |
| Every test maps to a spec requirement - no unclaimed tests | ✅ o teste novo leva "JANO-02 AC 4" no nome; os passos novos do navegador levam "JANO-02 AC 3" e "JANO-02 AC 5" no comentário |
| Documented guidelines followed: `AGENTS.md`, `.claude/skills/tlc-spec-driven/references/coding-principles.md` | ✅ nenhuma asserção enfraquecida, nenhum teste apagado, nenhum `skip`; AD-009: a fixture nova (R$ 2.050,00 e R$ 4.800,00) é escolhida pela conta, não por realismo |

Achado menor, sem fix task: a regex de `site/verificar-navegador.mjs:88` não exige "e" entre dois
meses, ao contrário da de `:47`. Não enfraquece nada (o teste do pacote fixa a frase exata), e não
pede mudança.

---

## Gate Check

- **Gate command**: `pnpm verify && pnpm site:verificar`
- **Rodado pelo Verifier nesta sessão**, no worktree:
  - `pnpm exec vitest run --project componentes src/components/resposta-da-simulacao.test.tsx src/components/simulador.test.tsx`: exit 0, 2 arquivos, 25 testes
  - `pnpm site:verificar`: exit 0, 59/59 `node:test` (0 fail, 0 skipped); navegador com 0 violações de axe e sem rolagem horizontal nas seis combinações
  - `pnpm lint`: exit 0, 391 arquivos
  - `pnpm typecheck`: exit 0
  - `pnpm test:unit`: exit 0, 136 arquivos, 2.164 testes, branches 414/414 = 100%
- **Não rodado pelo Verifier**: `pnpm test:integration` e `pnpm build`. Fica valendo a rodada do autor
  depois dos fixes (413 de integração, build verde). `1b672b9..dad29f9` não toca `src/infrastructure`,
  `src/application`, `src/app` nem `src/domain`; o único arquivo de `src` é o refactor de um componente
  coberto pelos testes acima e pelo typecheck.
- **Result**: PASS, 0 failures, 0 skips
- **Test count before feature**: site 35 (`site/estrutura.test.mjs` em `f219110`)
- **Test count after feature**: site 59 (46 estruturais e 13 do pacote); unitários 2.164
- **Delta**: +24 no site (+1 desde a rodada 1, o teste do zero); o navegador ganhou três leituras do nome do gráfico e a troca do valor

---

## Requirement Traceability Update

O Verifier não edita `spec.md`. Status para o orquestrador gravar:

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| JANO-01 | Implemented | ✅ Verified |
| JANO-02 | Implemented (Needs Fix na rodada 1: Fix 2, 3 e 4) | ✅ Verified (F2 `bb99fb3`, F3 `588add7`, F4 `0d8865d`; m4, m17, m18, m20 morrem) |
| JANO-03 | Implementing | ✅ Verified |
| JANO-04 | Implemented (Needs Fix na rodada 1: Fix 1) | ✅ Verified (F1 `a59b6b4`; m8 e m19 morrem) |
| JANO-05 | Implementing | ✅ Verified |
| JANO-06 | Implemented | ✅ Verified |
| JANO-07 | Implemented | ✅ Verified (AC 1 por inspeção das quatro imagens, na rodada 1) |
| JANO-08 | Implementing | ✅ Verified |

---

## Summary

**Overall**: ✅ Ready.

**Spec-anchored check**: 40/40 ACs batem com o que a spec define
**Sensor**: 6/6 nesta rodada (20/20 somando a rodada 1)
**Gate**: 2.164 unitários, 25 de componente e 59 do site verdes; navegador limpo; typecheck e lint verdes; integração e build citados da rodada do autor

**What works**: o teste do fuso agora usa um instante que só São Paulo põe em março; o limite zero do
vermelho segue o domínio (`saldoDepois >= 0` cabe); o navegador muda os dois campos e lê o nome
acessível do gráfico depois de cada resposta; os commits menores não mudam comportamento.

**Issues found**: nenhum bloqueante.

Lições: candidatas desta fatia (instante que vira de mês num fuso só; fixture exatamente no limite de
um predicado; um teste por campo quando a spec diz "qualquer campo") não foram gravadas por
`scripts/lessons.py`, porque esta rodada está proibida de mudar outros arquivos. Fica para o
orquestrador.
