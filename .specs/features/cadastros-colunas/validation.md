# Cadastros em abas, com o item aberto à direita: Validation

## Validation: cadastros-colunas, rodada 4 (focada em G8–G10) — PASS ✅

**Result**: PASS ✅ na rodada 4, focada em G8 a G10 (2026-10-31, `49dea3f`).
**Date**: 2026-10-31
**Spec**: `.specs/features/cadastros-colunas/spec.md`
**Diff range**: `87efa3e..49dea3f`: `48f04a2` (F11), `a5bb161` (F12) e `49dea3f` (F13). A fatia
inteira é `e8b1540..49dea3f`.
**Verifier**: sub-agente independente da rodada 4 (autor ≠ verificador). Não rodou as rodadas
anteriores.

O veredito combina as rodadas 1 a 3, que valeram para tudo o mais, com esta conferência focada nas
três lacunas da rodada 3, **por escolha do dono em 2026-10-31**: "Corrigir e checar só isso". Não
foi uma rodada inteira. O que a rodada 3 provou fora de G8 a G10 não foi refeito, e o diff
`87efa3e..49dea3f` só toca o e2e de Cadastros, um comentário e `.specs/` (seção 1).

- **As três lacunas da rodada 3 estão fechadas.**
  - G8: e2e `:422` e `:1017` leem os `dt`. S3 morre em `:1017` e S3b em `:422`, um cada.
  - G9: e2e `:2202-2205` e `:2231-2234` afirmam que nenhuma região rola de lado. N5 morre em `:2205`
    em 400 px; N4 morre em `:2205` com ponteiro fino em 768 px, e em `:2230` com toque.
  - G10: e2e `:2197-2200` e `:2226-2229` medem o nome contra o painel. N7 morre em `:2200` e em
    `:2229`, com os números da sonda A.
- **Gate verde.** O `pnpm verify` sai 0, com 2.088 unitários, 406 de integração e o `build`.
  `cadastros-colunas.spec.ts` sozinho passa 73 de 73.
- **Sensor:** 10 mutantes, 10 mortos:
  - os 5 vivos ou fracos da rodada 3;
  - 4 meus, contra os ajudantes novos;
  - o F4f da rodada 2, contra o ajudante renomeado.
- **Os quatro desvios das F11 a F13 são aceitáveis** (seção 3).
- **As citações remapeadas conferem.** As 78 citações do arquivo na traceability foram conferidas
  por script, e 26 foram abertas à mão, do CADCOL-01 ao CADCOL-11 (seção 4).

---

### 1. Integridade

- **O código de produto só muda no comentário.** `git diff 87efa3e..49dea3f -- src` toca um arquivo,
  `src/components/detalhe-do-meio.tsx`, em duas linhas do cabeçalho:
  - `:15`, "ACs 1 a 6 e 9 a 13" → "ACs 1 a 6 e 8 a 13";
  - `:26`, "(AC 9)." → "(AC 9); o nome que muda só na caixa grava (AC 8).".

  É a observação 3 da rodada 3. O arquivo tem o mesmo número de linhas, e nenhuma linha de código
  mudou.
- **Os outros arquivos do diff:** `e2e/cadastros-colunas.spec.ts`, `spec.md` (traceability) e
  `tasks.md` (as F11 a F13). Como nada fora disso mudou, o e2e inteiro não é exigido nesta rodada.
- **Nenhum teste saiu, foi pulado ou afrouxado.** As linhas apagadas no e2e são de três tipos:
  - o corpo de `textoForaDaTabela`, que virou `textoForaDe(alvo, conteiner)`. Para a tabela é o
    mesmo código: `closest("table")` passa a `closest(seletor)`, e a chamada do botão passa
    `"table"`;
  - a mensagem do erro, que agora nomeia o contêiner;
  - os títulos dos dois testes da F4, que ganham "e do painel".

  A assertion do nome contra a tabela (`:2193-2196`) é a de antes, e o F4f ainda morre nela (seção
  6). Nenhum `skip`, `only`, `fixme`, `any`, timeout nem `// SPEC_DEVIATION` no diff.
