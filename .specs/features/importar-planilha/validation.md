# Importar a planilha — Validação

**Data**: 2026-10-25
**Spec**: `.specs/features/importar-planilha/spec.md` (IMP-01 a IMP-09, 82 critérios, 6 edge cases)
**Faixa do diff**: `caa9484^..272bf8d` — 28 commits, de `caa9484` (T1) a `272bf8d` (T27). O
planejamento entrou antes, em `3dd2eb2` (design) e `6289765` (tasks), e fica fora da faixa.
**Verificador**: sub-agente independente (autor ≠ verificador). Somente leitura sobre código e
teste; as 33 mutações rodaram numa `git worktree` descartável em
`/private/tmp/.../scratchpad/verifier-wt`, **nenhum `git stash`**. Porcelain da árvore real
gravado antes (vazio) e conferido depois (vazio).

## Validation: importar-planilha — **FAIL**

**Result**: FAIL ❌ — **nenhum defeito de comportamento encontrado**. O veredito vem do sensor:
**7 de 33 mutantes sobreviveram**, e 4 deles atingem critérios com resultado preciso na spec.

O que a fatia prova, prova bem. Os dois mutantes obrigatórios do AD-011 morreram. O de `addMeses`
morreu no teste certo e com o defeito exato que motivou a fatia: dezembro + 1 deu `"2026-01"`
contra o `"2027-01"` esperado (`src/app/actions/importacao.integration.test.ts:329`). A sequência
outubro → novembro → dezembro contra Postgres bate, linha por linha, com o estado final do
`design.md`. Rollback, trava consultiva, sessão primeiro, ordem, banco vazio, divergência sem
confirmação, reconhecimento com tolerância e com a candidata mais próxima: cada um tem um mutante
morto no teste que o declara.

O que não fecha é a rede em quatro pontos, e não o código:

1. **IMP-03 AC 10 — "a grafia da primeira linha".** O mutante "a última linha vence" (M13)
   **sobrevive à fatia inteira**: 214 testes unitários e 13 de integração verdes. Os dois testes que
   dizem provar a regra usam uma fixture em que a última ocorrência de "mercado" é a da tabela de
   categorias, escrita `Mercado`, igual à primeira linha. "Primeira vence" e "última vence" dão o
   mesmo resultado.
2. **IMP-01 AC 11 e IMP-02 AC 1 — limites inclusivos sem caso no limite.** `t = 120` recusado (M30)
   e ano `2100` aceito (M29) passam verdes: os testes só provam o primeiro valor recusado de um lado
   (`3/121`, `1999`).
3. **IMP-07 AC 12 — a primeira cláusula não tem prova.** Parear as vigentes de mesma chave na ordem
   inversa (M28) passa verde, porque nenhum teste tem duas recorrências reconhecíveis com a mesma
   chave. A spec também não diz qual é a ordem das recorrências.
4. **IMP-04 AC 3 na composição da página.** A página deriva `geraFatura` para o diálogo
   (`src/app/(app)/[competencia]/page.tsx:119`). Trocar por `false` (E2), o que poria os cartões em
   "cai em", passa no e2e. O componente está provado com `geraFatura` injetado, e a ligação na página
   não está.

A lacuna que o autor registrou no IMP-09 **se sustenta** e foi confirmada empiricamente: M26 e M27
põem `orcamento_categoria`, `pagamento_fatura` e `fatura` no `TRUNCATE`, e a suíte fica verde.

---

## Task Completion

| Task | Status | Notas |
| --- | --- | --- |
| T1–T5 | ✅ Done | Leitura pura: `csv.ts`, `celula.ts`, `ler-aba.ts`, `competencia-do-arquivo.ts`, `conferir-aba.ts` |
| T6–T9 | ✅ Done | Reprecificação, reconhecimentos e plano, puros; 100% de branches |
| T10, T11 | ✅ Done | `Executor` nos repositórios; migration `0003_registro_de_importacao` |
| T12 | ⚠️ Done, **não compila sozinho** | `7fe7552` declara as ports sem as implementações Drizzle. Medido: `tsc --noEmit` dá **10 erros em 5 arquivos** em `7fe7552` e **0** em `3fca286` (T13). O próprio commit avisa no corpo |
| T13–T15 | ✅ Done | Métodos novos, transação com trava, script de limpeza |
| T16–T19 | ✅ Done | Schema, prévia, gravação, actions |
| T20–T24 | ✅ Done | Cadastro de meio extraído, os três passos, diálogo e resultado |
| T25 | ⚠️ Done, **marcada fora do commit** | `b8be362` regravou um trecho de `tasks.md` (779 → 1.275 linhas) e deixou a T25 aberta na cópia duplicada; `d88e90d` (T26) marcou a T26 nessa cópia. Corrigido em `61eede3` (de volta a 779 linhas) |
| T26, T27 | ✅ Done | e2e de outubro → novembro e da recusa de dezembro; `docs/importacao.md` |

27 tasks, 27 executadas, 168 itens marcados e nenhum aberto em `tasks.md`. As duas ressalvas são de
processo e estão em "Processo", abaixo. Nenhuma afeta o estado final do código.

---

## Critérios de aceitação, ancorados na spec

Legenda: ✅ a assertion afirma o resultado que a spec define · ❌ o sensor mostrou que a assertion
não discrimina · ⚠️ prova parcial ou lacuna de precisão da spec.

### P1: Ler a aba exportada — IMP-01

