# Lançamentos em lista densa — Validação

## Validation: lancamentos-densos (rodada 3) — **FAIL**

**Result**: FAIL ❌ — rodada 3 (2026-10-31, `92139e2`). É a última rodada que o processo permite: as
lacunas abaixo vão ao dono.

A lacuna da rodada 2 está fechada:
- a F8 (`92139e2`) mede em 767 px, com o ponteiro fino do projeto, o selo, o "⋯" e o "Excluir" do menu
  aberto com 44 × 44 (`e2e/lancamentos-densos.spec.ts:434-435`);
- N11 e N11b, que passavam na suíte inteira, morrem ali: o "⋯" com 32 px de largura em `:434`, e o
  selo com 32 px de altura em `:435`.

O gate está verde:
- unit 1.704, integração 364, e2e 130 de 130, sem retry, sem `flaky` e sem `skip`;
- `typecheck`, `lint` e `build` passam.

O veredito é FAIL por **três lacunas**, que as rodadas 1 e 2 não trataram como lacuna:

1. **Major: com um fixo confirmado, a tabela Fixos passa da coluna de conteúdo em 1.024 px (LST-05
   AC 3), por causa da previsão na mesma linha do valor (DENS-01 AC 5).**
   - Na HEAD, em 1.024 px, a tabela termina em 1.091,8 px, e a coluna em 1.000 px. A página rola
     68 px de lado.
   - Antes da fatia, com o mesmo conteúdo, eram 27 px e 3 px.
   - Com a previsão abaixo do valor até 1.279 px (o mutante F2), a tabela cabe: termina em 1.000 px.
   - Nenhum teste vê isso:
     - o de LST-05 AC 3 (`e2e/lista-enxuta.spec.ts:409`) só tem fixos "previstos";
     - o desta fatia tem o fixo confirmado, mas só mede de 1.280 px para cima;
     - F2 passa na suíte inteira.
   - O LST-05 AC 3 continua valendo abaixo de 1.536 px. Esta fatia reescreveu o texto dele, e o
     `design.md` diz que, em 1.024 px, ele "não muda".
   - Os dois ACs se chocam em 1.024 px com um fixo confirmado. **Pede uma decisão do dono.**
2. **Minor: DENS-04 AC 1, "com o resumo" (F3).** Nenhuma assertion olha o resumo do título preso.
   Tirar o resumo da `div` presa passa na suíte inteira: ao rolar, o título fica no alto, e o resumo
   some por baixo dele.
3. **Minor: edge case "confirmação aberta e clique fora" (F6).** Nenhum teste arma a confirmação e
   depois clica fora. Esconder o painel em vez de desmontá-lo passa na suíte inteira. No Safari, que
   não dá foco ao botão clicado, o menu reabre já em "Confirmar?".

Nas Lacunas 2 e 3, o código da HEAD faz o que a spec pede (sondas D e F); falta o teste. Na Lacuna 1,
o código descumpre um AC que esta fatia mantém.

Dos 14 mutantes desta rodada:
- 9 morrem;
- 3 vivos são as lacunas acima (F2, F3 e F6);
- 2 vivos ficam como observação:
  - C1 quebra algo que nenhum critério pede;
  - C2 só quebra com uma regra nova, que o código não tem.

**Data**: 2026-10-31
**Spec**: `.specs/features/lancamentos-densos/spec.md` (DENS-01 a DENS-04, 23 critérios, 7 edge cases;
DENS-02 AC 1 emendado pelo dono em 2026-10-30)
**Faixa do diff**:
- a fatia inteira é `b42f9b6..92139e2`;
- as tasks T1 a T6 são `b42f9b6..514ab25`;
- as correções F1 a F7 da rodada 1 são `514ab25..12ef0ca`;
- o relatório da rodada 2 é `9ca13cb`;
- a correção F8 da rodada 2 é `92139e2`. Ela traz:
  - um e2e novo em `e2e/lancamentos-densos.spec.ts:412-438`;
  - o limiar de 768 px nas Global Constraints do `tasks.md`;
  - a traceability do DENS-02.

Nenhum arquivo de produção mudou desde a rodada 1 (`git diff --stat 514ab25..92139e2 -- src` só
toca dois testes de componente).

**Verificador**: sub-agente independente da rodada 3 (autor ≠ verificador). Leu código e testes sem
mudá-los. No worktree real, escreveu só este arquivo e os de lições.

- **Onde rodaram o gate, as mutações e as sondas:** numa `git worktree` descartável, detached em
  `92139e2`, no scratchpad da sessão, com `pnpm install --frozen-lockfile` próprio.
  - Cada mutante entrou sozinho, por uma troca de texto exata que tinha de casar o número esperado de
    vezes, e saiu com `git checkout -- src`.
  - As sondas viveram em `e2e/sonda-r3.spec.ts` e `src/components/sonda-r3.test.tsx`. Foram copiadas
    para a worktree descartável só durante a sonda e apagadas em seguida.
  - Nenhuma corrida que decide "morto" ou "vivo" incluiu uma sonda.
  - Para comparar com antes da fatia, a sonda G rodou também numa segunda worktree descartável,
    detached em `b42f9b6`.
  - No fim, as duas worktrees foram removidas.
- **Isolamento:** o `git status --porcelain` do worktree real estava vazio antes, no meio e ao fim do
  sensor. Não houve `git stash`, e nada foi commitado.
- **Banco:** o de teste da sessão, só desta verificação.

---

## Rodada 1 (2026-10-30, `514ab25`): FAIL, cinco lacunas, fechadas

O gate estava verde (unit 1.703, e2e 125), e 13 de 17 mutantes morriam.

| # | Lacuna | Correção | Prova na HEAD | Mutante reaplicado na rodada 2 |
| --- | --- | --- | --- | --- |
| 1 | Major: o AC pedia o "⋯" no fim da linha; o código o põe ao lado do selo (DENS-02 AC 1) | F1 `d0c67cb`: o dono confirmou o lugar; AC, premissa e `design.md` reescritos | `e2e/lancamentos-densos.spec.ts:328-332`, `:340` | N3 e N4 morrem |
| 2 | Major: 44 px com ponteiro grosso acima de 768 px sem prova (DENS-02 AC 7) | F2 `7ac8cbf`: `hasTouch` em 1.920 px | `:386`, `:401-402` | M12a e M12b morrem |
| 3 | Major: descrição longa sem caso (edge case; DENS-01 AC 1) | F3 `7153dfd`: Item C de descrição longa | `:212`, `:217`, `:239`, `:243` | M11 morre |
| 4 | Minor: coluna presa e barra compacta só em 1.920 px (DENS-03 ACs 2 e 6) | F4 `0b73ecd`: 1.536 × 480 e 1.535 × 480 | `:532-533`, `:548-549` | M13 morre |
| 5 | Minor: clique fora provado só com o foco dentro (DENS-02 AC 5) | F5 `c4cf6ad`: `pointerdown` sem foco | `src/components/menu-da-linha.test.tsx:96`, `:100-101` | M17 morre |

