# Lançamento avulso e entradas — Validação (3ª rodada)

**Data**: 2026-09-15
**Spec**: `.specs/features/lancamento-avulso/spec.md`
**Faixa do diff**: `e73a614~1..HEAD` (`35eb9bd`) — **descontados** os commits da fatia `home-do-ano`,
integrada em paralelo por outra sessão (`e3735b1`, `5c0ad5c`, `fa0e450`, `6b35358`, `bebc9d2`)
**Commit de correção sob exame**: `35eb9bd` — *test(e2e): medir a posição do cadastro também na área
Todo mês*
**Verificador**: sub-agente independente (autor ≠ verificador), terceira e última re-verificação.
Somente leitura sobre o código-fonte; todas as mutações rodaram numa `git worktree` descartável,
**nenhum `git stash`**.

## Validation: lancamento-avulso — PASS

**Result**: PASS

As **duas pendências** do ciclo 2 foram fechadas, e fechadas de verdade — as duas reconferidas por
mutação, não pela palavra de quem corrigiu.

- O mutante **N10** (mover `<DialogoDeCadastro>` de `/[competencia]/fixos` para o rodapé da página),
  que sobrevivia às 40 provas de e2e no ciclo anterior, **agora morre**. Foi conferido além do
  pedido: morre também o mutante espelho (a lista sobe para o topo, **N17**) e a âncora contra o
  caso trivial (a lista fica vazia, **N18**) prova que o teste mede um item real e não passa no
  vácuo.
- "Cancelado não recebe data de pagamento" ganhou **AC numerado** — `spec.md:204-205`, AVUL-03 AC 5 —
  e a traceability de AVUL-04 (`spec.md:344`) e a tabela de dimensões (`spec.md:91`) passaram a
  apontar para ele. A frase que a rastreabilidade citava agora existe em critério.

O gate subiu de 1.034 para 1.035 provas verdes (+1 e2e), sem nenhum teste removido nem enfraquecido.
Sensor: **9 mutações injetadas, 9 mortas, 0 sobreviventes** — mais os dois equivalentes já
declarados e justificados no ciclo 2, que não foram reabertos.

**Resíduo Minor, sem gate**: a renumeração dos ACs de AVUL-03 (7 → 8 critérios) foi aplicada **só em
`spec.md`**. Doze citações em `tasks.md` e em nomes/comentários de teste continuam apontando para a
numeração antiga. Nenhum critério ficou sem prova e nenhum mutante sobreviveu por causa disso — é
deriva de rótulo, não de cobertura —, mas está listado abaixo com o conserto exato porque é
exatamente a classe de defeito que a pendência 2 existia para eliminar.

---

## As duas pendências do ciclo 2, uma por uma

### 1. Minor — AVUL-05 AC 8 sem medição de posição em `/[competencia]/fixos` — ✅ **FECHADA**

- **Correção**: `e2e/recorrencias.spec.ts:87-109`, percurso novo.
- **Evidência**: `e2e/recorrencias.spec.ts:108` —
  `expect(posicaoDoBotao).toBeLessThan(posicaoDaLista)`, comparando
  `getBoundingClientRect().top + window.scrollY` do `button` "+ Novo fixo" (`:98-100`) com o do item
  de lista que contém a descrição (`:103-106`,
  `page.getByRole("listitem").filter({ hasText: "Conta de água" })`). É a mesma forma do teste de
  AVUL-05 AC 1 em `e2e/lancamento-avulso.spec.ts:375`.
- **Desconfiança exercida — conferido por mutação, não pela afirmação de quem corrigiu**:
  - **N10** reaplicado, idêntico ao do ciclo 2 (o bloco `<DialogoDeCadastro>` sai do cabeçalho de
    `src/app/(app)/[competencia]/fixos/page.tsx` e vai para depois de `<ListaDeFixos>`):
    **MORREU** — `✘ 34 [chromium] › e2e/recorrencias.spec.ts:87:5`,
    `Error: expect(received).toBeLessThan(expected)`. Era o único sobrevivente real do ciclo
    anterior.
  - **N17**, o espelho (a lista sobe para o topo, o cadastro fica no cabeçalho): **MORREU** no mesmo
    teste. A assertion prende a ordem pelos dois lados, não só num sentido.
  - **N18**, âncora contra o caso trivial (`itens={[]}` na página, a lista fica sem nenhum item):
    **MORREU**. Sem item, o localizador não resolve e o teste falha em vez de passar no vácuo — a
    medição depende de um item real, não de um seletor que casa com qualquer coisa. (Falha por
    esgotar o timeout de 60 s, não por assertion; mata, mas devagar.)
- **O engano de seletor que o autor relata no commit foi conferido**: o comentário de
  `e2e/recorrencias.spec.ts:101-102` diz que o primeiro `listitem` da página é da **navegação**, e o
  teste de fato filtra por `hasText`. Com `.first()` a medição pegaria a navegação, que fica acima
  de tudo; o código entregue não faz isso.

