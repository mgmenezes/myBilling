# Lançamentos em lista densa — Validação

## Validation: lancamentos-densos (rodada 5, focada) — **PASS**

**Result**: PASS ✅ — rodada 5, focada (2026-10-31, `e39eeae`).

O veredito combina a rodada 4 (`33c9567`), que valeu para tudo o mais, com esta conferência focada
na única lacuna dela, **por escolha do dono em 2026-10-31**: "corrigir e conferir só isso". Não foi
uma rodada inteira. O que a rodada 4 provou fora do DENS-01 AC 5 não foi refeito, e a diferença entre
`33c9567` e `e39eeae` só toca `e2e/` e `.specs/`, como a Rodada 5 abaixo mostra.

- **Lacuna da rodada 4 (Minor), fechada:** o DENS-01 AC 5 agora tem caso em 768 px, a ponta antiga da
  faixa "de 768 a 1.279 px" (`e2e/lancamentos-densos.spec.ts:321-332`). G1 (`md:items-end` →
  `lg:items-end`) morre nele, e mais dois mutantes da ponta de 768 px também.
- **Gate deste escopo:** `typecheck` 0, `lint` 0, `lancamentos-densos.spec.ts` 23 de 23.
- **Sensor:** 3 mutantes, 3 mortos, todos em 768 px.

A seção "Rodada 4" abaixo guarda o relatório que o veredito ainda usa, com as lacunas dela marcadas
como fechadas.

---

## Rodada 5 (focada, 2026-10-31, `e39eeae`)

**Verificador**: sub-agente independente da rodada 5 (autor ≠ verificador). No worktree real,
escreveu só este arquivo. O sensor rodou numa `git worktree` descartável em `e39eeae`, no scratchpad,
com `pnpm install --offline --frozen-lockfile` próprio (um symlink de `node_modules` é recusado pelo
Turbopack). A worktree foi removida no fim. Sem `git stash`, sem commit.

### 1. Integridade

- `git diff --name-only 33c9567..e39eeae` toca só `.specs/` (`LESSONS.md`, `lessons.json`, `spec.md`,
  `tasks.md`, `validation.md`) e `e2e/lancamentos-densos.spec.ts`. **Nenhum arquivo de produção.**
- No teste, o diff é um hunk só (`:303-334`): o título e o comentário ganham o 768 px e a L-052, e o
  bloco de 1.279 px vira um laço sobre `[768, 1279]`.
- Nenhum teste foi removido, pulado ou afrouxado:
  - as assertions de 1.279 px são as mesmas de antes (`:326`, `:327-330`), só com a mensagem
    `${descricao} em ${largura} px`;
  - as de 1.280 px estão intactas (`:334-340`: `toBeLessThanOrEqual(valor.x + 1)`,
    `toBeLessThan(valor.y + valor.height)`, `toBeGreaterThan(valor.y)`);
  - nenhum `skip`, nenhum timeout mexido.
- `src/components/valor-confirmavel.tsx:70` é igual ao da rodada 4.

### 2. Spec-anchored

| Cláusula do AC | Resultado da spec | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| DENS-01 AC 5, "de 768 a 1.279 px, embaixo do valor", em 768 px | a previsão começa no pé do valor ou abaixo | `e2e/lancamentos-densos.spec.ts:326` - `expect(previsao.y, onde).toBeGreaterThanOrEqual(valor.y + valor.height)`, com `largura` 768, no Fixo A "confirmado · previa R$ 100,00" e no Fixo B "previsto" (`:314-317`) | ✅ PASS |
| "alinhado à direita com ele", em 768 px | a borda direita da previsão e a do valor a até 1 px | `:327-330` - `expect(Math.abs(previsao.x + previsao.width - (valor.x + valor.width)), onde).toBeLessThanOrEqual(1)` | ✅ PASS |
| as mesmas duas cláusulas em 1.279 px | idem | o mesmo laço, `largura` 1279 | ✅ PASS (sem mudança de assertion) |
| "a partir de 1.280 px, na mesma linha, à esquerda dele" | a previsão termina antes do começo do valor, na mesma altura | `:337-339` | ✅ PASS (intacto) |

O viewport começa em 768 px (`:319`) e o laço o refaz (`:322`), então a primeira medida é mesmo em
768 px, após `abrir()`. A medida lê as caixas do botão do valor e do texto da previsão
(`valorEPrevisao`, `:286-301`), as mesmas dos outros lados.

**O que ainda não está provado no AC 5:** nada que ele prometa.
- O AC não diz nada abaixo de 768 px: lá a lista é cartão (spec, edge case "Celular", e o cabeçalho
  do AC 5 "de 768 a 1.279 px"). Não há cláusula para provar.
- As larguras do meio da faixa (800, 1.023, 1.024, 1.100) não têm caso. A sonda H da rodada 4 as
  mediu e passaram, e os mutantes que mudam o meio da faixa (`lg:`) morrem nas duas pontas. O AC
  não pede ponto intermediário, e a classe é uma só, de 768 a 1.279 px: não há terceiro limiar.

### 3. Gate deste escopo, em `e39eeae`

| Comando | Saída |
| --- | --- |
| `pnpm typecheck` | exit 0 |
| `pnpm lint` | exit 0 |
| `pnpm exec playwright test e2e/lancamentos-densos.spec.ts` | exit 0, **23 de 23**, sem retry |

Logs em `scratchpad/verif-trc-r5/` (`typecheck.log`, `lint.log`, `e2e.log`). O gate completo da
rodada 4 (unit 1.705, integração 364, e2e 134 de 134, build) vale para `33c9567`, e `e39eeae` não
mudou produção.

### 4. Sensor de discriminação

Profundidade: leve, focada. Cada mutante entrou sozinho no worktree descartável, na linha 70 de
`src/components/valor-confirmavel.tsx`, e saiu com `git checkout`. A linha de base do mesmo worktree,
sem mutante, passou antes (`-g "em 768 e 1.279"`, exit 0).

| # | `file:line` | Mutação | Morto por |
| --- | --- | --- | --- |
| G1 | `src/components/valor-confirmavel.tsx:70` | `md:items-end` → `lg:items-end` | ✅ e2e `:329-330`, "Fixo A em 768 px": esperado ≤ 1, recebido 115,9375 |
| M2 | `valor-confirmavel.tsx:70` | sem `md:items-end` (o `items-start` vale em toda a faixa) | ✅ e2e `:329-330`, "Fixo A em 768 px": 115,9375 |
| M3 | `valor-confirmavel.tsx:70` | `md:items-end` → `min-[800px]:items-end`: o alinhamento começa 32 px acima de 768 px | ✅ e2e `:329-330`, "Fixo A em 768 px": 115,9375 |

**Resultado**: 3 de 3 mortos, todos na assertion de 768 px (a mensagem diz "em 768 px"). Os três
passariam antes na rodada 4 (G1 era o vivo). **PASS ✅**

**Isolamento**: `git status --porcelain` do worktree real, antes e depois: ` M next-env.d.ts`. A
worktree descartável foi removida (`git worktree list` sem ela).

