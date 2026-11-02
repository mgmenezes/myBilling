# landing-dor Validation

## Validation: landing-dor - PASS ✅

**Date**: 2026-11-01
**Spec**: `.specs/features/landing-dor/spec.md`
**Diff range**: `42e7e1e..5896c2e` (`fc01ee7` spec, `ac76328` T1, `561febd` T2, `e4b68e7` T3, `aaf5526` T4, `3cc45b6` T5, `4e3875f` T6, `5896c2e` T7), branch `feat/landing-dor`, worktree `.worktrees/landing-dor`
**Verifier**: independent sub-agent (author ≠ verifier)

Arquivos na superfície do diff (14): `site/index.html`, `site/estilos.css`, `site/estrutura.test.mjs`,
`site/verificar-navegador.mjs`, `site/README.md`, `docs/marketing/posicionamento.md`,
`docs/marketing/copy-landing-simulador.md`, `docs/marketing/kit-de-copy.md`,
`.specs/features/landing-dor/spec.md`, `.specs/features/landing-dor/tasks.md`,
`.specs/features/campanha-lista-de-espera/spec.md`, `.specs/features/campanha-o-que-vem/spec.md`,
`.specs/STATE.md`, `.specs/HANDOFF.md`.

O Verifier leu o spec, o diff e os testes do zero. Nenhum arquivo do worktree foi alterado além deste
relatório. As mutações rodaram em cópia de `site/` no scratchpad da sessão; `git status --porcelain`
estava vazio antes e depois.

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1 | ✅ Done | `ac76328`, docs de marketing |
| T2 | ✅ Done | `561febd`, só o teste; verde no HTML de antes (ver DOR-01 AC 4) |
| T3 | ✅ Done | `e4b68e7`, `#numeros` com cinco figuras |
| T4 | ✅ Done | `aaf5526`, hero, `lead`, destaque, fecho, verificador |
| T5 | ✅ Done | `3cc45b6`, `#perguntas` com nove `<details>` |
| T6 | ✅ Done | `4e3875f`, "Sozinho ou a dois", rodapé |
| T7 | ✅ Done | `5896c2e`, specs antigas, AD-025, handoff |

Nenhum "Done when" sem marca em `tasks.md`; `Deviations`: nenhuma.

---

## Spec-Anchored Acceptance Criteria

Evidência é `file:line` do teste mais a expressão da assertion. Para DOR-06 ACs 1 a 5 (documentos,
camada "none" na matriz de cobertura), a evidência é a linha do documento.

### P1: O teste recorta e lista as seções — DOR-01

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| AC 1: recorte do `<section`/`<footer` com o `id` até o fechamento; seção ausente falha | `secao("inicio")` termina em `</section>` sem conter `onde-quebra`; `secao("rodape")` termina em `</footer>`; id inexistente lança | `site/estrutura.test.mjs:42-46` (`html.match(new RegExp(`<(section|footer)\b[^>]*\sid="${id}"[\s\S]*?<\/\1>`))`, `assert.ok(m, ...)`); `:107-111` (`assert.match(hero, /<\/section>\s*$/)`, `assert.doesNotMatch(hero, /id="onde-quebra"/)`, `assert.match(secao("rodape"), /<\/footer>\s*$/)`, `assert.throws(() => secao("nao-existe"), /ausente/)`) | ✅ PASS |
| AC 2: `<section>` com `id` fora da lista, ou sem `id`, falha | contagem de `<section` igual à lista sem `rodape`; cada tag tem `id` e o `id` está em `SECOES` | `site/estrutura.test.mjs:115-122` (`assert.equal(tags.length, listadas.length)`, `assert.ok(id, `seção sem id`)`, `assert.ok(listadas.includes(id[1]), ...)`) | ✅ PASS |
| AC 3: "já" com fronteiras que reconhecem acento; "já existe" falha, "jáx" não é o caso de prova | padrão casa "já existe" e "Já existe", não casa "jáx" nem "ainda não existe"; aplicado a `a-seguir` | `site/estrutura.test.mjs:49` (`/(?<!\p{L})já(?!\p{L})/iu`), `:126-129` (`assert.match("o simulador já existe", JA_ISOLADO)`, `assert.doesNotMatch("jáx", JA_ISOLADO)`), `:438` (`assert.doesNotMatch(texto, JA_ISOLADO)` sobre `secao("a-seguir")`) | ✅ PASS |
| AC 4: WHILE o HTML é o de antes, o teste revisto passa | 28 testes verdes no HTML de `42e7e1e` | Reproduzido pelo Verifier: `git archive 561febd site` em scratch, `node --test 'site/*.test.mjs'` → `tests 28, pass 28, fail 0`. `git diff --stat 42e7e1e 561febd` não toca `site/index.html` nem `site/estilos.css`, então o HTML de `561febd` é o de antes da fatia | ✅ PASS |

