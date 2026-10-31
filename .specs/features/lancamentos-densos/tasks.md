# Lançamentos em lista densa — Tasks

**Spec**: `.specs/features/lancamentos-densos/spec.md`
**Design**: `.specs/features/lancamentos-densos/design.md`
**Status**: FAIL na rodada 4 de `validation.md`, em 2026-10-31, por uma lacuna menor (a previsão do fixo alinhada à direita na ponta de 768 px da faixa do DENS-01, AC 5); o dono escolheu em 2026-10-31 corrigir e conferir só essa lacuna, sem uma rodada inteira; correção F13 a fazer (plano aprovado pelo dono em 2026-10-30; branch `feat/lancamentos-densos`, em worktree, a partir do `main` em `b42f9b6`; T1 a T6 e F1 a F12 concluídas)
**Total**: 19 tasks em 7 fases (T1–T6 e as correções F1–F13), executadas inline

---

## Execution Protocol (MANDATORY -- do not skip)

Implementar com a skill `tlc-spec-driven`, ativada pelo nome. Cada task segue esta ordem:
1. pré-implementação;
2. testes primeiro, derivados dos ACs do `spec.md`;
3. implementação;
4. gate;
5. Test Adequacy Review (evidence-or-zero, `file:line` + assertion);
6. marcar a task em `tasks.md` (pelo script que procura o fim do bloco a partir do próprio bloco) e
   a traceability no `spec.md`;
7. **um** commit atômico validado por `check_commit.py`.

Proibições:
- commitar antes do gate;
- enfraquecer, pular ou apagar teste;
- agrupar tasks;
- "já que estou aqui";
- dado real em fixture ou commit (AD-009).

Um teste antigo só muda quando a spec desta fatia muda a regra que ele prova, e a mudança fica
registrada no commit (`design.md`, "Testes que mudam porque a spec mudou").

**Blast radius:** a aprovação autoriza implementação e commits **locais**. `git push` e qualquer
operação remota exigem autorização separada.

---

## Global Constraints

- **Sem mudança de banco.**
- **Densidade só no mouse:** toda redução de tamanho é `md:pointer-fine:`. No toque e abaixo de
  768 px, os alvos continuam com 44 px (TOQUE-01).
- **Um cartão de filtros só,** com `id="cartao-de-filtros"` e um `<search>`; ele muda de lugar só
  por CSS.
- **Nada novo na coluna** que outro teste conte sem escopo: nenhum `h3`, nenhum segundo
  `role="status"`, nenhum texto com "lançamento".
- **Linha:** o selo é o único `button[aria-pressed]` da linha; o "⋯" usa `aria-expanded`. A `div
  id="linhas-…"` do bloco não ganha atributo.
- **O valor fica num `td` só,** alinhado à direita, em algarismos tabulares (REDE-03, AC 2).
- **Layout:** a prova se mede no navegador, com `boundingBox` e estilo computado. Todo limiar
  (768 px para os alvos de 44 px, 1.280 px para a linha baixa e 1.536 px para a coluna) é provado
  dos dois lados (L-029, L-048). A consulta que situa um elemento fica presa
  à região dele (L-018).
- **Gate:** o de toda task inclui `pnpm typecheck` (L-016). Medir só depois de esperar a página
  pronta.

## Review Focus

1. **Linha com até 48 px**, inclusive parcela, fixo confirmado e vencido. Teste em T2.
2. **"Excluir" só no menu,** com dois toques e 44 px no toque. Teste em T3.
3. **Coluna de filtros presa, sem barra compacta, lista com até 1.100 px;** filtros no topo abaixo
   de 1.536 px. Teste em T4.
4. **Nenhum filtro muda de resultado.** Testes atuais de `busca-e-filtros` em T4.

---

## Test Coverage Matrix

| Camada | Tipo | Expectativa | Local | Comando |
| --- | --- | --- | --- | --- |
| `src/components/*.ts` (texto da parcela) | unit | Todos os ramos | `texto-da-parcela.test.ts` | `pnpm test:unit` |
| Componentes | componentes | Parcela em linha, selo, valor confirmável na mesma linha, menu "⋯" com o excluir de dois toques | `src/components/**/*.test.tsx` | `pnpm test:unit` |
| Fluxo | e2e | Alturas, menu, coluna presa, limiares, títulos presos, 400 px | `e2e/lancamentos-densos.spec.ts` | `pnpm test:e2e` |
| Docs | none | — | — | — |

