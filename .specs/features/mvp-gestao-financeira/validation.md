# mvp-gestao-financeira Validation

**Veredito final (iteração 3, HEAD `146b9a8`): PASS ✅ — 32/32 requisitos `Verified`, 63/63 acceptance criteria com evidência**

**Result**: PASS

> Trilha de evidência, preservada na íntegra: iteração 1 (HEAD `f62f27c`) — **FAIL**, seções 1 a 8.
> Iteração 2 (HEAD `14c4a35`) — PASS com 1 requisito pendente, seção **9**.
> Iteração 3 (HEAD `146b9a8`) — adjudicação final, seção **10**. Onde as seções divergirem, vale a mais recente.

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

---

# 9. Iteração 2 — re-verificação (HEAD `14c4a35`)

**Veredito da iteração 2: PASS ✅**

**Range re-verificado**: `3c23b16..14c4a35` (4 commits, 5 arquivos, +170 / −9)
**Método**: re-derivado do `spec.md`. Não confiei no resumo do coordenador — e fiz bem: dois pontos dele não conferem (itens **B** e **F** abaixo).

## 9.1 Gates (executados por mim, nesta iteração)

| Gate | Resultado | Exit | Delta vs. iteração 1 |
| --- | --- | --- | --- |
| `pnpm test:unit` | 28 arquivos, **365 testes**; branches `src/domain` **128/128** | **0** | +2 arquivos, **+7 testes** |
| `pnpm test:integration` | 8 arquivos, **115 testes** | **0** | **+3 testes** |
| `pnpm test:e2e` | **10 testes** | **0** | — |
| `pnpm verify` | tudo verde, `✓ Compiled successfully` | **0** | — |

Total **490** (era 480). Contagem só subiu; nenhum teste removido, nenhum `skip`, nenhuma assertion enfraquecida. Os +7 e +3 batem exatamente com os arquivos novos (2 de `loading` + 5 de `error`; 3 de `pagamento_fatura`/`movimento`).

## 9.2 Lacuna 1 (Blocker, AD-003) — **fechada**

Teste novo em `src/infrastructure/db/restricoes.integration.test.ts:296-347`, lendo `information_schema.columns` do Postgres real — não o objeto Drizzle, que é a escolha certa: o que vale é o que a migration criou.

- `:301` — `expect(colunas, "<mensagem que cita o AD-003>").toEqual(COLUNAS_PAGAMENTO_FATURA)` com `COLUNAS_PAGAMENTO_FATURA = ["criado_em","data_pagamento","fatura_id","id","valor_pago_centavos"]`
- `:319` — `expect(colunas, …).not.toContain("natureza")`
- `:326` — `expect(colunas, …).not.toContain("categoria_id")`
- `:337` — `expect(colunas, …).toEqual(expect.arrayContaining(["natureza","categoria_id"]))` sobre `movimento`

O `ORDER BY column_name` na consulta (`:286`) torna a igualdade de lista ordenada equivalente a igualdade de conjunto, já que nome de coluna é único por tabela. Correto.

**Reavaliação de MOV-02 AC 2**: coberto, com o valor asserido batendo exatamente com o que o spec define ("tabela própria, sem natureza e sem categoria"). **MOV-02 promovido a `Verified`** — a marca que rebaixei na iteração 1 agora tem lastro.

Ponto de qualidade que merece registro: as três assertions carregam mensagem de falha que explica *por que* a invariante existe e instrui "Se a mudança é mesmo desejada, mude o AD-003 antes de mudar este teste". Isso converte uma falha de teste em prompt de decisão, que é o contrário do convite a relaxar o teste.

## 9.3 Lacuna 2 (Major, `src/app/**`) — **fechada**

`vitest.config.ts:46` passou a incluir `src/app/**/*.test.tsx` no project `componentes`. 7 testes novos:

- `src/app/(app)/[competencia]/loading.test.tsx:18` — `const aviso = screen.getByRole("status")` + `:19` — `expect(aviso.getAttribute("aria-live")).toBe("polite")`; `:25` — `expect(screen.getByRole("status").textContent).toMatch(/carregando/i)`
- `src/app/(app)/[competencia]/error.test.tsx:31` — `expect(screen.getByRole("alert").textContent).toMatch(/não foi possível carregar/i)`
- `:37` — `expect(screen.getByRole("alert").textContent).toContain("abc123def")` (identificador de correlação)
- `:44-47` — `expect(naTela).not.toContain(MENSAGEM_TECNICA)`, `expect(naTela).not.toContain(LINHA_DE_STACK)`, `expect(naTela).not.toMatch(/\bat \S+ \(/)`, `expect(screen.queryByText(new RegExp(MENSAGEM_TECNICA,"i"))).toBeNull()`
- `:54-55` — `expect(naTela).not.toMatch(/undefined|null|NaN/)` e `expect(naTela).toMatch(/sem-identificador/)` (digest ausente)
- `:64` — `expect(reset).toHaveBeenCalledTimes(1)`

