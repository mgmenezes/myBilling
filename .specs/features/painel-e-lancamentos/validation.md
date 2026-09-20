# Painel e Lançamentos (fatia 1) — Validação (1ª rodada)

**Data**: 2026-09-19
**Spec**: `.specs/features/painel-e-lancamentos/spec.md`
**Faixa do diff**: nenhuma. A fatia foi construída ao longo de muitos commits e depois alterada por
`recorrencias`, `lancamento-avulso` e `home-do-ano`. A verificação é do **estado atual do código**
(`53c8dfa`) contra os ACs, que é o que importa saber.
**Verificador**: sub-agente independente (autor ≠ verificador). Somente leitura sobre o código-fonte;
todas as mutações rodaram numa `git worktree` descartável, **nenhum `git stash`**.

## Validation: painel-e-lancamentos — **FAIL**

**Result**: FAIL

O gate está verde e a fatia *parece* entregue: 1.049 provas passam, 100% de branches em `src/domain`,
`pnpm verify` compila. Mas o que a tabela de rastreabilidade nunca afirmou é exatamente o que a
verificação encontrou: **6 dos 20 requisitos têm evidência de verdade**. Os outros catorze estão
entre "provado pela metade" e "nunca foi escrito teste nenhum".

Três achados são de comportamento, não de cobertura, e por isso o veredito é FAIL e não "PASS com
lacunas":

1. **O controle "Mês atual" não existe** (NAV-01, AC 2). Não é teste faltando: não há o componente,
   não há o botão, não há string. `SeletorCompetencia` nunca ganhou o `SeletorPeriodo` que o design
   descreve.
2. **"Vencido" não existe na interface** (LANC-04, ACs 6 e 7). `situacaoDe` sabe derivar `VENCIDO`,
   mas o único chamador passa a **competência da rota** como competência corrente — e todo lançamento
   da lista é dessa mesma competência, então `competencia < competenciaCorrente` é sempre falso. A
   opção "Vencido" do filtro de situação é, na prática, uma opção morta: ela nunca casa com nada.
3. **Busca e filtros — o coração de LANC-01..04 — não têm uma linha de teste.**
   `src/application/mes/filtrar-lancamentos.ts` e `src/components/filtros-de-lancamentos.tsx` são os
   dois únicos módulos desta fatia sem arquivo `*.test.*` algum, e nenhum percurso de e2E digita no
   campo de busca, escolhe um filtro ou clica num indicador do painel.

O sensor confirma o terceiro achado de forma que não deixa dúvida: **cinco falhas de comportamento
simultâneas** — o predicado compartilhado para de filtrar, o indicador "Despesas do mês" passa a
apontar para o filtro errado, a busca nunca chega à URL, a regra de movimento reduzido é invertida e
o painel inteiro de busca e filtros some da página — e **as 1.049 provas continuam verdes**.

---

## Como os 20 requisitos foram mapeados para os 44 critérios

**Isto é, por si só, uma lacuna.** A tabela de rastreabilidade da spec liga cada requisito a uma
*história*, nunca a critérios: `NAV-01`, `NAV-02` e `NAV-03` apontam todos para "P1: Navegação com
período persistente", que tem seis ACs. As outras fatias deste projeto fazem melhor — a de
`lancamento-avulso` escreve `AVUL-03 | ... ACs 1, 2, 6, 7 e 8`. Sem esse recorte, "quantos requisitos
estão cobertos" não é uma pergunta respondível.

O mapa abaixo foi **reconstruído pelo verificador** a partir das únicas âncoras existentes: as
citações de ID em `design.md` e em comentários de código (`NAV-03, AC 5` em
`src/components/navegacao-principal.tsx:10`; `CAD-04, AC 10` em
`src/components/form-lancamento-avulso.tsx:57`; `LANC-03` em
`src/app/(app)/[competencia]/lancamentos/page.tsx:192`; `UX-03` em `design.md:187`; `DASH-02`/
`DASH-03`/`DASH-04` em `design.md:94,122`). Ele é consistente com todas elas, mas é uma
reconstrução — e a correção definitiva é a spec passar a dizer isto por conta própria.

| Requisito | História | ACs atribuídos |
| --- | --- | --- |
| NAV-01 | Navegação com período persistente | 1, 2 |
| NAV-02 | Navegação com período persistente | 3 |
| NAV-03 | Navegação com período persistente | 4, 5, 6 |
| DASH-01 | Painel de decisão com visão única | 1, 8 |
| DASH-02 | Painel de decisão com visão única | 2 |
| DASH-03 | Painel de decisão com visão única | 3, 4, 7 |
| DASH-04 | Painel de decisão com visão única | 5, 6 |
| LANC-01 | Lançamentos com busca e filtro | 1 |
| LANC-02 | Lançamentos com busca e filtro | 2, 3, 4 |
| LANC-03 | Lançamentos com busca e filtro | 5 |
| LANC-04 | Lançamentos com busca e filtro | 6, 7, 8 |
| CAD-01 | Cadastro rápido de despesa e receita | 1, 2 |
| CAD-02 | Cadastro rápido de despesa e receita | 3, 4 |
| CAD-03 | Cadastro rápido de despesa e receita | 5, 6, 7 |
| CAD-04 | Cadastro rápido de despesa e receita | 8, 9, 10 |
| PAGO-01 | Marcar pago e desfazer | 1, 2, 3 |
| PAGO-02 | Marcar pago e desfazer | 4, 5 |
| UX-01 | Estados, densidade e acessibilidade | 1, 2, 3 |
| UX-02 | Estados, densidade e acessibilidade | 4, 5 |
| UX-03 | Estados, densidade e acessibilidade | 6, 7 |

Um requisito só vira `Verified` quando **todos** os ACs atribuídos a ele têm `file:line` e a
assertion bate com o resultado definido na spec.

---

## Critérios de aceitação, ancorados na spec

### P1: Navegação com período persistente — NAV-01, NAV-02, NAV-03

