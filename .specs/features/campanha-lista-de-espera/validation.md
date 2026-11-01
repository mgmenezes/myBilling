# Validation: Campanha de lista de espera — PASS

**Date**: 2026-11-01
**Spec**: `.specs/features/campanha-lista-de-espera/spec.md`
**Diff range**: `11266a3..68ee8a9` (7 commits, 20 arquivos, +2785 linhas; branch `feat/campanha-lista-de-espera`)
**Verifier**: independent sub-agent (author ≠ verifier), somente leitura sobre a árvore real; mutações em cópias sob `/private/tmp`

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1 Posicionamento | ✅ Done | `docs/marketing/posicionamento.md`, commit `dc1f42d` |
| T2 Esqueleto, identidade, botão e teste estrutural | ✅ Done | commit `752f8e7` |
| T3 Conteúdo das seções | ✅ Done | commit `dab1b24` |
| T4 Capturas com o seed | ✅ Done | commit `f5c2afd` |
| T5 Teste de navegador e comando único | ⚠️ Marcação | Implementado e verde (`06ce851`), mas os três "Done when" de T5 em `tasks.md:259-261` continuam `[ ]`. O protocolo (`tasks.md:29`) pede marcar no mesmo commit. Lacuna de bookkeeping, não de implementação |
| T6 Kit de copy, README e ponteiros | ✅ Done | commit `68ee8a9` |

`tasks.md` tem o Task Breakdown duplicado (T1 a T4 aparecem duas vezes, linhas 89-164 e 174-249). Não afeta o resultado; é ruído no arquivo.

---

## Spec-Anchored Acceptance Criteria

Legenda: "teste" = assertion automatizada; "manual" = conferência por leitura do artefato, registrada com o que foi lido.

### CAMP-01 — Posicionamento (P1)

| Criterion | Spec-defined outcome | Evidência | Result |
| --- | --- | --- | --- |
| AC 1 persona em três estados, dor e ponte em uma frase cada | Planilha, caderno, nada; duas frases por estado | manual: `docs/marketing/posicionamento.md:27-31`, tabela Estado / Dor / Ponte com as três linhas | ✅ PASS |
| AC 2 cada promessa com a garantia e a AD/spec que a prova | Coluna de prova por linha | manual: `posicionamento.md:51-57`, coluna "Onde está provado" com AD-002/004/005, AD-003, MOV-03/AD-017, FIXO-01..06, AD-007 | ✅ PASS |
| AC 3 seção "O que nunca prometer" com sete itens mínimos | sincronização bancária, app nativo, orçamento por categoria, área de cartões e fatura, edição de compra, edição simultânea, preço | manual: `posicionamento.md:68-84`; itens nas linhas 75, 76, 77, 78, 79, 80, 81 (mais três extras: 82, 83, 84) | ✅ PASS |
| AC 4 nenhum valor em R$, nome ou descrição fora do seed/fixture | Só `1.000,00`, `333,34`, `333,33`; nomes do seed | manual: `grep -n 'R\$'` devolve só `posicionamento.md:88-89` com 1.000,00 / 333,34 / 333,33; nomes citados: "Pessoa A", "Cartão Roxo", "Compra parcelada A" (`src/infrastructure/db/seed.ts:26,248,312`) | ✅ PASS |
| AC 5 número de mercado com fonte e ano na mesma linha | Fonte e ano por número | manual: `posicionamento.md:98-100` (Serasa 2026; CNDL/SPC 2025; Serasa/Opinion Box 2025); o descartado em `:102` também traz ano | ✅ PASS |
| AC 6 tom em regras verificáveis | sem exclamação, sem emoji, português de casa, frases curtas | manual: `posicionamento.md:118-129`, dez regras; `grep -c '!'` no arquivo = 0 | ✅ PASS |

### CAMP-02 — A landing explica onde quebra (P1)

