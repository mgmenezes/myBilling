# Cor por categoria — Tasks

**Spec**: `.specs/features/cor-por-categoria/spec.md`
**Design**: inline, na seção "Design" abaixo (sem `design.md`)
**Status**: Draft (plano aprovado pelo dono em 2026-10-29; branch `feat/cor-por-categoria`, em worktree, a partir do `main` em `8419c29`; 2 lotes: T1–T7 e T8–T12)
**Total**: 12 tasks em 5 fases

---

## Execution Protocol (MANDATORY -- do not skip)

Implementar com a skill `tlc-spec-driven`, ativada pelo nome. Para cada task: pré-implementação →
testes primeiro, derivados dos ACs do `spec.md` → implementação → gate → Test Adequacy Review
(evidence-or-zero, `file:line` + assertion) → marcar a task em `tasks.md` e a traceability no
`spec.md` → **um** commit atômico validado por `check_commit.py`.

Proibições: commitar antes do gate · enfraquecer, pular ou apagar teste · agrupar tasks · "já que
estou aqui" · dado real em fixture ou commit (AD-009).

**Blast radius:** aprovação autoriza implementação e commits **locais**. `git push`, aplicar a
migration no Neon e qualquer operação remota exigem autorização separada.

---

## Design

**A cor é um nome, não um hex.** O banco guarda `verde`, `azul`…; o hex mora só nos tokens de
`src/app/globals.css`. Remedir ou trocar um tom não pede migração.

**Nula por padrão, automática no domínio.** `categoria.cor` é `text` nulável com `CHECK` da lista
fechada. Ninguém que cria categoria (inline, importação, seed, testes) muda. Quem exibe chama
`corDaCategoria({ nome, cor })`, que devolve a escolhida ou `corAutomatica(nome)`. A automática é
um hash determinístico do nome normalizado (`normalizarNome` de `src/domain/importacao/celula.ts`
mais remoção de acentos por `normalize("NFD")`), módulo 10: a mesma categoria tem a mesma cor no
seed, no e2e e em produção. Enum Postgres foi descartado: valor de enum não se remove, e a paleta é
a parte que mais deve mudar.

**Classes escritas por extenso.** O Tailwind v4 só gera a classe que lê no fonte. Um mapa
`CLASSES_DA_COR` em `src/components/cor-de-categoria.ts` tem, por cor, a string inteira da pill
(`bg-cat-verde-fundo text-cat-verde-texto`) e da barra (`bg-cat-verde-barra`). Nunca montar
`` `bg-cat-${cor}-fundo` ``.

**O seletor compõe com o chevron.** A regra global de `select` define só `background-image`,
`-repeat`, `-position` e `-size`; `bg-cat-*-fundo` define só `background-color`. Ninguém usa o
shorthand `background:` no select.

**Renomear congela a cor.** `renomearCategoria` grava `cor ?? corAutomatica(nomeAntigo)` junto do
nome novo, numa escrita só.

**Revalidação.** As actions da tela revalidam `/[competencia]`, `/[competencia]/lancamentos`,
`/[competencia]/fixos` e `/[competencia]/cadastros/categorias`, todas `"page"`.

### Interfaces

```ts
// src/domain/categoria/cor-da-categoria.ts
export const CORES_DE_CATEGORIA = ["vermelho", "laranja", "ambar", "verde", "verde-agua",
  "ciano", "azul", "roxo", "rosa", "marrom"] as const;
export type CorDeCategoria = (typeof CORES_DE_CATEGORIA)[number];
export function ehCorDeCategoria(valor: string): valor is CorDeCategoria;
export function corAutomatica(nome: string): CorDeCategoria;
export function corDaCategoria(c: { nome: string; cor: CorDeCategoria | null }): CorDeCategoria;

// src/components/cor-de-categoria.ts
export const CLASSES_DA_COR: Record<CorDeCategoria, { pill: string; barra: string }>;

// src/components/ui.tsx
export function Chip(props: { children: ReactNode; tom?: "neutro" | "positivo" | "negativo"; cor?: CorDeCategoria }): JSX.Element;

// src/app/actions/categorias.ts
export async function trocarCorDaCategoria(payload: unknown): Promise<ResultadoAction<...>>;
export async function renomearCategoria(payload: unknown): Promise<ResultadoAction<...>>;
```

