# Cor por categoria — Validação

## Validation: cor-por-categoria — **FAIL**

**Result**: FAIL ❌ — rodada 1 (2026-10-29, `2f58774`). O gate está verde: unit 1652 de 1652, integração
363 de 363, e2e 82 de 82, `typecheck` e `lint` limpos. Os 29 critérios e os 4 edge cases têm teste, e 72
dos 79 mutantes morreram. O veredito vem de quatro lacunas: **seis mutantes vivos quebram critério**. O
sétimo vivo, C16, é equivalente: o navegador não muda.

Nenhuma das quatro lacunas é defeito de produto: na HEAD, o comportamento está certo nas quatro, e as
sondas deste relatório mediram isso no navegador. O que falta é teste que discrimine. Cada correção
sugerida já foi provada numa sonda: o teste passa na HEAD e morre com o mutante.

1. **"Sem categoria" e "Categoria removida" neutras só no componente, e não na página (COR-02 AC 5;
   E1, E2).**
   - Quem decide que a removida vai sem cor é a página: `src/app/(app)/[competencia]/page.tsx:186` e
     `src/app/(app)/[competencia]/fixos/page.tsx:105`.
   - Os testes de componente recebem `cor: null` pronto na fixture.
   - Nenhum e2e tem lançamento sem categoria ou categoria arquivada lendo a cor.
   - Com a página tingindo os dois grupos, `e2e/categorias.spec.ts`, `e2e/lista-enxuta.spec.ts` e
     `e2e/trocar-categoria.spec.ts` passam inteiros.
   - É a L-014, citada nas Global Constraints de `tasks.md`. O caso colorido atravessa a composição; o
     neutro, não.
2. **A ordem alfabética não é discriminada (COR-04 AC 2; E7, E8).**
   - A fixture do e2e tem "Categoria Dois", "Categoria Três" e "Categoria Um". A ordem dela é a mesma
     no português, no código de caractere e no `ORDER BY nome` do banco.
   - Tirar o `.sort` de `src/app/(app)/[competencia]/cadastros/categorias/page.tsx:31-33` passa verde.
     Trocar o `Intl.Collator` por `<` também passa.
   - O banco de teste ordena por código de caractere: numa amostra, a palavra em minúscula e a
     acentuada saíram depois de "Zebra". É o caso que a página existe para corrigir.
3. **O chevron do seletor só tem prova pelo nome da classe (COR-03 AC 2; E13).**
   - `src/components/seletor-de-categoria.test.tsx:297-307` afirma só que não há utilitária
     `bg-none`/`bg-[…]`/gradiente.
   - O comentário de `:297-298` diz "A medida é do e2e", mas nenhum e2e lê `background-image`.
   - Um `style={{ background: … }}` no `<select>` apaga o chevron. É o shorthand que o comentário de
     `globals.css` proíbe. Mesmo assim, unit (77 de 77), `categorias.spec.ts` (5 de 5) e
     `trocar-categoria.spec.ts` (6 de 6) passam.
   - Na HEAD o chevron está lá. A sonda leu `url("data:image/svg+xml…")` sobre `rgb(225, 245, 224)`.
4. **Baixa: o cadastro inline não tem teste de "nasce sem cor" (COR-01 AC 5; B4).**
   - A garantia vale no repositório (B3 morto), mas nada lê `cor` depois de `criarCategoria` da action.
   - Uma chamada a mais a `atualizarCategoria` em `src/app/actions/categorias.ts:89` passa os 346
     testes de integração de `src/app/actions` e `src/infrastructure/db`.
   - O tipo `NovaCategoria`, sem `cor`, torna o defeito improvável. Ainda assim, ele não é discriminado.