| Criterion | Spec-defined outcome | Evidência | Result |
| --- | --- | --- | --- |
| AC 1 sete seções nesta ordem, com botão no hero e no rodapé | `inicio, onde-quebra, comparativo, para-dois, sua-planilha, numeros, rodape` | `site/estrutura.test.mjs:25-33` lista; `:76-88` `assert.ok(posicoes[i] > posicoes[i - 1])`; botões: `:212` `assert.ok(botoes.length >= 2, "ao menos o botão do topo e o do rodapé")` + manual `site/index.html:154` (hero) e `:438` (rodapé) | ✅ PASS |
| AC 2 cinco blocos, cena + garantia, para as cinco dores | 5 blocos; temas parcela, fatura, mês que vira, conta fixa, duas pessoas | `estrutura.test.mjs:287` `assert.equal(blocos.length, 5)`; `:288-292` temas `["parcela","fatura","ano","luz","duas pessoas"]`; `:293-297` cada bloco com `<h3>`, `.dor-cena`, `.dor-garantia` | ✅ PASS |
| AC 3 ≥2 linhas em que planilha/caderno ganham (flexibilidade, custo, qualquer dispositivo), sem marcar myBilling nelas | ≥2 linhas `data-vence` planilha/caderno, nenhuma com mybilling | `estrutura.test.mjs:309-310` `assert.ok(outrosGanham.length >= 2)`; `:311-317` `assert.doesNotMatch(v, /mybilling/i)`; manual: `index.html:324,330,336` marcam as três linhas (anotar qualquer coisa, custo, qualquer lugar). O teste fixa a **contagem**, não os **temas** entre parênteses: o mutante M10 (linha "Custo" passando a `mybilling`) sobrevive | ⚠️ Spec-precision gap (ver sensor M10) |
| AC 4 nenhuma promessa de "O que nunca prometer", nem "grátis", nem preço | Texto visível sem os padrões; R$ só da allowlist | `estrutura.test.mjs:264-280` `PROMESSAS_PROIBIDAS` (15 padrões, inclui `gr[áa]tis`, `R$ … por mês`, `dispon[íi]vel agora`); `:320-325` `assert.doesNotMatch(texto, padrao)`; `:193-198` `assert.ok(REAIS_PERMITIDOS.has(v))`. Manual: único `R$` da página em `index.html:198` (`1.000,00`); "preço" só em `:442` "Não há preço definido" | ✅ PASS |
| AC 5 número de mercado com fonte e ano no mesmo elemento; no máximo três | 1 a 3 `<figure class="numero">`, `<figcaption>` com `<cite>` e ano | `estrutura.test.mjs:331` `assert.ok(figuras.length >= 1 && figuras.length <= 3)`; `:335` `assert.match(legenda[1], /<cite\b/)`; `:336` `/\b(19\|20)\d{2}\b/`. Manual: três figuras em `index.html:407-428` | ✅ PASS |
| AC 6 usado hoje por um casal, abrindo para mais casas, sem dizer disponível | Frases presentes; "crie sua conta", "disponível agora", "cadastre-se" ausentes | `estrutura.test.mjs:91-93` `assert.match(html, /usado hoje por um casal/)`, `/abrindo para mais casas/`, `assert.doesNotMatch(... /crie sua conta\|dispon[ií]vel agora\|cadastre-se/i)`; texto em `index.html:441-442` | ✅ PASS |
| AC 7 `lang="pt-BR"`, `<title>`, viewport, description | Atributos presentes | `estrutura.test.mjs:70-73` quatro `assert.match`; `index.html:2,5,6,7-10` | ✅ PASS |

### CAMP-03 — Identidade e acessibilidade (P1)

