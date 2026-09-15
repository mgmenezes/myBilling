# Lançamento avulso e entradas — Validação

**Data**: 2026-09-15
**Spec**: `.specs/features/lancamento-avulso/spec.md`
**Faixa do diff**: `e73a614~1..HEAD` (`1333446`), 41 commits — **descontados** os commits da fatia
`home-do-ano`, integrada em paralelo (`e3735b1`, `5c0ad5c`, `fa0e450`, `6b35358`, `bebc9d2`)
**Verificador**: sub-agente independente (autor ≠ verificador). Somente leitura sobre o código-fonte;
as mutações rodaram numa `git worktree` descartável.

## Validation: lancamento-avulso — FAIL

**Result**: FAIL


A fatia está substancialmente correta e muito bem testada: **36 de 39 mutantes injetados morreram**,
a cascata de blocos e o cancelamento resistiram a tudo, e o gate completo (`pnpm verify` + `pnpm test:e2e`)
passa — 756 unitários, 230 de integração, 36 e2e, 100% de branches em `src/domain`. O FAIL vem de
**cinco critérios sem nenhuma evidência** (`evidence-or-zero`), **um mutante de comportamento que
sobreviveu à suíte inteira** e **meio requisito (AVUL-04) que não está implementado**. Nenhum deles é
blocker de produto; todos são lacunas de prova, e uma é de comportamento.

---

## Task Completion

Todas as 32 tasks de `tasks.md` (T1..T32) estão marcadas `✅ CONCLUÍDA`, sem nenhuma caixa `- [ ]`
pendente. Duas ressalvas:

| Task | Situação | Nota |
| --- | --- | --- |
| T30 | ⚠️ Parcial | O "Done when" marca ✅ os AC 1 e 2 de FIXO-07, mas o filtro na página (`fixos/page.tsx:66-72`) não tem teste nenhum — ver mutante **M24**, que sobreviveu |
| Traceability | ⚠️ Desatualizada | `spec.md:347` ainda diz `FIXO-07 \| Design \| Pending` embora T30 esteja concluída; os outros dez seguem `Implementing`. O `AGENTS.md` exige atualizar a traceability **no mesmo commit** da task |

---

## Critérios de aceitação ancorados na spec

### AVUL-01 — Registrar um gasto avulso

| Critério | Resultado definido na spec | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| AC 1 — grava 1 `movimento` com `origem='AVULSO'`, sem `compra_id`/`numero_parcela`/`recorrencia_id` | exatamente uma linha, três vínculos nulos | `src/infrastructure/db/repositories/movimento.repository.integration.test.ts:211-215` — `expect(gravado.origem).toBe("AVULSO")`, `expect(gravado.compraId).toBeNull()`, `expect(gravado.numeroParcela).toBeNull()`, `expect(gravado.recorrenciaId).toBeNull()`; também `src/application/mes/criar-lancamento-avulso/handler.test.ts:65-69` | ✅ PASS |
| AC 2 — descrição vazia ou > 120 recusa em `descricao`, sem gravar | erro de validação no campo `descricao`; zero linhas | `src/application/schemas/lancamento-avulso.schema.test.ts:53` — `expect(campoComErro({...VALIDO, descricao: ""})).toBe("descricao")`; limite exato em `:60-65` (`120` aceita, `121` recusa); "sem gravar" em `src/app/actions/lancamentos.integration.test.ts:210-211` — `expect(resultado.erro.campos?.descricao).toBeDefined()` + `expect(await contarMovimentos()).toBe(0)` | ✅ PASS |
| AC 3 — valor não inteiro > 0 recusa em `valorCentavos`, sem gravar | erro no campo `valorCentavos` | `lancamento-avulso.schema.test.ts:70,74,78,88` — zero, negativo, fração e acima do inteiro seguro; sem gravar em `lancamentos.integration.test.ts:220-221` | ✅ PASS |
| AC 4 — competência fora de `AAAA-MM` recusa em `competencia` | erro no campo `competencia` | `lancamento-avulso.schema.test.ts:96,100`; sem gravar em `lancamentos.integration.test.ts:230-231` | ✅ PASS |
| AC 5 — data fora de `AAAA-MM-DD` recusa em `dataEvento` | erro no campo `dataEvento` | `lancamento-avulso.schema.test.ts:104,108`; sem gravar em `lancamentos.integration.test.ts:240-241` | ✅ PASS |
| AC 6 — revalida `/[competencia]` e `/[competencia]/lancamentos` | as duas rotas, exatamente | `src/app/actions/lancamentos.integration.test.ts:186` — `expect(revalidatePath.mock.calls.flat()).toEqual(["/2026-03", "/2026-03/lancamentos"])`; competência informada ≠ aberta em `:192`; nada revalidado na recusa em `:198` | ✅ PASS |
| AC 7 — sem sessão, recusa antes de tocar no banco | código de erro de sessão | `lancamentos.integration.test.ts:125` — `expect(primeiraInstrucao).toContain("requireSession()")`; `:137-138` — `expect(resultado.erro.code).toBe("NAO_AUTENTICADO")` + `expect(await contarMovimentos()).toBe(0)` | ✅ PASS |
| AC 8 — falha imprevista devolve `ERRO_INESPERADO` com identificador de correlação, sem stack trace | `code === "ERRO_INESPERADO"`, id de correlação na mensagem, nenhum stack trace | **nenhuma evidência.** `falhaInesperada` em `src/app/actions/lancamentos.ts:135-143` não tem teste. O teste equivalente existe **só para a outra action**: `src/app/actions/compras.integration.test.ts:197-212` | ❌ **GAP** |

### AVUL-02 — Registrar dinheiro que entra

