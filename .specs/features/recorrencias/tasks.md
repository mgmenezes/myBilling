# Recorrências — Tasks

**Spec**: `.specs/features/recorrencias/spec.md`
**Total**: 22 tasks em 6 fases

> **Por que o núcleo puro vem antes de tudo.** As três decisões que podem estar erradas — qual versão
> vale para uma competência, quais competências precisam existir, e o que protege uma ocorrência de
> ser reescrita — são funções puras. Elas são construídas e provadas antes de existir repositório,
> action ou tela, porque é nelas que mora o risco do produto e é onde o erro é mais barato.

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

**Blast radius:** a aprovação destas tasks autoriza implementação e commits **locais**. `git push`, deploy e qualquer operação remota exigem autorização explícita e separada.

---

## Test Coverage Matrix

| Camada de código | Tipo de teste | Expectativa de cobertura | Padrão de localização | Comando |
| --- | --- | --- | --- | --- |
| `src/domain/recorrencia/**` | unit | **100% de branches**; 1:1 com os ACs do spec | `src/domain/**/*.test.ts` | `pnpm test:unit` |
| `src/application/**` | unit | Todos os ramos, com fakes em memória; sem banco | `src/application/**/*.test.ts` | `pnpm test:unit` |
| `src/infrastructure/db/repositories/**` | integration | Consultas, conflito de unicidade, e o que a escrita **não** toca | `src/infrastructure/**/*.integration.test.ts` | `pnpm test:integration` |
| `src/app/actions/**` | integration | Happy path, validação e não-autenticado | `src/app/**/*.integration.test.ts` | `pnpm test:integration` |
| `src/components/**` | componentes | Estados visíveis, rótulo acessível e o que a interface impede | `src/components/*.test.tsx` | `pnpm test:unit` |
| Fluxos de usuário | e2e | O ciclo completo: cadastrar, navegar, mudar valor, confirmar, encerrar | `e2e/*.spec.ts` | `pnpm test:e2e` |
| Rota, navegação e composição de página | **none** | Cobertos pelo gate de build e, indiretamente, por e2e | — | — |

> As tasks marcadas `Tests: none` são exatamente as da última linha desta matriz. Nenhuma task de domínio, aplicação ou repositório pode declarar `none`.

---

## Gate Check Commands

| Gate | Quando | Comando |
| --- | --- | --- |
| `quick` | task só com teste unitário ou de componente | `pnpm test:unit` |
| `full` | task com teste de integração | `pnpm test:unit && pnpm test:integration` |
| `build` | última task da fase, task sem teste, ou task com e2e | `pnpm verify` |

Pré-requisito dos gates `full` e `build`: `pnpm db:up` (Postgres em Docker, AD-010).

---

## Execution Plan

Seis fases sequenciais. O núcleo puro é construído e provado antes de existir banco ou tela.

### Phase 0 — Núcleo puro: vigência, janela e proteção

```
T1 -> T4
T2 -> T4
T3 -> T4
```

### Phase 1 — Ports e repositórios

```
T4 -> T5 -> T6
T5 -> T7
T6 -> T8
```

### Phase 2 — Casos de uso

```
T7 -> T9
T5 -> T10 -> T11
T7 -> T11
T8 -> T12
T8 -> T13
```

### Phase 3 — Borda: schema, actions e materialização na leitura

```
T10 -> T14 -> T15
T11 -> T15
T13 -> T15
T9 -> T16
```

### Phase 4 — Interface

```
T15 -> T17 -> T18 -> T19
T12 -> T20
T16 -> T20
```

### Phase 5 — Fechamento

```
T19 -> T21
T20 -> T21
T21 -> T22
```

---

## Task Breakdown

