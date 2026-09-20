# Lacunas do painel e da lista — Tasks

**Spec**: `.specs/features/lacunas-do-painel/spec.md`
**Origem**: `.specs/features/painel-e-lancamentos/validation.md` (FAIL, 2026-09-19)
**Status**: Draft
**Total**: 14 tasks em 4 fases

> **Por que a rede vem antes dos consertos.** Três dos quatro consertos mexem em código que hoje
> **nenhum teste protege**. Consertar primeiro seria mudar comportamento às cegas, e é assim que se
> troca um defeito conhecido por um que ninguém vê. A fase 0 escreve a rede sobre o comportamento
> **atual**, e só depois o comportamento muda — aí o teste que passa a falhar é informação, não
> ruído.
>
> **Todo conserto é confirmado pela mutação que revelou a lacuna.** Foi a lição L-004 da fatia
> anterior, e ela nasceu de três correções minhas que ficaram verdes sem provar nada.

---

## Execution Protocol (MANDATORY -- do not skip)

Implementar com a skill `tlc-spec-driven`, ativada pelo nome. Para cada task, nesta ordem:

1. **Pré-implementação** — declarar premissas, arquivos a tocar e critério de sucesso.
2. **Escrever os testes primeiro**, derivados dos acceptance criteria do `spec.md`. Os testes asseram o resultado definido no spec, nunca espelham a implementação.
3. **Implementar** até os testes passarem.
4. **Gate Check** — rodar o comando do nível declarado na task. O test runner decide, não auto-avaliação.
5. **Confirmar pela mutação**: toda task que fecha lacuna da verificação anterior injeta o mutante correspondente e confere que ele **morre**. Sem isso a task não está pronta.
6. **Test Adequacy Review** com citação `file:line` e a expressão da assertion. Sem citação localizada, o critério conta como não coberto.
7. **Marcar a task como concluída** neste arquivo e atualizar a traceability no `spec.md`, **antes** do commit e **dentro** do mesmo commit.
8. **Um commit atômico** em Conventional Commits, validado por `check_commit.py`.

Proibições absolutas: commitar antes do gate passar · enfraquecer, pular ou deletar teste para passar · agrupar tasks em um commit · "já que estou aqui" · marcar critério coberto sem citação `file:line`.

**Blast radius:** a aprovação destas tasks autoriza implementação e commits **locais**. `git push`, deploy e operação remota exigem autorização explícita e separada.

---

## Test Coverage Matrix

> Mesma matriz das fatias anteriores, confirmada contra `AGENTS.md` e `vitest.config.ts`.

| Camada de código | Tipo de teste | Expectativa de cobertura | Padrão de localização | Comando |
| --- | --- | --- | --- | --- |
| `src/domain/**` | unit | **100% de branches**; 1:1 com os ACs do spec | `src/domain/**/*.test.ts` | `pnpm test:unit` |
| `src/application/**` | unit | Todos os ramos, com fakes em memória; sem banco | `src/application/**/*.test.ts` | `pnpm test:unit` |
| `src/components/**` | componentes | Estados visíveis, rótulo acessível e o que a interface impede | `src/components/*.test.tsx` | `pnpm test:unit` |
| Geometria e preferência do navegador | e2e | O que só o navegador resolve: área de toque medida, movimento reduzido, estilo computado | `e2e/*.spec.ts` | `pnpm test:e2e` |
| Fluxos de usuário | e2e | Percurso completo, com asserção sobre o que a tela mostra | `e2e/*.spec.ts` | `pnpm test:e2e` |
| Rota e composição de página | **none** | Cobertos pelo gate de build e, indiretamente, por e2e | — | — |

> **Área de toque, movimento reduzido e estilo computado não têm teste de componente**, e isso é
> decisão: o jsdom não calcula layout nem resolve media query, então uma assertion lá provaria que a
> classe está escrita — que é exatamente o que deixou o critério regredir sem ninguém ver.

---

## Gate Check Commands

