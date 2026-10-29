# Trocar a categoria na lista de Lançamentos — Tasks

**Spec**: `.specs/features/trocar-categoria/spec.md`
**Design**: inline, na seção "Design" abaixo (fatia pequena, sem `design.md`)
**Status**: Verified (`validation.md`, 2026-10-29: PASS na rodada 2; resumo aprovado pelo dono em 2026-10-29; branch `feat/trocar-categoria`, em worktree, a partir de `feat/editar-fixos`; 2 lotes: T1–T5 e T6–T10, mais F1–F3; entra no `main` depois da edição de fixos)
**Total**: 10 tasks em 5 fases

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

## Design

**Regra pura.** `alcanceDaTroca(lancamento)` decide, sem I/O, até onde a troca vai: `FIXO` quando o
lançamento tem `recorrenciaId`, `COMPRA` quando tem `compraId`, `LANCAMENTO` nos outros casos, e
recusa a entrada com `CATEGORIA_EM_RECEITA`. A ordem importa: um lançamento nunca tem os dois ids,
mas a regra confere `recorrenciaId` primeiro e o teste fixa isso.

**Caso de uso.** `trocarCategoria` carrega o lançamento, confere a categoria, pede o alcance à regra
e grava numa `Transacao` (a da edição de fixos, `src/infrastructure/db/transacao.ts`):
- `FIXO`: lê o fixo com `buscarComVersoes`, monta os `CamposDaSerie` gravados com a categoria nova e
  chama `atualizarSerie` e `atualizarOcorrenciasDaSerie`. É o mesmo par de escritas da edição de
  fixo, que já não toca em valor, pagamento nem cancelamento (EDF-02 AC 3); com o dia igual, a data
  de cada ocorrência também não muda.
- `COMPRA`: `compras.trocarCategoria(compraId, categoriaId)`, que grava a compra e todas as parcelas.
- `LANCAMENTO`: `movimentos.trocarCategoria(id, categoriaId)`.

Devolve `{ alcance, categoriaId }`; a interface escolhe o texto do toast pelo alcance.

**Interface.** A tabela continua servidor. A célula Categoria de uma entrada vira a pílula
"Receita" (`<Chip tom="positivo">`, a mesma de "Todo mês"); a de um gasto vira
`SeletorDeCategoria`, um componente cliente como o `BotaoPago`. O toast é um provedor cliente
montado no layout de `(app)`, com `useAvisos()`; o seletor só chama `avisar(texto)`.

### Interfaces

```ts
// src/domain/mes/alcance-da-troca.ts
export type AlcanceDaTroca = "FIXO" | "COMPRA" | "LANCAMENTO";
export function alcanceDaTroca(
  lancamento: Pick<Lancamento, "natureza" | "recorrenciaId" | "compraId">,
): Result<AlcanceDaTroca, DomainError>; // CATEGORIA_EM_RECEITA

// ports
MovimentoRepository.trocarCategoria(id: string, categoriaId: string | null): Promise<void>;
CompraRepository.trocarCategoria(compraId: string, categoriaId: string | null): Promise<void>;

// src/application/mes/trocar-categoria/handler.ts
export type CodigoErroTrocaDeCategoria =
  | "LANCAMENTO_NAO_ENCONTRADO" | "CATEGORIA_NAO_ENCONTRADA" | "CATEGORIA_EM_RECEITA";
export function trocarCategoria(
  deps: { transacao: Transacao; movimentos: MovimentoRepository; cadastros: CadastroRepository },
  entrada: { lancamentoId: string; categoriaId: string | null },
): Promise<Result<{ alcance: AlcanceDaTroca; categoriaId: string | null }, { code: CodigoErroTrocaDeCategoria }>>;

// src/application/schemas/troca-de-categoria.schema.ts
export const entradaTrocaDeCategoriaSchema; // strictObject { lancamentoId: uuid, categoriaId: uuid | null }

// src/app/actions/lancamentos.ts
export async function trocarCategoria(payload: unknown): Promise<ResultadoAction<TrocaGravada>>;

// src/components/avisos.tsx
export function ProvedorDeAvisos(props: { children: ReactNode }): JSX.Element;
export function useAvisos(): { avisar(texto: string): void };

// src/components/seletor-de-categoria.tsx
export interface SeletorDeCategoriaProps {
  lancamentoId: string; descricao: string; categoriaId: string | null;
  categorias: ReadonlyArray<{ id: string; nome: string }>;
  nomeDaGravada?: string; trocarCategoria: typeof trocarCategoriaAction;
}
```

