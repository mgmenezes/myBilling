# mvp-gestao-financeira Validation

**Veredito: FAIL ❌**

**Result**: FAIL

**Date**: 2026-09-14
**Spec**: `.specs/features/mvp-gestao-financeira/spec.md`
**Diff range verificado**: `f487887..f62f27c` (67 commits, 137 arquivos, +20.895 / −322)
**Verifier**: sub-agente independente (author ≠ verifier). Cobertura re-derivada do zero a partir do `spec.md`; nenhuma conclusão herdada do `STATE.md` nem dos implementadores.

**Por que FAIL, em uma frase**: o núcleo aritmético do produto — rateio, competência, virada de ano, compra em andamento, separação dos dois eixos — está coberto com precisão e resiste a mutação; mas **6 acceptance criteria não têm nenhuma assertion**, e um deles (MOV-02 AC 2) é a garantia estrutural anti-dupla-contagem que o `AD-003` chama de "impossível de compilar" — e que uma mutação atravessou **todos** os gates sem ser detectada.

---

## 1. Gates (executados por este verificador)

| Gate | Comando | Resultado | Exit |
| --- | --- | --- | --- |
| Unit | `pnpm test:unit` | 26 arquivos, **358 testes**, 0 falhas. Cobertura `src/domain`: statements 247/247, **branches 128/128**, funções 79/79, linhas 227/227 | **0** |
| Integration | `pnpm test:integration` | 8 arquivos, **112 testes**, 0 falhas (Postgres real em Docker, porta 5433 — AD-010) | **0** |
| E2E | `pnpm test:e2e` | **10 testes**, 0 falhas (Chrome do sistema, `NODE_ENV=test` + `AUTH_PROVIDER_DE_TESTE=1`) | **0** |
| Build | `pnpm verify` (`typecheck && lint && test:unit && test:integration && build`) | tudo verde, `✓ Compiled successfully` | **0** |

**Integridade da suíte**: 0 testes com `skip`, `only` ou `todo`; 0 testes sem assertion. Contagem total **480** (358 + 112 + 10).
O `STATE.md` declara "345 unit + 112 integration + 10 e2e"; a execução real deu **358** unit. Divergência para mais, não para menos — nenhum teste foi removido.
`next-env.d.ts` ficou sujo após o e2e e foi restaurado com `git checkout --`. Árvore final limpa.

---

## 2. Checagem ancorada no spec — evidence-or-zero

67 acceptance criteria em 10 histórias. **60 cobertos com evidência localizada**, **1 parcial**, **6 sem nenhuma evidência**.

### P1 — Compra parcelada com distribuição automática (PARC-01..05, DADO-01)

| AC | Resultado que o spec define | `arquivo:linha` + expressão da assertion | Result |
| --- | --- | --- | --- |
| 1 | 3 parcelas `33334, 33333, 33333` em `2026-03/04/05` | `src/domain/parcelamento/ratear-parcelas.test.ts:26` — `expect(rateioOk(100000, 3)).toEqual([33334, 33333, 33333])`; `src/domain/parcelamento/gerar-parcelas.test.ts:46` — `expect(plano.parcelas).toEqual([{numero:1,valor:33334,competencia:"2026-03"},{numero:2,valor:33333,competencia:"2026-04"},{numero:3,valor:33333,competencia:"2026-05"}])`; `src/infrastructure/db/repositories/compra.repository.integration.test.ts:152` — `expect(resultado.value.parcelas.map((p) => p.valor)).toEqual([33334, 33333, 33333])`; `src/app/actions/compras.integration.test.ts:227` — `expect(resultado.data.parcelas).toEqual([{numero:1,valorCentavos:33334,competencia:"2026-03"}, …])` | ✅ |
| 2 | `Σ parcelas + amortizado === total`, em centavos | `src/domain/parcelamento/gerar-parcelas.test.ts:39` — `return somaParcelas + plano.valorAmortizadoAnterior === plano.valorTotal` (invocado em `:53`, `:66`, `:77`, `:84`, `:100`, `:129`, `:154`, `:162`); `src/domain/parcelamento/ratear-parcelas.test.ts:99` — `expect(soma(parcelas)).toBe(total)` sob `fc.assert` com 2000 execuções sobre `total ∈ [1, 10.000.000]` × `n ∈ [1,120]`; `src/infrastructure/db/repositories/compra.repository.integration.test.ts:230` — `expect(resultado.error.code).toBe("CONSERVACAO_VIOLADA")` e `:231` — `expect(resultado.error.detalhes).toEqual({ somaGravada: 100000, valorTotal: 99999 })` | ✅ |
| 3 | um centavo para cada uma das **primeiras** `resto` parcelas | `src/domain/parcelamento/ratear-parcelas.test.ts:37` — `expect(parcelas).toEqual([14286,14286,14286,14286,14286,14286,14285])`; `:38` — `expect(parcelas.filter((p) => p === 14286)).toHaveLength(6)`; `:138` — `expect(parcelas[i-1]).toBeGreaterThanOrEqual(Number(parcelas[i]))` (monotonicidade, 2000 execuções) | ✅ |
| 4 | `total = parcela × n`, todas idênticas, resto zero | `src/domain/parcelamento/gerar-parcelas.test.ts:96` — `expect(plano.valorTotal).toBe(77900)`; `:98` — `expect(plano.parcelas.map((p) => p.valor)).toEqual(Array.from({length:10}, () => 7790))`; `:99` — `expect(new Set(plano.parcelas.map((p) => p.valor)).size).toBe(1)` | ✅ |
| 5 | código `PARCELA_INFERIOR_A_UM_CENTAVO`, nada persistido | `src/domain/parcelamento/ratear-parcelas.test.ts:46` — `expect(isErr(resultado) && resultado.error.code).toBe("PARCELA_INFERIOR_A_UM_CENTAVO")`; `src/domain/parcelamento/gerar-parcelas.test.ts:187` idem + `:188` — `expect("value" in resultado).toBe(false)`; `src/infrastructure/db/restricoes.integration.test.ts:227` — `expect(erro.constraint).toBe("compra_parcelada_parcela_min_um_centavo")`; `src/application/compras/criar-compra-parcelada/handler.test.ts:274` — `expect(fakes.estado.movimentos.size).toBe(0)` | ✅ |
| 6 | código `QTD_PARCELAS_INVALIDA` | `src/domain/parcelamento/gerar-parcelas.test.ts:171` — `expect(isErr(resultado) && resultado.error.code).toBe("QTD_PARCELAS_INVALIDA")` para `n ∈ {0,121}` e `:221` para `{NaN, ±Infinity, 2.5}`; `src/app/actions/compras.integration.test.ts:134` — `expect(resultado.erro.campos?.qtdParcelas).toBe("A compra pode ter no máximo 120 parcelas.")` | ✅ |
| 7 | código `VALOR_NAO_POSITIVO` | `src/domain/parcelamento/gerar-parcelas.test.ts:179` — `expect(isErr(resultado) && resultado.error.code).toBe("VALOR_NAO_POSITIVO")`; `src/domain/shared/money.ts` via `src/domain/shared/money.test.ts`; `src/components/form-compra.test.tsx:247` — `expect(screen.getByText("O valor precisa ser maior que zero.")).toBeDefined()` | ✅ |
| 8 | transação revertida; compra nunca fica sem parcelas | `src/infrastructure/db/repositories/compra.repository.integration.test.ts:202` — `expect(motivo).toMatch(/falha simulada ao inserir a terceira parcela/)`; `:203` — `expect(await contar("compra_parcelada")).toBe(0)`; `:204` — `expect(await contar("movimento")).toBe(0)` (gatilho Postgres que derruba a **terceira** parcela, com duas já inseridas) | ✅ |
| 9 | devolve a compra já criada; contagem de parcelas inalterada | `src/infrastructure/db/repositories/compra.repository.integration.test.ts:248` — `expect(segundo.value.id).toBe(primeiro.value.id)` + `:250` — `expect(await contar("compra_parcelada")).toBe(1)` + `:251` — `expect(await contar("movimento")).toBe(3)`; `:306` (corrida real no `catch` de colisão) — `expect(segundo.value.parcelas.map((p) => p.numeroParcela)).toEqual([1,2,3])`; `src/app/actions/compras.integration.test.ts:258` — `expect(segunda.data.jaExistia).toBe(true)`; `src/components/form-compra.test.tsx:148` — `expect(enviado?.idempotencyKey).toBe(chaveAoAbrir)` | ✅ |

### P1 — Virada de ano e aritmética de calendário (COMP-01..04)