| Gate | Quando | Comando |
| --- | --- | --- |
| `quick` | task só com teste unitário ou de componente | `pnpm test:unit` |
| `full` | task com teste de integração | `pnpm test:unit && pnpm test:integration` |
| `build` | última task da fase, task sem teste, ou task com e2e | `pnpm verify && pnpm test:e2e` |

Pré-requisito: `pnpm db:up`, e nenhum `next dev` rodando quando houver e2e.

---

## Execution Plan

Quatro fases. A rede primeiro, sobre o comportamento atual; os consertos depois, com a rede já
segurando.

### Phase 0 — A rede, sobre o que existe hoje

```
T1 -> T2
T3
T4
```

### Phase 1 — Os consertos de comportamento

```
T1 -> T5 -> T6
T5 -> T7
```

### Phase 2 — Interface e acessibilidade

```
T4 -> T8
T8 -> T9
T10
T11
```

### Phase 3 — Fechamento

```
T2 -> T12
T6 -> T12
T9 -> T12
T12 -> T13 -> T14
```

---

## Task Breakdown

### Phase 0 — A rede, sobre o que existe hoje

#### T1: Testes do predicado de filtragem
**What**: `filtrar-lancamentos.test.ts`, cobrindo busca com acento e caixa, cada dimensão isolada, combinação como interseção, contagem de ativos e `situacaoDe` nos três estados.
**Where**: `src/application/mes/filtrar-lancamentos.test.ts`
**Depends on**: nenhuma
**Reuses**: as fixtures de `obter-visao-mensal/handler.test.ts`
**Requirement**: REDE-01
**Tools**: nenhuma
**Done when**:
- [x] Busca acha "Água" digitando "agua", e vice-versa (AC 1)
- [x] Cada uma das cinco dimensões filtra isoladamente (AC 2)
- [x] Dois filtros juntos devolvem a interseção, e não a união (AC 3)
- [x] Busca só com espaços não conta como filtro ativo (AC 4, edge case)
- [x] `situacaoDe` devolve os três estados, com competência aberta anterior, igual e posterior
- [x] **Mutante confirmado**: `filtrarLancamentos` devolvendo a lista inteira mata a suíte
**Tests**: unit
**Gate**: quick

#### T2: Teste da reconciliação indicador ↔ lista
**What**: O teste que `design.md:180` prescreve e nunca existiu: para cada indicador, o total exibido é igual à soma da lista filtrada **pelo filtro que o link carrega**.
**Where**: `src/components/painel-indicadores.test.tsx`
**Depends on**: T1
**Reuses**: `filtrarLancamentos`, já testado em T1
**Requirement**: REDE-02
**Tools**: nenhuma
**Done when**:
- [x] Os quatro indicadores do eixo competência batem com a soma filtrada (AC 1)
- [x] Os quatro do eixo caixa batem (AC 2)
- [x] O predicado sai do `href` do link, e não é redigitado no teste (AC 4)
- [x] Os números afirmados não são todos zero
- [x] **Mutante confirmado**: trocar o filtro do indicador de despesas para `natureza=RECEITA` mata a suíte
**Tests**: componentes
**Gate**: quick

#### T3: Testes do componente de filtros
**What**: `filtros-de-lancamentos.test.tsx`: a busca chega à URL, cada seletor chega à URL, e o total exibido é o do resultado.
**Where**: `src/components/filtros-de-lancamentos.test.tsx`
**Depends on**: nenhuma
**Reuses**: o padrão de dublê de `next/navigation` de `navegacao-principal.test.tsx`
**Requirement**: REDE-01
**Tools**: nenhuma
**Done when**:
- [x] Digitar na busca escreve o termo na URL (AC 5)
- [x] Cada seletor escreve o próprio parâmetro na URL (AC 5)
- [x] O total e a contagem exibidos são os recebidos (AC 6)
- [x] Todo controle tem rótulo acessível associado
- [x] **Mutante confirmado**: remover `<FiltrosDeLancamentos>` da página mata algum teste — confirmado com o percurso de T4
**Tests**: componentes
**Gate**: quick

### Phase 1 — Os consertos de comportamento

```
T1 -> T5 -> T6
T5 -> T7
```

