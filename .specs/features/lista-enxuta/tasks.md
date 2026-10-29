# Lista de Lançamentos enxuta — Tasks

**Spec**: `.specs/features/lista-enxuta/spec.md`
**Design**: inline, na seção "Design" abaixo (sem `design.md`)
**Status**: Verified, PASS na rodada 2 de `validation.md` (T1–T9 concluídas em 2026-10-29; FAIL na rodada 1 de `validation.md`, com F1–F4 concluídas em 2026-10-29; plano aprovado pelo dono em 2026-10-29; branch `feat/lista-enxuta`, em worktree, a partir do `main` em `96778b3`; 2 lotes: T1–T5 e T6–T9, mais F1–F4)
**Total**: 13 tasks em 6 fases (T1–T9 e as correções F1–F4)

---

## Execution Protocol (MANDATORY -- do not skip)

Implementar com a skill `tlc-spec-driven`, ativada pelo nome. Para cada task: pré-implementação →
testes primeiro, derivados dos ACs do `spec.md` → implementação → gate → Test Adequacy Review
(evidence-or-zero, `file:line` + assertion) → marcar a task em `tasks.md` e a traceability no
`spec.md` → **um** commit atômico validado por `check_commit.py`.

Proibições: commitar antes do gate · enfraquecer, pular ou apagar teste · agrupar tasks · "já que
estou aqui" · dado real em fixture ou commit (AD-009).

**Blast radius:** aprovação autoriza implementação e commits **locais**. `git push` e qualquer
operação remota exigem autorização separada.

---

## Design

**O estado continua na URL.** Os chips gravam `categoriaId` pelo mesmo `navegarCom` de
`src/components/filtros-de-lancamentos.tsx`, e a barra compacta lê e escreve os mesmos parâmetros.
Não existe um segundo estado de filtro: cartão e barra mostram a mesma URL.

**Os totais dos chips são os da Visão geral.** A página de Lançamentos chama
`resumoPorCategoria(visao.lancamentos, competencia, totalGastos)`
(`src/domain/mes/resumo-por-categoria.ts:90`), como `src/app/(app)/[competencia]/page.tsx` já faz,
e passa ao cartão de filtros `{ id, nome, gasto }` por categoria. `categoriaId` nulo vira
`sem-categoria`, como a Visão geral já faz (`page.tsx:172`).

**`sem-categoria` no filtro.** `filtrarLancamentos` passa a tratar `categoriaId === "sem-categoria"`
como "lançamento sem categoria". A constante mora num lugar só e é usada pela página, pelos chips e
pelo gráfico.

**Bloco recolhível.** O cabeçalho do bloco em `tabela-lancamentos.tsx` vira um componente cliente
pequeno (`CabecalhoDeBloco`) com o botão de recolher, ou o bloco inteiro vira um disclosure, a
critério do implementador, desde que a tabela continue renderizada no servidor. O estado inicial
vem da página, que lê o cookie `blocos-recolhidos` (lista separada por vírgula com as chaves
`ENTRADAS`, `FIXOS`, `CARTAO` e `AVULSOS`, que são as de `BlocoDoMes`). O clique alterna o
estado na tela e grava o cookie no cliente (`document.cookie`, `path=/`, um ano).

> **Desvio do lote 1, corrigido na T9.** O plano dizia `GASTOS_DO_MES`, mas a chave de
> `BlocoDoMes` para "Gastos do Mês" é `AVULSOS`, e é ela que a T4 grava no cookie
> (`src/lib/blocos-recolhidos.ts`). O texto acima foi corrigido; o comportamento não mudou.

**Barra compacta.** `BarraDeFiltrosCompacta` é cliente, observa o cartão de filtros por
`IntersectionObserver` e aparece `fixed` no topo quando ele sai da tela. A altura dela vira
`scroll-padding-top` no `html`, em `globals.css`.

**Parcela sob a descrição.** Na célula de descrição do bloco Cartão, uma segunda linha
`text-[13px] text-ink-muted` com `2/4 · (faltam 2 depois desta)`. Os textos de PARC-08 não mudam.
A coluna Parcela e o `comParcela` saem.

