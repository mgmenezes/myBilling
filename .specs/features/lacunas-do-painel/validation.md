# Lacunas do painel e da lista — Validação

**Data**: 2026-09-20
**Spec**: `.specs/features/lacunas-do-painel/spec.md`
**Faixa do diff**: `a44f58b..74b6960` (plano em `a44f58b`; implementação de `74c0961` a `74b6960`)
**Verificador**: sub-agente independente (autor ≠ verificador). Somente leitura sobre código e
teste; as catorze mutações rodaram numa `git worktree` descartável em `/private/tmp`, **nenhum
`git stash`**. Porcelain da árvore real conferido antes e depois.

## Validation: lacunas-do-painel — **PASS**

**Result**: PASS ✅, com **duas lacunas de precisão** e **três coberturas parciais** nomeadas abaixo.

A fatia nasceu de um FAIL com **11 mutantes sobreviventes**. O sensor desta rodada injetou **14
mutações** mirando exatamente o que ela declara ter fechado — o predicado de filtragem, o filtro de
cada indicador, a resolução da competência corrente, a classificação de vencido, a área de toque, a
contagem de indicadores, a media query de movimento reduzido — e **as 14 morreram**. Cada uma foi
confrontada com **o teste que deveria pegá-la**, não com a suíte inteira: a única em que a suíte
morreu por outro motivo (E3) foi reexecutada isolada, e aí sim falhou no teste certo, com
`Expected: < 1 / Received: 200`.

O que não fecha é de precisão da spec, não de comportamento:

1. **REDE-03, AC 5** pede "a mesma contagem de blocos que a página tem", e a página não define
   contagem de blocos. Declarado em aberto pela própria fatia, e a leitura **se sustenta** — ver
   julgamento abaixo.
2. **VENC-01, AC 5** tem três cláusulas e só uma delas tem assertion de teste.

---

## Task Completion

| Task | Status | Notas |
| --- | --- | --- |
| T1 | ✅ Done | `src/application/mes/filtrar-lancamentos.test.ts`, 26 casos |
| T2 | ✅ Done | `src/components/painel-indicadores.test.tsx`, predicado lido do `href` |
| T3 | ✅ Done | `src/components/filtros-de-lancamentos.test.tsx` |
| T4 | ✅ Done | `e2e/busca-e-filtros.spec.ts:168-270` |
| T5 | ✅ Done | `src/app/(app)/[competencia]/lancamentos/page.tsx:95-101` |
| T6 | ✅ Done | `src/components/tabela-lancamentos.tsx:283-284` |
| T7 | ✅ Done | `e2e/busca-e-filtros.spec.ts:282-352` |
| T8 | ✅ Done | `botao-pago.tsx:30` e `botao-excluir.tsx:28` |
| T9 | ✅ Done | `e2e/acessibilidade.spec.ts:117-152` |
| T10 | ✅ Done | `tabela-lancamentos.tsx:115-127` + `filtros-de-lancamentos.tsx:165-174` |
| T11 | ✅ Done | `src/components/seletor-competencia.tsx:151-164` |
| T15 | ✅ Done | `painel-indicadores.tsx:117`; acrescentada em `37e6fd1`, fora do plano original |
| T12 | ⚠️ Parcial, declarada | 3 de 4 ACs fechados; AC 5 em lacuna de precisão, registrada |
| T13 | ✅ Done | `painel-e-lancamentos/spec.md`: 20 IDs recortados por AC, de 6 para 13 verificados |
| T14 | ⚠️ Parcial, por dependência | AD-016 e AD-017 registrados; `validate_state.py` dependia deste relatório |

15 tasks, 15 executadas. Nenhuma bloqueada. As duas parciais estão declaradas na própria `tasks.md`
com a razão, e nenhuma delas afirma cobertura que não tem.

---

## Critérios de aceitação, ancorados na spec

### P1: "Vencido" volta a existir — VENC-01