## Gate Check Commands

| Gate | Comando |
| --- | --- |
| `quick` | `pnpm test:unit && pnpm typecheck && pnpm lint` |
| `e2e` | `pnpm typecheck && pnpm exec playwright test <specs da task>` |
| `build` | `pnpm verify` e `pnpm test:e2e` inteiro |

O e2e roda com `DATABASE_URL_TEST` apontando para o banco de teste separado, porta 3100, uma
execução por vez.

---

## Execution Plan

### Phase 1 — A linha

```
T1 -> T2
T2 -> T3
```

### Phase 2 — A página

```
T4 -> T5
```

### Phase 3 — Fechamento

```
T6
```

Lote único, inline: T1 a T6, nesta ordem.

### Phase 4 — Correções da verificação (rodada 1)

```
F1 -> F2
F2 -> F3
F3 -> F4
F4 -> F5
F5 -> F6
F6 -> F7
```

F1 a F5 fecham os Fixes 1 a 5 de `validation.md` (rodada 1, FAIL). A F1 leva à spec o lugar do "⋯"
que o dono confirmou, e prova esse lugar no navegador. As F2 a F5 acrescentam, cada uma, o teste que a
sonda do Verifier provou: passa na HEAD e falha com o mutante (M12, M11, M13 e M17). A F6 fecha a
observação 5, o foco que já estava no "⋯" antes do `Escape`. A F7 fecha a observação 7, os textos que
ficaram para trás.

### Phase 5 — Correções da verificação (rodada 2)

```
F8
```

A F8 fecha o Fix 1 da rodada 2 (FAIL, uma lacuna menor): o lado de baixo do limiar de 768 px dos
alvos de 44 px, que só era medido em 400 px (sonda P6, mutantes N11 e N11b).

### Phase 6 — Correções da verificação (rodada 3)

```
F9 -> F10
F10 -> F11
F11 -> F12
```

A F9 a F11 fecham os Fixes 1 a 3 da rodada 3 de `validation.md` (FAIL, uma lacuna maior e duas
menores). A F9 segue o caminho A que o dono escolheu para o Fix 1 em 2026-10-31: a previsão do fixo
fica na linha do valor só a partir de 1.280 px, e abaixo disso volta para baixo dele, como antes da
fatia (mutante F2). Assim a tabela Fixos volta a caber na coluna em 1.024 px com um fixo confirmado
(LST-05, AC 3; sondas G e B). A F10 e a F11 acrescentam, cada uma, o teste que a sonda do Verifier
provou: passa na HEAD e falha com o mutante (F3 e F6). A F12 fecha as observações 4 e 10: o
TOQUE-01 AC 1 substituído em parte, e a espera da página antes de medir em `lista-enxuta.spec.ts`.

### Phase 7 — Correção da verificação (rodada 4)

```
F13
```

A F13 fecha o Fix 1 da rodada 4 de `validation.md` (FAIL, uma lacuna menor): a ponta de 768 px da
faixa "de 768 a 1.279 px" do DENS-01, AC 5, onde o código liga o alinhamento à direita (mutante G1,
sonda H, L-052). O dono escolheu em 2026-10-31 que um Verifier novo confira só essa lacuna, sem uma
rodada inteira.

---

## Task Breakdown

### Phase 1 — A linha

#### T1: A parcela curta, na mesma linha
**What**:
- `restoDaParcela`, a função pura;
- a parcela em linha na célula da descrição;
- os testes que provavam a segunda linha passam a provar a regra nova.

**Where**:
- `src/components/texto-da-parcela.ts` (+ teste)
- `src/components/tabela-lancamentos.tsx` (+ teste)
- `e2e/compra-parcelada.spec.ts`
- `e2e/lista-enxuta.spec.ts`

**Depends on**: nenhuma
**Reuses**: o tipo de parcela de `LancamentoDoMes`
**Requirement**: DENS-01
**Done when**:
- [x] `restoDaParcela` dá "faltam 2", "faltam 1" e "última", e a célula mostra "2/4 · faltam 2", "3/4 · faltam 1" e "4/4 · última" (DENS-01 AC 2)
- [x] A parcela fica na mesma linha da descrição, em texto menor e apagado, com o número em algarismos tabulares (DENS-01 AC 2)
- [x] `compra-parcelada.spec.ts` e `lista-enxuta.spec.ts` (LST-05 AC 1) provam o texto novo e a parcela na mesma altura da descrição
**Tests**: unit, componentes, e2e
**Gate**: e2e
**Commit**: `feat(lancamentos): parcela curta na mesma linha` (`de84baa`)

