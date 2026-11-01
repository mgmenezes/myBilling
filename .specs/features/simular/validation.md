# Simular — Validation

**Date**: 2026-11-01
**Spec**: `.specs/features/simular/spec.md`
**Diff range**: `8bf0731..c6fd28e` (9 commits, T1 a T9, branch `feat/simular`)
**Verifier**: independent sub-agent (author ≠ verifier)

**Verdict**: PASS ✅

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1 | ✅ Done | `b161d04`: `simularCompra` e `menorParcelamentoQueCabe`, códigos novos na union, mensagens em `erros.ts` |
| T2 | ✅ Done | `aa8a606`: `obterHorizonteDeSaldos` |
| T3 | ✅ Done | `521efbf`: `RespostaDaSimulacao`, `apresentarSaldo` extraído |
| T4 | ✅ Done | `3fe58f9`: `valoresIniciais` e `horizonte` no `FormCompra` |
| T5 | ✅ Done | `d925021`: `Simulador` com "Lançar esta compra" |
| T6 | ✅ Done | `35b3a38`: página `/[competencia]/simular` e `e2e/simular.spec.ts` |
| T7 | ✅ Done | `6abf995`: quinto item da navegação, barra em cinco |
| T8 | ✅ Done | `cfa2434`: horizonte no cadastro da Visão geral e de Lançamentos |
| T9 | ✅ Done | `c6fd28e`: AD-024, handoff, roadmap |

Nenhuma task bloqueada ou parcial. A traceability do `spec.md` tem os 5 IDs em `Implementing`.

---

## Spec-Anchored Acceptance Criteria

Fixture dos unitários e do e2e (AD-009): R$ 700,00 sobrando em cada um dos 13 meses de 2026-03 a 2027-03, menos maio, que já falta R$ 500,00 (entrada de R$ 1.000,00, fixo de R$ 300,00, fixo extra de R$ 1.200,00 só em maio).

### SIM-01: O domínio responde se a compra cabe

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| AC 1: uma linha por parcela dentro do horizonte, em ordem, com `competencia`, `parcela`, `saldoAntes` e `saldoDepois = saldoAntes − parcela` | R$ 3.000,00 em 3x: março e abril `70000 → −30000`, maio `−50000 → −150000` | `src/domain/mes/simular-compra.test.ts:58-80` — `expect(simulacao.linhas).toEqual([{ competencia: MARCO, parcela: 100000, saldoAntes: 70000, saldoDepois: -30000, jaFaltava: false }, { … ABRIL … }, { competencia: MAIO, parcela: 100000, saldoAntes: -50000, saldoDepois: -150000, jaFaltava: true }])`; parcela 1 em junho: `:123-124` — `toEqual([JUNHO, JULHO])` | ✅ PASS |
| AC 2: `cabe` ⇔ nenhuma linha com `saldoAntes ≥ 0` e `saldoDepois < 0` | falso em 3.000/3x; verdadeiro em 1.000/3x; zero cabe; um centavo além não cabe | `:81` — `expect(simulacao.cabe).toBe(false)`; `:90` — `toBe(true)`; `:113` — `saldoDepois: 0` e `cabe` `toBe(true)`; `:117` — `expect(simular(70001, 1).cabe).toBe(false)` | ✅ PASS |
| AC 3: `jaFaltava` em toda linha com `saldoAntes < 0`, sem tornar `cabe` falso | maio `jaFaltava: true`, `saldoDepois −83333`, `cabe` verdadeiro | `:97-104` — `expect(simulacao.linhas[2]).toEqual({ competencia: MAIO, parcela: 33333, saldoAntes: -50000, saldoDepois: -83333, jaFaltava: true })` e `expect(simulacao.cabe).toBe(true)`; `:91` — nenhuma linha `jaFaltava` com horizonte sem maio negativo | ✅ PASS |
| AC 4: parcelas além do horizonte → só as linhas até ele, `enxergaAte` = última competência, `parcelasForaDoHorizonte` = omitidas | 24x a partir de março: 13 linhas, `2027-03`, 11 fora | `:143-146` — `toHaveLength(13)`, `linhas.at(-1)?.competencia` `toBe("2027-03")`, `enxergaAte` `toBe("2027-03")`, `parcelasForaDoHorizonte` `toBe(11)`; limiares `:176-185` — 13x → 0 fora, 14x → 1 fora | ✅ PASS |
| AC 5: compra inteira dentro → `parcelasForaDoHorizonte` 0 e `enxergaAte` = última | 0 e `2027-03` | `:165-166` — `expect(simulacao.parcelasForaDoHorizonte).toBe(0)`, `expect(simulacao.enxergaAte).toBe(MARCO_SEGUINTE)` | ✅ PASS |
| AC 6: horizonte vazio, fora de ordem ou com buraco → `err` `HORIZONTE_INVALIDO` | código literal | `:192` — `toEqual({ ok: false, error: { code: "HORIZONTE_INVALIDO" } })`; `:205` e `:217` — `error.code` `toBe("HORIZONTE_INVALIDO")` | ✅ PASS |
| AC 7: parcela 1 antes da primeira ou depois da última → `PRIMEIRA_PARCELA_FORA_DO_HORIZONTE` | código literal nos dois lados (e plano sem parcela) | `:223` (fevereiro, com parcelas dentro), `:229` (abril de 2027), `:241` (plano vazio) — `error.code` `toBe("PRIMEIRA_PARCELA_FORA_DO_HORIZONTE")` | ✅ PASS |
| AC 8: `menorParcelamentoQueCabe` devolve o menor `n` de 1 a `MAX_PARCELAS` que cabe, ou `null` | 5 para R$ 3.000,00 (4x: março −50,00; 5x: 100,00 em março, abril, junho, julho); `null` sem sobra | `:253` — `toBe(5)`; `:256-257` — 4x `cabe` `toBe(false)`, `linhas[0]?.saldoDepois` `toBe(-5000)`; `:261` — 5x `toEqual([10000, 10000, -110000, 10000, 10000])`; `:273-274` — `toBeNull()` e `expect(MAX_PARCELAS).toBe(120)`; `:292` horizonte inválido → `null`; `:296` teto | ✅ PASS |
| AC 9: rateio inválido conta como não cabendo e a busca segue | 2 centavos sobre saldo zero → `null`; 2 centavos com 1 centavo em março e abril → 2 | `:282` — `toBeNull()`; `:288` — `toBe(2)` | ✅ PASS |
| AC 10: `saldoDepois === saldoAntes − parcela` em centavos inteiros | propriedade para `n` de 1 a 13 | `:127-136` — `expect(linha.saldoDepois).toBe(linha.saldoAntes - linha.parcela)` e `expect(Number.isInteger(linha.saldoDepois)).toBe(true)` em toda linha, `toHaveLength(n)` | ✅ PASS |

