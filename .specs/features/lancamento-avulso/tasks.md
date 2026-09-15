# Lançamento avulso e entradas — Tasks

**Spec**: `.specs/features/lancamento-avulso/spec.md`
**Design**: `.specs/features/lancamento-avulso/design.md`
**Status**: Draft
**Total**: 28 tasks em 7 fases

> **Por que a cascata vem antes de tudo.** O risco desta fatia não é gravar uma linha: é o painel e a
> lista discordarem sobre o que é "cartão". Essa decisão é uma função pura, e ela é construída e
> provada — com teste de concordância — antes de existir formulário, action ou repositório.

---

## Execution Protocol (MANDATORY -- do not skip)

Implementar com a skill `tlc-spec-driven`, ativada pelo nome. Para cada task, nesta ordem:

1. **Pré-implementação** — declarar premissas, arquivos a tocar e critério de sucesso.
2. **Escrever os testes primeiro**, derivados dos acceptance criteria do `spec.md`. Os testes asseram o resultado definido no spec, nunca espelham a implementação.
3. **Implementar** até os testes passarem.
4. **Gate Check** — rodar o comando do nível declarado na task. O test runner decide, não auto-avaliação.
5. **Test Adequacy Review** (A suficiente / B não-raso / C necessário / D conformidade). Cada critério coberto cita `file:line` **e** reproduz a expressão da assertion. Sem citação localizada, o critério conta como **não coberto**.
6. **Marcar a task como concluída** neste arquivo e atualizar a traceability no `spec.md`, **antes** do commit e **dentro** do mesmo commit.
7. **Um commit atômico** em Conventional Commits, validado por `check_commit.py`.

Proibições absolutas: commitar antes do gate passar · enfraquecer, pular ou deletar teste para passar · agrupar tasks em um commit · "já que estou aqui" · marcar critério coberto sem citação `file:line`.

**Blast radius:** a aprovação destas tasks autoriza implementação e commits **locais**. `git push`, deploy, provisionamento em nuvem e qualquer operação remota exigem autorização explícita e separada.

---

## Test Coverage Matrix

> Gerada da matriz da fatia anterior, confirmada contra `AGENTS.md` (seção Testes) e `vitest.config.ts`. Guidelines encontradas: `AGENTS.md`, `vitest.config.ts`, `playwright.config.ts`, `.github/workflows/ci.yml`.

| Camada de código | Tipo de teste | Expectativa de cobertura | Padrão de localização | Comando |
| --- | --- | --- | --- | --- |
| `src/domain/**` | unit | **100% de branches**; 1:1 com os ACs do spec; todo edge case listado | `src/domain/**/*.test.ts` | `pnpm test:unit` |
| `src/application/**` | unit | Todos os ramos, com fakes em memória; sem banco | `src/application/**/*.test.ts` | `pnpm test:unit` |
| `src/infrastructure/db/repositories/**` | integration | Consultas, restrições do banco, e o que a escrita **não** toca | `src/infrastructure/**/*.integration.test.ts` | `pnpm test:integration` |
| `src/app/actions/**` | integration | Happy path, cada ramo de validação e não-autenticado | `src/app/**/*.integration.test.ts` | `pnpm test:integration` |
| `src/components/**` | componentes | Estados visíveis, rótulo acessível e o que a interface impede | `src/components/*.test.tsx` | `pnpm test:unit` |
| Fluxos de usuário | e2e | Ciclo completo: cadastrar, ver no bloco certo, ver o indicador mexer, excluir | `e2e/*.spec.ts` | `pnpm test:e2e` |
| Migration SQL | integration | Aplicada em banco limpo por `recriarBancoDeTeste`; a restrição nova recusa o valor inválido | `src/infrastructure/**/*.integration.test.ts` | `pnpm test:integration` |
| Rota, navegação e composição de página | **none** | Cobertos pelo gate de build e, indiretamente, por e2e | — | — |
| Configuração de CI e de ambiente | **none** | Cobertos pela própria execução do pipeline | — | — |

> As tasks marcadas `Tests: none` são exatamente as das duas últimas linhas desta matriz. Nenhuma task de domínio, aplicação, repositório ou componente pode declarar `none`.

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

Seis fases sequenciais. A regra de classificação é provada antes de existir qualquer tela.

### Phase 0 — Núcleo puro: cascata e permissão de cancelar