| Critério | Resultado definido na spec | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| AC 1 — ir de Visão geral para Lançamentos leva a competência no endereço | o href de destino carrega `AAAA-MM` | `src/components/navegacao-principal.test.tsx:42-44` — `expect(screen.getByRole("link", { name: /Lançamentos/ }).getAttribute("href")).toBe("/2026-07/lancamentos")`; e `:41` para Visão geral | ✅ PASS |
| AC 2 — "Mês atual" navega para a competência de hoje **mantendo a área** | um controle que existe, e que preserva a área | **nenhuma evidência — o controle não existe.** `grep -rni "mês atual\|mesAtual"` sobre `src` e `e2e` não devolve nenhum rótulo de interface; `src/components/seletor-periodo.tsx`, previsto em `design.md:97`, nunca foi criado | ❌ GAP |
| AC 3 — barra inferior abaixo de 768px, lateral a partir dela | duas geometrias, por largura | nenhuma evidência. Existe só a classe (`src/components/navegacao-principal.tsx:49`, `fixed ... bottom-0 ... md:static md:flex-col`); nenhum teste mede posição nem largura de janela | ❌ GAP |
| AC 4 — área ativa marcada por meio que não depende só de cor | um meio não-cromático, asserido | `src/components/navegacao-principal.test.tsx:52-54` — `expect(...getAttribute("aria-current")).toBe("page")`; `:61-66` marca `/fixos` e desmarca Visão geral | ✅ PASS (mutante M8 morto) |
| AC 5 — área não implementada omitida da navegação | a lista tem só as áreas prontas | `src/components/navegacao-principal.test.tsx:26-27` — `expect(nomes).toEqual(["Visão geral", "Lançamentos", "Todo mês"])` | ✅ PASS |
| AC 6 — foco visível em **todos** os controles de navegação, na ordem visual | foco visível + ordem, em toda a navegação | parcial: `src/components/seletor-competencia.test.tsx:105-108` — `await userEvent.tab(); expect(document.activeElement).toBe(controle)` para os 4 controles do seletor de mês. **Nada** cobre `NavegacaoPrincipal`, e "foco visível" (o anel) não é asserido em lugar nenhum | ⚠️ parcial |

**Nota sobre o AC 2.** A fatia `home-do-ano` acrescentou, na home `/`, um cartão de destaque que leva
à competência corrente (`src/app/(app)/page.tsx:99`, provado em `e2e/auth.spec.ts:90`). Ele é *um*
caminho de volta ao mês de hoje, mas não é o controle que o AC pede e, sobretudo, **não mantém a área
em que a pessoa estava** — quem está em Lançamentos de março e quer Lançamentos de hoje passa
obrigatoriamente pela Visão geral. Não existe nota de reconciliação para NAV nesta spec, então o
critério vale como foi escrito.

### P1: Painel de decisão com visão única — DASH-01 a DASH-04

| Critério | Resultado definido na spec | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| AC 1 — **exatamente quatro** indicadores | contagem igual a 4 | nenhuma evidência. Nenhum teste conta indicadores; o mutante **M16** acrescenta um quinto cartão ao painel e as 41 provas de e2e passam | ❌ GAP |
| AC 2 — Planejamento alimenta pelo eixo competência e rotula "Saldo previsto" | os valores do eixo competência + o rótulo exato | `e2e/compra-parcelada.spec.ts:230-231` — `await expect(page.getByText("Despesas do mês")).toBeVisible()` e `getByText("Saldo previsto")`; `:235` — `await expect(page.getByRole("link", { name: /Despesas do mês/ })).toContainText("R$ 333,34")`, que é a parcela de março do eixo competência | ✅ PASS (mutante M5 morto) |
| AC 3 — Movimentações alimenta pelo eixo caixa e rotula "Saldo do período" | os valores do eixo caixa + o rótulo exato | `e2e/compra-parcelada.spec.ts:238-240` — `getByText("Saiu da conta")` e `getByText("Saldo do período")` visíveis; `:247` — `await expect(page.getByRole("link", { name: /Saiu da conta/ })).toContainText("R$ 0,00")`, o eixo caixa zerado enquanto o de competência já conta | ✅ PASS (mutante M5 morto) |
| AC 4 — uma visão por vez; nunca os dois eixos na mesma composição | o rótulo do outro eixo **ausente do DOM** | `e2e/compra-parcelada.spec.ts:232-233` — `await expect(page.getByText("Saiu da conta")).toHaveCount(0)` e `getByText("Saldo do período")`; espelhado em `:241-242` | ✅ PASS |
| AC 5 — acionar um indicador abre Lançamentos com o filtro já aplicado | a lista abre com o filtro correspondente | nenhuma evidência. Nenhum teste clica num indicador nem verifica a query. O mutante **M6** troca o filtro de "Despesas do mês" para `natureza=RECEITA` e tudo continua verde | ❌ GAP |
| AC 6 — a soma dos listados é **igual** ao valor daquele indicador | igualdade entre indicador e soma da lista filtrada | nenhuma evidência. `src/application/mes/obter-visao-mensal/handler.test.ts:252-254` compara indicador com soma **por bloco** (`BLOCO-02`), que é outra coisa: não passa pelo filtro da URL nem por `filtrarLancamentos`. O risco que `design.md:180` nomeia como o principal da fatia está sem sensor | ❌ GAP |
| AC 7 — o controle de ajuda explica os dois eixos, e a explicação fica **oculta até o acionamento** | oculta antes, visível depois | metade: `e2e/compra-parcelada.spec.ts:249-250` — `await page.getByText("Qual é a diferença").click()` e `await expect(page.getByText(/nunca soma nem subtrai um do outro/)).toBeVisible()`. Nenhuma assertion de que estava oculta **antes** do clique | ⚠️ parcial |
| AC 8 — mês sem lançamento: indicadores em zero formatado **e** estado vazio com ação de cadastro | `R$ 0,00` + uma ação | metade: o zero formatado aparece em `e2e/compra-parcelada.spec.ts:247` (`"R$ 0,00"`). O **estado vazio com ação de cadastro não existe** no painel: `src/app/(app)/[competencia]/page.tsx:79-157` renderiza os indicadores, o gráfico e o horizonte sem nenhum ramo de mês vazio e sem nenhuma ação de cadastro | ❌ GAP |

### P1: Lançamentos com busca e filtro — LANC-01 a LANC-04

**Nenhum dos oito critérios desta história tem prova completa.** Os dois módulos que os implementam —
`src/application/mes/filtrar-lancamentos.ts` (96 linhas) e
`src/components/filtros-de-lancamentos.tsx` (178 linhas) — são os únicos desta fatia **sem arquivo de
teste algum**, e nenhum dos 41 percursos de e2e digita no campo de busca ou escolhe um filtro.

