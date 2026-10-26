# Importar a planilha — Validação

## Validation: importar-planilha — **PASS** (confirmação depois da decisão do dono, veredito vigente)

**Result**: PASS ✅ — confirmação de 2026-10-26, sobre `d57ef6f`. Nenhum defeito de comportamento.
A N9r, único mutante vivo da rodada 3, morre no caso da F12
(`src/domain/importacao/planejar-importacao.test.ts:913`), com dois `REAJUSTE` cruzados no lugar de
`JA_EXISTE`. N9 e o AD-011 (b) continuam mortos. O gêmeo da N9r no estado (N1r) também morre. O
IMP-07 AC 12 passa a ter prova no elo do plano para as despesas e para as receitas. O `pnpm verify`
sai 0 na árvore real, e os dois commits que entraram depois da F12 não tocam domínio nem aplicação.
O detalhe está na seção "Confirmação depois da decisão do dono", no fim do arquivo. O cabeçalho da
rodada 3 resumia a seção "Rodada 3", que continua intacta, como as das rodadas 1 e 2.

---

## Rodada 1

**Data**: 2026-10-25
**Spec**: `.specs/features/importar-planilha/spec.md` (IMP-01 a IMP-09, 82 critérios, 6 edge cases)
**Faixa do diff**: `caa9484^..272bf8d` — 28 commits, de `caa9484` (T1) a `272bf8d` (T27). O
planejamento entrou antes, em `3dd2eb2` (design) e `6289765` (tasks), e fica fora da faixa.
**Verificador**: sub-agente independente (autor ≠ verificador). Somente leitura sobre código e
teste; as 33 mutações rodaram numa `git worktree` descartável em
`/private/tmp/.../scratchpad/verifier-wt`, **nenhum `git stash`**. Porcelain da árvore real
gravado antes (vazio) e conferido depois (vazio).

### Veredito da rodada 1 — **FAIL**

**Resultado da rodada 1**: FAIL ❌ — **nenhum defeito de comportamento encontrado**. O veredito vem do sensor:
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

---

## Rodada 2

**Data**: 2026-10-25
**Spec**: a mesma, com o IMP-01 AC 1, o IMP-07 AC 12 e o IMP-09 AC 2 reescritos pelas correções;
`validate_spec.py` sem erro nem aviso
**Faixa do diff**: correções `3b9268d..8094bb9`, 8 commits, de `854ae12` (F1) a `8094bb9` (F8). Um
commit por task, cada um com `tasks.md` e `spec.md`; `check_commit.py` sai 0 nos oito. Fatia
inteira: `caa9484^..8094bb9`.
**Verificador**: sub-agente independente, que não escreveu a fatia nem as correções. Somente
leitura sobre código e teste. As mutações rodaram numa `git worktree` descartável em
`/private/tmp/.../scratchpad/verifier2-wt`, **nenhum `git stash`**.

### Veredito — FAIL ❌

O que a rodada 1 pediu está entregue. Os sete sobreviventes morrem, cada um numa assertion de valor
do teste que a sua correção escreveu. A ordenação nova de `carregar-estado.ts` está provada por
três mutantes: sem ela, com o desempate invertido e com o início invertido. A F8 também: o código de
antes, com uma transição só, falha 5 de 5 vezes no teste com `MutationObserver`. Os 24 mutantes que
morreram na rodada 1 continuam mortos.

O FAIL vem de três mutantes novos. Os três passam verdes na suíte inteira, e2e incluído:

1. **N9: o elo do plano no IMP-07 AC 12.** O AC reescrito define o resultado: a 1ª linha pareia com
   a recorrência de menor `competencia_inicio`, e o `id` desempata. As correções provam o primeiro e
   o último elo. O estado entrega as vigentes nessa ordem (`carregar-estado.test.ts:161`), e o
   reconhecimento pareia na ordem que recebe (`reconhecer-recorrencias.test.ts:154`). O elo do meio,
   `planejarImportacao`, repassa as vigentes sem teste que o prenda. Invertê-las em
   `planejar-importacao.ts:362` deixa verdes 226 testes unitários da fatia e 13 de integração.
2. **N5: "Lendo a aba no servidor…" na conferência.** Esta mutação foi pedida para a rodada. A
   conferência nasce dentro da transição da leitura, ainda pendente, que é a janela do defeito da
   F8. Depois da F8, o que esconde o aviso nessa janela é só a guarda `passo.nome !== "CONFERENCIA"`
   (`dialogo-importacao.tsx:194`), e o teste da F8 só procura "Importando…". Sem a guarda, o arquivo
   do diálogo passa verde 5 de 5 vezes, e o e2e também. O mutante não é equivalente. Uma sonda com o
   mesmo `MutationObserver` viu o aviso ao lado de "Importar 16 lançamentos" em 3 de 3 execuções com
   N5, e nenhuma vez no `HEAD`.
3. **N6: a gravação não marca o botão como ocupado.** Com `gravando={false}` (`:184`), o diálogo
   passa verde 5 de 5 vezes, e o e2e também. O passo prova o botão com `gravando` injetado
   (`passo-conferencia.test.tsx:271-275`), mas o diálogo não prova de onde vem o valor. A lacuna é
   anterior à F8, porque o `ocupado` de antes deixava o mesmo vazio, mas foi a F8 que reescreveu a
   linha. Uma sonda com `importarPlanilha` pendente mata N6.

N5 e N6 não violam AC, porque a spec não descreve o estado de espera. N9 viola o AC 12, e nenhum
teste percebe. Aplico a régua da rodada 1, em que M26 e M27 também ficavam fora do texto do AC: todo
mutante vivo vira task. As três tasks são de teste. Nenhuma pede mudança de código de produção.

### Gates

| Gate | Onde | Resultado |
| --- | --- | --- |
| `pnpm verify` | árvore real, em `8094bb9`, com `pnpm db:up` de pé | ✅ saída 0 |
| — `typecheck` | | ✅ `Types generated successfully` |
| — `lint` | | ✅ `Checked 255 files in 110ms. No fixes applied.` |
| — `test:unit` | | ✅ **84 arquivos, 1.136 testes**; `src/domain` com 100% de branches (323/323) e de statements (642/642) |
| — `test:integration` | | ✅ **21 arquivos, 285 testes** |
| — `build` | | ✅ `Compiled successfully`; `/[competencia]` sai como `ƒ` |
| `pnpm test:e2e` | árvore real, logo depois do `verify` | ✅ **59 passed** em 1,7 min; o `browserType.launch` subiu sem atraso |

**Total**: 1.480 provas, 0 falhas, 0 puladas. Nenhum `.skip`, `.only` ou `.todo` nos testes.

**Integridade.** Da rodada 1 para a rodada 2, a contagem só subiu. Unit foi de 1.123 para 1.136
(+13: F1 1, F2 6, F3 2, F6 1, F7 2, F8 1). Integração foi de 284 para 285 (+1: F5). O e2e continua
em 59, porque a F4 acrescentou três assertions ao teste de outubro, sem criar teste novo. Nos
arquivos de teste, o diff `3b9268d..8094bb9` remove três linhas, e nenhuma é assertion: um
comentário do e2e, o título de um `describe` e a lista do `it.each` de `celula.test.ts`, regravada
com `"1/121"` a mais.

**`next-env.d.ts`.** O `next dev` do e2e reescreveu esse arquivo na árvore real, trocando
`./.next/types/…` por `./.next/dev/types/…`. A mudança fica registrada aqui, sem reverter, e fora do
commit.

### Sensor de discriminação

A worktree descartável ficou em `8094bb9`. O Vitest rodou com `node_modules` em symlink para a raiz.
Para o e2e, usei `pnpm install --frozen-lockfile --offline` dentro da worktree, porque o Turbopack
recusa o symlink. As mutações da rodada 1 foram reaplicadas com o mesmo texto de substituição, lido
do script dela sem alteração. As mutações novas foram escritas sobre o código das correções.
Reverti cada mutante com `git checkout -- <arquivo>` e conferi a worktree limpa antes do seguinte.
A integração e o e2e rodaram em série, contra o Postgres da porta 5433. Antes do sensor, a linha de
base passou na worktree: 317 testes unitários dos arquivos tocados, o arquivo do diálogo 5 de 5
vezes e os 2 e2e da importação.