> **Sobre os avisos de granularidade do validador.** Nove tasks tocam mais de um arquivo, e o
> validador sinaliza isso. Em todas elas os arquivos **mudam juntos por necessidade**, não por
> conveniência: um método novo na port não compila sem o Drizzle e o fake que o implementam, e uma
> action não existe sem o código de erro que ela devolve. Dividir produziria commits que não
> compilam, o que é pior que a granularidade grossa. Onde a divisão era real — repositório de
> recorrência separado do de movimento, criar separado de mudar vigência — ela foi feita.


### Phase 0 — Núcleo puro

#### T1: Versão vigente para uma competência ✅ CONCLUÍDA
**What**: Função pura que escolhe, entre as versões de uma recorrência, a de **maior vigência que não seja posterior** à competência pedida. Devolve `null` quando nenhuma vigência alcança a competência — é o que impede uma recorrência de existir antes de começar.
**Where**: `src/domain/recorrencia/versao-vigente.ts`, exportada em `src/domain/index.ts`
**Depends on**: nenhuma
**Reuses**: `compararCompetencias` de `src/domain/shared/competencia.ts`
**Requirement**: FIXO-03
**Tools**: nenhuma
**Done when**:
- [x] Com uma versão só, toda competência a partir da vigência recebe aquela versão
- [x] Com duas versões, a competência anterior à segunda vigência recebe a primeira, e a igual ou posterior recebe a segunda
- [x] Competência anterior a toda vigência devolve `null`
- [x] Lista vazia devolve `null`
- [x] A ordem de entrada das versões não altera o resultado
**Tests**: unit
**Gate**: quick

#### T2: Competências que a materialização deve cobrir ✅ CONCLUÍDA
**What**: Função pura que recebe início, fim opcional e uma janela `[de, ate]`, e devolve quais competências da janela precisam existir. Concentra as três condições de borda num lugar só.

> **Corrigida durante a execução.** A versão original recebia também uma competência de encerramento. O banco não tem essa coluna: `encerrada_em` é timestamp. Encerrar passou a gravar `competencia_fim` na competência anterior, o parâmetro extra nasceria sempre nulo, e foi removido junto com seus testes. O off-by-one da tradução mora no caso de uso de encerrar (T13), com teste lá.
**Where**: `src/domain/recorrencia/janela-materializacao.ts`, exportada em `src/domain/index.ts`
**Depends on**: nenhuma
**Reuses**: `rangeCompetencias` e `compararCompetencias`
**Requirement**: FIXO-01, FIXO-02
**Tools**: nenhuma
**Done when**:
- [x] Competência anterior ao início não entra
- [x] Competência posterior ao fim não entra, e fim `null` não limita
- [x] Janela inteiramente fora do período devolve lista vazia
- [x] Janela invertida (`ate` anterior a `de`) devolve lista vazia
**Tests**: unit
**Gate**: quick

#### T3: Ocorrência protegida da materialização ✅ CONCLUÍDA
**What**: Predicado puro: uma ocorrência já materializada não pode ser reescrita quando está **paga** ou quando seu valor **difere do previsto**. São os dois sinais de que alguém tocou nela.

> **Quem chama este predicado.** A proteção acontece no `WHERE` de um `UPDATE` (T7), e não em
> memória — carregar todas as ocorrências para filtrá-las em TypeScript seria desperdício. Então
> esta função existe como **especificação executável**: T7 tem um teste de concordância que alimenta
> os mesmos casos nos dois caminhos e exige o mesmo veredito. Sem esse teste ela seria domínio sem
> chamador, que é exatamente a dívida que o roadmap deste projeto rastreia.
**Where**: `src/domain/recorrencia/ocorrencia-protegida.ts`, exportada em `src/domain/index.ts`
**Depends on**: nenhuma
**Reuses**: nenhum
**Requirement**: FIXO-02, FIXO-03
**Tools**: nenhuma
**Done when**:
- [x] Ocorrência paga é protegida, mesmo com valor igual ao previsto
- [x] Ocorrência não paga com valor diferente do previsto é protegida
- [x] Ocorrência não paga com valor igual ao previsto **não** é protegida
- [x] Comentário no arquivo registra que confirmar exatamente o valor previsto é indistinguível de não confirmar, e que isso é aceito porque o número resultante é o mesmo
- [x] Comentário registra que o chamador é o teste de concordância de T7, e não código de produção
**Tests**: unit
**Gate**: quick