### 2. Minor (só spec) — "cancelado não recebe data de pagamento" sem AC numerado — ✅ **FECHADA**

- **Correção**: `spec.md:204-205` — AC 5 novo em "Excluir um lançamento avulso":
  *"IF o lançamento já estiver cancelado THEN o sistema SHALL recusar marcá-lo como pago, deixando
  `pago_em` inalterado"*. Os antigos ACs 5, 6 e 7 viraram 6, 7 e 8.
- **A rastreabilidade acompanhou**: `spec.md:344` — `AVUL-04 | ... ACs 3, 4 e 5 (integridade de
  transição: nem recancela, nem marca pago)`; `spec.md:343` — `AVUL-03 | ... ACs 1, 2, 6, 7 e 8`;
  `spec.md:91` — `Integridade de transição de estado | AVUL-04 ACs 3, 4 e 5`. A frase citada pela
  traceability agora existe em critério numerado.
- **Evidência de que o AC 5 tem prova, e prova falsificável**:
  `src/infrastructure/db/repositories/movimento.repository.integration.test.ts:407` —
  `expect(rows[0]?.pago_em).toBeNull()` depois de cancelar e tentar marcar; âncora contra o caso
  trivial em `:415` — `expect((await repo.buscarPorId(id))?.pagoEm).toBe("2026-03-15")` para a linha
  vigente; dublê em `src/application/ports/fakes.test.ts:326` —
  `expect((await movimentos.buscarPorId(gravado.id))?.pagoEm).toBeNull()`.
- **Conferido por mutação** (4 mutantes sobre a guarda, os quatro mortos): ver N19, N20, N21 e N22 na
  seção do sensor.

---

## Resíduo — a renumeração deixou referências órfãs fora de `spec.md`

A renumeração foi aplicada corretamente **dentro** de `spec.md`. Fora dela, **12 citações** continuam
com a numeração antiga e hoje apontam para o critério errado. O caso mais claro:
`src/components/tabela-lancamentos.test.tsx:409` chama-se *"excluir aparece só onde é permitido
(AVUL-03, AC 5)"* — e o AC 5 de hoje é *"cancelado não se marca como pago"*.

Mapa da renumeração: **AC 5 → AC 6**, **AC 6 → AC 7**, **AC 7 → AC 8**. Os ACs 1 a 4 não mudaram, e
as citações a eles (`spec.md:87-88`, `design.md:66`,
`src/application/mes/cancelar-lancamento/handler.test.ts:41,75,123`,
`src/application/ports/fakes.test.ts:256,276,284`,
`src/domain/mes/cancelamento-permitido.ts:35`, `.../cancelamento-permitido.test.ts:31`,
`src/application/ports/repositories.ts:151`, `src/app/actions/lancamentos.ts:72`,
`src/application/mes/cancelar-lancamento/handler.ts:50`,
`src/app/actions/lancamentos.integration.test.ts:359`) **estão corretas** — foram conferidas uma a
uma.

| `file:line` | Texto atual | Deveria citar |
| --- | --- | --- |
| `.specs/features/lancamento-avulso/tasks.md:372` (T13) | `revalida ... (AC 7)` | AC 8 |
| `.specs/features/lancamento-avulso/tasks.md:439` (T17) | `O controle não aparece em linha de parcela ... (AC 5)` | AC 6 |
| `.specs/features/lancamento-avulso/tasks.md:440` (T17) | `O primeiro acionamento pede confirmação ... (AC 6)` | AC 7 |
| `.specs/features/lancamento-avulso/tasks.md:441` (T17) | `O segundo acionamento chama a action (AC 6)` | AC 7 |
| `.specs/features/lancamento-avulso/tasks.md:641` (T21) | `O primeiro toque não exclui (AC 6)` | AC 7 |
| `.specs/features/lancamento-avulso/tasks.md:643` (T21) | `Linha de parcela não oferece o controle (AC 5)` | AC 6 |
| `e2e/lancamento-avulso.spec.ts:265` | `o primeiro toque em Excluir não exclui (AVUL-03, AC 6)` | AC 7 |
| `e2e/lancamento-avulso.spec.ts:277` | `parcela de compra não oferece o controle de excluir (AVUL-03, AC 5)` | AC 6 |
| `src/components/botao-excluir.test.tsx:7` | `Testes derivados de AVUL-03 (AC 6)` | AC 7 |
| `src/components/botao-excluir.test.tsx:33` | `BotaoExcluir — dois toques (AVUL-03, AC 6)` | AC 7 |
| `src/components/tabela-lancamentos.test.tsx:409` | `excluir aparece só onde é permitido (AVUL-03, AC 5)` | AC 6 |
| `src/app/actions/lancamentos.integration.test.ts:307` | `cancelarLancamento: exclusão lógica (AVUL-03, AC 1, 2 e 7)` | ACs 1, 2 e 8 |

