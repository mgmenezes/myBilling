# Simular — Tasks

**Spec**: `.specs/features/simular/spec.md`
**Design**: nenhum arquivo próprio; o desenho está no plano aprovado
(`~/.claude/plans/estou-sentindo-que-ainda-ancient-cosmos.md`, seção "Peças de código") e nas
Assumptions da spec
**Status**: In Progress
**Total**: 9 tasks em 3 fases. Passa de um lote (~8): execução inline recomendada, com a oferta de
sub-agentes registrada na apresentação.

**Pré-condição**: branch `feat/simular`, na worktree `.worktrees/simular`, a partir de
`feat/horizonte-doze-meses` (`8bf0731`). O Postgres de `pnpm db:up` precisa estar de pé para os
gates `full` e `build`.

---

## Execution Protocol (MANDATORY -- do not skip)

Implementar com a skill `tlc-spec-driven`, ativada pelo nome. Cada task segue esta ordem:
1. pré-implementação;
2. testes primeiro, derivados dos ACs do `spec.md`;
3. implementação;
4. gate;
5. Test Adequacy Review (evidence-or-zero, `file:line` + assertion);
6. marcar a task em `tasks.md` e a traceability no `spec.md`;
7. **um** commit atômico validado por `check_commit.py`.

Proibições:
- commitar antes do gate;
- enfraquecer, pular ou apagar teste;
- agrupar tasks;
- `git push`, deploy ou qualquer operação remota sem autorização separada.

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

## Test Coverage Matrix

> Gerada do código, de `AGENTS.md` e de `vitest.config.ts`. Guidelines encontradas: `AGENTS.md`
> (100% de branches em `src/domain`; demais camadas, todo ramo e todo caminho de erro; testes
> co-locados; integração só com Postgres real), `vitest.config.ts` (projetos `domain`,
> `componentes`, `integration`), `playwright.config.ts`. Lições confirmadas aplicadas: L-010 (uma
> assertion por cláusula), L-014 (teste que atravessa a composição), L-018 (consulta restrita à
> região), L-029 (casos colados no limiar), L-041 (regra do cliente e do servidor provada nos dois),
> L-055 (medida em cada faixa de largura).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Domínio (`src/domain/mes/*.ts`) | unit | 100% de branches; 1:1 com os ACs; todo edge case listado; propriedades (soma das parcelas, `saldoDepois = saldoAntes − parcela`) | `src/domain/mes/*.test.ts` | `pnpm test:unit` |
| Caso de uso (`src/application/**/handler.ts`) | unit (fakes em memória) | Todo ramo; concordância com `projetarProximosMeses` e `saldoPrevistoDaCompetencia` | `src/application/**/handler.test.ts` | `pnpm test:unit` |
| Componente (`src/components/*.tsx`) | unit (Testing Library, projeto `componentes`) | Todo ramo de apresentação; textos literais dos ACs; regiões por `within` | `src/components/*.test.tsx` | `pnpm test:unit` |
| Página e navegação (`src/app/**/page.tsx`, `navegacao-principal.tsx`) | e2e (Playwright) | Caminho feliz, composição página → domínio (L-014), medidas em 360 e 400 px (L-055) | `e2e/*.spec.ts` | `pnpm test:e2e` |
| Mensagens e documentação (`src/lib/erros.ts`, `.specs`, `docs`) | none | gate de build | - | build gate only |

## Gate Check Commands

> Geradas de `package.json`.

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Task só com unitários | `pnpm test:unit` |
| Full | Task com integração ou e2e | `pnpm test:unit && pnpm test:integration` (mais `pnpm test:e2e` quando a task toca e2e) |
| Build | Fim de fase e task só de documentação | `pnpm verify` |

---

## Execution Plan

### Phase 1: Domínio e aplicação (SIM-01; SIM-02 AC 4; SIM-05 AC 5)

```
T1
T2
```

### Phase 2: Componentes (SIM-02, SIM-04, SIM-05)

```
T1 → T3 → T4 → T5
```

### Phase 3: Páginas, navegação e registro (SIM-02, SIM-03, SIM-04, SIM-05)

```
T5 → T6 → T7 → T9
T2 → T6
T4 → T8 → T9
T2 → T8
```

---

## Task Breakdown

### T1: `simularCompra` e `menorParcelamentoQueCabe` no domínio ✅ Concluída

