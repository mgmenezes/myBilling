# Editar gasto fixo e entrada fixa — Tasks

**Spec**: `.specs/features/editar-fixos/spec.md`
**Design**: inline, na seção "Design" abaixo (fatia pequena, sem `design.md`)
**Status**: In Progress (aprovado pelo dono em 2026-10-28; branch `feat/editar-fixos`, em worktree; 2 lotes: T1–T6 e T7–T10)
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
operação remota exigem autorização separada. **Esta fatia só vai ao ar depois das três importações
em produção** (decisão do dono).

---

## Design

**Regra pura.** `planejarEdicaoDoFixo(atual, editado)` decide, sem I/O, o que a edição faz: quais
campos da série mudam, se há vigência nova e o que acontece com o fim. A aplicação só carrega o
fixo, chama a regra e executa as operações numa transação.

**O fim**, comparando o fim atual (`A`) com o pedido (`P`), ambos "último mês em que vale":

| `A` | `P` | Operação |
| --- | --- | --- |
| vazio | vazio | nenhuma |
| vazio | M | `ENCERRAR` a partir de M + 1 (caso de uso `encerrar`) |
| X | vazio | `REABRIR`: fim e `encerrada_em` nulos |
| X | M < X | `ENCERRAR` a partir de M + 1 |
| X | M > X | `ESTENDER`: fim = M; `encerrada_em` fica como está |
| X | M = X | nenhuma |

M anterior ao início → `PERIODO_INVALIDO`.

**A transação.** Os repositórios já aceitam um `Executor` (fatia de importação). Esta fatia extrai
de `TransacaoDaImportacaoDrizzle` uma transação genérica, sem a trava consultiva, que entrega
`compras`, `movimentos`, `recorrencias` e `cadastros` sobre o mesmo `tx`; a da importação passa a
compor a genérica e acrescenta `importacoes` e a trava. Os testes da importação provam que nada mudou.

**A data das ocorrências.** `dataDeVencimento` (hoje privada em
`src/application/recorrencias/materializar/handler.ts:88`, sem `Date`) vai para
`src/domain/recorrencia/data-de-vencimento.ts` e serve à materialização e à edição.

### Interfaces

```ts
// src/domain/recorrencia/edicao-do-fixo.ts
export interface CamposDaSerie {
  readonly descricao: string; readonly diaVencimento: number;
  readonly meioPagamentoId: string; readonly categoriaId: string | null; readonly usuarioId: string;
}
export interface FixoAtual extends CamposDaSerie {
  readonly competenciaInicio: Competencia; readonly competenciaFim: Competencia | null;
  readonly valorNoMesExibido: Cents;
}
export interface FixoEditado extends CamposDaSerie {
  readonly competenciaFim: Competencia | null; readonly valor: Cents; readonly vigenteDesde: Competencia;
}
export type MudancaDoFim =
  | { readonly tipo: "ENCERRAR"; readonly aPartirDe: Competencia }
  | { readonly tipo: "REABRIR" }
  | { readonly tipo: "ESTENDER"; readonly competenciaFim: Competencia };
export interface PlanoDeEdicao {
  readonly serie: CamposDaSerie | null;      // null quando nada da série mudou
  readonly vigencia: { readonly vigenteDesde: Competencia; readonly valor: Cents } | null;
  readonly fim: MudancaDoFim | null;
}
export function planejarEdicaoDoFixo(atual: FixoAtual, editado: FixoEditado): Result<PlanoDeEdicao, DomainError>;
// PERIODO_INVALIDO (novo na union CodigoErro) quando fim ou vigenteDesde < início.

// src/domain/recorrencia/data-de-vencimento.ts
export function dataDeVencimento(competencia: Competencia, diaVencimento: number): string;

// ports — RecorrenciaRepository ganha:
buscarComVersoes(id: string): Promise<RecorrenciaComVersoes | null>;
atualizarSerie(id: string, campos: CamposDaSerie): Promise<void>;
reabrir(id: string): Promise<void>;
estenderFim(id: string, competenciaFim: Competencia): Promise<void>;
// MovimentoRepository ganha:
atualizarOcorrenciasDaSerie(recorrenciaId: string, campos: CamposDaSerie): Promise<number>;
// descrição, categoria, meio, pessoa e data_evento (dataDeVencimento por competência);
// nunca valor, valor previsto, pago_em ou cancelado_em.

// transação genérica
export interface RepositoriosTransacionais { compras; movimentos; recorrencias; cadastros }
export interface Transacao { executar<T>(operacao: (repos: RepositoriosTransacionais) => Promise<T>): Promise<T> }

// src/application/recorrencias/editar/handler.ts
export type CodigoErroEdicaoFixo =
  | "RECORRENCIA_NAO_ENCONTRADA" | "MEIO_PAGAMENTO_NAO_ENCONTRADO" | "MEIO_PAGAMENTO_ARQUIVADO"
  | "CATEGORIA_NAO_ENCONTRADA" | "PERIODO_INVALIDO";
export interface EntradaEditarFixo extends FixoEditado {
  readonly recorrenciaId: string; readonly competenciaExibida: Competencia; readonly agora: string;
}
// SPEC_DEVIATION (T4): o erro carrega `campo` em PERIODO_INVALIDO, porque a recusa nasce de
// dois campos (EDF-03 AC 5 e EDF-04 AC 4) e a action precisa endereçá-la ao certo.
export interface ErroEdicaoFixo {
  readonly code: CodigoErroEdicaoFixo; readonly campo?: "competenciaFim" | "vigenteDesde";
}
export async function editarRecorrencia(transacao: Transacao, entrada: EntradaEditarFixo):
  Promise<Result<{ readonly mudou: boolean }, ErroEdicaoFixo>>;
// Acréscimo (T4): o valor que o formulário mostra e com que a edição compara. A página usa a
// mesma função para preencher o campo; num fixo visto antes de começar, vale a primeira vigência.
export function valorNoMesExibido(versoes: ReadonlyArray<VersaoRecorrencia>, competenciaExibida: Competencia): Cents | null;

// src/application/schemas/recorrencia.schema.ts
export const entradaEdicaoRecorrenciaSchema; // .strict(): recorrenciaId, descricao, valorCentavos,
// diaVencimento, competenciaFim (nullable), categoriaId (nullable), usuarioId, meioPagamentoId,
// vigenteDesde, competenciaExibida — sem natureza nem competenciaInicio (EDF-05 AC 2)

// src/app/actions/recorrencias.ts
export async function editarRecorrencia(payload: unknown): Promise<ResultadoAction<{ mudou: boolean }>>;
```