As observações 5 e 7 da rodada 1 também foram fechadas:
- a F6 (`15ea1ee`) leva o foco ao "Excluir" antes do `Escape` (`:358-362`);
- a F7 (`12ef0ca`) corrige os textos que ficaram para trás.

## Rodada 2 (2026-10-30, `12ef0ca`): FAIL, uma lacuna, fechada

A lacuna era o limiar de 768 px dos alvos de 44 px (DENS-02 AC 7; TOQUE-01 AC 1):
- o lado de baixo só era medido em 400 px;
- N11 e N11b (os alvos densos já a partir de 640 px) passavam na suíte inteira.

A F8 (`92139e2`) fecha a lacuna:
- `e2e/lancamentos-densos.spec.ts:419` confere `matchMedia("(pointer: fine)")` em 767 px;
- `:434-435` mede o selo, o "⋯" e o "Excluir" do menu aberto com ≥ 44 × 44;
- reaplicados nesta rodada, N11 morre em `:434` (o "⋯" com 32 px), e N11b em `:435` (o selo com
  32 px);
- as Global Constraints do `tasks.md` listam agora 768, 1.280 e 1.536 px.

---

## Task Completion

| Task | Commit | Status | Notas |
| --- | --- | --- | --- |
| T1 parcela curta | `de84baa` | ✅ Done | Texto e lugar provados na composição |
| T2 linha baixa | `4349d77` | ❌ Needs Fix | A linha baixa está provada em 1.280, 1.536 e 1.920 px. A previsão na mesma linha do valor faz a tabela Fixos passar da coluna em 1.024 px com um fixo confirmado (Lacuna 1) |
| T3 excluir no menu | `b967cb6` | ⚠️ Partial | Lugar, toque, `Escape`, clique fora e o limiar de 768 px provados. O edge case "confirmação aberta e clique fora" não tem caso (Lacuna 3) |
| T4 coluna de filtros | `7f029ad` | ✅ Done | Limiar de 1.536 px dos dois lados; a coluna à direita (F8 morre em `:455`) |
| T5 títulos presos | `284cbb1` | ⚠️ Partial | O título preso está provado dos dois lados de 1.536 px. O resumo junto dele, não (Lacuna 2) |
| T6 decisão registrada | `514ab25` | ✅ Done | AD-020 diz o mesmo lugar do "⋯" que a spec emendada |
| F1 a F7 | `d0c67cb`…`12ef0ca` | ✅ Done | Cada uma mata o mutante que a motivou |
| F8 | `92139e2` | ✅ Done | N11 e N11b morrem em `:434-435`; `check_commit.py` OK |

---

## Spec-Anchored Acceptance Criteria

Toda medida de layout é de caixa (`boundingBox`, `getBoundingClientRect`) ou de estilo computado:
- no Chrome do projeto, a 1.280 × 720 com ponteiro fino;
- salvo onde o teste muda a janela ou o ponteiro.

As linhas citadas são as da `92139e2`. `:N` sozinho é `e2e/lancamentos-densos.spec.ts`.

### Os limiares, dos dois lados

| Limiar | AC que o diz | Lado de baixo | Lado de cima | Juízo |
| --- | --- | --- | --- | --- |
| 768 px | DENS-02 AC 7: "abaixo de 768 px ou com ponteiro grosso", ≥ 44 × 44 | 767 px, ponteiro fino: `:434-435` (F8). Também 400 px: `e2e/acessibilidade.spec.ts:138-139` | Ponteiro grosso em 1.920 px: `:401-402`. Com ponteiro fino a partir de 768 px, o AC não pede nada | ✅ O lado que o AC promete está colado no limiar. N11 e N11b morrem |
| 1.280 px | DENS-01 AC 1: "a partir de 1.280 px com ponteiro fino", ≤ 48 px | A spec não promete altura abaixo de 1.280 px (premissa "Onde a linha baixa é garantida") | 1.280 px: `:212` | ✅ Colado no lado prometido. F10 (`flex-nowrap` só a partir de 1.281 px) morre em `:212`. F11 (já a partir de 1.024 px) morre em `e2e/lista-enxuta.spec.ts:428` |
| 1.536 px | DENS-03 ACs 1, 2, 5, 6 e 8; DENS-04 AC 1 | 1.535 px: `:561`, `:548-549`, `:600` | 1.536 px: `:566`, `:532-533`, `:594`; o `:212` também roda em 1.536 px | ✅ Dos dois lados. No AC 8, o teto de 1.100 px só aperta a partir de ~1.628 px (sonda E: a lista mede 960 px em 1.536 px). O teste roda em 1.920 px |

### DENS-01: uma linha por lançamento