**What**: Criar as duas funções puras: `simularCompra(horizonte, plano)` devolve uma linha por
parcela dentro do horizonte (`competencia`, `parcela`, `saldoAntes`, `saldoDepois`, `jaFaltava`),
`cabe`, `enxergaAte` e `parcelasForaDoHorizonte`, ou `err` com `HORIZONTE_INVALIDO` /
`PRIMEIRA_PARCELA_FORA_DO_HORIZONTE`; `menorParcelamentoQueCabe(horizonte, entrada)` busca o menor
`n` de 1 a `MAX_PARCELAS` que cabe, ou `null`. Os dois códigos entram na union `CodigoErro`, com
mensagem em `src/lib/erros.ts` e export em `src/domain/index.ts`, no mesmo commit, porque a union
fechada não compila sem a mensagem.
**Where**: `src/domain/mes/simular-compra.ts`
**Depends on**: None
**Reuses**: `gerarParcelas`, `ratearParcelas`, `MAX_PARCELAS`, `addMeses`, `compararCompetencias`,
`subtrair`, `Result`
**Requirement**: SIM-01 (ACs 1 a 10)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `simular-compra.test.ts` prova os ACs 1 a 7 e 10 com o Independent Test da spec (700 por mês,
      maio −500, R$ 3.000,00 em 3x: março e abril −300, maio −1.500 `jaFaltava`, `cabe` falso)
- [x] AC 8 e 9: `menorParcelamentoQueCabe` devolve 5 nessa fixture (4x colado: março −50; 5x: 100),
      `null` quando nenhum cabe, e segue a busca quando o rateio é inválido (total de 2 centavos)
- [x] Propriedades: para todo `n`, `saldoDepois === saldoAntes − parcela` em cada linha e a soma das
      parcelas visíveis mais as omitidas é o total
- [x] Edge cases: 1 parcela; primeira parcela em C + 12 com 2x (`parcelasForaDoHorizonte` 1);
      `saldoDepois` 0 cabe; mês já negativo que fica mais negativo não entra nos que "ficam no
      vermelho"; horizonte vazio, fora de ordem e com buraco
- [x] `arquitetura.test.ts` continua verde (domínio puro) e a cobertura de branches do arquivo é 100%
- [x] Gate: `pnpm test:unit` sai 0: 2.123 unitários (2.095 + 28), 414/414 branches; `typecheck` e `lint` limpos

**Tests**: unit
**Gate**: quick
**Commit**: `feat(domain): simular compra parcelada contra o horizonte de saldos`

---

### T2: `obterHorizonteDeSaldos` lê os 13 saldos de C a C + 12 ✅ Concluída

**What**: Caso de uso que lê o mês aberto (`listarPorCompetencia`) e a janela seguinte numa chamada
(`listarEntre(C + 1, C + 12)`) e devolve `[{ competencia, saldo }]` de C a C + 12, em ordem, com o
saldo de `saldoPrevistoDaCompetencia`. Não materializa: a página o faz.
**Where**: `src/application/mes/obter-horizonte-de-saldos/handler.ts`
**Depends on**: None
**Reuses**: `MESES_DE_PROJECAO`, `projetarProximosMeses`, `saldoPrevistoDaCompetencia`, fakes de
`src/application/ports/fakes.ts`
**Requirement**: SIM-02 (AC 4), SIM-05 (AC 5)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `handler.test.ts` prova 13 itens, de C a C + 12, em ordem, com a virada de ano a partir de
      novembro, por valores literais
- [x] Concordância: cada `saldo` é igual ao `saldo` de `projetarProximosMeses` para a mesma lista e o
      de C igual a `saldoPrevistoDaCompetencia` (o mesmo número do card "Saldo previsto")
- [x] Espião: uma chamada a `listarEntre(C + 1, C + 12)` e uma a `listarPorCompetencia(C)`; uma
      fixture em C + 12 entra e uma em C + 13 fica fora (observação do Verifier da fatia 1)
- [x] Cancelado não entra no saldo
- [x] Gate: `pnpm test:unit` sai 0: 2.130 unitários (+7)

**Tests**: unit
**Gate**: quick
**Commit**: `feat(mes): ler o horizonte de saldos de C a C + 12`

---

### T3: `RespostaDaSimulacao`: linhas por mês e veredito