```
T1
T2
```

### Phase 1 — Banco e ports

```
T1 -> T3
T5 -> T3
T4 -> T6 -> T7
T2 -> T7
```

### Phase 2 — Aplicação

```
T3 -> T8
T6 -> T10
T9 -> T10
T7 -> T11
```

### Phase 3 — Server Actions

```
T10 -> T12
T11 -> T13
```

### Phase 4 — Interface

```
T8 -> T14
T9 -> T15
T12 -> T16
T15 -> T16
T13 -> T17
T14 -> T17
```

### Phase 4b — Cadastro em diálogo e a língua da receita

```
T25 -> T26
T16 -> T26
T15 -> T27
T25 -> T28
```

### Phase 5 — Provas de ponta a ponta e fechamento

```
T26 -> T19
T26 -> T20
T14 -> T20
T17 -> T21
T19 -> T22
T20 -> T22
T21 -> T22
T22 -> T23 -> T24
```

---

## Task Breakdown

> **Sobre os avisos de granularidade do validador.** Algumas tasks tocam mais de um arquivo porque os
> arquivos **mudam juntos por necessidade**: um método novo numa port não compila sem o Drizzle e o
> fake que o implementam, e uma função de domínio nova não é exportável sem `src/domain/index.ts`.
> Dividir produziria commits que não compilam, o que é pior que granularidade grossa. Onde a divisão
> era real — criar separado de cancelar, tabela separada de formulário — ela foi feita.

### Phase 0 — Núcleo puro

#### T1: Cascata de classificação em blocos ✅ CONCLUÍDA
**What**: Função pura `blocoDoLancamento(lancamento, cartoes)` que devolve `"FIXOS"`, `"CARTAO"` ou `"AVULSOS"` pela cascata: recorrência primeiro, cartão depois, resto por último.
**Where**: `src/domain/mes/bloco-do-lancamento.ts`
**Depends on**: nenhuma
**Reuses**: tipos `Lancamento` e `Origem` de `src/domain/tipos.ts`
**Requirement**: BLOCO-01
**Tools**: nenhuma
**Done when**:
- [x] Despesa com `origem = 'RECORRENCIA'` cujo meio **é** cartão devolve `FIXOS` (AC 2: precedência)
- [x] Despesa avulsa cujo meio é cartão devolve `CARTAO` (AC 3)
- [x] Parcela cujo meio é cartão devolve `CARTAO` (AC 3)
- [x] Parcela cujo meio **não** é cartão devolve `AVULSOS` (AC 4: carnê)
- [x] Despesa avulsa cujo meio não é cartão devolve `AVULSOS`
- [x] Conjunto de cartões vazio nunca devolve `CARTAO`
- [x] 100% de branches, verificado pelo relatório de cobertura
**Tests**: unit
**Gate**: quick

#### T2: Quem pode ser cancelado ✅ CONCLUÍDA
**What**: Função pura `cancelamentoPermitido(lancamento)` que devolve `ok` apenas para `origem = 'AVULSO'` e `LANCAMENTO_NAO_CANCELAVEL` para parcela e ocorrência de recorrência.
**Where**: `src/domain/mes/cancelamento-permitido.ts`
**Depends on**: nenhuma
**Reuses**: `Result` e `DomainError` de `src/domain/shared/result.ts`
**Requirement**: AVUL-04
**Tools**: nenhuma
**Done when**:
- [x] `origem = 'AVULSO'` devolve `ok`
- [x] `origem = 'PARCELA'` devolve erro `LANCAMENTO_NAO_CANCELAVEL` (AC 3)
- [x] `origem = 'RECORRENCIA'` devolve erro `LANCAMENTO_NAO_CANCELAVEL` (AC 3)
- [x] Código de erro novo declarado na union fechada e com mensagem pt-BR em `src/lib/erros.ts`
- [x] 100% de branches
**Tests**: unit
**Gate**: quick

### Phase 1 — Banco e ports