#### Os sete sobreviventes da rodada 1

| # | Mutação | `file:line` | Morto por (assertion, e o que ela recebeu) | Resultado |
| --- | --- | --- | --- | --- |
| M13 | grafia da categoria: a última linha vence | `src/domain/importacao/planejar-importacao.ts:210` | `planejar-importacao.test.ts:500`: `grafia` recebeu `"MERCADO"` e esperava `"Mercado"` (F1) | ✅ Morto |
| M28 | vigentes de mesma chave pareadas na ordem inversa | `src/domain/importacao/reconhecer-recorrencias.ts:71` | `reconhecer-recorrencias.test.ts:154`: dois `REAJUSTE` cruzados no lugar de duas `INALTERADA` (F3) | ✅ Morto |
| M29 | ano aceito até 2999 | `src/domain/importacao/competencia-do-arquivo.ts:30` | `competencia-do-arquivo.test.ts:59`: recebeu `{ mes: 10, ano: 2100 }` e esperava `ano: null` (F2) | ✅ Morto |
| M30 | `t = 120` recusado (`>=` no teto) | `src/domain/importacao/celula.ts:63` | `celula.test.ts:45`, nos casos `1/120` e `120/120` de `:42-43`: `PARCELA_INVALIDA` no lugar de `{ ok: true }` (F2) | ✅ Morto |
| E2 | página: `geraFatura: false` para todo meio | `src/app/(app)/[competencia]/page.tsx:119` | `e2e/importacao.spec.ts:125`: o `toHaveCount(0)` das opções "Cartão Roxo" em "Cai em" recebeu 1 (F4) | ✅ Morto |
| M26 | o script também esvazia `orcamento_categoria` | `src/infrastructure/db/sql/limpar-para-importar.sql:33` | `limpar-para-importar.integration.test.ts:246`: `orcamento_categoria` some do retrato (F5) | ✅ Morto |
| M27 | o script também esvazia `pagamento_fatura` e `fatura` | `limpar-para-importar.sql:33` | `limpar-para-importar.integration.test.ts:246`: recebeu `fatura: []` (F5) | ✅ Morto |

M13 e M28 continuam verdes nos 13 testes de integração. A prova de ambos é de domínio, que é o que
a rodada 1 pediu.

#### Mutações novas, sobre o código das correções e os ACs reescritos

As três primeiras famílias são as pedidas: a ordenação (N1 e N2), uma transição só (N4) e o aviso
na conferência (N5). As marcadas "extra" foram acrescentadas por este verificador.

| # | Mutação | `file:line` | Morto por | Resultado |
| --- | --- | --- | --- | --- |
| N1 | sem a ordenação nova, ficando a ordem do repositório | `src/application/importacao/carregar-estado.ts:51` | `carregar-estado.test.ts:161`: recebeu `["rec-a", "rec-c", "rec-b"]` e esperava `["rec-b", "rec-c", "rec-a"]` | ✅ Morto |
| N2 | desempate por `id` invertido | `carregar-estado.ts:24` | `carregar-estado.test.ts:161`, e também `:27` e `:119` | ✅ Morto |
| N3 | início em ordem decrescente (extra) | `carregar-estado.ts:23` | `carregar-estado.test.ts:161` e `:125` | ✅ Morto |
| N4 | uma transição só, com `gravando` ligado à da leitura: o código de antes da F8 | `src/components/importacao/dialogo-importacao.tsx:109` e `:184` | `dialogo-importacao.test.tsx:226`: `viuImportando` deu `true`, 5 de 5. No e2e, morre em `e2e/importacao.spec.ts:131` | ✅ Morto |
| N4b | duas transições, mas com `gravando={lendo}` (extra) | `dialogo-importacao.tsx:184` | `dialogo-importacao.test.tsx:226`, 5 de 5 | ✅ Morto |
| **N5** | **"Lendo a aba no servidor…" também na conferência** | `dialogo-importacao.tsx:194` | nenhum: o diálogo passa 11/11 em 5 de 5 execuções, e o e2e 2/2 | ❌ **Sobreviveu** |
| **N6** | **a gravação nunca marca o botão: `gravando={false}`** (extra) | `dialogo-importacao.tsx:184` | nenhum: 11/11 em 5 de 5 execuções, e o e2e 2/2 | ❌ **Sobreviveu** |
| N7 | IMP-01 AC 1: o diálogo mede o tamanho em caracteres (extra) | `src/components/importacao/passo-arquivo.tsx:117` | `passo-arquivo.test.tsx:228`: sem o alerta, a aba é lida (F7) | ✅ Morto |
| N8 | IMP-01 AC 1: o schema mede o tamanho em bytes (extra) | `src/application/schemas/importacao.schema.ts:40` | `importacao.schema.test.ts:79`: `success` deu `false` (F7) | ✅ Morto |
| **N9** | **IMP-07 AC 12: o plano inverte as despesas vigentes antes do reconhecimento** (extra) | `src/domain/importacao/planejar-importacao.ts:362` | nenhum: 226 testes unitários da fatia e 13 de integração verdes | ❌ **Sobreviveu** |

**Sondas de equivalência.** Para N5 e N6, escrevi dois testes na worktree, rodei e apaguei. Eles
não entram em commit. A sonda de N5 repete o percurso do teste da F8 e marca qualquer commit do
React em que "Lendo a aba no servidor…" e "Importar 16 lançamentos" estejam na tela juntos. A sonda
de N6 dubla `importarPlanilha` com uma promessa que não resolve e espera, depois do clique, o botão
"Importando…". As duas passam no `HEAD`. Com o mutante, a de N5 falhou 3 de 3 vezes e a de N6
falhou. Os dois mutantes mudam o que a tela mostra.

#### AD-011

| # | Mutação | `file:line` | Morto por | Resultado |
| --- | --- | --- | --- | --- |
| M01 | (a) rateio por truncamento, sem distribuir o resto | `src/domain/parcelamento/ratear-parcelas.ts:37` | `ratear-parcelas.test.ts:26`, `:30`, `:37`, `:57`, `:61`, `:94` e `:99`; `gerar-parcelas.test.ts:46` (recebeu `33333` e esperava `33334`), `:77` e `:160`, com 9 falhas. A fatia fica verde (170 testes), como na rodada 1, porque a importação grava em `VALOR_PARCELA` | ✅ Morto |
| M02 | (b) `addMeses` gira o mês e mantém o ano | `src/domain/shared/competencia.ts:45` | `competencia.test.ts:50`, `:54` e `:58`; `gravar-importacao/handler.test.ts:145` e `importacao.integration.test.ts:327`, onde `proxima` recebeu `"2026-01"` e esperava `"2027-01"` | ✅ Morto |

#### Regressão: os 24 mortos da rodada 1

Reapliquei M03 a M12, M14 a M25, M31 e E1. Os 24 morrem de novo, nos mesmos arquivos de teste da
rodada 1. M14 e M15, que mexem em `carregar-estado.ts`, continuam mortos com a ordenação nova. M23 e
M24 morrem nos dois arquivos de integração, e E1 morre em `e2e/importacao.spec.ts:163`.

**Contagem**: 43 mutações: os 7 sobreviventes da rodada 1, os 2 do AD-011, os 24 de regressão e 10
novas. **40 mortas e 3 sobreviventes** (N5, N6 e N9). Sensor ❌.

**Isolamento.** O porcelain da árvore real estava vazio antes de tudo. Depois do e2e do gate, e
antes de qualquer mutação, mostrava ` M next-env.d.ts`. Depois de `git worktree remove --force` e
`git worktree prune`, mostrava o mesmo ` M next-env.d.ts`. Recriei a worktree uma vez, para N9, e a
removi de novo, com o mesmo porcelain no fim. Nenhuma mutação vazou.

