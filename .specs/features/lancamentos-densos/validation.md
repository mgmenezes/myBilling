# Lançamentos em lista densa — Validação

## Validation: lancamentos-densos (rodada 2) — **FAIL**

**Result**: FAIL ❌ — rodada 2 (2026-10-30, `12ef0ca`).

As cinco lacunas da rodada 1 estão fechadas:
- o "⋯" ao lado do selo tem prova de lugar, e a spec diz o mesmo que o código;
- os quatro mutantes que tinham sobrevivido (M11, M12 nas duas variantes, M13 e M17) morrem, cada um
  no teste novo que mira a sua lacuna.

O gate está verde:
- unit 1.704, integração 364, e2e 129 de 129, sem retry e sem `flaky`;
- `typecheck`, `lint` e `build` passam.

O veredito é FAIL por **uma lacuna nova, Minor**, que a rodada 1 não viu:

1. **Minor: o limiar de 768 px dos alvos de 44 px não tem caso (DENS-02, AC 7; TOQUE-01, AC 1;
   N11 e N11b).**
   - O AC pede o "⋯" e o "Excluir" com ao menos 44 × 44 "abaixo de 768 px". O selo segue a mesma
     regra (TOQUE-01). Os três só encolhem com `md:pointer-fine:`, uma redução nova desta fatia.
   - O lado de baixo do limiar só é medido em 400 px (`e2e/acessibilidade.spec.ts:138-139`), longe
     dele.
   - Dois mutantes passam na suíte inteira (unit 1.704 e e2e 129 de 129):
     - N11, o "⋯" e o "Excluir" densos já a partir de 640 px (`sm:pointer-fine:`);
     - N11b, a mesma troca no selo.
   - Com ponteiro fino, de 640 a 767 px, os alvos ficariam com 32 px.
   - A sonda P6, com ponteiro fino em 767 px, passa na HEAD (44 × 44 nos três) e mata os dois
     mutantes (32 px). É a L-029: o `tasks.md` listou os limiares de 1.280 e 1.536 px e deixou de
     fora o de 768 px.

Mais 13 mutantes novos ou reaplicados morrem, entre eles:
- o "⋯" depois do valor, ou entre o selo e "Vencido";
- a parcela com o resto errado por um;
- o título preso já em 1.280 px;
- a barra compacta escondida em 1.535 px;
- a descrição longa sem quebrar.

Um mutante sobrevive fora da spec: N5, o menu que não fecha quando o foco sai dele. Nenhum AC pede
isso, só o `design.md`, então ele fica como observação.

**Data**: 2026-10-30
**Spec**: `.specs/features/lancamentos-densos/spec.md` (DENS-01 a DENS-04, 23 critérios, 7 edge cases;
DENS-02 AC 1 emendado pelo dono em 2026-10-30)
**Faixa do diff**:
- a fatia inteira é `b42f9b6..12ef0ca`;
- as tasks T1 a T6 são `b42f9b6..514ab25`;
- o relatório da rodada 1 e as correções F1 a F7 são `514ab25..12ef0ca`: `7525e40`, `d0c67cb`,
  `7ac8cbf`, `7153dfd`, `0b73ecd`, `c4cf6ad`, `15ea1ee` e `12ef0ca`.

`git diff --stat 514ab25..12ef0ca` só toca spec, `design.md`, `tasks.md`, lições, três e2e e dois
testes de componente. Nenhum arquivo de produção mudou desde a rodada 1.

**Verificador**: sub-agente independente da rodada 2 (autor ≠ verificador). Leu código e testes sem
mudá-los. No worktree real, escreveu só este arquivo e os dois de lições.

- **Onde rodaram as mutações:** numa `git worktree` descartável, detached em `12ef0ca`, no scratchpad
  da sessão, com `pnpm install --frozen-lockfile` próprio.
  - O gate da HEAD também rodou lá, antes de qualquer mutação, porque `next build` reescreve o
    `next-env.d.ts`.
  - Cada mutante entrou sozinho, por uma troca de texto exata que tinha de casar o número esperado de
    vezes, e saiu com `git checkout -- src`.
  - As sondas viveram num arquivo `e2e/sonda-r2.spec.ts` só da worktree descartável. No fim, a
    worktree foi removida.
- **Isolamento:** o `git status --porcelain` do worktree real foi comparado com o de antes
  (` M next-env.d.ts`, md5 `aa94238a…`) no meio e no fim do trabalho. Não houve `git stash`, e nada
  foi commitado.

---

## Rodada 1 (2026-10-30, `514ab25`): FAIL

O gate estava verde (unit 1.703, e2e 125), e 13 de 17 mutantes morriam. Cinco lacunas:

| # | Lacuna da rodada 1 | Correção | Prova na HEAD (`file:line` + assertion) | Mutante reaplicado |
| --- | --- | --- | --- | --- |
| 1 | Major: o AC pedia o "⋯" no fim da linha, e o código o põe ao lado do selo (DENS-02 AC 1) | F1 `d0c67cb`: o dono confirmou o lugar; AC, premissa e `design.md` reescritos; e2e de lugar | `e2e/lancamentos-densos.spec.ts:328-329` - `menu.x >= situacao.x`, `menu.x + menu.width <= situacao.x + situacao.width`; `:332` - `menu.x >= selo.x + selo.width`; `:340` - `menuDoVencido.x >= chip.x + chip.width` | N3 e N4 (novos) morrem em `:329` e `:340` |
| 2 | Major: 44 px com ponteiro grosso acima de 768 px sem prova (DENS-02 AC 7; M12) | F2 `7ac8cbf`: `describe` com `hasTouch` em 1.920 px | `:386` - `matchMedia("(pointer: coarse)").matches).toBe(true)`; `:401-402` - `alvo.width`/`alvo.height` `toBeGreaterThanOrEqual(44)` para selo, "⋯" e "Excluir" | M12a: morto em `:401`, "⋯" com 32; M12b: morto em `:402`, selo com 32 |
| 3 | Major: descrição longa sem caso (edge case; DENS-01 AC 1; M11) | F3 `7153dfd`: Item C de descrição longa em "Gastos do Mês" | `:212` - `expect(altura, nome).toBeLessThanOrEqual(48)` nas seis curtas; `:217` - `toBeGreaterThan(48)` na longa | M11: morto em `:212`, Item B com 81 px |
| 4 | Minor: coluna presa e barra compacta só em 1.920 px (DENS-03 ACs 2 e 6; M13) | F4 `0b73ecd`: o teste roda em 1.536 e 1.920 × 480; caso novo em 1.535 × 480 | `:499` - `toBeInViewport()` e `:500` - `toHaveCount(0)` em 1.536 e 1.920 px; `:515` - `not.toBeInViewport()` e `:516` - `toBeVisible()` em 1.535 px | M13: morto em `:499` (1.536 px, `viewport ratio 0`); N10 (novo): morto em `:516` |
| 5 | Minor: clique fora só provado com o foco dentro (DENS-02 AC 5; M17) | F5 `c4cf6ad`: unit com `fireEvent.click` e `fireEvent.pointerDown(document.body)` | `src/components/menu-da-linha.test.tsx:96` - `activeElement).toBe(document.body)`; `:100` - `toBe("false")`; `:101` - `toBeNull()` | M17: morto em `:100` |

As observações 5 e 7 da rodada 1 também foram fechadas:
- **Observação 5, F6 (`15ea1ee`):** o foco vai ao "Excluir" antes do `Escape` (`:358-359`), e o
  `toBeFocused()` de `:362` agora discrimina. M6 morre no e2e, e não só no unit.
- **Observação 7, F7 (`12ef0ca`):** os textos que ficaram para trás foram corrigidos. Nenhum arquivo da
  fatia ainda diz "reticências", "segunda linha" ou "sob a descrição" para a parcela.

---

## Task Completion

| Task | Commit | Status | Notas |
| --- | --- | --- | --- |
| T1 parcela curta | `de84baa` | ✅ Done | N1 morre em 6 testes de componente |
| T2 linha baixa | `4349d77` | ✅ Done | M11 e N9 morrem com a descrição longa da F3; N8 morre no lugar de "confirmado · previa" |
| T3 excluir no menu | `b967cb6` | ⚠️ Partial | Lugar, toque, `Escape` e clique fora provados. O limiar de 768 px do AC 7 não tem caso (N11 vivo) |
| T4 coluna de filtros | `7f029ad` | ✅ Done | M13, N6 e N10 morrem; limiar de 1.536 px provado dos dois lados |
| T5 títulos presos | `284cbb1` | ✅ Done | N7 morre do lado de 1.535 px |
| T6 decisão registrada | `514ab25` | ✅ Done | AD-020 diz o mesmo lugar do "⋯" que a spec emendada |
| F1 a F7 | `d0c67cb`…`12ef0ca` | ✅ Done | Cada uma mata o mutante que a motivou (tabela da Rodada 1) |

---

## Spec-Anchored Acceptance Criteria

Toda medida de layout é de caixa (`boundingBox`, `getBoundingClientRect`) ou de estilo computado:
- no Chrome do projeto, a 1.280 × 720 com ponteiro fino, salvo onde o teste muda a janela;
- `matchMedia("(pointer: fine)")` é verdadeiro no projeto padrão, conferido na sonda.

As linhas citadas são as da `12ef0ca`.

### DENS-01: uma linha por lançamento