- **Os três commits passam no `check_commit.py`.** Cada um marca a task dele em `tasks.md` e a
  traceability em `spec.md`.
- **AD-009.** As fixtures dos testes tocados são as de antes: "Categoria Um", "Conta Corrente",
  "Março de 2026" e os dois nomes de uma palavra só. Nenhum nome, valor ou descrição real no diff nem
  nas mensagens dos commits.
- **`AGENTS.md`, regras 2 a 5.** Nenhum campo monetário, nenhum `Date` e nada somado. `src/domain`
  não mudou, e `arquitetura.test.ts` passa no gate.
- **Contagens.** São as da rodada 3: 2.088 unitários em 132 arquivos, 406 de integração em 25 e 73
  e2e em `cadastros-colunas.spec.ts`. As F11 a F13 põem assertions em testes que já existiam.

### 2. As lacunas da rodada 3

"e2e" é `e2e/cadastros-colunas.spec.ts` em `49dea3f`.

| Lacuna | Resultado da spec | `file:line` + assertion | Mutante | Result |
| --- | --- | --- | --- | --- |
| G8, CADCOL-04, AC 11 | Pede "Onde ela aparece" com "Fixos em <Mês de Ano>" e "Lançamentos em <Mês de Ano>". Em março de 2026, são "Fixos em Março de 2026" e "Lançamentos em Março de 2026" | e2e `:422-425`, no teste de `:399`, logo depois dos `dd` (`:420`): `expect(secao.locator("dt")).toHaveText(["Fixos em Março de 2026", "Lançamentos em Março de 2026"])`. `secao` é a região "Onde ela aparece" do painel (`:419`). O `toHaveText` com texto compara o texto inteiro, e não um pedaço | S3b morre em `:422`: o teste recebe "Fixos em Março" e "Lançamentos em Março". O teste de Meios passa | ✅ PASS |
| G8, CADCOL-07, AC 13 | Pede "Onde ele aparece" com os mesmos dois rótulos | e2e `:1017-1020`, no teste de `:994`, logo depois dos `dd` (`:1015`), na região "Onde ele aparece" (`:1014`): a mesma assertion | S3 morre em `:1017`, com a mesma diferença. O teste de Categorias passa | ✅ PASS |
| G9, CADCOL-09, AC 7 | De 400 px para cima, nos três estados, nada rola de lado. O dono decidiu "Nunca rolar de lado" | Ponteiro fino, nas 60 medidas (`:2192`): e2e `:2202-2205`, `expect(medidas.filter(({ regioes }) => regioes.length > 0), "uma região que rola de lado").toEqual([])`. Com toque em 768 px, nas 6 medidas: `:2231-2234`. `regioesQueRolamDeLado` (`:2104`) percorre todo elemento da página e acha os que têm `overflow-x` diferente de `visible` e `scrollWidth > clientWidth`. Ficam fora os `input`, os `textarea` e as caixas de até 1 × 1 px | N5 morre em `:2205` em 400 px: Categorias, os três estados, `DIV.overflow-x-auto +80`, com a página, o painel e o nome em 0. N4 morre em `:2205` com ponteiro fino em 768 px: `+34` nos três estados, com a página e o painel em 0 | ✅ PASS |
| G10, Edge Case "Nome longo", no painel | A palavra mais larga que a coluna quebra no meio, também no painel | e2e `:2197-2200`, nas 60 medidas, e `:2226-2229`, com toque: `expect(medidas.filter(({ nomeForaDoPainel }) => nomeForaDoPainel > 1), "o nome numa palavra só fora do painel").toEqual([])`. No estado "item aberto", `textoDoNomeForaDoPainel` (`:2084`) mede cada caixa de linha do texto do título e, na categoria, da legenda "Cor de <nome>" contra a caixa do `aside` (`textoForaDe`, `:2054`), pelos dois lados | N7 morre em `:2200`. Em Categorias, o nome passa do painel 66,5 px em 400 px e 54,5 px em 1.536 e 1.920 px. Em Meios, passa 163,5 px em 400 px, 51,5 px em 768 px e 151,5 px em 1.536 e 1.920 px. Com toque, N7 morre em `:2229` (Meios, 51,5 px). São os números da sonda A | ✅ PASS |