#### T2: A linha baixa
**What**:
- a `CELULA` com menos respiro com ponteiro fino;
- o selo compacto do `BotaoPago`;
- o "previsto" e o "confirmado · previa" na mesma linha do valor;
- a descrição longa, que quebra linha, e só a linha dela cresce;
- o e2e de alturas.

**Where**:
- `src/components/tabela-lancamentos.tsx`
- `src/components/botao-pago.tsx` (+ teste)
- `src/components/valor-confirmavel.tsx` (+ teste)
- `src/components/botao-excluir.tsx` (o mesmo compacto do selo, até a T3 levá-lo ao menu)
- `e2e/lancamentos-densos.spec.ts` (novo)
- `e2e/lista-enxuta.spec.ts` (a mesma linha só a partir de 1.280 px)

**Depends on**: T1
**Reuses**: `BotaoPago`, `ValorConfirmavel`, `SeletorDeCategoria`
**Requirement**: DENS-01
**Done when**:
- [x] Em 1.280 px e em 1.920 px com ponteiro fino, toda linha das tabelas mede até 48 px, inclusive parcela, fixo confirmado e vencido, medido no navegador (DENS-01 AC 1)
- [x] Desvio medido: a coluna de filtros e os títulos presos passam a valer a partir de 1.536 px, porque em 1.280 px a lista ficaria com 656 px; em 1.024 px a parcela de uma descrição pode quebrar para baixo, e o e2e de LST-05 exige a mesma linha só a partir de 1.280 px
- [x] O selo mostra "Pago" ou "Previsto", com o mesmo nome acessível e o mesmo `aria-pressed`, e alterna como hoje (DENS-01 AC 3)
- [x] "Vencido" continua ao lado do selo (DENS-01 AC 4)
- [x] O valor confirmável mostra "previsto" ou "confirmado · previa R$ X" na mesma linha, à esquerda do valor (DENS-01 AC 5)
- [x] As colunas e o seletor de categoria continuam os de hoje; os testes de TRC, FIXO-04, VENC-01 e TOQUE-01 do selo passam sem mudar o que afirmam (DENS-01 AC 6)
**Tests**: componentes, e2e
**Gate**: e2e
**Commit**: `feat(lancamentos): uma linha baixa por lançamento` (`4349d77`)

#### T3: "Excluir" no menu da linha
**What**:
- `MenuDaLinha`, com o "⋯" e o painel dentro da célula;
- a tabela usa o menu na linha do avulso;
- os testes de AVUL-03 e TOQUE-01 abrem o menu antes.

**Where**:
- `src/components/menu-da-linha.tsx` (+ teste)
- `src/components/tabela-lancamentos.tsx` (+ teste)
- `e2e/lancamento-avulso.spec.ts`
- `e2e/acessibilidade.spec.ts`
- `e2e/lancamentos-densos.spec.ts`

**Depends on**: T2
**Reuses**: `BotaoExcluir`
**Requirement**: DENS-02
**Done when**:
- [x] O "⋯" aparece só na linha do avulso, com o nome "Mais ações para <descrição>" (DENS-02 ACs 1 e 2)
- [x] Acionar o "⋯" abre o painel com "Excluir"; dois toques excluem, como hoje (DENS-02 ACs 3 e 4)
- [x] `Escape` fecha e devolve o foco ao "⋯"; clicar fora fecha (DENS-02 AC 5)
- [x] Nenhum "Excluir" fora do menu, em nenhuma largura (DENS-02 AC 6)
- [x] Em 400 px, o "⋯" e o "Excluir" medem ao menos 44×44, medidos no navegador (DENS-02 AC 7)
- [x] No e2e de 1.920 px, excluir pelo menu tira a linha e baixa o total do bloco
**Tests**: componentes, e2e
**Gate**: e2e
**Commit**: `feat(lancamentos): excluir no menu da linha` (`b967cb6`)

### Phase 2 — A página

#### T4: Os filtros numa coluna à direita
**What**:
- a página em grade, sem a `AreaEstreita`, com o cartão de filtros preso na coluna da direita a partir de 1.536 px;
- `FiltrosDeLancamentos` com as classes da coluna;
- os testes de LST-03, LST-05 AC 3 e TRES-01 AC 8 acompanham a regra nova.