Independent Test da story (700 por mês, maio −500, R$ 3.000,00 em 3x → −300, −300, −1.500 `jaFaltava`; menor parcelamento 5, 4x colado em −50): é literalmente `:55-82` e `:252-262`.

### SIM-02: A tela "Dá pra comprar?"

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| AC 1: abrir `/[competencia]/simular` com sessão materializa C..C + 12 e mostra o título e os quatro campos | 13 competências literais 2026-03-01..2027-03-01; `h1` "Dá pra comprar?"; rádio de modo, valor, parcelas, mês | `e2e/simular.spec.ts:133` — `heading "Dá pra comprar?" level 1` `toBeVisible()`; `:134-148` — `expect(await competenciasDasOcorrencias()).toEqual(["2026-03-01", …, "2027-03-01"])` (13 literais); os quatro campos localizados em `:231-237` (`radio "Valor total"`, `"Valor total (R$)"`, `"Quantidade de parcelas"`, `"Mês da primeira parcela"`) | ✅ PASS |
| AC 2: o campo "mês da primeira parcela" oferece exatamente as 13 competências de C a C + 12, com C selecionada | 13 valores literais `2026-03`..`2027-03`, rótulos "Março de 2026".."Março de 2027", `value` `2026-03` | `src/components/simulador.test.tsx:84-100` — `expect([...seletor.options].map(o => o.value)).toEqual(COMPETENCIAS)` (13 literais), rótulos `toEqual([...13 literais...])`, `expect(seletor.value).toBe("2026-03")` | ✅ PASS |
| AC 3: valor e parcelas válidos → linhas sem envio ao servidor e sem botão de calcular, com "Vai sobrar"/"Vai faltar" antes e depois e as classes de "Próximos meses" | 1.000/3x: antes 700,00; depois 366,66 / 366,67 e maio "Vai faltar R$ 500,00" → "R$ 833,33"; `enviar` não chamado; nenhum POST | `simulador.test.tsx:110-127` — `definitions` `toEqual(["Vai sobrar R$ 700,00", "Vai sobrar R$ 366,66", "Vai sobrar R$ 700,00", "Vai sobrar R$ 366,67", "Vai faltar R$ 500,00", "Vai faltar R$ 833,33"])`, `expect(enviar).not.toHaveBeenCalled()`, `queryByRole("button", { name: /calcular/i })` `toBeNull()`; classes: `src/components/resposta-da-simulacao.test.tsx:86-101` — `className` `toContain("text-positivo")` / `"text-negativo"` / zero sem as duas; e2e `e2e/simular.spec.ts:150-167` — `expect(chamadas).toEqual([])` com `toHaveText("Vai sobrar R$ 700,00")`, `("Vai sobrar R$ 200,00")` | ✅ PASS |
| AC 4: o saldo "antes" é o que o card "Saldo previsto" daquele mês mostra | abril 700,00 e maio −500,00 nos dois lugares | `e2e/simular.spec.ts:212-220` — antes de abril `toBe("Vai sobrar R$ 700,00")`, maio `toBe("Vai faltar R$ 500,00")`; `/2026-04` card `toHaveText("R$ 700,00")`, `/2026-05` `toHaveText("-R$ 500,00")`; caso de uso: `src/application/mes/obter-horizonte-de-saldos/handler.test.ts:177-181` — `horizonte[0]?.saldo` `toBe(visao.competenciaView.saldo)`, `horizonte.slice(1)…` `toEqual(visao.futuro.map(m => m.saldo))`, `horizonte[2]?.saldo` `toBe(-50000)`; `:190-196` — igual a `saldoPrevistoDaCompetencia` e `projetarProximosMeses` | ✅ PASS |
| AC 5: cabe sem `jaFaltava` → "Cabe. Nenhum mês fica no vermelho." | frase literal | `resposta-da-simulacao.test.tsx:119` — `getByText("Cabe. Nenhum mês fica no vermelho.")`; e2e `:160` idem (1.000/2x) | ✅ PASS |
| AC 6: cabe com `jaFaltava` → "Cabe. <meses> já estava(m) no vermelho antes desta compra." e a linha marcada | "Cabe. Maio já estava no vermelho antes desta compra."; plural "Abril e maio já estavam…"; marca "já estava no vermelho" só na linha de maio | `resposta-da-simulacao.test.tsx:128` — frase literal; `:140` — `toBe("Cabe. Abril e maio já estavam no vermelho antes desta compra.")`; `:110-111` — `getByText(/já estava no vermelho/)` em abril, `queryByText` `toBeNull()` em março; e2e `:176-183` — frase literal, `maio` `toContainText("já estava no vermelho")`, março `not.toContainText` | ✅ PASS |
| AC 7: não cabe em `n`, menor é `m` → "Em <n>x não cabe: <meses> fica(m) no vermelho. Em <m>x cabe.", meses em minúsculas, vírgula e "e", "de <ano>" só fora do ano de C | "Em 3x não cabe: março e abril ficam no vermelho. Em 5x cabe."; singular "abril fica"; "novembro, dezembro e janeiro de 2027 ficam" | `resposta-da-simulacao.test.tsx:154` — frase literal (maio `jaFaltava` não listado); `:166` — `toBe("Em 2x não cabe: abril fica no vermelho. Em 4x cabe.")`; `:182-184` — `toBe("Em 4x não cabe: novembro, dezembro e janeiro de 2027 ficam no vermelho. Em 7x cabe.")`; e2e `:193` — frase literal com `m` vindo do domínio de verdade; modo parcela: `simulador.test.tsx:148` | ✅ PASS |
| AC 8: não cabe em nenhum → "… Não cabe em nenhum parcelamento até 120x." | frase literal | `resposta-da-simulacao.test.tsx:194-196` — `getByText("Em 1x não cabe: março fica no vermelho. Não cabe em nenhum parcelamento até 120x.")` | ✅ PASS |
| AC 9: `parcelasForaDoHorizonte > 0` → "Enxergo até <Mês de ano>." | "Enxergo até Março de 2027." se e só se há parcelas fora | `resposta-da-simulacao.test.tsx:204` — `getByText("Enxergo até Março de 2027.")` com 11 fora; `:208` — `queryByText(/Enxergo até/)` `toBeNull()` sem fora; e2e `:204-206` — 24x: `toHaveCount(13)`, frase literal, "Março de 2027" com "Parcela R$ 100,00" | ✅ PASS |
| AC 10: valor vazio ou não-reais → "Informe o valor para ver a resposta." e nenhuma linha | frase literal, região ausente, zero `listitem` | `simulador.test.tsx:155-157` — `getByText("Informe o valor para ver a resposta.")`, região `toBeNull()`, `queryAllByRole("listitem")` `toHaveLength(0)`; `:164-165` — "abc" idem | ✅ PASS |
| AC 11: parcelas fora de 1..120 ou valor pequeno demais → a mensagem do cadastro junto do campo e nenhuma linha | "A quantidade de parcelas precisa estar entre 1 e 120." (0 e 121; 1 e 120 não); "O valor é pequeno demais para esse número de parcelas." (R$ 0,01 em 2x) | `simulador.test.tsx:174-191` — `aria-invalid` `toBe("true")`, elemento de `aria-describedby` `.textContent` `toBe(MENSAGEM)` em 0 e 121; em 1 e 120 `queryByText(MENSAGEM)` `toBeNull()` e 1 / 13 linhas; `:199-203` — `aria-describedby` do valor `toBe("O valor é pequeno demais para esse número de parcelas.")`, região `toBeNull()` | ✅ PASS |
| AC 12: em 400 × 800 os quatro campos e o veredito ficam na área visível, sem rolar | `y + height ≤ 800` e `y ≥ 0` nos cinco alvos; sem transbordo horizontal | `e2e/simular.spec.ts:238-247` — `expect(y + height).toBeLessThanOrEqual(800)`, `expect(y).toBeGreaterThanOrEqual(0)` para rádio, valor, parcelas, mês e o veredito; `expect(transborda).toBe(false)` | ✅ PASS |
| AC 13: em ≥768 px a mesma moldura estreita (`AreaEstreita`) | o `h1` dentro de `.max-w-conteudo` (`src/components/area-estreita.tsx:17`) | `e2e/simular.spec.ts:249-253` — em 1024 px, `h1.closest(".max-w-conteudo")?.className` `toContain("max-w-conteudo")` | ✅ PASS |