### 5. Veredito

O DENS-01 AC 5 tem prova nas duas pontas da faixa e em 1.280 px, para os dois textos. A lacuna da
rodada 4 está fechada, e nenhuma lacuna nova apareceu. Nenhum mutante vivo, então nenhuma lição
nova. L-052 (registrada na rodada 4) foi aplicada pela F13 e funcionou: G1 agora morre.

---

## Rodada 4 (2026-10-31, `33c9567`): FAIL, uma lacuna, fechada pela F13 na rodada 5

O relatório abaixo é o da rodada 4, mantido porque o veredito ainda se apoia nele para tudo fora do
DENS-01 AC 5. O texto do veredito dela vai marcado como histórico.

*(Histórico)* Veredito da rodada 4: reprovado ❌ — rodada 4 (2026-10-31, `33c9567`). O dono autorizou esta rodada
além das três do processo. A lacuna vai ao dono. **Fechada** pela F13 (`e39eeae`) e conferida na
rodada 5.

As três lacunas da rodada 3 estão fechadas:
- **Lacuna 1 (Major), a tabela Fixos fora da coluna em 1.024 px:** a F9 (`5479bcd`) leva a previsão
  do fixo para a linha do valor só a partir de 1.280 px, como o dono decidiu.
  - O teste novo do LST-05 AC 3 com o fixo confirmado (`e2e/lancamentos-densos.spec.ts:344-369`)
    passa na HEAD e mata o código de antes da F9 (Fixos termina em 1.091,8 px, contra ≤ 1.000,5).
  - O teste do limiar (`:310-336`) prova 1.279 e 1.280 px e mata as variantes `lg:` e `2xl:`. A
    variante `min-[1281px]:` morre antes, na altura da linha em 1.280 px (`:212`).
  - A sonda I mede a tabela dentro da coluna em 1.024, 1.100, 1.200, 1.279, 1.280, 1.440 e
    1.535 px.
- **Lacuna 2 (Minor), "com o resumo":** a F10 (`e6fc71c`) mede o resumo inteiro na tela e dentro da
  faixa do título (`:688`, `:691-692`). F3 morre em `:688`.
- **Lacuna 3 (Minor), confirmação armada e clique fora:** a F11 (`e78433c`) junta os dois estados,
  sem foco (`src/components/menu-da-linha.test.tsx:109-122`). F6 morre em `menu-da-linha.test.tsx:120`.

O gate está verde:
- unit 1.705, integração 364, e2e 134 de 134, sem retry, sem `flaky` e sem `skip`;
- `typecheck`, `lint` e `build` passam.

O veredito é FAIL por **uma lacuna Minor**, nova, que a emenda do DENS-01 AC 5 trouxe:

1. **Minor: DENS-01 AC 5, "de 768 a 1.279 px, embaixo do valor e alinhado à direita com ele".**
   - O código liga o alinhamento à direita em 768 px (`md:items-end`,
     `src/components/valor-confirmavel.tsx:70`). A única prova da faixa está em 1.279 px (`:322-326`).
   - O mutante G1 (`md:items-end` → `lg:items-end`) passa na suíte inteira: unit 1.705 de 1.705,
     e2e 134 de 134.
   - Com G1, de 768 a 1.023 px, o valor e a previsão vão para a esquerda da célula. Em 768 px, a
     previsão do Fixo A termina 115,9 px à direita do valor, e o valor do Fixo B termina em 858,5 px,
     e não em 983,3 px como os outros da coluna (sonda H).
   - Na HEAD, o código cumpre o AC em 768, 800, 1.023, 1.024, 1.100 e 1.279 px (sonda H). Falta o
     teste.

Dos 17 mutantes desta rodada:
- 14 morrem;
- G1 vive e é a lacuna acima;
- G17 e C1b vivem e ficam como observação: nenhum critério pede o que eles quebram.

**Data**: 2026-10-31
**Spec**: `.specs/features/lancamentos-densos/spec.md` (DENS-01 a DENS-04, 23 critérios, 7 edge cases;
DENS-02 AC 1 emendado pelo dono em 2026-10-30; DENS-01 AC 5 emendado pelo dono em 2026-10-31;
TOQUE-01 AC 1 anotado como substituído em parte)
**Faixa do diff**:
- a fatia inteira é `b42f9b6..33c9567`;
- as tasks T1 a T6 são `b42f9b6..514ab25`;
- as correções F1 a F7 da rodada 1 são `514ab25..12ef0ca`;
- o relatório da rodada 2 e a F8 são `9ca13cb` e `92139e2`;
- o relatório da rodada 3 e as correções F9 a F12 são `7097e11..33c9567`.

A F9 é a única mudança de produção desde a rodada 3. No `ValorConfirmavel` fechado, o `span` passou de
`md:flex-row-reverse md:items-baseline md:justify-start md:gap-2` para
`md:items-end xl:flex-row-reverse xl:items-baseline xl:justify-start xl:gap-2`. O `md:items-end` é o
alinhamento de antes da fatia, como o comentário e o `design.md` explicam.

**Verificador**: sub-agente independente da rodada 4 (autor ≠ verificador). Leu código e testes sem
mudá-los. No worktree real, escreveu só este arquivo e os de lições.

- **Onde rodaram o gate, as mutações e as sondas:** numa `git worktree` descartável, detached em
  `33c9567`, no scratchpad da sessão, com `pnpm install --frozen-lockfile` próprio.
  - Cada mutante entrou sozinho, por uma troca de texto exata que tinha de casar o número esperado de
    vezes, e saiu com `git checkout -- src`.
  - As sondas viveram num `e2e/sonda-r4.spec.ts` fora do repositório. Foram copiadas para a worktree
    descartável só durante a sonda e apagadas em seguida.
  - Nenhuma corrida que decide "morto" ou "vivo" incluiu uma sonda.
  - No fim, a worktree foi removida.
- **Isolamento:** o `git status --porcelain` do worktree real era ` M next-env.d.ts` antes e depois do
  sensor, o mesmo do começo da sessão. Não houve `git stash`, e nada foi commitado.
- **Banco:** o de teste da sessão, só desta verificação.

---

## Rodada 1 (2026-10-30, `514ab25`): FAIL, cinco lacunas, fechadas

O gate estava verde (unit 1.703, e2e 125), e 13 de 17 mutantes morriam. As lacunas:
1. o "⋯" fora do lugar que o AC pedia (DENS-02 AC 1). O dono confirmou o lugar ao lado do selo (F1);
2. 44 px com ponteiro grosso acima de 768 px, sem prova (DENS-02 AC 7). Fechada pela F2, com
   `hasTouch` em 1.920 px;
3. a descrição longa sem caso (edge case). Fechada pela F3, com o Item C;
4. a coluna presa e a barra compacta só em 1.920 px (DENS-03 ACs 2 e 6). Fechada pela F4, com
   1.536 × 480 e 1.535 × 480;