| AC | Resultado que o spec define | `arquivo:linha` + expressão | Result |
| --- | --- | --- | --- |
| 1 | `2026-11 … 2027-03` em 5x | `src/domain/parcelamento/gerar-parcelas.test.ts:59` — `expect(plano.parcelas.map((p) => p.competencia)).toEqual(["2026-11","2026-12","2027-01","2027-02","2027-03"])`; `src/domain/shared/competencia.test.ts:49` — `expect(addMeses(comp("2026-11"), 3)).toBe("2027-02")`; `e2e/compra-parcelada.spec.ts:172` — parcela `2/3` em `/2027-01` | ✅ |
| 2 | última parcela em `2028-10`, sem repetição | `src/domain/parcelamento/gerar-parcelas.test.ts:75` — `expect(competencias[23]).toBe("2028-10")`; `:76` — `expect(new Set(competencias).size).toBe(24)`; `src/domain/shared/competencia.test.ts:57` — `expect(addMeses(comp("2026-11"), 23)).toBe("2028-10")`; `:85` — `expect(new Set(intervalo).size).toBe(intervalo.length)` | ✅ |
| 3 | `2026-03-31T23:30:00Z` + `America/Sao_Paulo` → `2026-03` | `src/domain/shared/competencia.test.ts:106` — `expect(dataParaCompetencia("2026-03-31T23:30:00Z","America/Sao_Paulo")).toEqual({ok:true,value:"2026-03"})`; `:133` — `expect(dataParaCompetencia(instante,"UTC")).toEqual({ok:true,value:"2026-04"})` (prova que o fuso é usado, não fixo); `:146` — `expect(tzEhObrigatorio).toBe(true)` com `@ts-expect-error` provando que `tz` não tem default | ✅ |
| 4 | `2026-01` − 1 mês → `2025-12` | `src/domain/shared/competencia.test.ts:53` — `expect(addMeses(comp("2026-01"), -1)).toBe("2025-12")` | ✅ |
| 5 | `'YYYY-MM'`, aritmética inteira, sem objeto de data nativo | `src/domain/shared/competencia.test.ts:97` — `expect(fonte).not.toMatch(/(?<![A-Za-z])Date(?![A-Za-z])/)`; `:99` — `expect(fonte).not.toContain(proibido)` para `setMonth/getMonth/setFullYear/getFullYear/getTime` | ✅ |

### P1 — Compra já em andamento (PARC-06, PARC-07, PARC-08)

| AC | Resultado que o spec define | `arquivo:linha` + expressão | Result |
| --- | --- | --- | --- |
| 1 | exatamente 3 parcelas, numeradas 8, 9 e 10 | `src/domain/parcelamento/gerar-parcelas.test.ts:117` — `expect(plano.parcelas).toEqual([{numero:8,valor:6000,competencia:"2026-03"},{numero:9,…"2026-04"},{numero:10,…"2026-05"}])`; `src/infrastructure/db/repositories/compra.repository.integration.test.ts:327` — `expect(resultado.value.parcelas.map((p) => p.numeroParcela)).toEqual([8,9,10])`; `e2e/compra-parcelada.spec.ts:139` — `toContainText("8/10")` | ✅ |
| 2 | soma das parcelas 1..7 em `valor_amortizado_anterior_centavos` | `src/domain/parcelamento/gerar-parcelas.test.ts:127` — `expect(plano.valorAmortizadoAnterior).toBe(42000)`; `src/infrastructure/db/repositories/compra.repository.integration.test.ts:354` — `expect(rows[0]?.amortizado).toBe("42000")` (lido da coluna do Postgres) | ✅ |
| 3 | zero lançamentos em competências anteriores | `src/domain/parcelamento/gerar-parcelas.test.ts:139` — `expect(anteriores).toEqual([])`; `src/infrastructure/db/repositories/compra.repository.integration.test.ts:334` — `expect(await contar("movimento","WHERE competencia < DATE '2026-03-01'")).toBe(0)`; `e2e/compra-parcelada.spec.ts:151` — `expect(await contarMovimentosAntesDe("2026-03")).toBe(0)` e `:156` — total de `movimento` é `3` | ✅ |
| 4 | amortizado fora de todo somatório de despesa | `src/infrastructure/db/repositories/compra.repository.integration.test.ts:354` — `expect(rows[0]?.amortizado).toBe("42000")` **e** `:355` — `expect(rows[0]?.soma_movimentos).toBe("18000")` (o `SUM` do razão exclui o amortizado) | ✅ |
| 5 | exatamente 1 parcela na compra 10/10 | `src/domain/parcelamento/gerar-parcelas.test.ts:152` — `expect(plano.parcelas).toEqual([{numero:10,valor:6000,competencia:"2026-05"}])`; `:153` — `expect(plano.valorAmortizadoAnterior).toBe(54000)` | ✅ |
| 6 | código `PARCELA_INICIAL_INVALIDA` | `src/domain/parcelamento/gerar-parcelas.test.ts:195` — `expect(isErr(resultado) && resultado.error.code).toBe("PARCELA_INICIAL_INVALIDA")`; `:247` — regressão `NaN` + `:249` — `expect(JSON.stringify(resultado)).not.toContain("NaN")`; `src/application/compras/criar-compra-parcelada/handler.test.ts:259` idem | ✅ |
| 7 | formato `8/10` + quantidade de restantes | `src/application/mes/obter-visao-mensal/handler.test.ts:189` — `expect(visao.lancamentos[0]?.parcela).toEqual({numero:8,total:10,restantes:2})`; `src/components/tabela-lancamentos.test.tsx:125` — `expect(within(cartao).getByText(/8\/10/)).toBeDefined()` + `:126` — `expect(within(cartao).getByText("(faltam 2 depois desta)")).toBeDefined()`; `e2e/compra-parcelada.spec.ts:140` — `toContainText("faltam 2 depois desta")` | ✅ ⚠️ |

⚠️ **Lacuna de precisão do spec (AC 7)**: o spec exige "a quantidade de parcelas restantes" sem fixar redação nem posição. A implementação escolheu `(faltam N depois desta)` e `(última)`; a assertion mira o texto escolhido, não um resultado que o spec determine.

### P1 — Visão do mês e navegação (UI-01, UI-02, UI-03)

| AC | Resultado que o spec define | `arquivo:linha` + expressão | Result |
| --- | --- | --- | --- |
| 1 | raiz autenticada redireciona para `/AAAA-MM` | `e2e/auth.spec.ts:77` — `await expect(page).toHaveURL(new RegExp(\`/${competenciaCorrente()}$\`))` + `:79` — `expect(await contarUsuarios()).toBe(1)` | ✅ |
| 2 | seletor navega sem criar estrutura prévia | `src/components/seletor-competencia.test.tsx:48` — `expect(push).toHaveBeenCalledWith("/2026-03")`; `:54` — `expect(push).toHaveBeenCalledWith("/2028-12")`; `:31` — `expect(screen.getByRole("link",{name:/Próximo mês/})).toHaveProperty("href", expect.stringContaining("/2027-01"))` | ✅ |
| 3 | competência malformada → página de não encontrado, sem erro não tratado | `e2e/auth.spec.ts:106` — `await expect(page.getByRole("heading",{name:"Página não encontrada"})).toBeVisible()`; `:107` — `await expect(page.locator("#__next_error__")).toHaveCount(0)` | ✅ ⚠️ |
| 4 | dois eixos em blocos separados, cada um rotulado | `e2e/compra-parcelada.spec.ts:194` — `await expect(competencia).toContainText("Eixo competência")`; `:195` — `await expect(caixa).toContainText("Eixo caixa")`; `:200` — `expect(await competencia.locator('[aria-labelledby="eixo-caixa"]').count()).toBe(0)`; `:204` — `await expect(competencia).toContainText("R$ 333,34")` e `:205` — `await expect(caixa).not.toContainText("R$ 333,34")` | ✅ |
| 5 | segmentar em Fixos, Cartão de Crédito e Gastos do Mês | `src/components/tabela-lancamentos.test.tsx:62-64` — `expect(screen.getByRole("heading",{name:"Fixos"})).toBeDefined()` (idem "Cartão de Crédito", "Gastos do Mês"); `:79-81` — `expect(within(fixos).getByText("Conta fixa A")).toBeDefined()` e `expect(within(fixos).queryByText("Lançamento avulso A")).toBeNull()`; `src/application/mes/obter-visao-mensal/handler.test.ts:161-164` — `expect(visao.competenciaView.fixos).toBe(30000)` / `.cartao).toBe(20000)` / `.avulsos).toBe(10000)` | ✅ |
| 6 | estado vazio explicativo, não tabela em branco | `src/components/tabela-lancamentos.test.tsx:180` — `expect(screen.queryByRole("table")).toBeNull()` + `:181` — `expect(screen.getByText(/Nenhum lançamento neste mês ainda/)).toBeDefined()`; `src/application/mes/obter-visao-mensal/handler.test.ts:222` — `expect(visao.lancamentos).toEqual([])` | ✅ |
| 7 | estado de carregamento enquanto o mês carrega | **busca feita**: `grep -rn "Carregando\|loading.tsx" --include="*.test.ts*" --include="*.spec.ts" src e2e` → **zero ocorrências**. Nenhum projeto do `vitest.config.ts` inclui `src/app/**`; os specs do Playwright não abrem nenhum estado de carregamento. Mutação 13 (esvaziar `loading.tsx` para `return null`) **sobreviveu** a unit + componentes + integration. | ❌ **NÃO coberto** |
| 8 | estado de erro com identificador de correlação, sem stack trace | **busca feita**: `grep -rn "Não foi possível carregar\|digest\|sem-identificador" --include="*.test.ts*" --include="*.spec.ts" src e2e` → **zero ocorrências**. Mutação 13 (trocar `Código: {error.digest …}` por texto fixo em `src/app/(app)/[competencia]/error.tsx`) **sobreviveu**. Cobertura existente cobre outra coisa: `src/app/actions/compras.integration.test.ts:213` — `expect(resultado.erro.mensagem).toMatch(/informe o código [0-9a-f]{8}\.$/)` e `:214` — `expect(resultado.erro.mensagem).not.toMatch(/at \|\.ts:\|node_modules\|insert\|violates/i)` — mas isso é a **Server Action de gravação**, não a **leitura do mês** de que o AC trata. | ❌ **NÃO coberto** |
| 9 | sem rolagem horizontal em viewport de 400px | `e2e/compra-parcelada.spec.ts:229` — `expect(await transbordoHorizontal(page)).toBe(0)` com `transbordoHorizontal = scrollWidth − clientWidth`; `:238` — `expect(overflow).not.toContain("clip")` e `:237` — `expect(overflow).not.toContain("hidden")` (impede o falso positivo de esconder a barra); `e2e/auth.spec.ts:115` e `:120` | ✅ |

