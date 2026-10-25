# Importar a planilha — Tasks

**Spec**: `.specs/features/importar-planilha/spec.md`
**Design**: `.specs/features/importar-planilha/design.md` (interfaces, fixtures e estado final esperado)
**Contexto**: `.specs/features/importar-planilha/context.md` (layout do arquivo e decisões do dono)
**Status**: In Progress (aprovado pelo dono em 2026-10-24; execução em 4 lotes: T1–T9, T10–T15, T16–T19, T20–T27)
**Total**: 27 tasks em 6 fases

> **Por que o domínio vem inteiro antes do banco.** O risco desta fatia não é gravar linha: é ler a
> aba errado ou reconhecer errado entre abas, e descobrir só no terceiro mês. Leitura, conferência,
> reconhecimento e plano são funções puras, provadas contra as três fixtures sintéticas antes de
> existir migration, action ou tela.

---

## Execution Protocol (MANDATORY -- do not skip)

Implementar com a skill `tlc-spec-driven`, ativada pelo nome. Para cada task, nesta ordem:

1. **Pré-implementação** — declarar premissas, arquivos a tocar e critério de sucesso.
2. **Escrever os testes primeiro**, derivados dos acceptance criteria do `spec.md` e dos valores do
   `design.md`. Os testes asseram o resultado definido no spec, nunca espelham a implementação.
3. **Implementar** até os testes passarem.
4. **Gate Check** — rodar o comando do nível declarado na task. O test runner decide.
5. **Test Adequacy Review** (A suficiente / B não-raso / C necessário / D conformidade). Cada
   critério coberto cita `file:line` **e** reproduz a expressão da assertion.
6. **Marcar a task como concluída** neste arquivo e atualizar a traceability no `spec.md`, **antes**
   do commit e **dentro** do mesmo commit.
7. **Um commit atômico** em Conventional Commits, validado por `check_commit.py`.

Proibições absolutas: commitar antes do gate passar · enfraquecer, pular ou deletar teste para
passar · agrupar tasks em um commit · "já que estou aqui" · marcar critério coberto sem citação
`file:line` · **qualquer dado da planilha real em fixture, teste, comentário ou commit (AD-009)** — os
arquivos reais ficam em `~/Downloads`, fora do repositório, e nenhuma task os lê.

**Blast radius:** a aprovação destas tasks autoriza implementação e commits **locais**. `git push`,
deploy, execução do script de limpeza no Neon e qualquer operação remota exigem autorização
explícita e separada.

---

## Global Constraints

- Dinheiro é `Cents` inteiro; nenhum float, `toFixed` ou `Number(texto)` sobre valor (AD-001).
- Competência é `'YYYY-MM'`; nada de `Date` em `src/domain` (AD-002).
- `src/domain/**`: sem `next`, `react`, `drizzle-orm`, `zod`, `@/infrastructure`, `@/app`, Node; sem
  `async`, sem exceção; `Result` (AD-006). Testes de domínio podem usar `node:fs`.
- 100% de branches em `src/domain` (limiar do `vitest.config.ts`).
- Toda Server Action: `requireSession()` na primeira instrução, Zod no payload, `ResultadoAction`
  como retorno, `ERRO_INESPERADO` com identificador de correlação.
- Código de erro novo entra na union, em `CodigoErroExibivel` e em `MENSAGENS` de `src/lib/erros.ts`.
- Nome normalizado = trim, espaços internos reduzidos a um, minúsculas `pt-BR` — uma função só,
  `normalizarNome`.
- Tabela nova entra em `src/infrastructure/db/limpar.ts`, filhas antes das mães.

## Review Focus

Entradas e condições que a spec implica e que nenhum AC isolado exercita, com o teste que as prende
na task dona:

1. **CSV salvo de novo com ponto e vírgula** (aberto e salvo no Excel) → `PLANILHA_ARQUIVO_INVALIDO`,
   não "bloco ausente". Teste em T3.
2. **O mesmo nome com espaço no fim ou espaço duplo entre um mês e outro** (`"Internet "`,
   `"Cartão  Roxo"`) → reconhecido e com a decisão lembrada aplicada. Testes em T7 e T9.
3. **Variações de valor**: `R$10,00` sem espaço → 1000; `R$ 1.234.567,89` → 123456789;
   `-R$ 10,00` → `VALOR_INVALIDO`; `10` → 1000; `R$ 0,00` → `VALOR_ZERO`. Teste em T2.
4. **Nome de arquivo de download repetido ou sem acento**: `Planilha 2026 - Outubro (1).csv`,
   `… - MARÇO.csv`, `… - marco.csv` → mês certo. Teste em T4.
5. **O mesmo "Tipo" escrito de dois jeitos na mesma aba** (`Cartão Laranja` e `cartão laranja `) → uma pendência
   só, com a soma das linhas. Teste em T9.

---

## Test Coverage Matrix

> Confirmada contra `AGENTS.md` (seção Testes), `vitest.config.ts`, `playwright.config.ts` e a matriz da
> fatia `lancamento-avulso`.

| Camada de código | Tipo de teste | Expectativa de cobertura | Padrão de localização | Comando |
| --- | --- | --- | --- | --- |
| `src/domain/**` | unit | **100% de branches**; 1:1 com os ACs; todo edge case e todo item do Review Focus | `src/domain/**/*.test.ts` | `pnpm test:unit` |
| `src/application/**` | unit | Todos os ramos, com fakes em memória | `src/application/**/*.test.ts` | `pnpm test:unit` |
| `src/infrastructure/db/repositories/**` e transação | integration | Consultas, restrições, rollback, e o que a escrita **não** toca | `src/infrastructure/**/*.integration.test.ts` | `pnpm test:integration` |
| `src/app/actions/**` | integration | Sessão primeiro, cada ramo de validação, sequência das três fixtures, falha injetada, concorrência | `src/app/**/*.integration.test.ts` | `pnpm test:integration` |
| `src/components/**` | componentes | Estados visíveis, rótulos acessíveis, o que a interface impede | `src/components/**/*.test.tsx` | `pnpm test:unit` |
| Fluxo de usuário | e2e | Importar outubro com confirmação de divergência e novembro sem pendência; painel reflete | `e2e/*.spec.ts` | `pnpm test:e2e` |
| Migration SQL e script de limpeza | integration | Aplicada em banco limpo por `recriarBancoDeTeste`; restrições recusam o inválido; script preserva o que deve | `src/infrastructure/**/*.integration.test.ts` | `pnpm test:integration` |
| Composição de página | **none** | Coberta pelo gate de build e pelo e2e | — | — |
| Documentação | **none** | — | — | — |

## Gate Check Commands

| Gate | Quando | Comando |
| --- | --- | --- |
| `quick` | task só com teste unitário ou de componente | `pnpm test:unit` |
| `full` | task com teste de integração | `pnpm test:unit && pnpm test:integration` |
| `build` | última task da fase ou task sem teste | `pnpm verify` |
| `e2e` | task com e2e | `pnpm verify && pnpm test:e2e` |

Pré-requisito de `full`, `build` e `e2e`: `pnpm db:up` (AD-010). O e2e usa o Chrome da máquina; se
`browserType.launch` estourar o tempo, suspeite do navegador antes do teste (handoff de 2026-09-20).