**Por que não gateia**: nenhum critério ficou sem `file:line`, nenhum teste ficou órfão de requisito,
nenhum mutante sobreviveu, e o comportamento descrito por cada teste continua sendo exatamente o que
ele afirma. O defeito é de rótulo — um leitor que siga "AC 5" a partir do teste cai no critério
errado. É Minor, de conserto mecânico, e não é condição para encerrar a fatia.

**Conserto exato** (12 substituições, nenhuma outra mudança): nos 12 `file:line` da tabela, trocar o
número citado pelo da coluna direita. Não tocar em nenhuma citação a AVUL-03 AC 1 a 4.

---

## Task Completion

As 32 tasks de `tasks.md` (T1..T32) seguem `✅ CONCLUÍDA`, **zero** caixas `- [ ]` pendentes
(`grep -c -- "- [ ]"` devolve 0; `grep -c CONCLUÍDA` devolve 32). As duas ressalvas do ciclo 1 e a
única do ciclo 2 estão resolvidas.

**Observação de processo** (não é gate, repetida do ciclo 2): as correções dos três ciclos entraram
como commits únicos (`a67544c`, `35eb9bd`) sem terem sido registradas como fix tasks em `tasks.md`,
enquanto o `AGENTS.md` pede uma task por commit. Não afeta o veredito.

---

## Critérios de aceitação ancorados na spec

Os ACs sem mudança neste ciclo mantêm a evidência já verificada e reconferida nas rodadas 1 e 2;
abaixo estão condensados, com a evidência integral nos que mudaram em `35eb9bd`.

### AVUL-01 — Registrar um gasto avulso

| Critério | Resultado definido na spec | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| AC 1 — 1 `movimento` `origem='AVULSO'`, sem os três vínculos | uma linha, três nulos | `movimento.repository.integration.test.ts:211-214` — `expect(gravado.origem).toBe("AVULSO")`, `compraId`/`numeroParcela`/`recorrenciaId` `toBeNull()` | ✅ PASS |
| AC 2 — descrição vazia ou > 120 recusa em `descricao` | erro no campo; zero linhas | `lancamento-avulso.schema.test.ts:53,60-65`; `lancamentos.integration.test.ts:210-211` | ✅ PASS |
| AC 3 — valor não inteiro > 0 recusa em `valorCentavos` | erro no campo; zero linhas | `lancamento-avulso.schema.test.ts:70,74,78,88`; `lancamentos.integration.test.ts:220-221` | ✅ PASS |
| AC 4 — competência fora de `AAAA-MM` | erro em `competencia` | `lancamento-avulso.schema.test.ts:96,100`; `lancamentos.integration.test.ts:230-231` | ✅ PASS |
| AC 5 — data fora de `AAAA-MM-DD` | erro em `dataEvento` | `lancamento-avulso.schema.test.ts:104,108`; `lancamentos.integration.test.ts:240-241` | ✅ PASS |
| AC 6 — revalida `/[competencia]` e `/[competencia]/lancamentos` | as duas, exatamente | `lancamentos.integration.test.ts:186` — `expect(revalidatePath.mock.calls.flat()).toEqual(["/2026-03","/2026-03/lancamentos"])` | ✅ PASS |
| AC 7 — sem sessão recusa antes do banco | código de sessão | `lancamentos.integration.test.ts:125,137-138` | ✅ PASS |
| AC 8 — falha imprevista devolve `ERRO_INESPERADO` com identificador, sem stack trace | `code`, id na mensagem, sem stack | `lancamentos.integration.test.ts:413` — `expect(resultado.erro.code).toBe("ERRO_INESPERADO")`; `:414` — `toMatch(/informe o código [0-9a-f]{8}\.$/)`; `:415` — `not.toMatch(/at \|\.ts:\|node_modules\|insert\|violates/i)`; `:438` — `expect(String(logado[0])).toContain(correlacao)` | ✅ PASS |

### AVUL-02 — Registrar dinheiro que entra

| Critério | `file:line` + assertion | Resultado |
| --- | --- | --- |
| AC 1 — `RECEITA` soma em Receitas, nunca em Despesas | `lancamentos.integration.test.ts:169,177-178`; `e2e/lancamento-avulso.spec.ts:202,204` | ✅ PASS |
| AC 2 — o formulário oferece só despesa e receita | `lancamento-avulso.schema.test.ts:113-124`; `form-lancamento-avulso.test.tsx:68` | ✅ PASS |
| AC 3 — receita em "Entradas" e em nenhum bloco de despesa | `e2e/lancamento-avulso.spec.ts:196,198`; `tabela-lancamentos.test.tsx:173-181` | ✅ PASS |
| AC 4 — meio sem fatura ⇒ já pago, `pagoEm = dataEvento` | `criar-lancamento-avulso/handler.test.ts:104,143`; `lancamentos.integration.test.ts:178` | ✅ PASS |
| AC 5 — meio com fatura ⇒ não pago | `criar-lancamento-avulso/handler.test.ts:147`; `form-lancamento-avulso.test.tsx:106` | ✅ PASS |
| AC 6 — a pessoa altera o padrão | `criar-lancamento-avulso/handler.test.ts:136-137`; `form-lancamento-avulso.test.tsx:126,130` | ✅ PASS |