| Critério | Resultado definido na spec | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| AC 1 — busca por descrição, sem diferenciar caixa nem acentuação | "agua" acha "Água" | nenhuma evidência. `normalizar` em `src/application/mes/filtrar-lancamentos.ts:30-36` não é exercida por nenhum teste; buscas por `Buscar por descrição` e `busca=` nos testes não devolvem nada. Mutantes **M1** e **M3** sobrevivem | ❌ GAP |
| AC 2 — filtro restringe a lista **e** exibe indicador de filtro ativo | lista restrita + indicador visível | nenhuma evidência. O indicador vive em `src/components/filtros-de-lancamentos.tsx:158-163` (`"… com 2 filtros"`), sem teste. Mutantes **M3**, **M4** e **M14** sobrevivem | ❌ GAP |
| AC 3 — controle para limpar todos os filtros de uma vez | um controle que limpa tudo | nenhuma evidência. `src/components/filtros-de-lancamentos.tsx:165-174` (`"Limpar filtros"`) não é citado por nenhum teste. Mutante **M14** sobrevive | ❌ GAP |
| AC 4 — total dos lançamentos visíveis, conferível contra o indicador | um total que reflete só o filtrado | nenhuma evidência. Calculado em `src/app/(app)/[competencia]/lancamentos/page.tsx:116-119` e exibido em `filtros-de-lancamentos.tsx:162`; nenhum teste o lê | ❌ GAP |
| AC 5 — distinguir "nenhum lançamento no mês" de "nenhum resultado para o filtro" | duas mensagens diferentes | metade: o caso "mês sem lançamento" tem prova — `src/components/tabela-lancamentos.test.tsx:338` — `expect(screen.getByText(/Nenhum lançamento neste mês ainda/)).toBeDefined()`, com `:337` `expect(screen.queryByRole("table")).toBeNull()`. O caso "nenhum resultado para o filtro" (`lancamentos/page.tsx:195-199`) **não tem teste nenhum** | ⚠️ parcial |
| AC 6 — distinguir pendente, pago **e vencido** por texto, sem cor como único meio | três estados em texto | metade, e a metade que falta é de produto: pendente e pago têm prova — `src/components/botao-pago.test.tsx:54,58` — `expect(screen.getByRole("button").textContent).toContain("Previsto")` / `toContain("Pago")`, e `src/components/tabela-lancamentos.test.tsx:313-314`. **"Vencido" não existe na interface**: `src/components/tabela-lancamentos.tsx:244-260` só renderiza `BotaoPago` e `BotaoExcluir`, e `BotaoPago` só conhece dois estados | ❌ GAP |
| AC 7 — pendente de competência anterior é apresentado como vencido | rótulo "vencido" na linha | nenhuma evidência, **e o caminho está morto no código**: `situacaoDe` deriva `VENCIDO` em `src/application/mes/filtrar-lancamentos.ts:47`, mas o único chamador — `lancamentos/page.tsx:115` — passa `resultado.value`, a competência **da rota**, como competência corrente. Todo lançamento da lista é dessa mesma competência, então `competencia < competenciaCorrente` é sempre falso e `VENCIDO` nunca é produzido. A opção "Vencido" do seletor de situação (`filtros-de-lancamentos.tsx:152`) nunca casa com nada. Mutante **M2** sobrevive | ❌ GAP (defeito) |
| AC 8 — abaixo de 768px mostra descrição, valor, situação e data; demais campos sob demanda | quatro campos visíveis, o resto sob demanda | nenhuma evidência. A implementação (`tabela-lancamentos.tsx:206-313`) empilha a linha em cartão mostrando **todos** os campos, inclusive categoria e parcela — não há "sob demanda"; e nenhum teste mede o que aparece abaixo de 768px | ❌ GAP |

### P1: Cadastro rápido de despesa e receita — CAD-01 a CAD-04

Os ACs 5, 8 e 10 são verificados **contra a nota de reconciliação** de `spec.md:137-155`, não contra
o texto original.

| Critério | Resultado definido na spec (ou na nota) | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| AC 1 — "Novo lançamento" oferece despesa à vista, compra parcelada e receita | os três tipos alcançáveis | `src/components/seletor-de-formulario.test.tsx:56,65,72` (abas Avulso ┊ Parcelado, uma por vez, troca por clique) mais `src/components/form-lancamento-avulso.test.tsx:69-74` — *"oferece exatamente despesa e receita"*. Fiação em `src/app/(app)/[competencia]/lancamentos/page.tsx:136-179` | ✅ PASS |
| AC 2 — cada tipo apresenta apenas os campos pertinentes | campos do outro tipo ausentes | `src/components/seletor-de-formulario.test.tsx:65` — *"mostra só o painel da aba ativa"*; `src/components/form-lancamento-avulso.test.tsx:297-304` — a receita não oferece cartão como destino | ✅ PASS |
| AC 3 — despesa à vista cria **exatamente um** lançamento `DESPESA`/`AVULSO` na competência | 1 linha, natureza e origem certas | `src/app/actions/lancamentos.integration.test.ts:150-153` — `expect(resultado.data.natureza).toBe("DESPESA")` e `expect(await contarMovimentos()).toBe(1)`; `src/infrastructure/db/repositories/movimento.repository.integration.test.ts:211-214` — `expect(gravado.origem).toBe("AVULSO")` com `compraId`/`numeroParcela`/`recorrenciaId` `toBeNull()` | ✅ PASS |
| AC 4 — receita cria exatamente um lançamento `RECEITA` na competência | 1 linha, natureza `RECEITA` | `src/app/actions/lancamentos.integration.test.ts:168-177` — `expect(resultado.data.natureza).toBe("RECEITA")` e `expect(rows[0]?.natureza).toBe("RECEITA")` lido do Postgres | ✅ PASS |
| AC 5 — **revogado pela nota** para o avulso; mantido para a compra parcelada | avulso sem chave; parcelada não duplica | conforme a nota: o avulso **não** aceita chave (`src/app/actions/lancamentos.ts`, `criarLancamentoAvulso` não recebe `idempotencyKey`); a parcelada mantém — `src/app/actions/compras.integration.test.ts:246` — *"a mesma chave de idempotência não duplica as parcelas (PARC-05, AC 9)"*, com a chave nascendo à abertura do formulário em `src/components/form-compra.test.tsx:146-170` | ✅ PASS (contra a nota) |
| AC 6 — gravação confirma e atualiza indicadores e lista sem recarga manual | confirmação visível + revalidação das duas rotas | `src/components/form-lancamento-avulso.test.tsx:174-176` — `const confirmacao = await screen.findByRole("status")` contendo descrição e valor; `src/app/actions/lancamentos.integration.test.ts:186` — `expect(revalidatePath.mock.calls.flat()).toEqual(["/2026-03","/2026-03/lancamentos"])`; efeito ponta a ponta em `e2e/lancamento-avulso.spec.ts:144-164` | ✅ PASS |
| AC 7 — validação aponta o campo **e** preserva todo o preenchimento | mensagem junto ao campo + campos intactos | metade: a mensagem por campo tem prova — `src/components/form-lancamento-avulso.test.tsx:230` — `expect(await screen.findByText("Descrição longa demais.")).toBeDefined()`, e `:195-213` para a validação local. A **preservação do preenchimento após recusa** não é asserida em nenhum lugar: o teste mais próximo (`:252-264`) preserva o digitado durante a criação de categoria, que é outro caminho | ⚠️ parcial |
| AC 8 — **atendido de outra forma pela nota** (AD-014): conteúdo nunca desmontado | fechar e reabrir devolve o digitado | `src/components/dialogo-de-cadastro.test.tsx:131-141` — *"não desmonta o conteúdo ao fechar"*; reforço em `src/components/seletor-de-formulario.test.tsx:87-98` (preserva o digitado na aba que saiu de vista) e `:98-103` (mantém os dois painéis no DOM) | ✅ PASS (contra a nota) |
| AC 9 — aceita o formato monetário brasileiro sem exigir separador de milhar | `"1234,5"` vira 123450 centavos | `src/domain/shared/money.test.ts:95-96` — `expect(parseBRL("1234,5")).toEqual({ ok: true, value: 123450 })`; com milhar em `:87-88`; rejeições em `:103-110` | ✅ PASS |
| AC 10 — **reconciliado pela nota**: hoje quando hoje é do mês aberto, dia 1 quando não | `dataPadraoDoLancamento` | `src/domain/mes/data-padrao-do-lancamento.test.ts:10-21` (hoje, inclusive no 1º e no último dia) e `:23+` (dia 1 quando hoje é de outro mês); fiação em `src/components/form-lancamento-avulso.test.tsx:361-380` (preenche, envia e continua editável); resolvido na borda em `src/app/(app)/[competencia]/lancamentos/page.tsx:130` | ✅ PASS (contra a nota) |