5. o clique fora provado só com o foco dentro (DENS-02 AC 5). Fechada pela F5, com `pointerdown` sem
   foco.

A F6 e a F7 fecharam duas observações: o foco dentro do menu antes do `Escape` e os textos que ficaram
para trás. M11, M12, M13 e M17 morreram ao ser reaplicados na rodada 2.

## Rodada 2 (2026-10-30, `12ef0ca`): FAIL, uma lacuna, fechada

O lado de baixo do limiar de 768 px dos alvos de 44 px (DENS-02 AC 7) só era medido em 400 px, e N11 e
N11b (alvos densos já a partir de 640 px) passavam na suíte inteira. A F8 (`92139e2`) mede em 767 px,
com ponteiro fino (`e2e/lancamentos-densos.spec.ts:499-525`). N11 e N11b morreram ao ser reaplicados na
rodada 3.

## Rodada 3 (2026-10-31, `92139e2`): FAIL, três lacunas, fechadas

1. **Major:** com um fixo confirmado, a previsão na mesma linha do valor levava a tabela Fixos a
   1.091,8 px em 1.024 px, fora da coluna (1.000 px), e a página rolava 68 px de lado (LST-05 AC 3).
   O dono escolheu o caminho A: a previsão na linha do valor só a partir de 1.280 px (F9, `5479bcd`).
2. **Minor:** a cláusula "com o resumo" do DENS-04 AC 1 sem assertion (F3 vivo). Fechada pela F10
   (`e6fc71c`).
3. **Minor:** o edge case "confirmação aberta e clique fora" sem caso (F6 vivo). Fechado pela F11
   (`e78433c`).

A F12 (`33c9567`) fechou as observações 4 e 10: o TOQUE-01 AC 1 anotado como substituído em parte, e a
espera da página antes de medir em `e2e/lista-enxuta.spec.ts:413-415`.

---

## Task Completion

| Task | Commit | Status | Notas |
| --- | --- | --- | --- |
| T1 parcela curta | `de84baa` | ✅ Done | Texto e lugar provados na composição |
| T2 linha baixa | `4349d77` | ✅ Done | ≤ 48 px provado em 1.280, 1.536 e 1.920 px; G2 (+2 px de respiro) morre com 48,5 px |
| T3 excluir no menu | `b967cb6` | ✅ Done | Lugar, toque, `Escape`, clique fora, limiar de 768 px e o edge case da confirmação armada |
| T4 coluna de filtros | `7f029ad` | ✅ Done | Limiar de 1.536 px dos dois lados; G20 (a grade só a partir de 1.537 px) morre |
| T5 títulos presos | `284cbb1` | ✅ Done | Título e resumo presos; G18 e G19 morrem |
| T6 decisão registrada | `514ab25` | ✅ Done | AD-020 diz o mesmo que a spec emendada |
| F1 a F8 | `d0c67cb`…`92139e2` | ✅ Done | Os testes que mataram os mutantes delas não mudaram, nem o código que eles tocam. Nesta rodada não foram reaplicados; G9, primo do M12, morre |
| F9 previsão a partir de 1.280 px | `5479bcd` | ⚠️ Partial | 1.279 e 1.280 px colados, e o LST-05 AC 3 com o fixo confirmado. A ponta de 768 px da faixa "de 768 a 1.279 px" não tem caso (Lacuna 1) |
| F10 resumo preso | `e6fc71c` | ✅ Done | F3 morre em `:688` |
| F11 confirmação armada e clique fora | `e78433c` | ✅ Done | F6 morre em `menu-da-linha.test.tsx:120` |
| F12 TOQUE-01 AC 1 e a espera | `33c9567` | ✅ Done | Nota de substituição na spec, no AD-020 e em TOQUE-01; nenhuma assertion mudou |

`check_commit.py` dá OK nas mensagens de `5479bcd`, `e6fc71c`, `e78433c` e `33c9567`.

---

## Spec-Anchored Acceptance Criteria

Toda medida de layout é de caixa (`boundingBox`, `getBoundingClientRect`) ou de estilo computado:
- no Chrome do projeto, a 1.280 × 720 com ponteiro fino;
- salvo onde o teste muda a janela ou o ponteiro.

As linhas citadas são as da `33c9567`. `:N` sozinho é `e2e/lancamentos-densos.spec.ts`. Numa lista, o
`:N` que vem depois de um arquivo citado é desse arquivo, até o próximo ponto e vírgula.

### Os limiares, dos dois lados

| Limiar | AC que o diz | Lado de baixo | Lado de cima | Juízo |
| --- | --- | --- | --- | --- |
| 768 px, alvos | DENS-02 AC 7: "abaixo de 768 px ou com ponteiro grosso", ≥ 44 × 44 | 767 px, ponteiro fino: `:521-522`. Também 400 px: `e2e/acessibilidade.spec.ts:138-139` | Com ponteiro fino a partir de 768 px, o AC não pede nada. Ponteiro grosso em 1.920 px: `:488-489` | ✅ Colado no lado que o AC promete |
| 768 px, previsão | DENS-01 AC 5: "de 768 a 1.279 px, embaixo do valor e alinhado à direita com ele" | Abaixo de 768 px é o cartão, fora de escopo | **Sem caso.** A faixa só é medida em 1.279 px (`:322-326`) | ❌ Lacuna 1. G1 vive |
| 1.280 px, linha | DENS-01 AC 1: "a partir de 1.280 px com ponteiro fino", ≤ 48 px | A spec não promete altura abaixo de 1.280 px | 1.280 px: `:212` | ✅ Colado no lado prometido. G2, F9-2xl e F9+1 morrem em `:212` |
| 1.280 px, previsão | DENS-01 AC 5: na linha do valor "a partir de 1.280 px"; embaixo até 1.279 px | 1.279 px: `:322`, `:323-326` | 1.280 px: `:332`, `:333-334` | ✅ Dos dois lados. F9lg morre em `:322`; F9-2xl, em `:332` |
| 1.536 px | DENS-03 ACs 1, 2, 5, 6 e 8; DENS-04 AC 1 | 1.535 px: `:648`, `:635-636`, `:697` | 1.536 px: `:653`, `:619-620`, `:681`, `:688`; o `:212` também roda em 1.536 px | ✅ Dos dois lados. G19 e G20 (um pixel acima) morrem |

### DENS-01: uma linha por lançamento