A **metade negativa** (`:44-47`) é o que faz este teste valer: mostrar o código de correlação sem esconder a mensagem técnica seria vazamento, e o AC 8 pede as duas coisas. O teste constrói um erro com `stack` sintética (`:20-25`) em vez de confiar no stack real, o que torna a assertion determinística.

**Reavaliação de UI-02**: ACs 3, 6, 7 e 8 todos cobertos. **UI-02 promovido a `Verified`**.

## 9.4 Sensor — iteração 2

15 mutações novas, em `git worktree add --detach` descartável (sem `git stash`). Baseline `git status --porcelain` vazio antes e idêntico depois; `next-env.d.ts`, sujo pelo e2e, restaurado.

| # | Onde | Mutação | Gate | Resultado |
| --- | --- | --- | --- | --- |
| A | `loading.tsx` | `return null` — **o sobrevivente nº 13 da iteração 1** | componentes | ✅ **Morto** (2 testes) |
| B | `error.tsx:24` | identificador de correlação removido — **o outro sobrevivente nº 13** | componentes | ✅ **Morto** (2 testes) |
| C | `error.tsx:21` | vaza `{error.message}` na tela | componentes | ✅ **Morto** — `não expõe a mensagem técnica` |
| D | `error.tsx:21` | vaza `{error.stack}` na tela | componentes | ✅ **Morto** — mesma assertion |
| E | `error.tsx:24` | `digest ?? "sem-identificador"` → `String(digest)` (mostra `undefined`) | componentes | ✅ **Morto** — `degrada de forma legível` |
| F | `loading.tsx:4` | remove `role="status"` e `aria-live` | componentes | ✅ **Morto** (2 testes) |
| G | `0000_init.sql` + `schema.ts` | `pagamento_fatura` ganha `natureza` **e** `categoria_id` — **o sobrevivente nº 12 da iteração 1, o blocker** | integration | ✅ **Morto** por 2 testes independentes |
| H | `0000_init.sql` | `pagamento_fatura` ganha **só** `categoria_id` | integration | ✅ **Morto** por 2 testes |
| I | `0000_init.sql` | `pagamento_fatura` **perde** `criado_em` (metade "nenhuma a menos") | integration | ✅ **Morto** pelo conjunto fechado |
| J | `0000_init.sql` | `movimento` perde `categoria_id` (+ a FK) | integration | ✅ **Morto** — 28 testes, **incluindo** `movimento mantém natureza e categoria_id`, que discrimina por conta própria e não só por arrasto |
| K | `0000_init.sql` | `pagamento_fatura` ganha uma coluna **inócua** (`observacao text`) | integration | ✅ **Morto** pelo conjunto fechado |
| L | `0000_init.sql` | `movimento` ganha uma coluna **inócua** (`observacao_livre text`) | integration | ❌ **Sobreviveu — por desenho.** Ver 9.5 |
| M | `ratear-parcelas.ts:36` | **AD-011 (a)** — truncamento do resíduo (reconfirmação) | unit | ✅ **Morto** — 21 testes / 6 arquivos |
| N | `competencia.ts:35` | **AD-011 (b)** — `addMeses` sem virada de ano (reconfirmação) | unit | ✅ **Morto** — 21 testes / 8 arquivos |
| O | `vitest.config.ts:46` | **meta-mutação** — reverte o include para excluir `src/app/**` | unit + componentes | ❌ **Sobreviveu.** Ver 9.6 |

**14 de 15 mortas** (L é equivalente por desenho). Somando as duas iterações: **29 mutações, 26 mortas, 1 equivalente, 1 fragilidade estrutural medida, 0 lacunas de comportamento em aberto.**

## 9.5 A assimetria `pagamento_fatura` × `movimento` — **concordo, e agora com evidência**

O coordenador pediu que eu avaliasse a decisão de fechar o conjunto de colunas de `pagamento_fatura` mas fixar em `movimento` apenas a metade assimétrica (`arrayContaining`, "tem que manter", não "só pode ter"). **Concordo, e a mutação L é a prova, não a opinião.**

A garantia do AD-003 é de fato **relativa** e se decompõe em duas condições: (a) `pagamento_fatura` nunca ganha `natureza`/`categoria_id`; (b) `movimento` nunca as perde. O conjunto fechado enforça (a) com folga; o `arrayContaining` enforça (b) com precisão.

Fechar `movimento` também pegaria a mutação L — e L **não é defeito**: acrescentar `observacao_livre` a `movimento` não enfraquece a separação em nada. É um **mutante semanticamente equivalente com respeito ao AD-003**, e forçar um teste a matá-lo degradaria a suíte. O argumento é reforçado pelo próprio roadmap: o AD-003 já prevê que "`movimento` acumula colunas nullable específicas de cada origem", `origem_dado`/`origem_hash` já estão lá para o importador, e o Out of Scope planeja `visibilidade` e `competencia_mes` como colunas aditivas. Um conjunto fechado ali falharia na próxima mudança legítima, seria relaxado, e um teste que se relaxa por rotina para de ser acreditado.

A escolha assimétrica é superior à que eu mesmo sugeri na iteração 1 ("fechar o conjunto de colunas"). **Registro a correção.** O custo residual está medido pela mutação K: o conjunto fechado também recusa uma adição *legítima* a `pagamento_fatura` — e isso é aceitável exatamente porque a mensagem de falha manda mudar o AD-003 primeiro.