### Phase 2 — Interface e acessibilidade

```
T4 -> T8
T8 -> T9
T10
T11
```

### Phase 3 — Fechamento

```
T2 -> T12
T6 -> T12
T9 -> T12
T12 -> T13 -> T14
```

---

## Task Breakdown

### Phase 0 — A rede, sobre o que existe hoje

#### T1: Testes do predicado de filtragem
**What**: `filtrar-lancamentos.test.ts`, cobrindo busca com acento e caixa, cada dimensão isolada, combinação como interseção, contagem de ativos e `situacaoDe` nos três estados.
**Where**: `src/application/mes/filtrar-lancamentos.test.ts`
**Depends on**: nenhuma
**Reuses**: as fixtures de `obter-visao-mensal/handler.test.ts`
**Requirement**: REDE-01
**Tools**: nenhuma
**Done when**:
- [x] Busca acha "Água" digitando "agua", e vice-versa (AC 1)
- [x] Cada uma das cinco dimensões filtra isoladamente (AC 2)
- [x] Dois filtros juntos devolvem a interseção, e não a união (AC 3)
- [x] Busca só com espaços não conta como filtro ativo (AC 4, edge case)
- [x] `situacaoDe` devolve os três estados, com competência aberta anterior, igual e posterior
- [x] **Mutante confirmado**: `filtrarLancamentos` devolvendo a lista inteira mata a suíte
**Tests**: unit
**Gate**: quick

#### T2: Teste da reconciliação indicador ↔ lista
**What**: O teste que `design.md:180` prescreve e nunca existiu: para cada indicador, o total exibido é igual à soma da lista filtrada **pelo filtro que o link carrega**.
**Where**: `src/components/painel-indicadores.test.tsx`
**Depends on**: T1
**Reuses**: `filtrarLancamentos`, já testado em T1
**Requirement**: REDE-02
**Tools**: nenhuma
**Done when**:
- [x] Os quatro indicadores do eixo competência batem com a soma filtrada (AC 1)
- [x] Os quatro do eixo caixa batem (AC 2)
- [x] O predicado sai do `href` do link, e não é redigitado no teste (AC 4)
- [x] Os números afirmados não são todos zero
- [x] **Mutante confirmado**: trocar o filtro do indicador de despesas para `natureza=RECEITA` mata a suíte
**Tests**: componentes
**Gate**: quick

#### T3: Testes do componente de filtros
**What**: `filtros-de-lancamentos.test.tsx`: a busca chega à URL, cada seletor chega à URL, e o total exibido é o do resultado.
**Where**: `src/components/filtros-de-lancamentos.test.tsx`
**Depends on**: nenhuma
**Reuses**: o padrão de dublê de `next/navigation` de `navegacao-principal.test.tsx`
**Requirement**: REDE-01
**Tools**: nenhuma
**Done when**:
- [x] Digitar na busca escreve o termo na URL (AC 5)
- [x] Cada seletor escreve o próprio parâmetro na URL (AC 5)
- [x] O total e a contagem exibidos são os recebidos (AC 6)
- [x] Todo controle tem rótulo acessível associado
- [x] **Mutante confirmado**: remover `<FiltrosDeLancamentos>` da página mata algum teste — confirmado com o percurso de T4
**Tests**: componentes
**Gate**: quick

#### T4: e2e de busca e filtro, e o Independent Test que a spec pedia
**What**: O percurso escrito em `painel-e-lancamentos/spec.md:112` e nunca implementado: buscar parte de uma descrição, ver só ela, ver o indicador de filtro ativo, e ver o total refletir só o resultado.
**Where**: `e2e/busca-e-filtros.spec.ts`
**Depends on**: nenhuma
**Reuses**: helpers de sessão e de cadastro de `e2e/lancamento-avulso.spec.ts`
**Requirement**: REDE-01
**Tools**: nenhuma
**Done when**:
- [ ] Buscar por parte de uma descrição deixa só ela na lista
- [ ] O total exibido é o da linha que restou, não o do mês
- [ ] Filtrar por categoria, meio e pessoa funciona pela tela
- [ ] Recarregar a página com o filtro na URL preserva o filtro
- [ ] Clicar num indicador do painel abre a lista já filtrada (REDE-02, AC 3)
**Tests**: e2e
**Gate**: build