| Critério | Resultado da spec | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| AC 1: a partir de 1.280 px com ponteiro fino, toda linha ≤ 48 px, inclusive parcela, fixo confirmado e vencido | as seis linhas curtas ≤ 48 px em 1.280, 1.536 e 1.920 px | `:210` - `expect(curtas).toHaveLength(6)`; `:212` - `expect(altura, nome).toBeLessThanOrEqual(48)`, em 1.280 e 1.536 px; `:231-233` (parcela, "confirmado · previa" e "Vencido" na tela) e `:237-239` em 1.920 px | ✅ PASS. Sonda A: em 1.279 px o Item B mede 81 px, então a garantia começa exatamente em 1.280 px |
| AC 2: a parcela logo depois da descrição, na mesma célula, menor e apagada: "2/4 · faltam 2" e "4/4 · última" | primeiro nó = descrição, último = parcela; textos exatos; na altura da descrição a partir de 1.280 px | `src/components/texto-da-parcela.test.ts:10`, `:14`, `:18`; `src/components/tabela-lancamentos.test.tsx:48` - `celula.firstChild?.textContent).toBe(descricao)`, `:55-56` (classes `text-[13px]` e `text-ink-muted`, sem `block`), `:420` - `toBe("2/4 · faltam 2")`, `:428` - `toBe("4/4 · última")`, `:435`; pela página: `:205` - `toContainText("1/3 · faltam 2")`, `e2e/compra-parcelada.spec.ts:176`, `:182`, `e2e/lista-enxuta.spec.ts:476-477` | ✅ PASS. "Menor e apagado" é provado pela classe (observação 7) |
| AC 3: selo "Pago"/"Previsto" que alterna o pagamento, com o mesmo nome | `aria-pressed` `false` → `true` → `false`, nome `/^Previsto\s*, Item B/` | `:272`, `:275`, `:278-281` | ✅ PASS |
| AC 4: "Vencido" ao lado do selo | à direita do selo, na mesma faixa | `:269` - `vencido.x >= caixaDoSelo.x + caixaDoSelo.width`; `:270` | ✅ PASS. F1 (o "Vencido" antes do selo) morre em `:269` |
| AC 5: "previsto" ou "confirmado · previa R$ X" na linha do valor, à esquerda dele | vale onde a lista é tabela, de 768 px para cima; abaixo disso é cartão, fora de escopo | `:255` - `previsao.x + previsao.width <= valor.x + 1`, `:256-257` (sobreposição vertical), só em 1.920 px; a altura do Fixo A e do Fixo B ≤ 48 em `:212` (1.280 e 1.536 px) | ❌ GAP (Lacuna 1). De 768 a 1.279 px não há prova: F2 (`md:` → `xl:` no `ValorConfirmavel`) passa na suíte inteira. A HEAD cumpre o AC em 768, 800, 1.024 e 1.279 px nos dois fixos (sonda B). Mas, em 1.024 px, cumpri-lo com um fixo confirmado é o que quebra o LST-05 AC 3 (abaixo). A variante "previsto" fica protegida pela altura: F7 morre em `:212` (Fixo B com 53,5 px) |
| AC 6: as cinco colunas e o seletor de hoje | cabeçalhos exatos; TRC sem mudança | `:315-321` em 1.920 px; `e2e/lista-enxuta.spec.ts:481` em 1.024, 1.280 e 1.440 px; `e2e/trocar-categoria.spec.ts` verde | ✅ PASS |

### O AC de outra fatia que esta mantém

A seção "O que esta fatia substitui" só tira o LST-05 AC 3 a partir de 1.536 px. A fatia reescreveu o
texto dele (`.specs/features/lista-enxuta/spec.md:185-187`). O `design.md` diz, da linha de
`lista-enxuta.spec.ts:409-431`: "Nada muda: o cartão continua no topo nessas larguras".

| Critério | Resultado da spec | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| LST-05 AC 3: em 1.024, 1.280 e 1.440 px, nenhuma tabela mais larga que a coluna de conteúdo | o fim de cada tabela ≤ o fim do cartão de filtros, também com o fixo confirmado | `e2e/lista-enxuta.spec.ts:428` - `caixa.x + caixa.width <= coluna.x + coluna.width + 0.5`, com uma semeadura sem fixo confirmado | ❌ **Quebrado na HEAD em 1.024 px** (Lacuna 1). Sonda G, com a semeadura desta fatia: a tabela Fixos termina em 1.091,8 px, contra 1.000 px da coluna, e a página rola 68 px. Em 1.280 e 1.440 px, cabe |

### DENS-02: excluir no menu da linha

| Critério | Resultado da spec | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| AC 1: na célula da Situação de cada avulso, logo depois do selo e do "Vencido", o "⋯" "Mais ações para <descrição>" | o "⋯" com esse nome dentro da 4ª célula, à direita do selo e de "Vencido" | `:294-296` - `toBeVisible()` nos três avulsos; `:315-321` (a 4ª coluna é "Situação"); `:328-331` (dentro da célula); `:332` - `menu.x >= selo.x + selo.width`; `:340` - `menuDoVencido.x >= chip.x + chip.width`; nome também em `src/components/menu-da-linha.test.tsx:34` | ✅ PASS, com a consulta presa à linha e à célula (L-018) |
| AC 2: sem "⋯" na parcela e no fixo | zero "⋯" | `:299` - `toHaveCount(0)` em Fixo A, Fixo B e Compra A; `src/components/tabela-lancamentos.test.tsx:745`, `:765`; `e2e/lancamento-avulso.spec.ts:296` | ✅ PASS |
| AC 3: o "⋯" abre o menu com "Excluir" | `aria-expanded="true"` e o botão "Excluir, <descrição>" | `src/components/menu-da-linha.test.tsx:50-51`; `:354`, `:365` | ✅ PASS |
| AC 4: dois toques, e então exclui como hoje | 1º toque não exclui; 2º exclui; a linha some e o bloco cai de "3 · R$ 60,00" para "2 · R$ 40,00" | `src/components/menu-da-linha.test.tsx:59`, `:63`; `:349`, `:366`, `:369`, `:370` | ✅ PASS. F5 (o toque dentro fecha o menu) morre em `menu-da-linha.test.tsx:60` e em `:367` |
| AC 5: `Escape` ou clique fora fecham; no `Escape`, o foco volta ao "⋯" | `aria-expanded="false"`, painel fora, foco no "⋯" | `src/components/menu-da-linha.test.tsx:73-75`, `:84-85`, `:96`, `:100-101`; `:359`, `:361`, `:362` | ✅ PASS. F4 (o `Escape` não fecha) morre em `menu-da-linha.test.tsx:73` e em `:361` |
| AC 6: nenhum "Excluir" fora do menu, em nenhuma largura | zero "Excluir" com o menu fechado | `:301` - `page.getByRole("button", { name: /^Excluir/ })).toHaveCount(0)`; `src/components/menu-da-linha.test.tsx:42`; `src/components/tabela-lancamentos.test.tsx:714` | ✅ PASS. A prova no DOM do jsdom não depende de largura: fechado, o "Excluir" não existe |
| AC 7: abaixo de 768 px ou com ponteiro grosso, "⋯" e "Excluir" ≥ 44 × 44 | ≥ 44 nos dois casos, colado no limiar | 767 px fino: `:419`, `:434-435`; 400 px fino: `e2e/acessibilidade.spec.ts:138-139`; 1.920 px com toque: `:386`, `:401-402` | ✅ PASS. A lacuna da rodada 2 está fechada. O celular com toque (as duas condições juntas) não é medido (observação 3) |