| Critério | Resultado definido na spec | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| AC 1 — grava `natureza='RECEITA'` e soma em Receitas, nunca em Despesas | receita em "Receitas do mês"; zero em "Despesas" | `src/app/actions/lancamentos.integration.test.ts:169,177-178` — `expect(resultado.data.natureza).toBe("RECEITA")`, `expect(rows[0]?.natureza).toBe("RECEITA")`; separação dos dois indicadores em `e2e/lancamento-avulso.spec.ts:202,204` — `expect(await indicador(page,"Receitas do mês")).toBe(5000)` e `...("Despesas do mês")).toBe(0)` | ✅ PASS |
| AC 2 — o formulário oferece exatamente despesa e receita | as duas, e não investimento | `lancamento-avulso.schema.test.ts:113-124` — as duas aceitas, `INVESTIMENTO` cai em `natureza`; UI em `src/components/form-lancamento-avulso.test.tsx:68` | ✅ PASS |
| AC 3 — receita avulsa aparece em "Entradas" e em nenhum bloco de despesa | linha em Entradas; ausente nos três de despesa | `e2e/lancamento-avulso.spec.ts:196,198` — `await expect(linhaNoBloco(page,"Entradas","Pix recebido")).toBeVisible()` e, em laço pelos três blocos, `toHaveCount(0)`; unidade em `src/components/tabela-lancamentos.test.tsx:173-181` | ✅ PASS |
| AC 4 — meio sem fatura ⇒ já pago por padrão, com `pagoEm = dataEvento` | `pagoEm` igual à data do evento | `src/application/mes/criar-lancamento-avulso/handler.test.ts:104` — `expect(resultado.value.pagoEm).toBe("2026-03-14")`; padrão em `:143` — `expect(jaPagoPorPadrao(false)).toBe(true)`; UI em `form-lancamento-avulso.test.tsx:98,115`; banco em `lancamentos.integration.test.ts:178` — `expect(rows[0]?.pago_em).toBe("2026-03-10")` | ✅ PASS |
| AC 5 — meio que gera fatura ⇒ não pago por padrão | caixa desmarcada | `criar-lancamento-avulso/handler.test.ts:147` — `expect(jaPagoPorPadrao(true)).toBe(false)`; UI em `form-lancamento-avulso.test.tsx:106` — `expect(caixaDePago().checked).toBe(false)` | ✅ PASS |
| AC 6 — a pessoa pode alterar o padrão antes de enviar | os dois sentidos | `criar-lancamento-avulso/handler.test.ts:136-137` — cartão com `jaPago:true` grava `pagoEm`, conta com `false` grava `null`; a caixa para de ser sobrescrita depois do toque em `form-lancamento-avulso.test.tsx:126,130` | ✅ PASS |

### BLOCO-01 / BLOCO-02 — Ler no bloco do cartão tudo que vai na fatura

> ⚠️ **Lacuna de precisão da spec**: a traceability (`spec.md:342-343`) mapeia **BLOCO-01 e BLOCO-02
> para a mesma história**, sem dizer quais dos 7 ACs pertencem a cada um. A convenção que os testes
> adotaram — BLOCO-01 = a cascata e a concordância, BLOCO-02 = a segmentação de `resumoMensal`
> (`src/domain/mes/resumo-mensal.test.ts:158`) — é razoável, mas não está escrita na spec.

| Critério | Resultado definido na spec | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| AC 1 — cada despesa em **exatamente um** dos três blocos, por **uma única** função de domínio | função única, total exaustivo | `src/domain/mes/bloco-do-lancamento.ts:29-40` é a única implementação; exaustividade provada pela soma: `src/domain/mes/resumo-mensal.test.ts:239` — `expect(fixos + cartao + avulsos).toBe(totalGastos)` | ✅ PASS |
| AC 2 — `origem='RECORRENCIA'` ⇒ Fixos, mesmo em cartão | `"FIXOS"` | `src/domain/mes/bloco-do-lancamento.test.ts:45` — `expect(bloco).toBe("FIXOS")` com `origem:"RECORRENCIA", meioPagamentoId: CARTAO`; agregado em `resumo-mensal.test.ts:214-215` — `expect(...fixos).toBe(60000)` e `expect(...cartao).toBe(0)` | ✅ PASS |
| AC 3 — não recorrente + meio cartão ⇒ Cartão, qualquer origem | `"CARTAO"` | `bloco-do-lancamento.test.ts:65` (avulso) e `:74` (parcela) — `expect(bloco).toBe("CARTAO")`; agregado em `resumo-mensal.test.ts:184-185` — `cartao` 80000 / `avulsos` 0; tela em `e2e/lancamento-avulso.spec.ts:127,129` | ✅ PASS |
| AC 4 — não recorrente + meio sem fatura ⇒ Gastos do Mês, inclusive parcela | `"AVULSOS"` | `bloco-do-lancamento.test.ts:94` — parcela em conta corrente vira `"AVULSOS"`; agregado em `resumo-mensal.test.ts:195-196`; tela em `e2e/lancamento-avulso.spec.ts:140-141` | ✅ PASS |
| AC 5 — mesma classificação para o indicador e para os blocos, total igual à soma do bloco | igualdade dos três totais | **teste de concordância** em `src/application/mes/obter-visao-mensal/handler.test.ts:252-254` — `expect(visao.competenciaView.cartao).toBe(somaDoBloco("CARTAO"))` (e `fixos`/`avulsos`), com âncora contra o caso trivial em `:256` — `expect(visao.competenciaView.cartao).toBe(30000)` | ✅ PASS |
| AC 6 — cartão arquivado continua contando como cartão | o arquivado está no conjunto | `src/infrastructure/db/repositories/cadastro.repository.integration.test.ts:143` — "devolve também o cartão arquivado, para não reclassificar o passado"; domínio em `bloco-do-lancamento.test.ts:83` — `expect(bloco).toBe("CARTAO")` para `CARTAO_ARQUIVADO` | ✅ PASS |
| AC 7 — coluna "Parcela" só no bloco Cartão | presente no cartão, ausente nos outros | `src/components/tabela-lancamentos.test.tsx:341` (mostra) e `:363` (não mostra, bloco Gastos do Mês) | ✅ PASS |
| BLOCO-02 — `resumoMensal` segmenta pelos blocos da cascata | três segmentos = três blocos, fechando o total | `src/domain/mes/resumo-mensal.test.ts:236-239` — `fixos` 60000, `cartao` 80000, `avulsos` 70000, soma = `totalGastos` | ✅ PASS |