| Criterion | Spec-defined outcome | Evidência | Result |
| --- | --- | --- | --- |
| AC 1 cada token uma vez, `light-dark()`, valores de `docs/design.md`, sem paleta em `@media (prefers-color-scheme)` | 16 tokens com valores exatos; zero media query de esquema | `estrutura.test.mjs:39-56` `TOKENS` com os valores; `:121` `assert.equal(raiz.length, 1)`; `:125-126` `assert.equal(ocorrencias.length, 1)` e `assert.equal(ocorrencias[0][1].trim(), valor)`; `:128-132` `assert.doesNotMatch(css, /@media\s*\(\s*prefers-color-scheme/)`. Conferi os 16 valores contra `src/app/globals.css:44-111` (idênticos) e `docs/design.md:30,39-41` (os que o doc lista em hex) | ✅ PASS |
| AC 2 `--primary` só em botão de chamada e link; inversão exatamente uma vez | Blocos com `var(--primary)` só em `.botao-primario` ou `a`; um seletor com `--inverso`; um elemento `.inverso` | `estrutura.test.mjs:139-147` `assert.match(b.seletor, /\.botao-primario\|(^\|,\s*)a(:\|\s\|$)\|focus-visible/)`; `:157` `assert.equal(usamInverso.length, 1)`; `:158-162` um `class="… inverso …"` no HTML. **O teste admite `focus-visible`, que a spec não cita**: `site/estilos.css:166-170` e `:276-279` usam `var(--primary)` no anel de foco; `docs/design.md:15` lista "CTA primário, link e glifo de marca" e não define a cor do anel de foco | ⚠️ Spec-precision gap |
| AC 3 claro/escuro gravam `data-tema`; "sistema" remove o atributo; nunca `data-tema="sistema"` | Atributo `claro`/`escuro`; ausente em sistema | `estrutura.test.mjs:166-168` `assert.doesNotMatch(html, /data-tema="sistema"/)`, `assert.match(html, /removeAttribute\("data-tema"\)/)`; script em `index.html:40-45`. Manual no Chrome (768 px, JS ligado): escolha claro → `attr:"claro"`, `localStorage:"claro"`, `source media:"not all"`; escuro → `"escuro"`, `"escuro"`, `"all"`; sistema → `attr:null`, `localStorage:null`, media `(prefers-color-scheme: dark)` | ✅ PASS |
| AC 4 sem a folha do Google Fonts cai para pilha de sistema | Toda `font-family` termina em `sans-serif`/`monospace` | `estrutura.test.mjs:172-179` `assert.match(f, /(sans-serif\|monospace)\s*$/)`; `estilos.css:51-52` (`system-ui, …, sans-serif` e `ui-monospace, "SF Mono", monospace`) | ✅ PASS |
| AC 5 um `<script>` inline; nenhum terceiro além das fontes | 1 script sem `src`; URLs externas só `fonts.googleapis.com`/`fonts.gstatic.com` | `estrutura.test.mjs:98` `assert.equal(scripts.length, 1)`; `:99` `assert.doesNotMatch(scripts[0][0], /\ssrc=/)`; `:106-110` `assert.match(url, /^https:\/\/fonts\.(googleapis\|gstatic)\.com(\/\|$)/)`; `:116` `display=swap` | ✅ PASS |
| AC 6 360/768/1440 × claro/escuro: `scrollWidth === clientWidth` e zero violação axe WCAG 2.1 AA | Seis combinações, 0 falhas | `site/verificar-navegador.mjs:18-20` (larguras, temas, tags `wcag2a, wcag2aa, wcag21a, wcag21aa`); `:59-66` `medidas.scrollWidth !== medidas.clientWidth` → falha; `:71-77` `resultado.violations` → falha; `:88-94` `process.exit(1)`. Rodado: seis linhas `0 violação(ões), 23 regras ok`, exit 0 | ✅ PASS |
| AC 7 mono em grandeza numérica isolada; nunca em frase corrida | `.mono` só em valores/percentuais | manual: `.mono` em `index.html:198-200` (R$ 1.000,00; 333,34; 333,33; 333,33) e `:408,415,423` (45%, 52%, 58%); frase corrida com números em `:417-418` ("22% usam caderno, 15% planilha e 11% aplicativo") **não** está em `.mono`. Sem teste automatizado, como a spec prevê (tasks.md T3) | ✅ PASS (manual) |
| AC 8 display em 400; sombra só `--sombra-1` | `h1 { font-weight: 400 }`; todo `box-shadow` é `var(--sombra-1)` ou `none` | `estrutura.test.mjs:186-187` `assert.match(declaracoesDeH1, /font-weight\s*:\s*400/)` e `doesNotMatch(... /font-weight\s*:\s*(?!400\b)\d+/)`; `:188-190` `assert.match(m[1].trim(), /^(var\(--sombra-1\)\|none)$/)`; `estilos.css:119,127` | ✅ PASS |

### CAMP-04 — Botão da lista (P1)