### P2: Marcar pago e desfazer — PAGO-01, PAGO-02

| Critério | Resultado definido na spec | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| AC 1 — marcar pago grava a data e move de pendente para realizado | `pagoEm` preenchido; indicador se move | `src/application/mes/marcar-pagamento/handler.test.ts:59` — `expect(resultado.ok && resultado.value.pagoEm).toBe("2026-03-15")`; efeito no indicador em `e2e/compra-parcelada.spec.ts:474` — `expect(await valorDoIndicador(page, "Ainda não pago")).toBe(pendenteAntes - 30000)`; chamada da action em `src/components/botao-pago.test.tsx:73` — `expect(acao).toHaveBeenCalledWith("lanc-1", true)` | ✅ PASS |
| AC 2 — desfazer limpa a data e devolve o valor a pendente | `pagoEm` nulo; indicador volta | `src/application/mes/marcar-pagamento/handler.test.ts:68` — `expect(resultado.ok && resultado.value.pagoEm).toBeNull()`; `e2e/compra-parcelada.spec.ts:480` — `expect(await valorDoIndicador(page, "Ainda não pago")).toBe(pendenteAntes)`; `src/components/botao-pago.test.tsx:87` — `expect(acao).toHaveBeenCalledWith("lanc-1", false)` | ✅ PASS (mutante M9 morto) |
| AC 3 — a marcação atualiza os indicadores sem recarga manual | indicadores mudam sozinhos | `src/app/actions/pagamentos.ts:61-62` revalida `/[competencia]/lancamentos` e `/[competencia]`; medido em `e2e/compra-parcelada.spec.ts:471-474` (`aria-pressed` vira `"true"` e o indicador muda); estado otimista sem espera em `src/components/botao-pago.test.tsx:108-110`. *Ressalva de profundidade: só o indicador "Ainda não pago" é medido — os outros três não* | ✅ PASS |
| AC 4 — exclusão pede confirmação **que nomeia o lançamento** | a confirmação contém a descrição | `src/components/botao-excluir.test.tsx:112` — `expect(screen.getByRole("button", { name: "Confirmar?, excluir Almoço" })).toBeDefined()`; o texto visível muda em `:97`; percurso em `e2e/lancamento-avulso.spec.ts:265-275` | ✅ PASS |
| AC 5 — parcela de compra não oferece exclusão | controle ausente na linha de parcela | `src/components/tabela-lancamentos.test.tsx:424-447` (e `:449`, `:465` para fixo e receita); `e2e/lancamento-avulso.spec.ts:277-290`; segunda barreira no domínio em `src/domain/mes/cancelamento-permitido.test.ts:47,59` | ✅ PASS |

### P2: Estados, densidade e acessibilidade — UX-01, UX-02, UX-03

Esta é a história que o enunciado da verificação mandou olhar com desconfiança, e a desconfiança se
justificou: **quatro dos sete critérios estão afirmados só em comentário**.

