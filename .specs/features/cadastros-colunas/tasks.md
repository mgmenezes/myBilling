# Cadastros em abas, com o item aberto à direita — Tasks

**Spec**: `.specs/features/cadastros-colunas/spec.md`
**Design**: `.specs/features/cadastros-colunas/design.md`
**Status**: Aprovado pelo dono em 2026-10-30; em execução (branch `feat/cadastros-colunas`, em
worktree `.worktrees/cadastros-colunas`, a partir de `feat/lancamentos-densos` em `514ab25`; T1 a
T4 concluídas)
**Total**: 22 tasks em 6 fases (T1–T22). Dá três lotes: fases 1 e 2 (T1–T7), fases 3 e 4 (T8–T15)
e fases 5 e 6 (T16–T22), com a oferta de sub-agentes antes do Execute.

**Pré-condição**: Todo mês (AD-021) entra antes. Antes da T1, esta branch é rebaseada sobre a que
tiver Todo mês (`feat/todo-mes-colunas`, ou `main` depois do merge), e a base de testes é medida de
novo. Os conflitos esperados e o que fazer se Todo mês não entrar antes estão no design, "Sequência
com Todo mês". Nenhuma task depende de código de Todo mês.

O lote 1 (T1–T7, sem tela) roda antes do rebase sobre Todo mês, por decisão do orquestrador: ele não
toca arquivos de tela; o rebase acontece antes da T8.

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