**Ambiente.** Na primeira execução do e2e com N5, um `POST` de `importarPlanilha` ficou 15,3 min sem
resposta e o teste estourou o tempo. Pelo `pmset -g log`, o Mac dormiu de 02:46:15 a 03:01:36, por
"Idle Sleep" seguido de "Thermal Emergency Sleep". É exatamente essa janela. Repetido, o mesmo
mutante passou 2 de 2 em 20 s. Tratei o caso como ambiente, e ele não conta como morte. As
execuções seguintes rodaram sob `caffeinate -i`.

### Evidência dos ACs alterados e das provas parciais

| Critério | Resultado definido na spec | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| IMP-01 AC 1 (reescrito), no diálogo | extensão diferente de `.csv`, ou mais de 1.048.576 **bytes**, leva à mensagem de `PLANILHA_ARQUIVO_INVALIDO`, sem prévia | `passo-arquivo.test.tsx:202-203` (`.xlsx`): `expect((await screen.findByRole("alert")).textContent).toBe(ARQUIVO_INVALIDO)` e `expect(screen.queryByText("4 blocos encontrados")).toBeNull()`. `:210-213`: 1.048.577 bytes. `:223-229`: `conteudo.length` abaixo de 1.048.576 e `grande.size` acima, com o arquivo recusado. `ARQUIVO_INVALIDO` é o texto literal (`:194-195`), e não uma chamada à função de produção | ✅ PASS (N7 morto) |
| IMP-01 AC 1 (reescrito), no servidor | o mesmo payload é recusado com `VALIDACAO`, e o tamanho é medido em **caracteres** | `importacao.schema.test.ts:52-54`: `.xlsx` dá `["nomeArquivo"]`. `:61-71`: `MAX_CONTEUDO_PLANILHA` vale `1_048_576`, 1.048.577 dá `["conteudo"]` e exatamente 1.048.576 é aceito. `:76-79`: 600.000 `é`, menos de 1 MB em caracteres e mais em bytes, dão `success` `true`. O envelope está em `importacao.integration.test.ts:200-207`: `toEqual({ ok: false, erro: { code: "VALIDACAO", …, campos: { nomeArquivo: … } } })` | ✅ PASS (N8 morto). O tamanho chega à action só pelo schema; o envelope `VALIDACAO` está provado pelo campo da extensão |
| IMP-01 AC 11 | `1 ≤ n ≤ t ≤ 120`: `t = 120` é aceito e `121` é recusado | `celula.test.ts:42-45`: `"1/120"` e `"120/120"` dão `toEqual({ ok: true, value: parcela })`. `:48-51`: `"1/121"` dá `PARCELA_INVALIDA` | ✅ PASS (M30 morto) |
| IMP-02 AC 1 | ano entre 2000 e 2099, inclusive | `competencia-do-arquivo.test.ts:51-55`: 2000 e 2099 dão `toEqual({ mes: 10, ano })`. `:58-62`: 2100 dá `ano: null`. `:44-48`: 1999 dá `ano: null` | ✅ PASS (M29 morto) |
| IMP-03 AC 10 | a categoria é criada uma vez, com a grafia da **primeira** linha | `planejar-importacao.test.ts:480-502`. A pré-condição está em `:487-496`: Feira com `Mercado`, Padaria com `MERCADO`, e nenhum "mercado" em fixos, cartão ou tabela. A assertion está em `:500-502`: `categorias.filter((c) => c.chave === "mercado")).toEqual([{ chave: "mercado", grafia: "Mercado", acao: "CRIAR", categoriaId: null }])` | ✅ PASS (M13 morto) |
| IMP-04 AC 3, na página | "cai em" só oferece meios sem fatura, entre os meios que a página monta | `e2e/importacao.spec.ts:122-125`: `toHaveCount(1)` para "Conta Corrente" e `toHaveCount(0)` para "Cartão Roxo" | ✅ PASS (E2 morto) |
| IMP-05 AC 9 (F8) | o botão diz "Importar N lançamentos" quando a conferência é exibida | `dialogo-importacao.test.tsx:204-227`: um `MutationObserver` vê cada commit. `expect(viuImportando).toBe(false)` (`:226`) e o botão "Importar 16 lançamentos" (`:222`) | ✅ PASS (N4 e N4b mortos, 5 de 5) |
| IMP-07 AC 12 (reescrito) | a 1ª linha pareia com a recorrência de menor `competencia_inicio`; o `id` desempata; as excedentes são novas | Estado: `carregar-estado.test.ts:133-162`. O repositório devolve `rec-a` (2026-11), `rec-c` e `rec-b` (2026-10), e a assertion é `toEqual(["rec-b", "rec-c", "rec-a"])`. Reconhecimento: `reconhecer-recorrencias.test.ts:142-161`, com duas `INALTERADA`, cada linha com a sua vigente. Excedentes: `:131-139`, da rodada 1. Plano: **sem prova** | ⚠️ Parcial: N9 vivo, e o elo em `planejar-importacao.ts:360-363` não tem teste |
| IMP-08 AC 7 | `Enter` ou espaço no seletor têm o efeito de arrastar | Espaço: `passo-arquivo.test.tsx:103-118`, com `keyboard(" ")` e `expect(abrirSeletor).toHaveBeenCalledTimes(1)` (`:110`); depois vêm o nome, "4 blocos encontrados", o mês `"10"` e o ano `"2026"` (`:114-117`). `Enter`: `:91-100`, da rodada 1 | ✅ PASS |
| IMP-08, Independent Test | o painel de outubro mostra as receitas e as despesas da fixture | `e2e/importacao.spec.ts:156`: "Receitas do mês" é `1_015_000`. `:159`: "Despesas do mês" é `238_784`, ou seja, 184000 + 42334 + 12450, o Saídas de outubro no `design.md` | ✅ PASS |
| IMP-09 AC 2 (reescrito) | preserva `usuario`, `meio_pagamento`, `categoria`, `fatura`, `pagamento_fatura` e `orcamento_categoria` | `limpar-para-importar.integration.test.ts:243-246`: antes, uma linha em cada (`toHaveLength(1)`); depois, `expect(await faturasEOrcamentos()).toEqual(antes)`. As três primeiras tabelas estão em `:227-234`, com `expect(await cadastros()).toEqual(antes)` | ✅ PASS (M26 e M27 mortos) |

**Amostragem dos ACs que as correções não tocaram.** A suíte inteira passa (1.480 provas), e os 24
mutantes mortos na rodada 1 morrem de novo nos mesmos testes. Por amostragem, isso cobre:

- IMP-01 AC 2, 6 e 18 (M12, M31, M09);
- IMP-02 AC 4, 5, 6 e 7 (E1, M17, M16, M23);
- IMP-03 AC 8 (M19);
- IMP-04 AC 3 no componente e AC 4 (M21, M25);
- IMP-05 AC 3, 7 e 8 (M07, M20, M18);
- IMP-06 AC 1 (M24);
- IMP-07 AC 1, 3, 6, 8, 9 e 10 (M15, M14, M10, M03 a M06, M11).

**Status**: dos critérios que a rodada 1 deixou abertos, só um continua aberto. O IMP-07 AC 12 tem
a ordem escrita na spec e o estado e o reconhecimento provados, mas o plano segue sem prova (N9).

### Lacunas restantes, ranqueadas

1. **N9: o elo do plano no IMP-07 AC 12 (Minor).** É a única que atinge um resultado definido na
   spec.
   - **Task**: em `planejar-importacao.test.ts`, montar um estado com duas despesas vigentes
     homônimas de mesmo meio (12000 e 13000, nessa ordem) e uma aba com duas linhas na mesma ordem.
     Esperado: duas `INALTERADA`, cada linha com a sua vigente. Vale repetir para as receitas, que
     passam pelo mesmo caminho em `:392-394`.
   - **Done when**: N9 morre.
2. **N5: o aviso de leitura na conferência (Minor).**
   - **Task**: o teste da F8 (`dialogo-importacao.test.tsx:204`) passa a marcar também "Lendo a aba
     no servidor…" com a conferência na tela. A sonda desta rodada é esse teste, e matou N5 em 3 de
     3 execuções.
   - **Spec**: uma linha no IMP-05 dizendo o que a tela mostra enquanto lê e enquanto grava, para
     que o estado de espera tenha um AC.
   - **Done when**: N5 morre.