Independent Test da story: as frases e os 366,66 / 366,67 / 366,67 estão em `src/components/form-compra.test.tsx:660-672` (1.000/3x, "Cabe. Nenhum mês fica no vermelho.", três linhas, seis definições literais) e no e2e `:193` (3.000/3x → "Em 3x não cabe: março e abril ficam no vermelho. Em 5x cabe."). O e2e semeia o fixo extra de maio desde o início, então na tela 1.000/3x alcança maio e sai como "Cabe. Maio já estava no vermelho antes desta compra." (`:177`); o cenário "Cabe. Nenhum mês" é provado com 1.000/2x (`:160`). Cobertura equivalente; a diferença fica registrada.

### SIM-03: "Simular" na navegação

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| AC 1: exatamente cinco áreas, nesta ordem, e Simular leva a `/[competencia]/simular` | `["Visão geral", "Lançamentos", "Todo mês", "Cadastros", "Simular"]`; `href` `/2026-07/simular` | `src/components/navegacao-principal.test.tsx:60-61` — `expect(nomes).toEqual(["Visão geral", "Lançamentos", "Todo mês", "Cadastros", "Simular"])`; `:67-69` — `getAttribute("href")` `toBe("/2026-07/simular")`; `src/components/menu-lateral.test.tsx:47` — `toHaveLength(5)`; e2e `:295-301` e `e2e/categorias.spec.ts:547-553` — `toHaveText([...5 literais...])` | ✅ PASS |
| AC 2: caminho terminando em `/simular` → só Simular com `aria-current="page"` | `ativas()` igual a `["Simular"]` | `navegacao-principal.test.tsx:139-149` — `it.each([..., ["/2026-03/simular", "Simular"]])` com `expect(ativas()).toEqual([area])`; e2e `:302-305` — `toHaveAttribute("aria-current", "page")` | ✅ PASS |
| AC 3: em 360 e 400 px cada rótulo numa linha e a altura de cada link igual à dos demais | `linhasDoRotulo === 1` em cada item; um só valor de altura | `e2e/simular.spec.ts:288-329` — para cada largura, `expect(item.linhasDoRotulo).toBe(1)` e `expect(new Set(itens.map(i => i.altura)).size).toBe(1)`; `e2e/categorias.spec.ts:567` — mesma altura em 400 px | ✅ PASS |
| AC 4: em 360 e 400 px cada link com ≥ 44 px e sem rolagem horizontal | `altura ≥ 44`; `left ≥ 0`, `right ≤ largura`, `scrollWidth ≤ clientWidth`; página sem transbordo | `e2e/simular.spec.ts:323-334` — `toBeGreaterThanOrEqual(44)`, `toBeGreaterThanOrEqual(0)`, `toBeLessThanOrEqual(largura)`, `transborda` `toBe(false)` por item e para `documentElement`; `e2e/categorias.spec.ts:544, 560-564` | ✅ PASS |
| AC 5: em ≥ 768 px o texto de 15 px e a coluna lateral | `fontSize` `"15px"` nos cinco; `top` crescente | `e2e/simular.spec.ts:351-355` — `expect(medidas.map(m => m.fonte)).toEqual(Array(5).fill("15px"))`, cada `topo` `toBeGreaterThan` do anterior | ✅ PASS |