### Interfaces

```ts
// src/application/mes/filtrar-lancamentos.ts
export const SEM_CATEGORIA = "sem-categoria";

// src/components/chips-de-categoria.tsx
export interface TotalDeCategoria { readonly id: string; readonly nome: string; readonly gasto: number }
export function ChipsDeCategoria(props: {
  categorias: ReadonlyArray<TotalDeCategoria>; // já em ordem decrescente
  ativa: string | null;
  aoEscolher(id: string | null): void;
}): JSX.Element;

// src/components/barra-de-filtros-compacta.tsx
export function BarraDeFiltrosCompacta(props: {
  alvo: string; // id do cartão de filtros observado
  ativos: ReadonlyArray<{ chave: string; rotulo: string }>; // parâmetro da URL e texto do chip
}): JSX.Element;
```

---

## Global Constraints

- Centavos inteiros (AD-001); formatação só por `formatarBRL` (`src/lib/formatar.ts`).
- Mobile em 400 px sem rolagem horizontal; alvos de 44×44 no toque (UI-03).
- Chips são `<button aria-pressed>`; coleção quebra linha (diretriz "Chip Collection Reflow").
- Foco nunca coberto pela barra fixa (WCAG 2.4.11).
- **Gate de toda task inclui `pnpm typecheck`, encadeado com `&&`** (lição L-016).
- Regra aplicada na página precisa de e2e que a exercite (lição L-001), e componente que a página
  monta precisa de prova da composição (lição L-014): T8 prova os totais vindos da página, o cookie
  lido no servidor e a tabela na margem.

## Review Focus

1. **Total do chip igual ao da Visão geral**, inclusive com outro filtro ativo. Teste em T3 e T8.
2. **"+N" revela, não corta.** Teste em T2.
3. **Cookie lido no servidor**: bloco recolhido sem piscar aberto. Teste em T4 e T8.
4. **Barra some quando o cartão volta.** Teste em T5.
5. **Tabela do Cartão dentro da margem a 1024, 1280 e 1440.** Teste em T8.

---

## Test Coverage Matrix

| Camada | Tipo | Expectativa | Local | Comando |
| --- | --- | --- | --- | --- |
| `src/application/**` | unit | Todos os ramos | `src/application/**/*.test.ts` | `pnpm test:unit` |
| Componentes | componentes | Chips, cabeçalho de bloco, barra, tabela, gráfico | `src/components/**/*.test.tsx` | `pnpm test:unit` |
| Fluxo | e2e | Chips, recolher e recarregar, barra ao rolar, tabela na margem, link da Visão geral | `e2e/*.spec.ts` | `pnpm test:e2e` |
| Composição de página, docs | none | — | — | — |

## Gate Check Commands

| Gate | Comando |
| --- | --- |
| `quick` | `pnpm test:unit && pnpm typecheck` |
| `build` | `pnpm verify` |
| `e2e` | `pnpm typecheck && pnpm exec playwright test e2e/lista-enxuta.spec.ts` |

---

## Execution Plan

### Phase 0 — Filtro

```
T1
```

### Phase 1 — Chips de categoria

```
T1 -> T2
T2 -> T3
```

### Phase 2 — Blocos e barra

```
T3 -> T4
T3 -> T5
```

### Phase 3 — Tabela e Visão geral

```
T4 -> T6
T1 -> T7
```

### Phase 4 — Ponta a ponta e fechamento

```
T6 -> T8
T7 -> T8
T5 -> T8
T8 -> T9
```

### Phase 5 — Correções da verificação (rodada 1)

```
T8 -> F1
T6 -> F2
T8 -> F3
F1 -> F4
F2 -> F4
F3 -> F4
```

Cada uma fecha uma lacuna de `validation.md` (rodada 1, FAIL). A lacuna 2, o possível dado real
(AD-009), foi resolvida pelo orquestrador antes desta rodada: o ramo local foi reescrito e os
exemplos da spec, desta lista, dos comentários e da fixture dos chips viraram valores aritméticos.
A lacuna 5, a parcela em duas linhas, é decisão do dono e fica fora desta rodada.