### DENS-03: filtros numa coluna à direita

| Critério | Resultado da spec | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| AC 1: a partir de 1.536 px, coluna à direita, com linha fina, busca, categorias com total, situação, meio e pessoa | coluna à direita; `border-left` 1px sólido; os cinco controles no `search` da coluna | `:455` - `coluna.x >= entradas.x + entradas.width`; `:463` - `toEqual({ largura: "1px", tipo: "solid" })`; `:466-470`; em 1.536 px, `:566` | ✅ PASS. F8 (a coluna à esquerda) morre em `:455` |
| AC 2: rolando a partir de 1.536 px, a coluna à vista | a busca da coluna na tela depois de rolar até o fim | `:532` - `toBeInViewport()` em 1.536 e 1.920 × 480; `:548` - `not.toBeInViewport()` em 1.535 × 480 | ✅ PASS |
| AC 3: contagem e total no alto da coluna | o `status` acima da busca | `:473` - `contagem.y + contagem.height <= busca.y` | ✅ PASS |
| AC 4: os chips de hoje, quebrando na largura da coluna | o chip dentro da coluna; escolher marca `aria-pressed` | `:484-485`; `:489-492` | ✅ PASS. A quebra e o "+N" na coluna não são exercitados com uma categoria só (observação 8) |
| AC 5: abaixo de 1.536 px, filtros no topo | o cartão acima da lista em 1.535 px | `:561`; o outro lado em `:566` | ✅ PASS |
| AC 6: a partir de 1.536 px, sem barra compacta | zero barra a partir de 1.536 px; a barra aparece em 1.535 px | `:533`; `:544`, `:549` | ✅ PASS |
| AC 7: mesmos parâmetros e resultados | `categoriaId=` na URL e a entrada fora da lista | `:488`, `:493`; `e2e/busca-e-filtros.spec.ts`, `e2e/lista-enxuta.spec.ts` e `e2e/categorias.spec.ts` verdes e sem mudança | ✅ PASS |
| AC 8: a partir de 1.536 px, lista ≤ 1.100 px, centrada | largura ≤ 1.100; folgas iguais | `:504` - `lista.width <= 1100`; `:507` - `Math.abs(folgaEsquerda - folgaDireita) <= 1` | ✅ PASS. Mede a região "Entradas" (1.052 px), e não o contêiner (observação 9) |

### DENS-04: títulos dos blocos presos ao rolar

| Critério | Resultado da spec | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| AC 1: a partir de 1.536 px, o título do bloco, **com o resumo**, preso no alto enquanto as linhas passam | título e resumo no alto, com "Fixo B" na tela, em 1.536 px; soltos em 1.535 px | `:594` - `Math.abs((await caixa(titulo)).y)).toBeLessThanOrEqual(1)`; `:595` - `toBeInViewport()` em "Fixo B"; `:600` - `toBeLessThan(-1)` em 1.535 px. Para o resumo, nenhuma assertion | ❌ GAP parcial (Lacuna 2). O título preso está provado dos dois lados do limiar. A cláusula "com o resumo" não tem prova: F3 (o resumo fora da `div` presa) passa na suíte inteira. Na HEAD, o resumo fica em y = 11,5, ao lado do título (sonda D) |
| AC 2: recolher e expandir, com a escolha guardada | `aria-expanded` alterna, as linhas somem e voltam, o cookie é gravado e lido | `:611-612`, `:615-616`; `src/components/tabela-lancamentos.test.tsx:1087`, `:1090`, `:1093`; `e2e/lista-enxuta.spec.ts:335-347` (LST-02, sem mudança) | ✅ PASS |

**Status**: ❌ três lacunas.
- O LST-05 AC 3, que a fatia mantém, está quebrado em 1.024 px com um fixo confirmado, e o DENS-01
  AC 5 não tem prova abaixo de 1.280 px (Lacuna 1).
- A cláusula "com o resumo" do DENS-04 AC 1 não tem prova (Lacuna 2).
- Um edge case não tem caso (Lacuna 3).

Os outros 21 dos 23 critérios têm assertion sobre o resultado da spec. Há ainda uma lacuna de
precisão na spec, num edge case (abaixo).

---

## Edge Cases

- [x] **Bloco recolhido: o título continua no lugar.** `:611-616`; LST-02 em
  `e2e/lista-enxuta.spec.ts:335-347`.
- [x] **Vencido e pago ao mesmo tempo não existe.**
  `src/components/tabela-lancamentos.test.tsx:841-842`.
- [x] **Descrição longa: quebra linha, e só aquela linha cresce.** `:212` e `:217` em 1.280 e 1.536 px;
  `:239` e `:243` em 1.920 px. Na HEAD, a longa mede 76 px, e as curtas, de 40 a 45 px.
- [ ] **Confirmação aberta e clique fora: o menu fecha e a confirmação se desfaz.** Sem caso (Lacuna 3).
  - Os testes citados até a rodada 2 provam cada metade em separado:
    - o clique fora sem a confirmação armada (`src/components/menu-da-linha.test.tsx:78-86`,
      `:92-102`);
    - a confirmação armada desfeita pelo `Escape` (`:66-76`).
  - Nenhum arma a confirmação e depois clica fora.
  - F6 (o painel escondido com `hidden`, em vez de desmontado) passa na suíte inteira.
  - No Chrome, o clique fora tira o foco do "Confirmar?", e o `onBlur` do `BotaoExcluir` desarma.
  - No Safari, o clique não dá foco ao botão. Com F6, o menu fecha armado, reabre em "Confirmar?", e o
    próximo toque exclui.
  - A sonda F (`fireEvent`, sem foco, como a F5 da rodada 1) passa na HEAD e mata F6.