### P1: A página abre pela dor — DOR-02

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| AC 1: nove seções nesta ordem e nenhuma outra | `SECOES` = inicio, onde-quebra, numeros, comparativo, para-dois, sua-planilha, perguntas, a-seguir, rodape; posições crescentes; nenhuma `<section>` fora da lista | `site/estrutura.test.mjs:25-35` (lista), `:93-103` (`assert.notEqual(posicao, -1)`, `assert.ok(posicoes[i] > posicoes[i - 1])`), `:117-121` (contagem e pertinência) | ✅ PASS |
| AC 2: `<h1>` exato | "A planilha sabe o que você digitou. O myBilling sabe o que vem." | `site/estrutura.test.mjs:400-403` (`assert.equal(textoVisivel(h1[1]).trim(), "A planilha sabe o que você digitou. O myBilling sabe o que vem.")`) | ✅ PASS |
| AC 3: nota do hero abaixo dos botões | texto exato "A lista pede o e-mail e uma pergunta: como você controla as contas hoje. Nada mais."; `hero-acoes` antes de `hero-nota` | `site/estrutura.test.mjs:450-454` (`assert.equal(textoVisivel(nota[1]).trim(), "A lista pede o e-mail ... Nada mais.")`, `assert.ok(hero.indexOf("hero-acoes") < hero.indexOf("hero-nota"))`) | ✅ PASS |
| AC 4: parágrafo `lead` em `onde-quebra` com as duas frases | contém "A fatura chega maior do que você lembrava" e "o saldo de hoje continua dizendo que dá" | `site/estrutura.test.mjs:459-462` (`assert.ok(lead)`, `assert.match(textoVisivel(lead[1]), /A fatura chega maior do que você lembrava/)`, `assert.match(..., /o saldo de hoje continua dizendo que dá/)`) | ✅ PASS |
| AC 5: seis `article.dor` com os seis temas; só o primeiro com `dor-destaque` | 6 blocos; temas comprar, parcela, fatura, ano, luz, duas pessoas; `classes[0]` tem `dor-destaque`, `classes[1..5]` não | `site/estrutura.test.mjs:356-361` (`assert.equal(blocos.length, 6)`, `assert.ok(texto.includes(tema))` para os seis temas), `:365` (`assert.match(primeiro, /dá pra comprar/)`), `:471-475` (`assert.equal(classes.length, 6)`, `assert.match(classes[0], /\bdor-destaque\b/)`, `assert.doesNotMatch(c, /\bdor-destaque\b/)` para as demais) | ✅ PASS |
| AC 6: em 768 px ou mais, o primeiro `article.dor` ocupa a grade e a cena dele tem fonte maior que a do segundo | largura do primeiro = largura de `.dores` (tolerância 1 px); `fontePrimeira > fonteSegunda`; medido em 768 e 1.440, claro e escuro | `site/verificar-navegador.mjs:54-68` (medidas), `:88-103` (`if (largura >= 768)`, `Math.abs(d.larguraPrimeira - d.larguraGrade) > 1` → falha, `!(d.fontePrimeira > d.fonteSegunda)` → falha). Rerun do Verifier: seis combinações sem falha | ✅ PASS |
| AC 7: comparativo mantém a tabela e as linhas de CAMP-02 AC 3 e VEM-02 AC 3, e termina com o parágrafo "olha para a casa, com uma pessoa ou duas" | tabela, cabeçalhos Caderno/Planilha/myBilling, linhas flexibilidade/custo/dispositivo vencidas pela planilha ou caderno, linha "Quanto vai sobrar nos próximos meses" vencida pelo myBilling antes das outras; `p.fecho` depois de `</table>` | `site/estrutura.test.mjs:377-394` (`assert.match(comparativo, /<table\b/)`, `assert.deepEqual(cabecalhos.slice(-3), ["Caderno", "Planilha", "myBilling"])`, `assert.doesNotMatch(vence[1], /mybilling/i)`), `:421-428` (`assert.equal(linhas[indice].vence, "mybilling")`, `assert.ok(indice < primeiraDaPlanilha)`), `:484-490` (`assert.match(textoVisivel(fecho[1]), /olha para a casa, com uma pessoa ou duas/)`, `assert.ok(comparativo.indexOf("</table>") < comparativo.indexOf('class="fecho"'))`) | ✅ PASS (nota: "terminar com" é provado como "o fecho vem depois da tabela", não como último filho da seção; o HTML em `site/index.html:418-422` termina de fato com o fecho) |

