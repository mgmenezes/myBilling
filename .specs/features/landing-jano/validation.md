# landing-jano Validation

**Date**: 2026-11-02
**Spec**: `.specs/features/landing-jano/spec.md`
**Diff range**: `f219110..d4ab37d` (9 commits: `03de964`, `bcdd768`, `acea20d`, `0f07e45`, `6e641db`, `2bef922`, `fe31db7`, `03ebfe9`, `d4ab37d`), branch `feat/landing-jano`
**Verifier**: independent sub-agent (author ≠ verifier)

**Veredito: FAIL ❌.** Todos os ACs têm evidência `file:line` e o gate está verde, mas o sensor achou
4 mutantes sobreviventes em 18. Pela regra do `validate.md` ("Surviving mutants are fix tasks"), a
fatia não fecha até as quatro fix tasks abaixo. São fixes de teste, não de produto: o comportamento
atual está certo. O que falta é teste que perceba quando ele quebra.

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1 | ✅ Done | `bcdd768`; JANO-08 ACs 1 a 3 conferidos no documento |
| T2 | ✅ Done | `acea20d`; `git diff f219110..d4ab37d -- 'src/**/*.test.*'` vazio |
| T3 | ✅ Done | `0f07e45`; fuso (JANO-04 AC 2) e limite zero do vermelho sem teste que discrimine (Fix 1, Fix 2) |
| T4 | ✅ Done | `6e641db` |
| T5 | ⚠️ Partial | `2bef922`; o navegador não troca o campo do valor nem lê o `aria-label` depois de ligar (Fix 3, Fix 4) |
| T6 | ✅ Done | `fe31db7` |
| T7 | ✅ Done | `03ebfe9`; quatro PNGs abertos pelo Verifier |
| T8 | ✅ Done | `d4ab37d` |

---

## Spec-Anchored Acceptance Criteria

### JANO-01: O herói diz o que é

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| AC 1 título e descrição | `<title>` "Jano · As contas da casa, mês a mês"; descrição começa com "Antes de parcelar, pergunte ao Jano." | `site/estrutura.test.mjs:515` `assert.equal(titulo[1], "Jano · As contas da casa, mês a mês")`; `:519` `descricao[1].startsWith("Antes de parcelar, pergunte ao Jano.")` | ✅ PASS |
| AC 2 cabeçalho | marca "Jano" com o símbolo; links `#onde-quebra` "Como funciona", `#perguntas` "Perguntas" | `site/estrutura.test.mjs:529` `assert.equal(textoVisivel(marca[1]).trim(), "Jano")`; `:530` `/<use href="#icone-jano"/`; `:535` `deepEqual(links…, [["#onde-quebra","Como funciona"],["#perguntas","Perguntas"]])` | ✅ PASS |
| AC 3 selo, h1, subtítulo | selo exato, `<h1>` exato, subtítulo com o prefixo exato | `site/estrutura.test.mjs:548` `equal(…selo…, "Contas da casa, mês a mês")`; `:405` `equal(textoVisivel(h1[1]).trim(), "Antes de parcelar, pergunte ao Jano.")`; `:556` `.startsWith("O Jano é um app para as contas da casa, sozinho ou a dois.")` | ✅ PASS |
| AC 4 ações | botão da lista e link "Testar o simulador" para `#simulador` | `site/estrutura.test.mjs:558` `/<button\b[^>]*\bbotao-lista\b/`; `:559` `/<a\b[^>]*\bhref="#simulador"[^>]*>\s*Testar o simulador\s*<\/a>/` | ✅ PASS |
| AC 5 confiança | três itens exatos, nesta ordem | `site/estrutura.test.mjs:565` `deepEqual(itens, ["Pede só o e-mail","Não pede acesso ao seu banco","Página sem rastreador"])` | ✅ PASS |
| AC 6 história | frase exata | `site/estrutura.test.mjs:574` `assert.equal(textoVisivel(historia[1]).trim(), "Jano era o deus romano…")` | ✅ PASS |
| AC 7 sem "myBilling" | nenhum no texto visível, título, descrição, `alt` | `site/estrutura.test.mjs:581` `doesNotMatch(textoVisivel(html), /mybilling/i)`; `:582` `doesNotMatch(html, /myBilling/)`; `:584` laço sobre `alt\|content\|data-coluna\|aria-label`. Mutante m9 morre | ✅ PASS |
| AC 8 comparativo | colunas "Caderno", "Planilha", "Jano"; linha dos próximos meses com `data-vence="jano"` | `site/estrutura.test.mjs:386` `deepEqual(cabecalhos.slice(-3), ["Caderno","Planilha","Jano"])`; `:425` `equal(linhas[indice].vence, "jano")` | ✅ PASS |