**Where**:
- `src/app/(app)/[competencia]/lancamentos/page.tsx`
- `src/components/filtros-de-lancamentos.tsx`
- `e2e/lancamentos-densos.spec.ts`
- `e2e/lista-enxuta.spec.ts`
- `e2e/visao-tres-colunas.spec.ts`
- `src/components/tabela-lancamentos.tsx` (desvio medido: respiro lateral de 12 px e o grupo da situação numa linha só a partir de 1.280 px)

**Depends on**: T3
**Reuses**: `FiltrosDeLancamentos`, `ChipsDeCategoria`, `BarraDeFiltrosCompacta`
**Requirement**: DENS-03
**Done when**:
- [x] Em 1.920 px, os filtros ficam à direita da lista, com a linha fina medida pelo `border-left` computado, e têm a busca, os chips, a situação, o meio e a pessoa (DENS-03 AC 1)
- [x] Rolando até o fim em 1.920 px, a coluna continua à vista e a barra compacta não aparece (DENS-03 ACs 2 e 6)
- [x] A contagem e o total ficam no alto da coluna (DENS-03 AC 3)
- [x] Os chips da coluna têm a cor, o total, a escolha e o "+N categorias" de hoje; `categorias.spec.ts` e `lista-enxuta.spec.ts` (LST-01) passam (DENS-03 AC 4)
- [x] Em 1.535 px os filtros ficam no topo; em 1.536 px, na coluna (DENS-03 ACs 1 e 5)
- [x] `busca-e-filtros.spec.ts` passa sem mudança (DENS-03 AC 7)
- [x] Em 1.920 px a lista mede até 1.100 px e fica centrada entre o menu e a coluna (DENS-03 AC 8)
- [x] Os testes de LST-03, de LST-05 AC 3 e do TRES-01 AC 8 provam a regra nova, como registrado no design: LST-03 e LST-05 rodam abaixo de 1.536 px e não mudam; o laço do TRES-01 AC 8 fica com Todo mês e Categorias
- [x] Desvio medido: lista até 1.100 px e coluna com 288 px (com 1.000 e 320, a linha do fixo confirmado e vencido quebrava); a altura das linhas medida também em 1.536 px, a janela mais estreita com a coluna aberta
**Tests**: e2e
**Gate**: e2e
**Commit**: `feat(lancamentos): filtros numa coluna à direita` (`7f029ad`)

#### T5: Os títulos dos blocos presos ao rolar
**What**: o cabeçalho do `BlocoRecolhivel` preso no alto a partir de 1.536 px.
**Where**: `src/components/bloco-recolhivel.tsx`, `e2e/lancamentos-densos.spec.ts`
**Depends on**: T4
**Reuses**: `BlocoRecolhivel`
**Requirement**: DENS-04
**Done when**:
- [x] Em 1.920 px, rolando até o meio de "Fixos", o título "Fixos" está no alto da tela (DENS-04 AC 1)
- [x] Em 1.535 px o título não prende (limiar dos dois lados, 1.535 e 1.536 px)
- [x] O recolher e expandir e o HTML de LST-02 passam sem mudança (DENS-04 AC 2)
**Tests**: e2e
**Gate**: e2e
**Commit**: `feat(lancamentos): títulos dos blocos presos ao rolar` (`284cbb1`)

### Phase 3 — Fechamento

#### T6: A decisão registrada
**What**:
- AD-020 no `STATE.md`;
- notas de substituição em LST-03, LST-05, AVUL-03 AC 7, TOQUE-01 AC 2 e TRES-01 AC 8;
- `docs/design.md` e os comentários que deixam de ser verdade (`area-estreita.tsx`, `tabela-lancamentos.tsx`, `botao-excluir.tsx`).

**Where**:
- `.specs/STATE.md`
- `.specs/features/{lista-enxuta,lancamento-avulso,lacunas-do-painel,visao-tres-colunas}/spec.md`
- `docs/design.md`
- `src/components/{area-estreita,tabela-lancamentos,botao-excluir}.tsx`

**Depends on**: T5
**Reuses**: nenhuma
**Requirement**: DENS-01, DENS-02, DENS-03
**Done when**:
- [x] AD-020 registrado, com o que ele revê (AD-019 em Lançamentos)
- [x] Cada critério substituído aponta para o DENS que o substitui
- [x] `pnpm verify` e o e2e inteiro passam: 1.703 unitários, 364 de integração, build e 125 e2e
**Tests**: none
**Gate**: build
**Commit**: `docs(lancamentos-densos): registrar a lista densa` (`514ab25`)