| Critério | Resultado da spec | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| AC 1: a partir de 1.280 px com ponteiro fino, toda linha ≤ 48 px, inclusive parcela, fixo confirmado e vencido | as seis linhas curtas ≤ 48 em 1.280, 1.536 e 1.920 px; só a de descrição longa passa disso | `e2e/lancamentos-densos.spec.ts:210` - `expect(curtas).toHaveLength(6)`, `:212` - `expect(altura, nome).toBeLessThanOrEqual(48)`, `:215` - `expect(longas).toHaveLength(1)`, `:217` - `toBeGreaterThan(48)`, em 1.280 e 1.536 px; `:231-233` (parcela, "confirmado · previa" e "Vencido" na tela) e `:237-243` em 1.920 px | ✅ PASS. Na HEAD: curtas com 40 a 45 px e a longa com 76 px, nas três larguras. O limiar é medido colado nele (1.280 px); abaixo dele a spec não promete altura |
| AC 2: a parcela logo depois da descrição, na mesma célula, menor e apagada: "2/4 · faltam 2" e "4/4 · última" | o primeiro nó da célula é a descrição e o último é a parcela; textos exatos; a parcela na altura da descrição a partir de 1.280 px | `src/components/texto-da-parcela.test.ts:10`, `:14`, `:18` - `toBe("faltam 2")`, `toBe("faltam 1")`, `toBe("última")`; `src/components/tabela-lancamentos.test.tsx:48` - `celula.firstChild?.textContent).toBe(descricao)`, `:55-56` - classes `text-[13px]` e `text-ink-muted`, sem `block`; `:420` - `toBe("2/4 · faltam 2")`, `:428` - `toBe("4/4 · última")`, `:435` - `toBe("3/4 · faltam 1")`; `e2e/lista-enxuta.spec.ts:476-477` em 1.280 e 1.440 px; `e2e/compra-parcelada.spec.ts:176`, `:182` | ✅ PASS. "Menor e apagado" é provado pelo nome da classe (Observação 4) |
| AC 3: o selo "Pago"/"Previsto" alterna o pagamento, com o mesmo nome acessível | `/^Previsto\s*, Item B/` com `aria-pressed="false"`; depois do clique, `/^Pago\s*, Item B/` com `"true"` | `e2e/lancamentos-densos.spec.ts:272` - `toHaveAttribute("aria-pressed", "false")`, `:275` - `pago).toHaveAttribute("aria-pressed", "true")`, `:278-281` (volta). O "compacto" é preso pela altura da linha em `:212` | ✅ PASS |
| AC 4: "Vencido" ao lado do selo | "Vencido" à direita do selo, na mesma faixa | `:269` - `vencido.x).toBeGreaterThanOrEqual(caixaDoSelo.x + caixaDoSelo.width)`, `:270` - `vencido.y).toBeLessThan(caixaDoSelo.y + caixaDoSelo.height)` | ✅ PASS |
| AC 5: "previsto" ou "confirmado · previa R$ X" na linha do valor, à esquerda dele | o texto termina antes do valor e cruza a altura dele | `:255` - `previsao.x + previsao.width).toBeLessThanOrEqual(valor.x + 1)`, `:256-257` - sobreposição vertical, para "confirmado · previa R$ 100,00" | ✅ PASS (N8 morre em `:255`). Só a variante "confirmado" é medida (Observação 1) |
| AC 6: as cinco colunas e o seletor de categoria de hoje | cabeçalhos exatos; seletor com o comportamento de TRC | `e2e/lista-enxuta.spec.ts:480-481` - `toHaveText(["Descrição", "Categoria", "Data", "Situação", "Valor"])` em 1.024, 1.280 e 1.440 px; `e2e/lancamentos-densos.spec.ts:315-321` - o mesmo em 1.920 px, nas tabelas dos três avulsos; TRC em `src/components/tabela-lancamentos.test.tsx` e `e2e/trocar-categoria.spec.ts`, sem mudança e verdes | ✅ PASS |

### DENS-02: excluir no menu da linha

| Critério | Resultado da spec | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| AC 1 (emendado): na célula da Situação de cada avulso, logo depois do selo e do "Vencido", um "⋯" com o nome "Mais ações para <descrição>" | o "⋯" com esse nome dentro da célula da Situação, à direita do selo e, no vencido, de "Vencido" | Nome: `src/components/menu-da-linha.test.tsx:34` (`gatilho()`, `name: "Mais ações para Almoço"`), `:41`; `e2e/lancamentos-densos.spec.ts:294-296` - `toBeVisible()` em Entrada A, Item A e Item B. Lugar: `:328-331` - a caixa do "⋯" dentro da 4ª célula, `:332` - `menu.x >= selo.x + selo.width`, `:340` - `menuDoVencido.x >= chip.x + chip.width`, com `:315-321` confirmando que a 4ª coluna é "Situação" (L-018) | ✅ PASS. Spec, premissa (`y`, com data e motivo), `design.md`, AD-020 e código dizem o mesmo lugar. Sonda: em 1.920 px, o "⋯" do Item B fica em x 1.314–1.346, a Situação em 1.143–1.358 e o Valor em 1.358–1.462. N3 e N4 morrem |
| AC 2: sem "⋯" na parcela e no fixo | zero "⋯" nessas linhas | `src/components/tabela-lancamentos.test.tsx:745`, `:765` - `queryByRole("button", { name: /^Mais ações/ })).toBeNull()`; `e2e/lancamentos-densos.spec.ts:299` - `toHaveCount(0)` em Fixo A, Fixo B e Compra A; `e2e/lancamento-avulso.spec.ts:296` | ✅ PASS (N2 morre no unit `:765` e no e2e `:299`, pela página) |
| AC 3: acionar o "⋯" abre o menu com "Excluir" | `aria-expanded="true"` e o botão "Excluir, <descrição>" | `src/components/menu-da-linha.test.tsx:50-51`; `e2e/lancamentos-densos.spec.ts:354`, `:365` | ✅ PASS |
| AC 4: dois toques, e então exclui como hoje | o 1º toque não chama a ação; o 2º chama com o id; na página, a linha some e o bloco cai | `src/components/menu-da-linha.test.tsx:59` - `not.toHaveBeenCalled()`, `:63` - `toHaveBeenCalledWith("l-1")`; `e2e/lancamentos-densos.spec.ts:349` - `toContainText("3 · R$ 60,00")`, `:366` - a linha ainda na tela depois do 1º toque, `:369` - `toHaveCount(0)`, `:370` - `toContainText("2 · R$ 40,00")` | ✅ PASS |
| AC 5: `Escape` ou clique fora fecham; no `Escape`, o foco volta ao "⋯" | `aria-expanded="false"`, nada do painel, foco no "⋯" | `src/components/menu-da-linha.test.tsx:73-75` (Escape com a confirmação armada); `:84-85` (clique fora com foco dentro); `:96`, `:100-101` (aberto sem foco, `pointerdown` fora fecha); `e2e/lancamentos-densos.spec.ts:359` - `excluir).toBeFocused()`, `:361` - `toHaveAttribute("aria-expanded", "false")`, `:362` - `gatilho).toBeFocused()` | ✅ PASS (M6 morre no e2e `:362`, e M17 no unit `:100`) |
| AC 6: nenhum "Excluir" fora do menu, em nenhuma largura | zero "Excluir" com o menu fechado | `e2e/lancamentos-densos.spec.ts:301` - `page.getByRole("button", { name: /^Excluir/ })).toHaveCount(0)`; `src/components/tabela-lancamentos.test.tsx:714`; `src/components/menu-da-linha.test.tsx:42` | ✅ PASS. O "Excluir" só é renderizado com o menu aberto (`menu-da-linha.tsx:89-96`), em qualquer largura |
| AC 7: abaixo de 768 px **ou** com ponteiro grosso, "⋯" e "Excluir" com ≥ 44 × 44 | as duas caixas ≥ 44 nos dois casos, com o lado de baixo do limiar colado em 768 px | Abaixo de 768 px: `e2e/acessibilidade.spec.ts:138-139` - `alvo.largura`/`alvo.altura` `toBeGreaterThanOrEqual(ALVO_MINIMO)` em **400 px**. Ponteiro grosso: `e2e/lancamentos-densos.spec.ts:386`, `:401-402` em 1.920 px | ❌ GAP parcial. O ponteiro grosso está provado (M12a e M12b morrem). O limiar de 768 px não tem caso colado: N11 e N11b (densos a partir de 640 px) passam na suíte inteira (Lacuna 1) |