- [ ] **Entre 768 e 1.536 px: linhas densas, filtros no topo, barra compacta e títulos soltos.**
  - Filtros no topo: `:561`. Barra compacta: `:549`. Títulos soltos: `:600`. Todos em 1.535 px.
  - Nessa faixa, em 1.024 px, a tabela Fixos sai da coluna com um fixo confirmado (Lacuna 1).
  - ⚠️ **Lacuna de precisão na spec: "linhas densas" não tem número abaixo de 1.280 px.** A sonda A
    mediu, na HEAD, com ponteiro fino (altura da linha, em px):

    | Janela | Entrada A | Fixo A e Fixo B | Compra A | Item A | Item B (vencido) | A longa |
    | --- | --- | --- | --- | --- | --- | --- |
    | 768 e 800 px | 80 | 74,5 | 75,5 | 80,5 | 115 | 323,5 |
    | 1.023 e 1.024 px | 40 | 74,5 | 74 | 80,5 | 115 | 143,5 |
    | 1.279 px | 40 | 44,5 | 44 | 44,5 | 81 | 76 |
    | 1.280 px | ≤ 45 | ≤ 45 | ≤ 45 | ≤ 45 | ≤ 45 | 76 |

  - O edge case só admite que, entre 768 e 1.280 px, "a parcela de uma descrição longa pode quebrar
    para baixo".
  - Na HEAD, quem cresce abaixo de 1.280 px é o grupo da Situação. Ele quebra de propósito
    (`src/components/tabela-lancamentos.tsx:347-351`), para a tabela caber. F11 prova que, sem a
    quebra, a tabela sai da coluna em 1.024 px.
  - Nada disso quebra um AC: o DENS-01 AC 1 só promete 48 px a partir de 1.280 px.
  - Mas "linhas densas" nessa faixa não tem como ser provado nem desmentido. Isso não pesa no
    veredito.
- [x] **Valor do fixo em edição ocupa mais de uma linha.** O ramo aberto do `ValorConfirmavel` não
  mudou, e `valor-confirmavel.test.tsx` está verde.
- [x] **Erro ao trocar a categoria cresce a linha.** O seletor não mudou, e
  `e2e/trocar-categoria.spec.ts` está verde.

---

## Gate Check

Na HEAD `92139e2`, na worktree descartável limpa, com `DATABASE_URL_TEST` no banco de teste da
sessão. Comandos: `pnpm verify` e, depois, `pnpm exec playwright test`.

| Comando | Resultado |
| --- | --- |
| `pnpm typecheck` | exit 0 |
| `pnpm lint` | 317 arquivos, nada a corrigir |
| `pnpm test:unit` | 109 arquivos, **1.704 de 1.704**; `src/domain` com 100% de branches (355/355) |
| `pnpm test:integration` | 23 arquivos, **364 de 364** |
| `pnpm build` | compilou |
| `pnpm exec playwright test` | **130 de 130** em 4,5 min, sem retry, sem `flaky` e sem `skip` |

**Contagem**:

| Momento | Unit | e2e |
| --- | --- | --- |
| Antes da fatia (`b42f9b6`) | 1.694 | 111 |
| Rodada 1 (`514ab25`) | 1.703 | 125 |
| Rodada 2 (`12ef0ca`) | 1.704 | 129 |
| HEAD (`92139e2`) | 1.704 | 130 |

A diferença da HEAD é o e2e da F8, em 767 px.

**Integridade dos testes**: na faixa `12ef0ca..92139e2`, só um teste entra. Nenhum sai, é pulado,
ganha `only` ou `fixme`, ou perde assertion. A F8:
- reaproveita `abrir()`, `linha()` e `caixa()`;
- confere o ponteiro fino antes de medir (`:419`), como o teste de toque confere o grosso (`:386`).

---

## Discrimination Sensor

**Profundidade**: ampliada (P1 de interface), com 14 mutantes de comportamento, um por vez:
- N11 e N11b, da rodada 2;
- dois primos dos sobreviventes de antes, C1 e C2, pedidos pelo orquestrador;
- dez novos, F1 a F8, F10 e F11, que as rodadas 1 e 2 não tentaram.

**Como rodaram**:
- **Unit:** `pnpm exec vitest run --project domain --project componentes`.
- **e2e:** `pnpm exec playwright test --retries=0 <specs>`, primeiro nos arquivos da fatia.
- `lancamentos-densos.spec.ts` é `serial`: "morto por" cita o primeiro teste que falha e a assertion.
- **Vivos:** C1, C2, F2, F3 e F6 rodaram de novo, cada um sozinho:
  - no unit inteiro: 1.704 de 1.704 nos cinco;
  - no e2e inteiro, sem sonda: 130 de 130 nos cinco.
- Uma falha fora do alvo, em `e2e/lista-enxuta.spec.ts:416` com C2, passou ao rodar o arquivo
  sozinho (observação 10).

| # | `file:line` | Mutação | Morto por |
| --- | --- | --- | --- |
| N11 | `src/components/menu-da-linha.tsx:84`, `botao-excluir.tsx:32` | `md:pointer-fine:` → `sm:pointer-fine:`: "⋯" e "Excluir" densos já a partir de 640 px | ✅ e2e `:415`, assertion de `:434`: o "⋯" com 32 px |
| N11b | `src/components/botao-pago.tsx:32` | a mesma troca no selo | ✅ e2e `:415`, assertion de `:435`: o selo com 32 px |
| C1 | `src/components/menu-da-linha.tsx:84` | `md:pointer-fine:` → `lg:pointer-fine:`: o "⋯" denso só a partir de 1.024 px | ⚠️ **vivo** (unit 1.704; e2e 130 de 130). Nenhum critério pede 32 px entre 768 e 1.023 px: o DENS-02 AC 7 só pede o mínimo de 44 px. Observação 2 |
| C2 | `src/components/botao-pago.tsx:32` | `+ max-md:pointer-coarse:min-h-8`: o selo perde os 44 px só no celular com toque | ⚠️ **vivo** (unit 1.704; e2e 130 de 130). A sonda C (400 px com `hasTouch`) mata: o selo com 32 px. Observação 3 |
| F1 | `src/components/tabela-lancamentos.tsx:352-360` | o "Vencido" antes do selo | ✅ e2e `:260`, assertion de `:269` (1.155 contra ≥ 1.306) |
| F2 | `src/components/valor-confirmavel.tsx:67` | `md:flex-row-reverse md:items-baseline md:justify-start md:gap-2` → `xl:`: a previsão na linha do valor só a partir de 1.280 px | ❌ **vivo** (unit 1.704; e2e 130 de 130) → Lacuna 1. A sonda B mata em 768 e 800 px: a previsão termina em 983, à direita do valor, que começa em 780. Com F2, a sonda G mostra a tabela Fixos dentro da coluna em 1.024 px |
| F3 | `src/components/bloco-recolhivel.tsx:98` | o `span` do resumo sai da `div` presa e vira irmão dela | ❌ **vivo** (unit 1.704; e2e 130 de 130) → Lacuna 2. A sonda D mata: o resumo em y = −4, por baixo do título preso, com 81% na tela |
| F4 | `src/components/menu-da-linha.tsx:51` | `evento.key === "Escape"` → `"Esc"`: o `Escape` não fecha | ✅ unit `menu-da-linha.test.tsx:73`; e2e `:343`, assertion de `:361` |
| F5 | `src/components/menu-da-linha.tsx:62` | `!conjunto?.contains(...)` → `conjunto?.contains(...)`: o toque dentro fecha, o de fora não | ✅ unit `menu-da-linha.test.tsx:60`, `:100`, `:110`; e2e `:343`, em `:367` |
| F6 | `src/components/menu-da-linha.tsx:89-96` | o painel sempre montado, com `hidden={!aberto}`, em vez de desmontado | ❌ **vivo** (unit 1.704; e2e 130 de 130) → Lacuna 3. A sonda F, sem foco, mata: o menu reabre em "Confirmar?" |
| F7 | `src/components/valor-confirmavel.tsx:77-82` | o "previsto" sai do contêiner do valor | ✅ e2e `:200`, assertion de `:212`: Fixo B com 53,5 px em 1.280 px |
| F8 | `src/app/(app)/[competencia]/lancamentos/page.tsx:199-237` | a grade invertida: a coluna de filtros à esquerda da lista | ✅ e2e `:448`, assertion de `:455` (241 contra ≥ 1.750) |
| F10 | `src/components/tabela-lancamentos.tsx:351` | `xl:pointer-fine:flex-nowrap` → `min-[1281px]:`: um pixel acima do limiar | ✅ e2e `:200`, assertion de `:212`: Item B com 81 px em 1.280 px |
| F11 | `src/components/tabela-lancamentos.tsx:351` | `xl:pointer-fine:flex-nowrap` → `lg:`: o grupo da Situação sem quebrar já em 1.024 px | ✅ e2e `e2e/lista-enxuta.spec.ts:409`, assertion de `:428`: a tabela Fixos termina em 1.014 px, fora da coluna (≤ 1.000,5) |