### AVUL-03 — Excluir um lançamento avulso

| Critério | Resultado definido na spec | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| AC 1 — preenche `cancelado_em` e **mantém** a linha | instante gravado; linha presente | `src/infrastructure/db/repositories/movimento.repository.integration.test.ts:353-354` — `expect(rows).toHaveLength(1)` + `expect(rows[0]?.cancelado_em).toEqual(new Date(INSTANTE))`; instante recebido, não o relógio, em `src/application/mes/cancelar-lancamento/handler.test.ts:71` | ✅ PASS |
| AC 2 — cancelado sai de toda soma e de toda lista | ausente da listagem e dos totais | `movimento.repository.integration.test.ts:361` — `expect(await repo.listarPorCompetencia(...)).toHaveLength(0)`; ação em `lancamentos.integration.test.ts:322,324` — `contarVigentes()` 0 e `contarMovimentos()` 1; tela em `e2e/lancamento-avulso.spec.ts:262` — `expect(await indicador(page,"Despesas do mês")).toBe(antes)` | ✅ PASS |
| AC 3 — origem ≠ AVULSO recusa com `LANCAMENTO_NAO_CANCELAVEL`, sem alterar nada | esse código exato; zero alteração | `src/domain/mes/cancelamento-permitido.test.ts:47,59` — `expect(resultado.error.code).toBe("LANCAMENTO_NAO_CANCELAVEL")`; caso de uso em `cancelar-lancamento/handler.test.ts:85-86,97-98`; **concordância função × `WHERE`** em `movimento.repository.integration.test.ts:417` — `expect(sql).toBe(dominio)` em toda origem; action em `lancamentos.integration.test.ts:360` | ✅ PASS |
| AC 4 — já cancelado: não altera `cancelado_em` e devolve **sucesso** | sucesso, instante preservado | `cancelar-lancamento/handler.test.ts:133,137-138` — `expect(segunda.ok).toBe(true)`, `expect(segunda.value.alterou).toBe(false)`, `canceladoEm` ainda `AGORA`; banco em `movimento.repository.integration.test.ts:384,389` | ✅ PASS |
| AC 5 — controle de excluir só nas linhas avulsas | presente no avulso; ausente em parcela e fixo | `src/components/tabela-lancamentos.test.tsx:421` — `expect(screen.getByRole("button",{name:"Excluir, Almoço"})).toBeDefined()`; `:446` e `:462` — `expect(screen.queryByRole("button",{name:/^Excluir/})).toBeNull()`; receita avulsa em `:478`; tela em `e2e/lancamento-avulso.spec.ts:290` | ✅ PASS |
| AC 6 — primeiro acionamento pede confirmação; só o segundo exclui | nada excluído no 1º; action chamada 1× no 2º | `src/components/botao-excluir.test.tsx:39-40` — `expect(excluir).not.toHaveBeenCalled()` + texto "Confirmar?"; `:49-50` — `expect(excluir).toHaveBeenCalledWith("l-1")` e `toHaveBeenCalledTimes(1)`; tela em `e2e/lancamento-avulso.spec.ts:273-274` | ✅ PASS |
| AC 7 — revalida as duas rotas | as duas, exatamente | `src/app/actions/lancamentos.integration.test.ts:325` — `expect(revalidatePath.mock.calls.flat()).toEqual(["/2026-03","/2026-03/lancamentos"])`; competência do lançamento ≠ aberta em `:328` | ✅ PASS |

### AVUL-04 — Integridade de transição de estado

> ⚠️ **Lacuna de precisão da spec**: AVUL-04 não tem lista de ACs própria. Sua única definição é
> `spec.md:90`: *"Cancelado não se cancela de novo nem se marca como pago."*

| Metade do requisito | `file:line` + assertion | Resultado |
| --- | --- | --- |
| "não se cancela de novo" | `cancelar-lancamento/handler.test.ts:137-138`; `movimento.repository.integration.test.ts:378-389` | ✅ PASS |
| "nem se marca como pago" | **nenhuma evidência, e nenhuma implementação.** `MovimentoRepositoryDrizzle.marcarPagamento` (`src/infrastructure/db/repositories/movimento.repository.ts:88-90`) usa `WHERE id = $1`, sem `cancelado_em IS NULL`; o caso de uso (`src/application/mes/marcar-pagamento/handler.ts:40-45`) só checa existência. Um lançamento cancelado **pode** receber `pagoEm` | ❌ **GAP** |

### ENTR-01 / ENTR-02 — Achar onde mora o dinheiro que entra

| Critério | Resultado definido na spec | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| AC 1 — a área se chama "Todo mês" na navegação e no título | "Todo mês", não "Fixos" | `src/components/navegacao-principal.test.tsx:16-23` — nomeia a área como "Todo mês"; a rota `/fixos` é preservada em `:30`; título da página em `src/app/(app)/[competencia]/fixos/page.tsx:100` (`<h1>Todo mês</h1>`) e no e2e `e2e/recorrencias.spec.ts:132` | ✅ PASS |
| AC 2 — "Entradas" aparece **sempre**, mesmo vazio | bloco presente sem nenhum lançamento | `src/components/tabela-lancamentos.test.tsx:186-198` — `expect(within(entradas).getByText("Nenhum lançamento neste bloco.")).toBeDefined()`; tela em `e2e/lancamento-avulso.spec.ts:235-236` | ✅ PASS |
| AC 3 — "Entradas" antes de todos os blocos de despesa | ordem exata dos quatro títulos | `tabela-lancamentos.test.tsx:120` — `expect(titulos).toEqual(["Entradas","Fixos","Cartão de Crédito","Gastos do Mês"])`; tela em `e2e/lancamento-avulso.spec.ts:239` | ✅ PASS |
| AC 4 — vazio mostra texto de ausência, **não** tabela vazia | texto presente, `<table>` ausente | `tabela-lancamentos.test.tsx:198-199` — texto + `expect(within(entradas).queryByRole("table")).toBeNull()` | ✅ PASS |
| AC 5 — o bloco de despesa recorrente continua chamado "Fixos" | título "Fixos" | `tabela-lancamentos.test.tsx:103` — `expect(screen.getByRole("heading",{name:"Fixos"})).toBeDefined()` | ✅ PASS |