| Critério | Resultado da spec | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| AC 1: a partir de 1.280 px com ponteiro fino, toda linha ≤ 48 px, inclusive parcela, fixo confirmado e vencido | as seis linhas curtas ≤ 48 px em 1.280, 1.536 e 1.920 px | `:210` - `expect(curtas).toHaveLength(6)`; `:212` - `expect(altura, nome).toBeLessThanOrEqual(48)` em 1.280 e 1.536 px; `:231-233` (parcela, "confirmado · previa" e "Vencido" na tela) e `:239` em 1.920 px | ✅ PASS. G2 (`py-1.5`) morre em `:212` com 48,5 px: a prova tem a precisão do limite |
| AC 2: a parcela logo depois da descrição, na mesma célula, menor e apagada: "2/4 · faltam 2" e "4/4 · última" | primeiro nó = descrição; textos exatos; na altura da descrição a partir de 1.280 px | `src/components/texto-da-parcela.test.ts:10`, `:14`, `:18`; `src/components/tabela-lancamentos.test.tsx:48` - `celula.firstChild?.textContent).toBe(descricao)`, `:55-56` (classes), `:420` - `toBe("2/4 · faltam 2")`, `:421` (`tabular`), `:428` - `toBe("4/4 · última")`, `:435`; pela página: `:205`, `e2e/compra-parcelada.spec.ts:176`, `:182`, `e2e/lista-enxuta.spec.ts:461`, `:479-480` | ✅ PASS. "Menor e apagado" é provado pela classe (observação 7) |
| AC 3: selo "Pago"/"Previsto" que alterna o pagamento, com o mesmo nome | `aria-pressed` `false` → `true` → `false`, nome `/^Previsto\s*, Item B/` | `:272`, `:275`, `:278-281` | ✅ PASS |
| AC 4: "Vencido" ao lado do selo | à direita do selo, na mesma faixa | `:269` - `vencido.x >= caixaDoSelo.x + caixaDoSelo.width`; `:270` | ✅ PASS |
| AC 5: a partir de 1.280 px, na linha do valor e à esquerda dele; de 768 a 1.279 px, embaixo do valor e alinhado à direita com ele | três cláusulas: na linha a partir de 1.280 px; embaixo até 1.279 px; alinhado à direita de 768 a 1.279 px | 1.280 px: `:332` - `previsao.x + previsao.width <= valor.x + 1`, `:333-334`; 1.920 px: `:255-257`; 1.279 px: `:322` - `previsao.y >= valor.y + valor.height`, `:323-326` - `Math.abs(fim da previsão - fim do valor) <= 1`. Os dois textos, nos dois fixos | ❌ GAP parcial (Lacuna 1). O limiar de 1.280 px está colado dos dois lados. A ponta de 768 px não tem caso: G1 vive na suíte inteira |
| AC 6: as cinco colunas e o seletor de hoje | cabeçalhos exatos; TRC sem mudança | `:402-408` em 1.920 px; `e2e/lista-enxuta.spec.ts:482-484` em 1.024, 1.280 e 1.440 px; `e2e/trocar-categoria.spec.ts` verde | ✅ PASS |

#### O DENS-01 AC 5 emendado, nos quatro lugares

| Onde | O que diz | Juízo |
| --- | --- | --- |
| `spec.md`, AC 5 e a premissa "Valor confirmável do fixo" | na linha do valor a partir de 1.280 px; de 768 a 1.279 px, embaixo e alinhado à direita, como antes; o dono confirmou em 2026-10-31, com o motivo (1.092 px contra 1.000 px em 1.024 px) | ✅ |
| `spec.md`, edge case "Entre 768 px e 1.536 px" | entre 768 e 1.280 px, a previsão do fixo fica embaixo do valor (DENS-01, AC 5) | ✅ |
| `design.md`, "A linha" e a tabela do e2e novo | `xl:flex-row-reverse xl:items-baseline xl:gap-2` a partir de 1.280 px; `md:items-end` de 768 a 1.279 px; o limiar medido em 1.279 e 1.280 px | ✅ |
| `STATE.md`, AD-020 | na linha do valor só a partir de 1.280 px; de 768 a 1.279 px, embaixo, como antes, com a data | ✅ |
| `src/components/valor-confirmavel.tsx:64-70` | o comentário e as classes dizem o mesmo | ✅ |

### O AC de outra fatia que esta mantém

| Critério | Resultado da spec | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| LST-05 AC 3: em 1.024, 1.280 e 1.440 px, nenhuma tabela mais larga que a coluna de conteúdo | o começo e o fim de cada tabela dentro do cartão de filtros, **com o fixo confirmado na tela**, e nenhuma rolagem lateral | `:350` (o Fixo A confirmado à vista); `:356` (4 tabelas); `:360`; `:361-363` - `medida.x + medida.width <= coluna.x + coluna.width + 0.5`; `:368` - `expect(transbordo).toBe(0)`; sem fixo confirmado, `e2e/lista-enxuta.spec.ts:430-435` | ✅ PASS. O código de antes da F9 morre em `:361` (1.091,8 px). Sonda I: as quatro tabelas cabem também em 1.100, 1.200, 1.279 e 1.535 px |

### DENS-02: excluir no menu da linha

| Critério | Resultado da spec | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| AC 1: na célula da Situação de cada avulso, logo depois do selo e do "Vencido", o "⋯" "Mais ações para <descrição>" | o "⋯" com esse nome dentro da 4ª célula, à direita do selo e de "Vencido", inclusive na receita avulsa | `:381-383` - `toBeVisible()` em Entrada A, Item A e Item B; `:402-408` (a 4ª coluna é "Situação"); `:415-418` (dentro da célula); `:419` - `menu.x >= selo.x + selo.width`; `:427`; `src/components/menu-da-linha.test.tsx:34`, `:41`; `src/components/tabela-lancamentos.test.tsx:784-785` (receita avulsa) | ✅ PASS, com a consulta presa à linha e à célula (L-018). G21 (sem "⋯" na receita) morre em `tabela-lancamentos.test.tsx:784` e em `:383` |
| AC 2: sem "⋯" na parcela e no fixo | zero "⋯" | `:386` - `toHaveCount(0)` em Fixo A, Fixo B e Compra A; `src/components/tabela-lancamentos.test.tsx:745`, `:765`; `e2e/lancamento-avulso.spec.ts:296` | ✅ PASS |
| AC 3: o "⋯" abre o menu com "Excluir" | `aria-expanded="true"` e o botão "Excluir, <descrição>" | `src/components/menu-da-linha.test.tsx:50-51`; `:441`, `:444-446` | ✅ PASS |
| AC 4: dois toques, e então exclui como hoje | 1º toque não exclui; 2º exclui o lançamento certo; a linha some e o bloco cai de "3 · R$ 60,00" para "2 · R$ 40,00" | `src/components/menu-da-linha.test.tsx:59`, `:63` - `toHaveBeenCalledWith("l-1")`; `:436`, `:453`, `:456`, `:457`; `e2e/lancamento-avulso.spec.ts:263` | ✅ PASS. G6 (o id errado) morre em `menu-da-linha.test.tsx:63`, em `:456` e em `lancamento-avulso.spec.ts:263` |
| AC 5: `Escape` ou clique fora fecham; no `Escape`, o foco volta ao "⋯" | `aria-expanded="false"`, painel fora, foco no "⋯" | `src/components/menu-da-linha.test.tsx:73-75`, `:84-85`, `:98-101`, `:116-121`; `:445-449` | ✅ PASS |
| AC 6: nenhum "Excluir" fora do menu, em nenhuma largura | zero "Excluir" com o menu fechado | `:388` - `page.getByRole("button", { name: /^Excluir/ })).toHaveCount(0)`; `src/components/menu-da-linha.test.tsx:42`; `src/components/tabela-lancamentos.test.tsx:714` | ✅ PASS. Fechado, o "Excluir" não existe no DOM, em largura nenhuma |
| AC 7: abaixo de 768 px ou com ponteiro grosso, "⋯" e "Excluir" ≥ 44 × 44 | ≥ 44 nos dois casos, colado no limiar | 767 px fino: `:506`, `:521-522`; 400 px: `e2e/acessibilidade.spec.ts:138-139`; 1.920 px com toque: `:473`, `:488-489` | ✅ PASS. G9 (`min-w-10`) morre em `acessibilidade.spec.ts:138` e em `:488`, com 40 px |