### P1: Cinco números numa seção só — DOR-03

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| AC 1: de 1 a 5 `figure.numero`, todas em `section#numeros` | `1 <= naPagina.length <= 5`; `naSecao.length === naPagina.length` | `site/estrutura.test.mjs:527` (`RE_FIGURA`), `:530-533` (`assert.ok(naPagina.length >= 1 && naPagina.length <= 5)`, `assert.equal(naSecao.length, naPagina.length, "todo número vive na seção #numeros")`) | ✅ PASS |
| AC 2: cada figura com `figcaption` e `<cite>` com fonte e ano de quatro dígitos | `figcaption` presente, `cite` presente, `/\b(19|20)\d{2}\b/` e `/\p{L}{3,}/u` no cite | `site/estrutura.test.mjs:534-541` (`assert.ok(legenda)`, `assert.ok(cite)`, `assert.match(textoVisivel(cite[1]), /\b(19|20)\d{2}\b/)`, `assert.match(..., /\p{L}{3,}/u)`) | ✅ PASS |
| AC 3: fora de `#numeros`, nenhuma porcentagem nem "milhões" | texto visível com `secao("numeros")` removida não casa `/\d+(?:,\d+)?\s?%/` nem `/milh(ão|ões)/i` | `site/estrutura.test.mjs:545-547` (`assert.doesNotMatch(fora, /\d+(?:,\d+)?\s?%/)`, `assert.doesNotMatch(fora, /milh(ão|ões)/i)`) | ✅ PASS |
| AC 4: título "Não é só na sua casa"; valores 58%, 61%, 47%, 82%, 45% nesta ordem; fontes CNDL e SPC Brasil, 2026 (3x), CNC, 2026, Serasa com Opinion Box, 2026 | igualdade profunda das duas listas | `site/estrutura.test.mjs:552` (`assert.match(numeros, /<h2\b[^>]*>\s*Não é só na sua casa\s*<\/h2>/)`), `:556` (`assert.deepEqual(valores, ["58%", "61%", "47%", "82%", "45%"])`), `:560-566` (`assert.deepEqual(fontes, ["CNDL e SPC Brasil, 2026", ×3, "CNC, 2026", "Serasa com Opinion Box, 2026"])`) | ✅ PASS |
| AC 5: `numeros` logo depois de `onde-quebra` e antes de `comparativo` | índices consecutivos em `SECOES`, e a ordem do HTML segue `SECOES` | `site/estrutura.test.mjs:567-568` (`assert.equal(SECOES.indexOf("numeros"), SECOES.indexOf("onde-quebra") + 1)`, `assert.equal(SECOES.indexOf("comparativo"), SECOES.indexOf("numeros") + 1)`) com `:99-102` (posições no HTML crescentes) | ✅ PASS |