**Status:** ✅ G8, G9 e G10 fechadas. Com as rodadas 1 a 3, os 96 ACs têm o resultado da spec
provado, e os dez Edge Cases estão cobertos. Nenhum spec-precision gap.

### 3. Os desvios das F11 a F13, julgados

Julgados só contra a spec, depois da passada própria.

| Desvio | Juízo | Por quê |
| --- | --- | --- |
| 1. F12 deixa fora da medida a caixa de até 1 × 1 px, o `sr-only` | **Aceitável** | Pelo CSS, `overflow-x` diferente de `visible` corta o conteúdo na horizontal. Uma caixa de até 1 × 1 px não mostra mais que 1 px, e não há nada à vista para rolar. A regra pede as duas medidas até 1 px (`&&`): a caixa de 0 px de altura e larga, ou a estreita e alta, continua medida. O X3 mostra o limite: um rótulo à vista, cortado numa caixa de 12 px, é achado de 768 a 1.920 px. O elemento `inline` também cai na regra, porque tem 0 × 0, mas um `inline` não rola: o `overflow` não vale nele |
| 2. F13 mede no painel do meio só o título | **Aceitável** | O título é o único texto à vista com o nome no painel do meio (`detalhe-do-meio.tsx:154`). "Editar <nome>" é só o `aria-label` do formulário (`:161`), e o campo "Nome" rola o próprio valor, como todo `input`. O X1 morre por esse título em Meios, nas dez larguras e com toque. A legenda da categoria está coberta: o X4 a corta, com o título intacto, e morre em `:2200` |
| 3. F13 renomeia `textoForaDaTabela` para `textoForaDe(alvo, conteiner)` | **Aceitável** | Para a tabela é o mesmo código, com o seletor como parâmetro. A função continua lançando quando não acha texto à vista no contêiner, e assim não passa calada. O F4f, que a rodada 3 matou em `:2129`, morre agora em `:2196`, com os mesmos 75,7 px em Categorias, em 400 px |
| 4. F11 remapeia 67 citações por script | **Aceitável** | Conferi as 70 citações de `87efa3e` com linha a partir de `:421`. Eram 67, todas trocadas, e nenhuma ficou com o número velho. O texto de cada linha citada agora é o da linha citada antes, menos os dois títulos que a F13 mudou. Os 26 da amostra caem no teste certo (seção 4). O erro que a Nota da F13 conta, o fim de `:2193-2196` casado com o fecho igual da assertion nova, foi acertado à mão, e `:2193-2196` é a assertion do nome contra a tabela |

### 4. Citações da traceability

- **Por script, em todas.** A traceability cita `e2e/cadastros-colunas.spec.ts` 70 vezes em `87efa3e`
  e 78 em `49dea3f`.
  - Os 66 pares trocados no diff da spec mostram, em 64, o mesmo texto na linha nova e na velha. Os
    outros 2 são os títulos dos testes da F4, que ganham "e do painel".
  - As 8 citações sem par são as novas das F11 a F13: `:422`, `:1017`, `:2084`, `:2104`,
    `:2197-2200`, `:2202-2205`, `:2226-2229` e `:2231-2234`. As duas dos títulos mudados, `:2180` e
    `:2213`, também ficam sem par pelo texto.
- **À mão, 26 linhas abertas**, com o teste em volta de cada uma:

| Requirement | Citação | O que a linha é | No teste certo? |
| --- | --- | --- | --- |
| CADCOL-01 | `:440` | `test(` do item "Cadastros" que abre Categorias | ✅ |
| CADCOL-01 | `:2244` | `test(` do "+ Nova…" ao lado do título | ✅ |
| CADCOL-02 | `:775` | `test(` de 767 e 768 px | ✅ |
| CADCOL-02 | `:789` | o laço das linhas, no teste de `:775` | ✅ |
| CADCOL-02 | `:839` | `nomeSozinhoEmCima` da Categoria Um, no teste de 400 px (`:826`) | ✅ |
| CADCOL-03 | `:994` | `test(` da composição de Meios | ✅ |
| CADCOL-04 | `:422` | os `dt` de "Onde ela aparece", no teste de `:399` | ✅ |
| CADCOL-04 | `:648` | `test(` de trocar a cor e renomear | ✅ |
| CADCOL-04 | `:2408` | `toBeInViewport({ ratio: 1 })`, no laço de `:2383` | ✅ |
| CADCOL-05 | `:468` | `test(` de criar pelo painel | ✅ |
| CADCOL-06 | `:1056` | `test(` da ordem dos meios | ✅ |
| CADCOL-06 | `:1491` | o laço de `ORDEM_DOS_MEIOS`, no teste de `:1473` | ✅ |
| CADCOL-06 | `:1546` | `nomeSozinhoEmCima` de Cartão Roxo, no teste de `:1532` | ✅ |
| CADCOL-07 | `:1017` | os `dt` de "Onde ele aparece", no teste de `:994` | ✅ |
| CADCOL-07 | `:1125` | `test(` do renome recusado para "conta azul" | ✅ |
| CADCOL-07 | `:2349` | `caso: "o nome do meio"` de `GRAVACOES` | ✅ |
| CADCOL-07 | `:2406` | a rolagem da página ± 1 px, no laço de `:2383` | ✅ |
| CADCOL-08 | `:1196` | `test(` de criar "Cartão Novo" | ✅ |
| CADCOL-09 | `:1744` | `test(` da coluna de 384 px | ✅ |
| CADCOL-09 | `:2193` | o nome contra a tabela, no teste de `:2180` | ✅ |
| CADCOL-09 | `:2222` | o mesmo, no teste com toque (`:2213`) | ✅ |
| CADCOL-10 | `:1271` | `test(` do teclado em Meios | ✅ |
| CADCOL-10 | `:1885` | `test(` dos alvos com toque em 1.920 px | ✅ |
| CADCOL-10 | `:1950` | `test(` dos alvos com ponteiro fino | ✅ |
| CADCOL-11 | `:607` | `test(` de abrir e logo fechar com `Escape`, em Categorias | ✅ |
| CADCOL-11 | `:1299` | o mesmo em Meios | ✅ |

### 5. Gate

Na worktree real, com `DATABASE_URL_TEST` no banco `mybilling_test_cad`. O `mybilling-db` já estava
de pé e saudável, e o `pnpm db:up` não foi preciso. Cada saída foi gravada num `.exit` e conferida
sozinha. Os logs estão em `scratchpad/verificador-cad-r4/`.

| Comando | Saída |
| --- | --- |
| `pnpm verify` | **0** |
| ↳ `typecheck` | ✅ |
| ↳ `lint` | ✅ 368 arquivos |
| ↳ `test:unit` | ✅ **2.088 passaram em 132 arquivos**, 0 falhas, 0 skip; `src/domain` com 100% de branches (393/393) |
| ↳ `test:integration` | ✅ **406 passaram em 25 arquivos** |
| ↳ `build` | ✅ com `/[competencia]/cadastros/categorias` e `/[competencia]/cadastros/meios-de-pagamento` |
| `pnpm exec playwright test e2e/cadastros-colunas.spec.ts`, porta 3100 | **0**, **73 de 73** em 1,7 min, na primeira passada, sem retry |

- **O e2e inteiro não rodou.** O diff da rodada só toca três coisas: `e2e/cadastros-colunas.spec.ts`,
  o comentário de `detalhe-do-meio.tsx` e `.specs/`. A F13 registra o e2e inteiro em 266 de 266 em
  `49dea3f`, e a rodada 3 o rodou em `92063b4`.
- **Efeito colateral:** o `next dev` reescreveu `next-env.d.ts`. Foi restaurado com
  `git checkout -- next-env.d.ts`.
- **A porta 3100 ficou livre** no fim.

### 6. Sensor