#### T4: Fechar a fase com 100% de branches no módulo novo ✅ CONCLUÍDA
**What**: Rodar cobertura e fechar qualquer ramo descoberto em `src/domain/recorrencia/**`, sem enfraquecer assertion. Conferir que `arquitetura.test.ts` segue verde: o módulo novo não pode importar nada de fora do domínio.
**Where**: `src/domain/recorrencia/**`
**Depends on**: T1, T2, T3
**Reuses**: o gate de cobertura já configurado em `vitest.config.ts`
**Requirement**: FIXO-01, FIXO-02, FIXO-03
**Tools**: nenhuma
**Done when**:
- [ ] `pnpm test:unit` reporta 100% de branches em `src/domain`
- [ ] `arquitetura.test.ts` passa sem alteração
**Tests**: unit
**Gate**: build

### Phase 1 — Ports e repositórios

#### T5: Port de recorrência e fake em memória ✅ CONCLUÍDA
**What**: `RecorrenciaRepository` em termos de tipo de domínio, com `listarComVersoes()`, `criar()`, `registrarVersao()` e `encerrar()`. Fake em memória correspondente, para os casos de uso da fase 2 rodarem sem banco.
**Where**: `src/application/ports/repositories.ts`, `src/application/ports/fakes.ts`
**Depends on**: T4
**Reuses**: o padrão de `EstadoEmMemoria` já usado pelos outros fakes
**Requirement**: FIXO-01, FIXO-03, FIXO-06
**Tools**: nenhuma
**Done when**:
- [x] Nenhuma assinatura da port menciona Drizzle, `Pool` ou linha de banco (AD-006)
- [x] O fake devolve as versões junto da recorrência, ordenadas por vigência
- [x] `encerrar` no fake grava a competência de encerramento sem apagar a recorrência
**Tests**: unit
**Gate**: quick

#### T6: Repositório Drizzle de recorrência ✅ CONCLUÍDA
**What**: Implementação concreta da port. `listarComVersoes` faz uma consulta com join, não N+1. `criar` grava recorrência e versão inicial **em transação**: recorrência sem versão é um estado que não pode existir.
**Where**: `src/infrastructure/db/repositories/recorrencia.repository.ts`
**Depends on**: T5
**Reuses**: `paraLancamento` e os mapeadores de `repositories/mapeadores.ts`
**Requirement**: FIXO-01, FIXO-03, FIXO-06
**Tools**: Postgres em Docker, `drizzle-kit`

> **Migration não prevista.** O critério de atomicidade não era demonstrável: `recorrencia_versao.valor_previsto_centavos` não tinha `CHECK` de positividade, e sem ele `criar` não tinha como falhar na segunda inserção — a transação era proteção infalsificável. `drizzle/0001_valor_previsto_positivo.sql` fecha o buraco, alinhando a tabela com as irmãs, que já tinham a restrição.
**Done when**:
- [x] Criar grava recorrência e versão inicial, e falha na versão reverte a recorrência
- [x] `listarComVersoes` devolve as versões ordenadas por vigência
- [x] Registrar versão com vigência já existente **substitui** o valor, e não cria uma segunda linha (FIXO-03, AC 4)
- [x] Recorrência encerrada continua aparecendo em `listarComVersoes`, marcada como encerrada
**Tests**: integration
**Gate**: full