| Critério | Resultado definido na spec | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| AC 1 — sem `.csv` ou acima de 1 MB → `PLANILHA_ARQUIVO_INVALIDO`, sem prévia | a mensagem desse código, sem blocos | `src/components/importacao/passo-arquivo.test.tsx:185` — `expect((await screen.findByRole("alert")).textContent).toBe(ARQUIVO_INVALIDO)` para `.xlsx`, `:195` para 1.048.577 bytes; `:186`/`:196` `queryByText("4 blocos encontrados")).toBeNull()`. Defesa no servidor: `src/application/schemas/importacao.schema.test.ts:52-71` | ✅ PASS no navegador — ver observação 1 |
| AC 2 — BOM UTF-8 ignorado | primeira célula sem a marca | `src/domain/importacao/csv.test.ts:30` — `expect(lerCsv("﻿Fixos,x\nc,d")).toEqual({ ok: true, value: [["Fixos","x"],["c","d"]] })` | ✅ PASS (M12 morto) |
| AC 3 — título ausente → `PLANILHA_BLOCO_AUSENTE` com o primeiro ausente, na ordem | `detalhes.bloco` = o título | `src/domain/importacao/ler-aba.test.ts:319` — `toEqual({ ok: false, error: { code: "PLANILHA_BLOCO_AUSENTE", detalhes: { bloco: titulo } } })` para os quatro; ordem em `:336-343`; mensagem em `src/app/actions/importacao.integration.test.ts:253-259` e `passo-arquivo.test.tsx:206` | ✅ PASS |
| AC 4 — título comparado sem as pontas | `Gastos do Mês ` encontrado | `ler-aba.test.ts:268-269` — a fixture tem a célula com espaço e `expect(abaDe(outubro).gastos).toHaveLength(3)` | ✅ PASS |
| AC 5 — colunas pela posição do título, nunca fixas | a mesma `AbaLida` deslocada | `ler-aba.test.ts:275` — `expect(lerAba(deslocada)).toEqual({ ok: true, value: OUTUBRO_ESPERADO })` com duas colunas à esquerda | ✅ PASS |
| AC 6 — Fixos até `Total de Cartão de Crédito`, exclusive | 4 lidas + 1 não lida, nada abaixo | `ler-aba.test.ts:191` — `expect(lerAba(outubro)).toEqual({ ok: true, value: OUTUBRO_ESPERADO })` | ✅ PASS (M31 morto, 6 falhas) |
| AC 7 — Entradas da linha abaixo do título até `Total:`, sem cabeçalho | Salário A, Salário B, Reembolso | `ler-aba.test.ts:191` — `OUTUBRO_ESPERADO.entradas` em `:160-164` | ✅ PASS |
| AC 8 — nome e valor vazios → ignorada, mesmo com "Tipo" | fora de lidas e de não lidas | `ler-aba.test.ts:237-242` — posições `[0,1,2]` e `naoLidas.filter(GASTOS)).toEqual([])` | ✅ PASS |
| AC 9 — nome com valor vazio → `VALOR_VAZIO` | o motivo na não lida | `celula.test.ts:30`; `ler-aba.test.ts:299-305` — `toContainEqual({ bloco: "CARTAO", posicao: 2, nome: "Curso", tipo: "Cartão Verde", motivo: "VALOR_VAZIO" })` | ✅ PASS |
| AC 10 — recusado por `parseBRL` → `VALOR_INVALIDO` | `200*` e `-R$ 10,00` | `celula.test.ts:34` e `:22`; `ler-aba.test.ts:424` (Bônus) | ✅ PASS |
| AC 11 — fora de `n/t` com `1 ≤ n ≤ t ≤ 120` → `PARCELA_INVALIDA` | `t = 120` aceito, `t = 121` recusado | `celula.test.ts:46-50` — `12/10`, `0/3`, `3/121`, `3-10`, `""` recusados; `:39-44` aceita `7/10` e `3/3`. **Nenhum caso com `t = 120`** | ❌ GAP — M30 (`>=` no teto) sobrevive |
| AC 12 — valor com nome vazio → `NOME_VAZIO` | o motivo na não lida | `ler-aba.test.ts:281-287` — `toContainEqual({ ..., nome: "", motivo: "NOME_VAZIO" })` | ✅ PASS |
| AC 13 — `R$ 1.234,56` → 123456, sem ponto flutuante | `123456` | `celula.test.ts:6` — `toEqual({ ok: true, value: 123456 })`; o valor passa por `parseBRL` (`celula.ts:48`) | ✅ PASS |
| AC 14 — tabela de categorias até `Gastos por tipo de pagamento` ou o fim, pulando vazias | 8 nomes; sem o rótulo, até o fim | `ler-aba.test.ts:222-231` e `:374-386` | ✅ PASS |
| AC 15 — sem a tabela, lista vazia | `[]`, sem erro | `ler-aba.test.ts:367-368` | ✅ PASS |
| AC 16 — ignora o que está fora dos blocos | nenhum texto ignorado nas lidas | `ler-aba.test.ts:248-264` — `expect(textos).not.toContain(ignorado)` para `X`, `Saldo`, `Investimentos` e mais oito | ✅ PASS |
| AC 17 — uma coluna só → `PLANILHA_ARQUIVO_INVALIDO`, e não bloco ausente | o código exato | `ler-aba.test.ts:354-357`; `src/application/importacao/prever-importacao/handler.test.ts:179-180` | ✅ PASS |
| AC 18 — `R$ 0,00` → `VALOR_ZERO`, e não `VALOR_INVALIDO` | `VALOR_ZERO` | `celula.test.ts:26` — `toEqual({ ok: false, error: "VALOR_ZERO" })`; pt-BR em `passo-conferencia.test.tsx:236` | ✅ PASS (M09 morto) |

### P1: Decidir o mês da aba — IMP-02

| Critério | Resultado definido na spec | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| AC 1 — mês pela aba, sem caixa e acento; ano = último de 4 dígitos **entre 2000 e 2099**; ignora ` (n)` | `{ mes: 10, ano: 2026 }`; 2100 → `null` | `competencia-do-arquivo.test.ts:6-9`, `:13-16` (`(1)`), `:22` (`MARÇO`/`marco`), `:27-30` (último ano), `:45-48` (1999 → `null`); na tela `passo-arquivo.test.tsx:66-67`, `e2e/importacao.spec.ts:113-114`. **Nenhum caso acima de 2099** | ❌ GAP — M29 (`/^2\d{3}$/`) sobrevive |
| AC 2 — sem mês ou ano: seletor vazio e avanço impedido | `""` e `disabled` | `competencia-do-arquivo.test.ts:34`, `:38-41`; `passo-arquivo.test.tsx:159-160` — `expect(ano().value).toBe("")` e `expect(continuar().disabled).toBe(true)` | ✅ PASS |
| AC 3 — competência por extenso + "Confira o ano antes de continuar" | os dois textos | `passo-arquivo.test.tsx:116-117`; troca de ano em `:127` | ✅ PASS |
| AC 4 — "Próximo mês esperado:" + a seguinte à última | `Novembro de 2026` depois de outubro | `passo-arquivo.test.tsx:139`; `prever-importacao/handler.test.ts:106` — `.competenciaEsperada).toBe("2026-11")`; página: `e2e/importacao.spec.ts:156` | ✅ PASS (E1 morto em `:156`) |
| AC 5 — fora de ordem → `IMPORTACAO_FORA_DE_ORDEM` com a esperada, nada gravado | `detalhes.esperada` e o banco intacto | `prever-importacao/handler.test.ts:117-120`; `gravar-importacao/handler.test.ts:384-388` (`fakes.estado).toEqual(antes)`); `importacao.integration.test.ts:512-519` (mensagem "A próxima é Novembro de 2026." e `fotografia()).toEqual(antes)`); `e2e/importacao.spec.ts:208-215` | ✅ PASS (M17 morto) |
| AC 6 — sem registro e com movimento, compra ou recorrência → `IMPORTACAO_BANCO_NAO_VAZIO` | o código | `prever-importacao/handler.test.ts:95`; as três tabelas no repositório: `importacao.repository.integration.test.ts:93`, `:106`, `:124` | ✅ PASS (M16 morto) |
| AC 7 — duas gravações simultâneas → uma registra, a outra `IMPORTACAO_FORA_DE_ORDEM` | 1 registro, 1 recusa com esse código | `importacao.integration.test.ts:575-586` — `filter(r => r.ok)).toHaveLength(1)` e a recusa exata; `transacao-da-importacao.integration.test.ts:255-262` | ✅ PASS (M23 morto: sem trava, a segunda sai `ERRO_INESPERADO`) |

### P1: Transformar cada linha no que ela é — IMP-03