| Critério | Resultado definido na spec | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| AC 1 — não pago de competência anterior à corrente é vencido | `"VENCIDO"` | `src/application/mes/filtrar-lancamentos.test.ts:209` — `expect(situacaoDe(item({ id: "fev", competencia: FEVEREIRO }), MARCO)).toBe("VENCIDO")` | ✅ PASS (M3 morto) |
| AC 2 — competência corrente ou posterior é pendente | `"PENDENTE"` | `:213` — `expect(situacaoDe(naoPago, MARCO)).toBe("PENDENTE")`; `:217` para ABRIL (futuro) | ✅ PASS (M3 morto) |
| AC 3 — com data de pagamento é pago, em qualquer competência | `"PAGO"` nas três competências | `:220-226` — laço sobre `[FEVEREIRO, MARCO, ABRIL]`, `expect(situacaoDe(...)).toBe("PAGO")` | ✅ PASS |
| AC 4 — "Vencido" num mês passado devolve **exatamente** os não pagos daquele mês | a lista é o conjunto dos não pagos, e só ele | `:237` — `expect(ids(filtrarLancamentos(lista, { situacao: "VENCIDO" }, MARCO))).toEqual(["fev-pendente"])`, com o par negativo em `:243`; na tela, `e2e/busca-e-filtros.spec.ts:316-317` | ✅ PASS |
| AC 5 — resolver por requisição, no fuso da casa, e **não** do segmento de rota | três cláusulas | "não do segmento de rota": `e2e/busca-e-filtros.spec.ts:292` — `await expect(atrasada.getByText("Vencido")).toBeVisible()` num mês passado, impossível com a competência da rota (mutante **E1** morto). "por requisição": `page.tsx:60` `export const dynamic = "force-dynamic"`, confirmado pelo build (`ƒ /[competencia]/lancamentos`) — **não há assertion de teste**. "no fuso da casa": `hojeEm()` em `src/lib/relogio.ts:25`, **sem arquivo de teste** | ⚠️ Parcialmente coberto |
| AC 6 — vencido distinguido por texto, e não só por cor | a palavra presente na linha | `src/components/tabela-lancamentos.test.tsx:535` — `expect(within(linha).getByText("Vencido")).toBeDefined()`, com o negativo em `:542` e `:549`; na tela, `e2e/busca-e-filtros.spec.ts:292` | ✅ PASS (M3b morto) |

### P2: Voltar ao mês de hoje sem perder o lugar — MES-01

| Critério | Resultado definido na spec | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| AC 1 — controle no seletor que leva ao mês corrente | destino = competência corrente | `src/components/seletor-competencia.test.tsx:160-162` — `expect(destino).toBe("/2026-09")` | ✅ PASS |
| AC 2 — acionado, preserva a área | `/2026-03/lancamentos` → `/<corrente>/lancamentos` | `:150-153` — `expect(screen.getByRole("link", { name: /Ir para o mês atual/ })).toHaveProperty("href", expect.stringContaining("/2026-09/lancamentos"))` | ✅ PASS (M6 morto) |
| AC 3 — no mês corrente, desabilitado e **não** oculto | `disabled === true`, e nenhum link | `:171-172` — `expect((atalho as HTMLButtonElement).disabled).toBe(true)` e `expect(screen.queryByRole("link", { name: /Ir para o mês atual/ })).toBeNull()` | ✅ PASS |