#### T7: Escrita de ocorrência no repositório de movimento ✅ CONCLUÍDA
**What**: `MovimentoRepository` ganha `materializarOcorrencias(ocorrencias)`, que insere com `ON CONFLICT DO NOTHING` sobre `movimento_recorrencia_competencia_uq`, e `atualizarPrevistoNaoProtegido(recorrenciaId, desde, valor)`. Drizzle e fake.
**Where**: `src/infrastructure/db/repositories/movimento.repository.ts`, `src/application/ports/repositories.ts`, `src/application/ports/fakes.ts`
**Depends on**: T5
**Reuses**: o índice único já migrado
**Requirement**: FIXO-02, FIXO-03
**Tools**: Postgres em Docker
**Done when**:
- [x] Materializar a mesma competência duas vezes deixa exatamente uma linha
- [x] Materializar não lança em conflito
- [x] `atualizarPrevistoNaoProtegido` altera só as ocorrências não pagas e com valor igual ao previsto
- [x] Ocorrência paga e ocorrência com valor confirmado sobrevivem intactas à atualização
- [x] O fake se comporta igual ao Drizzle nos quatro pontos acima
- [x] **Teste de concordância**: os mesmos casos passados por `ocorrenciaProtegida` (T3) e pelo `WHERE` do `UPDATE` produzem o mesmo veredito. É este teste que impede o SQL e a definição de divergirem
**Tests**: integration
**Gate**: full

#### T8: Confirmação de valor e remoção de ocorrência no repositório ✅ CONCLUÍDA
**What**: `confirmarValorReal(id, valorCentavos)` grava o valor efetivo preservando `valor_previsto_centavos`, e `removerNaoPagasDaRecorrencia(recorrenciaId, desde)` apaga só o que não foi pago. Drizzle e fake.
**Where**: `src/infrastructure/db/repositories/movimento.repository.ts`, `src/application/ports/repositories.ts`, `src/application/ports/fakes.ts`
**Depends on**: T6
**Reuses**: nenhum
**Requirement**: FIXO-04, FIXO-06
**Tools**: Postgres em Docker
**Done when**:
- [ ] Confirmar altera `valor_centavos` e **não** altera `valor_previsto_centavos`
- [ ] Confirmar numa competência não altera nenhuma outra da mesma recorrência
- [ ] Remover apaga as não pagas da competência em diante e preserva as pagas
- [ ] Remover não toca em ocorrência de outra recorrência
**Tests**: integration
**Gate**: full

### Phase 2 — Casos de uso

#### T9: Materializar a janela ✅ CONCLUÍDA
**What**: Caso de uso que recebe a competência visível e o tamanho da janela, resolve para cada recorrência ativa quais competências faltam e qual versão vale em cada uma, e grava. Usa T1, T2 e T7. **Não decide nada por conta própria** — as três decisões vêm do domínio.
**Where**: `src/application/recorrencias/materializar/handler.ts`
**Depends on**: T7
**Reuses**: `versaoVigente`, `janelaMaterializacao`, `diaEfetivo`
**Requirement**: FIXO-01, FIXO-02, FIXO-05
**Tools**: nenhuma
**Done when**:
- [x] A janela cobre a competência visível e `MESES_DE_PROJECAO` meses à frente (FIXO-05, AC 2)
- [x] Recorrência sem versão vigente para uma competência não gera ocorrência nela
- [x] A data de evento usa o dia de vencimento reduzido ao último dia do mês quando ele não existe (FIXO-01, AC 5)
- [x] Recorrência de natureza receita gera lançamento de receita (FIXO-01, AC 6)
- [x] Rodar duas vezes não muda nada
**Tests**: unit
**Gate**: quick

#### T10: Criar recorrência ✅ CONCLUÍDA
**What**: Caso de uso que valida referências (categoria, meio, pessoa existem) e grava recorrência mais versão inicial vigente na competência de início.
**Where**: `src/application/recorrencias/criar-recorrencia/handler.ts`
**Depends on**: T5
**Reuses**: `CadastroRepository` para resolver as referências
**Requirement**: FIXO-01
**Tools**: nenhuma
**Done when**:
- [x] Grava recorrência e versão inicial numa chamada (FIXO-01, AC 1)
- [x] Meio de pagamento inexistente devolve `MEIO_PAGAMENTO_NAO_ENCONTRADO`
- [x] Meio de pagamento arquivado devolve `MEIO_PAGAMENTO_ARQUIVADO`
- [x] Competência de fim anterior à de início é rejeitada
**Tests**: unit
**Gate**: quick