### P2: Perguntas frequentes sem script — DOR-04

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| AC 1: `section#perguntas` entre `sua-planilha` e `a-seguir`, `<h2>` "Perguntas frequentes" | índices consecutivos em `SECOES`; h2 exato | `site/estrutura.test.mjs:494-497` (`assert.equal(SECOES.indexOf("perguntas"), SECOES.indexOf("sua-planilha") + 1)`, `assert.equal(SECOES.indexOf("a-seguir"), SECOES.indexOf("perguntas") + 1)`, `assert.match(faq, /<h2\b[^>]*>\s*Perguntas frequentes\s*<\/h2>/)`) com `:99-102` | ✅ PASS |
| AC 2: ao menos seis `<details>`, nenhum `open`, `<summary>` primeiro filho terminando em "?", ao menos um `<p>` depois | `itens.length >= 6`; atributos sem `open`; `^\s*<summary` e `/\?$/`; `<p\b` no resto | `site/estrutura.test.mjs:498-508` (`assert.ok(itens.length >= 6)`, `assert.doesNotMatch(atributos, /\bopen\b/)`, `corpo.match(/^\s*<summary\b[^>]*>([\s\S]*?)<\/summary>([\s\S]*)$/)` + `assert.ok(partes)`, `assert.match(pergunta, /\?$/)`, `assert.match(partes[2], /<p\b/)`) | ✅ PASS |
| AC 3: texto contém "planilha", "banco", "outra pessoa", "celular", "custa", "dados" | os seis termos em `textoVisivel(faq).toLowerCase()` | `site/estrutura.test.mjs:510-513` (`assert.ok(texto.includes(tema))` para cada um dos seis) | ✅ PASS |
| AC 4: sem "sincroniz", "grátis", "gratuito", "de graça", "app na loja"; resposta da fatura começa com "Não." | `doesNotMatch` do padrão; `fatura.resposta` casa `/^Não\./` | `site/estrutura.test.mjs:514-517` (`assert.doesNotMatch(texto, /sincroniz|gr[áa]tis|gratuito|de graça|app na loja/)`, `assert.ok(fatura)`, `assert.match(fatura.resposta, /^Não\./)`) | ✅ PASS |
| AC 5: exatamente um `<script>`, inline | `scripts.length === 1`, sem `src=` | `site/estrutura.test.mjs:166-168` (`assert.equal(scripts.length, 1)`, `assert.doesNotMatch(scripts[0][0], /\ssrc=/)`) | ✅ PASS |

### P1: Para quem paga as contas da casa, sem a história de origem — DOR-05

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| AC 1: rodapé com "em uso hoje" e "abrindo para mais casas"; página sem "por um casal", "de um casal", "nasceu de" | `match` no rodapé; `doesNotMatch` no texto visível inteiro | `site/estrutura.test.mjs:133-137` (`assert.match(rodape, /em uso hoje/)`, `assert.match(rodape, /abrindo para mais casas/)`, `assert.doesNotMatch(texto, /por um casal|de um casal|nasceu de/i)`) | ✅ PASS |
| AC 2: sem "casal"/"casais" no texto visível; hero sem "Para dois" | padrão com fronteira de letra Unicode; hero sem a frase | `site/estrutura.test.mjs:142-143` (`assert.doesNotMatch(textoVisivel(html), /(?<!\p{L})casa(l|is)(?!\p{L})/iu)`, `assert.doesNotMatch(textoVisivel(secao("inicio")), /Para dois/)`) | ✅ PASS |
| AC 3: `para-dois` com `<h2>` "Sozinho ou a dois", `<dt>` "Um caixa", "Quem gastou", "Um número", única superfície invertida | h2 exato; `deepEqual` dos três `dt`; classe `inverso` na seção; um só seletor com `--inverso` e uma só classe `inverso` na página | `site/estrutura.test.mjs:145-150` (`assert.match(paraDois, /<h2\b[^>]*>\s*Sozinho ou a dois\s*<\/h2>/)`, `assert.deepEqual(definicoes, ["Um caixa", "Quem gastou", "Um número"])`, `assert.match(paraDois, /<section\b[^>]*\bclass="[^"]*\binverso\b/)`), `:225-231` (`assert.equal(usamInverso.length, 1)`, `assert.equal((html.match(/class="[^"]*\binverso\b[^"]*"/g) ?? []).length, 1)`) | ✅ PASS |
| AC 4: rodapé com `ul.incluido` de três `<li>` ("antes de quem não está na lista", "preço antes", "uma pergunta"), sem valor de preço | `itens.length === 3`; os três padrões; sem `R$` na lista | `site/estrutura.test.mjs:151-162` (`assert.ok(lista)`, `assert.equal(itens.length, 3)`, `assert.match(itens[0], /antes de quem não está na lista/)`, `assert.match(itens[1], /preço antes/)`, `assert.match(itens[2], /uma pergunta/i)`, `assert.doesNotMatch(textoVisivel(lista[1]), /R\$/)`) | ✅ PASS |
| AC 5: subtítulo "Seis situações que quem paga as contas reconhece"; sexta cena começa com "Quando são duas pessoas" | `match` do subtítulo; `cenas[5]` casa `/^Quando são duas pessoas/` | `site/estrutura.test.mjs:463-467` (`assert.match(textoVisivel(dores), /Seis situações que quem paga as contas reconhece/)`), `:476-479` (`assert.match(cenas[5], /^Quando são duas pessoas/)`) | ✅ PASS |