---

## Execution Plan

### Phase 0 — Leitura pura

```
T1 -> T3
T2 -> T3
T3 -> T5
T4
```

### Phase 1 — Reconhecimento e plano, puros

```
T6
T2 -> T7
T2 -> T8
T3 -> T9
T5 -> T9
T7 -> T9
T8 -> T9
```

### Phase 2 — Banco e ports

```
T10
T11
T6 -> T12
T9 -> T12
T10 -> T13
T12 -> T13
T10 -> T14
T11 -> T14
T12 -> T14
T11 -> T15
```

### Phase 3 — Aplicação e actions

```
T16
T9 -> T17
T12 -> T17
T17 -> T18
T6 -> T18
T13 -> T19
T14 -> T19
T16 -> T19
T18 -> T19
```

### Phase 4 — Interface

```
T20
T3 -> T21
T4 -> T21
T19 -> T22
T20 -> T22
T19 -> T23
T21 -> T24
T22 -> T24
T23 -> T24
T24 -> T25
```

### Phase 5 — Ponta a ponta e fechamento

```
T15 -> T26
T25 -> T26
T26 -> T27
```

---

## Task Breakdown

> **Sobre os avisos de granularidade do validador.** Algumas tasks tocam mais de um arquivo porque eles
> mudam juntos por necessidade: uma port nova não compila sem o fake que a implementa; a migration
> nasce de `schema.ts` com o snapshot do `drizzle-kit`; as fixtures são o dado de teste da task que
> as lê pela primeira vez.

### Phase 0 — Leitura pura

#### T1: Ler o CSV em grade
**What**: `lerCsv(texto)` devolve a grade de células, seguindo RFC 4180.
**Where**: `src/domain/importacao/csv.ts`
**Depends on**: nenhuma
**Reuses**: `Result`, `ok`, `err` de `src/domain/shared/result.ts`; código novo `PLANILHA_ARQUIVO_INVALIDO` na union `CodigoErro`
**Requirement**: IMP-01
**Interfaces**: produz `Grade` e `lerCsv` (design.md, "csv.ts")
**Tools**: nenhuma
**Done when**:
- [x] `a,b\r\nc,d` e `a,b\nc,d` dão `[["a","b"],["c","d"]]`
- [x] Campo entre aspas com vírgula: `"Seguro (casa, carro)",x` dá `["Seguro (casa, carro)","x"]`
- [x] Aspas escapadas: `"a ""b"""` dá `a "b"`
- [x] BOM inicial `﻿` é removido da primeira célula (IMP-01 AC 2)
- [x] Células vazias são preservadas: `,,x,` dá `["","","x",""]`
- [x] Aspas não fechadas devolvem `PLANILHA_ARQUIVO_INVALIDO`
- [x] Linha final vazia após o último `\n` não vira linha extra
- [x] 100% de branches
**Tests**: unit
**Gate**: quick
**Commit**: `feat(importacao): ler o CSV da aba em grade de células`

#### T2: Ler valor, parcela e nome de uma célula
**What**: `valorDaCelula`, `parcelaDaCelula` e `normalizarNome`.
**Where**: `src/domain/importacao/celula.ts`
**Depends on**: nenhuma
**Reuses**: `parseBRL` (`src/domain/shared/money.ts:49`), `MAX_PARCELAS`
**Requirement**: IMP-01
**Interfaces**: produz `MotivoNaoLida`, `ParcelaDaLinha`, `valorDaCelula`, `parcelaDaCelula`, `normalizarNome` (design.md, "celula.ts")
**Tools**: nenhuma
**Done when**:
- [x] `R$ 1.234,56` → 123456 (IMP-01 AC 13); `R$ 1.398,00` com U+00A0 depois de `R$` → 139800
- [x] Review Focus 3: `R$10,00` → 1000; `R$ 1.234.567,89` → 123456789; `10` → 1000; `-R$ 10,00` → `VALOR_INVALIDO`; `R$ 0,00` → `VALOR_ZERO` (IMP-01 AC 18)
- [x] `""` e `"   "` → `VALOR_VAZIO` (AC 9); `200*` → `VALOR_INVALIDO` (AC 10)
- [x] `7/10` → `{ numero: 7, total: 10 }`; ` 3/3 ` → `{ 3, 3 }`; `12/10`, `0/3`, `3/121`, `3-10`, `""` → `PARCELA_INVALIDA` (AC 11)
- [x] `normalizarNome("  Cartão   Roxo ")` → `"cartão roxo"`; `"MERCADO"` e `"Mercado"` dão o mesmo
- [x] 100% de branches
**Tests**: unit
**Gate**: quick
**Commit**: `feat(importacao): ler valor, parcela e nome normalizado de uma célula`

#### T3: Localizar os blocos e ler a aba
**What**: `lerAba(grade)` localiza os quatro blocos, os totais e a tabela de categorias, e separa linhas lidas e não lidas. Cria as três fixtures sintéticas.
**Where**: `src/domain/importacao/ler-aba.ts` (+ `src/domain/importacao/__fixtures__/Planilha 2026 - {Outubro,Novembro,Dezembro}.csv`)
**Depends on**: T1, T2
**Reuses**: `lerCsv`, `valorDaCelula`, `parcelaDaCelula`
**Requirement**: IMP-01
**Interfaces**: produz `Bloco`, `LinhaLida`, `LinhaDeCartao`, `LinhaNaoLida`, `AbaLida`, `TITULOS`, `lerAba` (design.md, "ler-aba.ts"); as fixtures seguem as três tabelas da seção "Fixtures sintéticas" do design, no layout do `context.md`
**Tools**: nenhuma
**Done when**:
- [x] Outubro: 4 fixos, 6 linhas de cartão, 3 gastos, 3 entradas lidas; 1 não lida (`FIXOS`, "Seguro (casa, carro)", `VALOR_VAZIO`)
- [x] Outubro: `totais` = FIXOS 184000, CARTAO 42334, GASTOS 11250, ENTRADAS 1015000, SAIDAS 238784
- [x] Outubro: `categoriasDaTabela` = Moradia, Assinaturas, Saúde, Casa, Eletrônicos, Estudo, Mercado, Lazer (a linha vazia no meio não encerra a tabela — AC 14)
- [x] A linha residual do Gastos do Mês (sem nome, sem valor, "Tipo" `Débito`) não aparece em lugar nenhum (AC 8)
- [x] O `X` em A1, a linha 2, Saídas (exceto o total) e "Gastos por tipo de pagamento" não aparecem (AC 16)
- [x] `Gastos do Mês ` com espaço no fim é encontrado (AC 4); remover qualquer título de uma cópia da grade devolve `PLANILHA_BLOCO_AUSENTE` com `detalhes.bloco` igual a esse título, na ordem Fixos, Cartão de Crédito, Gastos do Mês, Entradas (AC 3)
- [x] Deslocar a grade inteira duas colunas para a direita produz a mesma `AbaLida` (AC 5)
- [x] Linha com valor e nome vazio → `NOME_VAZIO` (AC 12); Dezembro: `Mesa 12/10` → `PARCELA_INVALIDA`, `Bônus 200*` → `VALOR_INVALIDO`
- [x] Sem a tabela de categorias, `categoriasDaTabela` é `[]` e não há erro (AC 15)
- [x] Review Focus 1: a fixture de outubro com as vírgulas trocadas por `;` devolve `PLANILHA_ARQUIVO_INVALIDO` (AC 17)
- [x] `posicao` conta só as linhas não vazias do bloco, a partir de 0
- [x] As três fixtures não contêm nenhum nome, valor ou categoria da planilha real (revisão manual registrada no commit)
- [x] 100% de branches
**Tests**: unit
**Gate**: quick
**Commit**: `feat(importacao): localizar os blocos e ler a aba exportada`