#### T11: Registrar nova vigência ✅ CONCLUÍDA
**What**: Caso de uso que grava a versão nova e propaga para as ocorrências já materializadas **não protegidas** da vigência em diante.
**Where**: `src/application/recorrencias/registrar-versao/handler.ts`
**Depends on**: T10, T7
**Reuses**: `ocorrenciaProtegida` de T3, via `atualizarPrevistoNaoProtegido`
**Requirement**: FIXO-03
**Tools**: nenhuma
**Done when**:
- [x] Ocorrência de competência anterior à vigência não é alterada (FIXO-03, AC 1)
- [x] Ocorrência da vigência em diante, não protegida, passa a valer o valor novo (FIXO-03, AC 3)
- [x] Ocorrência paga e ocorrência com valor confirmado não são alteradas
- [x] Vigência já existente substitui o valor em vez de duplicar (FIXO-03, AC 4)
**Tests**: unit
**Gate**: quick

#### T12: Confirmar valor real ✅ CONCLUÍDA
**What**: Caso de uso que confirma o valor de **uma** ocorrência. Verifica existência antes, como `marcar-pagamento` faz, porque a escrita é silenciosa para id inexistente.
**Where**: `src/application/mes/confirmar-valor/handler.ts`
**Depends on**: T8
**Reuses**: nenhum

> **`resolverValorEfetivo` não ganhou chamador aqui, ao contrário do que a task previa.** A tentação era grande — ela está sem chamador desde a fase 3 do MVP —, mas o lugar dela é a **leitura**: decidir qual valor vale ao exibir uma ocorrência. Chamá-la na escrita para conferir o que acabou de ser gravado seria encenação, com uma condição que nunca falha. Ela ganha chamador de verdade em T20.
**Requirement**: FIXO-04
**Tools**: nenhuma
**Done when**:
- [x] O valor confirmado passa a valer e o previsto é preservado (FIXO-04, AC 1)
- [x] Nenhuma outra competência da mesma recorrência muda (FIXO-04, AC 2)
- [x] Id inexistente devolve `LANCAMENTO_NAO_ENCONTRADO` em vez de confirmar em silêncio
- [x] Valor não positivo é rejeitado
**Tests**: unit
**Gate**: quick

#### T13: Encerrar recorrência
**What**: Caso de uso que marca o encerramento e remove as ocorrências não pagas da competência em diante.
**Where**: `src/application/recorrencias/encerrar/handler.ts`
**Depends on**: T8
**Reuses**: `removerNaoPagasDaRecorrencia` de T8
**Requirement**: FIXO-06
**Tools**: nenhuma
**Done when**:
- [ ] Encerrar a partir de maio grava fim em **abril**: o off-by-one da tradução tem teste próprio
- [ ] Ocorrências pagas da competência em diante sobrevivem (FIXO-06, AC 2)
- [ ] Ocorrências não pagas da competência em diante são removidas
- [ ] Competências anteriores ao encerramento não são tocadas
- [ ] Encerrar duas vezes é inofensivo
**Tests**: unit
**Gate**: build

### Phase 3 — Borda

#### T14: Schema de entrada da recorrência
**What**: Schema Zod compartilhado entre cliente e servidor, com natureza, descrição, dia de vencimento (1 a 31), competência de início, competência de fim opcional e valor previsto.
**Where**: `src/application/schemas/recorrencia.schema.ts`
**Depends on**: T10
**Reuses**: `criarNomeSchema` de `src/application/schemas/nome.ts`
**Requirement**: FIXO-01
**Tools**: nenhuma
**Done when**:
- [ ] Dia de vencimento fora de 1 a 31 é rejeitado, e dia fracionário também
- [ ] Competência fora de `AAAA-MM` é rejeitada
- [ ] Valor não positivo é rejeitado
- [ ] Fim ausente é aceito e significa sem fim
**Tests**: unit
**Gate**: quick