### DENS-03: filtros numa coluna à direita

| Critério | Resultado da spec | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| AC 1: a partir de 1.536 px, coluna à direita, com linha fina, busca, categorias com total, situação, meio e pessoa | coluna à direita; `border-left` 1px sólido; os cinco controles no `search` da coluna | `:542` - `coluna.x >= entradas.x + entradas.width`; `:550` - `toEqual({ largura: "1px", tipo: "solid" })`; `:553-557`; em 1.536 px, `:653` | ✅ PASS |
| AC 2: rolando a partir de 1.536 px, a coluna à vista | a busca da coluna na tela depois de rolar até o fim | `:619` - `toBeInViewport()` em 1.536 e 1.920 × 480; `:635` - `not.toBeInViewport()` em 1.535 × 480 | ✅ PASS. G17 vive, sem quebrar critério (observação 1) |
| AC 3: contagem e total no alto da coluna | o `status`, que traz a contagem e o total, acima da busca | `:560` - `contagem.y + contagem.height <= busca.y` | ✅ PASS |
| AC 4: os chips de hoje, quebrando na largura da coluna | o chip dentro da coluna; escolher marca `aria-pressed` | `:571-572`; `:576-579` | ✅ PASS. A quebra e o "+N" na coluna não são exercitados com uma categoria só (observação 8) |
| AC 5: abaixo de 1.536 px, filtros no topo | o cartão acima da lista em 1.535 px | `:648`; o outro lado em `:653` | ✅ PASS |
| AC 6: a partir de 1.536 px, sem barra compacta | zero barra a partir de 1.536 px; a barra aparece em 1.535 px | `:620`; `:631`, `:636` | ✅ PASS |
| AC 7: mesmos parâmetros e resultados | `categoriaId=` na URL e a entrada fora da lista | `:575`, `:580`; `e2e/busca-e-filtros.spec.ts`, `e2e/lista-enxuta.spec.ts` e `e2e/categorias.spec.ts` verdes e sem mudança | ✅ PASS |
| AC 8: a partir de 1.536 px, lista ≤ 1.100 px, centrada | largura ≤ 1.100; folgas iguais | `:591` - `lista.width <= 1100`; `:594` - `Math.abs(folgaEsquerda - folgaDireita) <= 1` | ✅ PASS. Mede a região "Entradas" (observação 9) |

### DENS-04: títulos dos blocos presos ao rolar

| Critério | Resultado da spec | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| AC 1: a partir de 1.536 px, o título do bloco, com o resumo, preso no alto enquanto as linhas passam | título em y ≈ 0 com "Fixo B" na tela, e o resumo inteiro na faixa do título, em 1.536 px; título solto em 1.535 px | `:681` - `Math.abs((await caixa(titulo)).y)).toBeLessThanOrEqual(1)`; `:682`; `:688` - `toBeInViewport({ ratio: 1 })` no resumo "2 · R$ 155,00 · 2 a pagar"; `:691-692` (topo e pé do resumo na faixa do título); `:697` - `toBeLessThan(-1)` em 1.535 px | ✅ PASS. As duas cláusulas têm assertion (L-010). F3 morre em `:688`; G18 (`top-12`) e G19 (um pixel acima) morrem em `:681` |
| AC 2: recolher e expandir, com a escolha guardada | `aria-expanded` alterna, as linhas somem e voltam, o cookie é gravado e lido | `:708-709`, `:712-713`; `src/components/tabela-lancamentos.test.tsx:1063-1093`; `e2e/lista-enxuta.spec.ts:335-348` (LST-02, sem mudança) | ✅ PASS |

**Status**: ❌ uma lacuna. 22 dos 23 critérios têm assertion que discrimina o resultado da spec. O
DENS-01 AC 5 tem prova em 1.279, 1.280 e 1.920 px, mas não na ponta de 768 px da faixa "de 768 a
1.279 px" (Lacuna 1). Há ainda uma lacuna de precisão na spec, num edge case (abaixo).

---

## Edge Cases

- [x] **Bloco recolhido: o título continua no lugar.** `:707-713`; LST-02 em
  `e2e/lista-enxuta.spec.ts:335-348`.
- [x] **Vencido e pago ao mesmo tempo não existe.**
  `src/components/tabela-lancamentos.test.tsx:841-842`.
- [x] **Descrição longa: quebra linha, e só aquela linha cresce.** `:212` e `:217` em 1.280 e 1.536 px;
  `:239` e `:243` em 1.920 px. Na HEAD, a longa mede 76 px, e as curtas, de 40 a 45 px (sonda I).
- [x] **Confirmação aberta e clique fora: o menu fecha e a confirmação se desfaz.**
  `src/components/menu-da-linha.test.tsx:109-122`: sem foco, como no Safari, arma (linha 113), clica
  fora (117), reabre e acha "Excluir, Almoço" (120) e nenhum "Confirmar" (121). F6 morre na linha 120.
- [ ] **Entre 768 e 1.536 px: linhas densas, filtros no topo, barra compacta, títulos soltos e a
  previsão embaixo do valor.**
  - Filtros no topo: `:648`. Barra compacta: `:636`. Títulos soltos: `:697`. Todos em 1.535 px.
  - A previsão embaixo do valor: provada só em 1.279 px (`:322-326`), a mesma Lacuna 1.
  - A tabela dentro da coluna em 1.024 px, com o fixo confirmado: `:361`, `:368`.
  - ⚠️ **Lacuna de precisão na spec, já registrada na rodada 3 (L-031):** "linhas densas" não tem
    número abaixo de 1.280 px. A sonda I mediu na HEAD, com ponteiro fino (altura da linha, em px):

    | Janela | Entrada A | Fixo A e Fixo B | Compra A | Item A | Item B (vencido) | A longa |
    | --- | --- | --- | --- | --- | --- | --- |
    | 768 e 800 px | 80 | 74,5 | 75,5 | 80,5 | 115 | 323,5 |
    | 1.024 px | 40 | 74,5 | 74 | 80,5 | 115 | 143,5 |
    | 1.100 px | 40 | 51 | 44 | 44,5 | 115 | 98,5 |
    | 1.200 e 1.279 px | 40 | 51 | 44 | 44,5 | 81 | 76 |
    | 1.280 a 1.535 px | 40 | 44,5 | 44 | 44,5 | 45 | 76 |

  - De 1.100 a 1.279 px, os fixos medem 51 px, e não 44,5 px como na rodada 3: é a previsão embaixo do
    valor, que o dono escolheu. Nenhum AC promete altura abaixo de 1.280 px. Isso não pesa no
    veredito.