⚠️ **Lacuna de precisão do spec (AC 3)**: o spec diz "responder com a página de não encontrado" sem fixar status HTTP. O próprio teste registra isso em comentário (`e2e/auth.spec.ts:103-105`) e assere a identidade da página em vez do código. É lacuna do spec, não do teste.

### P1 — Acesso restrito às duas pessoas (AUTH-01, AUTH-02)

| AC | Resultado que o spec define | `arquivo:linha` + expressão | Result |
| --- | --- | --- | --- |
| 1 | não autenticado → `/login` | `src/proxy.test.ts:41` — `expect(decidirAcesso(rota,false)).toEqual({tipo:"redirecionar",destino:"/login"})` para `["/","/2026-03","/2026-03/detalhe","/api/compras"]`; `e2e/auth.spec.ts:64` e `:67` — `await expect(page).toHaveURL(/\/login$/)`; `src/proxy.test.ts:61` — o matcher alcança essas rotas | ✅ |
| 2 | **403** e **nenhum** registro de usuário | `e2e/auth.spec.ts:86` — `expect(resposta.status()).toBe(403)`; `:88` — `expect(await contarUsuarios()).toBe(0)`; `:90` — `expect(rows).toEqual([])` (consulta direta a `usuario WHERE email = 'intruso@example.com'`); `src/infrastructure/auth/sessao.integration.test.ts:72` — `.rejects.toMatchObject({codigo:"ACESSO_NEGADO", status:403})`; `:94` — `expect(await contarUsuarios()).toBe(1)` com outro usuário já gravado; `src/infrastructure/auth/auth.test.ts:116` — `expect(chamarSignIn(montarConfigAuth(ambiente()),"intruso@example.com")).toBe(false)`; `:160` — o provider de teste autentica mas **não** concede acesso | ✅ |
| 3 | sessão validada na primeira instrução da Server Action | `src/app/actions/compras.integration.test.ts:95` — `expect(primeiraInstrucao).toContain("requireSession()")` (lê o fonte e extrai a 1ª linha do corpo); comportamento em `:107` — `expect(resultado.erro.code).toBe("NAO_AUTENTICADO")` + `:108` — `expect(await contarMovimentos()).toBe(0)`; `src/infrastructure/auth/sessao.integration.test.ts:46` — `{codigo:"NAO_AUTENTICADO", status:401}` | ✅ |
| 4 | payload revalidado no servidor | `src/app/actions/compras.integration.test.ts:134` — `expect(resultado.erro.campos?.qtdParcelas).toBe("A compra pode ter no máximo 120 parcelas.")`; `:146` — `expect(Object.keys(resultado.erro.campos ?? {})).toEqual(expect.arrayContaining(["descricao","valorCentavos","qtdParcelas","meioPagamentoId"]))`; `:158` — `expect(resultado.erro.campos?.valorCentavos).toBe("O valor precisa ser maior que zero.")` para `1000.5` | ✅ |
| 5 | encerrar com erro explícito; não iniciar com valor indefinido | `src/infrastructure/config/env.test.ts:20` — `expect(() => carregarEnv(fonteSemDatabaseUrl)).toThrowError(/DATABASE_URL/)`; `:25` — idem `/AUTH_SECRET/`; `:29` — `expect(() => carregarEnv({})).toThrowError()` | ✅ |
| 6 | nenhum segredo com prefixo `NEXT_PUBLIC_` | `src/infrastructure/config/env.test.ts:36` — `expect(chave.startsWith("NEXT_PUBLIC_")).toBe(false)` para toda chave do schema; `src/infrastructure/auth/auth.test.ts:238` — `expect(infratores).toEqual([])` varrendo **todo** `src/**/*.ts(x)` contra `/NEXT_PUBLIC_[A-Z0-9]/` | ✅ |

### P1 — Integridade do razão e anti-dupla-contagem (MOV-01..05, DADO-02)

| AC | Resultado que o spec define | `arquivo:linha` + expressão | Result |
| --- | --- | --- | --- |
| 1 | somar só `movimento`; nunca plano nem recorrência | `src/domain/mes/resumo-mensal.test.ts:49` — `expect(resumo.competenciaView.totalGastos).toBe(500000)` (ignora outra competência e cancelado); `src/infrastructure/db/repositories/compra.repository.integration.test.ts:355` — `expect(rows[0]?.soma_movimentos).toBe("18000")` com `amortizado = "42000"` no plano, provando que a coluna do plano fica fora do `SUM`; `src/application/ports/fakes.test.ts:177` — `expect(deMarco).toHaveLength(0)` para o cancelado | ✅ ⚠️ |
| 2 | pagamento de fatura em tabela própria, **sem** `natureza` e **sem** `categoria_id` | **busca feita**: `grep -rn "pagamento_fatura\|pagamentoFatura" --include="*.test.ts" --include="*.spec.ts" src e2e` → aparece **apenas** em `src/infrastructure/db/restricoes.integration.test.ts:45`, dentro da lista `TABELAS_ESPERADAS`, que assere que a tabela **existe** — nada sobre a ausência das duas colunas, e nenhuma linha de `pagamento_fatura` é gravada ou lida em teste nenhum. **Mutação 12** acrescentou `natureza text NOT NULL DEFAULT 'DESPESA'` e `categoria_id uuid` a `pagamento_fatura` (em `drizzle/0000_init.sql` **e** `src/infrastructure/db/schema.ts`) e **sobreviveu** a unit, componentes, integration, `typecheck` e `lint` — 470/470 verdes. | ❌ **NÃO coberto** |
| 3 | três objetos distintos, sem campo que some entre eles | `src/domain/mes/resumo-mensal.test.ts:230` — `expect(Object.keys(resumo).sort()).toEqual(["caixaView","competenciaView"])`; `:231` e `:242` — listas fechadas de campos de cada eixo; `:269-271` — `expect(resumo.competenciaView.totalGastos).toBe(100000)`, `expect(resumo.caixaView.saidas).toBe(120000)`, `expect(…totalGastos).not.toBe(…saidas)`; `src/application/mes/obter-visao-mensal/handler.test.ts:73` — `expect(Object.keys(visao).sort()).toEqual(["caixaView","competencia","competenciaView","futuro","lancamentos"])` | ✅ |
| 4 | investimento fora do Total de Gastos e das Saídas; subtraído do saldo | `src/domain/mes/resumo-mensal.test.ts:78` — `expect(resumo.competenciaView.totalGastos).toBe(100000)` com investimento de `60000` presente; `:79` — `expect(…investimentos).toBe(60000)`; `:88-90` — `avulsos/fixos/cartao` todos `0` para um investimento; `src/application/mes/obter-visao-mensal/handler.test.ts:140` — `expect(visao.competenciaView.totalGastos).toBe(0)` e `:141` — `expect(visao.caixaView.saidas).toBe(0)` com `investimentosRealizados = 80000` | ✅ |
| 5 | `Entradas − Saídas − Investimentos` | `src/domain/mes/resumo-mensal.test.ts:110` — `expect(resumo.competenciaView.saldo).toBe(1000000 - 500000 - 60000)`; `:199` — `expect(resumo.caixaView.saldo).toBe(1000000 - 100000 - 60000)`; `src/application/mes/obter-visao-mensal/handler.test.ts:124` — `expect(visao.competenciaView.saldo).toBe(500000 - 120000 - 80000)` | ✅ |
| 6 | segunda parcela igual rejeitada por unicidade `(compra, numero_parcela)` | `src/infrastructure/db/restricoes.integration.test.ts:127` — `expect(erro.code).toBe("23505")` + `:128` — `expect(erro.constraint).toBe("movimento_compra_parcela_uq")`; contraprova em `:140` — `expect(rows[0]?.total).toBe("2")` para números distintos; `src/application/ports/fakes.test.ts:89` — `.rejects.toThrow(ViolacaoDeUnicidade)` | ✅ |
| 7 | denominador = Total de Gastos; soma das porcentagens = 100,00% | `src/domain/mes/resumo-por-categoria.test.ts:48` — `expect(categorias).toEqual([{categoriaId:"cat-a",gasto:250000,percentualDistribuicao:2500},{categoriaId:"cat-b",gasto:750000,percentualDistribuicao:7500}])`; `:52`, `:68`, `:86`, `:104`, `:248` — `expect(categorias.reduce((soma,c) => soma + c.percentualDistribuicao, 0)).toBe(CEM_PORCENTO)` | ✅ |
| 8 | Total zero → 0% para todas, sem divisão por zero | `src/domain/mes/resumo-por-categoria.test.ts:172` — `expect(categorias).toEqual([{categoriaId:"cat-a",gasto:0,percentualDistribuicao:0},{categoriaId:"cat-b",gasto:0,percentualDistribuicao:0}])`; `:176` — `expect(categorias.every((c) => Number.isFinite(c.percentualDistribuicao))).toBe(true)` | ✅ |

