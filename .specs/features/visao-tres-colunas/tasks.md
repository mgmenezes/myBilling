# Visão geral em três colunas — Tasks

**Spec**: `.specs/features/visao-tres-colunas/spec.md`
**Design**: `.specs/features/visao-tres-colunas/design.md`
**Status**: Em execução (plano aprovado pelo dono em 2026-10-30; branch `feat/visao-tres-colunas`, em worktree, a partir do `main` em `3b42f3c`; T1 a T4 concluídas)
**Total**: 8 tasks em 4 fases (T1–T8), um lote só, executado inline

---

## Execution Protocol (MANDATORY -- do not skip)

Implementar com a skill `tlc-spec-driven`, ativada pelo nome. Cada task segue esta ordem:
1. pré-implementação;
2. testes primeiro, derivados dos ACs do `spec.md`;
3. implementação;
4. gate;
5. Test Adequacy Review (evidence-or-zero, `file:line` + assertion);
6. marcar a task em `tasks.md` e a traceability no `spec.md`;
7. **um** commit atômico validado por `check_commit.py`.

Proibições:
- commitar antes do gate;
- enfraquecer, pular ou apagar teste;
- agrupar tasks;
- "já que estou aqui";
- dado real em fixture ou commit (AD-009).

**Blast radius:** a aprovação autoriza implementação e commits **locais**. `git push` e qualquer
operação remota exigem autorização separada.

---

## Global Constraints

- **Sem mudança de banco:** nenhuma migration nesta fatia.
- **Server components:** o `MenuLateral`, a `AreaEstreita`, os `UltimosLancamentos` e o
  `cadastro-de-lancamento` são de servidor. Só a `NavegacaoPrincipal`, o `HorizonteFuturo`, o
  `AlternadorDeTema` e os formulários continuam de cliente.
- **Tailwind v4:** classes escritas por extenso, nunca montadas por template.
- **Azul:** é escasso. Na Visão geral, o único botão azul é o de gravar o lançamento. O "Importar
  planilha" do rodapé é discreto.
- **Celular:** 400 px sem rolagem horizontal em toda tela autenticada, com alvos de 44×44.
- **Gate:** o de toda task inclui `pnpm typecheck`, encadeado com `&&` (L-016).
- **AC que situa um elemento** ("no rodapé do menu", "na coluna de ação"): a consulta fica presa
  àquela região (L-018).
- **Composição:** "lançar e ver o card mudar" precisa de e2e que atravesse a página (L-001, L-014).
- **Layout:** a prova se mede no navegador, com `boundingBox` e `scrollWidth`, e não pelo nome da
  classe.

## Review Focus

1. **O menu na borda em toda tela, e o importar no rodapé.** Testes em T2 e T3.
2. **A coluna de ação ao lado em 1.280 px, abaixo antes.** Teste em T7.
3. **Lançar pela coluna atualiza cards e últimos.** Teste em T7.
4. **Últimos: data até hoje, ordem e corte.** Testes em T1 e T7.
5. **Lançamentos não muda por dentro.** Testes atuais de Lançamentos em T4.

---

## Test Coverage Matrix

| Camada | Tipo | Expectativa | Local | Comando |
| --- | --- | --- | --- | --- |
| `src/application/mes/**` | unit | Todos os ramos | `ultimos-lancamentos.test.ts` | `pnpm test:unit` |
| Componentes | componentes | Navegação sem competência, menu lateral, linhas dos próximos meses, últimos lançamentos, valor da natureza | `src/components/**/*.test.tsx` | `pnpm test:unit` |
| Fluxo | e2e | Moldura em 1.920 px, coluna de ação, lançar, buscar, 400 px em cinco telas | `e2e/visao-tres-colunas.spec.ts` | `pnpm test:e2e` |
| Composição de página, docs | none | — | — | — |

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

### Phase 1 — Base pura

```
T1
```

### Phase 2 — Moldura

```
T2 -> T3
```

### Phase 3 — Visão geral

```
T4 -> T6
T5 -> T7
T6 -> T7
```

### Phase 4 — Fechamento

```
T8
```

Lote único, inline: T1 a T8, nesta ordem.

---

