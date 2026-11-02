# Excluir compra parcelada desta parcela em diante — Tasks

**Spec**: `.specs/features/excluir-compra/spec.md`
**Design**: `.specs/features/excluir-compra/design.md`
**Status**: Approved (dono, 2026-11-02: 2 lotes com subagentes, T1–T7 e T8–T13, direto na `main`)
**Total**: 13 tasks em 5 fases

---

## Execution Protocol (MANDATORY -- do not skip)

Implementar com a skill `tlc-spec-driven`, ativada pelo nome. Para cada task: pré-implementação →
testes primeiro, derivados dos ACs do `spec.md` → implementação → gate → Test Adequacy Review
(evidence-or-zero, `file:line` + assertion) → marcar a task em `tasks.md` e a traceability no
`spec.md` → **um** commit atômico validado por `check_commit.py`.

Proibições: commitar antes do gate · enfraquecer, pular ou apagar teste · agrupar tasks · "já que
estou aqui" · dado real em fixture ou commit (AD-009).

**Blast radius:** aprovação autoriza implementação e commits **locais**. `git push` e qualquer
operação remota exigem autorização separada.

---

## Global Constraints

- Centavos inteiros (AD-001); competência `'YYYY-MM'` (AD-002); domínio puro com `Result` e 100% de
  branches (AD-006).
- Só `movimento` é somável (AD-003). Conservação: amortizado anterior + soma das parcelas **não
  canceladas** = total da compra (AD-005, AD-027).
- Server Action: `requireSession()` primeiro, `z.strictObject`, `ResultadoAction`,
  `ERRO_INESPERADO` com correlação.
