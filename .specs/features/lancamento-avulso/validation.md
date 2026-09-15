# Lançamento avulso e entradas — Validação (2ª rodada)

**Data**: 2026-09-15
**Spec**: `.specs/features/lancamento-avulso/spec.md`
**Faixa do diff**: `e73a614~1..HEAD` (`a67544c`) — **descontados** os commits da fatia `home-do-ano`,
integrada em paralelo por outra sessão (`e3735b1`, `5c0ad5c`, `fa0e450`, `6b35358`, `bebc9d2`)
**Commit de correção sob exame**: `a67544c` — *fix: fechar as lacunas que a verificação independente
encontrou*
**Verificador**: sub-agente independente (autor ≠ verificador), re-verificação do ciclo anterior.
Somente leitura sobre o código-fonte; todas as mutações rodaram numa `git worktree` descartável,
**nenhum `git stash`**.

## Validation: lancamento-avulso — FAIL

**Result**: FAIL

Sete das oito lacunas do ciclo anterior foram fechadas, e fechadas **de verdade** — cada uma
reconferida por mutação, não pela palavra de quem corrigiu. O blocker morreu, os três majors
morreram, e os dois mutantes sobreviventes do ciclo passado (M24 e M28) agora morrem. O gate cresceu
de 1.022 para 1.034 provas verdes, sem nenhum teste removido nem enfraquecido.

O FAIL vem de **uma única lacuna, Minor, que foi fechada pela metade**: a correção provou a posição
do controle de cadastro na área **Lançamentos** e não na área **"Todo mês"**. O mutante **N10** —
mover o cadastro de `/[competencia]/fixos` para o rodapé da página — sobreviveu às 40 provas de e2e.
É exatamente a segunda metade da lacuna #5 do relatório anterior, cuja fix task pedia a medição
"**nas duas áreas**".

Nada de comportamento central está em risco. É uma lacuna de prova, de baixo impacto, e de conserto
curto.

---

## Task Completion

As 32 tasks de `tasks.md` (T1..T32) seguem `✅ CONCLUÍDA`, sem nenhuma caixa `- [ ]` pendente. As duas
ressalvas do ciclo anterior foram resolvidas:

| Ressalva anterior | Situação agora |
| --- | --- |
| T30 ⚠️ Parcial — o filtro de FIXO-07 na página não tinha teste (M24 sobrevivia) | ✅ Resolvida — `e2e/recorrencias.spec.ts:213-221` exercita `/2026-05/fixos` e `/2026-04/fixos`; M24 morre |
| Traceability desatualizada (`FIXO-07 \| Design \| Pending` com T30 concluída) | ✅ Resolvida — `spec.md:348` agora diz `Implementing \| Implementing` |

**Observação de processo** (não é gate): as sete correções entraram num commit único
(`a67544c`), sem terem sido registradas como fix tasks em `tasks.md`. O `AGENTS.md` pede uma task por
commit; aqui foram sete consertos num só. Não afeta o veredito.

---

## Cada lacuna do ciclo anterior, uma por uma

### 1. Blocker — FIXO-07 AC 1/2 sem prova de fiação (M24 sobrevivia) — ✅ **FECHADA**

- **Correção**: `e2e/recorrencias.spec.ts:213-221`, dentro do percurso de encerrar (FIXO-06).
- **Evidência**: `e2e/recorrencias.spec.ts:214` —
  `await expect(page.getByRole("listitem").filter({ hasText: "Internet" })).toHaveCount(0)` depois de
  `page.goto("/2026-05/fixos")`; e `:220-221` —
  `await expect(emAbril).toBeVisible()` + `await expect(emAbril).toContainText("Encerrado")` em
  `/2026-04/fixos`.
- **Conferido por mutação, não pela afirmação de quem corrigiu**: reapliquei M24 (remoção do
  `.filter(valeNaCompetencia(...))` de `src/app/(app)/[competencia]/fixos/page.tsx:66-72`) na
  worktree. **Morreu**: `1 failed`, `e2e/recorrencias.spec.ts:184`. Acrescentei também a direção
  oposta (**N11**, sobre-filtragem: o filtro passa a esconder tudo) — **morre** em
  `e2e/recorrencias.spec.ts:109`. Os dois lados da regra estão presos.

### 2. Major — AVUL-01 AC 8, `ERRO_INESPERADO` sem evidência na action nova — ✅ **FECHADA**

- **Correção**: `src/app/actions/lancamentos.integration.test.ts:392-455`, três testes.
- **Evidência**: `:413-416` — `expect(resultado.erro.code).toBe("ERRO_INESPERADO")`,
  `expect(resultado.erro.mensagem).toMatch(/informe o código [0-9a-f]{8}\.$/)`,
  `expect(resultado.erro.mensagem).not.toMatch(/at |\.ts:|node_modules|insert|violates/i)` e
  `expect(await contarMovimentos()).toBe(0)`; `:435-438` — o identificador da mensagem é o mesmo que
  foi ao `console.error` (`expect(String(logado[0])).toContain(correlacao)`); `:452-454` — o mesmo
  para `cancelarLancamento`.
- **Conferido por mutação**: três mutantes sobre `falhaInesperada`
  (`src/app/actions/lancamentos.ts:135-142`) — vazar o erro real na mensagem (**N9a**, morre),
  suprimir o identificador de correlação (**N9b**, morre, 3 testes), e usar um identificador
  diferente no log e na mensagem (**N9c**, morre). Os três lados do AC estão presos.

### 3. Major — AVUL-04, "nem se marca como pago" não implementada — ✅ **FECHADA**

- **Correção de comportamento** (não só de teste): `src/infrastructure/db/repositories/movimento.repository.ts:100-105` —
  `.where(and(eq(movimento.id, id), isNull(movimento.canceladoEm)))`; e o dublê acompanha, em
  `src/application/ports/fakes.ts:212-217` (`if (!atual || atual.canceladoEm !== null) return;`).