**What**: Componente de apresentação que recebe o resultado de `simularCompra`, o `n` pedido, o
menor `m` que cabe (ou `null`) e a competência aberta, e desenha uma linha por mês (mês, parcela,
"Vai sobrar"/"Vai faltar" antes e depois, marca "já estava no vermelho") e o veredito com as
frases literais da spec, mais "Enxergo até <Mês de ano>." quando há parcelas fora. `apresentarSaldo`
sai de `horizonte-futuro.tsx` para um módulo puro reutilizado pelos dois, no mesmo commit.
**Where**: `src/components/resposta-da-simulacao.tsx`
**Depends on**: T1
**Reuses**: `apresentarSaldo` (extraído de `horizonte-futuro.tsx`), `formatarBRL`,
`formatarCompetencia`, `nomeDoMes`
**Requirement**: SIM-02 (ACs 3, 5, 6, 7, 8, 9)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `resposta-da-simulacao.test.tsx` prova, por `within` de cada linha, mês, parcela, antes e
      depois com as palavras de "Próximos meses" e as classes `text-positivo`/`text-negativo`/sem cor
      no zero
- [ ] Os cinco vereditos literais: "Cabe. Nenhum mês fica no vermelho."; "Cabe. Maio já estava no
      vermelho antes desta compra."; "Em 3x não cabe: março e abril ficam no vermelho. Em 5x cabe.";
      singular "abril fica no vermelho"; "Não cabe em nenhum parcelamento até 120x."
- [ ] Mês de ano diferente do de C sai como "janeiro de 2027"; lista com três meses usa vírgula e "e"
- [ ] "Enxergo até Março de 2027." aparece se e só se `parcelasForaDoHorizonte > 0`
- [ ] `horizonte-futuro.test.tsx` continua verde com `apresentarSaldo` importado do módulo novo
- [ ] Gate: `pnpm test:unit` sai 0

**Tests**: unit
**Gate**: quick
**Commit**: `feat(componentes): resposta da simulação com linhas por mês e veredito`

---

### T4: `FormCompra` com valores iniciais e com a resposta da simulação

**What**: Duas props opcionais: `valoresIniciais` (`modo`, `valor` em texto, `qtdParcelas`) que
preenchem o estado inicial, e `horizonte` que, quando presente, renderiza `RespostaDaSimulacao`
abaixo da prévia das parcelas com o plano da própria prévia e `menorParcelamentoQueCabe`; sem
`horizonte`, nada muda. Sem botão "Lançar esta compra" dentro do formulário.
**Where**: `src/components/form-compra.tsx`
**Depends on**: T3
**Reuses**: `planoDaCompra`, `simularCompra`, `menorParcelamentoQueCabe`, `RespostaDaSimulacao`
**Requirement**: SIM-04 (AC 2, a parte do preenchimento), SIM-05 (ACs 1, 2, 3, 4)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `form-compra.test.tsx` prova: com `horizonte`, o bloco aparece abaixo da prévia (vizinhança no
      DOM, L-018) com "Cabe. Nenhum mês fica no vermelho." para R$ 1.000,00 em 3x sobre 700 por mês;
      sem `horizonte`, o bloco não existe
- [ ] Mudar o número de parcelas recalcula o bloco (3 → 2 linhas)
- [ ] Nenhum botão "Lançar esta compra" dentro do formulário
- [ ] `valoresIniciais` preenche modo, valor e parcelas e a prévia nasce calculada
- [ ] Os testes existentes do formulário continuam verdes sem mudança
- [ ] Gate: `pnpm test:unit` sai 0

**Tests**: unit
**Gate**: quick
**Commit**: `feat(componentes): valores iniciais e resposta da simulação no FormCompra`

---

### T5: `Simulador`: os campos, a resposta e "Lançar esta compra"