**Resultado do sensor**: 14 aplicados, 9 mortos e 5 vivos.
- F2, F3 e F6 quebram um critério ou edge case da spec: FAIL ❌.
- C1 não quebra critério nenhum.
- C2 só quebra o celular com toque por meio de uma regra nova, que junta as duas condições do AC 7 e
  que o código não tem. As duas condições estão provadas, cada uma sozinha.
- N5 (sem o ouvinte de `focusout`) não foi reaplicado:
  - nenhum critério pede o que ele quebra;
  - `menu-da-linha.tsx` não mudou desde a rodada 2.

### Sondas

`e2e/sonda-r3.spec.ts` copia a semeadura de `lancamentos-densos.spec.ts`. `sonda-r3.test.tsx` monta o
`MenuDaLinha`.

| Sonda | O que mede | HEAD | Com o mutante, ou antes da fatia |
| --- | --- | --- | --- |
| A | com ponteiro fino em 767, 768, 800, 1.023, 1.024 e 1.279 px, os alvos e a altura de cada linha | 767 px: selo 72 × 44, "⋯" 44 × 44, "Excluir" 63 × 44. De 768 px para cima, 32 px de altura nos três. As alturas estão na tabela das Edge Cases | — |
| B | em 768, 800, 1.024, 1.279 e 1.920 px, a previsão à esquerda do valor e na mesma faixa, no Fixo A e no Fixo B | ✅ passa nas cinco, nos dois fixos | F2: falha em 768 e 800 px. F7: falha em 1.920 px (o "previsto" do Fixo B à direita do valor) |
| C | em 400 px com `hasTouch`: `pointer: coarse` e os três alvos ≥ 44 × 44 | ✅ selo 72 × 44, "⋯" 44 × 44, "Excluir" 63 × 44 | C2: falha, com o selo em 32 px |
| D | em 1.536 × 420, rolando 60 e 120 px para dentro de "Fixos": título em y ≈ 0, resumo inteiro na tela e dentro da faixa do título | ✅ título em y = 0, resumo em y = 11,5 | F3: falha, com o resumo em y = −4 e 81% na tela. Uma `toBeInViewport()` sem `ratio` passaria |
| E | em 1.536, 1.600 e 1.920 px, as larguras do menu, da coluna e da lista | menu 240 px, coluna 288 px; lista com 960, 1.024 e 1.052 px | — |
| F | no componente, a confirmação armada e o clique fora, sem foco (Safari) e com foco (Chrome); depois reabre | ✅ reabre em "Excluir" nos dois | F6: sem foco, reabre em "Confirmar?"; com foco, passa |
| G | em 768, 800, 1.024, 1.100, 1.200, 1.279, 1.280 e 1.440 px, com o Fixo A confirmado: o fim de cada tabela contra o fim da coluna de conteúdo, e a rolagem lateral da página | Fixos termina em 1.091,8 px de 768 a 1.100 px. Em 1.024 px, a coluna termina em 1.000, e a página rola 68 px. Em 1.100 px, a coluna termina em 1.076. De 1.200 px para cima, cabe | Com F2: Fixos em 995,3 px; cabe em 1.024 e 1.100 px. Em `b42f9b6`, antes da fatia: Fixos em 1.027,3 px, e a página rola 3 px em 1.024 px. Nas três versões, de 768 a 800 px, as quatro tabelas saem da coluna (observação 1) |

---

## Interactive UAT

Não feita: o verificador é um sub-agente sem o dono na conversa.

---

## Code Quality

| Princípio | Status |
| --- | --- |
| Código mínimo | ✅ A F8 só acrescenta um teste e uma linha nas Global Constraints |
| Mudanças cirúrgicas | ✅ Nenhum arquivo de produção mudou desde a rodada 1 |
| Sem escopo extra | ✅ |
| Segue os padrões | ✅ `abrir()`, `linha()` e `caixa()` reaproveitados; o teste confere o ponteiro antes de medir; o título cita o AC e as lições |
| Resultados da spec nas assertions | ❌ LST-05 AC 3 sem fixo confirmado; DENS-01 AC 5 abaixo de 1.280 px, DENS-04 AC 1 ("com o resumo") e o edge case da confirmação aberta sem assertion que discrimine |
| Cobertura por camada | ✅ Domínio intocado, com 100% de branches |
| Todo teste mapeia um AC | ✅ |
| Regras do projeto (`AGENTS.md`) | ✅ Sem dado real: "Item B", "Fixo A", R$ 10,00, `example.com`. Conventional Commits, uma correção por commit (`check_commit.py` OK na F8). Sem mudança de banco |