## 9.6 Mudança de escopo: legítima, e verifiquei por quê

O coordenador perguntou explicitamente se isto foi adiamento legítimo ou lacuna escondida. **Legítimo, nos três casos** — e não aceitei as justificativas de palavra; testei cada uma.

| AC movido | Justificativa registrada | O que eu verifiquei | Veredito |
| --- | --- | --- | --- |
| **MOV-06 AC 4** — rejeitar alteração de lançamento pago | "Exige definir estorno explícito antes de ser testável" + a regra decidida (desmarcar primeiro, com autor e data) | **A guarda não tem o que guardar hoje.** `grep` por `.update(`/`.delete(` em `src/infrastructure` e `src/application` devolve **uma única** escrita sobre linha existente: `src/infrastructure/db/repositories/movimento.repository.ts:35` — `await this.db.update(movimento).set({ pagoEm }).where(eq(movimento.id, id))`, que mexe **só** em `pagoEm`. Não existe nenhum caminho no código que altere `valor`, `competencia` ou `meioPagamentoId` de lançamento nenhum, pago ou não. `regenerarParcelas` tem **zero chamadores** fora de testes (`grep`: só o barrel `src/domain/index.ts:33` e a própria definição) | ✅ Adiamento. A superfície que o AC protege não foi construída. E o adiamento **resolveu** a lacuna de precisão que eu apontei: a regra agora está escrita |
| **ORC-02 AC 6** — limite por competência | "A tabela já tem chave `(categoria_id, competencia)` e o isolamento existe no schema" | **Verdadeiro, conferido no SQL**: `drizzle/0000_init.sql:161` — `CREATE UNIQUE INDEX "orcamento_categoria_categoria_competencia_uq" ON "orcamento_categoria" USING btree ("categoria_id","competencia")`, mais o `CHECK orcamento_categoria_competencia_dia_1` em `:95`. O isolamento entre meses é estrutural; falta a lógica de resolução e a UI | ✅ Adiamento aditivo |
| **REC-01 AC 4** — versionamento por vigência | "A tabela `recorrencia_versao` já existe no schema" | **Verdadeiro**: `drizzle/0000_init.sql:124-130`, com `vigente_desde date NOT NULL` e `CHECK recorrencia_versao_vigencia_dia_1`. A coluna de vigência, que é a parte que dita retrabalho, já está lá | ✅ Adiamento aditivo |

**Nenhum dos três deveria ter sido implementado agora.** Os três são funcionalidades de Fase 7/8 que o usuário já havia adiado, o schema já as acomoda sem retrabalho, e nenhuma delas tem superfície exposta hoje. Mover um AC para Out of Scope seria trapaça se escondesse comportamento que o usuário vai exercitar; nenhum destes é.

**Uma ressalva honesta sobre MOV-06 AC 4**: `marcarPagamento(id, pagoEm: string | null)` (`src/application/ports/repositories.ts:97`) já aceita `null`, ou seja, **desmarcar pagamento já é possível** na port. O que não existe é o registro de autor e data que a regra nova exige. Quando a Fase 7 ligar a UI de marcar pago, essa metade precisa entrar junto — desmarcar sem rastro é precisamente o furo que a regra existe para fechar. Registrado para que não se perca.

## 9.7 O que o resumo do coordenador diz e os arquivos não confirmam

### B. "A linha `Coverage: 33 total` saiu" — **não saiu, e agora está errada de novo**

`spec.md` ainda traz `**Coverage:** 32 total (a contagem anterior de 33 estava errada), todos cobertos por tasks`. Era o meu texto da iteração 1. A tabela agora tem **29 linhas**. E o parágrafo logo abaixo — também meu — ainda lista `MOV-06`, `ORC-02` e `REC-01` como "Implementing", requisitos que não existem mais. Corrigido por mim nesta iteração.

### F. Os três requisitos saíram inteiros, e levaram junto 8 ACs que continuam em escopo — **o achado desta iteração**

O coordenador descreve a mudança como "os três requisitos saíram da traceability". É literalmente o que aconteceu — e é mais do que se pretendia. Só **3 acceptance criteria** foram movidos para Out of Scope, mas foram apagadas **3 linhas de requisito**, e cada uma carregava outros ACs:

| Requisito apagado | AC que foi para Out of Scope | ACs que ficaram **órfãos**, em escopo e testados |
| --- | --- | --- |
| MOV-06 | AC 4 (alterar lançamento pago) | ACs 1, 2, 3 da história "P2: Previsto versus realizado" — a história inteira ficou **sem nenhum requirement ID** |
| ORC-02 | AC 6 (limite por competência) | ACs 4, 5 e 6-renumerado (indicador global, denominador zero, arredondamento) |
| REC-01 | AC 4 (versionamento) | ACs 1 e 2 (confirmar valor real sem vazar para outro mês; sobrescrita manual) |

São **8 acceptance criteria** que continuam no spec, continuam implementados e continuam cobertos — com a evidência que localizei na iteração 1, ainda válida — mas que hoje **nenhum requirement ID rastreia**. A tabela de traceability existe justamente para que nada fique sem dono; oito ACs ficaram.