### DENS-03: filtros numa coluna à direita

| Critério | Resultado da spec | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| AC 1: a partir de 1.536 px, coluna à direita, com linha fina, busca, categorias com total, situação, meio e pessoa | coluna à direita da lista; `border-left` 1px sólido; os cinco controles no `search` da coluna | `e2e/lancamentos-densos.spec.ts:422` - `coluna.x >= entradas.x + entradas.width`, `:430` - `toEqual({ largura: "1px", tipo: "solid" })`, `:433-437` - busca, `list` "Categoria", "Meio de pagamento", "Pessoa" e "Situação" `toBeVisible()`; `:533` em 1.536 px | ✅ PASS |
| AC 2: rolando a partir de 1.536 px, a coluna à vista | a busca da coluna na tela depois de rolar até o fim | `:499` - `toBeInViewport()` em 1.536 × 480 e 1.920 × 480; do outro lado, `:515` - `not.toBeInViewport()` em 1.535 × 480 | ✅ PASS, com o limiar dos dois lados (M13 morre) |
| AC 3: contagem e total no alto da coluna | o `status` acima da busca | `:440` - `contagem.y + contagem.height).toBeLessThanOrEqual(busca.y)` | ✅ PASS |
| AC 4: os chips de hoje, quebrando na largura da coluna | o chip dentro das bordas da coluna; escolher marca `aria-pressed` | `:451-452` - o chip dentro de `coluna.x` e `coluna.x + coluna.width`; `:456-459` - `toHaveAttribute("aria-pressed", "true")`; cor e "+N" em `e2e/categorias.spec.ts` e `e2e/lista-enxuta.spec.ts`, abaixo de 1.536 px | ✅ PASS. A quebra e o "+N" dentro dos 288 px não são exercitados (Observação 2) |
| AC 5: abaixo de 1.536 px, filtros no topo | o cartão termina acima da lista em 1.535 px | `:528` - `noTopo.y + noTopo.height).toBeLessThanOrEqual(entradas.y)`; o outro lado em `:533` | ✅ PASS |
| AC 6: rolando a partir de 1.536 px, sem barra compacta | zero `search` "Busca e filtros ativos" a partir de 1.536 px; a barra de hoje abaixo | `:500` - `toHaveCount(0)` em 1.536 e 1.920 × 480; `:511` - `toHaveCount(0)` antes de rolar e `:516` - `toBeVisible()` depois, em 1.535 × 480; `e2e/lista-enxuta.spec.ts` (LST-03) em 1.280 px | ✅ PASS (N10 morre em `:516`) |
| AC 7: mesmos parâmetros e resultados | `categoriaId=` na URL e a entrada fora da lista | `:455` - `toHaveURL(/categoriaId=/)`, `:460` - `linha(page, "Entrada A")).toHaveCount(0)`; `busca-e-filtros`, `lista-enxuta` e `categorias` verdes, sem mudança | ✅ PASS |
| AC 8: a partir de 1.536 px, lista ≤ 1.100 px, centrada entre o menu e a coluna | largura ≤ 1.100; folgas iguais, com 1 px de tolerância | `:471` - `lista.width).toBeLessThanOrEqual(1100)`, `:474` - `Math.abs(folgaEsquerda - folgaDireita)).toBeLessThanOrEqual(1)` | ✅ PASS (N6 morre em `:474`: 292 px de diferença) |

### DENS-04: títulos dos blocos presos ao rolar