**What**: Componente cliente com valor, modo, parcelas e mês da primeira parcela (as 13 competências,
C por padrão); recalcula a cada tecla por `planoDaCompra` + `simularCompra` +
`menorParcelamentoQueCabe`; mostra "Informe o valor para ver a resposta." sem valor e as mensagens
de `src/lib/erros.ts` junto do campo quando parcelas ou valor são inválidos; enquanto há resposta,
o botão "Lançar esta compra" abre abaixo o `FormCompra` preenchido, com a competência escolhida e
`dataPadraoDoLancamento(mês, hoje)`; o formulário não existe antes do clique.
**Where**: `src/components/simulador.tsx`
**Depends on**: T4
**Reuses**: `FormCompra`, `RespostaDaSimulacao`, `parseBRL`, `mensagemDoErro`,
`dataPadraoDoLancamento`, `formatarCompetencia`
**Requirement**: SIM-02 (ACs 2, 3, 10, 11), SIM-04 (ACs 1, 2, 3, 7)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `simulador.test.tsx` prova as 13 opções do mês, C selecionada; resposta sem `enviar` chamado;
      "Informe o valor para ver a resposta." e zero linhas sem valor; parcelas 0 e 121 (colados em 1 e
      120, L-029) e R$ 0,01 em 2x com as mensagens literais de `erros.ts` junto do campo
- [ ] Antes do clique não há formulário nem campos de descrição, categoria, meio e pessoa; depois do
      clique o `FormCompra` nasce com modo, valor, parcelas e competência iguais aos simulados e a
      data padrão do mês escolhido (dia 1 quando não é o corrente, hoje quando é)
- [ ] A chave de idempotência do formulário aberto existe antes de qualquer envio (`input hidden`)
- [ ] Botão ausente quando não há resposta
- [ ] Gate: `pnpm test:unit` sai 0

**Tests**: unit
**Gate**: quick
**Commit**: `feat(componentes): simulador com lançar esta compra`

---

### T6: A página `/[competencia]/simular` e o e2e

**What**: Página com sessão, `materializarRecorrencias` de C a C + 12, `obterHorizonteDeSaldos`,
cadastros para o formulário, título "Dá pra comprar?", `AreaEstreita`, montando `Simulador` com as
actions por prop. E2E `e2e/simular.spec.ts`: a fixture de `saldo-futuro` (1.000 de entrada, 300 de
fixo, 1.200 só em maio); R$ 1.000,00 em 3x → três linhas, 366,66/366,67/366,67 e "Cabe";
R$ 3.000,00 em 3x → "Em 3x não cabe: março e abril ficam no vermelho. Em 5x cabe."; 24x → "Enxergo
até Março de 2027."; lançar R$ 1.000,00 em 3x e abrir abril: "Saldo previsto" R$ 366,67 e o
simulador relido mostra 366,67 como "antes"; 400 × 800 com os campos e o veredito dentro da área
visível; nenhuma chamada de rede durante a digitação.
**Where**: `src/app/(app)/[competencia]/simular/page.tsx`
**Depends on**: T5, T2
**Reuses**: `fixos/page.tsx` (sessão, materialização, cadastros), `e2e/saldo-futuro.spec.ts`
(fixture e helpers)
**Requirement**: SIM-02 (ACs 1, 4, 12, 13), SIM-04 (ACs 4, 5, 6)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `e2e/simular.spec.ts` cobre os cinco cenários acima, com consultas restritas à região da
      resposta (L-018) e o "antes" igual ao card "Saldo previsto" de cada mês aberto (L-014)
- [ ] Abrir `/2026-03/simular` numa base só com recorrências cria as ocorrências até 2027-03 (13
      competências no banco)
- [ ] 400 × 800: `boundingBox` dos quatro campos e do veredito com `y + height ≤ 800`
- [ ] Gate: `pnpm test:unit && pnpm test:integration && pnpm test:e2e` saem 0

**Tests**: e2e
**Gate**: full
**Commit**: `feat(simular): a tela Dá pra comprar? em /[competencia]/simular`

---

### T7: "Simular" quinto item da navegação, barra inferior em cinco

**What**: Acrescentar `{ slug: "simular", rotulo: "Simular" }` como quinto item, ativo quando o
caminho termina em `/simular`; no celular o texto passa a 11 px e o `gap` da barra a zero; em
768 px ou mais nada muda. Atualizar os testes que contam quatro áreas.
**Where**: `src/components/navegacao-principal.tsx`
**Depends on**: T6
**Reuses**: `estaAtiva`, `e2e/categorias.spec.ts` (teste de 400 px da barra)
**Requirement**: SIM-03 (ACs 1 a 5)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `navegacao-principal.test.tsx` prova as cinco áreas, na ordem, o destino `/2026-03/simular` e
      `aria-current` só em Simular quando o caminho termina em `/simular`