| Critério | Resultado definido na spec | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| AC 1 — pessoa logada, competência confirmada, `data_evento` dia 1, `pago_em` nulo | os quatro campos | `gravar-importacao/handler.test.ts:282-284` — `Set([PESSOA_A])`, `Set(["2026-10-01"])`, `Set([null])` sobre os 20 lançamentos; recorrências em `:125-126`; banco: `importacao.integration.test.ts:501` | ✅ PASS |
| AC 2 — fixo novo: recorrência de despesa, versão desde M, meio, categoria, dia 1 | os campos gravados | `gravar-importacao/handler.test.ts:130-137` — `toEqual` com `natureza`, `meio`, `categoria`, `inicio: "2026-10"`, `diaVencimento: 1`, `versoes: [["2026-10", 150000]]` | ✅ PASS |
| AC 3 — entrada fixa: recorrência de receita, sem categoria, meio de "cai em", dia 1 | `RECEITA`, `null`, `CONTA` | `gravar-importacao/handler.test.ts:135-136` | ✅ PASS |
| AC 4 — entrada avulsa: `movimento` de receita, `AVULSO`, sem categoria | o Reembolso | `gravar-importacao/handler.test.ts:263-271` | ✅ PASS |
| AC 5 — compra `n/t` nova: `qtd = t`, `inicial = n`, parcelas de `n` a `t` | Sofá 7–10 | `planejar-importacao.test.ts:299-348`; `gravar-importacao/handler.test.ts:145-160`; banco `importacao.integration.test.ts:384-393` | ✅ PASS |
| AC 6 — amortizado = parcela × (n − 1), nada antes | 126000, 10000, 8000 | `gravar-importacao/handler.test.ts:153`, `:182`, `:192`, com a primeira parcela em `2026-10` | ✅ PASS |
| AC 7 — Gastos do Mês: `movimento` de despesa, `AVULSO`, meio e categoria | Feira, Farmácia, Padaria | `gravar-importacao/handler.test.ts:236-262` | ✅ PASS |
| AC 8 — avulso com `origem_dado = 'PLANILHA'` e `origem_hash` de competência, bloco e posição | `2026-10\|GASTOS\|2` | `planejar-importacao.test.ts:389-391`; `gravar-importacao/handler.test.ts:243-270`; banco `importacao.integration.test.ts:448-458`; índice único `metodos-da-importacao.integration.test.ts:294-301` | ✅ PASS (M19 morto) |
| AC 9 — nome normalizado igual: reaproveita, reativando a arquivada | `REATIVAR` / `REAPROVEITAR` | `planejar-importacao.test.ts:465-476`; `gravar-importacao/handler.test.ts:315-317` — `[{ id: "categoria-arquivada", nome: "lazer", arquivadaEm: null }]` | ✅ PASS |
| AC 10 — criada **uma vez**, com a grafia **da primeira linha** | "Mercado", e não "MERCADO" nem a da tabela | `planejar-importacao.test.ts:402` — `{ chave: "mercado", grafia: "Mercado", acao: "CRIAR" }`; `gravar-importacao/handler.test.ts:300`. "Uma vez" está provado; "a primeira" não: a última ocorrência (`ler-aba`, tabela `:182`) repete a grafia da primeira | ❌ GAP — M13 sobrevive a 214 + 13 testes |
| AC 11 — nome só da tabela também é criado | Lazer | `planejar-importacao.test.ts:403`; `gravar-importacao/handler.test.ts:301` | ✅ PASS |
| AC 12 — célula vazia → sem categoria | `chaveCategoria: null`, nenhuma categoria `""` | `planejar-importacao.test.ts:491-497` | ✅ PASS |

### P1: Resolver o que o app não sabe — IMP-04

| Critério | Resultado definido na spec | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| AC 1 — "O que precisa de você": seletor por "Tipo" com a quantidade de linhas | Débito 4, Cartão Roxo 8, Cartão Verde 1 | `planejar-importacao.test.ts:201-205`; `passo-pendencias.test.tsx:85-87` — `getByLabelText("Débito (4 linhas)").tagName).toBe("SELECT")` | ✅ PASS |
| AC 2 — "cadastrar" abre `CadastroInline` com o nome e seleciona o meio criado | nome = "Tipo"; valor = id novo | `passo-pendencias.test.tsx:111-113` e `:126-128` — `.value).toBe(NOVO_MEIO)`; `e2e/importacao.spec.ts:167-173` | ✅ PASS |
| AC 3 — "fixa"/"avulsa" e "cai em" só com meios sem fatura | as duas classes; só Conta Corrente | `passo-pendencias.test.tsx:137-139` e `:150` — `toEqual(["Escolha a conta", "Conta Corrente"])` | ⚠️ PASS no componente (M21 morto); **E2 sobrevive** na página (`page.tsx:119`) |
| AC 4 — lembrar ligações e classificações pelo nome normalizado | as decisões gravadas | `gravar-importacao/handler.test.ts:338-339`, `:514-525`; banco `importacao.integration.test.ts:486-495`; upsert `importacao.repository.integration.test.ts:161-171` | ✅ PASS (M25 morto) |
| AC 5 — decisão lembrada aplicada sem perguntar | novembro pede só Cartão Azul e Presente | `prever-importacao/handler.test.ts:128-131`; `importacao.integration.test.ts:314-317`; `e2e/importacao.spec.ts:160-163` | ✅ PASS |
| AC 6 — nada a decidir → pula o passo | da prévia direto à conferência | `dialogo-importacao.test.tsx:169-172` — conferência visível, "Meios de pagamento" ausente, prévia pedida 1 vez | ✅ PASS |
| AC 7 — pendência aberta no servidor → `IMPORTACAO_PENDENCIA_ABERTA`, nada gravado | o código e o estado intacto | `gravar-importacao/handler.test.ts:373-374` | ✅ PASS |

### P1: Conferir antes de gravar — IMP-05

| Critério | Resultado definido na spec | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| AC 1 — por bloco: linhas, soma lida formatada, total da planilha | "4 linhas", "Lido R$ 1.840,00", "Planilha R$ 1.840,00" | `passo-conferencia.test.tsx:72-74` (quatro blocos); `conferir-aba.test.ts:35-37` | ✅ PASS |
| AC 2 — soma = total → conferido | `confere: true`; "Confere" | `conferir-aba.test.ts:35-37` (`diferenca: 0`); `passo-conferencia.test.tsx:81` | ✅ PASS |
| AC 3 — diferente ou ilegível → divergente, com a diferença em reais | −1200; "Diverge em R$ 12,00"; `null` sem total | `conferir-aba.test.ts:41-47`, `:109-115`; `passo-conferencia.test.tsx:88`, `:111` | ✅ PASS (M07 morto) |
| AC 4 — despesas lidas contra `Total:` de Saídas | 238784 confere; 244333 × 248333 não | `conferir-aba.test.ts:51`, `:88-95`; `passo-conferencia.test.tsx:121-123`, `:129` | ✅ PASS |
| AC 5 — destino de cada linha, nos oito textos | os oito rótulos | `passo-conferencia.test.tsx:139` ("novo"), `:141` ("compra nova"), `:159-162` ("reajuste a partir de Novembro de 2026: R$ 100,00 → R$ 110,00", "já existe"), `:171-176` (os dois "continua de"), `:183-187` ("Deixa de valer a partir de"), `:194-198` ("Não aparece nesta aba") | ✅ PASS |
| AC 6 — não lidas com bloco, nome e motivo pt-BR | os cinco motivos | `passo-conferencia.test.tsx:219-223`, `:236` | ✅ PASS |
| AC 7 — divergente → botão desabilitado até "Entendi a diferença…" | `disabled` antes, habilitado depois | `passo-conferencia.test.tsx:249-257`; sem divergência `:263-268`; `e2e/importacao.spec.ts:131-134` | ✅ PASS (M20 morto) |
| AC 8 — servidor recebe divergência sem confirmação → recusa, nada gravado | `IMPORTACAO_DIVERGENCIA_NAO_CONFIRMADA` | `gravar-importacao/handler.test.ts:353-357`; `importacao.integration.test.ts:286-291` | ✅ PASS (M18 morto) |
| AC 9 — "Importar N lançamentos", N = linhas que criam ou alteram | 16, 9, 2 | `planejar-importacao.test.ts:447`, `:641`, `:755`; `passo-conferencia.test.tsx:244`, `:264` | ✅ PASS |