### JANO-02: O simulador funciona no herói

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| AC 1 card | `#simulador`, "Dá pra comprar?", "casa inventada", rótulos "Valor da compra" e "Em quantas vezes" | `site/estrutura.test.mjs:616` `/<h2\b[^>]*>\s*Dá pra comprar\?\s*<\/h2>/`; `:617` `/casa inventada/`; `:624` e `:628` `campo(rotulo, id)` exige o `<input>` dentro do `<label>` com o rótulo | ✅ PASS |
| AC 2 estado inicial | R$ 2.400,00 em 10x e o veredito do app | `site/estrutura.test.mjs:626` `/\bvalue="2\.400,00"/`, `:630` `/\bvalue="10"/`; `site/verificar-navegador.mjs:39` `/^Em 10x não cabe: .+ e .+ ficam no vermelho\. Em 12x cabe\.$/` (forma, porque o mês depende do relógio); frase exata num horizonte fixo em `site/simulador.test.mjs:112` | ✅ PASS |
| AC 3 recalcula sem recarregar e sem rede | qualquer campo recalcula | `site/verificar-navegador.mjs:66-68` `fill("#simulador-vezes","12")` e `depois !== "Cabe. Nenhum mês fica no vermelho."`; `:75-82` pedidos fora de `file:`/fontes reprovam; `site/simulador.test.mjs:56` `doesNotMatch(pacote, /\bfetch\(\|XMLHttpRequest\|sendBeacon\|WebSocket/)`. **Só o campo das vezes é exercitado**: m17 (sem o listener do valor) sobrevive | ❌ GAP (Fix 3) |
| AC 4 colunas | uma por mês, nome curto, antes, depois; vermelhos com `--negativo` e negrito | `site/simulador.test.mjs:130` `equal(resposta.colunas.length, 12)`; `:139` `{ mes: "nov", antes: 82000, parcela: 24000, depois: 58000 }`; `:143` `{ mes: "mar", antes: 21500, depois: -2500, vermelho: true }`; `site/verificar-navegador.mjs:43` 12 colunas, `:47` 2 vermelhas, `:63` `mes.cor !== mes.esperado \|\| mes.peso < 700`. Mutante m14 morre. **Limite zero sem teste**: m4 (`depois <= 0`) sobrevive, e o domínio define vermelho como `saldoDepois < 0` (`src/domain/mes/simular-compra.ts:111`) | ❌ GAP (Fix 2) |
| AC 5 `aria-live` e nome do gráfico que repete o veredito | região `aria-live="polite"` com o veredito; `aria-label` do gráfico contém o veredito | `site/estrutura.test.mjs:633-635` `aria-live="polite"` contém `id="simulador-veredito"`; `:638` só exige um `aria-label` estático de 20 ou mais caracteres. Nenhum teste lê o `aria-label` depois de `iniciar`: m18 (veredito fora do `aria-label`) sobrevive | ❌ GAP (Fix 4) |
| AC 6 chamada final | "Quer essa resposta com as suas contas?" e o link da lista | `site/estrutura.test.mjs:641-644` regex da frase seguida de `<a href="#rodape">`, `equal(…, "Entrar na lista de espera")` | ✅ PASS |