### BLOCO-01 / BLOCO-02 — Ler no bloco do cartão tudo que vai na fatura

| Critério | `file:line` + assertion | Resultado |
| --- | --- | --- |
| AC 1 — cada despesa em exatamente um bloco, por uma única função | `src/domain/mes/bloco-do-lancamento.ts:29-40` é a única implementação; exaustividade em `resumo-mensal.test.ts:239` — `expect(fixos + cartao + avulsos).toBe(totalGastos)` | ✅ PASS |
| AC 2 — `RECORRENCIA` ⇒ Fixos, mesmo em cartão | `bloco-do-lancamento.test.ts:45`; `resumo-mensal.test.ts:214-215` | ✅ PASS |
| AC 3 — não recorrente + cartão ⇒ Cartão | `bloco-do-lancamento.test.ts:65,74`; `resumo-mensal.test.ts:184-185`; `e2e/lancamento-avulso.spec.ts:127,129` | ✅ PASS |
| AC 4 — não recorrente + meio sem fatura ⇒ Gastos do Mês | `bloco-do-lancamento.test.ts:94`; `resumo-mensal.test.ts:195-196`; `e2e/lancamento-avulso.spec.ts:140-141` | ✅ PASS |
| AC 5 — indicador e bloco pela mesma classificação | `obter-visao-mensal/handler.test.ts:252-254` — `expect(visao.competenciaView.cartao).toBe(somaDoBloco("CARTAO"))`, com âncora em `:256` | ✅ PASS |
| AC 6 — cartão arquivado continua cartão | `cadastro.repository.integration.test.ts:143`; `bloco-do-lancamento.test.ts:83` | ✅ PASS |
| AC 7 — coluna "Parcela" só no bloco Cartão | `tabela-lancamentos.test.tsx:341,363` | ✅ PASS |
| BLOCO-02 — `resumoMensal` segmenta pelos blocos | `resumo-mensal.test.ts:236-239` | ✅ PASS |

### AVUL-03 — Excluir um lançamento avulso (**renumerado neste ciclo: 7 → 8 ACs**)

| Critério | Resultado definido na spec | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| AC 1 — preenche `cancelado_em`, mantém a linha | instante gravado, linha viva | `movimento.repository.integration.test.ts:347,353-354`; `cancelar-lancamento/handler.test.ts:71` | ✅ PASS |
| AC 2 — cancelado sai de toda soma e lista | some de tudo | `movimento.repository.integration.test.ts:143`; `lancamentos.integration.test.ts:322,324`; `e2e/lancamento-avulso.spec.ts:262` | ✅ PASS |
| AC 3 — origem ≠ AVULSO recusa com `LANCAMENTO_NAO_CANCELAVEL` | código exato, zero linhas alteradas | `cancelamento-permitido.test.ts:47,59`; concordância função × `WHERE` em `movimento.repository.integration.test.ts:417`; `lancamentos.integration.test.ts:368` | ✅ PASS |
| AC 4 — já cancelado devolve sucesso sem alterar | sucesso, `cancelado_em` intacto | `cancelar-lancamento/handler.test.ts:133,137-138`; `lancamentos.integration.test.ts:351,355` | ✅ PASS |
| **AC 5 (novo) — cancelado recusa ser marcado como pago, `pago_em` inalterado** | `pago_em` continua nulo | `movimento.repository.integration.test.ts:407` — `expect(rows[0]?.pago_em).toBeNull()`; âncora em `:415` — `expect((await repo.buscarPorId(id))?.pagoEm).toBe("2026-03-15")`; dublê em `fakes.test.ts:326` — `expect((await movimentos.buscarPorId(gravado.id))?.pagoEm).toBeNull()` | ✅ **PASS (AC novo)** |
| AC 6 (era 5) — excluir só nas linhas avulsas | controle ausente nas demais | `tabela-lancamentos.test.tsx:421,446,462,478`; `e2e/lancamento-avulso.spec.ts:290` | ✅ PASS |
| AC 7 (era 6) — dois toques | só o segundo exclui | `botao-excluir.test.tsx:39-40,49-50`; `e2e/lancamento-avulso.spec.ts:273-274` | ✅ PASS |
| AC 8 (era 7) — revalida as duas rotas | as duas, exatamente | `lancamentos.integration.test.ts:325,339` | ✅ PASS |

### AVUL-04 — Integridade de transição de estado (mapeia para AVUL-03 ACs 3, 4 e 5)

| Metade do requisito | `file:line` + assertion | Resultado |
| --- | --- | --- |
| "não se cancela de novo" (ACs 3 e 4) | `cancelar-lancamento/handler.test.ts:137-138`; `movimento.repository.integration.test.ts:378-389` | ✅ PASS |
| "nem se marca como pago" (AC 5) | implementado em `movimento.repository.ts:100-105` — `.where(and(eq(movimento.id, id), isNull(movimento.canceladoEm)))` — e em `fakes.ts:212-217`; provas em `movimento.repository.integration.test.ts:407` e `fakes.test.ts:326` | ✅ PASS |