> O *Independent Test* da spec ("abrir `/2026-03/lancamentos`, acionar o controle, e chegar em
> `/<mês corrente>/lancamentos`") **não foi implementado como e2e**. A prova é do `href`, com
> `usePathname` dublado. É evidência do destino, não do percurso.

### P2: Todo estado vazio oferece saída — VAZIO-01

| Critério | Resultado definido na spec | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| AC 1 — mês sem lançamento oferece o controle que abre o cadastro | o controle aciona o cadastro que já existe | `src/components/tabela-lancamentos.test.tsx:627-630` — clique em `"+ Cadastrar o primeiro lançamento"` e `expect(abrirCadastro).toHaveBeenCalledTimes(1)` | ✅ PASS (M7 morto) — ver ressalva |
| AC 2 — filtro sem resultado oferece controle que limpa | o botão presente com a lista vazia | `src/components/filtros-de-lancamentos.test.tsx:231` — `expect(screen.getByRole("button", { name: "Limpar filtros" })).toBeDefined()` com `quantidadeVisivel: 0` | ✅ PASS |
| AC 3 — limpar devolve a lista inteira do mês | a lista volta completa | composto de duas metades: `filtros-de-lancamentos.test.tsx:222` — `expect(replace).toHaveBeenCalledWith("?", { scroll: false })` (a navegação emitida não leva parâmetro); e `filtrar-lancamentos.test.ts:121` — `expect(filtrarLancamentos(lista, {}, MARCO)).toHaveLength(6)` (sem filtro, a lista inteira) | ✅ PASS, por composição |
| AC 4 — não instruir a procurar o cadastro onde ele não está | o texto não diz "abaixo" | `tabela-lancamentos.test.tsx:638` — `expect(aviso.textContent).not.toContain("abaixo")` | ✅ PASS |

> **Ressalva no AC 1.** `BotaoAbrirCadastro` acha o gatilho por
> `document.querySelector('button[aria-haspopup="dialog"]')` (`botao-abrir-cadastro.tsx:26`), e o
> teste monta um dublê com esse mesmo contrato ARIA (`tabela-lancamentos.test.tsx:607`). Isso prova
> o mecanismo; **nenhum percurso e2e clica o controle do mês vazio e vê o diálogo real abrir**. Se a
> ligação na página quebrasse, esta prova continuaria verde.

### P2: Os controles da linha respeitam a área de toque — TOQUE-01

| Critério | Resultado definido na spec | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| AC 1 — controle de situação com ao menos 44 × 44 | ≥ 44 em cada dimensão | `e2e/acessibilidade.spec.ts:128-129` — `expect(selo.largura).toBeGreaterThanOrEqual(ALVO_MINIMO)` e `expect(selo.altura)...`, com `ALVO_MINIMO = 44` em `:27` | ✅ PASS (E2 morto) |
| AC 2 — controle de excluir idem | ≥ 44 em cada dimensão | `:130-131` — `expect(excluir.largura).toBeGreaterThanOrEqual(ALVO_MINIMO)` e `expect(excluir.altura)...` | ✅ PASS |
| AC 3 — verificar pela geometria renderizada, **não** pela presença de classe | medida de retângulo real | `:103-115` — `medir()` devolve `elemento.getBoundingClientRect()`; `:122` — `expect(page.viewportSize()?.width).toBe(LARGURA_DE_CELULAR)` com `400` em `:30` | ✅ PASS |

> As assertions de classe existentes (`botao-pago.test.tsx:146`, `botao-excluir.test.tsx:134`) são
> **redundantes por decisão declarada**, não substitutas: existem para que remover a medida também
> falhe no gate rápido. O mutante E2 foi confrontado com o e2e, e é lá que ele morre.

### P1: A busca e os filtros ganham prova — REDE-01

| Critério | Resultado definido na spec | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| AC 1 — busca ignora acento e caixa | "agua" acha "Água" e vice-versa | `filtrar-lancamentos.test.ts:62` — `expect(ids(filtrarLancamentos(lista, { busca: "agua" }, MARCO))).toEqual(["acentuado", "sem-acento"])`; `:69` para `"ÁGUA"`; `:76` por trecho | ✅ PASS (M1 morto) |
| AC 2 — cada dimensão isolada: categoria, meio, pessoa, situação, natureza | só o item daquela dimensão | `:95`, `:101`, `:107`, `:113`, `:117` — cinco `expect(ids(...)).toEqual([...])`, um por dimensão; na tela, `e2e/busca-e-filtros.spec.ts:211-228` | ✅ PASS |
| AC 3 — combinados são interseção, e não união | um resultado, não três | `:140-142` — `expect(ids(visiveis)).toEqual(["x-pessoa-b"])` e `expect(visiveis).toHaveLength(1)`; `:159` — combinação sem interseção devolve `[]` | ✅ PASS |
| AC 4 — contagem de ativos, inclusive com busca em branco | `0` para busca só com espaços | `:193` — `expect(contarFiltrosAtivos({ busca: "   " })).toBe(0)`; `:188` — as seis dimensões contam `6`; `:201` — branco ao lado de outra conta `1` | ✅ PASS (M8 morto) |
| AC 5 — busca digitada se reflete na URL | o parâmetro `busca` com o termo | `filtros-de-lancamentos.test.tsx:83` — `expect(replace).toHaveBeenCalledWith("?busca=agua", { scroll: false })`; cada seletor em `:130`; na tela, `e2e/busca-e-filtros.spec.ts:172` — `await expect(page).toHaveURL(/busca=farm/)` | ✅ PASS |
| AC 6 — filtro aplicado exibe o total **apenas do que restou** | o total do recorte, não o do mês | `filtros-de-lancamentos.test.tsx:157` — `expect(screen.getByText(/3 lançamentos/).textContent).toContain("R$ 45,67")`; na tela, `e2e/busca-e-filtros.spec.ts:191-193` — `toContainText("1 lançamento com 1 filtro")`, `toContainText("R$ 20,00")` e `not.toContainText("R$ 60,00")` | ✅ PASS |

### P1: O indicador e a lista param de poder divergir — REDE-02

| Critério | Resultado definido na spec | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| AC 1 — cada indicador do eixo competência = soma da lista filtrada pelo predicado do link | igualdade em centavos, e não zero | `painel-indicadores.test.tsx:178` — `expect(exibido).toBe(somaDaLista(filtroDoLink(href(rotulo))))` e `:180` — `expect(exibido).toBeGreaterThan(0)`, para os três indicadores com link; em mês passado, `:302` | ✅ PASS (M2 e M4 mortos) |
| AC 2 — o mesmo para o eixo caixa, **no recorte em que os dois eixos coincidem** | igualdade, dentro do recorte declarado | `:221` — `expect(exibido).toBe(somaDaLista(filtroDoLink(href(rotulo))))` para `Recebido`, `Saiu da conta` e `Ainda não saiu`; `:236` para o saldo | ⚠️ PASS contra o AC **estreitado durante a fatia** — ver julgamento 2 |
| AC 3 — acionar um indicador abre a lista com o filtro dele | a URL com o filtro, e a lista recortada | `e2e/busca-e-filtros.spec.ts:264` — `await expect(page).toHaveURL(new RegExp("/2026-03/lancamentos\\?natureza=DESPESA$"))`; `:267` — o total da lista é `R$ 60,00`, o mesmo do indicador; `:268` — a receita ficou de fora | ✅ PASS |
| AC 4 — usar o filtro que o link carrega, e **não** recalcular o predicado no teste | o predicado sai do `href` | `painel-indicadores.test.tsx:135-146` — `filtroDoLink(href)` monta `URLSearchParams` a partir de `href.split("?")[1]`; consumido em `:178`, `:221` e `:302` | ✅ PASS |

### P3: O que estava implementado e não provado — REDE-03

| Critério | Resultado definido na spec | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| AC 1 — movimento reduzido suprime a animação, verificado na geometria ou no estilo computado | duração praticamente zero | `e2e/acessibilidade.spec.ts:197` — `expect(await duracaoDaTransicao(seta)).toBeLessThan(1)`, com `reducedMotion: "reduce"` em `:189`; controle em `:212` — `toBeGreaterThan(100)` sob `no-preference`, para a media query invertida não passar à toa | ✅ PASS (E3 morto no teste certo) |
| AC 2 — valor monetário com algarismo de largura fixa e alinhado à direita, no estilo computado | `tabular-nums` e `right` | `:233-234` — `expect(estilo.algarismo).toContain("tabular-nums")` e `expect(estilo.alinhamento).toBe("right")`, lidos de `getComputedStyle` em `:228-231` | ✅ PASS |
| AC 3 — **exatamente quatro** indicadores em cada eixo | contagem igual a 4 | `:248` — `await expect(grade.locator("> *")).toHaveCount(4)`, nos dois eixos (`:239`); em componente, `painel-indicadores.test.tsx:210` e `:245` — `expect(screen.getAllByRole("link")).toHaveLength(3)` | ✅ PASS (E4 e M5 mortos) |
| AC 4 — erro exibe identificador de correlação sem rastro de pilha | o digest visível, a pilha ausente | `src/app/(app)/[competencia]/error.test.tsx:37` — `expect(screen.getByRole("alert").textContent).toContain("abc123def")`; `:44-47` — `not.toContain(LINHA_DE_STACK)` e `not.toMatch(/\bat \S+ \(/)`; `:55` — degradação para `sem-identificador` | ✅ PASS (cobertura anterior, corretamente reivindicada) |
| AC 5 — esqueleto com a **mesma contagem de blocos que a página** | não definido pela spec | `e2e/acessibilidade.spec.ts:277` — `expect(blocos).toBe(7)`, contando `class="animate-pulse` no documento transmitido. O `7` é a contagem do **próprio esqueleto**, não uma contagem derivada da página | ⚠️ Lacuna de precisão — ver julgamento 1 |

**Status**: ✅ 25 de 27 critérios com evidência localizada e assertion que bate com o resultado da
spec · ⚠️ 1 lacuna de precisão da spec (REDE-03 AC 5) · ⚠️ 1 cobertura parcial (VENC-01 AC 5) · ⚠️ 1
AC estreitado durante a fatia (REDE-02 AC 2).

---

## Os três julgamentos que a implementação pediu

### 1. REDE-03, AC 5 — a leitura **se sustenta**

O esqueleto declara espelhar uma proporção 3:2 que **não existe em lugar nenhum do app**:

```
$ grep -rn "col-span-3\|col-span-2\|grid-cols-5" src/
src/app/(app)/[competencia]/loading.tsx:23:      <div className="grid gap-4 lg:grid-cols-5">
src/app/(app)/[competencia]/loading.tsx:24:        <Bloco className="h-64 rounded-xl lg:col-span-3" />
src/app/(app)/[competencia]/loading.tsx:25:        <Bloco className="h-64 rounded-xl lg:col-span-2" />
```

Três ocorrências, as três no próprio esqueleto. A página do mês é cabeçalho
(`page.tsx:96`), a grade de indicadores (`painel-indicadores.tsx:181`, `sm:grid-cols-2
xl:grid-cols-4`) e duas `section` (`page.tsx:137` e `:158`). O esqueleto **derivou**, e o comentário
em `loading.tsx:5-7` descreve uma página que não existe mais.

E a spec, de fato, não define "contagem de blocos" da página: não há número a comparar. Marcar
lacuna de precisão em vez de passar em silêncio é o que a regra manda. **Veredito: honesto.**

Uma observação que o registro não faz e vale registrar: a contagem `7` do esqueleto (1 pílula + 2
painéis + 4 linhas) **coincide** com uma leitura possível da página (1 cabeçalho + 4 indicadores + 2
seções), mas por decomposições diferentes. A igualdade é coincidência, não estrutura — e é mais um
motivo para não tratar o `toBe(7)` como prova do AC. Como rede de regressão da forma atual, ele
funciona: o mutante **E5** (um bloco a menos) morre nele.

### 2. REDE-02, AC 2 — o estreitamento é **substantivamente honesto, com a justificativa errada**

A divergência entre o eixo caixa e a lista **é real**, e o recorte que a spec passou a declarar
("lançamentos da competência aberta, pagos nela") **descreve corretamente** onde os dois coincidem:

- o indicador soma `realizadoEm(l, competencia)`, que é
  `lancamento.pagoEm?.startsWith(competencia)` (`src/domain/mes/resumo-mensal.ts:27-29`);
- a lista filtra `situacao=PAGO`, que é `item.lancamento.pagoEm !== null`
  (`src/application/mes/filtrar-lancamentos.ts:44-46`).

Um lançamento de março **pago em setembro** aparece na lista de março como `PAGO` e **não** entra em
`Saiu da conta` de março. O AC original, "provar o mesmo para cada indicador do eixo caixa", era
insatisfazível por construção. **Estreitar foi legítimo.**

O que **não** se sustenta é a causa registrada. O Out of Scope e o AD-017 dizem que "o eixo caixa
soma por `realizadoEm` e **alcança lançamentos de outras competências**", e ilustram com "um de
março pago em setembro entra no indicador [de setembro]". Isso é falso no código atual:
`obterVisaoMensal` alimenta `resumoMensal` com `deps.movimentos.listarPorCompetencia(competencia)`
(`src/application/mes/obter-visao-mensal/handler.ts:84,98`), de modo que o eixo caixa **nunca** vê
lançamento de outra competência. A divergência corre na direção oposta: é o lançamento **desta**
competência pago **fora** dela que a lista conta e o indicador não.

Duas consequências:

- **a decisão AD-017 está registrada com o mecanismo errado**, e quem for pagá-la vai procurar o
  defeito no lugar errado;
- a fixture de T2 põe tudo em março pago em março (`painel-indicadores.test.tsx:74-89`), então
  **nenhum teste exercita a fronteira**. O caso que separa `realizadoEm` de `pagoEm !== null` — um
  lançamento do mês aberto pago noutro mês — não tem prova em lugar nenhum.

Ordem dos fatos, para o registro: o teste foi escrito em `97d9d64`; o AC foi estreitado em `37e6fd1`,
depois. O estreitamento não moveu a trave do comportamento, mas foi escrito **depois** de saber onde
a bola tinha parado, e a justificativa não foi conferida contra o código.

### 3. T15 — **fecha**, e a prova usa mês passado

T15 entrou fora do plano, em `37e6fd1`, para consertar a regressão que T5 criou: com a competência
corrente vindo do relógio, todo não pago de mês passado virou `VENCIDO`, e o link do cartão
continuava fixo em `situacao=PENDENTE` — cartão com número, lista vazia.

- O conserto está em `painel-indicadores.tsx:117` — `const situacaoDoNaoPago = competencia <
  competenciaCorrente ? "VENCIDO" : "PENDENTE"`.
- A prova usa **mês passado**: `painel-indicadores.test.tsx:279` fixa `SETEMBRO` como corrente com
  março aberto, e afirma em `:288` (`toContain("situacao=VENCIDO")`), `:294`
  (`...length).toBeGreaterThan(0)`, a lista não volta vazia) e `:302` (o total bate com a soma
  daquela lista) — nos dois eixos.
- O teste de T2 **não cobria** o caso: `montar()` tem `corrente: Competencia = MARCO`
  (`painel-indicadores.test.tsx:103`), o próprio mês aberto, onde o link é `PENDENTE` e está certo.
- Confirmado pela mutação: **M4** (filtro fixo em `PENDENTE`) mata **6 provas**, todas do bloco de
  mês passado. Nenhuma das provas de T2 falha com esse mutante.

**Veredito: fecha, e a prova é do caso certo.**

---

## Sensor de discriminação

Worktree descartável em `/private/tmp/.../scratchpad/sensor`, `node_modules` instalado nela
(o symlink para a árvore real foi recusado pelo Turbopack e produziu **falsos positivos** de morte —
descartados e refeitos). Cada mutante foi confrontado com **o teste que deveria pegá-lo**.

| # | Mutação | `file:line` | Nível | Teste que matou | Resultado |
| --- | --- | --- | --- | --- | --- |
| M1 | `filtrarLancamentos` devolve a lista inteira | `filtrar-lancamentos.ts:55` | unit | `filtrar-lancamentos.test.ts` (13 falhas) | ✅ Morto |
| M2 | indicador "Despesas do mês" aponta para `natureza=RECEITA` | `painel-indicadores.tsx:133` | componentes | `painel-indicadores.test.tsx:178` e `:265` | ✅ Morto |
| M3 | `situacaoDe` inverte `<` para `>` | `filtrar-lancamentos.ts:47` | unit | `filtrar-lancamentos.test.ts:209`, `:217`, `:237` (4 falhas) | ✅ Morto |
| M3b | a mesma inversão, contra a tela | `filtrar-lancamentos.ts:47` | componentes | `tabela-lancamentos.test.tsx:535` e `:549` | ✅ Morto |
| M4 | filtro do não pago fixo em `PENDENTE` (o defeito que T15 consertou) | `painel-indicadores.tsx:117` | componentes | `painel-indicadores.test.tsx:288`, `:294`, `:302` (6 falhas) | ✅ Morto |
| M5 | quinto indicador no eixo planejamento | `painel-indicadores.tsx:142` | componentes | `painel-indicadores.test.tsx:210` | ✅ Morto |
| M6 | o atalho "Mês atual" perde a área preservada | `seletor-competencia.tsx:87` | componentes | `seletor-competencia.test.tsx:150` | ✅ Morto |
| M7 | o vazio do mês perde o controle de cadastro | `tabela-lancamentos.tsx:123` | componentes | `tabela-lancamentos.test.tsx:627` | ✅ Morto |
| M8 | `contarFiltrosAtivos` passa a contar busca em branco | `filtrar-lancamentos.ts:89` | unit | `filtrar-lancamentos.test.ts:193`, `:197`, `:201` | ✅ Morto |
| E1 | competência corrente volta ao segmento de rota | `lancamentos/page.tsx:96` | e2e | `e2e/busca-e-filtros.spec.ts:282` | ✅ Morto |
| E2 | selo perde `min-h-11 min-w-11` | `botao-pago.tsx:30` | e2e | `e2e/acessibilidade.spec.ts:117` | ✅ Morto |
| E3 | media query de movimento reduzido invertida | `globals.css:318` | e2e | `e2e/acessibilidade.spec.ts:191` — `Expected: < 1 / Received: 200` | ✅ Morto |
| E4 | quinto indicador, na página | `painel-indicadores.tsx:142` | e2e | `e2e/acessibilidade.spec.ts:238` | ✅ Morto |
| E5 | esqueleto perde um bloco | `loading.tsx:32` | e2e | `e2e/acessibilidade.spec.ts:252` | ✅ Morto |

**Profundidade**: P0-full (14 mutações, acima do mínimo de 5 pedido para caminho crítico).
**Resultado**: **14/14 mortos** — PASS ✅.

**Nota sobre E3.** Na primeira execução, a suíte inteira morreu no teste `:134` (separação dos
alvos), e não no `:191`, que é o que o AC 1 de REDE-03 existe para segurar — o modo serial parou a
suíte antes. Suíte vermelha por outro motivo é exatamente o falso conforto que a lição L-004
proíbe. Reexecutado com `-g "movimento"`, o mutante morreu no teste certo, com a medida explícita.

**Isolamento**: baseline da árvore real ` M next-env.d.ts` (reescrita do Next, não desta fatia).
Após `git worktree remove --force` e `git worktree prune`, `git status --porcelain` devolve **vazio**
— o `pnpm typecheck` regravou `next-env.d.ts` para o conteúdo commitado. Nenhuma mutação vazou.

---

## Edge Cases

- [x] Competência aberta é a corrente → nada é vencido — `filtrar-lancamentos.test.ts:213`;
      `tabela-lancamentos.test.tsx:542`; `e2e/busca-e-filtros.spec.ts:343` (`toHaveCount(0)`)
- [x] Competência aberta é futura → pendente, e não vencido — `filtrar-lancamentos.test.ts:217`;
      `tabela-lancamentos.test.tsx:549`; `painel-indicadores.test.tsx:315`
- [ ] **Competência corrente não resolvível → falha visível** — `lancamentos/page.tsx:100` e
      `layout.tsx:31` lançam, mas **nenhum teste exercita o ramo**. Ele é inalcançável na prática
      (`criarCompetencia(hojeEm().slice(0, 7))` não falha sem dublar o relógio), e por isso o custo
      de cobri-lo é alto e o risco é baixo — mas o critério não tem evidência
- [x] Mês vazio **com** filtro → oferece limpar — `filtros-de-lancamentos.test.tsx:227-233`.
      ⚠️ A metade negativa do edge case ("SHALL **não** oferecer cadastrar") depende do ramo de
      composição em `lancamentos/page.tsx:216-220`, que a matriz classifica como `none`: nenhum
      teste afirma que o vazio de filtro deixa de oferecer o cadastro
- [x] Busca só com espaços → ausente na contagem — `filtrar-lancamentos.test.ts:193` (M8 morto)

---

## Regras invioláveis (`AGENTS.md`)

| Regra | Situação |
| --- | --- |
| 1 — nenhum dado financeiro real | ✅ Fixtures com "Pessoa A/B", "Categoria Um/Dois", "Cartão Roxo", "Conta Corrente"; valores escolhidos por propriedade aritmética (`painel-indicadores.test.tsx:72-73`) |
| 2 — dinheiro é inteiro em centavos | ✅ `valorExibido()` devolve centavos inteiros (`painel-indicadores.test.tsx:126-132`); nenhum `toFixed` novo fora de `formatar.ts` |
| 3 — competência é `'YYYY-MM'`, nunca `Date` | ✅ Comparação textual em `filtrar-lancamentos.ts:47` e `painel-indicadores.tsx:117`; `hojeEm().slice(0, 7)` nas bordas |
| 4 — `src/domain` é puro | ✅ Nada novo em `src/domain`; `arquitetura.test.ts` verde |
| 5 — só `movimento` é somável; eixos nunca somados entre si | ✅ `painel-indicadores.test.tsx` reconcilia **dentro** de cada eixo, nunca entre eles |
| Commits atômicos, Conventional Commits | ✅ 18 commits na faixa: 15 de task, um por task, com a task marcada e a traceability atualizada dentro do mesmo commit, mais 3 de spec (`eba9f4c`, `0db40f9`, `37e6fd1`) |
| `git push` / operação remota exige autorização | ✅ Nenhum push. `main` segue à frente de `origin/main` |

---

## Code Quality

| Princípio | Status |
| --- | --- |
| Código mínimo | ✅ |
| Mudanças cirúrgicas | ✅ 16 arquivos em `src/`, dos quais **9 de produção**, todos nomeados nas tasks; `botao-excluir.tsx` mudou 1 linha, exigida pelo AC 2 de TOQUE-01 |
| Sem escopo extra | ✅ Nenhum "já que estou aqui". O esqueleto **não** foi redesenhado, como o Out of Scope manda |
| Segue os padrões existentes | ✅ Dublê de `next/navigation` como em `navegacao-principal.test.tsx`; fixtures como em `obter-visao-mensal/handler.test.ts` |
| Assertion bate com o resultado da spec | ⚠️ 25/27; as exceções estão nomeadas |
| Expectativa de cobertura por camada | ✅ `src/domain` 100% de branches; geometria e estilo computado no e2e, como a matriz exige |
| Todo teste mapeia para AC, edge case ou Done-when | ✅ Nenhum teste órfão nos 9 arquivos de teste novos ou alterados |
| Guidelines documentadas seguidas | ✅ `AGENTS.md`, `tasks.md#Test Coverage Matrix` |

**Uma fragilidade de desenho, sem gate.** `BotaoAbrirCadastro` (`botao-abrir-cadastro.tsx:26`)
localiza o gatilho do cadastro por `document.querySelector` global. Hoje há um só
`aria-haspopup="dialog"` na árvore (`dialogo-de-cadastro.tsx:74`), então funciona; um segundo
diálogo em qualquer lugar da página muda o alvo em silêncio, e nenhum teste da página pegaria.

---

## Gate Check

- **Comando**: `pnpm verify && pnpm test:e2e` (gate `build` de `tasks.md`), executado em partes
- `pnpm typecheck` — ✅ `Types generated successfully`
- `pnpm lint` — ✅ `Checked 204 files. No fixes applied.`
- `pnpm test:unit` — ✅ **65 arquivos, 856 testes**, 0 falhas; `src/domain` em 100% de branches (168/168)
- `pnpm test:integration` — ✅ **14 arquivos, 237 testes**, 0 falhas
- `pnpm build` — ✅ compilado; `/[competencia]/lancamentos` sai como `ƒ` (dinâmica, por requisição)
- `pnpm test:e2e` — ✅ **57 testes**, 0 falhas, 1.4 min

**Total**: **1.150 provas**, 0 falhas, 0 puladas. Bate com o número declarado no `HANDOFF.md`.

**Integridade dos testes.** A contagem anterior não foi remedida aqui; ela vem da medição da
verificação de `painel-e-lancamentos` (2026-09-19, em `53c8dfa`), registrada em
`painel-e-lancamentos/validation.md:269-276`:

| | Medido em `53c8dfa` | Medido agora | Delta |
| --- | --- | --- | --- |
| unit + componentes | 771 (62 arquivos) | 856 (65 arquivos) | +85 |
| integration | 237 (14 arquivos) | 237 (14 arquivos) | 0 |
| e2e | 41 | 57 | +16 |
| **total** | **1.049** | **1.150** | **+101** |

A contagem nunca diminuiu. Nenhum teste deletado, nenhuma assertion enfraquecida, nenhum `skip`.

---

## Lacunas, por gravidade

### Major — nenhuma

Nenhum defeito de comportamento. Nenhum mutante sobrevivente.

### Minor

1. **A justificativa do AD-017 descreve um mecanismo que o código não tem.** O eixo caixa **não**
   alcança lançamentos de outras competências: `obterVisaoMensal` só lhe entrega
   `listarPorCompetencia(competencia)` (`obter-visao-mensal/handler.ts:84,98`). A divergência real é
   `realizadoEm` (`resumo-mensal.ts:27`) contra `pagoEm !== null`
   (`filtrar-lancamentos.ts:44`) — lançamento **do mês aberto pago fora dele**. Corrigir o texto da
   decisão e do Out of Scope, senão a dívida nº 1 do handoff vai ser procurada no lugar errado.
2. **A fronteira de REDE-02 AC 2 não tem prova nenhuma.** A fixture de T2 põe tudo em março pago em
   março; nenhum caso exercita o lançamento do mês aberto pago noutro mês. É um teste de uma linha
   (`pagoEm` fora da competência) que documentaria a divergência em vez de deixá-la implícita.
3. **VENC-01 AC 5 está coberto pela metade.** "Não do segmento de rota" tem prova e mutante morto;
   "a cada requisição" tem `force-dynamic` e a saída do build, mas nenhuma assertion; "no fuso da
   casa" depende de `src/lib/relogio.ts`, que **não tem arquivo de teste**.
4. **O edge case da competência corrente não resolvível não tem prova** (`page.tsx:100`,
   `layout.tsx:31`). Ramo praticamente inalcançável, mas é critério listado.
5. **VAZIO-01 AC 1 não tem percurso na tela.** O teste prova o mecanismo contra um dublê ARIA; a
   ligação real entre o botão do mês vazio e o `<dialog>` da página não é exercitada por nenhum e2e.
6. **MES-01 não tem o Independent Test que a spec escreveu.** A prova é do `href` com `usePathname`
   dublado, não do percurso.

### Processo, sem gate

7. **REDE-03 AC 5 continua sem resultado definido na spec.** A lacuna está honestamente declarada,
   mas quem redesenhar o esqueleto precisa de um número: "um bloco por região de conteúdo da página"
   ou equivalente. Enquanto isso, `toBe(7)` é rede de regressão da forma atual, não prova do AC.
8. **O estreitamento de um AC durante a execução merece um passo de revisão.** Foi feito depois do
   teste e com justificativa não conferida contra o código. O resultado saiu certo por sorte de
   leitura, não por processo.

---

## Requirement Traceability — atualização

| Requisito | Status anterior | Novo status |
| --- | --- | --- |
| VENC-01 | Execute | ⚠️ Verified com ressalva — ACs 1, 2, 3, 4 e 6 provados; AC 5 coberto pela metade |
| MES-01 | Execute | ✅ Verified — ACs 1 a 3, sem o percurso e2e do Independent Test |
| VAZIO-01 | Execute | ✅ Verified — ACs 1 a 4; AC 1 sem prova de ponta a ponta |
| TOQUE-01 | Execute | ✅ Verified — ACs 1 a 3, medidos em 400px |
| REDE-01 | Execute | ✅ Verified — ACs 1 a 6 |
| REDE-02 | Execute | ⚠️ Verified contra o AC estreitado — ACs 1, 3 e 4 plenos; AC 2 dentro do recorte declarado |
| REDE-03 | Execute | ⚠️ Verified com lacuna de precisão — ACs 1 a 4 provados; AC 5 sem resultado definido pela spec |

---

## Success Criteria da spec

- [x] Os onze mutantes de `painel-e-lancamentos` passam a morrer — os equivalentes desta rodada
      (M1, M2, M7, E1, E2, E3, E4) morreram, todos no teste certo
- [x] Apagar `filtrarLancamentos`, o componente de filtros ou o predicado de um indicador quebra
      algum teste — M1, M2 e M7 confirmam
- [x] "Vencido" devolve linhas num mês passado com pendência — `e2e/busca-e-filtros.spec.ts:316`
- [x] Os dois controles medem ao menos 44 × 44 em 400px, medidos e não declarados —
      `e2e/acessibilidade.spec.ts:128-131`
- [x] A rastreabilidade de `painel-e-lancamentos` recorta requisito por AC —
      `.specs/features/painel-e-lancamentos/spec.md:225-246`, com coluna `ACs` própria nos 20 IDs

---

## Resumo

**Overall**: ✅ Pronto, com dívida nomeada

**Spec-anchored**: 25/27 critérios com assertion que bate com o resultado da spec; 1 lacuna de
precisão da spec; 1 cobertura parcial; 1 AC estreitado durante a fatia, com estreitamento
substantivamente correto e justificativa a corrigir.
**Sensor**: 14/14 mutantes mortos, cada um contra o teste que deveria pegá-lo.
**Gate**: 1.150 provas, 0 falhas, 0 puladas.

**O que funciona**: "Vencido" existe, aparece por texto e filtra; o atalho para o mês corrente
preserva a área e desabilita no mês certo; os dois vazios têm saída; os dois controles mais tocados
medem 44 × 44 pela geometria; busca, filtros e a reconciliação indicador ↔ lista têm rede — e a rede
segura, inclusive em mês passado, que é onde T5 abriu um buraco e T15 fechou.

**O que falta**: corrigir o mecanismo descrito no AD-017; provar a fronteira do eixo caixa; fechar a
metade descoberta de VENC-01 AC 5; e dar à spec um número para a contagem de blocos do esqueleto.

**Próximo passo**: nenhum bloqueio. As seis lacunas Minor viram tasks da próxima fatia; a nº 1 é
correção de texto de decisão e pode ser feita agora.