- **Evidência**: `src/infrastructure/db/repositories/movimento.repository.integration.test.ts:407` —
  `expect(rows[0]?.pago_em).toBeNull()` depois de cancelar e tentar marcar; a âncora contra o caso
  trivial em `:415` — `expect((await repo.buscarPorId(id))?.pagoEm).toBe("2026-03-15")` para o
  vigente; e o fake em `src/application/ports/fakes.test.ts:326` —
  `expect((await movimentos.buscarPorId(gravado.id))?.pagoEm).toBeNull()`.
- **Conferido por mutação**: remover `isNull(movimento.canceladoEm)` do Drizzle (**N1**) — **morre**
  em `movimento.repository.integration.test.ts`; remover a guarda do fake (**N1b**) — **morre** em
  `fakes.test.ts`. A spec registrou a decisão em `spec.md:60`, com `y`.

### 4. Major — AVUL-05 AC 3 e 4, foco confinado e `Escape` sem cobertura — ✅ **FECHADA**

- **Correção**: `e2e/lancamento-avulso.spec.ts:303-341` (AC 3) e `:344-358` (AC 4).
- **Evidência AC 3**: `:325` — `expect(visitouOFundo).toBe(false)`; `:337` — em laço de 20 `Tab`,
  `expect(noFundo).toBe(false)`; `:341` —
  `await expect(page.getByRole("button", { name: "+ Novo lançamento" })).not.toBeFocused()`.
- **Evidência AC 4**: `:354` — `await expect(page.getByRole("dialog")).toBeHidden()` depois de
  `Escape`; `:357` — `await expect(abrir).toBeFocused()`; `:358` —
  `toHaveAttribute("aria-expanded", "false")`.
- **Conferido por mutação**: `showModal()` → `show()` (**N5**, some o confinamento e a inércia) —
  **morre** no teste do AC 3; `onCancel` com `preventDefault()` (**N6**, `Escape` deixa de fechar) —
  **morre** no teste do AC 4, conferido também isoladamente
  (`playwright test -g "Escape fecha o diálogo"` → `1 failed`, `toBeHidden()` recebeu `"visible"`).
  A **devolução do foco** foi atacada por dois mutantes próprios — blur assíncrono depois do `close`
  (**N6d**) e botão perdendo o foco antes de `showModal()` (**N6e**) — e os dois **morrem** em
  `toBeFocused()`. A metade "devolve o foco" não é decorativa: é falsificável.

### 5. Minor — AVUL-05 AC 1 e AC 7-bis (hoje AC 8) sem assertion de posição — ❌ **FECHADA PELA METADE**

- **AC 1 (área Lançamentos)**: ✅ fechada. `e2e/lancamento-avulso.spec.ts:375` —
  `expect(posicaoDoBotao).toBeLessThan(posicaoDaLista)`, medindo
  `getBoundingClientRect().top + window.scrollY` do botão contra o do `region` "Entradas".
  **Conferido por mutação**: mover o `<DialogoDeCadastro>` para o rodapé de
  `src/app/(app)/[competencia]/lancamentos/page.tsx` (**N7**) — **morre**,
  `expect(received).toBeLessThan(expected)`.
- **AC 8 (área "Todo mês")**: ❌ **continua sem evidência de posição**. A fix task do ciclo anterior
  pedia a medição "nas duas áreas"; só uma foi feita. `src/app/(app)/[competencia]/fixos/page.tsx:103-118`
  põe o diálogo no topo, mas nenhum teste afirma onde ele está: `e2e/recorrencias.spec.ts:49-55`
  apenas **abre** o cadastro pelo botão, o que passaria igual com ele no rodapé, e
  `src/components/form-recorrencia.test.tsx:236` (`expect(screen.queryByRole("heading")).toBeNull()`)
  fala do formulário, não da página.
- **Prova**: mutante **N10** — mover o `<DialogoDeCadastro>` de `fixos/page.tsx` para o rodapé da
  página — **SOBREVIVEU**: `40 passed (52.4s)`, suíte inteira verde.

### 6. Minor — AVUL-05 AC 6, tela cheia abaixo de 640px sem evidência — ✅ **FECHADA**

- **Correção**: `e2e/lancamento-avulso.spec.ts:378-389`.
- **Evidência**: `:384-385` — `expect(caixa?.width).toBe(400)` e
  `expect(caixa?.height).toBeGreaterThanOrEqual(700)` num viewport de 400×720; `:389` —
  `expect(larguraDoDocumento).toBeLessThanOrEqual(400)`.
- **Conferido por mutação**: remover as três classes `max-sm:*` de
  `src/components/dialogo-de-cadastro.tsx:93` (**N8**) — **morre**; e a regressão mais realista,
  baixar o limiar de `sm` (640px) para `[320px]`, de modo que 400px deixe de ser tela cheia
  (**N8c**) — **morre**. Ver a nota sobre o mutante equivalente **N8b** na seção do sensor.

### 7. Minor — drift `schema.ts` ↔ `drizzle/*.sql` sem teste de paridade (M28) — ✅ **FECHADA**

- **Correção**: `src/infrastructure/db/restricoes.integration.test.ts:222-262`, **bidirecional**.
- **Evidência**: `:247-248` — `expect(declaradas.length).toBeGreaterThan(10)` (âncora contra a lista
  vazia) e `expect(declaradas.filter((nome) => !noBanco.has(nome))).toEqual([])`; `:261` — a direção
  que pega a remoção, `expect(noBanco.filter((nome) => !declaradas.has(nome))).toEqual([])`.
- **Conferido por mutação, nas duas direções, como pedido**:
  - remover `check("movimento_valor_positivo", ...)` de `src/infrastructure/db/schema.ts:291` (**N3**,
    o antigo M28) — **morre**, e morre pelo nome, em *"toda restrição CHECK do banco está declarada
    em schema.ts"*;
  - declarar em `schema.ts` um `check(...)` que nenhuma migration criou (**N4**) — **morre** em
    *"toda restrição CHECK declarada em schema.ts existe no banco"*.
  - efeito colateral verificável: o antigo **M31** (apagar o `CHECK` da migration `0002`) agora mata
    **4** testes em vez de 3, porque a paridade também o denuncia.

