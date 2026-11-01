# Cadastros em abas, com o item aberto à direita — Tasks

**Spec**: `.specs/features/cadastros-colunas/spec.md`
**Design**: `.specs/features/cadastros-colunas/design.md`
**Status**: Verified, PASS em 2026-10-31 na rodada 4 de `validation.md`, focada em G8 a G10. As
três lacunas foram fechadas, e o sensor matou 10 de 10 mutantes. As rodadas 1 a 3 deram FAIL, e as
correções F1 a F13 foram concluídas. O histórico vem abaixo.

Rodada 1 de `validation.md`: FAIL em 2026-10-31, com 89 de 94 ACs provados, 40 de 46
mutantes mortos e cinco lacunas (G1 a G5). O dono decidiu em 2026-10-31:
- G1: "Aceitar a quebra": abaixo de 768 px, a linha de baixo quebra quando não cabe;
- G4: "Nunca rolar de lado", em largura nenhuma;
- E15: "Sim, como em Todo mês": a tela fica parada ao salvar.

As correções F1–F6 fecharam G1 a G5.

A rodada 2 deu FAIL em 2026-10-31: 94 de 96 ACs provados e 35 de 37 mutantes mortos. Ficaram duas
lacunas de teste, G6 e G7, e nenhuma depende do dono. O código já faz o certo nas duas. As correções
F7–F10 fecharam G6 e G7, só com teste, comentário e spec. Em 2026-10-31, com a fatia ainda em
verificação, o dono pediu para testar a tela e mandar para o GitHub. A `main` e o `origin/main` foram
para `92063b4`.

A rodada 3, a última do limite, deu FAIL em 2026-10-31: 93 de 96 ACs provados e 33 de 37 mutantes
mortos, com três lacunas de teste (G8 a G10). O código já faz o certo nas três (sondas A, B e C). O
dono escolheu "Corrigir e checar só isso", como na rodada 5 de Lançamentos. As correções F11–F13
fecharam G8 a G10, só com teste, um comentário e spec. O Verifier focado nelas deu PASS.

Antes disso: o dono aprovou o plano em 2026-10-30, e T1 a T22 foram concluídas na branch
`feat/cadastros-colunas`, na worktree `.worktrees/cadastros-colunas`. A branch foi rebaseada sobre a
`main` em `e8b1540`, que já tem Todo mês.
**Total**: 35 tasks em 9 fases (T1–T22 e as correções F1–F13).
- As fases 1 a 6 deram três lotes: T1–T7, T8–T15 e T16–T22. A oferta de sub-agentes veio antes do
  Execute.
- As fases 7, 8 e 9 são um lote cada.

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

### Phase 7 — Correções da verificação (rodada 1)

```
F1 -> F2
F2 -> F3
F3 -> F4
F4 -> F5
F5 -> F6
```

F1 a F5 fecham os Fix Plans 1 a 5 de `validation.md` (rodada 1, FAIL).
- A F1 e a F4 levam à spec as escolhas do dono de 2026-10-31.
- A F6 vem do mutante E15, que sobreviveu sem lacuna na spec: o dono pediu a mesma garantia de Todo
  mês.
- Cada task começa pelo teste, que passa na HEAD e falha com o mutante do Verifier, ou falha antes
  da correção.
- Todas mexem em `e2e/cadastros-colunas.spec.ts`, por isso vão em fila.

### Phase 8 — Correções da verificação (rodada 2)

```
F7 -> F8
F8 -> F9
F9 -> F10
```

F7 e F8 fecham os Fixes 1 e 2 da rodada 2 de `validation.md` (G6 e G7). São só de teste: o código
já faz o certo, como mostram as sondas P3 e P5.
- A F9 é a observação 2: a medida da F4 não via uma rolagem dentro de um invólucro em 400 px. É de
  teste, e a decisão de incluí-la é minha.
- A F10 junta o Fix 3, os comentários de "duas linhas de texto", e a observação 5, a citação
  deslocada da traceability.
- Lote único, em fila.

### Phase 9 — Correções da verificação (rodada 3)

```
F11 -> F12
F12 -> F13
```

F11 a F13 fecham os Fixes 1 a 3 da rodada 3 de `validation.md` (G8 a G10). São só de teste, porque o
código já faz o certo (sondas A, B e C). A rodada 3 era a última do limite. O dono escolheu
"Corrigir e checar só isso" em 2026-10-31: depois destas correções roda um Verifier focado nelas, e
não uma rodada inteira. Lote único, em fila.

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
**Commit**: `feat(domain): contar o uso de categorias e meios no mês` (`26442fb`)

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
**Commit**: `feat(cadastros): ler o uso no mês depois de materializar` (`e9072bf`)

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
**Commit**: `feat(domain): o que muda ao editar um meio de pagamento` (`c5e36f7`)
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
**Commit**: `feat(cadastros): gravar nome e dias de um meio de pagamento` (`6e3547f`)

#### T5: `editarMeioDePagamento`, o caso de uso
**What**: o caso de uso que recusa o meio inexistente ou arquivado, aplica `mudancasDoMeio`, confere o
nome entre os ativos e grava.
**Where**: `src/application/cadastros/editar-meio-de-pagamento/handler.ts` (+ teste)
**Depends on**: T3, T4
**Reuses**: `mudancasDoMeio`, `EdicaoDeMeioRepository`, `FakeCadastroRepository`
**Requirement**: CADCOL-07
**Done when**:
- [x] Meio inexistente e meio arquivado devolvem `MEIO_PAGAMENTO_NAO_ENCONTRADO`, sem gravar: uma assertion para cada (CADCOL-07 AC 12)
- [x] Ciclo que não corresponde ao tipo devolve `CICLO_NAO_CORRESPONDE_AO_TIPO`, sem gravar (CADCOL-07 AC 11)
- [x] Nada mudou: `alterado: false`, sem consultar o nome e sem gravar (CADCOL-07 AC 9)
- [x] O nome de outro meio ativo, em outra caixa, devolve `MEIO_PAGAMENTO_JA_EXISTE`, sem gravar (CADCOL-07 AC 6)
- [x] O nome de um meio arquivado grava; o próprio nome mudando só a caixa grava (CADCOL-07 ACs 7 e 8)
- [x] Só os dias mudando não consulta o nome; o sucesso grava as mudanças e devolve o meio gravado com `alterado: true` (CADCOL-07 AC 5)
- [x] Gate quick passa; a contagem de testes só cresce
**Tests**: unit
**Gate**: quick
**Commit**: `feat(cadastros): editar nome e dias de um meio de pagamento` (`687eff5`)

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
- [x] `entradaEdicaoDoMeioSchema`: estrito; recusa id que não é uuid e chave a mais; normaliza o nome; recusa nome vazio e com 41 caracteres e aceita 40; recusa dia 0 e 32 e aceita 1 e 31, com as mensagens da criação; aceita `ciclo: null` (CADCOL-07 AC 10, L-029)
- [x] `requireSession()` é a primeira instrução de `editarMeioDePagamento` e de `criarMeioDePagamento`; sem sessão, as duas devolvem `NAO_AUTENTICADO` sem tocar no banco nem revalidar
- [x] Contra o Postgres: o nome e os dias gravados, lidos de volta; `revalidatePath("/", "layout")` chamado uma vez (CADCOL-07 ACs 5 e 14)
- [x] Nada mudou: nada gravado e nenhuma revalidação (CADCOL-07 AC 9)
- [x] Cada recusa com a mensagem e o campo: "Já existe outro meio de pagamento com esse nome." em `nome`; "Esse meio de pagamento não existe mais."; a mensagem do ciclo; `VALIDACAO` com o campo de cada dia; nada gravado e nada revalidado em nenhuma delas (CADCOL-07 ACs 6, 10, 11 e 12)
- [x] Falha do banco vira `ERRO_INESPERADO` com referência, sem gravar nem revalidar
- [x] `criarMeioDePagamento` revalida `("/", "layout")`, recusa o nome de um ativo em qualquer caixa com "Já existe um meio de pagamento com esse nome." e cria com o nome de um arquivado (CADCOL-08 ACs 4 e 5)
- [x] `pnpm exec playwright test e2e/importacao.spec.ts e2e/compra-parcelada.spec.ts` passa sem mudança: o meio criado dentro do diálogo e do formulário continua selecionado
- [x] Gate full passa; a contagem de testes só cresce
**Tests**: integration
**Gate**: full
**Commit**: `feat(meios): action de editar meio e revalidação do layout` (`5c7b63d`)
**Nota**: o item do Playwright ficou aberto no lote 1, que rodou sem e2e por decisão do
orquestrador: a porta 3100 era de outro agente. No lote 2, depois do rebase sobre a `main` em
`e8b1540` e antes de a T8 mexer em `cadastro-de-meio-inline.tsx`, os dois arquivos passaram sem
mudança: 13 testes.

#### T7: `criarCategoria` revalida as telas da categoria
**What**: o sucesso de `criarCategoria` passa a chamar `revalidarTelasDaCategoria()`, que inclui a
tela de Cadastros.
**Where**: `src/app/actions/categorias.ts` (+ teste de integração)
**Depends on**: nenhuma
**Reuses**: `revalidarTelasDaCategoria`
**Requirement**: CADCOL-05
**Done when**:
- [x] Criar, reaproveitar uma ativa e reativar uma arquivada revalidam as quatro rotas de `ROTAS_REVALIDADAS`: uma assertion para cada caminho (CADCOL-05 ACs 2 a 4)
- [x] Nome vazio é recusado sem revalidar
- [x] O `it.each` de `requireSession` primeiro inclui `criarCategoria`
- [x] Gate full passa; a contagem de testes só cresce
**Tests**: integration
**Gate**: full
**Commit**: `feat(categorias): criar categoria revalida a tela de Cadastros` (`e059bb5`)

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
- [x] `cadastro-de-meio-inline.test.tsx`, `form-lancamento-avulso.test.tsx` e `passo-pendencias.test.tsx` passam sem mudança
- [x] Com `tipos`, "Tipo" é o seletor com eles; com `null`, o tipo aparece em texto com "O tipo não muda. Para trocar, cadastre outro meio.", sem `combobox` nem `radio` de tipo (CADCOL-07 ACs 2 e 4)
- [x] "Dia de fechamento" e "Dia de vencimento" só aparecem com o tipo cartão: uma assertion com cartão e uma com conta (CADCOL-07 AC 3, CADCOL-08 AC 2)
- [x] O rótulo do nome vem por prop
- [x] Gate quick passa; a contagem de testes só cresce
**Tests**: componentes
**Gate**: quick
**Commit**: `refactor(meios): campos do meio fora do cadastro inline` (`6e4032d`)
**Nota**: `CamposDoMeio` também recebe `diasPelaLargura`, que o design não listava. O cadastro inline
ganhou a prop em `formulario-pela-coluna` (FPC-01), depois do design: com ela, os dias ficam lado a
lado pela largura do contêiner (`@md`) nos formulários de lançamento, e sem ela pela janela (`sm`)
na importação. Os dois testes do ponto de virada estão em `campos-do-meio.test.tsx`. O tipo
`TipoDeMeio` passou a morar em `campos-do-meio.tsx`, e o inline o reexporta, para
`passo-pendencias.tsx` continuar igual.

#### T9: `ColunaDeCadastro`, o painel e a coluna única
**What**: a grade em coluna única (cabeçalho, painel, lista), o invólucro do painel com título,
"Fechar", `Escape` e foco, e o vazio da coluna.
**Where**: `src/components/coluna-de-cadastro.tsx` (+ teste)
**Depends on**: nenhuma
**Reuses**: o padrão de `lancamentos/page.tsx:199-237`
**Requirement**: CADCOL-04, CADCOL-09, CADCOL-10
**Done when**:
- [x] Na ordem do DOM: cabeçalho, painel e lista (CADCOL-09 AC 5, a ordem; a medida é da T15)
- [x] Nada aberto: nenhum `complementary` com o nome do painel; o bloco vazio com o título e a dica recebidos está no DOM (CADCOL-09 ACs 3 e 6, os textos; a visibilidade por largura é medida na T15 e na T21)
- [x] Algo aberto: `aside` com o `id` e o `aria-label` recebidos, o conteúdo recebido e "Fechar", que chama `aoFechar` (CADCOL-04 AC 15)
- [x] `TituloDoPainel` desenha um `h2` com `tabIndex={-1}`
- [x] `Escape` com o foco num campo do painel chama `aoFechar`; `Escape` fora do painel, não (CADCOL-10 AC 3)
- [x] Mudar `focarTitulo` leva o foco ao `h2` do conteúdo; montar já aberto não leva (CADCOL-10 AC 2, CADCOL-11 AC 2)
- [x] Gate quick passa; a contagem de testes só cresce
**Tests**: componentes
**Gate**: quick
**Commit**: `feat(cadastros): coluna de cadastro com o painel do item` (`9c2ef9c`)
**Nota**: a coluna ganhou a guarda de foco de Todo mês (`painel-do-fixo.tsx`), que o design não
listava: o botão de envio que se desabilita enquanto grava perde o foco para o `body`, e o `Escape`
deixaria de alcançar o painel. A guarda devolve o foco ao título com `preventScroll`, para a
mensagem junto do botão continuar à vista (L-057). Os três testes seguem L-056: o botão
desabilitado, o habilitado e o campo. A grade e o título são desta fatia, e não peças tiradas de
Todo mês, como decide a spec ("Componente da coluna"): `TodoMes` e `PainelDoFixo` desenham a mesma
forma presos ao estado deles. `TituloDoPainel` marca o `h2` com `data-titulo-do-painel`, e é por
essa marca que a coluna o acha para dar o foco.

