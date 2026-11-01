# campanha-o-que-vem Validation

**Date**: 2026-11-01
**Spec**: `.specs/features/campanha-o-que-vem/spec.md`
**Diff range**: `74f2fe2..HEAD` (`3a9ab75`, `d2f1da4`, `80ae13b`, `567aef7`), branch `feat/campanha-lista-de-espera`
**Verifier**: independent sub-agent (author ≠ verifier)

Arquivos na superfície do diff: `docs/marketing/posicionamento.md`, `docs/marketing/kit-de-copy.md`,
`site/index.html`, `site/estilos.css`, `site/estrutura.test.mjs`,
`.specs/features/campanha-lista-de-espera/spec.md`, `.specs/HANDOFF.md`,
`.specs/features/campanha-o-que-vem/spec.md`.

---

## Task Completion

Não há `tasks.md`: fatia média com quatro passos inline registrados na traceability da spec.

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1 posicionamento | ✅ Done | `3a9ab75` |
| T2 landing e teste | ✅ Done | `d2f1da4` |
| T3 kit de copy | ✅ Done | `80ae13b` |
| T4 specs e handoff | ✅ Done | `567aef7` |

---

## Spec-Anchored Acceptance Criteria

Para os documentos (VEM-01, VEM-03), a evidência é a linha do documento; limites e palavras proibidas
foram conferidos por script próprio do Verifier (sem alterar nada), com o resultado registrado na
coluna de evidência.

### P1: O posicionamento conta a cena primeiro — VEM-01

| Criterion | Spec-defined outcome | `file:line` + evidência | Result |
| --- | --- | --- | --- |
| AC 1: tese "o app sabe o que vem" em "A tese", com a frase planilha/digitou vs app/vem | Seção "A tese" com a tese e a frase | `docs/marketing/posicionamento.md:37` (`## A tese`), `:39` (`**O app sabe o que vem.**`), `:41` ("A planilha sabe o que você digitou. O caderno sabe o que você anotou... O myBilling tem") | ✅ PASS |
| AC 2: primeira linha da tabela de cenas é "dá pra comprar?", garantia restrita ao que existe, fontes SALDO-03, FIXO-01, AD-002 | Linha 1 da tabela com as três fontes | `docs/marketing/posicionamento.md:68`: cena "Você quer saber se dá para comprar em dez vezes..."; garantia "Cada mês seguinte já nasce... A Visão geral diz quanto vai sobrar ou faltar"; fontes `` `saldo-futuro/spec.md` (SALDO-03), `recorrencias/spec.md` (FIXO-01), AD-002, AD-023 ``. Specs de origem existem (`.specs/features/saldo-futuro/spec.md` contém SALDO-03; `.specs/features/recorrencias/spec.md` contém FIXO-01) | ✅ PASS |
| AC 3: as cinco cenas anteriores continuam, depois da nova | Linhas 2 a 6 iguais às cinco anteriores | `docs/marketing/posicionamento.md:69-73`; `git diff 74f2fe2..HEAD` mostra só a inserção da linha 68, nenhuma linha antiga removida ou alterada | ✅ PASS |
| AC 4: "O que nunca prometer" ganha "simulador como coisa que existe", "em qual fatura cai cada parcela", "quantos meses à frente, em número" | Três linhas novas na tabela | `docs/marketing/posicionamento.md:102` (simulador), `:103` ("Em qual fatura cai cada parcela"), `:104` ("Quantos meses à frente o app enxerga, em número") | ✅ PASS |
| AC 5: seção "O que vem a seguir" com palavras permitidas ("ainda não existe", "é o que estamos fazendo") e proibidas ("em breve" como prazo, "já", "disponível") | Seção com as duas listas | `docs/marketing/posicionamento.md:111` (`## O que vem a seguir`), `:116-117` (`**ainda não existe**`, `**é o que estamos fazendo**`, `Nunca "já", "disponível", "simule agora"`), `:121` (lista recebe primeiro), `:122` (`"Em breve" fica só no botão da lista`) | ✅ PASS |
| AC 6: regras de tom e números de mercado sem mudança | Seções idênticas a `74f2fe2` | Diff por seção entre `74f2fe2:docs/marketing/posicionamento.md` e HEAD: "Tom de voz" (`:147-162`) igual, "Números de mercado" (`:124-135`) igual; também "Para quem", "Concorrência" e "Chamada para ação" iguais. Hunks do diff: só `@@ -10,11`, `@@ -32,24`, `@@ -83,12` | ✅ PASS |