| Criterion | Spec-defined outcome | Evidência | Result |
| --- | --- | --- | --- |
| AC 1 URL numa constante única no topo do `<head>`; todo botão lê dela | Uma `<meta name="lista-de-espera">`; HTML idêntico ao que a constante gera | `estrutura.test.mjs:202` `assert.equal(metas.length, 1)`; `:204` `assert.equal(aplicarFormulario(html, url), html)`; `index.html:17` dentro do `<head>` | ✅ PASS |
| AC 2 com placeholder, botão desabilitado (`aria-disabled="true"`, sem `href`) e "em breve" | Atributos e texto exatos | `estrutura.test.mjs:214-217` `assert.match(tag, /aria-disabled="true"/)`, `/\sdisabled[\s>]/`, `assert.doesNotMatch(tag, /\shref=/)`, `assert.match(texto, /em breve/)`; `:219-223` nenhum `<a class=… botao-lista>` | ✅ PASS |
| AC 3 com `https://`, abre em nova aba com `rel="noopener"` | `href` igual à URL, `target="_blank"`, `rel="noopener"` | `estrutura.test.mjs:232-234` `assert.match(tag, new RegExp(\`href="${url…}"\`))`, `/target="_blank"/`, `/rel="noopener"/`; gerado em `site/formulario.mjs:53` | ✅ PASS |
| AC 4 sem JavaScript funciona igual (href no HTML) | `href` estático | `formulario.mjs:43-55` escreve o `<a>` no arquivo; o teste de AC 3 lê a string HTML, não o DOM. Manual no Chrome com `javaScriptEnabled:false` em 320 px: dois `BUTTON disabled=true aria-disabled=true href=null` (estado placeholder) e `data-tema` ausente | ✅ PASS |
| Edge: `http://` recusado | `aplicarFormulario` lança | `estrutura.test.mjs:247` `assert.throws(() => aplicarFormulario(html, "http://exemplo.com/form"), /https/)`; `formulario.mjs:44-46` | ✅ PASS |

### CAMP-05 — Capturas (P2)

| Criterion | Spec-defined outcome | Evidência | Result |
| --- | --- | --- | --- |
| AC 1 imagens geradas por script do banco semeado, provider de teste, nada fora do seed | Script contra `mybilling_test`, `AUTH_PROVIDER_DE_TESTE=1`, `pessoa-a@example.com`; só nomes do seed | `site/capturar.mjs:28-31,76-82,92-94`. Manual (ferramenta Read nas quatro PNG): aparecem "Pessoa A", "Cartão Azul", "Categoria Um/Dois/Três/Quatro", "Entrada 1 2026-10", "Entrada 2 2026-10", "Entrada recorrente A/B", "Sem categoria", "Outubro de 2026"; todos de `src/infrastructure/db/seed.ts:26,119-123,177-184,256,483`. Nenhum indicador de desenvolvimento do Next (`nextjs-portal` removido em `capturar.mjs:122-126`). Valores em R$ nas imagens são os do PRNG do seed, permitidos por este AC. Não reexecutei o script (exige `next dev` e banco semeado) | ✅ PASS (manual) |
| AC 2 cada `<img>` com `alt` em uma frase, `width` e `height` | Atributos presentes; arquivo existe | `estrutura.test.mjs:351-357` `assert.ok(alt && alt[1].trim().length >= 10)`, `/\bwidth="\d+"/`, `/\bheight="\d+"/`, `existsSync(...)`; `index.html:165-171,256-262` (1280×800, alt de uma frase) | ✅ PASS |
| AC 3 dois temas por tela; `<picture>` + `prefers-color-scheme`; respeita `data-tema` | `<source media="(prefers-color-scheme: dark)">`; script troca `media` | `estrutura.test.mjs:365-369` `source` com `media="(prefers-color-scheme: dark)"` e arquivo existente; `:372` `assert.match(html, /source\[data-tema-escuro\]/)`; `capturar.mjs:41,104` gera `claro` e `escuro`; comportamento conferido no navegador (tabela AC 3 de CAMP-03) | ✅ PASS |
| AC 4 diz perto das imagens que são dados de demonstração | Cada `.captura-legenda` contém a frase | `estrutura.test.mjs:381-384` `assert.ok(legendas.length >= 2)`, `assert.match(textoVisivel(texto), /dados de demonstração/i)`; `index.html:173-175,264-266` | ✅ PASS |

### CAMP-06 — Kit de copy (P2)