Independent Test da story (360 × 740, `scrollWidth ≤ clientWidth`, uma linha, mesma altura, `aria-current`): é `e2e/simular.spec.ts:288-336`.

### SIM-04: Lançar esta compra

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| AC 1: com resposta válida há o botão "Lançar esta compra" | ausente sem valor, presente com 1.000/3x | `src/components/simulador.test.tsx:210-213` — `queryByRole("button", { name: "Lançar esta compra" })` `toBeNull()` antes, `getByRole(...)` `toBeTruthy()` depois | ✅ PASS |
| AC 2: o clique abre o `FormCompra` com modo, valor e parcelas iguais, competência da parcela inicial igual ao mês escolhido e data padrão de `dataPadraoDoLancamento` | valor "1.000,00", parcelas "3", data "2026-05-01" com maio escolhido (dia 1), prévia "1/3 Maio de 2026R$ 333,34" …; hoje "2026-03-04" no mês corrente; modo parcela "60,00" | `simulador.test.tsx:235-254` — `.value` `toBe("1.000,00")`, `toBe("3")`, `toBe("2026-05-01")`, prévia `toEqual(["1/3 Maio de 2026R$ 333,34", "2/3 Junho de 2026R$ 333,33", "3/3 Julho de 2026R$ 333,33", "Total da compraR$ 1.000,00"])`; `:262` — `toBe("2026-03-04")`; `:272-274` — `"60,00"` no modo parcela; preenchimento no próprio formulário: `src/components/form-compra.test.tsx:732-743` e `:748-751`; e2e `:266-267` — `toHaveValue("1.000,00")`, `toHaveValue("3")` | ✅ PASS |
| AC 3: chave de idempotência gerada ao montar o formulário, não ao gravar | `input[name="idempotencyKey"]` com UUID antes de qualquer envio; ausente antes do clique | `simulador.test.tsx:283-285` — `expect(chave.value).toMatch(/^[0-9a-f-]{36}$/)`, `expect(enviar).not.toHaveBeenCalled()`; `:225` — `toBeNull()` antes do clique | ✅ PASS |
| AC 4: gravar pelo `criarCompra`, com a mesma validação e as mesmas mensagens | status "Compra A gravada em 3 parcelas." | `e2e/simular.spec.ts:268-270` — `form.getByRole("status")` `toContainText("Compra A gravada em 3 parcelas.")`; a action é a mesma por prop (`src/app/(app)/[competencia]/simular/page.tsx:76` — `enviar={criarCompra}`); os caminhos de erro do formulário são os pré-existentes de `form-compra.test.tsx` ("exibe o erro devolvido pela action no campo que ele endereça") | ✅ PASS |
| AC 5: gravada → confirmação e horizonte relido, "antes" vira o "depois" simulado | março "Vai sobrar R$ 366,66" e abril "R$ 366,67" como "antes" | `e2e/simular.spec.ts:274-275` — `toHaveText("Vai sobrar R$ 366,66")` (março), `toHaveText("Vai sobrar R$ 366,67")` (abril), depois de `:261` ter mostrado 366,67 como "depois" | ✅ PASS |
| AC 6: abrir o mês seguinte mostra "Saldo previsto" igual ao `saldoDepois` simulado | abril "R$ 366,67", março "R$ 366,66" | `e2e/simular.spec.ts:277-280` — `cardSaldoPrevisto` `toHaveText("R$ 366,67")` em `/2026-04`, `toHaveText("R$ 366,66")` em `/2026-03` | ✅ PASS |
| AC 7: antes do clique não há formulário nem descrição, categoria, meio e pessoa | tudo `null` | `simulador.test.tsx:220-225` — `queryByRole("form", { name: "Nova compra" })`, `queryByLabelText("Descrição")`, `/Categoria/`, `/Meio de pagamento/`, `/Quem comprou|Pessoa/` e `input[name="idempotencyKey"]` todos `toBeNull()`; e2e `:262` — `toHaveCount(0)` | ✅ PASS |