### ENTR-01 / ENTR-02 — Achar onde mora o dinheiro que entra

| Critério | `file:line` + assertion | Resultado |
| --- | --- | --- |
| AC 1 — a área se chama "Todo mês" | `navegacao-principal.test.tsx:16-23,30`; `src/app/(app)/[competencia]/fixos/page.tsx:100`; `e2e/recorrencias.spec.ts:132` | ✅ PASS |
| AC 2 — "Entradas" sempre, mesmo vazio | `tabela-lancamentos.test.tsx:186-198`; `e2e/lancamento-avulso.spec.ts:235-236` | ✅ PASS |
| AC 3 — "Entradas" antes dos blocos de despesa | `tabela-lancamentos.test.tsx:120`; `e2e/lancamento-avulso.spec.ts:239` | ✅ PASS |
| AC 4 — vazio mostra texto, não tabela | `tabela-lancamentos.test.tsx:198-199` | ✅ PASS |
| AC 5 — o bloco de despesa recorrente continua "Fixos" | `tabela-lancamentos.test.tsx:103` | ✅ PASS |

### ENTR-03 — O formulário fala a língua da receita

| Critério | `file:line` + assertion | Resultado |
| --- | --- | --- |
| AC 1 — rótulo do meio vira destino | `form-lancamento-avulso.test.tsx:292-293`; `form-recorrencia.test.tsx:248-249`; `e2e/lancamento-avulso.spec.ts:215-216` | ✅ PASS |
| AC 2 — só meios sem fatura | `form-lancamento-avulso.test.tsx:303-304`; `e2e/lancamento-avulso.spec.ts:217` | ✅ PASS |
| AC 3 — título e botão falam de entrada | `form-recorrencia.test.tsx:229-230` | ✅ PASS |
| AC 4 — o dia vira "Dia que costuma cair" | `form-recorrencia.test.tsx:272` | ✅ PASS |
| AC 5 — meio com fatura troca para o primeiro sem fatura | `form-lancamento-avulso.test.tsx:315,338-339`; `form-recorrencia.test.tsx:283` | ✅ PASS |
| AC 6 — em despesa tudo volta como era | `form-lancamento-avulso.test.tsx:349-350`; `form-recorrencia.test.tsx:293-296` | ✅ PASS |

### AVUL-05 — Cadastrar sem rolar a página

| Critério | Resultado definido na spec | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| AC 1 — controle de abrir no topo da área de Lançamentos, antes da lista | posição: antes da lista | `e2e/lancamento-avulso.spec.ts:375` — `expect(posicaoDoBotao).toBeLessThan(posicaoDaLista)`, medindo `getBoundingClientRect().top + window.scrollY` do botão contra o do `region` "Entradas" | ✅ PASS |
| AC 2 — diálogo modal, sem navegar | `<dialog>` aberto, mesma rota | `dialogo-de-cadastro.test.tsx:55,62-67` | ✅ PASS |
| AC 3 — confina o foco e torna o resto inerte | foco preso; fora inerte | `e2e/lancamento-avulso.spec.ts:325` — `expect(visitouOFundo).toBe(false)`; `:337` — 20 `Tab`, `expect(noFundo).toBe(false)`; `:341` — `not.toBeFocused()` no botão de fundo | ✅ PASS |
| AC 4 — `Escape` fecha e devolve o foco | fechado **e** foco de volta | `e2e/lancamento-avulso.spec.ts:354` — `await expect(page.getByRole("dialog")).toBeHidden()`; `:357` — `await expect(abrir).toBeFocused()`; `:358` — `aria-expanded="false"` | ✅ PASS |
| AC 5 — gravar mantém aberto, confirmação visível | `open === true` + confirmação | `dialogo-de-cadastro.test.tsx:125-126`; `form-lancamento-avulso.test.tsx:166` | ✅ PASS |
| AC 6 — abaixo de 640px o diálogo ocupa a tela | tela cheia | `e2e/lancamento-avulso.spec.ts:384-385` — `expect(caixa?.width).toBe(400)` e `expect(caixa?.height).toBeGreaterThanOrEqual(700)` num viewport 400×720; `:389` — sem rolagem horizontal | ✅ PASS |
| AC 7 — preserva o digitado na aba não visível | valor mantido | `seletor-de-formulario.test.tsx:87-98`; `dialogo-de-cadastro.test.tsx:139` | ✅ PASS |
| **AC 8 — "Todo mês" abre pelo topo, no mesmo diálogo, sem formulário no rodapé** | mesmo componente **e** posição no topo | "mesmo diálogo" — `src/app/(app)/[competencia]/fixos/page.tsx:103-118` usa `DialogoDeCadastro`; **"no topo"** — `e2e/recorrencias.spec.ts:108` — `expect(posicaoDoBotao).toBeLessThan(posicaoDaLista)`, botão "+ Novo fixo" (`:98-100`) contra o `listitem` filtrado por `hasText: "Conta de água"` (`:103-106`) | ✅ **PASS (era GAP)** |