3. **N6: "Importando…" durante a gravação (Minor).**
   - **Task**: no teste do diálogo, `importarPlanilha` dublado com uma promessa pendente. Depois do
     clique, o botão se chama "Importando…" e está desabilitado. Pode usar o mesmo AC novo do item 2.
   - **Done when**: N6 morre.

**Fora do veredito (processo).** O commit da F1 (`854ae12`) levou o planejamento inteiro da Phase 6,
de F1 a F7, junto com o teste da própria F1. A F8 entrou depois, no próprio commit. O código não
muda por isso.

### Lições

As candidatas L-008 a L-013 não tiveram nova ocorrência. As correções aplicaram cada uma: L-008 na
F1, L-009 na F2, L-010 e L-011 na F3, L-012 na F5. Os mutantes que elas nomeavam estão mortos. A
L-013 não tem ocorrência nas correções, porque nenhuma ampliou port.

Os três sobreviventes desta rodada viraram duas lições, gravadas com `lessons.py add`:

| Lição | Sinal | Fonte |
| --- | --- | --- |
| L-014: uma garantia provada em cada elo separado precisa de um teste que atravesse a composição | `surviving_mutant` | N9 e N6 |
| L-015: a correção de um estado transitório observa todo elemento ligado ao mesmo sinal pendente | `surviving_mutant` | N5 |

### Requirement Traceability — atualização proposta (rodada 2)

O Verificador não edita `spec.md`. Este é o status que a rodada 2 sustenta:

| Requisito | Status da rodada 1 | Novo status |
| --- | --- | --- |
| IMP-01 | ❌ Needs Fix | ✅ Verified: AC 1 reescrito, com as duas metades, e AC 11 no limite (M30, N7 e N8 mortos) |
| IMP-02 | ❌ Needs Fix | ✅ Verified: AC 1 no limite (M29 morto) |
| IMP-03 | ❌ Needs Fix | ✅ Verified: AC 10 com a primeira e a última ocorrência diferentes (M13 morto) |
| IMP-04 | ⚠️ com ressalva | ✅ Verified: AC 3 na página (E2 morto) |
| IMP-05 | ✅ Verified | ⚠️ Verified com ressalva: o AC 9 está provado (N4 morto), mas o estado de espera do diálogo não tem AC nem prova (N5, N6) |
| IMP-06 | ✅ Verified | ✅ Verified |
| IMP-07 | ⚠️ com lacuna de precisão | ❌ Needs Fix: a ordem do AC 12 está na spec, com o estado e o reconhecimento provados, mas o plano não tem prova (N9) |
| IMP-08 | ⚠️ com ressalva | ✅ Verified: AC 7 com espaço, e o Independent Test com as despesas |
| IMP-09 | ⚠️ com lacuna de precisão | ✅ Verified: AC 2 reescrito (M26 e M27 mortos) |

### Resumo

**Overall**: ❌ Não pronto, por três testes. Nenhum defeito de comportamento, nenhum código de
produção a mudar.

**Spec-anchored**: os 10 critérios e provas que a rodada 1 reabriu fecham, exceto o IMP-07 AC 12,
que está parcial (N9).
**Sensor**: 43 mutações, 40 mortas e 3 sobreviventes (N5, N6, N9). Os sete da rodada 1 e os dois do
AD-011 estão mortos.
**Gate**: `pnpm verify` saiu 0 e `pnpm test:e2e` deu 59/59 na árvore real, com 1.480 provas, 0
falhas e 0 puladas.

**Próximo passo**: três tasks de teste, mais uma linha de spec no IMP-05. Depois, a rodada 3 do
Verificador reaplica N5, N6 e N9. É a última iteração antes de escalar para o dono, pelo limite de
três do ciclo de correção.

---

## Rodada 3

**Data**: 2026-10-25
**Spec**: a mesma da rodada 2, com dois ACs novos no IMP-08 (9 e 10) e a traceability do IMP-07 e do
IMP-08 atualizada. `validate_spec.py` sai sem erro nem aviso.
**Faixa do diff**: correções `4c3a2a9..a033fef`, quatro commits: `8272c5b` (F9), `3a91693` (F10),
`f8920a8` (F11) e `a033fef`, que conserta o tipo do caso da F11 e não tem task. Nenhum toca código
de produção. O diff é `planejar-importacao.test.ts`, `dialogo-importacao.test.tsx`, `spec.md` e
`tasks.md`. `check_commit.py` sai 0 nos quatro. Fatia inteira: `caa9484^..a033fef`.
**Verificador**: sub-agente independente, que não escreveu a fatia nem as correções. Somente
leitura sobre código e teste. As mutações rodaram numa `git worktree` descartável em
`/private/tmp/.../scratchpad/verifier3-wt`, **nenhum `git stash`**.

### Veredito — FAIL ❌

O que a rodada 2 pediu está entregue. N9 morre no caso novo do plano. N5 morre 3 de 3 vezes na
assertion nova do `MutationObserver`, e não na antiga. N6 morre 3 de 3 vezes no caso da gravação
pendente. Os dois ACs novos do IMP-08 têm assertion com o resultado que a spec escreve, e uma
mutação extra (N6d) prova que as duas cláusulas do AC 10, o rótulo e o botão desabilitado, são
vigiadas separadamente. A regressão continua morta: 13 de 13, mais os dois do AD-011. O gate passa
na árvore real, e o e2e passa 59/59.

O FAIL vem de **N9r**, uma mutação extra deste verificador. É o gêmeo exato de N9: N9 inverte as
despesas vigentes antes do reconhecimento (`planejar-importacao.ts:362`), e N9r inverte as
receitas (`:394`), que passam pelo mesmo `reconhecerRecorrencias`. N9r passa verde nos 35 testes do
plano, nos 167 unitários da fatia e nos 13 de integração.

Três fatos sustentam que N9r conta:

1. **O mutante não é equivalente.** Uma sonda, escrita na worktree e apagada, repete o caso da F9
   com duas entradas fixas "Salário A" (600000 e 30000) e duas receitas vigentes na mesma ordem. No
   `HEAD`, as duas linhas saem `JA_EXISTE`. Com N9r, saem `["REAJUSTE", "REAJUSTE"]`: dois reajustes
   cruzados, que gravariam duas versões erradas.
2. **O IMP-07 AC 12 alcança as entradas fixas.** Ele vale para "duas linhas da mesma aba [com] o
   mesmo nome e meio". Duas entradas homônimas têm sempre o mesmo meio, porque o "cai em" é decidido
   por nome. A implementação aplica o AC 12 às linhas sem meio: `reconhecer-recorrencias.ts:52-56`
   diz "ou só pelo nome quando a linha não tem meio" e "a segunda linha com a mesma chave é nova
   (IMP-07 AC 12)".
3. **A rodada 2 pediu este caso.** O item 1 das lacunas da rodada 2 dizia: "Vale repetir para as
   receitas, que passam pelo mesmo caminho em `:392-394`". O Done when da F9 cobre só as despesas.

Aplico a régua das rodadas 1 e 2: todo mutante vivo e não equivalente vira task. N9 caiu nessa régua
na rodada 2, e N9r é o mesmo mutante do outro lado. Nenhum código de produção precisa mudar.

**Decisão do dono.** É a terceira iteração, então o ciclo para aqui. Há duas saídas:

- **(a) F12, recomendada.** Um caso em `planejar-importacao.test.ts`, que é a sonda desta rodada,
  com cerca de 35 linhas e sem tocar código de produção. Done when: N9r morre.
- **(b) Aceitar a lacuna.** O AC 12 passa a dizer "duas linhas de Fixos". Isso alinha o AC com a
  linha de premissas (`spec.md:64`, "mesmo nome e meio em dois fixos"). Mas deixa o caminho das
  receitas no plano sem prova, enquanto a implementação aplica ali a mesma regra.

### Gates