---

## Task Breakdown

### Phase 0 — Filtro

#### T1: Filtrar os lançamentos sem categoria
**What**: `SEM_CATEGORIA = "sem-categoria"` e o filtro que o reconhece.
**Where**: `src/application/mes/filtrar-lancamentos.ts` (+ teste)
**Depends on**: nenhuma
**Reuses**: `filtrarLancamentos`
**Requirement**: LST-01
**Done when**:
- [x] `categoriaId: "sem-categoria"` deixa só os lançamentos com `categoriaId` nulo (LST-01 AC 9)
- [x] Um id de categoria continua filtrando por ele, e sem `categoriaId` nada muda
**Tests**: unit
**Gate**: quick
**Commit**: `feat(lancamentos): filtrar os lançamentos sem categoria`

### Phase 1 — Chips de categoria

#### T2: Chips de categoria com o total
**What**: `ChipsDeCategoria`.
**Where**: `src/components/chips-de-categoria.tsx` (+ teste)
**Depends on**: T1
**Reuses**: `formatarBRL`; tokens de `ui.tsx`
**Requirement**: LST-01
**Done when**:
- [x] Um botão por categoria, "Nome · R$ 1.234,56", na ordem recebida (LST-01 AC 1)
- [x] `aria-pressed="true"` só no chip ativo (LST-01 AC 7)
- [x] Tocar num chip chama `aoEscolher(id)`; tocar no ativo chama `aoEscolher(null)` (LST-01 AC 5, 6)
- [x] Com 9 categorias: 6 visíveis e "+3 categorias" com `aria-expanded="false"`; acionado, as 9 visíveis e `aria-expanded="true"` (LST-01 AC 4)
- [x] Com 6 ou menos, nenhum "+N"; sem categorias, nada renderiza
- [x] A coleção usa `flex-wrap` e nenhum chip tem altura ou largura cortada por `overflow-hidden`
**Tests**: componentes
**Gate**: quick + `pnpm lint`
**Commit**: `feat(lancamentos): chips de categoria com o total do mês`

#### T3: Cartão de filtros com os chips
**What**: os chips no lugar do select "Categoria"; a página calcula os totais e anuncia a contagem.
**Where**: `src/components/filtros-de-lancamentos.tsx` (+ teste), `src/app/(app)/[competencia]/lancamentos/page.tsx`
**Depends on**: T2
**Reuses**: `navegarCom`; `resumoPorCategoria`; `SEM_CATEGORIA`
**Requirement**: LST-01
**Done when**:
- [x] O select "Categoria" sai; Meio, Pessoa e Situação ficam (LST-01 AC 1)
- [x] Escolher um chip grava `categoriaId` na URL e mantém busca, meio, pessoa e situação (LST-01 AC 5)
- [x] A página passa os totais de `resumoPorCategoria`, com `sem-categoria` para o grupo nulo e o nome "Sem categoria" (LST-01 AC 2, 3)
- [x] A frase da contagem ("N lançamentos. Total R$ X") fica numa região `role="status"` (LST-01 AC 8)
- [x] Testes atuais do cartão de filtros que usam o select de categoria passam a usar o chip, sem apagar assertion
**Tests**: componentes
**Gate**: quick + `pnpm lint`
**Commit**: `feat(lancamentos): filtrar por categoria pelos chips`

### Phase 2 — Blocos e barra