---

## Global Constraints

- `src/domain` puro (AD-006): o arquivo novo não importa `zod`, `react` nem infraestrutura, e tem
  100% de branches.
- Migration gerada por `pnpm db:generate` e revisada à mão; nunca `drizzle-kit push`.
- Server Action: `requireSession()` na primeira instrução, Zod `.strict()`, `ResultadoAction`,
  `ERRO_INESPERADO` com correlation id.
- Nome acessível de chip, seletor e barra não muda (testes atuais prendem
  `"Categoria Um R$ 300,00 75,00%"` e `"Categoria Dois · R$ 300,03"`).
- Mobile em 400 px sem rolagem horizontal; alvos de 44×44 no toque (UI-03).
- **Gate de toda task inclui `pnpm typecheck`, encadeado com `&&`** (lição L-016).
- Regra aplicada na página precisa de e2e que a exercite (L-001); componente que a página monta
  precisa de prova da composição (L-014): T11 prova a cor vinda do banco nas quatro telas.
- Prova de layout se mede no navegador, não pelo nome da classe nem pelo `textContent` (lição da
  lista enxuta): o contraste da T11 é calculado das cores computadas.

## Review Focus

1. **Mesma cor nas quatro telas**, vinda do banco. Teste em T11.
2. **Contraste medido**, nos dois temas. Teste em T3 (tabela de tokens) e T11 (navegador).
3. **Automática determinística** e escolhida vencendo. Teste em T1.
4. **Sem categoria e removida neutras.** Testes em T4–T7.
5. **Renomear mantém a cor.** Testes em T8 e T11.

---

## Test Coverage Matrix

| Camada | Tipo | Expectativa | Local | Comando |
| --- | --- | --- | --- | --- |
| `src/domain/**` | unit | 100% de branches | `src/domain/**/*.test.ts` | `pnpm test:unit` |
| `src/application/schemas/**`, `src/components/*.ts` | unit | Todos os ramos | `*.test.ts` | `pnpm test:unit` |
| Repositório e actions | integration | Gravação, `CHECK`, colisão de nome, sessão | `*.integration.test.ts` | `pnpm test:integration` |
| Componentes | componentes | Chip, pill, seletor, chips, gráfico, navegação, lista de categorias | `src/components/**/*.test.tsx` | `pnpm test:unit` |
| Fluxo | e2e | Escolher cor e ver nas quatro telas, contraste, renomear, 400 px | `e2e/*.spec.ts` | `pnpm test:e2e` |
| Composição de página, docs | none | — | — | — |

## Gate Check Commands

| Gate | Comando |
| --- | --- |
| `quick` | `pnpm test:unit && pnpm typecheck` |
| `full` | `pnpm test:unit && pnpm typecheck && pnpm test:integration` |
| `build` | `pnpm verify` |
| `e2e` | `pnpm typecheck && pnpm exec playwright test e2e/categorias.spec.ts` |

Integração e e2e rodam com `DATABASE_URL_TEST` apontando para o banco de teste separado.

---

## Execution Plan

### Phase 0 — Dado

```
T1 -> T2
```

### Phase 1 — Paleta

```
T1 -> T3
```

### Phase 2 — A cor nas telas

```
T2 -> T4
T3 -> T4
T2 -> T5
T3 -> T5
T2 -> T6
T3 -> T6
T2 -> T7
T3 -> T7
```

### Phase 3 — Tela de Categorias

```
T2 -> T8
T8 -> T10
T4 -> T10
T9 -> T11
T10 -> T11
```

### Phase 4 — Fechamento

```
T5 -> T12
T6 -> T12
T7 -> T12
T11 -> T12
```