### FIXO-07 — A lista de Todo mês mostra só o que vale no mês aberto

| Critério | `file:line` + assertion | Resultado |
| --- | --- | --- |
| AC 1 — mês posterior à última competência válida omite a recorrência | domínio em `vale-na-competencia.test.ts:16,20`; fiação em `e2e/recorrencias.spec.ts:214` — `await expect(page.getByRole("listitem").filter({ hasText: "Internet" })).toHaveCount(0)` em `/2026-05/fixos` | ✅ PASS |
| AC 2 — mês ≤ última competência válida exibe, mesmo encerrada | domínio em `vale-na-competencia.test.ts:26,30,34`; fiação em `e2e/recorrencias.spec.ts:220-221` — `toBeVisible()` + `toContainText("Encerrado")` em `/2026-04/fixos` | ✅ PASS |
| AC 3 — recorrência que começa depois continua aparecendo | `vale-na-competencia.test.ts:45,49` | ✅ PASS |
| AC 4 — mesma regra da materialização | concordância em `vale-na-competencia.test.ts:82,88-89,93-94` | ✅ PASS |
| AC 5 — o selo "Encerrado" permanece | `lista-de-fixos.test.tsx:79`; `e2e/recorrencias.spec.ts:221` | ✅ PASS |

**Contagem**: 54 critérios numerados distintos (AVUL-03 subiu de 7 para 8) mais as 2 linhas de
mapeamento de AVUL-04 = **56 linhas verificadas, 56 ✅ PASS, 0 ❌ GAP, 0 ⚠️ Spec-precision gap**.
Nenhum resíduo de precisão de spec: a frase que a traceability citava agora é o AC 5 de AVUL-03.

---

## Edge Cases

- [x] Meio arquivado entre abrir o formulário e enviar ⇒ recusa sem gravar — `criar-lancamento-avulso/handler.test.ts:175-176`
- [x] Categoria não informada ⇒ grava nula, lista mostra "Sem categoria" — `criar-lancamento-avulso/handler.test.ts:90`; `tabela-lancamentos.test.tsx:380`
- [x] Competência informada ≠ aberta ⇒ grava na informada e revalida as duas — `lancamentos.integration.test.ts:192`
- [x] Valor acima do inteiro seguro ⇒ recusa em `valorCentavos` — `lancamento-avulso.schema.test.ts:88`
- [x] Nenhum cartão cadastrado ⇒ bloco vazio com texto de ausência — `tabela-lancamentos.test.tsx:156`; `bloco-do-lancamento.test.ts:109`; `cadastro.repository.integration.test.ts:179`

---

## Sensor de discriminação

**Método**: `git worktree add --detach <scratch> HEAD` (`35eb9bd`) numa pasta descartável, uma mutação
por vez, `git checkout -- .` entre elas. **Nenhum `git stash`** — proibido no projeto.

**Baseline da árvore real antes do sensor**: ` M next-env.d.ts`.
**Depois de `git worktree remove --force`**: ` M next-env.d.ts` — **idêntico**, e
`git worktree list` voltou a mostrar só a árvore principal.
*(Nota de transparência: a execução posterior de `pnpm verify` na árvore real — o gate, não o sensor —
rodou `next typegen` e regravou `next-env.d.ts` com o conteúdo já versionado, de modo que
`git status --porcelain` ficou vazio ao final. Isso é efeito do gate sobre um arquivo gerado, não do
sensor; nenhum arquivo do código-fonte foi tocado por este verificador.)*

**Linha de base na worktree**: 757 unitários / 61 arquivos, 237 de integração / 14 arquivos,
**41** e2e — todos verdes, iguais à árvore real.