### P1: Gravar tudo ou nada — IMP-06

| Critério | Resultado definido na spec | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| AC 1 — uma transação para categorias, recorrências, versões, encerramentos, compras, parcelas, avulsos, registro e decisões | os cinco repositórios sobre o mesmo `tx` | `transacao-da-importacao.integration.test.ts:219-221` — sete escritas nos cinco repositórios e `fotografia()).toEqual(antes)`; `importacao.integration.test.ts:559` sobre as oito tabelas | ✅ PASS (M24 morto nos dois). Versão e encerramento não aparecem na injeção de falha, mas usam o mesmo repositório de recorrência do `tx` |
| AC 2 — falha desfaz tudo, sem registro | banco igual e `importacao` vazia | `importacao.integration.test.ts:559-560` — `fotografia()).toEqual(antes)` e `contar("importacao")).toBe(0)` com falha no 4º avulso | ✅ PASS |
| AC 3 — revalida as rotas da competência | as três rotas | `importacao.integration.test.ts:525-529` | ✅ PASS |
| AC 4 — sem sessão → código de sessão, antes do banco | `NAO_AUTENTICADO`, nenhuma consulta | `importacao.integration.test.ts:184-189`; primeira instrução em `:171` | ✅ PASS |
| AC 5 — `ERRO_INESPERADO` com correlação, sem stack | mensagem com 8 hex e nada mais | `importacao.integration.test.ts:272-275` e `:555-558` — regex ancorado `^…[0-9a-f]{8}\.$` | ✅ PASS |
| AC 6 — Zod no servidor e conteúdo relido | recusa de campo; plano recalculado | `importacao.schema.test.ts:126-128`; `importacao.integration.test.ts:200-207`; a divergência é recalculada do conteúdo em `:286-291` | ✅ PASS |

### P1: Importar a aba seguinte sem duplicar — IMP-07

| Critério | Resultado definido na spec | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| AC 1 — fixo com nome normalizado e meio iguais a uma vigente em M − 1 → reconhecido | `INALTERADA` | `reconhecer-recorrencias.test.ts:31-36`; M − 1 em `carregar-estado.test.ts:118-129` | ✅ PASS (M15 morto) |
| AC 2 — entrada fixa reconhecida pelo nome | `INALTERADA` com `meioPagamentoId: null` | `reconhecer-recorrencias.test.ts:119-124` | ✅ PASS |
| AC 3 — mesmo valor em M → não altera | sem reajuste | `reconhecer-recorrencias.test.ts:31-36`; valor de M em `carregar-estado.test.ts:93` | ✅ PASS (M14 morto) |
| AC 4 — valor diferente → vigência desde M pelo `registrar-versao` | `[["2026-10",10000],["2026-11",11000]]` | `gravar-importacao/handler.test.ts:417-424`; banco `importacao.integration.test.ts:354-357` | ✅ PASS |
| AC 5 — vigente sem linha → encerrada a partir de M pelo `encerrar` | `fim = 2026-10` | `gravar-importacao/handler.test.ts:430-436`; banco `importacao.integration.test.ts:359-361`; tela `e2e/importacao.spec.ts:190-193` | ✅ PASS |
| AC 6 — reconhecida com valor ilegível → presente, valor vigente, não lida | não encerra; aparece em não lidas | `reconhecer-recorrencias.test.ts:78-83`; `planejar-importacao.test.ts:739-751` | ✅ PASS (M10 morto) |
| AC 7 — `n/t` com nome, meio e `t` iguais e parcela `n` em M → reconhecida, sem compra nova | `CONTINUA`; 7 compras no fim | `reconhecer-compras.test.ts:55-58`, `:158-160`; `gravar-importacao/handler.test.ts:468` | ✅ PASS |
| AC 8 — diferença acima de 100 → não reconhece | 100 reconhece, 101 não | `reconhecer-compras.test.ts:80-87` | ✅ PASS (M03 e M04 mortos) |
| AC 9 — mais de uma candidata → a mais próxima; cada compra uma vez | os dois Livros; nenhuma repetida | `reconhecer-compras.test.ts:98-110`, `:119-121`, `:139-144` | ✅ PASS (M05 e M06 mortos) |
| AC 10 — valor diferente → parcelas de `n` a `t` com o valor; total = amortizado + parcelas | Fone 3334 + 3333 + 3333 = 10000 | `reprecificar-parcelas.test.ts:46-52`, `:68-75`; `gravar-importacao/handler.test.ts:443-449`; banco `importacao.integration.test.ts:394-402`, `:426-433` | ✅ PASS (M11 morto) |
| AC 11 — compra com parcela em M sem linha → sem alteração e "não aparece nesta aba" | Óculos, parcela 4 | `reconhecer-compras.test.ts:189`; `planejar-importacao.test.ts:733-735`; parcelas intactas `importacao.integration.test.ts:408-417` | ✅ PASS |
| AC 12 — mesmo nome e meio: pareia **por ordem de aparição** com as reconhecíveis; excedentes novas | a 1ª linha com a 1ª vigente; o resto `NOVA` | "excedentes novas": `reconhecer-recorrencias.test.ts:131-139`, `planejar-importacao.test.ts:811-814`. "Por ordem": **nenhum teste com duas vigentes de mesma chave**; a spec não diz a ordem das recorrências | ⚠️ Lacuna de precisão + M28 sobrevive |

### P1: Abrir a importação pela Visão geral — IMP-08

| Critério | Resultado definido na spec | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| AC 1 — botão "Importar planilha" no topo da área | o botão na Visão geral | `e2e/importacao.spec.ts:69-70` — clique em `/2026-10` e o diálogo visível. "No topo" não tem assertion | ✅ PASS |
| AC 2 — `<dialog>` nativo | `showModal` e `open` | `dialogo-importacao.test.tsx:147-148` | ✅ PASS |
| AC 3 — arrastar e soltar, e seletor só `.csv` | drop lido; `accept=".csv"` | `passo-arquivo.test.tsx:64-67`, `:106` | ✅ PASS |
| AC 4 — nome do arquivo e "4 blocos encontrados" | os dois textos | `passo-arquivo.test.tsx:64-65`; `e2e/importacao.spec.ts:79-80` | ✅ PASS |
| AC 5 — "Tudo entra em nome de <pessoa>" | Pessoa A | `passo-arquivo.test.tsx:133`; `e2e/importacao.spec.ts:116` | ✅ PASS |
| AC 6 — quantidades, link da competência e "Próximo: …" | "16 criados", `/2026-10`, "Próximo: Novembro de 2026" | `dialogo-importacao.test.tsx:260-266`, `:286-292`; `e2e/importacao.spec.ts:136`, `:146-147` | ✅ PASS |
| AC 7 — `Enter` **ou espaço** no seletor = arrastar | mesmo efeito | `passo-arquivo.test.tsx:91-100` — `Enter` aciona `click` do seletor e o upload tem o efeito do drop. **Espaço não é testado** | ⚠️ Parcial |
| AC 8 — recusa do servidor dentro do diálogo, sem fechar | a mensagem; `open` continua | `dialogo-importacao.test.tsx:308-312`; `passo-conferencia.test.tsx:285-287` | ✅ PASS |

