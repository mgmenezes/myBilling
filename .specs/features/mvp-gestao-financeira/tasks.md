# MVP Gestão Financeira Doméstica — Tasks

**Spec**: `.specs/features/mvp-gestao-financeira/spec.md`
**Design**: `.specs/features/mvp-gestao-financeira/design.md`
**Total**: 54 tasks em 8 fases

> **Mapa para o plano aprovado:** as Fases 0 a 3 e 6 a 7 daqui correspondem às Fases 0 a 3, 5 e 6 do plano. A Fase 4 do plano (Persistência, 11 tasks) foi dividida em duas fases — **schema e conexão** e **repositórios** — porque 11 tasks ultrapassam o limite de ~10 por fase. A costura é uma fronteira real de dependência: nada de repositório existe antes de schema, migration e cliente.

---

## Execution Protocol (MANDATORY -- do not skip)

Para cada task, nesta ordem, sem pular etapa:

1. **Pré-implementação** — declarar premissas, arquivos a tocar e critério de sucesso.
2. **Escrever os testes primeiro**, derivados dos acceptance criteria do `spec.md`. Os testes asseram o resultado definido no spec, nunca espelham a implementação.
3. **Implementar** até os testes passarem.
4. **Gate Check** — rodar o comando do nível declarado na task. O test runner decide, não auto-avaliação.
5. **Test Adequacy Review** (A suficiente / B não-raso / C necessário / D conformidade). Cada critério coberto cita `file:line` **e** reproduz a expressão da assertion. Sem citação localizada, o critério conta como **não coberto** e a task não pode ser marcada como pronta.
6. **Marcar a task como concluída** neste arquivo e atualizar a traceability no `spec.md`, **antes** do commit e **dentro** do mesmo commit.
7. **Um commit atômico** em Conventional Commits, validado por `check_commit.py`.

Proibições absolutas: commitar antes do gate passar · enfraquecer, pular ou deletar teste para passar · agrupar tasks em um commit · "já que estou aqui" · marcar critério coberto sem citação `file:line`.

**Blast radius:** a aprovação destas tasks autoriza implementação e commits **locais**. `git push`, deploy, criação de projeto na Vercel ou no Neon e qualquer operação remota exigem autorização explícita e separada.

---

## Test Coverage Matrix

| Camada de código | Tipo de teste | Expectativa de cobertura | Padrão de localização | Comando |
| --- | --- | --- | --- | --- |
| `src/domain/**` | unit | **100% de branches**; 1:1 com os ACs do spec; todo edge case listado tem teste | `src/domain/**/*.test.ts` | `pnpm test:unit` |
| `src/application/**` | unit | Todos os ramos, com fakes em memória; sem banco | `src/application/**/*.test.ts` | `pnpm test:unit` |
| `src/infrastructure/db/repositories/**` | integration | Caminhos de consulta principais, erros e transação com rollback | `src/infrastructure/**/*.integration.test.ts` | `pnpm test:integration` |
| `src/app/actions/**` | integration | Happy path, validação e não-autenticado | `src/app/**/*.integration.test.ts` | `pnpm test:integration` |
| `src/infrastructure/auth/**` | unit + integration | Allowlist por unit; resolução de sessão por integration | co-locado | ambos |
| `src/lib/**` | unit | Formatação BRL e data pt-BR | `src/lib/*.test.ts` | `pnpm test:unit` |
| Fluxos de usuário | e2e | 2 fluxos críticos: autenticação e compra parcelada | `e2e/*.spec.ts` | `pnpm test:e2e` |
| Configuração, schema, migration, componentes de apresentação | **none** | Cobertos pelo gate de build (typecheck + lint + build) e, indiretamente, por e2e | — | — |

> As tasks marcadas `Tests: none` são exatamente as das duas últimas linhas desta matriz. Nenhuma task de domínio, aplicação ou repositório pode declarar `none`.

---

## Gate Check Commands

| Gate | Quando | Comando |
| --- | --- | --- |
| `quick` | task só com teste unitário | `pnpm test:unit` |
| `full` | task com teste de integração ou e2e | `pnpm test:unit && pnpm test:integration` |
| `build` | última task da fase, ou task sem teste | `pnpm verify` |

`pnpm verify` = `pnpm typecheck && pnpm lint && pnpm test:unit && pnpm test:integration && pnpm build`

Pré-requisito dos gates `full` e `build`: `pnpm db:up` (Postgres em Docker, AD-010).

---

## Execution Plan

Oito fases sequenciais. O núcleo puro (Fases 1 a 3) é construído e provado **antes** de existir banco ou tela — é onde está todo o risco do produto.

### Phase 0 — Fundação: repositório verde e fronteira enforçada

```
T1 -> T2 -> T6
T1 -> T3 -> T5 -> T6
T1 -> T4
T2 -> T7
T3 -> T7
```

### Phase 1 — Núcleo puro: dinheiro e competência

```
T8 -> T9 -> T12
T10 -> T11 -> T12
```

### Phase 2 — Núcleo puro: parcelamento e ciclo de fatura

```
T13 -> T14 -> T15 -> T19
T14 -> T18 -> T19
T16 -> T17 -> T19
```

### Phase 3 — Núcleo puro: agregação, orçamento e projeção

```
T20 -> T21 -> T22 -> T23 -> T26
T21 -> T25 -> T26
T24 -> T25
```

### Phase 4 — Persistência: schema e conexão

```
T27 -> T29 -> T30
T28 -> T29
```

(T31 define as interfaces de repositório e não depende de nenhuma task desta fase.)

### Phase 5 — Persistência: repositórios

```
T33 -> T34 -> T37
T33 -> T35 -> T36 -> T37
```

(T32 implementa os fakes em memória a partir das ports da fase anterior.)

### Phase 6 — Autenticação e shell da aplicação

```
T38 -> T39 -> T42 -> T46
T38 -> T40 -> T42
T38 -> T41 -> T45 -> T46
T43 -> T44 -> T45
```

### Phase 7 — Corte vertical mínimo

```
T47 -> T48 -> T49 -> T50 -> T53 -> T54
T47 -> T50
T51 -> T53
T52 -> T53
```

---

## Phase Execution Map

| Fase | Tasks | Qtd | Entrega observável ao final |
| --- | --- | --- | --- |
| 0 — Fundação | T1–T7 | 7 | `pnpm verify` sai com 0 num projeto vazio; importar framework dentro de `src/domain` faz a suíte falhar |
| 1 — Dinheiro e competência | T8–T12 | 5 | `addMeses('2026-11', 3) === '2027-02'` e `dataParaCompetencia('2026-03-31T23:30:00Z') === '2026-03'` |
| 2 — Parcelamento e fatura | T13–T19 | 7 | **A dor central resolvida em código puro**: R$ 1.000,00 em 3x → 33334/33333/33333, virada de ano correta, compra 8/10 |
| 3 — Agregação e orçamento | T20–T26 | 7 | Toda a matemática financeira pronta, 100% de branches em `src/domain` |
| 4 — Schema e conexão | T27–T31 | 5 | Migration aplica num Postgres real; as restrições rejeitam dado inválido |
| 5 — Repositórios | T32–T37 | 6 | Compra e N parcelas gravam numa transação; falha na N-ésima não deixa compra órfã |
| 6 — Auth e shell | T38–T46 | 9 | Os dois entram com Google; e-mail fora da allowlist recebe 403 sem criar usuário |
| 7 — Corte vertical ⭐ | T47–T54 | 8 | **Cadastrar compra parcelada e ver as parcelas nos meses seguintes sem ação adicional** |

**Batches de sub-agente sugeridos** (fases inteiras, nunca divididas, executados em sequência): `[0]` · `[1, 2]` · `[3]` · `[4, 5]` · `[6]` · `[7]`.

**Tier de modelo por batch:** Fases 1, 2, 3 e 7 em tier de alto raciocínio (núcleo financeiro e integração do corte vertical); Fases 0, 4, 5 e 6 em tier rápido (configuração, schema, wiring, CRUD). Verifier em tier médio-alto.