Lote 1: Phases 0 a 2 (T1–T7). Lote 2: Phases 3 e 4 (T8–T12).

---

## Task Breakdown

### Phase 0 — Dado

#### T1: A cor da categoria no domínio
**What**: a paleta fechada, a cor automática e a cor efetiva.
**Where**: `src/domain/categoria/cor-da-categoria.ts` (+ teste), `src/domain/index.ts`
**Depends on**: nenhuma
**Reuses**: `normalizarNome`
**Requirement**: COR-01
**Done when**:
- [ ] `CORES_DE_CATEGORIA` com as dez cores na ordem do AC 1 (COR-01 AC 1)
- [ ] `corAutomatica` devolve sempre uma das dez, igual para nomes que diferem em caixa, acento ou espaços (COR-01 AC 3)
- [ ] Nome normalizado vazio dá a primeira cor (Edge Case)
- [ ] `corDaCategoria` devolve a escolhida quando há, e a automática quando é nula (COR-01 AC 2, 3)
- [ ] `ehCorDeCategoria` aceita as dez e recusa o resto; 100% de branches
**Tests**: unit
**Gate**: quick
**Commit**: `feat(categorias): cor de categoria no domínio`

#### T2: A cor gravada na categoria
**What**: coluna `cor` com `CHECK`, migration `0004`, tipo, mapeador e `atualizarCategoria`.
**Where**: `src/infrastructure/db/schema.ts`, `drizzle/0004_cor_da_categoria.sql` (+ `meta`), `src/domain/tipos.ts`, `src/infrastructure/db/repositories/mapeadores.ts`, `src/infrastructure/db/repositories/cadastro.repository.ts` (+ teste de integração)
**Depends on**: T1
**Reuses**: `CadastroRepositoryDrizzle`, padrão de `criarUsuario` fora da port
**Requirement**: COR-01
**Done when**:
- [ ] Categoria criada pelo repositório nasce com `cor` nula (COR-01 AC 5)
- [ ] `atualizarCategoria(id, { cor })` grava e lê de volta; `{ cor: null }` apaga (COR-01 AC 2)
- [ ] `atualizarCategoria(id, { nome, cor })` grava os dois numa escrita
- [ ] O banco recusa `cor = 'dourado'` pelo `CHECK` (COR-01 AC 4)
- [ ] A migration revisada tem só `ADD COLUMN` e `ADD CONSTRAINT`
**Tests**: integration
**Gate**: full
**Commit**: `feat(categorias): gravar a cor da categoria`

### Phase 1 — Paleta

#### T3: Tokens da paleta e a decisão de design
**What**: 30 tokens `light-dark()`, o `@theme`, o mapa de classes e o registro da decisão.
**Where**: `src/app/globals.css`, `src/components/cor-de-categoria.ts` (+ teste), `docs/design.md`, `.specs/STATE.md`
**Depends on**: T1
**Reuses**: valores medidos do plano (tabela em `docs/design.md`)
**Requirement**: COR-02, COR-05
**Done when**:
- [ ] `--cat-<cor>-fundo`, `-texto` e `-barra` para as dez, com `light-dark()`, e `--color-cat-*` no `@theme inline` (COR-02 AC 1)
- [ ] `CLASSES_DA_COR` tem uma entrada por cor de `CORES_DE_CATEGORIA`, cada uma com classes escritas por extenso que existem no CSS
- [ ] Um teste lê os hex dos tokens no `globals.css` e calcula o contraste: texto ≥ 4,5:1 sobre o fundo e barra ≥ 3:1 sobre o canvas, nos dois temas (COR-02 AC 2, 3)
- [ ] `docs/design.md` com a seção "Cor por categoria" e os trechos antigos revistos; o comentário do gráfico em `globals.css` revisto (COR-05 AC 1, 2)
- [ ] AD nova em `.specs/STATE.md` (COR-05 AC 3)
**Tests**: unit
**Gate**: quick + `pnpm lint`
**Commit**: `feat(ui): paleta de cores de categoria`