### P1: A landing abre pela cena e diz o que vem a seguir — VEM-02

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| AC 1: `<h1>` com a frase do dono; parágrafo do herói com parcelas, contas fixas e quanto vai sobrar | h1 exatamente "A planilha sabe o que você digitou. O myBilling sabe o que vem." | `site/estrutura.test.mjs:330-333` - `assert.equal(textoVisivel(h1[1]).trim(), "A planilha sabe o que você digitou. O myBilling sabe o que vem.")`; `:336-337` - `assert.match(texto, /quanto vai sobrar/)`, `assert.match(texto, /contas fixas/)`. HTML em `site/index.html:148-151` ("Cadastre a compra parcelada e as contas fixas uma vez. Cada mês seguinte já nasce com elas, e a Visão geral diz quanto vai sobrar em cada um"). Observação: o teste não afirma "parcel" no herói; conferido a olho em `:150` | ✅ PASS |
| AC 2: seis blocos, o primeiro "dá pra comprar" (saldo de hoje; quanto vai sobrar ou faltar), seguido dos cinco anteriores | `blocos.length === 6`, primeiro com os três marcadores | `site/estrutura.test.mjs:288` - `assert.equal(blocos.length, 6)`; `:289-293` temas `["comprar","parcela","fatura","ano","luz","duas pessoas"]`; `:296-299` - `assert.match(primeiro, /dá pra comprar/)`, `/saldo de hoje/`, `/quanto vai sobrar ou faltar/`; `:300-304` cada bloco com `h3`, `dor-cena`, `dor-garantia`. HTML `site/index.html:190-201` (bloco novo) e `:202-259` (cinco anteriores, inalterados no diff) | ✅ PASS |
| AC 3: linha "Quanto vai sobrar nos próximos meses", myBilling vence, antes das linhas da planilha/caderno | `vence === "mybilling"` e índice menor que a primeira linha da planilha | `site/estrutura.test.mjs:351-353` - `findIndex(l => l.tema === "Quanto vai sobrar nos próximos meses")`, `assert.notEqual(indice, -1)`, `assert.equal(linhas[indice].vence, "mybilling")`; `:354-358` - `assert.ok(indice < primeiraDaPlanilha)`. HTML `site/index.html:303-308` | ✅ PASS |
| AC 4: seção `id="a-seguir"` entre números e rodapé, título "O que vem a seguir", simulador "Dá pra comprar?" ainda não existe, o que vai fazer, lista recebe primeiro | h2 exato, três marcadores, posição na ordem | `site/estrutura.test.mjs:362-367` - `assert.match(secao, /<h2\b[^>]*>\s*O que vem a seguir\s*<\/h2>/)`, `/Dá pra comprar\?/`, `/ainda não existe/i`, `/lista de espera/i`; posição por `:25-34` + `:77-89` (`numeros` < `a-seguir` < `rodape`). HTML `site/index.html:450-477` ("Você informa o valor e o número de parcelas. O app mostra quanto sobra em cada mês... Se não cabe, diz em quantas vezes caberia"; "Ainda não existe"; "quem está na lista de espera recebe primeiro") | ✅ PASS |
| AC 5: sem "em breve" fora dos botões; sem "já"/"disponível" em `a-seguir`; nenhuma promessa de "nunca prometer" | `doesNotMatch` em cada caso | `site/estrutura.test.mjs:368-370` - `assert.doesNotMatch(texto, /\bjá\b/i)`, `/dispon[íi]vel/i`, `/em breve/i` (seção `a-seguir`); `:372-373` - `html.replace(/<button\b[^>]*\bbotao-lista\b[^>]*>[\s\S]*?<\/button>/g, "")` + `assert.doesNotMatch(textoVisivel(semBotoes), /em breve/i)`; `:376-381` - `PROMESSAS_PROIBIDAS` (`:265-281`) contra todo o texto visível. Script do Verifier confirma: `a-seguir` sem já/disponível/em breve; landing sem "em breve" fora dos botões | ✅ PASS |
| AC 6: valores em reais na allowlist; sem exclamação, travessão, emoji | allowlist `{"1.000,00","333,34","333,33"}`; `doesNotMatch` em `/!/`, `/[—–]/`, `\p{Extended_Pictographic}` | `site/estrutura.test.mjs:194-199` - `assert.ok(REAIS_PERMITIDOS.has(v))` (allowlist em `:37`); `:396-401` - `assert.doesNotMatch(texto, /!/)`, `/[—–]/`, `/\p{Extended_Pictographic}/u`. Testes pré-existentes, continuam em vigor sobre o HTML novo | ✅ PASS |
| AC 7: ordem inicio, onde-quebra, comparativo, para-dois, sua-planilha, numeros, a-seguir, rodape | Oito ids nesta ordem | `site/estrutura.test.mjs:25-34` - `SECOES = ["inicio","onde-quebra","comparativo","para-dois","sua-planilha","numeros","a-seguir","rodape"]`; `:77-89` - `assert.notEqual(posicao, -1)` por id e `assert.ok(posicoes[i] > posicoes[i-1])` | ✅ PASS |