| # | Arquivo | Mutação | Suíte | Morto? |
| --- | --- | --- | --- | --- |
| **AD011a** | `src/domain/parcelamento/ratear-parcelas.ts:33` | **Obrigatório AD-011 (a)** — `const resto = total - base * n` vira `const resto = 0`: o resíduo do rateio é truncado | unit | ✅ Morto — **23** testes / 6 arquivos |
| **AD011b** | `src/domain/shared/competencia.ts:35-37` | **Obrigatório AD-011 (b)** — `addMeses` soma no componente de mês sem virada de ano | unit | ✅ Morto — **25** testes / 9 arquivos |
| **N10** | `src/app/(app)/[competencia]/fixos/page.tsx:103-118` | **O sobrevivente do ciclo 2** — move `<DialogoDeCadastro>` de "Todo mês" para o rodapé da página | e2e | ✅ **Morto** — `e2e/recorrencias.spec.ts:87`, `expect(received).toBeLessThan(expected)` |
| **N17** | idem | **Novo, mira o teste de posição em fixos** — o espelho: a lista sobe para o topo e o cadastro fica no cabeçalho | e2e | ✅ Morto — mesmo teste; a ordem está presa pelos dois lados |
| **N18** | idem (`itens={itens}` → `itens={[]}`) | **Novo, mira o seletor do teste de posição** — âncora contra o caso trivial: sem item na lista, o localizador não resolve | e2e | ✅ Morto — o teste falha em vez de passar no vácuo (por timeout de 60 s, não por assertion) |
| **N19** | `src/infrastructure/db/repositories/movimento.repository.ts:100-105` | **Novo, mira a guarda `cancelado_em IS NULL` de `marcarPagamento`** — o `WHERE` volta a ser só `eq(movimento.id, id)` | integração | ✅ Morto — 1 teste, *"não marca como pago um lançamento já cancelado — AVUL-04"* |
| **N22** | idem | **Novo, mira a mesma guarda pela coluna errada** — `isNull(movimento.canceladoEm)` vira `isNull(movimento.pagoEm)` | integração | ✅ Morto — 1 teste, o mesmo |
| **N20** | `src/application/ports/fakes.ts:214` | **Novo, mira o AC 5 no dublê** — a guarda some (`if (!atual)`) | unit | ✅ Morto — 1 teste, `fakes.test.ts:309` |
| **N21** | idem | **Novo, mira o AC 5 pela direção oposta** — a guarda inverte (`canceladoEm === null`): só o cancelado recebe pagamento | unit | ✅ Morto — **7** testes / 4 arquivos, incluindo `marcar-pagamento/handler.test.ts` e `encerrar/handler.test.ts` |
| **N2** (ex-**M24**) | `src/app/(app)/[competencia]/fixos/page.tsx:66-72` | **Repetição de alto valor** — remove o filtro `valeNaCompetencia` da lista de Todo mês | e2e | ✅ Morto — `e2e/recorrencias.spec.ts:213`, `toHaveCount(expected) failed` |

**Equivalentes conhecidos, não reabertos** (declarados e justificados no relatório do ciclo 2, seção
"Sobre os dois mutantes marcados equivalentes"): **N6c** — blur síncrono no handler de `close` em
`src/components/dialogo-de-cadastro.tsx:64`, desfeito pela restauração de foco do `<dialog>` nativo; e
**N8b** — remover só `max-sm:h-dvh` de `dialogo-de-cadastro.tsx:93`, sem mudança observável na
geometria que o AC 6 define. Os mutantes que de fato mudam esses comportamentos (N6d, N6e, N8, N8c)
morrem, e foram verificados no ciclo 2.

**Profundidade**: P0-full — **10 mutações** (2 obrigatórias do AD-011, o N10 sob desconfiança, 5 novas
mirando o que mudou em `35eb9bd`, 1 repetição de alto valor; N10/N17/N18 contam como três injeções
distintas sobre o mesmo arquivo), acima do mínimo de 5 e dos 3 novos pedidos.
**Resultado**: **10 mortos / 10**, **0 sobreviventes**.

**Observação de profundidade, sem gate**: N22 (guarda na coluna errada) morre por **um** teste, o do
AC 5. O caminho "desmarcar pagamento" (`pagoEm = null` numa linha já paga) quebraria com esse
mutante e não é pego por nenhum teste de integração — só pelo e2e
`e2e/compra-parcelada.spec.ts:474,480`. O mutante morre, então não é lacuna; é a margem mais fina do
conjunto.

---

## Regras invioláveis (`AGENTS.md`)

| Regra | Situação | Evidência |
| --- | --- | --- |
| 1 — nenhum dado financeiro real | ✅ | O percurso novo usa "Conta de água", R$ 180,00, competência 2026-03 |
| 2 — dinheiro inteiro em centavos | ✅ | `35eb9bd` não tocou código de produção; nada monetário novo |
| 3 — competência é `'YYYY-MM'` | ✅ | O teste novo navega para `/2026-03/fixos`; nenhum `Date` novo |
| 4 — `src/domain` é puro | ✅ | `35eb9bd` não tocou `src/domain`; `arquitetura.test.ts` verde |
| 5 — só `movimento` é somável | ✅ | Nenhuma mudança de escrita neste commit |

---

## Code Quality

| Princípio | Situação |
| --- | --- |
| Código mínimo, sem recurso além do pedido | ✅ — `35eb9bd` não tem mudança de produção: 1 teste e2e + 14 linhas de spec |
| Sem abstração para uso único | ✅ — o percurso novo reusa o helper `cadastrarFixo` que já existia |
| Sem "flexibilidade" desnecessária | ✅ |
| Só os arquivos necessários tocados | ✅ — 3 arquivos: `spec.md`, `validation.md`, `e2e/recorrencias.spec.ts` |
| Não "melhorou" código não relacionado | ✅ |
| Segue os padrões existentes | ✅ — mesma forma do teste de AVUL-05 AC 1 em `e2e/lancamento-avulso.spec.ts:361-375` |
| Testes mapeiam para os ACs e não são rasos | ✅ — o teste novo cita `(AVUL-05, AC 8)`, e N18 prova que ele não passa no vácuo |
| Valores afirmados batem com a spec | ✅ — 56/56 |
| Cobertura por camada | ✅ — domínio 1:1 com 100% de branches; rotas e e2e cobrem feliz + borda + erro, agora inclusive a posição nas **duas** áreas |
| Nenhum teste órfão | ✅ — todo teste mapeia para AC, edge case ou Done-when |
| Guidelines documentadas seguidas | ⚠️ `AGENTS.md` seguido; **a renumeração não foi propagada** para as 12 citações fora de `spec.md` (tabela acima) — Minor, sem gate |
| Um engenheiro sênior aprovaria | ✅ — inclusive a autocrítica registrada na mensagem do commit sobre os dois enganos de escopo de seletor |