**A worktree descartável.**
- Criada por `git worktree add --detach` em `49dea3f`, sob o scratchpad, com `pnpm install --offline
  --frozen-lockfile` próprio, sem link de `node_modules`.
- Na cópia do e2e, `mode: "serial"` virou `"default"` na mesma linha. As linhas citadas são as do
  arquivo real, e uma falha não pula o outro teste.
- Cada mutante conferiu que o trecho original aparecia uma vez só, e saiu com `git checkout -- src`.
  O `src` foi conferido limpo depois de cada um.
- A worktree foi removida com `git worktree remove --force` e `git worktree prune`, duas vezes: a
  segunda foi para o F4f. O `git status --porcelain` da worktree real estava vazio antes e
  continuou vazio depois.

**O controle**, sem mutante, passou os quatro testes: os dois de composição (`:399` e `:994`) e os
dois da F4 (`:2180` e `:2213`). Cada mutante rodou os dois testes da sua lacuna: os de composição
para S3 e S3b, os da F4 para o resto.

| # | `file:line` | Falha injetada | Quem a mata | Killed? |
| --- | --- | --- | --- | --- |
| S3 | `src/app/(app)/[competencia]/cadastros/meios-de-pagamento/page.tsx:74` | `rotuloDaCompetencia={nomeDoMes(mes)}`: o painel do meio diz "Fixos em Março" | e2e `:1017`, com "Fixos em Março" e "Lançamentos em Março" recebidos. O de Categorias passa | ✅ Morto (vivo na rodada 3) |
| S3b | `src/app/(app)/[competencia]/cadastros/categorias/page.tsx:70` | O mesmo no painel da categoria | e2e `:422`, com a mesma diferença. O de Meios passa | ✅ Morto (vivo na rodada 3) |
| N5 | `src/components/coluna-de-cadastro.tsx:153`; `src/components/tabela-de-categorias.tsx:77` | A lista num `overflow-x-auto` e a tabela com `min-w-[28rem]` | e2e `:2205` em 400 px: Categorias, os três estados, `DIV.overflow-x-auto +80`, com a página, o painel e o nome em 0. O teste com toque passa em 768 px, onde a tabela de 448 px cabe | ✅ Morto (vivo na rodada 3) |
| N4 | `coluna-de-cadastro.tsx:153`; `tabela-de-categorias.tsx:178` | O mesmo invólucro, e a cor sem quebra a partir de 768 px (`lg:whitespace-nowrap` → `md:`) | Ponteiro fino: e2e `:2205` em 768 px, `DIV.overflow-x-auto +34` nos três estados, com a página e o painel em 0. Com toque: `:2230`, a página rola 2 px, e o invólucro 42 | ✅ Morto, agora também com ponteiro fino |
| N7 | `coluna-de-cadastro.tsx:50` | `truncate` no `TituloDoPainel` | e2e `:2200`: Categorias 66,5 px (400 px) e 54,5 px (1.536 e 1.920 px); Meios 163,5 px (400 px), 51,5 px (768 px) e 151,5 px (1.536 e 1.920 px). Com toque, `:2229` (Meios, 51,5 px) | ✅ Morto (vivo na rodada 3) |
| X1 | `coluna-de-cadastro.tsx:50` | `-ml-8` no `TituloDoPainel`: o nome sai 32 px para a esquerda. Do lado esquerdo, a página e o painel não rolam | e2e `:2200`: Meios, nas dez larguras, 11 px fora do painel (8 px a partir de 1.536 px). Com toque, `:2229`. Isso prova que `textoForaDe` mede os dois lados contra a caixa do `aside`, e não a do título. Em Categorias, o texto da pill fica dentro, pelo respiro dela | ✅ Morto |
| X2 | `src/components/detalhe-da-categoria.tsx:161` | As opções de cor numa faixa `relative w-48 flex-nowrap overflow-x-auto`, que rola sozinha dentro do painel | e2e `:2205`: Categorias, item aberto, nas dez larguras, `DIV.relative.flex.w-48… +341`, com a página, o painel e o nome em 0. Com toque, `:2234`. A região dentro do painel não escapa | ✅ Morto (ver a observação 2) |
| X3 | `tabela-de-categorias.tsx:125` | O nome da contagem, `md:sr-only`, vira uma caixa à vista de 12 px que corta o texto (`md:inline-block md:w-3 md:overflow-hidden md:whitespace-nowrap`) | e2e `:2205`: Categorias, os três estados, de 768 a 1.920 px, `SPAN.md:inline-block… +23` a `+85`. Com toque, `:2234`. A regra do 1 × 1 px não esconde um corte à vista | ✅ Morto |
| X4 | `detalhe-da-categoria.tsx:160` | A legenda "Cor de <nome>" cortada com reticências (`block max-w-48 truncate`), com o título intacto | e2e `:2200`: Categorias, item aberto, 179,4 px fora do painel em 400 px, 67,4 px em 768 px e 167,4 px em 1.536 e 1.920 px. Com toque, `:2229`. A legenda é medida, e não só o título | ✅ Morto |
| F4f | `coluna-de-cadastro.tsx:153`; `tabela-de-categorias.tsx:168`; `src/components/tabela-de-meios.tsx:202` | O F4f da rodada 2: a lista num `overflow-x-auto`, sem `[overflow-wrap:anywhere]` nos botões | e2e `:2196`, 75,7 px fora da tabela em Categorias, em 400 px, nos três estados; com toque, `:2230`, a página em 245 e 205 px. São os números da rodada 3 | ✅ Morto, pelo ajudante renomeado |