#### T4: `CHECK` de positividade no razão ✅ CONCLUÍDA
**What**: Migration que acrescenta `movimento_valor_positivo` (`valor_centavos > 0`), com a restrição declarada também no schema Drizzle.
**Where**: `drizzle/0002_movimento_valor_positivo.sql`
**Depends on**: nenhuma
**Reuses**: o padrão de `drizzle/0001_valor_previsto_positivo.sql`
**Requirement**: AVUL-01
**Tools**: nenhuma
**Done when**:
- [x] `INSERT` com `valor_centavos = 0` é recusado pelo banco
- [x] `INSERT` com `valor_centavos` negativo é recusado pelo banco
- [x] A migration aplica num banco limpo por `recriarBancoDeTeste`
- [x] `pnpm db:seed` continua passando, provando que nenhum dado semeado a viola
- [x] Snapshot e journal do drizzle-kit regenerados, não editados à mão
**Tests**: integration
**Gate**: full

#### T5: Conjunto de meios que geram fatura ✅ CONCLUÍDA
**What**: Método `idsDeMeiosComFatura()` na `CadastroRepository`, implementado no Drizzle e no fake, devolvendo os ids de todo meio com `gera_fatura = true` **inclusive arquivados**.
**Where**: `src/infrastructure/db/repositories/cadastro.repository.ts`
**Depends on**: nenhuma
**Reuses**: `CadastroRepository` de `src/application/ports/repositories.ts`
**Requirement**: BLOCO-02
**Tools**: nenhuma
**Done when**:
- [x] Devolve o id de um cartão ativo
- [x] Devolve o id de um cartão **arquivado** (AC 6: arquivar não reclassifica o passado)
- [x] Não devolve conta corrente nem rótulo
- [x] Devolve conjunto vazio quando não há cartão nenhum
- [x] O fake em `src/application/ports/fakes.ts` implementa o mesmo contrato
**Tests**: integration
**Gate**: full

#### T3: `resumoMensal` soma pelos blocos da cascata ✅ CONCLUÍDA

> **Reposicionada durante a execução.** Estava na fase 0, dependendo só do T1. Mudar a assinatura sem o conjunto de cartões deixaria `obterVisaoMensal` sem nada para passar, e `handler.test.ts:164`, que assere `cartao = 20000`, quebraria. A task desceu para depois do T5 e passou a incluir a ligação no chamador.
**What**: Substituir `somarPorOrigem` pela cascata: `resumoMensal` passa a receber o conjunto de cartões e a calcular `fixos`, `cartao` e `avulsos` por `blocoDoLancamento`.
**Where**: `src/domain/mes/resumo-mensal.ts`
**Depends on**: T1, T5
**Reuses**: `blocoDoLancamento` de T1, `idsDeMeiosComFatura` de T5
**Requirement**: BLOCO-02
**Tools**: nenhuma
**Done when**:
- [x] `cartao` soma despesa avulsa no cartão, que antes caía em `avulsos` (AC 3)
- [x] `cartao` **não** soma parcela em meio sem fatura, que passa a cair em `avulsos` (AC 4)
- [x] `fixos` soma recorrência no cartão, que não vai para `cartao` (AC 2)
- [x] `fixos + cartao + avulsos` continua igual a `totalGastos` para qualquer entrada
- [x] `totalGastos`, `entradas`, `investimentos` e todo o `caixaView` permanecem inalterados
- [x] `obterVisaoMensal` passa o conjunto de cartões, e o teste dele que assere `cartao = 20000` é reescrito para a regra nova, com dois meios distintos, sem afrouxar assertion
- [x] 100% de branches
**Tests**: unit
**Gate**: quick

#### T6: Gravar um lançamento avulso ✅ CONCLUÍDA
**What**: Método `criarAvulso(entrada)` na `MovimentoRepository`, com `INSERT` único de `origem = 'AVULSO'`, sem vínculo de compra nem de recorrência.
**Where**: `src/infrastructure/db/repositories/movimento.repository.ts`
**Depends on**: T4
**Reuses**: `mapeadores.ts` para linha do banco → `Lancamento`
**Requirement**: AVUL-01
**Tools**: nenhuma
**Done when**:
- [x] Grava exatamente uma linha com `origem = 'AVULSO'`, `compra_id`, `numero_parcela` e `recorrencia_id` nulos (AC 1)
- [x] O `Lancamento` devolvido tem o id gerado pelo banco
- [x] Grava `pago_em` quando informado e `null` quando não
- [x] Grava `categoria_id` nulo quando a categoria não é informada
- [x] Valor não positivo é recusado pela restrição de T4, não silenciosamente aceito
- [x] O fake implementa o mesmo contrato
**Tests**: integration
**Gate**: full