### P2: Documentos, decisão e gates — DOR-06

| Criterion | Spec-defined outcome | `file:line` + evidência | Result |
| --- | --- | --- | --- |
| AC 1: "Para quem" diz quem paga as contas da casa, sozinho ou a dois; três estados mantidos | seção com a frase e a tabela planilha/caderno/nada | `docs/marketing/posicionamento.md:23` (`## Para quem`), `:25` ("Quem paga as contas da casa, sozinho ou a dois."), `:35-37` (linhas **Planilha**, **Caderno**, **Nada**) | ✅ PASS |
| AC 2: "Números de mercado" com "até cinco por peça, num bloco só, fonte e ano na mesma frase"; os cinco da página e a reserva com fonte, coleta, publicação e URL | regra e duas tabelas | `docs/marketing/posicionamento.md:128` ("Até cinco por peça, num bloco só, sempre com fonte e ano na mesma frase"), `:134-140` (tabela com colunas Fonte, ano / Coleta e publicação / Onde conferir; 58% e 14%, 61%, 47%, 82%, 45%), `:144-148` (reserva: 37%, 49%, 58%) | ✅ PASS |
| AC 3: regra 8 do tom "Dizer o que o produto é hoje: em uso, abrindo para mais casas", sem o casal | regra 8 sem "casal" | `docs/marketing/posicionamento.md:175-176` ("8. Dizer o que o produto é hoje: em uso, com contas de verdade, abrindo para mais casas. A história de quem o fez não é prova e não entra na peça"). `grep -n -i casal` no arquivo: linhas 28 (meta, "a palavra "casal" não entra na landing"), 140 e 147 (URLs das fontes); nenhuma na regra 8 | ✅ PASS |
| AC 4: `copy-landing-simulador.md` no repositório com a Seção 8 trocada pelos cinco números; `kit-de-copy.md` com 6 a 8 headlines sem "Feito por um casal" | arquivo existe (574 linhas); Seção 8 com os cinco; sete headlines | `docs/marketing/copy-landing-simulador.md:325` (`### Seção 8: O que os números dizem`), `:333-342` (58%, 61%, 47%, 82%, 45%, cada um com fonte e 2026); `docs/marketing/kit-de-copy.md:13-19` (sete linhas de headline, nenhuma começando com "Feito por um casal"; `git diff` mostra a remoção da linha "Feito por um casal que cansou...") | ✅ PASS |
| AC 5: CAMP-02 ACs 1, 5, 6 e VEM-02 AC 7 anotados; `STATE.md` com AD-025 e Handoff; `HANDOFF.md` aponta para cá | anotações "revisto por `landing-dor`" nas quatro ACs; AD-025; Handoff; HANDOFF.md | `.specs/features/campanha-lista-de-espera/spec.md:132-134` (AC 1), `:144-145` (AC 5), `:147-148` (AC 6); `.specs/features/campanha-o-que-vem/spec.md:117-119` (VEM-02 AC 7); `.specs/STATE.md:306` (`### AD-025`), `:337-364` (`## Handoff`, feature `landing-dor`, commits T1 a T7); `.specs/HANDOFF.md:7-13` (bloco "2026-11-01, à noite: a landing abriu pela dor", spec em `.specs/features/landing-dor/spec.md`) | ✅ PASS |
| AC 6: `pnpm site:verificar` e `pnpm verify` saem 0 | código 0 | Rerun do Verifier em 2026-11-01: `pnpm lint` → "Checked 386 files, No fixes applied", exit 0; `pnpm site:verificar` → `tests 35, pass 35, fail 0` e "Sem rolagem horizontal e sem violação de axe nas seis combinações", exit 0. Para `typecheck`, `test:unit`, `test:integration` e `build`, o Verifier cita o resultado do autor do mesmo dia (`.specs/features/landing-dor/spec.md:254`: 2.164 unitários, 413 de integração, build) sem reexecutar, porque a fatia não toca `src/` (o diff é só `site/`, `docs/` e `.specs/`) | ✅ PASS |