A evidência de que foi over-deletion mecânica e não ocultação está espalhada pelo repositório: **14 citações** nos testes (`grep -rno "MOV-06\|ORC-02\|REC-01"` em `src` e `e2e`) e **16 em `tasks.md`** ainda apontam para IDs que sumiram da tabela — entre elas `src/domain/recorrencia/valor-efetivo.test.ts:26` (`REC-01, AC 1`) e `src/domain/orcamento/avaliar-orcamento.test.ts:110` (`ORC-02, AC 4`). Ninguém escondeu nada: apagou-se a linha errada.

**Por que isto não derruba o PASS**: nenhum comportamento ficou sem teste. É defeito do artefato de rastreabilidade, não de cobertura — a mesma classe do item 7 da iteração 1, que ranqueei como Minor. Mas precisa ser corrigido antes que a tabela volte a significar alguma coisa, porque uma tabela que perde ACs em silêncio é pior que nenhuma tabela: ela afirma completude.

## 9.8 Checagem ancorada no spec — iteração 2

O spec passou de 67 para **64 acceptance criteria** em escopo (3 movidos para Out of Scope). Re-contados por script a partir das histórias: 9 + 5 + 7 + 9 + 6 + 8 + 7 + 3 + 6 + 4 = **64**.

- **63 cobertos** com `arquivo:linha`, expressão reproduzida e valor batendo com o spec.
- **1 parcial**: REC-02 AC 4 (ver 9.9).
- **0 sem evidência** — era 6 na iteração 1.
- Lacunas de precisão do spec: caíram de 4 para **3**. A de MOV-06 AC 4 ("estorno explícito" indefinido) foi **resolvida** — a regra está escrita no Out of Scope. Permanecem: UI-02 AC 3 (não fixa status HTTP), MOV-01 AC 1 (universal negativo sem observável), REC-02 AC 4 (não fixa o tamanho da janela).

Toda a evidência das seções 2 a 5 desta página foi conferida contra o HEAD novo e continua válida: os 4 commits desta iteração não tocaram nenhum arquivo de produção, só `vitest.config.ts`, `spec.md` e três arquivos de teste.

## 9.9 REC-02 — permanece `Implementing`, e por quê

REC-02 AC 4 (renumerado; era AC 5): *"WHILE uma recorrência não possui competência de fim, o sistema SHALL **materializar** ocorrências em uma janela rolante limitada"*.

Não existe materializador nesta feature. O que existe e é testado é `projetarProximosMeses`, que limita a janela da **projeção**: `src/domain/mes/projecao.test.ts:140` — `expect(projecao).toEqual([…3 competências…])` com 24 ocorrências semeadas, e `:145` — `expect(projecao).toHaveLength(3)`. Isso prova que a *leitura* é limitada; não prova nada sobre a *geração*, que é o sujeito do AC.

Evidence-or-zero: não promovo REC-02 com base em proxy. **Permanece `Implementing`.**

A observação construtiva é que este AC está na mesma situação dos três que acabaram de sair: a materialização de recorrência é Fase 7, e o próprio Out of Scope já diz "UI de marcar pago, lançamento avulso e recorrência | Fase 7". O AC 4 simplesmente ficou para trás quando os outros saíram. As duas saídas honestas são (a) movê-lo para Out of Scope com a mesma justificativa dos outros três, ou (b) implementar o materializador limitado. **Não é (c) promover REC-02 assumindo que a projeção conta.**

## 9.10 Traceability — iteração 2

| Requirement | Status iteração 1 | Status iteração 2 | Motivo |
| --- | --- | --- | --- |
| **MOV-02** | Implementing (rebaixado por mim) | ✅ **Verified** | AC 2 coberto em `restricoes.integration.test.ts:301,319,326`; mutações G, H, I, K mortas |
| **UI-02** | Implementing | ✅ **Verified** | ACs 3, 6, 7, 8 cobertos; mutações A, B, C, D, E, F mortas |
| REC-02 | Implementing | ❌ **Implementing** | AC 4 coberto apenas por proxy (9.9) |
| Os outros 26 | Verified | ✅ Verified (reconferidos) | Nenhum arquivo de produção mudou nesta iteração; mutações M e N reconfirmam o núcleo |

**28 de 29 requisitos em `Verified`.**

## 9.11 O que permanece frágil apesar do PASS

Um PASS que não separa "provado" de "ainda não quebrou" não serve para nada. Isto é o que **não** está provado:

1. **A traceability perdeu 8 ACs de vista (9.7 F).** Correção necessária, de documento: reintroduzir MOV-06, ORC-02 e REC-01 cobrindo apenas os ACs que ficaram em escopo — ou renumerar os IDs e atualizar as 14 citações nos testes e as 16 em `tasks.md`. Enquanto não for feito, a tabela afirma uma completude que não tem. **Recomendo fazer antes de considerar a feature encerrada**, e é a única coisa desta lista que eu pediria de volta.