### Phase 2 — A cor nas telas

#### T4: Pill colorida em "Todo mês"
**What**: `Chip` com `cor`, e a lista de fixos pintando a pill.
**Where**: `src/components/ui.tsx` (+ teste), `src/components/lista-de-fixos.tsx` (+ teste), `src/app/(app)/[competencia]/fixos/page.tsx`
**Depends on**: T2, T3
**Reuses**: `corDaCategoria`, `CLASSES_DA_COR`
**Requirement**: COR-03
**Done when**:
- [ ] `Chip` com `cor` usa a pill da cor no lugar de `bg-surface-strong text-ink`; sem `cor`, nada muda
- [ ] Fixo com categoria mostra a pill na cor efetiva (COR-03 AC 1)
- [ ] "Categoria removida" fica neutra (COR-02 AC 5)
**Tests**: componentes
**Gate**: quick + `pnpm lint`
**Commit**: `feat(fixos): pill da categoria na cor dela`

#### T5: Barras do gráfico na cor da categoria
**What**: cada barra de "Gastos por categoria" na cor dela.
**Where**: `src/components/grafico-categorias.tsx` (+ teste), `src/app/(app)/[competencia]/page.tsx`
**Depends on**: T2, T3
**Reuses**: `FatiaDeCategoria`, `CLASSES_DA_COR`
**Requirement**: COR-03
**Done when**:
- [ ] Barra com a classe de barra da cor, trilho neutro (COR-03 AC 5)
- [ ] "Sem categoria" com `bg-grafico-barra` (COR-02 AC 5)
- [ ] Estouro continua com ícone e texto, e a barra não muda (COR-03 AC 7)
- [ ] O nome acessível do link continua igual (COR-03 AC 6)
**Tests**: componentes
**Gate**: quick + `pnpm lint`
**Commit**: `feat(painel): barras do gráfico na cor da categoria`

#### T6: Seletor da linha na cor da escolha
**What**: o `<select>` de categoria pintado pela escolha otimista.
**Where**: `src/components/seletor-de-categoria.tsx` (+ teste), `src/components/tabela-lancamentos.tsx`, `src/app/(app)/[competencia]/lancamentos/page.tsx`
**Depends on**: T2, T3
**Reuses**: `useOptimistic` existente
**Requirement**: COR-03
**Done when**:
- [ ] O seletor tem a pill da cor da categoria escolhida (COR-03 AC 2)
- [ ] Trocar pinta na hora; recusa volta à cor anterior (COR-03 AC 3)
- [ ] "Sem categoria" e categoria fora das opções ficam neutras (COR-02 AC 5, Edge Case)
- [ ] O comentário da regra do chevron em `globals.css` proíbe o shorthand `background:`
**Tests**: componentes
**Gate**: quick + `pnpm lint`
**Commit**: `feat(lancamentos): seletor de categoria na cor dela`

#### T7: Chips de filtro tingidos
**What**: chips inativos na cor da categoria; ativo invertido.
**Where**: `src/components/chips-de-categoria.tsx` (+ teste), `src/application/mes/totais-por-categoria.ts` (+ teste), `src/components/filtros-de-lancamentos.tsx` (+ teste), `src/app/(app)/[competencia]/lancamentos/page.tsx`
**Depends on**: T2, T3
**Reuses**: `TotalDeCategoria`, `CLASSES_DA_COR`
**Requirement**: COR-03
**Done when**:
- [ ] `totaisPorCategoria` devolve a cor efetiva de cada categoria, e nula para "Sem categoria" e removida
- [ ] Chip inativo com a pill da cor; ativo com `bg-inverso text-on-inverso` (COR-03 AC 4)
- [ ] "Sem categoria" com `border-line bg-surface` (COR-02 AC 5)
- [ ] O nome acessível do chip continua igual (COR-03 AC 6)
**Tests**: componentes
**Gate**: quick + `pnpm lint`
**Commit**: `feat(lancamentos): chips de filtro na cor da categoria`