**Status**: ✅ 32/32 ACs cobertos com o valor da spec; 0 spec-precision gaps.

---

## Edge Cases

- [x] `<section>` nova sem `id` → falha: `site/estrutura.test.mjs:120` (`assert.ok(id, `seção sem id`)`); mutante M12 morto (dois testes falham)
- [x] "já" com acento em `a-seguir` → falha: `site/estrutura.test.mjs:438` com `JA_ISOLADO` (`:49`); mutante M7 morto
- [x] Porcentagem no FAQ ou no rodapé → falha: `site/estrutura.test.mjs:546`; mutante M4 morto
- [x] 360 px: grade de números em uma coluna, nenhuma região rola de lado: `site/verificar-navegador.mjs:77-86` prova a rolagem (rerun verde). A contagem de colunas não é assertada pela suíte; o Verifier mediu na página real com Playwright em 360 px: `grid-template-columns` com 1 faixa, as cinco figuras com `left 16` e `width 328` iguais à grade, `scrollWidth 360 = clientWidth 360`, e os nove `<details>` com `open === false`
- [x] "em breve" só em `.botao-lista`: `site/estrutura.test.mjs:440-443` (`assert.doesNotMatch(textoVisivel(semBotoes), /em breve/i)`)
- [x] "casa" e "casas" permitidas: `site/estrutura.test.mjs:142` usa `(?<!\p{L})casa(l|is)(?!\p{L})`; a página tem "sua casa" (`site/index.html:293`) e "mais casas" (`:595`) e o teste passa

---

## Discrimination Sensor

Scratch: cópia de `site/` em `<scratchpad>/sensor/base`, um diretório por mutante, `node --test 'site/*.test.mjs'` no diretório do mutante. Para os mutantes de CSS, `node <scratch>/m9/site/verificar-navegador.mjs` invocado da raiz do worktree, com `node_modules` do worktree ligado por symlink no scratch. `git status --porcelain` do worktree: vazio antes, vazio depois. Scratch apagado ao fim.

| # | File:line (original) | Mutação | Killed? |
| --- | --- | --- | --- |
| M1 | `site/index.html:197` | `class="dor cartao dor-destaque"` → `class="dor cartao"` | ✅ Killed por "DOR-02 ACs 4 e 5, DOR-05 AC 5" (`:472`) |
| M2 | `site/index.html:290-337` | seção `#numeros` movida para depois de `#comparativo` | ✅ Killed por "CAMP-02 AC 1, VEM-02 AC 7 e DOR-02 AC 1" (`:99-102`) |
| M3 | `site/index.html:334` | sexta `figure.numero` (33%) dentro de `#numeros` | ✅ Killed por "revisto por DOR-03 ACs 1 e 2" (`:532`) e "DOR-03 ACs 4 e 5" (`:556`) |
| M4 | `site/index.html:519` | "Sim, pelo navegador." → "Sim, pelo navegador, 10% mais leve." (FAQ) | ✅ Killed por "DOR-03 AC 3" (`:546`) |
| M5 | `site/index.html:485` | primeiro `<details>` → `<details open>` | ✅ Killed por "DOR-04 ACs 1 a 4" (`:502`) |
| M6 | `site/index.html:431` | "Muita casa tem duas." → "Todo casal tem duas." | ✅ Killed por "DOR-05 ACs 2 a 4" (`:142`) |
| M7 | `site/index.html:575` | "O que vem a seguir é isto" → "O simulador já existe no app" | ✅ Killed por "VEM-02 ACs 4 e 5" (`:438`) |
| M8 | `site/index.html:478` | `<section id="x"><p>x</p></section>` injetada antes de `#perguntas` | ✅ Killed por "DOR-01 AC 2" (`:121`) |
| M9 | `site/estilos.css:526` | `grid-column: 1 / -1;` removido de `.dor-destaque` | ✅ Killed pelo verificador: "a cena em destaque não ocupa a grade (224 de 704)" em 768 e "(341 de 1056)" em 1440, claro e escuro; exit 1 |
| M10 | `site/index.html:594` | `figure.numero` extra no rodapé, sem "%" | ✅ Killed por "revisto por DOR-03 ACs 1 e 2" (`:533`, "todo número vive na seção #numeros") |
| M11 | `site/index.html:158` | nota do hero "Nada mais." → "Só isso." | ✅ Killed por "DOR-02 AC 3" (`:450`) |
| M12 | `site/index.html:452` | `id="sua-planilha"` removido da `<section>` | ✅ Killed por "DOR-01 AC 2" (`:120`) e pelo teste de ordem (`:95`) |
| M13 | `site/estilos.css:509` | `font-size: clamp(...)` removido de `.dor-destaque .dor-cena` | ✅ Killed pelo verificador: "a fonte da cena em destaque (15) não é maior que a da segunda (15)" em 768 e 1440, claro e escuro; exit 1 |