Fora do veredito: duas **⚠️ lacunas de precisão da spec**, nos pontos 1 e 3 do autor, e duas observações
para o dono, nos pontos 2 e 4. Detalhe em [Os quatro pontos do autor](#os-quatro-pontos-do-autor).

**Data**: 2026-10-29
**Spec**: `.specs/features/cor-por-categoria/spec.md` (COR-01 a COR-05, 29 critérios, 4 edge cases)
**Faixa do diff**: `8419c29..2f58774`, 14 commits: a spec (`97fa77f`), T1 a T13 e o fechamento. A base
`8419c29` é o `main`.

**Verificador**: sub-agente independente (autor ≠ verificador). Só leitura sobre o código e os testes da
fatia.

- **Onde as mutações rodaram**: numa `git worktree` descartável, em modo detached no `2f58774`, no
  scratchpad (`verif-cor-wt`), com `pnpm install --offline` próprio.
- **Como**: cada mutante foi aplicado sozinho por substituição exata de texto e desfeito com
  `git checkout`.
- **Banco e e2e**: integração e e2e rodaram com
  `DATABASE_URL_TEST=…/mybilling_test_trc`. Os e2e rodaram um de cada vez, na porta 3100.
- **Isolamento**: nenhum `git stash`. O porcelain da worktree da fatia foi gravado antes (vazio) e
  conferido no fim (vazio). A worktree descartável foi removida (`git worktree list` sem ela). O checkout
  principal e as outras worktrees não foram tocados.

---

## Task Completion

| Task | Commit | Status | Notas |
| --- | --- | --- | --- |
| T1 | `8886765` | ✅ Done | Domínio puro, 100% de branches |
| T2 | `bcf7593` | ✅ Done | Migration só com `ADD COLUMN` e `ADD CONSTRAINT` (`drizzle/0004_cor_da_categoria.sql:1-2`) |
| T3 | `ab2f9c5` | ✅ Done | 30 tokens, `CLASSES_DA_COR`, `docs/design.md`, AD-018 |
| T13 | `ea2da05` | ✅ Done | Barras com 3:1 também contra o trilho composto |
| T4 | `2723a74` | ✅ Done | A removida neutra só provada no componente (lacuna 1) |
| T5 | `8cf74ca` | ✅ Done | "Sem categoria" e removida neutras só provadas no componente (lacuna 1) |
| T6 | `97b767c` | ✅ Done | O chevron só provado pelo nome da classe (lacuna 3) |
| T7 | `c65dbb8` | ✅ Done | — |
| T8 | `4690a39` | ✅ Done | — |
| T9 | `1e8c744` | ✅ Done | — |
| T10 | `e5d12b8` | ✅ Done | — |
| T11 | `6e18158` | ✅ Done | A fixture da ordem alfabética não discrimina (lacuna 2) |
| T12 | `2f58774` | ✅ Done | — |

13 tasks, todos os itens marcados. Os 14 commits trazem `tasks.md` e `spec.md`, e todos passam no
`check_commit.py`.

---

## Critérios de aceitação, ancorados na spec

Legenda:

- ✅: a assertion afirma o resultado que a spec define, e o mutante que o quebra morre.
- ❌: a assertion não prova o critério inteiro.
- ⚠️: a spec não define o resultado com precisão.
- "Espelha": o teste prende o nome de uma classe ou o texto da fonte, e não o efeito na tela.

### COR-01 — A categoria tem uma cor

| AC | Resultado definido pela spec | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| 1 | Dez cores, nesta ordem: vermelho, laranja, âmbar, verde, verde-água, ciano, azul, roxo, rosa e marrom | `src/domain/categoria/cor-da-categoria.test.ts:21-34` — `expect(CORES_DE_CATEGORIA).toEqual(["vermelho", …, "marrom"])` | ✅ D8 morto |
| 2 | Guardar a cor escolhida, ou nada | `src/infrastructure/db/repositories/cadastro.repository.integration.test.ts:226-241` — grava `verde` e lê de volta em `buscarCategoria`, nas duas listagens e por nome; `:243-252` — `{ cor: null }` apaga; `src/app/actions/categorias.integration.test.ts:171-183`, `:191-201` | ✅ A3, B5 mortos |
| 3 | Sem cor escolhida, a automática do nome, a mesma em caixa, acento ou espaço diferentes | `cor-da-categoria.test.ts:60-66` (caixa), `:68-76` (acento, inclusive o "ê" decomposto), `:78-84` (espaços), `:86-101` (propriedade: os três juntos para qualquer nome), `:103-107` (200 nomes alcançam as dez cores), `:109-115` (sem estado), `:132-136` | ✅ D1, D2, D3, D4, D5, D7 mortos |
| 4 | O banco recusa cor fora das dez | `cadastro.repository.integration.test.ts:296-306` — aceita cada uma das dez; `:308-326` — `dourado`, `""`, `Verde`, `âmbar` recusadas com `23514` e `categoria_cor_valida`, no `INSERT` e no `UPDATE`; `src/application/schemas/categoria.schema.test.ts:102`; `categorias.integration.test.ts:209-221` | ✅ B1, B2, A8 mortos |
| 5 | Criada pelo inline, pela importação ou pelo seed, sem cor escolhida | `cadastro.repository.integration.test.ts:218-224` — `criarCategoria` do repositório nasce com `cor` nula; `src/infrastructure/db/seed.integration.test.ts:167-180` — cinco categorias, duas com cor escolhida depois, como a tela faria, e três na automática | ❌ Repositório e seed provados (B3, B6 mortos). A action do inline não tem assertion: B4 vivo (lacuna 4, baixa). A importação passa pela port, que não tem `atualizarCategoria` |

### COR-02 — Paleta medida nos dois temas

| AC | Resultado definido pela spec | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| 1 | Fundo, texto e barra para cada cor, em claro e escuro, como tokens | `src/components/cor-de-categoria.test.ts:96-108` — 30 `light-dark(#claro, #escuro)` lidos de `globals.css` e expostos como `--color-cat-*` | ✅ T6 morto |
| 2 | Texto ≥ 4,5:1 sobre o fundo, nos dois temas | `cor-de-categoria.test.ts:110-120` — 20 pares calculados dos hex de `globals.css`; `e2e/categorias.spec.ts:515-523` — no navegador, das cores computadas, as 13 pills de linha e as 143 opções da tela de Categorias, com as dez cores, nos dois temas; `:526-533` (Todo mês), `:535-551` (seletores e chips) | ✅ T1 e T4 mortos no unit **e** no e2e (4,39 e 4,48 recusados) |
| 3 | Barra ≥ 3:1 contra o trilho, composto sobre o canvas no escuro, e contra a superfície | `cor-de-categoria.test.ts:122-138` (canvas); `:150-154` (o trilho composto não é o canvas nem o branco); `:156-163` (barra contra o trilho composto); `e2e/categorias.spec.ts:554-562` — as dez barras, nos dois temas, contra o fundo efetivo do trilho e da superfície | ✅ T2, T3 e T5 mortos; T2 também no e2e (2,966 recusado). Hover escuro fora do AC: ver ponto 2 |
| 4 | O nome impresso ao lado de toda cor | `src/components/ui.test.tsx:58-62`; `src/components/lista-de-fixos.test.tsx:189-193`; `src/components/chips-de-categoria.test.tsx:58-66`; `src/components/grafico-categorias.test.tsx:142-155`; `src/components/lista-de-categorias.test.tsx:169-176`; `e2e/categorias.spec.ts:326-330`, `:370` | ✅ L1 morto |
| 5 | Sem categoria ou removida: na neutra de hoje | Componentes: `lista-de-fixos.test.tsx:195-203`, `grafico-categorias.test.tsx:128-140`, `seletor-de-categoria.test.tsx:309-313`, `chips-de-categoria.test.tsx:254-263`; aplicação: `src/application/mes/totais-por-categoria.test.ts:117-125`, `:136-142` (espelha: `bg-surface-strong`, `bg-grafico-barra`, `border-line bg-surface`) | ❌ Componentes e totais provados (C3, C6, C9, C17 mortos). A decisão das páginas não: E1 e E2 vivos em toda a suíte e2e (lacuna 1). ⚠️ "Removida" não diz se a arquivada conta (lacuna de precisão A) |

### COR-03 — A cor aparece onde a categoria aparece

| AC | Resultado definido pela spec | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| 1 | Pill de "Todo mês" com o fundo e o texto da cor | `lista-de-fixos.test.tsx:176-187`; `ui.test.tsx:33-43`; `e2e/categorias.spec.ts:363-365`, `:376` — `backgroundColor` computado igual ao token `--cat-verde-fundo` | ✅ C2, E4 mortos |
| 2 | Seletor com o fundo e o texto da escolhida, **mantendo o chevron** | `seletor-de-categoria.test.tsx:281-296`; `src/components/tabela-lancamentos.test.tsx:655-665`; `e2e/categorias.spec.ts:369-371`, `:377`. Chevron: `seletor-de-categoria.test.tsx:299-307`, só pelo nome da classe (espelha) | ❌ Cor provada no navegador (E3 morto). O chevron não: E13 vivo (lacuna 3). Na HEAD ele existe (sonda) |
| 3 | A troca pinta na hora; a recusa volta à cor anterior | `seletor-de-categoria.test.tsx:327-360` — durante a gravação, as classes da nova; `:362-378` — depois da recusa, as da anterior. A classe vira a cor certa no navegador pelo AC 2 | ✅ C7, C7b mortos |
| 4 | Chips inativos tingidos; o ativo invertido, como hoje | `chips-de-categoria.test.tsx:231-242`, `:244-252`; `src/components/filtros-de-lancamentos.test.tsx:184-191`; `totais-por-categoria.test.ts:129-134`; `e2e/categorias.spec.ts:372-378` — o chip inativo com o mesmo `backgroundColor` da pill | ✅ C8, C9, C17b, E6 mortos. O ativo é provado pela classe de antes (`bg-inverso`) |
| 5 | Barra na cor da categoria, trilho neutro | `grafico-categorias.test.tsx:109-126`; `e2e/categorias.spec.ts:382-387` — a barra com o token `--cat-verde-barra` e o trilho com `--grafico-trilho` | ✅ C4, E5 mortos |
| 6 | O nome acessível de chips, seletores e barras como antes, sem o nome da cor | `grafico-categorias.test.tsx:59-64` ("Categoria Um R$ 300,00 75,00%"), `chips-de-categoria.test.tsx:71` ("Categoria Dois · R$ 300,03") e `seletor-de-categoria.test.tsx:93` ("Categoria de …") estão intactos desde `8419c29`: o diff só acrescenta `cor` às fixtures; `grafico-categorias.test.tsx:142-155` | ✅ C18, C19 mortos |
| 7 | Estouro por ícone e texto, sem mudar a cor da barra | `grafico-categorias.test.tsx:162-180` — "acima do limite", o ícone, e `bg-cat-laranja-barra`; `:182-197` — a mesma `className` dentro e fora do limite | ✅ C5, C5b mortos |

### COR-04 — Tela de Categorias

| AC | Resultado definido pela spec | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| 1 | `/<competencia>/cadastros/categorias`, pelo item "Cadastros", que fica ativo | `src/components/navegacao-principal.test.tsx:23-28`, `:47-53`, `:87-95`, `:97-106`; `e2e/categorias.spec.ts:317-323` | ✅ N1 a N4 mortos |
| 2 | As disponíveis **em ordem alfabética**, cada uma com a pill na cor em uso | `lista-de-categorias.test.tsx:146-165` (a ordem recebida e a pill); `e2e/categorias.spec.ts:326-341` | ❌ A pill está provada. A ordem não: E7 e E8 vivos (lacuna 2) |
| 3 | As dez cores e "Automática", cada uma com o nome escrito, e a em uso marcada | `lista-de-categorias.test.tsx:169-176` — `textContent` de cada `label`; `:178-191`, `:193-213`; `e2e/categorias.spec.ts:352-355` | ✅ L1 morto |
| 4 | Grava sem salvar, pinta na hora, avisa "Cor trocada." | `lista-de-categorias.test.tsx:217-225`, `:238-255`; `categorias.integration.test.ts:171-183`; `e2e/categorias.spec.ts:352-358` | ✅ L6, L8 mortos |
| 5 | "Automática" apaga a escolha | `lista-de-categorias.test.tsx:227-236` — `toHaveBeenCalledWith({ …, cor: null })`; `:257-270`; `categorias.integration.test.ts:191-201` | ✅ L2, A3, B5 mortos |
| 6 | Renomear grava, avisa "Categoria renomeada." e mantém a cor | `categorias.integration.test.ts:261-289` — "Categoria Um", ciano, vira "Categoria Dez" ainda ciano; `lista-de-categorias.test.tsx:307-342`; `e2e/categorias.spec.ts:399-421` | ✅ A4, L5 mortos |
| 7 | Nome de outra: recusa, motivo junto do campo, nada muda | `categorias.integration.test.ts:319-335` (ativa, outra caixa e arquivada), `:337-345`; `lista-de-categorias.test.tsx:359-380`; `e2e/categorias.spec.ts:427-445` | ✅ A5 morto |
| 8 | Falha: volta a cor ou o nome e diz o motivo na linha | `lista-de-categorias.test.tsx:274-293`, `:359-394`; `categorias.integration.test.ts:234-257`, `:409-430` | ✅ L7, L9 mortos |
| 9 | Mudança visível nas três telas na próxima visita, sem recarregar | `categorias.integration.test.ts:203-207`, `:311-315` — as quatro rotas com `"page"`; `e2e/categorias.spec.ts:361-383`, `:418-421`, pelos links da navegação | ✅ A7a a A7d mortos |
| 10 | 400 px sem rolagem horizontal, navegação de quatro itens, alvos de 44×44 | `e2e/categorias.spec.ts:455` (transbordo 0), `:458-477` (quatro itens numa linha), `:480-492` (33 alvos), `:493-499` ("Renomear") | ✅ E9, E10, E11 mortos |

### COR-05 — A decisão de design registrada

| AC | Resultado definido pela spec | `file:line` | Resultado |
| --- | --- | --- | --- |
| 1 | Paleta com os valores, medições, limites e o que o validador reprovou | `docs/design.md:221-357`. A tabela de `:250-261` foi conferida por script contra `globals.css`: 10 linhas, 0 divergências | ✅ |
| 2 | Os trechos que proibiam cor revistos, apontando para a seção nova | `docs/design.md:140-141`, `:216-219`; `src/app/globals.css:114-119`; o comentário de `src/components/grafico-categorias.tsx` | ✅ |
| 3 | AD em `.specs/STATE.md` | `.specs/STATE.md:142-148` (AD-018) | ✅ |

### Edge Cases

| Edge case | `file:line` + assertion | Resultado |
| --- | --- | --- |
| Nome normalizado vazio → a primeira cor | `cor-da-categoria.test.ts:118-122` — `""`, `"   "` e `"\t\n"` dão `vermelho` | ✅ D4, D6 mortos |
| Arquivada no seletor, fora das opções → neutra | `seletor-de-categoria.test.tsx:315-319` | ✅ C6 morto. ⚠️ O chip da mesma arquivada fica tingido (lacuna de precisão A) |
| Sem categoria nenhuma → a frase de vazio, com o caminho do formulário de lançamento | `lista-de-categorias.test.tsx:440-448` | ✅ |
| Nome igual ao atual → não grava e não avisa | `categorias.integration.test.ts:348-372` — nada de `atualizarCategoria`, nem cor congelada, nem revalidação; `lista-de-categorias.test.tsx:411-437` | ✅ A6, L3, L4 mortos. ⚠️ "Igual" não diz se a caixa conta (lacuna de precisão B) |

**Status**: ❌ 25 de 29 critérios provados por inteiro. COR-01 AC 5, COR-02 AC 5, COR-03 AC 2 e COR-04
AC 2 têm uma parte sem prova que discrimine. Há duas lacunas de precisão na spec (A e B), que não pesam
no veredito.

### Checagens pedidas

- **Migration**: `drizzle/0004_cor_da_categoria.sql:1-2` tem só `ADD COLUMN "cor" text` e
  `ADD CONSTRAINT "categoria_cor_valida" CHECK (…)`. ✅
- **Domínio puro**: `src/domain/categoria/cor-da-categoria.ts:1` importa só `../importacao/celula`. Não
  usa `Date`, `async` nem `throw`. `src/domain/shared/arquitetura.test.ts` passa no `test:unit`, e a
  cobertura de branches do domínio é 100% (353 de 353). ✅
- **Classes por template**: busca por `` cat-${ `` e `` `bg|text|border-${ `` fora de teste. A única
  ocorrência é o comentário de `src/components/cor-de-categoria.ts:7`. Toda classe sai de
  `CLASSES_DA_COR`, por extenso. ✅
- **Nomes acessíveis**: em `git diff 8419c29..HEAD` dos testes de chips, gráfico, seletor, filtros e
  tabela, as únicas linhas removidas são fixtures que ganharam `cor`. As assertions de nome acessível
  continuam iguais e rodam com as fixtures tingidas. ✅
- **Dado real (AD-009)**:
  - Fixtures, comentários e as 14 mensagens de commit usam "Categoria Um/Dois/…", "Fixo A", "Tom 01",
    "Pessoa A" e valores aritméticos.
  - "Moradia" (`carregar-estado.test.ts`) é anterior à fatia; o diff só acrescentou `cor: null`.
  - A palavra genérica do comentário de `src/app/actions/categorias.ts`, que explica a correção de
    caixa, já está nos e2e da base desde antes da fatia.
  - Nenhum indício de dado real. ✅

### Testes que espelham a implementação

São quatro grupos. Os dois primeiros escondem uma lacuna.

1. **O chevron, pela ausência de classe** (`seletor-de-categoria.test.tsx:299-307`). É a lacuna 3.
2. **A neutra de "Sem categoria" e da removida, pelo nome da classe** (`bg-surface-strong`,
   `bg-grafico-barra`, `border-line bg-surface`). No navegador, a classe colorida é provada pela cor
   computada, e a neutra não. Junto da decisão das páginas, é a lacuna 1.
3. **O chip ativo, por `bg-inverso text-on-inverso`.** É a classe de antes da fatia, que é o que o AC
   pede ("como hoje").
4. **A fonte de `CLASSES_DA_COR` lida como texto** (`cor-de-categoria.test.ts:183-189`). É de propósito:
   o Tailwind só gera a classe que lê no fonte.

---

## Discriminação (sensor)

79 mutantes, todos aplicados sozinhos na worktree descartável:

- 58 de unidade, componente, schema e integração, contra os arquivos de teste da camada;
- 21 de página, layout ou token, contra o e2e. Os vivos rodaram também contra os outros e2e que
  mostram "Sem categoria" ou categoria arquivada.

| Mutante | Arquivo:linha | Falha injetada | Resultado |
| --- | --- | --- | --- |
| D1 | `src/domain/categoria/cor-da-categoria.ts:52-54` | soma começa num contador de chamadas (não determinística) | ✅ morto (`cor-da-categoria.test.ts:109`, `:60`, `:118`) |
| D2 | `cor-da-categoria.ts:44` | chave sem minúscula (sensível à caixa) | ✅ morto (`:60`, `:86`) |
| D3 | `cor-da-categoria.ts:44` | chave sem remover acento | ✅ morto (`:68`, `:86`) |
| D4 | `cor-da-categoria.ts:44` | chave sem `trim` nem colapso de espaço | ✅ morto (`:78`, `:118`) |
| D5 | `cor-da-categoria.ts:67` | a automática sempre vence a escolhida | ✅ morto (`:124-130`) |
| D6 | `cor-da-categoria.ts:54` | `soma` começa em 7: o vazio não cai na primeira cor | ✅ morto (`:118`) |
| D7 | `cor-da-categoria.ts:59` | automática constante | ✅ morto (`:103`) |
| D8 | `cor-da-categoria.ts:21-32` | paleta sem `marrom` | ✅ morto (`:21`) |
| B1 | `drizzle/0004_cor_da_categoria.sql:2` | `CHECK` sem `marrom` | ✅ morto (`cadastro.repository.integration.test.ts:296`) |
| B2 | `drizzle/0004_cor_da_categoria.sql:2` | sem o `CHECK` | ✅ morto (`:308`, quatro casos) |
| B3 | `src/infrastructure/db/repositories/cadastro.repository.ts:189` | `criarCategoria` grava `vermelho` | ✅ morto (`:218`, `:273`) |
| **B4** | `src/app/actions/categorias.ts:89` | a action do inline grava `verde` depois de criar | ❌ **vivo** (346 de 346 em `src/app/actions` e `src/infrastructure/db`) |
| B5 | `cadastro.repository.ts:206` | `set` troca `cor: null` por `undefined` (não apaga) | ✅ morto (`:243`; `categorias.integration.test.ts:191`) |
| B6 | `src/infrastructure/db/seed.ts:294` | seed sem nenhuma cor escolhida | ✅ morto (`seed.integration.test.ts:167`) |
| B7 | `seed.ts:120` | seed escolhe para "Categoria Dois" a própria automática | ✅ morto (`:167`) |
| A1 | `src/app/actions/categorias.ts:134-137` | `trocarCorDaCategoria` sem `requireSession` | ✅ morto (`categorias.integration.test.ts:140`, `:147`) |
| A1b | `categorias.ts:134-142` | `requireSession` depois da validação | ✅ morto (`:140`) |
| A2 | `categorias.ts:181-184` | `renomearCategoria` sem `requireSession` | ✅ morto (`:140`, `:147`) |
| A3 | `categorias.ts:152` | `cor: cor ?? undefined` (null não apaga) | ✅ morto (`:191`) |
| A4 | `categorias.ts:214` | renomear grava `atual.cor` (não congela a automática) | ✅ morto (`:261`, `:297`) |
| A5 | `categorias.ts:208` | o nome de outra categoria grava | ✅ morto (`:319`, três casos) |
| A6 | `categorias.ts:200` | nome igual ao atual grava | ✅ morto (`:349`) |
| A7a–d | `categorias.ts:232-235` | revalidação sem `/[competencia]`, `/lancamentos`, `/fixos` ou `/cadastros/categorias`, uma de cada vez | ✅ os quatro mortos (`:203`, `:311`) |
| A8 | `src/application/schemas/categoria.schema.ts:40` | schema aceita qualquer texto como cor | ✅ morto (`categorias.integration.test.ts:209`; `categoria.schema.test.ts:102`) |
| C1 | `src/components/cor-de-categoria.ts:56-59` | `CLASSES_DA_COR` sem `marrom` | ✅ morto (`cor-de-categoria.test.ts:167`, `:171`, `:183`; o `tsc` também acusa) |
| C1b | `cor-de-categoria.ts:54` | rosa com a barra do roxo | ✅ morto (`:171`, `:183`) |
| C2 | `src/components/ui.tsx:74` | `Chip` com `cor` mantém `bg-surface-strong` | ✅ morto (`ui.test.tsx:33`; `lista-de-fixos.test.tsx:176`) |
| C3 | `src/components/grafico-categorias.tsx:116` | "Sem categoria" e removida com a barra vermelha | ✅ morto (`grafico-categorias.test.tsx:128`) |
| C4 | `grafico-categorias.tsx:116` | barra neutra mesmo com cor | ✅ morto (`:109`, `:162`) |
| C5 | `grafico-categorias.tsx:116` | estouro com `bg-negativo` | ✅ morto (`:162`, `:182`) |
| C5b | `grafico-categorias.tsx:116` | estouro com a barra vermelha da paleta | ✅ morto (`:162`, `:182`) |
| C6 | `src/components/seletor-de-categoria.tsx:103` | "Sem categoria" e arquivada tingidas no seletor | ✅ morto (`seletor-de-categoria.test.tsx:309`, `:315`, `:327`) |
| C7 | `seletor-de-categoria.tsx:89-104` | pintura por um estado local que não volta na recusa | ✅ morto (`:362`) |
| C7b | `seletor-de-categoria.tsx:101-104` | pintura pela gravada, e não pela otimista | ✅ morto (`:327`, dois casos) |
| C16 | `seletor-de-categoria.tsx:133` | classe `[background-image:none]` no select | ➖ vivo, **equivalente**: a regra global de `select`, sem camada, vence a utilitária; o chevron continua lá (sonda) |
| C8 | `src/components/chips-de-categoria.tsx:42` | chip ativo tingido | ✅ morto (`chips-de-categoria.test.tsx:244`) |
| C9 | `chips-de-categoria.tsx:45-48` | "Sem categoria" tingida no chip | ✅ morto (`:254`) |
| C17 | `src/application/mes/totais-por-categoria.ts:56` | "Sem categoria" e removida com cor automática | ✅ morto (`totais-por-categoria.test.ts:63`, `:117`, `:136`) |
| C17b | `totais-por-categoria.ts:56` | totais ignoram a escolhida | ✅ morto (`:63`, `:86`, `:129`) |
| C18 | `grafico-categorias.tsx:87` | nome da cor no nome acessível do link | ✅ morto (`grafico-categorias.test.tsx:55`) |
| C19 | `seletor-de-categoria.tsx:125` | nome da cor no rótulo do seletor | ✅ morto (`seletor-de-categoria.test.tsx:90`, 21 testes) |
| N1 | `src/components/navegacao-principal.tsx:77` | Cadastros ativo em toda rota do mês | ✅ morto (`navegacao-principal.test.tsx:97`) |
| N2 | `navegacao-principal.tsx:73` | Visão geral ativa em `/cadastros` | ✅ morto (`:87`) |
| N3 | `navegacao-principal.tsx:75` | Cadastros só por `endsWith` | ✅ morto (`:87`) |
| N4 | `navegacao-principal.tsx:62` | Cadastros leva a `/cadastros`, e não a Categorias | ✅ morto (`:47`) |
| L1 | `src/components/lista-de-categorias.tsx:285` | opção sem o nome escrito, só `aria-label` | ✅ morto (`lista-de-categorias.test.tsx:169`, `:193`) |
| L2 | `lista-de-categorias.tsx:143` | "Automática" manda a cor do nome | ✅ morto (`:227`) |
| L3 | `lista-de-categorias.tsx:176` | nome igual grava, no cliente | ✅ morto (`:412`) |
| L4 | `lista-de-categorias.tsx:190` | avisa mesmo com `renomeada: false` | ✅ morto (`:426`) |
| L5 | `lista-de-categorias.tsx:183` | renomear otimista recalcula a automática | ✅ morto (`:323`) |
| L6 | `lista-de-categorias.tsx:127` | a pill segue a prop, não a otimista | ✅ morto (`:238`, `:257`, `:323`) |
| L7 | `lista-de-categorias.tsx:119-146` | cor tentada num estado que não volta | ✅ morto (`:274`) |
| L8 | `lista-de-categorias.tsx:152` | "Cor alterada." no lugar de "Cor trocada." | ✅ morto (`:217`) |
| L9 | `lista-de-categorias.tsx:294` | erro de cor sem `role="alert"` | ✅ morto (`:274`) |
| T1 | `src/app/globals.css:170` | texto verde do claro em `#397d3e` (4,39:1) | ✅ morto no unit (`cor-de-categoria.test.ts:111`) e no e2e (`e2e/categorias.spec.ts:519`, "light: Verde", 4,390) |
| T2 | `globals.css:180` | barra azul do escuro em `#3e66b3` (2,95:1 contra o trilho, 3,52 contra o canvas) | ✅ morto no unit (`:156`) e no e2e (`e2e/categorias.spec.ts:559`, "dark: barra de Tom 07 contra o trilho", 2,966) |
| T3 | `globals.css:183` | barra roxa do claro em `#9f78dc` (2,97:1 contra o trilho) | ✅ morto (`cor-de-categoria.test.ts:156`) |
| T4 | `globals.css:185` | texto rosa do escuro em `#cd77a1` (4,48:1) | ✅ morto no unit (`:111`) e no e2e (`e2e/categorias.spec.ts:532`, "dark: Categoria Dez", 4,475) |
| T5 | `globals.css:121` | trilho do escuro com alfa 0,14 | ✅ morto (`cor-de-categoria.test.ts:150`, `:156`, dez cores) |
| T6 | `globals.css:259` | `--color-cat-ciano-barra` fora do `@theme` | ✅ morto (`:97`) |
| **E1** | `src/app/(app)/[competencia]/fixos/page.tsx:105` | "Categoria removida" com a cor automática em Todo mês | ❌ **vivo** (`categorias.spec.ts` 5 de 5, `trocar-categoria.spec.ts` 6 de 6, `lista-enxuta.spec.ts` 9 de 9) |
| **E2** | `src/app/(app)/[competencia]/page.tsx:186` | "Sem categoria" e removida tingidas na Visão geral | ❌ **vivo** (os mesmos três e2e, inteiros) |
| E3 | `src/app/(app)/[competencia]/lancamentos/page.tsx:174` | opções do seletor com a automática no lugar da escolhida | ✅ morto (`e2e/categorias.spec.ts:377`) |
| E4 | `fixos/page.tsx:105` | Todo mês com a automática no lugar da escolhida | ✅ morto (`:376`) |
| E5 | `page.tsx:186` | Visão geral com a automática no lugar da escolhida | ✅ morto (`:383`) |
| E6 | `lancamentos/page.tsx:166` | chips com a automática no lugar da escolhida | ✅ morto (`:378`) |
| **E7** | `src/app/(app)/[competencia]/cadastros/categorias/page.tsx:31-33` | sem ordenar: fica a ordem do banco | ❌ **vivo** (`categorias.spec.ts` 5 de 5) |
| **E8** | `cadastros/categorias/page.tsx:32` | ordem por código de caractere, e não a do português | ❌ **vivo** (5 de 5) |
| E8b | `cadastros/categorias/page.tsx:32` | ordem inversa (controle) | ✅ morto (`e2e/categorias.spec.ts:326`) |
| E9 | `lista-de-categorias.tsx:263` | opções de cor sem quebra de linha | ✅ morto (`:455`, transbordo 419) |
| E10 | `navegacao-principal.tsx:100` | respiro `px-3` de antes no celular | ✅ morto (`:477`, duas alturas) |
| E11 | `lista-de-categorias.tsx:272` | `label` sem `min-h-11 min-w-11` | ✅ morto (`:491`, "altura de Vermelho" 31,5) |
| **E13** | `seletor-de-categoria.tsx:131` | `style={{ background: var(--cat-…-fundo) }}` no select: o chevron some | ❌ **vivo** (unit 77 de 77; `categorias.spec.ts` 5 de 5; `trocar-categoria.spec.ts` 6 de 6) |

**Profundidade**: expandida, com todos os mutantes pedidos pelo orquestrador e variantes nas camadas que
os testam: domínio, banco, action, componente, página e token. As linhas citadas do `globals.css` e das
actions são da HEAD.

**Resultado do sensor**: 72 mortos e 1 equivalente (C16). **6 vivos quebram critério**:

- E1 e E2 (lacuna 1);
- E7 e E8 (lacuna 2);
- E13 (lacuna 3);
- B4 (lacuna 4, baixa).

Veredito: FAIL ❌.

### Sondas

As sondas rodaram na worktree descartável, como testes a mais, e foram apagadas depois.

| Sonda | Na HEAD | Com o mutante | Conclusão |
| --- | --- | --- | --- |
| Chevron do seletor pintado: `getComputedStyle(select).backgroundImage` | `url("data:image/svg+xml…")` sobre `rgb(225, 245, 224)` | C16: o mesmo `url(…)`. E13: `none`, e a sonda falha | COR-03 AC 2 vale na HEAD. C16 é equivalente. A assertion sugerida na lacuna 3 mata o E13 |
| F1: pill "Categoria removida" em Todo mês igual a `--surface-strong`; barras "Sem categoria" e "Categoria removida" iguais a `--grafico-barra` | passa | E1: esperado `rgb(238, 240, 243)`, recebido `rgb(215, 247, 237)`. E2: esperado `rgb(91, 97, 110)`, recebido `rgb(210, 101, 157)` | O teste sugerido na lacuna 1 passa hoje e mata os dois |
| F2: lista com "categoria Beta", "Categoria Ômega", "Categoria Um" e "Categoria Zeta" | passa, na ordem do português | E7 e E8: "Categoria Ômega" e "categoria Beta" fora do lugar | O teste sugerido na lacuna 2 passa hoje e mata os dois |
| F4: `criarCategoria` da action, e `cor` lida do banco | passa (`null`) | B4: `verde` | O teste sugerido na lacuna 4 passa hoje e mata o B4 |
| Hover do escuro: a barra contra o trilho composto sobre `--surface-soft` (`#101216`) | de 2,791 (marrom) a 2,817 (verde-água) | — | Confirma o ponto 2 do autor: cerca de 2,8:1 |
| Hydration com `reducedMotion: "reduce"`, por `emulateMedia` e por `test.use`, em `/2026-03`, `/2026-04` e Categorias | 0 avisos de hydration; 0 também sem movimento reduzido | — | O ponto 4 do autor não se reproduziu aqui |
| `e2e/categorias.spec.ts` inteiro, sem mutação | 5 de 5 | — | Base do sensor de e2e |

### Notas

- **Por que C16 não é lacuna.** A regra global de `select` está fora de camada (`globals.css`, comentário
  do chevron), e o CSS fora de camada vence a utilitária do Tailwind 4. Nenhuma classe apaga o chevron.
  Estilo em linha apaga, e é isso que o E13 mostra.
- **E7 e E8 dependem da fixture, não do banco.** A collation do banco de teste (`en_US.utf8`, provedor
  libc) se comporta como código de caractere. A página está certa. O que falha é a fixture, cuja ordem é
  a mesma nas três regras.

---

## Os quatro pontos do autor

### 1. Arquivada com nome e cor nos chips, neutra no seletor, "Categoria removida" nas outras telas

É uma **⚠️ lacuna de precisão da spec (A)** e uma decisão do dono. Não fere AC.

- Em Lançamentos, os chips recebem a cor de `todasAsCategorias`
  (`src/app/(app)/[competencia]/lancamentos/page.tsx:166`). Por isso a arquivada sai com nome e cor.
- O seletor usa só as disponíveis como opções, e a arquivada fica neutra. É o que o Edge Case pede.
- Visão geral e Todo mês buscam o nome nas disponíveis, e a arquivada vira "Categoria removida", na
  neutra.

O COR-02 AC 5 manda a "categoria removida" para a neutra, mas não diz se a arquivada conta como removida.
Só o Edge Case do seletor fala de arquivada. O efeito é que a mesma categoria aparece tingida no chip e
neutra no seletor, na mesma tela. Isso também contraria o primeiro Goal ("a mesma em 'Todo mês', em
Lançamentos e na Visão geral").

**Correção sugerida.** O dono escolhe uma das duas:

- (a) a spec diz que a arquivada fica na neutra em todo lugar, e `lancamentos/page.tsx:166` passa
  `cor: null` para as arquivadas;
- (b) a spec diz que a arquivada mantém a cor no chip, e o Edge Case explica a diferença.

A opção (a) é a coerente com o seletor da mesma tela.

Hoje o caso aparece no seed ("Categoria Seis", arquivada) e na importação. O app ainda não arquiva.

### 2. No hover do escuro, a barra mede cerca de 2,8:1 contra o trilho

É **observação para o dono**. Não fere AC.

- Medi de 2,791 a 2,817 nas dez cores.
- O COR-02 AC 3 define a medida: "o que conta é a cor dele composta sobre o canvas". O hover compõe o
  trilho sobre `--surface-soft`, que é outro estado.
- `docs/design.md:314-317` registra a exceção e o motivo: estado de passagem, só de ponteiro, com valor e
  porcentagem impressos.
- No claro o trilho é opaco, e o hover não o muda.

Se o dono quiser 3:1 também no hover, há dois caminhos: tirar o fundo de hover das linhas do gráfico no
escuro, ou subir o alfa do trilho e remedir as barras. A segunda mexe na T13.

### 3. Trocar só a caixa ("mercado" → "Mercado") grava

É uma **⚠️ lacuna de precisão da spec (B)**. A escolha do autor é defensável e está testada
(`categorias.integration.test.ts:297-309`).

O Edge Case diz "igual ao atual", sem dizer a regra de igualdade. O cadastro inline ignora a caixa para
dizer "já existe". O renomear considera igual a mesma grafia depois de normalizar os espaços
(`categorias.ts:200`, `lista-de-categorias.tsx:176`). Assim dá para corrigir a caixa.

Efeito colateral que a spec também não cobre: renomear congela a cor. Uma categoria na "Automática" que
só troca a caixa passa a ter a cor gravada, igual à automática, porque `corAutomatica` ignora a caixa. Na
tela, "Automática (X)" desmarca e "X" fica marcada. A cor não muda.

**Correção sugerida**: o Edge Case passa a dizer "igual depois de normalizar os espaços; mudar só a caixa
é renomear".

### 4. Movimento reduzido e o aviso de hydration da `TransicaoMes`

É **observação fora da fatia**. Não fere AC.

- A sonda não reproduziu o aviso: 0 avisos com `reducedMotion: "reduce"`, por `emulateMedia` e por
  `test.use`, em `/2026-03`, `/2026-04` e na tela de Categorias.
- `src/components/transicao-mes.tsx` não está no diff da fatia.
- O mecanismo plausível existe: `useReducedMotion()` devolve nulo no servidor e pode devolver `true` no
  cliente, e a árvore muda em `:48-53`.

Nenhuma assertion antiga foi enfraquecida:

- o único arquivo e2e do diff é o novo `e2e/categorias.spec.ts`;
- `e2e/acessibilidade.spec.ts:190` continua com `reducedMotion: "reduce"`;
- a suíte inteira passa (82 de 82).

Os e2e de cor desta fatia não precisam de movimento reduzido:

- o tema é trocado antes do `goto` (`categorias.spec.ts:296-301`);
- o ponteiro sai de cima das barras;
- o `Chip` não tem transição;
- os chips de filtro nascem na cor final.

Se o aviso voltar, ele vira task própria, fora desta fatia.

---

## Code Quality

| Princípio | Status |
| --- | --- |
| Código mínimo | ✅ Um módulo de domínio, um mapa de classes, `Chip` com `cor`, duas actions, um componente de tela |
| Mudanças cirúrgicas | ✅ Fora da fatia, só o necessário: o `include` de `vitest.config.ts`, para `src/components/**/*.test.ts` rodar, e o `px-1` da navegação no celular, para o COR-04 AC 10 |
| Sem escopo extra | ✅ `atualizarCategoria` fica fora da port, como `criarUsuario`; o `MENSAGEM_CATEGORIA_INEXISTENTE` serve a linha sem seletor |
| Segue os padrões | ✅ `requireSession()` na primeira instrução, Zod `strictObject`, `ResultadoAction`, `ERRO_INESPERADO` com referência, domínio sem `Date` nem exceção |
| Resultado afirmado igual ao da spec | ❌ COR-02 AC 5 (página), COR-03 AC 2 (chevron), COR-04 AC 2 (ordem), COR-01 AC 5 (inline) |
| Cobertura por camada | ⚠️ e2e atravessa as quatro telas no caso colorido; não no neutro (L-014) |
| Todo teste mapeia um AC, edge case ou Done-when | ✅ |
| Guias do projeto (`AGENTS.md`) | ✅ Regras 1 a 5; centavos e competência não são tocados pela fatia |

---

## Gate Check

- **Comandos**: `pnpm test:unit`, `pnpm typecheck` e `pnpm lint`, na worktree da fatia.
  Integração e e2e rodaram com `DATABASE_URL_TEST=…/mybilling_test_trc`.
- **Resultado**:
  - `test:unit`: 1652 de 1652, em 102 arquivos, com 100% de branches em `src/domain` (353 de 353).
  - `typecheck`: verde. `lint`: verde, 299 arquivos.
  - Integração da fatia: 96 de 96 na worktree da fatia (`categorias.integration`,
    `cadastro.repository.integration`, `seed.integration`). Integração inteira: 363 de 363, em 23
    arquivos, na cópia descartável da HEAD.
  - e2e: `e2e/categorias.spec.ts` 5 de 5 na worktree da fatia; a suíte inteira 82 de 82 na cópia
    descartável da HEAD.
  - `pnpm build` não foi repetido: é relato do autor.
- **Antes da fatia** (`8419c29`, na worktree descartável): 1425 testes de unidade em 98 arquivos.
- **Delta**: +227 testes e +4 arquivos de unidade. Nenhum teste apagado, nenhum `skip`, `only` ou
  `fixme` no diff.
- **Integridade**: as linhas removidas dos testes antigos são só fixtures que ganharam `cor`, e os
  números esperados das migrations (4 → 5). O `registro-de-importacao.integration.test.ts` passou a
  esperar também a `0004`.

---

## Lacunas, em ordem de gravidade

1. **COR-02 AC 5 na composição das páginas (E1, E2).** Em `src/app/(app)/[competencia]/page.tsx:186` e
   `src/app/(app)/[competencia]/fixos/page.tsx:105`, a página decide que a removida vai sem cor, e nenhum
   teste atravessa essa decisão.
   - **Teste que discrimina**: em `e2e/categorias.spec.ts`, semear uma categoria arquivada com um fixo e
     um gasto de março, e um gasto de março sem categoria. Depois:
     - em Todo mês, exigir que a pill "Categoria removida" tenha o `backgroundColor` de
       `corDoToken(page, "--surface-strong")`;
     - na Visão geral, exigir que as barras "Sem categoria" e "Categoria removida" tenham o de
       `--grafico-barra`.
   - Provado na sonda F1: passa hoje, morre com E1 e com E2.
2. **COR-04 AC 2, a ordem alfabética (E7, E8).** A fixture de `e2e/categorias.spec.ts:63-64` e
   `:326-330` está na mesma ordem para o português, para o código de caractere e para o banco.
   - **Teste que discrimina**: acrescentar categorias cuja ordem no português difira das outras duas,
     como "categoria Beta" (minúscula), "Categoria Ômega" e "Categoria Zeta", e exigir
     `["categoria Beta", …, "Categoria Ômega", …, "Categoria Zeta"]`.
   - Provado na sonda F2: passa hoje, morre com E7 e com E8.
   - Outra saída: extrair a ordenação para uma função pura com teste de unidade.
3. **COR-03 AC 2, o chevron (E13).** `src/components/seletor-de-categoria.test.tsx:297-307` prova só a
   ausência de classe, e o comentário aponta um e2e que não existe.
   - **Teste que discrimina**: em `e2e/categorias.spec.ts:369-371`, exigir
     `getComputedStyle(seletor).backgroundImage` contendo `url(`, junto do `backgroundColor` verde.
   - Provado na sonda: passa hoje, morre com E13.
   - Corrigir também o comentário de `:297-298`.
4. **COR-01 AC 5, o cadastro inline (B4), baixa.** `src/app/actions/categorias.ts:89` não tem teste que
   leia `cor`.
   - **Teste que discrimina**: em `src/app/actions/categorias.integration.test.ts`, chamar
     `criarCategoria({ nome: "Categoria Nova" })` e exigir `cor` nula no banco.
   - Provado na sonda F4: passa hoje, morre com B4.

**Lacunas de precisão da spec**, fora do veredito:

- **A.** O COR-02 AC 5 não diz se arquivada é removida. É o ponto 1 do autor.
- **B.** O Edge Case "nome igual" não diz a regra de igualdade. É o ponto 3 do autor.

**Observações**:

- O ponto 2, o hover do escuro: pendência do dono.
- O ponto 4, o aviso de hydration: não reproduzido e fora da fatia.
- O laço de contraste dos chips (`e2e/categorias.spec.ts:545-551`) não afirma quantos chips mediu. Com a
  lista vazia, passaria sem medir nada (L-030). Sugestão: `expect(chips.length).toBeGreaterThan(0)`
  antes do laço.

---

## Fix Plans

### F1: A neutra de "Sem categoria" e da removida na composição das páginas

- **Causa**: a regra "removida → `cor: null`" mora nas páginas. Os testes de componente recebem `null`
  pronto, e o e2e só atravessa o caso colorido.
- **Task**: em `e2e/categorias.spec.ts`, um percurso com gasto sem categoria e uma categoria arquivada
  com fixo e gasto, medindo o `backgroundColor` contra `--surface-strong` (pill de Todo mês) e
  `--grafico-barra` (barras da Visão geral).
- **Done when**: o percurso passa na HEAD; reaplicados, E1 e E2 morrem.
- **Prioridade**: Major.

### F2: A ordem alfabética que discrimina

- **Causa**: os nomes da fixture estão na mesma ordem nas três regras.
- **Task**: nomes com minúscula inicial e com acento (sem dado real) no percurso de Categorias, e a
  ordem do português afirmada.
- **Done when**: E7 e E8 morrem.
- **Prioridade**: Major.

### F3: O chevron medido no navegador

- **Causa**: a prova é a ausência de nome de classe.
- **Task**: no percurso "Verde", afirmar o `backgroundImage` computado do seletor com `url(`, e corrigir
  o comentário de `seletor-de-categoria.test.tsx:297-298`.
- **Done when**: E13 morre.
- **Prioridade**: Minor.

### F4: O cadastro inline nasce sem cor

- **Task**: um caso em `src/app/actions/categorias.integration.test.ts` que cria pela action e lê `cor`
  do banco.
- **Done when**: B4 morre.
- **Prioridade**: Minor.

### F5 (spec, decisão do dono): arquivada e "nome igual"

- **Task**: o dono decide a cor da arquivada no chip (ponto 1) e a regra de igualdade do Edge Case
  (ponto 3). O resultado entra no `spec.md`.
- Se a decisão for a opção (a) do ponto 1, entra também a mudança de `lancamentos/page.tsx:166`, com o
  teste.

---

## Requirement Traceability Update

**Proposta, não aplicada.** O veredito é FAIL, e o `spec.md` e o `tasks.md` ficam como o autor deixou.

| Requirement | Status anterior | Status novo |
| --- | --- | --- |
| COR-01 | Implemented | ❌ Needs Fix (F4, baixa) |
| COR-02 | Implemented | ❌ Needs Fix (F1) |
| COR-03 | Implemented | ❌ Needs Fix (F3) |
| COR-04 | Implemented | ❌ Needs Fix (F2) |
| COR-05 | Implemented | ✅ sem lacuna; vira Verified quando a fatia passar |

---

## Lições registradas

Registradas com `lessons.py`; estão em `.specs/LESSONS.md`.

| Lição | Sinal | Origem |
| --- | --- | --- |
| L-035 | `surviving_mutant` | E1, E2: a prova de composição precisa atravessar também o ramo neutro |
| L-036 | `surviving_mutant` | E7, E8: a fixture de ordenação precisa divergir da ordem do banco e da do código de caractere |
| L-037 | `surviving_mutant` | E13: efeito visual mantido se prova no estilo computado, e não pela ausência de classe |
| L-038 | `surviving_mutant` | B4: uma assertion em cada porta de entrada que cria |
| L-039 | `spec_precision_gap` | Lacuna A: se arquivado conta como removido |
| L-040 | `spec_precision_gap` | Lacuna B: a regra de igualdade do "valor igual ao atual" |

**A L-014 foi penalizada uma vez** (`harmful=1`, continua `confirmed`). Ela estava carregada nas Global
Constraints de `tasks.md`, e a mesma falha voltou: a garantia do ramo neutro foi provada em cada elo,
sem teste que atravessasse a composição.

---

## Summary

**Overall**: ❌ Not Ready.

**Spec-anchored check**: 25 de 29 critérios provados por inteiro; 4 com uma parte sem discriminação; 2
lacunas de precisão.
**Sensor**: 72 de 79 mortos, 1 equivalente e 6 vivos que quebram critério.
**Gate**: unit 1652, integração 363, e2e 82, `typecheck` e `lint` verdes.

**O que funciona**:

- o domínio determinístico, provado por propriedade;
- o `CHECK` e o repositório;
- as duas actions, com sessão, recusa, falha e revalidação;
- a mesma cor computada nas quatro telas, no caso colorido;
- o contraste medido no navegador nos dois temas, com mutantes de token mortos dos dois lados do
  limiar;
- os 400 px;
- a navegação;
- os nomes acessíveis intactos.

**Próximos passos**: F1 a F4 como fix tasks e F5 com o dono. Depois, a re-verificação reaplica E1, E2,
E7, E8, E13 e B4 sozinhos.