| Gate | Onde | Resultado |
| --- | --- | --- |
| `pnpm verify` | árvore real, em `a033fef`, com o Postgres da porta 5433 de pé | ✅ saída 0 |
| — `typecheck` | | ✅ `Types generated successfully` |
| — `lint` | | ✅ `Checked 255 files in 126ms. No fixes applied.` |
| — `test:unit` | | ✅ **84 arquivos, 1.138 testes**; `src/domain` com 100% de branches (323/323), statements (642/642), funções (154/154) e linhas (607/607) |
| — `test:integration` | | ✅ **21 arquivos, 285 testes** |
| — `build` | | ✅ `Compiled successfully`; `/[competencia]` sai como `ƒ` |
| `pnpm exec playwright test` | worktree em `a033fef`, com `node_modules` de `pnpm install --frozen-lockfile --offline` | ✅ **59 passed** em 2,2 min |

**Total**: 1.482 provas, 0 falhas, 0 puladas. Nenhum `.skip`, `.only` ou `.todo` em `src` ou `e2e`.

**Integridade.** Unit foi de 1.136 para 1.138. São +2: um caso da F9 e um da F11. A F10 acrescentou
uma assertion ao caso da F8, sem criar caso novo. Integração ficou em 285 e e2e em 59. Nos arquivos
de teste, o diff `4c3a2a9..a033fef` remove seis linhas, e nenhuma é assertion. São estas:

- o `import`, regravado com `act`;
- duas linhas de `resumoDeOutubro`, que virou a constante `RESPOSTA_DE_OUTUBRO` em `a033fef`;
- o título do `describe` e o do `it` do caso da F8;
- o `if` do observador, regravado sobre a variável `texto`.

**`next-env.d.ts`.** O e2e rodou só na worktree, então a árvore real não foi reescrita. O
`next dev` da worktree reescreveu o arquivo dela, que restaurei antes do E2.

**Commits que não compilam sozinhos.** Rodei `tsc --noEmit` em cada correção:

| Commit | Erros | Detalhe |
| --- | --- | --- |
| `8272c5b` | 0 | |
| `3a91693` | 0 | |
| `f8920a8` | 1 | `dialogo-importacao.test.tsx(303,28): error TS2554: Expected 1 arguments, but got 0.` |
| `a033fef` | 0 | |

O gate que o `tasks.md` declara para a F11 é o `quick`, ou seja, `pnpm test:unit`. O Vitest
transpila sem checar tipos, então o caso passou. O corpo de `a033fef` diz que os comandos foram
encadeados com `;`. A causa é a mesma de `7fe7552` (T12), cujo gate também era o `quick`. Vale para
os dois: o gate da task não roda `tsc`, e só o `build` da última task da fase o pega. O registro
está em "Lições", abaixo. O código final não muda por isso, e o fato fica fora do veredito.

### Sensor de discriminação

A worktree descartável ficou em `a033fef`. O Vitest rodou com `node_modules` em symlink para a raiz.
Para o e2e, troquei o symlink por `pnpm install --frozen-lockfile --offline`. As mutações das
rodadas 1 e 2 foram reaplicadas com o mesmo texto de substituição, carregado sem alteração dos
scripts delas. Reverti cada mutante com `git checkout -- <arquivo>` e conferi a worktree limpa antes
do seguinte. A integração e o e2e rodaram em série, contra o Postgres da porta 5433.

Antes do sensor, a linha de base passou na worktree:

- 319 testes unitários de `src/domain/importacao`, `src/application/importacao`,
  `src/components/importacao`, `src/domain/parcelamento` e `competencia.test.ts`;
- o arquivo do diálogo, 12/12 em 3 de 3 execuções;
- 20 testes de integração em 3 arquivos;
- os 59 do e2e.

#### Os três sobreviventes da rodada 2

| # | Mutação | `file:line` | Morto por (assertion, e o que ela recebeu) | Resultado |
| --- | --- | --- | --- | --- |
| N9 | o plano inverte as despesas vigentes: `[...estado.despesasFixasVigentes].reverse()` | `src/domain/importacao/planejar-importacao.ts:362` | `planejar-importacao.test.ts:872`, o `toEqual` de `:868-875`: recebeu `[[2, "REAJUSTE"], [4, "REAJUSTE"]]` e esperava `JA_EXISTE` nas duas (F9). Na fatia unitária, é a única falha | ✅ Morto |
| N5 | sem a guarda `passo.nome !== "CONFERENCIA"`, ou seja, `{lendo ? (` | `src/components/importacao/dialogo-importacao.tsx:194` | `dialogo-importacao.test.tsx:234`: `viuLeituraNaConferencia` deu `true`, **3 de 3**. A assertion da F8 (`:233`, `viuImportando`) passou nas três, então quem mata é a da F10 | ✅ Morto |
| N6 | `gravando={false}` no `PassoConferencia` | `dialogo-importacao.tsx:184` | `dialogo-importacao.test.tsx:302`: `findByRole("button", { name: "Importando…" })` não encontrou o botão, **3 de 3** (F11) | ✅ Morto |

#### Mutações extras desta rodada

| # | Mutação | `file:line` | Morto por | Resultado |
| --- | --- | --- | --- | --- |
| N6d | o botão diz "Importando…" mas não trava, com `const bloqueado = conferencia.temDivergencia && !confirmou` | `src/components/importacao/passo-conferencia.tsx:131` | `dialogo-importacao.test.tsx:303`: `hasAttribute("disabled")` deu `false`. Prova a segunda cláusula do IMP-08 AC 10 no diálogo | ✅ Morto |
| **N9r** | **o plano inverte as receitas vigentes: `[...estado.receitasFixasVigentes].reverse()`** | `src/domain/importacao/planejar-importacao.ts:394` | nenhum: o plano passa 35/35, a fatia unitária 167/167 e a integração 13/13. A sonda (`HEAD` verde, mutante com dois `REAJUSTE`) mostra que não é equivalente | ❌ **Sobreviveu** |

#### AD-011

| # | Mutação | `file:line` | Morto por | Resultado |
| --- | --- | --- | --- | --- |
| M01 | (a) rateio por truncamento, sem distribuir o resto | `src/domain/parcelamento/ratear-parcelas.ts:37` | 9 falhas: `ratear-parcelas.test.ts:26`, `:30`, `:37`, `:57`, `:61`, `:94` e `:99` (`[1, 1, 1]` contra `[2, 2, 1]`), e `gerar-parcelas.test.ts:46`, `:77` e `:160`. A fatia fica verde (171), como nas rodadas 1 e 2, porque a importação grava em `VALOR_PARCELA` | ✅ Morto |
| M02 | (b) `addMeses` gira o mês e mantém o ano | `src/domain/shared/competencia.ts:45` | `competencia.test.ts:50`, `:54` e `:58` (`'2026-02'` contra `'2027-02'`). Também `gravar-importacao/handler.test.ts:145` e `importacao.integration.test.ts:327`, onde `proxima` recebeu `"2026-01"` e esperava `"2027-01"` | ✅ Morto |

#### Regressão: amostra dos mortos das rodadas 1 e 2

| # | Mutação | Morto por | Resultado |
| --- | --- | --- | --- |
| M13 | grafia da categoria: a última linha vence | `planejar-importacao.test.ts:500` | ✅ Morto |
| M28 | vigentes de mesma chave pareadas na ordem inversa, no reconhecimento | `reconhecer-recorrencias.test.ts:154` e, agora, também `planejar-importacao.test.ts:872`, porque o caso da F9 atravessa o plano | ✅ Morto |
| M29 | ano aceito até 2999 | `competencia-do-arquivo.test.ts:59`: `{ mes: 10, ano: 2100 }` contra `ano: null` | ✅ Morto |
| M30 | `t = 120` recusado | `celula.test.ts:45`, nos casos `1/120` e `120/120` | ✅ Morto |
| E2 | página: `geraFatura: false` para todo meio | `e2e/importacao.spec.ts:125`: `toHaveCount(0)` das opções "Cartão Roxo" em "Cai em" recebeu 1 | ✅ Morto |
| N4 | uma transição só, o código de antes da F8 | `dialogo-importacao.test.tsx:233`: `viuImportando` deu `true` | ✅ Morto |
| N4b | duas transições, com `gravando={lendo}` | `dialogo-importacao.test.tsx:233`, `:302`, `:317`, `:343`, `:365` e `:386`, com 6 falhas | ✅ Morto |
| N1 | sem a ordenação de `carregar-estado` | `carregar-estado.test.ts:161`: `["rec-a", "rec-c", "rec-b"]` contra `["rec-b", "rec-c", "rec-a"]` | ✅ Morto |
| M20 | passo 3: `bloqueado` ignora a confirmação | `passo-conferencia.test.tsx:249` | ✅ Morto |
| M10 | fixo com valor ilegível deixa a vigente sem par | `reconhecer-recorrencias.test.ts:80`; `planejar-importacao.test.ts:764`, `:800` e `:836` | ✅ Morto |
| M26 | o script de limpeza esvazia `orcamento_categoria` | `limpar-para-importar.integration.test.ts:246` | ✅ Morto |
| M27 | o script esvazia `pagamento_fatura` e `fatura` | `limpar-para-importar.integration.test.ts:246`: recebeu `fatura: []` | ✅ Morto |
| M23 | sem `pg_advisory_xact_lock` | `transacao-da-importacao.integration.test.ts:249` ("a segunda importação nunca esperou na trava"); `importacao.integration.test.ts:576` | ✅ Morto |