## Task Breakdown

### Phase 1 — Base pura

### Phase 2 — Moldura

```
T2 -> T3
```

### Phase 3 — Visão geral

```
T4 -> T6
T5 -> T7
T6 -> T7
```

### Phase 4 — Fechamento

```
T8
```

Lote único, inline: T1 a T8, nesta ordem.

---

## Task Breakdown

### Phase 1 — Base pura

#### T1: Os últimos lançamentos do mês
**What**: a função que escolhe os até 8 lançamentos mais recentes com data até hoje.
**Where**: `src/application/mes/ultimos-lancamentos.ts` (+ teste)
**Depends on**: nenhuma
**Reuses**: o tipo `LancamentoDoMes` de `obterVisaoMensal`, o campo `canceladoEm` (o repositório já tira os cancelados; a função garante a regra por conta própria)
**Requirement**: TRES-05
**Done when**:
- [ ] Lançamento cancelado fica fora (TRES-05 AC 1)
- [ ] Lançamento com data depois de hoje fica fora; o de hoje entra (TRES-05 AC 1)
- [ ] Ordem pela data decrescente (TRES-05 AC 1)
- [ ] Empate de data ordenado pela descrição, em ordem alfabética pt-BR (TRES-05 AC 2)
- [ ] Corte em 8 com 10 elegíveis; lista vazia quando nenhum é elegível (TRES-05 AC 1, Edge Case)
**Tests**: unit
**Gate**: quick
**Commit**: `feat(mes): escolher os últimos lançamentos do mês`

### Phase 2 — Moldura

#### T2: A navegação acha a competência sozinha
**What**: `NavegacaoPrincipal` lê a competência de `useParams()` e não desenha nada sem competência válida.
**Where**: `src/components/navegacao-principal.tsx` (+ teste), `src/app/(app)/[competencia]/layout.tsx` (deixa de passar a prop)
**Depends on**: nenhuma
**Reuses**: `criarCompetencia`, `estaAtiva`
**Requirement**: TRES-01
**Done when**:
- [x] Sem `competencia` nos parâmetros, ou com uma inválida, a navegação não desenha item nenhum (TRES-01 AC 4)
- [x] Com competência, os quatro itens apontam para ela e o ativo continua marcado como hoje (TRES-01 AC 3)
- [x] Os testes atuais da navegação passam sem mudar o que afirmam
**Tests**: componentes
**Gate**: quick
**Commit**: `refactor(navegacao): ler a competência da rota`

### Phase 3 — Visão geral

```
T4 -> T6
T5 -> T7
T6 -> T7
```

### Phase 4 — Fechamento

```
T8
```

Lote único, inline: T1 a T8, nesta ordem.

---

## Task Breakdown

### Phase 1 — Base pura

### Phase 2 — Moldura

```
T2 -> T3
```

### Phase 3 — Visão geral

```
T4 -> T6
T5 -> T7
T6 -> T7
```

### Phase 4 — Fechamento

```
T8
```

Lote único, inline: T1 a T8, nesta ordem.

---

## Task Breakdown

### Phase 1 — Base pura

#### T1: Os últimos lançamentos do mês
**What**: a função que escolhe os até 8 lançamentos mais recentes com data até hoje.
**Where**: `src/application/mes/ultimos-lancamentos.ts` (+ teste)
**Depends on**: nenhuma
**Reuses**: o tipo `LancamentoDoMes` de `obterVisaoMensal`, o campo `canceladoEm` (o repositório já tira os cancelados; a função garante a regra por conta própria)
**Requirement**: TRES-05
**Done when**:
- [ ] Lançamento cancelado fica fora (TRES-05 AC 1)
- [ ] Lançamento com data depois de hoje fica fora; o de hoje entra (TRES-05 AC 1)
- [ ] Ordem pela data decrescente (TRES-05 AC 1)
- [ ] Empate de data ordenado pela descrição, em ordem alfabética pt-BR (TRES-05 AC 2)
- [ ] Corte em 8 com 10 elegíveis; lista vazia quando nenhum é elegível (TRES-05 AC 1, Edge Case)
**Tests**: unit
**Gate**: quick
**Commit**: `feat(mes): escolher os últimos lançamentos do mês`