### P2: Recomeçar do zero — IMP-09

| Critério | Resultado definido na spec | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| AC 1 — esvazia as seis tabelas | `count = 0` em cada | `limpar-para-importar.integration.test.ts:213-215`, depois de `:207-209` provar que havia linha | ✅ PASS |
| AC 2 — preserva `usuario`, `meio_pagamento`, `categoria` | as três iguais antes e depois | `limpar-para-importar.integration.test.ts:224-225` — `expect(await cadastros()).toEqual(antes)` | ⚠️ PASS contra o AC; lacuna registrada pelo autor confirmada (M26, M27) |
| AC 3 — a próxima importação é a primeira, para qualquer mês | sem registro, banco "vazio", sem decisões | `limpar-para-importar.integration.test.ts:234-236` | ✅ PASS |

**Status**: 75 de 82 critérios com assertion que bate com o resultado da spec · ❌ 3 sem
discriminação (IMP-01 AC 11, IMP-02 AC 1, IMP-03 AC 10) · ⚠️ 2 lacunas de precisão da spec (IMP-07
AC 12, IMP-09 AC 2) · ⚠️ 2 provas parciais (IMP-04 AC 3 na página, IMP-08 AC 7).

**Observação 1 — IMP-01 AC 1 no servidor.** O navegador recusa com a mensagem de
`PLANILHA_ARQUIVO_INVALIDO`, como a spec manda. O servidor, que é a segunda linha, responde
`VALIDACAO` com o campo `nomeArquivo` (`importacao.integration.test.ts:200-207`), e conta o
limite em unidades de texto (`importacao.schema.ts:40`), enquanto o navegador conta bytes
(`passo-arquivo.tsx:117`). Não há caminho da interface que chegue lá, então não reprovo o AC. Fica
registrado porque a spec nomeia um código e o servidor devolve outro.

---

## Os julgamentos que a fatia pediu

### 1. A lacuna do IMP-09 — **se sustenta**, e é mais barata de fechar do que o registro sugere

O registro diz três coisas, e as três conferem:

- **O AC 2 nomeia só `usuario`, `meio_pagamento` e `categoria`.** A preservação de `fatura`,
  `pagamento_fatura` e `orcamento_categoria` é promessa do cabeçalho do script
  (`limpar-para-importar.sql:13-14`), não da spec. É lacuna de precisão, não AC sem prova.
- **O script não as toca por construção.** `TRUNCATE` sem `CASCADE` só esvazia o que lista, e o
  teste de `:239-260` prova que não há `CASCADE`: com uma chave estrangeira de fora, o script falha
  inteiro com `0A000`.
- **Não há assertion.** Confirmado pelo sensor: com `orcamento_categoria` na lista (M26), ou com
  `pagamento_fatura` e `fatura` (M27), os 4 testes do arquivo passam.

O registro não diz uma coisa: "por construção" protege o script de hoje, e não quem editar a lista
amanhã. E o teste já popula as três tabelas em `popularTudo()` (`:96-110`). Fechar custa uma
assertion de contagem depois do script, mais uma linha no AC 2.

### 2. Os mutantes obrigatórios do AD-011 — **os dois morrem**, e o (a) morre fora da fatia

- **(a) Rateio por truncamento (M01).** Morre em `ratear-parcelas.test.ts:25`, `:29` e `:34`, e em
  `gerar-parcelas.test.ts:43` e `:157`. Os 161 testes da fatia passam com ele. Isso está certo: a
  importação cria compra em `modo: "VALOR_PARCELA"` (`gravar-importacao/handler.ts:143`), e o total
  é `valorParcela × qtd`, que divide sem resto. A fatia não depende da política de resíduo.
- **(b) `addMeses` sem virada de ano (M02).** Morre na suíte de competência (`competencia.test.ts:49`,
  `:53`, `:57`) **e na fatia**, com o defeito exato que a motivou: `proxima` saiu `"2026-01"` em vez de
  `"2027-01"` (`importacao.integration.test.ts:329`), e a parcela 10 do Sofá caiu em `"2026-01"`
  (`gravar-importacao/handler.test.ts:158`).

### 3. IMP-03 AC 10 — o teste diz o que prova e não prova

`planejar-importacao.test.ts:394` se chama "cria as oito categorias uma vez, Mercado com a grafia da
primeira linha". Em outubro, "mercado" aparece três vezes, nesta ordem: `Mercado` (Feira),
`MERCADO` (Padaria) e `Mercado` (a tabela, que `planejarCategorias` lê depois dos blocos, em
`planejar-importacao.ts:205-208`). A primeira e a última são iguais. M13 troca "a primeira vence"
por "a última vence" e a fatia inteira fica verde. Basta tirar "Mercado" da tabela num teste para
que a última ocorrência seja `MERCADO` e o mutante morra.

---

## Sensor de discriminação

Worktree descartável no HEAD (`272bf8d`). Vitest com `node_modules` em symlink para a raiz; para o
e2e, `pnpm install --frozen-lockfile --offline` dentro da worktree, porque o `next dev` precisa de
`node_modules` próprio. Cada mutante foi aplicado, confrontado com **o teste que deveria pegá-lo**,
isolado, e revertido com `git checkout -- <arquivo>`. A integração rodou em série, contra o Postgres
compartilhado da porta 5433. Antes do sensor, a linha de base dos mesmos arquivos passou na worktree:
357 testes unitários, 47 de integração e os 2 do e2e da importação.