**Contagem**: 20 mutações. São os 3 sobreviventes da rodada 2, 2 extras, os 2 do AD-011 e 13 de
regressão. **19 mortas e 1 sobrevivente**, que é N9r. Sensor ❌.

**Isolamento.** O porcelain da árvore real estava vazio antes de tudo, inclusive depois do
`pnpm verify`. Depois de `git worktree remove --force` e `git worktree prune`, continuou vazio.
Nenhuma mutação vazou, e `next-env.d.ts` não mudou na árvore real.

### Evidência dos ACs novos ou alterados

| Critério | Resultado definido na spec | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| IMP-07 AC 12, no elo do plano, despesas | a 1ª linha pareia com a vigente de menor `competencia_inicio`, e o `id` desempata; cada linha fica com a sua | `planejar-importacao.test.ts:842-881`. As vigentes são "Academia" na Conta Corrente com 12000 e 13000, nessa ordem (`:858-863`). As linhas estão na posição 2, da fixture, e 4, com 13000 (`:847-855`). A assertion de `:868-875` é `expect(plano.linhas.filter(… "Academia").map((l) => [l.posicao, l.destino])).toEqual([[2, "JA_EXISTE"], [4, "JA_EXISTE"]])`, e a de `:876-880` é `expect(operacoesDe(plano).reajustes.filter((r) => r.recorrenciaId.startsWith("rec-academia"))).toEqual([])` | ✅ PASS (N9 e M28 mortos) |
| IMP-07 AC 12, no elo do plano, receitas | o mesmo pareamento para duas entradas fixas homônimas | nenhum teste | ❌ GAP (N9r vivo) |
| IMP-08 AC 9 | enquanto a conferência está na tela, "Lendo a aba no servidor…" não aparece | `dialogo-importacao.test.tsx:207-235`. O `MutationObserver` de `:214-222` marca qualquer commit em que "Lendo a aba no servidor…" e "Conferência de" estejam juntos. "Conferência de" é o título do passo, em `passo-conferencia.tsx:138`. A assertion é `expect(viuLeituraNaConferencia).toBe(false)` (`:234`). A condição dispara sob N5, então não é vazia | ✅ PASS (N5 morto 3 de 3) |
| IMP-08 AC 10 | enquanto grava, o botão fica desabilitado e com o rótulo "Importando…" | `dialogo-importacao.test.tsx:286-309`. `importarPlanilha` é dublado com uma promessa pendente (`:288-293`). O rótulo é provado por `findByRole("button", { name: "Importando…" })` (`:302`) e o bloqueio por `expect(botao.hasAttribute("disabled")).toBe(true)` (`:303`). Ao resolver, aparece "16 criados" (`:305-308`) | ✅ PASS (N6 morto em `:302`, N6d em `:303`) |

**Os ACs que esta rodada não tocou.** A suíte passa inteira, com 1.482 provas, e a amostra de
regressão continua morta. Por amostragem, isso cobre:

- IMP-01 AC 11 (M30) e IMP-02 AC 1 e 7 (M29, M23);
- IMP-03 AC 10 (M13) e IMP-04 AC 3 na página (E2);
- IMP-05 AC 7 e 9 (M20, N4, N4b);
- IMP-07 AC 6 (M10) e AC 12 no estado e no reconhecimento (N1, M28);
- IMP-09 AC 2 (M26, M27).

**Status**: dos três critérios e estados que a rodada 2 deixou abertos, os três fecham. O IMP-07
AC 12 fecha no lado das despesas e abre no das receitas (N9r).

### Lacuna restante

1. **N9r: o elo do plano no IMP-07 AC 12, lado das receitas (Minor).**
   - **Task (F12)**: em `planejar-importacao.test.ts`, partir de `abaDaFixture("Novembro")` e
     acrescentar uma entrada "Salário A" de 30000 depois da última. Acrescentar também
     `vigente("rec-salario-a-2", "Salário A", CONTA, 30000)` ao fim de
     `ESTADO_DE_NOVEMBRO.receitasFixasVigentes`. Esperado: as duas linhas "Salário A" de Entradas
     saem `JA_EXISTE`, e nenhum reajuste de `rec-salario-a*`.
   - **Done when**: N9r (`[...estado.receitasFixasVigentes].reverse()` em `planejar-importacao.ts:394`)
     falha o caso.
   - **Alternativa**: a saída (b) do veredito, que restringe o AC 12 aos Fixos.

**Fora do veredito (processo).** `f8920a8` não compila sozinho, e é a segunda ocorrência do padrão
na fatia. `a033fef` entrou sem task no `tasks.md`, como conserto da F11. Nenhum dos dois muda o
código final.

### Lições

- **L-014, nova ocorrência.** N9r é o mesmo padrão de N9: o estado e o reconhecimento provados em
  separado, e o elo do meio sem um teste que o atravesse. Regravei a L-014 com o texto exato e a
  fonte N9r, com `lessons.py add`. Como a ocorrência é da mesma feature, a recorrência continua 1 e
  a L-014 segue candidata.
- **Commit que não compila sozinho: lição nova, L-016** (`gate_fail`, fontes `f8920a8` e `7fe7552`).
  O texto é "O gate de cada task precisa incluir `tsc --noEmit`, encadeado com `&&`: o Vitest
  transpila sem checar tipos, e o commit que não compila passa verde". A L-013 não foi regravada. Ela
  descreve o caso particular, a port separada da implementação, e `f8920a8` não amplia port nenhuma.
  A causa comum às duas ocorrências é o gate `quick` sem `tsc`, e é ela que a L-016 nomeia. As duas
  ocorrências são desta feature, então a L-016 nasce candidata.

### Requirement Traceability — atualização proposta (rodada 3)

O Verificador não edita `spec.md`. Este é o status que a rodada 3 sustenta:

| Requisito | Status da rodada 2 | Novo status |
| --- | --- | --- |
| IMP-01 a IMP-04, IMP-06, IMP-09 | ✅ Verified | ✅ Verified |
| IMP-05 | ⚠️ com ressalva | ✅ Verified: o estado de espera ganhou AC no IMP-08, e N5 e N6 estão mortos |
| IMP-07 | ❌ Needs Fix | ❌ Needs Fix: o AC 12 está provado nos três elos para as despesas, mas o elo do plano não tem prova para as receitas (N9r). Fica Verified com a F12, ou com a saída (b) |
| IMP-08 | ✅ Verified | ✅ Verified: AC 9 e AC 10 provados no diálogo |

### Resumo

**Overall**: ❌ Não pronto, por um teste. Nenhum defeito de comportamento e nenhum código de
produção a mudar.

**Spec-anchored**: os três critérios novos ou alterados batem com a spec. O IMP-07 AC 12 fica
parcial, com as receitas sem prova no plano (N9r).
**Sensor**: 20 mutações, 19 mortas e 1 sobrevivente (N9r). N9, N5 e N6 estão mortos, e os dois do
AD-011 também.
**Gate**: `pnpm verify` saiu 0 na árvore real, e o e2e deu 59/59 na worktree, com 1.482 provas, 0
falhas e 0 puladas.