### ENTR-03 — O formulário fala a língua da receita

| Critério | Resultado definido na spec | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| AC 1 — rótulo do meio vira destino do dinheiro | "Onde o dinheiro cai", e "Meio de pagamento" some | `src/components/form-lancamento-avulso.test.tsx:292-293`; `src/components/form-recorrencia.test.tsx:248-249`; e2e em `e2e/lancamento-avulso.spec.ts:215-216` | ✅ PASS |
| AC 2 — só meios sem fatura como destino | cartão ausente das opções | `form-lancamento-avulso.test.tsx:303-304` — `expect(screen.queryByRole("option",{name:"Cartão Roxo"})).toBeNull()`; `form-recorrencia.test.tsx:260-261`; e2e em `e2e/lancamento-avulso.spec.ts:217` e `e2e/recorrencias.spec.ts:234-236` | ✅ PASS |
| AC 3 — título e botão falam de entrada | "Cadastrar entrada", e "Cadastrar gasto fixo" some | `form-recorrencia.test.tsx:229-230`; título do diálogo em `src/app/(app)/[competencia]/fixos/page.tsx:103` ("Novo gasto fixo ou entrada") | ✅ PASS |
| AC 4 — na recorrência, o dia vira "o dia em que o dinheiro costuma cair" | "Dia que costuma cair" | `form-recorrencia.test.tsx:272` — `expect(screen.getByLabelText("Dia que costuma cair")).toBeTruthy()` | ✅ PASS |
| AC 5 — meio com fatura já selecionado troca para o primeiro sem fatura | seleção = conta corrente | `form-lancamento-avulso.test.tsx:315` — `expect((...).value).toBe(CONTA)`; o payload enviado carrega o meio corrigido em `:338-339`; `form-recorrencia.test.tsx:283` | ✅ PASS |
| AC 6 — em despesa, rótulos e opções ficam como eram | tudo volta ao estado de despesa | `form-lancamento-avulso.test.tsx:349-350`; `form-recorrencia.test.tsx:293-296` | ✅ PASS |

### AVUL-05 — Cadastrar sem rolar a página

> ⚠️ **Lacuna de precisão da spec**: existem **dois critérios numerados "7"** (`spec.md:258` e
> `spec.md:261`). Abaixo o segundo aparece como "AC 7-bis".

| Critério | Resultado definido na spec | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| AC 1 — controle de abrir no **topo** da área, antes da lista | posição: antes da lista | **nenhuma evidência posicional.** O botão está em `src/app/(app)/[competencia]/lancamentos/page.tsx:124`, acima de `<TabelaLancamentos>` (`:187`), mas nenhum teste afirma a ordem. O e2e apenas clica no botão (`e2e/lancamento-avulso.spec.ts:62-64`), o que passaria igual com ele no rodapé | ❌ **GAP** |
| AC 2 — abre em diálogo modal, sem navegar | `<dialog>` aberto, mesma rota | `src/components/dialogo-de-cadastro.test.tsx:55` — `expect(elementoDoDialogo().open).toBe(true)`; `:62-67` — `aria-haspopup="dialog"` e `aria-expanded` acompanham | ✅ PASS |
| AC 3 — confina o foco e torna o resto da página inerte | foco preso no diálogo; fora inerte | **nenhuma evidência.** O próprio teste unitário declara que **não** cobre isso (`dialogo-de-cadastro.test.tsx:8-14`: *"O que eles não simulam — armadilha de foco, inércia e devolução do foco — … Isso é coberto pelo e2e"*) — e o e2e **não** o cobre: `Escape` aparece só como utilitário para fechar, sem nenhuma assertion de foco ou inércia | ❌ **GAP** |
| AC 4 — `Escape` fecha e devolve o foco ao controle que abriu | diálogo fechado **e** foco de volta no botão | **parcial.** `dialogo-de-cadastro.test.tsx:100-102` só prova que o React acompanha o evento `close` vindo do elemento (`expect(botao.getAttribute("aria-expanded")).toBe("false")`); não é `Escape`, e a devolução do foco não é afirmada em lugar nenhum | ⚠️ **Parcial** |
| AC 5 — gravar mantém o diálogo aberto, com a confirmação visível | `open === true` e a confirmação ainda na tela | `dialogo-de-cadastro.test.tsx:125-126` — `expect(elementoDoDialogo().open).toBe(true)` + `expect(screen.getByRole("status").textContent).toBe("Gravado.")`; confirmação do formulário em `form-lancamento-avulso.test.tsx:166` | ✅ PASS |
| AC 6 — abaixo de 640px o diálogo ocupa a tela inteira | tela cheia | **nenhuma evidência.** Só as classes `max-sm:h-dvh max-sm:max-h-none max-sm:max-w-none` em `src/components/dialogo-de-cadastro.tsx:93`; nenhum teste em nenhuma largura | ❌ **GAP** |
| AC 7 — preserva o digitado na aba que não está visível | valor mantido ao trocar de aba | `src/components/seletor-de-formulario.test.tsx:87-98` — preserva o conteúdo e mantém os dois painéis no DOM; o conteúdo do diálogo também não é desmontado ao fechar: `dialogo-de-cadastro.test.tsx:139` — `expect((...).value).toBe("Almoço")` | ✅ PASS |
| AC 7-bis — "Todo mês" abre pelo topo, no mesmo diálogo, sem formulário no rodapé | mesmo componente, nada no rodapé | `src/app/(app)/[competencia]/fixos/page.tsx:103-118` usa `DialogoDeCadastro`; e2e em `e2e/recorrencias.spec.ts:46-54` abre o cadastro pelo diálogo. "Sem formulário no rodapé" é afirmado indiretamente por `form-recorrencia.test.tsx:236` (`expect(screen.queryByRole("heading")).toBeNull()`) | ⚠️ **Parcial** — nenhuma assertion direta de posição |