| Critério | Resultado definido na spec | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| AC 1 — esqueleto **com a forma do conteúdo que virá** | a forma, não só o aviso | metade, e o próprio teste declara a escolha: `src/app/(app)/[competencia]/loading.test.tsx:18-19` — `expect(aviso.getAttribute("aria-live")).toBe("polite")` e `:25` — `toMatch(/carregando/i)`. A **forma** não é asserida — e o esqueleto está desatualizado: `loading.tsx:23-26` desenha "dois painéis na proporção 3 para 2", enquanto a página real (`page.tsx:108-156`) tem quatro cartões, um gráfico e o horizonte futuro | ⚠️ parcial |
| AC 2 — erro com identificador de correlação, sem mensagem técnica nem rastro de pilha | o digest visível, a técnica ausente | `src/app/(app)/[competencia]/error.test.tsx:37` — `expect(screen.getByRole("alert").textContent).toContain("abc123def")`; `:44-47` — `not.toContain(MENSAGEM_TECNICA)`, `not.toContain(LINHA_DE_STACK)`, `not.toMatch(/\bat \S+ \(/)`; degradação sem digest em `:54-55`. Lado servidor em `src/app/actions/lancamentos.integration.test.ts:413-415,438` | ✅ PASS |
| AC 3 — todo estado vazio oferece **uma ação** que permita sair dele | um controle, não uma frase | nenhuma evidência, e não há ação no código. `src/components/tabela-lancamentos.tsx:95-98` é um `<p>` de texto — sem botão, sem link — e o texto ainda diz *"Cadastre um abaixo"* embora a fatia `lancamento-avulso` tenha movido o cadastro para o **topo**, num diálogo. O mesmo vale para o vazio de filtro (`lancamentos/page.tsx:196-199`) e para o painel, que não tem estado vazio. O teste `tabela-lancamentos.test.tsx:338` confere só o texto | ❌ GAP |
| AC 4 — valor monetário em algarismos de largura fixa e alinhado à direita | `tabular-nums` + alinhamento | nenhuma evidência. Implementado (`tabela-lancamentos.tsx:263` — `tabular ... md:text-right`; `globals.css:259-266`), nunca asserido. O mutante **M11** retira as duas propriedades da célula de valor e as 1.049 provas passam | ❌ GAP |
| AC 5 — em 400px, sem rolagem horizontal e sem esconder a barra | transbordo 0 **e** `overflow-x` não escondido | `e2e/compra-parcelada.spec.ts:264-271` — `expect(await transbordoHorizontal(page)).toBe(0)` e `expect(overflow).not.toContain("hidden")` / `not.toContain("clip")` sobre `documentElement` e `body`; `e2e/auth.spec.ts:152-164` cobre `/login`, `/` e `/[competencia]`; `e2e/lancamento-avulso.spec.ts:389` cobre `/[competencia]/lancamentos` com o diálogo aberto | ✅ PASS |
| AC 6 — controle interativo com área de toque de ao menos 44 × 44 | 44 px nos dois eixos | nenhuma evidência, **e há violação conhecida**: `BotaoPago` e `BotaoExcluir` — os controles mais tocados da lista — usam `px-2.5 py-0.5 text-[13px]` (`src/components/botao-pago.tsx:29-32`, `src/components/botao-excluir.tsx:27-30`), o que dá cerca de 24 px de altura, sem nenhum `min-h`. O mutante **M15** encolhe para zero o `min-h-11` dos controles que *tinham* 44 px e nada falha | ❌ GAP |
| AC 7 — com movimento reduzido, transições e animações de entrada suprimidas | nenhuma animação sob a preferência | nenhuma evidência. Implementado em `src/app/globals.css:318-330` e em `src/components/horizonte-futuro.tsx:60`; nenhum teste usa `emulateMedia({ reducedMotion: "reduce" })` nem `matchMedia`. O mutante **M10** inverte a media query para `no-preference` e tudo continua verde | ❌ GAP |

**Contagem por critério**: 44 critérios numerados — **22 ✅ PASS**, **6 ⚠️ parciais**, **16 ❌ GAP**.

---

## Sensor de discriminação

**Método**: `git worktree add --detach <scratch> HEAD` (`53c8dfa`) numa pasta descartável fora do
repositório, `node_modules` clonado com `cp -Rc` (o `next dev` do Playwright recusa `node_modules`
por symlink), uma mutação por vez com `git checkout -- src` entre elas. **Nenhum `git stash`** —
proibido neste projeto.

**Baseline da árvore real antes do sensor**: ` M next-env.d.ts`.
**Depois de `git worktree remove --force` + `git worktree prune`**: ` M next-env.d.ts` — **idêntico**;
`git worktree list` voltou a mostrar só a árvore principal e a pasta do scratch não existe mais.

**Linha de base na worktree**: 771 unitários / 62 arquivos, 237 de integração / 14 arquivos, 41 e2e —
os mesmos números da árvore real.

| # | Arquivo:linha | Mutação | Suíte | Morto? |
| --- | --- | --- | --- | --- |
| **M1** | `src/application/mes/filtrar-lancamentos.ts:30-36` | `normalizar` devolve o texto cru: busca passa a diferenciar caixa e acento | unit | ❌ **Sobreviveu** — 771/771 verdes |
| **M2** | `src/application/mes/filtrar-lancamentos.ts:47` | `competencia < competenciaCorrente` → `>`: `VENCIDO` sai pelo lado errado | unit | ❌ **Sobreviveu** |
| **M3** | `src/application/mes/filtrar-lancamentos.ts:57` | `filtrarLancamentos` devolve a lista inteira: o predicado compartilhado para de filtrar | unit + e2e | ❌ **Sobreviveu** — 771 unit, 237 integração, 41 e2e |
| **M4** | `src/application/mes/filtrar-lancamentos.ts:87` | `contarFiltrosAtivos` sempre 0: some o indicador de filtro ativo e o botão de limpar | unit | ❌ **Sobreviveu** |
| **M5** | `src/components/painel-indicadores.tsx:128,157` | **Controle positivo** — troca os rótulos "Saldo previsto" ⇄ "Saldo do período" | e2e | ✅ **Morto** — `✘ e2e/compra-parcelada.spec.ts:210`, `expect(locator).toBeVisible() failed` |
| **M6** | `src/components/painel-indicadores.tsx:117` | O indicador "Despesas do mês" passa a apontar para `natureza=RECEITA` | e2e | ❌ **Sobreviveu** — 41/41 |
| **M7** | `src/components/filtros-de-lancamentos.tsx:59-61` | O efeito de debounce sai de circulação: o que é digitado na busca nunca chega à URL | e2e | ❌ **Sobreviveu** |
| **M8** | `src/components/navegacao-principal.tsx:60` | `aria-current` some: a área ativa deixa de ser anunciada | unit | ✅ **Morto** — 2 testes, `navegacao-principal.test.tsx` |
| **M9** | `src/components/botao-pago.tsx:57` | `alternar(id, !otimista)` → `alternar(id, otimista)`: marcar pago manda o estado atual | unit | ✅ **Morto** — 2 testes, `botao-pago.test.tsx` |
| **M10** | `src/app/globals.css:318` | `prefers-reduced-motion: reduce` → `no-preference`: a supressão vale para quem **não** pediu | e2e | ❌ **Sobreviveu** |
| **M11** | `src/components/tabela-lancamentos.tsx:263` | A célula de valor perde `tabular` e `md:text-right` | unit + e2e | ❌ **Sobreviveu** |
| **M12** | `src/components/navegacao-principal.tsx:53` | O destino perde a competência (`/lancamentos` em vez de `/2026-07/lancamentos`) | unit | ✅ **Morto** — 2 testes, `navegacao-principal.test.tsx` |
| **M14** | `src/app/(app)/[competencia]/lancamentos/page.tsx:182-188` | `<FiltrosDeLancamentos>` some da página: nem busca, nem filtros, nem total, nem limpar | e2e | ❌ **Sobreviveu** — 41/41 |
| **M15** | `painel-indicadores.tsx:69`, `navegacao-principal.tsx:61`, `filtros-de-lancamentos.tsx:21` | `min-h-11` e `min-h-[52px]` → `min-h-0`: a área de toque encolhe em todos os controles que a tinham | unit + e2e | ❌ **Sobreviveu** |
| **M16** | `src/components/painel-indicadores.tsx:128` | Um **quinto** indicador entra no painel de Planejamento | e2e | ❌ **Sobreviveu** — 41/41 |