- [x] **Valor do fixo em edição ocupa mais de uma linha.** O ramo aberto do `ValorConfirmavel`
  (`src/components/valor-confirmavel.tsx:91-138`) não mudou, e `valor-confirmavel.test.tsx` está verde.
- [x] **Erro ao trocar a categoria cresce a linha.** O seletor não mudou, e
  `e2e/trocar-categoria.spec.ts` está verde.

---

## Gate Check

Na HEAD `33c9567`, na worktree descartável limpa, com `DATABASE_URL_TEST` no banco de teste da
sessão. Comandos: `pnpm verify` e, depois, `pnpm exec playwright test`.

| Comando | Resultado |
| --- | --- |
| `pnpm typecheck` | exit 0 |
| `pnpm lint` | 317 arquivos, nada a corrigir |
| `pnpm test:unit` | 109 arquivos, **1.705 de 1.705**; `src/domain` com 100% de branches (355/355) |
| `pnpm test:integration` | 23 arquivos, **364 de 364** |
| `pnpm build` | compilou |
| `pnpm exec playwright test` | **134 de 134** em 8,0 min, sem retry, sem `flaky` e sem `skip` |

**Contagem**:

| Momento | Unit | e2e |
| --- | --- | --- |
| Antes da fatia (`b42f9b6`) | 1.694 | 111 |
| Rodada 1 (`514ab25`) | 1.703 | 125 |
| Rodada 2 (`12ef0ca`) | 1.704 | 129 |
| Rodada 3 (`92139e2`) | 1.704 | 130 |
| HEAD (`33c9567`) | 1.705 | 134 |

A diferença desde a rodada 3: o unit da F11 e quatro e2e da F9 (o limiar de 1.279 e 1.280 px e o
LST-05 AC 3 em 1.024, 1.280 e 1.440 px). A F10 acrescenta assertions a um teste que já existia.

**Integridade dos testes**: na faixa `7097e11..33c9567`, nenhuma linha de teste sai, e nenhum teste é
pulado, ganha `only` ou `fixme`, ou perde assertion. A F12 só acrescenta a espera do título antes de
medir (`e2e/lista-enxuta.spec.ts:413-415`).

**Carga da máquina**: durante o sensor, a carga média passou de 25 (outras sessões). Testes unitários
sem relação com a fatia estouraram o tempo de 5 s nas corridas de G21 e na primeira de C1b. Nenhum
deles decide morto ou vivo:
- o teste que mata G21 falha em 174 ms, por não achar o "⋯";
- C1b, rodado de novo com a carga menor, deu 1.705 de 1.705;
- o gate da HEAD rodou com 1.705 de 1.705.

---

## Discrimination Sensor

**Profundidade**: ampliada (P1 de interface), com 17 mutantes de comportamento, um por vez:
- os três vivos da rodada 3, F2, F3 e F6, na forma da rodada 3;
- o código de antes da F9 e três variantes dela;
- dez novos, G1, G2, G6, G9, G17 a G21 e C1b, nos quatro requisitos.

**Como rodaram**:
- **Unit:** `pnpm exec vitest run --project domain --project componentes`.
- **e2e:** `pnpm exec playwright test --retries=0 <specs>`, primeiro nos arquivos da fatia.
- `lancamentos-densos.spec.ts` é `serial`: "morto por" cita o primeiro teste que falha e a assertion.
  Onde o primeiro a falhar não era o teste novo, o teste novo rodou sozinho (`-g`) contra o mesmo
  mutante.
- **Vivos:** G1, G17 e C1b rodaram de novo, cada um sozinho, no e2e inteiro: 134 de 134 nos três. G1
  e C1b rodaram também no unit inteiro.

| # | `file:line` | Mutação | Morto por |
| --- | --- | --- | --- |
| F2 (rodada 3) | `src/components/valor-confirmavel.tsx:70` | sem `md:items-end`: a F9 sem o alinhamento de antes da fatia | ✅ e2e `:310`, assertion de `:323-326`: em 1.279 px, a previsão do Fixo A termina 115,9 px à direita do valor |
| F9↩ | `valor-confirmavel.tsx:70` | o código de antes da F9 (`md:flex-row-reverse md:items-baseline md:justify-start md:gap-2`) | ✅ e2e `:310`, assertion de `:322`: a previsão em y = 795,75, acima do pé do valor (815,25). Sozinho, o teste do LST-05 mata também: `:345` em 1.024 px, assertion de `:361`, Fixos em 1.091,8 px (≤ 1.000,5) |
| F9-lg | `valor-confirmavel.tsx:70` | `xl:` → `lg:`: na linha do valor já a partir de 1.024 px | ✅ e2e `:310`, assertion de `:322` (795,75 contra ≥ 815,25) |
| F9-2xl | `valor-confirmavel.tsx:70` | `xl:` → `2xl:`: na linha do valor só a partir de 1.536 px | ✅ e2e `:200` em 1.280 px, assertion de `:212`: Fixo B com 51 px. Sozinho, o teste do limiar: `:332`, a previsão termina em 1.236, depois do começo do valor (1.148,5) |
| F9+1 | `valor-confirmavel.tsx:70` | `xl:` → `min-[1281px]:`: um pixel acima do limiar | ✅ e2e `:200`, assertion de `:212`: Fixo A com 51 px em 1.280 px |
| F3 (rodada 3) | `src/components/bloco-recolhivel.tsx:98` | o `span` do resumo sai da `div` presa | ✅ e2e `:673`, assertion de `:688`: `viewport ratio 0.81` |
| F6 (rodada 3) | `src/components/menu-da-linha.tsx:89-96` | o painel sempre montado, com `hidden={!aberto}` | ✅ unit `menu-da-linha.test.tsx:120`: reaberto, não há "Excluir, Almoço", porque o botão continua em "Confirmar?" |
| G1 | `valor-confirmavel.tsx:70` | `md:items-end` → `lg:items-end`: o alinhamento à direita só a partir de 1.024 px | ❌ **vivo** (unit 1.705; e2e 134 de 134) → Lacuna 1. A sonda H mata em 768 e em 1.023 px |
| G2 | `src/components/tabela-lancamentos.tsx:123` | `md:pointer-fine:py-1` → `py-1.5`: 2 px a mais em cima e embaixo | ✅ e2e `:200`, assertion de `:212`: Fixo B com 48,5 px em 1.280 px |
| G6 | `menu-da-linha.tsx:94` | o "Excluir" recebe o id do `useId`, e não o do lançamento | ✅ unit `menu-da-linha.test.tsx:63`; e2e `:430`, assertion de `:456` (Item A continua na lista); `e2e/lancamento-avulso.spec.ts:263` |
| G9 | `menu-da-linha.tsx:84` | `min-w-11` → `min-w-10`: o "⋯" com 40 px no toque e abaixo de 768 px | ✅ e2e `e2e/acessibilidade.spec.ts:138` (40 px em 400 px); `:469`, assertion de `:488` (40 px com toque) |
| G17 | `src/app/(app)/[competencia]/lancamentos/page.tsx:219` | sem `2xl:max-h-dvh` na coluna presa | ⚠️ **vivo** (e2e 134 de 134). Nenhum critério quebra (observação 1) |
| G18 | `bloco-recolhivel.tsx:80` | `2xl:top-0` → `2xl:top-12`: o título preso 48 px abaixo do alto | ✅ e2e `:673`, assertion de `:681`: y = 48 |
| G19 | `bloco-recolhivel.tsx:80` | `2xl:` → `min-[1537px]:`: o título preso um pixel acima do limiar | ✅ e2e `:673`, assertion de `:681`: y = 60 em 1.536 px |
| G20 | `page.tsx:199` | `2xl:grid-cols-[…]` → `min-[1537px]:grid-cols-[…]`: a grade de duas colunas um pixel acima do limiar | ✅ e2e `:200` em 1.536 px, assertion de `:212`: Compra A com 53 px |
| G21 | `tabela-lancamentos.tsx:363` | sem "⋯" na receita avulsa | ✅ unit `tabela-lancamentos.test.tsx:784`; e2e `:375`, assertion de `:383` (Entrada A) |
| C1b | `src/components/botao-pago.tsx:32` | `md:pointer-fine:min-h-8` → `lg:pointer-fine:min-h-8`: o selo com 44 px de 768 a 1.023 px | ⚠️ **vivo** (unit 1.705; e2e 134 de 134). Nenhum critério da fatia quebra (observação 2) |