| # | Mutação | `file:line` | Teste que deveria pegar | Resultado |
| --- | --- | --- | --- | --- |
| M01 | **AD-011 (a)**: rateio por truncamento, sem distribuir o resto | `src/domain/parcelamento/ratear-parcelas.ts:37` | `ratear-parcelas.test.ts:25,29,34` e `gerar-parcelas.test.ts:43,157` (9 falhas). A fatia: 161 verdes, sem dependência | ✅ Morto |
| M02 | **AD-011 (b)**: `addMeses` gira o mês e mantém o ano | `src/domain/shared/competencia.ts:45` | `competencia.test.ts:49,53,57`; `gravar-importacao/handler.test.ts:140`; `importacao.integration.test.ts:280` (`"2026-01"` × `"2027-01"`) | ✅ Morto |
| M03 | tolerância `<= 100` → `< 100` | `reconhecer-compras.ts:68` | `reconhecer-compras.test.ts:76` | ✅ Morto |
| M04 | tolerância 0 | `reconhecer-compras.ts:68` | `reconhecer-compras.test.ts:61,76,90,113,124` | ✅ Morto |
| M05 | fica com a primeira candidata, e não a mais próxima | `reconhecer-compras.ts:73` | `reconhecer-compras.test.ts:113` | ✅ Morto |
| M06 | uma compra reconhecida por duas linhas | `reconhecer-compras.ts:63` | `reconhecer-compras.test.ts:135` | ✅ Morto |
| M07 | sinal de `diferenca` invertido | `conferir-aba.ts:35` | `conferir-aba.test.ts:40,77,87` | ✅ Morto |
| M08 | `normalizarNome` não reduz espaços internos | `celula.ts:25` | `celula.test.ts:55`; `planejar-importacao.test.ts:840` ("Cartão  Roxo") | ✅ Morto |
| M09 | `R$ 0,00` → `VALOR_INVALIDO` | `celula.ts:46` | `celula.test.ts:25` | ✅ Morto |
| M10 | fixo com valor ilegível deixa a vigente sem par, e ela é encerrada | `reconhecer-recorrencias.ts:83` | `reconhecer-recorrencias.test.ts:75`; `planejar-importacao.test.ts:738,762,792` | ✅ Morto |
| M11 | reprecifica só a parcela `n` | `reprecificar-parcelas.ts:40,44` | `reprecificar-parcelas.test.ts:42,64`; `gravar-importacao/handler.test.ts:439` | ✅ Morto |
| M12 | BOM não é removido | `csv.ts:18` | `csv.test.ts:29` | ✅ Morto |
| **M13** | **grafia da categoria: a última linha vence** | `planejar-importacao.ts:210` | `planejar-importacao.test.ts:394`; `gravar-importacao/handler.test.ts:287`. Verdes: 33 do plano, 214 da fatia, 13 de integração | ❌ **Sobreviveu** |
| M14 | estado: valor da recorrência em M − 1, e não em M | `carregar-estado.ts:49` | `carregar-estado.test.ts:87` | ✅ Morto |
| M15 | estado: vigentes em M, e não em M − 1 | `carregar-estado.ts:32` | `carregar-estado.test.ts:96` | ✅ Morto |
| M16 | sem a guarda de banco vazio | `prever-importacao/handler.ts:99` | `prever-importacao/handler.test.ts:79` | ✅ Morto |
| M17 | sem a guarda de ordem | `prever-importacao/handler.ts:105` | `prever-importacao/handler.test.ts:109`; `gravar-importacao/handler.test.ts:377` | ✅ Morto |
| M18 | grava com divergência sem confirmação | `gravar-importacao/handler.ts:91` | `gravar-importacao/handler.test.ts:344` | ✅ Morto |
| M19 | avulso gravado sem a origem da planilha | `gravar-importacao/handler.ts:186` | `gravar-importacao/handler.test.ts:229` | ✅ Morto |
| M20 | passo 3: `bloqueado` ignora a confirmação | `passo-conferencia.tsx:131` | `passo-conferencia.test.tsx:247` | ✅ Morto |
| M21 | "cai em" lista cartões | `passo-pendencias.tsx:67` | `passo-pendencias.test.tsx:143` | ✅ Morto |
| M22 | a segunda prévia vai sem as decisões | `dialogo-importacao.tsx:169` | `dialogo-importacao.test.tsx:181` | ✅ Morto |
| M23 | sem `pg_advisory_xact_lock` | `transacao-da-importacao.ts:35` | `transacao-da-importacao.integration.test.ts:226`; `importacao.integration.test.ts:566` (a segunda sai `ERRO_INESPERADO`) | ✅ Morto |
| M24 | repositórios sobre o banco, fora do `tx` | `transacao-da-importacao.ts:37-41` | `transacao-da-importacao.integration.test.ts:165`; `importacao.integration.test.ts:534` (sobram 8 categorias a mais) | ✅ Morto |
| M25 | decisão repetida com `DO NOTHING` em vez de upsert | `importacao.repository.ts:96` | `importacao.repository.integration.test.ts:129` | ✅ Morto |
| **M26** | **IMP-09: o script também esvazia `orcamento_categoria`** | `limpar-para-importar.sql:33` | `limpar-para-importar.integration.test.ts` (4 verdes) | ❌ **Sobreviveu** |
| **M27** | **IMP-09: o script também esvazia `pagamento_fatura` e `fatura`** | `limpar-para-importar.sql:33` | `limpar-para-importar.integration.test.ts` (4 verdes) | ❌ **Sobreviveu** |
| **M28** | **IMP-07 AC 12: vigentes de mesma chave pareadas na ordem inversa** | `reconhecer-recorrencias.ts:71` | `reconhecer-recorrencias.test.ts:127`; 157 da fatia e 13 de integração verdes | ❌ **Sobreviveu** |
| **M29** | **IMP-02 AC 1: ano aceito até 2999** | `competencia-do-arquivo.ts:30` | `competencia-do-arquivo.test.ts:44` (8 verdes) | ❌ **Sobreviveu** |
| **M30** | **IMP-01 AC 11: `t = 120` recusado (`>=` no teto)** | `celula.ts:63` | `celula.test.ts:46`; `ler-aba.test.ts` (19 + 23 verdes) | ❌ **Sobreviveu** |
| M31 | Fixos não para em `Total de Cartão de Crédito` | `ler-aba.ts:55` | `ler-aba.test.ts:190,194,211,272,364,414` | ✅ Morto |
| E1 | página: competência esperada = a última, e não a seguinte | `src/app/(app)/[competencia]/page.tsx:114` | `e2e/importacao.spec.ts:156` | ✅ Morto |
| **E2** | **página: `geraFatura: false` para todo meio** | `src/app/(app)/[competencia]/page.tsx:119` | `e2e/importacao.spec.ts:140` (verde) | ❌ **Sobreviveu** |

**Profundidade**: expandida, P1 de fluxo crítico: 33 mutações, contra o mínimo de 8.
**Resultado**: **26 mortos, 7 sobreviventes**, com os dois do AD-011 mortos. Sensor ❌.

Todo mutante morto falhou numa assertion de valor, e não por exceção ou por outro teste. Os três de
integração que podiam enganar foram conferidos no diff: M23 devolve
`ERRO_INESPERADO` onde o teste espera `IMPORTACAO_FORA_DE_ORDEM`, M24 deixa oito categorias a mais
no banco, e M02 produz `"proxima": "2026-01"`.

**Isolamento**: o porcelain da árvore real estava vazio antes e continuou vazio depois de
`git worktree remove --force` e `git worktree prune`. Nenhuma mutação vazou. O `next dev` da worktree
reescreveu o `next-env.d.ts` *dela*, que foi restaurado antes de cada mutação seguinte.

---

## Edge Cases

- [x] Caractere solto fora dos blocos (A1) é ignorado — `ler-aba.test.ts:248-261` (`"X"` fora de
      todos os textos lidos)
- [x] Nome com vírgula entre aspas é lido inteiro — `csv.test.ts:19-22`; na fixture,
      `ler-aba.test.ts:169` (`"Seguro (casa, carro)"`)
- [x] Categorias que diferem só em caixa são uma — `planejar-importacao.test.ts:402` (`MERCADO` da
      Padaria cai em `mercado`, uma criação só); `gravar-importacao/handler.test.ts:292-302`
- [x] Compra parcelada com "Tipo" de conta é criada com esse meio e cai no bloco de meio sem fatura —
      **por composição**: o meio em `importacao.integration.test.ts:408-409` (`Óculos 40000`, `meio:
      "Conta Corrente"`) e o bloco em `src/domain/mes/bloco-do-lancamento.test.ts:88-94` (parcela em
      meio sem fatura → `AVULSOS`, que é Gastos do Mês). Nenhum teste olha o painel com o Óculos