---
## Task Breakdown

### Phase 0 — Fundação

#### T1: Scaffold Next.js + TypeScript strict + Tailwind ✅ CONCLUÍDA
**What**: Criar o projeto com App Router, `strict: true`, `noUncheckedIndexedAccess: true`, Tailwind v4 e `paths` nomeando as camadas (`@/domain`, `@/application`, `@/infrastructure`, `@/app`, `@/lib`). Scripts `dev`, `build`, `typecheck`, `verify`.
**Where**: `package.json`
**Depends on**: none
**Reuses**: nada — primeira task
**Requirement**: DADO-01
**Tools**: Bash (`pnpm create next-app`), Context7 MCP para confirmar flags atuais do scaffold
**Done when**:
- [x] `pnpm typecheck` sai com 0
- [x] `pnpm build` sai com 0
- [x] `tsconfig.json` tem `strict` e `noUncheckedIndexedAccess` habilitados
- [x] `.gitignore` ignora `.env*` com exceção de `!.env.example`
**Tests**: none
**Gate**: build

#### T2: Biome com fronteira de domínio enforçada por lint ✅ CONCLUÍDA
**What**: Configurar Biome (lint + format) e a regra `noRestrictedImports` proibindo, dentro de `src/domain/**`, qualquer import de `next`, `react`, `drizzle-orm`, `zod`, `@/infrastructure`, `@/app` e módulos do Node. Adicionar script `lint`.
**Where**: `biome.json`
**Depends on**: T1
**Reuses**: os `paths` definidos em T1
**Requirement**: DADO-01
**Tools**: Context7 MCP para a sintaxe atual de `noRestrictedImports` no Biome
**Done when**:
- [x] `pnpm lint` sai com 0 no projeto vazio
- [x] Um import de `next/server` dentro de `src/domain` faz `pnpm lint` falhar
**Tests**: none
**Gate**: build

#### T3: Vitest com projects separados domain e integration ✅ CONCLUÍDA
**What**: Configurar Vitest com dois projects: `domain` (ambiente node, sem DOM, sem setup de banco) e `integration`. Threshold de cobertura de 100% de branches aplicado **apenas** a `src/domain`. Scripts `test:unit` e `test:integration`.
**Where**: `vitest.config.ts`
**Depends on**: T1
**Reuses**: os `paths` de T1
**Requirement**: DADO-01
**Tools**: Context7 MCP para a API de `projects` na versão corrente do Vitest
**Done when**:
- [x] `pnpm test:unit` roda e sai com 0 sem nenhum teste
- [x] `pnpm test:integration` roda e sai com 0 sem nenhum teste
- [x] A configuração de cobertura aponta exclusivamente para `src/domain`
**Tests**: none
**Gate**: build