### 8. Minor — imprecisões da spec — ✅ **FECHADAS** (com um resíduo anotado)

| Item anterior | Situação |
| --- | --- |
| AC numerado "7" duas vezes em AVUL-05 | ✅ `spec.md:262` agora é `8.` |
| Traceability `FIXO-07 \| Design \| Pending` | ✅ `spec.md:348` → `Implementing \| Implementing` |
| BLOCO-01 e BLOCO-02 mapeando para a mesma história sem dizer quais ACs | ✅ `spec.md:343-344` — ACs 1 a 4 e 7 / ACs 5 e 6 |
| AVUL-03 e AVUL-04 idem | ✅ `spec.md:341-342` — ACs 1, 2, 5, 6 e 7 / ACs 3 e 4 |

**Resíduo (Minor, sem gate)**: a traceability descreve AVUL-04 como *"ACs 3 e 4 (integridade de
transição: nem recancela, **nem marca pago**)"*, mas nem o AC 3 nem o AC 4 de AVUL-03 (`spec.md:200-203`)
falam em marcar pago. Esse comportamento — agora implementado e provado — continua existindo só na
tabela de dimensões implícitas (`spec.md:91`) e na linha de decisão nova (`spec.md:60`), sem um
acceptance criterion numerado que o enuncie. A rastreabilidade aponta para ACs que não contêm a
frase que ela cita.

---

## Critérios de aceitação ancorados na spec

Os ACs sem mudança neste ciclo mantêm a evidência já verificada na primeira rodada; abaixo estão
repetidos em forma condensada, com a evidência integral nos que mudaram.

### AVUL-01 — Registrar um gasto avulso

| Critério | Resultado definido na spec | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| AC 1 — 1 `movimento` `origem='AVULSO'`, sem os três vínculos | uma linha, três nulos | `src/infrastructure/db/repositories/movimento.repository.integration.test.ts:211-214` — `expect(gravado.origem).toBe("AVULSO")`, `compraId`/`numeroParcela`/`recorrenciaId` `toBeNull()` | ✅ PASS |
| AC 2 — descrição vazia ou > 120 recusa em `descricao`, sem gravar | erro no campo; zero linhas | `src/application/schemas/lancamento-avulso.schema.test.ts:53,60-65`; `src/app/actions/lancamentos.integration.test.ts:210-211` | ✅ PASS |
| AC 3 — valor não inteiro > 0 recusa em `valorCentavos` | erro no campo; zero linhas | `lancamento-avulso.schema.test.ts:70,74,78,88`; `lancamentos.integration.test.ts:220-221` | ✅ PASS |
| AC 4 — competência fora de `AAAA-MM` | erro em `competencia` | `lancamento-avulso.schema.test.ts:96,100`; `lancamentos.integration.test.ts:230-231` | ✅ PASS |
| AC 5 — data fora de `AAAA-MM-DD` | erro em `dataEvento` | `lancamento-avulso.schema.test.ts:104,108`; `lancamentos.integration.test.ts:240-241` | ✅ PASS |
| AC 6 — revalida `/[competencia]` e `/[competencia]/lancamentos` | as duas, exatamente | `lancamentos.integration.test.ts:186` — `expect(revalidatePath.mock.calls.flat()).toEqual(["/2026-03","/2026-03/lancamentos"])` | ✅ PASS |
| AC 7 — sem sessão recusa antes do banco | código de sessão | `lancamentos.integration.test.ts:125,137-138` | ✅ PASS |
| **AC 8 — falha imprevista devolve `ERRO_INESPERADO` com identificador, sem stack trace** | `code`, id na mensagem, sem stack | `lancamentos.integration.test.ts:413` — `expect(resultado.erro.code).toBe("ERRO_INESPERADO")`; `:414` — `toMatch(/informe o código [0-9a-f]{8}\.$/)`; `:415` — `not.toMatch(/at \|\.ts:\|node_modules\|insert\|violates/i)`; `:438` — `expect(String(logado[0])).toContain(correlacao)`; `:452-454` para `cancelarLancamento` | ✅ **PASS (era GAP)** |

### AVUL-02 — Registrar dinheiro que entra

| Critério | `file:line` + assertion | Resultado |
| --- | --- | --- |
| AC 1 — `RECEITA` soma em Receitas, nunca em Despesas | `lancamentos.integration.test.ts:169,177-178`; `e2e/lancamento-avulso.spec.ts:202,204` | ✅ PASS |
| AC 2 — o formulário oferece só despesa e receita | `lancamento-avulso.schema.test.ts:113-124`; `src/components/form-lancamento-avulso.test.tsx:68` | ✅ PASS |
| AC 3 — receita em "Entradas" e em nenhum bloco de despesa | `e2e/lancamento-avulso.spec.ts:196,198`; `src/components/tabela-lancamentos.test.tsx:173-181` | ✅ PASS |
| AC 4 — meio sem fatura ⇒ já pago, `pagoEm = dataEvento` | `src/application/mes/criar-lancamento-avulso/handler.test.ts:104,143`; `lancamentos.integration.test.ts:178` | ✅ PASS |
| AC 5 — meio com fatura ⇒ não pago | `criar-lancamento-avulso/handler.test.ts:147`; `form-lancamento-avulso.test.tsx:106` | ✅ PASS |
| AC 6 — a pessoa altera o padrão | `criar-lancamento-avulso/handler.test.ts:136-137`; `form-lancamento-avulso.test.tsx:126,130` | ✅ PASS |

### BLOCO-01 / BLOCO-02 — Ler no bloco do cartão tudo que vai na fatura

A imprecisão de mapeamento foi resolvida: `spec.md:343-344` agora atribui os ACs 1 a 4 e 7 ao
BLOCO-01 e os ACs 5 e 6 ao BLOCO-02, exatamente a convenção que os testes já seguiam.