⚠️ **Lacuna de precisão do spec (AC 1)**: "SHALL não somar valores das tabelas de plano" é um universal negativo sem resultado observável definido. A melhor evidência disponível (`soma_movimentos = "18000"` com `amortizado = "42000"`) é indireta — prova o caso do amortizado, não a proibição em geral.

### P2 — Ciclo de fatura do cartão (CART-01, CART-02, CART-03)

| AC | Resultado que o spec define | `arquivo:linha` + expressão | Result |
| --- | --- | --- | --- |
| 1 | fatura pelo fechamento; competência continua o mês da compra | `src/domain/cartao/ciclo-fatura.test.ts:53` — `expect(ciclo.competenciaFatura).toBe(competenciaFatura)` para `20/03→2026-04`, `25/03→2026-05`, `26/03→2026-05`; `:58` — `expect(competenciaLancamento).toEqual({ok:true,value:"2026-03"})` nos três casos; `:59` — `expect(ciclo.competenciaFatura).not.toBe("2026-03")` | ✅ |
| 2 | compra no dia do fechamento → fatura **seguinte** | `src/domain/cartao/ciclo-fatura.test.ts:46` — caso `["2026-03-25","2026-05","2026-05-05"]` com `fechamentoVaiParaFaturaSeguinte: true`; contraprova em `:66` — `expect(ciclo.competenciaFatura).toBe("2026-04")` e `:67` — `expect(ciclo.cicloFim).toBe("2026-03-25")` com a flag `false` | ✅ |
| 3 | dia inexistente → último dia do mês | `src/domain/cartao/ciclo-fatura.test.ts:73` — `expect(cicloOk("2026-02-10",{diaFechamento:31}).cicloFim).toBe("2026-02-28")`; `:74` — `…("2028-02-10"…)).toBe("2028-02-29")`; `:78` — `expect(…{diaVencimento:31}).dataVencimento).toBe("2026-04-30")`; `:89-90` — `expect(ultimoDiaDoMes(2100,2)).toBe(28)` / `(2000,2)).toBe(29)` | ✅ |
| 4 | início de cada ciclo = dia seguinte ao fim do anterior, sem buraco nem sobreposição | `src/domain/cartao/ciclo-fatura.test.ts:110` — `expect(atual.cicloInicio).toBe(diaSeguinteOracle(anterior.cicloFim))` sobre 24 ciclos consecutivos, com `diaFechamento ∈ {25, 31}`, contra um oráculo `Date` independente da implementação; `:111` — `expect(atual.cicloFim > atual.cicloInicio).toBe(true)` | ✅ |
| 5 | conta corrente e rótulo não geram fatura nem exigem fechamento | `src/domain/cartao/regras-cartao.test.ts:29` — `expect(geraFatura(conta)).toBe(false)` + `:31` `@ts-expect-error` provando que `diaFechamento` não existe no tipo; `:42-44` idem para rótulo; `src/infrastructure/db/restricoes.integration.test.ts:220` — `expect(erro.constraint).toBe("meio_pagamento_gera_fatura_sse_cartao")`; `src/infrastructure/db/repositories/cadastro.repository.integration.test.ts:86` — `expect(geraFatura(conta)).toBe(false)` | ✅ |
| 6 | cartão arquivado mantém parcelas e segue gerando fatura | `src/domain/cartao/regras-cartao.test.ts:81` — `expect(geraFatura(arquivado)).toBe(true)` + `:86` — `expect(isOk(ciclo) && ciclo.value.competenciaFatura).toBe("2026-04")`; `src/infrastructure/db/repositories/cadastro.repository.integration.test.ts:62` — `expect(encontrado?.nome).toBe("Cartão Antigo")` e `:63` — `expect(encontrado?.arquivadoEm).toBe(ARQUIVADO_EM)` | ✅ |
| 7 | código `MEIO_PAGAMENTO_ARQUIVADO` | `src/domain/cartao/regras-cartao.test.ts:72` — `expect(resultado.ok === false && resultado.error.code).toBe("MEIO_PAGAMENTO_ARQUIVADO")`; `src/application/compras/criar-compra-parcelada/handler.test.ts:187` idem + `:188` — `expect(fakes.estado.movimentos.size).toBe(0)`; `src/app/actions/compras.integration.test.ts:177` — `expect(resultado.erro.mensagem).toBe("Esse meio de pagamento está arquivado e não recebe compra nova.")` | ✅ |

### P2 — Previsto versus realizado (MOV-06)

| AC | Resultado que o spec define | `arquivo:linha` + expressão | Result |
| --- | --- | --- | --- |
| 1 | `pagoEm` preenchido → realizado; vazio → previsto | `src/domain/mes/resumo-mensal.test.ts:171` — `expect(resumo.caixaView.saidas).toBe(30000)` e `:172` — `expect(resumo.competenciaView.pendente).toBe(70000)`; `src/infrastructure/db/repositories/movimento.repository.integration.test.ts:170` — `expect(lancamento?.pagoEm).toBe("2026-03-18")` + `:171` — `expect(lancamento?.valor).toBe(33334)` | ✅ |
| 2 | pendente = despesas da competência sem `pagoEm` | `src/domain/mes/resumo-mensal.test.ts:222` — `expect(resumo.competenciaView.pendente).toBe(70000)` com receita, investimento, outra competência, pago e cancelado todos presentes no cenário | ✅ |
| 3 | comprometimento futuro quebrado por competência, nunca agregado | `src/domain/mes/projecao.test.ts:45` — `expect(projecao).toEqual([{competencia:ABRIL,comprometido:40000},{competencia:MAIO,comprometido:70000}])`; `:98` — `expect(projecao).toEqual([{competencia:ABRIL,comprometido:40000}])` excluindo pago/receita/investimento/cancelado/corrente; `src/application/mes/obter-visao-mensal/handler.test.ts:210` — `expect(visao.futuro).toEqual([{competencia:"2026-04",comprometido:33333},{competencia:"2026-05",comprometido:33333},{competencia:"2026-06",comprometido:0}])` | ✅ |
| 4 | lançamento pago SHALL **rejeitar** alteração de valor, competência e meio de pagamento sem estorno explícito | **busca feita**: `grep -rn "estorno\|MOV-06" src` → nenhum caso de uso de alteração de lançamento existe; `regenerarParcelas` é a única função próxima e ela **preserva** o valor da parcela paga (`src/domain/parcelamento/regenerar-parcelas.test.ts:63` — `expect(plano.parcelas.slice(0,3)).toEqual([{numero:1,valor:10000,…},…])`), o que é comportamento diferente de *rejeitar*, e não toca competência nem meio de pagamento. Nenhuma assertion verifica rejeição. | ❌ **NÃO coberto** ⚠️ |