### Phase 4 — Correções da verificação (rodada 1)

#### F1: O "⋯" ao lado do selo, na spec e no teste
**What**: DENS-02 AC 1 e a premissa "Onde fica 'Excluir'" passam a dizer o lugar que o dono confirmou em 2026-10-30, quando perguntado: o "⋯" na célula da Situação, logo à direita do selo e do "Vencido", e não no fim da linha. Os valores continuam alinhados numa coluna só, e a tabela fica com as cinco colunas de LST-05. O e2e mede esse lugar dentro da linha (Fix 1, L-018, L-047).
**Where**:
- `.specs/features/lancamentos-densos/spec.md`
- `e2e/lancamentos-densos.spec.ts`
- `.specs/features/lancamentos-densos/design.md` (a confirmação do dono, ao lado da decisão de design)

**Depends on**: nenhuma
**Reuses**: `linha`, `caixa`
**Requirement**: DENS-02
**Done when**:
- [x] DENS-02 AC 1 pede o "⋯" na célula da Situação, logo depois do selo e do "Vencido"; a premissa registra a confirmação do dono, a data e o motivo
- [x] Em 1.920 px, a caixa do "⋯" de Entrada A, Item A e Item B fica dentro da célula da Situação e à direita do selo; no vencido, também à direita de "Vencido" (DENS-02 AC 1)
- [x] O `design.md` diz o mesmo lugar, com a confirmação do dono
**Tests**: e2e
**Gate**: e2e
**Commit**: `test(lancamentos): o menu da linha fica ao lado do selo` (`d0c67cb`)

#### F2: 44 px com ponteiro grosso a partir de 768 px
**What**: um `describe` com `hasTouch: true` em 1.920 px, que confere `matchMedia("(pointer: coarse)")` e mede o selo, o "⋯" e o "Excluir" do menu aberto com ao menos 44 × 44 (Fix 2, sonda P2, L-044).
**Where**: `e2e/lancamentos-densos.spec.ts`
**Depends on**: F1
**Reuses**: `linha`, `caixa`
**Requirement**: DENS-02 (e TOQUE-01, AC 1, para o selo)
**Done when**:
- [x] Com `hasTouch` em 1.920 px, `matchMedia("(pointer: coarse)").matches` é verdadeiro
- [x] O selo, o "⋯" e o "Excluir" do menu aberto medem ao menos 44 × 44 (DENS-02 AC 7; TOQUE-01 AC 1)
- [x] O teste falha com M12 (`md:min-h-8` no lugar de `md:pointer-fine:min-h-8` no "⋯" e no "Excluir") e com a mesma troca no `BotaoPago`
**Tests**: e2e
**Gate**: e2e
**Commit**: `test(lancamentos): alvos de 44 px no toque acima de 768 px` (`7ac8cbf`)

#### F3: Uma descrição longa no bloco do vencido
**What**: semear um avulso de descrição longa e genérica em "Gastos do Mês", o bloco do Item B vencido. Em 1.280 e 1.536 px, as outras linhas continuam com até 48 px e só a longa passa disso (Fix 3, sonda P1, L-045). Os testes que contam as linhas e o resumo do bloco passam a contar a linha nova, sem afrouxar o que provam.
**Where**: `e2e/lancamentos-densos.spec.ts`
**Depends on**: F2
**Reuses**: `semearAvulso`, `linha`
**Requirement**: DENS-01
**Done when**:
- [x] Em 1.280 e 1.536 px, com ponteiro fino, as seis linhas de antes medem até 48 px e a de descrição longa mede mais de 48 px (DENS-01 AC 1; edge case "Descrição longa")
- [x] A contagem das linhas passa de 6 para 7, com a linha longa nomeada; o resumo de "Gastos do Mês" conta a linha nova antes e depois da exclusão
- [x] O teste falha com M11 (sem `xl:pointer-fine:flex-nowrap` no grupo da situação)
**Tests**: e2e
**Gate**: e2e
**Commit**: `test(lancamentos): só a linha de descrição longa cresce` (`7153dfd`)