#### T7: Cancelar, com concordância entre domínio e SQL ✅ CONCLUÍDA
**What**: Método `cancelar(id, canceladoEm)` com `UPDATE ... WHERE id = $1 AND origem = 'AVULSO' AND cancelado_em IS NULL`, mais o teste de concordância que confronta o `WHERE` contra `cancelamentoPermitido`.
**Where**: `src/infrastructure/db/repositories/movimento.repository.ts`
**Depends on**: T2, T6
**Reuses**: `cancelamentoPermitido` de T2
**Requirement**: AVUL-03
**Tools**: nenhuma
**Done when**:
- [x] Cancelar um avulso preenche `cancelado_em` e mantém a linha no banco (AC 1)
- [x] Cancelar uma parcela não altera linha alguma (AC 3)
- [x] Cancelar uma ocorrência de recorrência não altera linha alguma (AC 3)
- [x] Cancelar duas vezes não altera `cancelado_em` na segunda (AC 4)
- [x] **Teste de concordância**: para cada origem, o resultado do `UPDATE` concorda com `cancelamentoPermitido`
- [x] O fake implementa o mesmo contrato
**Tests**: integration
**Gate**: full

### Phase 2 — Aplicação

#### T8: A visão do mês carimba o bloco de cada lançamento ✅ CONCLUÍDA
**What**: `obterVisaoMensal` lê o conjunto de cartões, passa-o a `resumoMensal` e preenche `LancamentoDoMes.bloco`, de modo que a tabela nunca receba o conjunto nem reclassifique nada.
**Where**: `src/application/mes/obter-visao-mensal/handler.ts`
**Depends on**: T3
**Reuses**: `blocoDoLancamento` de T1, o conjunto de cartões que T3 já faz a visão do mês ler
**Requirement**: BLOCO-02
**Tools**: nenhuma
**Done when**:
- [x] Todo `LancamentoDoMes` sai com `bloco` preenchido
- [x] **Teste de concordância**: `competenciaView.cartao` é igual à soma dos itens com `bloco = 'CARTAO'` (AC 5)
- [x] O mesmo vale para `fixos` e para `avulsos`
- [x] O conjunto de cartões é lido **uma vez** por chamada, não por lançamento
- [x] Receita e investimento recebem bloco, mas não entram em nenhum total de despesa
**Tests**: unit
**Gate**: quick

#### T9: Schema Zod do lançamento avulso ✅ CONCLUÍDA
**What**: Schema compartilhado cliente/servidor com descrição, natureza, valor, competência, data, categoria, pessoa, meio e a marca de já pago.
**Where**: `src/application/schemas/lancamento-avulso.schema.ts`
**Depends on**: nenhuma
**Reuses**: `criarCents` e `criarCompetencia` de `@/domain`, o padrão de `compra.schema.ts`
**Requirement**: AVUL-01
**Tools**: nenhuma
**Done when**:
- [x] Descrição vazia e descrição com 121 caracteres são recusadas (AC 2)
- [x] Valor zero, negativo e não inteiro são recusados (AC 3)
- [x] Competência fora de `AAAA-MM` é recusada (AC 4)
- [x] Data fora de `AAAA-MM-DD` é recusada (AC 5)
- [x] Natureza aceita exatamente despesa e receita (AVUL-02 AC 2)
- [x] Valor acima do inteiro seguro é recusado (edge case)
- [x] O teste de fronteira existente confirma que o arquivo não importa infraestrutura
**Tests**: unit
**Gate**: quick

#### T10: Caso de uso de criação ✅ CONCLUÍDA
**What**: `criarLancamentoAvulso` que resolve o padrão de já pago pelo meio escolhido, monta a entrada e delega ao repositório, no envelope `Result`.
**Where**: `src/application/mes/criar-lancamento-avulso/handler.ts`
**Depends on**: T6, T9
**Reuses**: fakes de `src/application/ports/fakes.ts`
**Requirement**: AVUL-01
**Tools**: nenhuma
**Done when**:
- [x] Meio sem fatura produz lançamento já pago, com `pagoEm` igual à data do evento (AVUL-02 AC 4)
- [x] Meio com fatura produz lançamento não pago (AVUL-02 AC 5)
- [x] A escolha explícita da pessoa sobrepõe o padrão nos dois sentidos (AVUL-02 AC 6)
- [x] Meio de pagamento inexistente ou arquivado devolve erro, sem gravar (edge case)
- [x] Natureza receita é gravada como receita (AVUL-02 AC 1)
**Tests**: unit
**Gate**: quick