---

## Global Constraints

- Centavos inteiros (AD-001); domínio puro com `Result` e 100% de branches (AD-006).
- Só `movimento` é somável (AD-003): a troca não cria nem apaga linha, só muda `categoria_id`.
- Server Action: `requireSession()` primeiro, Zod estrito, `ResultadoAction`, `ERRO_INESPERADO`
  com correlação; revalidar `/[competencia]/lancamentos`, `/[competencia]` e `/[competencia]/fixos`.
- Mensagens em pt-BR em `src/lib/erros.ts`; `CATEGORIA_NAO_ENCONTRADA` já existe ("Escolha uma
  categoria válida.").
- **Gate de toda task inclui `pnpm typecheck`, encadeado com `&&`** (lição L-016).
- Regra aplicada na página precisa de e2e que a exercite (lição L-001): o filtro "gasto tem
  seletor, entrada não" é provado em T9.

## Review Focus

1. **Fixo com ocorrência paga em mês passado** → categoria nova nela, `pago_em` intacto. Teste em T4 e T9.
2. **Parcela do meio de uma compra** → as anteriores e as seguintes também trocam. Teste em T2 e T4.
3. **Gasto do mês com outro gasto de mesma descrição no mês** → só o escolhido troca. Teste em T2.
4. **Falha depois da primeira escrita de um fixo** → nada fica gravado. Teste em T4.
5. **Erro do servidor** → seletor volta à anterior, mensagem na linha, nenhum toast. Teste em T7.

---

## Test Coverage Matrix

| Camada | Tipo | Expectativa | Local | Comando |
| --- | --- | --- | --- | --- |
| `src/domain/**` | unit | 100% de branches; 1:1 com os ACs | `src/domain/**/*.test.ts` | `pnpm test:unit` |
| `src/application/**` | unit | Todos os ramos, com fakes | `src/application/**/*.test.ts` | `pnpm test:unit` |
| Repositórios | integration | O que a escrita muda e o que ela **não** toca | `src/infrastructure/**/*.integration.test.ts` | `pnpm test:integration` |
| Actions | integration | Sessão primeiro, validação, recusas, falha injetada, revalidação | `src/app/**/*.integration.test.ts` | `pnpm test:integration` |
| Componentes | componentes | Opções, gravação, toast, volta no erro, "Receita" | `src/components/**/*.test.tsx` | `pnpm test:unit` |
| Fluxo | e2e | Trocar fixo, compra e gasto do mês e ver os outros meses | `e2e/*.spec.ts` | `pnpm test:e2e` |
| Composição de página, docs | none | — | — | — |

## Gate Check Commands

| Gate | Comando |
| --- | --- |
| `quick` | `pnpm test:unit && pnpm typecheck` |
| `full` | `pnpm test:unit && pnpm test:integration && pnpm typecheck` |
| `build` | `pnpm verify` |
| `e2e` | `pnpm typecheck && pnpm exec playwright test e2e/trocar-categoria.spec.ts` |

---

## Execution Plan

### Phase 0 — Regra pura

```
T1
```

### Phase 1 — Banco

```
T2
```

### Phase 2 — Aplicação e action

```
T3 -> T4
T4 -> T5
```

### Phase 3 — Interface

```
T6 -> T7
T7 -> T8
```

### Phase 4 — Ponta a ponta e fechamento

```
T8 -> T9
T9 -> T10
```

### Phase 5 — Correções da verificação (rodada 1)

```
T9 -> F1
T8 -> F2
T7 -> F3
```

Cada uma fecha mutantes que sobreviveram em `validation.md` (rodada 1), só com teste.

---

## Task Breakdown

### Phase 0 — Regra pura

#### T1: O alcance da troca no domínio
**What**: `alcanceDaTroca` e `CATEGORIA_EM_RECEITA` na union `CodigoErro`.
**Where**: `src/domain/mes/alcance-da-troca.ts` (+ `src/domain/shared/result.ts`, `src/domain/index.ts`)
**Depends on**: nenhuma
**Reuses**: `ok`, `err` de `shared/result.ts`
**Requirement**: TRC-03, TRC-05
**Done when**:
- [x] Despesa com `recorrenciaId` → `FIXO`; com `compraId` → `COMPRA`; sem os dois → `LANCAMENTO` (TRC-03 AC 1, 3, 4)
- [x] Investimento segue as mesmas três regras
- [x] Receita, com ou sem `recorrenciaId`, → `err` com `CATEGORIA_EM_RECEITA` (TRC-05 AC 4)
- [x] Com os dois ids, `FIXO`
- [x] 100% de branches em `src/domain`
**Tests**: unit
**Gate**: quick
**Commit**: `feat(categorias): decidir no domínio até onde vai a troca de categoria`

### Phase 1 — Banco

#### T2: Trocar a categoria de um lançamento e de uma compra no banco
**What**: `trocarCategoria` em `MovimentoRepository` e `CompraRepository`, nos fakes e nos repositórios Drizzle, aceitando o `Executor` da transação.
**Where**: `src/application/ports/repositories.ts`, `src/application/ports/fakes.ts`, `src/infrastructure/db/repositories/movimento.repository.ts`, `src/infrastructure/db/repositories/compra.repository.ts` (+ testes)
**Depends on**: nenhuma
**Reuses**: `Executor`; o padrão de `atualizarOcorrenciasDaSerie`
**Requirement**: TRC-03
**Done when**:
- [x] `movimentos.trocarCategoria`: grava a categoria (ou `null`) só no lançamento dado; um segundo lançamento com a mesma descrição na mesma competência fica igual (TRC-03 AC 4, 5)
- [x] `compras.trocarCategoria`: grava a categoria na compra e em todas as parcelas, da primeira à última (TRC-03 AC 3)
- [x] Nenhuma das duas toca em valor, valor previsto, número da parcela, data, `pago_em` nem `cancelado_em` (TRC-03 AC 3)
- [x] Outra compra e as parcelas dela ficam iguais
- [x] Os fakes fazem o mesmo, com teste próprio
**Tests**: integration (+ unit dos fakes)
**Gate**: full
**Commit**: `feat(categorias): trocar a categoria de um lançamento e de uma compra no banco`

### Phase 2 — Aplicação e action

#### T3: Schema da troca
**What**: `entradaTrocaDeCategoriaSchema`.
**Where**: `src/application/schemas/troca-de-categoria.schema.ts` (+ teste)
**Depends on**: nenhuma
**Reuses**: `z.strictObject`, como `entradaEdicaoRecorrenciaSchema`
**Requirement**: TRC-05
**Done when**:
- [x] Aceita `lancamentoId` uuid com `categoriaId` uuid e com `categoriaId: null`
- [x] Recusa `lancamentoId` ausente ou que não é uuid, `categoriaId` ausente ou que não é uuid nem `null`, e campo a mais (TRC-05 AC 5)
**Tests**: unit
**Gate**: quick
**Commit**: `feat(categorias): validar o payload da troca de categoria`

#### T4: Caso de uso da troca
**What**: `trocarCategoria`, com as recusas e as três escritas numa `Transacao`.
**Where**: `src/application/mes/trocar-categoria/handler.ts` (+ teste)
**Depends on**: T3
**Reuses**: `alcanceDaTroca` (T1), `trocarCategoria` dos repositórios (T2), `buscarComVersoes`, `atualizarSerie`, `atualizarOcorrenciasDaSerie`, o fake de `Transacao`
**Requirement**: TRC-03, TRC-05
**Done when**:
- [x] Ocorrência de fixo: o fixo e todas as ocorrências, de outubro a dezembro, ficam com a categoria nova; outubro continua pago; valor, dia e meio do fixo não mudam; devolve `FIXO` (TRC-03 AC 1)
- [x] Depois da troca, a ocorrência que o fixo materializa num mês novo nasce com a categoria nova (TRC-03 AC 2)
- [x] Parcela 2 de 4: as quatro parcelas e a compra trocam; devolve `COMPRA` (TRC-03 AC 3)
- [x] Gasto do mês: só ele troca; devolve `LANCAMENTO` (TRC-03 AC 4)
- [x] `categoriaId: null` grava a ausência com o mesmo alcance (TRC-03 AC 5)
- [x] Lançamento inexistente ou cancelado → `LANCAMENTO_NAO_ENCONTRADO`, sem escrita (TRC-05 AC 2)
- [x] Categoria inexistente ou arquivada → `CATEGORIA_NAO_ENCONTRADA`, sem escrita (TRC-05 AC 3)
- [x] Entrada → `CATEGORIA_EM_RECEITA`, sem escrita (TRC-05 AC 4)
- [x] Falha injetada em `atualizarOcorrenciasDaSerie` depois de `atualizarSerie` → a exceção sobe e o fixo continua com a categoria antiga no fake (TRC-03 AC 6)
**Tests**: unit
**Gate**: quick
**Commit**: `feat(categorias): trocar a categoria com o alcance de cada lançamento`

#### T5: Action da troca
**What**: `trocarCategoria` em `src/app/actions/lancamentos.ts` e a mensagem de `CATEGORIA_EM_RECEITA`.
**Where**: `src/app/actions/lancamentos.ts`, `src/lib/erros.ts` (+ `lancamentos.integration.test.ts`)
**Depends on**: T4
**Reuses**: `requireSession`, `erroDeAction`, `TransacaoDrizzle`, `criarRepositorios`
**Requirement**: TRC-03, TRC-04, TRC-05
**Done when**:
- [x] Sem sessão → recusa com o código da sessão antes de qualquer leitura (TRC-05 AC 6)
- [x] Payload inválido → `VALIDACAO` (TRC-05 AC 5)
- [x] Recusas do caso de uso → código e mensagem de `erros.ts`; `CATEGORIA_EM_RECEITA` diz "Entrada não tem categoria." (TRC-05 AC 2–4)
- [x] Troca de um fixo no Postgres: as ocorrências de todos os meses com a categoria nova; um rollback de falha injetada deixa todas com a antiga (TRC-03 AC 1, 6)
- [x] Sucesso revalida `/[competencia]/lancamentos`, `/[competencia]` e `/[competencia]/fixos` (TRC-04 AC 5)
- [x] Erro inesperado → `ERRO_INESPERADO` com referência, sem lançar (TRC-05 AC 7)
**Tests**: integration
**Gate**: full
**Commit**: `feat(categorias): action para trocar a categoria de um lançamento`

### Phase 3 — Interface

#### T6: Avisos em toast
**What**: `ProvedorDeAvisos` e `useAvisos`, montados no layout de `(app)`.
**Where**: `src/components/avisos.tsx` (+ teste), `src/app/(app)/layout.tsx`
**Depends on**: nenhuma
**Reuses**: tokens de cor e raio de `ui.tsx`
**Requirement**: TRC-04
**Done when**:
- [x] `avisar(texto)` mostra o texto numa região `role="status"` (TRC-04 AC 4)
- [x] O aviso sai da tela 4 segundos depois de aparecer, com relógio falso (TRC-04 AC 4)
- [x] Um aviso novo substitui o anterior e reinicia os 4 segundos
- [x] `useAvisos` fora do provedor lança um erro que nomeia o provedor
**Tests**: componentes
**Gate**: quick + `pnpm lint`
**Commit**: `feat(ui): avisar em toast o que acabou de acontecer`

#### T7: O seletor de categoria da linha
**What**: `SeletorDeCategoria`, que grava ao escolher, avisa o alcance e volta no erro.
**Where**: `src/components/seletor-de-categoria.tsx` (+ teste)
**Depends on**: T6
**Reuses**: `useAvisos` (T6); o padrão de transição do `BotaoPago`
**Requirement**: TRC-02, TRC-04, TRC-05
**Done when**:
- [x] Opções: "Sem categoria" e as categorias recebidas, na ordem recebida, com a gravada selecionada; nome acessível "Categoria de <descrição>" (TRC-02 AC 1, 5)
- [x] Categoria gravada fora da lista → opção a mais, selecionada, com `nomeDaGravada` ou "Categoria removida" (TRC-02 AC 3)
- [x] Escolher uma opção chama a action uma vez com `{ lancamentoId, categoriaId }`, e "Sem categoria" manda `null` (TRC-02 AC 2)
- [x] Desabilitado enquanto grava (TRC-02 AC 4)
- [x] Sucesso com `FIXO`, `COMPRA` e `LANCAMENTO` → os três textos do TRC-04 AC 1–3, no toast
- [x] Recusa → volta à categoria anterior, `role="alert"` com a mensagem, nenhum aviso (TRC-05 AC 1)
**Tests**: componentes
**Gate**: quick + `pnpm lint`
**Commit**: `feat(categorias): seletor que troca a categoria na própria linha`

#### T8: Receita e seletor na tabela de Lançamentos
**What**: célula Categoria da tabela: "Receita" na entrada, seletor no gasto; a página passa as categorias ativas e a action.
**Where**: `src/components/tabela-lancamentos.tsx` (+ teste), `src/app/(app)/[competencia]/lancamentos/page.tsx`
**Depends on**: T7
**Reuses**: `Chip tom="positivo"`, `SeletorDeCategoria` (T7), `listarCategoriasDisponiveis`
**Requirement**: TRC-01, TRC-02
**Done when**:
- [x] Entrada sem categoria e entrada com categoria → "Receita", sem `combobox` na linha (TRC-01 AC 1, 2)
- [x] Despesa e investimento → seletor com a categoria gravada selecionada (TRC-02 AC 1)
- [x] Gasto com categoria arquivada → o seletor recebe o nome dela (TRC-02 AC 3)
- [x] Os testes atuais da tabela que afirmam "Sem categoria" numa entrada passam a afirmar "Receita" e os de gasto passam a ler o seletor; nenhuma assertion é apagada
**Tests**: componentes
**Gate**: quick + `pnpm lint`
**Commit**: `feat(categorias): mostrar Receita e o seletor na lista de Lançamentos`

### Phase 4 — Ponta a ponta e fechamento

#### T9: Trocar de ponta a ponta
**What**: e2e do fluxo.
**Where**: `e2e/trocar-categoria.spec.ts`
**Depends on**: T8
**Reuses**: `limparDados`, `semearCadastroBase`, `entrar` dos outros e2e
**Requirement**: TRC-01 a TRC-04
**Done when**:
- [x] Fixo de outubro a dezembro com outubro pago: trocar em novembro mostra "Categoria trocada em todos os meses deste fixo.", e outubro e dezembro aparecem com a categoria nova; outubro continua pago (TRC-03 AC 1, TRC-04 AC 1, Independent Test)
- [x] Compra de 3 parcelas: trocar a parcela 2 mostra "Categoria trocada em todas as parcelas desta compra.", e as parcelas 1 e 3 aparecem com a categoria nova (TRC-03 AC 3, TRC-04 AC 2)
- [x] Gasto do mês: trocar mostra "Categoria trocada.", e outro gasto do mês com a mesma categoria antiga continua com ela (TRC-03 AC 4, TRC-04 AC 3)
- [x] Entrada aparece como "Receita", sem seletor (TRC-01 AC 1, 2)
- [x] "Gastos por categoria" da Visão geral mostra o valor do fixo na categoria nova (TRC-04 AC 5)
**Tests**: e2e
**Gate**: e2e
**Commit**: `test(e2e): trocar a categoria de fixo, compra e gasto do mês na lista`

#### T10: Fechar a fatia
**What**: roadmap e traceability.
**Where**: `docs/roadmap.md` (+ `spec.md`)
**Depends on**: T9
**Requirement**: TRC-01 a TRC-05
**Done when**:
- [x] Roadmap com a troca de categoria em "Pronto", junto da edição de fixos
- [x] Traceability com cada requisito implementado
**Tests**: none
**Gate**: build
**Commit**: `docs(categorias): fechar a fatia de troca de categoria`

### Phase 5 — Correções da verificação (rodada 1)

#### F1: Uma categoria arquivada atravessando a página real
**What**: A página escolhe duas listas: os nomes de todas as categorias, para o gasto com uma arquivada vê-la pelo nome, e só as ativas como opções. O teste da tabela recebe as duas já montadas e nenhum e2e arquivava categoria, então trocar uma pela outra em `lancamentos/page.tsx` passava na suíte inteira. Com os nomes só das ativas (mutante P2), o gasto com a arquivada dizia "Categoria removida"; com as arquivadas como opção (P3), ela virava opção de todo gasto.
**Where**: `e2e/trocar-categoria.spec.ts` (+ `spec.md`)
**Depends on**: T9
**Reuses**: `cadastrarAvulso`, `seletor`, `categoriaEscolhida`, `pool`
**Requirement**: TRC-02
**Done when**:
- [x] Com Farmácia em Categoria Dois e Padaria em Categoria Um, e Categoria Dois arquivada no banco, o seletor de Farmácia mostra "Categoria Dois" escolhida (TRC-02 AC 3)
- [x] As opções do seletor de Padaria são exatamente "Sem categoria" e "Categoria Um" (TRC-02 AC 1)
- [x] P2 falha em `toHaveText("Categoria Dois")` com `Received: "Categoria removida"`; P3 falha na lista de Padaria com `Received` `["Sem categoria", "Categoria Dois", "Categoria Um"]`
**Tests**: e2e
**Gate**: `pnpm typecheck && pnpm exec playwright test e2e/trocar-categoria.spec.ts`
**Commit**: `test(e2e): arquivar uma categoria e ver a lista pela página real`

#### F2: "Receita" presa à coluna Categoria
**What**: O teste da tabela procurava "Receita" na linha inteira da entrada. Mover a pílula para a célula da descrição, com a célula Categoria vazia (mutante TB6), passava, e o TRC-01 AC 1 diz "na coluna Categoria".
**Where**: `src/components/tabela-lancamentos.test.tsx` (+ `spec.md`)
**Depends on**: T8
**Reuses**: `montar` do bloco "Receita na entrada e seletor no gasto"
**Requirement**: TRC-01
**Done when**:
- [x] Na região Entradas, a célula de cada entrada no índice do cabeçalho "Categoria" diz exatamente "Receita", com e sem categoria gravada (TRC-01 AC 1)
- [x] TB6 falha o teste na célula da coluna Categoria, com `expected '' to be 'Receita'`
**Tests**: componentes
**Gate**: quick
**Commit**: `test(categorias): prender Receita à coluna Categoria da entrada`

#### F3: A fixture do seletor de fato fora de ordem alfabética
**What**: `seletor-de-categoria.test.tsx` diz que a fixture está fora de ordem alfabética, mas "Categoria Dois" antes de "Categoria Um" já é a ordem alfabética. Ordenar as opções por nome no seletor (mutante S10) passava, e o Done when de T7 pede "na ordem recebida".
**Where**: `src/components/seletor-de-categoria.test.tsx` (+ `spec.md`)
**Depends on**: T7
**Reuses**: `CATEGORIAS`, `opcoes()`
**Requirement**: TRC-02
**Done when**:
- [x] A fixture traz "Categoria Um" antes de "Categoria Dois", e as quatro listas esperadas seguem essa ordem (TRC-02 AC 1, Done when de T7)
- [x] S10 falha os 4 testes que comparam a lista de opções, com "Categoria Dois" antes de "Categoria Um" no `Received`
**Tests**: componentes
**Gate**: quick
**Commit**: `test(categorias): fixture do seletor fora de ordem alfabética`

---

## Task Granularity Check

| Task | Escopo | Status |
| --- | --- | --- |
| T1, T3 | 1 função pura; 1 schema | ✅ |
| T2 | ports + fakes + 2 repositórios | ⚠️ coeso: uma port sem implementação não compila |
| T4, T5 | 1 caso de uso; 1 action (+ 1 mensagem) | ✅ |
| T6, T7 | 1 componente cada (T6: + montagem no layout) | ✅ |
| T8 | 1 componente + a página que o alimenta | ⚠️ coeso: a tabela só recebe o que a página passa |
| T9, T10 | e2e; documentação | ✅ |
| F1 | 1 caso de teste | ✅ |
| F2 | 1 assertion num caso de teste | ✅ |
| F3 | 1 fixture e 4 listas esperadas | ✅ |

## Diagram-Definition Cross-Check

| Task | Depends On | Diagrama | Status |
| --- | --- | --- | --- |
| T1 | — | — | ✅ |
| T2 | — | — | ✅ |
| T3 | — | — | ✅ |
| T4 | T3 | T3→T4 | ✅ |
| T5 | T4 | T4→T5 | ✅ |
| T6 | — | — | ✅ |
| T7 | T6 | T6→T7 | ✅ |
| T8 | T7 | T7→T8 | ✅ |
| T9 | T8 | T8→T9 | ✅ |
| T10 | T9 | T9→T10 | ✅ |
| F1 | T9 | T9→F1 | ✅ |
| F2 | T8 | T8→F2 | ✅ |
| F3 | T7 | T7→F3 | ✅ |

T4 também usa T1 e T2, de fases anteriores; o diagrama só liga tasks da mesma fase.

`validate_tasks.py` só reconhece IDs `T<n>`. Uma cópia com as tasks `F<n>` trocadas por `T10<n>`
passa com 0 erros; o aviso novo é o `spec.md` no `Where`. O validador atribui cada task ao último
título de fase que vê, por isso o Task Breakdown repete os títulos das fases.

## Test Co-location Validation

| Task | Camada | Matriz exige | Task diz | Status |
| --- | --- | --- | --- | --- |
| T1 | domínio | unit | unit | ✅ |
| T2 | repositório | integration | integration | ✅ |
| T3, T4 | aplicação | unit | unit | ✅ |
| T5 | action | integration | integration | ✅ |
| T6, T7, T8 | componentes | componentes | componentes | ✅ |
| T9 | fluxo | e2e | e2e | ✅ |
| T10 | docs | none | none | ✅ |
| F1 | fluxo | e2e | e2e | ✅ |
| F2 | componentes | componentes | componentes | ✅ |
| F3 | componentes | componentes | componentes | ✅ |