### JANO-03: A mesma conta e as mesmas frases do app

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| AC 1 `simularCompra`, `menorParcelamentoQueCabe`, `planoDaCompra`, `PRIMEIRAS` | resposta vinda do domínio | `site/fonte/simulador.ts:113-134` importa e chama as funções; `site/simulador.test.mjs:109` `equal(resposta.menorQueCabe, 12)`; `:102` resíduo nas primeiras. Mutante m3 (`ULTIMAS`) morre | ✅ PASS |
| AC 2 frase de `textoDoVeredito`, módulo puro compartilhado | mesma frase do app | `src/components/texto-do-veredito.ts:1-2` só importa `@/domain` e `@/lib/formatar`; `src/components/resposta-da-simulacao.tsx:4` importa dele; `site/simulador.test.mjs:113-114` frase literal "Em 10x não cabe: março de 2027 e abril de 2027 ficam no vermelho. Em 12x cabe."; `:124` "Cabe. Nenhum mês fica no vermelho.". Mutantes m1 e m2 morrem. O teste compara com o literal, não com uma chamada a `textoDoVeredito` (tasks.md T3 falava em chamada); o literal é a âncora mais forte | ✅ PASS |
| AC 3 R$ 1.000,00 em 3x | 333,34, 333,33, 333,33 nesta ordem | `site/simulador.test.mjs:102` `deepEqual(local(resposta.parcelas), [33334, 33333, 33333])` | ✅ PASS |
| AC 4 valor inválido | "Informe o valor para ver a resposta." e nenhum veredito | `site/simulador.test.mjs:154-156` `equal(tipo,"SEM_VALOR")`, `equal(mensagem,"Informe o valor para ver a resposta.")`, `equal(veredito, undefined)` para `""` e `"abc"`. Mutante m7 morre | ✅ PASS |
| AC 5 vezes fora de 1 a 120 | mensagem de `QTD_PARCELAS_INVALIDA` (`src/lib/erros.ts:69`), sem veredito | `site/simulador.test.mjs:163-165` para `"0"`, `"121"`, `""`: `equal(mensagem, "A quantidade de parcelas precisa estar entre 1 e 120.")`; `:169` 1 e 120 respondem | ✅ PASS |
| AC 6 sem JavaScript | exemplo de R$ 1.000,00 em 3x, "Ligue o JavaScript para testar outra compra.", campos ocultos | `site/estrutura.test.mjs:594` exemplo sem `hidden`; `:596-598` R$ 1.000,00, "333,34, 333,33 e 333,33", a frase; `:601` `data-simulador … hidden`. Com JS: `site/verificar-navegador.mjs:35` o exemplo some. Mutantes m13 e m16 morrem | ✅ PASS |
| AC 7 além do horizonte | "Enxergo até <Mês de ano>." | `site/simulador.test.mjs:176` `equal(resposta.enxergaAte, "Enxergo até Outubro de 2027.")`; `:178` `null` dentro do horizonte | ✅ PASS |
| AC 8 app inalterado | testes de `resposta-da-simulacao` e `simulador` sem mudança de asserção | `git diff f219110..d4ab37d -- 'src/**/*.test.*'` vazio; `src/components/resposta-da-simulacao.test.tsx:154` `getByText("Em 3x não cabe: março e abril ficam no vermelho. Em 5x cabe.")`, `src/components/simulador.test.tsx:155` `getByText("Informe o valor para ver a resposta.")`; 2.164 unitários verdes nesta rodada | ✅ PASS |

### JANO-04: A casa inventada

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| AC 1 doze saldos, cabeçalho "inventados" | 12 inteiros em centavos | `site/simulador.test.mjs:61` `match(fonte, /inventad/i)`; `:63` `equal(saldos.length, 12)`; `:65` `Number.isInteger`. Mutante m6 morre | ✅ PASS |
| AC 2 horizonte do mês corrente em `America/Sao_Paulo`, onze meses seguidos | começa no mês de São Paulo | `site/simulador.test.mjs:73` `deepEqual(competencias, ["2026-12",…,"2027-11"])`. Mutante m5 morre. **Fuso**: `:95-96` usa `2026-03-31T23:30Z` e `2026-04-01T03:30Z`, que dão o mesmo mês em UTC e em São Paulo; o comentário em `:94` está errado (23h30 UTC de 31/03 ainda é 31/03 em UTC). m8 (`FUSO = "UTC"`) sobrevive | ❌ GAP (Fix 1) |
| AC 3 múltiplo de R$ 5,00, de R$ 0,00 a R$ 2.000,00 | `% 500 === 0`, de 0 a 200000 | `site/simulador.test.mjs:66` `equal(saldo % 500, 0)`; `:67` `saldo >= 0 && saldo <= 200000` | ✅ PASS |
| AC 4 R$ 2.400,00 em 10x | não cabe, exatamente 2 derrubados, menor que cabe 12 | `site/simulador.test.mjs:108` `equal(cabe,false)`; `:109` `equal(menorQueCabe,12)`; `:111` `deepEqual(…, ["2027-03","2027-04"])` | ✅ PASS |