**Próximo passo**: o limite de três iterações acabou, e o caso vai ao dono. Ele escolhe entre a F12,
que é um caso de teste e é a recomendada, e a saída (b), que restringe o AC 12 aos Fixos. Com a F12
feita, basta reaplicar N9r para fechar o veredito.

---

## Confirmação depois da decisão do dono

**Data**: 2026-10-26
**Decisão**: depois da rodada 3, o dono escolheu a saída (a). A N9r fecha com teste, e o IMP-07
AC 12 não é estreitado aos Fixos. A correção é a F12 (`ff28621`, Phase 8 do `tasks.md`).
**Faixa do diff**: `765f6e4..d57ef6f`, três commits. São `ff28621` (F12), `7c5e460` e `d57ef6f`, os
dois últimos fora da fatia e também por decisão do dono. Fora de `.specs/` e `docs/`, o diff é
`planejar-importacao.test.ts` (+41, nenhuma linha removida) e `next.config.ts` (+6).
`check_commit.py` sai 0 nos três.
**Verificador**: sub-agente independente, que não escreveu a fatia nem as correções. Somente
leitura sobre código e teste. As mutações rodaram numa `git worktree` descartável em
`/private/tmp/.../scratchpad/verifier4-wt`, **nenhum `git stash`**.
**Escopo**: confirmação curta, e não rodada completa. Reaplica N9r, N9 e o AD-011 (b), confere o
IMP-07 AC 12 nas duas pontas e confere os dois commits de fora da fatia. O e2e não foi rodado. Desde
a rodada 3, que deu 59/59, nenhum arquivo de `src/` ou `e2e/` mudou além de
`planejar-importacao.test.ts`, e a única mudança de configuração é o log do `next dev`.

### Veredito — PASS ✅

A N9r morre no caso que a F12 escreveu, na primeira assertion. Uma sonda mostra que a segunda
assertion também a pega. N9 e M02, o AD-011 (b), morrem nos mesmos testes da rodada 3. Acrescentei
N1r, o gêmeo da N9r no estado, porque o estado é o outro elo do AC 12 com um ponto próprio das
receitas. Ele também morre. Nenhum código de produção mudou desde a rodada 3, a não ser o
`next.config.ts`, e nenhum defeito foi encontrado.

### Gate

| Gate | Onde | Resultado |
| --- | --- | --- |
| `pnpm verify` | árvore real, em `d57ef6f`, com o Postgres da porta 5433 de pé | ✅ saída 0 |
| — `typecheck` | | ✅ `Types generated successfully` |
| — `lint` | | ✅ `Checked 255 files in 141ms. No fixes applied.` |
| — `test:unit` | | ✅ **84 arquivos, 1.139 testes**; `src/domain` com 100% de branches (323/323), statements (642/642), funções (154/154) e linhas (607/607) |
| — `test:integration` | | ✅ **21 arquivos, 285 testes** |
| — `build` | | ✅ `Compiled successfully`; `/[competencia]` sai como `ƒ` |
| `pnpm test:e2e` | | não rodado nesta confirmação. Foi 59/59 na rodada 3 |

**Total**: 1.424 provas rodadas, 0 falhas e 0 puladas. Os números batem com o gate do orquestrador
em `d57ef6f`.

**Integridade.** Unit foi de 1.138 para 1.139. O +1 é o caso da F12. Integração ficou em 285. Em
`src/`, o diff `a033fef..d57ef6f` é `+41 −0`, todo em `planejar-importacao.test.ts`, e nenhuma
assertion saiu. Não há `.skip`, `.only` nem `.todo` em `src` ou `e2e`.

### Sensor de discriminação

A worktree descartável ficou em `d57ef6f`, e o Vitest rodou com `node_modules` em symlink para a
raiz. N9 e N9r usam o mesmo texto de substituição da rodada 3 (`v3/sensor3.py`). M02 usa o da
rodada 1 (`sensor/mutacoes.py`), e o script confere que a definição é idêntica antes de aplicar.
Reverti cada mutante com `git checkout -- <arquivo>` e conferi a worktree limpa antes do seguinte.
Antes do sensor, a linha de base passou na worktree:

- o arquivo do plano, 36/36;
- a fatia unitária (`src/domain/importacao` e `src/application/importacao`), 168/168;
- `competencia.test.ts`, 32/32;
- `importacao.integration.test.ts`, 13/13.

| # | Mutação | `file:line` | Morto por (assertion, e o que ela recebeu) | Resultado |
| --- | --- | --- | --- | --- |
| N9r | o plano inverte as receitas vigentes: `[...estado.receitasFixasVigentes].reverse()` | `src/domain/importacao/planejar-importacao.ts:394` | `planejar-importacao.test.ts:913`, o `toEqual` de `:909-916`: recebeu `[[0, "REAJUSTE"], [3, "REAJUSTE"]]` e esperava `[[0, "JA_EXISTE"], [3, "JA_EXISTE"]]` (F12). Na fatia unitária, é a única falha, 1 de 168 | ✅ Morto |
| N9 | o plano inverte as despesas vigentes: `[...estado.despesasFixasVigentes].reverse()` | `planejar-importacao.ts:362` | `planejar-importacao.test.ts:872`, o `toEqual` de `:868-875`: recebeu `[[2, "REAJUSTE"], [4, "REAJUSTE"]]` e esperava `JA_EXISTE` nas duas (F9). Na fatia unitária, é a única falha, 1 de 168 | ✅ Morto |
| M02 | AD-011 (b): `addMeses` gira o mês e mantém o ano | `src/domain/shared/competencia.ts:45` | `competencia.test.ts:50` (`'2026-02'` contra `'2027-02'`), `:54` (`'2026-12'` contra `'2025-12'`) e `:58` (`'2026-10'` contra `'2028-10'`). Na fatia, `gravar-importacao/handler.test.ts:145` (parcela do Sofá em `"2026-01"` contra `"2027-01"`) e `importacao.integration.test.ts:327` (`proxima` em `"2026-01"` contra `"2027-01"`) | ✅ Morto |
| N1r | (extra) o estado entrega as receitas na ordem inversa: `daNatureza("RECEITA").reverse()` | `src/application/importacao/carregar-estado.ts:94` | `carregar-estado.test.ts:33`, o `toEqual` de `:33-36`: recebeu `rec-6` (Salário B) antes de `rec-5` (Salário A). A integração da fatia fica verde (13/13), e a prova é a de aplicação | ✅ Morto |

**A segunda assertion da F12.** Com N9r aplicada, a primeira assertion falha antes da segunda. Para
saber se a segunda vigia alguma coisa, troquei, na worktree, o `toEqual` de `:913-916` por
`toBeDefined()` e rodei o caso com N9r. O `toEqual([])` de `:917-921` falhou e recebeu
`[{ recorrenciaId: "rec-salario-a-2", valor: 600000 }, { recorrenciaId: "rec-salario-a", valor: 650000 }]`.
São os dois reajustes cruzados que a rodada 3 descreveu. A sonda foi revertida e não entra em
commit.

**Por que N1r.** O estado ordena as recorrências uma vez só, antes de separar as naturezas
(`carregar-estado.ts:51` e `:72-73`). Mas a prova da ordenação, `carregar-estado.test.ts:161`, usa só
despesas, e o retorno tem um ponto próprio para as receitas (`:94`). N1r mostra que esse ponto
também está preso: o `toEqual` de `:33-36` fixa a ordem das receitas que o estado entrega.

**Contagem**: 4 mutações, 4 mortas e nenhum sobrevivente. Sensor ✅.

**Isolamento.** O porcelain da árvore real estava vazio antes de tudo, às 08:06. Continuou vazio
depois do `pnpm verify` e depois de `git worktree remove --force` e `git worktree prune`, às
08:09:12. Às 08:09:55, um `pnpm run dev` de fora desta verificação (PID 33036, aberto por outro
shell) subiu o `next dev` na árvore real e reescreveu `next-env.d.ts`, trocando `./.next/types/…`
por `./.next/dev/types/…`. Recriei a worktree para N1r com o porcelain ` M next-env.d.ts` gravado
antes, e depois da remoção ele continuou igual. Nenhuma mutação vazou. O `next-env.d.ts` fica
como está, sem reverter, e fora do commit. A integração usa o banco `mybilling_test`
(`src/infrastructure/db/testing/banco-de-teste.ts:17`), e o `next dev` usa `mybilling`. Por isso,
rodar a integração com o servidor de pé não tocou a base local do dono.