#### T4: Configuração tipada de ambiente com falha no boot ✅ CONCLUÍDA
**What**: Validar `process.env` com Zod e **encerrar o processo** se faltar chave obrigatória (`DATABASE_URL`, `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `EMAILS_PERMITIDOS`). Criar `.env.example` com as mesmas chaves e valores falsos.
**Where**: `src/infrastructure/config/env.ts`
**Depends on**: T1
**Reuses**: nada
**Requirement**: AUTH-02
**Tools**: nenhuma além do editor
**Done when**:
- [x] Teste prova que ambiente sem `DATABASE_URL` lança na inicialização (AUTH-02, AC 5)
- [x] Teste prova que nenhuma chave declarada tem prefixo `NEXT_PUBLIC_` (AUTH-02, AC 6)
- [x] `.env.example` existe e está versionado; `.env.local` não está
**Tests**: unit
**Gate**: quick

#### T5: Result e catálogo fechado de códigos de erro ✅ CONCLUÍDA
**What**: Implementar `Result<T, E>` com construtores `ok` e `err` e guardas de narrowing, mais a union fechada `CodigoErro` com todos os códigos do `design.md` (`PARCELA_INFERIOR_A_UM_CENTAVO`, `QTD_PARCELAS_INVALIDA`, `VALOR_NAO_POSITIVO`, `PARCELA_INICIAL_INVALIDA`, `MEIO_PAGAMENTO_ARQUIVADO`, `CONSERVACAO_VIOLADA`, `COMPETENCIA_INVALIDA`).
**Where**: `src/domain/shared/result.ts`
**Depends on**: T3
**Reuses**: nada — primitiva de base do domínio
**Requirement**: DADO-01
**Tools**: nenhuma
**Done when**:
- [x] Teste prova que `ok(v)` estreita para o ramo de sucesso e `err(c)` para o de falha
- [x] `CodigoErro` é union de literais, sem `string` aberto
- [x] Nenhuma mensagem de usuário existe neste arquivo
**Tests**: unit
**Gate**: quick

#### T6: Teste de fronteira arquitetural do domínio ✅ CONCLUÍDA
**What**: Teste que lê recursivamente todos os arquivos de `src/domain/**`, extrai as declarações de import e falha se alguma apontar para fora do domínio (framework, ORM, infraestrutura, app, módulo do Node).
**Where**: `src/domain/shared/arquitetura.test.ts`
**Depends on**: T5, T2
**Reuses**: a lista de proibições definida em T2 — mantida em um único lugar, importada pelo teste
**Requirement**: DADO-01
**Tools**: `node:fs` dentro do teste (permitido: é arquivo de teste, não de domínio)
**Done when**:
- [x] Teste passa com o domínio atual
- [x] Teste falha ao introduzir `import { NextRequest } from 'next/server'` em um arquivo de `src/domain` (verificado manualmente e revertido)
- [x] O teste roda dentro do project `domain`, no gate `quick`
**Tests**: unit
**Gate**: quick

#### T7: Workflow de integração contínua ✅ CONCLUÍDA
**What**: GitHub Actions rodando typecheck, lint, testes unitários e build, com `services: postgres` disponível para os testes de integração das fases seguintes.
**Where**: `.github/workflows/ci.yml`
**Depends on**: T2, T3
**Reuses**: os scripts npm criados em T1, T2 e T3
**Requirement**: DADO-01
**Tools**: Context7 MCP para a sintaxe atual de `services` no Actions
**Done when**:
- [x] `pnpm verify` local sai com 0
- [x] O workflow declara Node 24 e pnpm via corepack
- [x] O job não executa nenhuma operação remota além de checkout e cache
**Tests**: none
**Gate**: build

---

### Phase 1 — Núcleo puro: dinheiro e competência

#### T8: Tipo Cents e operações aritméticas ✅ CONCLUÍDA
**What**: Tipo branded `Cents`, construtor validante e operações `somar`, `subtrair`, `multiplicar`. Toda operação em inteiro; nenhum uso de ponto flutuante.
**Where**: `src/domain/shared/money.ts`
**Depends on**: T5
**Reuses**: `Result` e `CodigoErro` de T5
**Requirement**: DADO-01
**Tools**: nenhuma
**Done when**:
- [x] Teste prova que valor não inteiro é rejeitado com `VALOR_NAO_POSITIVO`
- [x] Teste prova que valor menor que 1 é rejeitado com `VALOR_NAO_POSITIVO` (PARC-05, AC 7)
- [x] Teste prova que `Cents` não é atribuível a `number` sem o construtor
**Tests**: unit
**Gate**: quick

#### T9: Parsing de valor em reais para centavos ✅ CONCLUÍDA
**What**: `parseBRL` convertendo `"1.234,56"` em `123456`, aceitando separador de milhar opcional e rejeitando entrada malformada. Nenhuma passagem por `Number` de valor fracionário.
**Where**: `src/domain/shared/money.test.ts`
**Depends on**: T8
**Reuses**: `criarCents` de T8
**Requirement**: DADO-01
**Tools**: nenhuma
**Done when**:
- [x] `"1.234,56"` resulta em 123456
- [x] `"0,05"` resulta em 5
- [x] `"1234,5"` resulta em 123450
- [x] `"abc"` e `"1,234"` com três decimais são rejeitados
- [x] Teste prova que o resultado nunca passa por aritmética de ponto flutuante intermediária
**Tests**: unit
**Gate**: quick

#### T10: Competência YYYY-MM com aritmética inteira ✅ CONCLUÍDA
**What**: Tipo branded `Competencia`, construtor validante, `addMeses` (aceitando negativo), `compararCompetencias`, `diffMeses` e `rangeCompetencias`. Deslocamento por `ano × 12 + mes`, sem `Date`.
**Where**: `src/domain/shared/competencia.ts`
**Depends on**: T5
**Reuses**: `Result` e `CodigoErro` de T5
**Requirement**: COMP-01, COMP-02, COMP-04
**Tools**: nenhuma
**Done when**:
- [x] `addMeses('2026-11', 3)` resulta em `'2027-02'` (COMP-01)
- [x] `addMeses('2026-01', -1)` resulta em `'2025-12'` (COMP-04)
- [x] `addMeses('2026-11', 23)` resulta em `'2028-10'` (COMP-02)
- [x] `'2026-13'` e `'2026-00'` são rejeitados com `COMPETENCIA_INVALIDA`
- [x] Nenhuma referência a `Date` no arquivo (verificado por assertion sobre o fonte)
**Tests**: unit
**Gate**: quick

#### T11: Conversão de data para competência com fuso explícito ✅ CONCLUÍDA
**What**: `dataParaCompetencia(dataISO, tz)` recebendo o fuso como parâmetro obrigatório. Sem leitura de fuso do ambiente e sem `Date.now()`.
**Where**: `src/domain/shared/competencia.test.ts`
**Depends on**: T10
**Reuses**: o construtor `criarCompetencia` de T10
**Requirement**: COMP-03
**Tools**: `Intl.DateTimeFormat` com `timeZone` explícito
**Done when**:
- [x] `dataParaCompetencia('2026-03-31T23:30:00Z', 'America/Sao_Paulo')` resulta em `'2026-03'` (COMP-03)
- [x] `dataParaCompetencia('2026-04-01T02:30:00Z', 'America/Sao_Paulo')` resulta em `'2026-03'`
- [x] Chamar sem `tz` é erro de tipo, não default silencioso
**Tests**: unit
**Gate**: quick

#### T12: Tipos de domínio imutáveis ✅ CONCLUÍDA
**What**: Declarar `Lancamento`, `Cartao`, `MeioPagamento`, `Categoria`, `EntradaCompra`, `PlanoParcelamento` e `ResumoMensal` conforme o `design.md`, todos `readonly`, sem decorator e sem tipo do ORM.
**Where**: `src/domain/tipos.ts`
**Depends on**: T9, T11
**Reuses**: `Cents` de T8 e `Competencia` de T10
**Requirement**: MOV-03
**Tools**: nenhuma
**Done when**:
- [x] `ResumoMensal` expõe `competenciaView`, `caixaView` e `futuro` como objetos aninhados distintos (MOV-03)
- [x] Nenhum campo monetário é `number` cru — todos são `Cents`
- [x] `pnpm typecheck` sai com 0
**Tests**: none
**Gate**: build

---

### Phase 2 — Núcleo puro: parcelamento e ciclo de fatura

#### T13: Rateio de parcelas com teste de propriedade ✅ CONCLUÍDA
**What**: `ratearParcelas(total, n, politica)` com divisão euclidiana e alocação do resíduo nas primeiras parcelas (AD-004). Rejeitar entradas impossíveis antes de qualquer cálculo.
**Where**: `src/domain/parcelamento/ratear-parcelas.ts`
**Depends on**: T8
**Reuses**: `Cents` e operações de T8; `Result` de T5
**Requirement**: PARC-01, PARC-02, PARC-03
**Tools**: fast-check para o teste de propriedade
**Done when**:
- [x] R$ 1.000,00 em 3x resulta em `[33334, 33333, 33333]` (PARC-01, AC 1)
- [x] R$ 0,05 em 3x resulta em `[2, 2, 1]` (edge case do spec)
- [x] R$ 1.000,01 em 7x resulta em seis de 14286 e uma de 14285 (edge case do spec)
- [x] R$ 0,02 em 3x é rejeitado com `PARCELA_INFERIOR_A_UM_CENTAVO` (PARC-05, AC 5)
- [x] R$ 0,03 em 3x resulta em `[1, 1, 1]` (edge case do spec)
- [x] R$ 99.999,99 em 120x preserva a soma exata (edge case do spec)
- [x] Política `ULTIMAS` aloca o resíduo nas últimas parcelas
- [x] **Teste de propriedade** fast-check: para todo total entre 1 e 10.000.000 e todo n entre 1 e 120 válidos, a soma das parcelas é exatamente o total (PARC-02)
**Tests**: unit
**Gate**: quick

#### T14: Geração de parcelas com competências sequenciais ✅ CONCLUÍDA
**What**: `gerarParcelas(entrada)` combinando rateio com `competencia[k] = competenciaCompra + (k − 1) meses`, suportando os modos `TOTAL` e `VALOR_PARCELA` e o recorte por parcela inicial (AD-005).
**Where**: `src/domain/parcelamento/gerar-parcelas.ts`
**Depends on**: T13
**Reuses**: `ratearParcelas` de T13; `addMeses` de T10
**Requirement**: PARC-01, PARC-04, PARC-06, PARC-07, COMP-01
**Tools**: nenhuma
**Done when**:
- [x] R$ 1.000,00 em 3x na competência `2026-03` gera `2026-03`, `2026-04`, `2026-05` (PARC-01, AC 1)
- [x] Modo `VALOR_PARCELA` com 7790 × 10 gera total 77900 e dez parcelas idênticas, resto zero (PARC-04, AC 4)
- [x] Compra `8/10` persiste exatamente as parcelas 8, 9 e 10 (PARC-06, AC 1)
- [x] Compra `8/10` registra `valorAmortizadoAnterior` igual à soma das parcelas 1 a 7 (PARC-07, AC 2)
- [x] Compra `8/10` gera zero parcelas em competências anteriores à da parcela inicial (PARC-07, AC 3)
- [x] Compra `10/10` gera exatamente uma parcela (PARC-08, AC 5)
- [x] Compra `1/1` gera uma parcela na competência da compra (edge case do spec)
- [x] Compra com competência `2026-11` em 5x termina em `2027-03` (COMP-01, AC 1)
- [x] A soma das parcelas geradas mais o amortizado anterior é exatamente o total, em todos os casos acima (PARC-02, AC 2)
**Tests**: unit
**Gate**: quick

#### T15: Validações de entrada da geração de parcelas ✅ CONCLUÍDA
**What**: Rejeitar, antes de qualquer cálculo, quantidade de parcelas fora de 1 a 120, valor total menor que 1 centavo, número de parcelas maior que o total em centavos, e parcela inicial fora do intervalo válido.
**Where**: `src/domain/parcelamento/gerar-parcelas.test.ts`
**Depends on**: T14
**Reuses**: os códigos de erro de T5
**Requirement**: PARC-05, PARC-08
**Tools**: nenhuma
**Done when**:
- [x] `n = 0` e `n = 121` resultam em `QTD_PARCELAS_INVALIDA` (PARC-05, AC 6)
- [x] Total zero resulta em `VALOR_NAO_POSITIVO` (PARC-05, AC 7)
- [x] `n` maior que o total em centavos resulta em `PARCELA_INFERIOR_A_UM_CENTAVO` (PARC-05, AC 5)
- [x] Parcela inicial 11 com 10 parcelas resulta em `PARCELA_INICIAL_INVALIDA` (PARC-08, AC 6)
- [x] Em todos os casos de rejeição, nenhuma parcela é retornada
**Tests**: unit
**Gate**: quick

#### T16: Resolução do ciclo de fatura ✅ CONCLUÍDA
**What**: `resolverCicloFatura(cartao, dataCompra)` devolvendo competência da fatura, início e fim do ciclo e data de vencimento. Auxiliar `diaEfetivo` aplicando `min(dia, último dia do mês)`. **A competência do lançamento não é afetada por esta função.**
**Where**: `src/domain/cartao/ciclo-fatura.ts`
**Depends on**: T10
**Reuses**: `addMeses` e `compararCompetencias` de T10
**Requirement**: CART-01, CART-02
**Tools**: nenhuma
**Done when**:
- [x] Compra em 20/03 com fechamento dia 25 cai na fatura de abril (CART-01)
- [x] Compra em 25/03 com fechamento dia 25 configurado como fatura seguinte cai na fatura de maio (CART-02, AC 2)
- [x] Compra em 26/03 com fechamento dia 25 cai na fatura de maio
- [x] Nos três casos acima, a competência do lançamento permanece `2026-03` (CART-01, AC 1)
- [x] Fechamento dia 31 em fevereiro usa o dia 28, e 29 em ano bissexto (CART-03, AC 3)
- [x] Vencimento dia 31 em abril usa o dia 30 (CART-03, AC 3)
- [x] Ao longo de 24 ciclos consecutivos, o início de cada ciclo é o dia seguinte ao fim do anterior, sem intervalo e sem sobreposição (CART-03, AC 4)
**Tests**: unit
**Gate**: quick

#### T17: Regras de meio de pagamento ✅ CONCLUÍDA
**What**: `podeReceberNovaCompra(meio)` e as invariantes de tipo: cartão de crédito exige fechamento e vencimento; conta corrente e rótulo não geram fatura; meio arquivado rejeita nova compra mas preserva parcelas pendentes.
**Where**: `src/domain/cartao/regras-cartao.ts`
**Depends on**: T16
**Reuses**: os tipos `MeioPagamento` e `Cartao` de T12
**Requirement**: CART-02, CART-03
**Tools**: nenhuma
**Done when**:
- [x] Meio do tipo `CONTA_CORRENTE` não gera fatura e não exige dia de fechamento (CART-02, AC 5)
- [x] Meio do tipo `ROTULO` — o caso Porto Seguro — não gera fatura e não exige ciclo (CART-02, AC 5)
- [x] Meio arquivado rejeita nova compra com `MEIO_PAGAMENTO_ARQUIVADO` (CART-03, AC 7)
- [x] Meio arquivado com parcelas pendentes mantém as parcelas contabilizadas — o caso Latam (CART-03, AC 6)
**Tests**: unit
**Gate**: quick

#### T18: Regeneração de parcelas preservando as pagas ✅ CONCLUÍDA
**What**: `regenerarParcelas(compra, alteracoes, parcelasPagas)` redistribuindo apenas o remanescente entre as parcelas não pagas, rejeitando redução abaixo do já pago e preservando a conservação da soma.
**Where**: `src/domain/parcelamento/regenerar-parcelas.ts`
**Depends on**: T14
**Reuses**: `ratearParcelas` de T13 — a política de resíduo existe em um único lugar
**Requirement**: PARC-02, MOV-06
**Tools**: nenhuma
**Done when**:
- [x] Alterar o total de uma compra 12x com 3 parcelas pagas redistribui apenas as 9 pendentes e não altera as 3 pagas (MOV-06, AC 4)
- [x] Reduzir de 10 para 6 parcelas com 8 já pagas é rejeitado
- [x] Reduzir de 10 para 9 com 8 pagas cancela a parcela 10 e mantém a conservação
- [x] Novo total abaixo do já pago é rejeitado
- [x] Após qualquer regeneração aceita, soma das não canceladas mais amortizado mais cancelado é exatamente o total (PARC-02)
**Tests**: unit
**Gate**: quick

#### T19: API pública do núcleo ✅ CONCLUÍDA
**What**: Barrel exportando exclusivamente as funções e tipos que as camadas externas podem consumir. Nada de `export *` de arquivo interno.
**Where**: `src/domain/index.ts`
**Depends on**: T15, T17, T18
**Reuses**: todos os módulos das Fases 1 e 2
**Requirement**: DADO-01
**Tools**: nenhuma
**Done when**:
- [x] `pnpm test:unit` com cobertura mostra 100% de branches em `src/domain/shared`, `src/domain/parcelamento` e `src/domain/cartao`
- [x] O teste de fronteira de T6 continua verde
- [x] `pnpm verify` sai com 0
**Tests**: none
**Gate**: build

---
### Phase 3 — Núcleo puro: agregação, orçamento e projeção

#### T20: Resumo mensal do eixo competência ✅ CONCLUÍDA
**What**: `resumoMensal` produzindo `competenciaView` com Total de Gastos segmentado por origem (Fixos, Cartão, Avulsos), Entradas, Investimentos e Saldo de competência.
**Where**: `src/domain/mes/resumo-mensal.ts`
**Depends on**: T12
**Reuses**: `Cents` e operações de T8
**Requirement**: MOV-01, MOV-04, MOV-05
**Tools**: nenhuma
**Done when**:
- [x] Total de Gastos é a soma dos lançamentos de natureza despesa, não cancelados, da competência (MOV-01)
- [x] Lançamento de natureza investimento fica fora do Total de Gastos (MOV-04, AC 4)
- [x] Saldo aplica `Entradas − Saídas − Investimentos` (MOV-05, AC 5)
- [x] Lançamento com `canceladoEm` preenchido não entra em nenhuma soma
- [x] A segmentação por origem soma exatamente o Total de Gastos
**Tests**: unit
**Gate**: quick

#### T21: Eixo caixa e separação entre previsto e realizado ✅ CONCLUÍDA
**What**: Acrescentar `caixaView` ao resumo — Saídas, Entradas Recebidas, Investimentos Realizados e Saldo de caixa — e o total Pendente do eixo competência. Os dois eixos ficam em objetos distintos, nunca somados.
**Where**: `src/domain/mes/resumo-mensal.test.ts`
**Depends on**: T20
**Reuses**: `resumoMensal` de T20
**Requirement**: MOV-03, MOV-06
**Tools**: nenhuma
**Done when**:
- [x] Lançamento com `pagoEm` preenchido é realizado; sem `pagoEm` é previsto (MOV-06, AC 1)
- [x] Pendente soma apenas despesas da competência sem `pagoEm` (MOV-06, AC 2)
- [x] `competenciaView` e `caixaView` são objetos distintos, sem campo que misture os dois (MOV-03, AC 3)
- [x] Teste prova que um mesmo conjunto de lançamentos produz Total de Gastos e Saídas diferentes quando há pagamento de fatura de competência anterior — a divergência legítima
**Tests**: unit
**Gate**: quick

#### T22: Agregação por categoria e por pessoa ✅ CONCLUÍDA
**What**: `resumoPorCategoria` devolvendo gasto e porcentagem de distribuição por categoria, usando o Total de Gastos como denominador único, mais a agregação por pessoa dona.
**Where**: `src/domain/mes/resumo-por-categoria.ts`
**Depends on**: T21
**Reuses**: o total produzido por `resumoMensal` de T20 — denominador em um único lugar
**Requirement**: MOV-01, ORC-01
**Tools**: nenhuma
**Done when**:
- [x] A soma das porcentagens de distribuição de todas as categorias é 100,00% (MOV-01, AC 7)
- [x] Total de Gastos zero produz distribuição 0% para todas as categorias, sem divisão por zero (MOV-01, AC 8)
- [x] A sobra de arredondamento das porcentagens é atribuída à maior categoria
- [x] O modo de arredondamento está pinçado: fração acima de meio sobe, fração exatamente de meio desempata para cima e fração abaixo de meio desce — trocar por truncamento faz a suíte falhar
- [x] A agregação por pessoa soma exatamente o Total de Gastos
**Tests**: unit
**Gate**: quick

#### T23: Avaliação de orçamento com as duas porcentagens ✅ CONCLUÍDA
**What**: `avaliarOrcamento` devolvendo, por categoria, porcentagem de consumo do limite e porcentagem de distribuição como **campos distintos**, mais sinalização de estouro e o indicador global do mês.
**Where**: `src/domain/orcamento/avaliar-orcamento.ts`
**Depends on**: T22
**Reuses**: `resumoPorCategoria` de T22
**Requirement**: ORC-01, ORC-02
**Tools**: nenhuma
**Done when**:
- [x] Consumo e distribuição são campos separados na mesma estrutura (ORC-01, AC 1)
- [x] Gasto R$ 2.460,00 com limite R$ 1.000,00 resulta em consumo de 246,0% com estouro sinalizado, sem truncamento (ORC-01, AC 2)
- [x] Categoria sem limite no mês resulta em consumo nulo, nunca zero nem infinito (ORC-01, AC 3)
- [x] Indicador global aplica total gasto dividido pela soma dos limites (ORC-02, AC 4)
- [x] Soma dos limites zero resulta em indicador global nulo, sem `NaN` (ORC-02, AC 5)
- [x] O consumo exibe o arredondamento sem correção de sobra: gasto 200 com limite 300 resulta em 66,67%, não 66,66%
**Tests**: unit
**Gate**: quick

#### T24: Valor efetivo de recorrência variável ✅ CONCLUÍDA
**What**: `resolverValorEfetivo(previsto, real)` e a marcação de sobrescrita manual, garantindo que confirmar o valor de um mês não vaze para nenhum outro.
**Where**: `src/domain/recorrencia/valor-efetivo.ts`
**Depends on**: T8
**Reuses**: `Cents` de T8
**Requirement**: REC-01
**Tools**: nenhuma
**Done when**:
- [x] Sem valor real confirmado, o efetivo é o previsto (REC-01, AC 1)
- [x] Com valor real confirmado, o efetivo é o real e o previsto original é preservado (REC-01, AC 1)
- [x] Confirmar o valor de uma competência não altera a estrutura de nenhuma outra competência (REC-01, AC 1)
- [x] Ocorrência marcada como sobrescrita é sinalizada para que a materialização não a altere (REC-01, AC 2)
**Tests**: unit
**Gate**: quick

#### T25: Projeção de comprometimento futuro ✅ CONCLUÍDA
**What**: `projetarProximosMeses` somando despesas não pagas de competências posteriores, **quebradas por competência**, nunca agregadas em número único.
**Where**: `src/domain/mes/projecao.ts`
**Depends on**: T21, T24
**Reuses**: a separação previsto/realizado de T21 e o valor efetivo de T24
**Requirement**: MOV-06
**Tools**: nenhuma
**Done when**:
- [x] O resultado é uma lista por competência, não um total agregado (MOV-06, AC 3)
- [x] Apenas despesas sem `pagoEm` de competências posteriores à corrente entram
- [x] Uma compra `8/10` cadastrada em março contribui para abril e maio, e para nenhum mês anterior
- [x] Recorrência sem competência de fim é projetada apenas dentro da janela limitada (REC-02, AC 5)
**Tests**: unit
**Gate**: quick

#### T26: Fechamento da API pública do núcleo ✅ CONCLUÍDA
**What**: Estender o barrel com as funções de agregação, orçamento, recorrência e projeção, e confirmar a cobertura de 100% de branches em todo `src/domain`.
**Where**: `src/domain/index.ts`
**Depends on**: T23, T25
**Reuses**: o barrel iniciado em T19
**Requirement**: DADO-01
**Tools**: nenhuma
**Done when**:
- [x] Cobertura de 100% de branches em todo `src/domain`
- [x] O teste de fronteira de T6 continua verde
- [x] `pnpm verify` sai com 0
- [x] **Marco:** todo o risco financeiro está coberto por testes puros que rodam em menos de 1 segundo
**Tests**: none
**Gate**: build

---

### Phase 4 — Persistência: schema e conexão

#### T27: Postgres local em Docker ✅ CONCLUÍDA
**What**: `docker-compose.yml` com Postgres e scripts `db:up`, `db:down` e `db:reset`, usando um banco de teste separado do de desenvolvimento.
**Where**: `docker-compose.yml`
**Depends on**: none
**Reuses**: nada
**Requirement**: DADO-02
**Tools**: Bash (`docker compose`)
**Done when**:
- [x] `pnpm db:up` sobe o contêiner e responde a `pg_isready`
- [x] `pnpm db:reset` recria o banco do zero
- [x] Nenhuma credencial real aparece no arquivo — apenas valores locais de desenvolvimento
**Tests**: none
**Gate**: build

#### T28: Schema Drizzle com as dez tabelas ✅ CONCLUÍDA
**What**: Declarar `usuario`, `meio_pagamento`, `categoria`, `orcamento_categoria`, `compra_parcelada`, `recorrencia`, `recorrencia_versao`, `movimento`, `fatura` e `pagamento_fatura`, com dinheiro em `bigint` centavos, competência `date` no dia 1, enums, `CHECK` condicionais e índices únicos do `design.md`.
**Where**: `src/infrastructure/db/schema.ts`
**Depends on**: T12
**Reuses**: os tipos de domínio de T12 como referência de forma — o schema **não** os importa
**Requirement**: MOV-01, MOV-02, DADO-02
**Tools**: Context7 MCP para a API atual de `check` e índices parciais no Drizzle
**Done when**:
- [x] `pagamento_fatura` **não possui** coluna `natureza` nem `categoria_id` (MOV-02, AC 2)
- [x] Toda coluna monetária tem sufixo `_centavos` e tipo `bigint`
- [x] `movimento` tem `UNIQUE (compra_id, numero_parcela)` e `UNIQUE (recorrencia_id, competencia)`
- [x] `CHECK` garante que origem `PARCELA` implica `compra_id` e `numero_parcela` preenchidos
- [x] `CHECK` garante competência sempre no dia 1
- [x] Colunas `origem_dado` e `origem_hash` existem, nullable, para o importador futuro
**Tests**: none
**Gate**: build

#### T29: Migration inicial aplicada em Postgres real ✅ CONCLUÍDA
**What**: Gerar a migration SQL a partir do schema, revisar o SQL, aplicá-la no contêiner e provar por teste de integração que as restrições rejeitam dado inválido.
**Where**: `drizzle/0000_init.sql`
**Depends on**: T28, T27
**Reuses**: o schema de T28 e o contêiner de T27
**Requirement**: MOV-01, DADO-02
**Tools**: Bash (`drizzle-kit generate`, `drizzle-kit migrate`)
**Done when**:
- [x] A migration aplica do zero num banco limpo, sem erro
- [x] Inserir duas parcelas com o mesmo `(compra_id, numero_parcela)` é rejeitado pelo banco
- [x] Inserir movimento com competência fora do dia 1 é rejeitado pelo `CHECK`
- [x] Inserir origem `PARCELA` sem `compra_id` é rejeitado pelo `CHECK`
- [x] O SQL foi revisado à mão, sem nenhum `DROP` não intencional
**Tests**: integration
**Gate**: full

#### T30: Cliente de conexão com o banco ✅ CONCLUÍDA
**What**: Cliente Drizzle lendo `DATABASE_URL` da configuração validada, com pool adequado a ambiente serverless e `sslmode` exigido fora de desenvolvimento.
**Where**: `src/infrastructure/db/client.ts`
**Depends on**: T29
**Reuses**: `env.ts` de T4
**Requirement**: AUTH-02, DADO-02
**Tools**: Context7 MCP para o driver serverless recomendado
**Done when**:
- [x] A conexão usa exclusivamente a configuração validada de T4, nunca `process.env` direto
- [x] Teste de integração abre conexão e executa `SELECT 1`
- [x] Nenhuma credencial aparece em log
**Tests**: integration
**Gate**: full

#### T31: Interfaces de repositório ✅ CONCLUÍDA
**What**: Declarar as ports `MovimentoRepository`, `CompraRepository` e `CadastroRepository` como interfaces puras, em termos de tipos de domínio — sem tipo do Drizzle atravessando a fronteira.
**Where**: `src/application/ports/repositories.ts`
**Depends on**: T12
**Reuses**: os tipos de domínio de T12
**Requirement**: DADO-01
**Tools**: nenhuma
**Done when**:
- [x] Nenhuma assinatura menciona tipo do Drizzle ou linha de banco
- [x] `CompraRepository` expõe `salvarComParcelas` recebendo o plano de domínio e a chave de idempotência
- [x] `pnpm verify` sai com 0
**Tests**: none
**Gate**: build

---

### Phase 5 — Persistência: repositórios

#### T32: Fakes em memória das ports ✅ CONCLUÍDA
**What**: Implementações em memória das três ports, para que os casos de uso sejam testáveis sem banco. Devem respeitar as mesmas restrições de unicidade do schema.
**Where**: `src/application/ports/fakes.ts`
**Depends on**: T31
**Reuses**: as interfaces de T31
**Requirement**: DADO-01
**Tools**: nenhuma
**Done when**:
- [x] O fake de compras rejeita duas parcelas com o mesmo par compra e número
- [x] O fake de compras devolve a compra existente quando a chave de idempotência se repete (PARC-05, AC 9)
- [x] Os fakes não dependem de nenhum módulo de infraestrutura
**Tests**: unit
**Gate**: quick

#### T33: Repositório de movimentos ✅ CONCLUÍDA
**What**: Implementar `MovimentoRepository` com leitura por competência e atualização de pagamento, mapeando linha do banco para tipo de domínio.
**Where**: `src/infrastructure/db/repositories/movimento.repository.ts`
**Depends on**: T30, T31
**Reuses**: o cliente de T30 e as interfaces de T31
**Requirement**: MOV-01, MOV-06
**Tools**: nenhuma
**Done when**:
- [x] Leitura por competência devolve apenas lançamentos daquele mês, não cancelados
- [x] Valores monetários voltam como inteiro em centavos, sem passar por ponto flutuante
- [x] O mapeamento não vaza tipo do Drizzle para a camada de aplicação
- [x] Teste de integração cobre mês vazio, mês com lançamentos e lançamento cancelado
**Tests**: integration
**Gate**: full

#### T34: Repositório de compras com escrita transacional ✅ CONCLUÍDA
**What**: `salvarComParcelas` gravando o plano e as N parcelas numa **única transação**, com assert de conservação antes do commit e tratamento de colisão de chave de idempotência.
**Where**: `src/infrastructure/db/repositories/compra.repository.ts`
**Depends on**: T33
**Reuses**: o mapeamento de T33 e o plano de domínio de T14
**Requirement**: PARC-05, MOV-01
**Tools**: nenhuma
**Done when**:
- [x] Teste de integração prova que **falha ao inserir a terceira parcela não deixa a compra órfã** no banco (PARC-05, AC 8)
- [x] Assert de conservação antes do commit reverte com `CONSERVACAO_VIOLADA` se a soma divergir
- [x] Reenvio com a mesma chave de idempotência devolve a compra existente e não altera a contagem de parcelas (PARC-05, AC 9)
- [x] Compra `8/10` grava 3 parcelas e zero linhas em competências anteriores (PARC-07, AC 3)
- [x] O caminho de corrida da idempotência é dirigido por teste determinístico: quando o pré-check não vê a compra concorrente, a colisão de chave é recuperada e devolve a compra existente (PARC-05, AC 9)
**Tests**: integration
**Gate**: full

#### T35: Repositório de cadastros ✅ CONCLUÍDA
**What**: Leitura e escrita de usuários, meios de pagamento e categorias, incluindo o filtro de arquivados nos seletores.
**Where**: `src/infrastructure/db/repositories/cadastro.repository.ts`
**Depends on**: T33
**Reuses**: o mapeamento de T33
**Requirement**: CART-03, DADO-02
**Tools**: nenhuma
**Done when**:
- [x] Meio de pagamento arquivado não aparece na listagem para nova compra (CART-03, AC 7)
- [x] Meio de pagamento arquivado continua resolvível por id, para exibir parcelas existentes (CART-03, AC 6)
- [x] Categoria arquivada não aparece nos formulários mas continua resolvível em relatórios
**Tests**: integration
**Gate**: full

#### T36: Seed sintético determinístico ✅ CONCLUÍDA
**What**: Popular o banco com dados **inventados** e reprodutíveis (PRNG com semente fixa, nomes genéricos), respeitando AD-009: nenhum valor financeiro real da família.
**Where**: `src/infrastructure/db/seed.ts`
**Depends on**: T35
**Reuses**: os repositórios de T33 e T35
**Requirement**: DADO-02
**Tools**: nenhuma
**Done when**:
- [x] Duas execuções com a mesma semente produzem exatamente os mesmos dados
- [x] Pessoas, cartões e descrições são genéricos, sem nome real e sem valor real da família (AD-009)
- [x] O seed inclui ao menos uma compra parcelada em andamento, para exercitar o caso `8/10`
- [x] Revisão confirma que nenhum valor do print da planilha aparece no arquivo
**Tests**: integration
**Gate**: full

#### T37: Composition root ✅ CONCLUÍDA
**What**: Um arquivo com funções fábrica ligando casos de uso aos repositórios concretos. Sem container de injeção de dependência.
**Where**: `src/infrastructure/container.ts`
**Depends on**: T34, T36
**Reuses**: todos os repositórios das tasks anteriores
**Requirement**: DADO-01
**Tools**: nenhuma
**Done when**:
- [x] Nenhuma biblioteca de injeção de dependência foi adicionada
- [x] Trocar um repositório concreto por um fake não exige alterar nenhum caso de uso
- [x] `pnpm verify` sai com 0
**Tests**: none
**Gate**: build

---
### Phase 6 — Autenticação e shell da aplicação

#### T38: Auth.js com Google e allowlist de e-mails ✅ CONCLUÍDA
**What**: Configurar Auth.js v5 com provider Google único e a função pura `emailPermitido(email, allowlist)`, testável isoladamente, que decide o acesso a partir de `EMAILS_PERMITIDOS`. Mais um provider de credenciais que **só existe em ambiente de teste**, atrás de duas condições e de uma guarda que lança em produção — é ele que destrava o e2e de autenticação sem credencial real do Google.
**Where**: `src/infrastructure/auth/auth.ts`
**Depends on**: T4
**Reuses**: a configuração validada de T4
**Requirement**: AUTH-01, AUTH-02
**Tools**: Context7 MCP para a API atual do Auth.js v5
**Done when**:
- [x] `emailPermitido` aceita e-mail da lista e rejeita qualquer outro, com comparação normalizada
- [x] O callback de sign-in nega acesso a e-mail fora da lista (AUTH-01, AC 2)
- [x] Nenhum segredo é exposto ao cliente (AUTH-02, AC 6)
- [x] Cookie de sessão configurado como `httpOnly`, `secure` e `sameSite=lax`
- [x] O provider de teste exige `NODE_ENV=test` **e** `AUTH_PROVIDER_DE_TESTE`, e a guarda lança se montado em produção
- [x] O provider de teste não pula a allowlist: quem decide acesso é o callback `signIn`, igual para todo provider
**Tests**: unit
**Gate**: quick

#### T39: Route handler de autenticação
**What**: Expor o handler do Auth.js na rota de autenticação, sem lógica própria.
**Where**: `src/app/api/auth/[...nextauth]/route.ts`
**Depends on**: T38
**Reuses**: a configuração de T38
**Requirement**: AUTH-01
**Tools**: nenhuma
**Done when**:
- [ ] O fluxo de login redireciona para o Google e retorna à aplicação
- [ ] O handler não contém nenhuma regra de autorização — ela vive em T38
**Tests**: none
**Gate**: build

#### T40: Middleware protegendo as rotas
**What**: Middleware exigindo sessão em tudo, exceto `/login`, `/api/auth/*` e `/api/health`.
**Where**: `src/middleware.ts`
**Depends on**: T38
**Reuses**: a sessão de T38
**Requirement**: AUTH-01
**Tools**: nenhuma
**Done when**:
- [ ] Acesso não autenticado a rota protegida redireciona para `/login` (AUTH-01, AC 1)
- [ ] `/login` e `/api/auth/*` permanecem acessíveis sem sessão
- [ ] O matcher é testado contra a lista de rotas públicas e protegidas
**Tests**: unit
**Gate**: quick

#### T41: Resolução de sessão para uso nas Server Actions
**What**: `requireSession()` devolvendo o usuário do banco a partir da sessão, para ser chamada na **primeira instrução** de toda Server Action — defesa em segunda camada, independente do middleware.
**Where**: `src/infrastructure/auth/sessao.ts`
**Depends on**: T38, T37
**Reuses**: o `CadastroRepository` de T35, via container de T37
**Requirement**: AUTH-01, AUTH-02
**Tools**: nenhuma
**Done when**:
- [ ] Sem sessão, `requireSession` rejeita e não devolve usuário (AUTH-02, AC 3)
- [ ] Com e-mail fora da allowlist, rejeita e **não cria registro de usuário** (AUTH-01, AC 2)
- [ ] Com sessão válida, devolve o usuário correspondente do banco
**Tests**: integration
**Gate**: full

#### T42: Tela de login
**What**: Página com botão de entrar com Google e mensagem explícita para e-mail não autorizado. Acessível, com contraste adequado.
**Where**: `src/app/login/page.tsx`
**Depends on**: T39, T40
**Reuses**: o handler de T39
**Requirement**: AUTH-01, UI-02
**Tools**: shadcn/ui para botão e alerta
**Done when**:
- [ ] O botão inicia o fluxo do Google
- [ ] E-mail não autorizado exibe mensagem clara, sem detalhe técnico
- [ ] A página funciona em viewport de 400 pixels sem rolagem horizontal (UI-03, AC 9)
**Tests**: none
**Gate**: build

#### T43: Formatação de apresentação em pt-BR
**What**: `formatarBRL(cents)` e `formatarData(iso)` usando `Intl`, isolados na camada de apresentação. **Única** fronteira onde centavos viram texto.
**Where**: `src/lib/formatar.ts`
**Depends on**: T8
**Reuses**: o tipo `Cents` de T8
**Requirement**: UI-01
**Tools**: nenhuma
**Done when**:
- [ ] 123456 centavos formata como `R$ 1.234,56`
- [ ] 5 centavos formata como `R$ 0,05`
- [ ] 0 centavos formata como `R$ 0,00`
- [ ] Datas formatam no padrão `dd/MM/yyyy`
- [ ] Nenhuma outra parte do código chama `toFixed` sobre valor monetário
**Tests**: unit
**Gate**: quick

#### T44: Seletor de competência
**What**: Componente de navegação entre meses, com botões de anterior e próximo e seleção direta de mês e ano, emitindo a competência no formato `AAAA-MM`.
**Where**: `src/components/seletor-competencia.tsx`
**Depends on**: T43
**Reuses**: `addMeses` de T10 e a formatação de T43
**Requirement**: UI-01
**Tools**: shadcn/ui
**Done when**:
- [ ] Avançar de `2026-12` leva a `2027-01` (UI-01, AC 2)
- [ ] Retroceder de `2026-01` leva a `2025-12`
- [ ] O rótulo exibe o nome do mês em português
- [ ] Navegação por teclado funciona e os controles têm rótulo acessível
**Tests**: unit
**Gate**: quick

#### T45: Shell da aplicação com rota por competência
**What**: Layout do grupo autenticado com o seletor no cabeçalho, rota `/[competencia]` com validação do parâmetro e redirecionamento da raiz para a competência corrente.
**Where**: `src/app/(app)/layout.tsx`
**Depends on**: T44, T41
**Reuses**: o seletor de T44 e `requireSession` de T41
**Requirement**: UI-01, UI-02
**Tools**: nenhuma
**Done when**:
- [ ] A raiz autenticada redireciona para `/AAAA-MM` da competência corrente (UI-01, AC 1)
- [ ] Competência malformada na URL resulta em página de não encontrado, sem erro não tratado (UI-02, AC 3)
- [ ] Navegar entre meses não exige nenhuma criação de estrutura prévia (UI-01, AC 2)
- [ ] O layout é responsivo e não gera rolagem horizontal em 400 pixels (UI-03, AC 9)
**Tests**: none
**Gate**: build

#### T46: Teste de ponta a ponta de autenticação
**What**: Fluxo e2e cobrindo acesso não autenticado, autenticação válida e e-mail fora da allowlist.
**Where**: `e2e/auth.spec.ts`
**Depends on**: T42, T45
**Reuses**: a tela de T42 e o shell de T45
**Requirement**: AUTH-01
**Tools**: Playwright, e o MCP do Playwright para depuração interativa
**Done when**:
- [ ] Não autenticado redireciona para `/login` (AUTH-01, AC 1)
- [ ] Autenticado cai na competência corrente
- [ ] E-mail fora da allowlist recebe 403 e a consulta ao banco confirma **zero** registros de usuário criados (AUTH-01, AC 2)
- [ ] `pnpm verify` sai com 0
**Tests**: e2e
**Gate**: build

---

### Phase 7 — Corte vertical mínimo

#### T47: Schema Zod da compra parcelada
**What**: Schema compartilhado entre cliente e servidor, cobrindo modo de entrada, valor, quantidade de parcelas, parcela inicial, competência, cartão, categoria e dono, com chave de idempotência.
**Where**: `src/application/schemas/compra.schema.ts`
**Depends on**: T12
**Reuses**: os tipos de domínio de T12
**Requirement**: PARC-05, AUTH-02
**Tools**: nenhuma
**Done when**:
- [ ] Quantidade de parcelas fora de 1 a 120 é rejeitada na validação (PARC-05, AC 6)
- [ ] Valor não positivo é rejeitado (PARC-05, AC 7)
- [ ] Competência fora do formato `AAAA-MM` é rejeitada
- [ ] O mesmo schema é importável pelo cliente e pelo servidor
**Tests**: unit
**Gate**: quick

#### T48: Caso de uso criar compra parcelada
**What**: Orquestrar validação, `gerarParcelas` do domínio e persistência transacional, devolvendo `Result`. Testado **sem banco**, com os fakes de T32.
**Where**: `src/application/compras/criar-compra-parcelada/handler.ts`
**Depends on**: T47, T32, T19
**Reuses**: `gerarParcelas` de T14 via barrel de T19; `CompraRepository` de T31; fakes de T32
**Requirement**: PARC-01, PARC-02, PARC-05, PARC-06, CART-03
**Tools**: nenhuma
**Done when**:
- [ ] R$ 1.000,00 em 3x com competência `2026-03` produz 3 parcelas com 33334, 33333 e 33333 nas competências `2026-03`, `2026-04` e `2026-05` (PARC-01, AC 1)
- [ ] Compra `8/10` produz 3 parcelas e zero lançamentos anteriores (PARC-06, AC 1 e AC 3)
- [ ] Cartão arquivado é rejeitado com `MEIO_PAGAMENTO_ARQUIVADO` (CART-03, AC 7)
- [ ] Chave de idempotência repetida devolve a compra existente sem duplicar parcelas (PARC-05, AC 9)
- [ ] Todos os testes rodam sem banco, no gate `quick`
**Tests**: unit
**Gate**: quick

#### T49: Server Action de compras
**What**: Server Action chamando `requireSession` na primeira instrução, revalidando o payload com Zod no servidor, invocando o caso de uso e devolvendo o envelope uniforme. Revalidação do cache da competência afetada e das seguintes.
**Where**: `src/app/actions/compras.ts`
**Depends on**: T48, T41
**Reuses**: `requireSession` de T41, o caso de uso de T48, o schema de T47
**Requirement**: AUTH-02, PARC-05
**Tools**: nenhuma
**Done when**:
- [ ] `requireSession` é a primeira instrução da action (AUTH-02, AC 3)
- [ ] O payload é revalidado no servidor mesmo com validação no cliente (AUTH-02, AC 4)
- [ ] Erro de domínio volta como `{ ok: false, erro: { code, mensagem } }`, nunca como exceção
- [ ] Erro inesperado devolve `ERRO_INESPERADO` com identificador de correlação, **sem stack trace** (UI-02, AC 8)
- [ ] Sucesso revalida a rota da competência da compra e das competências das parcelas
**Tests**: integration
**Gate**: full

#### T50: Formulário de compra com preview ao vivo
**What**: Formulário com react-hook-form e o schema de T47, exibindo **preview ao vivo das parcelas** calculado pela mesma função pura do domínio. Chave de idempotência gerada ao abrir o formulário.
**Where**: `src/components/form-compra.tsx`
**Depends on**: T49, T47
**Reuses**: `gerarParcelas` do barrel de T19 — a mesma função que persiste, garantindo que preview e gravação nunca divirjam
**Requirement**: PARC-01, PARC-04, PARC-06, UI-03
**Tools**: shadcn/ui, react-hook-form
**Done when**:
- [ ] Digitar R$ 1.000,00 e 3 parcelas exibe o preview `333,34 / 333,33 / 333,33` com as competências
- [ ] Alternar para modo valor da parcela recalcula o total (PARC-04, AC 4)
- [ ] Informar "já estou na parcela 8 de 10" exibe apenas as parcelas 8, 9 e 10 no preview (PARC-06)
- [ ] A chave de idempotência é gerada ao abrir, não ao submeter (PARC-05, AC 9)
- [ ] Estados de carregamento e erro são exibidos; o botão fica desabilitado durante o envio (UI-02, AC 7 e AC 8)
- [ ] O formulário é usável em viewport de 400 pixels (UI-03, AC 9)
**Tests**: none
**Gate**: build

#### T51: Caso de uso obter visão mensal
**What**: Ler os lançamentos da competência e produzir `ResumoMensal` pelas funções puras, devolvendo `competenciaView`, `caixaView` e `futuro` separados.
**Where**: `src/application/mes/obter-visao-mensal/handler.ts`
**Depends on**: T26, T33
**Reuses**: `resumoMensal` e `projetarProximosMeses` via barrel de T26; `MovimentoRepository` de T33
**Requirement**: MOV-03, MOV-05, UI-01
**Tools**: nenhuma
**Done when**:
- [ ] A resposta entrega os três objetos distintos, sem campo que some valores entre eles (MOV-03, AC 3)
- [ ] O saldo aplica `Entradas − Saídas − Investimentos` (MOV-05, AC 5)
- [ ] Mês sem lançamentos devolve estrutura válida com zeros, não erro (UI-02, AC 6)
- [ ] Testado com os fakes de T32, sem banco
**Tests**: unit
**Gate**: quick

#### T52: Lista de lançamentos responsiva
**What**: Componente que renderiza tabela no desktop e cartões empilhados no mobile, segmentando por origem em Fixos, Cartão de Crédito e Gastos do Mês, com identificação de parcela no formato `8/10`.
**Where**: `src/components/tabela-lancamentos.tsx`
**Depends on**: T43
**Reuses**: a formatação de T43
**Requirement**: UI-01, UI-03, PARC-08
**Tools**: shadcn/ui
**Done when**:
- [ ] Os três blocos de origem são exibidos separadamente (UI-01, AC 5)
- [ ] Parcela exibe `8/10` e a quantidade restante (PARC-08, AC 7)
- [ ] Em 400 pixels, renderiza cartões empilhados sem rolagem horizontal (UI-03, AC 9)
- [ ] Lista vazia exibe estado vazio explicativo, não tabela em branco (UI-02, AC 6)
**Tests**: none
**Gate**: build

#### T53: Página do mês
**What**: Página da competência com cabeçalho de saldo, os dois eixos **rotulados e visualmente separados**, a lista segmentada, o acesso ao formulário de compra e os estados de carregamento e erro.
**Where**: `src/app/(app)/[competencia]/page.tsx`
**Depends on**: T51, T52, T50
**Reuses**: o caso de uso de T51, a lista de T52, o formulário de T50, o shell de T45
**Requirement**: UI-01, UI-02, MOV-03
**Tools**: nenhuma
**Done when**:
- [ ] Total de Gastos e Saídas aparecem em blocos separados, cada um com o selo do seu eixo (UI-01, AC 4)
- [ ] Os dois números nunca aparecem no mesmo card e nada na tela os subtrai (MOV-03)
- [ ] Estado de carregamento é exibido durante a busca (UI-02, AC 7)
- [ ] Falha de leitura exibe estado de erro com identificador de correlação, sem stack trace (UI-02, AC 8)
- [ ] `pnpm verify` sai com 0
**Tests**: none
**Gate**: build

#### T54: Teste de ponta a ponta da compra parcelada
**What**: O fluxo que prova que a dor central foi resolvida: cadastrar uma compra parcelada e encontrar as parcelas nos meses seguintes sem nenhuma ação adicional.
**Where**: `e2e/compra-parcelada.spec.ts`
**Depends on**: T53
**Reuses**: a página de T53 e o formulário de T50
**Requirement**: PARC-01, PARC-06, COMP-01
**Tools**: Playwright, e o MCP do Playwright para depuração interativa
**Done when**:
- [ ] Cadastrar R$ 1.000,00 em 3x na competência `2026-03` e ver a parcela 1/3 com R$ 333,34 em março
- [ ] Navegar para `/2026-04` **sem nenhuma ação adicional** e encontrar a parcela 2/3 com R$ 333,33 (PARC-01, AC 1)
- [ ] Navegar para `/2026-05` e encontrar a parcela 3/3 com R$ 333,33
- [ ] Cadastrar uma compra `8/10` e confirmar 3 parcelas, sem nenhum lançamento em competências anteriores (PARC-06, AC 3)
- [ ] Cadastrar uma compra em `2026-12` em 3x e confirmar parcelas em `2026-12`, `2027-01` e `2027-02` (COMP-01)
- [ ] `pnpm verify` sai com 0 e `pnpm test:e2e` passa

**Tests**: e2e
**Gate**: build

---

## Task Granularity Check

| Verificação | Resultado |
| --- | --- |
| Toda task nomeia **um** arquivo principal em `Where` | ✅ 54 de 54 |
| Toda task declara `Tests` e `Gate` | ✅ 54 de 54 |
| Nenhuma fase ultrapassa 10 tasks | ✅ máximo 9 (Fase 6) |
| Toda task é commitável isoladamente | ✅ nenhuma deixa o repositório sem compilar |
| Tasks com `Tests: none` correspondem às linhas "none" da Test Coverage Matrix | ✅ 17 tasks: scaffold, configuração, CI, schema, migration-free wiring, barrels, ports e componentes de apresentação (T1, T2, T3, T7, T12, T19, T26, T27, T28, T31, T37, T39, T42, T45, T50, T52, T53) |

## Diagram-Definition Cross-Check

| Fase | Arestas no diagrama | `Depends on` intra-fase | Paridade |
| --- | --- | --- | --- |
| 0 | 8 | 8 | ✅ |
| 1 | 4 | 4 | ✅ |
| 2 | 7 | 7 | ✅ |
| 3 | 7 | 7 | ✅ |
| 4 | 3 | 3 | ✅ (T31 sem dependência intra-fase) |
| 5 | 5 | 5 | ✅ (T32 sem dependência intra-fase) |
| 6 | 10 | 10 | ✅ |
| 7 | 8 | 8 | ✅ |

Dependências entre fases apontam sempre para trás e são validadas pela checagem de fase do `validate_tasks.py`.

## Test Co-location Validation

| Camada | Testes ficam | Confere |
| --- | --- | --- |
| `src/domain/**` | `*.test.ts` ao lado do módulo, na mesma task | ✅ |
| `src/application/**` | `*.test.ts` ao lado do handler, na mesma task | ✅ |
| `src/infrastructure/db/repositories/**` | `*.integration.test.ts` ao lado do repositório, na mesma task | ✅ |
| `e2e/**` | arquivo dedicado por fluxo, em task própria (T46, T54) | ✅ |