#### T4: Blocos que recolhem, com resumo e cookie
**What**: cabeçalho de bloco com resumo e botão de recolher; estado no cookie lido no servidor.
**Where**: `src/components/tabela-lancamentos.tsx` (+ teste; e `src/components/cabecalho-de-bloco.tsx` se o cabeçalho sair), `src/app/(app)/[competencia]/lancamentos/page.tsx`
**Depends on**: T3
**Reuses**: `formatarBRL`; `situacaoDe` para "a pagar"
**Requirement**: LST-02
**Done when**:
- [x] Cabeçalho "Fixos" com "12 · R$ 1.200,00 · 8 a pagar" a partir das linhas recebidas (LST-02 AC 1)
- [x] Botão com `aria-expanded` e `aria-controls`; acionado, as linhas somem e voltam (LST-02 AC 2)
- [x] O clique grava o cookie `blocos-recolhidos` com as chaves dos blocos recolhidos (LST-02 AC 3)
- [x] Recebendo `recolhidos={["FIXOS"]}`, Fixos renderiza fechado desde o primeiro render (LST-02 AC 4)
- [x] Sem cookie, todos abertos; chave desconhecida no cookie é ignorada (LST-02 AC 5, Edge Case)
- [x] Bloco sem linha depois do filtro mostra "0" e a frase de bloco vazio
**Tests**: componentes
**Gate**: quick + `pnpm lint`
**Commit**: `feat(lancamentos): recolher blocos e lembrar no cookie`

#### T5: Barra compacta de filtros ao rolar
**What**: `BarraDeFiltrosCompacta` e o `scroll-padding-top`.
**Where**: `src/components/barra-de-filtros-compacta.tsx` (+ teste), `src/app/globals.css`, `src/app/(app)/[competencia]/lancamentos/page.tsx`
**Depends on**: T3
**Reuses**: o debounce e `navegarCom` do cartão de filtros (extrair para um hook se for o caso)
**Requirement**: LST-03
**Done when**:
- [x] Com o cartão fora da tela (IntersectionObserver simulado), a barra aparece com busca, filtros ativos e "Filtros"; com o cartão visível, some (LST-03 AC 1, 2)
- [x] Digitar na busca da barra grava `busca` na URL depois de 250 ms, com relógio falso (LST-03 AC 3)
- [x] Cada filtro ativo é um botão "Casa ×" com nome acessível "Tirar o filtro Casa", que tira só ele (LST-03 AC 4)
- [x] "Filtros" rola até o cartão e foca o primeiro controle dele (LST-03 AC 5)
- [x] `scroll-padding-top` em `globals.css` com a altura da barra (LST-03 AC 6)
- [x] Com 3 filtros ativos em 400 px, 2 aparecem e "+1" (LST-03 AC 7)
**Tests**: componentes
**Gate**: quick + `pnpm lint`
**Commit**: `feat(lancamentos): barra compacta de filtros ao rolar`

### Phase 3 — Tabela e Visão geral

#### T6: Parcela sob a descrição e tabela na margem
**What**: a parcela sai da coluna e vai sob a descrição; seletor com largura fixa e densidade por ponteiro.
**Where**: `src/components/tabela-lancamentos.tsx` (+ teste), `src/components/seletor-de-categoria.tsx` (+ teste), `.specs/features/lancamento-avulso/spec.md`
**Depends on**: T4
**Reuses**: `identificarParcela`; textos de PARC-08
**Requirement**: LST-05
**Done when**:
- [x] No Cartão, sob "Compra B", a linha "2/4 · (faltam 2 depois desta)"; na última, "· (última)" (LST-05 AC 1)
- [x] Nenhum bloco tem `columnheader` "Parcela"; os testes de `tabela-lancamentos.test.tsx` que afirmavam a coluna passam a afirmar LST-05, sem apagar assertion (LST-05 AC 2)
- [x] O BLOCO-01 AC 7 em `lancamento-avulso/spec.md` fica marcado como substituído por LST-05, com a decisão do dono
- [x] O seletor tem largura fixa a partir de `md` e `title` com o nome da categoria escolhida (LST-05 AC 5)
- [x] Classe de 36 px sob `pointer: fine` e 44 px fora dele (LST-05 AC 4)
- [x] Ajuste achado pela T8: abaixo de `md` o seletor tem `w-full`. Só com `max-w-full` a tabela media a opção mais longa, e uma categoria de nome comprido criava 5 px de rolagem horizontal em 400 px (UI-03; LST-03 AC 7). Commit próprio, antes do da T8
**Tests**: componentes
**Gate**: quick + `pnpm lint`
**Commit**: `fix(lancamentos): parcela sob a descrição e tabela na margem`