### Phase 1 — Os consertos de comportamento

#### T5: "Vencido" passa a existir
**What**: A competência corrente vem de `hojeEm()` e não do segmento de rota, que é a causa de `situacaoDe` nunca devolver vencido.
**Where**: `src/app/(app)/[competencia]/lancamentos/page.tsx`
**Depends on**: T1
**Reuses**: `hojeEm` e `dataParaCompetencia`, já usados para `dataPadrao`
**Requirement**: VENC-01
**Tools**: nenhuma
**Done when**:
- [ ] Mês anterior ao corrente com pendente classifica como vencido (AC 1)
- [ ] Mês corrente e futuro classificam como pendente (AC 2)
- [ ] Pago continua pago em qualquer competência (AC 3)
- [ ] A competência corrente é resolvida por requisição (AC 5)
- [ ] Falha ao resolver a competência corrente é visível, e não vira "tudo pendente" (edge case)
**Tests**: none
**Gate**: build

#### T6: A situação vencida aparece na tela
**What**: A coluna de situação passa a distinguir o terceiro estado por texto, e o filtro "Vencido" devolve linhas.
**Where**: `src/components/tabela-lancamentos.tsx`
**Depends on**: T5
**Reuses**: `situacaoDe`, e o padrão de estado-por-texto do `BotaoPago`
**Requirement**: VENC-01
**Tools**: nenhuma
**Done when**:
- [ ] Lançamento vencido é distinguido por texto, não só por cor (AC 6)
- [ ] O filtro "Vencido" num mês passado devolve os não pagos daquele mês (AC 4)
- [ ] O filtro "Pendente" no mesmo mês não devolve os mesmos
- [ ] O selo continua sendo o botão que alterna o pagamento
**Tests**: componentes
**Gate**: quick

#### T7: e2e do vencido
**What**: Percurso com pendente num mês passado, provando o estado na tela e no filtro.
**Where**: `e2e/busca-e-filtros.spec.ts`
**Depends on**: T5
**Reuses**: o arquivo criado em T4
**Requirement**: VENC-01
**Tools**: nenhuma
**Done when**:
- [ ] Um pendente em mês passado aparece como vencido
- [ ] Filtrar por "Vencido" o devolve; por "Pendente", não
- [ ] No mês corrente o mesmo lançamento aparece como pendente
- [ ] **Mutante confirmado**: voltar a passar a competência da rota mata este percurso
**Tests**: e2e
**Gate**: build

### Phase 2 — Interface e acessibilidade

#### T8: Área de toque de 44 × 44 nos controles da linha
**What**: `min-h-11 min-w-11` no selo de pago e no botão de excluir, os dois controles mais tocados do app.
**Where**: `src/components/botao-pago.tsx`
**Depends on**: T4
**Reuses**: a medida `min-h-11` já usada na navegação e no alternador
**Requirement**: TOQUE-01
**Tools**: nenhuma
**Done when**:
- [ ] O selo de situação mede ao menos 44 × 44 (AC 1)
- [ ] O mesmo é aplicado ao botão de excluir (AC 2)
- [ ] A pílula continua legível, sem quebrar a linha da tabela em 400px
- [ ] O espaçamento entre os dois continua separando os alvos
**Tests**: componentes
**Gate**: quick

#### T9: e2e que mede a área de toque
**What**: Percurso em 400 pixels que mede `getBoundingClientRect()` dos dois controles de uma linha.
**Where**: `e2e/acessibilidade.spec.ts`
**Depends on**: T8
**Reuses**: helpers de sessão
**Requirement**: TOQUE-01
**Tools**: nenhuma
**Done when**:
- [ ] Os dois controles medem ao menos 44 em cada dimensão, medido e não declarado (AC 3)
- [ ] A medição roda em viewport de 400 pixels
- [ ] **Mutante confirmado**: remover `min-h-11` mata este percurso
**Tests**: e2e
**Gate**: build