⚠️ **Lacuna de precisão do spec (AC 4)**: "sem estorno explícito" não é definido em lugar nenhum do spec — não há código de erro, forma de estorno nem estado resultante especificados. O AC não é testável como está escrito.

### P2 — Orçamento por categoria (ORC-01, ORC-02)

| AC | Resultado que o spec define | `arquivo:linha` + expressão | Result |
| --- | --- | --- | --- |
| 1 | consumo e distribuição como **dois campos distintos** | `src/domain/orcamento/avaliar-orcamento.test.ts:29` — `expect(avaliacao.categorias[0]).toEqual({categoriaId:"cat-a",gasto:246000,limite:100000,percentualConsumo:24600,percentualDistribuicao:6150,estourou:true})`; `:36` — `expect(…percentualConsumo).not.toBe(…percentualDistribuicao)` | ✅ |
| 2 | consumo > 100% e sinal de estouro, sem truncar | `src/domain/orcamento/avaliar-orcamento.test.ts:51` — `expect(avaliacao.categorias[0]?.percentualConsumo).toBe(24600)` (246,00% para gasto 246000 / limite 100000 — o valor exato do Independent Test do spec); `:52` — `toBeGreaterThan(CEM_PORCENTO)`; `:53` — `expect(…estourou).toBe(true)`; fronteira em `:74-75` — `toBe(CEM_PORCENTO)` e `estourou === false` no empate exato | ✅ |
| 3 | sem limite → consumo **nulo**, nem zero nem infinito | `src/domain/orcamento/avaliar-orcamento.test.ts:88` — `expect(avaliacao.categorias[0]?.percentualConsumo).toBeNull()` + `:89` — `expect(…).not.toBe(0)`; `:100` — limite `0` também devolve `null` | ✅ |
| 4 | `total gasto ÷ soma dos limites` | `src/domain/orcamento/avaliar-orcamento.test.ts:123` — `expect(avaliacao.percentualGlobal).toBe(9500)` (380000/400000) | ✅ |
| 5 | soma dos limites zero → global nulo, sem `NaN` | `src/domain/orcamento/avaliar-orcamento.test.ts:134` — `expect(avaliacao.percentualGlobal).toBeNull()` + `:135` — `expect(Number.isNaN(avaliacao.percentualGlobal)).toBe(false)`; `:145` — limites declarados com valor zero também | ✅ |
| 6 | limite associado a uma **competência específica**: alterar o limite de um mês não altera outro | **busca feita**: `grep -rn "LimiteCategoria\|orcamento_categoria" src` → o tipo `LimiteCategoria` (`src/domain/orcamento/avaliar-orcamento.ts:10-13`) tem apenas `categoriaId` e `limite`, **sem campo de competência**; `avaliarOrcamento` nunca recebe competência. A tabela `orcamento_categoria` existe com a coluna e o `CHECK` `orcamento_categoria_competencia_dia_1`, mas **nenhum teste** grava dois limites em competências diferentes nem verifica o isolamento entre meses. Nenhuma assertion localizada. | ❌ **NÃO coberto** |
| 7 | arredondar ao centésimo, empate para cima | `src/domain/mes/resumo-por-categoria.test.ts:218` — `expect(percentual(2 as Cents, 3 as Cents)).toBe(6667)`; `:223` — `expect(percentual(1 as Cents, 32 as Cents)).toBe(313)` (empate exato 3,125% → 3,13%, truncar daria 312); `:228` — `toBe(3333)` (controle abaixo de meio); `:245-247` — `313 / 313 / 9374` somando `CEM_PORCENTO`; `src/domain/orcamento/avaliar-orcamento.test.ts:160` — `toBe(6667)` e `:169` — `toBe(313)` no consumo, que não tem correção de sobra | ✅ |

### P3 — Recorrência com valor variável (REC-01, REC-02)

| AC | Resultado que o spec define | `arquivo:linha` + expressão | Result |
| --- | --- | --- | --- |
| 1 | altera só a competência confirmada; preserva previsto; não altera outras | `src/domain/recorrencia/valor-efetivo.test.ts:50` — `expect(depois.map((o) => resolverValorEfetivo(o.valorPrevisto,o.valorReal).valorEfetivo)).toEqual([PREVISTO, REAL, PREVISTO])`; `:52-53` — `expect(depois[0]).toEqual({competencia:MARCO,valorPrevisto:30000,valorReal:null})` e idem para MAIO; `:59` — `expect(depois[1]).toEqual({competencia:ABRIL,valorPrevisto:30000,valorReal:34750})`; `:70` — `expect(antes).toEqual(tresMeses())` (não muta) | ✅ |
| 2 | marcar como sobrescrita; nova materialização não altera o valor | `src/domain/recorrencia/valor-efetivo.test.ts:83` — `expect(rematerializada.sobrescritaManualmente).toBe(true)` + `:84` — `expect(rematerializada.valorEfetivo).toBe(REAL)` com um `novoPrevisto` de 31000 chegando pela rematerialização | ✅ |
| 3 | materialização repetida não cria lançamento duplicado | `src/infrastructure/db/restricoes.integration.test.ts:205` — `expect(erro.code).toBe("23505")` + `:206` — `expect(erro.constraint).toBe("movimento_recorrencia_competencia_uq")` | ✅ |
| 4 | mudança de valor a partir de uma competência → **nova versão vigente**, competências anteriores inalteradas | **busca feita**: `grep -rn "recorrencia_versao\|recorrenciaVersao\|versao" src --include="*.ts"` → a tabela `recorrencia_versao` existe no schema, mas **não há nenhuma função de domínio de versionamento** (`src/domain/recorrencia/valor-efetivo.ts` tem só `resolverValorEfetivo` e `confirmarValorReal`) e **nenhum teste** grava ou lê `recorrencia_versao`. Nenhuma assertion localizada. | ❌ **NÃO coberto** |
| 5 | sem competência de fim → janela rolante limitada, sem gerar indefinidamente | `src/domain/mes/projecao.test.ts:140` — `expect(projecao).toEqual([{competencia:ABRIL,comprometido:30000},{competencia:MAIO,…},{competencia:JUNHO,…}])` com 24 ocorrências semeadas + `:145` — `expect(projecao).toHaveLength(3)`. Isso fecha a janela da **projeção**, não a da **materialização** — que não existe nesta feature. | ⚠️ **parcial** |

⚠️ **Lacuna de precisão do spec (AC 5)**: o spec exige "uma janela rolante limitada" sem dizer de quanto. A implementação escolheu `MESES_DE_PROJECAO = 3`; a assertion mira a escolha da implementação, não um valor do spec.

### Edge Cases do spec

| Edge case | `arquivo:linha` + expressão | Result |
| --- | --- | --- |
| R$ 0,05 em 3x → `[2,2,1]`, soma 5 | `src/domain/parcelamento/ratear-parcelas.test.ts:30` — `expect(rateioOk(5,3)).toEqual([2,2,1])` + `:31` — `expect(soma(rateioOk(5,3))).toBe(5)` | ✅ |
| R$ 1.000,01 em 7x → seis de 14286 e uma de 14285 | `ratear-parcelas.test.ts:37-39` — `toEqual([14286×6, 14285])`, `toHaveLength(6)`, `expect(soma(parcelas)).toBe(100001)` | ✅ |
| R$ 0,02 em 3x → `PARCELA_INFERIOR_A_UM_CENTAVO` | `ratear-parcelas.test.ts:46` | ✅ |
| R$ 0,03 em 3x → `[1,1,1]` | `ratear-parcelas.test.ts:50` — `expect(rateioOk(3,3)).toEqual([1,1,1])` | ✅ |
| 1 parcela → 1 lançamento na competência da compra | `gerar-parcelas.test.ts:83` — `expect(plano.parcelas).toEqual([{numero:1,valor:100000,competencia:"2026-03"}])` | ✅ |
| R$ 99.999,99 em 120x preserva a soma, sem estouro | `ratear-parcelas.test.ts:56` — `toHaveLength(120)` + `:57` — `expect(soma(parcelas)).toBe(9999999)` | ✅ |
| import de framework em `src/domain` faz a suíte falhar | `src/domain/shared/arquitetura.test.ts:129` — `expect(violacoes).toEqual([])` por arquivo, com a lista de proibições **lida de `biome.json`** em vez de redigitada. Confirmado empiricamente pela **mutação 14** | ✅ |
| valor financeiro real em arquivo versionado é defeito | revisão humana; o spec diz "a revisão SHALL tratá-lo como defeito", não um teste. Fixtures inspecionadas: todas matemáticas (100000/3, 5/3, 100001/7, 6000×10), nomes genéricos ("Pessoa A", "Cartão Roxo", "Compra parcelada A") — conforme AD-009 | ✅ (por inspeção) |