- [x] Entrada `200*` vira não lida `VALOR_INVALIDO`, e Entradas confere quando a planilha também não
      a soma — `ler-aba.test.ts:424`; `conferir-aba.test.ts:99` (`conferido(2, 610000)`)
- [x] Total do Gastos do Mês cobrindo parte das linhas → bloco divergente e Saídas confere —
      `conferir-aba.test.ts:41-51`; `passo-conferencia.test.tsx:88` e `:121-123`;
      `e2e/importacao.spec.ts:128-130`

### Independent Tests

| Requisito | Situação |
| --- | --- |
| IMP-01 | ✅ `ler-aba.test.ts:191` sobre a fixture de outubro |
| IMP-02 | ✅ `e2e/importacao.spec.ts:113-114` (pré-seleção) e `:196-216` (dezembro recusado nomeando novembro) |
| IMP-03 | ✅ `importacao.integration.test.ts:280-502` |
| IMP-04 | ✅ `e2e/importacao.spec.ts:155-175` |
| IMP-05 | ✅ `passo-conferencia.test.tsx:88`, `:121-123`, `:249-257` |
| IMP-06 | ⚠️ a falha é injetada no 4º avulso, que é a última escrita antes do registro, e não "na última parcela" que a spec escreve (`importacao.integration.test.ts:534-562`). O espírito, a última escrita, se mantém |
| IMP-07 | ✅ `importacao.integration.test.ts:280-502`, contra o estado final do design |
| IMP-08 | ⚠️ o e2e afirma "Receitas do mês" = 1.015.000 (`e2e/importacao.spec.ts:152`), mas **não as despesas** que a spec também pede |
| IMP-09 | ⚠️ o teste prova o estado depois do script (`limpar-para-importar.integration.test.ts:234-236`), mas não importa outubro de novo, como a spec escreve |

---

## Regras invioláveis (`AGENTS.md`)

| Regra | Situação |
| --- | --- |
| 1 — nenhum dado financeiro real | ✅ As três fixtures usam "Pessoa A", "Cartão Roxo/Verde/Azul", "Conta Corrente", "Salário A/B", com valores escolhidos por propriedade (resíduo de 33,34, tolerância de 2 centavos, Mesa `12/10`). Verificado por inspeção. Os CSVs reais em `~/Downloads` **não foram abertos**, por AD-009, então não houve comparação com eles |
| 2 — dinheiro em centavos inteiros | ✅ `valorDaCelula` passa por `parseBRL` (`celula.ts:48`); todo campo novo é `_centavos` ou `Cents` |
| 3 — competência `'YYYY-MM'`, sem `Date` no domínio | ✅ `competenciaDeAnoEMes` monta texto (`competencia.ts:26-28`); o instante do encerramento entra pela borda (`importacao.ts`, `agora`) |
| 4 — `src/domain` puro | ✅ `arquitetura.test.ts` verde; 100% de branches (323/323) |
| 5 — só `movimento` é somável | ✅ A conferência soma linhas lidas, não planos; nenhum `SUM` novo sobre compra ou recorrência |
| Commits atômicos, Conventional Commits | ⚠️ 28 commits, um por task, mais `61eede3`. Duas exceções de processo: T12 não compila sozinho e T25 foi marcada só no conserto. Ver "Processo" |
| Operação remota | ✅ Nenhum push nesta verificação |

---

## Code Quality

| Princípio | Status |
| --- | --- |
| Código mínimo | ✅ Reajuste, encerramento e compra nova reaproveitam os casos de uso existentes (`gravar-importacao/handler.ts:100-155`), sem regra reescrita |
| Mudanças cirúrgicas | ✅ Fora de `importacao`, só o que o design nomeia: `Executor` nos repositórios, três métodos de port, a extração de `CadastroDeMeioInline` e o botão na página |
| Sem escopo extra | ✅ Orçamento, "Pago?", datas do Gastos do Mês e desfazer ficaram de fora, como o Out of Scope manda |
| Segue os padrões | ✅ Envelope de action, `requireSession` primeiro, `erroDeAction`, fakes no padrão de `fakes.ts` |
| Assertion bate com a spec | ❌ 75/82; as sete exceções estão nomeadas |
| Expectativa de cobertura por camada | ⚠️ Domínio 1:1 e 100% de branches. A composição de página é `none` na matriz, "coberta pelo build e pelo e2e", e o e2e não cobre o `geraFatura` (E2) |
| Todo teste mapeia para AC, edge case ou Done-when | ✅ Nenhum teste órfão nos 27 arquivos de teste novos e no `competencia.test.ts` alterado |
| Guidelines documentadas seguidas | ✅ `AGENTS.md`; `tasks.md#Test Coverage Matrix` |

---

## Gate Check

- **Comando**: `pnpm verify` (gate `build` de `tasks.md`), na árvore real, em `272bf8d`, com
  `pnpm db:up` já de pé. Saída 0.
- `pnpm typecheck` — ✅ `Types generated successfully`
- `pnpm lint` — ✅ `Checked 255 files in 129ms. No fixes applied.`
- `pnpm test:unit` — ✅ **84 arquivos, 1.123 testes**, 0 falhas; `src/domain` com 100% de branches
  (323/323), 100% de statements (642/642)
- `pnpm test:integration` — ✅ **21 arquivos, 284 testes**, 0 falhas
- `pnpm build` — ✅ `Compiled successfully`; `/[competencia]` sai como `ƒ`
- `pnpm test:e2e` — ✅ **59 testes**, 0 falhas, 1.4 min. Rodado na worktree, no mesmo commit
  `272bf8d`, com `node_modules` instalado do mesmo lockfile, para não tocar na árvore real. Bate com
  os 59/59 do autor

**Total**: **1.466 provas**, 0 falhas, 0 puladas.

**Integridade dos testes.** A contagem anterior foi medida agora, na worktree, em `caa9484^`
(`6289765`), menos o e2e, que vem de `lacunas-do-painel/validation.md`:

| | Antes (`6289765`) | Depois (`272bf8d`) | Delta |
| --- | --- | --- | --- |
| unit + componentes | 856 (65 arquivos) | 1.123 (84 arquivos) | +267 |
| integration | 237 (14 arquivos) | 284 (21 arquivos) | +47 |
| e2e | 57 | 59 | +2 |
| **total** | **1.150** | **1.466** | **+316** |

Nenhum teste deletado, nenhum `skip`. A contagem só subiu.

---

## Processo

Os dois fatos abaixo não afetam o código final e não entram no veredito.

1. **T12 (`7fe7552`) não compila sozinho.** Medido: `tsc --noEmit` dá 10 erros em 5 arquivos
   (`compra.repository.ts`, `cadastro.repository.ts`, `container.ts` e dois testes de integração), e 0
   em `3fca286` (T13). O plano pôs a ampliação das ports numa task e a implementação Drizzle na
   seguinte. Como `CompraRepositoryDrizzle implements CompraRepository`, a port maior quebra a classe
   na hora. O gate declarado da T12 era o `quick`, que não roda `tsc`, e por isso passou. O commit
   avisa no corpo. Um `git bisect` que caia em `7fe7552` vê o build quebrado.