#### F4: A coluna presa e a barra compacta no limiar de 1.536 px
**What**: o teste da coluna presa ao rolar roda também em 1.536 × 480; do outro lado, em 1.535 × 480, a barra compacta aparece ao rolar até o fim (Fix 4, sonda P3, L-029).
**Where**: `e2e/lancamentos-densos.spec.ts`
**Depends on**: F3
**Reuses**: `cartao`, `abrir`
**Requirement**: DENS-03
**Done when**:
- [x] Em 1.536 × 480 e em 1.920 × 480, rolando até o fim, a busca da coluna continua na tela e não há barra compacta (DENS-03 ACs 2 e 6)
- [x] Em 1.535 × 480, rolando até o fim, a barra "Busca e filtros ativos" aparece (DENS-03 AC 6; LST-03)
- [x] O teste falha com M13 (`2xl:sticky` → `min-[1600px]:sticky` no cartão de filtros)
**Tests**: e2e
**Gate**: e2e
**Commit**: `test(lancamentos): coluna presa no limiar de 1.536 px` (`0b73ecd`)

#### F5: Clicar fora fecha o menu sem foco dentro
**What**: no teste do componente, abrir o menu com `fireEvent.click`, sem dar foco ao "⋯", como o Safari faz, e fechar com `fireEvent.pointerDown(document.body)` (Fix 5, sonda P5, L-046).
**Where**: `src/components/menu-da-linha.test.tsx`
**Depends on**: F4
**Reuses**: `montar`, `gatilho`
**Requirement**: DENS-02
**Done when**:
- [x] Aberto sem foco dentro, um `pointerdown` fora fecha o menu e tira o "Excluir" (DENS-02 AC 5)
- [x] O teste falha com M17 (sem o ouvinte de `pointerdown` no `document`)
**Tests**: componentes
**Gate**: quick
**Commit**: `test(lancamentos): clicar fora fecha o menu sem foco dentro` (`c4cf6ad`)

#### F6: O foco volta ao "⋯" de dentro do menu
**What**: no e2e de 1.920 px, levar o foco ao "Excluir" do menu aberto antes do `Escape`, para o `toBeFocused()` provar a volta do foco. Hoje o foco já está no "⋯" quando o `Escape` é apertado (observação 5).
**Where**: `e2e/lancamentos-densos.spec.ts`
**Depends on**: F5
**Reuses**: `linha`
**Requirement**: DENS-02
**Done when**:
- [x] Com o foco no "Excluir" do menu aberto, `Escape` fecha o menu e o foco volta ao "⋯" (DENS-02 AC 5)
- [x] O e2e falha com M6 (o `Escape` fecha sem devolver o foco)
**Tests**: e2e
**Gate**: e2e
**Commit**: `test(lancamentos): o Escape devolve o foco de dentro do menu` (`15ea1ee`)

#### F7: Os textos que ficaram para trás
**What**: a observação 7, e os textos do mesmo tipo achados ao corrigi-la:
- a T1 e a T2 desta `tasks.md` (o nome `restoDaParcela`; a descrição longa quebra linha, e não corta com reticências);
- o `design.md` (o nome `restoDaParcela(restantes)` e a tabela do e2e novo com os lugares e as larguras de hoje);
- o comentário de `e2e/compra-parcelada.spec.ts:112` e o título de `e2e/lista-enxuta.spec.ts:409`, que punham a parcela numa segunda linha ou sob a descrição;
- o título e o comentário do teste de `src/components/tabela-lancamentos.test.tsx:503-510`, pela mesma razão.

**Where**:
- `.specs/features/lancamentos-densos/tasks.md`
- `.specs/features/lancamentos-densos/design.md`
- `e2e/compra-parcelada.spec.ts`
- `e2e/lista-enxuta.spec.ts`
- `src/components/tabela-lancamentos.test.tsx`

**Depends on**: F6
**Reuses**: nenhuma
**Requirement**: DENS-01
**Done when**:
- [x] Nenhum texto da fatia diz que a descrição corta com reticências, nem que a parcela fica numa segunda linha ou sob a descrição
- [x] O `design.md` chama a função de `restoDaParcela(restantes)`, e a tabela do e2e novo diz onde e em que largura cada teste roda
- [x] Nenhuma assertion muda: só títulos, comentários e documentos
- [x] `pnpm verify` e o e2e inteiro passam: 1.704 unitários, 364 de integração, build e 129 e2e
**Tests**: none
**Gate**: build
**Commit**: `docs(lancamentos-densos): acertar os textos que ficaram para trás` (`12ef0ca`)

### Phase 5 — Correções da verificação (rodada 2)