#### T11: Caso de uso de cancelamento ✅ CONCLUÍDA
**What**: `cancelarLancamento` que consulta o lançamento, aplica `cancelamentoPermitido` e delega ao repositório.
**Where**: `src/application/mes/cancelar-lancamento/handler.ts`
**Depends on**: T7
**Reuses**: `cancelamentoPermitido` de T2
**Requirement**: AVUL-03
**Tools**: nenhuma
**Done when**:
- [x] Avulso é cancelado e a competência afetada é devolvida, para a action saber o que revalidar
- [x] Parcela devolve `LANCAMENTO_NAO_CANCELAVEL` (AC 3)
- [x] Ocorrência de recorrência devolve `LANCAMENTO_NAO_CANCELAVEL` (AC 3)
- [x] Lançamento inexistente devolve erro, sem lançar exceção
- [x] Segunda chamada para o mesmo id devolve sucesso (AC 4)
**Tests**: unit
**Gate**: quick

### Phase 3 — Server Actions

#### T12: Action de criar ✅ CONCLUÍDA
**What**: `criarLancamentoAvulso` com `requireSession()` na primeira instrução, revalidação pelo mesmo schema de T9 e revalidação das duas rotas.
**Where**: `src/app/actions/lancamentos.ts`
**Depends on**: T10
**Reuses**: envelope `ResultadoAction` de `src/lib/erros.ts`, padrão de `compras.ts`
**Requirement**: AVUL-01
**Tools**: nenhuma
**Done when**:
- [x] Sem sessão devolve o código de erro de sessão antes de qualquer acesso ao banco (AC 7)
- [x] Payload inválido devolve erro por campo, sem gravar (AC 2 a 5)
- [x] Sucesso revalida `/[competencia]` e `/[competencia]/lancamentos` (AC 6)
- [x] Falha não prevista vira `ERRO_INESPERADO` com identificador de correlação, sem stack trace (AC 8)
- [x] Competência informada diferente da aberta revalida as duas (edge case)
**Tests**: integration
**Gate**: full

#### T13: Action de excluir ✅ CONCLUÍDA
**What**: `cancelarLancamento` no mesmo envelope, revalidando as duas rotas.
**Where**: `src/app/actions/lancamentos.ts`
**Depends on**: T11
**Reuses**: o mesmo envelope e o mesmo tratamento de erro de T12
**Requirement**: AVUL-03
**Tools**: nenhuma
**Done when**:
- [x] Sem sessão devolve erro de sessão antes do banco
- [x] Excluir avulso revalida `/[competencia]` e `/[competencia]/lancamentos` (AC 7)
- [x] Excluir parcela devolve `LANCAMENTO_NAO_CANCELAVEL` (AC 3)
- [x] Id inexistente devolve erro, sem lançar
- [x] Falha não prevista vira `ERRO_INESPERADO` com identificador de correlação
**Tests**: integration
**Gate**: full

### Phase 4 — Interface

#### T14: Blocos pela cascata, com Entradas no topo ✅ CONCLUÍDA
**What**: `TabelaLancamentos` passa a agrupar por `item.bloco` em vez de por `origem`, e o bloco de entradas sobe para o topo, aparece sempre e perde "e investimentos" do nome.
**Where**: `src/components/tabela-lancamentos.tsx`
**Depends on**: T8
**Reuses**: `BlocoDeLancamentos`, já existente no arquivo
**Requirement**: ENTR-02
**Tools**: nenhuma
**Done when**:
- [x] Avulso no cartão aparece sob "Cartão de Crédito" (BLOCO-01 AC 3)
- [x] Recorrência no cartão aparece sob "Fixos" (BLOCO-01 AC 2)
- [x] Parcela em meio sem fatura aparece sob "Gastos do Mês" (BLOCO-01 AC 4)
- [x] "Entradas" é o primeiro bloco da árvore (AC 3)
- [x] "Entradas" aparece com texto de ausência quando vazio, sem tabela vazia (AC 2 e 4)
- [x] A coluna "Parcela" aparece só em linha que tem parcela (BLOCO-01 AC 7)
- [x] O bloco de despesa recorrente continua rotulado "Fixos" (AC 5)
**Tests**: componentes
**Gate**: quick