| Criterion | Spec-defined outcome | Evidência | Result |
| --- | --- | --- | --- |
| AC 1 seis a oito headlines, cada uma com o estado | 6 ≤ n ≤ 8, coluna Estado | manual: `docs/marketing/kit-de-copy.md:13-20`, 8 linhas, coluna "Estado" preenchida (Todos ×2, Planilha ×3, Caderno, Nada ×2) | ✅ PASS |
| AC 2 três textos curtos, um por estado, ≤280 caracteres, terminando com a chamada | 3 textos ≤280 | manual, contagem por script sobre o texto do blockquote com `[link]`: Planilha 249, Caderno 228, Nada 227; os três terminam em "Entre na lista de espera: [link]" (`kit-de-copy.md:28-42`). Observação: com uma URL real no lugar de `[link]`, o texto Planilha cabe em 280 só se a rede contar a URL com ≤37 caracteres (o X conta 23) | ✅ PASS |
| AC 3 texto longo em primeira pessoa, sem valor nem nome real, ≥500 palavras | ≥500 palavras | manual: `kit-de-copy.md:48-95`, 661 palavras (`len(split())`; a traceability do autor diz 667, diferença de método), primeira pessoa ("nossa casa", "eu criava", "a gente"); `grep 'R\$'` vazio; nenhum nome próprio | ✅ PASS |
| AC 4 respeita o tom e "O que nunca prometer" | 0 exclamação, 0 emoji, 0 travessão; nenhuma promessa | manual: `!`=0, `—/–`=0, emoji=0 no arquivo inteiro. Os 15 padrões de `PROMESSAS_PROIBIDAS` aplicados ao kit acusam duas linhas, ambas negações e não promessas: `:71` "de graça" (fala da planilha, não do produto) e `:91` "não sincroniza com banco" (disclaimer). A spec diz "respeitar a lista"; `posicionamento.md:73` diz "Nunca dizer" — decisão de leitura do dono se o disclaimer em `:91` fica | ✅ PASS (com nota) |

### CAMP-07 — Repositório verde (P3)

| Criterion | Spec-defined outcome | Evidência | Result |
| --- | --- | --- | --- |
| AC 1 `pnpm verify` sai 0 com `site/` | exit 0 | `package.json:16` `"verify": "pnpm typecheck && pnpm lint && pnpm test:unit && pnpm test:integration && pnpm build"`; rodado nesta validação: `EXIT=0` (detalhe no Gate Check) | ✅ PASS |
| AC 2 `pnpm site:verificar` roda estrutural + navegador e sai 0 | exit 0 | `package.json:14` `"site:verificar": "node --test 'site/*.test.mjs' && node site/verificar-navegador.mjs"`; rodado: 22 pass / 0 fail, seis combinações 0 violações, `EXIT=0` | ✅ PASS |
| AC 3 `HANDOFF.md` aponta para a fatia e para `site/README.md` | Linhas presentes | manual: `.specs/HANDOFF.md:137-141` | ✅ PASS |

**Status**: ⚠️ Todos os ACs cobertos; 2 spec-precision gaps sinalizados (CAMP-02 AC 3, CAMP-03 AC 2). Nenhum AC sem evidência.

---

## Discrimination Sensor

Método: `cp -R site /private/tmp/verifier-site-N` por mutação, mutação aplicada por script com confirmação da substituição, `node --test '/private/tmp/verifier-site-N/*.test.mjs'`, cópia apagada. `git stash` não foi usado. Baseline `git status --porcelain` antes: vazio. Depois de cada lote: vazio (igual).

