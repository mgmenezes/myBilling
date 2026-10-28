# Editar gasto fixo e entrada fixa — Validação

## Validation: editar-fixos — **FAIL**

**Result**: FAIL ❌ — dois mutantes vivos, nenhum defeito de comportamento no código de `48c79da`.

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