#### T15: Formulário de lançamento avulso ✅ CONCLUÍDA
**What**: `FormLancamentoAvulso` com natureza, valor, descrição, data, pessoa, meio, categoria e a caixa de já pago com o padrão vindo do meio, usando `CadastroInline` para categoria e meio.
**Where**: `src/components/form-lancamento-avulso.tsx`
**Depends on**: T9
**Reuses**: `CadastroInline`, e o padrão de `form-compra.tsx`
**Requirement**: AVUL-02
**Tools**: nenhuma
**Done when**:
- [x] Oferece exatamente despesa e receita (AC 2)
- [x] Escolher meio sem fatura marca a caixa de já pago; escolher meio com fatura a desmarca (AC 4 e 5)
- [x] A caixa continua editável depois do padrão ser aplicado (AC 6)
- [x] Erro por campo devolvido pela action é exibido junto do campo
- [x] Criar categoria e criar meio funcionam sem sair do formulário
- [x] Todo campo tem rótulo acessível associado
**Tests**: componentes
**Gate**: quick

#### T16: Alternador Avulso ┊ Parcelado na página ✅ CONCLUÍDA
**What**: A página de Lançamentos passa a oferecer os dois formulários sob um alternador, em vez de empilhá-los, e liga o de avulso à action de T12.
**Where**: `src/app/(app)/[competencia]/lancamentos/page.tsx`
**Depends on**: T12, T15
**Reuses**: `FormCompra`, já montado nesta página
**Requirement**: AVUL-01
**Tools**: nenhuma
**Done when**:
- [x] O alternador começa em "Avulso", que é o gesto mais frequente
- [x] Trocar de aba não perde o que já foi digitado na outra
- [x] O alternador é operável por teclado, com `aria-selected` correto
- [x] `pnpm build` passa
**Tests**: none
**Gate**: build

#### T17: Excluir em dois toques na linha ✅ CONCLUÍDA
**What**: Ilha cliente `BotaoExcluir` com confirmação em dois toques, exibida apenas em linha de lançamento avulso.
**Where**: `src/components/botao-excluir.tsx`
**Depends on**: T13, T14
**Reuses**: o padrão de ilha cliente de `botao-pago.tsx`
**Requirement**: AVUL-03
**Tools**: nenhuma
**Done when**:
- [x] O controle não aparece em linha de parcela nem de recorrência (AC 5)
- [x] O primeiro acionamento pede confirmação e não exclui (AC 6)
- [x] O segundo acionamento chama a action (AC 6)
- [x] `Escape` cancela a confirmação sem excluir
- [x] O estado de confirmação tem texto acessível, não só mudança de cor
**Tests**: componentes
**Gate**: quick

#### T18: A área passa a se chamar "Todo mês" ✅ CONCLUÍDA
**What**: Renomear a área de recorrências na navegação e no título da página, substituindo o comentário do invariante antigo pela razão nova.
**Where**: `src/components/navegacao-principal.tsx`
**Depends on**: nenhuma
**Reuses**: nada
**Requirement**: ENTR-01
**Tools**: nenhuma
**Done when**:
- [x] A navegação exibe "Todo mês" (AC 1)
- [x] O título da página de recorrências exibe "Todo mês" (AC 1)
- [x] O rótulo cabe na barra inferior a 400px sem transbordo
- [x] O comentário registra por que área e bloco divergem
- [x] O e2e de recorrências, que navega por esse rótulo, é atualizado e passa
**Tests**: componentes
**Gate**: quick

### Phase 4b — Cadastro em diálogo e a língua da receita

> **Acrescentada durante a execução**, a pedido do usuário, depois de ver a tela com vários gastos
> fixos. Duas descobertas de uso: o formulário no rodapé exige rolar a lista inteira para cadastrar
> algo, e o cadastro de gasto fixo oferecia cartão de crédito como destino de salário enquanto o
> botão dizia "Cadastrar gasto fixo". O alternador empilhado do T16 é substituído pelo diálogo; a
> lógica de abas continua, agora dentro dele.