#### T4: Mês e ano pelo nome do arquivo
**What**: `competenciaDoNomeDoArquivo(nome)` e `competenciaDeAnoEMes(ano, mes)`.
**Where**: `src/domain/importacao/competencia-do-arquivo.ts` (+ `competenciaDeAnoEMes` em `src/domain/shared/competencia.ts`)
**Depends on**: nenhuma
**Reuses**: `criarCompetencia`
**Requirement**: IMP-02
**Interfaces**: produz `MesEAnoDoArquivo`, `competenciaDoNomeDoArquivo`, `competenciaDeAnoEMes` (design.md)
**Tools**: nenhuma
**Done when**:
- [x] `Planilha 2026 - Outubro.csv` → `{ mes: 10, ano: 2026 }` (IMP-02 AC 1)
- [x] Review Focus 4: `Planilha 2026 - Outubro (1).csv` → 10/2026; `X 2026 - MARÇO.csv` e `X 2026 - marco.csv` → 3/2026
- [x] `Planilha 2025 2026 - Janeiro.csv` → ano 2026 (o último número de quatro dígitos)
- [x] `outubro.csv` → `{ mes: 10, ano: null }`; `Planilha 2026 - Resumo.csv` → `{ mes: null, ano: 2026 }`; ano 1999 → `ano: null` (AC 2)
- [x] `competenciaDeAnoEMes(2026, 3)` → `"2026-03"`; mês 0 ou 13 → `COMPETENCIA_INVALIDA`
- [x] 100% de branches em ambos os arquivos
**Tests**: unit
**Gate**: quick
**Commit**: `feat(importacao): pré-selecionar mês e ano pelo nome do arquivo`

#### T5: Conferir a aba contra os totais da planilha
**What**: `conferirAba(aba)` por bloco e de Saídas.
**Where**: `src/domain/importacao/conferir-aba.ts`
**Depends on**: T3
**Reuses**: `somar`, `ZERO_CENTS`
**Requirement**: IMP-05
**Interfaces**: produz `ConferenciaDeBloco`, `Conferencia`, `conferirAba` (design.md)
**Tools**: nenhuma
**Done when**:
- [ ] Outubro: FIXOS, CARTAO, ENTRADAS conferem; GASTOS `confere = false`, `somaLida` 12450, `diferenca` −1200; Saídas confere com `somaLida` 238784 (IMP-05 AC 1-4)
- [ ] Novembro: tudo confere; `temDivergencia = false`
- [ ] Dezembro: CARTAO `diferenca` +4000; Saídas `somaLida` 244333, `totalDaPlanilha` 248333, não confere
- [ ] Total ausente (`null`) → `confere = false`, `diferenca = null` (AC 3)
- [ ] Bloco sem linhas → `somaLida = ZERO_CENTS`
- [ ] 100% de branches
**Tests**: unit
**Gate**: quick
**Commit**: `feat(importacao): conferir a aba contra os totais da própria planilha`

### Phase 1 — Reconhecimento e plano, puros

#### T6: Reprecificar parcelas a partir de uma
**What**: `reprecificarAPartirDe(compra, aPartirDe, valor)`.
**Where**: `src/domain/parcelamento/reprecificar-parcelas.ts`
**Depends on**: nenhuma
**Reuses**: `somar`, tipos de `src/domain/tipos.ts`
**Requirement**: IMP-07
**Interfaces**: produz `ParcelaDaCompra`, `CompraParaReprecificar`, `Reprecificacao`, `reprecificarAPartirDe` (design.md)
**Tools**: nenhuma
**Done when**:
- [ ] Fone: amortizado 0, parcelas 1–3 de 3334, a partir de 2 com 3333 → parcelas `[{2,3333},{3,3333}]`, total 10000 (IMP-07 AC 10)
- [ ] Livro de 30: parcelas 1–2 de 3000, a partir de 2 com 3002 → total 6002
- [ ] Compra em andamento: amortizado 126000, parcelas 7–10 de 21000, a partir de 9 com 21100 → total 126000 + 21000 + 21000 + 21100 + 21100
- [ ] `aPartirDe` que não é parcela gravada (6 na compra acima) → `PARCELA_INICIAL_INVALIDA`
- [ ] Conservação: em todos os casos, total = amortizado + soma das parcelas devolvidas e das não alteradas
- [ ] 100% de branches
**Tests**: unit
**Gate**: quick
**Commit**: `feat(parcelamento): reprecificar as parcelas a partir de uma, conservando a soma`

#### T7: Reconhecer fixos e receitas fixas entre abas
**What**: `reconhecerRecorrencias(linhas, vigentes)`.
**Where**: `src/domain/importacao/reconhecer-recorrencias.ts`
**Depends on**: T2
**Reuses**: `normalizarNome`
**Requirement**: IMP-07
**Interfaces**: produz `RecorrenciaVigente`, `LinhaDeRecorrencia`, `DestinoDeRecorrencia`, `RecorrenciasReconhecidas`, `reconhecerRecorrencias` (design.md)
**Tools**: nenhuma
**Done when**:
- [ ] Mesmo nome normalizado e meio, mesmo valor → `INALTERADA` (IMP-07 AC 1, 3)
- [ ] Valor diferente → `REAJUSTE` com `de` 10000 e `para` 11000 (AC 4)
- [ ] Vigente sem linha → em `encerrar` (AC 5); Academia/Cartão Roxo em novembro
- [ ] Linha reconhecida com `valor = null` → `PRESENTE_SEM_VALOR`, e a vigente **não** vai para `encerrar` (AC 6)
- [ ] Linha com `valor = null` e sem par → fora de `destinos` e fora de `encerrar`
- [ ] Mesmo nome em outro meio → `NOVA` (Academia/Cartão Roxo em outubro, ao lado de Academia/Débito)
- [ ] Entrada (`meioPagamentoId = null`) reconhece só pelo nome (AC 2)
- [ ] Duas linhas e uma vigente com a mesma chave → a primeira pareia, a segunda é `NOVA` (AC 12)
- [ ] Review Focus 2: `"Internet "` e `"internet"` reconhecem `"Internet"`
- [ ] 100% de branches
**Tests**: unit
**Gate**: quick
**Commit**: `feat(importacao): reconhecer fixos e receitas fixas da aba anterior`