**O teste mais duro**: M3, M6, M7, M10 e M14 foram aplicados **ao mesmo tempo** e a suíte inteira
ficou verde — 771 unitários, 237 de integração e 41 e2e. Cinco falhas de comportamento simultâneas,
zero sinal.

**Profundidade**: P0-full — **15 mutações**, acima do mínimo de 5.
**Resultado**: **4 mortas / 15**, **11 sobreviventes** — e os quatro mutantes mortos caem todos em
código que outras fatias trouxeram (`navegacao-principal`, `botao-pago`, os rótulos do alternador).
Nenhum mutante sobre busca, filtro, reconciliação indicador↔lista, área de toque, movimento reduzido
ou alinhamento de valor foi morto.

---

## Edge Cases

- [x] Competência fora de `AAAA-MM` → página de não encontrado, sem erro não tratado — `e2e/auth.spec.ts:143-146`: `getByRole("heading", { name: "Página não encontrada" })` visível, `locator("#__next_error__")` com `toHaveCount(0)`
- [ ] Busca sem resultado mantém os filtros visíveis e não os limpa — sem teste. A implementação mantém (`lancamentos/page.tsx:182-199` renderiza os filtros fora do ramo vazio), mas nada prende
- [x] Valor monetário inválido → recusa com mensagem junto ao campo, sem gravar — `src/components/form-lancamento-avulso.test.tsx:205-213`; `src/application/schemas/lancamento-avulso.schema.test.ts:70,74,78,88`; `src/app/actions/lancamentos.integration.test.ts:220-221`
- [ ] Falha de banco durante a gravação → erro **e preservação do preenchimento** — só a metade do erro tem prova (`lancamentos.integration.test.ts:413-415`); a preservação do formulário não é asserida
- [ ] Mês corrente → "Mês atual" desabilitado ou ausente — vacuamente satisfeito, porque o controle não existe (NAV-01 AC 2). Sem teste
- [ ] Lista com mais de cem lançamentos permanece utilizável — sem teste e sem fixture nessa ordem de grandeza

---

## Regras invioláveis (`AGENTS.md`)

| Regra | Situação | Evidência |
| --- | --- | --- |
| 1 — nenhum dado financeiro real | ✅ | Fixtures redondas e nomes genéricos ("Compra parcelada A", "Conta de luz", "Pessoa A"); seed com PRNG de semente fixa em `src/infrastructure/db/seed.ts` |
| 2 — dinheiro inteiro em centavos | ✅ | `parseBRL`/`formatarBRL` são a única fronteira; `src/domain/shared/money.test.ts:119-121` proíbe `parseFloat`, `toFixed`, `* 100`, `/ 100` no próprio fonte |
| 3 — competência é `'YYYY-MM'` | ✅ | `filtrar-lancamentos.ts` compara competência como string; `addMeses` concentra a aritmética; nenhum `Date` novo no caminho desta fatia |
| 4 — `src/domain` é puro | ✅ | `src/domain/shared/arquitetura.test.ts` verde; `filtrarLancamentos` vive em `src/application`, não no domínio — correto, porque conhece `LancamentoDoMes` |
| 5 — só `movimento` é somável | ✅ | Os dois eixos nunca são somados: o AC 4 do painel prova ausência do outro eixo no DOM (`e2e/compra-parcelada.spec.ts:232-233,241-242`) |

---

## Code Quality

| Princípio | Situação |
| --- | --- |
| Código mínimo, sem recurso além do pedido | ✅ |
| Sem abstração para uso único | ✅ — `filtrarLancamentos` num módulo só é decisão deliberada e documentada (`filtrar-lancamentos.ts:4-16`), e está certa; o que falta é o teste dela |
| Sem "flexibilidade" desnecessária | ✅ |
| Segue os padrões existentes | ✅ |
| Testes mapeiam para os ACs e não são rasos | ❌ — oito critérios de LANC e quatro de UX não têm teste nenhum; 11 de 15 mutantes sobrevivem |
| Valores afirmados batem com a spec | ⚠️ — 22/44; 6 parciais e 16 sem evidência |
| Cobertura por camada (domínio 1:1; rotas e e2e feliz + borda + erro) | ❌ — `src/domain` está em 100% de branches, mas a camada de aplicação tem um módulo inteiro (`filtrar-lancamentos.ts`) sem teste, e a rota `/[competencia]/lancamentos` não tem percurso de e2e que exercite busca ou filtro |
| Nenhum teste órfão | ✅ — todo teste encontrado cita um AC, um edge case ou um Done-when |
| Rastreabilidade utilizável | ❌ — a tabela liga requisito a **história**, não a critérios, e nenhum dos 20 IDs aparece em nome de teste; 14 dos 20 IDs não aparecem em lugar nenhum fora da spec e do design |
| Guidelines documentadas seguidas | ⚠️ — `AGENTS.md` pede "testes derivam dos acceptance criteria do `spec.md`"; para LANC-01..04 e UX-01/03 isso não aconteceu |
| Um engenheiro sênior aprovaria | ❌ — não com a busca, os filtros e a reconciliação indicador↔lista sem uma única prova |

---

## Gate Check

- **Comando**: `pnpm test:unit`, `pnpm test:integration`, `pnpm test:e2e`
- **`pnpm test:unit`**: **771** passaram / 62 arquivos, 0 falhas, 0 pulados. Cobertura de
  `src/domain`: **100% de branches (168/168)**, statements 293/293, funções 91/91, linhas 272/272
- **`pnpm test:integration`**: **237** passaram / 14 arquivos, 0 falhas
- **`pnpm test:e2e`**: **41** passaram (49,9 s), 0 falhas
- **Total**: **1.049 provas verdes**, 0 falhas, 0 pulados
- **Integridade**: nenhum teste removido, nenhum `skip`, nenhuma assertion enfraquecida
- **Observação**: o gate verde **não** é evidência para esta fatia. O sensor mostra que ele permanece
  verde com cinco falhas de comportamento simultâneas nas superfícies que ela entrega

**Nenhum `next dev` estava rodando** quando o e2e foi executado (a porta 3000 estava ocupada por um
processo do Cursor, não por um servidor Next; o Playwright sobe o seu próprio na 3100).

---

## Lacunas, por gravidade

### Blocker

**1. "Vencido" não existe, e o caminho que o produziria está morto** — LANC-04 ACs 6 e 7