#### T25: Diálogo de cadastro com `<dialog>` nativo ✅ CONCLUÍDA
**What**: Ilha cliente que abre o cadastro num `<dialog>` modal a partir de um botão, em tela cheia abaixo de 640px.
**Where**: `src/components/dialogo-de-cadastro.tsx`
**Depends on**: nenhuma
**Reuses**: o padrão de ilha cliente de `botao-pago.tsx`
**Requirement**: AVUL-05
**Tools**: nenhuma
**Done when**:
- [x] O botão abre o diálogo por `showModal()`, e não por estado de visibilidade (AC 2)
- [x] `Escape` fecha e o foco volta ao botão que abriu (AC 4)
- [x] O foco fica confinado no diálogo enquanto ele está aberto (AC 3)
- [x] Clicar no backdrop fecha
- [x] Fechar e reabrir preserva o que foi digitado dentro (AC 7)
- [x] O conteúdo não é desmontado ao fechar, só escondido pelo próprio `<dialog>`
- [x] Tem rótulo acessível e `aria-labelledby` apontando para o título
**Tests**: componentes
**Gate**: quick

#### T26: A página abre o cadastro pelo topo ✅ CONCLUÍDA
**What**: Substituir o alternador empilhado pelo botão no topo que abre o diálogo, com as abas Avulso ┊ Parcelado dentro dele.
**Where**: `src/app/(app)/[competencia]/lancamentos/page.tsx`
**Depends on**: T16, T25
**Reuses**: `SeletorDeFormulario` do T16, que passa a viver dentro do diálogo
**Requirement**: AVUL-05
**Tools**: nenhuma
**Done when**:
- [x] O botão de abrir aparece no topo, antes da lista (AC 1)
- [x] Nenhum formulário fica no rodapé da página
- [x] Gravar fecha o diálogo (AC 5)
- [x] `pnpm build` passa
**Tests**: none
**Gate**: build

#### T27: O cadastro de gasto fixo fala a língua da receita ✅ CONCLUÍDA
**What**: Com receita marcada, título, botão, rótulo do campo de destino e rótulo do dia mudam, e a lista passa a oferecer só meios sem fatura.
**Where**: `src/components/form-recorrencia.tsx`
**Depends on**: T15
**Reuses**: `geraFatura` já disponível no meio de pagamento
**Requirement**: ENTR-03
**Tools**: nenhuma
**Done when**:
- [x] Com receita, o título e o botão falam de entrada (AC 3)
- [x] Com receita, o campo se chama "Onde o dinheiro cai" (AC 1)
- [x] Com receita, a lista não oferece nenhum cartão de crédito (AC 2)
- [x] Com receita, o dia se chama o dia em que o dinheiro costuma cair (AC 4)
- [x] Trocar para receita com um cartão selecionado troca a seleção para a primeira conta (AC 5)
- [x] Com despesa, tudo continua como está hoje (AC 6)
**Tests**: componentes
**Gate**: quick

#### T28: O cadastro avulso fala a língua da receita
**What**: Mesma correção no formulário de avulso: rótulo do destino e lista restrita a meios sem fatura quando a natureza é receita.
**Where**: `src/components/form-lancamento-avulso.tsx`
**Depends on**: T25
**Reuses**: a mesma regra do T27
**Requirement**: ENTR-03
**Tools**: nenhuma
**Done when**:
- [ ] Com receita, o campo se chama "Onde o dinheiro cai" (AC 1)
- [ ] Com receita, a lista não oferece nenhum cartão (AC 2)
- [ ] Trocar para receita com cartão selecionado troca a seleção para a primeira conta (AC 5)
- [ ] O padrão da caixa de já pago continua correto depois da troca automática
- [ ] Com despesa, tudo continua como está hoje (AC 6)
**Tests**: componentes
**Gate**: quick

### Phase 5 — Provas de ponta a ponta e fechamento

#### T19: e2e — despesa avulsa no cartão
**What**: Percurso que cadastra uma despesa avulsa num cartão e prova que ela cai no bloco do cartão e move o indicador.
**Where**: `e2e/lancamento-avulso.spec.ts`
**Depends on**: T26
**Reuses**: helpers de sessão de `e2e/compra-parcelada.spec.ts`
**Requirement**: BLOCO-01
**Tools**: nenhuma
**Done when**:
- [ ] Cadastra pela tela e encontra a linha sob "Cartão de Crédito" (AC 3)
- [ ] O indicador "Cartão" do painel cresceu no mesmo valor (AC 5)
- [ ] A mesma despesa numa conta corrente cai sob "Gastos do Mês"
- [ ] Nenhum dado financeiro real é usado (AD-009)
**Tests**: e2e
**Gate**: build