### Success Criteria do spec

| Critério | Evidência | Result |
| --- | --- | --- |
| R$ 1.000,00 em 3x, parcelas 2/3 e 3/3 em abril e maio sem ação adicional | `e2e/compra-parcelada.spec.ts:112-119` — `page.goto("/2026-04")` seguido de `toContainText("2/3")` e `toContainText("R$ 333,33")`; nada entre o cadastro e a navegação | ✅ |
| propriedade da soma para todo valor 1..10.000.000 e n 1..120 | `ratear-parcelas.test.ts:93-104`, `numRuns: 2000` | ✅ |
| 8 de 10 → 3 lançamentos, zero antes | `compra.repository.integration.test.ts:327,334`; `e2e/compra-parcelada.spec.ts:151,156` | ✅ |
| 100% de branches em `src/domain` | execução de `pnpm test:unit`: `Branches : 100% ( 128/128 )` | ✅ |
| e-mail fora da allowlist → 403, sem criar usuário | `e2e/auth.spec.ts:86,88,90` | ✅ |
| sem rolagem horizontal em 400px | `e2e/compra-parcelada.spec.ts:229` | ✅ |
| nenhum valor financeiro real versionado | inspeção das fixtures (AD-009) | ✅ |

---

## 3. Discrimination Sensor

**Mecânica**: `git worktree add --detach` em `/private/tmp/.../scratchpad/sensor` e `sensor2`, com `node_modules` por symlink. `git stash` **não** foi usado. Baseline `git status --porcelain` da árvore real capturado **antes** (vazio) e conferido **depois** de cada worktree ser removido: idêntico. Profundidade **P0-full** (14 mutações ≥ 5 exigidas), incluindo os dois alvos obrigatórios do **AD-011**.

| # | Arquivo:linha | Mutação | Gate | Resultado |
| --- | --- | --- | --- | --- |
| 1 | `src/domain/parcelamento/ratear-parcelas.ts:36` | **AD-011 (a)** — política de resíduo → truncamento simples (`recebeCentavo = false`) | unit | ✅ **Morto** — 20 testes / 5 arquivos falham |
| 2 | `src/domain/parcelamento/ratear-parcelas.ts:36` | **AD-011 (a), variante fina** — `PRIMEIRAS` passa a alocar como `ULTIMAS` (soma preservada, só a ordem muda) | unit + componentes | ✅ **Morto** — 13 testes / 6 arquivos |
| 3 | `src/domain/shared/competencia.ts:35-37` | **AD-011 (b)** — `addMeses` sem virada de ano (`mes + n` sem carry) | unit + componentes | ✅ **Morto** — 21 testes / 8 arquivos |
| 4 | `src/domain/mes/resumo-mensal.ts:80` | Eixos colapsados: `saidas = totalGastos` | unit + componentes | ✅ **Morto** — 4 testes, incl. `MOV-03 AC 3 > pagamento de fatura … faz Total de Gastos divergir de Saídas` |
| 5 | `src/domain/cartao/ciclo-fatura.ts:79` | Compra no dia do fechamento vai para a fatura do próprio ciclo (negação removida) | unit | ✅ **Morto** — 2 testes de `CART-02 AC 2` |
| 6 | `src/infrastructure/auth/auth.ts:155` | Allowlist ignorada: `signIn` devolve `user.email !== undefined` | unit | ✅ **Morto** — 4 testes de `AUTH-01 AC 2` |
| 7 | `src/domain/mes/resumo-por-categoria.ts:47` | Desempate do arredondamento vai para baixo (`>=` → `>`) | unit | ✅ **Morto** — 3 testes de `ORC-02 AC 7` |
| 8 | `src/infrastructure/db/repositories/compra.repository.ts:112` | Atomicidade removida: `db.transaction(...)` → IIFE sobre `this.db` | integration | ✅ **Morto** — 3 testes de `PARC-05 AC 8` e `PARC-01 AC 2` |
| 9 | `src/domain/shared/competencia.ts:99` | **Mutação de tipo** — `tz: string` ganha default `"America/Sao_Paulo"` | **typecheck** | ✅ **Morto pelo gate certo** — `vitest` passou **330/330** (não typecheca); `pnpm typecheck` exit **2**: `competencia.test.ts(137,5): error TS2578: Unused '@ts-expect-error' directive` e `(142,11): error TS2322`. Rodar esta mutação contra `vitest` produziria um falso positivo |
| 10 | `src/domain/parcelamento/gerar-parcelas.ts:68` | **AD-005** — deslocamento de competência ignora `parcelaInicial` (compra 8/10 inventa meses fantasmas) | unit + componentes | ✅ **Morto** — 9 testes / 4 arquivos |
| 11 | `src/domain/mes/resumo-mensal.ts:45` | Investimento passa a contar como despesa (`=== "DESPESA"` → `!== "RECEITA"`) | unit | ✅ **Morto** — 8 testes de `MOV-04 AC 4` |
| 12 | `src/infrastructure/db/schema.ts:299-311` + `drizzle/0000_init.sql:99` | **`pagamento_fatura` ganha `natureza` e `categoria_id`** — a dupla contagem volta a ser possível de escrever | unit + componentes + integration + typecheck + lint | ❌ **SOBREVIVEU** — 470/470 verdes, typecheck exit 0, lint exit 0 |
| 13 | `src/app/(app)/[competencia]/loading.tsx` e `error.tsx:24` | `loading.tsx` → `return null`; identificador de correlação removido do `error.tsx` | unit + componentes + integration | ❌ **SOBREVIVEU** — 470/470 verdes |
| 14 | `src/domain/parcelamento/ratear-parcelas.ts:1` | `import { NextResponse } from "next/server"` dentro de `src/domain` | unit + lint | ✅ **Morto duas vezes** — `arquitetura.test.ts` falha nomeando o arquivo, e `pnpm lint` sai 1 com `lint/style/noRestrictedImports` |

**Resultado do sensor: 12 mortos, 2 sobreviventes (14 mutações).**

### Diagnóstico dos sobreviventes

**Mutação 12 — lacuna real (não é equivalência, não é erro de instrumentação).**
A mutação muda o schema do banco e a definição do Drizzle de forma observável: as colunas passam a existir no Postgres e no tipo. Nenhum gate percebe porque **nenhum teste toca `pagamento_fatura`** — a tabela aparece uma única vez em toda a suíte, dentro de uma lista de nomes de tabela (`restricoes.integration.test.ts:45`). A garantia que o `AD-003` descreve como "o erro fica impossível de compilar em vez de apenas improvável" e que o `AGENTS.md` eleva a regra inviolável nº 5 é hoje **apenas um comentário no `schema.ts`**. Um futuro implementador que acrescentasse as colunas — por engano ou por conveniência — passaria por `pnpm verify` sem nenhum aviso. Testei o gate certo (integration, que recria o schema do zero a partir de `drizzle/0000_init.sql`), e ele não discrimina.

**Mutação 13 — lacuna real, de severidade menor.**
`loading.tsx` e `error.tsx` não são alcançados por nenhum projeto do `vitest.config.ts` (`componentes` inclui só `src/components/**/*.test.tsx`) nem por nenhum spec do Playwright. A mutação muda o que o usuário vê. Não é equivalente: o identificador de correlação some da tela, que é exatamente o que o AC 8 pede. Não é erro de instrumentação quanto ao `vitest`; quanto ao e2e, registro honestamente que **não consegui rodar `pnpm test:e2e` dentro do worktree** (o symlink de `node_modules` quebra o resolvedor do Next: `Execution of find_package failed`). Compensei com a busca textual — `grep` por `Carregando`, `Não foi possível carregar`, `digest`, `sem-identificador`, `loading.tsx` e `error.tsx` em todos os `*.test.ts(x)` e `*.spec.ts` retorna **zero ocorrências** —, o que estabelece a ausência de cobertura independentemente de execução.

---

## 4. Qualidade dos testes — regra de payload/conjunção