#### T8: Reconhecer compras parceladas pela sequência
**What**: `reconhecerCompras(linhas, emCurso)`.
**Where**: `src/domain/importacao/reconhecer-compras.ts`
**Depends on**: T2
**Reuses**: `normalizarNome`, `ParcelaDaLinha`
**Requirement**: IMP-07
**Interfaces**: produz `TOLERANCIA_DE_RECONHECIMENTO`, `CompraEmCurso`, `LinhaDeCompra`, `DestinoDeCompra`, `ComprasReconhecidas`, `reconhecerCompras` (design.md)
**Tools**: nenhuma
**Done when**:
- [ ] Sofá 8/10 contra compra com `numeroEmM` 8, `qtdParcelas` 10, mesmo meio → `CONTINUA` (IMP-07 AC 7)
- [ ] Fone 2/3 de 3333 contra `valorEmM` 3334 → `CONTINUA_COM_NOVO_VALOR` 3334 → 3333
- [ ] Diferença de 101 centavos → `COMPRA_NOVA`; de 100 → reconhece (AC 8)
- [ ] Os dois Livros de novembro (3002 e 2000, nessa ordem) contra as compras de 3000 e 2000: a de 3002 fica com a de 3000, a de 2000 com a de 2000; nenhuma compra é usada duas vezes (AC 9)
- [ ] `numeroEmM` diferente de `n`, ou `qtdParcelas` diferente de `t`, ou meio diferente → `COMPRA_NOVA`
- [ ] Compra em curso sem linha → em `naoAparecem` (Óculos em dezembro — AC 11)
- [ ] 100% de branches
**Tests**: unit
**Gate**: quick
**Commit**: `feat(importacao): reconhecer compras parceladas pela sequência das parcelas`

#### T9: Montar o plano da importação
**What**: `planejarImportacao({ aba, estado, decisoes })` compõe categorias, pendências, reconhecimento, destinos, operações e `quantidadeAImportar`; exporta o necessário em `src/domain/index.ts`.
**Where**: `src/domain/importacao/planejar-importacao.ts`
**Depends on**: T3, T5, T7, T8
**Reuses**: `conferirAba`, `reconhecerRecorrencias`, `reconhecerCompras`, `normalizarNome`
**Requirement**: IMP-03, IMP-04, IMP-05
**Interfaces**: produz `ClasseEntrada`, `DecisaoDeEntrada`, `DecisoesDaImportacao`, `EstadoParaImportacao`, `Pendencias`, `DestinoDaLinha`, `LinhaDaPrevia`, `OperacoesDaImportacao`, `PlanoDeImportacao`, `planejarImportacao` (design.md)
**Tools**: nenhuma
**Done when**:
- [ ] Outubro sem decisões: pendências `débito` (linhas 4), `cartão roxo` (8), `cartão verde` (1) — contando só linhas lidas; entradas `salário a`, `salário b`, `reembolso`; `operacoes = null` (IMP-04 AC 1, 3)
- [ ] Outubro com as decisões completas: 6 recorrências novas (4 despesas, 2 receitas), 6 compras novas, 4 avulsos (3 despesas, 1 receita), `quantidadeAImportar` 16 (IMP-05 AC 9)
- [ ] Categorias de outubro: CRIAR Moradia, Assinaturas, Saúde, Casa, Eletrônicos, Estudo, Mercado, Lazer — "Mercado" com a grafia da primeira linha, "Seguros" (só na linha não lida) não criada (IMP-03 AC 9-11)
- [ ] Categoria existente arquivada → `REATIVAR`; existente ativa → `REAPROVEITAR`; célula vazia → `chaveCategoria = null` (AC 12)
- [ ] Compra nova do Sofá: `qtdParcelas` 10, `parcelaInicial` 7, `valorParcela` 21000 (IMP-03 AC 5)
- [ ] `chaveDeOrigem` da Padaria em outubro = `2026-10|GASTOS|2` (AC 8)
- [ ] Novembro com o estado depois de outubro e as decisões lembradas: pendências só `cartão azul` e `presente` (IMP-04 AC 5); com elas resolvidas, os destinos e `quantidadeAImportar` 9 da tabela de novembro do design; `deixamDeValer` = Academia/Cartão Roxo
- [ ] Dezembro: nenhuma pendência (Bônus ilegível não pede classificação); `naoAparecem` = Óculos parcela 4; `deixamDeValer` = Salário B; `quantidadeAImportar` 2
- [ ] Review Focus 2: decisão lembrada para `cartão roxo` atende a linha com "Tipo" `"Cartão  Roxo"`
- [ ] Review Focus 5: `Cartão Laranja` e `cartão laranja ` na mesma aba → uma pendência, com a soma das linhas
- [ ] 100% de branches
**Tests**: unit
**Gate**: build
**Commit**: `feat(importacao): montar o plano completo de uma aba`

### Phase 2 — Banco e ports

#### T10: Repositórios aceitam uma transação
**What**: Tipo `Executor` e construtores dos repositórios Drizzle passando a recebê-lo, sem mudança de comportamento.
**Where**: `src/infrastructure/db/client.ts` (+ construtores em `src/infrastructure/db/repositories/*.repository.ts`)
**Depends on**: nenhuma
**Reuses**: `PgDatabase` de `drizzle-orm/pg-core`, `NodePgQueryResultHKT` de `drizzle-orm/node-postgres`
**Requirement**: IMP-06
**Interfaces**: produz `Executor` (design.md, Decisão 1)
**Tools**: nenhuma
**Done when**:
- [ ] Todos os testes de integração existentes passam sem alteração
- [ ] Novo teste: `RecorrenciaRepositoryDrizzle` e `CompraRepositoryDrizzle` construídos sobre `tx` dentro de `db.transaction`, seguidos de um `throw`, não deixam linha nenhuma em `recorrencia`, `recorrencia_versao`, `compra_parcelada` e `movimento` (o savepoint interno não escapa do rollback externo)
- [ ] `pnpm typecheck` sem erro
**Tests**: integration
**Gate**: full
**Commit**: `refactor(db): deixar os repositórios aceitarem uma transação de fora`

#### T11: Tabelas do registro de importação
**What**: `importacao` e `importacao_decisao` em `schema.ts`, migration `0003` gerada e revisada, e as duas tabelas em `limpar.ts`.
**Where**: `src/infrastructure/db/schema.ts` (+ `drizzle/0003_*.sql`, `drizzle/meta/*`, `src/infrastructure/db/limpar.ts`)
**Depends on**: nenhuma
**Reuses**: `competenciaNoDiaUm` de `schema.ts`
**Requirement**: IMP-02, IMP-04
**Interfaces**: produz as tabelas da Decisão 5 do design
**Tools**: nenhuma
**Done when**:
- [ ] `recriarBancoDeTeste` aplica `0000` a `0003` num banco limpo
- [ ] Segunda `importacao` com a mesma competência → violação de unicidade (base do IMP-02 AC 7)
- [ ] Competência fora do dia 1 → violação de `CHECK`
- [ ] `importacao_decisao` com `tipo = 'ENTRADA'` e `classe` nula, ou `tipo = 'MEIO'` com `classe` preenchida → violação de `CHECK`
- [ ] Duas decisões com o mesmo `(tipo, nome_normalizado)` → violação de unicidade
- [ ] `limparDados` esvazia as duas tabelas novas
- [ ] `pnpm db:sql` continua imprimindo o bloco com a migration nova e o veredito de conferência
**Tests**: integration
**Gate**: full
**Commit**: `feat(db): registrar importações e decisões lembradas`

