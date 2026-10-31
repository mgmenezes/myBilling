# Todo mês em linhas, com o fixo aberto à direita — Tasks

**Spec**: `.specs/features/todo-mes-colunas/spec.md`
**Design**: `.specs/features/todo-mes-colunas/design.md`
**Status**: Em execução, lote 2 (plano aprovado pelo dono em 2026-10-30; T1 a T7 no lote 1, T8 a T10 no lote 2; branch `feat/todo-mes-colunas`, em worktree
`.worktrees/todo-mes-colunas`, rebaseada em 2026-10-31 sobre a `main` em `33c9567`, que já traz
`lancamentos-densos` (AD-020); os hashes da T1 à T6 são os de depois do rebase)
**Total**: 11 tasks em 4 fases (T1–T11). Dá dois lotes: fases 1 e 2 (T1–T7) e fases 3 e 4
(T8–T11), com a oferta de sub-agentes antes do Execute.

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
- "já que estou aqui";
- dado real em fixture ou commit (AD-009).

Um teste antigo só muda quando a spec desta fatia muda a regra que ele prova, ou a estrutura que ele
consulta, e a mudança fica registrada no commit (`design.md`, "Testes que mudam porque a spec
mudou"). `lista-de-fixos.test.tsx` só sai na T8, depois de cada teste dele ter o equivalente nomeado
nas T3 a T6 (`design.md`, "Para onde vai cada teste").

**Blast radius:** a aprovação autoriza implementação e commits **locais**. `git push` e qualquer
operação remota exigem autorização separada. O e2e usa a porta 3100 e o banco de teste: uma execução
por vez, e nunca junto com outro Verifier.

---

## Global Constraints

- **Sem mudança de banco.** Nenhuma migration, nenhuma coluna.
- **Só `movimento` soma** (AD-003): todo total sai das ocorrências; as vigências só aparecem no
  histórico.
- **Domínio puro** (AD-006): `fixosDoMes` não importa nada de fora do domínio, não lança e não é
  `async`. 100% de branches em `src/domain`.
- **Um painel só,** `<aside id="painel-do-fixo" aria-label="Painel do fixo">`, com um formulário por
  vez. Ele muda de lugar só por CSS.
- **Nenhuma action nova.** As de hoje (`criarRecorrencia`, `editarRecorrencia`,
  `registrarNovaVigencia`, `encerrarRecorrencia`) chegam por prop.
- **Densidade só no mouse:** toda redução de altura é `md:pointer-fine:`. No toque e abaixo de
  768 px, os alvos continuam com 44 px (TOQUE-01).
- **Layout se prova no navegador:**
  - medir com `boundingBox` e estilo computado, depois de esperar a página pronta;
  - todo limiar com casos colados nos dois lados (L-029): 1.535 e 1.536 px, e o formulário dos dois
    lados de 448 px;
  - AC universal ("toda linha") percorre todas as linhas (L-030);
  - consulta que situa um elemento fica presa à região dele: a linha, a seção ou o painel (L-018).
- **Composição de ponta a ponta** (L-014, L-001): materialização, total igual ao bloco "Fixos" de
  Lançamentos e valor confirmado provados na página real, abrindo Todo mês primeiro.
- **AC com duas cláusulas, duas assertions** (L-010), por exemplo o clique na linha e no botão.
- **Gate:** o de toda task inclui `pnpm typecheck` (L-016).

## Review Focus

1. **Total de saídas igual ao bloco "Fixos" de Lançamentos**, inclusive com o encerrado pago depois
   do fim. Teste em T1 (concordância com `resumoMensal`) e T8 (e2e).
2. **Materialização antes da leitura.** Teste em T2 (fakes) e T8 (abrir Todo mês primeiro).
3. **Ausências nos e2e antigos usam `row`.** Com a tabela, uma ausência procurada em `listitem`
   passa sem provar nada (`recorrencias.spec.ts:243`). T8.
4. **Limiar de 1.536 px dos dois lados e coluna presa.** T9.
5. **Nenhum teste de `lista-de-fixos.test.tsx` perdido.** A tabela do design, conferida na T8.

---

## Test Coverage Matrix

> Gerada a partir do código, de `AGENTS.md`, de `vitest.config.ts` (branches 100% em `src/domain`) e
> da spec. Confirmar antes do Execute.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Domínio (`src/domain/recorrencia`) | unit | 100% de branches; 1:1 com os ACs de regra de FIXCOL-01 a 03; concordância com `resumoMensal` | `src/domain/recorrencia/fixos-do-mes.test.ts` | `pnpm test:unit` |
| Aplicação (`src/application/recorrencias/obter-todo-mes`) | unit, com os fakes | Todo ramo; a materialização antes da leitura | `handler.test.ts` ao lado | `pnpm test:unit` |
| Componentes | componentes (Testing Library) | Cada AC de comportamento, com consulta presa à região; cada teste de `lista-de-fixos.test.tsx` portado | `src/components/*.test.tsx` | `pnpm test:unit` |
| Página e fluxo | e2e | Composição de ponta a ponta; layout medido, limiares dos dois lados, toda linha percorrida | `e2e/todo-mes-colunas.spec.ts` e os e2e que mudam | `pnpm exec playwright test <specs>` |
| Docs e decisão | none | — (gate build) | — | — |

## Gate Check Commands

| Gate | Comando |
| --- | --- |
| `quick` | `pnpm test:unit && pnpm typecheck && pnpm lint` |
| `e2e` | `pnpm test:unit && pnpm typecheck && pnpm lint && pnpm exec playwright test <specs da task>` |
| `build` | `pnpm db:up && pnpm verify`, depois `pnpm test:e2e` inteiro |

O e2e roda com `DATABASE_URL_TEST` apontando para o banco de teste separado, porta 3100, uma
execução por vez. Cada comando tem o código de saída conferido sozinho, sem `tail` no meio. Base
medida em 2026-10-30 nesta worktree: `pnpm test:unit` com 1.703 testes em 109 arquivos, e
`pnpm typecheck` e `pnpm lint` saindo 0.

---

## Execution Plan

### Phase 1 — A regra e a leitura

```
T1 -> T2
```

### Phase 2 — As peças da tela

```
T3 -> T4
T4 -> T6
T5 -> T6
T3 -> T7
T6 -> T7
```

### Phase 3 — A página

```
T8 -> T9
T9 -> T10
```

### Phase 4 — Fechamento

```
T11
```

Dois lotes: T1 a T7, e T8 a T11, nesta ordem.

---

## Task Breakdown

### Phase 1 — A regra e a leitura

#### T1: `fixosDoMes`, a regra das linhas e dos totais
**What**: a função pura que separa os fixos do mês em entradas e saídas, ordena, traz o valor da
ocorrência e soma os dois totais a partir dos lançamentos.
**Where**:
- `src/domain/recorrencia/fixos-do-mes.ts` (+ teste)
- `src/domain/index.ts` (export)

**Depends on**: nenhuma
**Reuses**: `valeNaCompetencia`, `despesasDaCompetencia`, `compararCompetencias`
**Requirement**: FIXCOL-01, FIXCOL-02, FIXCOL-03
**Done when**:
- [x] Despesa vai para saídas; receita e investimento, para entradas (FIXCOL-01 AC 2)
- [x] Ordem pelo dia, com um caso que separa dia de alfabeto (dia 1 "Fixo D" antes de dia 5 "Fixo A"), depois pela descrição pt-BR no empate, depois pelo id (FIXCOL-01 AC 3)
- [x] `valorDoMes` é o da ocorrência, inclusive o confirmado; `confirmado` só com valor diferente do previsto; sem ocorrência, `null` (FIXCOL-02 ACs 1 e 2)
- [x] O encerrado antes do mês aparece quando o mês tem ocorrência dele e some quando não tem; o que começa depois aparece com `null` (FIXCOL-02 ACs 4 e 5)
- [x] Ocorrência cancelada, de outra competência ou de origem não recorrente fica fora de linha e total
- [x] `totalSaidas` é igual a `resumoMensal(...).competenciaView.fixos` para a mesma entrada; o total de cada seção é igual à soma das linhas; o fixo que começa depois soma zero, mesmo com vigência de valor alto (FIXCOL-03 ACs 2 a 5)
- [x] `src/domain/shared/arquitetura.test.ts` passa; 100% de branches em `src/domain`
- [x] Gate quick passa; nenhum dos 1.703 testes de antes some
**Tests**: unit
**Gate**: quick
**Commit**: `feat(domain): fixos do mês com o valor da ocorrência` (`7e88093`)

#### T2: `obterTodoMes`, materializar e ler o mês
**What**: o caso de uso de leitura de Todo mês: materializa a janela, lê fixos e lançamentos do mês e
chama `fixosDoMes`.
**Where**: `src/application/recorrencias/obter-todo-mes/handler.ts` (+ teste)
**Depends on**: T1
**Reuses**: `materializarRecorrencias`, `MESES_DE_PROJECAO`, `@/application/ports/fakes`
**Requirement**: FIXCOL-02, FIXCOL-03
**Done when**:
- [x] Num mês nunca aberto, a linha vem com o valor da vigência e o total de saídas não é zero; ler antes de materializar zera os dois (FIXCOL-02 AC 3)
- [x] Abrir o mesmo mês duas vezes não cria ocorrência nova (FIXO-02)
- [x] Com uma ocorrência confirmada nos fakes, a linha e o total trazem o valor confirmado (FIXCOL-02 AC 1, FIXCOL-03 AC 2)
- [x] Gate quick passa; a contagem de testes só cresce
**Tests**: unit
**Gate**: quick
**Commit**: `feat(recorrencias): ler Todo mês a partir das ocorrências` (`5c7d9fc`)

### Phase 2 — As peças da tela

#### T3: `TabelaDeFixos`, as duas seções em linhas
**What**: o componente das seções "Entradas fixas" e "Saídas fixas", com as linhas sem botão de ação,
os selos, o valor do mês, a linha aberta e os vazios; e o tipo `ItemDeFixo`.
**Where**: `src/components/tabela-de-fixos.tsx` (+ teste)
**Depends on**: nenhuma
**Reuses**: `Chip`, a `CELULA` de `tabela-lancamentos.tsx`
**Requirement**: FIXCOL-01, FIXCOL-02, FIXCOL-04
**Done when**:
- [x] "Entradas fixas" antes de "Saídas fixas", cada uma com Descrição, Categoria, "Vence" ou "Cai", "Meio" ou "Onde cai" e "Valor em Março" (FIXCOL-01 AC 1)
- [x] Título de cada seção com "N · R$ X", procurado dentro da região da seção (FIXCOL-01 AC 4)
- [x] Pill com a cor da categoria nas saídas; "Sem categoria" e "Categoria removida" na neutra; "Receita" nas entradas; selos sem a cor da categoria; tudo procurado dentro da linha (FIXCOL-01 ACs 5 e 6)
- [x] O único botão de cada linha é o da descrição (FIXCOL-01 AC 7)
- [x] Selos "Encerrado" e "Começa em Junho de 2026", e "—" no valor de quem começa depois (FIXCOL-01 ACs 8 e 9)
- [x] "confirmado" na célula do valor, só na linha confirmada (FIXCOL-02 AC 2)
- [x] Mês sem fixo: um aviso só, sem seções; seção vazia: a linha de texto dela (FIXCOL-01 ACs 12 e 13)
- [x] Clicar na célula do valor chama `aoAbrir` com o id; acionar o botão da descrição também: uma assertion para cada (FIXCOL-04 AC 1, L-010)
- [x] Botão da linha aberta com `aria-expanded="true"` e `aria-controls="painel-do-fixo"`, as outras com `"false"` (FIXCOL-04 AC 7)
- [x] Os testes de `lista-de-fixos.test.tsx` das linhas 119, 125, 132, 138 (selo), 146, 176, 189, 195 e 205 têm equivalente aqui
- [x] Gate quick passa; a contagem de testes só cresce
**Tests**: componentes
**Gate**: quick
**Commit**: `feat(fixos): a tabela de fixos em duas seções` (`3d43de7`)

#### T4: `DetalheDoFixo`, o fixo aberto
**What**: o detalhe do painel: valor do mês e nota, aviso de encerrado, dados, "Valor ao longo dos
meses" e as três ações.
**Where**: `src/components/detalhe-do-fixo.tsx` (+ teste)
**Depends on**: T3
**Reuses**: `ItemDeFixo`, `Chip`
**Requirement**: FIXCOL-04
**Done when**:
- [x] Valor com "em Março de 2026"; "confirmado · previa R$ 100,00" no confirmado; "—" com "Começa em Junho de 2026" em quem começa depois (FIXCOL-04 AC 2)
- [x] Categoria como na linha; "Meio de pagamento" na saída e "Onde o dinheiro cai" na entrada; "De quem é"; "Começou em" ou "Começa em"; "Termina em" com "Sem fim" (FIXCOL-04 AC 3)
- [x] Dentro da seção "Valor ao longo dos meses", as vigências da mais antiga para a mais nova, com "desde <Mês de Ano>" e o valor, e "vale em Março" só na do mês (FIXCOL-04 AC 4)
- [x] "Mudar valor", "Editar" e, no pé, "Encerrar"; cada um chama o seu callback (FIXCOL-04 AC 5)
- [x] Encerrado: o aviso com o mês do fim, e "Editar" como única ação (FIXCOL-04 AC 6); equivalentes de 138 (sem controles), 373 e 386 de `lista-de-fixos.test.tsx`
- [x] Gate quick passa; a contagem de testes só cresce
**Tests**: componentes
**Gate**: quick
**Commit**: `feat(fixos): o detalhe do fixo aberto, com o valor ao longo dos meses` (`02b8d7e`)

#### T5: `CicloDoFixo`, mudar o valor e encerrar
**What**: o `fieldset` de "Mudar o valor" e "Encerrar" de `lista-de-fixos.tsx:291-364`, fora do
cartão, com o mesmo comportamento e um `h3`.
**Where**: `src/components/ciclo-do-fixo.tsx` (+ teste)
**Depends on**: nenhuma
**Reuses**: o `fieldset` de hoje, `parseBRL`
**Requirement**: FIXCOL-05
**Done when**:
- [x] Os oito testes de "mudar valor" e "encerrar" de `lista-de-fixos.test.tsx` (linhas 225, 235, 254, 266, 279, 288, 302 e 310) passam aqui com as mesmas assertions (FIXCOL-05 ACs 1, 3 e 7)
- [x] Gravar com sucesso chama `aoConcluir`; "Cancelar" chama `aoCancelar` sem gravar (FIXCOL-05 ACs 2 e 6)
- [x] O título é "Mudar o valor" ou "Encerrar"
- [x] Gate quick passa; a contagem de testes só cresce
**Tests**: componentes
**Gate**: quick
**Commit**: `refactor(fixos): mudar o valor e encerrar fora do cartão` (`1ff2b66`)
**Nota**: a prop `descricao` do design saiu de `CicloDoFixo`. Ela servia à `legend` invisível ("Mudar o valor de <descrição>"); o título à vista é "Mudar o valor" ou "Encerrar", e a descrição já é o título do painel. Nenhum AC muda.

#### T6: `PainelDoFixo`, os modos do painel
**What**: o conteúdo do painel por modo (nada, cadastro, detalhe, mudar o valor, encerrar, editar,
fixo fora da lista), com "Fechar", `Escape`, "Voltar" e o foco no título.
**Where**: `src/components/painel-do-fixo.tsx` (+ teste)
**Depends on**: T4, T5
**Reuses**: `DetalheDoFixo`, `CicloDoFixo`, `FormRecorrencia`
**Requirement**: FIXCOL-04, FIXCOL-05, FIXCOL-06, FIXCOL-07, FIXCOL-08
**Done when**:
- [x] Nada aberto: "Nenhum fixo aberto" e a dica da spec (FIXCOL-07 AC 3, o texto)
- [x] Cadastro: o formulário sob "Novo gasto fixo ou entrada"; cadastrar mantém o formulário com a confirmação e os campos limpos (FIXCOL-06 ACs 2 e 3)
- [x] Fixo: a descrição no título e "Saída fixa · vence dia 10" ou "Entrada fixa · cai dia 5" (FIXCOL-04 AC 1)
- [x] "Mudar valor" e "Encerrar" do detalhe abrem `CicloDoFixo` no modo certo (FIXCOL-05 ACs 1 e 3)
- [x] Registrar um valor volta ao detalhe; "Cancelar" em "Mudar o valor" e em "Encerrar" também volta, uma assertion para cada (FIXCOL-05 ACs 2 e 6)
- [x] "Editar" mostra a região "Editar gasto fixo" ou "Editar entrada" com o formulário preenchido e o mesmo payload de hoje; salvar mostra "Alterações salvas." ou "Nada mudou: já estava tudo assim." e o formulário fica; "Voltar" mostra o detalhe com o gravado (FIXCOL-05 ACs 4 a 6); equivalentes de 392 (dois casos), 410, 435 e 451
- [x] Trocar de fixo com "Mudar valor" aberto volta ao detalhe do novo, sem o que foi digitado (FIXCOL-04 AC 9); equivalente de 326
- [x] Fixo fora da lista: "Fixo B não aparece mais em Março de 2026." com "Fechar" (FIXCOL-05 AC 8)
- [x] "Fechar" chama `aoFechar`; `Escape` com o foco num campo do painel também (FIXCOL-04 AC 8, FIXCOL-08 AC 3)
- [x] Mudar `focarTitulo` leva o foco ao título; montar o painel não leva (FIXCOL-08 AC 2)
- [x] Gate quick passa; a contagem de testes só cresce
**Tests**: componentes
**Gate**: quick
**Commit**: `feat(fixos): o painel do fixo, com cadastro e edição sem diálogo` (`bfcc81b`)
**Nota**: "montar o painel não leva o foco" vale para a montagem com `focarTitulo` 0, que é a carga da página com `?fixo=`. Abaixo de 1.536 px o painel só existe com algo aberto (T7), então ele nasce no mesmo render em que a pessoa abre e o número muda: a montagem com um número diferente de 0 também leva o foco, e há teste para os dois casos. O subtítulo "Saída fixa · vence dia N" fica no cabeçalho em todo modo de um fixo da lista, e não só no detalhe.

#### T7: `TodoMes`, o estado da tela e o endereço
**What**: o componente cliente da tela: cabeçalho com "+ Novo fixo", totais, painel e tabela, o
estado do que está aberto, `?fixo=` e o foco de volta.
**Where**: `src/components/todo-mes.tsx` (+ teste)
**Depends on**: T3, T6
**Reuses**: `TabelaDeFixos`, `PainelDoFixo`
**Requirement**: FIXCOL-03, FIXCOL-06, FIXCOL-07, FIXCOL-08, FIXCOL-09
**Done when**:
- [x] "Todo mês" e "+ Novo fixo" vêm antes dos totais e das seções na ordem do DOM (FIXCOL-06 AC 1)
- [x] Os totais "Saídas fixas em Março de 2026" e "Entradas fixas em Março de 2026", cada um com o seu valor, procurados no par termo e definição (FIXCOL-03 AC 1)
- [x] Abrir uma linha mostra o fixo no painel e chama `history.replaceState` com `?fixo=<id>`, mantendo os outros parâmetros; `pushState` não é chamado (FIXCOL-09 AC 1)
- [x] `fixoInicial` da lista abre o painel com ele; um id que não está na lista deixa o painel fechado, sem erro (FIXCOL-09 ACs 2 e 3)
- [x] "+ Novo fixo" fecha o fixo aberto, mostra o cadastro e tira `?fixo=` (FIXCOL-06 AC 2, FIXCOL-09 AC 4)
- [x] Fechar tira `?fixo=` e devolve o foco ao botão da linha; fechar o cadastro devolve ao "+ Novo fixo" (FIXCOL-08 AC 4, FIXCOL-09 AC 4)
- [x] Sem nada aberto, nenhum painel no DOM; com algo aberto, o painel entre os totais e as seções (FIXCOL-07 ACs 5 e 6, na ordem do DOM; a medida é da T8)
- [x] Gate quick passa; a contagem de testes só cresce
**Tests**: componentes
**Gate**: quick
**Commit**: `feat(fixos): o estado de Todo mês, com o fixo aberto no endereço` (`d1f0862`)
**Nota**: fechar o aviso de um fixo que saiu da lista devolve o foco ao "+ Novo fixo", porque o botão da linha não existe mais; o FIXCOL-08, AC 4 só nomeia a linha e o cadastro. O hash desta task entra no `tasks.md` com a T8, porque um commit não carrega o próprio hash.

### Phase 3 — A página

#### T8: A página nova, de ponta a ponta
**What**:
- `fixos/page.tsx` lê por `obterTodoMes`, monta os `ItemDeFixo`, passa `?fixo=` e desenha `TodoMes`,
  sem `AreaEstreita` e sem diálogo;
- `ListaDeFixos` sai;
- os e2e antigos acompanham a regra nova;
- o e2e novo prova a composição.

**Where**:
- `src/app/(app)/[competencia]/fixos/page.tsx`
- `src/components/lista-de-fixos.tsx` e `src/components/lista-de-fixos.test.tsx` (saem)
- `e2e/todo-mes-colunas.spec.ts` (novo)
- `e2e/recorrencias.spec.ts`
- `e2e/editar-fixo.spec.ts`
- `e2e/trocar-categoria.spec.ts`
- `e2e/categorias.spec.ts`
- `e2e/importacao.spec.ts`

**Depends on**: T2, T7
**Reuses**: `obterTodoMes`, `TodoMes`, `valorNoMesExibido`, `corDaCategoria`, `versaoVigente`
**Requirement**: FIXCOL-01, FIXCOL-02, FIXCOL-03, FIXCOL-04, FIXCOL-05, FIXCOL-06, FIXCOL-07, FIXCOL-08, FIXCOL-09
**Done when**:
- [x] Abrindo Todo mês de março antes de qualquer outra tela, com os dados do design: "Fixo B" com R$ 50,00, "Entrada A" com R$ 1.000,00, e os totais R$ 185,00 e R$ 1.000,00 (FIXCOL-02 AC 3, FIXCOL-03 ACs 1 a 3, L-001)
- [x] Depois, Lançamentos de março mostra os mesmos R$ 185,00 no título do bloco "Fixos" (FIXCOL-03 AC 2, L-014)
- [x] "Entradas fixas" antes de "Saídas fixas", e as saídas na ordem D, A, B, C; os títulos das seções com "1 · R$ 1.000,00" e "4 · R$ 185,00" (FIXCOL-01 ACs 1 a 4, FIXCOL-03 AC 5)
- [x] Dentro de cada linha: A com "confirmado" e R$ 105,00; C com "Encerrado" e R$ 30,00; D com "—" e "Começa em Junho de 2026" (FIXCOL-01 ACs 8 e 9, FIXCOL-02 ACs 1, 2 e 4)
- [x] O painel de A mostra "confirmado · previa R$ 100,00" e as três vigências na ordem, com "vale em Março" na de fevereiro (FIXCOL-04 ACs 2 a 4)
- [x] Mudar o valor de B para R$ 60,00 a partir de abril: a vigência aparece no histórico e a linha de março segue em R$ 50,00 (FIXCOL-05 ACs 1 e 2)
- [x] Encerrar, a partir de março, um fixo próprio do teste: o painel diz que ele não aparece mais em Março de 2026, e a linha some (FIXCOL-05 AC 8)
- [x] Cadastrar "Fixo E" pelo painel: a linha aparece com o formulário ainda aberto (FIXCOL-06 ACs 2 e 3)
- [x] Abrir A põe `?fixo=<id de A>` na URL sem recarregar (um marcador posto em `window` antes do clique continua lá) e sem entrada nova no histórico (`history.length` igual); recarregar mostra A aberto; `?fixo=` inexistente deixa o painel fechado (FIXCOL-09 ACs 1 a 3)
- [x] Teclado: `Tab` até "Fixo B", `Enter`, o foco no título "Fixo B" do painel; `Escape`, o foco de volta no botão da linha e a URL sem `fixo` (FIXCOL-08 ACs 1 a 4)
- [x] Em 1.280 px:
  - o painel fica entre os totais e as seções, e sem nada aberto não há painel (FIXCOL-07 ACs 5 e 6);
  - abrir a última linha deixa o título do painel dentro da janela (FIXCOL-08 AC 5);
  - a linha aberta tem fundo computado diferente das outras (FIXCOL-04 AC 7);
  - com ponteiro fino, toda linha das duas tabelas mede até 48 px, percorrendo todas (FIXCOL-01 AC 10, L-030)
- [x] Em 400 px com A aberto:
  - não há rolagem lateral (FIXCOL-07 AC 9);
  - o valor fica na altura da descrição, a categoria abaixo dela, e os cabeçalhos das colunas não aparecem (FIXCOL-01 AC 11);
  - o botão da linha, "Fechar" e as ações medem ao menos 44 × 44 (FIXCOL-08 AC 6)
- [x] Os e2e antigos mudam como manda a tabela "Testes que mudam porque a spec mudou" do design e passam; toda ausência procurada usa `row`
- [x] `lista-de-fixos.tsx` e o teste dele saem; a suíte unitária cai exatamente os 25 testes desse arquivo, todos com equivalente nas T3 a T6
- [x] Gate e2e passa com `e2e/todo-mes-colunas.spec.ts` e os cinco e2e antigos desta task
**Tests**: e2e
**Gate**: e2e
**Commit**: `feat(fixos): a página de Todo mês em linhas, com o fixo aberto no painel` (`f09dbfd`; o plano dizia "Todo mês em linhas…"; o `check_commit.py` recusa descrição começando em maiúscula)
**Nota**:
- **A linha de até 48 px, medida no navegador.** Em 1.280 px toda linha media de 50 a 53 px. O botão da linha era `inline-flex` e ganhava a folga da letra na linha de texto da célula; com a descrição longa, a pill da categoria ainda quebrava em duas linhas. O botão virou `flex`, como o selo de Lançamentos, e a pill, o dia e o meio não quebram a partir de 768 px: quem cede largura é a descrição, e só a linha dela cresce. O botão ganhou `min-w-11`, porque "Fixo B" media 43,6 px de largura em 400 px (TOQUE-01). Mexe em `tabela-de-fixos.tsx`, fora da lista desta task, sem mudar teste dele.
- **O foco ao trocar de modo**, pedido no lote 2. "Mudar valor", "Encerrar" e "Editar" levam o foco ao título do modo novo; "Cancelar", "Voltar" e "Registrar" o devolvem ao título do painel. O botão de envio que se desabilita enquanto grava ("Gravando…") também devolve o foco ao título do painel. Sem isso, o Chrome tirava o foco para o `body`, e o `Escape` depois de salvar não fechava o painel (`editar-fixo.spec.ts`). Mexe em `painel-do-fixo.tsx` e `ciclo-do-fixo.tsx`, com nove testes novos em `painel-do-fixo.test.tsx`. Nenhum AC muda: é a regra do FIXCOL-08.
- **FIXCOL-08, AC 5.** O foco no título já traz o painel para dentro da janela, e o `scrollIntoView` não entrou. Com `focus({ preventScroll: true })`, o teste da última linha falha.
- **Medidas além do plano**, pelas lições do lote anterior: as tabelas dentro da coluna em 1.024, 1.280 e 1.440 px, com o fixo confirmado e as descrições longas (L-045, L-049); os alvos com ponteiro grosso em 1.280 px (L-044); e o limiar de 768 px dos dois lados (L-029, L-048).
- **Os e2e antigos** mudaram como manda o design. Além disso, a ausência em maio de `recorrencias.spec.ts` ganhou o aviso de mês vazio como âncora; o teste do valor vigente espera o "Registrar" terminar antes de navegar; e `editar-fixo.spec.ts` confere a nova posição da linha renomeada.
- **A suíte unitária** vai de 1.839 a 1.823 testes. Saem os 25 de `lista-de-fixos.test.tsx`, cada um com o equivalente da tabela do design, conferido linha a linha nas T3 a T6. Entram os 9 de foco.

#### T9: A coluna da direita a partir de 1.536 px
**What**: a grade de duas colunas em `TodoMes`, com o painel preso numa coluna de 384 px e a dica
quando nada está aberto; o laço do TRES-01 AC 8 deixa Todo mês.
**Where**:
- `src/components/todo-mes.tsx`
- `e2e/todo-mes-colunas.spec.ts`
- `e2e/visao-tres-colunas.spec.ts`

**Depends on**: T8
**Reuses**: a grade de `lancamentos/page.tsx:199-237`
**Requirement**: FIXCOL-07, FIXCOL-01
**Done when**:
- [x] Em 1.535 px, o painel aberto fica acima das seções e, sem nada aberto, não aparece; em 1.536 px, fica à direita e, sem nada aberto, mostra a dica (FIXCOL-07 ACs 1, 3, 5 e 6, L-029)
- [x] Em 1.535 px, título, totais, painel e seções medem até 1.024 px (FIXCOL-07 AC 5)
- [x] Em 1.536 e em 1.920 px, a coluna mede 384 px (± 1) e tem `border-left` computado de 1 px; título, totais e seções medem até 1.100 px e ficam centrados entre o menu e a coluna, com folgas que diferem em até 1 px (FIXCOL-07 ACs 1 e 4)
- [x] Em 1.920 × 480, rolando até o fim, o título do painel continua dentro da janela (FIXCOL-07 AC 2)
- [x] Em 1.536 e em 1.920 px com ponteiro fino, toda linha mede até 48 px (FIXCOL-01 AC 10)
- [x] O laço de TRES-01 AC 8 fica só com Categorias; os outros testes de `visao-tres-colunas.spec.ts` passam sem mudança
- [x] Se a medida pedir outra largura, o desvio fica registrado aqui e no design
- [x] Gate e2e passa com `e2e/todo-mes-colunas.spec.ts` e `e2e/visao-tres-colunas.spec.ts`
**Tests**: e2e
**Gate**: e2e
**Commit**: `feat(fixos): o painel numa coluna à direita a partir de 1.536 px` (`2afe4f9`)
**Nota**:
- **O painel sempre montado.** A coluna existe sempre, com a dica quando nada está aberto, e abaixo de 1.536 px leva `hidden 2xl:block`, como o design pedia. O jsdom não aplica o CSS. Por isso, os seis testes de `todo-mes.test.tsx` que esperavam o painel fora do DOM passam a esperar o painel em "Nenhum fixo aberto", numa coluna com `hidden 2xl:block`. Os dois testes do painel aberto ganham a coluna sem `hidden`. A prova de que nada aparece abaixo de 1.536 px fica no e2e, em 1.280 e 1.535 px. A regra que eles provam (FIXCOL-07, ACs 5 e 6) não muda: muda o jeito de esconder, que a T7 fazia desmontando.
- **A quarta linha da grade.** A partir de 1.536 px as linhas são `auto auto auto 1fr`, e a coluna ocupa as quatro. Sem a linha flexível, um painel mais alto que a lista, como a edição num mês de poucos fixos, abriria espaço entre o título, os totais e as seções.
- **O cartão na coluna** perde a borda e o fundo, fica preso no alto e rola por conta própria com `max-h-dvh`. Isso mora no `aside`, em `painel-do-fixo.tsx`, fora da lista de arquivos desta task.
- **Medidas**, sem desvio do design: em 1.536 px, a coluna mede 384 px e as seções, 864 px; em 1.920 px, a coluna mede 384 px e o título, 1.100 px, com 98 px de folga de cada lado. Em 1.535 px, tudo mede 976 px, dentro dos 1.024 px.
- **Além do plano:** o edge case "O formulário de edição é mais alto que a janela" ganhou um teste em 1.920 × 480, e o título preso ao rolar foi medido também em 1.536 × 480, colado no limiar (L-029).

#### T10: O formulário de fixo pela largura do contêiner
**What**: `FormRecorrencia` com `@container` e `@md:` no lugar de `sm:`, e o e2e que mede o
formulário na coluna e fora dela.
**Where**:
- `src/components/form-recorrencia.tsx`
- `e2e/todo-mes-colunas.spec.ts`

**Depends on**: T9
**Reuses**: `FormRecorrencia`
**Requirement**: FIXCOL-07
**Done when**:
- [x] Na coluna, em 1.536 e em 1.920 px, no cadastro e na edição, "Dia de vencimento" fica abaixo de "De quanto costuma ser", "Termina em (opcional)" abaixo de "Começa em" e "Categoria" abaixo do meio (FIXCOL-07 AC 7)
- [x] Em 1.280 px, com o painel na largura toda, os três pares ficam lado a lado (FIXCOL-07 AC 8)
- [x] Em duas janelas escolhidas para o formulário medir de um lado e do outro de 448 px, o teste mede a largura e confere empilhado abaixo de 448 e lado a lado a partir de 448 (L-029)
- [x] `form-recorrencia.test.tsx` passa sem mudança
- [x] Gate e2e passa com `e2e/todo-mes-colunas.spec.ts`
**Tests**: e2e
**Gate**: e2e
**Commit**: `feat(fixos): o formulário de fixo pela largura do contêiner`
**Nota**: as janelas do limiar são 777 e 778 px, em que o formulário mede 447 e 448 px; o plano supunha um menu de 241 px, e ele mede 240. O teste mede a largura antes de conferir os pares, para o limiar continuar colado se o respiro em volta mudar. Com `@sm` no lugar de `@md`, o teste do limiar falha. O cadastro e a edição foram medidos também em 1.280 px, e não só na coluna.

### Phase 4 — Fechamento

#### T11: A decisão registrada
**What**:
- o AD-021 no `STATE.md`, com o texto do design;
- as notas de substituição em EDF-01, EDF-06, AVUL-05 AC 8, FIXO-07 AC 1 e TRES-01 AC 8;
- `docs/design.md` ("Largura do conteúdo" e "Cor por categoria");
- os comentários que deixam de ser verdade: `area-estreita.tsx`, `dialogo-de-cadastro.tsx`,
  `form-recorrencia.tsx`, e o comentário e o nome do teste de `form-recorrencia.test.tsx` que falam
  do diálogo, sem mudar a assertion.

**Where**:
- `.specs/STATE.md`
- `.specs/features/{editar-fixos,lancamento-avulso,visao-tres-colunas}/spec.md`
- `docs/design.md`
- `src/components/{area-estreita,dialogo-de-cadastro,form-recorrencia}.tsx`
- `src/components/form-recorrencia.test.tsx`

**Depends on**: T10
**Reuses**: nenhuma
**Requirement**: FIXCOL-04, FIXCOL-05, FIXCOL-06, FIXCOL-07
**Done when**:
- [ ] AD-021 registrado, com o que ele revê (AD-014 e AD-019 em Todo mês)
- [ ] Cada critério substituído aponta para o FIXCOL que o substitui
- [ ] `pnpm verify` e o `pnpm test:e2e` inteiro passam, com as contagens registradas
**Tests**: none
**Gate**: build
**Commit**: `docs(todo-mes-colunas): registrar Todo mês em linhas`

---

## Validação antes da aprovação

### Granularidade

| Task | Escopo | Status |
| --- | --- | --- |
| T1 | 1 função pura (+ export) | ✅ |
| T2 | 1 caso de uso | ✅ |
| T3 | 1 componente | ✅ |
| T4 | 1 componente | ✅ |
| T5 | 1 componente, movido | ✅ |
| T6 | 1 componente | ✅ |
| T7 | 1 componente | ✅ |
| T8 | 1 página, com a saída do componente velho e os e2e que a troca quebra | ⚠️ grande, mas coeso: a página não troca sem os e2e que dependem dela, como a T4 de Lançamentos |
| T9 | 1 componente (a grade) e o e2e dela | ✅ |
| T10 | 1 componente e o e2e dele | ✅ |
| T11 | Docs | ✅ |

### Diagrama × `Depends on`

| Task | Depends on (corpo) | Diagrama | Status |
| --- | --- | --- | --- |
| T1 | nenhuma | início da fase 1 | ✅ |
| T2 | T1 | T1 -> T2 | ✅ |
| T3 | nenhuma | início da fase 2 | ✅ |
| T4 | T3 | T3 -> T4 | ✅ |
| T5 | nenhuma | T5 -> T6 (origem) | ✅ |
| T6 | T4, T5 | T4 -> T6, T5 -> T6 | ✅ |
| T7 | T3, T6 | T3 -> T7, T6 -> T7 | ✅ |
| T8 | T2, T7 (fases anteriores) | início da fase 3 | ✅ |
| T9 | T8 | T8 -> T9 | ✅ |
| T10 | T9 | T9 -> T10 | ✅ |
| T11 | T10 (fase anterior) | fase 4 | ✅ |

### Testes × matriz

| Task | Camada | Matriz pede | Task diz | Status |
| --- | --- | --- | --- | --- |
| T1 | Domínio | unit | unit | ✅ |
| T2 | Aplicação | unit | unit | ✅ |
| T3 a T7 | Componentes | componentes | componentes | ✅ |
| T8 | Página e fluxo | e2e | e2e | ✅ |
| T9 | Componente de layout + fluxo | e2e (layout se mede no navegador) | e2e | ✅ |
| T10 | Componente de layout + fluxo | e2e (layout se mede no navegador) | e2e | ✅ |
| T11 | Docs | none | none | ✅ |