- Mensagens em pt-BR em `src/lib/erros.ts`; `LANCAMENTO_NAO_ENCONTRADO` já existe ("Esse
  lançamento não existe mais.").
- Fixtures por valor matemático e nomes genéricos ("Compra A", R$ 10,00 em 4x) (AD-009).
- **Gate de toda task inclui `pnpm typecheck`, encadeado com `&&`** (lição L-016).
- Lições confirmadas que valem aqui: L-010 (AC de duas cláusulas, duas assertions), L-014 (um teste
  que atravesse página → domínio → banco), L-018 (consultas presas ao menu aberto), L-029 (`k` e
  `p` em 1 e 2, dos dois lados do singular), L-054 (e2e lê o texto do aviso na tela).

## Review Focus

1. **Parcela paga dentro do alcance** → fica, com o mesmo `pago_em`; a soma do aviso não a conta.
   Teste em T1, T3, T6 e T12.
2. **Reprecificar depois de excluir** → a importação não lança `ViolacaoDeConservacao`. Teste em T2.
3. **"faltam N" depois de excluir** → conta só as não canceladas. Teste em T1, T4 e T12.
4. **Clique duplo / duas abas** → segunda exclusão sem erro e sem escrita. Teste em T6.
5. **Avulso** → os dois toques de hoje, sem o aviso novo. Teste em T9 e T12.

---

## Test Coverage Matrix

> Gerada do código, de `AGENTS.md` (100% de branches em `src/domain`; todo ramo e todo caminho de
> erro nas outras camadas; integração em Postgres real) e de `vitest.config.ts`.

| Camada | Tipo | Expectativa | Local | Comando |
| --- | --- | --- | --- | --- |
| `src/domain/**` | unit | 100% de branches; 1:1 com os ACs | `src/domain/**/*.test.ts` | `pnpm test:unit` |
| `src/application/**` | unit | Todos os ramos, com fakes | `src/application/**/*.test.ts` | `pnpm test:unit` |
| Repositórios | integration | O que a escrita muda e o que ela **não** toca | `src/infrastructure/**/*.integration.test.ts` | `pnpm test:integration` |
| Actions | integration | Sessão primeiro, validação, recusas, falha, revalidação | `src/app/**/*.integration.test.ts` | `pnpm test:integration` |
| Componentes | componentes | Textos, estados, foco, erro, toast | `src/components/**/*.test.tsx` | `pnpm test:unit` |
| Fluxo | e2e | Excluir e ver os outros meses; aviso; avulso igual; 400 px | `e2e/*.spec.ts` | `pnpm test:e2e` |
| Composição de página, docs | none | — | — | — |

## Gate Check Commands

| Gate | Comando |
| --- | --- |
| `quick` | `pnpm test:unit && pnpm typecheck` |
| `full` | `pnpm test:unit && pnpm test:integration && pnpm typecheck` |
| `build` | `pnpm verify` |
| `e2e` | `pnpm typecheck && pnpm exec playwright test e2e/excluir-compra.spec.ts` |

---

## Execution Plan

### Phase 0 — Regra pura

```
T1
```

### Phase 1 — Banco

```
T2 → T3
```

### Phase 2 — Aplicação e action

```
T4
T5 → T7
T6 → T7
```

### Phase 3 — Interface

```
T8 → T10
T9 → T10 → T11
```

### Phase 4 — Ponta a ponta e fechamento

```
T12 → T13
```

---

## Task Breakdown

### Phase 0 — Regra pura

#### T1: O que sai, o que fica e o total novo, no domínio
**What**: `planejarExclusaoDestaEmDiante`, `restantesDepois` e `NADA_A_EXCLUIR` na union `CodigoErro`.
**Where**: `src/domain/parcelamento/excluir-desta-em-diante.ts`
**Depends on**: None
**Reuses**: `somar`, `ok`, `err`; `PARCELA_INICIAL_INVALIDA`, que já existe
**Requirement**: EXC-02, EXC-03, EXC-04
**Tools**: MCP NONE · Skill NONE
**Done when**:
- [x] Compra 4x de R$ 10,00, a partir da 2: `numeros` [2, 3, 4], `total` 3000, `primeira`/`ultima` a 2ª e a 4ª competência, `inteira` false, `valorTotalNovo` = amortizado + 1000 (EXC-03 AC 1, 2, 4)
- [x] A partir da 1: `inteira` true; a partir da 4: `numeros` [4] (Edge Cases)
- [x] Com a 3 paga, a partir da 2: `numeros` [2, 4], `pagasQueFicam` 1, `total` 2000; com a 3 e a 4 pagas, `pagasQueFicam` 2 (EXC-03 AC 3; L-029)
- [x] A partir da 2 com a 2 paga e a 3 não: `numeros` [3, 4] (Edge Cases)
- [x] Todas do alcance pagas → `NADA_A_EXCLUIR` com `pagasQueFicam` (EXC-05 AC 5)
- [x] `aPartirDe` fora das parcelas → `PARCELA_INICIAL_INVALIDA`
- [x] Parcelas de valores diferentes: `total` é a soma dos valores gravados (Edge Cases)
- [x] `restantesDepois`: 4x sem cancelada → 2 para a 2; só 1 e 2 vigentes → 0 para a 2 (EXC-04 AC 5)
- [x] 100% de branches em `src/domain`
**Tests**: unit
**Gate**: quick
**Commit**: `feat(compras): decidir no domínio o que sai ao excluir desta parcela em diante`

### Phase 1 — Banco

#### T2: Conservação e reprecificação ignoram parcela cancelada
**What**: o `SUM` do assert de `reprecificar`, o `UPDATE` de valor e as parcelas de `buscarUma` passam a filtrar `cancelado_em IS NULL`, no Drizzle e no fake.
**Where**: `src/infrastructure/db/repositories/compra.repository.ts`
**Depends on**: None
**Reuses**: `isNull(movimento.canceladoEm)`, como `movimento.repository.ts:32`
**Requirement**: EXC-03
**Tools**: MCP NONE · Skill NONE
**Done when**:
- [x] Com a 4/4 cancelada, `buscarPorId` da compra devolve só 1/4 a 3/4
- [x] Com a 4/4 cancelada, `reprecificar` a partir da 3 com total = amortizado + soma das três vigentes grava sem `ViolacaoDeConservacao`, e a 4/4 continua com o valor antigo
- [x] O fake de `CompraRepository` em `src/application/ports/fakes.ts` faz o mesmo, com teste próprio
- [x] Testes de integração existentes de `compra.repository` continuam verdes
**Tests**: integration
**Gate**: full
**Commit**: `fix(compras): conferir a conservação só com parcelas não canceladas`

#### T3: Ler as parcelas vigentes e excluir parcelas no banco
**What**: `parcelasVigentes` e `excluirParcelas` na port, no fake e no repositório Drizzle.
**Where**: `src/infrastructure/db/repositories/compra.repository.ts`
**Depends on**: T2
**Reuses**: o formato transacional de `reprecificar`; `ViolacaoDeConservacao`
**Requirement**: EXC-03
**Tools**: MCP NONE · Skill NONE
**Done when**:
- [x] `parcelasVigentes([a, b])`: um `Map` com amortizado, `qtdParcelas` e as parcelas não canceladas de cada compra (número, competência, valor, `paga`); id sem compra fica fora
- [x] `excluirParcelas(a, [2, 4], total, agora)`: 2 e 4 com `cancelado_em` = `agora`; 1 e 3 intactas; total gravado (EXC-03 AC 1, 2, 4)
- [x] Uma parcela paga na lista de números não é cancelada, e o assert falha com rollback: nada muda (EXC-03 AC 3, 6)
- [x] Total que não fecha → `ViolacaoDeConservacao` e nenhuma parcela cancelada (EXC-03 AC 6)
- [x] Outra compra, um avulso e uma ocorrência de fixo da mesma competência ficam iguais (EXC-03 AC 5)
- [x] O fake faz o mesmo, com teste próprio
**Tests**: integration
**Gate**: full
**Commit**: `feat(compras): ler parcelas vigentes e cancelar parcelas numa transação`

### Phase 2 — Aplicação e action

#### T4: A visão mensal traz o aviso e o "faltam" de cada parcela
**What**: `obterVisaoMensal` usa `parcelasVigentes`, calcula `restantes` por `restantesDepois` e acrescenta `exclusao` em `IdentificacaoDeParcela`.
**Where**: `src/application/mes/obter-visao-mensal/handler.ts`
**Depends on**: None
**Reuses**: `planejarExclusaoDestaEmDiante` (T1); `parcelasVigentes` (T3)
**Requirement**: EXC-02, EXC-04
**Tools**: MCP NONE · Skill NONE
**Done when**:
- [x] Parcela 2/4 sem nada cancelado: `restantes` 2 e `exclusao` `PLANO` com 3 parcelas, a soma, os meses e `inteira` false
- [x] Com 3/4 e 4/4 canceladas: a 2/4 tem `restantes` 0 (EXC-04 AC 5)
- [x] Com o alcance todo pago: `exclusao` `{ tipo: "NADA" }` (EXC-05 AC 5)
- [x] Avulso e ocorrência de fixo continuam com `parcela: null`
- [x] Testes existentes de `obter-visao-mensal` continuam verdes
**Tests**: unit
**Gate**: quick
**Commit**: `feat(compras): levar o aviso de exclusão e o "faltam" certo para a lista do mês`

#### T5: Schema da exclusão
**What**: `entradaExclusaoDeCompraSchema = z.strictObject({ lancamentoId: z.uuid() })`.
**Where**: `src/application/schemas/exclusao-de-compra.schema.ts`
**Depends on**: None
**Reuses**: o formato de `troca-de-categoria.schema.ts`
**Requirement**: EXC-05
**Tools**: MCP NONE · Skill NONE
**Done when**:
- [x] Aceita `{ lancamentoId: <uuid> }`
- [x] Recusa `lancamentoId` ausente, vazio, que não é uuid, e campo a mais (EXC-05 AC 2)
**Tests**: unit
**Gate**: quick
**Commit**: `feat(compras): validar o payload da exclusão de compra`

#### T6: Caso de uso da exclusão
**What**: `excluirCompraDestaEmDiante`, com as recusas e a escrita.
**Where**: `src/application/compras/excluir-desta-em-diante/handler.ts`
**Depends on**: None
**Reuses**: T1; `parcelasVigentes` e `excluirParcelas` (T3); a forma de `cancelar-lancamento/handler.ts`
**Requirement**: EXC-03, EXC-05
**Tools**: MCP NONE · Skill NONE
**Done when**:
- [x] Parcela 2/4 com a 3 paga: cancela 2 e 4, grava o total novo, devolve `{ alterou: true, parcelasExcluidas: 2 }` (EXC-03 AC 1–4)
- [x] Lançamento já cancelado: `ok({ alterou: false, parcelasExcluidas: 0 })`, sem escrita (EXC-03 AC 7)
- [x] Inexistente → `LANCAMENTO_NAO_ENCONTRADO`, sem escrita (EXC-05 AC 3)
- [x] Avulso e ocorrência de fixo → `LANCAMENTO_NAO_E_PARCELA`, sem escrita (EXC-05 AC 4)
- [x] Alcance todo pago → `NADA_A_EXCLUIR`, sem escrita (EXC-05 AC 5)
- [x] Exceção de `excluirParcelas` sobe sem ser engolida (EXC-03 AC 6)
**Tests**: unit
**Gate**: quick
**Commit**: `feat(compras): excluir uma compra parcelada desta parcela em diante`

#### T7: Action da exclusão
**What**: `excluirCompraDestaParcela` e as mensagens de `LANCAMENTO_NAO_E_PARCELA` e `NADA_A_EXCLUIR`.
**Where**: `src/app/actions/compras.ts`
**Depends on**: T5, T6
**Reuses**: `requireSession`, `erroDeAction`, `falhaInesperada`, `criarRepositorios`; a revalidação de `trocarCategoria`
**Requirement**: EXC-03, EXC-04, EXC-05
**Tools**: MCP NONE · Skill NONE
**Done when**:
- [x] Sem sessão → código da sessão antes de qualquer leitura (EXC-05 AC 1)
- [x] Payload inválido → `VALIDACAO` (EXC-05 AC 2)
- [x] Recusas do caso de uso → código e mensagem de `erros.ts`, com os textos do design (EXC-05 AC 3–5)
- [x] No Postgres: excluir a partir da 2/4 com a 3 paga deixa 1 e 3 somando e o total em amortizado + R$ 20,00 (EXC-03 AC 1–4)
- [x] Sucesso revalida `/[competencia]`, `/[competencia]/lancamentos`, `/[competencia]/simular` e `/`; recusa não revalida (EXC-04 AC 1–3)
- [x] Erro inesperado → `ERRO_INESPERADO` com referência, sem lançar (EXC-05 AC 6)
**Tests**: integration
**Gate**: full
**Commit**: `feat(compras): action para excluir uma compra desta parcela em diante`

### Phase 3 — Interface

#### T8: Os textos do aviso e do toast
**What**: `avisoDaExclusao` e `toastDaExclusao`.
**Where**: `src/components/texto-da-exclusao.ts`
**Depends on**: None
**Reuses**: `formatarCompetencia`, `formatarBRL`
**Requirement**: EXC-02, EXC-04, EXC-05
**Tools**: MCP NONE · Skill NONE
**Done when**:
- [x] `k` 3: "Excluir Compra A desta parcela em diante? Saem 3 parcelas, de Janeiro de 2027 a Março de 2027, somando R$ 30,00. As anteriores ficam." (EXC-02 AC 2, 4)
- [x] `k` 2 e `k` 1 dos dois lados do singular; `k` 1 diz "Sai 1 parcela, em Janeiro de 2027, de R$ 10,00." (EXC-02 AC 2, 3; L-029)
- [x] `inteira`: começa com "Excluir a compra Compra A inteira?" e não tem "As anteriores ficam." (EXC-02 AC 5; L-010)
- [x] `p` 1 → "1 parcela já paga fica."; `p` 2 → "2 parcelas já pagas ficam."; `p` 0 → nenhuma das duas (EXC-02 AC 6)
- [x] `NADA` → "Todas as parcelas desta em diante já foram pagas. Nada a excluir." (EXC-05 AC 5)
- [x] Toast: "1 parcela excluída." e "2 parcelas excluídas." (EXC-04 AC 4)
**Tests**: componentes
**Gate**: quick
**Commit**: `feat(compras): escrever o aviso e o toast da exclusão de compra`

#### T9: O menu da linha aceita outro conteúdo
**What**: `MenuDaLinha` recebe o conteúdo como `children` (com um `fechar` que devolve o foco ao "⋯"); a tabela passa `BotaoExcluir` ao avulso.
**Where**: `src/components/menu-da-linha.tsx`
**Depends on**: None
**Reuses**: o `Escape` e o clique fora que já existem
**Requirement**: EXC-01, EXC-02
**Tools**: MCP NONE · Skill NONE
**Done when**:
- [ ] Os testes existentes de `menu-da-linha.test.tsx` e de `botao-excluir.test.tsx` continuam verdes sem mudar assertion (EXC-01 AC 4)
- [ ] Chamar `fechar` de dentro do conteúdo fecha o menu e põe o foco no "⋯" (EXC-02 AC 9)
- [ ] Reabrir o menu monta o conteúdo do zero
**Tests**: componentes
**Gate**: quick
**Commit**: `refactor(lancamentos): deixar o menu da linha receber o conteúdo de quem o monta`

#### T10: Excluir parcelas no menu
**What**: `ExcluirParcelas`: "Excluir" → aviso com "Excluir desta em diante" e "Cancelar" → gravação → toast ou erro.
**Where**: `src/components/excluir-parcelas.tsx`
**Depends on**: T8, T9
**Reuses**: `avisar` de `avisos.tsx`; o estilo de `BotaoExcluir`
**Requirement**: EXC-02, EXC-04, EXC-05
**Tools**: MCP NONE · Skill NONE
**Done when**:
- [ ] Antes do primeiro toque, só "Excluir"; tocar não chama a action e mostra o texto de T8 (EXC-02 AC 1)
- [ ] O aviso tem "Excluir desta em diante" e "Cancelar", com foco em "Cancelar" (EXC-02 AC 7)
- [ ] "Excluir desta em diante" chama a action uma vez com `{ lancamentoId }` (EXC-02 AC 8)
- [ ] Durante a gravação o botão fica desabilitado (EXC-02 AC 10)
- [ ] "Cancelar" chama `fechar` sem chamar a action (EXC-02 AC 9)
- [ ] Sucesso chama `avisar` com o texto de `parcelasExcluidas` da resposta (EXC-04 AC 4)
- [ ] Recusa mostra a mensagem em `role="alert"` e não chama `avisar` (EXC-05 AC 7)
- [ ] `NADA`: aviso sem "Excluir desta em diante" (EXC-05 AC 5)
**Tests**: componentes
**Gate**: quick
**Commit**: `feat(compras): avisar o alcance antes de excluir a compra no menu da linha`

#### T11: O "⋯" aparece na linha da parcela
**What**: `TabelaLancamentos` monta `MenuDaLinha` com `ExcluirParcelas` em toda parcela; a página passa a action.
**Where**: `src/components/tabela-lancamentos.tsx`
**Depends on**: T10
**Reuses**: a montagem atual do avulso
**Requirement**: EXC-01
**Tools**: MCP NONE · Skill NONE
**Done when**:
- [ ] Parcela tem "Mais ações para <descrição>" e, aberto, "Excluir" (EXC-01 AC 1, 2)
- [ ] Ocorrência de fixo continua sem "⋯" (EXC-01 AC 3)
- [ ] Avulso continua com `BotaoExcluir` (EXC-01 AC 4)
- [ ] O teste de `tabela-lancamentos.test.tsx` que provava "sem ⋯ na parcela" passa a provar o contrário, com o AC citado
**Tests**: componentes
**Gate**: quick
**Commit**: `feat(compras): mostrar o menu de exclusão na linha da parcela`

### Phase 4 — Ponta a ponta e fechamento

#### T12: Excluir uma compra de ponta a ponta
**What**: `e2e/excluir-compra.spec.ts`.
**Where**: `e2e/excluir-compra.spec.ts`
**Depends on**: None
**Reuses**: helpers de `compra-parcelada.spec.ts` e `lancamentos-densos.spec.ts`
**Requirement**: EXC-01, EXC-02, EXC-03, EXC-04, EXC-05
**Tools**: MCP `playwright` (só para depurar) · Skill NONE
**Done when**:
- [ ] Compra 4x de R$ 10,00 de dezembro a março: na 2/4, o aviso lido no menu tem o texto de EXC-02 Independent Test; "Cancelar" fecha sem excluir (EXC-02; L-054)
- [ ] Com a 3/4 paga, excluir a partir da 2/4: toast "2 parcelas excluídas."; a linha sai de janeiro sem recarregar; março não tem a 4/4; fevereiro ainda tem a 3/4 paga (EXC-03, EXC-04 AC 1, 2, 4)
- [ ] "Próximos meses" e "Saldo previsto" de janeiro e março sobem R$ 10,00; a 1/4 em dezembro mostra "1/4 · faltam 1" (EXC-04 AC 3, 5; L-014)
- [ ] Fixo sem "⋯"; avulso ainda pede "Confirmar?" (EXC-01 AC 3, 4)
- [ ] Alcance todo pago: o aviso de "Nada a excluir" sem botão de excluir (EXC-05 AC 5)
- [ ] Em 400 px, "⋯" e "Excluir" da parcela com ao menos 44 × 44 (EXC-01 AC 5)
**Tests**: e2e
**Gate**: e2e
**Commit**: `test(compras): provar a exclusão de compra de ponta a ponta`

#### T13: Fechar a documentação
**What**: handoff em `.specs/STATE.md` e nota em `painel-e-lancamentos/spec.md` e `lancamento-avulso/spec.md` apontando que parcela agora se exclui por EXC.
**Where**: `.specs/STATE.md`
**Depends on**: T12
**Reuses**: —
**Requirement**: EXC-01
**Tools**: MCP NONE · Skill NONE
**Done when**:
- [ ] Handoff aponta a fatia e o próximo passo
- [ ] As duas specs antigas dizem onde a regra mudou
- [ ] `pnpm verify` verde
**Tests**: none
**Gate**: build
**Commit**: `docs(compras): registrar a exclusão de compra nas specs antigas e no handoff`

---

## Task Granularity Check

| Task | Escopo | Status |
| --- | --- | --- |
| T1, T5, T6, T7 | 1 função pura; 1 schema; 1 caso de uso; 1 action (+ 2 mensagens) | ✅ |
| T2, T3 | métodos de 1 repositório + port + fake | ⚠️ coeso: port sem implementação e fake sem espelho não compilam |
| T4 | 1 caso de uso modificado | ✅ |
| T8, T9, T10 | 1 módulo de texto; 1 componente; 1 componente | ✅ |
| T11 | 1 componente + a página que passa a action | ⚠️ coeso: a tabela só recebe o que a página passa |
| T12, T13 | e2e; documentação | ✅ |

## Diagram-Definition Cross-Check

| Task | Depends On | Diagrama | Status |
| --- | --- | --- | --- |
| T1 | — | — | ✅ |
| T2 | — | — | ✅ |
| T3 | T2 | T2→T3 | ✅ |
| T4 | — | — | ✅ |
| T5 | — | — | ✅ |
| T6 | — | — | ✅ |
| T7 | T5, T6 | T5→T7, T6→T7 | ✅ |
| T8 | — | — | ✅ |
| T9 | — | — | ✅ |
| T10 | T8, T9 | T8→T10, T9→T10 | ✅ |
| T11 | T10 | T10→T11 | ✅ |
| T12 | — | — | ✅ |
| T13 | T12 | T12→T13 | ✅ |

T4 e T6 usam T1 e T3, e T12 usa tudo, de fases anteriores; o diagrama só liga tasks da mesma fase.

## Test Co-location Validation

| Task | Camada | Matriz exige | Task diz | Status |
| --- | --- | --- | --- | --- |
| T1 | domínio | unit | unit | ✅ |
| T2, T3 | repositório | integration | integration | ✅ |
| T4, T5, T6 | aplicação | unit | unit | ✅ |
| T7 | action | integration | integration | ✅ |
| T8, T9, T10, T11 | componentes | componentes | componentes | ✅ |
| T12 | fluxo | e2e | e2e | ✅ |
| T13 | docs | none | none | ✅ |