#### T12: Ports e fakes da importação
**What**: Métodos novos nas ports existentes, `ImportacaoRepository`, `RepositoriosDaImportacao`, `TransacaoDaImportacao`, e os fakes correspondentes.
**Where**: `src/application/ports/repositories.ts` (+ `src/application/ports/fakes.ts`)
**Depends on**: T6, T9
**Reuses**: `EstadoEmMemoria`, `criarFakes`
**Requirement**: IMP-04, IMP-06, IMP-07
**Interfaces**: produz os tipos da seção "Ports" do design; `criarFakes()` passa a incluir `recorrencias`, `importacoes` e `transacao`
**Tools**: nenhuma
**Done when**:
- [ ] `FakeCompraRepository.reprecificar` grava valores e total, e recusa com `CONSERVACAO_VIOLADA` quando total ≠ amortizado + soma
- [ ] `FakeImportacaoRepository.registrar` com competência repetida lança como a unicidade do banco
- [ ] `FakeImportacaoRepository.decisoesLembradas` devolve o que `registrar` gravou, com upsert por `(tipo, chave)`
- [ ] `FakeCadastroRepository.listarTodasAsCategorias` inclui arquivadas; `buscarCategoriaPorNome` ignora caixa
- [ ] `FakeMovimentoRepository.criarAvulso` guarda `origemDado` e recusa `(fonte, chave)` repetido
- [ ] Testes existentes de `src/application` passam sem alteração
**Tests**: unit
**Gate**: quick
**Commit**: `feat(importacao): declarar as ports e os fakes da importação`

#### T13: Implementar os métodos novos das ports existentes
**What**: `listarTodasAsCategorias` no cadastro, `buscarPorId` e `reprecificar` na compra, `origemDado` em `criarAvulso`.
**Where**: `src/infrastructure/db/repositories/compra.repository.ts` (+ `cadastro.repository.ts`, `movimento.repository.ts`)
**Depends on**: T10, T12
**Reuses**: `paraLancamento`, `deCompetencia`, o padrão de verificação de conservação de `salvarComParcelas`
**Requirement**: IMP-03, IMP-07
**Interfaces**: implementa os métodos da seção "Ports" do design
**Tools**: nenhuma
**Done when**:
- [ ] `reprecificar` atualiza só as parcelas informadas e o total, e falha com `CONSERVACAO_VIOLADA` sem gravar nada quando total ≠ amortizado + soma no banco
- [ ] `reprecificar` não toca outra compra nem lançamento de outra origem
- [ ] `criarAvulso` com `origemDado` grava `origem_dado = 'PLANILHA'` e `origem_hash` = chave; a mesma chave duas vezes viola `movimento_origem_dado_hash_uq`; sem `origemDado`, as colunas ficam nulas como hoje
- [ ] `buscarPorId` devolve a compra com as parcelas; id inexistente → `null`
- [ ] `listarTodasAsCategorias` inclui arquivada
**Tests**: integration
**Gate**: full
**Commit**: `feat(db): reprecificar compra e gravar a origem do avulso importado`

#### T14: Repositório e transação da importação
**What**: `ImportacaoRepositoryDrizzle` e `TransacaoDaImportacaoDrizzle` (transação + `pg_advisory_xact_lock(hashtext('importacao'))` + repositórios sobre o `tx`).
**Where**: `src/infrastructure/db/repositories/importacao.repository.ts` (+ `src/infrastructure/db/transacao-da-importacao.ts`)
**Depends on**: T10, T11, T12
**Reuses**: repositórios existentes construídos com `Executor`
**Requirement**: IMP-02, IMP-04, IMP-06
**Interfaces**: implementa `ImportacaoRepository` e `TransacaoDaImportacao`
**Tools**: nenhuma
**Done when**:
- [ ] `ultimaCompetenciaImportada` → `null` sem registro; `2026-11` depois de registrar outubro e novembro
- [ ] `haLancamentoCompraOuRecorrencia` → `true` com uma linha em qualquer das três tabelas, inclusive avulso cancelado; `false` no banco limpo (IMP-02 AC 6)
- [ ] `registrar` grava a importação e faz upsert das decisões: registrar `cartão roxo` com outro meio substitui o anterior
- [ ] Exceção dentro de `executar` desfaz escritas feitas por qualquer repositório recebido (IMP-06 AC 2)
- [ ] Duas chamadas concorrentes a `executar` que registram a mesma competência: uma conclui e a outra falha com violação de unicidade (IMP-02 AC 7)
**Tests**: integration
**Gate**: full
**Commit**: `feat(db): registrar a importação dentro de uma transação serializada`

#### T15: Script de limpeza para recomeçar
**What**: SQL que esvazia o que a importação cria e preserva cadastros.
**Where**: `src/infrastructure/db/sql/limpar-para-importar.sql`
**Depends on**: T11
**Reuses**: `recriarBancoDeTeste`, `semearCadastroBase`
**Requirement**: IMP-09
**Interfaces**: arquivo SQL executável no SQL Editor do Neon, sem `CASCADE`
**Tools**: nenhuma
**Done when**:
- [ ] Teste de integração lê o arquivo e o executa num banco com dados em todas as tabelas
- [ ] Depois: `movimento`, `compra_parcelada`, `recorrencia_versao`, `recorrencia`, `importacao`, `importacao_decisao` vazias (IMP-09 AC 1)
- [ ] `usuario`, `meio_pagamento` e `categoria` com as mesmas linhas de antes (AC 2)
- [ ] `ultimaCompetenciaImportada` → `null` e `haLancamentoCompraOuRecorrencia` → `false` (AC 3)
**Tests**: integration
**Gate**: build
**Commit**: `feat(db): script de limpeza para recomeçar a importação`

### Phase 3 — Aplicação e actions

#### T16: Schema da importação
**What**: `entradaPreviaImportacaoSchema` e `entradaGravacaoImportacaoSchema`.
**Where**: `src/application/schemas/importacao.schema.ts`
**Depends on**: nenhuma
**Reuses**: padrão de `compra.schema.ts` (competência via `criarCompetencia`)
**Requirement**: IMP-01, IMP-06
**Interfaces**: produz `MAX_CONTEUDO_PLANILHA` e os dois schemas (design.md)
**Tools**: nenhuma
**Done when**:
- [ ] `nomeArquivo` sem `.csv` (`aba.xlsx`) é recusado; `ABA.CSV` é aceito (IMP-01 AC 1)
- [ ] `conteudo` com 1.048.577 caracteres é recusado; com 1.048.576, aceito
- [ ] `competencia` `2026-13` recusada; `decisoes.meios` com valor que não é uuid recusado; `classe` fora de `FIXA`/`AVULSA` recusada
- [ ] Gravação exige `confirmouDivergencia` booleano
**Tests**: unit
**Gate**: quick
**Commit**: `feat(importacao): validar o payload da prévia e da gravação`