#### T7: Visão geral leva à lista
**What**: cada barra de "Gastos por categoria" vira link.
**Where**: `src/components/grafico-categorias.tsx` (+ teste), `src/app/(app)/[competencia]/page.tsx`
**Depends on**: T1
**Reuses**: `FatiaDeCategoria.id`; `SEM_CATEGORIA`
**Requirement**: LST-04
**Done when**:
- [x] Cada fatia é um link para `/<competencia>/lancamentos?categoriaId=<id>` (LST-04 AC 1)
- [x] "Sem categoria" leva a `categoriaId=sem-categoria` (LST-04 AC 2)
- [x] O nome acessível do link contém nome, valor e porcentagem (LST-04 AC 3)
**Tests**: componentes
**Gate**: quick + `pnpm lint`
**Commit**: `feat(painel): abrir a lista filtrada pela categoria do gráfico`

### Phase 4 — Ponta a ponta e fechamento

#### T8: A lista enxuta de ponta a ponta
**What**: e2e do fluxo.
**Where**: `e2e/lista-enxuta.spec.ts`
**Depends on**: T5, T6, T7
**Reuses**: `limparDados`, `semearCadastroBase`, `entrar` e os helpers de cadastro de `e2e/trocar-categoria.spec.ts`
**Requirement**: LST-01 a LST-05
**Done when**:
- [x] Chip filtra a lista, e o total dele é igual ao da barra da mesma categoria na Visão geral (LST-01 AC 1, 2, 5)
- [x] "+N categorias" revela as outras quando há mais de 6 (LST-01 AC 4)
- [x] Recolher Fixos, recarregar, e Fixos continua recolhido com o resumo (LST-02 AC 1–4)
- [x] Rolar até o fim mostra a barra compacta com o filtro ativo; o "×" tira o filtro; voltar ao topo esconde a barra (LST-03 AC 1, 2, 4)
- [x] A 1024, 1280 e 1440 px, a tabela do Cartão termina dentro da coluna de conteúdo (`boundingBox`), e "(faltam N depois desta)" está sob a descrição (LST-05 AC 1, 3)
- [x] Tocar na barra de uma categoria na Visão geral abre a lista com o chip dela ativo (LST-04 AC 1)
- [x] A suíte e2e inteira passa, inclusive as medições de 400 px e de 44×44
**Tests**: e2e
**Gate**: e2e
**Commit**: `test(e2e): a lista enxuta de ponta a ponta`

#### T9: Fechar a fatia
**What**: roadmap e traceability.
**Where**: `docs/roadmap.md` (+ `spec.md`)
**Depends on**: T8
**Requirement**: LST-01 a LST-05
**Done when**:
- [x] Roadmap com a lista enxuta em "Pronto"; o item "A tabela espalha as colunas por igual" revisto à luz do LST-05
- [x] Traceability com cada requisito implementado
**Tests**: none
**Gate**: build
**Commit**: `docs(lancamentos): fechar a fatia da lista enxuta`

### Phase 5 — Correções da verificação (rodada 1)

#### F1: Espaço entre o nome e o total do chip
**What**: O chip é `inline-flex` e o botão tinha três filhos soltos: o nome, o texto `" · "` e o `<span>` do valor. Os dois nós de texto viravam um item anônimo de flex, o espaço do fim dele era aparado e o valor colava no "·": a tela mostrava "Nome ·R$ X", com 0 px de folga nos seis chips. O `textContent` e o nome acessível continuavam "Nome · R$ X", e é isso que os testes liam (lacuna 1).
**Where**: `src/components/chips-de-categoria.tsx`, `e2e/lista-enxuta.spec.ts` (+ `spec.md`)
**Depends on**: T8
**Reuses**: `chips()` do e2e
**Requirement**: LST-01
**Done when**:
- [x] Nome, separador e valor num único `<span>` dentro do botão, com o valor ainda em `span.tabular` (LST-01 AC 1)
- [x] No e2e, em cada um dos seis chips visíveis, a folga entre o fim do glifo "·" (um `Range` sobre o nó de texto) e o começo de `.tabular` é de pelo menos 2 px (LST-01 AC 1)
- [x] Com o botão de antes, o e2e falha no primeiro chip com `Expected: >= 2`, `Received: 0`; com o `<span>` único, passa. Os testes de unidade dos chips seguem verdes, porque `textContent` e nome acessível não mudam
**Tests**: e2e
**Gate**: quick + `pnpm lint` + e2e
**Commit**: `fix(lancamentos): espaço entre o nome e o total do chip`