| Mutation | File:line (na cópia) | Description | Killed? |
| --- | --- | --- | --- |
| M1 | `formulario.mjs:44` | `^https:\/\/` → `^https?:\/\/` (aceita `http://`) | ✅ Killed — "Edge case: URL sem TLS" |
| M2 | `index.html:154` | `<button … botao-lista … disabled>` → `<a … botao-lista href="#">` | ✅ Killed — CAMP-04 AC 1 |
| M3 | `index.html:29` | segundo `<script src="https://example.com/rastreador.js">` | ✅ Killed — CAMP-03 AC 5 |
| M4 | `estilos.css:429` | `.cartao { border: 1px solid var(--primary) }` | ✅ Killed — CAMP-03 AC 2 |
| M5 | `estilos.css:447` | `.rodape { background: var(--inverso) }` (segunda inversão) | ✅ Killed — CAMP-03 AC 2 |
| M6 | `index.html:393` | "E o app sincroniza com seu banco." num parágrafo | ✅ Killed — CAMP-02 AC 4 |
| M7 | `index.html:393` | "R$ 2.500,00" num parágrafo | ✅ Killed — CAMP-02 AC 4 (allowlist) |
| M8 | `index.html:411` | removido `<cite>Serasa, 2026</cite>` da primeira `<figure class="numero">` | ✅ Killed — CAMP-02 AC 5 |
| M9 | `estilos.css:119` | `h1 { font-weight: 600 }` | ✅ Killed — CAMP-03 AC 8 |
| M10 | `index.html:330` | linha "Custo": `data-vence="planilha caderno"` → `"mybilling"` | ❌ **Survived** — restam duas linhas (anotar, qualquer lugar), o teste exige `>= 2` e não fixa os temas que a spec nomeia |
| M11 | `index.html:324` | linha "Anotar": `data-vence="planilha caderno"` → `"caderno mybilling"` | ✅ Killed — CAMP-02 AC 3 |
| M12 | `formulario.mjs:53` | `rel="noopener"` → `rel="nofollow"` no `<a>` gerado (a primeira tentativa atingiu o comentário da linha 16 e foi descartada como mutação inválida) | ✅ Killed — CAMP-04 ACs 3 e 4 |
| M13 | `formulario.mjs:53` | `target="_blank"` → `target="_self"` | ✅ Killed — CAMP-04 ACs 3 e 4 |
| M14 | `index.html:400` | `id="numeros"` → `id="numeros-x"` | ✅ Killed — CAMP-02 AC 1 |

**Sensor depth**: acima do lightweight (14 mutações válidas; página pública sem caminho de pagamento/auth)
**Result**: 13/14 killed — ⚠️ um sobrevivente. M10 é equivalente ao AC 3 tal como escrito ("ao menos duas linhas"): a página mutada ainda satisfaz a contagem. O sinal é de precisão da spec, não de teste errado; registrado como lição, não como fix task bloqueante.

---

## Interactive UAT Results

Não realizado nesta rodada (Verifier automatizado). Conferências de navegador feitas pelo Verifier estão nas tabelas de CAMP-03 AC 3, CAMP-04 AC 4 e em Edge Cases.

---

## Code Quality

| Principle | Status |
| --- | --- |
| Minimum code | ✅ `formulario.mjs` (70 linhas) é o único módulo além dos testes; `capturar.mjs` e `verificar-navegador.mjs` são scripts lineares |
| Surgical changes | ✅ Fora de `site/` e `docs/marketing/`: `package.json` (+2 scripts, +1 devDependency), `vitest.config.ts` (+exclude `.worktrees`, necessário para `pnpm verify` passar com worktrees presentes), `.gitignore` (+`.playwright-mcp/`), `HANDOFF.md` (+5 linhas) |
| No scope creep | ✅ Nenhuma rota, nenhum back-end, nenhum deploy; `.worktrees` exclude é condição de CAMP-07 AC 1 |
| Matches patterns | ✅ Tokens e comentários espelham `src/app/globals.css`; script do tema espelha `SCRIPT_TEMA`; `channel: "chrome"` como em `playwright.config.ts`; Biome passa em 374 arquivos |
| Spec-anchored outcome check (asserted values match spec) | ⚠️ 2 gaps: CAMP-02 AC 3 (contagem sem os temas), CAMP-03 AC 2 (teste admite `focus-visible`, spec não) |
| Per-layer Coverage Expectation met | ✅ Estrutural cobre CAMP-02 ACs 1-7, CAMP-03 ACs 1-5 e 8, CAMP-04 ACs 1-4, CAMP-05 ACs 2-4; navegador cobre CAMP-03 AC 6; docs sem teste por decisão em `tasks.md:45` |
| Every test maps to a spec requirement | ✅ 22 testes; "Tom: sem exclamação, sem travessão, sem emoji" (`estrutura.test.mjs:340-345`) mapeia para as regras de tom de CAMP-01 AC 6 aplicadas à página; "Edge case: URL sem TLS" mapeia para o edge case listado |
| Documented guidelines followed | ✅ `AGENTS.md` (AD-009: nenhum dado real em `site/`, `docs/marketing/`, imagens); `docs/design.md` (tokens, display 400, mono, sombra única); `tasks.md` Execution Protocol, exceto a marcação de T5 |