#### T20: e2e — Pix recebido
**What**: Percurso que cadastra uma receita avulsa e prova que ela aparece em "Entradas" e move "Receitas do mês".
**Where**: `e2e/entradas.spec.ts`
**Depends on**: T14, T26
**Reuses**: os mesmos helpers de sessão
**Requirement**: AVUL-02
**Tools**: nenhuma
**Done when**:
- [ ] A receita aparece no bloco "Entradas" (AC 3)
- [ ] Ela não aparece em nenhum bloco de despesa (AC 3)
- [ ] O indicador "Receitas do mês" cresceu no mesmo valor (AC 1)
- [ ] Num mês sem receita, "Entradas" aparece no topo com texto de ausência (ENTR-02 AC 2 e 3)
**Tests**: e2e
**Gate**: build

#### T21: e2e — excluir devolve o total
**What**: Percurso que cria um avulso, confere o total, exclui e confere que o total voltou ao valor anterior.
**Where**: `e2e/excluir-lancamento.spec.ts`
**Depends on**: T17
**Reuses**: os mesmos helpers de sessão
**Requirement**: AVUL-03
**Tools**: nenhuma
**Done when**:
- [ ] O total do mês antes e depois do ciclo criar-excluir é idêntico (AC 2)
- [ ] O primeiro toque não exclui (AC 6)
- [ ] A linha some da lista depois do segundo toque (AC 2)
- [ ] Linha de parcela não oferece o controle (AC 5)
**Tests**: e2e
**Gate**: build

#### T22: O CI passa a rodar o que o terminal roda
**What**: Acrescentar integração e e2e ao workflow, corrigindo o comentário que afirma não haver migration e ajustando a porta do serviço Postgres para a que os testes usam.
**Where**: `.github/workflows/ci.yml`
**Depends on**: T19, T20, T21
**Reuses**: o serviço `postgres` já declarado no workflow
**Requirement**: AVUL-01
**Tools**: nenhuma
**Done when**:
- [ ] O job roda `pnpm test:integration` depois de aplicar as migrations
- [ ] O job roda `pnpm test:e2e`
- [ ] O comentário desatualizado sobre ausência de migration é removido
- [ ] O gate do CI passa a ser equivalente ao `pnpm verify` local
**Tests**: none
**Gate**: build

#### T23: Ambiente de QA local, em modo produção
**What**: Documentar e roteirizar o estágio 1 do QA — banco `mybilling_qa` limpo, migrations do zero, build de produção — registrando que o estágio 2 depende das credenciais do Google.
**Where**: `docs/qa.md`
**Depends on**: T22
**Reuses**: `docker-compose.yml` e os scripts de banco já existentes
**Requirement**: AVUL-01
**Tools**: nenhuma
**Done when**:
- [ ] O roteiro cria `mybilling_qa` vazio e aplica as três migrations do zero
- [ ] O roteiro sobe o build de produção apontando para esse banco
- [ ] Registra que o login em modo produção exige `AUTH_GOOGLE_ID` e `AUTH_GOOGLE_SECRET` reais, e por quê
- [ ] Registra que `AUTH_PROVIDER_DE_TESTE` lança no boot em modo produção, por desenho
- [ ] Nenhuma credencial real aparece no arquivo
**Tests**: none
**Gate**: build

#### T24: Roadmap, handoff e decisões atualizados
**What**: Mover a fatia 1 para "Pronto" no roadmap, registrar as decisões novas em `STATE.md` e atualizar o handoff com o estado real.
**Where**: `.specs/STATE.md`
**Depends on**: T23
**Reuses**: o formato `AD-NNN` já usado
**Requirement**: ENTR-01
**Tools**: nenhuma
**Done when**:
- [ ] `docs/roadmap.md` move lançamento avulso e exclusão para "Pronto"
- [ ] A cascata de blocos é registrada como decisão `AD-NNN`
- [ ] O abandono do invariante "área tem o nome do bloco" é registrado com a razão
- [ ] `.specs/HANDOFF.md` reflete a contagem de testes e as pendências que restam
- [ ] `validate_state.py` passa
**Tests**: none
**Gate**: build