### Phase 3 — Tela de Categorias

#### T8: Trocar a cor e renomear, no servidor
**What**: schemas Zod, o erro de nome repetido e as duas actions.
**Where**: `src/application/schemas/categoria.schema.ts` (+ teste), `src/lib/erros.ts`, `src/app/actions/categorias.ts` (+ teste de integração)
**Depends on**: T2
**Reuses**: disciplina de `criarCategoria`, `buscarCategoriaPorNome`, `atualizarCategoria`
**Requirement**: COR-04
**Done when**:
- [ ] Schema recusa cor fora das dez, id que não é uuid e chave a mais; aceita `cor: null` (COR-01 AC 4, COR-04 AC 5)
- [ ] Sem sessão, as duas actions recusam antes de tocar no banco
- [ ] `trocarCorDaCategoria` grava a cor e `null` apaga (COR-04 AC 4, 5)
- [ ] `renomearCategoria` grava o nome e a cor em uso antes do novo nome (COR-04 AC 6)
- [ ] Nome de outra categoria recusa com `CATEGORIA_JA_EXISTE` no campo `nome`, sem mudar nada (COR-04 AC 7)
- [ ] Nome igual ao atual não grava (Edge Case)
- [ ] As quatro rotas são revalidadas (COR-04 AC 9)
**Tests**: unit + integration
**Gate**: full
**Commit**: `feat(categorias): trocar a cor e renomear a categoria`

#### T9: "Cadastros" na navegação
**What**: 4º item da navegação principal.
**Where**: `src/components/navegacao-principal.tsx` (+ teste)
**Depends on**: nenhuma
**Reuses**: `AREAS`
**Requirement**: COR-04
**Done when**:
- [ ] Quatro links na ordem Visão geral, Lançamentos, Todo mês, Cadastros; Cadastros leva a `/<competencia>/cadastros/categorias` (COR-04 AC 1)
- [ ] Cadastros fica com `aria-current="page"` em qualquer rota sob `/cadastros` (COR-04 AC 1)
- [ ] As outras três áreas continuam marcando ativa como hoje
**Tests**: componentes
**Gate**: quick + `pnpm lint`
**Commit**: `feat(nav): área de cadastros na navegação`

#### T10: Lista de categorias com cor e nome
**What**: o componente cliente da tela.
**Where**: `src/components/lista-de-categorias.tsx` (+ teste)
**Depends on**: T8, T4
**Reuses**: `Chip cor`, `useAvisos`, padrão de edição inline de `lista-de-fixos.tsx`
**Requirement**: COR-04
**Done when**:
- [ ] Uma linha por categoria, na ordem recebida, com a pill na cor em uso (COR-04 AC 2)
- [ ] `fieldset` com `legend` "Cor de <nome>" e onze radios com o nome da cor escrito; a cor em uso marcada, "Automática (<cor>)" quando nula (COR-04 AC 3)
- [ ] Escolher grava, pinta na hora e avisa "Cor trocada."; "Automática" manda `null` (COR-04 AC 4, 5)
- [ ] "Renomear" abre o campo; salvar avisa "Categoria renomeada." (COR-04 AC 6)
- [ ] Recusa volta o valor anterior e mostra o motivo na linha, em `role="alert"` (COR-04 AC 7, 8)
- [ ] Sem categorias, a frase de vazio (Edge Case)
**Tests**: componentes
**Gate**: quick + `pnpm lint`
**Commit**: `feat(categorias): lista de categorias com cor e nome`