| Critério | `file:line` + assertion | Resultado |
| --- | --- | --- |
| AC 1 — cada despesa em exatamente um bloco, por uma única função | `src/domain/mes/bloco-do-lancamento.ts:29-40` é a única implementação; exaustividade em `src/domain/mes/resumo-mensal.test.ts:239` — `expect(fixos + cartao + avulsos).toBe(totalGastos)` | ✅ PASS |
| AC 2 — `RECORRENCIA` ⇒ Fixos, mesmo em cartão | `src/domain/mes/bloco-do-lancamento.test.ts:45`; `resumo-mensal.test.ts:214-215` | ✅ PASS |
| AC 3 — não recorrente + cartão ⇒ Cartão | `bloco-do-lancamento.test.ts:65,74`; `resumo-mensal.test.ts:184-185`; `e2e/lancamento-avulso.spec.ts:127,129` | ✅ PASS |
| AC 4 — não recorrente + meio sem fatura ⇒ Gastos do Mês | `bloco-do-lancamento.test.ts:94`; `resumo-mensal.test.ts:195-196`; `e2e/lancamento-avulso.spec.ts:140-141` | ✅ PASS |
| AC 5 — indicador e bloco pela mesma classificação | `src/application/mes/obter-visao-mensal/handler.test.ts:252-254` — `expect(visao.competenciaView.cartao).toBe(somaDoBloco("CARTAO"))`, com âncora em `:256` | ✅ PASS |
| AC 6 — cartão arquivado continua cartão | `src/infrastructure/db/repositories/cadastro.repository.integration.test.ts:143`; `bloco-do-lancamento.test.ts:83` | ✅ PASS |
| AC 7 — coluna "Parcela" só no bloco Cartão | `tabela-lancamentos.test.tsx:341,363` | ✅ PASS |
| BLOCO-02 — `resumoMensal` segmenta pelos blocos | `resumo-mensal.test.ts:236-239` | ✅ PASS |

### AVUL-03 — Excluir um lançamento avulso

| Critério | `file:line` + assertion | Resultado |
| --- | --- | --- |
| AC 1 — preenche `cancelado_em`, mantém a linha | `movimento.repository.integration.test.ts:347,353-354`; `src/application/mes/cancelar-lancamento/handler.test.ts:71` | ✅ PASS |
| AC 2 — cancelado sai de toda soma e lista | `movimento.repository.integration.test.ts:143`; `lancamentos.integration.test.ts:322,324`; `e2e/lancamento-avulso.spec.ts:262` | ✅ PASS |
| AC 3 — origem ≠ AVULSO recusa com `LANCAMENTO_NAO_CANCELAVEL` | `src/domain/mes/cancelamento-permitido.test.ts:47,59`; concordância função × `WHERE` em `movimento.repository.integration.test.ts:417`; `lancamentos.integration.test.ts:368` | ✅ PASS |
| AC 4 — já cancelado devolve sucesso sem alterar | `cancelar-lancamento/handler.test.ts:133,137-138`; `lancamentos.integration.test.ts:351,355` | ✅ PASS |
| AC 5 — excluir só nas linhas avulsas | `tabela-lancamentos.test.tsx:421,446,462,478`; `e2e/lancamento-avulso.spec.ts:290` | ✅ PASS |
| AC 6 — dois toques | `src/components/botao-excluir.test.tsx:39-40,49-50`; `e2e/lancamento-avulso.spec.ts:273-274` | ✅ PASS |
| AC 7 — revalida as duas rotas | `lancamentos.integration.test.ts:325,339` | ✅ PASS |

### AVUL-04 — Integridade de transição de estado

| Metade do requisito | `file:line` + assertion | Resultado |
| --- | --- | --- |
| "não se cancela de novo" | `cancelar-lancamento/handler.test.ts:137-138`; `movimento.repository.integration.test.ts:378-389` | ✅ PASS |
| **"nem se marca como pago"** | **implementado** em `src/infrastructure/db/repositories/movimento.repository.ts:100-105` (`and(eq(movimento.id, id), isNull(movimento.canceladoEm))`) e em `src/application/ports/fakes.ts:212-217`. Provas: `movimento.repository.integration.test.ts:407` — `expect(rows[0]?.pago_em).toBeNull()`; âncora em `:415` — `expect((await repo.buscarPorId(id))?.pagoEm).toBe("2026-03-15")`; fake em `src/application/ports/fakes.test.ts:326` | ✅ **PASS (era GAP)** |

### ENTR-01 / ENTR-02 — Achar onde mora o dinheiro que entra

| Critério | `file:line` + assertion | Resultado |
| --- | --- | --- |
| AC 1 — a área se chama "Todo mês" | `src/components/navegacao-principal.test.tsx:16-23,30`; `src/app/(app)/[competencia]/fixos/page.tsx:100`; `e2e/recorrencias.spec.ts:132` | ✅ PASS |
| AC 2 — "Entradas" sempre, mesmo vazio | `tabela-lancamentos.test.tsx:186-198`; `e2e/lancamento-avulso.spec.ts:235-236` | ✅ PASS |
| AC 3 — "Entradas" antes dos blocos de despesa | `tabela-lancamentos.test.tsx:120`; `e2e/lancamento-avulso.spec.ts:239` | ✅ PASS |
| AC 4 — vazio mostra texto, não tabela | `tabela-lancamentos.test.tsx:198-199` | ✅ PASS |
| AC 5 — o bloco de despesa recorrente continua "Fixos" | `tabela-lancamentos.test.tsx:103` | ✅ PASS |

### ENTR-03 — O formulário fala a língua da receita

| Critério | `file:line` + assertion | Resultado |
| --- | --- | --- |
| AC 1 — rótulo do meio vira destino | `form-lancamento-avulso.test.tsx:292-293`; `src/components/form-recorrencia.test.tsx:248-249`; `e2e/lancamento-avulso.spec.ts:215-216` | ✅ PASS |
| AC 2 — só meios sem fatura | `form-lancamento-avulso.test.tsx:303-304`; `e2e/lancamento-avulso.spec.ts:217` | ✅ PASS |
| AC 3 — título e botão falam de entrada | `form-recorrencia.test.tsx:229-230` | ✅ PASS |
| AC 4 — o dia vira "Dia que costuma cair" | `form-recorrencia.test.tsx:272` | ✅ PASS |
| AC 5 — meio com fatura troca para o primeiro sem fatura | `form-lancamento-avulso.test.tsx:315,338-339`; `form-recorrencia.test.tsx:283` | ✅ PASS |
| AC 6 — em despesa tudo volta como era | `form-lancamento-avulso.test.tsx:349-350`; `form-recorrencia.test.tsx:293-296` | ✅ PASS |

