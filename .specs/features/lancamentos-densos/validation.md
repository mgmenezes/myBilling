# Lançamentos em lista densa — Validação

## Validation: lancamentos-densos — **FAIL**

**Result**: FAIL ❌ — rodada 1 (2026-10-30, `514ab25`).

Na HEAD o gate está verde:
- unit 1703, integração 364, e2e 125 de 125, sem retry e sem `flaky`;
- `typecheck`, `lint` e `build` passam.

Os limiares medidos e os critérios centrais (linha de até 48 px, coluna de filtros, títulos presos)
têm prova no navegador, e 13 dos 17 mutantes morrem. O veredito é FAIL por cinco lacunas: uma é de
spec, e quatro são de teste.

1. **Major: o "⋯" não fica no fim da linha (DENS-02, AC 1).**
   - O AC e a premissa confirmada pelo dono ("Num menu '⋯' no fim da linha do avulso", `y`) pedem o
     "⋯" no fim da linha.
   - O código o põe na célula da Situação, ao lado do selo, antes da coluna Valor
     (`src/components/tabela-lancamentos.tsx:351-369`). A sonda P4 mede, em 1.920 px, o "⋯" em
     x 1.314 a 1.346 e a célula do valor em x 1.358 a 1.462.
   - O desvio está escrito no `design.md` ("O protótipo punha o '⋯' no fim da linha…") e no
     trade-off do AD-020. A spec não foi corrigida: o AC 1 continua pedindo o contrário do que o
     código faz, e nenhum teste prova o lugar do "⋯".
2. **Major: com ponteiro grosso a partir de 768 px, os 44 px do "⋯" e do "Excluir" não têm prova
   (DENS-02, AC 7; M12).**
   - O AC tem duas cláusulas, "abaixo de 768 px **ou** com ponteiro grosso". Só a primeira é
     medida, em 400 px.
   - Aplicar a densidade também ao toque (`md:min-h-8` no lugar de `md:pointer-fine:min-h-8`) passa
     em 35 de 35 e2e e em 1.703 unit. O mesmo vale para o selo (TOQUE-01, AC 1).
3. **Major: a descrição longa não tem caso, e o `flex-nowrap` da situação pode sumir (edge case
   "Descrição longa"; DENS-01, AC 1; M11).**
   - Com descrições curtas, tirar `xl:pointer-fine:flex-nowrap` passa em `lancamentos-densos` e em
     `lista-enxuta`.
   - Com uma descrição longa no bloco, a sonda P1 mede, em 1.280 px, Item A e Item B (vencidos, com
     o "⋯") com 80,5 e 81 px. Na HEAD eles medem 44,5 e 45 px, e só a linha longa cresce (76 px), que
     é o que a spec pede. Dado real tem descrição longa.
4. **Minor: a coluna presa e a barra compacta só são medidas em 1.920 px (DENS-03, ACs 2 e 6; M13).**
   Prender o cartão só a partir de 1.600 px passa nos 14 testes da fatia. Entre 1.536 e 1.599 px a
   coluna rolaria para fora da tela. É a lição L-029, citada na `tasks.md`.
5. **Minor: o clique fora só é provado com o foco dentro do menu (DENS-02, AC 5; M17).**
   - Tirar o ouvinte de `pointerdown` passa: o `focusout` fecha o menu sozinho no teste.
   - No Safari, clicar num botão não lhe dá foco. Lá, só o `pointerdown` fecha o menu.