#### T10: `CabecalhoDeCadastros`, o título e as abas
**What**: o `h1` "Cadastros", a ação ao lado e a navegação "Cadastros" com as duas abas.
**Where**: `src/components/cabecalho-de-cadastros.tsx` (+ teste)
**Depends on**: nenhuma
**Reuses**: nenhuma
**Requirement**: CADCOL-01
**Done when**:
- [x] `h1` "Cadastros"; navegação "Cadastros" com "Categorias" para `/2026-03/cadastros/categorias` e "Meios de pagamento" para `/2026-03/cadastros/meios-de-pagamento` (CADCOL-01 ACs 1 e 2)
- [x] `aria-current="page"` só no link da aba recebida, testado com cada aba (CADCOL-01 AC 3)
- [x] A ação recebida aparece dentro do cabeçalho, depois do `h1` (CADCOL-01 AC 6)
- [x] Gate quick passa; a contagem de testes só cresce
**Tests**: componentes
**Gate**: quick
**Commit**: `feat(cadastros): título e abas de Cadastros` (`7c7fa9b`)

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
- [x] Tabela "Categorias" com os cabeçalhos Categoria, Cor, "Fixos em Março" e "Lançamentos em Março" (CADCOL-02 AC 1)
- [x] As linhas na ordem recebida; a pill de cada uma na cor escolhida ou na automática, procurada dentro da linha (CADCOL-02 AC 3, L-018); equivalentes de 146, 155 e 161 de `lista-de-categorias.test.tsx`
- [x] Coluna Cor com "Laranja" na escolhida e "Automática (Azul)" na automática; `textoDaCor` testado nas dez cores (CADCOL-02 AC 4)
- [x] As duas contagens na linha, com "0" sem uso, e o nome de cada contagem no texto da célula ("1 fixo", "2 lançamentos") (CADCOL-02 ACs 5 e 8, o texto; a medida é da T15)
- [x] O único botão de cada linha é o da categoria (CADCOL-02 AC 6)
- [x] Clicar na célula de uma contagem chama `aoAbrir` com o id; acionar o botão também: uma assertion para cada (CADCOL-04 AC 1, L-010)
- [x] Botão da linha aberta com `aria-expanded="true"` e `aria-controls="painel-da-categoria"`, os outros com `"false"` (CADCOL-04 AC 13)
- [x] Sem categoria, o aviso de CADCOL-02 AC 9 no lugar da tabela; equivalente de 455
- [x] Gate quick passa; a contagem de testes só cresce
**Tests**: componentes
**Gate**: quick
**Commit**: `feat(categorias): a tabela de categorias com o uso no mês` (`d9f45df`)
**Nota**: o botão da linha não tem `onClick` próprio: o clique sobe até a linha, que abre, e a
categoria abre uma vez só pelo mouse e pelo teclado, como em Todo mês. O teste do teclado confere
`aoAbrir` chamado uma vez. As contagens cobrem 0, 1 e 2, para o singular e o plural de cada nome.

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
- [x] Formulário "Renomear Categoria Um" com "Nome" preenchido com o gravado e "Salvar" (CADCOL-04 AC 2); equivalente de 297, com a regra nova
- [x] Grupo "Cor de Categoria Um" com as onze opções, cada uma tingida com o nome, a em uso marcada, e "Automática (Ciano)" (CADCOL-04 AC 3); equivalentes de 169, 178, 193, 202 e 209
- [x] Escolher uma cor manda uma vez, avisa "Cor trocada.", e marca a opção e pinta a pill do título antes da resposta; "Automática" manda `null` (CADCOL-04 AC 4); equivalentes de 217, 227, 238 e 257
- [x] A cor recusada volta, o motivo aparece no painel em `alert`, sem aviso (CADCOL-04 AC 8); equivalente de 274
- [x] Salvar o nome manda o nome novo, avisa "Categoria renomeada." e o campo continua com ele; enquanto grava, a pill do título mostra o nome novo na cor de antes (CADCOL-04 AC 6); equivalentes de 307 e 323
- [x] O nome de outra categoria aparece em `alert` junto do campo, com `aria-invalid`, e o nome volta; falha sem campo mostra a mensagem geral; nome vazio e nome com 61 caracteres não chegam ao servidor (CADCOL-04 ACs 7 e 8, L-041); equivalentes de 359, 382 e 396
- [x] Nome igual, com espaço sobrando, não grava nem avisa; só a caixa grava e avisa; o servidor dizendo que nada mudou não avisa (CADCOL-04 ACs 9 e 10); equivalentes de 412, 426 e 440
- [x] `OndeAparece`: seção "Onde ela aparece" com "Fixos em Março de 2026" e "Lançamentos em Março de 2026" e os números, e o link "Ver em Lançamentos" para `/2026-03/lancamentos?categoriaId=<id>`; com `genero="ele"`, "Onde ele aparece" e `?meioPagamentoId=<id>` (CADCOL-04 ACs 11 e 12, CADCOL-07 AC 13)
- [x] O título é um `TituloDoPainel` com a pill otimista, procurada pelo papel `heading` de nível 2
- [x] Gate quick passa; a contagem de testes só cresce
**Tests**: componentes
**Gate**: quick
**Commit**: `feat(categorias): a categoria aberta, com cor, nome e onde aparece` (`d43ff80`)
**Nota**: `OndeAparece` recebe o `href` pronto, como pede o design; com `genero="ele"`, o teste dele
usa um `href` com `?meioPagamentoId=`, e quem monta o do meio é o `DetalheDoMeio` (T17). O endereço
da categoria, `/2026-03/lancamentos?categoriaId=<id>`, é provado em `detalhe-da-categoria.test.tsx`.
Além dos 61 caracteres recusados, o teste prova os 60 chegando ao servidor (L-029). O nome igual ao
gravado não grava, não avisa e apaga o alerta anterior; o campo continua com o que foi digitado.

#### T13: `NovaCategoria`, o formulário de criação
**What**: o formulário "Nova categoria" do painel, com a validação no navegador e o aviso por
resultado.
**Where**: `src/components/nova-categoria.tsx` (+ teste)
**Depends on**: T9
**Reuses**: `nomeCategoriaSchema`, `TituloDoPainel`, `criarCategoria` (por prop)
**Requirement**: CADCOL-05
**Done when**:
- [x] O título "Nova categoria" num `TituloDoPainel`; campo "Nome", a nota de CADCOL-05 AC 1, "Criar categoria" e "Cancelar" (CADCOL-05 AC 1)
- [x] Nome vazio e nome com 61 caracteres recusados sem chamar o servidor, com a mensagem junto do campo; 60 caracteres passam (CADCOL-05 AC 5, L-029, L-041)
- [x] O sucesso chama `aoCriada` com o id e "Categoria criada.", "Essa categoria já existia." ou "Categoria reativada.", conforme `jaExistia` e `reativada`: uma assertion para cada (CADCOL-05 ACs 2 a 4)
- [x] A recusa do servidor aparece em `alert`, sem `aoCriada`
- [x] "Cancelar" chama `aoCancelar` sem chamar o servidor (CADCOL-05 AC 6)
- [x] Gate quick passa; a contagem de testes só cresce
**Tests**: componentes
**Gate**: quick
**Commit**: `feat(categorias): formulário de nova categoria` (`f624fd9`)
**Nota**: a categoria reativada volta do servidor com `jaExistia` e `reativada` verdadeiros
(`categorias.ts:86`); o aviso "Categoria reativada." vence, e o teste usa essa combinação. O botão
"Criar categoria" não se desabilita enquanto grava: nenhum AC pede, e o nome repetido só reaproveita.

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
- [x] "+ Nova categoria" dentro do cabeçalho, antes do painel e da tabela na ordem do DOM (CADCOL-01 AC 6)
- [x] Abrir uma linha mostra a categoria no painel e pede `?categoria=<id>` ao `router.replace(…, { scroll: false })` do Next, mantendo os outros parâmetros; `push` e `pushState` não são chamados (CADCOL-04 AC 1, CADCOL-11 AC 1; desvio na Nota)
- [x] `categoriaInicial` da lista abre o painel sem levar o foco; um id fora da lista deixa o painel fechado, sem erro (CADCOL-11 ACs 2 e 3)
- [x] "+ Nova categoria" fecha a categoria aberta, mostra o formulário e tira `?categoria=` (CADCOL-05 AC 1, CADCOL-11 AC 4)
- [x] Depois de criar: o painel abre na categoria criada, a URL leva o id dela, o foco vai ao título e o aviso é o de `NovaCategoria` (CADCOL-05 ACs 2 a 4, CADCOL-10 AC 2)
- [x] "Fechar" e `Escape` devolvem o foco ao botão da linha; fechar o formulário devolve ao "+ Nova categoria"; a URL fica sem `categoria` (CADCOL-10 AC 4, CADCOL-11 AC 4)
- [x] Trocar de categoria, ou abrir o "+ Nova categoria", com um nome digitado descarta o digitado sem gravar; reabrir mostra o gravado (CADCOL-04 AC 14); equivalente de 344
- [x] A categoria aberta que some dos itens, numa renderização nova, volta o painel ao vazio e tira o parâmetro
- [x] Gate quick passa; a contagem de testes só cresce
**Tests**: componentes
**Gate**: quick
**Commit**: `feat(categorias): o estado da aba de categorias, com a aberta no endereço` (`f4d3553`)
**Nota** (desvios):
- **O endereço vai pelo roteador do Next, e não por `history.replaceState`.** Todo mês trocou o
  mecanismo depois do plano desta fatia (`todo-mes.tsx`, `mudarEndereco`; L-058): o `replaceState`
  deixava no Next uma rolagem até o alto pendente, e a confirmação de salvar saía da janela. A
  peça é o hook `useParametroNaUrl(nome, inicial)`, e não a função `trocarParametroNaUrl`: ela
  precisa do roteador e de uma ref com o último valor pedido, que é com o que compara. Todo mês
  continua com a cópia dele; a peça comum às três telas é a dívida da spec. A T19 usa o mesmo hook,
  com `"meio"`. O teste do hook é `parametro-na-url.test.tsx`, porque precisa do jsdom.
- **A categoria aberta só fecha quando estava na lista anterior e não está na nova.** O Next
  resolve o pedido da action antes de desenhar a página relida
  (`server-action-reducer.js:263`, `resolve(actionResult)` antes de `navigateToKnownRoute`), e a
  categoria criada, ou a reativada, pode chegar ao painel antes de chegar à tabela. Uma regra de
  "fechar quando não está na lista" fecharia a criada. O foco no título dela espera a lista. O
  teste da lista atrasada passa por uma página relida sem ela antes da lista nova (mutante M4).
- **"+ Nova categoria" leva `aria-controls` e `aria-expanded`**, como o "+ Novo fixo" de Todo mês.
- **Mutante equivalente:** abrir o estado numa `categoriaInicial` fora da lista, em vez de "nada",
  não muda nada à vista: o painel não tem o que desenhar e nenhuma linha casa com o id.

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
- [x] Abrindo Categorias de março antes de qualquer outra tela, com a fixture do design: "Categoria Um" com "1" e "2", e "Categoria Dois" com "0" e "0", lidos dentro da linha de cada uma (CADCOL-02 AC 5, CADCOL-03 ACs 1 a 3 e 5, L-001, L-018)
- [x] Depois, "Ver em Lançamentos" no painel de "Categoria Um" leva a Lançamentos de março com "2 lançamentos" no `status` da lista (CADCOL-03 AC 4, CADCOL-04 AC 12, L-014)
- [x] `h1` "Cadastros", a aba "Categorias" com `aria-current="page"` e o item "Cadastros" ativo; o item da navegação abre esta aba (CADCOL-01 ACs 1, 3, 4 e 5)
- [x] Criar "Categoria Nova" pelo painel: a linha aparece e o painel abre nela, com "Automática (<cor>)" marcada; criar "categoria um" abre "Categoria Um" com "Essa categoria já existia."; criar o nome de uma arquivada a reativa com "Categoria reativada." (CADCOL-05 ACs 2 a 4)
- [x] Abrir "Categoria Um" põe `?categoria=<id>` na URL sem recarregar (um marcador posto em `window` antes do clique continua lá) e sem entrada nova no histórico (`history.length` igual); recarregar mostra a mesma aberta; `?categoria=` inexistente deixa o painel fechado (CADCOL-11 ACs 1 a 3)
- [x] Teclado: `Tab` até o botão de "Categoria Um", `Enter`, o foco no título do painel; `Escape`, o foco de volta no botão e a URL sem `categoria` (CADCOL-10 ACs 1 a 4)
- [x] Em 1.280 px:
  - o painel fica entre as abas e a tabela, e sem nada aberto não há painel (CADCOL-09 ACs 5 e 6);
  - abrir a última linha deixa o título do painel dentro da janela (CADCOL-10 AC 5);
  - a linha aberta tem fundo computado diferente das outras (CADCOL-04 AC 13);
  - com ponteiro fino, toda linha da tabela mede até 48 px, percorrendo todas (CADCOL-02 AC 7, L-030)