---

## Edge Cases

- [x] `http://` na constante: `formulario.mjs:44-46` lança; `estrutura.test.mjs:246-248`
- [x] JavaScript desligado: conferido no Chrome (`javaScriptEnabled:false`, 320 px): botões `<button disabled>`, `data-tema` ausente, `scrollWidth 320 == clientWidth 320`
- [x] 320 px: conferido no Chrome com JS ligado e desligado: `scrollWidth 320 == clientWidth 320`
- [x] Fonte externa bloqueada: `estilos.css:51-52` com `system-ui … sans-serif` e `ui-monospace … monospace`; `estrutura.test.mjs:171-180`
- [x] Seed muda e capturas envelhecem: `estrutura.test.mjs:347-359` exige só arquivo, `alt`, `width`, `height`; `site/README.md:34-46` explica a regeneração

---

## Gate Check

- **Gate command** (`tasks.md:58`, gate `build`): `pnpm verify && pnpm site:verificar`
- **`pnpm site:verificar`**: 22 passed, 0 failed, 0 skipped (`node --test 'site/*.test.mjs'`); navegador: 360/768/1440 × light/dark = 6 combinações, 0 violações axe, 23 regras ok cada, sem rolagem horizontal; `EXIT=0`
- **`pnpm lint`**: `biome check .` — 374 arquivos, sem erro; `EXIT=0`
- **`pnpm test:unit`**: 132 arquivos, 2088 testes passed, branches 100% (393/393); `EXIT=0`
- **`pnpm verify` completo** (rodado pelo Verifier com o Postgres do Docker na 5433): `next typegen && tsc --noEmit` ok; `biome check .` 374 arquivos ok; unit 132 arquivos / 2088 testes / branches 100% (393/393); integration 25 arquivos / 406 testes; `next build` "Compiled successfully"; `EXIT=0` → CAMP-07 AC 1 ✅ PASS
- **Test count before feature**: 2088 unitários + 406 integração (sem teste em `site/`)
- **Test count after feature**: 2088 unitários + 406 integração + 22 estruturais (`node:test`) + 1 script de navegador com 6 combinações
- **Delta**: +22 testes estruturais, +6 verificações de navegador; nenhum teste removido ou enfraquecido no diff
- **Skipped tests**: nenhum
- **Failures**: nenhuma

---

## Fix Plans

Nenhum bloqueante. Itens para o dono decidir (não impedem PASS):

### Observação 1: CAMP-02 AC 3 — o teste fixa a contagem, não os temas

- **Root cause**: a spec escreve "ao menos duas linhas … (flexibilidade, custo, qualquer dispositivo)"; os parênteses lêem como exemplo, e o teste (`estrutura.test.mjs:309-310`) assertou só `>= 2`. M10 sobrevive.
- **Fix task (opcional)**: ou a spec passa a exigir as três linhas nomeadas e o teste assertа `data-vence` planilha/caderno para cada `th scope="row"` ("Anotar…", "Custo", "Abre em qualquer lugar…"), ou a spec troca os parênteses por "por exemplo" e o gap fecha por precisão.
- **Priority**: Minor

### Observação 2: CAMP-03 AC 2 — anel de foco em `--primary`

- **Root cause**: `estilos.css:166-170` e `:276-279` usam `var(--primary)` em `:focus-visible`; a spec diz "apenas em botão de chamada e em link"; o teste (`estrutura.test.mjs:144`) abriu a exceção `focus-visible` por conta própria; `docs/design.md` não fixa a cor do anel de foco.
- **Fix task (opcional)**: amendar o AC 2 (e `docs/design.md`) para incluir o anel de foco, ou trocar o anel para `--ink`/`--line-strong` e remover a exceção do teste.
- **Priority**: Minor

### Observação 3: bookkeeping de T5 e duplicação em `tasks.md`