### FIXO-07 — A lista de Todo mês mostra só o que vale no mês aberto

| Critério | Resultado definido na spec | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| AC 1 — mês posterior à última competência válida omite a recorrência | `false` / linha ausente | **domínio ✅, fiação ❌.** `src/domain/recorrencia/vale-na-competencia.test.ts:16,20` — `expect(valeNaCompetencia(ATE_AGOSTO, c("2026-09"))).toBe(false)`. Mas o filtro em `src/app/(app)/[competencia]/fixos/page.tsx:66-72` **não tem teste**: o mutante **M24** o removeu e as 1.022 provas continuaram verdes | ⚠️ **Parcial** |
| AC 2 — mês ≤ última competência válida exibe, mesmo encerrada | `true` / linha presente | domínio em `vale-na-competencia.test.ts:26,30,34`; na tela, `e2e/recorrencias.spec.ts:214-215` mostra a encerrada em `/2026-03/fixos`. Mesma lacuna de fiação do AC 1 | ⚠️ **Parcial** |
| AC 3 — recorrência que começa depois do mês aberto continua aparecendo | `true` | `vale-na-competencia.test.ts:45,49` — `expect(valeNaCompetencia(COMECA_EM_NOVEMBRO, c("2026-09"))).toBe(true)` | ✅ PASS |
| AC 4 — mesma regra da materialização; nenhum mês oculto recebe ocorrência | onde `false`, `janelaMaterializacao` devolve `[]` | **teste de concordância** em `vale-na-competencia.test.ts:82` — `expect(janelaMaterializacao(periodo, mes, mes)).toEqual([])` para os três períodos × 8 meses; fronteira exata em `:88-89` e `:93-94` | ✅ PASS |
| AC 5 — quando aparece e está encerrada, o selo permanece | selo "Encerrado" visível | `src/components/lista-de-fixos.test.tsx:79` — `expect(screen.getByText("Encerrado")).toBeTruthy()`; e2e em `e2e/recorrencias.spec.ts:215` | ✅ PASS |

---

## Edge Cases

- [x] Meio arquivado entre abrir o formulário e enviar ⇒ recusa sem gravar — `src/application/mes/criar-lancamento-avulso/handler.test.ts:175-176` (`MEIO_PAGAMENTO_ARQUIVADO` + `movimentos.size === 0`)
- [x] Categoria não informada ⇒ grava nula e a lista mostra "Sem categoria" — `criar-lancamento-avulso/handler.test.ts:90`; `src/components/tabela-lancamentos.test.tsx:380`
- [x] Competência informada ≠ competência aberta ⇒ grava na informada e revalida as duas — `src/app/actions/lancamentos.integration.test.ts:192`
- [x] Valor acima do inteiro seguro ⇒ recusa em `valorCentavos` — `lancamento-avulso.schema.test.ts:88`
- [x] Nenhum cartão cadastrado ⇒ bloco "Cartão de Crédito" vazio, com texto de ausência — `tabela-lancamentos.test.tsx:156`; conjunto vazio no domínio em `bloco-do-lancamento.test.ts:109`; no repositório em `cadastro.repository.integration.test.ts:179`

---

## Sensor de discriminação

**Método**: `git worktree add` numa pasta temporária a partir de `HEAD`, uma mutação por vez,
`git checkout -- .` entre elas. **Nenhum `git stash`** (proibido no projeto). Baseline da árvore real
antes do sensor: ` M next-env.d.ts`; depois da remoção da worktree: **idêntico**.

**Linha de base**: 756 unitários / 61 arquivos e 230 de integração / 14 arquivos, todos verdes.

### Unitários (`pnpm test:unit`)