### AVUL-05 — Cadastrar sem rolar a página

A numeração duplicada foi corrigida: o antigo segundo "7" é hoje o **AC 8** (`spec.md:262`).

| Critério | Resultado definido na spec | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| **AC 1 — controle de abrir no topo da área, antes da lista** | posição: antes da lista | `e2e/lancamento-avulso.spec.ts:375` — `expect(posicaoDoBotao).toBeLessThan(posicaoDaLista)`, comparando `getBoundingClientRect().top + window.scrollY` do botão com o do `region` "Entradas" | ✅ **PASS (era GAP)** |
| AC 2 — diálogo modal, sem navegar | `<dialog>` aberto, mesma rota | `src/components/dialogo-de-cadastro.test.tsx:55,62-67` | ✅ PASS |
| **AC 3 — confina o foco e torna o resto inerte** | foco preso; fora inerte | `e2e/lancamento-avulso.spec.ts:325` — `expect(visitouOFundo).toBe(false)`; `:337` — 20 `Tab`, `expect(noFundo).toBe(false)`; `:341` — `not.toBeFocused()` no botão de fundo | ✅ **PASS (era GAP)** |
| **AC 4 — `Escape` fecha e devolve o foco** | fechado **e** foco de volta | `e2e/lancamento-avulso.spec.ts:354` — `await expect(page.getByRole("dialog")).toBeHidden()`; `:357` — `await expect(abrir).toBeFocused()`; `:358` — `aria-expanded="false"` | ✅ **PASS (era Parcial)** |
| AC 5 — gravar mantém aberto, confirmação visível | `open === true` + confirmação | `dialogo-de-cadastro.test.tsx:125-126`; `form-lancamento-avulso.test.tsx:166` | ✅ PASS |
| **AC 6 — abaixo de 640px o diálogo ocupa a tela** | tela cheia | `e2e/lancamento-avulso.spec.ts:384-385` — `expect(caixa?.width).toBe(400)` e `expect(caixa?.height).toBeGreaterThanOrEqual(700)` num viewport 400×720; `:389` — sem rolagem horizontal | ✅ **PASS (era GAP)** |
| AC 7 — preserva o digitado na aba não visível | valor mantido | `src/components/seletor-de-formulario.test.tsx:87-98`; `dialogo-de-cadastro.test.tsx:139` | ✅ PASS |
| **AC 8 — "Todo mês" abre pelo topo, no mesmo diálogo, sem formulário no rodapé** | mesmo componente **e** posição no topo | "mesmo diálogo" ✅ — `src/app/(app)/[competencia]/fixos/page.tsx:103-118` usa `DialogoDeCadastro`, e `e2e/recorrencias.spec.ts:49-55` abre o cadastro por ele. **"No topo" / "não deixar formulário no rodapé": nenhuma evidência posicional.** Mutante **N10** (mover o diálogo para o rodapé de `fixos/page.tsx`) sobreviveu às 40 provas | ❌ **GAP** |

### FIXO-07 — A lista de Todo mês mostra só o que vale no mês aberto

| Critério | `file:line` + assertion | Resultado |
| --- | --- | --- |
| **AC 1 — mês posterior à última competência válida omite a recorrência** | domínio em `src/domain/recorrencia/vale-na-competencia.test.ts:16,20`; **fiação** em `e2e/recorrencias.spec.ts:214` — `await expect(page.getByRole("listitem").filter({ hasText: "Internet" })).toHaveCount(0)` em `/2026-05/fixos` | ✅ **PASS (era Parcial)** |
| **AC 2 — mês ≤ última competência válida exibe, mesmo encerrada** | domínio em `vale-na-competencia.test.ts:26,30,34`; **fiação** em `e2e/recorrencias.spec.ts:220-221` — `toBeVisible()` + `toContainText("Encerrado")` em `/2026-04/fixos` | ✅ **PASS (era Parcial)** |
| AC 3 — recorrência que começa depois continua aparecendo | `vale-na-competencia.test.ts:45,49` | ✅ PASS |
| AC 4 — mesma regra da materialização | concordância em `vale-na-competencia.test.ts:82,88-89,93-94` | ✅ PASS |
| AC 5 — o selo "Encerrado" permanece | `src/components/lista-de-fixos.test.tsx:79`; `e2e/recorrencias.spec.ts:221` | ✅ PASS |

**Contagem**: 55 linhas de critério verificadas — **54 ✅ PASS**, **1 ❌ GAP** (AVUL-05 AC 8, metade
posicional). Nenhuma ⚠️ Spec-precision gap restante além do resíduo anotado na lacuna #8.

---

## Edge Cases

- [x] Meio arquivado entre abrir o formulário e enviar ⇒ recusa sem gravar — `src/application/mes/criar-lancamento-avulso/handler.test.ts:175-176`
- [x] Categoria não informada ⇒ grava nula, lista mostra "Sem categoria" — `criar-lancamento-avulso/handler.test.ts:90`; `tabela-lancamentos.test.tsx:380`
- [x] Competência informada ≠ aberta ⇒ grava na informada e revalida as duas — `lancamentos.integration.test.ts:192`
- [x] Valor acima do inteiro seguro ⇒ recusa em `valorCentavos` — `lancamento-avulso.schema.test.ts:88`
- [x] Nenhum cartão cadastrado ⇒ bloco vazio com texto de ausência — `tabela-lancamentos.test.tsx:156`; `bloco-do-lancamento.test.ts:109`; `cadastro.repository.integration.test.ts:179`

---

## Sensor de discriminação