### JANO-05: O pacote versionado e fresco

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| AC 1 gerado com comentário no topo | `site/simulador.js` de `site/fonte/simulador.ts`, banner | `site/construir.mjs:22-27` `BANNER`, `entryPoints`, `outfile`; `site/simulador.test.mjs:47` `pacote.startsWith(BANNER)`; reconstrução no scratch é idêntica byte a byte (`cmp`) | ✅ PASS |
| AC 2 frescor | o teste falha dizendo para rodar o comando | `site/simulador.test.mjs:48-52` `equal(gerado.outputFiles[0].text, pacote, "…rode pnpm site:construir")`. Mutante m1 (frase mudada sem reconstruir) morre | ✅ PASS |
| AC 3 exatamente dois scripts, sem terceiros | tema inline sem `src`; `<script src="simulador.js" defer>` | `site/estrutura.test.mjs:166` `equal(scripts.length, 2)`; `:171` `src="simulador.js"`; `:172` `defer`; `:180` só as fontes por fora. Mutantes m10 (sem `defer`) e m11 (terceiro script) morrem | ✅ PASS |
| AC 4 Biome ignora | `!site/simulador.js` | `biome.json:17` `"!site/simulador.js"`; `pnpm lint` saiu 0 (391 arquivos) | ✅ PASS |

### JANO-06: A página não promete o que não existe

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| AC 1 sem `a-seguir`, oito seções em ordem | inicio … rodape | `site/estrutura.test.mjs:648` `deepEqual(SECOES, [...8])`; `:658` `doesNotMatch(html, /\sid="a-seguir"/)`; ordem em `:98` e exaustividade em `:116` | ✅ PASS |
| AC 2 sem "ainda não existe" nem "O que vem a seguir" | texto visível | `site/estrutura.test.mjs:660-661` `doesNotMatch(texto, /ainda não existe/i)`, `/O que vem a seguir/i`. Mutante m12 morre | ✅ PASS |
| AC 3 pergunta do simulador | pergunta exata; resposta com as três ideias | `site/estrutura.test.mjs:667` summary exato; `:671-673` "informa o valor e em quantas vezes", "quanto sobra em cada mês", "em quantas vezes caberia" | ✅ PASS |
| AC 4 legenda do 58% sem o 14% | — | `site/estrutura.test.mjs:681` `doesNotMatch(textoVisivel(figura[1]), /14%/)` | ✅ PASS |

### JANO-07: As capturas sem o nome antigo

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| AC 1 só a área de conteúdo | sem menu lateral | `site/capturar.mjs` recorta a partir do `boundingBox()` do `<main>` (`clip: { x: inicio, … }`). Inspeção visual pelo Verifier dos quatro PNGs (2560x1600): nenhum menu lateral, nenhum "myBilling"; só dados de seed ("Categoria Um" a "Quatro", "Cartão Azul", "Pessoa A", "Entrada 1 2026-11", "Entrada recorrente A/B") | ✅ PASS (inspeção; sem teste automático, como prevê a matriz) |
| AC 2 `width`/`height` iguais ao arquivo em px CSS | IHDR / 2 | `site/estrutura.test.mjs:698-699` `equal(arquivo.largura, largura * 2)`, `equal(arquivo.altura, altura * 2)`; `:701` o escuro tem as mesmas dimensões | ✅ PASS |
| AC 3 Visão geral em `sua-planilha`, Lançamentos em `onde-quebra` | — | `site/estrutura.test.mjs:607-609` | ✅ PASS |
| AC 4 "dados de demonstração" | — | `site/estrutura.test.mjs:710` `match(textoVisivel(legenda), /dados de demonstração/i)` | ✅ PASS |