- **Onde**: `src/application/mes/filtrar-lancamentos.ts:43-48` e o único chamador,
  `src/app/(app)/[competencia]/lancamentos/page.tsx:115`.
- **Causa raiz**: `filtrarLancamentos` recebe `resultado.value` — a competência **da rota** — como
  `competenciaCorrente`. Todo lançamento listado pertence a essa mesma competência, então
  `item.lancamento.competencia < competenciaCorrente` nunca é verdadeiro e `situacaoDe` só devolve
  `PAGO` ou `PENDENTE`. A opção "Vencido" do seletor de situação
  (`src/components/filtros-de-lancamentos.tsx:152`) filtra para o conjunto vazio, sempre.
- **Impacto**: um dos motivos declarados da lista — separar o que já venceu — não funciona, e o
  filtro promete um estado que não existe.
- **Conserto**: `competenciaCorrente` precisa vir de `hojeEm()` (como já acontece com `dataPadrao` em
  `page.tsx:130`), não do segmento de rota; e a coluna "Situação" precisa renderizar o terceiro
  estado em texto. Depois: um teste de `situacaoDe` com competência aberta anterior, igual e
  posterior à corrente, e um percurso de e2e que abra um mês passado com pendente.

**2. Busca e filtros sem uma única prova** — LANC-01, LANC-02, LANC-03 (metade), DASH-04

- **Onde**: `src/application/mes/filtrar-lancamentos.ts` e `src/components/filtros-de-lancamentos.tsx`
  — os dois únicos módulos da fatia sem arquivo de teste.
- **Causa raiz**: nenhum teste unitário foi escrito para o predicado compartilhado, e nenhum dos 41
  percursos de e2e digita no campo de busca ou escolhe um filtro.
- **Impacto**: comprovado pelo sensor — M3, M4, M7 e M14 sobrevivem; o painel de busca e filtros pode
  **desaparecer inteiro** da página sem que nada falhe.
- **Conserto**: `filtrar-lancamentos.test.ts` com 1:1 para os ACs 1 a 4 (busca com acento e caixa,
  cada dimensão de filtro, combinação, contagem de ativos, situação derivada) e um percurso de e2e
  que busque por parte de uma descrição, confira que só ela aparece, que o indicador de filtro ativo
  aparece e que o total reflete só o resultado — que é literalmente o *Independent Test* escrito em
  `spec.md:112`.

**3. A reconciliação indicador ↔ lista, o risco nº 1 do próprio design, está sem sensor** — DASH-04

- **Onde**: `src/components/painel-indicadores.tsx:110,117,124,139,146,153` (os filtros dos links) e
  `lancamentos/page.tsx:115-119` (a soma).
- **Causa raiz**: `design.md:180` nomeia esta divergência como o principal risco da fatia e prescreve
  "um teste de integração compara o valor do indicador com a soma da lista filtrada, para os quatro".
  Esse teste não existe. O que existe (`obter-visao-mensal/handler.test.ts:252-254`) compara indicador
  com soma **por bloco**, que não passa pelo filtro da URL.
- **Impacto**: M6 troca o filtro do indicador de despesas para `natureza=RECEITA` e nada falha. O
  painel pode prometer um total que a lista não confirma — exatamente o que arruína a confiança nos
  números.
- **Conserto**: o teste que o design pede, para os quatro indicadores das duas visões, mais um e2e
  que clique num indicador e compare o total exibido pela lista com o número clicado.

### Major

**4. O controle "Mês atual" nunca foi implementado** — NAV-01 AC 2

- **Onde**: ausente. `src/components/seletor-periodo.tsx` (`design.md:97`) não existe;
  `SeletorCompetencia` tem anterior, próximo, mês e ano, e nada mais.
- **Impacto**: voltar ao mês de hoje exige passar pela home (`/`), o que **perde a área** em que a
  pessoa estava — e o AC exige manter.
- **Conserto**: acrescentar o controle ao seletor, calculando hoje no cliente (como `design.md:99`
  prevê), preservando o segmento de área; mais o ramo desabilitado/ausente no mês corrente, que é
  edge case listado em `spec.md:203`.

**5. Nenhum estado vazio oferece ação de saída** — UX-01 AC 3, DASH-01 AC 8

- **Onde**: `src/components/tabela-lancamentos.tsx:95-98` (um `<p>`, sem controle, cujo texto ainda
  diz *"Cadastre um abaixo"* embora o cadastro tenha subido para o topo num diálogo);
  `lancamentos/page.tsx:196-199` (vazio de filtro, sem botão de limpar); `page.tsx:79-157` (o painel
  não tem ramo de mês vazio).
- **Conserto**: um botão que abra o diálogo de cadastro no vazio do mês; um que limpe os filtros no
  vazio do filtro; um estado vazio no painel. E corrigir o texto obsoleto.

**6. Área de toque de 44 × 44 violada nos controles mais tocados** — UX-03 AC 6

- **Onde**: `src/components/botao-pago.tsx:29-32` e `src/components/botao-excluir.tsx:27-30` —
  `px-2.5 py-0.5 text-[13px]`, sem `min-h`, ≈ 24 px de altura. São o selo de pagamento e o botão de
  excluir, um par por linha da lista.
- **Impacto**: no celular, os dois alvos menores da tela ficam lado a lado, encostados
  (`tabela-lancamentos.tsx:244` usa `gap-2`).
- **Conserto**: `min-h-11 min-w-11` nos dois (ou área de toque estendida por pseudo-elemento, para
  não engordar a pílula), mais um teste que meça `getBoundingClientRect()` dos controles da lista em
  400 px — que é o único jeito de isto não regredir de novo.

**7. Nenhum teste de movimento reduzido** — UX-03 AC 7

- **Onde**: implementado em `src/app/globals.css:318-330` e `src/components/horizonte-futuro.tsx:60`,
  sem nenhuma prova. M10 inverte a media query e nada falha.
- **Conserto**: um percurso com `test.use({ reducedMotion: "reduce" })` que confira
  `transition-duration` computado em um elemento animado e que o GSAP do horizonte não rode.

### Minor

**8. Algarismos de largura fixa e alinhamento à direita sem prova** — UX-02 AC 4

- M11 retira `tabular` e `md:text-right` da célula de valor e nada falha. Conserto: assertion sobre
  `font-variant-numeric` e `text-align` computados, na lista e no painel.

**9. O esqueleto de carregamento não tem mais a forma do conteúdo** — UX-01 AC 1

- `src/app/(app)/[competencia]/loading.tsx:23-26` desenha "dois painéis na proporção 3 para 2", um
  layout que a página não tem desde que os quatro indicadores entraram. Conserto: redesenhar o
  esqueleto e asserir a contagem de blocos, não só o `role="status"`.