---

## Global Constraints

- Centavos inteiros (AD-001); competência `'YYYY-MM'`, sem `Date` no domínio (AD-002); domínio puro
  com `Result` e 100% de branches (AD-006).
- Os mesmos limites do cadastro: `MAX_NOME_RECORRENCIA`, dia 1–31, valor positivo; receita só em
  meio sem fatura na interface (AD-015).
- Server Action: `requireSession()` primeiro, Zod, `ResultadoAction`, `ERRO_INESPERADO` com
  correlação; revalidar `/[competencia]/fixos`, `/[competencia]/lancamentos` e `/[competencia]`.
- **Gate de toda task inclui `pnpm typecheck`, encadeado com `&&`** (lição L-016).

## Review Focus

1. **Salvar sem mudar nada** → nenhuma vigência, nenhuma ocorrência tocada (`mudou: false`). Teste em T1 e T4.
2. **Dia 31 numa ocorrência de fevereiro** → data no último dia de fevereiro. Teste em T2.
3. **Encurtar o fim com ocorrência paga depois do novo fim** → a paga continua, como no "Encerrar" de hoje. Teste em T4.
4. **"Vale a partir de" antes do início** → `PERIODO_INVALIDO`. Teste em T1.
5. **Payload com `natureza` ou `competenciaInicio`** (formulário adulterado) → `VALIDACAO`. Teste em T5.

---

## Test Coverage Matrix

| Camada | Tipo | Expectativa | Local | Comando |
| --- | --- | --- | --- | --- |
| `src/domain/**` | unit | 100% de branches; 1:1 com os ACs | `src/domain/**/*.test.ts` | `pnpm test:unit` |
| `src/application/**` | unit | Todos os ramos, com fakes | `src/application/**/*.test.ts` | `pnpm test:unit` |
| Repositórios e transação | integration | Consultas, o que a escrita **não** toca, rollback | `src/infrastructure/**/*.integration.test.ts` | `pnpm test:integration` |
| Actions | integration | Sessão primeiro, validação, não encontrado, falha injetada, revalidação | `src/app/**/*.integration.test.ts` | `pnpm test:integration` |
| Componentes | componentes | Estados visíveis, campos travados, rótulos | `src/components/**/*.test.tsx` | `pnpm test:unit` |
| Fluxo | e2e | Editar, ver em mês passado, reajustar, encerrar e reabrir | `e2e/*.spec.ts` | `pnpm test:e2e` |
| Composição de página, docs | none | — | — | — |

## Gate Check Commands