**Sensor depth**: lightweight ampliado (13 mutações, uma por comportamento novo da fatia, duas no navegador)
**Result**: 13/13 killed, PASS ✅

---

## Interactive UAT Results

Não realizado pelo Verifier. A spec e `tasks.md` dizem que "nenhum teste prova que o texto convence: isso é leitura do dono". Fica com o orquestrador oferecer a leitura ao dono.

---

## Code Quality

Conferido contra `.claude/skills/tlc-spec-driven/references/coding-principles.md` e `AGENTS.md`.

| Principle | Status |
| --- | --- |
| Minimum code: CSS novo só para `lead`, `incluido`, `dor-destaque`, `fecho`, `perguntas` e a grade de números; verificador ganhou um bloco de medida e um bloco de falha | ✅ |
| Surgical changes: o diff de `site/estilos.css` e `site/verificar-navegador.mjs` não toca regra pré-existente além da grade de `.numeros` (3 → 2 colunas em 768, 6 em 1024) e do título do comentário | ✅ |
| No scope creep: "O que vem a seguir" intacta (decisão do dono); nenhum script novo (`:166-168`); capturas não mudaram | ✅ |
| Matches patterns: mesmo estilo de teste (`node:test`, regex sobre o HTML, nomes de teste com o ID do AC), tokens de `docs/design.md` intactos (teste "CAMP-03 AC 1" verde) | ✅ |
| Spec-anchored outcome check (valores assertados iguais aos da spec) | ✅ |
| Per-layer Coverage Expectation: camada estrutural cobre DOR-01 a DOR-05 1:1; navegador cobre DOR-02 AC 6 e CAMP-03 AC 6; docs "none" conferidos por leitura | ✅ |
| Every test maps to a spec requirement: os 10 testes novos (25 → 35) levam DOR-01 ACs 1 a 3, DOR-02 ACs 3, 4, 5, 7, DOR-03 ACs 3, 4, 5, DOR-04 ACs 1 a 4 e DOR-05 ACs 1 a 5 no nome; nenhum teste sem dono | ✅ |
| Test integrity: nenhum teste removido, nenhum `skip`/`only`/`todo`; os dois testes renomeados ("revisto por DOR-03", "revisto por DOR-05") ficaram mais estritos, não menos (limite 3 → 1 a 5 mais pertinência à seção; "casal" proibido) | ✅ |
| Tom (regra do posicionamento): sem "!", sem travessão, sem emoji no texto visível, provado por `site/estrutura.test.mjs:571-576` | ✅ |
| AD-009: `R$` na página só `1.000,00`, `333,34`, `333,33` (`site/index.html:217-219`, allowlist em `site/estrutura.test.mjs:52`); nos docs só `R$ 1.000,00` e `R$ 333,33/333,34` (`posicionamento.md:110-111`, `copy-landing-simulador.md:84, 191, 213, 489`); "milhões" só dentro de `#numeros` (`site/index.html:308`) | ✅ |
| Documented guidelines followed: `AGENTS.md` (AD-009, Conventional Commits, uma task por commit: 8 commits para spec + 7 tasks), `docs/marketing/posicionamento.md` (tom) | ✅ |