- [ ] E2E em 360 e em 400 px (L-055): cada um dos cinco links com `scrollWidth ≤ clientWidth`, o rótulo
      em uma linha (altura do texto ≤ uma linha), a mesma altura entre os links, ao menos 44 px, e
      `scrollWidth` da página ≤ `innerWidth`; em 1024 px o texto dos itens mede 15 px
- [ ] Os testes existentes que diziam "quatro" passam a cinco
- [ ] Gate: `pnpm test:unit && pnpm test:e2e` saem 0

**Tests**: e2e
**Gate**: full
**Commit**: `feat(navegacao): Simular como quinto item com a barra inferior em cinco`

---

### T8: O horizonte chega ao cadastro da Visão geral e de Lançamentos

**What**: `CadastroDeLancamento` recebe `horizonte` e o repassa ao `FormCompra`; a Visão geral e a
página de Lançamentos montam os 13 saldos a partir de `obterVisaoMensal` (`competenciaView.saldo`
de C e `futuro`). E2E: na aba Parcelado da Visão geral de março, R$ 1.000,00 em 3x mostra o bloco
com "Cabe. Nenhum mês fica no vermelho." e três linhas; o formulário de Avulso não mostra bloco.
**Where**: `src/app/(app)/[competencia]/cadastro-de-lancamento.tsx`
**Depends on**: T4, T2
**Reuses**: `obterVisaoMensal`, `e2e/compra-parcelada.spec.ts`
**Requirement**: SIM-05 (AC 5)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] E2E prova o bloco na Visão geral e em Lançamentos (diálogo), restrito ao formulário "Nova
      compra" (L-018), e a ausência no formulário de Avulso
- [ ] O "antes" de abril no bloco é igual à linha de abril em "Próximos meses" da mesma página (L-014)
- [ ] Gate: `pnpm test:unit && pnpm test:integration && pnpm test:e2e` saem 0

**Tests**: e2e
**Gate**: full
**Commit**: `feat(mes): resposta da simulação no cadastro da Visão geral e de Lançamentos`

---

### T9: Registro: AD-024, roadmap e handoff

**What**: Registrar em `.specs/STATE.md` a decisão AD-024 (o simulador recebe saldos, não
lançamentos; horizonte C a C + 12; "cabe" definido sobre o visível; mês já negativo não conta
contra a compra) e o Handoff; linha em `docs/roadmap.md`; nota em `.specs/HANDOFF.md`; a tabela
"nunca prometer" de `docs/marketing/posicionamento.md` deixa de listar o simulador como inexistente
só na fatia 3, então aqui não muda.
**Where**: `.specs/STATE.md`
**Depends on**: T7, T8
**Reuses**: AD-023
**Requirement**: SIM-01 a SIM-05 (registro)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] AD-024 escrito, Handoff atualizado, roadmap e HANDOFF.md com a fatia
- [ ] Gate: `pnpm verify` sai 0

**Tests**: none
**Gate**: build
**Commit**: `docs(simular): registrar AD-024 e o handoff`

---

## Diagram-Definition Cross-Check

| Task | Depends on (definição) | Setas no diagrama | OK |
| --- | --- | --- | --- |
| T1 | None | nenhuma entrada | ✅ |
| T2 | None | nenhuma entrada | ✅ |
| T3 | T1 | T1 → T3 | ✅ |
| T4 | T3 | T3 → T4 | ✅ |
| T5 | T4 | T4 → T5 | ✅ |
| T6 | T5, T2 | T5 → T6, T2 → T6 | ✅ |
| T7 | T6 | T6 → T7 | ✅ |
| T8 | T4, T2 | T4 → T8, T2 → T8 | ✅ |
| T9 | T7, T8 | T7 → T9, T8 → T9 | ✅ |

## Test Co-location Validation

| Task | Camada | Tipo exigido pela matriz | `Tests` da task | OK |
| --- | --- | --- | --- | --- |
| T1 | Domínio | unit | unit | ✅ |
| T2 | Caso de uso | unit | unit | ✅ |
| T3 | Componente | unit | unit | ✅ |
| T4 | Componente | unit | unit | ✅ |
| T5 | Componente | unit | unit | ✅ |
| T6 | Página | e2e | e2e | ✅ |
| T7 | Navegação | e2e | e2e | ✅ |
| T8 | Página | e2e | e2e | ✅ |
| T9 | Documentação | none | none | ✅ |