#### T17: Prever a importação
**What**: `carregarEstadoParaImportacao` e `preverImportacao`, com a guarda de ordem e de banco vazio.
**Where**: `src/application/importacao/prever-importacao/handler.ts` (+ `src/application/importacao/carregar-estado.ts`)
**Depends on**: T9, T12
**Reuses**: `valeNaCompetencia`, `versaoVigente`, `listarPorCompetencia`, `totaisDeParcelas`, `lerCsv`, `lerAba`, `planejarImportacao`
**Requirement**: IMP-02, IMP-04, IMP-05
**Interfaces**: produz `CodigoErroImportacao`, `ErroImportacao`, `EntradaDaImportacao`, `PreviaDaImportacao`, `preverImportacao`, `carregarEstadoParaImportacao` (design.md)
**Tools**: nenhuma
**Done when**:
- [ ] Banco vazio, sem registro, outubro → prévia com `competenciaEsperada = null` e as pendências de outubro
- [ ] Sem registro e com um avulso no banco → `IMPORTACAO_BANCO_NAO_VAZIO` (IMP-02 AC 6)
- [ ] Último registro `2026-10`, prévia de `2026-12` → `IMPORTACAO_FORA_DE_ORDEM` com `detalhes.esperada = "2026-11"` (AC 5)
- [ ] Último registro `2026-10` → `competenciaEsperada = "2026-11"` (AC 4)
- [ ] `carregarEstadoParaImportacao(2026-11)` sobre o estado de outubro: despesas vigentes Aluguel, Internet (10000), Academia ×2; receitas Salário A e B; compras com parcela em novembro: Sofá 8, Fone 2, Óculos 3, os dois Livros 2 — Curso fora
- [ ] Arquivo inválido e bloco ausente propagam `PLANILHA_ARQUIVO_INVALIDO` e `PLANILHA_BLOCO_AUSENTE` com `detalhes.bloco`
- [ ] Nada é escrito em nenhum fake
**Tests**: unit
**Gate**: quick
**Commit**: `feat(importacao): prever a importação de uma aba sem gravar nada`

#### T18: Gravar a importação
**What**: `gravarImportacao(transacao, entrada)` executa o plano com os casos de uso existentes dentro da transação.
**Where**: `src/application/importacao/gravar-importacao/handler.ts`
**Depends on**: T17, T6
**Reuses**: `criarRecorrencia`, `registrarVersao`, `encerrarRecorrencia`, `criarCompraParcelada` (modo `VALOR_PARCELA`, `politicaResiduo` `PRIMEIRAS`, `idempotencyKey` de `crypto.randomUUID()`), `reprecificarAPartirDe`, `movimentos.criarAvulso` com `origemDado`
**Requirement**: IMP-03, IMP-04, IMP-05, IMP-06, IMP-07
**Interfaces**: produz `EntradaGravarImportacao`, `ResumoDaImportacao`, `gravarImportacao` (design.md)
**Tools**: nenhuma
**Done when**:
- [ ] Outubro com decisões completas e `confirmouDivergencia = true` → fakes com as recorrências, compras, avulsos e categorias da tabela de outubro; todos com `usuarioId` de entrada, `dataEvento` `2026-10-01`, `pagoEm` nulo, recorrências com `diaVencimento` 1 (IMP-03 AC 1-12)
- [ ] Compra do Óculos com `valorAmortizadoAnterior` 8000 e parcelas só de 2 a 5 (AC 6)
- [ ] Outubro com `confirmouDivergencia = false` → `IMPORTACAO_DIVERGENCIA_NAO_CONFIRMADA` e nada gravado nos fakes (IMP-05 AC 8)
- [ ] Decisão de meio faltando → `IMPORTACAO_PENDENCIA_ABERTA` (IMP-04 AC 7)
- [ ] Novembro depois de outubro: Internet ganha vigência 2026-11 de 11000; Academia/Cartão Roxo encerrada com `competenciaFim` 2026-10; Fone reprecificado para total 10000; Tênis criado; resumo `criados` 5, `alterados` 4, `encerrados` 1
- [ ] Decisões lembradas gravadas depois da gravação, e a importação registrada com a competência e o nome do arquivo
- [ ] `ResumoDaImportacao.proxima` = competência seguinte
**Tests**: unit
**Gate**: quick
**Commit**: `feat(importacao): gravar o plano de uma aba com os casos de uso existentes`

#### T19: Actions da importação
**What**: `previaDaPlanilha` e `importarPlanilha` como Server Actions (sobre os casos de uso `preverImportacao` e `gravarImportacao`), e os códigos novos em `src/lib/erros.ts`.
**Where**: `src/app/actions/importacao.ts` (+ `src/lib/erros.ts`)
**Depends on**: T13, T14, T16, T18
**Reuses**: esqueleto de `src/app/actions/compras.ts`; `TransacaoDaImportacaoDrizzle`; `formatarCompetencia`
**Requirement**: IMP-02, IMP-05, IMP-06, IMP-07
**Interfaces**: produz `PreviaParaATela` e as duas actions (design.md)
**Tools**: nenhuma
**Done when**:
- [ ] `requireSession()` é a primeira instrução das duas (leitura do fonte, como em `compras.integration.test.ts`); sem sessão → `NAO_AUTENTICADO` sem consulta ao banco (IMP-06 AC 4)
- [ ] Payload inválido → `VALIDACAO` com `campos`
- [ ] Sequência outubro → novembro → dezembro com as fixtures produz exatamente o **estado final esperado** do design (7 recorrências, 7 compras com os totais listados, 9 avulsos com `origem_dado = 'PLANILHA'`, 3 importações, 8 decisões) (IMP-07)
- [ ] Repetir a gravação de outubro depois de feita → `IMPORTACAO_FORA_DE_ORDEM`, com a mensagem "As abas entram em sequência. A próxima é Novembro de 2026."
- [ ] Falha injetada na última escrita (mock do `criarAvulso` lançando na quarta chamada) → banco igual ao de antes e sem linha em `importacao` (IMP-06 AC 2)
- [ ] Duas gravações de outubro disparadas juntas → uma `ok`, a outra `IMPORTACAO_FORA_DE_ORDEM` (IMP-02 AC 7)
- [ ] Sucesso chama `revalidatePath` para `/2026-10`, `/2026-10/lancamentos` e `/2026-10/fixos` (IMP-06 AC 3)
- [ ] Erro não previsto → `ERRO_INESPERADO` com referência, sem stack (AC 5)
- [ ] `PLANILHA_BLOCO_AUSENTE` sai com "O arquivo não tem o bloco “Entradas”. Exporte a aba de um mês da planilha."
**Tests**: integration
**Gate**: build
**Commit**: `feat(importacao): actions de prévia e gravação da planilha`

### Phase 4 — Interface