#### T10: Estados vazios com ação de saída
**What**: O vazio do mês oferece o cadastro; o vazio de filtro oferece limpar; e o texto que manda cadastrar "abaixo" é corrigido.
**Where**: `src/components/tabela-lancamentos.tsx`
**Depends on**: nenhuma
**Reuses**: `DialogoDeCadastro`, já montado na página
**Requirement**: VAZIO-01
**Tools**: nenhuma
**Done when**:
- [ ] O vazio do mês oferece o controle de cadastro (AC 1)
- [ ] O vazio de filtro oferece limpar os filtros (AC 2)
- [ ] Limpar devolve a lista inteira do mês (AC 3)
- [ ] Nenhum texto manda procurar o cadastro em posição que ele não ocupa (AC 4)
**Tests**: componentes
**Gate**: quick

#### T11: O atalho para o mês corrente
**What**: Controle no seletor de competência que leva ao mês de hoje preservando a área, desabilitado quando já se está nele.
**Where**: `src/components/seletor-competencia.tsx`
**Depends on**: nenhuma
**Reuses**: `hojeEm` no servidor, e o padrão de link do próprio seletor
**Requirement**: MES-01
**Tools**: nenhuma
**Done when**:
- [ ] O controle leva ao mês corrente (AC 1)
- [ ] A área é preservada: de `/2026-03/lancamentos` vai para `/<corrente>/lancamentos` (AC 2)
- [ ] No mês corrente ele aparece desabilitado, e não oculto (AC 3)
- [ ] Tem rótulo acessível que diz para onde leva
**Tests**: componentes
**Gate**: quick

### Phase 3 — Fechamento

#### T12: Os comportamentos que só existiam em CSS
**What**: Provas para movimento reduzido, algarismo de largura fixa, contagem de indicadores e esqueleto de carregamento.
**Where**: `e2e/acessibilidade.spec.ts`
**Depends on**: T2, T6, T9
**Reuses**: o arquivo criado em T9
**Requirement**: REDE-03
**Tools**: nenhuma
**Done when**:
- [ ] Com movimento reduzido ativo, a transição do elemento animado é instantânea (AC 1)
- [ ] Valor monetário tem `font-variant-numeric` tabular e alinhamento à direita, no estilo computado (AC 2)
- [ ] Cada eixo do painel tem exatamente quatro indicadores (AC 3)
- [ ] O esqueleto tem a mesma contagem de blocos que a página (AC 5)
- [ ] **Mutantes confirmados**: inverter a media query, e acrescentar um quinto indicador, matam a suíte
**Tests**: e2e
**Gate**: build

#### T13: A rastreabilidade passa a recortar por AC
**What**: A tabela de `painel-e-lancamentos` passa a dizer quais ACs cada requisito cobre, como `lancamento-avulso` já faz.
**Where**: `.specs/features/painel-e-lancamentos/spec.md`
**Depends on**: T12
**Reuses**: o recorte que o Verifier reconstruiu em `validation.md`
**Requirement**: REDE-01
**Tools**: nenhuma
**Done when**:
- [ ] Cada um dos 20 IDs diz quais ACs cobre
- [ ] O status reflete o que passou a ter prova nesta fatia
- [ ] A dívida equivalente em `recorrencias` e `home-do-ano` fica registrada no handoff
**Tests**: none
**Gate**: build

#### T14: Roadmap, handoff e decisões
**What**: Registrar o que esta fatia mudou e o que a verificação ensinou.
**Where**: `.specs/STATE.md`
**Depends on**: T13
**Reuses**: o formato `AD-NNN`
**Requirement**: MES-01
**Tools**: nenhuma
**Done when**:
- [ ] A causa do "Vencido" morto fica registrada, porque o defeito era de argumento e não de regra
- [ ] `.specs/HANDOFF.md` reflete os números e as pendências que restam
- [ ] `validate_state.py` passa para `lacunas-do-painel`
**Tests**: none
**Gate**: build