Para cada lacuna de teste, o teste que falta foi provado numa sonda: passa na HEAD e morre com o
mutante (seção [Sondas](#sondas)). Observações para o dono, fora do veredito, em
[Observações](#observações-para-o-dono).

**Data**: 2026-10-30
**Spec**: `.specs/features/lancamentos-densos/spec.md` (DENS-01 a DENS-04, 23 critérios, 7 edge cases)
**Faixa do diff**: `b42f9b6..514ab25`, 6 commits (T1 a T6). A base `b42f9b6` é o `main`.
**Verificador**: sub-agente independente (autor ≠ verificador). Leu o código e os testes da fatia sem
mudá-los. Este arquivo e os dois de lições são os únicos que ele escreveu no worktree real.

- **Onde rodaram as mutações:** numa `git worktree` descartável, detached em `514ab25`, no
  scratchpad da sessão, com `pnpm install --frozen-lockfile` próprio.
  - Cada mutante entrou sozinho, por uma troca de texto exata que tinha de casar o número esperado
    de vezes, e saiu com `git checkout -- src/`.
  - O gate da HEAD também rodou lá, porque `next build` reescreve o `next-env.d.ts`.
  - No fim a worktree foi removida.
- **Isolamento:** o `git status --porcelain` do worktree real foi comparado com o de antes
  (` M next-env.d.ts`, md5 `aa94238a…`) no meio e no fim.
  - Antes de escrever este arquivo, os dois eram iguais, e o `next-env.d.ts` tinha o mesmo md5.
  - Não houve `git stash`, e nada foi commitado.

---

## Task Completion

| Task | Commit | Status | Notas |
| --- | --- | --- | --- |
| T1 parcela curta | `de84baa` | ✅ Done | M1 e M14 morrem em unit e no e2e |
| T2 linha baixa | `4349d77` | ⚠️ Partial | M2, M3 e M4 morrem. A descrição longa não tem caso (M11 vivo). A `tasks.md` diz "a descrição que corta com reticências", e a spec e o código fazem o contrário (quebra) |
| T3 excluir no menu | `b967cb6` | ⚠️ Partial | M5 e M6 morrem. O "⋯" não está no fim da linha (lacuna 1). Sem prova com ponteiro grosso (M12) nem do clique fora sem foco (M17) |
| T4 coluna de filtros | `7f029ad` | ⚠️ Partial | M7, M8, M9, M15 e M16 morrem. Coluna presa e barra compacta só medidas em 1.920 px (M13) |
| T5 títulos presos | `284cbb1` | ✅ Done | M10 morre no lado de 1.536 px |
| T6 decisão registrada | `514ab25` | ✅ Done | AD-020 e as notas de substituição. O trade-off do "⋯" ficou no AD-020 e não chegou ao AC (lacuna 1) |

---

## Spec-Anchored Acceptance Criteria

Toda medida de layout abaixo é de caixa (`boundingBox`, `getBoundingClientRect`) ou de estilo
computado, no Chrome do projeto (1.280 × 720, ponteiro fino), salvo onde o teste muda a janela.

### DENS-01: uma linha por lançamento

| Critério | Resultado da spec | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| AC 1: a partir de 1.280 px com ponteiro fino, toda linha ≤ 48 px, inclusive parcela, fixo confirmado e vencido | as 6 linhas do mês ≤ 48 px em 1.280, 1.536 e 1.920 px | `e2e/lancamentos-densos.spec.ts:178` - `expect(alturas).toHaveLength(6)`, `:180` - `expect(altura, nome).toBeLessThanOrEqual(48)` em 1.280 e 1.536 px; `:194-196` - `toContainText("1/3 · faltam 2")`, `toContainText("confirmado · previa")`, `toContainText("Vencido")`, `:205`, `:207` em 1.920 px | ✅ PASS no lado aceito do limiar. Abaixo de 1.280 px a spec não promete nada ("pode quebrar"). A garantia some com uma descrição longa no mesmo bloco (M11, lacuna 3) |
| AC 2: parcela logo depois da descrição, na mesma célula, menor e apagada, "2/4 · faltam 2" e "4/4 · última" | o primeiro nó da célula é a descrição e o último é a parcela; textos exatos; caixas na mesma altura a partir de 1.280 px | `src/components/texto-da-parcela.test.ts:10`, `:14`, `:18` - `toBe("faltam 2")`, `toBe("faltam 1")`, `toBe("última")`; `src/components/tabela-lancamentos.test.tsx:48` - `celula.firstChild?.textContent).toBe(descricao)`, `:55` - `arrayContaining(["text-[13px]", "text-ink-muted"])`, `:56` - `not.toContain("block")`, `:420`, `:428`, `:435` - `toBe("2/4 · faltam 2")`, `toBe("4/4 · última")`, `toBe("3/4 · faltam 1")`; `e2e/lista-enxuta.spec.ts:476-477` - `topoDaParcela).toBeLessThan(peDaDescricao)`, `peDaParcela).toBeGreaterThan(topoDaDescricao)` em 1.280 e 1.440 px; `e2e/compra-parcelada.spec.ts:176`, `:182` | ✅ PASS. "Menor e apagado" é provado pelo nome da classe, e não pelo estilo computado (Observação 4) |
| AC 3: selo compacto "Pago"/"Previsto" que alterna o pagamento, com o mesmo nome acessível | nome `/^Previsto\s*, Item B/` com `aria-pressed="false"`; depois do clique, nome `/^Pago\s*, Item B/` com `aria-pressed="true"` | `e2e/lancamentos-densos.spec.ts:236` - `toHaveAttribute("aria-pressed", "false")`, `:239` - `pago).toHaveAttribute("aria-pressed", "true")`, `:242-245` (volta). O "compacto" é preso pela altura da linha (M3 morre em `:180`) | ✅ PASS |
| AC 4: vencido mostra "Vencido" ao lado do selo | "Vencido" à direita do selo, na mesma faixa vertical | `e2e/lancamentos-densos.spec.ts:233` - `vencido.x).toBeGreaterThanOrEqual(caixaDoSelo.x + caixaDoSelo.width)`, `:234` - `vencido.y).toBeLessThan(caixaDoSelo.y + caixaDoSelo.height)` | ✅ PASS |
| AC 5: fixo confirmável mostra "previsto" ou "confirmado · previa R$ X" na linha do valor, à esquerda | o texto termina antes do valor e cruza a altura dele | `e2e/lancamentos-densos.spec.ts:219` - `previsao.x + previsao.width).toBeLessThanOrEqual(valor.x + 1)`, `:220-221` - sobreposição vertical, para "confirmado · previa R$ 100,00" | ✅ PASS. Só a variante "confirmado" é medida; "previsto" (Fixo B) usa a mesma regra de CSS (Observação 1) |
| AC 6: as cinco colunas e o seletor de categoria de hoje (TRC) | cabeçalhos exatos; seletor com o comportamento de TRC | `e2e/lista-enxuta.spec.ts:480-481` - `toHaveText(["Descrição", "Categoria", "Data", "Situação", "Valor"])` em 1.024, 1.280 e 1.440 px; `src/components/tabela-lancamentos.test.tsx:642` (TRC-02 AC 1) e `e2e/trocar-categoria.spec.ts` sem mudança e verdes | ✅ PASS |

### DENS-02: excluir no menu da linha

| Critério | Resultado da spec | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| AC 1: **no fim da linha** de cada avulso, um "⋯" com o nome "Mais ações para <descrição>" | botão com esse nome em cada avulso, depois da última coluna de dado | Nome: `src/components/menu-da-linha.test.tsx:41` via `gatilho()` (`name: "Mais ações para Almoço"`); `e2e/lancamentos-densos.spec.ts:258-260` - `toBeVisible()` para Entrada A, Item A e Item B. Lugar: nenhuma assertion. O código o põe na célula da Situação (`tabela-lancamentos.tsx:363-369`), antes do Valor (sonda P4) | ❌ GAP: nome provado; o lugar contradiz o AC (lacuna 1) |
| AC 2: sem "⋯" na parcela e no fixo | zero "⋯" nessas linhas | `src/components/tabela-lancamentos.test.tsx:745`, `:765` - `queryByRole("button", { name: /^Mais ações/ })).toBeNull()`; `e2e/lancamentos-densos.spec.ts:263` - `toHaveCount(0)` para Fixo A, Fixo B e Compra A; `e2e/lancamento-avulso.spec.ts:296` | ✅ PASS |
| AC 3: acionar o "⋯" abre o menu com "Excluir" | `aria-expanded="true"` e o botão "Excluir, <descrição>" | `src/components/menu-da-linha.test.tsx:50-51` - `toBe("true")`, `getByRole("button", { name: "Excluir, Almoço" })`; `e2e/lancamentos-densos.spec.ts:278`, `:284` | ✅ PASS |
| AC 4: dois toques e então exclui, como hoje | o primeiro toque não chama a ação; o segundo a chama com o id; na página, a linha some e o bloco cai | `src/components/menu-da-linha.test.tsx:59` - `excluir).not.toHaveBeenCalled()`, `:63` - `toHaveBeenCalledWith("l-1")`; `e2e/lancamentos-densos.spec.ts:273` - `toContainText("2 · R$ 50,00")`, `:288` - `toHaveCount(0)`, `:289` - `toContainText("1 · R$ 30,00")` | ✅ PASS |
| AC 5: `Escape` ou clique fora fecham; no `Escape` o foco volta ao "⋯" | `aria-expanded="false"`, nada do painel, `activeElement` = "⋯" | `src/components/menu-da-linha.test.tsx:73-75` - `toBe("false")`, `toBeNull()`, `document.activeElement).toBe(gatilho())`; `:84-85` (clique fora); `e2e/lancamentos-densos.spec.ts:280-281` - `toHaveAttribute("aria-expanded", "false")`, `toBeFocused()` | ⚠️ PASS com lacuna: o clique fora só é provado com o foco dentro do menu (M17 vivo, lacuna 5). O `toBeFocused()` do e2e não discrimina, porque o foco já estava no "⋯" (M6 passa no e2e e morre no unit) |
| AC 6: nenhum "Excluir" fora do menu, em nenhuma largura | zero "Excluir" com o menu fechado | `e2e/lancamentos-densos.spec.ts:265` - `page.getByRole("button", { name: /^Excluir/ })).toHaveCount(0)` em 1.920 px; `src/components/tabela-lancamentos.test.tsx:714` - `toBeNull()` antes de abrir | ✅ PASS. O "Excluir" só é renderizado com o menu aberto, então a prova estrutural vale para toda largura |
| AC 7: abaixo de 768 px **ou** com ponteiro grosso, "⋯" e "Excluir" com ≥ 44 × 44 | as duas caixas ≥ 44 nos dois casos | `e2e/acessibilidade.spec.ts:137-139` - `alvo.largura).toBeGreaterThanOrEqual(ALVO_MINIMO)`, `alvo.altura)…` para selo, "⋯" e "Excluir" em 400 px. Ponteiro grosso a partir de 768 px: nenhuma assertion | ❌ GAP parcial: a cláusula do ponteiro grosso não tem prova (M12 vivo, lacuna 2) |

### DENS-03: filtros numa coluna à direita

| Critério | Resultado da spec | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| AC 1: a partir de 1.536 px, filtros numa coluna à direita, com linha fina, busca, categorias com total, situação, meio e pessoa | coluna à direita da lista; `border-left` 1px sólido; os cinco controles dentro de `#cartao-de-filtros search` | `e2e/lancamentos-densos.spec.ts:308` - `coluna.x).toBeGreaterThanOrEqual(entradas.x + entradas.width)`, `:316` - `toEqual({ largura: "1px", tipo: "solid" })`, `:319-323` - busca, `list` "Categoria", "Meio de pagamento", "Pessoa" e "Situação" `toBeVisible()` no `search` da coluna; `:391` em 1.536 px | ✅ PASS |
| AC 2: ao rolar a partir de 1.536 px, a coluna fica à vista | a busca da coluna na tela depois de rolar até o fim | `e2e/lancamentos-densos.spec.ts:373` - `toBeInViewport()` em 1.920 × 480 | ⚠️ PASS em 1.920 px; o limiar de 1.536 px não tem caso (M13 vivo, lacuna 4) |
| AC 3: contagem e total no alto da coluna | o `status` acima da busca, dentro da coluna | `e2e/lancamentos-densos.spec.ts:326` - `contagem.y + contagem.height).toBeLessThanOrEqual(busca.y)` | ✅ PASS (o texto da contagem e do total segue provado por `busca-e-filtros.spec.ts`, sem mudança) |
| AC 4: os chips de hoje (cor, total, escolha, "+N"), quebrando linha na largura da coluna | chip dentro das bordas da coluna; escolher marca `aria-pressed` | `e2e/lancamentos-densos.spec.ts:337-338` - `caixaDoChip.x).toBeGreaterThanOrEqual(coluna.x)`, `caixaDoChip.x + caixaDoChip.width).toBeLessThanOrEqual(coluna.x + coluna.width)`, `:342-345` - `toHaveAttribute("aria-pressed", "true")`; cor e "+N" em `e2e/categorias.spec.ts` e `e2e/lista-enxuta.spec.ts`, abaixo de 1.536 px | ✅ PASS. A fixture tem uma categoria só: a quebra de linha e o "+N" dentro da coluna de 288 px não são exercitados (Observação 2) |
| AC 5: abaixo de 1.536 px, filtros no topo | o cartão termina acima da lista em 1.535 px | `e2e/lancamentos-densos.spec.ts:386` - `noTopo.y + noTopo.height).toBeLessThanOrEqual((await caixa(entradas)).y)` | ✅ PASS (limiar dos dois lados: `:386` e `:391`) |
| AC 6: rolando a partir de 1.536 px, sem barra compacta | zero `search` "Busca e filtros ativos" | `e2e/lancamentos-densos.spec.ts:374` - `toHaveCount(0)` em 1.920 × 480; abaixo, `e2e/lista-enxuta.spec.ts:351` (LST-03) em 1.280 px | ⚠️ PASS em 1.920 px; o limiar de 1.536 px não tem caso (M13, lacuna 4) |
| AC 7: mesmos parâmetros e resultados | `categoriaId=` na URL e a entrada fora da lista | `e2e/lancamentos-densos.spec.ts:341` - `toHaveURL(/categoriaId=/)`, `:346` - `linha(page, "Entrada A")).toHaveCount(0)`; `busca-e-filtros.spec.ts`, `lista-enxuta.spec.ts` e `categorias.spec.ts` sem mudança e verdes | ✅ PASS |
| AC 8: a partir de 1.536 px, lista ≤ 1.100 px, centrada entre o menu e a coluna | largura ≤ 1.100; folgas iguais com tolerância de 1 px | `e2e/lancamentos-densos.spec.ts:357` - `lista.width).toBeLessThanOrEqual(1100)`, `:360` - `Math.abs(folgaEsquerda - folgaDireita)).toBeLessThanOrEqual(1)` | ✅ PASS (M9 morre: 1.344 px) |

### DENS-04: títulos dos blocos presos ao rolar

| Critério | Resultado da spec | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| AC 1: a partir de 1.536 px, o título do bloco, com o resumo, preso no alto enquanto as linhas passam | título em y ≈ 0 com "Fixo B" na tela em 1.536 px; em 1.535 px o título sai da tela | `e2e/lancamentos-densos.spec.ts:419` - `Math.abs((await caixa(titulo)).y)).toBeLessThanOrEqual(1)`, `:420` - `toBeInViewport()`, `:425` - `toBeLessThan(-1)` em 1.535 px | ✅ PASS, com o limiar dos dois lados. O resumo não é medido, mas mora na mesma `div` presa (`src/components/bloco-recolhivel.tsx:80-99`) (Observação 3) |
| AC 2: recolher e expandir com a escolha guardada, como hoje | `aria-expanded` alterna e as linhas somem e voltam; o cookie é gravado | `e2e/lancamentos-densos.spec.ts:436-437`, `:440-441`; `src/components/tabela-lancamentos.test.tsx:1063`, `:1083` (LST-02, sem mudança) | ✅ PASS |

**Status**: ❌ lacunas presentes. DENS-02 AC 1 contradiz o código, e DENS-02 AC 7 tem uma cláusula
sem prova. DENS-02 AC 5 e DENS-03 ACs 2 e 6 passam com lacuna de teste.

---

## Edge Cases

- [x] **Bloco recolhido:** o título continua no lugar. `e2e/lancamentos-densos.spec.ts:436-441`:
  o mesmo botão recolhe e expande, e as linhas somem e voltam.
- [x] **Vencido e pago ao mesmo tempo não existe.** `src/components/tabela-lancamentos.test.tsx:841-842`:
  `queryByText("Vencido")).toBeNull()` e "Pago" num pago de mês anterior.
- [ ] **Descrição longa: quebra linha, e só aquela linha cresce.** Nenhum teste. A HEAD faz o certo
  (sonda P1: linha longa com 76 px, as outras com 44,5 e 45 px), mas tirar o `flex-nowrap` passa na
  suíte (M11, lacuna 3).
- [x] **Confirmação aberta e clique fora: o menu fecha e a confirmação se desfaz.** Por construção: o
  `BotaoExcluir` é desmontado com o painel. `src/components/menu-da-linha.test.tsx:73-74` prova o
  mesmo para o `Escape`, com a confirmação armada. O clique fora é provado sem confirmação armada
  (`:84-85`).
- [x] **Entre 768 e 1.536 px:** linhas densas, filtros no topo, barra compacta e títulos soltos.
  - Linhas densas: `e2e/lancamentos-densos.spec.ts:180` em 1.280 px.
  - Filtros no topo: `:386` em 1.535 px.
  - Títulos soltos: `:425` em 1.535 px.
  - Barra compacta: `e2e/lista-enxuta.spec.ts:351` em 1.280 px.
- [x] **Valor do fixo em edição ocupa mais de uma linha, como hoje.** O ramo aberto de
  `ValorConfirmavel` não mudou. `src/components/valor-confirmavel.test.tsx` e os e2e de FIXO-04
  estão verdes.
- [x] **Erro ao trocar a categoria cresce a linha, como hoje.** O seletor não mudou, e
  `e2e/trocar-categoria.spec.ts` está verde.

---

## Gate Check

- **Comando**: `pnpm verify` (typecheck, lint, unit com cobertura, integração e build) e depois
  `pnpm exec playwright test`, na worktree descartável em `514ab25`, com
  `DATABASE_URL_TEST` no banco `mybilling_test_trc`.
- **Resultado**:
  - `typecheck` passou, sem erro;
  - `lint` passou: 317 arquivos, nada a corrigir;
  - unit: **1.703 de 1.703** em 109 arquivos, com 100% de branches em `src/domain` (355/355);
  - integração: **364 de 364** em 23 arquivos;
  - `build` compilou;
  - e2e: **125 de 125** em 6,2 min, sem retry, sem `flaky` e sem `skip`.
- **Contagem antes da fatia**: unit 1.694, e2e 111.
- **Contagem depois**: unit 1.703 (+9: 3 em `texto-da-parcela.test.ts` e 6 em
  `menu-da-linha.test.tsx`), e2e 125 (+14 em `lancamentos-densos.spec.ts`).
- **Integridade dos testes antigos**: nenhum teste apagado, pulado ou com `only`. A contagem de cada
  arquivo alterado é a mesma de `b42f9b6`:
  - `acessibilidade` 7, `compra-parcelada` 11, `lancamento-avulso` 14;
  - `lista-enxuta` 7, `visao-tres-colunas` 24;
  - `tabela-lancamentos.test.tsx` 49.

  Cada mudança segue a tabela "Testes que mudam porque a spec mudou" do `design.md`, e cada uma
  prova pelo menos o que provava:

  | Teste | Antes | Depois | Juízo |
  | --- | --- | --- | --- |
  | `tabela-lancamentos.test.tsx:43-60` | classes `block`, `text-[13px]`, `text-ink-muted` | `text-[13px]`, `text-ink-muted` e **não** `block` | mesma força, regra nova |
  | `tabela-lancamentos.test.tsx:342`, `:371-376` | `getByText("(faltam 2 depois desta)")` e `getByText("(última)")` na tela inteira | `textContent` exato da parcela, dentro da célula | mais forte (L-018) |
  | `tabela-lancamentos.test.tsx:700-785` | "Excluir" na linha | ausente antes de abrir, presente depois; "⋯" ausente na parcela e no fixo | mais forte |
  | `tabela-lancamentos.test.tsx:863-883` | selo e excluir no contêiner com `gap-2` | selo e "⋯" no contêiner com `gap-2` | mesma força |
  | `e2e/acessibilidade.spec.ts:123-166` | selo e excluir ≥ 44 em 400 px | selo, "⋯" e "Excluir" do menu ≥ 44; transbordo medido com o menu aberto | mais forte |
  | `e2e/compra-parcelada.spec.ts:176`, `:182` | texto antigo | texto novo, mesma consulta | mesma força |
  | `e2e/lancamento-avulso.spec.ts:259`, `:274`, `:296` | "Excluir" na linha | abre o "⋯" antes; "⋯" ausente na parcela | mais forte |
  | `e2e/lista-enxuta.spec.ts:453-478` | parcela **abaixo** da descrição em 1.024, 1.280 e 1.440 px | parcela na **mesma altura** em 1.280 e 1.440 px; em 1.024 px só o texto | regra nova: em 1.024 px a spec aceita os dois |
  | `e2e/visao-tres-colunas.spec.ts:218-221` | o laço de 1.024 px incluía Lançamentos | Todo mês e Categorias; Lançamentos vai para DENS-03 AC 8 | coberto em `lancamentos-densos.spec.ts:349-361` |

---

## Discrimination Sensor

**Profundidade**: ampliada (P1 de interface), com 17 mutantes de comportamento na superfície do
diff, um por vez.
- **Unit:** `pnpm exec vitest run --project domain --project componentes`.
- **e2e:** `pnpm exec playwright test --retries=1 <specs>`. O retry evita contar como morto o que
  falhou por tempo.
- **Ordem:** `lancamentos-densos.spec.ts` é `serial`, então o primeiro teste que falha pula os
  seguintes. A coluna "morto por" cita esse primeiro teste.

| # | `file:line` | Mutação | Morto por |
| --- | --- | --- | --- |
| M1 | `src/components/texto-da-parcela.ts:10` | `restantes === 0` → `restantes <= 1`: diz "última" com 1 restante | ✅ unit `texto-da-parcela.test.ts:14` e `tabela-lancamentos.test.tsx:435` (DENS-01 AC 2) |
| M2 | `src/components/tabela-lancamentos.tsx:123` | `CELULA` volta a `md:pointer-fine:py-2.5` | ✅ e2e `lancamentos-densos.spec.ts:180` em 1.280 px: Entrada A com 52 px (DENS-01 AC 1) |
| M3 | `src/components/botao-pago.tsx:32` | selo sem `md:pointer-fine:min-h-8` | ✅ e2e `:180` em 1.280 px: 52 px (DENS-01 ACs 1 e 3) |
| M4 | `src/components/valor-confirmavel.tsx:67` | volta a `flex-col` em `md`: a previsão abaixo do valor | ✅ e2e `:180` em 1.280 px: Fixo A e Fixo B com 51 px (DENS-01 ACs 1 e 5) |
| M5 | `src/components/tabela-lancamentos.tsx:363` | `origem === "AVULSO"` → `origem !== "RECORRENCIA"`: "⋯" também na parcela | ✅ unit `tabela-lancamentos.test.tsx:745`; e2e `lancamentos-densos.spec.ts:263` e `lancamento-avulso.spec.ts:296` (DENS-02 AC 2) |
| M6 | `src/components/menu-da-linha.tsx:53` | o `Escape` fecha sem devolver o foco | ✅ unit `menu-da-linha.test.tsx:75` (DENS-02 AC 5). O e2e passa 14 de 14 (Observação 5) |
| M7 | `src/app/(app)/[competencia]/lancamentos/page.tsx:219` | `#cartao-de-filtros` sem `2xl:sticky` | ✅ e2e `lancamentos-densos.spec.ts:373`: `viewport ratio 0` (DENS-03 AC 2) |
| M8 | `page.tsx` e `filtros-de-lancamentos.tsx` (todos os `2xl:`) | a coluna de filtros a partir de `xl` (1.280 px) | ✅ e2e `lancamentos-densos.spec.ts:180` em 1.280 px (Compra A com 75,5 px) e `lista-enxuta.spec.ts:351` (LST-03 em 1.280 px) |
| M9 | `page.tsx:200`, `:237` | `max-w-[1100px]` → `max-w-[1400px]` | ✅ e2e `lancamentos-densos.spec.ts:357`: 1.344 px (DENS-03 AC 8) |
| M10 | `src/components/bloco-recolhivel.tsx:80` | cabeçalho do bloco sem `2xl:sticky` | ✅ e2e `lancamentos-densos.spec.ts:419` em 1.536 px: y = 60 (DENS-04 AC 1) |
| M11 | `src/components/tabela-lancamentos.tsx:351` | grupo da situação sem `xl:pointer-fine:flex-nowrap` | ❌ **sobreviveu**: `lancamentos-densos` e `lista-enxuta`, 23 de 23 → Fix 3 |
| M12 | `src/components/menu-da-linha.tsx:84`, `botao-excluir.tsx:32` | "⋯" e "Excluir" com 32 px também no toque (`md:min-h-8`) | ❌ **sobreviveu**: `lancamentos-densos`, `acessibilidade` e `lancamento-avulso`, 35 de 35; unit 1.703 de 1.703 → Fix 2 |
| M13 | `page.tsx:219` | `2xl:sticky` → `min-[1600px]:sticky`: o cartão só prende a partir de 1.600 px | ❌ **sobreviveu**: `lancamentos-densos`, 14 de 14 → Fix 4 |
| M14 | `src/components/tabela-lancamentos.tsx:310` | a parcela volta a ser `block` (segunda linha) | ✅ unit `tabela-lancamentos.test.tsx:56`; e2e `lancamentos-densos.spec.ts:180` em 1.280 px: 50 px (DENS-01 AC 2) |
| M15 | `src/components/filtros-de-lancamentos.tsx:137` | sem `2xl:order-first`: a contagem no pé da coluna | ✅ e2e `lancamentos-densos.spec.ts:326`: 595 > 135 (DENS-03 AC 3) |
| M16 | `page.tsx:216` | coluna sem `2xl:border-l` | ✅ e2e `lancamentos-densos.spec.ts:316` (DENS-03 AC 1) |
| M17 | `src/components/menu-da-linha.tsx:68` | sem o ouvinte de `pointerdown` no `document` | ❌ **sobreviveu**: unit 1.703 de 1.703 → Fix 5 |

Os números de linha são os dos arquivos na HEAD (`514ab25`).

**Resultado do sensor**: 13 de 17 mortos, e 4 sobreviveram (M11, M12, M13 e M17). FAIL ❌.

### Sondas

Para cada mutante vivo, a sonda acrescenta o teste que falta na worktree descartável:
- `e2e/sonda-densos.spec.ts`, com uma semeadura própria: Item A e Item B vencidos, e um avulso de
  descrição longa no mesmo bloco;
- um teste de componente para M17.

Cada sonda rodou na HEAD e depois com o seu mutante. Nenhuma ficou no worktree real.

| Sonda | Teste acrescentado | HEAD | Com o mutante |
| --- | --- | --- | --- |
| P1 | Em 1.280 e 1.536 px, com uma descrição longa no bloco, Item A e Item B (vencidos, com "⋯") medem ≤ 48 px | ✅ passa: 44,5 e 45 px; a longa, 76 px | ✅ M11 morre: 80,5 e 81 px |
| P2 | `test.use({ hasTouch: true })` em 1.920 px: `matchMedia("(pointer: coarse)")` é verdadeiro, e "⋯" e "Excluir" medem ≥ 44 × 44 | ✅ passa: 44 × 44 e 63 × 44 | ✅ M12 morre: 32 px |
| P3 | Em 1.536 × 480, rolando até o fim, a busca da coluna na tela e nenhuma barra compacta | ✅ passa | ✅ M13 morre: `viewport ratio 0` |
| P4 | Informativa: a posição do "⋯" na linha, em 1.920 px | "⋯" em x 1.314–1.346; células Situação 1.143–1.358 e Valor 1.358–1.462 | — |
| P5 | Unit: abrir o menu com `fireEvent.click`, sem foco, e então `fireEvent.pointerDown(document.body)` fecha | ✅ passa | ✅ M17 morre: `expected 'true' to be 'false'` |

---

## Interactive UAT

Não feita: o verificador é um sub-agente sem o dono na conversa. A lacuna 1 pede uma decisão dele.

---

## Code Quality

| Princípio | Status |
| --- | --- |
| Código mínimo | ✅ Um componente novo (`MenuDaLinha`) e uma função pura (`restoDaParcela`). O resto é classe `2xl:` e `md:pointer-fine:` |
| Mudanças cirúrgicas | ✅ Um cartão de filtros e um `#cartao-de-filtros` só; `BarraDeFiltrosCompacta` intocada; a `div` das linhas de LST-02 intocada |
| Sem escopo extra | ✅ |
| Segue os padrões | ✅ Nomes em português; `"use client"` só no menu; disclosure com `aria-expanded`/`aria-controls` |
| Resultados da spec nas assertions | ⚠️ DENS-02 AC 1 sem prova do lugar; DENS-02 AC 7 sem a cláusula do ponteiro grosso |
| Cobertura por camada | ✅ Domínio intocado, com 100% de branches |
| Todo teste mapeia um AC | ✅ Cada teste novo cita o AC no título |
| Regras do projeto (`AGENTS.md`) | ✅ Sem dado real: "Item A", "Fixo A", "Compra A", valores redondos, `example.com`. Mensagens de commit limpas. Sem mudança de banco |

---

## Fix Plans

### Fix 1: o lugar do "⋯" (DENS-02, AC 1) — Major, pede o dono

- **Causa**: a decisão de design ("ao lado do selo, para não abrir uma coluna vazia") foi registrada
  no `design.md` e no AD-020, mas não voltou à spec. O AC e a premissa confirmada (`y`) ainda dizem
  "no fim da linha".
- **Tarefa**: perguntar ao dono qual vale.
  - **Se vale "ao lado do selo"**: reescrever DENS-02 AC 1 ("na célula da situação, logo depois do
    selo e do 'Vencido'") e a linha da premissa, com a confirmação dele. Acrescentar uma assertion de
    lugar em `e2e/lancamentos-densos.spec.ts`: a caixa do "⋯" dentro da célula da Situação e à
    direita do selo (L-018).
  - **Se vale "no fim da linha"**: mover o "⋯" para depois do valor sem abrir uma sexta coluna (o
    teste de LST-05 exige cinco), e medir que a borda direita do "⋯" é a maior da linha.
- **Pronto quando**: o AC, o código e uma assertion de caixa dizem a mesma coisa.

### Fix 2: 44 px com ponteiro grosso a partir de 768 px (DENS-02, AC 7; TOQUE-01) — Major

- **Tarefa**: acrescentar a `e2e/lancamentos-densos.spec.ts` (ou a `acessibilidade.spec.ts`) um
  `describe` com `test.use({ hasTouch: true, viewport: { width: 1920, height: 1080 } })`. Ele deve:
  - afirmar `matchMedia("(pointer: coarse)")`;
  - medir o selo, o "⋯" e o "Excluir" do menu aberto com ≥ 44 × 44 (sonda P2).
- **Pronto quando**: M12 morre, e a mesma mutação no `BotaoPago` também.

### Fix 3: a descrição longa (edge case; DENS-01, AC 1) — Major

- **Tarefa**: semear em `lancamentos-densos.spec.ts` um avulso de descrição longa, genérica, no bloco
  de um avulso vencido. Em 1.280 e 1.536 px, afirmar duas coisas (sonda P1):
  - as outras linhas do bloco continuam ≤ 48 px;
  - só a linha longa passa de 48 px.

  Conferir que o teste de AC 1 que conta 6 linhas continua contando o que precisa.
- **Pronto quando**: M11 morre.

### Fix 4: coluna presa e sem barra compacta no limiar (DENS-03, ACs 2 e 6) — Minor

- **Tarefa**: rodar o teste de `lancamentos-densos.spec.ts:364` também em 1.536 × 480 (sonda P3).
  Do outro lado, em 1.535 × 480, afirmar que a barra compacta aparece ao rolar (L-029).
- **Pronto quando**: M13 morre, e a barra em 1.535 px tem assertion.

### Fix 5: clique fora sem foco dentro (DENS-02, AC 5) — Minor

- **Tarefa**: em `menu-da-linha.test.tsx`, abrir com `fireEvent.click` (sem foco, como o Safari faz)
  e fechar com `fireEvent.pointerDown(document.body)` (sonda P5).
- **Pronto quando**: M17 morre.

---

## Observações para o dono

Fora do veredito; nenhuma muda o que a tela faz hoje.

1. **AC 5 do DENS-01 só mede "confirmado".** A variante "previsto" (Fixo B) usa a mesma regra de
   CSS e passa na altura da linha, mas não tem assertion de lugar (L-010).
2. **Chips na coluna com uma categoria só.** A quebra de linha e o "+N categorias" dentro dos 288 px
   não são exercitados a partir de 1.536 px.
3. **O resumo do título preso não é medido** (DENS-04 AC 1). Ele está na mesma `div` presa do título.
4. **"Menor e apagado" (DENS-01 AC 2) é provado pelo nome da classe**, e não pelo estilo computado
   (candidata L-037).
5. **O `toBeFocused()` do e2e (`lancamentos-densos.spec.ts:281`) não discrimina.** O `Escape` é
   apertado com o foco já no "⋯". Quem prova a volta do foco é o unit, que aciona "Excluir" antes.
6. **"O dobro de linhas por tela" (Success Criteria) não é medido.** A linha passou de ~65 px para
   44,5–45 px (sonda P1), e os ~330 px de filtros saíram do topo a partir de 1.536 px. O ganho depende
   da altura da janela.
7. **Textos que ficaram para trás**:
   - `tasks.md`, T2 "What": "a descrição que corta com reticências". A spec e o código quebram linha.
   - `design.md`: chama a função de `textoDaParcela(parcela)`, e ela é `restoDaParcela(restantes)`.
   - `design.md`, tabela do e2e novo: cita "400 px sem rolagem lateral" e "título em 1.920 px". O
     primeiro está em `acessibilidade.spec.ts:165`, e o segundo roda em 1.536 px.
   - `e2e/compra-parcelada.spec.ts:112`: o comentário diz "a parcela é a segunda linha dela".
   - `tabela-lancamentos.test.tsx:510`: o título do teste diz "a parcela sob a descrição".
8. **`lancamentos-densos.spec.ts` é `serial`.** Um defeito mostra só o primeiro critério quebrado, e
   os testes seguintes nem rodam. Isso atrapalha o diagnóstico, não a detecção.

---

## Lições registradas

Pelo `lessons.py add`, com a fonte de cada sinal:

- **L-044** (candidata), de M12 (`surviving_mutant`): alvo que só encolhe com ponteiro fino precisa
  de teste com ponteiro grosso acima do breakpoint.
- **L-045** (candidata), de M11 (`surviving_mutant`): regra de layout que protege uma linha precisa de
  fixture com o conteúdo que aperta.
- **L-029** (confirmada, agora com 3 recorrências), de M13 (`surviving_mutant`): o limiar precisa de
  casos colados nos dois lados. A `tasks.md` citava a L-029 e a aplicou à posição da coluna e aos
  títulos, mas não à coluna presa nem à barra compacta. Não foi penalizada: a orientação funcionou
  onde foi aplicada.
- **L-046** (candidata), de M17 (`surviving_mutant`): o clique fora precisa de teste com o painel
  aberto sem foco dentro.
- **L-047** (candidata), de DENS-02 AC 1 (`ac_gap`): decisão de design que contraria um AC confirmado
  volta ao próprio AC, com a confirmação do dono.

---

## Requirement Traceability Update

| Requisito | Status anterior | Status novo |
| --- | --- | --- |
| DENS-01 | In progress | ❌ Needs Fix (Fix 3) |
| DENS-02 | In progress | ❌ Needs Fix (Fixes 1, 2 e 5) |
| DENS-03 | In progress | ❌ Needs Fix (Fix 4) |
| DENS-04 | In progress | ✅ Verified |

A `spec.md` não foi alterada pelo verificador. A atualização fica para o commit das correções.

---

## Summary

**Overall**: ❌ Not Ready.

**Spec-anchored check**: 23 critérios.
- 19 com assertion sobre o resultado da spec.
- 2 com lacuna: DENS-02 AC 1 (o lugar contradiz o código) e AC 7 (ponteiro grosso).
- 2 passam só longe do limiar: DENS-03 ACs 2 e 6.
- DENS-02 AC 5 passa, mas o clique fora sem foco não é provado.
- Nenhuma lacuna de precisão na spec.

**Sensor**: 13 de 17 mortos.
**Gate**: unit 1.703, integração 364, e2e 125 de 125, `typecheck`, `lint` e `build`, todos verdes.

**O que funciona**:
- a linha de até 48 px em 1.280, 1.536 e 1.920 px, inclusive parcela, fixo confirmado e vencido;
- a parcela curta;
- o menu com os dois toques, o `Escape` e o foco;
- a coluna de filtros com o limiar dos dois lados;
- a lista com até 1.100 px, centrada;
- os títulos presos, com o limiar dos dois lados;
- nenhum teste antigo afrouxado.

**Próximo passo**: o dono decide o lugar do "⋯" (Fix 1). Depois, os Fixes 2 a 5 só acrescentam
testes, e cada um já foi provado numa sonda.