Independent Test da story (1.000/3x em março, "Compra A", abril 366,67, março 366,66): é `e2e/simular.spec.ts:256-281`.

### SIM-05: A resposta dentro do cadastro de compra

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| AC 1: com horizonte, o bloco abaixo da prévia, com linhas e veredito | vizinho seguinte da prévia; "Cabe. Nenhum mês fica no vermelho."; 3 linhas; 366,66 / 366,67 / 366,67 | `src/components/form-compra.test.tsx:659-672` — `expect(previa.nextElementSibling?.contains(resposta)).toBe(true)`, frase literal, `toHaveLength(3)`, definições `toEqual(["Vai sobrar R$ 700,00", "Vai sobrar R$ 366,66", "Vai sobrar R$ 700,00", "Vai sobrar R$ 366,67", "Vai sobrar R$ 700,00", "Vai sobrar R$ 366,67"])`; não cabe: `:709-713` — "Em 3x não cabe: março, abril e maio ficam no vermelho. Em 5x cabe." | ✅ PASS |
| AC 2: sem horizonte, sem bloco | região ausente | `form-compra.test.tsx:680` — `queryByRole("region", { name: "Resposta da simulação" })` `toBeNull()` | ✅ PASS |
| AC 3: mudar a prévia recalcula o bloco com o mesmo plano | 3 → 2 linhas, 200,00 cada | `form-compra.test.tsx:690-700` — `toHaveLength(2)`, definições `toEqual(["Vai sobrar R$ 700,00", "Vai sobrar R$ 200,00", "Vai sobrar R$ 700,00", "Vai sobrar R$ 200,00"])` | ✅ PASS |
| AC 4: sem botão "Lançar esta compra" dentro do `FormCompra` | `null` dentro do `form` | `form-compra.test.tsx:720-725` — `within(form).queryByRole("button", { name: "Lançar esta compra" })` `toBeNull()` | ✅ PASS |
| AC 5: Visão geral e Lançamentos passam o horizonte de C a C + 12 lido por `obterVisaoMensal` | bloco dentro do `form "Nova compra"`, 3 linhas, "antes" de abril igual à linha de abril em "Próximos meses", "depois" = antes − 66,67; Avulso sem bloco; diálogo de Lançamentos com 2 linhas | `e2e/simular.spec.ts:388-403` — frase literal, `toHaveCount(3)`, `toHaveText(\`Vai sobrar ${sobraDeAbril}\`)`, `toHaveText(\`Vai sobrar ${reais(centavosDe(sobraDeAbril) - 6667)}\`)`; `:405-406` — Avulso `toHaveCount(0)`; `:419-420` — diálogo "Cabe. Nenhum mês fica no vermelho.", `toHaveCount(2)`; a mesma definição de saldo: `obter-horizonte-de-saldos/handler.test.ts:177-181` | ✅ PASS |

Independent Test da story: `e2e/simular.spec.ts:377-407` usa R$ 200,00 em 3x e sai "Cabe. Maio já estava no vermelho antes desta compra." porque roda depois de "Compra A" e com o fixo extra de maio; o par 1.000/3x → "Cabe. Nenhum mês" com três linhas é `form-compra.test.tsx:653-673`. Cobertura equivalente.