**Sensor depth**: focado, com 10 mutantes:
- os 5 da rodada 3 que o Done-when das F11 a F13 nomeia;
- 4 meus, contra os ajudantes novos;
- o F4f, contra a renomeação.

**Resultado do sensor**: 10 de 10 mortos.

### 7. Observações não bloqueantes, para o dono

1. **A medida das regiões olha a página inteira, o menu também.** `regioesQueRolamDeLado` percorre
   `document.querySelectorAll("*")`. Isso cumpre o "Nunca rolar de lado". O efeito colateral: uma
   região que role no menu, por mudança de outra fatia, derruba este teste de Cadastros. A mensagem
   traz a tag, as classes e o quanto rola, e o diagnóstico é rápido. Não pede mudança.
2. **X2 precisou de duas tentativas para isolar a assertion nova.** Sem `relative` na faixa, os
   `radio` `sr-only` vazam do painel e rolam o `aside` (`:2201` cai antes). Eles são `absolute`, e o
   bloco de contenção deles é o `aside` (`relative`), e não a faixa que rola. Nas duas tentativas, a
   lista de regiões já trazia a faixa em cada medida. Não é defeito do teste nem do produto; é como o
   CSS se comporta.
3. **X1 em Categorias.** Com o título 32 px para a esquerda, o fundo da pill passa um pouco do
   painel, mas o texto fica dentro, pelo respiro de 12 px da pill. A medida é do texto, como o Edge
   Case pede ("quebra no meio, no painel"). A caixa da pill fora do painel não é cláusula da spec, e o
   mutante é artificial. Só registro.
4. **A redação do CADCOL-09, AC 7** continua "na página e no painel", e a medida agora cobre toda
   região da página. A F12 manteve a redação, como a Fix 2 da rodada 3 permitia: a decisão do dono,
   "Nunca rolar de lado", já cobre a região. Se quiser a letra mais justa: "sem rolagem lateral na
   página, no painel nem em região nenhuma dentro deles". É opcional e não é spec-precision gap,
   porque o resultado esperado (nenhuma rolagem) é preciso.
5. **Para o commit do relatório.** Em `tasks.md`, o Status ainda diz que as F11 a F13 "aguardam o
   Verifier focado nelas". O `**Commit**` da F13 está sem hash, o que é natural para o próprio commit.

### 8. Requirement Traceability Update

Com o PASS, o `spec.md` passa cada linha a "Verified". O status se apoia nas rodadas 1 a 3 e nesta.