### JANO-08: Documentos, decisão e gates

| Criterion | Spec-defined outcome | Evidência | Result |
| --- | --- | --- | --- |
| AC 1 posicionamento | Jano desde 2026-11-02; myBilling por dentro até domínio e INPI; simulador fora de "O que nunca prometer" | `docs/marketing/posicionamento.md:13` "O nome público é Jano desde 2026-11-02"; `:18-19` "continuam se chamando myBilling até o domínio … INPI"; `:107-127` a tabela não lista o simulador; `:38` "O simulador existe." | ✅ PASS |
| AC 2 sem "O que vem a seguir"; 14% registrado | — | `docs/marketing/posicionamento.md` títulos `## ` em `:11,22,44,60,84,107,133,164,174,192`, sem "O que vem a seguir"; `:149` "O 14% da mesma matéria … não entra em" | ✅ PASS |
| AC 3 kit | 6 a 8 headlines, a primeira igual ao `<h1>`; 0 "myBilling", 0 "ainda não existe" | `docs/marketing/kit-de-copy.md:13` "Antes de parcelar, pergunte ao Jano." e mais 7 (8 no total); `grep -c myBilling` = 0; `grep -c "ainda não existe"` = 0 | ✅ PASS |
| AC 4 specs revistas, AD-026, Handoff, HANDOFF.md, README | anotações nas três specs | diff das três specs com "(revisto por `landing-jano` …)" em CAMP-03 AC 5, VEM-02 ACs 1, 4, 5 e 7, DOR-02 AC 1, DOR-04 AC 1; `.specs/STATE.md:337` AD-026; `.specs/STATE.md:370` Handoff; `.specs/HANDOFF.md:7` aponta para `landing-jano`; `site/README.md:29` `pnpm site:construir` | ✅ PASS |
| AC 5 gates saem 0 | `pnpm verify && pnpm site:verificar` | ver Gate Check | ✅ PASS |

**Status**: ❌ 4 gaps de discriminação (JANO-02 ACs 3, 4 e 5; JANO-04 AC 2). O resto, 36 de 40 ACs, bate com o que a spec define.

---

## Discrimination Sensor

Scratch: cópia de `site/`, `src/`, `tsconfig.json` e `package.json` em
`/private/tmp/claude-502/-Users-moisesmenezes-Documents-myBilling/e646bb6a-8036-4875-a13a-7da7f1fb7f7c/scratchpad/sensor/`,
com `node_modules` em symlink e uma cópia limpa por mutante. A base do scratch ficou verde antes dos
mutantes (58/58, navegador limpo, reconstrução idêntica byte a byte). `git status --porcelain` do worktree real
saiu vazio antes e depois, idêntico. O scratch foi apagado.