| # | Arquivo | Mutação | Morto? |
| --- | --- | --- | --- |
| M1 | `src/domain/mes/bloco-do-lancamento.ts:33-38` | **Inverte os dois primeiros ramos** (cartão antes de recorrência) | ✅ Morto — 7 testes / 4 arquivos |
| M2 | `src/domain/mes/bloco-do-lancamento.ts:36-38` | **Remove o ramo do cartão** | ✅ Morto — 11 testes / 4 arquivos |
| M3 | `src/domain/mes/cancelamento-permitido.ts:42` | **Aceita `PARCELA` também** | ✅ Morto — 4 testes / 2 arquivos |
| M6 | `src/domain/recorrencia/vale-na-competencia.ts:27` | **`<= 0` vira `< 0`** (o mês do fim deixa de valer) | ✅ Morto — 3 testes |
| M7 | `src/application/mes/criar-lancamento-avulso/handler.ts:44` | **Remove a negação** de `jaPagoPorPadrao` | ✅ Morto — 8 testes / 2 arquivos |
| M8 | `src/domain/mes/resumo-mensal.ts:105` | **Troca um bloco por outro** (`cartao` passa a somar `AVULSOS`) | ✅ Morto — 9 testes / 3 arquivos |
| M9 | `src/domain/parcelamento/ratear-parcelas.ts:36` | **AD-011 (a)** — trunca o resíduo do rateio (`recebeCentavo = false`) | ✅ Morto — 23 testes / 6 arquivos |
| M10 | `src/domain/shared/competencia.ts:35-37` | **AD-011 (b)** — `addMeses` sem virada de ano | ✅ Morto — 25 testes / 9 arquivos |
| M11 | `src/application/mes/criar-lancamento-avulso/handler.ts:75` | `pagoEm` sempre nulo (ignora `jaPago`) | ✅ Morto — 2 testes |
| M12 | `src/application/mes/criar-lancamento-avulso/handler.ts:55-57` | Aceita meio arquivado | ✅ Morto — 1 teste |
| M14 | `src/application/mes/obter-visao-mensal/handler.ts:114` | Carimba o bloco com conjunto **vazio** (painel diverge da lista) | ✅ Morto — 2 testes, incl. o de concordância |
| M17 | `src/application/schemas/lancamento-avulso.schema.ts:36` | `max(120)` vira `max(200)` | ✅ Morto — 1 teste |
| M18 | `src/application/mes/cancelar-lancamento/handler.ts:66-69` | Caso de uso deixa de consultar `cancelamentoPermitido` | ✅ Morto — 3 testes |
| M15 | `src/components/tabela-lancamentos.tsx:107-116` | "Entradas" volta a aparecer só quando tem conteúdo | ✅ Morto — 3 testes |
| M19 | `src/components/tabela-lancamentos.tsx:107-130` | "Entradas" depois dos blocos de despesa | ✅ Morto — 1 teste |
| M20 | `src/components/tabela-lancamentos.tsx:253` | Excluir em toda linha, não só na avulsa | ✅ Morto — 2 testes |
| M21 | `src/components/botao-excluir.tsx:47-51` | Exclui no **primeiro** toque | ✅ Morto — 6 testes |
| M22 | `src/components/navegacao-principal.tsx:40` | A área volta a se chamar "Fixos" | ✅ Morto — 4 testes |
| M23 | `src/components/tabela-lancamentos.tsx:127` | Coluna "Parcela" em todos os blocos | ✅ Morto — 1 teste |
| M25 | `src/components/form-lancamento-avulso.tsx:135` | Receita volta a oferecer cartão | ✅ Morto — 1 teste |
| M26 | `src/components/form-lancamento-avulso.tsx:136` | O rótulo do meio não muda com a receita | ✅ Morto — 2 testes |
| M27 | `src/components/dialogo-de-cadastro.tsx:110` | O conteúdo é desmontado quando o diálogo fecha | ✅ Morto — 1 teste |
| **M24** | `src/app/(app)/[competencia]/fixos/page.tsx:66-72` | **Remove o filtro `valeNaCompetencia` da lista de Todo mês** | ❌ **SOBREVIVEU** — 756/756 verdes |

### Integração (`pnpm test:integration`)

| # | Arquivo | Mutação | Morto? |
| --- | --- | --- | --- |
| M4 | `src/infrastructure/db/repositories/cadastro.repository.ts:120-125` | **`idsDeMeiosComFatura` passa a filtrar arquivados** | ✅ Morto — 1 teste |
| M29 | idem | Devolve todo meio, sem filtrar `gera_fatura` | ✅ Morto — 2 testes |
| M5 | `src/infrastructure/db/repositories/movimento.repository.ts:82` | **Tira `eq(movimento.origem,"AVULSO")` do `WHERE` de `cancelar`** | ✅ Morto — 3 testes, incl. o de concordância |
| M13 | idem | Tira `isNull(movimento.canceladoEm)` do `WHERE` | ✅ Morto — 2 testes / 2 arquivos |
| M30 | `src/infrastructure/db/repositories/movimento.repository.ts:57` | `criarAvulso` grava sempre `pagoEm` nulo | ✅ Morto — 2 testes / 2 arquivos |
| M31 | `drizzle/0002_movimento_valor_positivo.sql:1` | **Remove o `CHECK` de positividade do razão** | ✅ Morto — 3 testes / 2 arquivos |
| **M28** | `src/infrastructure/db/schema.ts:291` | **Remove o mesmo `CHECK` da declaração TypeScript** (não da migration) | ❌ **SOBREVIVEU** — 230/230 verdes |

**Profundidade**: P0-full (30 mutações, bem acima do mínimo de 5).
**Resultado**: **37 de 39 mortos** (95%) — os dois sobreviventes viram fix tasks.

---

## Regras invioláveis (`AGENTS.md`)

| Regra | Situação | Evidência |
| --- | --- | --- |
| 1 — nenhum dado financeiro real | ✅ | Fixtures: "Almoço", "Pix recebido", "Farmácia", "Cartão Roxo", "Pessoa A", ids como `meio-cartao`; valores escolhidos por propriedade matemática (`bloco-do-lancamento.test.ts:9-14`) |
| 2 — dinheiro inteiro em centavos | ✅ | `valorCentavos`/`Cents` em todo o caminho novo; `movimento.valor_centavos` é `bigint`; nenhum `toFixed` fora de `formatar.ts`; o schema recusa fração (`lancamento-avulso.schema.test.ts:78`) e o que passa do inteiro seguro (`:88`) |
| 3 — competência é `'YYYY-MM'`, nunca `Date` | ✅ | `vale-na-competencia.ts` usa só `compararCompetencias` (aritmética inteira); `bloco-do-lancamento.ts` e `cancelamento-permitido.ts` não tocam data; o instante do cancelamento entra como parâmetro (`cancelar-lancamento/handler.ts:42`) em vez de `Date.now()` |
| 4 — `src/domain` é puro | ✅ | Os três módulos novos importam só de `../shared` e `../tipos`; devolvem `Result`, não lançam, não são `async`. `src/domain/shared/arquitetura.test.ts` varre todo `src/domain/**/*.ts`, então os arquivos novos entraram na proibição automaticamente |
| 5 — só `movimento` é somável | ✅ | `criarAvulso` e `cancelar` tocam **só** `movimento`; `resumoMensal` soma só `Lancamento`; `idsDeMeiosComFatura` lê `meio_pagamento` apenas para pertinência, sem valor |

---

## Code Quality