2. **Nada protege o `vitest.config.ts` (mutação O).** Reverter o include de `src/app/**` faz 7 testes sumirem e a suíte fica **verde** — 28→26 arquivos, 365→358 testes, exit 0. A correção da lacuna 2 depende de uma linha de configuração que nenhum teste vigia; é a mesma classe de erosão silenciosa que o AD-006 cita para justificar o `arquitetura.test.ts`. **Não estou pedindo correção** — um teste que assere a configuração do próprio runner tem valor duvidoso, e um glob mais largo (`src/**/*.test.tsx`) resolveria melhor do que uma assertion. Registro porque é exposição medida, não hipotética.

3. **O eixo caixa é parcial por escopo.** `obterVisaoMensal` soma apenas os lançamentos *desta* competência já pagos; a fórmula do `design.md:207` inclui `Σ pagamentoFatura.valor`, que não tem repositório nesta feature. A tela rotula o número como caixa em vez de apresentá-lo como total do mês, o que é honesto — mas o número **não é** o caixa completo, e nenhum teste poderia detectar isso porque é limite de escopo, não defeito. Quando `pagamento_fatura` ganhar repositório, os testes do eixo caixa precisam crescer junto.

4. **`pagamento_fatura` nunca é escrita nem lida em teste nenhum.** A forma da tabela agora está provada; o *comportamento* dela não existe ainda. Cuidado com a leitura "MOV-02 está Verified, logo o pagamento de fatura funciona" — o que está verificado é que a dupla contagem é estruturalmente impossível, não que registrar pagamento de fatura funcione.

5. **`regenerarParcelas` é código sem chamador em produção.** 153 linhas de domínio com 8 testes e zero uso fora deles. Está correto e coberto, mas é superfície que ainda não foi exercitada por nenhum caminho real — e quando for ligada, é ela que vai encostar em MOV-06 AC 4, o AC que acabou de sair de escopo.

6. **Os testes de concorrência são simulações.** `sessao.integration.test.ts:148-156` e `compra.repository.integration.test.ts:280-292` reproduzem a janela de corrida com dublês determinísticos, não com concorrência real. Os próprios testes documentam isso. É a escolha certa para uma suíte reprodutível, mas o comportamento sob corrida real nunca foi observado.

7. **A cobertura de 100% de branches vale só para `src/domain`.** `coverage.include` em `vitest.config.ts:17` é `["src/domain/**/*.ts"]`. Aplicação, infraestrutura e componentes não têm número de cobertura nenhum — o que eu verifiquei ali foi mapeamento AC→assertion e discriminação por mutação, que é mais forte que cobertura, mas não é exaustivo do mesmo jeito.

## 9.12 Summary — iteração 2

**Overall: ✅ Ready**, com um item de documento pendente (9.11.1).

**Spec-anchored check**: 63/64 ACs com valor asserido batendo com o spec · 1 parcial · **0 sem evidência** · 3 lacunas de precisão do spec
**Sensor (iteração 2)**: 15 mutações, **14 mortas**, 1 equivalente por desenho · acumulado nas duas iterações: 29 mutações, 26 mortas
**Gates**: unit 0 · integration 0 · e2e 0 · verify 0 · 490 testes
**Traceability**: 28/29 `Verified`

**O que mudou de verdade**: os dois mutantes que sobreviveram na iteração 1 morrem agora, e morrem pelos testes certos — não por arrasto. O blocker do AD-003 morre por duas assertions independentes, com mensagem que ensina por que a invariante existe. A correção dos estados de UI cobre as duas metades do AC 8, inclusive a negativa, que é a que costuma faltar. E as três mudanças de escopo resistiram à verificação: cada justificativa apoiada em schema foi conferida no SQL, e a que dependia de "não há superfície exposta" foi conferida por busca exaustiva dos caminhos de escrita.

**O que eu ainda entrego como dívida**: a tabela de traceability perdeu 8 acceptance criteria de vista ao apagar três linhas inteiras quando só três critérios saíram. Nenhum comportamento ficou descoberto — mas o artefato que existe para garantir isso deixou de conseguir prová-lo.

---

# 10. Iteração 3 — adjudicação final (HEAD `146b9a8`)

**Veredito final da feature: PASS ✅ — 32 de 32 requisitos `Verified`.**

**Range**: `45fc89b..146b9a8` (1 commit, só `spec.md`).
**Gates**: não re-rodados por inteiro, por instrução e porque nada de código mudou — confirmei essa premissa em vez de aceitá-la: `git diff --name-only f62f27c..146b9a8 -- src e2e vitest.config.ts` devolve exatamente 4 arquivos, todos da iteração 2 (`error.test.tsx`, `loading.test.tsx`, `restricoes.integration.test.ts`, `vitest.config.ts`), e o diff em `restricoes` é `@@ -279,0 +280,68 @@`, ou seja, **append puro**: nenhuma citação `arquivo:linha` da iteração 1 foi deslocada. Rodei só o necessário para adjudicar os 4: os 6 arquivos de teste do domínio/aplicação envolvidos (**58 testes, exit 0**) e os 2 de integração (**24 testes, exit 0**).