Um teste antigo só muda quando a spec desta fatia muda a regra que ele prova, ou a estrutura que ele
consulta, e a mudança fica registrada no commit (`design.md`, "Testes que mudam porque a spec
mudou"). `lista-de-categorias.test.tsx` só sai na T15, depois de cada teste dele ter o equivalente
nomeado nas T11 a T14 (`design.md`, "Para onde vai cada teste").

**Blast radius:** a aprovação autoriza implementação e commits **locais**. `git push` e qualquer
operação remota exigem autorização separada. O e2e usa a porta 3100 e o banco de teste: uma execução
por vez, e nunca junto com outro agente ou Verifier.

---

## Global Constraints

- **Sem mudança de banco.** Nenhuma migration, nenhuma coluna.
- **Só contagem, nenhuma soma** (AD-003): o uso no mês conta linhas; nenhum valor de `movimento`,
  `recorrencia_versao` ou `compra_parcelada` é lido.
- **Domínio puro** (AD-006): `usoNoMes` e `mudancasDoMeio` não importam nada de fora do domínio, não
  lançam e não são `async`. 100% de branches em `src/domain`.
- **Toda action** com `requireSession()` na primeira instrução, Zod no servidor e nada lançado para o
  cliente.
- **Um painel por aba,** `<aside id="painel-da-categoria" aria-label="Painel da categoria">` ou
  `<aside id="painel-do-meio" aria-label="Painel do meio de pagamento">`, com um formulário por vez.
  Ele muda de lugar só por CSS.
- **Regras de criar sem mudança.** `criarCategoria` e `criarMeioDePagamento` mudam só a revalidação.
- **Densidade só no mouse:** só o botão da linha baixa, e só com `md:pointer-fine:`. No toque e
  abaixo de 768 px, todo alvo continua com 44 px (TOQUE-01).
- **Layout se prova no navegador:**
  - medir com `boundingBox` e estilo computado, depois de esperar a página pronta;
  - todo limiar com casos colados nos dois lados (L-029): 767 e 768 px, 1.535 e 1.536 px, o começo e
    o fim de um fixo no mês aberto, e os dias 0, 1, 31 e 32;
  - AC universal ("toda linha", "toda tela") percorre todos os elementos (L-030);
  - consulta que situa um elemento fica presa à região dele: a linha, a tabela ou o painel (L-018).
- **Composição de ponta a ponta** (L-014, L-001): materialização e contagem igual ao filtro de
  Lançamentos provadas na página real, abrindo Cadastros primeiro.
- **AC com duas cláusulas, duas assertions** (L-010), por exemplo o clique na linha e no botão.
- **Regra nos dois lados, caso nos dois lados** (L-041): nome vazio, nome longo e dia fora de 1 a 31
  recusados no navegador e no servidor.
- **Gate:** o de toda task inclui `pnpm typecheck` (L-016).

## Review Focus

1. **"Lançamentos em <Mês>" igual à contagem de Lançamentos com o filtro**, inclusive com o avulso
   cancelado, o de outro mês, a parcela, a receita fixa sem categoria e o fixo encerrado. Teste em T2
   (concordância com `filtrarLancamentos`) e T15 e T20 (e2e pelo link).
2. **Materialização antes da contagem.** Teste em T2 (fakes e Postgres) e T15 (abrir Cadastros
   primeiro).
3. **Nome do meio único entre os ativos, em qualquer caixa,** e o próprio meio mudando só a caixa.
   T5 e T6.
4. **Limiares dos dois lados:** 767/768 px (T15, T20) e 1.535/1.536 px (T21).
5. **Nenhum teste de `lista-de-categorias.test.tsx` perdido.** A tabela do design, conferida na T15.

---

## Test Coverage Matrix

> Gerada a partir do código, de `AGENTS.md`, de `vitest.config.ts` (branches 100% em `src/domain`) e
> da spec. Confirmar antes do Execute.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Domínio (`src/domain/cadastro`) | unit | 100% de branches; 1:1 com as regras de CADCOL-03 e CADCOL-07; limiares colados nos dois lados | `src/domain/cadastro/*.test.ts` | `pnpm test:unit` |
| Aplicação (`src/application/cadastros/*`) | unit, com os fakes; integration no caso de uso de leitura | Todo ramo e todo caminho de erro; a materialização antes da leitura; a concordância com `filtrarLancamentos` | `handler.test.ts` e `handler.integration.test.ts` ao lado | `pnpm test:unit`, `pnpm test:integration` |
| Repositório (`cadastro.repository.ts`) | integration | A escrita nova, com os `CHECK` do banco | `cadastro.repository.integration.test.ts` | `pnpm test:integration` |
| Schemas | unit | Cada regra e cada mensagem | `src/application/schemas/*.test.ts` | `pnpm test:unit` |
| Server Actions | integration | `requireSession()` primeiro, Zod, cada código de erro com campo, a revalidação, nada gravado na recusa | `src/app/actions/*.integration.test.ts` | `pnpm test:integration` |
| Componentes | componentes (Testing Library) | Cada AC de comportamento, com consulta presa à região; cada teste de `lista-de-categorias.test.tsx` portado | `src/components/*.test.tsx`, `src/components/*.test.ts` | `pnpm test:unit` |
| Página e fluxo | e2e | Composição de ponta a ponta; layout medido; limiares dos dois lados; toda linha percorrida | `e2e/cadastros-colunas.spec.ts` e os e2e que mudam | `pnpm exec playwright test <specs>` |
| Docs e decisão | none | — (gate build) | — | — |

## Gate Check Commands

| Gate | Comando |
| --- | --- |
| `quick` | `pnpm test:unit && pnpm typecheck && pnpm lint` |
| `full` | `pnpm db:up && pnpm test:unit && pnpm typecheck && pnpm lint && pnpm test:integration` |
| `e2e` | `pnpm test:unit && pnpm typecheck && pnpm lint && pnpm exec playwright test <specs da task>` |
| `build` | `pnpm db:up && pnpm verify`, depois `pnpm test:e2e` inteiro |

O e2e roda com `DATABASE_URL_TEST` apontando para o banco de teste separado, porta 3100, uma
execução por vez. Cada comando tem o código de saída conferido sozinho, sem `tail` no meio. Base
medida em 2026-10-30 nesta worktree, antes do rebase: `pnpm test:unit` com 1.703 testes em 109
arquivos, e `pnpm typecheck` e `pnpm lint` saindo 0.

---

## Execution Plan

### Phase 1 — O uso no mês

```
T1 -> T2
```

### Phase 2 — A edição do meio e as revalidações

```
T3 -> T4
T3 -> T5
T4 -> T5
T5 -> T6
T7
```

### Phase 3 — As peças comuns

```
T8
T9
T10
```

### Phase 4 — Categorias

```
T11 -> T12
T11 -> T14
T12 -> T14
T13 -> T14
T14 -> T15
```

### Phase 5 — Meios de pagamento

```
T16 -> T17
T16 -> T19
T17 -> T19
T18 -> T19
T19 -> T20
```

### Phase 6 — A coluna e o fechamento

```
T21 -> T22
```

Três lotes: T1 a T7, T8 a T15, e T16 a T22, nesta ordem.

---

## Task Breakdown

### Phase 1 — O uso no mês

#### T1: `usoNoMes`, a contagem do mês
**What**: a função pura que conta, por categoria e por meio, os fixos que valem no mês aberto e os
lançamentos do mês.
**Where**:
- `src/domain/cadastro/uso-no-mes.ts` (+ teste)
- `src/domain/index.ts` (export)

**Depends on**: nenhuma
**Reuses**: `janelaMaterializacao`
**Requirement**: CADCOL-03
**Done when**:
- [x] Conta o fixo que começou antes e não tem fim, o que começa no mês aberto e o que termina no mês aberto (CADCOL-03 AC 1)
- [x] Não conta o fixo que começa no mês seguinte nem o que terminou no mês anterior: cada borda com o caso colado dos dois lados (CADCOL-03 AC 2, L-029)
- [x] Conta o lançamento da competência, de qualquer natureza e origem; deixa fora o cancelado e o de outra competência (CADCOL-03 AC 3)
- [x] O fixo e o lançamento sem categoria contam só para o meio; a receita fixa conta para o meio dela (CADCOL-03 AC 6)
- [x] Um fixo do mês conta em `fixos`, e a ocorrência dele em `lancamentos`, cada um com a sua assertion (CADCOL-03 ACs 1 e 3, L-010)
- [x] Categoria e meio sem uso ficam fora dos mapas, e `SEM_USO` é `{ fixos: 0, lancamentos: 0 }`
- [x] `src/domain/shared/arquitetura.test.ts` passa; 100% de branches em `src/domain`
- [x] Gate quick passa; nenhum teste de antes some
**Tests**: unit
**Gate**: quick
**Commit**: `feat(domain): contar o uso de categorias e meios no mês` (`b0171ac`)

#### T2: `obterUsoNoMes`, materializar e contar
**What**: o caso de uso de leitura: materializa a janela, lê fixos e lançamentos do mês e chama
`usoNoMes`.
**Where**: `src/application/cadastros/obter-uso-no-mes/handler.ts` (+ teste unitário e de integração)
**Depends on**: T1
**Reuses**: `materializarRecorrencias`, `MESES_DE_PROJECAO`, `@/application/ports/fakes`, `obterVisaoMensal`, `filtrarLancamentos`
**Requirement**: CADCOL-03
**Done when**:
- [x] Com os fakes, num mês nunca aberto, a ocorrência do fixo entra em `lancamentos` da categoria e do meio dele; ler antes de materializar derruba as duas contagens (CADCOL-03 AC 5)
- [x] Para cada categoria e cada meio da fixture (avulso cancelado, avulso de abril, parcela, receita fixa sem categoria, fixo encerrado em fevereiro), `lancamentos` é igual a `filtrarLancamentos((await obterVisaoMensal(fakes, competencia)).lancamentos, { categoriaId })` `.length`, e o mesmo com `meioPagamentoId` (CADCOL-03 AC 4, L-014)
- [x] Integração com Postgres: um fixo inserido sem ocorrência, um avulso cancelado e um de abril; as contagens de março saem certas, e chamar duas vezes não cria ocorrência nova (CADCOL-03 ACs 3 e 5)
- [x] Gate full passa; a contagem de testes só cresce
**Tests**: unit, integration
**Gate**: full
**Commit**: `feat(cadastros): ler o uso no mês depois de materializar` (`4c300fd`)

### Phase 2 — A edição do meio e as revalidações

#### T3: `mudancasDoMeio`, o que a edição muda
**What**: a função pura que confere o ciclo contra o tipo e devolve só o que mudou, ou `null`.
**Where**:
- `src/domain/cadastro/mudancas-do-meio.ts` (+ teste)
- `src/domain/shared/result.ts` (código `CICLO_NAO_CORRESPONDE_AO_TIPO`)
- `src/domain/index.ts` (export)
- `src/lib/erros.ts` (a mensagem do código novo)

**Depends on**: nenhuma
**Reuses**: `geraFatura`
**Requirement**: CADCOL-07
**Done when**:
- [x] No cartão: o nome diferente devolve `{ nome }`; o fechamento diferente, `{ diaFechamento }`; o vencimento diferente, `{ diaVencimento }`; os três diferentes, os três (CADCOL-07 AC 5)
- [x] O nome que difere só na caixa é mudança (CADCOL-07 AC 8)
- [x] Tudo igual devolve `ok(null)`, no cartão e na conta (CADCOL-07 AC 9)
- [x] Conta ou rótulo com ciclo, e cartão sem ciclo, devolvem `CICLO_NAO_CORRESPONDE_AO_TIPO`: uma assertion para cada (CADCOL-07 AC 11, L-010)
- [x] O tipo nunca aparece no resultado (CADCOL-07 AC 4)
- [x] `mensagemDoErro("CICLO_NAO_CORRESPONDE_AO_TIPO")` é "Dia de fechamento e de vencimento existem só no cartão de crédito, e nele são obrigatórios."
- [x] 100% de branches em `src/domain`; `arquitetura.test.ts` passa
- [x] Gate quick passa; a contagem de testes só cresce
**Tests**: unit
**Gate**: quick
**Commit**: `feat(domain): o que muda ao editar um meio de pagamento` (`27bbb93`)
**Nota**: a mensagem do código novo ganhou um teste em `src/lib/erros.test.ts`, arquivo que não
estava em **Where**. Sem ele, o item da mensagem não teria assertion: `erros.ts` não tinha teste, e
o domínio não pode importar `@/lib`.

#### T4: `atualizarMeioDePagamento`, a escrita do meio
**What**: a port `EdicaoDeMeioRepository`, a escrita no repositório Drizzle e o fake.
**Where**:
- `src/application/ports/repositories.ts` (port nova)
- `src/infrastructure/db/repositories/cadastro.repository.ts` (+ `cadastro.repository.integration.test.ts`)
- `src/application/ports/fakes.ts` (+ `fakes.test.ts`)

**Depends on**: T3
**Reuses**: `paraMeioPagamento`, os `CHECK` de `schema.ts:69-83`
**Requirement**: CADCOL-07
**Done when**:
- [x] Com `{ nome }`, grava só o nome; com os dois dias, grava só os dias; tipo, `gera_fatura`, `fechamento_vai_para_fatura_seguinte` e `arquivado_em` ficam como estavam, lidos do banco
- [x] Dia 0 ou 32 é recusado pelo `CHECK` `meio_pagamento_dias_validos`, e a linha fica como estava
- [x] Dias numa conta são recusados pelo `CHECK` `meio_pagamento_cartao_tem_ciclo`
- [x] Id inexistente lança, sem gravar
- [x] O fake cumpre o mesmo contrato, com teste
- [x] O comentário de `cadastro.repository.ts:17-22` diz quem escreve meio agora
- [x] Gate full passa; a contagem de testes só cresce
**Tests**: integration
**Gate**: full
**Commit**: `feat(cadastros): gravar nome e dias de um meio de pagamento`

#### T5: `editarMeioDePagamento`, o caso de uso
**What**: o caso de uso que recusa o meio inexistente ou arquivado, aplica `mudancasDoMeio`, confere o
nome entre os ativos e grava.
**Where**: `src/application/cadastros/editar-meio-de-pagamento/handler.ts` (+ teste)
**Depends on**: T3, T4
**Reuses**: `mudancasDoMeio`, `EdicaoDeMeioRepository`, `FakeCadastroRepository`
**Requirement**: CADCOL-07
**Done when**:
- [ ] Meio inexistente e meio arquivado devolvem `MEIO_PAGAMENTO_NAO_ENCONTRADO`, sem gravar: uma assertion para cada (CADCOL-07 AC 12)
- [ ] Ciclo que não corresponde ao tipo devolve `CICLO_NAO_CORRESPONDE_AO_TIPO`, sem gravar (CADCOL-07 AC 11)
- [ ] Nada mudou: `alterado: false`, sem consultar o nome e sem gravar (CADCOL-07 AC 9)
- [ ] O nome de outro meio ativo, em outra caixa, devolve `MEIO_PAGAMENTO_JA_EXISTE`, sem gravar (CADCOL-07 AC 6)
- [ ] O nome de um meio arquivado grava; o próprio nome mudando só a caixa grava (CADCOL-07 ACs 7 e 8)
- [ ] Só os dias mudando não consulta o nome; o sucesso grava as mudanças e devolve o meio gravado com `alterado: true` (CADCOL-07 AC 5)
- [ ] Gate quick passa; a contagem de testes só cresce
**Tests**: unit
**Gate**: quick
**Commit**: `feat(cadastros): editar nome e dias de um meio de pagamento`

#### T6: As actions de meio: editar e a revalidação de criar
**What**: o schema da edição, a action `editarMeioDePagamento`, as mensagens e
`revalidarTelasDoMeio()`, usada também por `criarMeioDePagamento`.
**Where**:
- `src/app/actions/meios-de-pagamento.ts` (+ `meios-de-pagamento.integration.test.ts`, novo)
- `src/application/schemas/meio-pagamento.schema.ts` (+ teste)
- `src/lib/erros.ts`

**Depends on**: T5
**Reuses**: `criarNomeSchema`, `diaDoCiclo`, o envelope e o `falhaInesperada` de `categorias.ts`
**Requirement**: CADCOL-07, CADCOL-08
**Done when**:
- [ ] `entradaEdicaoDoMeioSchema`: estrito; recusa id que não é uuid e chave a mais; normaliza o nome; recusa nome vazio e com 41 caracteres e aceita 40; recusa dia 0 e 32 e aceita 1 e 31, com as mensagens da criação; aceita `ciclo: null` (CADCOL-07 AC 10, L-029)
- [ ] `requireSession()` é a primeira instrução de `editarMeioDePagamento` e de `criarMeioDePagamento`; sem sessão, as duas devolvem `NAO_AUTENTICADO` sem tocar no banco nem revalidar
- [ ] Contra o Postgres: o nome e os dias gravados, lidos de volta; `revalidatePath("/", "layout")` chamado uma vez (CADCOL-07 ACs 5 e 14)
- [ ] Nada mudou: nada gravado e nenhuma revalidação (CADCOL-07 AC 9)
- [ ] Cada recusa com a mensagem e o campo: "Já existe outro meio de pagamento com esse nome." em `nome`; "Esse meio de pagamento não existe mais."; a mensagem do ciclo; `VALIDACAO` com o campo de cada dia; nada gravado e nada revalidado em nenhuma delas (CADCOL-07 ACs 6, 10, 11 e 12)
- [ ] Falha do banco vira `ERRO_INESPERADO` com referência, sem gravar nem revalidar
- [ ] `criarMeioDePagamento` revalida `("/", "layout")`, recusa o nome de um ativo em qualquer caixa com "Já existe um meio de pagamento com esse nome." e cria com o nome de um arquivado (CADCOL-08 ACs 4 e 5)
- [ ] `pnpm exec playwright test e2e/importacao.spec.ts e2e/compra-parcelada.spec.ts` passa sem mudança: o meio criado dentro do diálogo e do formulário continua selecionado
- [ ] Gate full passa; a contagem de testes só cresce
**Tests**: integration
**Gate**: full
**Commit**: `feat(meios): action de editar meio e revalidação do layout`

#### T7: `criarCategoria` revalida as telas da categoria
**What**: o sucesso de `criarCategoria` passa a chamar `revalidarTelasDaCategoria()`, que inclui a
tela de Cadastros.
**Where**: `src/app/actions/categorias.ts` (+ teste de integração)
**Depends on**: nenhuma
**Reuses**: `revalidarTelasDaCategoria`
**Requirement**: CADCOL-05
**Done when**:
- [ ] Criar, reaproveitar uma ativa e reativar uma arquivada revalidam as quatro rotas de `ROTAS_REVALIDADAS`: uma assertion para cada caminho (CADCOL-05 ACs 2 a 4)
- [ ] Nome vazio é recusado sem revalidar
- [ ] O `it.each` de `requireSession` primeiro inclui `criarCategoria`
- [ ] Gate full passa; a contagem de testes só cresce
**Tests**: integration
**Gate**: full
**Commit**: `feat(categorias): criar categoria revalida a tela de Cadastros`

### Phase 3 — As peças comuns

#### T8: `CamposDoMeio`, os campos fora do cadastro inline
**What**: os campos de nome, tipo e dias de `CadastroDeMeioInline`, tirados para um componente
controlado, com o tipo em texto quando a lista de tipos é `null`.
**Where**:
- `src/components/campos-do-meio.tsx` (+ teste)
- `src/components/cadastro-de-meio-inline.tsx` (passa a usar)

**Depends on**: nenhuma
**Reuses**: os campos de `cadastro-de-meio-inline.tsx:133-195`, `TIPOS_DE_MEIO`, `MAX_NOME_MEIO`
**Requirement**: CADCOL-07, CADCOL-08
**Done when**:
- [ ] `cadastro-de-meio-inline.test.tsx`, `form-lancamento-avulso.test.tsx` e `passo-pendencias.test.tsx` passam sem mudança
- [ ] Com `tipos`, "Tipo" é o seletor com eles; com `null`, o tipo aparece em texto com "O tipo não muda. Para trocar, cadastre outro meio.", sem `combobox` nem `radio` de tipo (CADCOL-07 ACs 2 e 4)
- [ ] "Dia de fechamento" e "Dia de vencimento" só aparecem com o tipo cartão: uma assertion com cartão e uma com conta (CADCOL-07 AC 3, CADCOL-08 AC 2)
- [ ] O rótulo do nome vem por prop
- [ ] Gate quick passa; a contagem de testes só cresce
**Tests**: componentes
**Gate**: quick
**Commit**: `refactor(meios): campos do meio fora do cadastro inline`

#### T9: `ColunaDeCadastro`, o painel e a coluna única
**What**: a grade em coluna única (cabeçalho, painel, lista), o invólucro do painel com título,
"Fechar", `Escape` e foco, e o vazio da coluna.
**Where**: `src/components/coluna-de-cadastro.tsx` (+ teste)
**Depends on**: nenhuma
**Reuses**: o padrão de `lancamentos/page.tsx:199-237`
**Requirement**: CADCOL-04, CADCOL-09, CADCOL-10
**Done when**:
- [ ] Na ordem do DOM: cabeçalho, painel e lista (CADCOL-09 AC 5, a ordem; a medida é da T15)
- [ ] Nada aberto: nenhum `complementary` com o nome do painel; o bloco vazio com o título e a dica recebidos está no DOM (CADCOL-09 ACs 3 e 6, os textos; a visibilidade por largura é medida na T15 e na T21)
- [ ] Algo aberto: `aside` com o `id` e o `aria-label` recebidos, o conteúdo recebido e "Fechar", que chama `aoFechar` (CADCOL-04 AC 15)
- [ ] `TituloDoPainel` desenha um `h2` com `tabIndex={-1}`
- [ ] `Escape` com o foco num campo do painel chama `aoFechar`; `Escape` fora do painel, não (CADCOL-10 AC 3)
- [ ] Mudar `focarTitulo` leva o foco ao `h2` do conteúdo; montar já aberto não leva (CADCOL-10 AC 2, CADCOL-11 AC 2)
- [ ] Gate quick passa; a contagem de testes só cresce
**Tests**: componentes
**Gate**: quick
**Commit**: `feat(cadastros): coluna de cadastro com o painel do item`

#### T10: `CabecalhoDeCadastros`, o título e as abas
**What**: o `h1` "Cadastros", a ação ao lado e a navegação "Cadastros" com as duas abas.
**Where**: `src/components/cabecalho-de-cadastros.tsx` (+ teste)
**Depends on**: nenhuma
**Reuses**: nenhuma
**Requirement**: CADCOL-01
**Done when**:
- [ ] `h1` "Cadastros"; navegação "Cadastros" com "Categorias" para `/2026-03/cadastros/categorias` e "Meios de pagamento" para `/2026-03/cadastros/meios-de-pagamento` (CADCOL-01 ACs 1 e 2)
- [ ] `aria-current="page"` só no link da aba recebida, testado com cada aba (CADCOL-01 AC 3)
- [ ] A ação recebida aparece dentro do cabeçalho, depois do `h1` (CADCOL-01 AC 6)
- [ ] Gate quick passa; a contagem de testes só cresce
**Tests**: componentes
**Gate**: quick
**Commit**: `feat(cadastros): título e abas de Cadastros`

### Phase 4 — Categorias

#### T11: `TabelaDeCategorias`, uma linha por categoria
**What**: a tabela "Categorias" com a pill, o texto da cor e as contagens, a linha aberta e o vazio;
o tipo `ItemDeCategoria`; `NOME_DA_COR` e `textoDaCor` em `cor-de-categoria.ts`.
**Where**:
- `src/components/tabela-de-categorias.tsx` (+ teste)
- `src/components/cor-de-categoria.ts` (+ teste; `NOME_DA_COR` sai de `lista-de-categorias.tsx`)

**Depends on**: nenhuma
**Reuses**: `Chip`, `corDaCategoria`, `corAutomatica`, a `CELULA` de `tabela-lancamentos.tsx`
**Requirement**: CADCOL-02, CADCOL-04
**Done when**:
- [ ] Tabela "Categorias" com os cabeçalhos Categoria, Cor, "Fixos em Março" e "Lançamentos em Março" (CADCOL-02 AC 1)
- [ ] As linhas na ordem recebida; a pill de cada uma na cor escolhida ou na automática, procurada dentro da linha (CADCOL-02 AC 3, L-018); equivalentes de 146, 155 e 161 de `lista-de-categorias.test.tsx`
- [ ] Coluna Cor com "Laranja" na escolhida e "Automática (Azul)" na automática; `textoDaCor` testado nas dez cores (CADCOL-02 AC 4)
- [ ] As duas contagens na linha, com "0" sem uso, e o nome de cada contagem no texto da célula ("1 fixo", "2 lançamentos") (CADCOL-02 ACs 5 e 8, o texto; a medida é da T15)
- [ ] O único botão de cada linha é o da categoria (CADCOL-02 AC 6)
- [ ] Clicar na célula de uma contagem chama `aoAbrir` com o id; acionar o botão também: uma assertion para cada (CADCOL-04 AC 1, L-010)
- [ ] Botão da linha aberta com `aria-expanded="true"` e `aria-controls="painel-da-categoria"`, os outros com `"false"` (CADCOL-04 AC 13)
- [ ] Sem categoria, o aviso de CADCOL-02 AC 9 no lugar da tabela; equivalente de 455
- [ ] Gate quick passa; a contagem de testes só cresce
**Tests**: componentes
**Gate**: quick
**Commit**: `feat(categorias): a tabela de categorias com o uso no mês`

#### T12: `DetalheDaCategoria` e `OndeAparece`
**What**: o conteúdo do painel da categoria (renomear, as onze cores, o otimista e as recusas) e a
seção "Onde ela aparece", reusada pelo meio.
**Where**:
- `src/components/detalhe-da-categoria.tsx` (+ teste)
- `src/components/onde-aparece.tsx` (+ teste)

**Depends on**: T9, T11
**Reuses**: a lógica de `LinhaDeCategoria` (`lista-de-categorias.tsx:103-300`), `TituloDoPainel`, `nomeCategoriaSchema`, `CLASSES_DA_COR`, `NOME_DA_COR`
**Requirement**: CADCOL-04, CADCOL-07
**Done when**:
- [ ] Formulário "Renomear Categoria Um" com "Nome" preenchido com o gravado e "Salvar" (CADCOL-04 AC 2); equivalente de 297, com a regra nova
- [ ] Grupo "Cor de Categoria Um" com as onze opções, cada uma tingida com o nome, a em uso marcada, e "Automática (Ciano)" (CADCOL-04 AC 3); equivalentes de 169, 178, 193, 202 e 209
- [ ] Escolher uma cor manda uma vez, avisa "Cor trocada.", e marca a opção e pinta a pill do título antes da resposta; "Automática" manda `null` (CADCOL-04 AC 4); equivalentes de 217, 227, 238 e 257
- [ ] A cor recusada volta, o motivo aparece no painel em `alert`, sem aviso (CADCOL-04 AC 8); equivalente de 274
- [ ] Salvar o nome manda o nome novo, avisa "Categoria renomeada." e o campo continua com ele; enquanto grava, a pill do título mostra o nome novo na cor de antes (CADCOL-04 AC 6); equivalentes de 307 e 323
- [ ] O nome de outra categoria aparece em `alert` junto do campo, com `aria-invalid`, e o nome volta; falha sem campo mostra a mensagem geral; nome vazio e nome com 61 caracteres não chegam ao servidor (CADCOL-04 ACs 7 e 8, L-041); equivalentes de 359, 382 e 396
- [ ] Nome igual, com espaço sobrando, não grava nem avisa; só a caixa grava e avisa; o servidor dizendo que nada mudou não avisa (CADCOL-04 ACs 9 e 10); equivalentes de 412, 426 e 440
- [ ] `OndeAparece`: seção "Onde ela aparece" com "Fixos em Março de 2026" e "Lançamentos em Março de 2026" e os números, e o link "Ver em Lançamentos" para `/2026-03/lancamentos?categoriaId=<id>`; com `genero="ele"`, "Onde ele aparece" e `?meioPagamentoId=<id>` (CADCOL-04 ACs 11 e 12, CADCOL-07 AC 13)
- [ ] O título é um `TituloDoPainel` com a pill otimista, procurada pelo papel `heading` de nível 2
- [ ] Gate quick passa; a contagem de testes só cresce
**Tests**: componentes
**Gate**: quick
**Commit**: `feat(categorias): a categoria aberta, com cor, nome e onde aparece`

#### T13: `NovaCategoria`, o formulário de criação
**What**: o formulário "Nova categoria" do painel, com a validação no navegador e o aviso por
resultado.
**Where**: `src/components/nova-categoria.tsx` (+ teste)
**Depends on**: T9
**Reuses**: `nomeCategoriaSchema`, `TituloDoPainel`, `criarCategoria` (por prop)
**Requirement**: CADCOL-05
**Done when**:
- [ ] O título "Nova categoria" num `TituloDoPainel`; campo "Nome", a nota de CADCOL-05 AC 1, "Criar categoria" e "Cancelar" (CADCOL-05 AC 1)
- [ ] Nome vazio e nome com 61 caracteres recusados sem chamar o servidor, com a mensagem junto do campo; 60 caracteres passam (CADCOL-05 AC 5, L-029, L-041)
- [ ] O sucesso chama `aoCriada` com o id e "Categoria criada.", "Essa categoria já existia." ou "Categoria reativada.", conforme `jaExistia` e `reativada`: uma assertion para cada (CADCOL-05 ACs 2 a 4)
- [ ] A recusa do servidor aparece em `alert`, sem `aoCriada`
- [ ] "Cancelar" chama `aoCancelar` sem chamar o servidor (CADCOL-05 AC 6)
- [ ] Gate quick passa; a contagem de testes só cresce
**Tests**: componentes
**Gate**: quick
**Commit**: `feat(categorias): formulário de nova categoria`

#### T14: `CadastroDeCategorias`, o estado da aba e o endereço
**What**: o componente cliente da aba: cabeçalho com "+ Nova categoria", painel e tabela na
`ColunaDeCadastro`, o estado do que está aberto, `?categoria=` e o foco de volta.
**Where**:
- `src/components/cadastro-de-categorias.tsx` (+ teste)
- `src/components/parametro-na-url.ts` (+ teste)

**Depends on**: T9, T10, T11, T12, T13
**Reuses**: `ColunaDeCadastro`, `CabecalhoDeCadastros`, `TabelaDeCategorias`, `DetalheDaCategoria`, `NovaCategoria`, `useAvisos`
**Requirement**: CADCOL-01, CADCOL-04, CADCOL-05, CADCOL-10, CADCOL-11
**Done when**:
- [ ] "+ Nova categoria" dentro do cabeçalho, antes do painel e da tabela na ordem do DOM (CADCOL-01 AC 6)
- [ ] Abrir uma linha mostra a categoria no painel e chama `history.replaceState` com `?categoria=<id>`, mantendo os outros parâmetros; `pushState` não é chamado (CADCOL-04 AC 1, CADCOL-11 AC 1)
- [ ] `categoriaInicial` da lista abre o painel sem levar o foco; um id fora da lista deixa o painel fechado, sem erro (CADCOL-11 ACs 2 e 3)
- [ ] "+ Nova categoria" fecha a categoria aberta, mostra o formulário e tira `?categoria=` (CADCOL-05 AC 1, CADCOL-11 AC 4)
- [ ] Depois de criar: o painel abre na categoria criada, a URL leva o id dela, o foco vai ao título e o aviso é o de `NovaCategoria` (CADCOL-05 ACs 2 a 4, CADCOL-10 AC 2)
- [ ] "Fechar" e `Escape` devolvem o foco ao botão da linha; fechar o formulário devolve ao "+ Nova categoria"; a URL fica sem `categoria` (CADCOL-10 AC 4, CADCOL-11 AC 4)
- [ ] Trocar de categoria, ou abrir o "+ Nova categoria", com um nome digitado descarta o digitado sem gravar; reabrir mostra o gravado (CADCOL-04 AC 14); equivalente de 344
- [ ] A categoria aberta que some dos itens, numa renderização nova, volta o painel ao vazio e tira o parâmetro
- [ ] Gate quick passa; a contagem de testes só cresce
**Tests**: componentes
**Gate**: quick
**Commit**: `feat(categorias): o estado da aba de categorias, com a aberta no endereço`

#### T15: A aba Categorias de ponta a ponta
**What**:
- `cadastros/categorias/page.tsx` lê por `obterUsoNoMes`, monta os `ItemDeCategoria`, passa
  `?categoria=` e desenha `CadastroDeCategorias`, sem `AreaEstreita`;
- `ListaDeCategorias` sai;
- os e2e de categoria acompanham a regra nova;
- o e2e novo prova a composição.

**Where**:
- `src/app/(app)/[competencia]/cadastros/categorias/page.tsx`
- `src/components/lista-de-categorias.tsx` e `src/components/lista-de-categorias.test.tsx` (saem)
- `e2e/cadastros-colunas.spec.ts` (novo)
- `e2e/categorias.spec.ts`

**Depends on**: T2, T7, T14
**Reuses**: `obterUsoNoMes`, `CadastroDeCategorias`, `RecorrenciaRepositoryDrizzle`, `SEM_USO`
**Requirement**: CADCOL-01, CADCOL-02, CADCOL-03, CADCOL-04, CADCOL-05, CADCOL-09, CADCOL-10, CADCOL-11
**Done when**:
- [ ] Abrindo Categorias de março antes de qualquer outra tela, com a fixture do design: "Categoria Um" com "1" e "2", e "Categoria Dois" com "0" e "0", lidos dentro da linha de cada uma (CADCOL-02 AC 5, CADCOL-03 ACs 1 a 3 e 5, L-001, L-018)
- [ ] Depois, "Ver em Lançamentos" no painel de "Categoria Um" leva a Lançamentos de março com "2 lançamentos" no `status` da lista (CADCOL-03 AC 4, CADCOL-04 AC 12, L-014)
- [ ] `h1` "Cadastros", a aba "Categorias" com `aria-current="page"` e o item "Cadastros" ativo; o item da navegação abre esta aba (CADCOL-01 ACs 1, 3, 4 e 5)
- [ ] Criar "Categoria Nova" pelo painel: a linha aparece e o painel abre nela, com "Automática (<cor>)" marcada; criar "categoria um" abre "Categoria Um" com "Essa categoria já existia."; criar o nome de uma arquivada a reativa com "Categoria reativada." (CADCOL-05 ACs 2 a 4)
- [ ] Abrir "Categoria Um" põe `?categoria=<id>` na URL sem recarregar (um marcador posto em `window` antes do clique continua lá) e sem entrada nova no histórico (`history.length` igual); recarregar mostra a mesma aberta; `?categoria=` inexistente deixa o painel fechado (CADCOL-11 ACs 1 a 3)
- [ ] Teclado: `Tab` até o botão de "Categoria Um", `Enter`, o foco no título do painel; `Escape`, o foco de volta no botão e a URL sem `categoria` (CADCOL-10 ACs 1 a 4)
- [ ] Em 1.280 px:
  - o painel fica entre as abas e a tabela, e sem nada aberto não há painel (CADCOL-09 ACs 5 e 6);
  - abrir a última linha deixa o título do painel dentro da janela (CADCOL-10 AC 5);
  - a linha aberta tem fundo computado diferente das outras (CADCOL-04 AC 13);
  - com ponteiro fino, toda linha da tabela mede até 48 px, percorrendo todas (CADCOL-02 AC 7, L-030)
- [ ] Em 767 px, nenhum `columnheader` à vista e o botão de cada linha com ao menos 44 px de altura; em 768 px, os cabeçalhos à vista e o botão com menos de 44 px (CADCOL-02 AC 8, CADCOL-10 AC 6, L-029)
- [ ] Com `hasTouch` em 1.280 px, `matchMedia("(pointer: coarse)")` é verdadeiro e o botão de cada linha mede ao menos 44 × 44 (CADCOL-10 AC 6, L-044)
- [ ] Em 400 px com "Categoria Um" aberta: sem rolagem lateral; as contagens abaixo da pill; as 11 opções, "Salvar", "Fechar", as duas abas e "+ Nova categoria" com ao menos 44 × 44 (CADCOL-09 AC 7, CADCOL-02 AC 8, CADCOL-10 AC 7)
- [ ] `categorias.spec.ts` muda como manda a tabela "Testes que mudam porque a spec mudou" do design e passa; a ordem pt-BR (`:320`) continua provada pela página
- [ ] `lista-de-categorias.tsx` e o teste dele saem; a suíte unitária cai exatamente os 24 testes desse arquivo, todos com equivalente nas T11 a T14
- [ ] Gate e2e passa com `e2e/cadastros-colunas.spec.ts`, `e2e/categorias.spec.ts` e `e2e/visao-tres-colunas.spec.ts`
**Tests**: e2e
**Gate**: e2e
**Commit**: `feat(categorias): Cadastros com a categoria aberta no painel`

### Phase 5 — Meios de pagamento

#### T16: `TabelaDeMeios`, uma linha por meio
**What**: a tabela "Meios de pagamento" com tipo, dias e contagens, a linha aberta e o vazio; o tipo
`ItemDeMeio`.
**Where**: `src/components/tabela-de-meios.tsx` (+ teste)
**Depends on**: nenhuma
**Reuses**: `TIPOS_DE_MEIO`, a `CELULA` de `tabela-lancamentos.tsx`
**Requirement**: CADCOL-06, CADCOL-07
**Done when**:
- [ ] Tabela "Meios de pagamento" com "Meio de pagamento", Tipo, Fecha, Vence, "Fixos em Março" e "Lançamentos em Março" (CADCOL-06 AC 1)
- [ ] Tipo com "Cartão de crédito", "Conta corrente" e "Rótulo", um caso para cada (CADCOL-06 AC 3)
- [ ] "dia 25" e "dia 5" no cartão; "—" em Fecha e em Vence na conta e no rótulo (CADCOL-06 AC 4)
- [ ] As contagens com "0" sem uso e o nome escrito na célula (CADCOL-06 ACs 5 e 8, o texto)
- [ ] O único botão de cada linha é o do meio (CADCOL-06 AC 6)
- [ ] Clique numa célula e acionar o botão chamam `aoAbrir`: uma assertion para cada (CADCOL-07 AC 1, L-010)
- [ ] `aria-expanded` e `aria-controls="painel-do-meio"` como na de categorias (CADCOL-07 AC 15)
- [ ] Sem meio, o aviso de CADCOL-06 AC 9
- [ ] Gate quick passa; a contagem de testes só cresce
**Tests**: componentes
**Gate**: quick
**Commit**: `feat(meios): a tabela de meios de pagamento com o uso no mês`

#### T17: `DetalheDoMeio`, renomear e corrigir os dias
**What**: o conteúdo do painel do meio: o subtítulo, o formulário "Editar <nome>" com
`CamposDoMeio` sem troca de tipo, a nota dos dias, a validação no navegador e "Onde ele aparece".
**Where**: `src/components/detalhe-do-meio.tsx` (+ teste)
**Depends on**: T6, T8, T9, T12, T16
**Reuses**: `CamposDoMeio`, `OndeAparece`, `TituloDoPainel`, `entradaEdicaoDoMeioSchema`, `editarMeioDePagamento` (por prop)
**Requirement**: CADCOL-07
**Done when**:
- [ ] O nome num `TituloDoPainel` e o subtítulo "Cartão de crédito · fecha dia 25 · vence dia 5", "Conta corrente" ou "Rótulo", um caso para cada (CADCOL-07 AC 1)
- [ ] Formulário "Editar Cartão Roxo" com "Nome", o tipo em texto com a frase de CADCOL-07 AC 2 e "Salvar alterações"; nenhum controle de tipo (CADCOL-07 ACs 2 e 4)
- [ ] No cartão, os dois dias preenchidos e a nota dos dias; na conta, nem dias nem nota: uma assertion para cada (CADCOL-07 AC 3)
- [ ] Salvar manda `{ meioPagamentoId, nome, ciclo }`, com `ciclo: null` na conta, e avisa "Meio de pagamento salvo." (CADCOL-07 AC 5)
- [ ] Nome e dias iguais aos gravados, com espaço sobrando no nome, não chamam o servidor e não avisam (CADCOL-07 AC 9)
- [ ] Nome vazio, nome com 41 caracteres, dia 0 e dia 32 recusados no navegador com a mensagem junto do campo; 40 caracteres e os dias 1 e 31 chegam ao servidor (CADCOL-07 AC 10, L-029, L-041)
- [ ] A recusa do servidor no campo `nome` aparece em `alert` junto de "Nome", com `aria-invalid`; a sem campo aparece em `alert` no formulário (CADCOL-07 ACs 6, 11 e 12)
- [ ] "Onde ele aparece" com os números e o link do meio (CADCOL-07 AC 13)
- [ ] Gate quick passa; a contagem de testes só cresce
**Tests**: componentes
**Gate**: quick
**Commit**: `feat(meios): o meio aberto, com nome e dias editáveis`

#### T18: `NovoMeio`, o formulário de criação
**What**: o formulário "Novo meio de pagamento" do painel, com `CamposDoMeio` e os três tipos, a
ajuda e as mensagens de hoje.
**Where**: `src/components/novo-meio.tsx` (+ teste)
**Depends on**: T8, T9
**Reuses**: `CamposDoMeio`, `TituloDoPainel`, `entradaMeioPagamentoSchema`, `criarMeioDePagamento` (por prop)
**Requirement**: CADCOL-08
**Done when**:
- [ ] O título "Novo meio de pagamento" num `TituloDoPainel`; "Nome", "Tipo" com os três, começando em "Cartão de crédito", "Criar meio" e "Cancelar" (CADCOL-08 AC 1)
- [ ] Os dois dias só com cartão: uma assertion depois de escolher "Conta corrente" e outra depois de voltar a "Cartão de crédito" (CADCOL-08 AC 2)
- [ ] A ajuda de hoje para cartão e conta e a do rótulo; nome vazio, 41 caracteres, dia 0 e dia 32 recusados sem chamar o servidor (CADCOL-08 AC 3, L-041)
- [ ] O sucesso chama `aoCriado` com o id (CADCOL-08 AC 4)
- [ ] A recusa "Já existe um meio de pagamento com esse nome." aparece junto do campo, sem `aoCriado` (CADCOL-08 AC 5)
- [ ] "Cancelar" chama `aoCancelar` sem chamar o servidor (CADCOL-08 AC 6)
- [ ] Gate quick passa; a contagem de testes só cresce
**Tests**: componentes
**Gate**: quick
**Commit**: `feat(meios): formulário de novo meio no painel`

#### T19: `CadastroDeMeios`, o estado da aba e o endereço
**What**: o componente cliente da aba Meios de pagamento, com a mesma forma de `CadastroDeCategorias`
e `?meio=`.
**Where**: `src/components/cadastro-de-meios.tsx` (+ teste)
**Depends on**: T9, T10, T14, T16, T17, T18
**Reuses**: `ColunaDeCadastro`, `CabecalhoDeCadastros`, `TabelaDeMeios`, `DetalheDoMeio`, `NovoMeio`, `trocarParametroNaUrl`
**Requirement**: CADCOL-01, CADCOL-07, CADCOL-08, CADCOL-10, CADCOL-11
**Done when**:
- [ ] "+ Novo meio" no cabeçalho, antes do painel e da tabela (CADCOL-01 AC 6)
- [ ] Abrir uma linha mostra o meio e grava `?meio=<id>` por `replaceState`; `meioInicial` da lista abre sem foco; id fora da lista é ignorado (CADCOL-07 AC 1, CADCOL-11 ACs 1 a 3)
- [ ] "+ Novo meio" fecha o aberto, mostra o formulário e tira `?meio=` (CADCOL-08 AC 1, CADCOL-11 AC 4)
- [ ] Depois de criar: o painel abre no meio criado, com o id na URL, o foco no título e "Meio de pagamento criado." (CADCOL-08 AC 4, CADCOL-10 AC 2)
- [ ] "Fechar" e `Escape` devolvem o foco ao botão da linha ou ao "+ Novo meio" e tiram `?meio=` (CADCOL-10 AC 4, CADCOL-11 AC 4)
- [ ] Trocar de meio com algo digitado descarta o digitado (CADCOL-07 AC 15)
- [ ] O meio aberto que some dos itens, numa renderização nova, volta o painel ao vazio e tira o parâmetro
- [ ] Gate quick passa; a contagem de testes só cresce
**Tests**: componentes
**Gate**: quick
**Commit**: `feat(meios): o estado da aba de meios, com o aberto no endereço`

#### T20: A aba Meios de pagamento de ponta a ponta
**What**:
- `cadastros/meios-de-pagamento/page.tsx`, nova, lê por `obterUsoNoMes`, ordena pela regra do
  português, monta os `ItemDeMeio`, passa `?meio=` e desenha `CadastroDeMeios`;
- o e2e prova a composição;
- o laço de TRES-01, AC 10 ganha a tela nova.

**Where**:
- `src/app/(app)/[competencia]/cadastros/meios-de-pagamento/page.tsx` (nova)
- `e2e/cadastros-colunas.spec.ts`
- `e2e/visao-tres-colunas.spec.ts`

**Depends on**: T2, T6, T15, T19
**Reuses**: `obterUsoNoMes`, `CadastroDeMeios`, `editarMeioDePagamento`, `criarMeioDePagamento`
**Requirement**: CADCOL-01, CADCOL-03, CADCOL-06, CADCOL-07, CADCOL-08, CADCOL-09, CADCOL-10, CADCOL-11
**Done when**:
- [ ] A aba "Meios de pagamento" leva à rota nova no mesmo mês, com a aba marcada e "Cadastros" ativo (CADCOL-01 ACs 2, 3 e 5)
- [ ] A ordem "Cartão Roxo", "conta Azul", "Conta Corrente", "Rótulo Âmbar", que difere da do banco e da do código de caractere (CADCOL-06 AC 2, L-001, L-036)
- [ ] Tipo, "dia 25", "dia 5" e "—" lidos dentro de cada linha (CADCOL-06 ACs 3 e 4, L-018)
- [ ] Abrindo a aba de março antes de qualquer outra tela: "Conta Corrente" com "2" e "2", "Cartão Roxo" com "0" e "1"; "Ver em Lançamentos" de "Conta Corrente" leva a "2 lançamentos" (CADCOL-03 ACs 1 a 6, L-001, L-014)
- [ ] Corrigir os dias de "Cartão Roxo" para 10 e 17: o aviso "Meio de pagamento salvo.", "dia 10" e "dia 17" na linha e no subtítulo (CADCOL-07 AC 5)
- [ ] Renomear "Cartão Roxo" para "conta azul": a recusa junto do campo, e nada muda na linha (CADCOL-07 AC 6)
- [ ] Renomear para "Cartão Lilás": a linha muda de lugar; abrir Lançamentos pela navegação, sem recarregar, e ver "Cartão Lilás" entre as opções do filtro de meio (CADCOL-07 AC 14, L-014)
- [ ] Criar "Cartão Novo", cartão com fechamento 3 e vencimento 10: a linha aparece e o painel abre nele; criar "conta corrente" é recusado junto do campo (CADCOL-08 ACs 4 e 5)
- [ ] `?meio=`, recarregar e id inexistente; `Tab`, `Enter`, `Escape` e o foco (CADCOL-11 ACs 1 a 3, CADCOL-10 ACs 1 a 4)
- [ ] Em 1.280 px: o painel entre as abas e a tabela; nenhum painel sem nada aberto; toda linha com até 48 px, com ponteiro fino (CADCOL-09 ACs 5 e 6, CADCOL-06 AC 7, L-030)
- [ ] Em 767 e 768 px, os cabeçalhos e o botão da linha como na T15; com `hasTouch` em 1.280 px, o botão de cada linha com 44 × 44 (CADCOL-06 AC 8, CADCOL-10 AC 6, L-029, L-044)
- [ ] Em 400 px, com "Cartão Roxo" aberto: sem rolagem lateral; os dois dias, "Salvar alterações", "Fechar", as abas e "+ Novo meio" com ao menos 44 × 44 (CADCOL-09 AC 7, CADCOL-10 AC 7)
- [ ] O teste de TRES-01, AC 10 em 400 px percorre também `/2026-03/cadastros/meios-de-pagamento` (L-030)
- [ ] Gate e2e passa com `e2e/cadastros-colunas.spec.ts` e `e2e/visao-tres-colunas.spec.ts`
**Tests**: e2e
**Gate**: e2e
**Commit**: `feat(meios): a aba Meios de pagamento, com o meio aberto no painel`

### Phase 6 — A coluna e o fechamento

#### T21: A coluna da direita a partir de 1.536 px
**What**: a grade de duas colunas em `ColunaDeCadastro`, com o painel preso numa coluna de 384 px e
a dica quando nada está aberto; o teste de TRES-01, AC 8 passa para 1.535 px.
**Where**:
- `src/components/coluna-de-cadastro.tsx`
- `e2e/cadastros-colunas.spec.ts`
- `e2e/visao-tres-colunas.spec.ts`

**Depends on**: T15, T20
**Reuses**: a grade de `lancamentos/page.tsx:199-237`
**Requirement**: CADCOL-09, CADCOL-02, CADCOL-06, CADCOL-10
**Done when**:
- [ ] Nas duas abas, em 1.535 px o painel aberto fica entre as abas e a tabela e, sem nada aberto, não aparece; em 1.536 px fica à direita da tabela e, sem nada aberto, mostra "Nenhuma categoria aberta" ou "Nenhum meio aberto" com a dica (CADCOL-09 ACs 1, 3, 5 e 6, L-029)
- [ ] Em 1.535 px, cabeçalho, painel e tabela medem até 1.024 px, centrados (CADCOL-09 AC 5)
- [ ] Em 1.536 e em 1.920 px, a coluna mede 384 px (± 1) e tem `border-left` computado de 1 px; cabeçalho e tabela medem até 1.100 px e ficam centrados entre o menu e a coluna, com folgas que diferem em até 1 px (CADCOL-09 ACs 1 e 4)
- [ ] Em 1.920 × 480, com categorias a mais para a página rolar, rolando até o fim, o título do painel continua dentro da janela (CADCOL-09 AC 2)
- [ ] Em 1.536 e em 1.920 px, com ponteiro fino, toda linha das duas tabelas mede até 48 px (CADCOL-02 AC 7, CADCOL-06 AC 7, L-030)
- [ ] Com `hasTouch` em 1.920 px e o painel aberto nas duas abas: o botão de cada linha, "Fechar", as abas, "+ Nova categoria" e "+ Novo meio", as opções de cor e os botões dos formulários medem ao menos 44 × 44 (CADCOL-10 ACs 6 e 7, L-044)
- [ ] O teste de TRES-01, AC 8 roda em 1.535 px com Lançamentos, Todo mês, Categorias e Meios de pagamento; os outros testes de `visao-tres-colunas.spec.ts` passam sem mudança
- [ ] Se a medida pedir outra largura, o desvio fica registrado aqui e no design
- [ ] Gate e2e passa com `e2e/cadastros-colunas.spec.ts` e `e2e/visao-tres-colunas.spec.ts`
**Tests**: e2e
**Gate**: e2e
**Commit**: `feat(cadastros): o painel numa coluna à direita a partir de 1.536 px`

#### T22: A decisão registrada
**What**:
- o AD-022 no `STATE.md`, com o texto do design;
- as notas de substituição em COR-04 (ACs 3, 6, 8 e 10 e o Edge Case da lista vazia) e em
  TRES-01, AC 8;
- a linha de arquivar do roadmap, com a regra do dono, e a dívida das três grades;
- `docs/design.md` ("Largura do conteúdo");
- os comentários que deixam de ser verdade: `area-estreita.tsx` (continua na home do ano e na tela
  de erro), `navegacao-principal.tsx:65-68` e `(app)/layout.tsx:21`.

**Where**:
- `.specs/STATE.md`
- `.specs/features/cor-por-categoria/spec.md`
- `.specs/features/visao-tres-colunas/spec.md`
- `docs/roadmap.md`
- `docs/design.md`
- `src/components/area-estreita.tsx`, `src/components/navegacao-principal.tsx`, `src/app/(app)/layout.tsx` (comentários)

**Depends on**: T21
**Reuses**: nenhuma
**Requirement**: CADCOL-12
**Done when**:
- [ ] AD-022 registrado, com o que ele revê (AD-019 e COR-04 em Cadastros) (CADCOL-12 AC 1)
- [ ] A linha de arquivar do roadmap diz que renomear meio já tem tela e registra: arquivar um meio que fixos ativos usam é permitido, e os fixos continuam usando-o, ao lado da decisão de 2026-10-29 sobre a edição de fixo (CADCOL-12 AC 2)
- [ ] Cada critério substituído aponta para o CADCOL que o substitui (CADCOL-12 AC 3)
- [ ] "Largura do conteúdo" diz que Cadastros tem a coluna a partir de 1.536 px, e que a `AreaEstreita` fica com a home do ano e a tela de erro (CADCOL-12 AC 4)
- [ ] `pnpm verify` e o `pnpm test:e2e` inteiro passam, com as contagens registradas
**Tests**: none
**Gate**: build
**Commit**: `docs(cadastros-colunas): registrar Cadastros em abas`

---

## Validação antes da aprovação

### Granularidade

| Task | Escopo | Status |
| --- | --- | --- |
| T1 | 1 função pura (+ export) | ✅ |
| T2 | 1 caso de uso | ✅ |
| T3 | 1 função pura, com o código de erro e a mensagem que o tipo exige | ✅ |
| T4 | 1 escrita: port, implementação e fake do mesmo contrato | ⚠️ três arquivos, coesos: a port sem implementação não compila |
| T5 | 1 caso de uso | ✅ |
| T6 | 1 action, com o schema e as mensagens dela | ✅ |
| T7 | 1 linha de revalidação | ✅ |
| T8 | 1 componente, extraído | ✅ |
| T9 | 1 componente | ✅ |
| T10 | 1 componente | ✅ |
| T11 | 1 componente, com o mapa de nome de cor que ele é o primeiro a usar | ✅ |
| T12 | 1 componente e a seção que ele é o primeiro a usar | ⚠️ dois componentes, coesos: `OndeAparece` nasce no detalhe da categoria |
| T13 | 1 componente | ✅ |
| T14 | 1 componente e o ajudante de URL dele | ✅ |
| T15 | 1 página, com a saída do componente velho e os e2e que a troca quebra | ⚠️ grande, mas coeso: a página não troca sem os e2e que dependem dela, como a T8 de Todo mês |
| T16 | 1 componente | ✅ |
| T17 | 1 componente | ✅ |
| T18 | 1 componente | ✅ |
| T19 | 1 componente | ✅ |
| T20 | 1 página nova e o e2e dela | ✅ |
| T21 | 1 componente (a grade) e o e2e dela | ✅ |
| T22 | Docs | ✅ |

### Diagrama × `Depends on`

| Task | Depends on (corpo) | Diagrama | Status |
| --- | --- | --- | --- |
| T1 | nenhuma | início da fase 1 | ✅ |
| T2 | T1 | T1 -> T2 | ✅ |
| T3 | nenhuma | início da fase 2 | ✅ |
| T4 | T3 | T3 -> T4 | ✅ |
| T5 | T3, T4 | T3 -> T5, T4 -> T5 | ✅ |
| T6 | T5 | T5 -> T6 | ✅ |
| T7 | nenhuma | T7 sozinha | ✅ |
| T8 | nenhuma | T8 sozinha | ✅ |
| T9 | nenhuma | T9 sozinha | ✅ |
| T10 | nenhuma | T10 sozinha | ✅ |
| T11 | nenhuma | início da fase 4 | ✅ |
| T12 | T9 (fase anterior), T11 | T11 -> T12 | ✅ |
| T13 | T9 (fase anterior) | T13 -> T14 (origem) | ✅ |
| T14 | T9, T10 (fase anterior), T11, T12, T13 | T11 -> T14, T12 -> T14, T13 -> T14 | ✅ |
| T15 | T2, T7 (fases anteriores), T14 | T14 -> T15 | ✅ |
| T16 | nenhuma | início da fase 5 | ✅ |
| T17 | T6, T8, T9, T12 (fases anteriores), T16 | T16 -> T17 | ✅ |
| T18 | T8, T9 (fases anteriores) | T18 -> T19 (origem) | ✅ |
| T19 | T9, T10, T14 (fases anteriores), T16, T17, T18 | T16 -> T19, T17 -> T19, T18 -> T19 | ✅ |
| T20 | T2, T6, T15 (fases anteriores), T19 | T19 -> T20 | ✅ |
| T21 | T15, T20 (fases anteriores) | início da fase 6 | ✅ |
| T22 | T21 | T21 -> T22 | ✅ |

### Testes × matriz

| Task | Camada | Matriz pede | Task diz | Status |
| --- | --- | --- | --- | --- |
| T1 | Domínio | unit | unit | ✅ |
| T2 | Aplicação | unit + integration | unit, integration | ✅ |
| T3 | Domínio | unit | unit | ✅ |
| T4 | Repositório (+ port e fake) | integration | integration | ✅ |
| T5 | Aplicação | unit | unit | ✅ |
| T6 | Server Action + schema | integration (+ unit do schema) | integration | ✅ |
| T7 | Server Action | integration | integration | ✅ |
| T8 a T14 | Componentes | componentes | componentes | ✅ |
| T15 | Página e fluxo | e2e | e2e | ✅ |
| T16 a T19 | Componentes | componentes | componentes | ✅ |
| T20 | Página e fluxo | e2e | e2e | ✅ |
| T21 | Componente de layout + fluxo | e2e (layout se mede no navegador) | e2e | ✅ |
| T22 | Docs | none | none | ✅ |