### Phase 2 — Moldura

#### T2: A navegação acha a competência sozinha
**What**: `NavegacaoPrincipal` lê a competência de `useParams()` e não desenha nada sem competência válida.
**Where**: `src/components/navegacao-principal.tsx` (+ teste), `src/app/(app)/[competencia]/layout.tsx` (deixa de passar a prop)
**Depends on**: nenhuma
**Reuses**: `criarCompetencia`, `estaAtiva`
**Requirement**: TRES-01
**Done when**:
- [x] Sem `competencia` nos parâmetros, ou com uma inválida, a navegação não desenha item nenhum (TRES-01 AC 4)
- [x] Com competência, os quatro itens apontam para ela e o ativo continua marcado como hoje (TRES-01 AC 3)
- [x] Os testes atuais da navegação passam sem mudar o que afirmam
**Tests**: componentes
**Gate**: quick
**Commit**: `refactor(navegacao): ler a competência da rota`

#### T3: A moldura com o menu na borda
**What**:
- `MenuLateral` com a marca, a navegação, o rodapé (importar, nome e tema) e a barra no topo do celular;
- o `(app)/layout.tsx` sem a pílula e sem o `<main>` de 1.024 px;
- o `[competencia]/layout.tsx` com a barra do seletor;
- a `AreaEstreita` nas telas que guardam a largura de hoje;
- a variante `discreto` do `DialogoDeCadastro`;
- os e2e que localizam a pílula, a navegação ou o botão de importar, ajustados para o lugar novo.

**Where**:
- `src/components/menu-lateral.tsx` (+ teste)
- `src/components/area-estreita.tsx`
- `src/components/dialogo-de-cadastro.tsx` (+ teste)
- `src/components/importacao/dialogo-importacao.tsx`
- `src/app/(app)/layout.tsx`
- `src/app/(app)/page.tsx`
- `src/app/(app)/[competencia]/layout.tsx`
- `src/app/(app)/[competencia]/{lancamentos,fixos}/page.tsx`
- `src/app/(app)/[competencia]/cadastros/categorias/page.tsx`
- `src/app/(app)/[competencia]/error.tsx`
- `src/app/(app)/[competencia]/page.tsx` (o importar sai do título)
- `src/components/barra-de-filtros-compacta.tsx` (começa depois do menu)
- `e2e/lancamento-avulso.spec.ts` (o foco preso mira `dialog[open]`)
- `e2e/visao-tres-colunas.spec.ts` (novo, parte da moldura)

**Depends on**: T2
**Reuses**: `DialogoImportacao`, `AlternadorDeTema`, `SeletorCompetencia`, `ImportacaoRepositoryDrizzle`
**Requirement**: TRES-01, TRES-02
**Done when**:
- [ ] Em 1.920 px, a coluna lateral começa em x = 0 e não há pílula, em Lançamentos e na Visão geral (TRES-01 ACs 1 e 2), medido no navegador
- [ ] A home do ano mostra a coluna lateral sem os itens de área (TRES-01 AC 4)
- [ ] O rodapé do `aside` tem o nome, o tema e "Importar planilha", consultados dentro do `aside` (TRES-01 AC 5)
- [ ] "Importar planilha" aberto em Lançamentos mostra o diálogo com "Tudo entra em nome de Pessoa A" (TRES-01 AC 6)
- [ ] O seletor de competência fica acima do conteúdo em Lançamentos e na Visão geral (TRES-01 AC 7)
- [ ] O conteúdo de Lançamentos mede até 1.024 px em 1.920 px (TRES-01 AC 8)
- [ ] Em 400 px, a navegação fica na barra de baixo e a barra do topo tem a marca, o importar, o tema e o nome (TRES-01 AC 9)
- [ ] Em 400 px, a home, a Visão geral, Lançamentos, Todo mês e Categorias não rolam na horizontal (TRES-01 AC 10)
- [ ] A Visão geral não tem "Importar planilha" fora do `aside` (TRES-02 AC 6)
- [ ] A barra de filtros compacta de Lançamentos não cobre o menu em 1.280 px, medido no navegador
- [ ] O botão de importar do pé usa a variante discreta, sem o azul de ação (Global Constraints, azul escasso)
- [ ] O e2e inteiro passa (96 cenários); a única mudança nos specs antigos é o alvo `dialog[open]` do foco preso em `lancamento-avulso.spec.ts`
- [ ] Os comentários de `(app)/layout.tsx` e `(app)/page.tsx` sobre a pílula e a home sem navegação lateral dizem o que o código faz agora
**Tests**: componentes, e2e
**Gate**: e2e
**Commit**: `feat(moldura): menu na borda esquerda em todas as telas`