### IMP-07 AC 12, nas duas pontas

| Critério | Resultado definido na spec | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| AC 12 no plano, despesas | `spec.md:342-344`: as linhas homônimas pareiam, na ordem de aparição, com as recorrências tomadas em ordem de `competencia_inicio` e, no empate, de `id`. Cada linha fica com a sua | `planejar-importacao.test.ts:842-881`. As vigentes são "Academia" na Conta Corrente, de 12000 (`:143`) e 13000 (`:862`), nessa ordem no estado. As linhas estão nas posições 2, da fixture, e 4, com 13000 (`:846-855`). A primeira assertion é `expect(plano.linhas.filter((linha) => linha.bloco === "FIXOS" && linha.nome === "Academia").map((linha) => [linha.posicao, linha.destino])).toEqual([[2, "JA_EXISTE"], [4, "JA_EXISTE"]])` (`:868-875`). A segunda é `expect(operacoesDe(plano).reajustes.filter((reajuste) => reajuste.recorrenciaId.startsWith("rec-academia"))).toEqual([])` (`:876-880`) | ✅ PASS (N9 morto em `:872`) |
| AC 12 no plano, receitas | o mesmo pareamento para duas entradas fixas homônimas, que o AC alcança porque o "cai em" é decidido por nome (rodada 3, item 2) | `planejar-importacao.test.ts:883-922`. As vigentes são "Salário A" de 600000 (`rec-salario-a`, `:147`) e 650000 (`rec-salario-a-2`, `:903`), nessa ordem no estado. As linhas estão nas posições 0, da fixture, e 3, com 650000 (`:887-896`). A primeira assertion é `expect(plano.linhas.filter((linha) => linha.bloco === "ENTRADAS" && linha.nome === "Salário A").map((linha) => [linha.posicao, linha.destino])).toEqual([[0, "JA_EXISTE"], [3, "JA_EXISTE"]])` (`:909-916`). A segunda é `expect(operacoesDe(plano).reajustes.filter((reajuste) => reajuste.recorrenciaId.startsWith("rec-salario-a"))).toEqual([])` (`:917-921`) | ✅ PASS (N9r morto em `:913`; a sonda prova `:917-921`) |
| AC 12 no estado | as vigentes saem em ordem de `competencia_inicio` e, no empate, de `id` | despesas: `carregar-estado.test.ts:161`, `toEqual(["rec-b", "rec-c", "rec-a"])` (N1, rodada 3). Receitas: `:33-36` (N1r, aqui) | ✅ PASS |
| AC 12 no reconhecimento | pareia na ordem que recebe, e as excedentes são novas | `reconhecer-recorrencias.test.ts:154` (M28) e `:131-139`. A função é uma só para as duas naturezas. Não reapliquei M28 aqui; o arquivo passa na linha de base | ✅ PASS (rodadas 2 e 3) |

**Status**: o IMP-07 AC 12 está provado nos três elos e nas duas naturezas. Era o único critério
aberto depois da rodada 3.

### Os dois commits de fora da fatia

- **Nenhum toca domínio nem aplicação.** `git diff --name-only ff28621 d57ef6f` lista três
  arquivos: `next.config.ts` e `docs/importacao.md`, de `7c5e460`, e `.specs/HANDOFF.md`, de
  `d57ef6f`. Nada em `src/`.
- **`next.config.ts` segue a documentação.** As linhas `:7-9` são `logging: { serverFunctions: false }`,
  a mesma forma da seção "Server Functions" de
  `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/logging.md`:
  "Server Function invocations are logged by default during development. You can disable this by
  setting `logging.serverFunctions` to `false`". A chave existe no tipo
  (`node_modules/next/dist/server/config-shared.d.ts:296`, `serverFunctions?: boolean`) e no schema
  (`node_modules/next/dist/server/config-schema.js:708`), e o `typecheck` passa. No servidor,
  `base-server.js:424` liga `logServerFunctions` só se `logging.serverFunctions` for verdadeiro, e
  `app-render/action-handler.js:822` só registra a chamada em desenvolvimento e com esse sinal
  ligado. Não subi o `next dev` para ver o terminal: a conferência é pela documentação e pelo código
  do Next instalado.
- **`docs/importacao.md`** troca o aviso de "não copie o log" por uma nota que descreve a chave e o
  que acontece se ela for religada. O texto bate com o `next.config.ts`.
- **`d57ef6f`** troca uma linha do `HANDOFF.md`, que passa a dizer "para duas pessoas", sem nome.

### Validadores

| Script | Resultado |
| --- | --- |
| `validate_spec.py importar-planilha` | ✅ 0 erros, 0 avisos |
| `validate_tasks.py importar-planilha` | ✅ 0 erros, 11 avisos: 10 de granularidade (T4, T10 a T14, T17, T19, T20, T24) e a T25 sem testes, que a matriz declara `none`. O script só reconhece IDs `T<n>`, e a F12 foi cruzada à mão no próprio `tasks.md` |
| `check_commit.py` | ✅ saída 0 nas mensagens de `ff28621`, `7c5e460` e `d57ef6f` |
| `validate_state.py importar-planilha` | antes desta seção, saída 1 ("verdict is FAIL"). Depois, saída 0 |

### Fora do veredito (processo)

- `tasks.md:7` ainda diz "34 tasks em 7 fases (27 da fatia e 7 correções da verificação)". O arquivo
  tem 39 tasks em 9 fases: T1 a T27, F1 a F12, Phase 0 a Phase 8. O Status de `tasks.md:6` diz
  "aguarda a confirmação do Verifier depois da F12". Os dois ficam para o autor, porque o
  Verificador não edita `tasks.md` nem `spec.md`.
- O gate declarado da F12 é "quick + `pnpm typecheck`", que aplica a L-016. Não medi `tsc` isolado
  em `ff28621`. De `ff28621` a `d57ef6f`, o que muda é uma chave opcional a mais no `next.config.ts`
  e dois `.md`, e o `typecheck` passa em `d57ef6f`.

### Lições

Nada a registrar. A confirmação não tem mutante vivo, lacuna de precisão nem desvio, e
`references/lessons.md` manda não escrever nada num PASS limpo. A L-014 segue candidata, com
recorrência 1 e só esta feature. A F12 aplica a L-014, mas aplicar uma lição não é ocorrência nova.
A promoção pede uma segunda feature, e `penalize` só vale para uma lição confirmada que falhou.
`lessons.py status` continua em 16 lições: 1 confirmada e 15 candidatas.

### Requirement Traceability — atualização proposta (confirmação)

O Verificador não edita `spec.md`. Este é o status que a confirmação sustenta:

| Requisito | Status da rodada 3 | Novo status |
| --- | --- | --- |
| IMP-01 a IMP-06, IMP-08, IMP-09 | ✅ Verified | ✅ Verified |
| IMP-07 | ❌ Needs Fix | ✅ Verified: o AC 12 está provado no estado, no reconhecimento e no plano, para despesas e receitas (N1, N1r, M28, N9 e N9r mortos) |

### Resumo

**Overall**: ✅ Pronto. Nenhum defeito de comportamento. Nenhum critério aberto.

**Spec-anchored**: o IMP-07 AC 12, último critério aberto, tem assertion que bate com a spec no
plano para as despesas e para as receitas.
**Sensor**: 4 mutações e 4 mortas: N9r, N9, M02 e a extra N1r.
**Gate**: `pnpm verify` saiu 0 na árvore real, com 1.424 provas, 0 falhas e 0 puladas. O e2e não foi
repetido, porque o fluxo de usuário não mudou desde os 59/59 da rodada 3.

**Próximo passo**: o autor passa a traceability do `spec.md` para Verified e atualiza o Status e o
Total do `tasks.md`. Nenhuma task nova.