**Resultado do sensor**: 17 aplicados, 14 mortos e 3 vivos.
- G1 quebra uma cláusula de critério: FAIL ❌.
- G17 e C1b não quebram critério nenhum.

### Sondas

`e2e/sonda-r4.spec.ts` copia a semeadura e os ajudantes de `lancamentos-densos.spec.ts`.

| Sonda | O que mede | HEAD | Com o mutante |
| --- | --- | --- | --- |
| H | em 768, 800, 1.023, 1.024, 1.100 e 1.279 px, no Fixo A e no Fixo B: a previsão embaixo do valor e a borda direita das duas a até 1 px | ✅ passa nas seis larguras, com 0 px de diferença. Em 768 px, o valor do Fixo A vai de 894,8 a 983,3, e a previsão de 778,8 a 983,3 | G1: falha em 768 e 1.023 px. Em 768 px, o valor do Fixo A vai de 778,8 a 867,4 (115,9 px antes do fim da previsão), e o do Fixo B termina em 858,5 |
| I | em 768, 800, 1.024, 1.100, 1.200, 1.279, 1.280, 1.440 e 1.535 px, com o Fixo A confirmado: o fim de cada tabela, o fim da coluna, a rolagem lateral e a altura das linhas | as quatro tabelas cabem de 1.024 a 1.535 px, sem rolagem lateral. Em 768 e 800 px, saem da coluna, e a página rola 227 e 195 px (observação 3). As alturas estão nas Edge Cases | — |
| K | em 1.536 × 480 e 1.920 × 480, antes de rolar, no meio e no fim: a caixa da coluna, a contagem e cada controle | a coluna fica em y = 0 com 480 px e rola por dentro. No fim, a contagem em 24 a 46, busca, chips, meio e pessoa à vista, e a Situação em 477 a 521, abaixo da dobra, alcançável rolando a coluna | G17: no fim, a coluna sobe para y = −65 com 545 px. Os cinco controles ficam à vista, e a contagem vai para −41 a −19, fora da tela |

---

## Interactive UAT

Não feita: o verificador é um sub-agente sem o dono na conversa.

---

## Code Quality

| Princípio | Status |
| --- | --- |
| Código mínimo | ✅ A F9 troca uma lista de classes e o comentário dela |
| Mudanças cirúrgicas | ✅ Só `valor-confirmavel.tsx` mudou em produção desde a rodada 3 |
| Sem escopo extra | ✅ |
| Segue os padrões | ✅ `abrir()`, `linha()`, `caixa()` e `cartao()` reaproveitados; `valorEPrevisao()` é o único ajudante novo, e serve aos dois lados do limiar |
| Resultados da spec nas assertions | ❌ O DENS-01 AC 5 não tem assertion na ponta de 768 px da faixa |
| Cobertura por camada | ✅ Domínio intocado, com 100% de branches |
| Todo teste mapeia um AC | ✅ Os testes novos citam DENS-01 AC 5, LST-05 AC 3, DENS-04 AC 1 e o edge case |
| Regras do projeto (`AGENTS.md`) | ✅ Sem dado real: "Fixo A", "Item C", R$ 100,00, `example.com`. Conventional Commits, uma correção por commit (`check_commit.py` OK). Sem mudança de banco |

---

## Fix Plans

O processo já passou das três rodadas. A lacuna vai ao dono, que decide se vira correção ou fica
registrada.

### Fix 1 (rodada 4): a previsão alinhada à direita desde 768 px (DENS-01 AC 5) — Minor

- **Causa**:
  - a emenda do AC 5 criou a faixa "de 768 a 1.279 px", com duas pontas;
  - a F9 provou a ponta de 1.279 e 1.280 px, mas não a de 768 px, onde o código liga o `md:items-end`;
  - a lista de limiares das Global Constraints do `tasks.md` só tem 768 px "para os alvos de 44 px".
- **Tarefa**:
  - no teste de `e2e/lancamentos-densos.spec.ts:310`, medir também em 768 px o bloco de 1.279 px
    (`:318-327`): a previsão embaixo do valor e a borda direita das duas a até 1 px, no Fixo A e no
    Fixo B;
  - não medir o fim da tabela em 768 px: as tabelas já saíam da coluna nessa largura antes da fatia
    (observação 3);
  - nas Global Constraints, a lista de limiares passa a ter 768 px também para a previsão do fixo.
- **Pronto quando**:
  - o caso de 768 px passa na HEAD;
  - G1 (`md:items-end` → `lg:items-end`) falha nele (sonda H: 115,9 px).

---

## Observações para o dono

Fora do veredito.

1. **G17: sem `2xl:max-h-dvh`, a coluna de filtros rola com a página no fim dela.**
   - Só acontece com a janela mais baixa que a coluna, que mede 545 px.
   - Em 480 px de altura, no fim da página, a coluna sobe 65 px, e a contagem e o total saem da tela.
     A busca e os outros controles continuam à vista (sonda K).
   - Na HEAD, a coluna fica inteira na tela e rola por dentro. A Situação fica abaixo da dobra até a
     pessoa rolar a coluna.
   - Nenhum AC diz que a contagem fica à vista ao rolar, nem fixa a altura da janela. O teste do AC 2
     olha a busca.