2. **`tasks.md` com 496 linhas duplicadas em `b8be362` e `d88e90d`.** O arquivo foi de 779 para 1.275
   linhas e voltou em `61eede3`. Na cópia duplicada, a T25 ficou aberta, de modo que a regra de
   "marcar a task no mesmo commit" falhou para ela. **`validate_tasks.py` não detecta a duplicação**:
   rodado sobre o `tasks.md` de `b8be362`, devolve 0 erros e os mesmos 13 avisos de hoje. Um ID de
   task repetido é algo que o validador poderia recusar. É decisão de quem mantém a skill, e não
   lição deste projeto.

---

## Fix Plans

### Fix 1: a grafia da primeira linha (IMP-03 AC 10) — Major

- **Causa**: nas fixtures, a última ocorrência de cada categoria vem da tabela, e a tabela repete a
  grafia da primeira linha. "Primeira vence" e "última vence" não se distinguem.
- **Task**: em `planejar-importacao.test.ts`, um caso com `categoriasDaTabela` sem "Mercado" (ou com
  `[]`). Assim a última ocorrência é `MERCADO` (Padaria), e o teste espera
  `{ chave: "mercado", grafia: "Mercado" }`. Opcionalmente, o mesmo em `gravar-importacao/handler.test.ts:287`.
- **Done when**: M13 morre no teste novo.

### Fix 2: os limites inclusivos (IMP-01 AC 11, IMP-02 AC 1) — Minor

- **Task**: `celula.test.ts`: `"1/120"` e `"120/120"` aceitos. `competencia-do-arquivo.test.ts`:
  `"Planilha 2099 - Outubro.csv"` → `ano: 2099` e `"Planilha 2100 - Outubro.csv"` → `ano: null`.
- **Done when**: M29 e M30 morrem.

### Fix 3: a ordem do pareamento (IMP-07 AC 12) — Minor

- **Spec**: dizer qual é a ordem "das recorrências reconhecíveis". O design diz "a ordem de
  `vigentes`", e `listarComVersoes` decide essa ordem. Hoje a spec não fixa o resultado.
- **Task**: em `reconhecer-recorrencias.test.ts`, duas vigentes com a mesma chave e valores
  diferentes (12000 e 13000) e duas linhas na mesma ordem. Esperado: as duas `INALTERADA`, cada uma
  com a sua, e não dois `REAJUSTE` cruzados.
- **Done when**: M28 morre.

### Fix 4: `geraFatura` na página (IMP-04 AC 3) — Minor

- **Task**: no e2e de novembro (ou de outubro), afirmar que as opções de "Cai em" não contêm
  "Cartão Roxo". Outra saída é extrair o mapeamento `meio → { id, nome, geraFatura }` para uma
  função testada.
- **Done when**: E2 morre.

### Fix 5: o que o script de limpeza preserva (IMP-09 AC 2) — Minor

- **Spec**: o AC 2 passa a nomear `fatura`, `pagamento_fatura` e `orcamento_categoria`, ou a dizer
  "e nenhuma outra tabela".
- **Task**: em `limpar-para-importar.integration.test.ts:218`, contar as três tabelas que
  `popularTudo` já preenche, antes e depois do script.
- **Done when**: M26 e M27 morrem.

### Fix 6: espaço no seletor (IMP-08 AC 7) — Cosmetic

- **Task**: `passo-arquivo.test.tsx:91` com `{ }` (espaço) além de `{Enter}`.

---

## Lições destiladas

Gravadas com `lessons.py add`. Cada uma vem de um sinal deste relatório:

| Lição | Sinal | Fonte |
| --- | --- | --- |
| L-008 — regra de precedência só se prova com primeira e última ocorrência diferentes | `surviving_mutant` | M13 |
| L-009 — limite inclusivo precisa de caso no próprio limite, do lado aceito | `surviving_mutant` | M29, M30 |
| L-010 — uma assertion por cláusula do AC | `surviving_mutant` | M28 |
| L-011 — "parear por ordem" exige a ordem dos dois lados | `spec_precision_gap` | IMP-07 AC 12 |
| L-012 — script destrutivo nomeia e prova o que preserva | `spec_precision_gap` | IMP-09 AC 2, M26, M27 |
| L-001 — regra de negócio em página precisa de percurso e2e (**promovida a confirmada**: segunda feature, depois de `lancamento-avulso`) | `surviving_mutant` | E2. O `geraFatura` da página é o que alimenta o filtro de "cai em" |
| L-013 — ampliar a port e implementar nas classes concretas na mesma task | `gate_fail` | `7fe7552` |

A duplicação de `tasks.md` não virou lição. Ela é sobre como a skill marca tasks, e não sobre este
código, e por isso fica com quem mantém a skill (ver "Processo", item 2).

---

## Requirement Traceability — atualização proposta

O Verificador não edita `spec.md`. Este é o status que o relatório sustenta:

| Requisito | Status anterior | Novo status |
| --- | --- | --- |
| IMP-01 | Implemented | ❌ Needs Fix — AC 11 sem o limite de 120 (Fix 2); os outros 17 provados |
| IMP-02 | Implemented | ❌ Needs Fix — AC 1 sem o limite de 2099 (Fix 2); os outros 6 provados |
| IMP-03 | Implemented | ❌ Needs Fix — AC 10 sem discriminação (Fix 1); os outros 11 provados |
| IMP-04 | Implemented | ⚠️ Verified com ressalva — AC 3 provado no componente, e não na página (Fix 4) |
| IMP-05 | Implemented | ✅ Verified — ACs 1 a 9 |
| IMP-06 | Implemented | ✅ Verified — ACs 1 a 6 |
| IMP-07 | Implemented | ⚠️ Verified com lacuna de precisão — ACs 1 a 11; AC 12 só na cláusula das excedentes (Fix 3) |
| IMP-08 | Implemented | ⚠️ Verified com ressalva — AC 7 só com `Enter` (Fix 6) |
| IMP-09 | Implemented | ⚠️ Verified com lacuna de precisão — ACs 1 a 3; preservação fora do AC 2 confirmada sem assertion (Fix 5) |

---

## Resumo

**Overall**: ❌ Não pronto. Faltam testes, e o código não precisa de conserto.

**Spec-anchored**: 75/82 critérios com assertion que bate com o resultado da spec; 3 sem
discriminação; 2 lacunas de precisão da spec; 2 provas parciais.
**Sensor**: 33 mutações, 26 mortas, 7 sobreviventes; AD-011 (a) e (b) mortos.
**Gate**: 1.466 provas, 0 falhas, 0 puladas.

**O que funciona**: a aba é lida como está, com os blocos lado a lado, deslocada ou com títulos de
espaço no fim. O mês confirmado é o gravado, e a virada de ano está provada no ponto em que a fatia
nasceu. Outubro, novembro e dezembro, em sequência contra Postgres, terminam exatamente no estado do
design. A gravação é tudo ou nada e serializada pela trava. Cada fixo e cada compra existe uma vez.

**O que falta**: um caso de fixture para a grafia da primeira linha; os dois limites inclusivos; a
ordem do pareamento de homônimos, na spec e no teste; uma assertion de "cai em" no e2e; e a
preservação das três tabelas no AC 2 do IMP-09.

**Próximo passo**: Fixes 1 a 5 viram tasks. São só testes e duas linhas de spec, e nenhum toca
código de produção. Depois disso, outra rodada do Verificador, com as mesmas M13, M26 a M30 e E2.