| Princípio | Situação |
| --- | --- |
| Código mínimo, sem recurso além do pedido | ✅ |
| Sem abstração para uso único | ✅ — `blocoDoLancamento` nasce com dois chamadores (`resumoMensal` e `obterVisaoMensal`), como o design exige |
| Sem "flexibilidade" desnecessária | ✅ |
| Só os arquivos necessários tocados | ⚠️ — `src/app/globals.css` (cursor) e `layout.tsx` (marca → home) são T31/T32, tasks aprovadas, mas alheias ao problema da fatia |
| Não "melhorou" código não relacionado | ✅ |
| Segue os padrões existentes | ✅ — mesmo par função pura × `WHERE` de `ocorrenciaProtegida`; mesmo envelope `ResultadoAction` de `compras.ts` |
| Um engenheiro sênior aprovaria | ✅ |
| Testes mapeiam para os ACs e não são rasos | ✅ — quase todo `describe` cita o requisito e o AC |
| Valores afirmados batem com a spec | ⚠️ — sim onde a spec define; 4 lacunas de precisão da spec anotadas acima |
| Cobertura por camada | ⚠️ — domínio 1:1 e 100% de branches; rotas e e2e cobrem feliz + borda + erro, **menos** AVUL-01 AC 8 (caminho de erro inesperado da action) |
| Nenhum teste órfão | ✅ |
| Guidelines documentadas seguidas | ✅ `AGENTS.md`; ⚠️ a traceability de `spec.md` não foi atualizada junto com T30 |

---

## Gate Check

- **Comando**: `pnpm verify` (gate `build`) + `pnpm test:e2e`
- **`pnpm test:unit`**: 756 passaram / 61 arquivos, 0 falhas, 0 pulados. Cobertura de `src/domain`: **100% de branches** (166/166), 100% de statements (292/292), funções (90/90) e linhas (271/271)
- **`pnpm test:integration`**: 230 passaram / 14 arquivos, 0 falhas
- **`pnpm build`**: ✅ compilou; typecheck e lint verdes
- **`pnpm test:e2e`**: 36 passaram (57,1s), 0 falhas
- **Total**: **1.022 provas verdes**
- **Testes pulados**: nenhum
- **Integridade**: nenhum teste removido nem enfraquecido; a mudança de expectativa em `resumo-mensal.test.ts` e `obter-visao-mensal/handler.test.ts` é justificada no próprio arquivo (a regra mudou de `origem` para meio de pagamento) e veio **acompanhada de mais** assertions, não de menos

---

## Lacunas, por gravidade

### 1. Blocker — mutante sobrevivente: o filtro de FIXO-07 na página não tem prova

- **Onde**: `src/app/(app)/[competencia]/fixos/page.tsx:66-72`
- **Causa raiz**: `valeNaCompetencia` tem 100% de branches como função pura, mas a **fiação** dela na
  lista não é exercitada por nada. O e2e de FIXO-06 (`e2e/recorrencias.spec.ts:184-216`) encerra a
  partir de 2026-05 e depois visita `/2026-05/lancamentos` e `/2026-03/fixos` — **nunca**
  `/2026-05/fixos`, que é exatamente a tela cuja regra FIXO-07 define.
- **Prova**: mutante **M24** removeu o `.filter(...)` e as 1.022 provas seguiram verdes.
- **Fix task**: acrescentar ao `e2e/recorrencias.spec.ts`, dentro do teste de encerrar, uma visita a
  `/2026-05/fixos` afirmando `toHaveCount(0)` para a linha, e a `/2026-04/fixos` afirmando que ela
  continua visível com o selo "Encerrado". **Verificar**: reaplicar M24 e confirmar que agora morre.

### 2. Major — AVUL-01 AC 8 sem nenhuma evidência

- **Onde**: `src/app/actions/lancamentos.ts:135-143` (`falhaInesperada`)
- **Causa raiz**: o teste equivalente foi escrito para `compras.ts`
  (`src/app/actions/compras.integration.test.ts:197-212`) e não foi replicado para as duas actions novas.
- **Fix task**: em `src/app/actions/lancamentos.integration.test.ts`, forçar o repositório a lançar e
  afirmar `erro.code === "ERRO_INESPERADO"`, que a mensagem carrega o identificador de correlação e
  que nenhum stack trace chega ao envelope — para `criarLancamentoAvulso` **e** `cancelarLancamento`.

### 3. Major — AVUL-04 (segunda metade) não implementado nem testado

- **Onde**: `src/infrastructure/db/repositories/movimento.repository.ts:88-90` e
  `src/application/mes/marcar-pagamento/handler.ts:40-45`
- **Causa raiz**: `marcarPagamento` usa `WHERE id = $1`, sem `cancelado_em IS NULL`. Um lançamento
  cancelado aceita `pagoEm`, contrariando `spec.md:90`. Impacto prático baixo — a linha cancelada não
  é renderizada e não entra em soma nenhuma —, mas a action recebe o id direto e uma aba velha o alcança.
- **Fix task**: decidir entre (a) acrescentar `isNull(movimento.canceladoEm)` ao `WHERE` mais teste de
  integração, ou (b) registrar em `spec.md` que essa metade de AVUL-04 saiu de escopo, com a razão.
  Uma das duas — hoje a spec afirma um comportamento que o código não tem.

### 4. Major — AVUL-05 AC 3 sem evidência, e o teste declara que quem cobre é o e2e que não cobre

- **Onde**: `src/components/dialogo-de-cadastro.test.tsx:8-14` (a declaração) e `e2e/` (a ausência)
- **Causa raiz**: o comentário do dublê de `<dialog>` delega confinamento de foco, inércia e devolução
  do foco ao e2e; nenhum teste e2e faz essas assertions. `Escape` aparece 10 vezes em
  `e2e/lancamento-avulso.spec.ts`, sempre como utilitário para fechar, nunca como o comportamento sob teste.