| Critério | Resultado da spec | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| AC 1: a partir de 1.536 px, o título do bloco, com o resumo, preso no alto enquanto as linhas passam | título em y ≈ 0 com "Fixo B" na tela em 1.536 px; solto em 1.535 px | `e2e/lancamentos-densos.spec.ts:561` - `Math.abs((await caixa(titulo)).y)).toBeLessThanOrEqual(1)`, `:562` - `toBeInViewport()`, `:567` - `toBeLessThan(-1)` em 1.535 px | ✅ PASS, com o limiar dos dois lados (N7 morre em `:567`). O resumo mora na mesma `div` presa (`src/components/bloco-recolhivel.tsx:80-98`) e não é medido (Observação 3) |
| AC 2: recolher e expandir, com a escolha guardada | `aria-expanded` alterna, as linhas somem e voltam, e o cookie é gravado | `:578-579`, `:582-583`; `src/components/tabela-lancamentos.test.tsx:1069-1070`, `:1076-1078`, `:1087-1093` (LST-02, sem mudança) | ✅ PASS |

**Status**: ❌ uma lacuna. DENS-02 AC 7 tem o limiar de 768 px sem caso colado. Os outros 22
critérios têm assertion sobre o resultado da spec. Nenhuma lacuna de precisão na spec.

---

## Edge Cases

- [x] **Bloco recolhido:** o título continua no lugar. `e2e/lancamentos-densos.spec.ts:577-583`.
- [x] **Vencido e pago ao mesmo tempo não existe.** `src/components/tabela-lancamentos.test.tsx:841-842`.
- [x] **Descrição longa: quebra linha, e só aquela linha cresce.**
  - `e2e/lancamentos-densos.spec.ts:212` e `:217`, em 1.280, 1.536 e 1.920 px.
  - Na HEAD, a longa mede 76 px e as do mesmo bloco medem 44,5 e 45 px.
  - N9 (a descrição sem quebrar, `whitespace-nowrap`) morre em `:217`, com a longa em 44,5 px.
  - M11 morre em `:212`.
- [x] **Confirmação aberta e clique fora: o menu fecha e a confirmação se desfaz.** O `BotaoExcluir`
  é desmontado com o painel. O `Escape` com a confirmação armada é provado em
  `src/components/menu-da-linha.test.tsx:69-74`; o clique fora, em `:84-85` e `:100-101`.
- [x] **Entre 768 e 1.536 px:** linhas densas, filtros no topo, barra compacta e títulos soltos.
  - Linhas densas: `:212` em 1.280 px.
  - Filtros no topo: `:528` em 1.535 px.
  - Barra compacta: `:516` em 1.535 px.
  - Títulos soltos: `:567` em 1.535 px.
  - "Linhas densas" entre 768 e 1.280 px não tem número na spec, e só a ponta de 1.280 px é medida.
- [x] **Valor do fixo em edição ocupa mais de uma linha.** O ramo aberto de `ValorConfirmavel` não
  mudou (`src/components/valor-confirmavel.tsx:88`), e `valor-confirmavel.test.tsx` está verde.
- [x] **Erro ao trocar a categoria cresce a linha.** O seletor não mudou, e
  `e2e/trocar-categoria.spec.ts` está verde.

---

## Gate Check

Na HEAD `12ef0ca`, na worktree descartável limpa, com `DATABASE_URL_TEST` no banco de teste da
fatia. Comandos: `pnpm verify` e, depois, `pnpm exec playwright test`.

| Comando | Resultado |
| --- | --- |
| `pnpm typecheck` | exit 0 |
| `pnpm lint` | 317 arquivos, nada a corrigir |
| `pnpm test:unit` | 109 arquivos, **1.704 de 1.704**; `src/domain` com 100% de branches (355/355) |
| `pnpm test:integration` | 23 arquivos, **364 de 364** |
| `pnpm build` | compilou |
| `pnpm exec playwright test` | **129 de 129** em 5,8 min, sem retry, sem `flaky` e sem `skip` |

**Contagem**:

| Momento | Unit | e2e |
| --- | --- | --- |
| Antes da fatia (`b42f9b6`) | 1.694 | 111 |
| Rodada 1 (`514ab25`) | 1.703 | 125 |
| HEAD | 1.704 | 129 |

As diferenças da HEAD:
- unit, +1: o clique fora sem foco, em `menu-da-linha.test.tsx`;
- e2e, +4 em `lancamentos-densos.spec.ts`: o lugar do "⋯", o toque em 1.920 px, a coluna presa também
  em 1.536 px e a barra compacta em 1.535 px.

**Integridade dos testes**: nenhum teste apagado, pulado, com `only` ou com `fixme`. Na faixa
`514ab25..12ef0ca`:
- `tabela-lancamentos.test.tsx`, `compra-parcelada.spec.ts` e `lista-enxuta.spec.ts` só mudam título
  e comentário;
- as assertions mudam só em `lancamentos-densos.spec.ts`, pela F3.

**A F3 não afrouxa nada:**

| Teste | Antes (`514ab25`) | Depois (`12ef0ca`) | Juízo |
| --- | --- | --- | --- |
| Alturas em 1.280, 1.536 e 1.920 px | `alturas).toHaveLength(6)` e cada uma ≤ 48 | `curtas).toHaveLength(6)` e cada uma ≤ 48 (`:210-212`, `:237-239`); `longas).toHaveLength(1)` e a longa > 48 (`:215-217`, `:241-243`) | Mais forte. As seis de antes são as mesmas, com o mesmo teto. A longa é separada por igualdade exata com o texto: se a célula dela mudar, ela cai nas curtas e quebra a contagem de 6 |
| Exclusão pelo menu | bloco "2 · R$ 50,00" → "1 · R$ 30,00" | "3 · R$ 60,00" → "2 · R$ 40,00" (`:349`, `:370`) | Mesma força. Nos dois casos sai uma linha e R$ 20,00, os do Item A. Excluir o Item B daria "2 · R$ 30,00", e o Item C, "2 · R$ 50,00": os dois falham |