| Requirement | Status antes no `spec.md` | Proposta da rodada 3 | Agora |
| --- | --- | --- | --- |
| CADCOL-01 | In progress | ✅ Verified | ✅ Verified |
| CADCOL-02 | In progress | ✅ Verified | ✅ Verified |
| CADCOL-03 | In progress | ✅ Verified | ✅ Verified |
| CADCOL-04 | In progress | ❌ Needs Fix (AC 11, G8) | ✅ Verified (G8 fechada: `:422`) |
| CADCOL-05 | In progress | ✅ Verified | ✅ Verified |
| CADCOL-06 | In progress | ✅ Verified | ✅ Verified |
| CADCOL-07 | In progress | ❌ Needs Fix (AC 13, G8) | ✅ Verified (G8 fechada: `:1017`) |
| CADCOL-08 | In progress | ✅ Verified | ✅ Verified |
| CADCOL-09 | In progress | ❌ Needs Fix (AC 7, G9; Edge Case, G10) | ✅ Verified (G9: `:2202-2205`, `:2231-2234`; G10: `:2197-2200`, `:2226-2229`) |
| CADCOL-10 | In progress | ✅ Verified | ✅ Verified |
| CADCOL-11 | In progress | ✅ Verified | ✅ Verified |
| CADCOL-12 | In progress | ✅ Verified | ✅ Verified |

`validate_spec.py --root . cadastros-colunas` sai 0 com a mudança.

### 9. Lições

Nenhuma lição nova: o PASS é limpo, sem mutante vivo, spec-precision gap ou AC sem prova.
- As F11 a F13 aplicaram as três lições da rodada 3, e as três funcionaram:
  - L-054 (`confirmed`) pela F11: S3 e S3b morrem;
  - L-068 (candidata) pela F12: N5 e N4 morrem pela região;
  - L-069 (candidata) pela F13: N7 morre pelo texto fora do painel.
- O registro delas fica como está, porque esta rodada não edita os arquivos de lição.

### 10. Summary

**Overall**: ✅ Ready.

**Spec-anchored check**: G8, G9 e G10 fechadas, com o resultado da spec nas assertions. Com as
rodadas 1 a 3, 96 de 96 ACs provados. Nenhum spec-precision gap.
**Sensor**: 10 de 10 mortos nesta rodada: S3, S3b, N5, N4, N7, X1 a X4 e F4f.
**Gate**: `pnpm verify` 0, com 2.088 unitários, 406 de integração e o `build`;
`cadastros-colunas.spec.ts` 73 de 73.

**What works**:
- Nas duas abas, o painel diz o mês por inteiro, e o teste lê o que a página monta.
- Nenhuma região da página rola de lado, nem um invólucro da lista, nem uma faixa dentro do
  painel, nem um rótulo cortado.
- A palavra longa fica dentro do painel, no título e na legenda, pelos dois lados.

**Issues found**: nenhum que bloqueie. Cinco observações na seção 7.

**Next steps**: o orquestrador commita este relatório e o `spec.md`, e acerta o Status de
`tasks.md`.

---

## Rodada 3 (resumo)

**2026-10-31, `92063b4` (relatório em `87efa3e`), FAIL ❌.** A última do limite de três. O
relatório inteiro, com a tabela de cada AC e os 37 mutantes, está em `87efa3e`.

- **Spec-anchored:** 93 de 96.
  - CADCOL-04, AC 11 e CADCOL-07, AC 13: o rótulo "Fixos em Março de 2026" é montado pela página, e
    nenhum teste o lia na tela; o e2e lia só os `dd` (G8).
  - CADCOL-09, AC 7: a medida olhava a página, o painel e o nome contra a tabela, e não uma região
    que rola por conta própria (G9).
  - Edge Case "Nome longo", no painel: só a rolagem do `aside` era medida, e o corte com
    reticências não rola (G10).
- **As duas lacunas da rodada 2** fecharam: B8 morreu em `detalhe-do-meio.test.tsx:268`, e F6e no
  e2e, nos três casos do nome do meio. F4f, a observação 2, também morreu.