### P2: O kit de copy fala da mesma cena — VEM-03

| Criterion | Spec-defined outcome | `file:line` + evidência | Result |
| --- | --- | --- | --- |
| AC 1: 6 a 8 headlines, a primeira igual ao `<h1>`, ao menos três sobre "o que vem" | 6 ≤ n ≤ 8; headline[0] == h1; ≥ 3 | `docs/marketing/kit-de-copy.md:13-20`: 8 headlines. Script: `h1 == headline[0]: True`; 4 sobre "o que vem" (`:13` "sabe o que vem", `:14` "quanto vai sobrar em cada um dos próximos meses", `:15` "não sabe das parcelas que vêm", `:17` "não sabe o que ainda vai cair") | ✅ PASS |
| AC 2: três curtos reescritos pela cena "dá pra comprar?", ≤ 280 caracteres, terminando com a chamada | len ≤ 280; sufixo "Entre na lista de espera: [link]" | Script sobre `docs/marketing/kit-de-copy.md:28-30` (Planilha, 279), `:34-36` (Caderno, 249), `:40-42` (Nada, 231); os três terminam com `Entre na lista de espera: [link]`. Planilha (`:28` "Você olha o saldo de hoje e decide se dá para parcelar") e Nada (`:40` "dá pra comprar?") abrem pela pergunta; Caderno (`:34-36`) abre pela metade "o app sabe o que vem" ("a parcela de dezembro ainda cai em fevereiro... a Visão geral diz quanto vai sobrar"), sem a pergunta literal. Observação, não gap | ✅ PASS |
| AC 3: parágrafo sobre o que vem a seguir no longo, com as palavras de VEM-01 AC 5, ≥ 500 palavras | Parágrafo com "ainda não existe", "é o que estamos fazendo", "recebe primeiro"; sem "já"/"disponível"/"em breve"; ≥ 500 | `docs/marketing/kit-de-copy.md:95-98`: "ainda não existe", "É o que estamos fazendo agora", "quem está na lista recebe primeiro"; parágrafo sem "já", "disponível", "em breve"; o que ele faz em duas frases (`:96-97`). Longo com 786 palavras pelo script (`\S+` a partir de `:48`; a traceability diz 792, diferença de método de contagem; ambos ≥ 500) | ✅ PASS |
| AC 4: tom e lista "O que nunca prometer" | 0 `!`, 0 travessão, 0 emoji; nenhum padrão de `PROMESSAS_PROIBIDAS` | Script: kit com 0 exclamações, 0 travessões, 0 emojis. Padrões proibidos: único match é `/sincroniz/` em `:101` "não sincroniza com banco", negação explicitamente permitida pelo posicionamento (`:86-87`), texto pré-existente. Nenhum "N meses" como horizonte (só `:61` "Dois meses depois", narrativa). Headline `:14` ("Antes de parcelar, veja quanto vai sobrar em cada um dos próximos meses") descreve a Visão geral que existe, não o simulador; fica no limite da linha proibida "veja antes de passar o cartão" (`posicionamento.md:102`) e merece atenção do dono, mas não cita valor, parcelas nem simulação | ✅ PASS |