**Método**: `git worktree add` numa pasta temporária a partir de `HEAD` (`a67544c`), uma mutação por
vez, `git checkout -- .` entre elas. **Nenhum `git stash`** — proibido no projeto.
**Baseline da árvore real antes do sensor**: ` M next-env.d.ts`. **Depois de `git worktree remove
--force`**: ` M next-env.d.ts` — **idêntico**.

**Linha de base na worktree**: 757 unitários / 61 arquivos, 237 de integração / 14 arquivos,
40 e2e — todos verdes, iguais à árvore real.

### Repetição dos mutantes de alto valor do ciclo anterior

| # | Arquivo | Mutação | Morto? |
| --- | --- | --- | --- |
| R1 (ex-M1) | `src/domain/mes/bloco-do-lancamento.ts:33-38` | Inverte os dois primeiros ramos da cascata | ✅ Morto — 7 testes / 4 arquivos |
| R4 (ex-M2) | `src/domain/mes/bloco-do-lancamento.ts:36-38` | Remove o ramo do cartão | ✅ Morto — 11 testes / 4 arquivos |
| R5 (ex-M6) | `src/domain/recorrencia/vale-na-competencia.ts:27` | `<= 0` vira `< 0` | ✅ Morto — 3 testes |
| R2 (ex-M9) | `src/domain/parcelamento/ratear-parcelas.ts:36` | **AD-011 (a)** — trunca o resíduo do rateio | ✅ Morto — 23 testes / 6 arquivos |
| R3 (ex-M10) | `src/domain/shared/competencia.ts:35-37` | **AD-011 (b)** — `addMeses` sem virada de ano | ✅ Morto — 25 testes / 9 arquivos |
| R6 (ex-M5) | `src/infrastructure/db/repositories/movimento.repository.ts:82` | Tira `eq(origem,"AVULSO")` do `WHERE` de `cancelar` | ✅ Morto — 3 testes |
| R7 (ex-M13) | idem | Tira `isNull(canceladoEm)` do `WHERE` de `cancelar` | ✅ Morto — 2 testes / 2 arquivos |
| R8 (ex-M31) | `drizzle/0002_movimento_valor_positivo.sql` | Remove o `CHECK` de positividade do razão | ✅ Morto — **4** testes / 2 arquivos (eram 3: a paridade nova também o pega) |

### Mutantes novos, mirando o que mudou em `a67544c`

| # | Arquivo | Mutação | Morto? |
| --- | --- | --- | --- |
| **N2** (ex-**M24**) | `src/app/(app)/[competencia]/fixos/page.tsx:66-72` | **Remove o filtro `valeNaCompetencia` da lista de Todo mês** | ✅ **Morto** — `e2e/recorrencias.spec.ts:184` (era o sobrevivente do ciclo anterior) |
| N11 | idem | Sobre-filtragem: o filtro esconde tudo | ✅ Morto — `e2e/recorrencias.spec.ts:109` |
| **N1** | `src/infrastructure/db/repositories/movimento.repository.ts:100-105` | **`marcarPagamento` sem o `cancelado_em IS NULL`** | ✅ Morto — 1 teste de integração |
| N1b | `src/application/ports/fakes.ts:214` | O fake perde a mesma guarda | ✅ Morto — 1 teste unitário |
| **N3** (ex-**M28**) | `src/infrastructure/db/schema.ts:291` | **`CHECK` declarado some do schema, e não da migration** (direção banco → schema) | ✅ **Morto** — `restricoes.integration.test.ts:257` (era o 2º sobrevivente) |
| **N4** | `src/infrastructure/db/schema.ts:291` | **`CHECK` declarado que nenhuma migration criou** (direção schema → banco) | ✅ Morto — `restricoes.integration.test.ts:243` |
| N5 | `src/components/dialogo-de-cadastro.tsx:46` | `showModal()` vira `show()`: some o confinamento de foco e a inércia | ✅ Morto — AVUL-05 AC 3 |
| **N6** | `src/components/dialogo-de-cadastro.tsx:84` | **`onCancel` com `preventDefault()`: `Escape` deixa de fechar** | ✅ Morto — AVUL-05 AC 4 (`toBeHidden()` recebeu `"visible"`) |
| N6d | `src/components/dialogo-de-cadastro.tsx:64` | Blur assíncrono depois do `close`: o foco **não** volta ao botão | ✅ Morto — AVUL-05 AC 4 (`toBeFocused()`) |
| N6e | `src/components/dialogo-de-cadastro.tsx:45-48` | O botão perde o foco antes de `showModal()`: o diálogo fica sem origem para devolver | ✅ Morto — AVUL-05 AC 4 (`toBeFocused()`) |
| **N7** | `src/app/(app)/[competencia]/lancamentos/page.tsx:124-165` | **Move o controle de cadastrar para o rodapé da página** | ✅ Morto — AVUL-05 AC 1 (`toBeLessThan`) |
| N8 | `src/components/dialogo-de-cadastro.tsx:93` | Remove as três classes `max-sm:*` de tela cheia | ✅ Morto — AVUL-05 AC 6 |
| N8c | idem | Baixa o limiar de 640px para 320px: 400px deixa de ser tela cheia | ✅ Morto — AVUL-05 AC 6 |
| N9a | `src/app/actions/lancamentos.ts:141` | A mensagem do envelope passa a carregar o erro real | ✅ Morto — AVUL-01 AC 8 |
| N9b | idem | A mensagem perde o identificador de correlação | ✅ Morto — 3 testes |
| N9c | `src/app/actions/lancamentos.ts:138` | O log usa um identificador **diferente** do que foi para a tela | ✅ Morto — 1 teste |
| **N10** | `src/app/(app)/[competencia]/fixos/page.tsx:103-118` | **Move o cadastro de "Todo mês" para o rodapé da página** | ❌ **SOBREVIVEU** — `40 passed`, suíte e2e inteira verde |
| N6c | `src/components/dialogo-de-cadastro.tsx:64` | Blur **síncrono** no handler de `close` | ⚪ Sobreviveu, **equivalente** |
| N8b | `src/components/dialogo-de-cadastro.tsx:93` | Remove só `max-sm:h-dvh`, mantendo `max-sm:max-h-none` | ⚪ Sobreviveu, **equivalente** |

