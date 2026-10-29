# Editar gasto fixo e entrada fixa — Validação

## Validation: editar-fixos — **PASS**

**Result**: PASS ✅ — reverificação depois do F5 (2026-10-29, `e913f24`), autorizada pelo dono
depois da rodada 3. P4, C1, C2, E2, E2b e E3p morrem no `e2e/editar-fixo.spec.ts`, e o gate está
verde. Os 28 critérios têm assertion sobre o resultado da spec e mutante morto. Detalhe na seção
[Reverificação depois do F5](#reverificação-depois-do-f5), no fim do arquivo. As rodadas 1 a 3
seguem abaixo como foram escritas.

**Rodada 3** (2026-10-29, `df1a2de`): FAIL ❌ — a última do laço. O F4 mata E2, E2b e
E3p, e o gate está verde. A varredura dos demais campos que a página entrega ao formulário achou um
mutante vivo no mesmo elo: `categoriaId: null` (P4). Duas sondas mostram que a pessoa e o meio
constantes também passam (C1, C2). O código de produto está certo, e a correção é uma fix task de
e2e de 5 linhas, já verificada numa sonda (Fix 5). O caso escala para o dono. Detalhe na seção
[Rodada 3](#rodada-3), no fim do arquivo. As rodadas 1 e 2 seguem abaixo como foram escritas.

**Rodada 2** (2026-10-29, `bfc38f6`): FAIL ❌ — E2 e S3 morrem, as duas lacunas de precisão estão
fechadas e o gate está verde, mas dois mutantes novos sobrevivem no mesmo elo da página com o
formulário (E2b, E3p). Uma fix task de e2e, já verificada numa sonda. Detalhe na seção
[Rodada 2](#rodada-2).

**Rodada 1** (2026-10-28): FAIL ❌ — dois mutantes vivos, nenhum defeito de comportamento no código
de `48c79da`.

O código faz o que a spec pede em cada camada, e a rede é forte: 44 dos 46 mutantes morreram, cada
um no teste que o declara. O veredito vem dos dois que sobreviveram:

1. **A página pode passar ao formulário o valor errado, e nenhum teste vê (E2, EDF-01 AC 3).** Trocar
   `valorNoMesExibido(versoes, competencia)` pela última vigência, em
   `src/app/(app)/[competencia]/fixos/page.tsx:115`, passa na suíte inteira. O único teste que
   atravessa a página real é o e2e, e ele edita um fixo de vigência única, em que "a vigente no mês" e
   "a última" são o mesmo número. A consequência foi medida numa sonda, na worktree descartável:
   reajustar em novembro para R$ 110,00, abrir "Editar" em outubro e salvar sem mexer em nada
   **reescreve outubro para R$ 110,00**. Isso fere o EDF-03 AC 3 e o segundo Goal da spec ("nenhuma
   edição reescreve o valor de meses passados").
2. **"O mesmo erro do cadastro" só está provado para descrição, meio e categoria (S3, EDF-05 AC 3).**
   Os testes do schema afirmam `success === false` e nunca comparam a mensagem. Redefinir valor e dia
   no schema da edição com as mensagens padrão do Zod passa no schema, no formulário, na lista e na
   action.

As duas correções são testes, e não código. A sonda que mata a E2 já foi rodada: passa em `48c79da`
e falha com o mutante (ver Fix 1).

**Data**: 2026-10-28
**Spec**: `.specs/features/editar-fixos/spec.md` (EDF-01 a EDF-06, 28 critérios, 3 edge cases)
**Faixa do diff**: `d8ed89a..48c79da`, 10 commits, de `bee4dd7` (T1) a `48c79da` (T10). O
planejamento entrou em `d8ed89a` e fica fora da faixa.
**Verificador**: sub-agente independente (autor ≠ verificador). Somente leitura sobre código e teste
da fatia. As mutações rodaram numa `git worktree` descartável, em modo detached no `48c79da`, em
`/private/tmp/.../scratchpad/verifier-edf-wt`. **Nenhum `git stash`.** O porcelain da worktree da
fatia foi gravado antes (vazio) e conferido no fim (vazio). O `next dev` do e2e reescreveu
`next-env.d.ts` (`.next/types` → `.next/dev/types`), e o arquivo gerado voltou ao commitado com
`git checkout`. A árvore principal, no `main`, não foi tocada.

---

## Task Completion

| Task | Status | Notas |
| --- | --- | --- |
| T1 | ✅ Done | `planejarEdicaoDoFixo`, `dataDeVencimento` no domínio, `PERIODO_INVALIDO` na union (`bee4dd7`) |
| T2 | ✅ Done | Ports, fakes e Drizzle de `atualizarSerie`, `reabrir`, `estenderFim`, `buscarComVersoes` e `atualizarOcorrenciasDaSerie` (`d92738d`) |
| T3 | ✅ Done | `TransacaoDrizzle` extraída; a da importação a compõe (`ee8b278`). `transacao-da-importacao.integration.test.ts` fora do diff |
| T4 | ✅ Done | Caso de uso, com `// SPEC_DEVIATION` em `handler.ts:45` (ver Processo) (`c296fa7`) |
| T5 | ✅ Done | Schema estrito (`8d729e0`) |
| T6 | ✅ Done | Action e mensagens (`c9729a8`) |
| T7 | ✅ Done | Formulário em edição e `formatarValorParaCampo` (`bfb976e`) |
| T8 | ✅ Done | "Editar" nos cartões; `Dialogo` extraído de `DialogoDeCadastro` (`28eecab`) |
| T9 | ✅ Done | `e2e/editar-fixo.spec.ts`, 3 percursos (`8e88a7c`) |
| T10 | ✅ Done | Roadmap, handoff, traceability (`48c79da`) |

10 tasks, 37 itens marcados, nenhum aberto. Os 10 commits trazem `tasks.md` e `spec.md` no mesmo
commit (`git show --stat` de cada um).

---

## Critérios de aceitação, ancorados na spec

Legenda: ✅ a assertion afirma o resultado que a spec define · ❌ o sensor mostrou que a assertion
não discrimina · ⚠️ lacuna de precisão da spec ou prova só estrutural.

### P1: Abrir o fixo no formulário do cadastro — EDF-01

| Critério | Resultado definido na spec | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| AC 1 — "Editar" em cada cartão, ao lado de "Mudar valor" e "Encerrar" | os três botões no cartão | `src/components/lista-de-fixos.test.tsx:306` — `expect(botoes.map((botao) => botao.textContent)).toEqual(["Editar", "Mudar valor", "Encerrar"])` para os dois cartões; encerrado em `:317` | ✅ PASS (L2 morto) |
| AC 2 — abre num `<dialog>`, "Editar gasto fixo" / "Editar entrada" | o título pela natureza | `lista-de-fixos.test.tsx:331` — `expect(dialogo.getAttribute("aria-labelledby")).toBe(within(dialogo).getByRole("heading", { name: titulo }).id)` para `DESPESA` e `RECEITA`; `:334` o formulário dentro dele; página real: `e2e/editar-fixo.spec.ts:84` `getByRole("dialog", { name: "Editar gasto fixo" })` | ✅ PASS (L1 morto) |
| AC 3 — os nove campos com o gravado, **valor vigente no mês exibido** | descrição, natureza, valor, dia, início, fim, meio, categoria, pessoa | Componente com valor injetado: `src/components/form-recorrencia.test.tsx:385-395` — `valorDe("Descrição")).toBe("Conta de luz")`, `valorDe(/De quanto costuma ser/)).toBe("1.234,56")`, `"31"`, `"2026-03"`, `"2026-12"`, meio, categoria e pessoa; `lista-de-fixos.test.tsx:348` — o payload com os ids do cartão; `:388` — reabrir mostra o gravado. Página real: `e2e/editar-fixo.spec.ts:119-121` — `toHaveValue("Conta de luz")`, `toHaveValue("100,00")`, `toHaveValue("2026-10")`, **com uma vigência só** | ❌ GAP — E2 sobrevive à suíte inteira |
| AC 4 — botão "Salvar alterações" | o rótulo | `form-recorrencia.test.tsx:401` — `getByRole("button", { name: "Salvar alterações" })`; `:402` sem "Cadastrar gasto fixo" | ✅ PASS (F8 morto) |
| AC 5 — entrada com o vocabulário de receita, só meios sem fatura | "Onde o dinheiro cai", cartão fora | `form-recorrencia.test.tsx:551-553` — `valorDe("Onde o dinheiro cai")).toBe(UUID_POUPANCA)`, `getByLabelText("Dia que costuma cair")`, `queryByRole("option", { name: "Cartão Azul" })).toBeNull()` | ✅ PASS (F9 morto) |

### P1: Corrigir o fixo inteiro — EDF-02

| Critério | Resultado definido na spec | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| AC 1 — os cinco campos no fixo e em **todas** as ocorrências, passadas inclusive | a série nova em outubro também | Domínio: `src/domain/recorrencia/edicao-do-fixo.test.ts:73` — `toEqual({ serie: { descricao, diaVencimento, meioPagamentoId, categoriaId, usuarioId }, vigencia: null, fim: null })` para cada campo. Caso de uso: `src/application/recorrencias/editar/handler.test.ts:218` (o fixo) e `:240-245` (outubro a janeiro). Banco: `src/infrastructure/db/repositories/movimento.recorrencia.integration.test.ts:454` e `recorrencia.repository.integration.test.ts:232`. Action: `src/app/actions/recorrencias.integration.test.ts:317-346`. Página: `e2e/editar-fixo.spec.ts:133-137` | ✅ PASS (D5, D6, U3, U4 mortos) |
| AC 2 — data recalculada com o dia novo, limitada ao fim do mês | dia 31 → 30 de novembro, 28 de fevereiro | `src/domain/recorrencia/data-de-vencimento.test.ts:21` — `toBe("2027-02-28")`, `:25` `"2028-02-29"`, `:29` `"2026-11-30"`; banco `movimento.recorrencia.integration.test.ts:462-469` — `["2026-11-01", "2026-11-30"]`, `["2027-02-01", "2027-02-28"]`; caso de uso `handler.test.ts:241-244` | ✅ PASS (D10, R4, R5 mortos) |
| AC 3 — paga ou com valor confirmado mantém pagamento e valor | `pago_em` e `valor_centavos` iguais | `movimento.recorrencia.integration.test.ts:478-492` — `["2026-10-01", "DESPESA", "18000", "18000", "2026-10-10", null]`, `["2026-11-01", "DESPESA", "19240", "18000", null, null]`; `handler.test.ts:241-242`; action `recorrencias.integration.test.ts:323`; página `e2e/editar-fixo.spec.ts:139-142` | ✅ PASS (R1, R2 mortos) |
| AC 4 — salvar sem mudança nesses campos não altera ocorrência | nenhuma escrita | `edicao-do-fixo.test.ts:58` — `toEqual({ serie: null, vigencia: null, fim: null })`; `handler.test.ts:178-179` — `{ mudou: false }` e `fotografia(fakes.estado)).toEqual(antes)` | ✅ PASS (D7 morto) |
| AC 5 — meio novo leva as ocorrências ao bloco que ele define (AD-012) | **não definido**: pelo AD-012 a ocorrência de fixo é sempre `FIXOS` | O meio novo chega a todas as ocorrências (`handler.test.ts:241-244`, `"cartao"`; `movimento.recorrencia.integration.test.ts:454`). O bloco não muda com o meio: `src/domain/mes/bloco-do-lancamento.ts:33-35` devolve `"FIXOS"` para toda origem `RECORRENCIA`, antes de olhar o meio. Nenhuma task reivindica este AC | ⚠️ Lacuna de precisão |

### P1: Mudar o valor a partir de um mês — EDF-03

| Critério | Resultado definido na spec | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| AC 1 — valor diferente do vigente mostra "Vale a partir de" com o mês exibido | o campo, com `2026-09` | `form-recorrencia.test.tsx:418` — `queryByLabelText("Vale a partir de")).toBeNull()`; `:423` — `valorDe("Vale a partir de")).toBe("2026-09")`; `:429` — `"1234,56"` não abre o campo; página `e2e/editar-fixo.spec.ts:155`, `:158` | ✅ PASS (F1, F6 mortos) |
| AC 2 — vigência nova a partir do mês escolhido, pelo `registrar-versao` | versão nova e ocorrências dali em diante | `edicao-do-fixo.test.ts:110` — `vigencia: { vigenteDesde: "2026-11", valor: 11000 }`; `handler.test.ts:278-281` — as duas versões; `form-recorrencia.test.tsx:474` — `vigenteDesde: "2026-11"` no payload; página `e2e/editar-fixo.spec.ts:162-163` | ✅ PASS |
| AC 3 — valor igual ao vigente não registra vigência | `vigencia: null` | `edicao-do-fixo.test.ts:120`; `handler.test.ts:178`; `form-recorrencia.test.tsx:439` — `valorCentavos: 123456` no payload. Na página, só com vigência única (ver EDF-01 AC 3) | ✅ PASS nas camadas; a composição é a E2 |
| AC 4 — meses anteriores mantêm o valor | outubro com R$ 100,00 | `handler.test.ts:282-289` — `["2026-10", 10000, ...]`, a paga de dezembro em `10000`; página `e2e/editar-fixo.spec.ts:161` — `toContainText("R$ 100,00")` | ✅ PASS |
| AC 5 — vigência antes do início → `PERIODO_INVALIDO`, sem gravar | o código, no campo da vigência | `edicao-do-fixo.test.ts:140-143`; `handler.test.ts:163-167` (`fotografia` igual); `recorrencias.integration.test.ts:437-442` — `campos: { vigenteDesde: "O valor novo não pode valer antes do mês de início." }`; `form-recorrencia.test.tsx:520-521` | ✅ PASS (A3 morto) |

### P1: Encerrar e reabrir pelo "Termina em" — EDF-04

| Critério | Resultado definido na spec | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| AC 1 — M num fim vazio ou posterior → encerrar a partir de M + 1 | `ENCERRAR` em M + 1, pelo `encerrar` | `edicao-do-fixo.test.ts:161-164` (`"2026-12"`), `:174-177` (virando o ano, `"2027-01"`); `handler.test.ts:304-312` — fim `"2026-11"`, `encerradaEm: AGORA`, dezembro apagado, a paga de janeiro mantida; página `e2e/editar-fixo.spec.ts:174-175` | ✅ PASS (D1, D3, D4 mortos) |
| AC 2 — esvaziar reabre, e os meses voltam na próxima abertura | fim e `encerrada_em` nulos | `edicao-do-fixo.test.ts:168-170` — `{ tipo: "REABRIR" }`; `recorrencia.repository.integration.test.ts:268` — `toEqual(criada)`; `handler.test.ts:327-337` — fevereiro de volta; `form-recorrencia.test.tsx:490` — `competenciaFim: null`; página `e2e/editar-fixo.spec.ts:183` | ✅ PASS (D2, R6 mortos) |
| AC 3 — M posterior ao fim atual estende, e os meses entre os dois ganham ocorrência | `ESTENDER` até M | `edicao-do-fixo.test.ts:181-184`; `recorrencia.repository.integration.test.ts:278-282` — `encerradaEm` preservado; `handler.test.ts:352-361` — janeiro de volta | ✅ PASS (R7 morto) |
| AC 4 — fim antes do início → `PERIODO_INVALIDO`, como no cadastro | o código e a mensagem do cadastro | `edicao-do-fixo.test.ts:209-212`; `handler.test.ts:145-149`; `recorrencias.integration.test.ts:423-427` — `"O mês de fim não pode ser anterior ao de início."` no campo do fim | ✅ PASS (D9 morto) |

### P1: Natureza e início travados — EDF-05

| Critério | Resultado definido na spec | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| AC 1 — "O que é" e "Começa em" desabilitados, com o motivo | `disabled` e "Para mudar, encerre este e cadastre de novo" | `form-recorrencia.test.tsx:409-413` — os dois rádios e `Começa em` com `.disabled).toBe(true)`; `descricaoAcessivel(...)).toBe(TRAVADO)` nos dois. A implementação acrescenta o ponto final | ✅ PASS (F4, F5 mortos) |
| AC 2 — natureza e início fora do payload de edição | recusa na validação | `src/application/schemas/recorrencia.schema.test.ts:194-201` — `code: "unrecognized_keys"` com a mensagem, para natureza e para início; `recorrencias.integration.test.ts:390-394` — `VALIDACAO` no campo `natureza`, banco intacto; `form-recorrencia.test.tsx:439` — payload sem os dois | ✅ PASS (S1, S2, F7 mortos) |
| AC 3 — campo inválido recusado **com o mesmo erro do cadastro**, sem gravar | a mensagem do cadastro | Descrição: `form-recorrencia.test.tsx:501-504` — `"Descreva o gasto fixo"`. Meio e categoria: `handler.test.ts:130-131` com os códigos do cadastro e nada gravado; `recorrencias.integration.test.ts:413-417`. **Valor e dia**: `recorrencia.schema.test.ts:175` — só `success).toBe(false)` | ❌ GAP — S3 sobrevive a schema, formulário, lista e action |

### P1: Gravar tudo ou nada — EDF-06

| Critério | Resultado definido na spec | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| AC 1 — série, ocorrências, vigência e fim numa transação | um `tx` para os quatro repositórios | `src/infrastructure/db/transacao.integration.test.ts:175-177` — `rejects.toBeInstanceOf(FalhaInjetada)`, `gravouTudo).toBe(true)`, `fotografia()).toEqual(antes)` depois de série, ocorrências, vigência, reabertura e escritas nos outros dois repositórios | ✅ PASS (T1 morto) |
| AC 2 — qualquer escrita que falhe desfaz todas | o banco como antes | `recorrencias.integration.test.ts:371-378` — falha injetada em `atualizarOcorrenciasDaSerie`, `fotografia()).toEqual(antes)`; `handler.test.ts:375` — recusa reaproveitada lança | ✅ PASS (A1, U5 mortos) |
| AC 3 — sem sessão: código de sessão antes do banco | `NAO_AUTENTICADO` | `recorrencias.integration.test.ts:300-303` — `NAO_AUTENTICADO` com payload válido **e** com payload adulterado, banco intacto, nenhuma rota revalidada. A ausência de leitura é estrutural: `requireSession()` é a primeira instrução (`src/app/actions/recorrencias.ts:168`) | ✅ PASS (A2 morto) |
| AC 4 — falha não prevista → `ERRO_INESPERADO` com correlação, sem stack | o código e a referência | `recorrencias.integration.test.ts:373-376` — `toMatch(/^Não foi possível concluir a operação\. Tente de novo\. \(ref\. [0-9a-f-]{36}\)$/)` | ✅ PASS |
| AC 5 — fixo inexistente → `RECORRENCIA_NAO_ENCONTRADA` | o código | `recorrencias.integration.test.ts:402-405` — `{ code: "RECORRENCIA_NAO_ENCONTRADA", mensagem: "Esse gasto fixo não existe mais." }`; `handler.test.ts:108-109` | ✅ PASS |
| AC 6 — revalida as três rotas; confirmação dentro do diálogo, sem fechar | três rotas; diálogo aberto | `recorrencias.integration.test.ts:352-356` — as três rotas; `lista-de-fixos.test.tsx:372-376` — `findByRole("status")` dentro do diálogo e `dialogo.open).toBe(true)`; `form-recorrencia.test.tsx:454`, `:441-444`; página `e2e/editar-fixo.spec.ts:91`. Os textos "Alterações salvas." e "Nada mudou: já estava tudo assim." **não estão na spec** | ✅ PASS + ⚠️ lacuna de precisão (declarada pelo autor) |

**Status**: 24 de 28 critérios com assertion no resultado da spec e mutante morto · 2 com mutante
vivo (EDF-01 AC 3, EDF-05 AC 3) · 2 lacunas de precisão (EDF-02 AC 5, EDF-06 AC 6).

---

## Edge Cases

- [x] **Dia 31 numa ocorrência de fevereiro.** `data-de-vencimento.test.ts:21` (`"2027-02-28"`) e
  `:25` (`"2028-02-29"`); no banco, `movimento.recorrencia.integration.test.ts:467`
  (`["2027-02-01", "2027-02-28"]`). D10 e R5 mortos. ✅
- [x] **Fixo vindo da importação.** ⚠️ Sem teste dedicado, verdadeiro por construção: a importação
  cria o fixo pelo mesmo `criarRecorrencia` do cadastro
  (`src/application/importacao/gravar-importacao/handler.ts:103`), a tabela `recorrencia` não tem
  coluna de origem (`src/infrastructure/db/schema.ts:160-178`), e as ocorrências do fixo importado
  vêm da materialização, sem `origem_dado` (só avulso recebe `PLANILHA`, em
  `gravar-importacao/handler.ts:186`). Nada no
  dado distingue os dois, e `atualizarOcorrenciasDaSerie` filtra só por `recorrencia_id`
  (`movimento.repository.ts:240`, `:261`). Todo teste de edição é, por isso, um teste de fixo
  importado.
- [x] **Fixo encerrado continua com "Editar".** `lista-de-fixos.test.tsx:317`; página
  `e2e/editar-fixo.spec.ts:178-183`, que reabre pelo cartão encerrado. L2 morto. ✅

### Review Focus do plano

| # | Foco | Prova |
| --- | --- | --- |
| 1 | Salvar sem mudar nada | `edicao-do-fixo.test.ts:58`, `handler.test.ts:178-179`, `form-recorrencia.test.tsx:439-444`. D7 morto |
| 2 | Dia 31 em fevereiro | `movimento.recorrencia.integration.test.ts:462-469`. R5 morto (o Postgres recusa `2026-11-31`) |
| 3 | Encurtar o fim com paga depois | `handler.test.ts:308-312` — `["2027-01", "2027-01-10"]` continua |
| 4 | Vigência antes do início | `edicao-do-fixo.test.ts:140-143`, `recorrencias.integration.test.ts:437-442` |
| 5 | Payload com `natureza` ou `competenciaInicio` | `recorrencia.schema.test.ts:194-201`. S1 e S2 mortos |

---

## Sensor de discriminação

**Profundidade**: tier expandido, mutação manual, 46 mutantes escolhidos pelo risco. Cada um rodou
**isolado contra o teste que deveria matá-lo**, e o log confere que morreu no teste certo, e não por
erro de compilação. Mutantes de unidade e de integração rodaram com `node_modules` por symlink; os
dois de página (E1, E2) rodaram `e2e/editar-fixo.spec.ts` com `pnpm install --frozen-lockfile
--offline` dentro da worktree descartável, porque o Turbopack recusa o symlink. O e2e foi rodado
antes, sem mutação, na mesma worktree: 3/3.

### Domínio

| # | `file:line` | Mutação | Morto por | Resultado |
| --- | --- | --- | --- | --- |
| D1 | `src/domain/recorrencia/edicao-do-fixo.ts:118` | fim vazio e M: `ESTENDER` no lugar de `ENCERRAR` | `edicao-do-fixo.test.ts:160` e mais 3 | ✅ Morto |
| D2 | `edicao-do-fixo.ts:116` | X e vazio: esquece o `REABRIR` | `edicao-do-fixo.test.ts:167` | ✅ Morto |
| D3 | `edicao-do-fixo.ts:119` | `aPartirDe: pedido` (M, e não M + 1) | `edicao-do-fixo.test.ts:160`, `:173` e mais 3 | ✅ Morto |
| D4 | `edicao-do-fixo.ts:118`, `:121` | X e M < X: `ESTENDER` no lugar de `ENCERRAR` | `edicao-do-fixo.test.ts:173` | ✅ Morto |
| D5 | `edicao-do-fixo.ts:65` | `usuarioId` fora da comparação da série | `edicao-do-fixo.test.ts:63` ("a pessoa") | ✅ Morto |
| D6 | `edicao-do-fixo.ts:101` | série devolve `atual.usuarioId` | `edicao-do-fixo.test.ts:63`, `:86` | ✅ Morto |
| D7 | `edicao-do-fixo.ts:104` | vigência registrada com o valor igual | `edicao-do-fixo.test.ts:57`, `:117` e mais 7 | ✅ Morto |
| D8 | `edicao-do-fixo.ts:89` | vigência conferida contra o início mesmo sem mudar o valor | `edicao-do-fixo.test.ts:117` | ✅ Morto |
| D9 | `edicao-do-fixo.ts:83` | fim no próprio início recusado (`<` → `<=`) | `edicao-do-fixo.test.ts:201` | ✅ Morto |
| D10 | `src/domain/recorrencia/data-de-vencimento.ts:17` | `dataDeVencimento` perde o limite do fim do mês | `data-de-vencimento.test.ts:20`, `:24`, `:28` | ✅ Morto |

### Banco e transação

| # | `file:line` | Mutação | Morto por | Resultado |
| --- | --- | --- | --- | --- |
| R1 | `src/infrastructure/db/repositories/movimento.repository.ts:258` | o `SET` volta `valor_centavos` ao previsto | `movimento.recorrencia.integration.test.ts:472` | ✅ Morto |
| R2 | `movimento.repository.ts:258` | o `SET` zera `pago_em` | `movimento.recorrencia.integration.test.ts:472` | ✅ Morto |
| R3 | `movimento.repository.ts:261` | o `UPDATE` sem `WHERE recorrencia_id` alcança outro fixo | `movimento.recorrencia.integration.test.ts:495` | ✅ Morto |
| R4 | `movimento.repository.ts:259` | a data não é recalculada | `movimento.recorrencia.integration.test.ts:459` | ✅ Morto |
| R5 | `movimento.repository.ts:246` | a data montada sem limitar o dia ao fim do mês | `movimento.recorrencia.integration.test.ts:444` e mais 3 — `date/time field value out of range: "2026-11-31"` | ✅ Morto |
| R6 | `recorrencia.repository.ts:179` | `reabrir` deixa `encerrada_em` | `recorrencia.repository.integration.test.ts:257` | ✅ Morto |
| R7 | `recorrencia.repository.ts:186` | `estenderFim` também zera `encerrada_em` | `recorrencia.repository.integration.test.ts:272` | ✅ Morto |
| T1 | `src/infrastructure/db/transacao.ts:37` | `movimentos` construído sobre o banco, fora do `tx` | `transacao.integration.test.ts:107` | ✅ Morto |
| T2 | `src/infrastructure/db/transacao-da-importacao.ts:32` | a transação da importação, agora composta, perde a trava consultiva | `transacao-da-importacao.integration.test.ts:226` (IMP-02 AC 7) | ✅ Morto |

### Caso de uso, action e schema

| # | `file:line` | Mutação | Morto por | Resultado |
| --- | --- | --- | --- | --- |
| U1 | `src/application/recorrencias/editar/handler.ts:73` | não confere se o meio existe | `handler.test.ts:112` ("meio inexistente") | ✅ Morto |
| U2 | `handler.ts:79-82` | não confere se a categoria existe | `handler.test.ts:112` ("categoria inexistente") | ✅ Morto |
| U3 | `handler.ts:95` | série gravada só nas ocorrências | `handler.test.ts:198`, `:248` | ✅ Morto |
| U4 | `handler.ts:96` | série gravada só no fixo | `handler.test.ts:198`, `:248` | ✅ Morto |
| U5 | `handler.ts:180` | `exigir` engole a recusa do caso de uso reaproveitado | `handler.test.ts:366` | ✅ Morto |
| A1 | `src/app/actions/recorrencias.ts:183` | grava fora da transação (repositórios soltos) | `recorrencias.integration.test.ts:359` | ✅ Morto |
| A2 | `recorrencias.ts:168` | valida o payload antes da sessão | `recorrencias.integration.test.ts:293`, `:385` | ✅ Morto |
| A3 | `recorrencias.ts:198` | recusa da vigência endereçada ao campo do fim | `recorrencias.integration.test.ts:430` | ✅ Morto |
| S1 | `src/application/schemas/recorrencia.schema.ts:62` | `z.strictObject` → `z.object` | `recorrencia.schema.test.ts:188` (natureza e início) | ✅ Morto |
| S2 | `recorrencia.schema.ts:65` | aceita `competenciaInicio` opcional | `recorrencia.schema.test.ts:188` (início) | ✅ Morto |
| S3 | `recorrencia.schema.ts:65` | redefine `valorCentavos` e `diaVencimento` na edição, com as mensagens padrão do Zod | nenhum: schema 40/40, formulário e lista 52/52, action 20/20 | ❌ **Sobreviveu** → Fix 2 |

### Formulário, lista e página

| # | `file:line` | Mutação | Morto por | Resultado |
| --- | --- | --- | --- | --- |
| F1 | `src/components/form-recorrencia.tsx:170-171` | `valorMudou` compara o texto, e não os centavos | `form-recorrencia.test.tsx:416` (`"1234,56"`) | ✅ Morto |
| F2 | `form-recorrencia.tsx:147-151` | valor preenchido com `formatarBRL` | `form-recorrencia.test.tsx:382` e mais 7 | ✅ Morto |
| F3 | `form-recorrencia.tsx:147-151` | valor preenchido vazio | `form-recorrencia.test.tsx:382` e mais 7 | ✅ Morto |
| F4 | `form-recorrencia.tsx:390` | "O que é" não travado | `form-recorrencia.test.tsx:405` | ✅ Morto |
| F5 | `form-recorrencia.tsx:470` | "Começa em" não travado | `form-recorrencia.test.tsx:405` | ✅ Morto |
| F6 | `form-recorrencia.tsx:162` | "Vale a partir de" preenchido com o início | `form-recorrencia.test.tsx:416` e mais 3 | ✅ Morto |
| F7 | `form-recorrencia.tsx:296-301` | payload da edição leva a natureza | `form-recorrencia.test.tsx:432` e mais 6 | ✅ Morto |
| F8 | `form-recorrencia.tsx:706` | botão com o rótulo do cadastro | `form-recorrencia.test.tsx:398` e mais 9 | ✅ Morto |
| F9 | `form-recorrencia.tsx:183` | receita em edição filtra os meios pela natureza escolhida, e não pela gravada | `form-recorrencia.test.tsx:545` | ✅ Morto |
| L1 | `src/components/lista-de-fixos.tsx:130` | títulos "Editar entrada" e "Editar gasto fixo" invertidos | `lista-de-fixos.test.tsx:320` (os dois casos) | ✅ Morto |
| L2 | `lista-de-fixos.tsx:254-262` | "Editar" escondido no fixo encerrado | `lista-de-fixos.test.tsx:314` | ✅ Morto |
| L3 | `lista-de-fixos.tsx:131` | `aoFechar` sem `setEmEdicao(null)`: o formulário não remonta | `lista-de-fixos.test.tsx:379` | ✅ Morto |
| L4 | `src/components/dialogo-de-cadastro.tsx:101` | o `Dialogo` extraído não escuta o `close` | `dialogo-de-cadastro.test.tsx:94` | ✅ Morto |
| L5 | `dialogo-de-cadastro.tsx:115` | o `Dialogo` extraído não fecha no backdrop | `dialogo-de-cadastro.test.tsx:81` | ✅ Morto |
| E1 | `lista-de-fixos.tsx:128-159` | volta ao diálogo por cartão: cada `<li>` monta o seu `<Dialogo>` | **não** pela unidade (`lista-de-fixos.test.tsx` 21/21 verde); morto por `e2e/editar-fixo.spec.ts:131` — depois de renomear, o cartão muda de lugar, o `<dialog>` perde o modo modal e `Escape` não o fecha | ✅ Morto (só no e2e) |
| E2 | `src/app/(app)/[competencia]/fixos/page.tsx:115` | `valorNoMesCentavos` pela última vigência, e não pela vigente no mês | nenhum: `e2e/editar-fixo.spec.ts` 3/3; a página não tem outro teste | ❌ **Sobreviveu** → Fix 1 |

**Resultado**: 46 mutantes, 44 mortos, 2 vivos — FAIL ❌.

O E1 confirma o acréscimo da T8: o diálogo único existe por uma razão que só o navegador real mostra,
e o e2e a prova pela linha `:129-131`. O T2, a L4 e a L5 confirmam que a extração da T3 e a da T8
não tiraram nada da importação nem do cadastro.

---

## Regras invioláveis (`AGENTS.md`)

| Regra | Situação |
| --- | --- |
| 1 — nenhum dado financeiro real | ✅ Fixtures por propriedade: "Pessoa A/B", "Conta fixa A/B/C", "Cartão Roxo/Azul", "Conta de luz", R$ 100,00 → R$ 110,00, R$ 1.234,56 com milhar, dia 31. `~/Downloads` não foi aberto |
| 2 — dinheiro em centavos inteiros | ✅ O texto do campo sai de `formatarValorParaCampo`, em `src/lib/formatar.ts`, a fronteira única, e volta por `parseBRL` (`formatar.test.ts:43-46`); a comparação do formulário é em centavos (`form-recorrencia.tsx:169-171`) |
| 3 — competência `'YYYY-MM'`, sem `Date` no domínio | ✅ `dataDeVencimento` monta texto (`data-de-vencimento.ts:14-19`); o instante do encerramento entra pela borda (`recorrencias.ts:194`) |
| 4 — `src/domain` puro | ✅ `arquitetura.test.ts` verde; 100% de branches (345/345) |
| 5 — só `movimento` é somável | ✅ A edição grava na série e nas ocorrências; nenhum `SUM` novo |
| Server Action | ✅ `requireSession()` na primeira instrução (`recorrencias.ts:168`), Zod estrito, `ERRO_INESPERADO` com referência |
| Operação remota | ✅ Nenhum push, merge ou operação remota nesta verificação |

---

## Code Quality

| Princípio | Status |
| --- | --- |
| Código mínimo | ✅ A vigência passa por `registrarVersao` e o encerramento por `encerrarRecorrencia` (`handler.ts:101`, `:162`), sem regra reescrita |
| Mudanças cirúrgicas | ✅ Fora da edição, só o que o design nomeia: `dataDeVencimento` movida, a transação genérica extraída, `Dialogo` extraído |
| Sem escopo extra | ✅ Avulso, compra, natureza, início e histórico ficaram de fora, como o Out of Scope manda |
| Segue os padrões | ✅ Envelope de action, `erroDeAction`, fakes no padrão de `fakes.ts` |
| Assertion bate com a spec | ❌ 24/28; as quatro exceções estão nomeadas |
| Expectativa de cobertura por camada | ⚠️ Domínio 1:1 e 100% de branches; fakes, banco e action com caminho de erro. A composição de página é `none` na matriz, e o único teste que a atravessa usa vigência única (E2) |
| Todo teste mapeia para AC, edge case ou Done-when | ✅ Nenhum teste órfão nos arquivos novos e alterados |
| Guidelines documentadas seguidas | ✅ `AGENTS.md`; `tasks.md#Test Coverage Matrix` |

---

## Gate Check

- **Comando**: `pnpm verify` (gate `build`) e `pnpm test:e2e`, na worktree da fatia, em `48c79da`,
  com o Postgres `mybilling-db` já de pé (o `pnpm db:up` da worktree colidiria no `container_name`).
- `pnpm typecheck` — ✅ `Types generated successfully`
- `pnpm lint` — ✅ `Checked 264 files in 125ms. No fixes applied.`
- `pnpm test:unit` — ✅ **87 arquivos, 1.243 testes**, 0 falhas; `src/domain` com 100% de branches
  (345/345), 100% de statements (662/662)
- `pnpm test:integration` — ✅ **22 arquivos, 307 testes**, 0 falhas
- `pnpm build` — ✅ saída 0; `pnpm verify` inteiro em 45,7 s
- `pnpm test:e2e` — ✅ **62 passed (2.2m)**, saída 0, a suíte inteira. A importação passa:
  `e2e/importacao.spec.ts:144` (outubro e novembro pela Visão geral) e `:203` (dezembro recusado). A
  edição passa: `e2e/editar-fixo.spec.ts:102`, `:148`, `:166`

**Total**: **1.612 provas**, 0 falhas, 0 puladas.

**Integridade dos testes.** A contagem anterior foi medida agora, na worktree descartável, em
`d8ed89a`:

| | Antes (`d8ed89a`) | Depois (`48c79da`) | Delta |
| --- | --- | --- | --- |
| unit + componentes | 1.142 (84 arquivos) | 1.243 (87 arquivos) | +101 |
| integration | 285 (21 arquivos) | 307 (22 arquivos) | +22 |
| e2e | 59 | 62 | +3 |
| **total** | **1.486** | **1.612** | **+126** |

Nenhum teste apagado, nenhum `skip`. As únicas linhas removidas de arquivos de teste na faixa são
imports e a assinatura de `montar` em `lista-de-fixos.test.tsx`; nenhuma assertion saiu.
`transacao-da-importacao.integration.test.ts` e `dialogo-de-cadastro.test.tsx` não estão no diff e
passam: as duas extrações são refatorações puras do lado de quem já existia.

---

## Processo

- **`// SPEC_DEVIATION` em `handler.ts:45`.** O erro do caso de uso carrega `campo`, que o design
  não previa, porque `PERIODO_INVALIDO` nasce de dois campos (EDF-03 AC 5 e EDF-04 AC 4). O desvio
  está registrado em `tasks.md#Interfaces`, é do design e não da spec, e está provado:
  `handler.test.ts:145-148` e `:163-166`, `recorrencias.integration.test.ts:423-427` e `:437-441`.
  A3 morto.
- **Duas Assumptions continuam `n`**: valor confirmado mantido e data recalculada para todas. A
  implementação segue o default escolhido e os testes o provam (`movimento.recorrencia.integration.test.ts:478-492`,
  `:462-469`). A confirmação é do dono.

---

## Fix Plans

### Fix 1: o valor do mês exibido na página real (EDF-01 AC 3, EDF-03 AC 3) — Major

- **Causa**: a página é o elo entre `valorNoMesExibido` e o formulário
  (`fixos/page.tsx:115`), e o único teste que a atravessa usa um fixo de vigência única
  (`e2e/editar-fixo.spec.ts:120`). Com uma vigência, "a vigente no mês" e "a última" coincidem.
- **Consequência medida** (sonda na worktree descartável, com E2 aplicada): reajustar em novembro,
  abrir "Editar" em outubro e salvar sem mexer em nada deixa outubro com `−R$ 110,00` na lista.
  Uma edição sem mudança reescreve um mês passado.
- **Fix task**: em `e2e/editar-fixo.spec.ts`, no percurso do EDF-03 ou num novo, depois do reajuste
  de novembro, abrir a edição em outubro e afirmar o resultado da spec:
  ```ts
  const outubro = await abrirEdicao(page, "2026-10", "Conta de luz");
  await expect(outubro.getByLabel(/De quanto costuma ser/)).toHaveValue("100,00");
  await outubro.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(outubro.getByRole("status")).toHaveText("Nada mudou: já estava tudo assim.");
  await expect(await linhaNaLista(page, "2026-10", "Conta de luz")).toContainText("R$ 100,00");
  ```
- **Verificado**: a sonda com esse trecho passa em `48c79da` (1/1) e falha com E2 em
  `toHaveValue("100,00")`, com `Received: "110,00"`.
- **Pronto quando**: E2 morre no e2e da fatia.

### Fix 2: "o mesmo erro do cadastro" para valor e dia (EDF-05 AC 3) — Minor

- **Causa**: `recorrencia.schema.test.ts:162-176` afirma só `success).toBe(false)`. A igualdade de
  mensagem com o cadastro vale hoje por construção, porque a edição espalha os campos do cadastro
  (`recorrencia.schema.ts:65`), mas nada a segura.
- **Fix task**: para cada caso do `it.each`, comparar a primeira mensagem da edição com a do
  `entradaRecorrenciaSchema` para o mesmo campo inválido, por exemplo
  `expect(edicao.error?.issues[0]?.message).toBe(cadastro.error?.issues[0]?.message)`.
- **Pronto quando**: S3 morre em `recorrencia.schema.test.ts`.

### Lacunas de precisão, para o dono

- **P1 — EDF-06 AC 6.** A spec diz "mostrar a confirmação" sem o texto. Os testes fixam "Alterações
  salvas." e "Nada mudou: já estava tudo assim." (`form-recorrencia.test.tsx:441-444`, `:454`;
  `lista-de-fixos.test.tsx:372-375`; `e2e/editar-fixo.spec.ts:91`). Pôr as duas frases no AC.
- **P2 — EDF-02 AC 5.** Pelo AD-012 (`bloco-do-lancamento.ts:33-35`), a ocorrência de fixo fica
  sempre em Fixos, qualquer que seja o meio; o AC não tem resultado observável distinto. Reescrever
  como "as ocorrências continuam em Fixos e passam a mostrar o meio novo", ou retirar.

### Observações fora da spec

- Um fixo cujo meio ou categoria foi arquivado abre a edição com um `<select>` que não oferece o
  gravado: a página só lista os disponíveis (`fixos/page.tsx:57-58`), e o estado do formulário
  guarda o id arquivado. Com categoria arquivada, a tela mostra "Sem categoria" e salvar mantém a
  arquivada; com meio arquivado, salvar devolve `MEIO_PAGAMENTO_ARQUIVADO` no campo do meio. A spec
  não trata o caso; fica para decisão do dono.

---

## Lições destiladas

Gravadas com `lessons.py add`, uma por sinal, todas `candidate` (x1):

| Sinal | Fonte | Lição |
| --- | --- | --- |
| `surviving_mutant` | E2, `fixos/page.tsx:115` | L-019 — valor versionado por mês precisa de teste com duas vigências que abra o mês anterior à mais nova |
| `surviving_mutant` | S3, `recorrencia.schema.ts:65` | L-020 — "o mesmo erro de outro fluxo" pede comparar a mensagem, e não só a recusa |
| `spec_precision_gap` | EDF-02 AC 5 | L-021 — AC que cita uma decisão precisa ser relido contra a regra dela |
| `spec_precision_gap` | EDF-06 AC 6 | L-022 — texto que o teste afirma literalmente precisa estar na spec |

O `// SPEC_DEVIATION` de `handler.ts:45` não vira lição: é desvio do design, registrado e provado, e
não falha.

---

## Requirement Traceability — atualização proposta

| Requisito | Antes | Proposto |
| --- | --- | --- |
| EDF-01 | Implemented | ❌ Needs Fix (Fix 1) |
| EDF-02 | Implemented | ✅ Verified, com a lacuna de precisão P2 |
| EDF-03 | Implemented | ❌ Needs Fix (Fix 1: a consequência cai no AC 3) |
| EDF-04 | Implemented | ✅ Verified |
| EDF-05 | Implemented | ❌ Needs Fix (Fix 2) |
| EDF-06 | Implemented | ✅ Verified, com a lacuna de precisão P1 |

O verificador não edita `spec.md`: a atualização entra com as fix tasks.

---

## Resumo

**Overall**: ❌ Not Ready — duas fix tasks de teste, nenhuma de código.

**Spec-anchored check**: 24/28 critérios · 2 mutantes vivos (EDF-01 AC 3, EDF-05 AC 3) · 2 lacunas
de precisão (EDF-02 AC 5, EDF-06 AC 6)
**Sensor**: 46 mutantes, 44 mortos, 2 vivos (E2, S3)
**Gate**: `pnpm verify` saída 0 (1.243 unit + 307 integração, 100% de branches no domínio, build);
`pnpm test:e2e` 62/62

**O que funciona**: a regra pura decide as seis linhas do fim, a série e a vigência, cada uma com
mutante morto; o banco grava a série em todas as ocorrências sem tocar em pagamento nem valor
confirmado; a transação desfaz tudo numa falha injetada; o formulário trava natureza e início e
compara o valor em centavos; o diálogo único sobrevive à mudança de posição do cartão; a importação
não regrediu.

**Próximo passo**: Fix 1 e Fix 2 por um implementador, e nova verificação com E2 e S3 reaplicados.

---

## Rodada 2

**Data**: 2026-10-29
**Verificado em**: `bfc38f6`, branch `feat/editar-fixos` rebaseada sobre `main` (`b29e138`).
**Faixa**: o plano em `63f407d`; T1 a T10 de `ea765de` a `3cd55a2` (antes `bee4dd7..48c79da`); o
relatório da rodada 1 em `944c898` (antes `1ac1d02`); as correções em `082c4db` (F2), `ac34691` (F1)
e `bfc38f6` (F3).
**Verificador**: sub-agente independente, que não escreveu F1, F2 nem F3. As mutações rodaram numa
`git worktree` descartável, em modo detached no `bfc38f6`, com `pnpm install --frozen-lockfile
--offline`. **Nenhum `git stash`.** O porcelain da worktree da fatia estava vazio antes e está vazio
no fim. O `next dev` do e2e reescreveu `next-env.d.ts`, que voltou ao commitado com `git checkout`.

### Veredito

**FAIL ❌.** As três correções fazem o que prometem: E2 e S3 morrem no teste que cada uma
acrescentou, o EDF-02 AC 5 reescrito tem assertion sobre o resultado novo e quatro mutantes mortos, e
o EDF-06 AC 6 tem as duas frases na spec e nos testes. O rebase não quebrou nada.

O sensor achou dois mutantes novos vivos no ponto em que a página monta o formulário de edição. O
F1 abriu o mês **anterior** à vigência mais nova, e isso mata quem lê a **última** vigência (E2). Ler
a **primeira** vigência (E2b) passa, porque em outubro a primeira e a vigente são o mesmo número. A
consequência foi medida: depois do reajuste de novembro, abrir "Editar" em novembro e salvar sem
mexer diz "Alterações salvas." e volta novembro e dezembro para R$ 100,00. O reajuste é desfeito. Com
uma pessoa só no seed do e2e, a pessoa errada no formulário (E3p) também passa. As duas caem com um
acréscimo de 13 linhas no e2e do EDF-03 (Fix 4), já rodado: passa no código commitado e falha com
E2b, E3p e E2.

### O rebase

- **Código de produto da fatia idêntico ao da rodada 1.** As linhas alteradas de `b29e138..bfc38f6`
  em `src` e `e2e` são as de `483a4e3..1ac1d02`, uma a uma. Só diferem as linhas de teste de F1 a F3
  e o import fundido em `src/lib/formatar.test.ts`. Nos dois casos são 20 arquivos de produto, +1.106
  e −133. Os 46 mutantes da rodada 1 valem por isso sobre o código de hoje, e o gate abaixo confirma
  que os testes que os mataram continuam verdes.
- **O `main` entrou inteiro.** Os quatro arquivos de teste e os cinco de produto que o `main`
  alterou estão byte a byte iguais a `b29e138`, exceto `src/lib/formatar.test.ts`. Esse é a união
  dos dois lados: importa `descreverMeio` e `formatarValorParaCampo`, e mantém o `describe` de cada um
  (`formatar.test.ts:5`, `:7-18`, `:47-61`). `pnpm-lock.yaml` e `package.json` são iguais aos de `b29e138`.
- **As lições.** L-019 a L-022 são as antigas L-017 a L-020, com `key`, `text`, `evidence`,
  `signal`, `status` e datas iguais. Só o `id` mudou. As L-001 a L-018 são as do `main`, sem
  alteração, e `next_id` é 23. `.specs/LESSONS.md` mostra as quatro com os números novos
  (`LESSONS.md:123`, `:129`, `:135`, `:141`). A mensagem do commit `944c898` ainda diz "L-017 a
  L-020". É só texto de commit, e reescrever o histórico não vale a pena.

### Mutantes da rodada 2

Cada mutante rodou isolado. O log confere que ele morreu numa assertion, e não por erro de
compilação.

| # | `file:line` | Mutação | Morto por | Resultado |
| --- | --- | --- | --- | --- |
| E2 | `src/app/(app)/[competencia]/fixos/page.tsx:115` | `valorNoMesCentavos: versoes.at(-1)?.valorPrevisto ?? null` (a última vigência) | `e2e/editar-fixo.spec.ts:168` — `toHaveValue("100,00")`, `Received: "110,00"` (F1) | ✅ Morto |
| S3 | `src/application/schemas/recorrencia.schema.ts:65` | `valorCentavos: z.number().refine(...)` e `diaVencimento: z.int().min(1).max(31)` na edição, com as mensagens padrão do Zod | `recorrencia.schema.test.ts:194` — `expect(daEdicao).toBe(doCadastro)` falha 5 casos: valor zero e negativo (`"Invalid input"` contra `"O valor precisa ser maior que zero."`), dia 0, dia 32 e dia fracionário (F2) | ✅ Morto |
| S3′ | `recorrencia.schema.ts:65` | `descricao` com outra mensagem, `meioPagamentoId` e `categoriaId` com a mensagem padrão | `recorrencia.schema.test.ts:194` (4 casos) e `form-recorrencia.test.tsx:494` | ✅ Morto |
| M5a | `src/domain/mes/bloco-do-lancamento.ts:33-38` | o meio decide antes da origem | `src/application/recorrencias/editar/handler.test.ts:275` (F3), além de `bloco-do-lancamento.test.ts:39`, `resumo-mensal.test.ts`, `obter-visao-mensal/handler.test.ts` e `obter-visao-anual/handler.test.ts` (8 testes) | ✅ Morto |
| M5b | `src/application/ports/fakes.ts:385` | o fake de `atualizarOcorrenciasDaSerie` mantém o meio antigo | `handler.test.ts:275` (F3), `handler.test.ts:198` e `recorrencia.fake.test.ts:217` | ✅ Morto |
| M5c | `src/infrastructure/db/repositories/movimento.repository.ts:257` | o `SET` do Drizzle não grava o meio | `movimento.recorrencia.integration.test.ts:444` — `meio_pagamento_id` igual a `base.cartaoId` nas quatro | ✅ Morto |
| M5d | `src/domain/recorrencia/edicao-do-fixo.ts:63` | `meioPagamentoId` fora de `CAMPOS_DA_SERIE`: trocar só o meio vira "nada mudou" | `handler.test.ts:275` (F3) e `edicao-do-fixo.test.ts:63` ("o meio de pagamento") | ✅ Morto |
| M6 | `src/components/form-recorrencia.tsx:313` | as duas frases da confirmação trocadas | `form-recorrencia.test.tsx:441`, `:454` e `lista-de-fixos.test.tsx:372` | ✅ Morto |
| E3m | `fixos/page.tsx:112` | o formulário recebe outro meio, e não o gravado | `e2e/editar-fixo.spec.ts:170` — `toHaveText("Nada mudou: já estava tudo assim.")`, `Received: "Alterações salvas."` (F1) | ✅ Morto |
| E2b | `fixos/page.tsx:115` | `valorNoMesCentavos: versoes[0]?.valorPrevisto ?? null` (a primeira vigência) | nenhum: `e2e/editar-fixo.spec.ts` 3/3. A página não tem outro teste | ❌ **Sobreviveu** → Fix 4 |
| E3p | `fixos/page.tsx:114` | o formulário recebe a outra pessoa, e não a gravada | nenhum: 3/3. O seed do e2e tem uma pessoa só (`src/infrastructure/db/testing/banco-de-teste.ts:55-58`), e a pessoa errada coincide com a certa | ❌ **Sobreviveu** → Fix 4 |

**Resultado da rodada 2**: 11 mutantes, 9 mortos e 2 vivos.

O E3m mostra o alcance do F1. A edição de outubro salva sem mexer e exige "Nada mudou" (`:170`), e
isso derruba qualquer campo da série que a página entregue errado, **desde que o errado seja
distinguível**. O E2b e o E3p escapam pelo mesmo motivo: o valor errado coincide com o certo no
cenário do teste. No E2b, a primeira vigência é a vigente em outubro. No E3p, existe uma pessoa só.

**Consequência do E2b, medida numa sonda.** Na worktree descartável, com o E2b aplicado, depois do
reajuste de novembro: abrir "Editar" em novembro mostra `100,00`; salvar sem mexer mostra
"Alterações salvas."; a lista passa a mostrar `−R$ 100,00` em outubro, novembro **e dezembro**. Isso
fere o EDF-01 AC 3, o EDF-03 AC 3 e o segundo Goal da spec.

### Critérios que mudaram desde a rodada 1

| Critério | Resultado definido na spec | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| EDF-01 AC 3 — valor vigente no mês exibido | o valor da vigência que vale no mês aberto | `e2e/editar-fixo.spec.ts:168` — `toHaveValue("100,00")` em outubro, depois do reajuste de novembro (E2 morto). Nenhum teste abre o mês da vigência mais nova (E2b vivo), e a pessoa coincide por fixture (E3p vivo) | ❌ GAP → Fix 4 |
| EDF-03 AC 3 — valor igual ao vigente não registra vigência | nenhuma vigência; o mês continua com o valor que tinha | `e2e/editar-fixo.spec.ts:170-171` — "Nada mudou: já estava tudo assim." e outubro em R$ 100,00. As camadas seguem como na rodada 1 | ❌ GAP: com o E2b, salvar em novembro registra uma vigência de R$ 100,00 → Fix 4 |
| EDF-05 AC 3 — o mesmo erro do cadastro | a mensagem do cadastro | `src/application/schemas/recorrencia.schema.test.ts:193-194` — `expect(doCadastro).toEqual(expect.any(String))` e `expect(daEdicao).toBe(doCadastro)` nos 10 casos em comum (`:164-173`); a recusa continua em `:176-181` | ✅ PASS (S3, S3′ mortos) |
| EDF-02 AC 5 (reescrito) — com o meio novo, as ocorrências continuam em Fixos e passam a ter o meio novo | `meioPagamentoId` novo e bloco `FIXOS` em todas | `src/application/recorrencias/editar/handler.test.ts:274` — `cartoes.has("cartao")).toBe(true)`, que garante que o meio novo é um cartão; `:275-286` — `toEqual([["2026-10", "cartao", "FIXOS"], …, ["2027-01", "cartao", "FIXOS"]])`. No banco, o meio chega pelo `movimento.recorrencia.integration.test.ts:454-456` | ✅ PASS (M5a, M5b, M5c, M5d mortos) |
| EDF-06 AC 6 (reescrito) — "Alterações salvas." ou "Nada mudou: já estava tudo assim.", dentro do diálogo, sem fechá-lo | as duas frases, pelo `mudou` | `src/components/form-recorrencia.test.tsx:441-444` — `"Nada mudou: já estava tudo assim."`; `:454` — `"Alterações salvas."`; `src/components/lista-de-fixos.test.tsx:372-376` — a frase dentro do diálogo e `dialogo.open).toBe(true)`; página: `e2e/editar-fixo.spec.ts:91` e `:170` | ✅ PASS (M6 morto) |

**Status**: 26 dos 28 critérios têm assertion sobre o resultado da spec e mutante morto. Os dois GAPs
(EDF-01 AC 3, EDF-03 AC 3) são o mesmo elo, `fixos/page.tsx:112-115`, e fecham com uma fix task. Não
resta lacuna de precisão: o dono decidiu as duas da rodada 1, e o caso dos arquivados está no Out of
Scope da spec e em `docs/roadmap.md:85-86`.

Uma observação, que não é gap: o teste do EDF-02 AC 5 chama `blocoDoLancamento` sobre as ocorrências
do fake, e não passa por `obterVisaoMensal` (`obter-visao-mensal/handler.ts:114`), que é quem monta a
lista. A lista usa a mesma função, e o M5a prova que é ela quem decide. Por isso a prova vale.

### Gate

Rodado na worktree da fatia, em `bfc38f6`, com o Postgres `mybilling-db` já de pé e o banco de teste
padrão (`DATABASE_URL_TEST` não definido).

- `pnpm verify` — ✅ saída 0
  - `pnpm typecheck` — `Types generated successfully`
  - `pnpm lint` — `Checked 264 files in 104ms. No fixes applied.`
  - `pnpm test:unit` — **87 arquivos, 1.268 testes**, 0 falhas. `src/domain`: 100% de branches
    (345/345), statements (662/662), funções (158/158) e linhas (626/626)
  - `pnpm test:integration` — **22 arquivos, 307 testes**, 0 falhas
  - `pnpm build` — compilado, 7 rotas
- `pnpm test:e2e` — ✅ **62 passed (2.6m)**, saída 0, a suíte inteira. A edição passa em
  `e2e/editar-fixo.spec.ts:102`, `:148` e `:174`. A importação, que o `main` trouxe, passa em
  `e2e/importacao.spec.ts:152` e `:211`

**Total**: **1.637 provas**, 0 falhas, 0 puladas.

**Integridade dos testes.** As contagens do `main` foram medidas agora, na worktree descartável, em
`b29e138`. O `main` não alterou nenhum `*.integration.test.ts` desde `483a4e3`, por isso as 285 de
integração da rodada 1 continuam valendo para ele.

| | `main` (`b29e138`) | Rodada 1 (`1ac1d02`) | Agora (`bfc38f6`) | Delta sobre o `main` |
| --- | --- | --- | --- | --- |
| unit + componentes | 1.156 (84 arquivos) | 1.243 (87) | 1.268 (87) | +112 = 101 da fatia + 10 do F2 + 1 do F3 |
| integration | 285 (21) | 307 (22) | 307 (22) | +22 |
| e2e | 59 | 62 | 62 | +3 (o F1 estende um teste existente) |

De `1ac1d02` para `bfc38f6`, as únicas linhas removidas de arquivos de teste são de estrutura, e
nenhuma assertion saiu:

- o `import type { Cents, Competencia }` de `handler.test.ts`, que passa a importar também
  `blocoDoLancamento`;
- o `it.each([` de `recorrencia.schema.test.ts`, cujos 10 primeiros casos viraram a constante
  `INVALIDOS_COMO_NO_CADASTRO`, espalhada de volta no mesmo `it.each`, com o 11º caso;
- o import de `formatar.test.ts`, fundido no rebase.

Nenhum `skip`, `only` ou `todo` em `src` nem em `e2e`.

### Validadores

- `validate_spec.py .specs/features/editar-fixos/spec.md` — 0 erros, 0 avisos.
- `validate_tasks.py` sobre uma cópia do `tasks.md` com F1, F2 e F3 trocados por T101, T102 e T103
  (troca por regex com borda de palavra; o `sed` do macOS não tem `\b`) — 0 erros, 10 avisos. São
  nove de granularidade (o `Where` com mais de um arquivo, inclusive o `spec.md` de T101 a T103) e um
  de `Tests: none` na T10, que a matriz declara.
- `validate_state.py editar-fixos` — sai com 1, como deve: o veredito é FAIL.
- `check_commit.py` — OK nas mensagens de `082c4db`, `ac34691` e `bfc38f6`. Os três commits trazem
  `tasks.md` e `spec.md` (`git show --stat`), e o `tasks.md` tem 45 itens marcados e nenhum aberto.

### Code Quality das correções

| Princípio | Status |
| --- | --- |
| Código mínimo | ✅ F1 a F3 só acrescentam teste e texto de spec; nenhum arquivo de produto mudou |
| Segue os padrões | ✅ O F2 reaproveita `base()` e `edicao()`, e o F3 reaproveita `cenario`, `semMudanca` e `ocorrencias` |
| Assertion bate com a spec | ⚠️ 26/28; os dois GAPs são o Fix 4 |
| Todo teste mapeia para AC | ✅ F1 → EDF-01 AC 3 e EDF-03 AC 3; F2 → EDF-05 AC 3; F3 → EDF-02 AC 5 |
| Regras invioláveis (`AGENTS.md`) | ✅ Fixtures genéricas ("Conta de luz", "Pessoa B", R$ 100,00 → R$ 110,00, "cartao"). Nenhum dado real. Nenhuma operação remota |

### Fix 4: abrir a edição no mês da vigência mais nova, com duas pessoas (EDF-01 AC 3, EDF-03 AC 3) — Major

- **Causa**: `fixos/page.tsx:112-115` é o elo entre o gravado e o formulário, e só o e2e o
  atravessa. O F1 cobre um lado da vigência mais nova, o mês anterior, e o seed tem uma pessoa. A
  primeira vigência (E2b) e a pessoa errada (E3p) coincidem com as certas nesse cenário.
- **Fix task**: no teste do EDF-03 em `e2e/editar-fixo.spec.ts`, semear uma segunda pessoa antes de
  `cadastrarFixo` e, depois do bloco de outubro, abrir a edição em novembro:
  ```ts
  /* Uma segunda pessoa: sem ela, a pessoa errada no formulário coincide com a certa. */
  await pool.query("INSERT INTO usuario (nome, email) VALUES ($1, $2)", [
    "Pessoa B",
    "pessoa-b@example.com",
  ]);
  // ... depois do bloco de outubro:
  /* No mês da vigência nova, a edição abre com ela, e não com a primeira:
     salvar sem mexer não desfaz o reajuste (EDF-01 AC 3, EDF-03 AC 3). */
  const novembro = await abrirEdicao(page, "2026-11", "Conta de luz");
  await expect(novembro.getByLabel(/De quanto costuma ser/)).toHaveValue("110,00");
  await novembro.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(novembro.getByRole("status")).toHaveText("Nada mudou: já estava tudo assim.");
  await expect(await linhaNaLista(page, "2026-11", "Conta de luz")).toContainText("R$ 110,00");
  ```
- **Verificado** na worktree descartável. A sonda com esse trecho passa em `bfc38f6`
  (`e2e/editar-fixo.spec.ts` 3/3) e falha:
  - com o E2b, em `toHaveValue("110,00")`, com `Received: "100,00"`;
  - com o E3p, no "Nada mudou" de outubro, com `Received: "Alterações salvas."`;
  - com o E2, em `toHaveValue("100,00")`, com `Received: "110,00"`.
- **Pronto quando**: E2b, E3p e E2 morrem no e2e da fatia, e a traceability do EDF-01 e do EDF-03
  cita o Fix 4.
- **Prioridade**: Major pelo E2b, porque desfaz um reajuste. Minor pelo E3p.

### Lições destiladas

Gravadas com `lessons.py add`, uma por sinal novo, ambas `candidate` (x1). As L-019 a L-022 não se
repetem nesta rodada: os sinais delas foram corrigidos.

| Sinal | Fonte | Lição |
| --- | --- | --- |
| `surviving_mutant` | E2b, `fixos/page.tsx:115` | L-023: valor versionado por mês precisa de teste nos dois lados da vigência mais nova |
| `surviving_mutant` | E3p, `fixos/page.tsx:114` | L-024: fixture de e2e precisa de pelo menos duas opções em cada campo que a tela preenche com o gravado |

### Requirement Traceability: atualização proposta

| Requisito | Antes | Proposto |
| --- | --- | --- |
| EDF-01 | Implemented | ❌ Needs Fix (Fix 4) |
| EDF-02 | Implemented | ✅ Verified |
| EDF-03 | Implemented | ❌ Needs Fix (Fix 4: a consequência cai no AC 3) |
| EDF-04 | Implemented | ✅ Verified |
| EDF-05 | Implemented | ✅ Verified |
| EDF-06 | Implemented | ✅ Verified |

O verificador não edita `spec.md`: a atualização entra com a fix task.

### Resumo da rodada 2

**Overall**: ❌ Not Ready. Falta uma fix task de teste e nenhuma de código. Esta é a 2ª de no máximo 3
iterações de correção e reverificação. Se a rodada 3 não fechar, o caso escala para o dono.

**Spec-anchored check**: 26/28 critérios. Os 2 GAPs estão no mesmo elo da página, e não resta
lacuna de precisão.
**Sensor**: 11 mutantes nesta rodada, 9 mortos e 2 vivos (E2b, E3p). Os 46 da rodada 1 continuam
valendo sobre o mesmo código de produto.
**Gate**: `pnpm verify` saiu com 0 (1.268 unit, 307 integração, 100% de branches no domínio, build).
`pnpm test:e2e` passou 62/62.

**Próximo passo**: um implementador faz o Fix 4. Depois, a rodada 3 reaplica E2, E2b e E3p.

---

## Rodada 3

**Data**: 2026-10-29
**Verificado em**: `df1a2de`, branch `feat/editar-fixos`.
**Faixa**: desde a rodada 2 (`a64660d`), um commit, `df1a2de` (F4). Ele muda
`e2e/editar-fixo.spec.ts` (+13, −0), estende duas linhas da traceability em `spec.md` e acrescenta
a F4 a `tasks.md`. Nenhum arquivo de `src` mudou desde `bfc38f6` (`git diff --stat bfc38f6 HEAD --
src` vazio): o código de produto é o da rodada 2.
**Verificador**: sub-agente independente, que não escreveu o F4. Por orientação do orquestrador, os
mutantes rodaram na própria worktree da fatia, um por vez, cada um revertido com `git checkout --`
logo depois da execução. O porcelain estava vazio antes. Depois de cada mutante, só aparecia
`next-env.d.ts`, que o `next dev` reescreve e que voltou ao commitado com `git checkout`. **Nenhum
`git stash`.** Banco de teste padrão (`DATABASE_URL_TEST` não definido).

### Veredito

**FAIL ❌. O caso escala para o dono.** O F4 faz o que prometeu: E2, E2b e E3p morrem, cada um na
assertion que o declara. Dos seis campos varridos, cinco mutantes morrem, e um sobrevive:
`categoriaId: null` (P4). O motivo não é a categoria. No e2e, o "salvar sem mexer → Nada mudou" só
roda **depois** de uma gravação, e o primeiro salvar já gravou o valor errado. Dali em diante, a
página compara o errado com ele mesmo. Duas sondas confirmam que a classe vale para outros campos: a
pessoa constante (C1) e o meio constante (C2) também passam. O código de produto está certo, e a
correção é de teste: 5 linhas, verificadas numa sonda (Fix 5). Esta foi a 3ª iteração, e o laço
para aqui.

### O F4 não removeu nem enfraqueceu assertion

`git show df1a2de`: o diff de `e2e/editar-fixo.spec.ts` só tem linhas `+` (13). As linhas `−` do
commit são três de texto: as linhas do EDF-01 e do EDF-03 na traceability de `spec.md`, reescritas
com o texto anterior intacto e o trecho do F4 no fim, e a nota do `tasks.md` que passou de "F1 a F3"
para "F1 a F4". Nenhum `skip`, `only` ou `todo` em `src` nem em `e2e`. `tasks.md` tem 48 itens
marcados e nenhum aberto. `check_commit.py` dá OK na mensagem do `df1a2de`.

### Mutantes da rodada 3

Cada mutante rodou isolado. O log confere que ele morreu numa assertion, e não por erro de
compilação. Os de página rodaram `pnpm exec playwright test e2e/editar-fixo.spec.ts`; os de
formulário, `vitest run --project componentes src/components/form-recorrencia.test.tsx`.

| # | `file:line` | Mutação | Morto por | Resultado |
| --- | --- | --- | --- | --- |
| E2 | `src/app/(app)/[competencia]/fixos/page.tsx:115` | `valorNoMesCentavos: versoes.at(-1)?.valorPrevisto ?? null` (a última vigência) | `e2e/editar-fixo.spec.ts:173` — `toHaveValue("100,00")`, `Received: "110,00"` | ✅ Morto |
| E2b | `fixos/page.tsx:115` | `versoes[0]?.valorPrevisto ?? null` (a primeira vigência) | `:181` — `toHaveValue("110,00")`, `Received: "100,00"` (F4) | ✅ Morto |
| E3p | `fixos/page.tsx:114` | `usuarios.find((u) => u.id !== recorrencia.usuarioId)?.id ?? recorrencia.usuarioId` (a outra pessoa) | `:175` — `toHaveText("Nada mudou: já estava tudo assim.")`, `Received: "Alterações salvas."` (F4: a Pessoa B entra em `:152`) | ✅ Morto |
| P1 | `fixos/page.tsx:93` | descrição: `recorrencia.descricao.toLowerCase()` | `:119` — `toHaveValue("Conta de luz")`, `Received: "conta de luz"`. O filtro do cartão (`hasText`) ignora caixa, e a prova vem do campo | ✅ Morto |
| P2 | `fixos/page.tsx:98` | dia: `recorrencia.diaVencimento + 1` | `:175` — "Nada mudou", `Received: "Alterações salvas."` | ✅ Morto |
| P3 | `fixos/page.tsx:112` | meio: o nome no lugar do id, `nomePorMeio.get(recorrencia.meioPagamentoId) ?? …` | `:125` → `:91` — "Alterações salvas." não aparece: o formulário recusa com "Escolha o meio de pagamento." no campo do meio | ✅ Morto |
| P4 | `fixos/page.tsx:113` | categoria: `categoriaId: null` | nenhum: 3/3, em duas execuções | ❌ **Sobreviveu** → Fix 5 |
| P5 | `fixos/page.tsx:110` | início: `competenciaInicio: resultado.value` (o mês aberto, que é o padrão do cadastro) | `:121` — `toHaveValue("2026-10")`, `Received: "2026-11"` | ✅ Morto |
| P6 | `fixos/page.tsx:111` | fim: `competenciaFim: null` | `:200` — `toHaveValue("2026-11")`, `Received: ""` | ✅ Morto |
| C1 | `fixos/page.tsx:114` | sonda de classe: pessoa constante, `opcoesDeUsuario.at(-1)?.id ?? …` (a Pessoa B no teste do EDF-03) | nenhum: 3/3 | ❌ **Sobreviveu** → Fix 5 |
| C2 | `fixos/page.tsx:112` | sonda de classe: meio constante, `opcoesDeMeio.at(-1)?.id ?? …` ("Conta Corrente", e o fixo é cadastrado no "Cartão Roxo") | nenhum: 3/3 | ❌ **Sobreviveu** → Fix 5 |
| FP1 | `src/components/form-recorrencia.tsx:158` | o formulário usa a primeira pessoa, e não a gravada | `form-recorrencia.test.tsx:382` ("os nove campos") e mais 4 | ✅ Morto |
| FP2 | `form-recorrencia.tsx:159-160` | idem, o primeiro meio | `form-recorrencia.test.tsx:382` e mais 5 | ✅ Morto |
| FP3 | `form-recorrencia.tsx:152-153` | idem, o dia sempre `"10"` | `form-recorrencia.test.tsx:382` e mais 4 | ✅ Morto |
| FP4 | `form-recorrencia.tsx:157` | idem, a categoria sempre vazia | `form-recorrencia.test.tsx:382` e mais 4 | ✅ Morto |

**Resultado da rodada 3**: 15 mutantes, 12 mortos e 3 vivos (P4, C1, C2).

**Por que o P4 sobrevive.** Na página, o e2e afirma descrição (`:119`), valor (`:120`, `:173`,
`:181`), início (`:121`) e fim (`:200`). Meio, categoria, pessoa e dia só aparecem no "Nada mudou" de
`:175` e `:183`, que vem depois de uma gravação. Com o P4, a primeira edição do teste do EDF-03 muda
só o valor (`:161-164`). Só que o formulário abriu com "Sem categoria", e esse salvar grava a série
com a categoria nula. A partir daí o gravado é nulo, a página entrega nulo, e o "Nada mudou" passa em
outubro e em novembro. No EDF-04 acontece o mesmo: o primeiro salvar, que só preenche "Termina em",
apaga a categoria. O EDF-02 escapa porque escolhe "Categoria Dois" à mão.

O E3p e o E3m da rodada 2 morrem só porque "a outra pessoa" e "o outro meio" se alternam a cada
gravação: depois do primeiro salvar, a página volta a entregar um valor diferente do gravado. Um
valor errado **constante** se acerta sozinho no primeiro salvar, e o C1 e o C2 mostram isso na
pessoa e no meio, com duas opções de cada no banco. A L-024 (duas opções em cada campo) é
necessária, mas não basta.

**Consequência medida.** Depois da suíte com o P4, o banco de teste tem o fixo do EDF-04 com
`categoria_id` nulo, e as seis ocorrências também, de 2026-10 a 2027-03. Editar só o valor ou o fim
de um fixo apagaria a categoria dele em todos os meses, inclusive os passados, sem a pessoa ter
tocado no campo. Com o C2, o fixo cadastrado no "Cartão Roxo" terminou na "Conta Corrente". Isso
fere o EDF-01 AC 3.

**Onde a classe já está coberta.** No formulário, cair no padrão em vez do gravado morre (FP1 a
FP4) em `src/components/form-recorrencia.test.tsx:382-396`, cujo fixo foge de todo padrão do
cadastro. O furo fica só no elo da página, que nenhum teste além do e2e atravessa.

### Critérios que mudaram desde a rodada 2

| Critério | Resultado definido na spec | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| EDF-01 AC 3 — o formulário abre com o que está gravado | descrição, natureza, valor vigente no mês exibido, dia, início, fim, meio, categoria e pessoa gravados | Formulário: `src/components/form-recorrencia.test.tsx:382-396`, os nove campos (FP1 a FP4 mortos). Página: descrição em `e2e/editar-fixo.spec.ts:119`, valor em `:120`, `:173` e `:181`, início em `:121`, fim em `:200`. Meio, categoria, pessoa e dia só pelo "Nada mudou" de `:175` e `:183`, depois de uma gravação | ❌ GAP na página: P4, C1 e C2 vivos → Fix 5 |
| EDF-03 AC 3 — valor igual ao vigente não registra vigência | nenhuma vigência; o mês continua com o valor que tinha | `e2e/editar-fixo.spec.ts:173-176` em outubro e `:181-184` em novembro — o valor vigente no campo, `toHaveText("Nada mudou: já estava tudo assim.")` e a lista com o valor de cada mês | ✅ PASS (E2, E2b mortos) |

**Status**: 27 dos 28 critérios têm assertion sobre o resultado da spec e mutante morto. O GAP
restante é o EDF-01 AC 3 na página, e fecha com uma fix task. Não há lacuna de precisão da spec.

### Fix 5: salvar sem mexer antes da primeira gravação (EDF-01 AC 3) — Minor

- **Causa**: no e2e, o "Nada mudou" que prova o elo `fixos/page.tsx:112-114` com o formulário só
  roda depois de uma gravação, e um valor errado constante já foi gravado nela. Nenhuma assertion da
  página olha meio, categoria ou pessoa antes disso.
- **Fix task**: no teste do EDF-03 em `e2e/editar-fixo.spec.ts`, logo depois da primeira
  `abrirEdicao` (`:159`) e antes de `:160`:
  ```ts
  /* Antes de qualquer gravação, salvar sem mexer não muda nada. Um campo que a
     página entregasse diferente do gravado seria gravado aqui, e as edições
     seguintes já o comparariam com ele mesmo (EDF-01 AC 3). */
  await form.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(form.getByRole("status")).toHaveText("Nada mudou: já estava tudo assim.");
  ```
  O lugar é o teste do EDF-03 porque é o único com duas pessoas.
- **Verificado** com uma sonda na worktree da fatia, revertida depois. A sonda passa em `df1a2de`
  (3/3) e falha com o P4, o C1 e o C2 na linha nova, os três com `Received: "Alterações salvas."`.
  Ela também mata qualquer dia constante diferente do gravado.
- **Pronto quando**: P4, C1 e C2 morrem no e2e da fatia; E2, E2b e E3p continuam morrendo; a
  traceability do EDF-01 cita o Fix 5.
- **Prioridade**: Minor. O código de produto está certo, e cada mutante tem a consequência do E3p da
  rodada 2: um campo da série gravado sem a pessoa pedir.

**O que fica de fora, e não é gap.**

- Um valor constante **igual ao padrão do cadastro** (o primeiro meio, a primeira pessoa, o dia 10)
  continua equivalente no e2e, porque o `cadastrarFixo` grava os padrões (`e2e/editar-fixo.spec.ts:52-65`).
  Na página, isso exigiria escrever de propósito o primeiro da lista, porque o tipo `ItemFixo`
  (`src/components/lista-de-fixos.tsx:43-62`) não deixa omitir o campo. No formulário, onde cair no
  padrão é plausível, FP1 a FP4 morrem. Fechar também esse caso pede um `cadastrarFixo` que escolha
  meio, pessoa e dia, e isso fica fora do Fix 5.
- `natureza` e `id` ficaram fora da varredura, que o orquestrador limitou aos seis campos. A natureza
  vai travada e fora do payload (EDF-05 AC 2).

### Gate

Rodado na worktree da fatia, em `df1a2de` limpo, com o Postgres `mybilling-db` de pé e o banco de
teste padrão.

- `pnpm test:unit` — ✅ **87 arquivos, 1.268 testes**, 0 falhas. `src/domain`: 100% de branches
  (345/345), statements (662/662), funções (158/158) e linhas (626/626)
- `pnpm typecheck` — ✅ `Types generated successfully`, `tsc` saída 0
- `pnpm lint` — ✅ `Checked 264 files in 119ms. No fixes applied.`
- `pnpm exec playwright test e2e/editar-fixo.spec.ts` — ✅ **3 passed (15.9s)**, saída 0. Também 3/3
  (19.7s) antes do primeiro mutante.

A integração e o build não rodaram de novo: nenhum arquivo de `src` mudou desde `bfc38f6`, cujo
`pnpm verify` passou na rodada 2 (307 de integração, build). A suíte e2e inteira também não rodou:
só `e2e/editar-fixo.spec.ts` mudou, e nenhum mutante dependia de outro arquivo.

**Integridade dos testes.** As contagens são as da rodada 2: 1.268 unit e 3 testes no
`e2e/editar-fixo.spec.ts`. O F4 estende um teste existente.

### Validadores

- `validate_spec.py .specs/features/editar-fixos/spec.md` — 0 erros, 0 avisos.
- `validate_tasks.py` sobre uma cópia do `tasks.md` com F1 a F4 trocados por T101 a T104 (regex com
  borda de palavra, 30 trocas) — 0 erros, 11 avisos: os 10 da rodada 2 e o `spec.md` no `Where` da
  T104.
- `validate_state.py editar-fixos` — sai com 1, como deve: o veredito é FAIL.
- `check_commit.py` — OK na mensagem do `df1a2de`.

### Lições destiladas

| Sinal | Fonte | Lição |
| --- | --- | --- |
| `surviving_mutant` | P4, `fixos/page.tsx:113`; C1, `:114`; C2, `:112` | L-025: rodar o "salvar sem mexer não muda nada" antes da primeira gravação do teste, porque depois dela um campo entregue errado e constante já foi gravado e se compara consigo mesmo |

A L-023 e a L-024 não se repetem: os mutantes delas morreram. A L-025 completa a L-024.

### Requirement Traceability: atualização proposta

| Requisito | Antes | Proposto |
| --- | --- | --- |
| EDF-01 | Implemented | ❌ Needs Fix (Fix 5), ou ✅ Verified com o risco aceito pelo dono |
| EDF-02 | Implemented | ✅ Verified |
| EDF-03 | Implemented | ✅ Verified (o F4 mata o E2b) |
| EDF-04 | Implemented | ✅ Verified |
| EDF-05 | Implemented | ✅ Verified |
| EDF-06 | Implemented | ✅ Verified |

O verificador não edita `spec.md`. Quando o EDF-01 fechar, a traceability final fica com os seis
requisitos em `Verified` e cita esta seção. No EDF-01, cita o Fix 5 (ou a aceitação do dono).

### Decisão do dono

As três iterações de correção e reverificação acabaram. Há duas saídas:

1. **Autorizar o Fix 5 e uma reverificação curta.** Ela reaplica P4, C1, C2, E2, E2b e E3p e roda
   `pnpm lint` e `pnpm exec playwright test e2e/editar-fixo.spec.ts`. A sonda indica que passa.
2. **Aceitar o risco.** O código de produto está certo. O EDF-01 fica `Verified`, com a ressalva
   desta seção, e o Fix 5 vai para o roadmap.

### Resumo da rodada 3

**Overall**: ❌ Not Ready. Falta uma fix task de teste e nenhuma de código. O laço de 3 iterações
acabou, e a decisão é do dono.

**Spec-anchored check**: 27/28 critérios. O GAP é o EDF-01 AC 3 na página. Não há lacuna de
precisão.
**Sensor**: 15 mutantes nesta rodada, 12 mortos e 3 vivos (P4, C1, C2). Os 46 da rodada 1 e os 9
mortos da rodada 2 valem sobre o mesmo código de produto.
**Gate**: 1.268 unit (100% de branches no domínio), typecheck e lint limpos, `e2e/editar-fixo.spec.ts`
3/3.

**Próximo passo**: o dono escolhe entre o Fix 5 com reverificação curta e o risco aceito.

---

## Reverificação depois do F5

**Data**: 2026-10-29
**Verificado em**: `e913f24` (F5), autorizado pelo dono como a saída 1 da rodada 3.
**Faixa**: desde `a46943a`, um commit. Ele acrescenta 5 linhas a `e2e/editar-fixo.spec.ts`
(`:160-164`), estende a linha do EDF-01 na traceability de `spec.md` e acrescenta a F5 (Phase 8) a
`tasks.md`. Nenhum arquivo de `src` mudou.
**Verificador**: o mesmo sub-agente da rodada 3, que não escreveu o F5. Os mutantes rodaram como na
rodada 3: um por vez na worktree da fatia, revertidos com `git checkout --`. Porcelain vazio antes e
no fim, sem `git stash`, `next-env.d.ts` devolvido ao commitado. Banco de teste padrão.

### Veredito

**PASS ✅.** Os seis mutantes reaplicados morrem, cada um numa assertion. O F5 não removeu nem
enfraqueceu nada. O gate está verde.

### O F5 não removeu nem enfraqueceu assertion

`git show e913f24`: o diff do e2e só tem linhas `+` (5). As duas linhas `−` do commit são texto:
- a linha do EDF-01 em `spec.md`, que mantém o texto anterior inteiro e ganha no fim o trecho do F5;
- a nota do `tasks.md`, que passou de "F1 a F4" para "F1 a F5".

Nenhum `skip`, `only` ou `todo` em `src` nem em `e2e`. `tasks.md` tem 50 itens marcados e nenhum
aberto. `check_commit.py` dá OK na mensagem do `e913f24`.

### Mutantes reaplicados

| # | `file:line` | Mutação | Morto por | Resultado |
| --- | --- | --- | --- | --- |
| P4 | `src/app/(app)/[competencia]/fixos/page.tsx:113` | `categoriaId: null` | `e2e/editar-fixo.spec.ts:164` — `toHaveText("Nada mudou: já estava tudo assim.")`, `Received: "Alterações salvas."` (F5) | ✅ Morto |
| C1 | `fixos/page.tsx:114` | pessoa constante, `opcoesDeUsuario.at(-1)?.id ?? …` | `:164`, `Received: "Alterações salvas."` (F5) | ✅ Morto |
| C2 | `fixos/page.tsx:112` | meio constante, `opcoesDeMeio.at(-1)?.id ?? …` | `:164`, `Received: "Alterações salvas."` (F5) | ✅ Morto |
| E2 | `fixos/page.tsx:115` | `versoes.at(-1)?.valorPrevisto ?? null` (a última vigência) | `:178` — `toHaveValue("100,00")`, `Received: "110,00"` | ✅ Morto |
| E2b | `fixos/page.tsx:115` | `versoes[0]?.valorPrevisto ?? null` (a primeira vigência) | `:186` — `toHaveValue("110,00")`, `Received: "100,00"` | ✅ Morto |
| E3p | `fixos/page.tsx:114` | a outra pessoa | `:164`, `Received: "Alterações salvas."`. Antes do F5 morria em `:175`, e agora cai na linha nova, que vem antes | ✅ Morto |

**Resultado**: 6 de 6 mortos. Os 46 mutantes da rodada 1, os 11 da rodada 2 e os 12 mortos da
rodada 3 valem sobre o mesmo código de produto.

### Critério que mudou

| Critério | Resultado definido na spec | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| EDF-01 AC 3: o formulário abre com o que está gravado | descrição, natureza, valor vigente no mês exibido, dia, início, fim, meio, categoria e pessoa gravados | Formulário: `src/components/form-recorrencia.test.tsx:382-396`, os nove campos (FP1 a FP4 mortos). Página: `e2e/editar-fixo.spec.ts:163-164`, onde salvar sem mexer antes de qualquer gravação dá "Nada mudou" e prova cada campo que a página entrega (P4, C1, C2, E3p mortos). Ainda descrição em `:119`, valor em `:178` e `:186`, início em `:121` e fim em `:205` | ✅ PASS |

**Status**: 28 de 28 critérios com assertion sobre o resultado da spec e mutante morto. Não há
lacuna de precisão.

O que ficou de fora na rodada 3 continua sem ser gap. Uma constante igual ao padrão do cadastro só
morre no formulário (FP1 a FP4). `natureza` e `id` não entraram na varredura.

### Gate

- `pnpm typecheck`: ✅ `Types generated successfully`, `tsc` saída 0.
- `pnpm lint`: ✅ `Checked 264 files in 146ms. No fixes applied.`
- `pnpm exec playwright test e2e/editar-fixo.spec.ts`: ✅ **3 passed (20.7s)**, saída 0.

Unit, integração e build não rodaram de novo, porque nenhum arquivo de `src` mudou desde `bfc38f6`.
Na rodada 3, `pnpm test:unit` deu 1.268 testes e 100% de branches no domínio. Na rodada 2,
`pnpm verify` passou com 307 testes de integração e o build. A contagem do e2e da fatia continua em
3 testes: o F5 estende um teste existente.

### Validadores

- `validate_spec.py`: 0 erros, 0 avisos.
- `validate_tasks.py`, sobre uma cópia do `tasks.md` com F1 a F5 trocados por T101 a T105: 0 erros e
  12 avisos. São os 11 da rodada 3 e o `spec.md` no `Where` da T105.
- `validate_state.py editar-fixos`: sai com 0.

### Lições

Nenhuma lição nova, porque a reverificação não teve falha. A L-025 continua `candidate`.

### Requirement Traceability final, proposta

| Requisito | Antes | Proposto |
| --- | --- | --- |
| EDF-01 | Implemented | ✅ Verified (F1, F4, F5; `validation.md`, reverificação depois do F5) |
| EDF-02 | Implemented | ✅ Verified (F3; rodada 2) |
| EDF-03 | Implemented | ✅ Verified (F1, F4; rodada 3) |
| EDF-04 | Implemented | ✅ Verified (rodada 1) |
| EDF-05 | Implemented | ✅ Verified (F2; rodada 2) |
| EDF-06 | Implemented | ✅ Verified (F3; rodada 2) |

O verificador não edita `spec.md`. A coluna Status de cada linha passa de `Implemented: …` para
`Verified: …`, com o texto atual mantido e a citação desta seção no fim.

### Resumo

**Overall**: ✅ Ready.
**Spec-anchored check**: 28/28 critérios.
**Sensor**: 6 de 6 mortos nesta reverificação.
**Gate**: typecheck e lint limpos, `e2e/editar-fixo.spec.ts` 3/3.