#### F2: A penúltima parcela ainda diz quantas faltam
**What**: Os testes da parcela sob a descrição só usavam `restantes` 0 e 2. Trocar `parcela.restantes === 0` por `<= 1` em `tabela-lancamentos.tsx` (mutante U15b) mantinha a suíte unitária verde, e a penúltima parcela passava a dizer "(última)" (lacuna 3).
**Where**: `src/components/tabela-lancamentos.test.tsx` (+ `spec.md`)
**Depends on**: T6
**Reuses**: `parcelaDaCompraB`, `linhaDaParcela`, `montar` do bloco "parcela sob a descrição"
**Requirement**: LST-05
**Done when**:
- [x] Com `parcelaDaCompraB(3, 1)`, a segunda linha da célula de "Compra B" é exatamente "3/4 · (faltam 1 depois desta)" (LST-05 AC 1)
- [x] U15b falha só o caso novo, com `expected '3/4 · (última)' to be '3/4 · (faltam 1 depois desta)'`; desfeito, 48 de 48 no arquivo
**Tests**: componentes
**Gate**: quick + `pnpm lint`
**Commit**: `test(lancamentos): penúltima parcela ainda diz quantas faltam`

#### F3: A margem medida em todas as tabelas da lista
**What**: O LST-05 AC 3 diz "nenhuma tabela da lista", mas o e2e media só a do Cartão. Com a tabela de Fixos 16 px mais larga que a coluna (mutante E5), ele passava nas três larguras (lacuna 4). O seletor da linha só tinha prova de classe para os 36 px do ponteiro fino e a largura fixa de `md` (lacuna 7): tirar `md:w-44` e manter `w-full` (E4a) passava no e2e.
**Where**: `e2e/lista-enxuta.spec.ts` (+ `spec.md`)
**Depends on**: T8
**Reuses**: `cartaoDeFiltros`, `transbordoHorizontal`, `FIXOS`, `GASTOS`
**Requirement**: LST-05
**Done when**:
- [x] A 1024, 1280 e 1440 px, cada `getByRole("table")` da lista, as três de março (Fixos, Cartão de Crédito e Gastos do Mês), começa e termina dentro da coluna de conteúdo (LST-05 AC 3)
- [x] Com ponteiro fino, confirmado por `matchMedia("(pointer: fine)")`, os 19 seletores da lista têm 36 px de altura (`pointer-fine:min-h-9`) e 176 px de largura (`md:w-44`) nas três larguras (LST-05 ACs 4 e 5)
- [x] E5 falha em "fim da tabela Fixos" nas três larguras: 1016 contra 1000,5, 1144 contra 1128,5 e 1224 contra 1208,5. Sem `md:w-44` (E4a), falha com largura 228,25; sem `pointer-fine:min-h-9` (U32), com altura 44
**Tests**: e2e
**Gate**: quick + `pnpm lint` + e2e
**Commit**: `test(e2e): medir a margem de todas as tabelas da lista`