**Status**: ✅ All ACs covered (40/40), 0 ACs com spec-precision gap. Um spec-precision gap fora dos ACs (ver sensor, M14).

---

## Edge Cases

- [x] Compra com 1 parcela: `simular-compra.test.ts:107-114` — uma linha `{ MARCO, 70000, 70000, 0, false }` e `cabe`; na tela `simulador.test.tsx:185-187` — 1 `listitem`
- [x] Primeira parcela em C + 12 com 2x: `simular-compra.test.ts:169-174` — `toEqual([MARCO_SEGUINTE])`, `parcelasForaDoHorizonte` `toBe(1)`; a frase "Enxergo até Março de 2027." com `parcelasForaDoHorizonte > 0` em `resposta-da-simulacao.test.tsx:204`; a composição tela → frase em `e2e/simular.spec.ts:205` (24x)
- [x] Menor parcelamento menor que o pedido (busca começa em 1): `simular-compra.test.ts:265` — `toBe(1)`; a frase "Em <m>x cabe." não depende de `m < n` (`resposta-da-simulacao.tsx:73`)
- [x] `saldoDepois` exatamente 0: `simular-compra.test.ts:110-113` — `saldoDepois: 0` e `cabe` `toBe(true)`; `resposta-da-simulacao.test.tsx:97-101` — `"Vai sobrar R$ 0,00"` sem `text-positivo` nem `text-negativo`
- [x] `saldoAntes < 0` que fica mais negativo: `simular-compra.test.ts:97-104` (−50000 → −83333, `jaFaltava`, `cabe`); `resposta-da-simulacao.test.ts:110` ("já estava no vermelho") e `:154` (maio −50000 → −150000 não entra em "março e abril ficam no vermelho")
- [~] Competência sem lançamento nenhum: saldo "antes" 0 provado no caso de uso (`obter-horizonte-de-saldos/handler.test.ts:159` — abril `toBe(0)`) e a apresentação de zero em `resposta-da-simulacao.test.tsx:98` ("Vai sobrar R$ 0,00"); nenhum teste abre a tela com base vazia. Coberto por partes; observação não bloqueante
- [x] Virada de ano: `obter-horizonte-de-saldos/handler.test.ts:103-117` (novembro → novembro seguinte, 13 literais); `resposta-da-simulacao.test.tsx:182-184` ("janeiro de 2027")
- [x] `menorParcelamentoQueCabe` com total menor que 120 centavos: `simular-compra.test.ts:282` (2 centavos → `null`) e `:288` (2 centavos → 2)

---

## Discrimination Sensor

Scratch isolado: `git worktree add --detach .worktrees/verifier-simular HEAD` + `pnpm install --offline --frozen-lockfile` + cópia do `.env.local`. Baseline `git status --porcelain` da worktree real antes do sensor: vazio. Cada mutante aplicado por um helper que exige ocorrência única do trecho, testado e restaurado com `git checkout --` antes do seguinte; Playwright nunca em paralelo (porta 3100).

| Mutation | File:line | Description | Tests run | Killed? |
| --- | --- | --- | --- | --- |
| M1 | `src/domain/mes/simular-compra.ts:111` | `cabe` ignora `jaFaltava` (toda linha negativa derruba) | unit `simular-compra.test.ts` | ✅ Killed (`:104` `cabe` esperado `true`; `:253` esperado 5, recebeu `null`) |
| M2 | `simular-compra.ts:103` | `saldoDepois = saldoAntes + parcela` | unit | ✅ Killed (11 falhas: `:58`, `:87`, `:97`, `:131`, …) |
| M3 | `simular-compra.ts:113` | `parcelasForaDoHorizonte` sempre 0 | unit | ✅ Killed (`:146`, `:158`, `:173`, `:184`) |
| M4 | `simular-compra.ts:136` | busca começa em `n = 2` | unit | ✅ Killed (`:265` esperado 1, recebeu 2) |
| M5 | `simular-compra.ts:149` | devolve o primeiro `n` que NÃO cabe | unit | ✅ Killed (6 falhas: `:253`, `:265`, `:273`, `:282`, `:288`, `:296`) |
| M6 | `src/application/mes/obter-horizonte-de-saldos/handler.ts:34` | janela até C + 11 | unit `handler.test.ts` | ✅ Killed (5 falhas: `:95`, `:129` por valor, `:139` espião, `:178`, `:191`) |
| M7 | `handler.ts:38` | começa em C + 1 (12 itens) | unit | ✅ Killed (6 falhas: `:80`, `:103`, `:128`, …) |
| M8 | `src/components/resposta-da-simulacao.tsx:68` | "fica"/"ficam" trocados | unit `resposta-da-simulacao.test.tsx` | ✅ Killed (`:154`, `:166`, `:182`, `:194`) |
| M9 | `resposta-da-simulacao.tsx:35` | "de <ano>" sempre presente | unit | ✅ Killed (6 falhas: `:128`, `:140`, `:154`, `:166`, `:182`, `:194`) |
| M10 | `src/components/navegacao-principal.tsx:74-79` | Simular como quarto item (antes de Cadastros) | unit `navegacao-principal.test.tsx`, `menu-lateral.test.tsx` | ✅ Killed (`:61` ordem literal) |
| M11 | `src/components/simulador.tsx:98` | `FormCompra` montado antes do clique (`lancando` nasce `true`) | unit `simulador.test.tsx` | ✅ Killed (12 falhas, entre elas `:220-225` AC 7) |
| M12 | `src/components/form-compra.tsx:190-193` | bloco renderizado mesmo sem `horizonte` | unit `form-compra.test.tsx` | ✅ Killed (`:680` AC 2 e 12 testes pré-existentes) |
| M13 | `simulador.tsx:277-278` | formulário aberto com a competência aberta em vez do mês escolhido | unit | ✅ Killed (`:241` esperado `2026-05-01`, recebeu `2026-03-04`) |
| M14 | `navegacao-principal.tsx:123` | `text-[11px]` → `text-[13px]` no celular | e2e `e2e/simular.spec.ts --grep SIM-03` (360, 400, 1024) | ❌ Survived — **equivalente à spec** (ver nota) |
| M15 | `src/app/(app)/[competencia]/simular/page.tsx:48` | a página materializa só até C + 11 | e2e `e2e/simular.spec.ts:129` | ✅ Killed (`:134` esperava 13 competências) |