Varri os testes procurando as patologias listadas. Resultado por patologia:

| Patologia | Ocorrências | Nota |
| --- | --- | --- |
| Teste sem assertion | 0 | — |
| Tautologia (assere o que a própria implementação produziu) | 0 | O contraexemplo positivo é `ciclo-fatura.test.ts:34-39`, que constrói um **oráculo independente** com `Date` (proibido em `src/domain`) justamente para não compartilhar bug com a aritmética testada |
| "não lançou" como única assertion | 0 | — |
| Assertion só sobre contagem de chamada de mock | **1 caso, mitigado** | `form-compra.test.tsx:146` — `expect(enviar).toHaveBeenCalledTimes(1)`; mas é `waitFor` de sincronização, e a assertion real vem logo depois em `:148` — `expect(enviado?.idempotencyKey).toBe(chaveAoAbrir)`, que mira o **valor** do campo do payload. `:233` — `expect(enviar).not.toHaveBeenCalled()` é legítimo: o AC é justamente "não chamar" |
| Happy-path-only onde o spec lista edge cases | 0 | Os 6 edge cases aritméticos do spec têm teste dedicado |
| Teste sem requisito de origem (unclaimed) | 0 relevante | Todo arquivo de teste tem cabeçalho citando ACs; os testes de `money`, `result`, `formatar` e `client` mapeiam para Done-when de tasks |

**Regra de payload/conjunção — amostragem dirigida aos objetos devolvidos, emitidos e persistidos:**

- `CompraCriada` — `criar-compra-parcelada/handler.test.ts:72` assere o array de parcelas **por valor** (`numero`, `valor`, `competencia` de cada uma), não a chamada ao repositório. `:77` assere `valorTotal`; `:118` assere `valorAmortizadoAnterior`; `:216-217` asserem `jaExistia` nos dois lados.
- `ResumoDoMes` — `resumo-mensal.test.ts:55` assere o objeto **inteiro** com `toEqual`, fechando os 8 campos; `:231` e `:242` fecham as listas de chaves dos dois eixos, de modo que um campo novo que misturasse eixos quebraria o teste.
- `VisaoMensal` — `obter-visao-mensal/handler.test.ts:73` fecha as 5 chaves do objeto de topo; `:92` e `:102` fecham as chaves de cada eixo.
- Linha persistida — `movimento.repository.integration.test.ts:155` — `expect(Object.keys(lancamento ?? {}).sort()).toEqual(CHAVES_DE_LANCAMENTO)`: nenhuma coluna do Drizzle vaza pelo mapeamento.
- Efeito colateral emitido — `compras.integration.test.ts:239` — `expect(revalidatePath.mock.calls.map(([rota]) => rota).sort()).toEqual(["/2026-03","/2026-04","/2026-05"])`: assere os **argumentos**, não só que foi chamada.
- Erro devolvido — `compras.integration.test.ts:177` assere a **mensagem em pt-BR** exata e `:180` assere que o campo endereçado recebe a mesma mensagem.

**Verificação anti-falso-positivo digna de nota**: `compra-parcelada.spec.ts:237-238` — medir `scrollWidth − clientWidth === 0` passaria trivialmente com `overflow-x: hidden`, então o teste também assere que `overflowX` não é `hidden` nem `clip`. É a diferença entre medir e provar.

**Ressalva de escopo, não defeito**: `sessao.integration.test.ts:148-156` usa um dublê (`perdendoACorrida`) que chama `criarUsuario` duas vezes para simular a corrida. É simulação, não concorrência real — mas o caminho exercitado é o `catch` real do código de produção, e o teste equivalente em `compra.repository.integration.test.ts:280-292` documenta explicitamente por que o `Promise.all` não garante o interleaving. Honestidade metodológica acima da média.

---

## 5. Code Quality

| Princípio | Status | Nota |
| --- | --- | --- |
| Nenhuma feature além do pedido | ✅ | `regenerarParcelas`, `avaliarOrcamento` e `resolverValorEfetivo` existem porque o spec os coloca em escopo de domínio (P2/P3, "o cálculo puro é construído aqui") |
| Nenhuma abstração para código de uso único | ✅ | `planoDaCompra` tem dois consumidores reais (preview e Server Action) — é o oposto de abstração especulativa |
| Nenhuma "flexibilidade" desnecessária | ✅ | `politicaResiduo` é AD-004 explícito, não invenção |
| Só arquivos necessários tocados | ✅ | 137 arquivos, todos rastreáveis a tasks |
| Não "melhorou" código alheio | ✅ | — |
| Segue padrões existentes | ✅ | Domínio em português, `Result<T,E>`, sufixo `_centavos`, um caso de uso por diretório |
| Aprovaria em revisão sênior? | ✅ com ressalvas | As 6 lacunas da seção 2 são de cobertura, não de implementação |
| Testes mapeiam para ACs e não são rasos | ✅ | Ver seção 4 |
| Outcome check ancorado no spec | ⚠️ | 60/67 ACs com valor asserido batendo com o spec; 4 lacunas de precisão do spec sinalizadas |
| Expectativa de cobertura por camada | ⚠️ | Domínio 1:1 e 100% de branches. **`src/app/**` não é coberto por nenhum projeto do `vitest.config.ts`** — é o buraco que deixa `loading.tsx` e `error.tsx` sem teste |
| Todo teste mapeia para requisito | ✅ | Sem testes órfãos |
| Guidelines documentadas seguidas | ✅ | `AGENTS.md` (5 regras invioláveis) e `.specs/STATE.md` (AD-001..AD-011). **Exceção**: a regra nº 5 está enunciada mas não enforçada por teste — ver Fix 1 |

**Observação sobre AD-006 já registrada pelo implementador e confirmada por mim**: `src/domain/shared/result.ts:21-27` — `isOk`/`isErr` não estreitam o ramo negativo, e por isso `gerar-parcelas.ts:58` e `regenerar-parcelas.ts:80` usam o discriminante nativo `if (!rateio.ok)`. É inconsistência de estilo sem impacto de comportamento; não é lacuna de cobertura.

---

## 6. Lacunas ranqueadas

### Fix 1 — `MOV-02 AC 2` não tem nenhum teste; mutação sobrevive a todos os gates — **Blocker**

- **Root cause**: a garantia estrutural anti-dupla-contagem (AD-003; `AGENTS.md` regra 5) vive só como comentário em `src/infrastructure/db/schema.ts:290-297`. Nenhum teste lê a forma da tabela `pagamento_fatura`.
- **Evidência**: mutação 12 acrescentou `natureza` e `categoria_id` à tabela e passou em 470/470 testes, `typecheck` e `lint`.
- **Fix task**: em `src/infrastructure/db/restricoes.integration.test.ts`, consultar `information_schema.columns WHERE table_name = 'pagamento_fatura'` e assertar que o conjunto de colunas é **exatamente** `{id, fatura_id, data_pagamento, valor_pago_centavos, criado_em}` — em particular que `natureza` e `categoria_id` **não** estão presentes. Isso mata a mutação 12.
- **Done when**: acrescentar qualquer uma das duas colunas faz `pnpm test:integration` falhar nomeando a coluna.

### Fix 2 — `UI-02 AC 7` e `AC 8` sem nenhum teste; `src/app/**` fora de toda suíte — **Major**

- **Root cause**: `vitest.config.ts:46` restringe o projeto `componentes` a `src/components/**/*.test.tsx`, e os specs do Playwright nunca provocam falha de leitura nem observam o estado de carregamento. `loading.tsx` e `error.tsx` nunca são executados por teste nenhum.
- **Evidência**: mutação 13 sobreviveu; `grep` por `Carregando`, `Não foi possível carregar`, `digest` e `sem-identificador` em todos os testes retorna zero.
- **Fix task**: (a) incluir `src/app/**/*.test.tsx` no projeto `componentes`; (b) teste de componente sobre `CarregandoMes` asserindo `role="status"` e o texto de carregamento; (c) teste sobre `ErroDoMes` asserindo `role="alert"`, que o `digest` recebido aparece na tela e que a `message` do erro **não** aparece.
- **Done when**: as duas mutações da linha 13 desta tabela passam a falhar.

### Fix 3 — `ORC-02 AC 6`: limite não é por competência no domínio — **Major**

- **Root cause**: `LimiteCategoria` (`src/domain/orcamento/avaliar-orcamento.ts:10-13`) não tem campo de competência, e `avaliarOrcamento` nunca a recebe. A coluna existe no banco; a regra não existe no domínio nem em teste.
- **Fix task**: teste que avalia a mesma categoria em duas competências com limites diferentes e prova que alterar uma não muda a outra — o que exige que o tipo passe a carregar a competência ou que a leitura por competência seja provada na camada de repositório.