### Phase 3 — Visão geral

#### T4: Um cadastro de lançamento só
**What**:
- extrair de Lançamentos o cadastro com as abas Avulso e Parcelado para `cadastro-de-lancamento.tsx`;
- extrair da tabela o `ValorDaNatureza`.

Nada muda na tela.

**Where**:
- `src/app/(app)/[competencia]/cadastro-de-lancamento.tsx`
- `src/app/(app)/[competencia]/lancamentos/page.tsx`
- `src/components/valor-da-natureza.tsx` (+ teste)
- `src/components/tabela-lancamentos.tsx`

**Depends on**: nenhuma
**Reuses**: `SeletorDeFormulario`, `FormLancamentoAvulso`, `FormCompra`, `dataPadraoDoLancamento`
**Requirement**: TRES-03, TRES-05
**Done when**:
- [x] `ValorDaNatureza`: a entrada com "+" e `text-positivo`, a despesa com "−" e `text-negativo`, o investimento sem sinal e em `text-ink`, cada um com o rótulo só para leitor de tela (TRES-05 AC 3)
- [x] Os testes atuais da tabela e o e2e de lançamento avulso e de compra parcelada passam sem mudar o que afirmam (TRES-03 AC 4)
**Tests**: componentes, e2e
**Gate**: e2e
**Commit**: `refactor(lancamentos): um cadastro de lançamento reutilizável`

#### T5: Próximos meses em linhas
**What**: `HorizonteFuturo` com uma linha por mês, sem a régua horizontal.
**Where**: `src/components/horizonte-futuro.tsx` (+ teste), `e2e/saldo-futuro.spec.ts` se a consulta depender do cartão
**Depends on**: nenhuma
**Reuses**: `apresentarSaldo`, a animação de entrada
**Requirement**: TRES-02
**Done when**:
- [ ] Os testes de SALDO-03 do componente e do e2e continuam passando sem mudar o que afirmam (TRES-02 AC 4)
- [ ] A lista não rola na horizontal: o `<ul>` não tem `overflow-x`, medido no e2e de 400 px (TRES-02 AC 4)
**Tests**: componentes, e2e
**Gate**: e2e
**Commit**: `feat(painel): próximos meses em linhas`

#### T6: Os últimos lançamentos na tela
**What**: o componente da lista, com a pill da categoria, a data, o valor e o link "Ver todos".
**Where**: `src/components/ultimos-lancamentos.tsx` (+ teste)
**Depends on**: T1, T4
**Reuses**: `ultimosLancamentos`, `ValorDaNatureza`, `CLASSES_DA_COR`, `Chip`, `formatarData`
**Requirement**: TRES-05
**Done when**:
- [ ] Cada linha tem a descrição, a data, a pill e o valor (TRES-05 AC 3)
- [ ] Pill com a cor da categoria; "Receita" neutra na entrada; "Sem categoria" neutra no gasto sem categoria (TRES-05 AC 3)
- [ ] Lista vazia mostra "Nenhum lançamento até hoje neste mês." (TRES-05 AC 4)
- [ ] "Ver todos" junto do título leva a `/<competência>/lancamentos` (TRES-05 AC 5)
**Tests**: componentes
**Gate**: quick
**Commit**: `feat(painel): lista dos últimos lançamentos`

#### T7: A Visão geral em colunas
**What**:
- o centro em painéis: título, cards, e categorias ao lado dos próximos meses;
- a coluna de ação com o cadastro aberto, a busca e os últimos;
- o esqueleto de carregamento com a forma nova;
- os e2e de MOV-03 e do esqueleto acompanhando;
- o e2e do fluxo.