- **Fix task**: um teste e2e que abra o diálogo, afirme que um elemento **fora** dele não recebe foco
  ao tabular, pressione `Escape`, e afirme que o diálogo fechou **e** que o foco voltou ao botão que o
  abriu (`expect(page.locator(":focus"))`). Isso fecha o AC 3 e completa o AC 4.

### 5. Minor — AVUL-05 AC 1 e AC 7-bis sem assertion de posição

- **Onde**: `src/app/(app)/[competencia]/lancamentos/page.tsx:124` e `.../fixos/page.tsx:103`
- **Causa raiz**: a spec diz "no topo … antes da lista" e "não deixar formulário no rodapé"; os testes
  só provam que o botão existe e funciona. Mover o diálogo para o rodapé não quebra nada.
- **Fix task**: um e2e que compare `boundingBox().y` do botão com o do primeiro bloco da lista, nas duas
  áreas — a mesma forma de medição que o projeto já usa em `UI-03` para largura.

### 6. Minor — AVUL-05 AC 6 (tela cheia abaixo de 640px) sem evidência

- **Onde**: `src/components/dialogo-de-cadastro.tsx:93`
- **Fix task**: um e2e com `page.setViewportSize({ width: 400 })` afirmando que a caixa do diálogo
  ocupa a altura e a largura da janela. O projeto já roda medição em 400px para a tabela.

### 7. Minor — mutante sobrevivente: `schema.ts` e `drizzle/*.sql` podem divergir em silêncio

- **Onde**: `src/infrastructure/db/schema.ts:291`
- **Causa raiz**: `recriarBancoDeTeste` aplica as migrations de `drizzle/`
  (`src/infrastructure/db/testing/banco-de-teste.ts:32`), não o `schema.ts`. Remover o `CHECK` da
  declaração TypeScript não muda o banco de teste — o mutante **M28** sobreviveu, enquanto o mesmo
  `CHECK` removido da migration (**M31**) morreu com 3 testes. A consequência real é drift: a próxima
  `drizzle-kit generate` emitiria uma migration reintroduzindo o que se acredita já existir.
- **Fix task**: um teste de integração que rode `drizzle-kit generate --dry-run` (ou compare o snapshot
  `drizzle/meta/000N_snapshot.json` com o gerado a partir de `schema.ts`) e falhe se houver diferença.
  É lacuna de projeto, não desta fatia — vale como item de roadmap.

### 8. Minor — lacunas de precisão da spec (sem consertar código, só a spec)

- `spec.md:342-343` — **BLOCO-01 e BLOCO-02 mapeiam para a mesma história** sem dizer quais dos 7 ACs
  são de cada um.
- `spec.md:340-341` — **AVUL-03 e AVUL-04 idem**; AVUL-04 só existe como uma frase na tabela de
  dimensões implícitas (`spec.md:90`), sem ACs próprios.
- `spec.md:258` e `spec.md:261` — **dois critérios numerados "7"** em AVUL-05.
- `spec.md:347` — **traceability desatualizada**: FIXO-07 ainda em `Design | Pending` com T30 concluída.

---

## Requirement Traceability — proposta de atualização

| Requisito | Status atual | Status proposto |
| --- | --- | --- |
| AVUL-01 | Implementing | ❌ Needs Fix — AC 8 sem evidência |
| AVUL-02 | Implementing | ✅ Verified |
| AVUL-03 | Implementing | ✅ Verified |
| AVUL-04 | Implementing | ❌ Needs Fix — "nem se marca como pago" não implementado |
| AVUL-05 | Implementing | ❌ Needs Fix — AC 1, 3 e 6 sem evidência; AC 4 parcial |
| BLOCO-01 | Implementing | ✅ Verified |
| BLOCO-02 | Implementing | ✅ Verified |
| ENTR-01 | Implementing | ✅ Verified |
| ENTR-02 | Implementing | ✅ Verified |
| ENTR-03 | Implementing | ✅ Verified |
| FIXO-07 | Design / Pending | ❌ Needs Fix — AC 1 e 2 sem prova de fiação (M24 sobreviveu) |

---

## Resumo

**Geral**: ⚠️ Quase pronto — 7 de 11 requisitos verificados, 4 com lacuna

**Checagem ancorada na spec**: 41 ACs verificados — **33 ✅ PASS**, **5 ❌ GAP**, **3 ⚠️ Parcial**, mais
4 lacunas de precisão da spec
**Sensor**: 39 mutações injetadas, **37 mortas**, 2 sobreviventes (M24 comportamental, M28 de drift)
**Gate**: 1.022 provas verdes (756 unitárias + 230 de integração + 36 e2e), 0 falhas, 0 pulados,
100% de branches em `src/domain`

**O que funciona, e funciona muito bem**: a decisão central da fatia — uma única função de
classificação, com dois chamadores desde o primeiro commit — está provada da forma mais forte
disponível. O teste de concordância de `obter-visao-mensal/handler.test.ts` soma os itens pelo `bloco`
carimbado e confronta com os três campos do painel, **e** ancora contra o caso trivial afirmando que
os totais não são zero; inverter a ordem da cascata mata 7 testes em 4 arquivos, e removê-la mata 11.
O par função pura × `WHERE` do cancelamento tem o teste de concordância que o design prometeu, e
tirar `origem = 'AVULSO'` do SQL é pego imediatamente. Os dois mutantes obrigatórios do AD-011
continuam morrendo com folga (23 e 25 testes). O critério de sucesso *"trocar a ordem da cascata de
blocos quebra a suíte"* está empiricamente confirmado.

**O que falta**: nada de comportamento central. As lacunas são de prova (AVUL-01 AC 8, AVUL-05 AC 1/3/6,
FIXO-07 na página) mais meio requisito não implementado (AVUL-04). A mais séria é a **#1**: a única
regra nova desta fatia que pode ser apagada sem nenhuma prova ficar vermelha.

**Próximo passo**: rotear as lacunas 1 a 4 como fix tasks, reexecutar o sensor sobre M24 e revalidar.