---

## Fix Plans

Esta é a rodada 3. Pelo processo, as três lacunas vão ao dono, que decide se viram correções ou
ficam registradas.

### Fix 1 (rodada 3): a previsão do fixo e a tabela em 1.024 px (DENS-01 AC 5 × LST-05 AC 3) — Major

- **Causa**:
  - na mesma linha, "confirmado · previa R$ 100,00 −R$ 105,00" ocupa uns 300 px numa célula
    `whitespace-nowrap` (`src/components/valor-confirmavel.tsx:67`,
    `src/components/tabela-lancamentos.tsx:373`);
  - abaixo do valor, ocupava uns 200 px;
  - em 1.024 px, a coluna de conteúdo não comporta essa largura;
  - o teste do LST-05 AC 3 não tem fixo confirmado, que é o conteúdo que aperta (como na L-045);
  - o DENS-01 AC 5 não tem prova abaixo de 1.280 px.
- **Decisão do dono**: os dois ACs não cabem juntos em 1.024 px com um fixo confirmado. Há três
  caminhos.
  - **A. A previsão na linha do valor só a partir de 1.280 px.**
    - É o mesmo limiar da linha baixa (DENS-01 AC 1).
    - No código, `md:` vira `xl:` em `valor-confirmavel.tsx:67`, como o mutante F2.
    - O DENS-01 AC 5 ganha "a partir de 1.280 px".
    - A sonda G mostra a tabela dentro da coluna em 1.024, 1.100, 1.200 e 1.279 px. Em 1.024 px,
      fica até melhor que antes da fatia, que já passava 27 px.
    - É o que as medidas apoiam.
  - **B. A previsão quebra para baixo do valor quando não cabe.** O AC 5 precisa admitir isso, e a
    largura em que quebra fica com o conteúdo.
  - **C. Aceitar a tabela mais larga que a coluna em 1.024 px.** Precisa emendar o LST-05 AC 3. A
    página rolaria 68 px de lado.
- **Tarefa, qualquer que seja o caminho**:
  - um teste do LST-05 AC 3 em 1.024 px com um fixo confirmado (sonda G);
  - a prova do AC 5 colada no limiar escolhido, dos dois lados (sonda B).
- **Pronto quando**:
  - a sonda G passa em 1.024 px;
  - o teste novo falha na HEAD de hoje;
  - F2 morre ou vira a correção, conforme o caminho.

### Fix 2 (rodada 3): o resumo preso junto do título (DENS-04 AC 1) — Minor

- **Causa**: o AC tem duas cláusulas, o título e o resumo, e só o título tem assertion (L-010). Hoje o
  resumo fica preso porque mora na mesma `div`, e nada segura isso.
- **Tarefa**: no teste de `e2e/lancamentos-densos.spec.ts:586`, em 1.536 px, depois de rolar, medir o
  resumo de "Fixos" (`2 · R$ 155,00 · 2 a pagar`):
  - com `toBeInViewport({ ratio: 1 })`, porque sem `ratio` o resumo de F3, com 81% na tela, passa;
  - com o topo e o pé do resumo dentro da faixa do título.
- **Pronto quando**: F3 morre (sonda D).

### Fix 3 (rodada 3): a confirmação aberta e o clique fora (edge case) — Minor

- **Causa**: o edge case junta dois estados, a confirmação armada e o clique fora. Cada um é provado
  num teste diferente, e a junção não tem caso.
- **Tarefa**: em `src/components/menu-da-linha.test.tsx`, sem foco, como no teste de `:92`:
  1. abrir com `fireEvent.click`;
  2. armar com `fireEvent.click` no "Excluir";
  3. fechar com `fireEvent.pointerDown(document.body)`;
  4. reabrir;
  5. afirmar o botão "Excluir, Almoço" e nenhum "Confirmar".
- **Pronto quando**: F6 morre (sonda F).

---

## Observações para o dono

Fora do veredito.

1. **De 768 a 800 px, as tabelas já saíam da coluna antes desta fatia.**
   - Na sonda G, as quatro tabelas passam da coluna, em `b42f9b6` e na HEAD.
   - A página rola de 227 a 324 px de lado.
   - Nenhum critério cobre essas larguras: o LST-05 AC 3 vale em 1.024, 1.280 e 1.440 px, e o
     TRES-01 AC 10, em 400 px.
2. **C1: entre 768 e 1.023 px, nada prova que o "⋯" fica com 32 px.**
   - Nenhum critério pede isso: o DENS-02 AC 7 só pede o mínimo de 44 px abaixo de 768 px ou no
     toque.
   - A densidade a partir de 768 px é decisão do autor (premissa "Linha baixa", `n`).
3. **C2: o celular com toque não é medido.**
   - Os testes de 400 px rodam com o ponteiro fino do Chrome de desktop.
   - Até esta fatia, o tamanho não dependia do ponteiro, e 400 px bastava. Agora depende.
   - As duas condições do AC 7 estão provadas, cada uma sozinha: 767 px com ponteiro fino e 1.920 px
     com toque.
   - Para quebrar só o celular com toque, alguém precisaria escrever uma regra nova, só para o toque
     estreito.
   - Rodar `e2e/acessibilidade.spec.ts:123` com `hasTouch` faria o teste de TOQUE-01 medir o
     celular de verdade (sonda C).
4. **TOQUE-01 AC 1 ainda diz que o selo tem 44 × 44 sempre.**
   - Com ponteiro fino, a partir de 768 px, o selo mede 32 px. É isso que deixa a linha com 48 px
     (DENS-01 AC 1).
   - A seção "O que esta fatia substitui" e o AD-020 listam o TOQUE-01 AC 2, mas não o AC 1.
   - Em `.specs/features/lacunas-do-painel/spec.md:152`, falta o "no toque" que o AC 2 ganhou.
5. **N5: o menu não tem teste de fechar quando o foco sai dele.** Nenhum critério pede isso. Só o
   `design.md` e o comentário do componente prometem (`menu-da-linha.tsx:56-60`).
6. **"O dobro de linhas por tela" (Success Criteria) não é medido.** Na HEAD, de 1.280 px para cima,
   a linha mede de 40 a 45 px, contra uns 65 px antes.