#### T20: Extrair o cadastro de meio para um componente
**What**: Mover os campos de meio e o `CadastroInline` de `form-lancamento-avulso.tsx` para `CadastroDeMeioInline`, com `nomeInicial` opcional.
**Where**: `src/components/cadastro-de-meio-inline.tsx` (+ `form-lancamento-avulso.tsx`)
**Depends on**: nenhuma
**Reuses**: `CadastroInline`, `entradaMeioPagamentoSchema`, `TIPOS_DE_MEIO`
**Requirement**: IMP-04
**Interfaces**: produz `CadastroDeMeioInline({ idDoControle, rotulo, nomeInicial?, criarMeioDePagamento, aoCriado, children })`
**Tools**: nenhuma
**Done when**:
- [ ] Todos os testes existentes de `form-lancamento-avulso.test.tsx` passam sem alteração (é movimentação, não cópia)
- [ ] Com `nomeInicial = "Cartão Azul"`, abrir o cadastro mostra o campo nome preenchido com "Cartão Azul"
- [ ] `aoCriado` recebe `{ id, nome, geraFatura }` do meio criado
**Tests**: componentes
**Gate**: quick
**Commit**: `refactor(componentes): extrair o cadastro de meio de pagamento para reuso`

#### T21: Passo 1 — arquivo e mês
**What**: `PassoArquivo`.
**Where**: `src/components/importacao/passo-arquivo.tsx`
**Depends on**: T3, T4
**Reuses**: `lerCsv`, `lerAba`, `competenciaDoNomeDoArquivo`, `formatarCompetencia`
**Requirement**: IMP-01, IMP-02, IMP-08
**Interfaces**: produz `PassoArquivo({ nomeDaPessoa, competenciaEsperada, aoContinuar })` com `aoContinuar({ nomeArquivo, conteudo, competencia })`
**Tools**: nenhuma
**Done when**:
- [ ] Soltar `Planilha 2026 - Outubro.csv` na área mostra o nome do arquivo e "4 blocos encontrados", e seleciona Outubro e 2026 (IMP-08 AC 3-4, IMP-02 AC 1)
- [ ] O mesmo arquivo pelo seletor (acionado por `Enter` no botão) tem o mesmo efeito (IMP-08 AC 7)
- [ ] Exibe "Outubro de 2026" e "Confira o ano antes de continuar" (IMP-02 AC 3); "Tudo entra em nome de Pessoa A" (IMP-08 AC 5)
- [ ] Com `competenciaEsperada = "2026-11"`, exibe "Próximo mês esperado: Novembro de 2026" (IMP-02 AC 4)
- [ ] Arquivo `outubro.csv`: ano sem seleção e "Continuar" desabilitado até escolher (AC 2)
- [ ] Arquivo `.xlsx` ou acima de 1 MB: mensagem de `PLANILHA_ARQUIVO_INVALIDO` e nada de prévia (IMP-01 AC 1)
- [ ] Arquivo sem "Entradas": mensagem de bloco ausente nomeando "Entradas"
**Tests**: componentes
**Gate**: quick
**Commit**: `feat(importacao): passo do arquivo e do mês no diálogo`

#### T22: Passo 2 — o que precisa de você
**What**: `PassoPendencias`.
**Where**: `src/components/importacao/passo-pendencias.tsx`
**Depends on**: T19, T20
**Reuses**: `CadastroDeMeioInline`, `OpcaoDeMeio`
**Requirement**: IMP-04
**Interfaces**: produz `PassoPendencias({ pendencias, meios, criarMeioDePagamento, aoConcluir })` com `aoConcluir(decisoes)`
**Tools**: nenhuma
**Done when**:
- [ ] Mostra um seletor por "Tipo" com o nome e a quantidade de linhas — "Débito (4 linhas)" na prévia de outubro (IMP-04 AC 1)
- [ ] "+ cadastrar" abre `CadastroDeMeioInline` com o nome do "Tipo" preenchido e seleciona o meio criado (AC 2)
- [ ] Cada entrada tem "fixa"/"avulsa" e "cai em" listando só meios sem fatura — Cartão Roxo não aparece (AC 3)
- [ ] "Continuar" fica desabilitado enquanto houver seletor sem escolha
- [ ] `aoConcluir` recebe as chaves normalizadas com os ids escolhidos
**Tests**: componentes
**Gate**: quick
**Commit**: `feat(importacao): passo das decisões que a planilha não traz`

#### T23: Passo 3 — conferência
**What**: `PassoConferencia`.
**Where**: `src/components/importacao/passo-conferencia.tsx`
**Depends on**: T19
**Reuses**: `formatarBRL`, `formatarCompetencia`
**Requirement**: IMP-05
**Interfaces**: produz `PassoConferencia({ previa, gravando, erro, aoImportar })` com `aoImportar(confirmouDivergencia)`
**Tools**: nenhuma
**Done when**:
- [ ] Prévia de outubro: quatro blocos com linhas, soma e total; Gastos do Mês marcado como divergente com "R$ 12,00" de diferença; Saídas conferido (IMP-05 AC 1-4)
- [ ] Abrir Fixos de novembro mostra "reajuste a partir de Novembro de 2026: R$ 100,00 → R$ 110,00"; abrir Cartão mostra "continua de Outubro de 2026, com valor novo: R$ 33,34 → R$ 33,33" (AC 5)
- [ ] Lista "Deixa de valer a partir de Novembro de 2026: Academia" e, em dezembro, "Não aparece nesta aba: Óculos"
- [ ] Linhas não lidas com bloco, nome e motivo em pt-BR ("sem valor", "valor zero", "valor não é dinheiro", "parcela fora do formato n/t", "sem nome") (AC 6)
- [ ] Com divergência, o botão fica desabilitado até marcar "Entendi a diferença, importar mesmo assim" (AC 7)
- [ ] Rótulo "Importar 16 lançamentos" em outubro (AC 9)
- [ ] Erro recebido aparece dentro do passo (IMP-08 AC 8)
**Tests**: componentes
**Gate**: quick
**Commit**: `feat(importacao): conferência da aba antes de gravar`

#### T24: Diálogo da importação e resultado
**What**: `DialogoImportacao` orquestra os passos e `ResultadoImportacao` fecha o fluxo.
**Where**: `src/components/importacao/dialogo-importacao.tsx` (+ `resultado-importacao.tsx`)
**Depends on**: T21, T22, T23
**Reuses**: padrão de `<dialog>` de `DialogoDeCadastro`
**Requirement**: IMP-08
**Interfaces**: produz `DialogoImportacao({ nomeDaPessoa, competenciaEsperada, meios, previaDaPlanilha, importarPlanilha, criarMeioDePagamento })`, com as actions de T19 entrando por props
**Tools**: nenhuma
**Done when**:
- [ ] O botão "Importar planilha" abre um `<dialog>` nativo via `showModal` (IMP-08 AC 2)
- [ ] Prévia sem pendências vai do passo 1 direto à conferência (IMP-04 AC 6)
- [ ] Com pendências, o passo 2 aparece e, ao concluir, a prévia é pedida de novo com as decisões
- [ ] Gravação bem-sucedida mostra "16 criados" (ou as contagens recebidas), o link "Abrir Outubro de 2026" para `/2026-10` e "Próximo: Novembro de 2026" (IMP-08 AC 6)
- [ ] Recusa do servidor mantém o diálogo aberto com a mensagem (AC 8)
**Tests**: componentes
**Gate**: quick
**Commit**: `feat(importacao): diálogo da importação do começo ao resultado`