**Where**:
- `src/app/(app)/[competencia]/page.tsx`
- `src/app/(app)/[competencia]/loading.tsx`
- `e2e/visao-tres-colunas.spec.ts`
- `e2e/compra-parcelada.spec.ts` (`exact` no rótulo do card)
- `e2e/acessibilidade.spec.ts` (contagem do esqueleto)
**Depends on**: T3, T5, T6
**Reuses**: `CadastroDeLancamento`, `UltimosLancamentos`, `next/form`, `GradeDeIndicadores`, `GraficoCategorias`, `HorizonteFuturo`
**Requirement**: TRES-02, TRES-03, TRES-04, TRES-05
**Done when**:
- [ ] Em 1.920 px, a coluna de ação fica à direita do centro, na mesma altura, e o centro passa de 1.024 px (TRES-02 AC 1)
- [ ] O centro mostra, nesta ordem, o título com o alternador, os cards e as duas seções, com as duas lado a lado em 1.920 px (TRES-02 ACs 2 e 3)
- [ ] Em 1.024 px, a coluna de ação fica abaixo do centro (TRES-02 AC 5)
- [ ] A coluna de ação tem o cadastro aberto, sem diálogo, com as abas "Avulso" e "Parcelado" (TRES-03 AC 1)
- [ ] Lançar um avulso de R$ 100,00 pela coluna aumenta "Despesas do mês" em R$ 100,00 e põe o gasto no topo dos últimos, sem recarga (TRES-03 AC 2)
- [ ] Depois de gravar, o cadastro continua na tela com a confirmação (TRES-03 AC 3)
- [ ] Buscar "Item B" leva a `/<competência>/lancamentos?busca=Item+B`, com o campo de busca preenchido e só o que casa (TRES-04 ACs 1 e 2)
- [ ] Buscar vazio leva a Lançamentos sem filtro de busca (TRES-04 AC 3)
- [ ] Com 10 lançamentos até hoje e um com data futura, a coluna mostra os 8 mais recentes, nenhum futuro (TRES-05 AC 1)
- [ ] O cadastro e o GSAP ficam fora do `TransicaoMes`, e o cabeçalho, os cards e as categorias ficam dentro
- [ ] O esqueleto tem 9 blocos, centro mais coluna de ação, e o e2e do esqueleto conta 9 (REDE-03 AC 5)
- [ ] `compra-parcelada.spec.ts` (MOV-03) passa procurando o rótulo exato do card, sem afrouxar o que afirma
- [ ] O comentário de `lancamentos/page.tsx` sobre o cadastro "não no painel" diz o que o código faz agora
**Tests**: e2e
**Gate**: e2e
**Commit**: `feat(painel): visão geral em três colunas`

### Phase 4 — Fechamento

#### T8: A decisão registrada
**What**:
- AD-019 no `STATE.md`: a moldura com o menu na borda, e o cadastro também aberto na Visão geral, o que revê o AD-014 só nessa tela;
- notas de substituição em IMP-08 AC 1, no objetivo e na premissa de cadastro de `painel-e-lancamentos` e na premissa de diálogo de `lancamento-avulso`;
- a seção de largura de `docs/design.md` e o comentário de `--container-conteudo` em `globals.css`.

**Where**:
- `.specs/STATE.md`
- `.specs/features/{importar-planilha,painel-e-lancamentos,lancamento-avulso}/spec.md`
- `docs/design.md`
- `src/app/globals.css`

**Depends on**: T7
**Reuses**: nenhuma
**Requirement**: TRES-01, TRES-02
**Done when**:
- [ ] AD-019 registrado, com o motivo e o que ele revê (AD-014 na Visão geral)
- [ ] IMP-08 AC 1 marcado como substituído por TRES-02 AC 6; as premissas de cadastro em diálogo marcadas como revistas na Visão geral
- [ ] `docs/design.md` explica por que a largura extra vira coluna, e não linha mais comprida
- [ ] `pnpm verify` e o e2e inteiro passam
**Tests**: none
**Gate**: build
**Commit**: `docs(visao-tres-colunas): registrar a moldura e a visão em colunas`