Observações sem efeito no veredito:

1. DOR-02 AC 7 diz "terminar com um parágrafo"; o teste prova "depois da tabela" (`:487-490`). Se um dia entrar conteúdo depois do fecho, o teste não acusa. A página de hoje termina com o fecho.
2. O Independent Test de DOR-06 diz que `grep -n casal docs/marketing/posicionamento.md` "devolve só a tabela de concorrência ou nada"; devolve a linha 28 ("Para quem", que registra a decisão de não usar a palavra) e as linhas 140 e 147 (URLs das fontes). Os ACs 1 a 3 não exigem ausência da palavra no arquivo inteiro.
3. `docs/marketing/copy-landing-simulador.md` mantém "todo casal" (`:200`) e "Casais" (`:37`) fora da Seção 8. A spec limita o AC 4 à Seção 8 e deixa "o kit de copy para o público mais largo" em Out of Scope e nas decisões pendentes do dono (`STATE.md:356-359`). A página, que é o que o teste protege, não tem a palavra.
4. A edge case "360 px, uma coluna" é provada pela suíte só na parte "sem rolagem"; a coluna única foi medida pelo Verifier (ver Edge Cases). Se a fatia `landing-simulador` quiser proteger a grade, pode acrescentar a contagem de colunas ao verificador.

---

## Gate Check

- **Gate command** (`tasks.md`, gate `build`): `pnpm verify && pnpm site:verificar`
- **Result do Verifier (rerun parcial, 2026-11-01)**: `pnpm lint` exit 0 (386 arquivos); `pnpm site:verificar` exit 0 (35 passed, 0 failed, 0 skipped; navegador: 360/768/1440 × claro/escuro, 0 violações de axe, sem rolagem horizontal)
- **Result do autor (citado, não reexecutado pelo Verifier)**: `pnpm verify` exit 0 em 2026-11-01 (2.164 unitários, 413 de integração, typecheck, lint, build), registrado em `.specs/features/landing-dor/spec.md:254` e `.specs/STATE.md:348-351`. Citado porque o diff não toca `src/`.
- **Test count before feature** (`42e7e1e`, `site/estrutura.test.mjs`): 25
- **Test count after feature**: 35
- **Delta**: +10
- **Skipped tests**: nenhum
- **Failures**: nenhuma

---

## Fix Plans

Nenhum. Nenhum gap, nenhum mutante sobrevivente.

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| --- | --- | --- |
| DOR-01 | Implemented | ✅ Verified |
| DOR-02 | Implemented | ✅ Verified |
| DOR-03 | Implemented | ✅ Verified |
| DOR-04 | Implemented | ✅ Verified |
| DOR-05 | Implemented | ✅ Verified |
| DOR-06 | Implementing | ✅ Verified |

A atualização de `spec.md` (coluna Status) e de `tasks.md` (Status: "Verifier PASS") fica com o orquestrador, no commit de fechamento; o Verifier não altera esses arquivos.

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 32/32 ACs matched spec outcome, 0 spec-precision gaps
**Sensor**: 13/13 mutations killed
**Gate**: lint e `site:verificar` reexecutados verdes (35 passed); `pnpm verify` citado do autor (2.164 + 413, build)

**What works**: recorte por fechamento e lista exaustiva de seções (DOR-01); hero, `lead`, destaque e fecho (DOR-02); cinco números numa seção só com fonte e ano, nenhuma porcentagem fora (DOR-03); FAQ fechado sem script (DOR-04); público sem fechar o nicho e sem a história de origem (DOR-05); docs, specs antigas, AD-025 e handoff alinhados (DOR-06).

**Issues found**: nenhum. Quatro observações sem efeito no veredito na seção Code Quality.

**Next steps**: o orquestrador marca DOR-01 a DOR-06 como Verified em `spec.md` e `tasks.md` e oferece ao dono a leitura da página (UAT de texto). Merge, push e deploy exigem autorização separada.