**10. "Exatamente quatro indicadores" não é asserido** — DASH-01 AC 1

- M16 acrescenta um quinto cartão e tudo passa. Conserto: uma assertion de contagem no painel, nas
  duas visões.

**11. Responsividade da navegação sem prova** — NAV-02 AC 3

- Barra inferior abaixo de 768 px e lateral a partir dela existem só como classe. Conserto: um e2e em
  dois viewports medindo a posição do `<nav>`.

**12. Três metades pendentes de assertion** — NAV-03 AC 6, DASH-03 AC 7, CAD-03 AC 7

- Foco visível e ordem de tabulação na `NavegacaoPrincipal` (hoje só o seletor de mês é coberto); a
  ajuda do alternador **oculta antes** do clique; e a preservação do preenchimento depois de uma
  recusa do servidor. As três são uma assertion cada, em teste que já existe.

### Processo, sem gate

**13. A rastreabilidade não recorta requisito por AC.** Os 20 IDs apontam para histórias, não para
critérios, e catorze deles (`NAV-01`, `NAV-02`, `DASH-01`, `DASH-04`, `LANC-01`, `LANC-02`,
`LANC-04`, `CAD-01`, `CAD-02`, `CAD-03`, `PAGO-01`, `PAGO-02`, `UX-01`, `UX-02`) não aparecem em
nenhum nome de teste, comentário ou documento fora de `spec.md` e `design.md`. A fatia
`lancamento-avulso` já faz o recorte certo (`spec.md:343-344` lá); esta deveria seguir. Enquanto não
seguir, qualquer contagem de cobertura é uma reconstrução, como foi esta.

**14. Não há `tasks.md` para esta fatia.** `.specs/features/painel-e-lancamentos/` tem só `spec.md` e
`design.md`, então não foi possível fazer a checagem de tasks concluídas que o passo 1 de
`validate.md` pede, nem ler o comando de gate de lá (usei os de `AGENTS.md`).

---

## Requirement Traceability — atualização

| Requisito | ACs | Status anterior | Status novo |
| --- | --- | --- | --- |
| NAV-01 | 1, 2 | Pending | ❌ Needs Fix — AC 1 provado; AC 2 não implementado |
| NAV-02 | 3 | Pending | ❌ Not Covered |
| NAV-03 | 4, 5, 6 | Pending | ⚠️ Partially Verified — ACs 4 e 5 provados; AC 6 pela metade |
| DASH-01 | 1, 8 | Pending | ❌ Needs Fix |
| DASH-02 | 2 | Pending | ✅ Verified |
| DASH-03 | 3, 4, 7 | Pending | ⚠️ Partially Verified — ACs 3 e 4 provados; AC 7 pela metade |
| DASH-04 | 5, 6 | Pending | ❌ Not Covered |
| LANC-01 | 1 | Pending | ❌ Not Covered |
| LANC-02 | 2, 3, 4 | Pending | ❌ Not Covered |
| LANC-03 | 5 | Pending | ⚠️ Partially Verified |
| LANC-04 | 6, 7, 8 | Pending | ❌ Needs Fix — "vencido" não existe na interface |
| CAD-01 | 1, 2 | Pending | ✅ Verified |
| CAD-02 | 3, 4 | Pending | ✅ Verified |
| CAD-03 | 5, 6, 7 | Pending | ⚠️ Partially Verified — ACs 5 e 6 provados; AC 7 pela metade |
| CAD-04 | 8, 9, 10 | Pending | ✅ Verified (ACs 8 e 10 contra a nota de reconciliação) |
| PAGO-01 | 1, 2, 3 | Pending | ✅ Verified |
| PAGO-02 | 4, 5 | Pending | ✅ Verified |
| UX-01 | 1, 2, 3 | Pending | ❌ Needs Fix — AC 2 provado; AC 1 pela metade; AC 3 sem implementação |
| UX-02 | 4, 5 | Pending | ❌ Needs Fix — AC 5 provado; AC 4 sem prova |
| UX-03 | 6, 7 | Pending | ❌ Not Covered |

---

## Resumo

**Geral**: ❌ Não pronto — **6 de 20 requisitos verificados** (DASH-02, CAD-01, CAD-02, CAD-04,
PAGO-01, PAGO-02). 4 parcialmente verificados, 10 sem evidência suficiente.

**Checagem ancorada na spec**: 44 critérios — **22 ✅ PASS**, **6 ⚠️ parciais**, **16 ❌ GAP**
**Sensor**: 15 mutações injetadas, **4 mortas**, **11 sobreviventes** (P0-full)
**Gate**: 1.049 provas verdes (771 unitárias + 237 de integração + 41 e2e), 0 falhas, 0 pulados,
100% de branches em `src/domain`
**Isolamento do sensor**: worktree descartável, `git status --porcelain` da árvore real idêntico
antes e depois (` M next-env.d.ts`); worktree removida e `git worktree prune` executado

**O que funciona de verdade**: o cadastro (os três tipos, a gravação das duas naturezas, o formato
monetário, a data proposta, a preservação do que foi digitado), marcar pago e desfazer ponta a ponta,
a exclusão com confirmação que nomeia o lançamento e a recusa de excluir parcela, a navegação
carregando a competência, o alternador com uma visão por vez, o estado de erro com identificador e
sem rastro de pilha, e os 400 px sem rolagem horizontal em quatro rotas. São áreas em que as outras
fatias (`lancamento-avulso`, `recorrencias`) passaram por cima com teste próprio — e é por isso que
sobreviveram.

**O que não está provado**: quase tudo que **só** esta fatia entregou e que nenhuma fatia posterior
tocou — busca, filtros, o estado dos filtros na URL, a reconciliação entre indicador e lista, o
estado "vencido", os estados vazios com saída, a área de toque, o movimento reduzido e o alinhamento
dos valores. O padrão é nítido: onde uma fatia posterior escreveu teste, o comportamento está preso;
onde não escreveu, a fatia 1 nunca teve rede.

**Próximo passo**: rotear as três lacunas Blocker (vencido, busca/filtros, reconciliação
indicador↔lista) como fix tasks antes de qualquer coisa. As quatro Major vêm em seguida. As Minor
são de conserto mecânico e podem entrar junto. Reverificar depois — no máximo 3 ciclos de
fix → re-verify antes de escalar.

**`validate_state.py` não foi executado esperando saída 0**: o veredito é FAIL, e o relatório
registra FAIL. Fazer o script passar exigiria escrever PASS, que seria falso.