**Quem mata o M11**: é a assertion das linhas curtas (`:212`), com o Item B em 81 px. O que a torna
capaz de matar é a linha longa semeada no mesmo bloco, que aperta a coluna da Situação.
- A assertion da própria longa (`:217`) passa com o M11: a longa mede 76 px em 1.280 e 1.536 px, e
  53,5 px em 1.920 px.
- Ela mata outro mutante, o N9: a descrição que não quebra.
- As duas assertions juntas provam o edge case inteiro: só aquela linha cresce, e ela cresce.

**O teste com `hasTouch` discrimina.** A sonda em 1.920 px com `hasTouch` leu:

| Media query | Valor |
| --- | --- |
| `(pointer: coarse)` | `true` |
| `(pointer: fine)` | `false` |
| `(any-pointer: fine)` | `false` |
| `(hover: hover)` | `false` |

No projeto padrão, `(pointer: fine)` é `true`. Os alvos na HEAD:
- com toque, 44 × 44 no "⋯" e no selo, e 63 × 44 no "Excluir";
- com ponteiro fino, 32 px.

O `md:pointer-fine:` desliga no toque, e M12a e M12b (32 px) morrem em `:401-402`.

---

## Discrimination Sensor

**Profundidade**: ampliada (P1 de interface), com 18 mutantes de comportamento, um por vez:
- os 5 vivos da rodada 1 (M11, M12a, M12b, M13 e M17);
- o M6, para conferir a F6;
- 12 novos (N1 a N11b).

**Como rodaram**:
- **Unit:** `pnpm exec vitest run --project domain --project componentes`.
- **e2e:** `pnpm exec playwright test --retries=1 <specs>`.
- `lancamentos-densos.spec.ts` é `serial`: a coluna "morto por" cita o primeiro teste que falha e a
  assertion.
- **Sobreviventes:** cada um rodou também no unit inteiro. N11 e N11b rodaram ainda no e2e inteiro
  (129 de 129).

| # | `file:line` | Mutação | Morto por |
| --- | --- | --- | --- |
| M11 | `src/components/tabela-lancamentos.tsx:351` | grupo da situação sem `xl:pointer-fine:flex-nowrap` | ✅ e2e `lancamentos-densos.spec.ts:200` (1.280 px), assertion de `:212`: Item B com 81 px |
| M12a | `src/components/menu-da-linha.tsx:84`, `botao-excluir.tsx:32` | "⋯" e "Excluir" com `md:min-h-8`/`md:min-w-8`, densos também no toque | ✅ e2e `:382`, assertion de `:401`: "⋯" com 32 px |
| M12b | `src/components/botao-pago.tsx:32` | selo com `md:min-h-8`, denso também no toque | ✅ e2e `:382`, assertion de `:402`: selo com 32 px |
| M13 | `src/app/(app)/[competencia]/lancamentos/page.tsx:219` | `2xl:sticky` → `min-[1600px]:sticky` | ✅ e2e `:491` em 1.536 px, `:499`: `viewport ratio 0` |
| M17 | `src/components/menu-da-linha.tsx:68` | sem o ouvinte de `pointerdown` no `document` | ✅ unit `menu-da-linha.test.tsx:100`: `expected 'true' to be 'false'` |
| M6 | `src/components/menu-da-linha.tsx:53` | o `Escape` fecha sem devolver o foco | ✅ e2e `:343`, assertion de `:362` (`Received: inactive`); na rodada 1 só o unit matava |
| N1 | `src/components/tabela-lancamentos.tsx:314` | `restoDaParcela(parcela.restantes + 1)`: o resto errado por um, na composição | ✅ unit `tabela-lancamentos.test.tsx:342`, `:376`, `:420`, `:428`, `:435`, `:532` (6 testes). A função pura passa: só a composição mostra o erro (L-014) |
| N2 | `src/components/tabela-lancamentos.tsx:363` | `origem === "AVULSO"` → `origem !== "PARCELA"`: "⋯" também no fixo | ✅ unit `tabela-lancamentos.test.tsx:765`; e2e `:299` (Fixo A com 1) |
| N3 | `src/components/tabela-lancamentos.tsx:361-369` | o "⋯" vai para depois do valor, na célula do Valor | ✅ unit `tabela-lancamentos.test.tsx:882`; e2e `:307`, assertion de `:329` (borda em 1.450 contra 1.150) |
| N4 | `src/components/tabela-lancamentos.tsx:358-369` | o "⋯" entre o selo e "Vencido" | ✅ e2e `:307`, assertion de `:340` (1.234 contra ≥ 1.346). O unit passa: o contêiner é o mesmo |
| N5 | `src/components/menu-da-linha.tsx:67` | sem o ouvinte de `focusout`: o foco sair do menu não o fecha | ⚠️ **sobreviveu**: unit 1.704; e2e `lancamentos-densos`, `lancamento-avulso` e `acessibilidade`, 39 de 39. Nenhum AC pede isso; só o `design.md` (Observação 6) |
| N6 | `page.tsx:237` | a lista sem `2xl:mx-auto` | ✅ e2e `:463`, assertion de `:474`: 292 px de diferença |
| N7 | `src/components/bloco-recolhivel.tsx:80` | `2xl:sticky 2xl:top-0` → `xl:sticky xl:top-0`: título preso já em 1.280 px | ✅ e2e `:553`, assertion de `:567` em 1.535 px: y = 0 |
| N8 | `src/components/valor-confirmavel.tsx:67` | `md:flex-row-reverse` → `md:flex-row`: a previsão à direita do valor | ✅ e2e `:247`, assertion de `:255` |
| N9 | `src/components/tabela-lancamentos.tsx:302` | célula da descrição com `whitespace-nowrap`: a longa não quebra | ✅ e2e `:200`, assertion de `:217`: a longa com 44,5 px |
| N10 | `src/components/barra-de-filtros-compacta.tsx:86` | barra compacta com `xl:hidden`: some já em 1.280 px | ✅ e2e `:506`, assertion de `:516` em 1.535 px |
| N11 | `src/components/menu-da-linha.tsx:84`, `botao-excluir.tsx:32` | `md:pointer-fine:` → `sm:pointer-fine:`: "⋯" e "Excluir" densos já a partir de 640 px | ❌ **sobreviveu**: unit 1.704 de 1.704; e2e inteiro, 129 de 129 → Lacuna 1 |
| N11b | `src/components/botao-pago.tsx:32` | a mesma troca no selo | ❌ **sobreviveu**: unit 1.704 de 1.704; e2e inteiro, 129 de 129 → Lacuna 1 |