#### T25: Botão na Visão geral
**What**: A Visão geral passa a exibir o diálogo no topo.
**Where**: `src/app/(app)/[competencia]/page.tsx`
**Depends on**: T24
**Reuses**: `sessaoDaUI`, `criarRepositorios`, `ImportacaoRepositoryDrizzle.ultimaCompetenciaImportada`
**Requirement**: IMP-08
**Interfaces**: consome `DialogoImportacao`
**Tools**: nenhuma
**Done when**:
- [ ] O título do mês e o botão "Importar planilha" ficam na mesma linha, como em Lançamentos (IMP-08 AC 1)
- [ ] A página passa o nome de quem está logado, a competência esperada e os meios disponíveis
- [ ] Gate de build passa
**Tests**: none
**Gate**: build
**Commit**: `feat(painel): botão de importar a planilha na Visão geral`

### Phase 5 — Ponta a ponta e fechamento

#### T26: Importar de ponta a ponta
**What**: e2e que importa outubro e novembro pela interface.
**Where**: `e2e/importacao.spec.ts`
**Depends on**: T15, T25
**Reuses**: `entrar`, `limparDados`, `semearCadastroBase`, as fixtures de `src/domain/importacao/__fixtures__/`
**Requirement**: IMP-02, IMP-04, IMP-05, IMP-07, IMP-08
**Interfaces**: —
**Tools**: Playwright
**Done when**:
- [ ] Pessoa A abre `/2026-10`, importa outubro: resolve três "Tipo" e três entradas, vê Gastos do Mês divergente, confirma e importa; o painel de outubro mostra "Receitas do mês" +R$ 10.150,00 (IMP-08 Independent Test)
- [ ] Na sequência, o diálogo mostra "Próximo mês esperado: Novembro de 2026"; importar novembro pede só `Cartão Azul` e Presente, não tem divergência e não exige confirmação (IMP-04 Independent Test)
- [ ] `/2026-11/fixos` mostra Internet com R$ 110,00 e não mostra Academia no Cartão Roxo (IMP-07)
- [ ] Num banco limpo, depois de importar só outubro, escolher dezembro é recusado com a mensagem que nomeia Novembro de 2026 (IMP-02 Independent Test)
**Tests**: e2e
**Gate**: e2e
**Commit**: `test(e2e): importar outubro e novembro pela Visão geral`

#### T27: Documentar o uso e fechar a fatia
**What**: `docs/importacao.md` (exportar a aba, ordem das três, limpeza local e no Neon, o que fazer quando a conferência diverge), roadmap com a fatia seguinte, handoff e traceability.
**Where**: `docs/importacao.md` (+ `docs/roadmap.md`, `.specs/HANDOFF.md`, `.specs/STATE.md`, `spec.md`)
**Depends on**: T26
**Reuses**: `docs/deploy.md` como modelo de roteiro
**Requirement**: IMP-09
**Interfaces**: —
**Tools**: nenhuma
**Done when**:
- [ ] `docs/importacao.md` descreve: download da aba em CSV, as três importações em sequência, o teste primeiro em localhost, o script de limpeza (`limpar-para-importar.sql`) e quando rodá-lo, e o significado de cada marcação da conferência
- [ ] `docs/roadmap.md` move a importação de "Em andamento" para "Pronto" e mantém **editar qualquer item lançado, incluindo trocar a categoria** como a fatia seguinte (registrada no planejamento, em 2026-10-24)
- [ ] Traceability do `spec.md` com cada requisito `Verified` ou com a lacuna nomeada
- [ ] Nenhum dado real em nenhum dos arquivos (busca pelos termos conhecidos da planilha registrada no commit)
**Tests**: none
**Gate**: build
**Commit**: `docs(importacao): roteiro de uso, roadmap da edição e handoff`

---

## Task Granularity Check

| Task | Escopo | Status |
| --- | --- | --- |
| T1, T2, T4–T9, T16 | 1 função pura cada (T4: + helper de competência) | ✅ |
| T3 | 1 função + 3 fixtures de teste | ⚠️ coeso: as fixtures são o dado da função |
| T10 | 1 tipo + troca de tipo nos construtores | ⚠️ coeso: refatoração mecânica sem comportamento |
| T11 | 1 schema + migration gerada + `limpar.ts` | ⚠️ coeso: nascem juntos |
| T12 | ports + fakes | ⚠️ coeso: a port não compila sem o fake |
| T13 | 3 métodos em 3 repositórios existentes | ⚠️ coeso: implementam a mesma ampliação de port |
| T14 | 1 repositório + 1 transação | ⚠️ coeso: a transação entrega o repositório |
| T15, T19–T26 | 1 arquivo de produto cada (T19: + mensagens; T24: + resultado) | ✅ |
| T27 | documentação | ✅ |

## Diagram-Definition Cross-Check

| Task | Depends On (corpo) | Diagrama | Status |
| --- | --- | --- | --- |
| T1 | — | — | ✅ |
| T2 | — | — | ✅ |
| T3 | T1, T2 | T1→T3, T2→T3 | ✅ |
| T4 | — | — | ✅ |
| T5 | T3 | T3→T5 | ✅ |
| T6 | — | — | ✅ |
| T7 | T2 | T2→T7 | ✅ |
| T8 | T2 | T2→T8 | ✅ |
| T9 | T3, T5, T7, T8 | T3→T9, T5→T9, T7→T9, T8→T9 | ✅ |
| T10 | — | — | ✅ |
| T11 | — | — | ✅ |
| T12 | T6, T9 | T6→T12, T9→T12 | ✅ |
| T13 | T10, T12 | T10→T13, T12→T13 | ✅ |
| T14 | T10, T11, T12 | T10→T14, T11→T14, T12→T14 | ✅ |
| T15 | T11 | T11→T15 | ✅ |
| T16 | — | — | ✅ |
| T17 | T9, T12 | T9→T17, T12→T17 | ✅ |
| T18 | T17, T6 | T17→T18, T6→T18 | ✅ |
| T19 | T13, T14, T16, T18 | T13→T19, T14→T19, T16→T19, T18→T19 | ✅ |
| T20 | — | — | ✅ |
| T21 | T3, T4 | T3→T21, T4→T21 | ✅ |
| T22 | T19, T20 | T19→T22, T20→T22 | ✅ |
| T23 | T19 | T19→T23 | ✅ |
| T24 | T21, T22, T23 | T21→T24, T22→T24, T23→T24 | ✅ |
| T25 | T24 | T24→T25 | ✅ |
| T26 | T15, T25 | T15→T26, T25→T26 | ✅ |
| T27 | T26 | T26→T27 | ✅ |

## Test Co-location Validation

| Task | Camada | Matriz exige | Task diz | Status |
| --- | --- | --- | --- | --- |
| T1–T9 | `src/domain/**` | unit | unit | ✅ |
| T10, T11, T13, T14, T15 | repositório / migration / SQL | integration | integration | ✅ |
| T12, T16, T17, T18 | `src/application/**` | unit | unit | ✅ |
| T19 | `src/app/actions/**` | integration | integration | ✅ |
| T20–T24 | `src/components/**` | componentes | componentes | ✅ |
| T25 | composição de página | none | none | ✅ |
| T26 | fluxo de usuário | e2e | e2e | ✅ |
| T27 | documentação | none | none | ✅ |