#### F8: Os alvos de 44 px logo abaixo de 768 px
**What**: um `describe` em 767 × 900, com o ponteiro fino do projeto, que confere `matchMedia("(pointer: fine)")`, abre o "⋯" de um avulso e mede o selo, o "⋯" e o "Excluir" com ao menos 44 × 44 (Fix 1 da rodada 2, sonda P6, L-029, L-048). A lista de limiares das Global Constraints passa a ter 768 px.
**Where**:
- `e2e/lancamentos-densos.spec.ts`
- `.specs/features/lancamentos-densos/tasks.md` (Global Constraints)

**Depends on**: F7
**Reuses**: `abrir`, `linha`, `caixa`
**Requirement**: DENS-02 (e TOQUE-01, AC 1, para o selo)
**Done when**:
- [x] Em 767 px, com ponteiro fino, o selo, o "⋯" e o "Excluir" do menu aberto medem ao menos 44 × 44 (DENS-02 AC 7; TOQUE-01 AC 1)
- [x] O teste falha com N11 (`sm:pointer-fine:` no "⋯" e no "Excluir") e com N11b (o mesmo no selo)
- [x] As Global Constraints listam o limiar de 768 px entre os provados dos dois lados
**Tests**: e2e
**Gate**: e2e
**Commit**: `test(lancamentos): alvos de 44 px logo abaixo de 768 px` (`92139e2`)

### Phase 6 — Correções da verificação (rodada 3)

#### F9: A previsão do fixo na linha do valor só a partir de 1.280 px
**What**: o caminho A que o dono escolheu em 2026-10-31 para o Fix 1 da rodada 3. No `ValorConfirmavel` fechado, "previsto" ou "confirmado · previa R$ X" fica na linha do valor, à esquerda dele, só a partir de 1.280 px, o mesmo limiar da linha baixa (`md:` → `xl:`, o mutante F2). Abaixo disso, volta para baixo do valor, alinhado à direita, como antes da fatia. Em 1.024 px, com um fixo confirmado, a tabela Fixos volta a caber na coluna de conteúdo (LST-05, AC 3). O DENS-01 AC 5, a premissa dele, o `design.md` e o AD-020 passam a dizer 1.280 px, com a decisão do dono (sondas G e B, L-029, L-049, L-050).
**Where**:
- `src/components/valor-confirmavel.tsx`
- `e2e/lancamentos-densos.spec.ts`
- `.specs/features/lancamentos-densos/spec.md`
- `.specs/features/lancamentos-densos/design.md`
- `.specs/STATE.md` (AD-020)

**Depends on**: F8
**Reuses**: `abrir`, `linha`, `caixa`
**Requirement**: DENS-01 (e LST-05, AC 3, que a fatia mantém)
**Done when**:
- [x] Em 1.024, 1.280 e 1.440 px, com o Fixo A confirmado na tela, toda tabela termina dentro da coluna de conteúdo, e a página não rola de lado (LST-05, AC 3); em 1.024 px, o teste falha na `92139e2`
- [x] Em 1.279 px, a previsão do Fixo A e a do Fixo B ficam embaixo do valor; em 1.280 px, na mesma linha, à esquerda dele (DENS-01, AC 5)
- [x] O código de antes (`md:`) falha nos testes novos, e o F2 é o código, com o `md:items-end` de antes da fatia: sem ele, de 768 a 1.279 px, o valor e a previsão iam para a esquerda da célula, e o teste de 1.279 px falha
- [x] O DENS-01 AC 5, a premissa "Valor confirmável do fixo", o `design.md` e o AD-020 dizem "a partir de 1.280 px", com a decisão do dono e a data
**Tests**: e2e
**Gate**: e2e
**Commit**: `fix(lancamentos): previsão do fixo embaixo do valor abaixo de 1.280 px` (`5479bcd`)

#### F10: O resumo preso junto do título
**What**: no teste do título preso, em 1.536 px, depois de rolar até o meio de "Fixos", o resumo do bloco ("2 · R$ 155,00 · 2 a pagar") fica inteiro na tela, com `toBeInViewport({ ratio: 1 })`, e com o topo e o pé dentro da faixa do título (Fix 2 da rodada 3, sonda D, L-010).
**Where**: `e2e/lancamentos-densos.spec.ts`
**Depends on**: F9
**Reuses**: `abrir`, `caixa`, `rolarAteOMeioDosFixos`
**Requirement**: DENS-04
**Done when**:
- [x] Em 1.536 px, rolando até o meio de "Fixos", o resumo do bloco está inteiro na tela, com o topo e o pé dentro da faixa do título preso (DENS-04, AC 1)
- [x] O teste falha com F3 (o `span` do resumo fora da `div` presa)
**Tests**: e2e
**Gate**: e2e
**Commit**: `test(lancamentos): o resumo fica preso junto do título` (`e6fc71c`)