**Sobre os dois mutantes marcados equivalentes** — declarados aqui em vez de escondidos:

- **N6c**: o blur síncrono roda **antes** da restauração de foco do `<dialog>` nativo (o evento
  `close` é enfileirado como tarefa depois dos passos de fechamento), então o efeito é desfeito pelo
  próprio navegador. Não é fraqueza do teste: os dois mutantes que **de fato** impedem a devolução do
  foco (N6d e N6e) morrem no mesmo `expect(abrir).toBeFocused()`.
- **N8b**: a 400×720 a declaração que efetivamente produz a tela cheia é `max-sm:max-h-none` (sem
  ela, o `max-height` padrão do `<dialog>` corta a caixa); a altura vem do conteúdo, que é mais alto
  que a janela. Com N8b a geometria observável não muda — largura 400, altura ≥ 700, `scrollWidth`
  ≤ 400, os três valores que o AC 6 define. Mutação sem mudança observável não é lacuna; as duas
  mutações que mudam a geometria (N8, N8c) morrem.

**Profundidade**: P0-full — **27 mutações** (8 repetidas + 19 novas), bem acima do mínimo de 5 e
acima dos 5 novos pedidos.
**Resultado**: **24 mortos / 27**, 3 sobreviventes, dos quais **2 equivalentes** e **1 lacuna real**
(**N10**).

---

## Varredura por regressão — "marcar pago" (fatia MOV-06)

A correção de AVUL-04 tocou `marcarPagamento`, consumido pela funcionalidade "marcar pago" de outra
fatia. Verificado:

| Verificação | Situação |
| --- | --- |
| Superfície alterada | Só o `WHERE` do `UPDATE` (`movimento.repository.ts:100-105`) e a guarda do dublê (`fakes.ts:212-217`). `src/application/mes/marcar-pagamento/handler.ts` e `src/app/actions/pagamentos.ts:34-74` ficaram intactos |
| Marcar um lançamento vigente continua funcionando | `movimento.repository.integration.test.ts:415` — `expect((await repo.buscarPorId(id))?.pagoEm).toBe("2026-03-15")`; e o teste pré-existente `:181` — `expect(lancamento?.pagoEm).toBe("2026-03-18")` |
| **Desmarcar** (`pagoEm = null`) continua funcionando | A linha vigente tem `cancelado_em IS NULL`, então o novo predicado não a exclui. Provado ponta a ponta em `e2e/compra-parcelada.spec.ts:474,480` — o indicador "Ainda não pago" cai 30000 e **volta** ao valor anterior ao desmarcar |
| Chamadores indiretos (materialização, encerrar, registrar versão) | `movimento.recorrencia.integration.test.ts:177,339`, `src/application/recorrencias/encerrar/handler.test.ts:73`, `registrar-versao/handler.test.ts:88` — todos verdes; nenhum opera sobre linha cancelada |
| Caminho de UI para uma linha cancelada | Inexistente: linha cancelada não é renderizada em nenhum bloco (`movimento.repository.integration.test.ts:143`), e `BotaoPago` (`src/components/botao-pago.tsx:53-59`) só existe dentro de uma linha renderizada. No cenário de duas abas, o `UPDATE` não encontra alvo, o caso de uso relê a linha e devolve `pagoEm` inalterado; o estado otimista é reconciliado pela revalidação |
| Suítes da outra fatia | `pnpm test:unit`, `pnpm test:integration` e `pnpm test:e2e` verdes, incluindo `e2e/compra-parcelada.spec.ts:453` ("marcar pago move o indicador do painel, não só o selo") |

**Conclusão**: nenhuma regressão. A mudança estreita o `WHERE` num conjunto de linhas que a interface
nunca alcança.

---

## Regras invioláveis (`AGENTS.md`)

| Regra | Situação | Evidência |
| --- | --- | --- |
| 1 — nenhum dado financeiro real | ✅ | Os testes novos usam "Café", "Internet", "Almoço", ids genéricos e o UUID sintético `99999999-…` |
| 2 — dinheiro inteiro em centavos | ✅ | Nada monetário novo; o `CHECK` de positividade agora tem paridade provada entre `schema.ts` e o SQL |
| 3 — competência é `'YYYY-MM'` | ✅ | O filtro de `fixos/page.tsx` usa `valeNaCompetencia`, aritmética inteira; nenhum `Date` novo |
| 4 — `src/domain` é puro | ✅ | `a67544c` não tocou `src/domain`; `src/domain/shared/arquitetura.test.ts` segue verde |
| 5 — só `movimento` é somável | ✅ | `marcarPagamento` continua tocando só `movimento` |

---

## Code Quality

| Princípio | Situação |
| --- | --- |
| Código mínimo, sem recurso além do pedido | ✅ — a única mudança de produção é um predicado a mais no `WHERE` |
| Sem abstração para uso único | ✅ |
| Sem "flexibilidade" desnecessária | ✅ |
| Só os arquivos necessários tocados | ✅ — 11 arquivos, todos ligados às sete lacunas |
| Não "melhorou" código não relacionado | ✅ |
| Segue os padrões existentes | ✅ — `and(eq(...), isNull(...))` é o mesmo padrão de `cancelar` |
| Testes mapeiam para os ACs e não são rasos | ✅ — cada `describe`/`test` novo cita requisito e AC; a paridade e o foco têm âncora contra o caso trivial |
| Valores afirmados batem com a spec | ✅ — 54/55; o resíduo é a metade posicional do AC 8 |
| Cobertura por camada | ⚠️ — domínio 1:1 com 100% de branches; rotas e e2e cobrem feliz + borda + erro; falta só a medição posicional em `/[competencia]/fixos` |
| Nenhum teste órfão | ✅ |
| Guidelines documentadas seguidas | ✅ `AGENTS.md`; traceability atualizada no mesmo commit |
| Um engenheiro sênior aprovaria | ✅ — inclusive a autocrítica registrada na mensagem do commit sobre a 1ª versão frágil do teste de foco e sobre a 1ª versão unidirecional da paridade |