**Sensor depth**: expandido (15 mutantes, ≥5), por ser a cena de venda do diferencial e por tocar a gravação.
**Result**: 14/15 killed; o sobrevivente não viola nenhum AC — PASS ✅ com spec-precision gap registrado.

Nota sobre M14: medi a barra no rascunho com o mutante aplicado (spec temporário, só no scratch). Em 13 px e 360 px os cinco rótulos continuam em uma linha, todos os links com 59,5 px de altura (56,5 em 11 px), `scrollWidth === clientWidth` em cada um e `documentElement.scrollWidth` 360; "Lançamentos" ocupa 86,6 px e os demais encolhem (61,8 a 72,6 px). Em 400 px, idem. Ou seja, as medidas que os ACs 3 e 4 de SIM-03 exigem valem nos dois tamanhos: o mutante é indistinguível pela spec. Os 11 px são a decisão do dono na tabela de Assumptions ("Os mesmos rótulos de hoje em 11 px no celular"), mas nenhum AC os fixa, e nenhum teste os mede (só o AC 5 mede 15 px em ≥768). Também contradiz o comentário de `navegacao-principal.tsx:29` ("Em 13 px ele não cabia"): cabe, desde que sem o respiro (`gap-0`, `px-0.5`). Não é falha de código nem de teste; é uma lacuna de precisão da spec. Lição registrada (`spec_precision_gap`).

Isolamento: `git worktree remove --force` do rascunho e `git worktree prune`. O `git status --porcelain` da worktree real mostra `M next-env.d.ts`: o `next dev` do e2e rodado na própria worktree regrava esse arquivo (como `AGENTS.md` avisa); é o baseline previsto pelo orquestrador. Nenhum arquivo de código ou teste da worktree real foi alterado; o único arquivo criado é este relatório.

---

## Interactive UAT Results

Não realizado nesta rodada: fica a cargo do orquestrador oferecer a UAT da tela ao dono (a feature é de interface). Os checks automatizados cobrem título, campos, resposta, barra em 360/400/1024 e o ciclo simular → lançar → saldo.

---

## Code Quality

| Principle | Status |
| --- | --- |
| Minimum code | ✅ Duas funções puras, um caso de uso de 15 linhas, três componentes, uma página, duas props opcionais no `FormCompra`, um item na navegação |
| Surgical changes | ✅ 29 arquivos no diff, todos exigidos pelas tasks; `horizonte-futuro.tsx` só perdeu `apresentarSaldo` para o módulo compartilhado |
| No scope creep | ✅ Nada de fatura, landing, saldo acumulado, compra em andamento ou persistência de simulação; "Próximos meses" continua em 3 |
| Matches patterns | ✅ `Result` sem exceção e sem `Date` no domínio (`arquitetura.test.ts` verde); `_centavos`/`Cents` inteiros; `'YYYY-MM'` com `addMeses`; um caso de uso por diretório; Server Action existente (`criarCompra`); mensagens em `src/lib/erros.ts`; testes co-locados; sem `any` |
| Spec-anchored outcome check (asserted values match spec) | ✅ Todas as frases do veredito assertadas literalmente; 366,66/366,67, 13 competências, 11 parcelas fora, 5x, −R$ 50,00 literais |
| Per-layer Coverage Expectation met | ✅ Domínio 1:1 com os 10 ACs e os 8 edge cases, 100% de branches (414/414 no projeto); caso de uso com todo ramo e espião; componentes com todo ramo de apresentação por `within`; página e navegação com e2e em 360, 400 e 1024 px (L-055) e composição tela → card (L-014) |
| Every test maps to a spec requirement — no unclaimed tests | ✅ Os 69 unitários novos e os 12 e2e citam o AC no nome ou no `describe`; os dois testes pré-existentes alterados (quatro → cinco áreas) citam SIM-03, AC 1 |
| Documented guidelines followed | ✅ `AGENTS.md` (AD-001, AD-002, AD-003, AD-006, AD-009, AD-010); AD-024 registrado em `STATE.md` |
| AD-009: nenhum dado real | ✅ "Entrada A", "Fixo A/B", "Compra A", "Pessoa A", "Cartão Roxo", `pessoa-a@example.com`; valores 700, 500, 1.000, 3.000 escolhidos pela conta |