#### T15: Server Actions de recorrência
**What**: `criarRecorrencia`, `registrarNovaVigencia` e `encerrarRecorrencia`. `requireSession()` na primeira instrução, payload revalidado no servidor com o schema de T14, envelope `ResultadoAction`, e revalidação das **três** rotas afetadas: painel, lançamentos e a área Fixos.
**Where**: `src/app/actions/recorrencias.ts`, `src/lib/erros.ts`
**Depends on**: T14, T11, T13
**Reuses**: o padrão de `src/app/actions/categorias.ts`
**Requirement**: FIXO-01, FIXO-03, FIXO-06
**Tools**: Postgres em Docker
**Done when**:
- [ ] Não autenticado devolve `NAO_AUTENTICADO` sem tocar no banco
- [ ] Payload inválido devolve `VALIDACAO` endereçado ao campo
- [ ] Falha não prevista devolve `ERRO_INESPERADO` com identificador de correlação, sem stack trace
- [ ] As três rotas são revalidadas
**Tests**: integration
**Gate**: full

#### T16: Materializar ao abrir o mês
**What**: Chamar a materialização antes da leitura, nas duas páginas que mostram lançamentos do mês. É o ponto que a spec registra como decisão discutível: um GET que escreve, tornado seguro pelo índice único.
**Where**: `src/app/(app)/[competencia]/page.tsx`, `src/app/(app)/[competencia]/lancamentos/page.tsx`
**Depends on**: T9
**Reuses**: `criarRepositorios` do container
**Requirement**: FIXO-01, FIXO-02, FIXO-05
**Tools**: Postgres em Docker
**Done when**:
- [ ] Abrir um mês cria as ocorrências faltantes da janela
- [ ] Abrir o mesmo mês três vezes mantém uma ocorrência por competência (FIXO-02, AC 1)
- [ ] Duas aberturas concorrentes não falham por conflito (FIXO-02, AC 2)
- [ ] A régua de comprometimento futuro passa a incluir os fixos (FIXO-05, AC 1)
**Tests**: integration
**Gate**: full

### Phase 4 — Interface

#### T17: Área "Fixos" na navegação
**What**: Rota `/[competencia]/fixos`, entrada na navegação principal e listagem das recorrências com o valor vigente na competência aberta. Encerrada aparece marcada, não oculta.
**Where**: `src/app/(app)/[competencia]/fixos/page.tsx`, `src/components/navegacao-principal.tsx`
**Depends on**: T15
**Reuses**: o padrão de área já usado por Lançamentos
**Requirement**: FIXO-01, FIXO-06
**Tools**: nenhuma
**Done when**:
- [ ] A área aparece na navegação nas duas larguras, seguindo NAV-03
- [ ] A lista mostra o valor **vigente naquela competência**, não o mais recente
- [ ] Recorrência encerrada é exibida como encerrada (FIXO-06, AC 3)
- [ ] Em 400 pixels nada rola na horizontal
**Tests**: none
**Gate**: build

#### T18: Formulário de nova recorrência
**What**: Formulário na área Fixos, com natureza, descrição, valor, dia de vencimento, competências de início e fim, categoria, meio e pessoa. Reusa `CadastroInline` para criar categoria e meio sem sair dali.
**Where**: `src/components/form-recorrencia.tsx`
**Depends on**: T17
**Reuses**: `CadastroInline`, e as actions de categoria e meio de pagamento
**Requirement**: FIXO-01
**Tools**: nenhuma
**Done when**:
- [ ] Natureza receita e despesa são ambas oferecidas
- [ ] Erro do servidor aparece endereçado ao campo, e o formulário não se perde
- [ ] Criar limpa o formulário e a recorrência nova aparece na lista
**Tests**: componentes
**Gate**: quick