- `tasks.md:259-261`: três "Done when" de T5 não marcados, embora `06ce851` os cumpra. `tasks.md:89-164` e `174-249` repetem T1 a T4.
- **Priority**: Cosmetic

### Observação 4: redação da spec

- `spec.md:307` (Success Criteria) diz "Nenhum `R$` … nas imagens … fora da allowlist de fixtures", mas CAMP-05 AC 1 permite qualquer valor do seed, e as capturas têm valores do PRNG. A frase do Success Criteria é inexequível com capturas reais do app; alinhar ao AC 1.
- `kit-de-copy.md:91` "não sincroniza com banco" é uma negação; `posicionamento.md:73` diz "Nunca dizer". Decisão de leitura do dono.
- **Priority**: Cosmetic

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| --- | --- | --- |
| CAMP-01 | Execute ✅ (T1) | ✅ Verified (manual) |
| CAMP-02 | Execute ✅ (T2, T3) | ✅ Verified — AC 3 com spec-precision gap anotado |
| CAMP-03 | Execute ✅ (T2, T3, T5) | ✅ Verified — AC 2 com spec-precision gap anotado |
| CAMP-04 | Execute ✅ (T2) | ✅ Verified |
| CAMP-05 | Execute ✅ (T4) | ✅ Verified (AC 1 manual) |
| CAMP-06 | Execute ✅ (T6) | ✅ Verified (manual) |
| CAMP-07 | Execute ✅ (T5, T6) | ✅ Verified |

(O Verifier não edita `spec.md`; a tabela acima é a recomendação para o autor aplicar.)

---

## Summary

**Overall**: ✅ Ready (com duas lacunas de precisão de spec anotadas, nenhuma bloqueante)

**Verdict**: PASS
**Result**: PASS

**Spec-anchored check**: 35/35 ACs com evidência; 2 spec-precision gaps (CAMP-02 AC 3, CAMP-03 AC 2)
**Sensor**: 13/14 mutações mortas; M10 sobrevive por equivalência com a contagem da spec
**Gate**: `site:verificar` 22 passed + 6 combinações axe 0 violações; `lint` ok; `test:unit` 2088 passed, 100% branches; `pnpm verify` exit 0 (typecheck, lint, 2088 unit, 406 integration, build)

**What works**: as sete seções na ordem; identidade com os 16 tokens idênticos a `globals.css`; um script só; azul só em CTA, link e foco; inversão única; constante única do formulário com os dois estados provados em memória; `http://` recusado; capturas só com nomes do seed e sem indicador do Next; kit dentro dos limites; `HANDOFF.md` aponta para a fatia.

**Issues found**: Observações 1 a 4 acima (Minor/Cosmetic).

**Next steps**: dono decide sobre as Observações 1 e 2 (amendar spec ou código); autor marca T5 em `tasks.md` e remove a duplicação; `git push` e deploy continuam exigindo autorização separada.

---

## Pós-verificação (autor, 2026-11-01)

Lacunas menores do relatório, fechadas depois do PASS, sem reabrir o veredito:

1. **M10 (CAMP-02 AC 3)**: o AC passou a exigir três linhas, uma por tema obrigatório
   (flexibilidade, custo, qualquer dispositivo), cada linha do comparativo ganhou `data-vantagem`,
   e `site/estrutura.test.mjs` tem uma assertion por tema sobre `data-vence`. O mutante reinjetado
   numa cópia de `site/` (linha "Custo" com `data-vence="mybilling"`) **morreu**:
   `em custo quem ganha é a planilha ou o caderno`.
2. **CAMP-03 AC 2**: a spec passou a listar o anel de foco como uso legítimo de `--primary`, igual
   ao app (`outline-primary` em `:focus-visible`). Nenhuma mudança de código.
3. **Bookkeeping**: o bloco duplicado de `tasks.md` (linhas 89 a 173) foi removido e os três
   "Done when" de T5 marcados.
4. **Redação**: o critério de sucesso sobre `R$` passou a distinguir texto (allowlist) de imagem
   (valores do seed); `posicionamento.md` diz que negar um recurso ("não sincroniza com banco") é
   permitido.

Gate depois das correções: `pnpm site:verificar` (22 testes estruturais e seis combinações de
navegador) e `pnpm lint` saem 0.