O spec passou de 64 para **63 acceptance criteria** em escopo (REC-02 AC 4 movido para Out of Scope). Tabela: **32 linhas**.

## 10.1 Adjudicação dos quatro `Implementing`

### MOV-06 — "P2: Previsto versus realizado" → ✅ **Verified**

Meu mapa por citação: MOV-06 = ACs 1, 2, 3, 4. AC 4 fora de escopo → restam **1, 2, 3**. É o único ID da história, então cobre os três.

| AC restante | Resultado que o spec define | `arquivo:linha` + expressão | Result |
| --- | --- | --- | --- |
| 1 | `pagoEm` preenchido → realizado; vazio → previsto | `src/domain/mes/resumo-mensal.test.ts:171` — `expect(resumo.caixaView.saidas).toBe(30000)` e `:172` — `expect(resumo.competenciaView.pendente).toBe(70000)` no mesmo cenário (um pago de 30000, um previsto de 70000); `src/infrastructure/db/repositories/movimento.repository.integration.test.ts:170` — `expect(lancamento?.pagoEm).toBe("2026-03-18")` + `:171` — `expect(lancamento?.valor).toBe(33334)` (marcar pago não altera o valor) | ✅ |
| 2 | pendente = despesas da competência sem `pagoEm` | `src/domain/mes/resumo-mensal.test.ts:222` — `expect(resumo.competenciaView.pendente).toBe(70000)` num cenário que inclui receita, investimento, outra competência, um pago e um cancelado — todos excluídos | ✅ |
| 3 | quebrado por competência, nunca agregado num número | `src/domain/mes/projecao.test.ts:45` — `expect(projecao).toEqual([{competencia:ABRIL,comprometido:40000},{competencia:MAIO,comprometido:70000}])`; `:98` — `expect(projecao).toEqual([{competencia:ABRIL,comprometido:40000}])` excluindo pago/receita/investimento/cancelado/corrente; `src/application/mes/obter-visao-mensal/handler.test.ts:210` — `expect(visao.futuro).toEqual([{competencia:"2026-04",comprometido:33333},{competencia:"2026-05",comprometido:33333},{competencia:"2026-06",comprometido:0}])` | ✅ |

### ORC-02 — "P2: Orçamento por categoria" → ✅ **Verified**

Meu mapa: ORC-01 = ACs 1, 2, 3 (citado em `avaliar-orcamento.test.ts:20,42,79`); ORC-02 = ACs 4, 5 (citado em `:110,126`) **e** o AC de arredondamento, hoje renumerado de 7 para **6**.

| AC restante | Resultado que o spec define | `arquivo:linha` + expressão | Result |
| --- | --- | --- | --- |
| 4 | `total gasto ÷ soma dos limites` | `src/domain/orcamento/avaliar-orcamento.test.ts:122` — `expect(avaliacao.percentualGlobal).toBe(9500)` (380000/400000 = 95,00%) | ✅ |
| 5 | soma dos limites zero → global nulo, sem `NaN` | `src/domain/orcamento/avaliar-orcamento.test.ts:134` — `expect(avaliacao.percentualGlobal).toBeNull()` + `:135` — `expect(Number.isNaN(avaliacao.percentualGlobal)).toBe(false)`; `:145` — idem para limites declarados com valor zero | ✅ |
| 6 | arredondar ao centésimo, empate **para cima** | `src/domain/mes/resumo-por-categoria.test.ts:218` — `expect(percentual(2 as Cents, 3 as Cents)).toBe(6667)`; `:223` — `expect(percentual(1 as Cents, 32 as Cents)).toBe(313)` (empate exato 3,125% → 3,13%; truncar daria 312); `:228` — `toBe(3333)` como controle abaixo de meio; `:245-247` — `313 / 313 / 9374` somando `CEM_PORCENTO`, escolhidos porque as categorias pequenas é que denunciam o modo de arredondamento; `src/domain/orcamento/avaliar-orcamento.test.ts:159` — `toBe(6667)` e `:169` — `toBe(313)` no consumo, que não tem correção de sobra para mascarar | ✅ |

**Divergência de atribuição, declarada**: o AC 6 (arredondamento) é o único dos 63 que **não tem citação de ID em teste nenhum**. Atribuí a ORC-02 por eliminação — é da história "Orçamento", e ORC-01 já está citado para os ACs 1, 2 e 3. A inferência não muda nada material: o AC está coberto, e as duas atribuições possíveis levam ao mesmo veredito. Registro porque o mapa requisito → AC continua sendo inferido, e não declarado pelo spec.

### REC-01 — "P3: Recorrência com valor variável" → ✅ **Verified**

Meu mapa: REC-01 = ACs 1, 2, 4. AC 4 fora de escopo → restam **1, 2**.