7. **"Menor e apagado" (DENS-01 AC 2) é provado pelo nome da classe**, e não pelo estilo computado
   (candidata L-037).
8. **Chips na coluna com uma categoria só.** A quebra e o "+N categorias" dentro dos 288 px não são
   exercitados a partir de 1.536 px.
9. **DENS-03 AC 8 mede a região "Entradas", com 1.052 px.**
   - São os 1.100 px do contêiner menos 24 px de respiro de cada lado.
   - Um `max-w` de até ~1.148 px ainda passaria.
   - O teste lê "lista" como o conteúdo visível, o que é uma leitura razoável do AC.
10. **`e2e/lista-enxuta.spec.ts:414` mede o cartão logo depois do `goto`, sem esperar a página.**
    - Com o `next dev` recompilando um mutante, falhou uma vez ("a coluna de conteúdo não foi
      desenhada").
    - Passou ao rodar o arquivo sozinho.
    - Na HEAD, passou nas corridas inteiras.
11. **`lancamentos-densos.spec.ts` continua `serial`.** Um defeito mostra só o primeiro critério
    quebrado.

---

## Lições registradas

Pelo `lessons.py add`, com a fonte de cada sinal:

- **Lacuna 1, LST-05 AC 3 quebrado sem teste** (`ac_gap`): **L-049**, candidata nova. Mudança que alarga uma
  célula precisa reabrir o AC de largura que a fatia mantém, com fixture do conteúdo mais largo.
- **F2** (`surviving_mutant`): **L-050**, candidata nova. Regra de layout que um AC pede sem dizer largura
  precisa de prova colada no breakpoint em que o código a liga.
- **F3** (`surviving_mutant`): registrada com o texto da **L-010** (confirmada), que ganha esta fatia
  como a quarta recorrência.
  - Não foi penalizada.
  - Nada na spec, no design ou nas tasks desta fatia mostra que a L-010 foi carregada no Specify ou
    no Design. A falha foi não carregá-la, e não a lição.
- **F6** (`surviving_mutant`): **L-051**, candidata nova. Edge case que junta dois estados precisa de um teste
  com os dois ao mesmo tempo.
- **⚠️ "linhas densas" sem número** (`spec_precision_gap`): registrada com o texto da **L-031**
  (candidata de `lista-enxuta`). Com esta segunda fatia, ela é promovida a confirmada.
- **C1 e C2**: nenhuma lição. Ficaram como observação, porque nenhum critério pede o que C1 quebra, e
  C2 precisa de uma regra que o código não tem.

Situação das candidatas das rodadas 1 e 2:
- **L-048**, aplicada pela F8: N11 e N11b morrem.
- **L-044, L-045, L-046 e L-047**, aplicadas pelas F2, F3, F5 e F1: os mutantes que as motivaram
  continuam mortos.
- As cinco continuam candidatas. A recorrência conta fatias distintas, e esta é a mesma.
- A Lacuna 1 é mais um caso da ideia da L-045 (falta o conteúdo que aperta), também nesta fatia.
- **L-029** (confirmada) não foi penalizada: os limiares a que ela se aplica estão colados.

---

## Requirement Traceability Update

| Requisito | Rodada 1 | Rodada 2 | Rodada 3 |
| --- | --- | --- | --- |
| DENS-01 | ❌ Needs Fix | ✅ Verified | ❌ Needs Fix (Fix 1: o AC 5 contra o LST-05 AC 3 em 1.024 px, com decisão do dono) |
| DENS-02 | ❌ Needs Fix | ❌ Needs Fix | ❌ Needs Fix (Fix 3: o edge case da confirmação aberta). O AC 7 está fechado |
| DENS-03 | ❌ Needs Fix | ✅ Verified | ✅ Verified |
| DENS-04 | ✅ Verified | ✅ Verified | ❌ Needs Fix (Fix 2: "com o resumo") |

A `spec.md` não foi alterada pelo verificador.

---

## Summary

**Overall**: ❌ Not Ready.
- A lacuna da rodada 2 está fechada.
- Esta rodada achou uma lacuna Major, que é um defeito: em 1.024 px, com um fixo confirmado, a tabela
  sai da coluna e a página rola de lado. Ela pede uma decisão do dono entre dois ACs.
- Achou também duas lacunas Minor de teste.

**Spec-anchored check**:
- 21 de 23 critérios têm assertion sobre o resultado da spec, no domínio inteiro.
- O DENS-01 AC 5 não tem prova entre 768 e 1.279 px. Cumpri-lo em 1.024 px com um fixo confirmado
  quebra o LST-05 AC 3, que esta fatia mantém.
- O DENS-04 AC 1 não tem prova da cláusula "com o resumo".
- 5 de 7 edge cases têm prova. Dois deles, "Valor do fixo em edição" e "Erro ao trocar a categoria",
  se apoiam em código que não mudou e em testes antigos verdes. Os outros dois:
  - um não tem caso: a confirmação aberta e o clique fora;
  - outro, a faixa de 768 a 1.536 px, inclui a tabela que sai da coluna e tem uma lacuna de precisão:
    "linhas densas" não tem número abaixo de 1.280 px.
- Os limiares de 768, 1.280 e 1.536 px estão colados nos lados que os ACs prometem.

**Sensor**: 14 aplicados, 9 mortos, 5 vivos.
- F2, F3 e F6 viram as Lacunas 1, 2 e 3.
- C1 e C2 ficam como observações.

**Gate**: verde.
- unit 1.704, integração 364, e2e 130 de 130;
- `typecheck`, `lint` e `build`.

**O que funciona**:
- a lacuna da rodada 2 está fechada, e N11 e N11b morrem;
- as cinco lacunas da rodada 1 continuam fechadas;
- o limiar de 1.280 px está colado: F10 (um pixel acima) e F11 (já em 1.024 px) morrem;
- a coluna à direita, o `Escape`, o toque dentro e fora do menu e o lugar do "Vencido" discriminam:
  F1, F4, F5 e F8 morrem;
- nenhum teste antigo foi afrouxado.

**Próximo passo**: levar as três lacunas ao dono.
- A Lacuna 1 pede uma escolha entre os caminhos A, B e C do Fix 1. As medidas apoiam o A.
- As Lacunas 2 e 3 se fecham com um teste cada. A sonda de cada uma já mostra o que ele precisa
  afirmar.