#### F11: A confirmação armada e o clique fora
**What**: no teste do `MenuDaLinha`, sem foco dentro, como no Safari: abrir o menu, armar o "Excluir", clicar fora, reabrir e achar "Excluir" de novo, sem "Confirmar" (Fix 3 da rodada 3, sonda F, L-051).
**Where**: `src/components/menu-da-linha.test.tsx`
**Depends on**: F10
**Reuses**: `montar`, `gatilho`
**Requirement**: DENS-02 (edge case "Confirmação aberta e clique fora")
**Done when**:
- [x] Com o "Excluir" armado e sem foco dentro, um `pointerdown` fora fecha o menu; reaberto, ele mostra "Excluir, Almoço" e nenhum "Confirmar" (edge case; DENS-02, AC 5)
- [x] O teste falha com F6 (o painel sempre montado, com `hidden={!aberto}`)
**Tests**: componentes
**Gate**: quick
**Commit**: `test(lancamentos): clicar fora desfaz a confirmação de excluir` (`e78433c`)

#### F12: O TOQUE-01 AC 1 substituído em parte, e a espera antes de medir
**What**: as observações 4 e 10 da rodada 3.
- Observação 4: com ponteiro fino, a partir de 768 px, o selo mede 32 px de altura, para a linha caber em 48 px (DENS-01, AC 1). O TOQUE-01 AC 1 entra em "O que esta fatia substitui" e no AD-020, e ganha a nota de substituição, como o AC 2.
- Observação 10: o teste de LST-05 em `e2e/lista-enxuta.spec.ts` espera a página pronta antes de medir o cartão, como o `abrir` de `lancamentos-densos.spec.ts`. Nenhuma assertion muda.

**Where**:
- `.specs/features/lancamentos-densos/spec.md`
- `.specs/STATE.md` (AD-020)
- `.specs/features/lacunas-do-painel/spec.md`
- `e2e/lista-enxuta.spec.ts`

**Depends on**: F11
**Reuses**: nenhuma
**Requirement**: DENS-01, DENS-02
**Done when**:
- [x] O TOQUE-01 AC 1 está em "O que esta fatia substitui" e no AD-020, e a nota dele aponta para DENS-01, AC 1 e DENS-02, AC 7
- [x] `lista-enxuta.spec.ts` espera o título da página antes do `boundingBox()` do cartão; nenhuma assertion muda
- [x] `pnpm verify` e o e2e inteiro passam: 1.705 unitários, 364 de integração, build e 134 e2e
**Tests**: e2e
**Gate**: build
**Commit**: `docs(lancamentos-densos): o selo denso e a espera antes de medir` (`33c9567`)

### Phase 7 — Correção da verificação (rodada 4)

#### F13: A previsão do fixo alinhada à direita já em 768 px
**What**: o teste da previsão do fixo mede também em 768 px o que mede em 1.279 px: no Fixo A ("confirmado · previa R$ 100,00") e no Fixo B ("previsto"), a previsão embaixo do valor e a borda direita das duas a até 1 px (Fix 1 da rodada 4, sonda H, L-029, L-052). O fim da tabela não é medido em 768 px: as tabelas já saíam da coluna nessa largura antes da fatia, e nenhum AC fixa essa largura. A lista de limiares das Global Constraints passa a ter 768 px também para a previsão do fixo.
**Where**:
- `e2e/lancamentos-densos.spec.ts`
- `.specs/features/lancamentos-densos/tasks.md` (Global Constraints)
- `.specs/features/lancamentos-densos/spec.md` (Traceability)

**Depends on**: F12
**Reuses**: `abrir`, `valorEPrevisao`
**Requirement**: DENS-01
**Done when**:
- [ ] Em 768 px, a previsão do Fixo A e a do Fixo B ficam embaixo do valor, com a borda direita a até 1 px da dele (DENS-01, AC 5)
- [ ] O teste falha com G1 (`md:items-end` → `lg:items-end` em `valor-confirmavel.tsx`)
- [ ] As Global Constraints listam 768 px também para a previsão do fixo
**Tests**: e2e
**Gate**: e2e
**Commit**: `test(lancamentos): previsão do fixo alinhada à direita em 768 px`