### P2: Os gates continuam verdes e a spec antiga aponta para cá — VEM-04

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| AC 1: teste estrutural prova ordem com oito seções, seis blocos com "comprar", linha do comparativo, `a-seguir` sem palavras proibidas, "em breve" só nos botões | Cada uma das cinco provas presente | Oito seções `site/estrutura.test.mjs:25-34,77-89`; seis blocos e tema "comprar" `:288-289`; linha do comparativo `:351-358`; `a-seguir` sem já/disponível/em breve `:368-370`; "em breve" só em `.botao-lista` `:372-373` (e `:208-219` CAMP-04 AC 2 exige "em breve" dentro dos botões com placeholder) | ✅ PASS |
| AC 2: `pnpm site:verificar` e `pnpm verify` saem 0 | exit 0 em ambos | `pnpm site:verificar`: 25/25 estruturais, 6 combinações de navegador (360/768/1440 × light/dark) com 0 violações de axe e sem rolagem horizontal, `EXIT=0`. `pnpm verify`: Biome 374 arquivos sem erro, 2088/2088 unitários (132 arquivos), 406/406 integração (25 arquivos), build compilado, `EXIT=0` | ✅ PASS |
| AC 3: spec `campanha-lista-de-espera` registra a revisão em CAMP-01 AC 3, CAMP-02 ACs 1 e 2, CAMP-06 AC 1; HANDOFF aponta para a fatia | Menções nas linhas de traceability e no handoff | `.specs/features/campanha-lista-de-espera/spec.md:293` (CAMP-01: "Revisto por `campanha-o-que-vem` (2026-11-01)... o AC 3 ganha três itens"), `:294` (CAMP-02: "AC 1 passa a oito seções... AC 2 passa a seis blocos"), `:298` (CAMP-06: "8 headlines pela nova tese, curtos com 279, 249 e 231 caracteres"); `.specs/HANDOFF.md:7-14` (bloco "2026-11-01: a campanha foi reposicionada", com o caminho da spec em `:11`) | ✅ PASS |

**Status**: ✅ All ACs covered (20/20), 0 spec-precision gaps

### Conferências transversais pedidas

- Nenhuma peça usa "já", "disponível" ou "em breve" ao falar do simulador: posicionamento só os cita
  como palavras proibidas (`:116-117`, `:122`); kit `:95-98` limpo; landing `a-seguir` limpa (teste
  `:368-370` e script).
- Nenhum número de meses como horizonte do app nas peças: ocorrências de "N meses" são
  `posicionamento.md:69` e `index.html:205` ("nos próximos nove meses", contagem de parcelas da cena
  pré-existente), `posicionamento.md:104` (a própria regra, citando "três meses"/"doze meses" como
  exemplos proibidos) e `kit-de-copy.md:61` ("Dois meses depois", narrativa). Nenhuma delas diz
  quantos meses o app enxerga.
- AD-009: nenhum valor em reais novo no diff; os únicos `R$` da landing continuam os da fixture
  (`index.html:210-212`); nenhum nome ou descrição real.

---

## Edge Cases

- [x] "em breve" só dentro de `.botao-lista`: `site/estrutura.test.mjs:372-373` remove os botões e
      exige ausência no resto; `:208-219` exige presença nos botões com placeholder. Mutante (e) morto.
- [x] `a-seguir` usa `cartao`, não `inverso`: `site/index.html:450` (`class="secao"`), `:460` e `:468`
      (`class="cartao"`); `site/estrutura.test.mjs:157-163` continua exigindo exatamente um elemento
      `inverso` na página (`para-dois`, `:366`).