| Gate | Comando |
| --- | --- |
| `quick` | `pnpm test:unit && pnpm typecheck` |
| `full` | `pnpm test:unit && pnpm test:integration && pnpm typecheck` |
| `build` | `pnpm verify` |
| `e2e` | `pnpm verify && pnpm test:e2e` (sem `next dev` do dono rodando) |

---

## Execution Plan

### Phase 0 — Regra pura

```
T1
```

### Phase 1 — Banco e transação

```
T1 -> T2
T3
```

### Phase 2 — Aplicação e action

```
T2 -> T4
T3 -> T4
T5
T4 -> T6
T5 -> T6
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

---

## Task Breakdown

#### T1: A regra da edição e a data de vencimento no domínio
**What**: `planejarEdicaoDoFixo` e `dataDeVencimento` movida para o domínio; `PERIODO_INVALIDO` na union `CodigoErro`.
**Where**: `src/domain/recorrencia/edicao-do-fixo.ts` (+ `data-de-vencimento.ts`, `materializar/handler.ts` importando dela, `src/domain/index.ts`)
**Depends on**: nenhuma
**Reuses**: `diaEfetivo`, `addMeses`, `compararCompetencias`
**Requirement**: EDF-02, EDF-03, EDF-04
**Done when**:
- [x] Série: mudar qualquer um dos cinco campos → `serie` com os cinco valores editados; nenhum mudou → `serie = null` (EDF-02 AC 1, 4)
- [x] Valor diferente do vigente → `vigencia` com o mês e o valor escolhidos; igual → `null` (EDF-03 AC 2, 3)
- [x] As seis linhas da tabela do fim, uma por teste (EDF-04 AC 1-3)
- [x] Fim anterior ao início e "vale a partir de" anterior ao início → `PERIODO_INVALIDO` (EDF-04 AC 4, EDF-03 AC 5)
- [x] `dataDeVencimento("2027-02", 31)` → `"2027-02-28"`; `("2028-02", 31)` → `"2028-02-29"`; os testes da materialização passam sem alteração
- [x] 100% de branches
**Tests**: unit
**Gate**: quick
**Commit**: `feat(recorrencias): decidir no domínio o que a edição de um fixo faz`

#### T2: Atualizar a série e as ocorrências no banco
**What**: Métodos novos de `RecorrenciaRepository` e `MovimentoRepository` nas ports, nos fakes e no Drizzle.
**Where**: `src/infrastructure/db/repositories/recorrencia.repository.ts` (+ `movimento.repository.ts`, `src/application/ports/repositories.ts`, `fakes.ts`)
**Depends on**: T1
**Reuses**: `deCompetencia`, `paraCompetencia`, `dataDeVencimento`
**Requirement**: EDF-02, EDF-04
**Done when**:
- [x] `atualizarOcorrenciasDaSerie` muda descrição, categoria, meio, pessoa e `data_evento` de **todas** as ocorrências do fixo, passadas inclusive; uma paga mantém `pago_em`; uma com valor confirmado mantém `valor_centavos` e `valor_previsto_centavos`; ocorrência de **outro** fixo não muda (EDF-02 AC 1-3)
- [x] Dia 31 e ocorrência de fevereiro → `data_evento` no último dia do mês (EDF-02 AC 2)
- [x] `atualizarSerie`, `reabrir` (fim e `encerrada_em` nulos) e `estenderFim` gravam o que dizem e nada mais; `buscarComVersoes` devolve o fixo com as vigências, ou `null`
- [x] Os fakes reproduzem as mesmas regras
**Tests**: integration
**Gate**: full
**Commit**: `feat(db): atualizar a série de um fixo e as suas ocorrências`

#### T3: Transação genérica, extraída da importação
**What**: `Transacao` (port) e `TransacaoDrizzle` sem trava; `TransacaoDaImportacaoDrizzle` passa a compô-la.
**Where**: `src/infrastructure/db/transacao.ts` (+ `transacao-da-importacao.ts`, ports e fakes)
**Depends on**: nenhuma
**Reuses**: o `Executor` e os repositórios sobre `tx`
**Requirement**: EDF-06
**Done when**:
- [x] Exceção dentro de `executar` desfaz escritas de todos os repositórios recebidos (EDF-06 AC 2)
- [x] Todos os testes da importação passam sem alteração (refatoração pura do lado dela)
**Tests**: integration
**Gate**: full
**Commit**: `refactor(db): extrair a transação genérica da transação da importação`

#### T4: Caso de uso de edição
**What**: `editarRecorrencia(transacao, entrada)` carrega, valida, planeja e executa.
**Where**: `src/application/recorrencias/editar/handler.ts`
**Depends on**: T2, T3
**Reuses**: `planejarEdicaoDoFixo`, `versaoVigente`, `registrarVersao`, `encerrarRecorrencia`
**Requirement**: EDF-02, EDF-03, EDF-04, EDF-06
**Done when**:
- [x] Fixo inexistente → `RECORRENCIA_NAO_ENCONTRADA`; meio inexistente ou arquivado e categoria inexistente → o código respectivo, nada gravado (EDF-06 AC 5, EDF-05 AC 3)
- [x] Série alterada → fixo e ocorrências atualizados; valor alterado → vigência nova pelo `registrarVersao`; fim → `encerrar`, `reabrir` ou `estenderFim` conforme o plano (EDF-02, EDF-03, EDF-04)
- [x] Review Focus 1: salvar sem mudança → `mudou: false` e nenhuma escrita nos fakes
- [x] Review Focus 3: encurtar o fim com ocorrência paga depois dele → a paga continua
**Tests**: unit
**Gate**: quick
**Commit**: `feat(recorrencias): caso de uso de edição de fixo`

#### T5: Schema da edição
**What**: `entradaEdicaoRecorrenciaSchema`, estrito.
**Where**: `src/application/schemas/recorrencia.schema.ts`
**Depends on**: nenhuma
**Reuses**: os campos de `entradaRecorrenciaSchema`
**Requirement**: EDF-05
**Done when**:
- [x] Os mesmos limites do cadastro para descrição, valor e dia (EDF-05 AC 3)
- [x] Review Focus 5: payload com `natureza` ou `competenciaInicio` é recusado (EDF-05 AC 2)
- [x] `competenciaFim` aceita `null`; `vigenteDesde` e `competenciaExibida` são obrigatórios
**Tests**: unit
**Gate**: quick
**Commit**: `feat(recorrencias): validar o payload da edição de fixo`

#### T6: Action de edição
**What**: `editarRecorrencia` em `src/app/actions/recorrencias.ts`, com os códigos novos em `src/lib/erros.ts`.
**Where**: `src/app/actions/recorrencias.ts` (+ `src/lib/erros.ts`)
**Depends on**: T4, T5
**Reuses**: `executar` e o padrão das actions de recorrência; `TransacaoDrizzle`
**Requirement**: EDF-06
**Done when**:
- [x] `requireSession()` é a primeira instrução; sem sessão → código de sessão, sem banco (EDF-06 AC 3)
- [x] Contra Postgres: trocar categoria e descrição em novembro muda também a ocorrência de outubro, paga inclusive, sem mudar o pagamento (EDF-02)
- [x] Falha injetada em `atualizarOcorrenciasDaSerie` → fixo e ocorrências como antes (EDF-06 AC 1-2)
- [x] Revalida as três rotas (EDF-06 AC 6); erro não previsto → `ERRO_INESPERADO` com referência (AC 4)
**Tests**: integration
**Gate**: full
**Commit**: `feat(recorrencias): action de edição de fixo`

#### T7: O formulário de cadastro em modo de edição
**What**: `FormRecorrencia` aceita os valores gravados e a action de edição.
**Where**: `src/components/form-recorrencia.tsx`
**Depends on**: T6
**Reuses**: o próprio formulário; `CadastroInline`
**Requirement**: EDF-01, EDF-03, EDF-05
**Done when**:
- [x] Em edição, os nove campos vêm preenchidos; o botão diz "Salvar alterações" (EDF-01 AC 3, 4)
- [x] "O que é" e "Começa em" desabilitados, com "Para mudar, encerre este e cadastre de novo" (EDF-05 AC 1)
- [x] "Vale a partir de" aparece só quando o valor difere do vigente, preenchido com o mês exibido (EDF-03 AC 1)
- [x] Entrada usa o vocabulário de receita (EDF-01 AC 5)
- [x] Os testes existentes de `form-recorrencia.test.tsx` passam sem alteração

Acréscimo (T7): `formatarValorParaCampo` em `src/lib/formatar.ts`, a fronteira única de centavos para
texto (AD-001), preenche o campo do valor num formato que `parseBRL` lê de volta. O formulário passa a
mostrar no próprio campo as recusas endereçadas ao meio, à categoria e ao "Vale a partir de", que
antes não tinham onde aparecer.
**Tests**: componentes
**Gate**: quick
**Commit**: `feat(recorrencias): abrir o formulário de fixo em modo de edição`

#### T8: "Editar" em cada cartão de "Todo mês"
**What**: Botão "Editar" no cartão, com o diálogo e o formulário de T7; a página passa ids, valores e a action.
**Where**: `src/components/lista-de-fixos.tsx` (+ `src/app/(app)/[competencia]/fixos/page.tsx`)
**Depends on**: T7
**Reuses**: o padrão de `<dialog>` de `DialogoDeCadastro`
**Requirement**: EDF-01, EDF-06
**Done when**:
- [x] Cada cartão mostra "Editar" ao lado de "Mudar valor" e "Encerrar", inclusive o de um fixo encerrado (EDF-01 AC 1)
- [x] "Editar" abre o diálogo com o título certo para conta e para entrada (EDF-01 AC 2)
- [x] Salvar mostra a confirmação dentro do diálogo, sem fechá-lo (EDF-06 AC 6)

Acréscimo (T8): o diálogo é um só, da lista inteira, e não um por cartão. A lista é ordenada pela
descrição: renomear move o `<li>` no DOM, e um `<dialog>` modal movido perde o modo modal e o
backdrop. Para reaproveitar o elemento, `DialogoDeCadastro` passa a compor `Dialogo`, o `<dialog>` sem
o botão que o abre. O formulário nasce a cada abertura, com o que está gravado (EDF-01 AC 3).
**Tests**: componentes
**Gate**: build
**Commit**: `feat(recorrencias): editar cada fixo a partir de Todo mês`

#### T9: Editar de ponta a ponta
**What**: e2e do fluxo inteiro.
**Where**: `e2e/editar-fixo.spec.ts`
**Depends on**: T8
**Reuses**: `entrar`, `limparDados`, `semearCadastroBase`
**Requirement**: EDF-01 a EDF-04
**Done when**:
- [x] Trocar categoria e descrição em novembro e ver as duas em outubro (EDF-02 Independent Test)
- [x] Mudar o valor a partir de novembro e ver outubro com o valor antigo (EDF-03 Independent Test)
- [x] Encerrar pelo "Termina em" e reabrir apagando o campo (EDF-04 Independent Test)
**Tests**: e2e
**Gate**: e2e
**Commit**: `test(e2e): editar um fixo pelo formulário do cadastro`

#### T10: Fechar a fatia
**What**: Roadmap, handoff e traceability.
**Where**: `docs/roadmap.md` (+ `.specs/HANDOFF.md`, `.specs/STATE.md` só na seção Handoff, `spec.md`)
**Depends on**: T9
**Requirement**: EDF-06
**Done when**:
- [ ] Roadmap: edição de fixo em "Pronto"; a de avulso e compra continua como fatia seguinte, apontando para o rascunho em `editar-lancamentos/context.md`
- [ ] Handoff com a ordem de entrada no ar: depois das três importações em produção
- [ ] Traceability com cada requisito implementado
**Tests**: none
**Gate**: build
**Commit**: `docs(recorrencias): fechar a fatia de edição de fixo`

---

## Task Granularity Check

| Task | Escopo | Status |
| --- | --- | --- |
| T1 | 1 regra + 1 helper movido | ⚠️ coeso: a regra usa o helper |
| T2 | ports + fakes + 2 repositórios | ⚠️ coeso: uma port sem implementação não compila (lição da T12 da importação) |
| T3 | 1 transação extraída | ✅ |
| T4–T7 | 1 arquivo de produto cada (T6: + mensagens) | ✅ |
| T8 | 1 componente + a página que o alimenta | ⚠️ coeso |
| T9, T10 | e2e; documentação | ✅ |

## Diagram-Definition Cross-Check

| Task | Depends On | Diagrama | Status |
| --- | --- | --- | --- |
| T1 | — | — | ✅ |
| T2 | T1 | T1→T2 | ✅ |
| T3 | — | — | ✅ |
| T4 | T2, T3 | T2→T4, T3→T4 | ✅ |
| T5 | — | — | ✅ |
| T6 | T4, T5 | T4→T6, T5→T6 | ✅ |
| T7 | T6 | T6→T7 | ✅ |
| T8 | T7 | T7→T8 | ✅ |
| T9 | T8 | T8→T9 | ✅ |
| T10 | T9 | T9→T10 | ✅ |

## Test Co-location Validation

| Task | Camada | Matriz exige | Task diz | Status |
| --- | --- | --- | --- | --- |
| T1 | domínio | unit | unit | ✅ |
| T2, T3 | repositório / transação | integration | integration | ✅ |
| T4, T5 | aplicação | unit | unit | ✅ |
| T6 | action | integration | integration | ✅ |
| T7, T8 | componentes | componentes | componentes | ✅ |
| T9 | fluxo | e2e | e2e | ✅ |
| T10 | docs | none | none | ✅ |