| AC restante | Resultado que o spec define | `arquivo:linha` + expressão | Result |
| --- | --- | --- | --- |
| 1 | altera só a competência confirmada; preserva o previsto; não toca as outras | `src/domain/recorrencia/valor-efetivo.test.ts:51` — `).toEqual([PREVISTO, REAL, PREVISTO])` sobre os efetivos dos três meses; `:52` — `expect(depois[0]).toEqual({competencia:MARCO, valorPrevisto:PREVISTO, valorReal:null})` e `:53` idem para MAIO; `:59` — `expect(depois[1]).toEqual({competencia:ABRIL, valorPrevisto:PREVISTO, valorReal:REAL})` (o previsto original **sobrevive** à confirmação); `:70` — `expect(antes).toEqual(tresMeses())` (não muta a lista recebida) | ✅ |
| 2 | marcada como sobrescrita; nova materialização não altera seu valor | `src/domain/recorrencia/valor-efetivo.test.ts:83` — `expect(rematerializada.sobrescritaManualmente).toBe(true)` + `:84` — `expect(rematerializada.valorEfetivo).toBe(REAL)`, com um `novoPrevisto` de 31000 chegando pela rematerialização e sendo ignorado | ✅ |

### REC-02 — "P3: Recorrência com valor variável" → ✅ **Verified**

Meu mapa: REC-02 = ACs 3 e 5. O AC 5 (janela rolante de materialização) foi movido para Out of Scope nesta iteração → resta **só o AC 3**.

| AC restante | Resultado que o spec define | `arquivo:linha` + expressão | Result |
| --- | --- | --- | --- |
| 3 | materialização repetida na mesma competência **não cria lançamento duplicado** | `src/infrastructure/db/restricoes.integration.test.ts:205` — `expect(erro.code).toBe("23505")` + `:206` — `expect(erro.constraint).toBe("movimento_recorrencia_competencia_uq")`, contra Postgres real, inserindo duas vezes a mesma `(recorrencia_id, competencia)` | ✅ |

**Por que isto não é a mesma cobertura por proxy que recusei na iteração 2**, já que também não existe materializador: a diferença é o sujeito do AC. O antigo AC 5 dizia "SHALL **materializar** em janela limitada" — o sujeito é o comportamento de geração do materializador, que não existe, e a janela da projeção era outra função respondendo outra pergunta. O AC 3 diz "SHALL **não criar** lançamento duplicado" — é uma garantia negativa sobre o razão, e a restrição de unicidade no banco **é** a implementação dela. Ela vale hoje, vale contra qualquer inserção venha de onde vier, e é justamente o que vai impedir o futuro materializador de duplicar. O teste insere duas vezes e prova que a segunda não vira linha, que é exatamente o resultado que o spec define. Cobertura direta, não proxy.

### Nenhum requisito ficou sem AC

Conferi as três histórias afetadas: "Previsto versus realizado" tem 3 ACs e um ID (MOV-06 = 1,2,3); "Orçamento" tem 6 ACs e dois IDs (ORC-01 = 1,2,3; ORC-02 = 4,5,6); "Recorrência" tem 3 ACs e dois IDs (REC-01 = 1,2; REC-02 = 3). **Nenhuma linha ficou vazia, nenhuma deveria sair.** A reintrodução dos três IDs estava certa, e a de REC-02 permanece justificada agora que ele tem um AC seu.

## 10.2 A reintrodução não inventou cobertura

Conferido item a item: a atribuição do coordenador (por leitura) coincide com o meu mapa (por citação nos testes) nos quatro casos. As três linhas voltaram para as mesmas histórias de onde saíram, e cada AC restante tem assertion localizada — todas conferidas **de novo** neste HEAD, com os números de linha re-extraídos por `grep -n`, não copiados do meu relatório anterior.

**Duas correções minhas, de off-by-one na iteração 1**, que a re-extração pegou: eu citei `avaliar-orcamento.test.ts:123` para o indicador global (o certo é **:122**; 123 é o `});`) e `:160` para o consumo 66,67% (o certo é **:159**). As expressões que reproduzi estavam corretas; os ponteiros, um a mais. Corrigido acima. Registro porque um relatório que cobra citação exata dos outros não pode errar a própria.

## 10.3 Traceability final

| Bloco | Status |
| --- | --- |
| PARC-01 … PARC-08 (8) | ✅ Verified |
| COMP-01 … COMP-04 (4) | ✅ Verified |
| MOV-01 … MOV-05 (5) | ✅ Verified |
| **MOV-06** | ✅ **Verified — promovido na iteração 3** |
| CART-01 … CART-03 (3) | ✅ Verified |
| ORC-01 | ✅ Verified |
| **ORC-02** | ✅ **Verified — promovido na iteração 3** |
| **REC-01** | ✅ **Verified — promovido na iteração 3** |
| **REC-02** | ✅ **Verified — promovido na iteração 3** |
| AUTH-01, AUTH-02 (2) | ✅ Verified |
| UI-01, UI-02, UI-03 (3) | ✅ Verified |
| DADO-01, DADO-02 (2) | ✅ Verified |

**32 de 32 `Verified`.** 63 acceptance criteria em escopo, **63 com evidência `arquivo:linha` e valor asserido batendo com o spec**. Zero sem evidência, zero parciais.

Lacunas de precisão do spec remanescentes: **2** — UI-02 AC 3 (não fixa status HTTP para a página de não encontrado) e MOV-01 AC 1 ("não somar as tabelas de plano" é universal negativo sem observável direto). As outras duas foram resolvidas: MOV-06 AC 4 pela regra escrita no Out of Scope, REC-02 AC 4 pela remoção do escopo.

