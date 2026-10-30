# Visão geral em três colunas — Validação

## Validation: visao-tres-colunas — **FAIL**

**Result**: FAIL ❌ — rodada 1 (2026-10-30, `e4ad923`).

Na HEAD o produto faz o que a spec pede: os 28 critérios de TRES-01 a TRES-05 têm comportamento
correto no navegador, e o gate está verde (unit 1694, integração 364, e2e 105 de 105, `typecheck`,
`lint` e `build`). O veredito vem do sensor: **dos 21 mutantes, 14 morreram e 7 sobreviveram**. Os 7
vivos são todos de layout ou de composição na página, e em todos falta um teste que discrimine, não
código. O teste que falta para cada um foi provado numa sonda: passa na HEAD e morre com o mutante.

1. **Major: a busca e os últimos não estão presos à coluna de ação (TRES-04 AC 1, TRES-05 AC 1; G4,
   G5).**
   - `e2e/visao-tres-colunas.spec.ts:298` e `:337` procuram as duas regiões na página inteira.
   - Mover a busca para baixo dos cards, ou os últimos para baixo das seções do centro, passa nos 18
     testes da fatia.
   - A `tasks.md` (Global Constraints) pedia exatamente isto: "AC que situa um elemento ('na coluna de
     ação'): a consulta fica presa àquela região (L-018)". Só o cadastro foi medido.