| Mutation | File:line | Description | Rebuild | Killed? |
| -------- | --------- | ----------- | ------- | ------- |
| m1 | `src/components/texto-do-veredito.ts:61` | "Cabe. Nenhum mês fica no vermelho." → "Cabe. Nenhum mês no vermelho." | não | ✅ Killed (frescor, JANO-05 ACs 1 e 2) |
| m2 | `src/components/texto-do-veredito.ts:61` | mesma frase | sim | ✅ Killed (JANO-03 ACs 1 e 2, 12x) |
| m3 | `site/fonte/simulador.ts:119` | `politicaResiduo: "PRIMEIRAS"` → `"ULTIMAS"` no plano | sim | ✅ Killed (JANO-03 AC 3) |
| m4 | `site/fonte/simulador.ts:148` | `vermelho: depois < 0` → `depois <= 0` | sim | ❌ Survived (node:test e navegador) → Fix 2 |
| m5 | `site/fonte/simulador.ts:80` | `addMeses(inicio, indice)` → `indice + 1` | sim | ✅ Killed (4 testes) |
| m6 | `site/fonte/casa-inventada.ts:14` | tira o último saldo (11 meses) | sim | ✅ Killed (4 testes) |
| m7 | `src/components/texto-do-veredito.ts:19` | `TEXTO_SEM_VALOR` → "Informe o valor." | sim | ✅ Killed (JANO-03 AC 4) |
| m8 | `site/fonte/simulador.ts:34` | `FUSO = "America/Sao_Paulo"` → `"UTC"` | sim | ❌ Survived (node:test e navegador) → Fix 1 |
| m9 | `site/index.html:546` | "myBilling" num `alt` | — | ✅ Killed (JANO-01 AC 7) |
| m10 | `site/index.html:86` | tira o `defer` | — | ✅ Killed (JANO-05 AC 3) |
| m11 | `site/index.html:86` | terceiro `<script src="extra.js" defer>` | — | ✅ Killed (JANO-05 AC 3) |
| m12 | `site/index.html:584` | "O simulador ainda não existe." de volta no FAQ | — | ✅ Killed (JANO-06 ACs 1 e 2) |
| m13 | `site/index.html:192` | tira o `hidden` de `[data-simulador]` | — | ✅ Killed (JANO-03 AC 6) |
| m14 | `site/estilos.css:675` | `.coluna-vermelha .coluna-mes` com `var(--ink)` em vez de `var(--negativo)` | — | ✅ Killed (navegador, seis combinações) |
| m15 | `site/fonte/simulador.ts:263` | tira o listener `input` das vezes | sim | ✅ Killed (navegador: 12x continua "Em 10x não cabe") |
| m16 | `site/fonte/simulador.ts:266` | `exemplo.hidden = false` ao ligar | sim | ✅ Killed (navegador) |
| m17 | `site/fonte/simulador.ts:262` | tira o listener `input` do valor | sim | ❌ Survived (node:test e navegador) → Fix 3 |
| m18 | `site/fonte/simulador.ts:258` | tira `${resposta.veredito}` do `aria-label` do gráfico | sim | ❌ Survived (node:test e navegador) → Fix 4 |

**Sensor depth**: expandida (18 mutações; a fatia carrega a promessa pública "a conta é a mesma do app")
**Result**: 14/18 killed, 4 survived - FAIL ❌

Nota: a primeira rodada do m15 no navegador caiu num erro de navegação passageiro. A segunda rodada
morreu nas asserções do simulador, e a base do scratch passou no navegador.

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ `site/fonte/simulador.ts` repete a sequência de `Simulador` sem reescrever conta; `texto-do-veredito.ts` é um movimento literal (diff de `resposta-da-simulacao.tsx` mostra as mesmas linhas removidas) |
| Surgical changes | ✅ `src/` muda só o necessário para tirar a frase do componente; o reexport em `resposta-da-simulacao.tsx:6` mantém o teste sem mudança (JANO-03 AC 8) |
| No scope creep | ✅ app, repositório, chave de tema e projeto na Vercel continuam como estavam (Out of Scope) |
| Matches patterns | ✅ `node:test` + Playwright do mesmo jeito das fatias anteriores; nomes em português; centavos inteiros na casa; `Date` só na entrada do site (`site/fonte/simulador.ts:272`), fora de `src/domain` |
| Spec-anchored outcome check (asserted values match spec) | ⚠️ 36/40; 4 gaps de discriminação acima |
| Per-layer Coverage Expectation met | ⚠️ pacote: o fuso sem teste que discrimine; navegador: só um dos dois campos e o `aria-label` sem leitura |
| Every test maps to a spec requirement - no unclaimed tests | ✅ todo teste novo leva o ID no nome; o teste apagado (VEM-02 ACs 4 e 5) é o que a spec autoriza, e a regra de "em breve" virou o teste `VEM-04 AC 1` (`site/estrutura.test.mjs:433`) |
| Documented guidelines followed: `AGENTS.md`, `.claude/skills/tlc-spec-driven/references/coding-principles.md` | ✅ AD-001, AD-002, AD-006 e AD-009 respeitados; tom (sem "!", travessão nem emoji no texto visível) em `site/estrutura.test.mjs:765-769`, verde |