---

## Gate Check

- **Gate command**: `pnpm verify` é `typecheck && lint && test:unit && test:integration && build`; rodei os quatro primeiros por partes na worktree real com o Postgres do Docker (porta 5433) e o e2e da fatia. O `build` foi rodado pelo `pnpm verify` da T9 (registrado em `tasks.md`); aceito esse registro.
- **Result**: `pnpm typecheck` exit 0; `pnpm lint` exit 0 (Biome: 380 arquivos, sem apontamento); `pnpm test:unit` exit 0 — 136 arquivos, **2.164 passed**, 0 failed, cobertura de `src/domain` 100% em statements (771/771), **branches (414/414)**, functions (189/189) e lines (727/727); `pnpm test:integration` exit 0 — 25 arquivos, **413 passed**; `pnpm exec playwright test e2e/simular.spec.ts e2e/categorias.spec.ts` exit 0 — **18 passed** (12 + 6, 40,9 s). A suíte e2e completa (279) foi rodada nos gates da T8 e está registrada em `tasks.md`.
- **Test count before feature**: 2.095 unitários, 413 de integração, 267 e2e (validation de `horizonte-doze-meses`)
- **Test count after feature**: 2.164 unitários, 413 de integração, 279 e2e
- **Delta**: +69 unitários, +0 de integração, +12 e2e
- **Skipped tests**: nenhum
- **Failures**: nenhuma
- **Test Integrity**: nenhuma contagem diminuiu; nenhuma assertion enfraquecida. Os literais "quatro" → "cinco" em `navegacao-principal.test.tsx:61`, `menu-lateral.test.tsx:47` e `e2e/categorias.spec.ts:547-553` ganharam um item assertado, não perderam.

---

## Fix Plans

Nenhum bloqueante. Uma sugestão (Minor), para o orquestrador decidir com o dono:

### Fix 1 (opcional): fixar os 11 px do celular num AC e medi-los

- **Root cause**: a decisão "11 px no celular" vive na tabela de Assumptions, sem AC e sem teste; o sensor mostrou que 13 px também passa em todos os ACs de SIM-03.
- **Fix task**: acrescentar a SIM-03 um AC "WHEN a barra é exibida abaixo de 768 px THEN o texto dos itens mede 11 px" e, em `e2e/simular.spec.ts:288-336`, assertar `getComputedStyle(link).fontSize === "11px"` nos cinco links em 360 e 400 px (espelho do AC 5). Ou, se o dono preferir só o resultado (uma linha, 44 px, sem transbordo), deixar como está e corrigir o comentário de `navegacao-principal.tsx:29`.
- **Priority**: Minor

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| --- | --- | --- |
| SIM-01 | Implementing | ✅ Verified |
| SIM-02 | Implementing | ✅ Verified |
| SIM-03 | Implementing | ✅ Verified |
| SIM-04 | Implementing | ✅ Verified |
| SIM-05 | Implementing | ✅ Verified |

(O Verifier não edita `spec.md`; a atualização acima fica para o orquestrador aplicar no fechamento.)

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 40/40 ACs matched spec outcome, 0 ACs com spec-precision gap; 1 spec-precision gap fora dos ACs (11 px da barra no celular)
**Sensor**: 14/15 mutations killed; o sobrevivente (M14) é equivalente à spec, medido
**Gate**: typecheck 0, lint 0, 2.164 unit (414/414 branches), 413 integration, 18/18 e2e da fatia

**What works**: a conta do domínio (linhas, `cabe`, `jaFaltava`, fim do horizonte, menor parcelamento, erros); os 13 saldos de C a C + 12 iguais ao card "Saldo previsto"; as cinco frases do veredito literais; a tela sem servidor, com as mensagens do cadastro junto do campo; "Lançar esta compra" abrindo o `FormCompra` preenchido com chave de idempotência ao montar e gravando pelo `criarCompra`, com o card de abril virando 366,67; a barra de cinco itens em 360 e 400 px; o bloco no cadastro da Visão geral e de Lançamentos.

**Issues found**: nenhum bloqueante. Observações: (1) 11 px do celular não fixados em AC nem medidos (M14); (2) comentário de `navegacao-principal.tsx:29` contradiz a medição; (3) o edge case "competência sem lançamento nenhum" é coberto por partes, sem teste que abra a tela com base vazia; (4) o Independent Test de SIM-02 e o de SIM-05 saem no e2e com variantes do veredito por causa do fixo extra de maio semeado desde o início (cobertura equivalente nos unitários).

**Next steps**: orquestrador marca os 5 IDs como Verified no `spec.md`, oferece a UAT da tela ao dono e decide sobre o Fix 1 (opcional). Merge e `git push` continuam exigindo autorização separada.