#### T11: A tela de Categorias de ponta a ponta
**What**: a página e o e2e que prova a cor nas quatro telas.
**Where**: `src/app/(app)/[competencia]/cadastros/categorias/page.tsx`, `e2e/categorias.spec.ts`
**Depends on**: T9, T10
**Reuses**: `sessaoDaUI`, `listarCategoriasDisponiveis`, helpers de `e2e/lista-enxuta.spec.ts`
**Requirement**: COR-02, COR-03, COR-04
**Done when**:
- [ ] Pela navegação, Cadastros abre a tela com as categorias em ordem alfabética (COR-04 AC 1, 2)
- [ ] Escolher "Verde" para uma categoria: o `backgroundColor` computado da pill em "Todo mês", do seletor e do chip em Lançamentos é o mesmo, e a barra da Visão geral tem a cor de barra verde (COR-03 AC 1, 2, 4, 5, COR-04 AC 9)
- [ ] Nos temas claro e escuro, o contraste calculado das cores computadas é ≥ 4,5:1 no texto das pills e ≥ 3:1 na barra (COR-02 AC 2, 3)
- [ ] Renomear mantém a cor; nome repetido mostra o motivo (COR-04 AC 6, 7)
- [ ] Em 400 px, a tela e a navegação de quatro itens sem rolagem horizontal, e os radios com alvo de 44×44 (COR-04 AC 10)
- [ ] A suíte e2e inteira passa
**Tests**: e2e
**Gate**: e2e
**Commit**: `feat(categorias): tela de categorias com cor`

### Phase 4 — Fechamento

#### T12: Fechar a fatia
**What**: seed com cores, roadmap e traceability.
**Where**: `src/infrastructure/db/seed.ts`, `docs/roadmap.md` (+ `spec.md`)
**Depends on**: T5, T6, T7, T11
**Requirement**: COR-01 a COR-05
**Done when**:
- [ ] Seed com 2 categorias de cor escolhida e 3 automáticas
- [ ] Roadmap com a cor por categoria e a tela de Categorias em "Pronto", e o item de Cadastros revisto
- [ ] Traceability com cada requisito implementado
**Tests**: none
**Gate**: build
**Commit**: `docs(categorias): fechar a fatia da cor por categoria`

---

## Task Granularity Check

| Task | Escopo | Status |
| --- | --- | --- |
| T1 | 1 módulo de domínio | ✅ |
| T2 | coluna + migration + tipo + repositório | ⚠️ coeso: a coluna sem o mapeador não compila |
| T3 | tokens + mapa + documento | ⚠️ coeso: o mapa só vale com os tokens, e a decisão é a mesma |
| T4–T7 | 1 componente + a página que o alimenta | ✅ |
| T8 | schema + erro + 2 actions | ⚠️ coeso: as duas actions dividem schema e revalidação |
| T9, T10 | 1 componente | ✅ |
| T11 | página + e2e | ✅ |
| T12 | seed + docs | ✅ |

## Diagram-Definition Cross-Check

| Task | Depends On | Diagrama | Status |
| --- | --- | --- | --- |
| T1 | — | — | ✅ |
| T2 | T1 | T1→T2 | ✅ |
| T3 | T1 | T1→T3 | ✅ |
| T4 | T2, T3 | T2→T4, T3→T4 | ✅ |
| T5 | T2, T3 | T2→T5, T3→T5 | ✅ |
| T6 | T2, T3 | T2→T6, T3→T6 | ✅ |
| T7 | T2, T3 | T2→T7, T3→T7 | ✅ |
| T8 | T2 | T2→T8 | ✅ |
| T9 | — | — | ✅ |
| T10 | T8, T4 | T8→T10, T4→T10 | ✅ |
| T11 | T9, T10 | T9→T11, T10→T11 | ✅ |
| T12 | T5, T6, T7, T11 | T5→T12, T6→T12, T7→T12, T11→T12 | ✅ |

## Test Co-location Validation

| Task | Camada | Matriz exige | Task diz | Status |
| --- | --- | --- | --- | --- |
| T1 | domínio | unit | unit | ✅ |
| T2 | repositório | integration | integration | ✅ |
| T3 | `src/components/*.ts` | unit | unit | ✅ |
| T4–T7, T9, T10 | componentes | componentes | componentes | ✅ |
| T8 | schema + actions | unit + integration | unit + integration | ✅ |
| T11 | fluxo | e2e | e2e | ✅ |
| T12 | docs | none | none | ✅ |