Achados menores, que não bloqueiam e não pedem fix task:

- `site/index.html:31-32`: o comentário ainda diz "O único script da página: o tema". Agora são dois.
- `site/estrutura.test.mjs:485`: o nome do teste ainda diz "entre 'sua planilha' e 'a seguir'", mas a asserção (`:487`) já usa `rodape`.
- `site/simulador.test.mjs:94`: o comentário do fuso está errado (ver Fix 1).
- `src/components/resposta-da-simulacao.tsx:58-60` chama `textoEnxergaAte(simulacao)` duas vezes. É barato, mas daria para guardar numa constante.
- `site/fonte/simulador.ts:85-88` duplica o `inteiro` de `src/components/simulador.tsx:63`. São três linhas, e a duplicação é aceitável.

---

## Edge Cases

- [x] Apagar o valor mostra "Informe o valor para ver a resposta.": `site/simulador.test.mjs:152-155` (valor `""`)
- [x] Mais de 12 vezes mostra as colunas do horizonte e "Enxergo até": `site/simulador.test.mjs:176` (14x); o número de colunas fica fixo em 12 (`:130`)
- [x] 360 px sem rolagem horizontal, com as doze colunas: `site/verificar-navegador.mjs:145-152` (rolagem) e `:42-45` (12 colunas), nas larguras 360, 768 e 1440 e nos dois temas, verde
- [x] Dezembro atravessa o ano sem buraco: `site/simulador.test.mjs:72-86`
- [x] Só os testes de VEM-02 ACs 4 e 5 saem: o diff de `site/estrutura.test.mjs` tira só esse teste (35 testes antes, 46 depois), e `src/**/*.test.*` não muda

---

## Gate Check

- **Gate command**: `pnpm verify && pnpm site:verificar`
- **Rodado pelo Verifier nesta sessão**: `pnpm typecheck` (0), `pnpm lint` (0, 391 arquivos), `pnpm test:unit` (0: 136 arquivos, 2.164 testes, branches 414/414 = 100%), `pnpm site:verificar` (0: 58/58 `node:test`; navegador com 0 violações de axe e sem rolagem nas seis combinações).
- **Não rodado pelo Verifier**: `pnpm test:integration` e `pnpm build`. Fica valendo a rodada do autor em 2026-11-02, com 413 testes de integração e build verdes. A superfície do diff não toca `src/infrastructure`, `src/application` nem `src/app`.
- **Result**: 2.164 unitários e 58 do site verdes; 0 falhas; 0 skips
- **Test count before feature**: site 35 (`site/estrutura.test.mjs` em `f219110`); unitários sem mudança de arquivo de teste
- **Test count after feature**: site 58 (46 estruturais e 12 do pacote); unitários 2.164
- **Delta**: +23 no site (+24 novos e 1 removido por decisão registrada na spec)
- **Skipped tests**: nenhum
- **Failures**: nenhuma. A falha passageira de T3 (tasks.md, Observação) não se repetiu nesta rodada

---

## Fix Plans

### Fix 1: o teste do fuso não distingue São Paulo de UTC (JANO-04 AC 2)

- **Root cause**: `site/simulador.test.mjs:95-96` usa dois instantes que caem no mesmo mês em UTC e em São Paulo. m8 (`FUSO = "UTC"`) passa.
- **Fix task**: trocar ou somar um instante que vira de mês só em UTC, por exemplo `assert.equal(S.competenciaCorrente("2026-04-01T02:00:00.000Z"), "2026-03")` (23h de 31/03 em São Paulo, já abril em UTC; conferido no pacote atual, que devolve `"2026-03"`), e corrigir o comentário de `:94`.
- **Done when**: m8 morre.
- **Priority**: Major (a spec nomeia o fuso explicitamente)

### Fix 2: o limite zero do vermelho não é testado (JANO-02 AC 4)