---

## Gate Check

- **Comando**: `pnpm verify` (gate `build`) + `pnpm test:e2e`
- **`pnpm test:unit`**: **757** passaram / 61 arquivos, 0 falhas, 0 pulados. Cobertura de
  `src/domain`: **100% de branches (166/166)**, statements 292/292, funções 90/90, linhas 271/271
- **`pnpm test:integration`**: **237** passaram / 14 arquivos, 0 falhas
- **`pnpm build`**: ✅ compilou; typecheck e lint verdes (193 arquivos); `pnpm verify` saiu **0**
- **`pnpm test:e2e`**: **41** passaram (1,1 min), 0 falhas
- **Total**: **1.035 provas verdes** (eram 1.034)
- **Delta**: +1 e2e
- **Testes pulados**: nenhum
- **Integridade**: nenhum teste removido, nenhum `skip`, nenhuma assertion enfraquecida. A única
  prova nova é adição

---

## Lacunas, por gravidade

Nenhuma Blocker, Major ou de discriminação.

### 1. Minor (documentação, sem gate) — 12 citações de AC de AVUL-03 na numeração antiga

- **Onde**: tabela na seção "Resíduo", acima — 6 em `tasks.md`, 6 em nomes/comentários de teste.
- **Causa raiz**: a renumeração 7 → 8 ACs foi aplicada em `spec.md` e não propagada; é a mesma
  classe de deriva que a pendência 2 veio eliminar, reintroduzida pela própria correção dela.
- **Impacto**: nenhum defeito de produto, nenhum critério sem prova, nenhum mutante sobrevivente.
  Um leitor que siga "AVUL-03 AC 5" a partir de um teste cai no critério errado.
- **Conserto exato**: as 12 substituições da tabela (AC 5 → 6, AC 6 → 7, AC 7 → 8 nos pontos
  listados). Não tocar em nenhuma citação a AVUL-03 AC 1 a 4, que estão corretas.

---

## Requirement Traceability — atualização

| Requisito | Status anterior | Status novo |
| --- | --- | --- |
| AVUL-01 | Implementing | ✅ Verified |
| AVUL-02 | Implementing | ✅ Verified |
| AVUL-03 | Implementing | ✅ Verified |
| AVUL-04 | Implementing | ✅ Verified |
| AVUL-05 | Implementing | ✅ **Verified** (era Needs Fix) |
| BLOCO-01 | Implementing | ✅ Verified |
| BLOCO-02 | Implementing | ✅ Verified |
| ENTR-01 | Implementing | ✅ Verified |
| ENTR-02 | Implementing | ✅ Verified |
| ENTR-03 | Implementing | ✅ Verified |
| FIXO-07 | Implementing | ✅ Verified |

---

## Resumo

**Geral**: ✅ Pronto — **11 de 11 requisitos verificados**

**Checagem ancorada na spec**: 56 linhas de critério — **56 ✅ PASS**, 0 GAP, 0 ⚠️ Spec-precision gap
**Sensor**: 10 mutações injetadas, **10 mortas**, **0 sobreviventes**, mais 2 equivalentes conhecidos
do ciclo 2 não reabertos
**Gate**: 1.035 provas verdes (757 unitárias + 237 de integração + 41 e2e), 0 falhas, 0 pulados,
100% de branches em `src/domain`; `pnpm verify` sai 0
**Isolamento do sensor**: worktree descartável, `git status --porcelain` da árvore real idêntico
antes e depois (` M next-env.d.ts`); worktree removida e `git worktree prune` executado

**O que este ciclo fechou**: as duas pendências, as duas conferidas por mutação. A posição do
cadastro em "Todo mês" — a única coisa que o ciclo 2 não conseguia falsificar — agora se falsifica
por três mutantes independentes: mover o cadastro para baixo (N10), subir a lista (N17) e esvaziar a
lista (N18). E o comportamento "cancelado não recebe data de pagamento", que existia no código e na
tabela de dimensões mas não em critério numerado, é hoje o AC 5 de AVUL-03, com quatro mutantes
mortos sobre a guarda que o implementa.

**O que sobra**: doze rótulos de AC desatualizados, de conserto mecânico, listados com o `file:line`
e o número certo. Não é prova ausente nem comportamento errado, e por isso não gateia.

**Próximo passo**: aplicar as 12 substituições da tabela de resíduo quando conveniente. A fatia está
verificada.