**Resultado do sensor**: 18 aplicados, 15 mortos e 3 vivos.
- N11 e N11b quebram um critério (DENS-02 AC 7; TOQUE-01 AC 1): FAIL ❌.
- N5 quebra só uma promessa do `design.md`.

### Sondas

O arquivo `e2e/sonda-r2.spec.ts`, só na worktree descartável, copia a semeadura de
`lancamentos-densos.spec.ts`.

| Sonda | O que mede | HEAD | Com o mutante |
| --- | --- | --- | --- |
| Alturas | a altura de cada linha em 1.280, 1.536 e 1.920 px | curtas com 40 a 45 px e a longa com 76 px, nas três | M11: Item B com 81 px nas três. N9: a longa com 44,5 px |
| Toque | as media queries e os alvos com `hasTouch` em 1.920 px | `pointer: coarse` verdadeiro e `pointer: fine` falso; selo 71,5 × 44, "⋯" 44 × 44, "Excluir" 63 × 44 | — |
| Lugar | as caixas do "⋯", da Situação e do Valor em 1.920 px | o "⋯" dentro da Situação nos três avulsos | — |
| **P6** | com ponteiro fino em 767 px, o selo, o "⋯" e o "Excluir" do menu aberto ≥ 44 × 44; em 768 px, só o registro | ✅ passa: 44 nos três em 767 px; 32 em 768 px | ✅ N11 morre (o "⋯" com 32 px); ✅ N11b morre (o selo com 32 px) |

---

## Interactive UAT

Não feita: o verificador é um sub-agente sem o dono na conversa.

---

## Code Quality

| Princípio | Status |
| --- | --- |
| Código mínimo | ✅ As correções só acrescentam testes; nenhum arquivo de produção mudou desde a rodada 1 |
| Mudanças cirúrgicas | ✅ A F7 só mexe em títulos, comentários e documentos, e nenhuma assertion muda |
| Sem escopo extra | ✅ |
| Segue os padrões | ✅ `abrir()`, `linha()` e `caixa()` reaproveitados; títulos de teste citam o AC |
| Resultados da spec nas assertions | ⚠️ DENS-02 AC 7 sem o limiar de 768 px colado |
| Cobertura por camada | ✅ Domínio intocado, com 100% de branches |
| Todo teste mapeia um AC | ✅ Os quatro e2e novos e o unit novo citam o AC e a lição no título ou no comentário |
| Regras do projeto (`AGENTS.md`) | ✅ Sem dado real: "Item C com uma descrição longa de propósito…", R$ 10,00, `example.com`. Commits limpos, Conventional Commits, uma correção por commit. Sem mudança de banco |

---

## Fix Plans

### Fix 1 (rodada 2): o limiar de 768 px dos alvos de 44 px (DENS-02 AC 7; TOQUE-01 AC 1) — Minor

- **Causa**: a densidade nova (`md:pointer-fine:min-h-8`) tem um limiar em 768 px.
  - O AC 7 promete 44 × 44 "abaixo de 768 px", mas o lado de baixo só é medido em 400 px.
  - O `tasks.md` (Global Constraints) aplicou a L-029 a 1.280 e a 1.536 px e não a 768 px.
- **Tarefa**: acrescentar a `e2e/lancamentos-densos.spec.ts` (ou a `e2e/acessibilidade.spec.ts`) um
  teste em 767 × 900, com o ponteiro fino do projeto (sonda P6). Ele deve:
  - afirmar `matchMedia("(pointer: fine)").matches`;
  - abrir o "⋯" de um avulso;
  - medir o selo, o "⋯" e o "Excluir" com ≥ 44 × 44.
- **Pronto quando**:
  - N11 (`sm:pointer-fine:` no "⋯" e no "Excluir") e N11b (o mesmo no selo) morrem;
  - a Global Constraint de limiares do `tasks.md` lista também 768 px.

---

## Observações para o dono