- [x] Seis blocos em grade de três colunas, uma coluna em 360 px: `site/estilos.css:464-467` (`.dores`
      grid sem colunas declaradas = uma coluna), `:488-496` (a partir de 768 px, `repeat(6)` com
      `.dor { grid-column: span 2 }` = três por linha, duas linhas cheias). O diff removeu a regra
      `nth-child` que fazia 2+3. Navegador em 360/768/1440 sem rolagem horizontal (`pnpm site:verificar`).

---

## Gate Check

- **Gate commands**: `pnpm site:verificar` e `pnpm verify` (spec VEM-04 AC 2; não há tasks.md)
- **Result**: `site:verificar` 25 passed, 0 failed, 0 skipped + 6 combinações de navegador sem violação; `verify` 2088 unit + 406 integration passed, 0 failed, 0 skipped; typecheck, lint e build sem erro. Ambos `EXIT=0`.
- **Test count before feature**: 2088 unitários, 406 integração, 22 `test(` em `site/estrutura.test.mjs` (`git show 74f2fe2:site/estrutura.test.mjs`)
- **Test count after feature**: 2088 unitários, 406 integração, 25 `test(` em `site/estrutura.test.mjs`
- **Delta**: +3 testes estruturais novos (`VEM-02 AC 1`, `VEM-02 AC 3`, `VEM-02 ACs 4 e 5`); 2 testes revistos com assertions mais fortes (`CAMP-02 AC 1` de 7 para 8 seções; `CAMP-02 AC 2` de 5 para 6 blocos mais três asserts sobre o primeiro bloco). Nenhuma assertion enfraquecida, nenhum teste removido.
- **Skipped tests**: nenhum
- **Failures**: nenhuma

---

## Discrimination Sensor

Scratch: `git worktree add <scratchpad>/sensor-campanha HEAD` (detached em `567aef7`), mutações
aplicadas por script no `site/index.html` do scratch, `node --test site/estrutura.test.mjs` no
scratch, `git checkout -- site/index.html` entre mutantes, `git worktree remove --force` ao final.
Sem mutação: 25/25. `git status --porcelain` da árvore real: vazio antes, vazio depois (idêntico).

| Mutation | File:line (scratch) | Description | Killed? |
| --- | --- | --- | --- |
| a | `site/index.html:148` | h1 trocado por "As contas da casa, para dois, sem o mês fechar errado." | ✅ Killed por `VEM-02 AC 1` (24/25) |
| b | `site/index.html:190-201` | Primeiro bloco "Dá pra comprar?" removido (ficam cinco) | ✅ Killed por `CAMP-02 AC 2 e VEM-02 AC 2` (24/25) |
| c1 | `site/index.html:303` | `data-vence="mybilling"` da linha "Quanto vai sobrar nos próximos meses" trocado por `"planilha"` | ✅ Killed por `VEM-02 AC 3` (24/25) |
| c2 | `site/index.html:303-308` | Linha "Quanto vai sobrar nos próximos meses" movida para depois do grupo em que a planilha ganha | ✅ Killed por `VEM-02 AC 3` (24/25) |
| d | `site/index.html:471` | "Não tem data." → "Já disponível para quem está na lista." dentro de `a-seguir` | ✅ Killed por `VEM-02 ACs 4 e 5` (24/25) |
| e | `site/index.html:488` | Rodapé: "a lista de espera é o único passo por enquanto." → "a lista de espera abre em breve." (parágrafo fora dos botões) | ✅ Killed por `VEM-02 ACs 4 e 5` (24/25) |
| f | `site/index.html:450-477` | Seção `a-seguir` movida para antes de `numeros` | ✅ Killed por `CAMP-02 AC 1 e VEM-02 AC 7` (24/25) |

**Sensor depth**: expandido (7 mutantes, acima do mínimo de 5 pedido)
**Result**: 7/7 killed - PASS ✅

---

## Code Quality

Guidelines usadas: `AGENTS.md` (AD-009, convenções), `docs/marketing/posicionamento.md` seção "Tom de voz",
`.claude/skills/tlc-spec-driven/references/validate.md` seção 6.