---

## Gate Check

- **Comando**: `pnpm verify` (gate `build`) + `pnpm test:e2e`
- **`pnpm test:unit`**: **757** passaram / 61 arquivos, 0 falhas, 0 pulados. Cobertura de
  `src/domain`: **100% de branches (166/166)**, statements 292/292, funções 90/90, linhas 271/271
- **`pnpm test:integration`**: **237** passaram / 14 arquivos, 0 falhas
- **`pnpm build`**: ✅ compilou; typecheck e lint verdes; `pnpm verify` saiu **0**
- **`pnpm test:e2e`**: **40** passaram (55,7 s), 0 falhas
- **Total**: **1.034 provas verdes** (eram 1.022)
- **Delta**: +1 unitária, +7 de integração, +4 e2e = **+12**
- **Testes pulados**: nenhum
- **Integridade**: nenhum teste removido, nenhum `skip`, nenhuma assertion enfraquecida. Todas as 12
  provas novas são adições

---

## Lacunas, por gravidade

### 1. Minor — AVUL-05 AC 8: a posição do cadastro em "Todo mês" continua sem prova

- **Onde**: `src/app/(app)/[competencia]/fixos/page.tsx:103-118`
- **Causa raiz**: a fix task do ciclo anterior pedia a medição de posição **nas duas áreas**; o
  percurso novo (`e2e/lancamento-avulso.spec.ts:361-375`) cobriu só `/[competencia]/lancamentos`.
  Em `/[competencia]/fixos`, `e2e/recorrencias.spec.ts:49-55` apenas abre o cadastro pelo botão, o
  que passaria igual com ele no rodapé.
- **Prova**: mutante **N10** moveu o `<DialogoDeCadastro>` para o rodapé de `fixos/page.tsx` e as
  **40 provas de e2e continuaram verdes**.
- **Impacto**: nenhum defeito hoje — o código está correto. É a regressão que esta fatia veio
  corrigir podendo voltar sem nada ficar vermelho.
- **Fix task**: em `e2e/recorrencias.spec.ts`, um percurso que compare
  `getBoundingClientRect().top + window.scrollY` do botão "+ Novo fixo" com o do primeiro item da
  lista de Todo mês (`getByRole("listitem").first()`), na mesma forma do teste de AVUL-05 AC 1.
  **Verificar**: reaplicar N10 e confirmar que agora morre.

### 2. Minor (spec, sem código) — a traceability de AVUL-04 cita uma frase que os ACs não contêm

- **Onde**: `spec.md:342` diz *"ACs 3 e 4 (integridade de transição: nem recancela, nem marca pago)"*,
  mas `spec.md:200-203` (AVUL-03 AC 3 e AC 4) não menciona marcar pago.
- **Fix task**: acrescentar um AC numerado à história "Excluir um lançamento avulso" —
  *"IF o lançamento estiver cancelado THEN o sistema SHALL não registrar data de pagamento nele"* — e
  apontar AVUL-04 para ele. O comportamento já existe e já está provado; falta o critério que o
  enuncia.

---

## Requirement Traceability — proposta de atualização

| Requisito | Status atual em `spec.md` | Status proposto |
| --- | --- | --- |
| AVUL-01 | Implementing | ✅ Verified |
| AVUL-02 | Implementing | ✅ Verified |
| AVUL-03 | Implementing | ✅ Verified |
| AVUL-04 | Implementing | ✅ Verified |
| AVUL-05 | Implementing | ❌ Needs Fix — AC 8 sem evidência posicional (N10 sobreviveu) |
| BLOCO-01 | Implementing | ✅ Verified |
| BLOCO-02 | Implementing | ✅ Verified |
| ENTR-01 | Implementing | ✅ Verified |
| ENTR-02 | Implementing | ✅ Verified |
| ENTR-03 | Implementing | ✅ Verified |
| FIXO-07 | Implementing | ✅ Verified |

---

## Resumo

**Geral**: ⚠️ Quase pronto — **10 de 11 requisitos verificados**, 1 com lacuna Minor

**Checagem ancorada na spec**: 55 linhas de critério — **54 ✅ PASS**, **1 ❌ GAP**
**Sensor**: 27 mutações injetadas, **24 mortas**, 3 sobreviventes — 2 equivalentes (declaradas e
justificadas) e **1 lacuna real**
**Gate**: 1.034 provas verdes (757 unitárias + 237 de integração + 40 e2e), 0 falhas, 0 pulados,
100% de branches em `src/domain`; `pnpm verify` sai 0
**Isolamento do sensor**: worktree descartável, `git status --porcelain` da árvore real idêntico
antes e depois (` M next-env.d.ts`)

**O que a correção fechou, e fechou bem**: as duas coisas que o ciclo anterior não conseguia
falsificar agora se falsificam. O filtro de FIXO-07 na página — a única regra nova da fatia que podia
ser apagada com a suíte inteira verde — está preso pelos dois lados: remover o filtro mata o e2e,
sobre-filtrar também. A paridade `schema.ts` ↔ SQL foi escrita **bidirecional** depois de a primeira
versão unidirecional ter deixado o mutante vivo; as duas direções foram testadas separadamente aqui,
e cada uma mata a sua. A metade de AVUL-04 que era só uma frase na spec virou código, no Drizzle e no
dublê, com teste dos dois lados e âncora contra o caso trivial. E a devolução do foco no `Escape`,
que seria fácil escrever de forma vacuamente verdadeira, resiste a dois mutantes desenhados
justamente para isso.

**O que falta**: uma medição de posição, numa página, num arquivo de e2e. A fix task anterior dizia
"nas duas áreas" e foi cumprida numa. Nenhum defeito de produto decorre disso hoje.

**Próximo passo**: rotear a lacuna #1 como fix task, reexecutar o sensor sobre N10 e revalidar. A
lacuna #2 é edição de spec e pode ir junto.