2. **Major: o limiar de 1.280 px não tem caso (TRES-02 ACs 1 e 5; G1).**
   - A coluna de ação é medida em 1.920 px (ao lado) e em 1.024 px (abaixo).
   - Virar a coluna em 1.536 px (`2xl`), em vez de 1.280 px (`xl`), passa nos 18 testes. Num notebook de
     1.280 a 1.535 px, a coluna iria para baixo, que é o caso que a spec escolheu cobrir ("1.280 px é o
     menor notebook comum").
3. **Major: a cor da pill não atravessa a página (TRES-05 AC 3; G2).**
   - A cor só é provada no componente (`src/components/ultimos-lancamentos.test.tsx:70`), que recebe o
     mapa pronto. Quem monta o mapa é a página (`src/app/(app)/[competencia]/page.tsx:128-133`).
   - A página mandar toda categoria sem cor deixa toda pill dos últimos neutra, e passa nos 18 testes
     (L-014).
4. **Minor: Todo mês e Cadastros não são medidos (TRES-01 AC 8; G8).** Só Lançamentos é medido em
   1.024 px. Tirar a `AreaEstreita` de Todo mês passa.
5. **Minor: o limiar de 768 px do menu não tem caso (TRES-01 AC 1, edge case 768–1.280; G7).** O menu
   virar coluna só em 1.024 px (`lg`) passa: de 768 a 1.023 px ele seria a barra do topo.
6. **Cosmetic: a "linha fina" entre o centro e a coluna de ação não tem assertion (TRES-02 AC 1; G6).**
7. **Baixa, sem mutante: TRES-03 AC 2 só prova os cards e os últimos.** "Gastos por categoria" e
   "Próximos meses" atualizados depois de gravar não têm assertion. Pelo desenho (a página inteira é
   re-renderizada pelo `router.refresh()`), o risco é baixo.

Nenhuma lacuna de precisão na spec que mude o veredito; um edge case remete ao comportamento de hoje
sem teste próprio (busca com espaços nas pontas). Observações para o dono, fora do veredito, em
[Observações](#observações-para-o-dono).

**Data**: 2026-10-30
**Spec**: `.specs/features/visao-tres-colunas/spec.md` (TRES-01 a TRES-05, 28 critérios, 8 edge cases)
**Faixa do diff**: `3b42f3c..e4ad923`, 8 commits (T1 a T8). A base `3b42f3c` é o `main`.
**Verificador**: sub-agente independente (autor ≠ verificador). Só leitura sobre o código e os testes da
fatia; este arquivo é o único que ele escreveu no worktree real, além do registro de lições.

- **Onde as mutações rodaram**: uma `git worktree` descartável, detached em `e4ad923`, no scratchpad
  da sessão, com `pnpm install --frozen-lockfile` próprio. Cada mutante foi aplicado sozinho, por
  substituição exata de texto que tinha de casar uma vez só, e desfeito com `git checkout` do arquivo.
  No fim a worktree foi removida.
- **Isolamento**: o `git status --porcelain` do worktree real foi comparado com o baseline
  (` M next-env.d.ts`) no meio e no fim do trabalho. No fim, as únicas diferenças são este relatório
  e os dois arquivos de lições (`.specs/lessons.json` e `.specs/LESSONS.md`); o `next-env.d.ts` tem a
  mesma mudança de antes. Não houve `git stash`, e nada foi commitado.

---

## Task Completion

| Task | Commit | Status | Notas |
| --- | --- | --- | --- |
| T1 `ultimosLancamentos` | `975e44c` | ✅ Done | Os cinco mutantes da função morrem. Os "Done when" ficaram `[ ]` na `tasks.md` |
| T2 navegação pela rota | `2823322` | ✅ Done | N1 morre em três testes |
| T3 moldura com o menu na borda | `1d5c8ba` | ⚠️ Partial | AC 8 só medido em Lançamentos (G8); o limiar de 768 px sem caso (G7). "Done when" `[ ]` |
| T4 cadastro e `ValorDaNatureza` extraídos | `d1dfc8f` | ✅ Done | Lançamentos sem mudança visível; testes antigos verdes |
| T5 próximos meses em linhas | `6eb4657` | ✅ Done | E6 morre na medida do e2e |
| T6 componente dos últimos | `56aa4ab` | ✅ Done | C1 e C2 morrem |
| T7 Visão geral em colunas | `89ac842` | ⚠️ Partial | Busca e últimos sem prova de lugar (G4, G5), cor da pill sem prova na página (G2), limiar de 1.280 px (G1), linha fina (G6). "Done when" `[ ]` |
| T8 decisão registrada | `e4ad923` | ✅ Done | AD-019 e as notas de substituição em IMP-08 AC 1, `painel-e-lancamentos` e `lancamento-avulso` |

---

## Spec-Anchored Acceptance Criteria

### TRES-01: uma moldura só, com o menu na borda

| Critério | Resultado da spec | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| AC 1: em 768 px ou mais, coluna lateral em x = 0, da altura da janela, presa ao rolar, marca "myBilling" para a home | x = 0; altura ≥ janela; ao rolar, y ≈ 0 e o pé à vista; `href="/"` | `e2e/visao-tres-colunas.spec.ts:138-139` - `expect(medida.x).toBe(0)`, `expect(medida.height).toBeGreaterThanOrEqual(1080)`; `:153-154` - `Math.abs((await caixa(menu(page))).y)).toBeLessThanOrEqual(1)`, `getByRole("button", { name: "Importar planilha" })).toBeInViewport()`; `src/components/menu-lateral.test.tsx:39` - `getAttribute("href")).toBe("/")`; `e2e/visao-tres-colunas.spec.ts:162` - `toHaveAttribute("href", "/")` | ⚠️ PASS em 1.920 px; o limiar de 768 px não tem caso (G7 vivo, lacuna) |
| AC 2: nenhum cabeçalho em pílula | zero `banner` (a pílula era `<header>`) | `e2e/visao-tres-colunas.spec.ts:140` - `getByRole("banner")).toHaveCount(0)` em Lançamentos e na Visão geral | ✅ PASS |
| AC 3: com competência aberta, "Áreas do myBilling" no menu, quatro itens, ativo por peso, fundo e barra | 4 links dentro do `aside`; `aria-current="page"` só no ativo | `src/components/menu-lateral.test.tsx:45-46` - `within(menu).getByRole("navigation", { name: "Áreas do myBilling" })`, `toHaveLength(4)`; `src/components/navegacao-principal.test.tsx:61` - `toEqual(["Visão geral", "Lançamentos", "Todo mês", "Cadastros"])`; `:127`, `:139` - `ativas()).toEqual([...])` | ✅ PASS (marca visual "como hoje": classes não mudaram) |
| AC 4: na home, menu sem os itens de área | nenhuma `navigation`; marca e pé presentes | `src/components/navegacao-principal.test.tsx:36-37` - `queryByRole("navigation")).toBeNull()`, `queryAllByRole("link")).toEqual([])`; `src/components/menu-lateral.test.tsx:53-55`; `e2e/visao-tres-colunas.spec.ts:162-164` - `getByRole("navigation", { name: "Áreas do myBilling" })).toHaveCount(0)` | ✅ PASS |
| AC 5: no pé, nome, tema e "Importar planilha" | os três dentro do `aside` | `src/components/menu-lateral.test.tsx:61-63` - `within(menu).getByText("Pessoa A")`, `getByRole("group", { name: "Tema da interface" })`, `getByRole("button", { name: "Importar planilha" })`; `e2e/visao-tres-colunas.spec.ts:172-174` | ✅ PASS |
| AC 6: o importar abre o diálogo de hoje, com o nome e a competência esperada | "Tudo entra em nome de Pessoa A"; "Próximo mês esperado: …" | `e2e/visao-tres-colunas.spec.ts:177-178` - `dialogo.getByText("Tudo entra em nome de Pessoa A")).toBeVisible()` (aberto pelo botão do menu, em Lançamentos); `e2e/importacao.spec.ts:171` - `getByText("Próximo mês esperado: Novembro de 2026")).toBeVisible()` | ✅ PASS |
| AC 7: seletor de competência no topo da área à direita do menu, acima do conteúdo | seletor acima do `h1` e à direita do menu | `e2e/visao-tres-colunas.spec.ts:190-191` - `seletor.y + seletor.height).toBeLessThanOrEqual(titulo.y)`, `seletor.x).toBeGreaterThanOrEqual(lateral.x + lateral.width)` | ✅ PASS |
| AC 8: Lançamentos, Todo mês ou Cadastros em até 1.024 px, centrado | largura ≤ 1.024 e folgas iguais, nas três telas | `e2e/visao-tres-colunas.spec.ts:202-205` - `cartao.width).toBeLessThanOrEqual(1024)`, `Math.abs(folgaEsquerda - folgaDireita)).toBeLessThanOrEqual(1)`, só em Lançamentos | ❌ GAP parcial: Todo mês e Cadastros sem assertion (G8 vivo) |
| AC 9: abaixo de 768 px, áreas na barra de baixo e topo com marca, importar, tema e nome | lista das áreas encostada na base; os quatro no `aside` | `e2e/visao-tres-colunas.spec.ts:402` - `areas.y + areas.height).toBeGreaterThanOrEqual(799)`; `:405-409` - `topo.y).toBe(0)` e os quatro `toBeVisible()` dentro do menu | ✅ PASS |
| AC 10: 400 px sem rolagem horizontal em toda tela autenticada | `scrollWidth − clientWidth` = 0 | `e2e/visao-tres-colunas.spec.ts:423` - `expect(await transbordoHorizontal(page), caminho).toBe(0)` em home, Visão geral, Lançamentos, Todo mês e Categorias | ✅ PASS |

### TRES-02: a Visão geral em colunas

| Critério | Resultado da spec | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| AC 1: em 1.280 px ou mais, centro sem largura máxima e coluna de ação à direita, separada por uma linha fina | coluna à direita do centro a partir de 1.280 px; centro > 1.024 px; linha fina entre os dois | `e2e/visao-tres-colunas.spec.ts:268` - `cards.width).toBeGreaterThan(1024)`; `:270-271` - `acao.x).toBeGreaterThanOrEqual(cards.x + cards.width)`, `acao.y).toBeLessThan(cards.y)`, só em 1.920 px | ❌ GAP parcial: o limiar de 1.280 px não tem caso (G1 vivo) e a linha fina não tem assertion (G6 vivo) |
| AC 2: no centro, nesta ordem, título com o alternador e "Qual é a diferença", os cards, e as duas seções lado a lado quando cabem | título < alternador < cards < seções; seções na mesma linha em 1.920 px | `e2e/visao-tres-colunas.spec.ts:273-278` - `titulo.y).toBeLessThan(alternador.y)`, `alternador.y).toBeLessThan(cards.y)`, `cards.y + cards.height).toBeLessThanOrEqual(categorias.y)`, `Math.abs(proximos.y - categorias.y)).toBeLessThanOrEqual(1)`, `proximos.x).toBeGreaterThan(categorias.x + categorias.width)`; "Qual é a diferença" em `e2e/compra-parcelada.spec.ts:261` | ✅ PASS |
| AC 3: os quatro cards como hoje, nas duas visões | os quatro rótulos; MOV-03 nas duas visões | `e2e/visao-tres-colunas.spec.ts:254-261` - `grade.getByText(rotulo, { exact: true })).toBeVisible()` para os quatro; `e2e/compra-parcelada.spec.ts:244`, `:251` (Movimentações); `src/components/painel-indicadores.test.tsx` intacto | ✅ PASS |
| AC 4: "Próximos meses" uma linha por mês, regras de SALDO-03 | 3 linhas na mesma coluna, uma embaixo da outra, sem rolagem lateral | `e2e/visao-tres-colunas.spec.ts:215` - `toHaveCount(3)`; `:224-225` - `atual.x).toBe(anterior.x)`, `atual.y).toBeGreaterThanOrEqual(anterior.y + anterior.height - 1)`; `:230` - `rolaDeLado).toBe(false)`; SALDO-03 em `src/components/horizonte-futuro.test.tsx` e `e2e/saldo-futuro.spec.ts`, intactos | ✅ PASS |
| AC 5: abaixo de 1.280 px, coluna de ação abaixo do centro | coluna começa depois de "Próximos meses" | `e2e/visao-tres-colunas.spec.ts:374` - `acao.y).toBeGreaterThanOrEqual(proximos.y + proximos.height - 1)` em 1.024 px | ⚠️ PASS em 1.024 px; o limiar (1.279 px) não tem caso, o mesmo G1 |
| AC 6: "Importar planilha" só na moldura, não no conteúdo da Visão geral | 1 no menu, 0 no `<main>` | `e2e/visao-tres-colunas.spec.ts:236-239` - `menu(page).getByRole("button", { name: "Importar planilha" })).toHaveCount(1)`, `page.getByRole("main").getByRole(...)).toHaveCount(0)` | ✅ PASS |

### TRES-03: lançar pela Visão geral

| Critério | Resultado da spec | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| AC 1: cadastro aberto na coluna de ação, sem diálogo, abas "Avulso" e "Parcelado", mesmos campos e mensagens | abas `["Avulso", "Parcelado"]`; formulário visível; zero `dialog` | `e2e/visao-tres-colunas.spec.ts:288-290` - `abas.getByRole("tab")).toHaveText(["Avulso", "Parcelado"])`, `acao.getByRole("form", { name: "Lançamento avulso" })).toBeVisible()`, `page.getByRole("dialog")).toHaveCount(0)`; a região medida à direita do centro em `:270`; mesmos campos por construção: as duas telas montam `CadastroDeLancamento` (`src/app/(app)/[competencia]/cadastro-de-lancamento.tsx:26`) | ✅ PASS |
| AC 2: gravar pela coluna atualiza cards, "Gastos por categoria", "Próximos meses" e "Últimos lançamentos" sem recarga | "Despesas do mês" de R$ 110,00 para R$ 210,00; "Item novo" no topo dos últimos | `e2e/visao-tres-colunas.spec.ts:313` - `toContainText("R$ 110,00")`; `:326` - `despesas).toContainText("R$ 210,00")`; `:327-329` - `getByRole("listitem").first()).toContainText("Item novo")` | ⚠️ PASS para cards e últimos; "Gastos por categoria" e "Próximos meses" sem assertion (lacuna de cobertura, baixa) |
| AC 3: o cadastro fica na tela, com a confirmação de hoje | `status` com "Item novo"; formulário visível | `e2e/visao-tres-colunas.spec.ts:324-325` - `form.getByRole("status")).toContainText("Item novo")`, `expect(form).toBeVisible()` | ✅ PASS |
| AC 4: Lançamentos mantém "+ Novo lançamento" e o diálogo | os e2e de avulso e parcelada abrem pelo botão | `e2e/lancamento-avulso.spec.ts:63`, `:312` - `getByRole("button", { name: "+ Novo lançamento" }).click()`; `:324`, `:335` - foco preso no `dialog[open]` | ✅ PASS |

### TRES-04: buscar pela Visão geral

| Critério | Resultado da spec | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| AC 1: na coluna de ação, campo de busca com rótulo "Buscar lançamento" | campo achável pelo rótulo, dentro da coluna de ação | `e2e/visao-tres-colunas.spec.ts:337-338` - `getByRole("search", { name: "Buscar lançamento" })`, `busca.getByLabel("Buscar lançamento")`, consulta na página inteira | ❌ GAP parcial: o lugar "na coluna de ação" não tem assertion (G4 vivo, L-018) |
| AC 2: busca com termo abre Lançamentos da mesma competência com o filtro preenchido | URL `/<mês>/lancamentos?busca=Recente+02`; campo "Recente 02"; só a linha que casa | `e2e/visao-tres-colunas.spec.ts:341` - `toHaveURL(new RegExp(\`/${ATUAL}/lancamentos\\?busca=Recente\\+02$\`))`; `:342-346` - `toHaveValue("Recente 02")`, `row /Recente 02/ toBeVisible()`, `row /Recente 03/ toHaveCount(0)` | ✅ PASS |
| AC 3: busca vazia abre Lançamentos sem filtro de busca | URL `?busca=`; campo vazio; as linhas todas | `e2e/visao-tres-colunas.spec.ts:359-364` - `toHaveURL(/…\?busca=$/)`, `toHaveValue("")`, `Recente 02` e `Recente 03` visíveis | ✅ PASS |

### TRES-05: últimos lançamentos do mês

| Critério | Resultado da spec | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| AC 1: na coluna de ação, até 8 não cancelados, data até hoje no fuso da casa, do mais recente para o mais antigo | cancelado fora; amanhã fora, hoje dentro; ordem decrescente; corte em 8 | `src/application/mes/ultimos-lancamentos.test.ts:50` - `toEqual(["vale"])`; `:59` - `toEqual(["hoje"])`; `:80` - `toEqual(["dia-12", "dia-10", "dia-01"])`; `:105-114` - os 8 de `dia-10` a `dia-3`; `e2e/visao-tres-colunas.spec.ts:300-305` - `toHaveCount(8)`, `linhas.nth(i)).toContainText(recente(i + 1))`, `getByText("Futuro A")).toHaveCount(0)` | ⚠️ PASS para quais e em que ordem; o lugar "na coluna de ação" não tem assertion (G5 vivo, L-018) |
| AC 2: empate de data pela descrição, alfabética | `["abacate", "agua", "banana"]` (pt-BR, sem caixa nem acento) | `src/application/mes/ultimos-lancamentos.test.ts:94` - `toEqual(["abacate", "agua", "banana"])` | ✅ PASS |
| AC 3: descrição, data, categoria com a cor dela ("Receita" e "Sem categoria" neutras) e valor com sinal e cor da natureza | pill com `CLASSES_DA_COR.verde.pill`; `−R$ 120,00 de despesa` em `text-negativo`; `+R$ 10,00 de entrada` em `text-positivo`; neutras em `bg-surface-strong` | `src/components/ultimos-lancamentos.test.tsx:68-73`; `:80-85`; `:91-93`; `src/components/valor-da-natureza.test.tsx:27-42` | ⚠️ PASS no componente; na página, a cor não atravessa a composição (G2 vivo, L-014/L-035) |
| AC 4: sem lançamento até hoje, "Nenhum lançamento até hoje neste mês." | o texto exato; nenhuma `list` | `src/components/ultimos-lancamentos.test.tsx:127-128` - `getByText("Nenhum lançamento até hoje neste mês.")`, `queryByRole("list")).toBeNull()`; `src/application/mes/ultimos-lancamentos.test.ts:68` - `toEqual([])` | ✅ PASS |
| AC 5: "Ver todos" junto do título, para Lançamentos da competência | `href="/2026-03/lancamentos"` dentro da seção | `src/components/ultimos-lancamentos.test.tsx:136-138` - `within(secao).getByRole("link", { name: "Ver todos" }).getAttribute("href")).toBe("/2026-03/lancamentos")` | ✅ PASS |

**Status**: os 28 critérios têm assertion sobre o resultado da spec. Em 7 deles uma cláusula de lugar
ou um limiar não é discriminado, e o sensor mostrou o mutante vivo (TRES-01 ACs 1 e 8; TRES-02 ACs 1
e 5; TRES-04 AC 1; TRES-05 ACs 1 e 3). TRES-03 AC 2 prova só duas das quatro seções. Nenhuma lacuna
de precisão: a spec dá resultados exatos (larguras, limiares, textos, ordem).


---

## Edge Cases

- [x] Mês futuro aberto: "Últimos lançamentos" vazio, com a mensagem —
  `src/application/mes/ultimos-lancamentos.test.ts:62-68` (`toEqual([])` com todas as datas depois
  de hoje) e `src/components/ultimos-lancamentos.test.tsx:124-129` (a mensagem exata). O resto da
  Visão geral não muda de regra.
- [x] Mês sem lançamento nenhum: cards zerados e mensagem de categorias como hoje (testes anteriores
  intactos); "Últimos lançamentos" vazio pela mesma prova do item acima.
- [x] Lançamento cancelado fora dos últimos — `src/application/mes/ultimos-lancamentos.test.ts:44-50`
  (`toEqual(["vale"])`); o mutante U5 morre nele.
- [~] Busca com espaços nas pontas: o formulário é um GET sem tratamento próprio
  (`src/app/(app)/[competencia]/page.tsx:261-284`), e Lançamentos normaliza com `trim`
  (`src/application/mes/filtrar-lancamentos.ts:45`). Nenhum teste busca " termo " e confere o
  resultado; a spec define o resultado por referência ("como o filtro de hoje o trata"). Baixa.
- [~] Janela entre 768 px e 1.280 px: menu ao lado e coluna de ação abaixo — provado só em 1.024 px
  (`e2e/visao-tres-colunas.spec.ts:368-375`). As duas pontas (768 e 1.279/1.280) não têm caso.
- [~] Gravação recusada pelo servidor na coluna de ação: a mensagem aparece no cadastro "como no
  diálogo de hoje" por construção, porque é o mesmo `CadastroDeLancamento`; os testes do formulário
  provam a mensagem. "Nada muda no centro" não tem assertion. Baixa.
- [x] Trocar de mês com o cadastro pela metade: perda aceita pela spec; nada a provar.
- [x] Esqueleto com a forma nova: `e2e/acessibilidade.spec.ts:281` - `expect(blocos).toBe(9)`, os
  nove blocos de `src/app/(app)/[competencia]/loading.tsx:26-43` (título, 4 cards, 2 seções, cadastro
  e últimos).

---

## Gate Check

- **Comandos**, no worktree real, na HEAD `e4ad923`, com `DATABASE_URL_TEST` no banco de teste da
  fatia:
  - `pnpm test:unit`: 107 arquivos, **1694 de 1694**, cobertura de `src/domain` 100% de branches
    (355/355). Exit 0.
  - `pnpm typecheck` (`next typegen && tsc --noEmit`): exit 0.
  - `pnpm lint` (`biome check .`): 312 arquivos, nenhum achado. Exit 0.
  - `pnpm test:integration`: 23 arquivos, **364 de 364**. Exit 0.
  - `pnpm exec playwright test` (o e2e inteiro): **105 de 105** em 3,6 min, sem retry e sem flaky.
    Exit 0.
  - `pnpm build` (`next build`): exit 0, todas as rotas compiladas. Rodado na worktree descartável,
    limpa em `e4ad923`, e não no worktree real, porque o `next build` reescreveria o `next-env.d.ts`
    que já aparece modificado lá.
- **Contagem antes da fatia** (`3b42f3c`, medida numa worktree descartável): unit 1668, e2e 87 em
  12 arquivos, integração 364.
- **Depois**: unit 1694 (+26), e2e 105 (+18, todos em `e2e/visao-tres-colunas.spec.ts`), integração
  364 (+0).
- **Skips**: nenhum. **Falhas**: nenhuma.
- **Integridade dos testes antigos**: nenhum teste apagado. Três e2e mudaram de alvo, e nenhum
  afrouxou o que prova:
  - `e2e/lancamento-avulso.spec.ts:324,335`: `dialog` → `dialog[open]`. O menu tem o `<dialog>` de
    importação, fechado, antes do `<main>`; o primeiro `dialog` deixou de ser o do cadastro. O alvo
    nomeado é o mesmo diálogo que o teste abre, e a prova (foco preso e fundo inerte) é a mesma.
  - `e2e/compra-parcelada.spec.ts:244,251`: "Saiu da conta" com `{ exact: true }`. Sem isso, a caixa
    "Já saiu da conta" do cadastro aberto casaria. O rótulo do card é exatamente "Saiu da conta" (o
    `toBeVisible()` estrito de `:251` o acha em Movimentações), então a ausência em Planejamento
    continua provada para o card. O que se perde é pegar uma variação do rótulo com texto em volta;
    escopar a consulta à grade dos cards seria mais forte, mas a garantia de MOV-03 está inteira.
  - `e2e/acessibilidade.spec.ts:281`: 7 → 9 blocos do esqueleto, os nove de `loading.tsx`, que é a
    regra de REDE-03 AC 5 (a mesma forma da página).
  - `src/components/navegacao-principal.test.tsx`: os testes antigos trocaram a prop pela rota
    (`abrir(...)`), com as mesmas assertions.

---

## Discrimination Sensor

**Profundidade**: ampliada (P1 de interface): 21 mutantes de comportamento na superfície do diff. Os 8
de unit rodaram com `pnpm exec vitest run <arquivo de teste>`; os 13 de e2e com `pnpm exec playwright
test e2e/visao-tres-colunas.spec.ts`, um por vez, a maioria com `--retries=2` (ver "Primeira rodada
descartada"). Só conta como morto o mutante que falha no teste que prova o critério, e não por tempo.

| # | `file:line` | Mutação | Morto por |
| --- | --- | --- | --- |
| U1 | `src/application/mes/ultimos-lancamentos.ts:26` | tira o corte `dataEvento <= hoje` | ✅ unit `ultimos-lancamentos.test.ts:53` e `:62` (AC 1, edge case do mês futuro) |
| U2 | `src/application/mes/ultimos-lancamentos.ts:29` | ordem crescente pela data | ✅ unit `:73` e `:97` (AC 1) |
| U3 | `src/application/mes/ultimos-lancamentos.ts:32` | corte em 9 | ✅ unit `:97` (AC 1) |
| U4 | `src/application/mes/ultimos-lancamentos.ts:26` | `<= hoje` → `< hoje` | ✅ unit `:53` (o de hoje entra) |
| U5 | `src/application/mes/ultimos-lancamentos.ts:26` | o cancelado entra | ✅ unit `:44` (AC 1) |
| N1 | `src/components/navegacao-principal.tsx:93-96` | desenha as áreas sem competência válida (home) | ✅ unit `navegacao-principal.test.tsx:31`, `:40` e `menu-lateral.test.tsx:49` (TRES-01 AC 4) |
| C1 | `src/components/ultimos-lancamentos.tsx:92-94` | a receita mostra a categoria, não "Receita" | ✅ unit `ultimos-lancamentos.test.tsx:76` (AC 3) |
| C2 | `src/components/ultimos-lancamentos.tsx:44` | "Ver todos" sem a competência | ✅ unit `ultimos-lancamentos.test.tsx:133` (AC 5) |
| E1 | `src/components/menu-lateral.tsx:38` | sem `md:sticky`: o menu rola junto | ✅ e2e `:144`, na assertion de `:153` (TRES-01 AC 1) |
| E2 | `src/app/(app)/[competencia]/page.tsx:136` | sem `xl:flex-row`: coluna de ação abaixo em 1.920 px | ✅ e2e `:246`, na assertion de `:270` (TRES-02 AC 1) |
| E3a | `src/app/(app)/[competencia]/page.tsx:273` | `name="busca"` → `name="q"` | ✅ e2e `:332`, `toHaveURL` de `:341` (TRES-04 AC 2) |
| E3b | `src/app/(app)/[competencia]/page.tsx:262` | a busca vai para a Visão geral, não para Lançamentos | ✅ e2e `:332`, `toHaveURL` de `:341` (TRES-04 AC 2) |
| E5 | `src/components/barra-de-filtros-compacta.tsx:86` | sem `md:left-60`: a barra cobre o menu | ✅ e2e `:377`, na assertion de `:388` |
| E6 | `src/components/horizonte-futuro.tsx:130` | "Próximos meses" volta a ficar lado a lado | ✅ e2e `:208`, na assertion de `:224` (TRES-02 AC 4) |
| G1 | `src/app/(app)/[competencia]/page.tsx:136,242` | coluna de ação vira em 1.536 px (`2xl`), não em 1.280 | ❌ **sobreviveu**: e2e da fatia 18 de 18 → Fix 4 |
| G2 | `src/app/(app)/[competencia]/page.tsx:131` | a página manda toda categoria sem cor: toda pill dos últimos neutra | ❌ **sobreviveu**: e2e da fatia 18 de 18 → Fix 2 |
| G4 | `src/app/(app)/[competencia]/page.tsx:259-284` | a busca sai da coluna de ação e vai para o centro, sob os cards | ❌ **sobreviveu**: e2e da fatia 18 de 18 → Fix 1 |
| G5 | `src/app/(app)/[competencia]/page.tsx:286-292` | os últimos saem da coluna de ação e vão para o centro, sob as seções | ❌ **sobreviveu**: e2e da fatia 18 de 18 → Fix 1 |
| G6 | `src/app/(app)/[competencia]/page.tsx:242` | sem `xl:border-l`: nenhuma linha entre o centro e a coluna | ❌ **sobreviveu**: e2e da fatia 18 de 18 → Fix 5 |
| G7 | `src/components/menu-lateral.tsx:38` | o menu vira coluna em 1.024 px (`lg`), não em 768 px (`md`) | ❌ **sobreviveu**: e2e da fatia 18 de 18 → Fix 4 |
| G8 | `src/app/(app)/[competencia]/fixos/page.tsx:124,167` | Todo mês sem a `AreaEstreita`: conteúdo na largura toda | ❌ **sobreviveu**: e2e da fatia 18 de 18 → Fix 3 |

**Confirmação no e2e inteiro**: com os 7 vivos aplicados juntos, o e2e inteiro (`pnpm exec
playwright test`, 13 arquivos, `--retries=2`) passa: **105 de 105**, nenhum `flaky`, em 3,8 min.
Nenhum outro spec do projeto mata qualquer um deles.

**Resultado do sensor**: 14 de 21 mortos. FAIL ❌.

**Primeira rodada descartada.** Na primeira rodada, sem retry, sete mutantes de e2e (E1, E2, E3a,
E3b, E5, E6 e G1) caíram todos no mesmo teste, `e2e/visao-tres-colunas.spec.ts:144`, com `scrollY`
igual a 0: falha de tempo, sem relação com a mutação (ver Observação 1). E1 e E2, rodados de novo,
morreram na assertion esperada. Os outros cinco foram rodados com `--retries=2`: E3a, E3b, E5 e E6
morreram nos testes esperados (E3b ainda saiu `flaky` em `:144` antes de morrer em `:341`), e G1, que
parecia morto, sobreviveu.

### Sondas das correções

Um arquivo de teste a mais na worktree descartável (`e2e/sonda-trc.spec.ts`, com a mesma semeadura da
fatia), rodado na HEAD e depois com cada mutante vivo, com `--retries=2`.

| Sonda | Teste acrescentado | HEAD | Com o mutante |
| --- | --- | --- | --- |
| P1a | em 1.280 × 900, `acao.x ≥ cards.x + cards.width` | passa | G1: falha |
| P1b | em 1.279 × 900, `acao.y ≥ proximos.y + proximos.height − 1` | passa | — (prova o outro lado do limiar) |
| P2 | em 1.920 px, as caixas do `search` "Buscar lançamento" e da região "Últimos lançamentos" com `x ≥ cards.x + cards.width` e alinhadas à região "Novo lançamento" (até 24 px de diferença em `x`) | passa | G4: falha; G5: falha |
| P3 | em 1.920 px, a pill "Categoria Um" da linha "Recente 01" com `toHaveClass(/bg-cat-/)` | passa | G2: falha |
| P4 | em 1.920 px, `getComputedStyle(colunaDeAcao).borderLeftWidth ≥ 1` | passa | G6: falha |
| P5 | em 800 × 900, espera os últimos, menu em x = 0 com até 260 px de largura e as áreas dentro dele; rola até o fim e exige o menu em y ≈ 0 e o importar à vista | passa | G7: falha (a primeira versão, só com x, altura ≥ 900 e as áreas, passava com G7: o `aside` fica esticado pela linha flex do layout) |
| P6 | em 1.920 px, a área de conteúdo de Todo mês e de Categorias com largura ≤ 1.024 | passa | G8: falha |

---

## Interactive UAT

Não feito: o verificador roda sem interação com o dono. A fatia é visual, e a spec deixa várias
decisões do autor sem confirmação (ver Observação 8).

---

## Code Quality

| Princípio | Status |
| --- | --- |
| Código mínimo | ✅ uma função pura (`ultimosLancamentos`), três componentes pequenos (`MenuLateral`, `AreaEstreita`, `UltimosLancamentos`), uma peça extraída (`ValorDaNatureza`) e um cadastro extraído (`CadastroDeLancamento`) |
| Mudança cirúrgica | ✅ Lançamentos, Todo mês, Categorias e a home só ganham a `AreaEstreita` em volta; a tabela usa a peça extraída sem mudar o que mostra |
| Sem escopo extra | ✅ nenhuma migration; nada fora de TRES-01 a TRES-05 e dos três desvios registrados na T7 |
| Segue os padrões | ✅ data como texto `'YYYY-MM-DD'` (AD-002), `localeCompare(…, "pt-BR")`, classes do Tailwind por extenso, server components onde o design pede |
| Assertion bate com o resultado da spec | ✅ valores exatos onde há (URL, textos, contagens, ordem); as medidas de layout comparam caixas no navegador, não nomes de classe |
| Cobertura por camada | ⚠️ `ultimosLancamentos` 1:1 com os ACs; na página, o lugar da busca e dos últimos, a cor da pill e os limiares não têm prova (lacunas) |
| Todo teste mapeia para AC ou edge case | ✅ cada `it`/`test` novo cita o AC; o teste da barra compacta cita o "Done when" da T3 |
| Guidelines do projeto | ⚠️ `AGENTS.md` e as Global Constraints da `tasks.md`: AD-009 cumprido (Pessoa A, Categoria Um, Recente 01…); L-014 cumprido para cards e últimos; **L-018 descumprido** para a busca e os últimos, que a própria `tasks.md` exigia presos à coluna de ação |

**`tasks.md` malformada.** O arquivo tem 678 linhas: o bloco "Task Breakdown" aparece 7 vezes, com
T1 repetida 4 vezes e T2 5 vezes, e cresceu a cada commit (335 linhas em `975e44c`, 418 em `1d5c8ba`,
678 em `89ac842`). Os "Done when" da T1, da T3 e da T7 ficaram todos `[ ]`, embora o cabeçalho diga
"T1 a T8 concluídas" e os commits existam. É defeito de documento, não de produto, mas o protocolo
manda marcar a task no mesmo commit.

---

## Fix Plans

Todas as correções são de teste: o produto, na HEAD, faz o que a spec pede em cada um dos casos.
Cada teste sugerido foi provado numa sonda (tabela "Sondas das correções"): passa na HEAD e morre
com o mutante.

### Fix 1: a busca e os últimos presos à coluna de ação (TRES-04 AC 1, TRES-05 AC 1; G4, G5)

- **Causa**: `e2e/visao-tres-colunas.spec.ts:298` e `:337` procuram a região "Últimos lançamentos" e
  o `search` "Buscar lançamento" na página inteira. Só o cadastro tem a caixa comparada com a dos
  cards (`:270`). A `tasks.md` (Global Constraints) pedia a consulta presa à coluna de ação (L-018).
- **Fix task**: no teste de `:246`, medir também as caixas do `search` e da região "Últimos
  lançamentos" e exigir `x ≥ cards.x + cards.width` e `x` alinhado ao da região "Novo lançamento".
- **Prioridade**: Major.

### Fix 2: a cor da pill atravessa a página (TRES-05 AC 3; G2)

- **Causa**: a cor só é provada em `src/components/ultimos-lancamentos.test.tsx:70`, que recebe o
  mapa pronto. Quem monta o mapa é a página (`src/app/(app)/[competencia]/page.tsx:128-133`), e o e2e
  de `:293-306` olha só a descrição (L-014).
- **Fix task**: no e2e dos últimos, exigir que a pill "Categoria Um" da linha "Recente 01" tenha a
  classe da cor da categoria (ou, melhor, o `background-color` computado diferente do da pill neutra).
- **Prioridade**: Major.

### Fix 3: Todo mês e Categorias em até 1.024 px (TRES-01 AC 8; G8)

- **Causa**: o AC vale para Lançamentos, Todo mês e Cadastros; `e2e/visao-tres-colunas.spec.ts:195-206`
  mede só Lançamentos (L-030).
- **Fix task**: repetir a medida de largura e centragem em `/<mês>/fixos` e
  `/<mês>/cadastros/categorias`, num laço como o de `:413-424`.
- **Prioridade**: Minor.

### Fix 4: os limiares de 768 px e 1.280 px (TRES-01 AC 1, TRES-02 ACs 1 e 5; G1, G7)

- **Causa**: o menu é provado em 400 px e de 1.024 px para cima; a coluna de ação em 1.024 e 1.920 px.
  Nenhum caso encosta nos limiares que a spec fixa (L-029).
- **Fix task**: e2e da coluna de ação em 1.280 px (ao lado, sonda P1a) e em 1.279 px (abaixo, P1b);
  e2e do menu entre 768 e 1.023 px que espere o conteúdo, role até o fim e exija o menu com até 260 px
  de largura, ainda em y ≈ 0 e com o importar à vista (sonda P5). Medir só `x` e altura não basta: com
  G7, o `aside` vira barra do topo mas continua esticado pela linha flex do layout, e passa nas duas.
- **Prioridade**: Major para 1.280 px (é o ponto de virada da história principal); Minor para 768 px.

### Fix 5: a linha fina entre o centro e a coluna de ação (TRES-02 AC 1; G6)

- **Causa**: a cláusula "separada do centro por uma linha fina" não tem assertion (L-010).
- **Fix task**: exigir `border-left-width` computado ≥ 1 px na coluna de ação em 1.920 px (L-037: estilo
  computado, e não nome de classe).
- **Prioridade**: Cosmetic.

---

## Observações para o dono

Fora do veredito: não são critério da spec, ou são decisões que pedem o olho do dono.

1. **O teste de rolagem do menu é sensível a tempo.** `e2e/visao-tres-colunas.spec.ts:147-149` rola
   logo depois do `goto`, sem esperar o conteúdo, e o `expect.poll` só relê o `scrollY`, sem rolar de
   novo. Na worktree descartável, com o `next dev` recompilando depois de cada mutação, ele falhou
   por tempo em 7 execuções, sem relação com a mutação, e uma vez saiu `flaky` no retry. O mesmo vale para
   as medidas por `boundingBox()` logo depois do `goto` (`caixa()`): uma vez, na primeira execução
   fria, `#cartao-de-filtros` ainda não estava na tela. No worktree real, aquecido, o e2e inteiro
   passou de primeira. Esperar uma região da página antes de rolar ou medir tira a corrida.
2. **Por esse motivo, os resultados de e2e da primeira rodada do sensor foram descartados** e
   rodados de novo (ver Discrimination Sensor). Uma correção nos testes de layout, esperar a região
   antes de medir, deixaria o sensor e o gate menos dependentes de cache aquecido.
3. **Cards estreitos em 1.024 e 1.440 px.** Com os cards seguindo o centro (`@container`), a grade
   tem 4 colunas sempre que o centro passa de 768 px. Medido na sonda: em 1.024 px, 4 cards de 171 px;
   em 1.440 px, 4 de 179 px; em 1.280 px, 2 colunas de 290 px; em 1.920 px, 4 de 299 px. O desvio da T7
   trocou 4 colunas por 2 em 1.280 px porque cards de ~150 px quebravam rótulo e link; em 1.024 e
   1.440 px eles ficam perto disso. Os rótulos ficaram numa linha na medida, mas vale o olho do dono
   no valor e no link nessas duas larguras.
4. **Duas consultas a mais em toda tela.** O layout de `(app)` passou a carregar os meios e a última
   competência importada para o diálogo de importação (`src/app/(app)/layout.tsx:40-43`), em toda
   navegação, inclusive Lançamentos, que já busca os meios. É o preço de o importar estar em toda
   tela; vale saber, não corrigir agora.
5. **A semeadura de teste virou upsert.** `semearCadastroBase` (`src/infrastructure/db/testing/banco-de-teste.ts:62-67`)
   grava a Pessoa A com `ON CONFLICT (email) DO UPDATE`, contra uma renderização atrasada do teste
   anterior. Resolve a falha, mas esconde a corrida em vez de esperá-la; se um dia o teste depender de
   um usuário recém-criado, a corrida volta com outra cara.
6. **"Saiu da conta" exato.** A troca em `e2e/compra-parcelada.spec.ts:244,251` mantém MOV-03 para o
   card. Uma consulta presa à grade dos cards provaria o mesmo sem depender de o rótulo ser exatamente
   esse texto.
7. **Títulos e traceability desatualizados.** O teste de `e2e/visao-tres-colunas.spec.ts:131` ainda se
   chama "da altura da página", e a traceability de TRES-01 no `spec.md` repete "da altura da página";
   o AC 1 agora diz "da altura da janela e presa ao rolar".
8. **Decisões do autor sem confirmação do dono** (`spec.md`, Assumptions, coluna `n`): menu preso ao
   rolar, pontos de virada em 768 e 1.280 px, 8 últimos só até hoje, "Próximos meses" em linhas,
   barra no topo do celular, cadastro aberto revendo o AD-014 na Visão geral. Vale uma olhada no
   monitor de 1.920 px e num notebook de 1.280 px.

---

## Lições registradas

Por `lessons.py`, a partir dos sinais desta rodada:

- **L-018** (lugar com consulta restrita à região): recorrência 3 (G4, G5). Também **penalizada**
  (harmful 1): estava carregada nesta fatia, nas Global Constraints da `tasks.md`, para "na coluna de
  ação", e a falha se repetiu no mesmo lugar que ela nomeava.
- **L-014** (composição atravessada): recorrência 3 (G2). Não penalizada: foi aplicada à composição que
  a `tasks.md` nomeou (lançar e ver o card mudar), e lá ela segurou; a cor da pill é outra composição,
  que ninguém listou.
- **L-029** (limiar com casos dos dois lados): promovida a confirmada (G1, G7).
- **L-030** (AC universal percorre todos os elementos): promovida a confirmada (G8).
- **L-010** (uma assertion por cláusula): recorrência 3 (G6; TRES-03 AC 2).
- **L-043**, nova candidata (`ac_gap`): edge case de uma porta nova que reusa uma regra antiga precisa
  de teste pela porta nova (busca com espaços nas pontas; gravação recusada na coluna de ação).

---

## Requirement Traceability Update

O verificador não edita a `spec.md`; a atualização fica para o commit das correções.

| Requirement | Status anterior | Status novo |
| --- | --- | --- |
| TRES-01 | In progress | ❌ Needs Fix (AC 8 só em Lançamentos; limiar de 768 px) |
| TRES-02 | In progress | ❌ Needs Fix (limiar de 1.280 px; linha fina) |
| TRES-03 | In progress | ⚠️ Verified com ressalva (AC 2 sem assertion para categorias e próximos meses) |
| TRES-04 | In progress | ❌ Needs Fix (AC 1: a busca fora da coluna de ação passa) |
| TRES-05 | In progress | ❌ Needs Fix (AC 1: os últimos fora da coluna passam; AC 3: a cor não atravessa a página) |

---

## Summary

**Overall**: ❌ Not Ready — o produto está certo, os testes não seguram o layout que a spec fixa.

**Spec-anchored check**: 28 de 28 critérios com assertion sobre algum resultado da spec; em 7 deles
uma cláusula ou um limiar não é discriminado (TRES-01 ACs 1 e 8; TRES-02 ACs 1 e 5; TRES-04 AC 1;
TRES-05 ACs 1 e 3). Sem lacuna de precisão na spec.
**Sensor**: 14 de 21 mortos; 7 vivos, todos com sonda que os mata.
**Gate**: unit 1694, integração 364, e2e 105 de 105, `typecheck`, `lint` e `build` verdes.

**O que funciona**: a escolha dos últimos (cancelado, data até hoje, ordem, empate pt-BR, corte em 8),
o menu preso ao rolar, a coluna de ação ao lado em 1.920 px e abaixo em 1.024 px, a busca que leva a
Lançamentos filtrado (cheia e vazia), lançar pela coluna e ver "Despesas do mês" e os últimos mudarem,
a navegação que some na home, os 400 px sem rolagem lateral em cinco telas, e os testes antigos que
mudaram de alvo sem afrouxar o que provam.

**Próximo passo**: as correções 1 a 5 são só de teste, num commit `test(visao-tres-colunas): …`, e
depois uma rodada 2 do verificador repetindo G1, G2 e G4 a G8.