| Principle | Status |
| --- | --- |
| Minimum code: 3 testes novos, 2 revistos; CSS só troca a regra `nth-child` (2+3) por `span 2` uniforme | ✅ |
| Surgical changes: HTML só adiciona o bloco, a linha do comparativo e a seção; os cinco blocos e as demais seções não mudam no diff | ✅ |
| No scope creep: nenhuma captura nova, nenhum token, nenhum número de mercado novo, nenhum componente novo (`cartao`, `secao-cabeca`, `caminhos` reutilizados) | ✅ |
| Matches patterns: testes nomeados por AC como os anteriores; `textoVisivel` reaproveitado; `SECOES` e temas em listas, como já era | ✅ |
| Spec-anchored outcome check (asserted values match spec): h1 por igualdade exata, `blocos.length === 6`, `vence === "mybilling"`, h2 exato, três `doesNotMatch` literais | ✅ |
| Per-layer Coverage Expectation met: página estática, cada AC de VEM-02 com teste estrutural; documentos conferidos por linha e script | ✅ |
| Every test maps to a spec requirement - no unclaimed tests: os três novos e os dois revistos nomeiam VEM-02 AC 1/2/3/4/5/7 | ✅ |
| Documented guidelines followed: `AGENTS.md` AD-009 (sem dado real), "Tom de voz" regras 1, 2, 5, 6, 8, 10 conferidas na landing e no kit | ✅ |
| Would senior engineer approve? Sim. Observação menor: `site/estrutura.test.mjs:342-345` faz um `match` cujo resultado só serve a um `assert.ok` e repete a mesma regex de `:347-349`; redundante, não errado | ✅ |

Observações sem bloqueio (não são gaps):

1. `site/estrutura.test.mjs:327-338` (VEM-02 AC 1) não afirma "parcel" no parágrafo do herói; o
   texto tem "compra parcelada" (`index.html:150`), mas a cobertura dessa metade do AC é só a olho.
2. Kit, headline `:14` "Antes de parcelar, veja quanto vai sobrar em cada um dos próximos meses":
   verdadeira hoje (Visão geral, SALDO-03), mas próxima da frase proibida para o simulador ("veja
   antes de passar o cartão", `posicionamento.md:102`). Decisão de copy do dono.
3. Curto "Caderno" (`kit-de-copy.md:34-36`) conta a cena pela metade "o app sabe o que vem", sem a
   pergunta "dá pra comprar?" literal, que aparece nos outros dois.

---

## Interactive UAT Results

Não realizado pelo Verifier (gate automatizado e conferência de documento). Os "Independent Test" da
spec foram respondidos pela leitura: "o que o app sabe que a planilha não sabe" está no h1 e na linha
`index.html:304-307`; "o que ainda não existe" está em `index.html:469` ("Ainda não existe").

---

## Fix Plans

Nenhum.

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| --- | --- | --- |
| VEM-01 | Implementing | ✅ Verified |
| VEM-02 | Implementing | ✅ Verified |
| VEM-03 | Implementing | ✅ Verified |
| VEM-04 | Implementing | ✅ Verified |

(O Verifier não edita `spec.md`; a atualização acima é para o autor aplicar.)

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 20/20 ACs matched spec outcome, 0 spec-precision gaps
**Sensor**: 7/7 mutations killed
**Gate**: `site:verificar` 25 + 6 combinações de navegador; `verify` 2088 unit + 406 integration; 0 failed

**What works**: posicionamento abre pela tese "o app sabe o que vem" com a cena "dá pra comprar?" em
primeiro e as três proibições novas; landing com h1 do dono, seis blocos, linha do comparativo vencida
pelo myBilling antes das linhas da planilha, seção `a-seguir` entre números e rodapé sem "já",
"disponível" nem "em breve"; kit com 8 headlines (a primeira igual ao h1), curtos em 279/249/231
caracteres, longo com o parágrafo do que vem; spec antiga e HANDOFF apontam para a fatia.

**Issues found**: nenhum bloqueante. Três observações de copy/cobertura listadas em Code Quality.

**Next steps**: autor marca VEM-01 a VEM-04 como Verified na traceability da spec.