- [x] Em 767 px, nenhum `columnheader` à vista e o botão de cada linha com ao menos 44 px de altura; em 768 px, os cabeçalhos à vista e o botão com menos de 44 px (CADCOL-02 AC 8, CADCOL-10 AC 6, L-029)
- [x] Com `hasTouch` em 1.280 px, `matchMedia("(pointer: coarse)")` é verdadeiro e o botão de cada linha mede ao menos 44 × 44 (CADCOL-10 AC 6, L-044)
- [x] Em 400 px com "Categoria Um" aberta: sem rolagem lateral; as contagens abaixo da pill; as 11 opções, "Salvar", "Fechar", as duas abas e "+ Nova categoria" com ao menos 44 × 44 (CADCOL-09 AC 7, CADCOL-02 AC 8, CADCOL-10 AC 7)
- [x] `categorias.spec.ts` muda como manda a tabela "Testes que mudam porque a spec mudou" do design e passa; a ordem pt-BR (`:320`) continua provada pela página
- [x] `lista-de-categorias.tsx` e o teste dele saem; a suíte unitária cai exatamente os 24 testes desse arquivo, todos com equivalente nas T11 a T14
- [x] Gate e2e passa com `e2e/cadastros-colunas.spec.ts`, `e2e/categorias.spec.ts` e `e2e/visao-tres-colunas.spec.ts`
**Tests**: e2e
**Gate**: e2e
**Commit**: `feat(categorias): a tela de Cadastros com a categoria aberta no painel` (`df0c476`; o assunto planejado começava com maiúscula, e `check_commit.py` recusa)
**Nota** (desvios):
- **A coluna Categoria ganhou `md:min-w-34` (136 px)**, em `tabela-de-categorias.tsx`, o arquivo da
  T11. Medido no navegador: em 768 e 800 px a tabela tem 480 e 512 px, a coluna encolhia para uns
  112 px, a pill de "Categoria Dois" quebrava em duas linhas, e o botão da linha media 44 px, e não
  36 (CADCOL-10, AC 6; o teste de 768 px falhou assim). Com 136 px a pill cabe numa linha, a tabela
  fica com os 480 px do contêiner, e o nome longo continua quebrando. Com 144 px ela passava 2 px.
- **Fixo C começa em abril**, e não em junho como no design: o começo colado depois do mês aberto
  (L-053), do outro lado do Fixo B, que termina em fevereiro. "Cartão Roxo" continua com 0 fixos
  em março, e nenhum número esperado muda.
- **Uma categoria de 59 caracteres, na cor "Verde-água"**, entra no teste das linhas de até 48 px:
  o conteúdo que mais aperta a linha (L-045). Em 1.280 px ela cabe numa linha, e o teste exige os
  48 px dela também.
- **A pill da linha é conferida com `expect.poll`** em `categorias.spec.ts`, depois do aviso: o Next
  resolve a action antes de desenhar a lista nova (CADCOL-04, AC 5: a pill da linha muda quando a
  gravação termina). O valor esperado é o mesmo, exato.
- **Testes além do Done-when**, pelas lições das fatias irmãs: a corrida do endereço com a rede
  lenta, abrir e logo fechar e fechar e logo reabrir (L-058); a confirmação de trocar a cor e de
  renomear `toBeInViewport` em 1.280 × 720 e 1.920 × 1.080 (L-057), com a linha no lugar novo e
  o painel na categoria; e o formulário de criação medido aberto em 400 px (L-060).
- **"Sem mensagem de erro" se procura dentro do `main`:** o anunciador de rota do Next é um
  `alert` vazio fora dele.
- **Os dois testes de criar de `cadastro-de-categorias.test.tsx` (T14) esperam o foco com
  `waitFor`.** O foco na criada vai num efeito, depois de ela aparecer no painel; sob a carga da
  suíte inteira, um deles leu o foco antes do efeito. A assertion é a mesma, exata, e o mutante que
  foca sem esperar a lista continua morto.
- **Até a T21, a partir de 1.536 px o vazio aparece na coluna única**, entre as abas e a tabela: a
  grade de duas colunas é da T21. Nenhum teste deste lote mede essa faixa.

### Phase 5 — Meios de pagamento