### Fix 4 — `REC-01 AC 4`: versionamento de recorrência não existe — **Major**

- **Root cause**: a tabela `recorrencia_versao` foi criada, mas nenhuma função de domínio produz ou lê versão vigente, e nenhum teste a exercita. O spec coloca o cálculo puro de recorrência em escopo ("O cálculo puro é construído aqui porque o modelo de dados depende dele").
- **Fix task**: função de domínio `valorVigenteEm(versoes, competencia)` com teste provando que uma nova versão a partir de 2026-05 deixa 2026-03 e 2026-04 inalteradas.

### Fix 5 — `MOV-06 AC 4`: lançamento pago não rejeita alteração — **Major**, com lacuna de spec embutida

- **Root cause**: não existe caso de uso de alteração de lançamento. `regenerarParcelas` **preserva** a parcela paga, o que não é o mesmo que **rejeitar** a alteração, e não cobre competência nem meio de pagamento. Além disso o spec não define "estorno explícito", nem código de erro, nem estado resultante — o AC não é testável como está escrito.
- **Fix task**: primeiro resolver a lacuna de precisão do spec (definir o código de erro e o que conta como estorno); depois guarda + teste.

### Fix 6 — `REC-02 AC 5` coberto apenas por proxy — **Minor**

- **Root cause**: o AC fala de **materializar** em janela limitada; o que existe e é testado é a **projeção** em janela limitada (`projetarProximosMeses`, janela `3`). A materialização é da Fase 7.
- **Fix task**: nenhuma agora; registrar a dependência da Fase 7. O tamanho da janela também não é fixado pelo spec.

### Fix 7 — Bookkeeping do próprio `spec.md` — **Minor**

- A linha `**Coverage:** 33 total` está errada: a tabela de traceability tem **32 linhas** (PARC 8 + COMP 4 + MOV 6 + CART 3 + ORC 2 + REC 2 + AUTH 2 + UI 3 + DADO 2). O handoff em `STATE.md` e o briefing deste verificador repetem o 33.
- A tabela **não** estava toda em `Implementing` como o `STATE.md` afirma ("Nenhum requisito foi promovido a `Verified` por este worker"): **9 requisitos já vinham marcados `Verified`**, promovidos durante a implementação (commits `eb9e246`, entre outros). A afirmação do handoff é falsa quanto ao estado da tabela, ainda que verdadeira quanto à Fase 7.
- Também não confere: `STATE.md` diz "345 unit"; a execução real dá 358.

---

## 7. Atualização da Traceability

Promovidos a `Verified` **26 de 32** requisitos — apenas aqueles cujos acceptance criteria estão **todos** cobertos com `arquivo:linha` localizado e valor asserido batendo com o spec.

| Requirement | Status anterior | Novo status | Motivo |
| --- | --- | --- | --- |
| PARC-01 … PARC-08 | Implementing | ✅ Verified | 9 + 7 ACs cobertos; mutações 1, 2, 3, 8, 10 mortas |
| COMP-01 … COMP-04 | Verified | ✅ Verified (confirmado) | 5 ACs cobertos; mutação 3 (AD-011 b) morta |
| MOV-01 | Verified | ✅ Verified (confirmado) | ACs 1, 7, 8 cobertos |
| **MOV-02** | **Verified** | ❌ **Implementing (rebaixado)** | **AC 2 sem nenhuma assertion; mutação 12 sobreviveu a todos os gates.** A marca `Verified` anterior não tinha lastro e manter um `Verified` falso é pior do que não ter verificação |
| MOV-03, MOV-04, MOV-05 | Implementing | ✅ Verified | ACs 3, 4, 5, 6 cobertos; mutações 4 e 11 mortas |
| MOV-06 | Implementing | ❌ Implementing | AC 4 sem cobertura e sem implementação (Fix 5) |
| CART-01, CART-02, CART-03 | Implementing | ✅ Verified | 7 ACs cobertos; mutação 5 morta |
| ORC-01 | Verified | ✅ Verified (confirmado) | ACs 1, 2, 3 cobertos com os valores do Independent Test (246,00%) |
| ORC-02 | Implementing | ❌ Implementing | AC 6 sem cobertura (Fix 3) |
| **REC-01** | **Verified** | ❌ **Implementing (rebaixado)** | **AC 4 sem implementação e sem teste** (Fix 4). Mesma lógica do MOV-02 |
| REC-02 | Implementing | ❌ Implementing | AC 5 coberto apenas por proxy (Fix 6) |
| AUTH-01, AUTH-02 | Implementing | ✅ Verified | 6 ACs cobertos; mutação 6 morta |
| UI-01 | Implementing | ✅ Verified | ACs 1, 2, 4, 5 cobertos |
| UI-02 | Implementing | ❌ Implementing | ACs 7 e 8 sem cobertura; mutação 13 sobreviveu (Fix 2) |
| UI-03 | Implementing | ✅ Verified | AC 9 coberto, com a verificação anti-falso-positivo do `overflow-x` |
| DADO-01 | Verified | ✅ Verified (confirmado) | Fronteira do domínio provada por `arquitetura.test.ts` + mutação 14 |
| DADO-02 | Verified | ✅ Verified (confirmado) | Restrições provadas contra Postgres real (AD-010) |

**Nota sobre o mapeamento ID → AC**: o `spec.md` não define quais ACs pertencem a cada requirement ID. Reconstruí o mapeamento a partir das citações nos próprios testes, que são consistentes (`UI-01` = ACs 1, 2, 4, 5; `UI-02` = ACs 3, 6, 7, 8; `UI-03` = AC 9; e assim por diante). As únicas exceções são os comentários de `loading.tsx:1` e `error.tsx:5`, que rotulam os ACs 7 e 8 como `UI-01` — contra a maioria e contra o `tasks.md`. Isso é, em si, uma fraqueza do spec: **um mapa explícito requirement → AC deveria estar na tabela de traceability**.

---

## 8. Summary

**Overall: ❌ Not Ready** — mas por margem estreita, e por cobertura, não por implementação.

**Spec-anchored check**: 60/67 ACs com resultado asserido batendo com o spec · 6 ACs sem nenhuma evidência · 1 parcial · 4 lacunas de precisão do spec sinalizadas
**Sensor**: 14 mutações, **12 mortas**, 2 sobreviventes (ambas lacunas reais, diagnosticadas)
**Gates**: unit 0 · integration 0 · e2e 0 · verify 0
**Traceability**: 26/32 promovidos a `Verified`; 2 rebaixados de `Verified` por falta de lastro

**O que funciona, e funciona bem**: a dor central está resolvida e **provada de ponta a ponta** — `e2e/compra-parcelada.spec.ts:112-119` cadastra em março e encontra a parcela 2/3 em abril com um único `page.goto` entre as duas coisas. O núcleo aritmético tem 100% de branches, teste de propriedade com 2000 execuções sobre a conservação da soma, e resistiu a todas as 8 mutações que o atingiram, incluindo as duas que o `AD-011` declara obrigatórias. A separação entre os eixos competência e caixa é enforçada pela **forma dos tipos** e verificada por assertions sobre listas fechadas de chaves. A allowlist de autenticação é uma função pura aplicada num único ponto que todo provider atravessa, e o provider de teste do e2e passa por ela em vez de contorná-la — o e2e testa o AC, não um bypass.

**O que impede o PASS**: a ironia é que a lacuna mais séria está exatamente na propriedade que o projeto mais orgulhosamente declara. O `AD-003` diz que a dupla contagem fica "impossível de compilar"; a regra 5 do `AGENTS.md` diz "não acrescente as colunas". Nada verifica isso. Acrescentei as colunas e a suíte inteira ficou verde. Uma invariante estrutural sem teste é uma convenção com boa reputação — e convenções erodem em silêncio, que é precisamente o argumento que o próprio `AD-006` usa para justificar o `arquitetura.test.ts`. O padrão certo já existe no repositório (`arquitetura.test.ts` lê `biome.json`; `movimento.repository.integration.test.ts:155` fecha as chaves do mapeamento); ele só não foi aplicado a `pagamento_fatura`.

**Next steps**: Fix 1 é bloqueante e barato — uma consulta a `information_schema.columns`. Fix 2 é barato e fecha o buraco de `src/app/**` na configuração do `vitest`. Fixes 3, 4 e 5 tocam ACs de P2/P3 cujo domínio o spec coloca em escopo; o Fix 5 precisa antes de uma decisão de spec sobre o que é "estorno explícito". Fix 6 e 7 são de registro.