- **Sensor:** 37 mutantes, 33 mortos. Sobreviveram S3 e S3b (G8), N5 (G9) e N7 (G10). N4 morreu
  por 2 px, só com toque.
- **Sondas A, B e C:** o código já fazia o certo nas três lacunas, que eram só de teste.
- **Gate:** verde, com 2.088 unitários, 406 de integração e 266 e2e na primeira passada.
- **Desvios das F7 a F10:** aceitáveis. O comentário de `textoForaDaTabela` prometia mais do que a
  medida cobria, e isso era a G9.
- **Observação 3:** o cabeçalho de `detalhe-do-meio.tsx` dizia "ACs 1 a 6 e 9 a 13".
- **Lições:** L-054 passou a `confirmed`; L-068 e L-069, candidatas.
- **Decisão do dono em 2026-10-31:** "Corrigir e checar só isso". As Fixes 1 a 3 viraram as F11 a
  F13, e a observação 3 entrou na F11.

## Rodada 2 (resumo)

**2026-10-31, `21aa62b` (relatório em `14acc90`), FAIL ❌.**

- **Spec-anchored:** 94 de 96.
  - CADCOL-07, AC 8 provado só no servidor. O painel decide "nada mudou" antes de chamar o
    servidor, e nenhum teste mudava só a caixa do nome do meio (G6).
  - CADCOL-07, AC 16 provado só na cláusula dos dias (G7).
- **As cinco lacunas da rodada 1** fecharam, e E7, E14b, E15, E17, E18 e E19 morreram.
- **Sensor:** 37 mutantes, 35 mortos. Sobreviveram B8 (G6) e F6e (G7).
- **Gate:** verde, com 2.087 unitários, 406 de integração e 263 e2e.
- **Observações:** em 400 px, a medida da F4 não via a palavra longa vazando num invólucro (F4f,
  observação 2); os comentários de "duas linhas de texto" (Fix 3); a citação
  `visao-tres-colunas.spec.ts:606` deslocada (observação 5).
- **Lições:** L-041 passou a `confirmed`; L-067, candidata.
- **Fix 1 e Fix 2** viraram a F7 e a F8; a observação 2 virou a F9; a Fix 3 e a observação 5 viraram
  a F10.

## Rodada 1 (resumo)

**2026-10-31, `e4789ef` (relatório em `34449f7`), FAIL ❌.**

- **Spec-anchored:** 89 de 94.
  - CADCOL-06, AC 8 sem o resultado da spec: o cartão de crédito ocupava três linhas de texto em
    360, 400 e 500 px, e o AC pedia duas (G1).
  - Quatro ACs com a prova incompleta:
    - CADCOL-02, AC 8 medido só em 400 px, longe do limiar (G2);
    - CADCOL-10, AC 7 sem medida com ponteiro fino a partir de 768 px (G3);
    - CADCOL-09, AC 7 só em 400 px com um item aberto. "Automática (Verde-água)" rolava a página
      10 px em 768 px, e um nome de uma palavra só a rolava em 400, 768 e 1.024 px (G4);
    - CADCOL-01, AC 6 provado só pela ordem do DOM (G5).
- **Sensor:** 46 mutantes, 40 mortos. Sobreviveram E7, E14b, E15, E17, E18 e E19. E15 (uma rolagem
  até o alto depois de salvar) não feria AC nenhum.
- **Gate:** verde, com 2.087 unitários, 406 de integração e 247 e2e.
- **Lições:** L-062 a L-066, candidatas; L-055 passou a `confirmed`.
- **Decisões do dono em 2026-10-31**, depois do relatório:
  - G1: "Aceitar a quebra" (saída A). Abaixo de 768 px, a linha de baixo quebra quando não cabe.
  - G4: "Nunca rolar de lado", "sim" às duas perguntas. Nenhuma rolagem lateral em largura nenhuma
    a partir de 400 px, e a palavra mais larga que a coluna quebra no meio.
  - E15: "Sim, como em Todo mês". A tela fica parada ao salvar, e isso virou um AC novo.
- **Fix Plans 1 a 5** viraram as tasks F1 a F5, e E15 virou a F6.