#### T16: `TabelaDeMeios`, uma linha por meio
**What**: a tabela "Meios de pagamento" com tipo, dias e contagens, a linha aberta e o vazio; o tipo
`ItemDeMeio`.
**Where**: `src/components/tabela-de-meios.tsx` (+ teste)
**Depends on**: nenhuma
**Reuses**: `TIPOS_DE_MEIO`, a `CELULA` de `tabela-lancamentos.tsx`
**Requirement**: CADCOL-06, CADCOL-07
**Done when**:
- [x] Tabela "Meios de pagamento" com "Meio de pagamento", Tipo, Fecha, Vence, "Fixos em Março" e "Lançamentos em Março" (CADCOL-06 AC 1)
- [x] Tipo com "Cartão de crédito", "Conta corrente" e "Rótulo", um caso para cada (CADCOL-06 AC 3)
- [x] "dia 25" e "dia 5" no cartão; "—" em Fecha e em Vence na conta e no rótulo (CADCOL-06 AC 4)
- [x] As contagens com "0" sem uso e o nome escrito na célula (CADCOL-06 ACs 5 e 8, o texto)
- [x] O único botão de cada linha é o do meio (CADCOL-06 AC 6)
- [x] Clique numa célula e acionar o botão chamam `aoAbrir`: uma assertion para cada (CADCOL-07 AC 1, L-010)
- [x] `aria-expanded` e `aria-controls="painel-do-meio"` como na de categorias (CADCOL-07 AC 15)
- [x] Sem meio, o aviso de CADCOL-06 AC 9
- [x] Gate quick passa; a contagem de testes só cresce
**Tests**: componentes
**Gate**: quick
**Commit**: `feat(meios): a tabela de meios de pagamento com o uso no mês` (`f7f1c35`)
**Nota** (desvios):
- **O nome do dia fica escrito na célula, como o da contagem:** "fecha dia 25" e "vence dia 5",
  com "fecha" e "vence" em `md:sr-only`. Abaixo de 768 px não há cabeçalho, e "dia 25" sozinho não
  diz se é o fechamento ou o vencimento (CADCOL-06, AC 8: "os dias e as contagens com o nome
  escrito"). A partir de 768 px a célula mostra "dia 25", e o leitor de tela ouve "fecha dia 25".
  O "—" da conta e do rótulo some abaixo de 768 px, onde não há coluna para marcar.
- **Entre 768 e 1.023 px, as células têm 8 px dos lados, e o tipo pode quebrar; a coluna do nome
  tem `md:min-w-32` (128 px).** Medido no navegador antes dos testes de layout, numa página
  provisória, apagada antes do commit: em 768 px a tabela tem 480 px, e com o respiro de Categorias
  ela pedia 577; a página rolava 73 px de lado, e "Cartão Roxo" quebrava em duas linhas, com o
  botão de 45 px (CADCOL-10, AC 6). Com a mudança, ela fica com os 480 px, sem rolagem, e todo
  botão com nome curto mede 36 px numa linha. Nessa faixa o tipo do cartão quebra ("Cartão de
  crédito" em até três linhas) e a linha dele fica mais alta; nenhum AC mede a altura ali. A partir
  de 1.024 px volta o respiro de Categorias, e o tipo fica numa linha; em 1.280 px toda linha mede
  45 px, inclusive a de um nome de 40 caracteres. Em 768 px a tabela fica no limite, sem folga: a
  T20 mede a página sem rolagem lateral em 767 e 768 px.
- **Em 400 px, o que vai embaixo do nome de um cartão de crédito quebra em duas linhas** (medido:
  128 px de linha, contra 103 da conta). O tipo, os dois dias e as duas contagens não cabem em
  336 px. O nome continua em cima e o resto embaixo dele; a T20 mede assim, e não "uma linha só".
- `rotuloDoTipo` nasce aqui, exportado, para o subtítulo do `DetalheDoMeio` (T17) usar o mesmo
  texto da coluna Tipo.

#### T17: `DetalheDoMeio`, renomear e corrigir os dias
**What**: o conteúdo do painel do meio: o subtítulo, o formulário "Editar <nome>" com
`CamposDoMeio` sem troca de tipo, a nota dos dias, a validação no navegador e "Onde ele aparece".
**Where**: `src/components/detalhe-do-meio.tsx` (+ teste)
**Depends on**: T6, T8, T9, T12, T16
**Reuses**: `CamposDoMeio`, `OndeAparece`, `TituloDoPainel`, `entradaEdicaoDoMeioSchema`, `editarMeioDePagamento` (por prop)
**Requirement**: CADCOL-07
**Done when**:
- [x] O nome num `TituloDoPainel` e o subtítulo "Cartão de crédito · fecha dia 25 · vence dia 5", "Conta corrente" ou "Rótulo", um caso para cada (CADCOL-07 AC 1)
- [x] Formulário "Editar Cartão Roxo" com "Nome", o tipo em texto com a frase de CADCOL-07 AC 2 e "Salvar alterações"; nenhum controle de tipo (CADCOL-07 ACs 2 e 4)
- [x] No cartão, os dois dias preenchidos e a nota dos dias; na conta, nem dias nem nota: uma assertion para cada (CADCOL-07 AC 3)
- [x] Salvar manda `{ meioPagamentoId, nome, ciclo }`, com `ciclo: null` na conta, e avisa "Meio de pagamento salvo." (CADCOL-07 AC 5)
- [x] Nome e dias iguais aos gravados, com espaço sobrando no nome, não chamam o servidor e não avisam (CADCOL-07 AC 9)
- [x] Nome vazio, nome com 41 caracteres, dia 0 e dia 32 recusados no navegador com a mensagem junto do campo; 40 caracteres e os dias 1 e 31 chegam ao servidor (CADCOL-07 AC 10, L-029, L-041)
- [x] A recusa do servidor no campo `nome` aparece em `alert` junto de "Nome", com `aria-invalid`; a sem campo aparece em `alert` no formulário (CADCOL-07 ACs 6, 11 e 12)
- [x] "Onde ele aparece" com os números e o link do meio (CADCOL-07 AC 13)
- [x] Gate quick passa; a contagem de testes só cresce
**Tests**: componentes
**Gate**: quick
**Commit**: `feat(meios): o meio aberto, com nome e dias editáveis` (`26fde27`)
**Nota** (desvios):
- **A mensagem junto do campo mora em `CamposDoMeio`, que ganhou a prop `erros`** (arquivo fora do
  Where da T17). O `aria-invalid` e o `aria-describedby` vão no próprio `input`, que é do
  `CamposDoMeio`; desenhada fora dele, a mensagem não marcaria o campo. Cada campo recusado ganha o
  `alert` logo abaixo, no bloco dele. **Com `erros`, o nome não tem `maxLength`**, como o da
  categoria (T13): cortado em 40 pelo navegador, o 41º caractere nunca chegaria à validação, e a
  mensagem do limite de CADCOL-07, AC 10 não apareceria. Sem `erros`, o cadastro inline e a
  importação ficam como estavam, com o nome cortado em 40; um teste novo em
  `campos-do-meio.test.tsx` prova esse lado (L-056), e os testes do inline, de
  `form-lancamento-avulso` e de `passo-pendencias` passam sem mudança.
- **As chaves da recusa viram os campos da tela:** `nome`, `ciclo.diaFechamento` e
  `ciclo.diaVencimento`, do schema no navegador e da action no servidor. `MEIO_PAGAMENTO_NAO_ENCONTRADO`
  chega em `meioPagamentoId`, que a tela não tem, e aparece no alerta do formulário, como a recusa
  sem campo (AC 12).
- **O formulário é um `@container`** e passa `diasPelaLargura` ao `CamposDoMeio`: os dois dias
  seguem a largura do formulário (448 px), e não a da janela; a T20 mede os dois lados do limiar
  (L-061).
- **Testes além do Done-when, cada um preso a um AC:** o servidor dizendo que nada mudou não avisa
  (AC 9, como na categoria); o dia recusado pelo servidor junto do campo do dia (AC 10, "no
  servidor"); corrigido o campo, a mensagem sai no envio seguinte (AC 10); e o nome salvo fica no
  campo como foi gravado, normalizado (AC 5, "o nome novo no painel").

#### T18: `NovoMeio`, o formulário de criação
**What**: o formulário "Novo meio de pagamento" do painel, com `CamposDoMeio` e os três tipos, a
ajuda e as mensagens de hoje.
**Where**: `src/components/novo-meio.tsx` (+ teste)
**Depends on**: T8, T9
**Reuses**: `CamposDoMeio`, `TituloDoPainel`, `entradaMeioPagamentoSchema`, `criarMeioDePagamento` (por prop)
**Requirement**: CADCOL-08
**Done when**:
- [x] O título "Novo meio de pagamento" num `TituloDoPainel`; "Nome", "Tipo" com os três, começando em "Cartão de crédito", "Criar meio" e "Cancelar" (CADCOL-08 AC 1)
- [x] Os dois dias só com cartão: uma assertion depois de escolher "Conta corrente" e outra depois de voltar a "Cartão de crédito" (CADCOL-08 AC 2)
- [x] A ajuda de hoje para cartão e conta e a do rótulo; nome vazio, 41 caracteres, dia 0 e dia 32 recusados sem chamar o servidor (CADCOL-08 AC 3, L-041)
- [x] O sucesso chama `aoCriado` com o id (CADCOL-08 AC 4)
- [x] A recusa "Já existe um meio de pagamento com esse nome." aparece junto do campo, sem `aoCriado` (CADCOL-08 AC 5)
- [x] "Cancelar" chama `aoCancelar` sem chamar o servidor (CADCOL-08 AC 6)
- [x] Gate quick passa; a contagem de testes só cresce
**Tests**: componentes
**Gate**: quick
**Commit**: `feat(meios): formulário de novo meio no painel` (`e5124e9`)
**Nota**:
- **Cada mensagem fica junto do campo dela**, pela prop `erros` do `CamposDoMeio` (T17), e não no
  alerta único do cadastro inline, que mostra só a primeira. O nome, sem `maxLength` no painel,
  chega com 41 caracteres à validação e mostra o limite. A recusa do servidor em `nome`,
  `diaFechamento` ou `diaVencimento` vai para o campo; a sem campo, ao alerta do formulário. O
  formulário é um `@container`, com `diasPelaLargura`, como o da edição.
- **O aviso "Meio de pagamento criado." é da aba** (T19), como o de `NovaCategoria`: o formulário só
  entrega o id, e o texto não depende da resposta.
- **O teste de "Cancelar" preenche um formulário válido:** com o nome sozinho, um "Cancelar" que
  enviasse o formulário também não chegaria ao servidor, e o mutante passava.
- **Testes além do Done-when:** os 40 caracteres e os dias 1 e 31 chegando ao servidor (L-029, o
  outro lado do limite) e a recusa sem campo no formulário, sem abrir nada (AC 5).

#### T19: `CadastroDeMeios`, o estado da aba e o endereço
**What**: o componente cliente da aba Meios de pagamento, com a mesma forma de `CadastroDeCategorias`
e `?meio=`.
**Where**: `src/components/cadastro-de-meios.tsx` (+ teste)
**Depends on**: T9, T10, T14, T16, T17, T18
**Reuses**: `ColunaDeCadastro`, `CabecalhoDeCadastros`, `TabelaDeMeios`, `DetalheDoMeio`, `NovoMeio`, `useParametroNaUrl` (era `trocarParametroNaUrl`; ver a Nota da T14)
**Requirement**: CADCOL-01, CADCOL-07, CADCOL-08, CADCOL-10, CADCOL-11
**Done when**:
- [x] "+ Novo meio" no cabeçalho, antes do painel e da tabela (CADCOL-01 AC 6)
- [x] Abrir uma linha mostra o meio e grava `?meio=<id>` por `replaceState`; `meioInicial` da lista abre sem foco; id fora da lista é ignorado (CADCOL-07 AC 1, CADCOL-11 ACs 1 a 3) — pelo `router.replace(…, { scroll: false })` de `useParametroNaUrl`, e não por `replaceState`, como a T14 (Nota)
- [x] "+ Novo meio" fecha o aberto, mostra o formulário e tira `?meio=` (CADCOL-08 AC 1, CADCOL-11 AC 4)
- [x] Depois de criar: o painel abre no meio criado, com o id na URL, o foco no título e "Meio de pagamento criado." (CADCOL-08 AC 4, CADCOL-10 AC 2)
- [x] "Fechar" e `Escape` devolvem o foco ao botão da linha ou ao "+ Novo meio" e tiram `?meio=` (CADCOL-10 AC 4, CADCOL-11 AC 4)
- [x] Trocar de meio com algo digitado descarta o digitado (CADCOL-07 AC 15)
- [x] O meio aberto que some dos itens, numa renderização nova, volta o painel ao vazio e tira o parâmetro
- [x] Gate quick passa; a contagem de testes só cresce
**Tests**: componentes
**Gate**: quick
**Commit**: `feat(meios): o estado da aba de meios, com o aberto no endereço` (`ec6c83f`)
**Nota** (desvios, os mesmos da T14):
- **O endereço vai por `useParametroNaUrl("meio", meioInicial)`**, o `router.replace(…, { scroll:
  false })` com a ref do último valor pedido (L-058), e não por `history.replaceState`, como o
  Done-when ainda dizia. O teste da navegação pendente prova abrir e logo fechar, fechar e logo
  reabrir, e o `?meio=` de fora da lista saindo ao abrir o "+ Novo meio".
- **O meio aberto só fecha quando estava na lista anterior e não está na nova.** O Next resolve o
  pedido de `criarMeioDePagamento` antes de desenhar a página relida, e o meio criado pode chegar
  ao painel antes de chegar à tabela. O foco no título dele espera a lista. O teste da lista
  atrasada passa por uma página relida sem ele antes da lista nova (mutantes M12 e M13 mortos).
- **"+ Novo meio" leva `aria-controls` e `aria-expanded`**, como o "+ Nova categoria".
- **Um teste além do Done-when:** sem nada aberto, o vazio com "Nenhum meio aberto" e a dica no DOM
  (CADCOL-09, AC 3, os textos; a coluna em que ele aparece é medida na T21).
- **Mutante equivalente:** abrir o estado num `meioInicial` fora da lista, em vez de "nada", não
  muda nada à vista: o painel não tem o que desenhar e nenhuma linha casa com o id.

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
- [x] A aba "Meios de pagamento" leva à rota nova no mesmo mês, com a aba marcada e "Cadastros" ativo (CADCOL-01 ACs 2, 3 e 5)
- [x] A ordem "Cartão Roxo", "conta Azul", "Conta Corrente", "Rótulo Âmbar", que difere da do banco e da do código de caractere (CADCOL-06 AC 2, L-001, L-036)
- [x] Tipo, "dia 25", "dia 5" e "—" lidos dentro de cada linha (CADCOL-06 ACs 3 e 4, L-018)
- [x] Abrindo a aba de março antes de qualquer outra tela: "Conta Corrente" com "2" e "2", "Cartão Roxo" com "0" e "1"; "Ver em Lançamentos" de "Conta Corrente" leva a "2 lançamentos" (CADCOL-03 ACs 1 a 6, L-001, L-014)
- [x] Corrigir os dias de "Cartão Roxo" para 10 e 17: o aviso "Meio de pagamento salvo.", "dia 10" e "dia 17" na linha e no subtítulo (CADCOL-07 AC 5)
- [x] Renomear "Cartão Roxo" para "conta azul": a recusa junto do campo, e nada muda na linha (CADCOL-07 AC 6)
- [x] Renomear para "Cartão Lilás": a linha muda de lugar; abrir Lançamentos pela navegação, sem recarregar, e ver "Cartão Lilás" entre as opções do filtro de meio (CADCOL-07 AC 14, L-014)
- [x] Criar "Cartão Novo", cartão com fechamento 3 e vencimento 10: a linha aparece e o painel abre nele; criar "conta corrente" é recusado junto do campo (CADCOL-08 ACs 4 e 5)
- [x] `?meio=`, recarregar e id inexistente; `Tab`, `Enter`, `Escape` e o foco (CADCOL-11 ACs 1 a 3, CADCOL-10 ACs 1 a 4)
- [x] Em 1.280 px: o painel entre as abas e a tabela; nenhum painel sem nada aberto; toda linha com até 48 px, com ponteiro fino (CADCOL-09 ACs 5 e 6, CADCOL-06 AC 7, L-030)
- [x] Em 767 e 768 px, os cabeçalhos e o botão da linha como na T15; com `hasTouch` em 1.280 px, o botão de cada linha com 44 × 44 (CADCOL-06 AC 8, CADCOL-10 AC 6, L-029, L-044)
- [x] Em 400 px, com "Cartão Roxo" aberto: sem rolagem lateral; os dois dias, "Salvar alterações", "Fechar", as abas e "+ Novo meio" com ao menos 44 × 44 (CADCOL-09 AC 7, CADCOL-10 AC 7)
- [x] O teste de TRES-01, AC 10 em 400 px percorre também `/2026-03/cadastros/meios-de-pagamento` (L-030)
- [x] Gate e2e passa com `e2e/cadastros-colunas.spec.ts` e `e2e/visao-tres-colunas.spec.ts`
**Tests**: e2e
**Gate**: e2e
**Commit**: `feat(meios): a aba Meios de pagamento, com o meio aberto no painel` (`beea926`)
**Nota** (desvios):
- **"Cartão Lilás" não muda de lugar entre os meios de março**: ele vem antes de "conta Azul", como
  "Cartão Roxo". O teste do renome põe "Cartão Marrom" na fixture, entre os dois na ordem, e a linha
  passa da segunda para a primeira posição, aberta e marcada. O filtro de meio de Lançamentos,
  aberto pelo item da navegação, com um marcador em `window` que prova que não houve recarga, tem
  "Cartão Lilás" e não tem "Cartão Roxo" (CADCOL-07, AC 14).
- **A confirmação à vista (L-057) se mede no que está junto do botão**, e não no aviso, que é
  `fixed`: depois de salvar os dias e de a página relida chegar (a linha com "fecha dia 10"),
  "Salvar alterações" e o subtítulo com os dias novos ficam inteiros na janela, em 1.280 × 720 e em
  1.920 × 1.080; depois de criar, o título do criado, com o foco, e o subtítulo dele.
- **O limiar de 448 px do formulário fica entre 777 e 778 px de janela**, como em Todo mês: em
  777 px o formulário tem 447 px e os dias ficam um embaixo do outro; em 778 px, 448 px e lado a
  lado. Os dois formulários, cada um aberto pela ação dele: a edição pela linha e a criação pelo
  "+ Novo meio" (L-060, L-061).
- **Em 767 e 768 px, a página não rola de lado, com um meio de 40 caracteres na tabela** (o
  desvio da T16, que deixou a tabela sem folga em 768 px). Em 767 px o nome do dia e o da contagem
  aparecem; em 768 px medem até 1 px.
- **Em 400 px, o "—" da conta some da tela e da árvore de acessibilidade**, e a posição da célula
  pelo papel muda; o teste de 400 px lê as células pela posição no DOM (`tdDoMeio`). O nome fica em
  cima e as outras células abaixo dele; na conta, o tipo e as contagens na mesma linha. No cartão,
  o que vai embaixo quebra em duas linhas (Nota da T16).
- **Testes além do Done-when, cada um preso a um AC ou lição:** a corrida do endereço com a rede
  lenta, abrir e logo fechar e fechar e logo reabrir (L-058, CADCOL-11); a linha aberta com fundo
  diferente das outras três (CADCOL-07, AC 15); abrir a última de dezesseis linhas com a página
  rolada traz o título à janela (CADCOL-10, AC 5); "Ver em Lançamentos" e os dois dias do formulário
  de criação com 44 × 44 em 400 px (CADCOL-10, AC 7; L-060).
- **Os testes da aba de meios ficam num `test.describe("a aba Meios de pagamento")`**: os títulos
  repetiam os de categorias, e o Playwright recusa título repetido.
- **Mutante equivalente nas larguras da T20:** tirar o `lg:whitespace-nowrap` do tipo não muda nada
  em 1.280 px (toda linha com 45 px, com o nome de 40 caracteres); a faixa de 1.024 a 1.279 px não
  tem AC de altura. A T21 mede de novo em 1.536 px, onde a tabela é mais estreita.

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
- [x] Nas duas abas, em 1.535 px o painel aberto fica entre as abas e a tabela e, sem nada aberto, não aparece; em 1.536 px fica à direita da tabela e, sem nada aberto, mostra "Nenhuma categoria aberta" ou "Nenhum meio aberto" com a dica (CADCOL-09 ACs 1, 3, 5 e 6, L-029)
- [x] Em 1.535 px, cabeçalho, painel e tabela medem até 1.024 px, centrados (CADCOL-09 AC 5)
- [x] Em 1.536 e em 1.920 px, a coluna mede 384 px (± 1) e tem `border-left` computado de 1 px; cabeçalho e tabela medem até 1.100 px e ficam centrados entre o menu e a coluna, com folgas que diferem em até 1 px (CADCOL-09 ACs 1 e 4)
- [x] Em 1.920 × 480, com categorias a mais para a página rolar, rolando até o fim, o título do painel continua dentro da janela (CADCOL-09 AC 2)
- [x] Em 1.536 e em 1.920 px, com ponteiro fino, toda linha das duas tabelas mede até 48 px (CADCOL-02 AC 7, CADCOL-06 AC 7, L-030)
- [x] Com `hasTouch` em 1.920 px e o painel aberto nas duas abas: o botão de cada linha, "Fechar", as abas, "+ Nova categoria" e "+ Novo meio", as opções de cor e os botões dos formulários medem ao menos 44 × 44 (CADCOL-10 ACs 6 e 7, L-044)
- [x] O teste de TRES-01, AC 8 roda em 1.535 px com Lançamentos, Todo mês, Categorias e Meios de pagamento; os outros testes de `visao-tres-colunas.spec.ts` passam sem mudança
- [x] Se a medida pedir outra largura, o desvio fica registrado aqui e no design
- [x] Gate e2e passa com `e2e/cadastros-colunas.spec.ts` e `e2e/visao-tres-colunas.spec.ts`
**Tests**: e2e
**Gate**: e2e
**Commit**: `feat(cadastros): o painel numa coluna à direita a partir de 1.536 px` (`4215dce`)
**Nota** (desvios):
- **Medido no navegador antes dos testes, nas duas abas:** em 1.536 px a coluna tem 384 px e a linha
  fina de 1 px, e o cabeçalho e a tabela têm 864 px (os 911 px da coluna da esquerda menos 24 px de
  cada lado), centrados entre o menu e a coluna, com 24 px de cada lado; em 1.920 px, 1.052 px. As
  larguras do design valem; nenhuma mudou.
- **A grade tem uma terceira linha, flexível** (`2xl:grid-rows-[auto_auto_1fr]`, a coluna em
  `row-span-3`), como Todo mês: o painel aberto é mais alto que o cabeçalho e a tabela juntos, e a
  sobra da altura não pode abrir vão entre os dois. O teste da coluna de 384 px confere que o
  painel é mais alto e que a tabela vem logo abaixo do cabeçalho, com os 24 px dele. Tirar só a
  `grid-rows` é mutante equivalente no Chrome: a terceira linha implícita, vazia, recebe a sobra.
  A coluna presa só nas duas primeiras linhas abre o vão, e o teste o pega (C13).
- **O nome longo que quebra ao lado do painel segue o Edge Case "Nome longo: quebra linha, e só
  aquela linha fica mais alta".** Em 1.536 px a tabela tem 864 px, e a categoria de 59 caracteres
  quebra quando outra linha tem a cor automática de texto mais largo ("Automática (Verde-água)"):
  a linha dela mede 52,5 px. O teste das linhas mede toda linha de nome curto até 48 px, com as
  duas de nome longo na tabela, e toda linha, a longa inclusive, só com o botão do nome mais o
  respiro da célula (até 9,5 px): nenhuma cresce por outra coluna, e o nome longo não faz crescer
  as outras. Uma largura mínima na coluna do nome, como a da T15, foi considerada e descartada:
  pela conta das larguras medidas, com a cor mais larga e os cabeçalhos das contagens no mínimo, a
  categoria de 59 caracteres não cabe nos 864 px sem a tabela passar da coluna, e o Edge Case já
  permite a quebra. Nenhum arquivo fora do Where mudou.
- **O mutante do tipo que quebra a partir de 1.024 px, equivalente na T20, morre aqui:** sem o
  `lg:whitespace-nowrap`, em 1.536 px o tipo quebra e a linha cresce por outra coluna (L7).
- **Testes além do Done-when, presos à spec:** o Edge Case do formulário de criação mais alto que
  a janela, em 1.920 × 480, rolando dentro da coluna presa no alto; a rolagem até o fim nas duas
  abas, e não só em Categorias (CADCOL-09, AC 2); e, no toque em 1.920 px, "Ver em Lançamentos" e os
  botões dos dois formulários de criação abertos pela ação (CADCOL-10, AC 7; L-060).
- **O teste de TRES-01, AC 8 sai do bloco de 1.920 px** e roda em 1.535 px com as quatro telas; o
  título dele diz isso. A spec de `visao-tres-colunas` ganha a nota na T22.
- **A primeira execução do gate parou no ambiente:** `browserType.launch` estourou 180 s no primeiro
  teste, com a carga da máquina em 12,8, e o modo serial não rodou o resto. A segunda, sem mudar
  nada, passou inteira (78).

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
- [x] AD-022 registrado, com o que ele revê (AD-019 e COR-04 em Cadastros) (CADCOL-12 AC 1)
- [x] A linha de arquivar do roadmap diz que renomear meio já tem tela e registra: arquivar um meio que fixos ativos usam é permitido, e os fixos continuam usando-o, ao lado da decisão de 2026-10-29 sobre a edição de fixo (CADCOL-12 AC 2)
- [x] Cada critério substituído aponta para o CADCOL que o substitui (CADCOL-12 AC 3)
- [x] "Largura do conteúdo" diz que Cadastros tem a coluna a partir de 1.536 px, e que a `AreaEstreita` fica com a home do ano e a tela de erro (CADCOL-12 AC 4)
- [x] `pnpm verify` e o `pnpm test:e2e` inteiro passam, com as contagens registradas
**Tests**: none
**Gate**: build
**Commit**: `docs(cadastros-colunas): registrar Cadastros em abas` (`e4789ef`)
**Nota**:
- **Contagens do gate, nesta worktree, em 2026-10-31:** `pnpm verify` saiu 0, com 2.087 testes
  unitários em 132 arquivos, 406 de integração em 25 arquivos e o build; branches em `src/domain`,
  393/393. `pnpm test:e2e` inteiro saiu 0, com 247 testes em 17 arquivos. Antes do
  lote 3 eram 2.010 unitários em 128 arquivos, 406 de integração e 209 e2e em 17 arquivos.
- **A dívida do roadmap** registra as três grades e também as duas cópias do endereço:
  `useParametroNaUrl` nas abas de Cadastros e o `mudarEndereco` de Todo mês, que ainda não usa o
  hook.
- **A nota de COR-04, AC 10 substitui só os alvos**: caber em 400 px continua valendo, agora por
  CADCOL-09, AC 7. A de AC 6, só a abertura do campo: gravar, avisar e manter a cor continuam.
- **Fica um comentário velho fora do Where:** `src/app/globals.css:274` ainda diz que Todo mês,
  Categorias e Lançamentos usam a `AreaEstreita`. Ele já estava errado desde Todo mês, e não é desta
  task; fica para quem mexer no arquivo.
- **O `pnpm db:up` não rodou nesta worktree:** o Postgres em Docker já estava de pé, e o compose
  daqui usaria outro nome de projeto, com outro contêiner na mesma porta. O gate usou o banco de
  teste `mybilling_test_cad`.

### Phase 7 — Correções da verificação (rodada 1)

#### F1: Abaixo de 768 px, a linha de baixo quebra quando não cabe
**What**: o Fix Plan 1 de `validation.md` (G1), com a escolha do dono em 2026-10-31: "Aceitar a
quebra".
- O CADCOL-02 AC 8 e o CADCOL-06 AC 8 passam a dizer: de 400 a 767 px, a pill ou o nome ficam
  sozinhos na primeira linha de texto. Abaixo dela vêm a cor e as contagens, ou o tipo, os dias e as
  contagens, com o nome escrito, e quebram em mais linhas quando não cabem. Não há cabeçalho de
  tabela.
- A linha "Celular" das premissas registra a escolha do dono.
- O teste de 400 px dos meios passa a medir o cartão, que hoje não mede.

**Where**:
- `.specs/features/cadastros-colunas/spec.md` (os dois ACs, a premissa e a traceability)
- `e2e/cadastros-colunas.spec.ts`

**Depends on**: nenhuma
**Reuses**: a contagem de linhas de texto pelas caixas do texto (sonda E de `validation.md`)
**Requirement**: CADCOL-02, CADCOL-06
**Done when**:
- [x] Os dois ACs 8 dizem a regra nova, com a confirmação do dono em 2026-10-31. A linha "Celular"
  das premissas passa a `y`
- [x] Em 400 px, na linha de "Cartão Roxo":
  - nenhuma caixa de texto do tipo, dos dias ou das contagens fica na faixa vertical do nome;
  - todas essas caixas ficam abaixo dele.
- [x] Em 400 px, "Conta Corrente" e "Categoria Um" ocupam duas linhas de texto, contadas pelas caixas
  do texto
- [x] O teste do cartão falha com um mutante que sobe o tipo para a linha do nome
- [x] `validate_spec.py` passa
**Tests**: e2e
**Gate**: e2e
**Commit**: `test(cadastros): no celular, a linha de baixo quebra quando não cabe` (`971b6c6`)
**Nota**:
- **A medida.** Três ajudantes novos em `e2e/cadastros-colunas.spec.ts`, que a F2 reaproveita:
  - `caixasDoTexto` lê as caixas do texto à vista, uma por linha de cada nó de texto, como a sonda E;
  - `linhasDeTexto` conta as linhas, juntando as caixas que se sobrepõem na vertical;
  - `nomeSozinhoEmCima` afirma as duas cláusulas do Done-when, cada uma com a sua assertion.
- **As assertions novas** estão em `:827-828` (Categoria Um) e `:1522-1527` (Cartão Roxo e Conta
  Corrente), antes das medidas antigas das células, que continuam.
- **O mutante.** Sem o `w-full` na célula do nome (`tabela-de-meios.tsx:188`), o tipo sobe para a
  linha do nome. O teste falha com ele na primeira assertion nova: "Cartão Roxo: caixa na faixa do
  nome". Na HEAD, os dois testes de 400 px passam.
- **A traceability foi remapeada.** Os ajudantes e as assertions novas deslocam os testes de baixo,
  e as citações de `e2e/cadastros-colunas.spec.ts` na tabela acompanham.
- **Fica um comentário velho fora do Where:** o cabeçalho de `tabela-de-meios.tsx` e o de
  `tabela-de-categorias.tsx` ainda falam em "cartão de duas linhas de texto". O de meios já diz que
  o cartão de crédito quebra em 400 px.
- **Gate:** 2.087 unitários, `typecheck` e `lint` 0, e os 54 testes de `cadastros-colunas.spec.ts`.

#### F2: A regra do AC 8 medida colado no limiar, em 767 px
**What**: o Fix Plan 2 (G2). Nos dois testes de 767 px, o de categorias e o de meios, entram as
assertions de 400 px:
- a pill ou o nome fica em cima;
- a cor e as contagens, ou o tipo, os dias e as contagens, ficam abaixo dele.

A regra é a da F1.
**Where**: `e2e/cadastros-colunas.spec.ts`
**Depends on**: F1
**Reuses**: as medidas da F1
**Requirement**: CADCOL-02, CADCOL-06
**Done when**:
- [x] Em 767 px, nas duas tabelas, a regra do AC 8, medida no navegador
- [x] Cada teste falha com o seu mutante: E17 (`md:table-row` → `sm:table-row` em
  `tabela-de-categorias.tsx`) e E18 (o mesmo em `tabela-de-meios.tsx`)
**Tests**: e2e
**Gate**: e2e
**Commit**: `test(cadastros): a linha do celular medida em 767 px` (`5894141`)
**Nota**:
- **A medida** reaproveita `nomeSozinhoEmCima` e `linhasDeTexto` da F1, em `:784-787` (Categoria
  Dois e Categoria Um) e `:1481-1484` (os quatro meios). Em 767 px o resto cabe numa linha, no
  cartão também, e o teste afirma isso: pela regra da F1, ele só quebra quando não cabe.
- **Os mutantes.** Na HEAD, os dois testes passam.
  - Com E17 (`tabela-de-categorias.tsx:149`), o de categorias falha em "Categoria Dois": o resto
    ocupa 3 linhas, e não 1. Cada célula vira um bloco.
  - Com E18 (`tabela-de-meios.tsx:182`), o de meios falha em "Cartão Roxo": 5 linhas, e não 1. O
    de categorias passa.
- **Gate:** 2.087 unitários, `typecheck` e `lint` 0, e os 54 testes de `cadastros-colunas.spec.ts`.
  A traceability foi remapeada de novo.

#### F3: Os alvos de 44 × 44 com ponteiro fino a partir de 768 px
**What**: o Fix Plan 3 (G3). O CADCOL-10 AC 7 vale "em qualquer largura e ponteiro". Hoje os alvos
são medidos só em 400 px e com toque em 1.920 px.
**Where**: `e2e/cadastros-colunas.spec.ts`
**Depends on**: F2
**Reuses**: as medidas de alvo de `:744` e do teste de toque da T21
**Requirement**: CADCOL-10
**Done when**:
- [x] Com ponteiro fino, em 768 e em 1.536 px, nas duas abas, cada um destes alvos mede ao menos
  44 × 44, conferido com o painel aberto e com os dois formulários de criação abertos pela ação
  (L-060):
  - as abas, "+ Nova categoria", "+ Novo meio" e "Fechar";
  - "Salvar", "Salvar alterações", "Criar categoria", "Criar meio" e "Cancelar";
  - "Ver em Lançamentos" e as onze opções de cor.
- [x] O teste falha com E19 (`md:pointer-fine:min-h-9 md:pointer-fine:min-w-9` no "Fechar")
**Tests**: e2e
**Gate**: e2e
**Commit**: `test(cadastros): os alvos de 44 px também com ponteiro fino` (`0e6cf23`)
**Nota**:
- **O teste** é um laço de duas larguras, no fim do arquivo (`:1940`), e confere que o ponteiro é
  fino. "Fechar" é medido três vezes em cada aba: com o item aberto e com o formulário de criação.
- **O mutante.** Na HEAD, os dois casos passam. Com E19 (`coluna-de-cadastro.tsx:142`), os dois
  falham em "Fechar": largura 36, e não ao menos 44. O modo serial para o laço no primeiro que cai,
  então o de 1.536 px foi rodado sozinho com o mutante.
- **Gate:** 2.087 unitários, `typecheck` e `lint` 0, e os 56 testes de `cadastros-colunas.spec.ts`
  (54 e os 2 novos). O teste novo fica no fim do arquivo, e nenhuma citação da traceability mudou.

#### F4: Nenhuma largura rola de lado
**What**: o Fix Plan 4 (G4), com a escolha do dono em 2026-10-31: "Nunca rolar de lado".
- O CADCOL-09 AC 7 passa a dizer: em qualquer largura a partir de 400 px, cada aba cabe sem
  rolagem lateral. Vale com nada aberto, com um item aberto e com o formulário de criação aberto.
- O Edge Case "Nome longo" ganha uma frase: uma palavra só, mais larga que a coluna, quebra no meio.
- Uma premissa nova registra a escolha do dono.

Sondas do Verifier, que mostram por que isso falha hoje:
- em 768 px, a categoria de cor automática verde-água, que tem o rótulo mais largo da coluna Cor,
  rola a página 10 px com mouse e 24 px no toque;
- uma palavra de 40 letras no meio e de 60 na categoria rola a página em 400, 768 e 1.024 px.

Medir antes de escolher a correção. As saídas sugeridas:
- a cor quebra entre 768 e 1.023 px (`lg:` no lugar de `md:whitespace-nowrap`, em
  `tabela-de-categorias.tsx`), como o tipo do meio na T16;
- `[overflow-wrap:anywhere]` no botão da linha das duas tabelas e no `TituloDoPainel`.

**Where**:
- `.specs/features/cadastros-colunas/spec.md` (o AC, o Edge Case, a premissa e a traceability)
- `src/components/tabela-de-categorias.tsx`, `src/components/tabela-de-meios.tsx` e
  `src/components/coluna-de-cadastro.tsx`, conforme a medida
- `e2e/cadastros-colunas.spec.ts`

**Depends on**: F3
**Reuses**: o laço de larguras e a medida de rolagem lateral de `:744` e `:1432`
**Requirement**: CADCOL-09, CADCOL-02, CADCOL-06
**Done when**:
- [x] O AC 7, o Edge Case e a premissa dizem a regra nova, com a escolha do dono
- [x] Nas duas abas, nos três estados (nada aberto, item aberto, formulário de criação aberto pela
  ação), não há rolagem lateral (`scrollWidth` ≤ `clientWidth`) em 400, 767, 768, 1.023, 1.024,
  1.279, 1.280, 1.535, 1.536 e 1.920 px. As fixtures do teste:
  - uma categoria de nome genérico cuja cor automática é verde-água;
  - um meio de 40 caracteres numa palavra só;
  - uma categoria de 60 caracteres numa palavra só.
  As fixtures entram só neste teste, sem mudar as contagens nem a ordem que os outros esperam
- [x] Em 768 px, também com toque (`hasTouch`), a mesma medida. Ela mata E7
- [x] Os testes falham no código de `e4789ef` e passam com a correção
- [x] As linhas de até 48 px (CADCOL-02 e CADCOL-06, AC 7) e os testes de 768 px da T15 e da T20
  continuam passando
**Tests**: e2e
**Gate**: e2e
**Commit**: `fix(cadastros): nenhuma largura rola de lado` (`7ee5281`)
**Nota**:
- **As fixtures.** "Categoria C", cuja cor automática é verde-água pela `corAutomatica` do app; o
  meio "CartaoComNomeDeQuarentaLetrasNumaPalavra" (40) e a categoria
  "CategoriaComNomeDeSessentaLetrasNumaPalavraSoParaApertarTudo" (60). Entram só nos dois testes
  novos, `:2077` (ponteiro fino) e `:2098` (toque em 768 px). O item aberto é o de nome numa palavra
  só, para o título do painel também ser medido.
- **Medido antes de corrigir**, com os componentes de `e4789ef` e ponteiro fino: 30 das 60 medidas
  rolavam.
  - Categorias: 72 px em 400 px, sem nada aberto e com o formulário; 115 px com o item aberto, e o
    painel mais 132. Em 768 px, 337 px; em 1.023 e 1.024 px, 82 e 81. Em 1.536 e 1.920 px, a página
    não rola, mas o painel do item aberto rola 143 px: a legenda "Cor de <nome>" alarga o grupo das
    cores.
  - Meios: em 400 px, 0 sem nada aberto e 147 px com o item aberto, e o painel mais 164. Em 768 px,
    213 px; em 1.024 px, 89. O painel do item aberto rola 151 px em 1.536 e 1.920 px.
  - Em 767, 1.279, 1.280 e 1.535 px, nada rola.
  - No toque, em 768 px: 353 px em Categorias e 213 em Meios, nos três estados.
- **A correção, em dois passos, medindo entre eles.**
  1. `[overflow-wrap:anywhere]` no botão da linha das duas tabelas e no painel inteiro (`aside`), que
     o título e a legenda herdam. Medido de novo, sobrava só Categorias em 768 px: 10 px, nos três
     estados. "Automática (Verde-água)" numa linha só deixava a tabela com 514 px em 480 px.
  2. A cor da categoria quebra entre 768 e 1.023 px (`lg:whitespace-nowrap` no lugar de
     `md:whitespace-nowrap`), como o tipo do meio. A outra saída era baixar a largura mínima da coluna
     do nome. Ela foi descartada, porque a T15 mediu 136 px como o mínimo para "Categoria Dois" não
     quebrar.
  Depois, nenhuma das 60 medidas rola, nem as 6 do toque.
- **Desvio: a regra vai no `aside`, e não só no `TituloDoPainel`.** A legenda "Cor de <nome>" também
  leva o nome, e mora em `detalhe-da-categoria.tsx`, fora do Where. No `aside`
  (`coluna-de-cadastro.tsx`), uma classe só cobre os dois.
- **O teste mede também o painel** (`scrollWidth − clientWidth` do `aside`): a partir de 1.536 px ele
  rola por conta própria, e a medida da página não vê a rolagem lateral dele. Por isso o AC 7 diz "na
  página e no painel".
- **Os mutantes.** Com os componentes de `e4789ef`, os dois testes falham: o de ponteiro fino com as
  30 medidas acima, e o de toque com as 6. Com E7 (`tabela-de-meios.tsx:67`, `md:px-2` → `md:px-4`)
  sobre a correção, o de toque falha: Meios rola 23 px nos três estados.
- **Gate:** 2.087 unitários, `typecheck` e `lint` 0. No e2e, os 58 de `cadastros-colunas.spec.ts` (56
  e os 2 novos), os 6 de `categorias.spec.ts` e os 24 de `visao-tres-colunas.spec.ts`, que também
  desenham as abas. Entre eles, as linhas de até 48 px (`:740`, `:1433`, `:1802`) e os testes de
  768 px da T15 (`:770`) e da T20 (`:1463`).

#### F5: "+ Nova…" ao lado do título, medido no navegador
**What**: o Fix Plan 5 (G5). O CADCOL-01 AC 6 diz "em todas as larguras", e hoje só a ordem do DOM
está provada (L-055).
**Where**: `e2e/cadastros-colunas.spec.ts`
**Depends on**: F4
**Reuses**: o cabeçalho de `CabecalhoDeCadastros`
**Requirement**: CADCOL-01
**Done when**:
- [x] Em 400, 1.535 e 1.536 px, nas duas abas, a caixa de "+ Nova categoria" ou "+ Novo meio" fica na
  faixa vertical do `h1` e à direita dele
- [x] O teste falha com E14b (o cabeçalho em coluna só a partir de 1.536 px)
**Tests**: e2e
**Gate**: e2e
**Commit**: `test(cadastros): a ação ao lado do título em todas as larguras` (`19e972f`)
**Nota**:
- **O teste** é um laço de três larguras no fim do arquivo (`:2117`), que percorre as duas abas por
  `ABAS_MEDIDAS`. A faixa vertical é a sobreposição das duas caixas: a ação começa acima da base do
  `h1` e termina abaixo do topo dele. Cada cláusula tem a sua assertion, e "à direita" é a terceira.
- **O mutante.** Na HEAD, os três casos passam. Com E14b (`2xl:flex-col` em
  `cabecalho-de-cadastros.tsx:38`), o de 1.536 px falha em Categorias: a ação começa em 180,9 px, e
  a base do título está em 164,9. Os de 400 e 1.535 px passam, porque o mutante só age a partir de
  1.536 px.
- **Gate:** 2.087 unitários, `typecheck` e `lint` 0, e os 61 testes de `cadastros-colunas.spec.ts`
  (58 e os 3 novos). Nenhuma citação da traceability mudou.

#### F6: A tela fica parada ao salvar
**What**: o mutante E15 de `validation.md`, que sobreviveu sem lacuna na spec. O dono escolheu em
2026-10-31 "Sim, como em Todo mês": ao salvar no painel, a tela não pula.
- Entra o CADCOL-04 AC 16: ao salvar a cor ou o nome da categoria, a página e a coluna do painel
  ficam na rolagem em que estavam, e o controle acionado continua à vista.
- Entra o CADCOL-07 AC 16: o mesmo ao salvar o nome ou os dias do meio.
- Uma premissa registra a escolha do dono.

Criar não entra: o painel abre na criada e leva o foco ao título, por desenho (CADCOL-10 AC 2).
**Where**:
- `.specs/features/cadastros-colunas/spec.md` (os dois ACs, a premissa e a traceability)
- `e2e/cadastros-colunas.spec.ts`
- o código, só se o teste mostrar um pulo hoje. Nesse caso, usar o padrão de Todo mês: `preventScroll`
  e `router.replace` com `scroll: false`. Registrar na Nota

**Depends on**: F5
**Reuses**: `redeLenta`, se precisar; a espera pela página relida dos testes de `:573` e `:1001`
**Requirement**: CADCOL-04, CADCOL-07
**Done when**:
- [x] Os dois ACs e a premissa, com a escolha do dono; `validate_spec.py` passa
- [x] O teste roda em 400 × 700, 1.280 × 480 e 1.920 × 480, numa janela baixa o bastante para o
  controle começar fora dela. Em 1.920 px, a coluna presa rola sozinha, e o que se mede ali é o
  `scrollTop` dela. Os passos:
  1. rolar até o controle ("Salvar alterações" do meio, "Salvar" do nome e uma opção de cor);
  2. acionar o controle;
  3. esperar o aviso e a página relida, com a linha já mudada.
  Depois, o `scrollY` e o `scrollTop` da coluna ficam iguais aos de antes (± 1 px), e o controle
  fica `toBeInViewport({ ratio: 1 })`
- [x] Cada caso falha com E15 (`window.scrollTo(0, 0)` depois de salvar) no formulário dele
- [x] Gate build: `pnpm verify` e o `pnpm test:e2e` inteiro passam, com as contagens registradas
**Tests**: e2e
**Gate**: build
**Commit**: `test(cadastros): a tela fica parada ao salvar` (`21aa62b`)
**Nota**:
- **Nenhum pulo hoje.** Com o código de `19e972f`, os nove casos passam: a rolagem da página e a da
  coluna são as mesmas antes e depois de salvar. O código não muda. O padrão de Todo mês já está
  nesta fatia: o `preventScroll` na guarda de foco (`coluna-de-cadastro.tsx:129`) e o
  `router.replace` com `scroll: false` (`parametro-na-url.ts:48`).
- **O teste** (`e2e/cadastros-colunas.spec.ts:2233`) percorre `GRAVACOES` nas três janelas: "Verde",
  no grupo da cor; "Salvar", do nome; e "Salvar alterações", do meio, com os dias 10 e 17. Em cada
  caso ele semeia linhas a mais, abre o item, preenche, leva a página até o fim e volta até o
  controle. Então salva e espera o aviso, a página relida com a linha já mudada e dois quadros.
- **Desvio: "começar fora" vale em sete dos nove casos.**
  - Em 400 × 700 e 1.280 × 480, com a página no fim, os três controles começam acima da janela, e o
    teste afirma isso.
  - Em 1.920 × 480 o painel fica preso no alto, e rolar a página não o move. "Salvar alterações"
    começa abaixo da janela (y 503), e a coluna rola 274 px até ele. "Verde" (y 261) e o "Salvar" do
    nome (y 166) começam dentro, nos primeiros 480 px do painel, e nenhuma janela desse tamanho muda
    isso.
  - Nesses dois casos, o que discrimina é a página, levada até o fim (`scrollY` 440 e 388). O teste
    afirma a página rolada antes de salvar nos nove casos (L-066).
- **Centrar, e não `scrollIntoViewIfNeeded`.** Na primeira medida, a rolagem do Playwright deixou
  "Verde" 0,14 px abaixo da borda da janela em 1.280 × 480, e o `toBeInViewport({ ratio: 1 })`
  falhava sem pulo nenhum. O teste rola com `scrollIntoView({ block: "center" })`.
- **Os mutantes.** Cada caso foi rodado sozinho com E15 no formulário dele: `window.scrollTo(0, 0)`
  logo depois do aviso, em `escolherCor` e em `salvarNome` de `detalhe-da-categoria.tsx`, e em
  `salvarAlteracoes` de `detalhe-do-meio.tsx`. Os nove falham em "rolagem da página", com o
  `scrollY` inteiro de antes de salvar: com a cor, 296, 241 e 440 px; com o nome, 207, 152 e 388; com
  o meio, 545, 393 e 541.
- **Gate build, nesta worktree, em 2026-10-31:**
  - `pnpm verify` saiu 0: `typecheck` e `lint` 0 (368 arquivos), 2.087 unitários em 132 arquivos,
    branches de `src/domain` em 393/393, 406 de integração em 25 arquivos e o build;
  - `pnpm test:e2e` inteiro saiu 0: 263 testes em 17 arquivos, 70 deles em
    `cadastros-colunas.spec.ts`.
  Antes da fase 7 eram 2.087 unitários, 406 de integração e 247 e2e; a fase acrescenta 16 e2e (2 na
  F3, 2 na F4, 3 na F5 e 9 na F6). O `pnpm db:up` não rodou, como na T22: o contêiner já estava de
  pé, e o gate usou o banco `mybilling_test_cad`.

### Phase 8 — Correções da verificação (rodada 2)

#### F7: Mudar só a caixa do nome do meio grava, no componente
**What**: o Fix 1 da rodada 2 (G6). O `DetalheDoMeio` decide "nada mudou" antes de chamar o
servidor (`detalhe-do-meio.tsx:131-137`). Nenhum teste muda só a caixa do nome. Na categoria, o
mesmo caso já tem teste (`detalhe-da-categoria.test.tsx:411`).
**Where**: `src/components/detalhe-do-meio.test.tsx`; `spec.md` (traceability do CADCOL-07)
**Depends on**: nenhuma
**Reuses**: o molde de `detalhe-da-categoria.test.tsx:411`
**Requirement**: CADCOL-07
**Done when**:
- [x] O teste troca "Cartão Roxo" por "cartão roxo" e salva. Ele afirma `editar` chamado uma vez com
  `nome: "cartão roxo"` e os dias gravados, e o aviso "Meio de pagamento salvo." (CADCOL-07 AC 8)
- [x] O teste passa na HEAD e falha com B8, a comparação `pedido.nome === meio.nome` feita sem caixa
**Tests**: componentes
**Gate**: quick
**Commit**: `test(meios): mudar só a caixa do nome do meio grava` (`e523713`)
**Nota**:
- **O teste** é um bloco novo do AC 8, entre o do AC 5 e o do AC 9 de
  `src/components/detalhe-do-meio.test.tsx` (`:262`), no molde de `detalhe-da-categoria.test.tsx:411`.
  Ele espera o aviso (`:268`) e depois afirma `editar` chamado uma vez com `nome: "cartão roxo"` e os
  dias 25 e 5 (`:269-274`). O cabeçalho do arquivo passa a citar o AC 8. O componente não muda.
- **O mutante.** Na HEAD, os 25 testes do arquivo passam. Com B8 (`pedido.nome.toLowerCase() ===
  meio.nome.toLowerCase()` em `detalhe-do-meio.tsx:132`), o teste novo falha em `:268` com `Unable to
  find role="status"`: o painel decide que nada mudou, não chama o servidor nem avisa. Os outros 24
  passam. O componente voltou por `git checkout`.
- **Gate quick:** 2.088 unitários em 132 arquivos (2.087 e o novo), branches de `src/domain` em
  393/393, `typecheck` e `lint` 0 (368 arquivos).

#### F8: Salvar o nome do meio também deixa a tela parada
**What**: o Fix 2 da rodada 2 (G7). O CADCOL-07 AC 16 diz "o nome ou os dias". Hoje `GRAVACOES`
(e2e `:2165-2214`) salva só os dias.
**Where**: `e2e/cadastros-colunas.spec.ts`; `spec.md` (traceability do CADCOL-07)
**Depends on**: F7
**Reuses**: `GRAVACOES`, `painelDoMeio`, `botaoDoMeio`
**Requirement**: CADCOL-07
**Done when**:
- [x] `GRAVACOES` ganha um quarto caso, "o nome do meio": "Nome" muda para "Cartão Lilás", e o teste
  espera `botaoDoMeio(page, "Cartão Lilás")` na página relida
- [x] O controle é procurado pelo painel, e não pelo formulário com o nome velho. O `aria-label` do
  formulário muda com o nome
- [x] Os três casos novos (400 × 700, 1.280 × 480 e 1.920 × 480) passam na HEAD e falham com F6e, o
  `scrollIntoView` na linha renomeada
**Tests**: e2e
**Gate**: e2e
**Commit**: `test(meios): renomear o meio deixa a tela parada` (`3816187`)
**Nota**:
- **O caso** "o nome do meio" (`e2e/cadastros-colunas.spec.ts:2222`) entra no fim de `GRAVACOES`. Ele
  preenche "Nome" pelo formulário "Editar Cartão Roxo" e procura "Salvar alterações" pelo painel,
  porque depois de salvar o formulário passa a "Editar Cartão Lilás". O laço (`:2256`) e as
  assertions (`:2279-2281`) são os da F6, sem mudança.
- **Um ajudante a mais:** `abrirCartaoRoxo`, ao lado de `abrirCategoriaUm`, abre o meio nos dois casos
  do meio. O caso dos dias abria pelo mesmo código, escrito no próprio caso, e o que ele faz não
  mudou. Um comentário sobre `GRAVACOES` diz por que o nome do meio é um caso à parte (L-067).
- **O mutante.** Na HEAD, os 12 casos passam. F6e foi escrito em `detalhe-do-meio.tsx:146`: com o
  nome mudado, depois do aviso, um `requestAnimationFrame` espera o botão da linha com o nome novo e
  chama `scrollIntoView()` nele. Os três casos novos falham em "rolagem da página" (`:2279`): 568 px
  em 400 × 700, 473 em 1.280 × 480 e 318 em 1.920 × 480. São as diferenças da sonda P3 (545 → 1.113,
  393 → 866 e 541 → 223). O modo `serial` para o arquivo na primeira falha, por isso o de 400 × 700
  rodou com os outros casos e os de 1.280 e 1.920 px rodaram um de cada vez. O componente voltou
  por `git checkout`.
- **As citações remapeadas:** o caso novo empurrou o laço de `:2233` para `:2256` e o
  `toBeInViewport` de `:2258` para `:2281`, citados no CADCOL-04 e no CADCOL-07. As linhas antes de
  `GRAVACOES` (`:2077`, `:2098`, `:2117`) não mudaram.
- **Gate e2e:** 2.088 unitários, `typecheck` e `lint` 0, e os 73 testes de `cadastros-colunas.spec.ts`
  (70 e os 3 novos).

#### F9: O nome longo fica dentro da tabela
**What**: a observação 2 da rodada 2. Com a tabela num `overflow-x-auto` e sem a regra de quebra no
botão (F4f), em 400 px a palavra de 60 letras vai a 472 px numa tabela de 384, e a página não rola.
O teste da F4 só pega isso em 768 e 1.024 px.
**Where**: `e2e/cadastros-colunas.spec.ts`
**Depends on**: F8
**Reuses**: o teste da F4 (`:2077`) e a contagem de caixas do texto da F1
**Requirement**: CADCOL-09 (AC 7), Edge Case "Nome longo"
**Done when**:
- [x] No teste da F4, em 400, 768 e 1.024 px, nas duas abas, cada caixa do texto do nome longo de uma
  palavra só fica dentro da caixa da tabela (± 1 px)
- [x] O teste passa na HEAD e falha em 400 px com F4f, a tabela num `overflow-x-auto` sem
  `overflow-wrap` no botão
**Tests**: e2e
**Gate**: e2e
**Commit**: `test(cadastros): o nome longo fica dentro da tabela` (`7b642b6`)
**Nota**:
- **A medida.** `textoForaDaTabela`, ao lado de `medirRolagemLateral`, percorre os nós de texto do
  botão da linha e mede cada caixa, uma por linha de texto, contra a caixa da tabela. Ela devolve o
  quanto o texto passa da tabela pelo lado que mais passa, e lança se o nome não tiver texto à vista.
  `medirRolagemLateral` guarda essa medida em cada estado e largura, ao lado da rolagem da página e
  da do painel.
- **Desvio: a medida não reaproveita `caixasDoTexto`.** Aquele ajudante devolve só o topo e a base de
  cada caixa. Para devolver também os lados, ele mudaria de tamanho em `:325`, e todas as citações do
  arquivo dali em diante teriam de ser remapeadas.
- **Desvio: mais do que as três larguras e só o teste de ponteiro fino.** A assertion nova
  (`:2126-2129`) vale para as 60 medidas do teste de `:2113`: as dez larguras, entre elas 400, 768 e
  1.024 px, nos três estados das duas abas. Vale também para as 6 do teste com toque em 768 px
  (`:2147-2150`), que usa a mesma função. Na HEAD, as 66 ficam dentro da tabela. Os títulos dos dois
  testes passam a dizer a cláusula nova e a citar os Edge Cases.
- **A ordem das assertions.** A nova vem antes da que mede a rolagem. Com F4f, a da rolagem já caía em
  768 e 1.024 px e esconderia o caso de 400 px, que é o que esta task fecha.
- **O mutante.** F4f foi escrito como na seção 8 de `validation.md`: `{lista}` num `<div
  className="overflow-x-auto">` em `coluna-de-cadastro.tsx:152`, e sem `[overflow-wrap:anywhere]` no
  botão da linha em `tabela-de-categorias.tsx:167` e `tabela-de-meios.tsx:200`.
  - O teste de ponteiro fino falha em `:2129`, "o nome numa palavra só fora da tabela". Em Categorias,
    400 px, nos três estados, o nome passa 75,7 px da tabela, com a página e o painel em 0. A medida
    da F4 sozinha não via esse caso.
  - Em Meios, em 400 px, a palavra de 40 letras cabe na tabela mesmo sem a regra.
  - O teste com toque falha na assertion da rolagem (`:2151`): a página rola 245 px em Categorias e
    205 em Meios, nos três estados. Ali o invólucro cresce com a tabela, e o nome fica dentro dela (0).
  - Os três componentes voltaram por `git checkout`.
- **As citações remapeadas** em `spec.md`, porque a medida entrou antes delas:
  - no CADCOL-09, `:2077` → `:2113` e `:2098` → `:2138`;
  - no CADCOL-01, `:2117` → `:2161`;
  - no CADCOL-04 e no CADCOL-07, `:2256` → `:2300`, `:2279-2280` → `:2323-2324` e `:2281` → `:2325`;
  - no CADCOL-07, `:2222` → `:2266`.
  As Notas da F4, da F6 e da F8 citam as linhas do commit de cada uma.
- **Gate e2e:** 2.088 unitários, `typecheck` e `lint` 0, e os 73 testes de `cadastros-colunas.spec.ts`.

#### F10: Os comentários e a citação que ficaram para trás
**What**: o Fix 3 e a observação 5 da rodada 2.
- Os comentários de "duas linhas de texto" passam a dizer a regra do AC 8 revisto: o nome sozinho em
  cima e, embaixo, o resto, que quebra quando não cabe. Eles estão em `tabela-de-meios.tsx:17-24`,
  `:148` e `:176-178`, e em `tabela-de-categorias.tsx:23-25`.
- A citação `e2e/visao-tres-colunas.spec.ts:606`, na traceability do CADCOL-09, passa a apontar o
  começo do teste.

**Where**: `src/components/tabela-de-meios.tsx`, `src/components/tabela-de-categorias.tsx` (só
comentários); `spec.md` (traceability)
**Depends on**: F9
**Reuses**: nenhuma
**Requirement**: CADCOL-02, CADCOL-06, CADCOL-09
**Done when**:
- [x] Nenhum comentário diz "duas linhas de texto" para a linha de baixo
- [x] A citação aponta a linha do `test(` de TRES-01 AC 10
- [x] Gate build: `pnpm verify` e o `pnpm test:e2e` inteiro passam, com as contagens registradas
**Tests**: none
**Gate**: build
**Commit**: `docs(cadastros): acertar os comentários e a citação que ficaram para trás` (`92063b4`)
**Nota**:
- **Os comentários.** Os quatro trechos dizem a regra do AC 8 revisto: o nome, ou a pill, sozinho na
  primeira linha de texto e, embaixo, o resto, que quebra em mais linhas quando não cabe.
  - Em `tabela-de-meios.tsx`, o do arquivo, o da `CelulaDoDia` e o da linha. "No cartão de duas
    linhas o — some" passa a "abaixo de 768 px o — some", que é o que o `hidden md:table-cell` faz.
    A frase dos 400 px, em que o resto do cartão de crédito ocupa duas linhas porque não cabe em
    336 px, continua: ela descreve a quebra, e não a regra.
  - Em `tabela-de-categorias.tsx`, o do arquivo.
  - A "grade de duas linhas" de `tabela-de-categorias.tsx:144` fica, porque são duas linhas de grade,
    como a seção 6 de `validation.md` diz. Também ficam os comentários de `:81` e de
    `tabela-de-meios.tsx:98`, que falam do nome quebrando na coluna em 768 px.
  - Nenhuma classe mudou. `grep "duas linhas de texto"` nos dois arquivos não acha nada.
- **A citação.** No CADCOL-09, `e2e/visao-tres-colunas.spec.ts:606` passa a `:604`, a linha do
  `test(` de TRES-01, AC 10. A `validation.md` de Visão em três colunas também cita `:606`, mas é o
  relatório de outra fatia e fica como está.
- **Gate build, nesta worktree, em 2026-10-31.** O `pnpm db:up` não rodou, como na T22 e na F6: o
  contêiner `mybilling-db` já estava de pé e saudável, e o gate usou o banco `mybilling_test_cad`.
  - Cada passo do `pnpm verify` rodou sozinho, com o código de saída conferido, e depois o `pnpm
    verify` inteiro. Todos saíram 0: `typecheck`, `lint` (368 arquivos), 2.088 unitários em 132
    arquivos, branches de `src/domain` em 393/393, 406 de integração em 25 arquivos e o build.
  - `pnpm test:e2e` inteiro saiu 0, com 266 testes em 17 arquivos na primeira passada, em 7,8 min.
    São 73 em `cadastros-colunas.spec.ts`.
- **As contagens da fase 8.** Antes eram 2.087 unitários, 406 de integração e 263 e2e. A fase
  acrescenta 1 unitário (F7) e 3 e2e (F8). A F9 põe assertions nos dois testes da F4, e não testes
  novos.

### Phase 9 — Correções da verificação (rodada 3)

#### F11: O rótulo do mês lido na tela
**What**: o Fix 1 da rodada 3 (G8). A página monta "Março de 2026" (`categorias/page.tsx:70`,
`meios-de-pagamento/page.tsx:74`). Os e2e de "Onde ela aparece" e "Onde ele aparece" leem só os `dd`.
O cabeçalho de `detalhe-do-meio.tsx:15` ainda diz "ACs 1 a 6 e 9 a 13", e entra nesta task porque é
um comentário só.
**Where**: `e2e/cadastros-colunas.spec.ts`; `src/components/detalhe-do-meio.tsx` (só o comentário);
`spec.md` (traceability)
**Depends on**: nenhuma
**Reuses**: os testes de `:399` e `:989`
**Requirement**: CADCOL-04, CADCOL-07
**Done when**:
- [x] Nas duas abas, `secao.locator("dt")` com "Fixos em Março de 2026" e "Lançamentos em Março de
  2026" (CADCOL-04 AC 11, CADCOL-07 AC 13)
- [x] Os dois testes passam na HEAD e falham com S3 e S3b, um cada
**Tests**: e2e
**Gate**: e2e
**Commit**: `test(cadastros): o rótulo do mês lido na tela` (`48f04a2`)
**Nota**:
- **As assertions.** Nos dois testes de composição, logo depois dos `dd`, `secao.locator("dt")` com
  "Fixos em Março de 2026" e "Lançamentos em Março de 2026": em Categorias em
  `e2e/cadastros-colunas.spec.ts:422`, no teste de `:399`, e em Meios em `:1017`, no teste de `:994`.
  Um comentário de uma linha diz que o rótulo vem da página (L-054). Nenhum teste novo.
- **O comentário.** O cabeçalho de `detalhe-do-meio.tsx` passa a "ACs 1 a 6 e 8 a 13", e o parágrafo
  da regra no navegador ganha "o nome que muda só na caixa grava (AC 8)". As duas mudanças ficam nas
  linhas que já existiam: o arquivo tem o mesmo número de linhas, e nenhum código mudou.
- **Os mutantes.** Na HEAD, os dois testes passam.
  - S3, `rotuloDaCompetencia={nomeDoMes(mes)}` em `meios-de-pagamento/page.tsx:74`: o de Meios falha
    em `:1017`, com "Fixos em Março" e "Lançamentos em Março" no lugar de "Fixos em Março de 2026" e
    "Lançamentos em Março de 2026". O de Categorias passa.
  - S3b, o mesmo em `categorias/page.tsx:70`: o de Categorias falha em `:422`, com a mesma diferença.
    O de Meios não rodou, porque o modo `serial` para o arquivo na primeira falha.
  - As duas páginas voltaram por `git checkout`.
- **Desvio: as citações remapeadas são todas as do arquivo.** As cinco linhas novas de cada teste
  empurram 5 linhas tudo o que vinha depois de `:420`, e 10 tudo o que vinha depois de `:1010`.
  São 67 citações nas onze linhas da traceability com e2e, do CADCOL-01 ao CADCOL-11, por exemplo
  `:435` → `:440`, `:989` → `:994`, `:2113` → `:2123` e `:2300` → `:2310`. Um script leu o diff, trocou
  cada citação pela linha nova e conferiu que nenhuma caía num trecho mudado. As Notas das tasks
  anteriores citam as linhas do commit de cada uma, e ficam.
- **Gate e2e:** `typecheck` e `lint` 0 (368 arquivos), e os 73 testes de `cadastros-colunas.spec.ts`,
  em 1,8 min. O `pnpm test:unit` fica para o gate build da F13, por ordem do orquestrador: esta task
  não muda nada que um unitário execute.

#### F12: A tabela cabe no contêiner dela
**What**: o Fix 2 da rodada 3 (G9). Hoje `medirRolagemLateral` mede três coisas: a página, o
`aside` e o texto do nome contra a tabela. Não mede um invólucro que rola por conta própria.
**Where**: `e2e/cadastros-colunas.spec.ts`; `spec.md` (traceability do CADCOL-09)
**Depends on**: F11
**Reuses**: `medirRolagemLateral`; a sonda B da rodada 3
**Requirement**: CADCOL-09
**Done when**:
- [x] Nas 66 medidas da F4, nenhum elemento da página com `overflow-x` diferente de `visible` tem
  `scrollWidth > clientWidth`. Os campos de texto ficam fora, porque rolam o próprio valor
- [x] O teste passa na HEAD e falha com N5 em 400 px, e com N4 também com ponteiro fino em 768 px
**Tests**: e2e
**Gate**: e2e
**Commit**: `test(cadastros): nenhuma região rola de lado` (`a5bb161`)
**Nota**:
- **A medida.** `regioesQueRolamDeLado` (`e2e/cadastros-colunas.spec.ts:2082`), ao lado de
  `textoForaDaTabela`, percorre todo elemento da página e devolve os que têm `overflow-x` diferente
  de `visible` e `scrollWidth > clientWidth`, cada um com a tag, as classes e o quanto rola, como a
  sonda B. `medirRolagemLateral` guarda a lista em cada medida, e os dois testes da F4 afirmam a
  lista vazia nas 60 medidas (`:2173-2176`) e nas 6 com toque (`:2198-2201`), depois das assertions
  que já existiam. Nenhum teste novo.
- **Desvio: o texto só para o leitor de tela também fica fora.** Na primeira passada, na HEAD, a
  medida achou, nas 60 do teste de ponteiro fino, os elementos `sr-only` e `md:sr-only` da página,
  de 29 a 135 px. Cada um é uma caixa de 1 × 1 px com `overflow: hidden`, que corta o texto de
  propósito e não tem nada à vista para rolar. A medida pula a caixa de até 1 × 1 px, e o comentário
  dela diz por quê. Com isso, na HEAD, as 66 ficam vazias. O "Nome" com o nome longo, que a sonda B
  achou, fica fora por ser campo de texto.
- **Os mutantes.**
  - N5, `{lista}` num `<div className="overflow-x-auto">` em `coluna-de-cadastro.tsx:153` e
    `min-w-[28rem]` na tabela em `tabela-de-categorias.tsx:77`: o teste de ponteiro fino falha em
    `:2176`, "uma região que rola de lado", com `DIV.overflow-x-auto +80` em Categorias, 400 px, nos
    três estados, e a página, o painel e o nome em 0. O teste com toque não rodou, pelo modo
    `serial`.
  - N4, o mesmo invólucro e `lg:whitespace-nowrap` → `md:whitespace-nowrap` na cor, em
    `tabela-de-categorias.tsx:178`. Com ponteiro fino, o teste falha em `:2176` com
    `DIV.overflow-x-auto +34` em Categorias, 768 px, nos três estados, com a página e o painel em 0.
    Rodado sozinho, o teste com toque falha na assertion da página (`:2197`): ela rola 2 px, e o
    invólucro 42.
  - Os dois componentes voltaram por `git checkout`.
- **As citações remapeadas,** porque a medida entrou antes delas: no CADCOL-09, `:2123` → `:2155`,
  `:2136-2139` → `:2168-2171`, `:2148` → `:2184` e `:2157-2160` → `:2193-2196`; no CADCOL-01,
  `:2171` → `:2211`; no CADCOL-04 e no CADCOL-07, `:2310` → `:2350` e `:2335` → `:2375`; no
  CADCOL-07, `:2276` → `:2316` e `:2333-2334` → `:2373-2374`. A redação do AC 7 não muda: o Where
  desta task é só a traceability, e a escolha do dono, "Nunca rolar de lado", já cobre a região.
- **Gate e2e:** `typecheck` e `lint` 0 (368 arquivos), e os 73 testes de `cadastros-colunas.spec.ts`,
  em 1,8 min. O `pnpm test:unit` fica para o gate build da F13, como na F11.

#### F13: A palavra longa quebra dentro do painel
**What**: o Fix 3 da rodada 3 (G10). A cláusula "quebra no meio, no painel" do Edge Case só tem a
medida da rolagem do `aside`, e um corte com reticências não rola.
**Where**: `e2e/cadastros-colunas.spec.ts`; `spec.md` (traceability)
**Depends on**: F12
**Reuses**: `textoForaDaTabela`
**Requirement**: CADCOL-09, Edge Case "Nome longo"
**Done when**:
- [x] No estado "item aberto", as caixas do texto do título do painel e da legenda "Cor de <nome>"
  ficam dentro da caixa do `aside` (± 1 px)
- [x] O teste passa na HEAD e falha com N7 em 400, 1.536 e 1.920 px
- [x] Gate build: `pnpm verify` e o `pnpm test:e2e` inteiro passam, com as contagens registradas
**Tests**: e2e
**Gate**: build
**Commit**: `test(cadastros): a palavra longa quebra dentro do painel` (`49dea3f`)
**Nota**:
- **A medida.** `textoForaDaTabela` passa a `textoForaDe(alvo, conteiner)`
  (`e2e/cadastros-colunas.spec.ts:2054`), que mede o texto contra a tabela ou contra o `aside`. A
  chamada do botão da linha passa `"table"`, e a medida dela não muda. `textoDoNomeForaDoPainel`
  (`:2084`) mede o título do painel e, na categoria, a legenda "Cor de <nome>", e devolve o que mais
  passa. `medirRolagemLateral` guarda essa medida no estado "item aberto", e 0 nos outros dois.
- **As assertions.** Nenhuma medida passa de 1 px: `:2197-2200` nas 60 do teste de ponteiro fino e
  `:2226-2229` nas 6 com toque em 768 px, logo depois da do nome contra a tabela. Os títulos dos dois
  testes passam a dizer "dentro da tabela e do painel". Nenhum teste novo.
- **No meio, só o título.** O painel do meio não tem legenda com o nome: "Editar <nome>" é o nome
  acessível do formulário, sem texto à vista.
- **O mutante.** Na HEAD, os dois testes passam. Com N7, `truncate` no `TituloDoPainel` em
  `coluna-de-cadastro.tsx:50`:
  - o teste de ponteiro fino falha em `:2200`, "o nome numa palavra só fora do painel". O título
    passa do painel em Categorias em 400 px (66,5 px), 1.536 e 1.920 px (54,5 px), e em Meios em
    400 px (163,5 px), 768 px (51,5 px), 1.536 e 1.920 px (151,5 px). São os números da sonda A;
  - rodado sozinho, o teste com toque falha em `:2229`, com Meios em 768 px (51,5 px);
  - o componente voltou por `git checkout`.
- **As citações remapeadas,** porque a medida entrou antes delas:
  - no CADCOL-09, `:2155` → `:2180` e `:2184` → `:2213`, à mão, porque os títulos mudaram;
    `:2168-2171` → `:2193-2196`, `:2193-2196` → `:2222-2225`, `:2173-2176` → `:2202-2205`,
    `:2198-2201` → `:2231-2234` e `:2082` → `:2104`;
  - no CADCOL-01, `:2211` → `:2244`;
  - no CADCOL-04 e no CADCOL-07, `:2350` → `:2383` e `:2375` → `:2408`;
  - no CADCOL-07, `:2316` → `:2349` e `:2373-2374` → `:2406-2407`.
  O script da F11 casou o fim de `:2193-2196` com o fecho igual da assertion nova, e essa citação foi
  acertada à mão. No fim, cada citação do arquivo na traceability foi conferida pelo texto da linha
  contra a de `87efa3e`: 68 iguais, mais as duas dos títulos mudados e as oito novas das F11 a F13.
- **Gate build, nesta worktree, em 2026-10-31.** O `pnpm db:up` não rodou, como na F10: o contêiner
  `mybilling-db` já estava de pé e saudável, e o gate usou o banco `mybilling_test_cad`.
  - `pnpm verify` saiu 0: `typecheck`, `lint` (368 arquivos), 2.088 unitários em 132 arquivos,
    branches de `src/domain` em 393/393, 406 de integração em 25 arquivos e o build.
  - `pnpm test:e2e` inteiro saiu 0, com 266 testes em 17 arquivos na primeira passada, em
    7,0 min. São 73 em `cadastros-colunas.spec.ts`.
- **As contagens da fase 9** são as da fase 8: 2.088 unitários, 406 de integração e 266 e2e. As F11 a
  F13 põem assertions em testes que já existiam, e não testes novos.

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