## 10.4 Onde a verificação por mutação para de ajudar

O coordenador observou que dos três defeitos encontrados depois do código estar verde — o AD-003 que era só comentário, o `src/app` fora da suíte, a dívida de traceability — **nenhum foi achado pelos 46 mutantes que ele rodou**. Vale registrar por quê, porque a razão é estrutural e não é sobre esforço.

Mutação responde **"meus testes discriminam o código que existe?"**. Os três defeitos eram sobre coisas que **não existiam**:

1. **AD-003 como comentário** — não havia código expressando a invariante para mutar. Chegar nela exige mutar a *forma do schema*, que não é uma categoria de mutação que ocorra a quem já acredita que a invariante está protegida. Para escolher essa mutação, era preciso já suspeitar da lacuna: a mutação confirma, não descobre.
2. **`src/app` fora da suíte** — a mutação até existe (esvaziar `loading.tsx`), mas campanha de mutação normalmente é guiada por cobertura, e código que nenhum teste importa ou é pulado como "já sabidamente descoberto" ou nem é instrumentado. O ponto cego se protege sozinho.
3. **Dívida de traceability** — não há código nenhum para mutar. É defeito de documento.

O padrão: **a lista de mutações é desenhada a partir do modelo que o autor tem do sistema, e é esse mesmo modelo que produziu o ponto cego.** É exatamente a razão pela qual este papel existe separado do de quem implementa — e mutação, sozinha, não escapa dela, porque herda o modelo em vez de re-derivá-lo.

O que achou os três foi outra operação: **enumerar a partir do `spec.md`, frase por frase, e perguntar "onde está a assertion desta sentença?"** — evidence-or-zero. Enumeração por requisito percorre o que *deveria* existir; mutação percorre o que existe. Só a primeira encontra ausência.

Duas regras práticas que eu tiraria disto, se servirem para as próximas features:

- **Mutação é verificador de força de teste, não descobridor de lacuna.** A ordem que funciona é: enumerar do spec para decidir *onde olhar*; mutar para decidir se *o que se achou* é real. Invertida, ela confirma o que já se acreditava.
- **O mutante de maior rendimento é aquele para o qual você precisa inventar uma categoria nova.** Schema, configuração do runner, presença de arquivo num glob — precisar criar a categoria é o sinal de que aquela área nunca foi modelada. Os três defeitos desta feature caíram exatamente em categorias que não estavam na lista inicial de ninguém, inclusive na minha: na iteração 1 eu só cheguei no AD-003 porque a enumeração do spec me deixou com um AC sem nenhuma assertion, e aí a mutação de schema virou a pergunta óbvia.

## 10.5 Veredito final

**PASS ✅ — a feature está pronta.**

**Spec-anchored check**: **63/63** ACs em escopo com evidência `arquivo:linha` e valor batendo com o spec · 0 sem evidência · 0 parciais · 2 lacunas de precisão do spec, ambas registradas e nenhuma bloqueante
**Sensor (acumulado nas 3 iterações)**: **29 mutações, 26 mortas**, 1 equivalente por desenho (`movimento` ganhando coluna inócua), 1 fragilidade estrutural medida e aceita (`vitest.config.ts` sem vigia), 0 lacunas de comportamento em aberto
**Gates** (medidos na iteração 2, com o mesmo código): unit 0 · integration 0 · e2e 0 · verify 0 · **490 testes**
**Traceability**: **32/32 `Verified`**

**O que permanece frágil apesar do PASS** — a lista da §9.11 continua valendo, menos o item 1, que foi fechado. Em ordem de importância para quem for mexer nisto depois:

1. **Nada vigia o `vitest.config.ts`.** Reverter uma linha faz 7 testes sumirem com a suíte verde. Medido, não hipotético.
2. **O eixo caixa é parcial por escopo** — falta `Σ pagamentoFatura.valor` da fórmula do `design.md:207`. A tela é honesta ao rotular, mas o número não é o caixa completo.
3. **`pagamento_fatura` tem a forma provada e o comportamento inexistente.** MOV-02 `Verified` significa "a dupla contagem é estruturalmente impossível", não "registrar pagamento de fatura funciona".
4. **`regenerarParcelas` é domínio sem chamador** — 153 linhas, 8 testes, zero uso real. É ela que vai encostar em MOV-06 AC 4 quando a Fase 7 ligar a edição.
5. **Testes de concorrência são simulações determinísticas**, por escolha consciente e documentada nos próprios testes.
6. **100% de branches vale só para `src/domain`.** Nas outras camadas o que existe é mapeamento AC→assertion e discriminação por mutação — mais forte em profundidade, não exaustivo em largura.
7. **O mapa requisito → AC continua inferido**, não declarado pelo spec. Reconstruí por citação nos testes; um AC (o de arredondamento) não tem citação nenhuma e foi atribuído por eliminação. Se a tabela passar a listar os ACs de cada ID, este relatório deixa de ser a única fonte desse mapa — que é onde ele está hoje, por decisão registrada na própria linha `Coverage`.