Fora do veredito; nenhuma muda o que a tela faz hoje. As de número 1 a 5 vêm da rodada 1 e continuam
observações: nada nas correções as tocou, e cada uma só quebraria com uma mudança que separe o que
hoje divide o mesmo contêiner ou a mesma regra.

1. **DENS-01 AC 5 só mede "confirmado".** A variante "previsto" (Fixo B) usa a mesma regra de CSS, e a
   altura da linha passa, mas o lugar dela não tem assertion (L-010).
2. **Chips na coluna com uma categoria só.** A quebra e o "+N categorias" dentro dos 288 px não são
   exercitados a partir de 1.536 px.
3. **O resumo do título preso não é medido (DENS-04 AC 1).**
   - Ele está na mesma `div` presa do título (`src/components/bloco-recolhivel.tsx:80-98`).
   - Tirá-lo de lá deixaria a cláusula "com o resumo" sem prova.
   - Uma assertion de `toBeInViewport()` no resumo, em `:561`, fecharia isso.
4. **"Menor e apagado" (DENS-01 AC 2) é provado pelo nome da classe**, e não pelo estilo computado
   (candidata L-037).
5. **"O dobro de linhas por tela" (Success Criteria) não é medido.**
   - Na HEAD a linha mede de 40 a 45 px, contra uns 65 px antes.
   - Os ~330 px de filtros saíram do topo a partir de 1.536 px.
6. **Novo: o menu não tem teste de fechar quando o foco sai dele (N5).**
   - O `design.md` e o comentário do componente prometem isso (`menu-da-linha.tsx:56-60`, `:67`).
   - Sem o ouvinte, quem sai do menu com Tab o deixa aberto sobre a linha de baixo. A confirmação
     armada continua se desfazendo (`botao-excluir.tsx:78`).
   - O DENS-02 AC 5 só pede o `Escape` e o clique fora. Se o dono quiser essa garantia, ela pede um
     critério e um teste com `userEvent.tab()`.
7. **Novo: DENS-03 AC 8 mede a região "Entradas", com 1.052 px.**
   - São os 1.100 px do contêiner menos os 24 px de respiro de cada lado.
   - Um `max-w` de até ~1.148 px ainda passaria. O teste lê "lista" como o conteúdo visível, o que é
     uma leitura razoável do AC.
8. **`lancamentos-densos.spec.ts` continua `serial`.** Um defeito mostra só o primeiro critério
   quebrado. Isso atrapalha o diagnóstico, não a detecção.

---

## Lições registradas

Pelo `lessons.py add`, com a fonte de cada sinal:

- **L-048** (candidata nova), de N11 e N11b (`surviving_mutant`): a lista de limiares a provar sai de
  todo AC que diz "abaixo de" ou "a partir de", inclusive do breakpoint antigo que a fatia reaproveita.
- **L-029** (confirmada) não foi penalizada.
  - A orientação funcionou em todo limiar a que foi aplicada: 1.280 e 1.536 px, agora com os dois
    lados.
  - A falha foi na lista de limiares, que deixou 768 px de fora. Por isso a lição nova, e não a
    penalidade.
- **L-044, L-045 e L-046** (candidatas da rodada 1) foram aplicadas pelas F2, F3 e F5, e os
  mutantes que as motivaram morrem.
  - Elas continuam candidatas: a recorrência conta features distintas, e esta é a mesma.
- **L-047** (candidata) foi aplicada pela F1: o AC voltou a dizer o lugar que o código usa, com a
  confirmação do dono.

---

## Requirement Traceability Update

| Requisito | Rodada 1 | Rodada 2 |
| --- | --- | --- |
| DENS-01 | ❌ Needs Fix (Fix 3) | ✅ Verified |
| DENS-02 | ❌ Needs Fix (Fixes 1, 2 e 5) | ❌ Needs Fix (Fix 1 da rodada 2: limiar de 768 px do AC 7) |
| DENS-03 | ❌ Needs Fix (Fix 4) | ✅ Verified |
| DENS-04 | ✅ Verified | ✅ Verified |

A `spec.md` não foi alterada pelo verificador. A atualização fica para o commit da correção.

---

## Summary

**Overall**: ❌ Not Ready, por uma lacuna Minor de teste. O código faz o que a spec pede.

**Spec-anchored check**:
- 22 de 23 critérios têm assertion sobre o resultado da spec.
- DENS-02 AC 7 tem o lado de baixo do limiar de 768 px provado só em 400 px.
- Sem lacuna de precisão na spec.
- Os 7 edge cases têm prova.

**Sensor**: 18 aplicados, 15 mortos, 3 vivos.
- N11 e N11b viram a Lacuna 1.
- N5 fica fora da spec.

**Gate**: verde.
- unit 1.704, integração 364, e2e 129 de 129;
- `typecheck`, `lint` e `build`.

**O que funciona**:
- as cinco lacunas da rodada 1 estão fechadas, cada uma pelo mutante que a revelou;
- o "⋯" ao lado do selo é o mesmo na spec, no design, no AD-020, no código e no teste;
- a descrição longa: só aquela linha cresce;
- os 44 px com ponteiro grosso em 1.920 px, com `pointer: coarse` conferido;
- a coluna presa, a barra compacta e os títulos presos, com o limiar de 1.536 px dos dois lados;
- nenhum teste antigo afrouxado.

**Próximo passo**: um teste em 767 px com ponteiro fino (sonda P6). Depois, a rodada 3 do
verificador, a última antes de escalar ao dono.
