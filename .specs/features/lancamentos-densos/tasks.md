# Lançamentos em lista densa — Tasks

**Spec**: `.specs/features/lancamentos-densos/spec.md`
**Design**: `.specs/features/lancamentos-densos/design.md`
**Status**: Em execução (plano aprovado pelo dono em 2026-10-30; branch `feat/lancamentos-densos`, em worktree, a partir do `main` em `b42f9b6`; T1 e T2 concluídas)
**Total**: 6 tasks em 3 fases (T1–T6), um lote só, executado inline

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
  (1.280 px para a linha baixa e 1.536 px para a coluna) é provado dos dois lados (L-029). A consulta que situa um elemento fica presa
  à região dele (L-018).
- **Gate:** o de toda task inclui `pnpm typecheck` (L-016). Medir só depois de esperar a página
  pronta.

## Review Focus

1. **Linha com até 48 px**, inclusive parcela, fixo confirmado e vencido. Teste em T2.
2. **"Excluir" só no menu,** com dois toques e 44 px no toque. Teste em T3.
3. **Coluna de filtros presa, sem barra compacta, lista com até 1.000 px;** filtros no topo abaixo
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

---

## Task Breakdown

### Phase 1 — A linha

#### T1: A parcela curta, na mesma linha
**What**:
- `textoDaParcela`, a função pura;
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
- [x] `textoDaParcela` dá "2/4 · faltam 2", "3/4 · faltam 1" e "4/4 · última" (DENS-01 AC 2)
- [x] A parcela fica na mesma linha da descrição, em texto menor e apagado, com o número em algarismos tabulares (DENS-01 AC 2)
- [x] `compra-parcelada.spec.ts` e `lista-enxuta.spec.ts` (LST-05 AC 1) provam o texto novo e a parcela na mesma altura da descrição
**Tests**: unit, componentes, e2e
**Gate**: e2e
**Commit**: `feat(lancamentos): parcela curta na mesma linha`

#### T2: A linha baixa
**What**:
- a `CELULA` com menos respiro com ponteiro fino;
- o selo compacto do `BotaoPago`;
- o "previsto" e o "confirmado · previa" na mesma linha do valor;
- a descrição que corta com reticências;
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
**Commit**: `feat(lancamentos): uma linha baixa por lançamento`

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
- [ ] O "⋯" aparece só na linha do avulso, com o nome "Mais ações para <descrição>" (DENS-02 ACs 1 e 2)
- [ ] Acionar o "⋯" abre o painel com "Excluir"; dois toques excluem, como hoje (DENS-02 ACs 3 e 4)
- [ ] `Escape` fecha e devolve o foco ao "⋯"; clicar fora fecha (DENS-02 AC 5)
- [ ] Nenhum "Excluir" fora do menu, em nenhuma largura (DENS-02 AC 6)
- [ ] Em 400 px, o "⋯" e o "Excluir" medem ao menos 44×44, medidos no navegador (DENS-02 AC 7)
- [ ] No e2e de 1.920 px, excluir pelo menu tira a linha e baixa o total do bloco
**Tests**: componentes, e2e
**Gate**: e2e
**Commit**: `feat(lancamentos): excluir no menu da linha`

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

**Depends on**: T3
**Reuses**: `FiltrosDeLancamentos`, `ChipsDeCategoria`, `BarraDeFiltrosCompacta`
**Requirement**: DENS-03
**Done when**:
- [ ] Em 1.920 px, os filtros ficam à direita da lista, com a linha fina medida pelo `border-left` computado, e têm a busca, os chips, a situação, o meio e a pessoa (DENS-03 AC 1)
- [ ] Rolando até o fim em 1.920 px, a coluna continua à vista e a barra compacta não aparece (DENS-03 ACs 2 e 6)
- [ ] A contagem e o total ficam no alto da coluna (DENS-03 AC 3)
- [ ] Os chips da coluna têm a cor, o total, a escolha e o "+N categorias" de hoje; `categorias.spec.ts` e `lista-enxuta.spec.ts` (LST-01) passam (DENS-03 AC 4)
- [ ] Em 1.535 px os filtros ficam no topo; em 1.536 px, na coluna (DENS-03 ACs 1 e 5)
- [ ] `busca-e-filtros.spec.ts` passa sem mudança (DENS-03 AC 7)
- [ ] Em 1.920 px a lista mede até 1.000 px e fica centrada entre o menu e a coluna (DENS-03 AC 8)
- [ ] Os testes de LST-03, de LST-05 AC 3 e do TRES-01 AC 8 provam a regra nova, como registrado no design
**Tests**: e2e
**Gate**: e2e
**Commit**: `feat(lancamentos): filtros numa coluna à direita`

#### T5: Os títulos dos blocos presos ao rolar
**What**: o cabeçalho do `BlocoRecolhivel` preso no alto a partir de 1.536 px.
**Where**: `src/components/bloco-recolhivel.tsx`, `e2e/lancamentos-densos.spec.ts`
**Depends on**: T4
**Reuses**: `BlocoRecolhivel`
**Requirement**: DENS-04
**Done when**:
- [ ] Em 1.920 px, rolando até o meio de "Fixos", o título "Fixos" está no alto da tela (DENS-04 AC 1)
- [ ] Em 1.535 px o título não prende (limiar dos dois lados, 1.535 e 1.536 px)
- [ ] O recolher e expandir e o HTML de LST-02 passam sem mudança (DENS-04 AC 2)
**Tests**: e2e
**Gate**: e2e
**Commit**: `feat(lancamentos): títulos dos blocos presos ao rolar`

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
- [ ] AD-020 registrado, com o que ele revê (AD-019 em Lançamentos)
- [ ] Cada critério substituído aponta para o DENS que o substitui
- [ ] `pnpm verify` e o e2e inteiro passam
**Tests**: none
**Gate**: build
**Commit**: `docs(lancamentos-densos): registrar a lista densa`