- **Root cause**: nenhum mês da fixture fica com `depois === 0`, então `<` e `<=` dão o mesmo resultado. O domínio define vermelho como `saldoDepois < 0` (`src/domain/mes/simular-compra.ts:111`), e com `<=` a landing pintaria de vermelho um mês que o veredito diz que cabe.
- **Fix task**: em `site/simulador.test.mjs`, testar `responder({ valor: "2.050,00", vezes: "10", horizonte: HORIZONTE })`. Isso dá `cabe === true`, a sexta coluna com `depois === 0` e `vermelho === false`, e zero colunas vermelhas (conferido no pacote atual).
- **Done when**: m4 morre.
- **Priority**: Minor

### Fix 3: o navegador não troca o campo do valor (JANO-02 AC 3, "qualquer campo")

- **Root cause**: `site/verificar-navegador.mjs:66` só preenche `#simulador-vezes`. m17 (sem o listener do valor) passa.
- **Fix task**: em `conferirSimulador`, depois do passo dos 12x (ou antes dele, com 10x), preencher `#simulador-valor` (por exemplo com `""`, e conferir "Informe o valor para ver a resposta."; ou com `"1.000,00"` em 10x, e conferir que cabe), e só então voltar o estado.
- **Done when**: m17 morre.
- **Priority**: Major

### Fix 4: o nome acessível do gráfico não é conferido depois de ligar (JANO-02 AC 5)

- **Root cause**: `site/estrutura.test.mjs:638` só vê o `aria-label` estático do HTML. m18 (veredito fora do `aria-label`) passa.
- **Fix task**: em `conferirSimulador`, ler `#simulador-grafico` `aria-label` e exigir que termine com o texto de `#simulador-veredito`, no estado inicial e depois da troca para 12x.
- **Done when**: m18 morre.
- **Priority**: Minor

---

## Requirement Traceability Update

O Verifier não edita `spec.md`. Status proposto para depois das fix tasks:

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| JANO-01 | Implemented | ✅ Verified |
| JANO-02 | Implemented | ❌ Needs Fix (Fix 2, 3 e 4) |
| JANO-03 | Implementing | ✅ Verified (ACs 1 a 8 com evidência; AC 6 e AC 8 conferidos) |
| JANO-04 | Implemented | ❌ Needs Fix (Fix 1) |
| JANO-05 | Implementing | ✅ Verified |
| JANO-06 | Implemented | ✅ Verified |
| JANO-07 | Implemented | ✅ Verified (AC 1 por inspeção das quatro imagens) |
| JANO-08 | Implementing | ✅ Verified |

---

## Summary

**Overall**: ❌ Not Ready. Faltam quatro fixes de teste; nenhum defeito de produto.

**Spec-anchored check**: 36/40 ACs batem com o que a spec define; 4 gaps de discriminação
**Sensor**: 14/18 mutations killed
**Gate**: 2.164 unitários e 58 do site verdes, typecheck e lint verdes; integração e build citados da rodada do autor

**What works**: nome e herói do Jano exatos; pacote fresco e de fato gerado da conta e da frase do
app (o mutante de frase morre com e sem reconstrução); resíduo, horizonte, casa, mensagens de erro e
"Enxergo até" travados; dois scripts e nenhum terceiro; exemplo sem JavaScript; "O que vem a
seguir" fora; capturas sem menu e sem "myBilling"; documentos, AD-026 e handoff alinhados; nenhum
dado real no diff (AD-009: só a fixture 1.000,00/333,34/333,33, 2.400,00 e os doze saldos
redondos inventados).

**Issues found**: Fix 1 (fuso), Fix 2 (limite zero), Fix 3 (campo do valor no navegador), Fix 4
(`aria-label` depois de ligar).

**Next steps**: rotear os quatro fixes para um implementer (um commit de teste) e despachar o
Verifier de novo (iteração 1 de 3).

Lições: não foram gravadas por `scripts/lessons.py`, porque esta rodada está proibida de mudar
outros arquivos. Candidatas: (1) teste de fuso precisa de um instante que vire de mês só num dos
fusos; (2) um predicado de limite (`< 0`) pede uma fixture exatamente no limite; (3) "qualquer
campo" pede um teste por campo.