2. **C1b: a nota do TOQUE-01 AC 1 diz "a partir de 768 px, o selo tem 32 px", e nada mede isso.**
   - Com o selo em 44 px de 768 a 1.023 px, a suíte inteira passa.
   - Quem manda na altura é o DENS-01 AC 1, que só promete 48 px a partir de 1.280 px. A nota explica
     a substituição, e não pede uma medida.
   - É o mesmo caso do C1 da rodada 3, com o "⋯".
3. **De 768 a 800 px, as tabelas saem da coluna, como antes da fatia.** A página rola 227 px em 768 px
   e 195 px em 800 px (sonda I). O LST-05 AC 3 vale em 1.024, 1.280 e 1.440 px, e o TRES-01 AC 10, em
   400 px.
4. **"Linhas densas" entre 768 e 1.280 px continua sem número** (Edge Cases, L-031).
5. **C2: o celular com toque não é medido.** As duas condições do DENS-02 AC 7 estão provadas, cada uma
   sozinha.
6. **N5: o menu não tem teste de fechar quando o foco sai dele.** Nenhum critério pede isso.
7. **"Menor e apagado" (DENS-01 AC 2) é provado pelo nome da classe**, e não pelo estilo computado
   (L-037).
8. **Chips na coluna com uma categoria só.** A quebra e o "+N categorias" dentro dos 288 px não são
   exercitados a partir de 1.536 px.
9. **DENS-03 AC 8 mede a região "Entradas", com 1.052 px.** Um `max-w` de até ~1.148 px ainda passaria.
10. **"O dobro de linhas por tela" (Success Criteria) não é medido.** De 1.280 px para cima, a linha
    mede de 40 a 45 px, contra uns 65 px antes.
11. **`lancamentos-densos.spec.ts` continua `serial`.** Um defeito mostra só o primeiro critério
    quebrado: F9-2xl morre na altura da linha antes de chegar ao teste do limiar, que também o mata.

---

## Lições registradas

Pelo `lessons.py add`, com a fonte de cada sinal:

- **G1** (`surviving_mutant`): **L-052**, candidata nova. Uma faixa "de X a Y px" num AC traz dois
  limiares, e cada um precisa de caso colado nele. A lista que só procura "abaixo de" e "a partir de"
  deixa a ponta antiga da faixa provada longe dela.
- **⚠️ "linhas densas" sem número**: nenhuma lição nova. É o mesmo sinal da rodada 3, já registrado
  nesta fatia com a L-031.
- **G17 e C1b**: nenhuma lição. Nenhum critério pede o que eles quebram.

Situação das candidatas desta fatia:
- **L-049, L-050 e L-051**, aplicadas pelas F9, F10 e F11: F9↩, F3 e F6 morrem.
- **L-044 a L-048**, das rodadas 1 e 2: os testes que mataram os mutantes delas não mudaram, e G9,
  primo do M12, morre.
- Todas continuam candidatas. A recorrência conta fatias distintas, e esta é a mesma.
- **L-029** (confirmada) não foi penalizada. Ela foi carregada (Global Constraints, comentário de
  `:303-309`), e os limiares que a lista dela nomeia estão colados: 768 px para os alvos, 1.280 e
  1.536 px. A falha foi a lista não ganhar o 768 px da faixa nova do AC 5. É o assunto da L-048 e da
  L-052, e não da regra dos dois lados.

---

## Requirement Traceability Update

| Requisito | Rodada 1 | Rodada 2 | Rodada 3 | Rodada 4 | Rodada 5 (focada) |
| --- | --- | --- | --- | --- | --- |
| DENS-01 | ❌ Needs Fix | ✅ Verified | ❌ Needs Fix | ❌ Needs Fix (Fix 1: o AC 5 na ponta de 768 px) | ✅ Verified (rodada 5, focada, `e39eeae`) |
| DENS-02 | ❌ Needs Fix | ❌ Needs Fix | ❌ Needs Fix | ✅ Verified | ✅ Verified (rodada 4; não refeito) |
| DENS-03 | ❌ Needs Fix | ✅ Verified | ✅ Verified | ✅ Verified | ✅ Verified (rodada 4; não refeito) |
| DENS-04 | ✅ Verified | ✅ Verified | ❌ Needs Fix | ✅ Verified | ✅ Verified (rodada 4; não refeito) |

A `spec.md` não foi alterada pelo verificador.

---

## Summary

**Overall (rodada 5, focada)**: ✅ Ready. A lacuna Minor da rodada 4 está fechada: G1, M2 e M3 morrem no caso de 768 px, e o gate do escopo é verde (typecheck 0, lint 0, e2e 23 de 23). O veredito combina a rodada 4 (tudo o mais) com esta conferência focada, por escolha do dono.

*(Histórico, rodada 4)* ❌ Not Ready, por uma lacuna Minor de teste.
- As três lacunas da rodada 3 estão fechadas, e os mutantes que as mostraram (F2, F3 e F6) morrem.
- A F9 está certa no código: a sonda H mede a previsão embaixo do valor e alinhada à direita de 768 a
  1.279 px, e a sonda I mede as tabelas dentro da coluna de 1.024 a 1.535 px.
- Falta um caso em 768 px para a faixa que a emenda do DENS-01 AC 5 criou.

**Spec-anchored check**:
- 22 de 23 critérios têm assertion que discrimina o resultado da spec.
- O DENS-01 AC 5 está provado em 1.279, 1.280 e 1.920 px, mas não na ponta de 768 px.
- 6 de 7 edge cases têm prova. O da faixa de 768 a 1.536 px divide a Lacuna 1 e tem uma lacuna de
  precisão: "linhas densas" não tem número abaixo de 1.280 px.
- O DENS-01 AC 5 emendado diz o mesmo na spec, no `design.md`, no AD-020 e no código.

**Sensor**: 17 aplicados, 14 mortos, 3 vivos.
- G1 vira a Lacuna 1.
- G17 e C1b ficam como observações.

**Gate**: verde.
- unit 1.705, integração 364, e2e 134 de 134;
- `typecheck`, `lint` e `build`.

**O que funciona**:
- a previsão do fixo muda de lugar exatamente em 1.280 px: F9-lg, F9-2xl e F9+1 morrem;
- com o fixo confirmado, a tabela Fixos cabe na coluna em 1.024 px: o código de antes da F9 morre;
- o resumo fica preso junto do título: F3 morre;
- a confirmação armada se desfaz com o clique fora, sem foco: F6 morre;
- a altura de 48 px tem a precisão do limite: G2 morre com 48,5 px;
- excluir apaga o lançamento certo (G6), o "⋯" vale também para a receita avulsa (G21), e o título
  preso fica no alto e no limiar (G18, G19);
- nenhum teste antigo foi afrouxado.

**Próximo passo (rodada 4, fechado pela F13)**: levar a Lacuna 1 ao dono. Ela se fecha com um caso a mais num teste que já existe,
e a sonda H mostra o que ele precisa afirmar.