#### F4: Só os gastos sem categoria no filtro
**What**: O LST-01 AC 9 dizia "só os lançamentos sem categoria" e não dizia se a receita sem categoria entra. O código a tira, coerente com TRC-01, que mostra a entrada como "Receita", e com o total do chip, que não soma receita (lacuna 6). A traceability passa a registrar o resultado da rodada 1 e as correções.
**Where**: `.specs/features/lista-enxuta/spec.md`
**Depends on**: F1, F2, F3
**Reuses**: a proposta de traceability de `validation.md`
**Requirement**: LST-01 a LST-05
**Done when**:
- [x] LST-01 AC 9: "só os gastos sem categoria", com a receita sem categoria de fora, pelo TRC-01 e pelo total do chip. Os testes já afirmam isso: `src/application/mes/filtrar-lancamentos.test.ts:147` ("deixa só os lançamentos com categoria nula") e `:157` ("não traz a receita, que a lista mostra como Receita")
- [x] Traceability: LST-02, LST-03 e LST-04 verificados na rodada 1; LST-01 e LST-05 com o motivo do Needs Fix e as tasks que os corrigem; todos aguardando o Verifier na rodada 2
- [x] `validate_spec.py` com 0 erros
**Tests**: none
**Gate**: quick + `pnpm lint`
**Commit**: `docs(lancamentos): só os gastos sem categoria no filtro`

---

## Task Granularity Check

| Task | Escopo | Status |
| --- | --- | --- |
| T1 | 1 constante + 1 ramo de filtro | ✅ |
| T2 | 1 componente | ✅ |
| T3 | 1 componente + a página que o alimenta | ⚠️ coeso: os totais só existem se a página os passa |
| T4 | 1 componente + a leitura do cookie na página | ⚠️ coeso: o estado inicial vem do servidor |
| T5 | 1 componente + 1 regra de CSS + a montagem | ⚠️ coeso: a barra exige o espaço reservado |
| T6 | tabela + seletor + 1 AC de outra spec | ⚠️ coeso: a margem depende das duas larguras |
| T7 | 1 componente + a página que passa a competência | ✅ |
| T8, T9 | e2e; documentação | ✅ |
| F1 | 1 componente + 1 medição no e2e | ⚠️ coeso: a medição prova a correção, e só o navegador a vê |
| F2 | 1 caso de teste | ✅ |
| F3 | 1 caso de teste estendido | ✅ |
| F4 | 1 AC reescrito + traceability | ✅ |

## Diagram-Definition Cross-Check

| Task | Depends On | Diagrama | Status |
| --- | --- | --- | --- |
| T1 | — | — | ✅ |
| T2 | T1 | T1→T2 | ✅ |
| T3 | T2 | T2→T3 | ✅ |
| T4 | T3 | T3→T4 | ✅ |
| T5 | T3 | T3→T5 | ✅ |
| T6 | T4 | T4→T6 | ✅ |
| T7 | T1 | T1→T7 | ✅ |
| T8 | T5, T6, T7 | T5→T8, T6→T8, T7→T8 | ✅ |
| T9 | T8 | T8→T9 | ✅ |
| F1 | T8 | T8→F1 | ✅ |
| F2 | T6 | T6→F2 | ✅ |
| F3 | T8 | T8→F3 | ✅ |
| F4 | F1, F2, F3 | F1→F4, F2→F4, F3→F4 | ✅ |

`validate_tasks.py` só reconhece IDs `T<n>`. Uma cópia com as tasks `F<n>` trocadas por `T10<n>`
passa com 0 erros; os avisos novos são os vários arquivos no `Where` e o `Tests: none` da F4. O
validador atribui cada task ao último título de fase que vê, por isso o Task Breakdown repete os
títulos das fases.

## Test Co-location Validation

| Task | Camada | Matriz exige | Task diz | Status |
| --- | --- | --- | --- | --- |
| T1 | aplicação | unit | unit | ✅ |
| T2–T7 | componentes | componentes | componentes | ✅ |
| T8 | fluxo | e2e | e2e | ✅ |
| T9 | docs | none | none | ✅ |
| F1 | componentes + fluxo | componentes, e2e | e2e | ✅ |
| F2 | componentes | componentes | componentes | ✅ |
| F3 | fluxo | e2e | e2e | ✅ |
| F4 | docs | none | none | ✅ |