#### T19: Mudar valor e encerrar, na área Fixos
**What**: Dois controles por recorrência: registrar novo valor a partir de uma competência, e encerrar a partir de uma competência. Ambos pedem a competência, porque é ela que dá sentido à operação.
**Where**: `src/components/form-recorrencia.tsx`, `src/app/(app)/[competencia]/fixos/page.tsx`
**Depends on**: T18
**Reuses**: `CadastroInline` para o padrão de abrir campo sem sair da tela
**Requirement**: FIXO-03, FIXO-06
**Tools**: nenhuma
**Done when**:
- [ ] Mudar valor exige a competência de vigência e a pré-preenche com a competência aberta
- [ ] Encerrar pede confirmação, porque remove ocorrências futuras
- [ ] A lista reflete o valor novo sem recarregar a página
**Tests**: componentes
**Gate**: quick

#### T20: Confirmar o valor real na linha da lista
**What**: No bloco Fixos da lista, o valor vira um controle que abre um campo para escrever o valor real. Fica ao lado do selo-botão de pago, porque confirmar e marcar pago são o mesmo gesto.
**Where**: `src/components/valor-confirmavel.tsx`, `src/components/tabela-lancamentos.tsx`, `src/app/actions/pagamentos.ts`
**Depends on**: T12, T16
**Reuses**: o padrão de estado otimista de `BotaoPago`
**Requirement**: FIXO-04
**Tools**: nenhuma
**Done when**:
- [ ] Só ocorrência de recorrência é confirmável; parcela e avulso não
- [ ] Valor confirmado é indicado de forma que não dependa só de cor (FIXO-04, AC 3)
- [ ] O previsto continua visível ao lado do confirmado
- [ ] Cancelar não grava nada
**Tests**: componentes
**Gate**: build

### Phase 5 — Fechamento

#### T21: E2E do ciclo completo
**What**: Um fluxo que percorre a feature inteira: cadastrar água com valor previsto, navegar três meses e achar a ocorrência em cada, registrar valor novo a partir do terceiro, conferir que os dois primeiros não mudaram, confirmar o valor real de um, e encerrar.
**Where**: `e2e/recorrencias.spec.ts`
**Depends on**: T19, T20
**Reuses**: o harness de `e2e/compra-parcelada.spec.ts`
**Requirement**: FIXO-01, FIXO-03, FIXO-04, FIXO-06
**Tools**: Postgres em Docker, Chrome do sistema
**Done when**:
- [ ] O teste assere **valores**, não só presença de elemento
- [ ] O indicador do painel muda ao confirmar o valor real
- [ ] Encerrar remove as ocorrências futuras e preserva as pagas
**Tests**: e2e
**Gate**: build

#### T22: Seed, roadmap e handoff
**What**: O seed ganha uma recorrência de despesa e uma de receita, para o ambiente de desenvolvimento exercitar o bloco Fixos e o indicador de receitas. Roadmap e handoff passam a refletir a fatia entregue.
**Where**: `src/infrastructure/db/seed.ts`, `docs/roadmap.md`, `.specs/HANDOFF.md`, `.specs/STATE.md`
**Depends on**: T21
**Reuses**: a competência-base do seed, para as recorrências acompanharem o relógio
**Requirement**: FIXO-01
**Tools**: Postgres em Docker
**Done when**:
- [ ] O seed continua determinístico: mesma semente e mesma base, mesmos dados
- [ ] Nenhum valor ou nome real da família entra no seed (AD-009)
- [ ] `resolverValorEfetivo` e `confirmarValorReal` saem da lista de domínio sem chamador
- [ ] `pnpm verify` em 0 e e2e verde
**Tests**: integration
**Gate**: build
