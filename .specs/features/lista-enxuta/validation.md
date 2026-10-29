# Lista de Lançamentos enxuta — Validação

## Validation: lista-enxuta — **PASS**

**Result**: PASS ✅ — rodada 2 (2026-10-29, `c2b1d3e`). F1, F2 e F3 fecham as três lacunas que
davam o veredito da rodada 1, e a F4 fecha a lacuna de precisão do LST-01 AC 9. Cada mutante que
vivia morre, reaplicado sozinho: U15b no unit, E5 nas três larguras, e a volta do chip de antes no
e2e. Nenhum resto do possível dado real sobrou nos 16 commits da fatia. O gate está verde, e a
suíte e2e inteira passa (77 de 77). Os 29 critérios têm assertion sobre o resultado da spec, e
todo mutante que quebra critério morre. A parcela em duas linhas (lacuna 5) é decisão pendente do dono e não pesa no
veredito. Detalhe na seção [Rodada 2](#rodada-2), no fim do arquivo. A rodada 1 segue abaixo como
foi escrita, com os hashes de antes da limpeza do ramo.

**Rodada 1** (2026-10-29, `fcc88cf`, hash de antes da limpeza do ramo): FAIL ❌. O gate está
verde, os 29 critérios têm teste, e 43 dos 46 mutantes morreram (o E4a sobrevive ao e2e, mas o
U16 já o mata no unit). O
veredito vem de três critérios que não se sustentam: um defeito visível que nenhum teste vê e dois
mutantes vivos que quebram critério. Nenhum dos três pede mudança grande, e as três correções já foram
provadas numa sonda: o teste sugerido falha no estado de hoje ou no mutante, e passa com a correção.

1. **O chip mostra "Nome ·R$ X", sem o espaço depois do "·" (LST-01 AC 1).** O `CHIP` é
   `inline-flex` (`src/components/chips-de-categoria.tsx:34-36`), e o botão tem três filhos soltos
   (`:83-85`): o nome, o texto `" · "` e o `<span>` do valor. Os dois nós de texto viram um item
   anônimo de flex, o espaço do fim desse item é aparado, e o `<span>` vira outro item, colado no
   "·". No Chrome, a folga entre o glifo "·" e o "R" é **0 px** nos seis chips. O `textContent` e o
   nome acessível continuam "Categoria Um · R$ 200,00", e é isso que os testes leem
   (`src/components/chips-de-categoria.test.tsx:60`, `e2e/lista-enxuta.spec.ts:222`). Confirma o
   que o orquestrador viu nos prints.
2. **"(última)" já na penúltima parcela passa verde (U15b e E6; LST-05 AC 1).** Trocar
   `parcela.restantes === 0` por `<= 1` em `src/components/tabela-lancamentos.tsx:308` mantém os
   1424 testes de unidade e o e2e de compra parcelada verdes. Os testes só usam `restantes` 0 e 2. O
   e2e da penúltima (`e2e/compra-parcelada.spec.ts:181`) afirma só "9/10".
3. **Só a tabela do Cartão é medida (E5; LST-05 AC 3).** O AC diz "nenhuma tabela da lista". O
   e2e mede só a do Cartão (`e2e/lista-enxuta.spec.ts:382-390`). Com a tabela de Fixos 16 px mais
   larga que a coluna, ele passa nas três larguras.

Fora do veredito, mas antes de qualquer push:

- **Risco AD-009, a confirmar com o dono.** Os exemplos numéricos de LST-01 AC 1 e LST-02 AC 1
  (`spec.md:71`, `:103-104`, `tasks.md:224`) foram copiados para dois comentários de produção
  (`src/components/tabela-lancamentos.tsx:211`, `src/components/bloco-recolhivel.tsx:60`) e para a
  fixture `src/components/chips-de-categoria.test.tsx:19` (e as asserções `:62`, `:70`, `:111`,
  `:130`). Daqui não dá para saber se são valores reais. O indício: o exemplo de LST-02 AC 1 começa
  pela mesma contagem de fixos que o Problem Statement atribui ao mês real do dono. O teste da
  tabela evitou copiar o exemplo de propósito (`tabela-lancamentos.test.tsx:901-902`); o dos chips
  não. O ramo não tem remoto (`git branch -r` lista só `origin/main`), então, se forem reais, ainda
  dá para limpar o ramo antes do merge.
- **⚠️ Duas lacunas de precisão na spec**, descritas em [Lacunas](#lacunas-em-ordem-de-gravidade).

**Data**: 2026-10-29
**Spec**: `.specs/features/lista-enxuta/spec.md` (LST-01 a LST-05, 29 critérios, 3 edge cases)
**Faixa do diff**: `09a9156..fcc88cf`, 10 commits: T1 a T9 e o ajuste do seletor em 400 px
(`5dfa5a2`). A base `09a9156` é o commit da spec.
**Verificador**: sub-agente independente (autor ≠ verificador). Leitura apenas sobre o código e os
testes da fatia. As mutações rodaram numa `git worktree` descartável, em modo detached no
`fcc88cf`, no scratchpad, com `pnpm install --offline` próprio. Os e2e rodaram ali, um de cada vez
na porta 3100, com `DATABASE_URL_TEST=…/mybilling_test_trc`. **Nenhum `git stash`.** O porcelain da
worktree da fatia foi gravado antes (vazio) e conferido no fim (vazio), e a worktree descartável foi
removida (`git worktree list` sem ela). O checkout principal e as outras worktrees não foram
tocados.

---

## Task Completion

| Task | Commit | Status | Notas |
| --- | --- | --- | --- |
| T1 | `57292ad` | ✅ Done | `SEM_CATEGORIA` e o filtro que o reconhece |
| T2 | `d3e1ca8` | ✅ Done | `ChipsDeCategoria`. O texto visível foge do AC 1 (lacuna 1); a fixture copia o exemplo da spec (risco AD-009) |
| T3 | `0fa4af9` | ✅ Done | Chips no cartão e totais vindos da página |
| T4 | `071b823` | ✅ Done | Blocos que recolhem e cookie. `SPEC_DEVIATION` em `src/lib/blocos-recolhidos.ts:19` (`AVULSOS` no lugar de `GASTOS_DO_MES`), corrigido no Design pela T9 |
| T5 | `9555272` | ✅ Done | Barra compacta |
| T6 | `f519bcf` + `5dfa5a2` | ✅ Done | Parcela sob a descrição; o seletor com `w-full` abaixo de `md` em commit próprio. O limiar de "(última)" não tem teste (lacuna 2) |
| T7 | `a8cf884` | ✅ Done | Gráfico com links |
| T8 | `a6fc7c0` | ✅ Done | `e2e/lista-enxuta.spec.ts`, 9 percursos. Mede só a tabela do Cartão (lacuna 3) |
| T9 | `fcc88cf` | ✅ Done | Roadmap e traceability |

9 tasks, todos os itens marcados. Cada um dos 10 commits traz `tasks.md` e `spec.md`, e todos
passam no `check_commit.py`.

---

## Critérios de aceitação, ancorados na spec

Legenda: ✅ a assertion afirma o resultado que a spec define, e o mutante que o quebra morre ·
❌ a assertion não prova o critério inteiro · ⚠️ a spec não define o resultado com precisão.
"Espelha" indica teste que prende o nome de uma classe ou o texto do CSS, e não o efeito; o efeito
foi medido na sonda, quando dito.

### LST-01 — Filtrar por categoria com o total

| AC | Resultado definido pela spec | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| 1 | No cartão, no lugar do select, um chip por categoria com despesa, com o texto "Nome · R$ X", do maior gasto para o menor | `src/components/chips-de-categoria.test.tsx:60` — `textos(chips())` igual a `["Categoria Um · R$ 1.234,56", …]`, lido do `textContent`; `src/components/filtros-de-lancamentos.test.tsx:168-172` — nenhum combobox "Categoria" e os três outros; `:179`; `src/application/mes/totais-por-categoria.test.ts:62-66` — Y, X e Sem categoria, do maior para o menor; `e2e/lista-enxuta.spec.ts:222` — os seis chips na ordem; `:224` — sem select no cartão | ❌ Lugar, ordem e `textContent` provados (U3, U29, U30 mortos). O texto **visível** não: 0 px entre "·" e "R$" nos seis chips, e nenhum teste lê o layout (lacuna 1) |
| 2 | O gasto vem de `resumoPorCategoria`, igual ao da Visão geral, e não muda com outro filtro | `totais-por-categoria.test.ts:80` — cada gasto igual ao de `resumoPorCategoria`; `:87-91` — despesa de outra competência fora; `e2e/lista-enxuta.spec.ts:238` — o mesmo valor na barra da Visão geral; `:242` — os seis chips iguais com `busca=Gasto` | ✅ U1, U2 e E1 mortos (E1 em `:242`) |
| 3 | Com despesa sem categoria, o chip "Sem categoria", que filtra por `sem-categoria` | `totais-por-categoria.test.ts:101` — `sem?.id` é `"sem-categoria"`; `:107-109` — sem esse gasto, sem o chip; `e2e/lista-enxuta.spec.ts:270`, `:283-284` | ✅ |
| 4 | Mais de 6: os 6 maiores e "+N categorias" com `aria-expanded`, que revela os outros na mesma coleção, com quebra de linha e sem corte | `chips-de-categoria.test.tsx:149-150` — 6 chips e `aria-expanded="false"`; `:159-166` — 9, `"true"` e o botão na mesma lista; `:176-177`; `:183` (singular); `:189-190`; `:197-202` — `flex-wrap` e nenhum `overflow-hidden`/`truncate` (espelha); `e2e/lista-enxuta.spec.ts:263-281` — revela os quatro e mede cada chip dentro do cartão | ✅ U7, U28 mortos |
| 5 | Tocar grava `categoriaId` e mantém os outros filtros | `chips-de-categoria.test.tsx:113-114`, `:123`; `filtros-de-lancamentos.test.tsx:190-194` — uma navegação, com busca, meio, pessoa e situação mantidos; `e2e/lista-enxuta.spec.ts:226-231`, `:244-248` | ✅ U33 morto |
| 6 | Tocar no ativo tira o filtro de categoria | `chips-de-categoria.test.tsx:132-133` — `aoEscolher(null)`; `filtros-de-lancamentos.test.tsx:203` — `?situacao=PAGO`; `e2e/lista-enxuta.spec.ts:251-254` | ✅ U6 morto |
| 7 | Botão com `aria-pressed="true"` só no ativo | `chips-de-categoria.test.tsx:78`, `:88`, `:102`; `filtros-de-lancamentos.test.tsx:210`, `:216`; `e2e/lista-enxuta.spec.ts:228`, `:424` | ✅ U4, U5 mortos |
| 8 | A contagem nova anunciada uma vez, como frase, em `role="status"` | `filtros-de-lancamentos.test.tsx:224-226` — uma região só, com "2 lançamentos com 1 filtro. Total R$ 120,00" | ✅ U19 morto |
| 9 | Com `categoriaId=sem-categoria`, só os lançamentos sem categoria | `src/application/mes/filtrar-lancamentos.test.ts:148-151`; `:160-163` — a receita sem categoria fica de fora; `:178-180`; `e2e/lista-enxuta.spec.ts:283-287` | ✅ U8, U9 mortos. ⚠️ A spec não diz se a receita sem categoria entra; o código a tira, coerente com TRC-01 e com o total do chip (lacuna de precisão B) |

### LST-02 — Blocos que recolhem

| AC | Resultado definido pela spec | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| 1 | No cabeçalho dos quatro blocos, "N · R$ X · M a pagar", com os filtros ativos | `src/components/tabela-lancamentos.test.tsx:985` — 26 fixos, 6 pagos: "… · 20 a pagar"; `:991-996` — os quatro blocos; `:1003-1004` — vencido conta como a pagar; `e2e/lista-enxuta.spec.ts:298`, `:309`. O resumo sai das mesmas linhas que a tabela desenha (`tabela-lancamentos.tsx:259`), que a página passa já filtradas (`page.tsx:259`) | ✅ U11, U37 mortos |
| 2 | O cabeçalho recolhe e expande, com `aria-expanded` e `aria-controls` | `tabela-lancamentos.test.tsx:1024-1025`; `:1034-1043` — as linhas somem e voltam, só no bloco acionado; `e2e/lista-enxuta.spec.ts:299-304` | ✅ U25 morto |
| 3 | O estado vai para o cookie `blocos-recolhidos` | `tabela-lancamentos.test.tsx:1052`, `:1055`, `:1058`, `:1067`; `:1078-1080` — `path=/` e um ano; `src/lib/blocos-recolhidos.test.ts:12` | ✅ U10, U26 mortos |
| 4 | Com o cookie, o servidor já renderiza o bloco fechado | `tabela-lancamentos.test.tsx:1093-1098` — `renderToStaticMarkup` com `hidden`; `:1106-1108`; `e2e/lista-enxuta.spec.ts:306-316` — recarregar e o HTML com `linhas-fixos` `hidden` | ✅ U24 e E2 mortos (E2 em `:307`) |
| 5 | Sem cookie, todos abertos | `tabela-lancamentos.test.tsx:1115`; `blocos-recolhidos.test.ts:16`, `:20`; `e2e/lista-enxuta.spec.ts:299` (contexto novo, sem cookie) | ✅ U24 morto |

### LST-03 — Barra compacta de filtros ao rolar

| AC | Resultado definido pela spec | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| 1 | Com o cartão fora da tela, barra fixa no topo com busca, filtros ativos e "Filtros" | `src/components/barra-de-filtros-compacta.test.tsx:126-128`; `:135` — `fixed` e `top-0`; `e2e/lista-enxuta.spec.ts:330-336` | ✅ U38 morto |
| 2 | Com o cartão visível, sem barra | `barra-de-filtros-compacta.test.tsx:118-119`; `:143` — some quando o cartão volta; `e2e/lista-enxuta.spec.ts:328`, `:342-343` | ✅ U12 morto |
| 3 | A busca da barra grava o mesmo `busca`, com a mesma espera de 250 ms | `barra-de-filtros-compacta.test.tsx:154-157` — nada aos 249 ms, `?busca=agua` aos 250; `:168-170`; `:190-199` — o cartão segue a busca da barra | ✅ U20 morto |
| 4 | Cada filtro ativo é um botão "nome ×", chamado "Tirar o filtro <nome>", que tira só ele | `barra-de-filtros-compacta.test.tsx:227` — "Casa ×"; `:237-238` — só `categoriaId` sai; `:248`; `src/application/mes/filtros-ativos.test.ts:27-44`, `:48-50`; `e2e/lista-enxuta.spec.ts:335-340` | ✅ U13, U34 mortos |
| 5 | "Filtros" rola até o cartão e foca o primeiro controle | `barra-de-filtros-compacta.test.tsx:261-263` | ✅ U21 morto |
| 6 | `scroll-padding-top` com a altura da barra | `barra-de-filtros-compacta.test.tsx:271-274` — lê `globals.css` (espelha); `:281` — a barra usa o mesmo token | ✅ U23 morto |
| 7 | Em 400 px, no máximo 2 filtros e "+N", sem rolagem horizontal | `barra-de-filtros-compacta.test.tsx:298-303` (classes); `e2e/lista-enxuta.spec.ts:360-364` — 2 visíveis, "+1" e transbordo 0 | ✅ U22 morto |

### LST-04 — Visão geral leva à lista

| AC | Resultado definido pela spec | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| 1 | A barra abre a lista da mesma competência com o `categoriaId` dela | `src/components/grafico-categorias.test.tsx:40-42` — `/2026-03/lancamentos?categoriaId=cat-1`; `:71-76`; `e2e/lista-enxuta.spec.ts:422-426` — o chip dela pressionado e só a compra dela | ✅ U17 morto |
| 2 | "Sem categoria" abre com `categoriaId=sem-categoria` | `grafico-categorias.test.tsx:48-52`; `e2e/lista-enxuta.spec.ts:429-434` | ✅ U18 e E3 mortos (E3 em `:430`) |
| 3 | O link mantém o texto da barra (nome, valor e porcentagem) | `grafico-categorias.test.tsx:58-64` — "Categoria Um R$ 300,00 75,00%" | ✅ |

### LST-05 — Tabela do Cartão dentro da margem

| AC | Resultado definido pela spec | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| 1 | Sob a descrição, "n/t · (faltam N depois desta)" ou "(última)" | `tabela-lancamentos.test.tsx:413-414` — "2/4 · (faltam 2 depois desta)" na célula da descrição; `:421` — "4/4 · (última)"; `:518`; `e2e/lista-enxuta.spec.ts:394-406` — na célula e abaixo do texto; `e2e/compra-parcelada.spec.ts:176-178`, `:184` | ❌ Lugar e textos provados (U14b, U15a mortos). O limiar não: U15b vivo no unit e E6 vivo no e2e, porque nenhum caso tem `restantes` 1 (lacuna 2) |
| 2 | Sem coluna "Parcela" em bloco nenhum | `tabela-lancamentos.test.tsx:432-434` — 4 tabelas, nenhum `columnheader` "Parcela"; `:517`; `e2e/lista-enxuta.spec.ts:407-409` — Descrição, Categoria, Data, Situação, Valor | ✅ U14a morto |
| 3 | A 1024, 1280 e 1440 px, **nenhuma** tabela mais larga que a coluna de conteúdo | `e2e/lista-enxuta.spec.ts:382-390` — `boundingBox` só da tabela do Cartão; `:391` — sem transbordo da página | ❌ E4b morto (1090,36 > 1000,5 em 1024). E5 vivo: Fixos 16 px além da coluna, nas três larguras (lacuna 3) |
| 4 | 36 px com ponteiro fino; 44 px no toque | `src/components/seletor-de-categoria.test.tsx:311` — classes `min-h-11` e `pointer-fine:min-h-9` (espelha) | ✅ U32 morto. Sonda no Chrome: 36 px com `pointer: fine`, 44 px com `hasTouch` |
| 5 | Largura fixa a partir de `md`, com o nome inteiro da escolhida no `title` | `seletor-de-categoria.test.tsx:273`, `:279`, `:282`, `:291` — o `title`, a otimista inclusive; `:297` — `md:w-44` (espelha) | ✅ U16, U31 mortos. Sonda: 176 px a 1280 |

### Edge Cases

| Edge case | `file:line` + assertion | Resultado |
| --- | --- | --- |
| Mês sem despesa, sem chips | `chips-de-categoria.test.tsx:210` — nada renderiza; `totais-por-categoria.test.ts:127` — `[]` só com receita | ✅ |
| O filtro esvazia um bloco: "0" e a frase de bloco vazio | `tabela-lancamentos.test.tsx:1013-1014` — "0 · R$ 0,00 · 0 a pagar" e "Nenhum lançamento neste bloco." | ✅ |
| Cookie com bloco que não existe é ignorado | `blocos-recolhidos.test.ts:37`; `tabela-lancamentos.test.tsx:1122-1124` | ✅ U27 morto |

**Status**: ❌ 26 de 29 critérios provados por inteiro. LST-01 AC 1, LST-05 AC 1 e LST-05 AC 3 têm
uma parte sem prova. Duas lacunas de precisão na spec (A e B), que não pesam no veredito.

### Testes que espelham a implementação

São seis, e nenhum esconde defeito hoje:

- 36/44 px do seletor (LST-05 AC 4);
- `md:w-44` (AC 5);
- `globals.css` lido como texto (LST-03 AC 6);
- as classes do "+N" em 400 px (LST-03 AC 7);
- `flex-wrap` sem `overflow-hidden` nos chips (LST-01 AC 4);
- as classes da segunda linha da parcela (`tabela-lancamentos.test.tsx:52-54`).

Os três últimos também têm prova no layout, no e2e: `e2e/lista-enxuta.spec.ts:360-364`, `:272-281` e
`:398-406`. Os três primeiros só a têm na sonda deste relatório. Uma variante do Tailwind renomeada
passaria verde nesses testes, sem o efeito.

---

## Discriminação (sensor)

46 mutantes: 38 de unidade e componente, contra os arquivos de teste da camada, e 8 de página ou
layout, contra o percurso e2e com `-g`. Cada um foi aplicado sozinho na worktree descartável e
desfeito com `git checkout`. Os sobreviventes do unit rodaram de novo contra a suíte unitária
inteira.

| Mutante | Arquivo:linha | Falha injetada | Resultado |
| --- | --- | --- | --- |
| U1 | `src/application/mes/totais-por-categoria.ts:30` | os totais somam a receita | ✅ morto (`totais-por-categoria.test.ts:62`, `:80`) |
| U2 | `totais-por-categoria.ts:30` | os totais ignoram a competência | ✅ morto (`:87`) |
| U3 | `totais-por-categoria.ts:42` | sem ordenar do maior para o menor | ✅ morto (`:62`) |
| E1 | `src/app/(app)/[competencia]/lancamentos/page.tsx:161` | a página soma os chips sobre a lista já filtrada | ✅ morto (`e2e/lista-enxuta.spec.ts:242`) |
| U4 | `src/components/chips-de-categoria.tsx:75` | chip sem `aria-pressed` | ✅ morto (`chips-de-categoria.test.tsx:60`, `:78`) |
| U5 | `chips-de-categoria.tsx:75` | `aria-pressed` sempre `true` | ✅ morto (`:78`, `:88`; `filtros-de-lancamentos.test.tsx:216`) |
| U6 | `chips-de-categoria.tsx:76` | tocar no chip ativo não limpa | ✅ morto (`:133`; `filtros-de-lancamentos.test.tsx:203`) |
| U7 | `chips-de-categoria.tsx:61` | "+N" corta: no máximo 6, sempre | ✅ morto (`:102`, `:159`) |
| U28 | `chips-de-categoria.tsx:53` | a ativa além das 6 fica escondida | ✅ morto (`:102`) |
| U29 | `chips-de-categoria.tsx:69` | chips reordenados por nome | ✅ morto (`:60`) |
| U30 | `chips-de-categoria.tsx:84` | chip sem o separador | ✅ morto (`:60`, `:70`) |
| U8 | `src/application/mes/filtrar-lancamentos.ts:66` | `sem-categoria` não filtra | ✅ morto (`filtrar-lancamentos.test.ts:148`) |
| U9 | `filtrar-lancamentos.ts:67` | `sem-categoria` inclui a receita | ✅ morto (`:160`) |
| E2 | `lancamentos/page.tsx:267` | o servidor ignora o cookie `blocos-recolhidos` | ✅ morto (`e2e/lista-enxuta.spec.ts:307`) |
| U10 | `src/components/bloco-recolhivel.tsx:71` | o clique não grava o cookie | ✅ morto (`tabela-lancamentos.test.tsx:1052`, `:1067`, `:1078`) |
| U24 | `bloco-recolhivel.tsx:66` | ignora o recolhido do servidor | ✅ morto (`:1093`, `:1106`) |
| U25 | `bloco-recolhivel.tsx:81` | `aria-controls` aponta para o título | ✅ morto (`:1025`) |
| U26 | `bloco-recolhivel.tsx:45` | cookie sem `path=/` | ✅ morto (`:1079`) |
| U27 | `src/lib/blocos-recolhidos.ts:45` | o cookie aceita chave desconhecida | ✅ morto (`blocos-recolhidos.test.ts:37`) |
| U11 | `src/components/tabela-lancamentos.tsx:222` | "a pagar" conta também os pagos | ✅ morto (`tabela-lancamentos.test.tsx:985`, `:991`) |
| U37 | `tabela-lancamentos.tsx:222` | vencido não conta como a pagar | ✅ morto (`:1003`) |
| U12 | `src/components/barra-de-filtros-compacta.tsx:55` | a barra não some quando o cartão volta | ✅ morto (`barra-de-filtros-compacta.test.tsx:143`) |
| U13 | `barra-de-filtros-compacta.tsx:116` | o "×" não tira o filtro da URL | ✅ morto (`:237`, `:248`) |
| U21 | `barra-de-filtros-compacta.tsx:70` | "Filtros" não foca o cartão | ✅ morto (`:263`) |
| U22 | `barra-de-filtros-compacta.tsx:33` | 3 filtros no celular | ✅ morto (`:300`) |
| U38 | `barra-de-filtros-compacta.tsx:82` | barra `sticky`, e não fixa | ✅ morto (`:135`) |
| U20 | `src/components/filtros-na-url.ts:62` | a busca espera 200 ms | ✅ morto (`:154`) |
| U33 | `filtros-na-url.ts:35` | `navegarCom` descarta os outros filtros | ✅ morto (`:238`; `filtros-de-lancamentos.test.tsx:191`) |
| U23 | `src/app/globals.css:350-352` | sem `scroll-padding-top` | ✅ morto (`barra-de-filtros-compacta.test.tsx:272`) |
| U19 | `src/components/filtros-de-lancamentos.tsx:135` | a contagem fora de `role="status"` | ✅ morto (`filtros-de-lancamentos.test.tsx:224`) |
| U34 | `src/application/mes/filtros-ativos.ts:48` | `sem-categoria` com o rótulo cru na barra | ✅ morto (`filtros-ativos.test.ts:48`) |
| U14a | `tabela-lancamentos.tsx:269-271` | a coluna Parcela de volta | ✅ morto (`tabela-lancamentos.test.tsx:434`, `:517`) |
| U14b | `tabela-lancamentos.tsx:300-301` | a parcela numa célula própria, fora da descrição | ✅ morto (`:413`, `:421`, `:518`) |
| U15a | `tabela-lancamentos.tsx:309` | "(última)" trocado por "(ultima)" | ✅ morto (`:421`) |
| **U15b** | `tabela-lancamentos.tsx:308` | "(última)" já com `restantes` 1 | ❌ **vivo** (suíte unitária inteira, 1424 de 1424) |
| **E6** | `tabela-lancamentos.tsx:308` | o mesmo U15b, contra o e2e da compra 8/10 | ❌ **vivo** (`e2e/compra-parcelada.spec.ts:181` afirma só "9/10") |
| U16 | `src/components/seletor-de-categoria.tsx:116` | sem `md:w-44` | ✅ morto (`seletor-de-categoria.test.tsx:297`, `:305`) |
| E4a | `seletor-de-categoria.tsx:116` | sem `md:w-44`, mantendo `w-full`, contra o e2e de margem | ➖ vivo no e2e; o U16 o mata no unit (ver Notas) |
| E4b | `seletor-de-categoria.tsx:116` | a classe de antes da fatia: sem `md:w-44` nem `w-full` | ✅ morto (`e2e/lista-enxuta.spec.ts:390`, 1090,36 > 1000,5 em 1024) |
| **E5** | `tabela-lancamentos.tsx:265` | só a tabela de Fixos 16 px mais larga que a coluna | ❌ **vivo** (`e2e/lista-enxuta.spec.ts:376`, nas três larguras) |
| U31 | `seletor-de-categoria.tsx:114` | `title` com o nome errado | ✅ morto (`seletor-de-categoria.test.tsx:279`, `:291`) |
| U32 | `seletor-de-categoria.tsx:116` | sem os 36 px do ponteiro fino | ✅ morto (`:311`) |
| U17 | `src/components/grafico-categorias.tsx:77` | o link da Visão geral sem `categoriaId` | ✅ morto (`grafico-categorias.test.tsx:40`, `:48`) |
| U18 | `grafico-categorias.tsx:77` | o gráfico dá outro id a "Sem categoria" | ✅ morto (`:48`, `:71`) |
| E3 | `src/app/(app)/[competencia]/page.tsx:174` | a Visão geral dá outro id ao grupo nulo | ✅ morto (`e2e/lista-enxuta.spec.ts:430`) |

**Profundidade**: expandida, com 46 mutantes em todas as camadas da fatia. Os 14 pedidos pelo
orquestrador estão todos na tabela: U1/U2/E1, U4/U5, U6, U7, U8/U9, E2, U10, U11, U12, U13,
U14a/U14b, U15a/U15b, U16/E4a/E4b e U17/U18/E3.
**Resultado**: 43 mortos e 1 vivo coberto pelo unit (E4a). **3 vivos quebram critério**: U15b, E6
(o mesmo defeito, nas duas camadas) e E5 — FAIL ❌.

**A L-001 e a L-014 valem para esta fatia.** Os três elos de página só morrem no e2e: E1 (totais
sobre a lista inteira), E2 (cookie lido no servidor) e E3 (id do grupo nulo). Os três morreram.

### Sondas

Cada sonda rodou na worktree descartável, como teste a mais no fim de `e2e/lista-enxuta.spec.ts`.

| Sonda | No `fcc88cf` | Com a mudança | Conclusão |
| --- | --- | --- | --- |
| Chip: folga entre o glifo "·" (um `Range` no nó de texto) e a borda esquerda de `.tabular` | 0 px nos seis chips; `innerText` "Categoria Um ·\nR$ 200,00"; `display: inline-flex` | Com o conteúdo do botão num único `<span>`: 3,94 px nos seis chips; `innerText` "Categoria Um · R$ 200,00" | Hipótese do orquestrador confirmada. A assertion `folga >= 2` falha hoje e passa com a correção. `toHaveText(…, { useInnerText: true })` **não** discrimina: o navegador põe "\n" entre os itens de flex, e o Playwright normaliza para espaço |
| A correção do chip contra os testes de unidade | — | `chips-de-categoria`, `filtros-de-lancamentos` e `barra-de-filtros-compacta`: 60 de 60 | A correção não muda `textContent` nem nome acessível |
| Todas as tabelas contra a coluna, em 1024, 1280 e 1440 | Fixos, Cartão e Gastos do Mês com a borda direita igual à da coluna (1000, 1128, 1208) | Com o E5: Fixos em 1016 contra 1000, e falha | O teste sugerido para a lacuna 3 passa hoje e mata o E5 |
| Penúltima parcela: `parcelaDaCompraB(3, 1)` com "3/4 · (faltam 1 depois desta)" | passa | Com o U15b: recebe "3/4 · (última)" e falha | O teste sugerido para a lacuna 2 passa hoje e mata o U15b |
| Altura e largura do seletor no Chrome | `pointer: fine`: 36 px de altura e 176 px de largura; `hasTouch`: 44 px, `pointer: coarse` | — | LST-05 ACs 4 e 5 valem no navegador, e não só na classe |
| `e2e/lista-enxuta.spec.ts` inteiro, sem mutação | 9 de 9 | — | Base do sensor de e2e |

### Notas

- **E4a não é lacuna.** O que segura a tabela na margem é o `w-full`: um `<select>` com largura em
  porcentagem não impõe a largura mínima da coluna numa tabela automática. Por isso tirar só o
  `md:w-44` mantém a tabela dentro da coluna, e o e2e passa. Mas o AC 5 pede largura fixa, e o U16
  mata a mudança no unit. O e2e de margem pega a volta à classe de antes da fatia (E4b), que é a
  regressão que o dono viu.
- O `SPEC_DEVIATION` de `src/lib/blocos-recolhidos.ts:19` desvia do Design de `tasks.md`, e não da
  spec, que não nomeia as chaves. A T9 corrigiu o Design (`tasks.md:48-50`).

---

## Code Quality

| Princípio | Status |
| --- | --- |
| Código mínimo | ✅ Um caso por módulo; `useFiltrosNaUrl` foi extraído porque cartão e barra o usam, como o Design pedia |
| Mudanças cirúrgicas | ✅ O que mudou fora da fatia é o que ela exige: `[competencia]/page.tsx` passa `SEM_CATEGORIA` e a competência; os e2e antigos estreitam o escopo de `status` |
| Sem escopo extra | ✅ Os extras (a coleção aberta quando a ativa está além das 6, e "Mostrar menos") servem o AC 4 e o LST-04 |
| Segue os padrões | ✅ Centavos inteiros e `formatarBRL` (AD-001); sem `Date` no domínio; a action continua por prop |
| Resultado afirmado igual ao da spec | ❌ LST-01 AC 1 (texto visível), LST-05 ACs 1 e 3 |
| Cobertura por camada | ✅ Unit e componentes em todos os módulos novos; e2e nos três elos de página (L-001, L-014) |
| Todo teste mapeia um AC, edge case ou Done-when | ✅ |
| Guias do projeto (`AGENTS.md`) | ⚠️ Regra 1 (AD-009) a confirmar: ver o risco no topo |

---

## Gate Check

- **Comandos**: `pnpm test:unit`, `pnpm typecheck`, `pnpm lint`, na worktree da fatia.
- **Resultado**: `test:unit`: 1424 de 1424, em 98 arquivos, com cobertura (100% de branches em
  `src/domain`). `typecheck`: verde. `lint`: verde, 289 arquivos.
- **Antes da fatia** (`09a9156`, na worktree descartável): 1333 testes em 92 arquivos.
- **Delta**: +91 testes e +6 arquivos. Nenhum teste apagado, nenhum `skip`, `only` ou `fixme` no diff.
- **e2e**: `e2e/lista-enxuta.spec.ts`, 9 de 9 no `fcc88cf`. A suíte inteira (77 de 77) e
  `pnpm verify` (integração e build) são relato do autor e não foram repetidos.

### Integridade dos e2e antigos (`git diff 09a9156..HEAD -- e2e/`)

Nove `expect` saíram, oito nos e2e e um no unit, e todos voltam iguais ou mais fortes:

- **Seis** trocam `page.getByRole("status")` pela `status` do formulário: `acessibilidade.spec.ts:90`,
  `busca-e-filtros.spec.ts:135`, `compra-parcelada.spec.ts:102` e `:141`, e
  `lancamento-avulso.spec.ts:100` e `:286`. O escopo ficou mais estreito, com o mesmo texto, porque a
  contagem do cartão também virou `status` (LST-01 AC 8).
- **Dois** em `compra-parcelada.spec.ts:176-178` e `:184` passam a afirmar a célula da descrição,
  com o texto inteiro "8/10 · (faltam 2 depois desta)" e "10/10 · (última)". Antes afirmavam a linha
  com um pedaço do texto.
- **Os demais:**
  - `trocar-categoria.spec.ts:169` estreita o toast à região `aria-live` do layout;
  - `busca-e-filtros.spec.ts:217` e `trocar-categoria.spec.ts:278-281` trocam o select pelo chip,
    com as mesmas asserções depois;
  - `busca-e-filtros.spec.ts:95` estreita `search` ao cartão.
- **No unit:** o `columnheader` "Parcela" de `tabela-lancamentos.test.tsx:517` foi invertido para
  `toBeNull`, como o LST-05 AC 2 manda. A mesma linha ganhou a prova da segunda linha (`:518`). Em
  `filtros-de-lancamentos.test.tsx`, o caso "Categoria" do laço virou o teste do chip (`:121-127`),
  com a mesma navegação esperada.

O **BLOCO-01 AC 7** está anotado como substituído em
`.specs/features/lancamento-avulso/spec.md:180-184`, com a decisão do dono e a data. A traceability
(`:351`) diz o mesmo. O texto original ficou como registro.

---

## Lacunas, em ordem de gravidade

1. **O chip mostra "Nome ·R$ X" (LST-01 AC 1)** — `src/components/chips-de-categoria.tsx:34-36` e
   `:83-85`. Defeito de produto, visível em todo chip.
   - **Correção**: pôr o nome, o separador e o valor num único `<span>` dentro do botão, para que o
     flex tenha um item só e o espaço fique no meio de uma linha:
     `<span>{categoria.nome}{" · "}<span className="tabular">…</span></span>`. Provada na sonda:
     3,94 px de folga e 60 de 60 testes de unidade verdes.
   - **Teste que discrimina**: em `e2e/lista-enxuta.spec.ts`, para cada chip, medir a folga entre o
     glifo "·" (um `Range` sobre o nó de texto) e a borda esquerda de `.tabular`, e exigir
     `>= 2` px. Falha hoje (0 px) e passa com a correção. `useInnerText` não serve: ele passa hoje.
2. **Risco AD-009 a confirmar** — `src/components/tabela-lancamentos.tsx:211`,
   `src/components/bloco-recolhivel.tsx:60`, `src/components/chips-de-categoria.test.tsx:19`, com
   origem em `spec.md:71` e `:103-104` e em `tasks.md:224`. O nome de loja do Independent Test de
   LST-05 (`spec.md:187-188`) entra na mesma pergunta.
   - **Correção**: perguntar ao dono se os exemplos vieram do mês real. Se vieram, trocá-los por
     valores aritméticos na spec, em `tasks.md`, nos dois comentários e na fixture, e reescrever o
     ramo antes de qualquer push. O ramo ainda não tem remoto.
   - Se o dono confirmar que são reais, este item passa a ser o primeiro.
3. **"(última)" na penúltima parcela passa verde (LST-05 AC 1; U15b, E6)** —
   `src/components/tabela-lancamentos.tsx:308`.
   - **Correção**: um caso com `parcelaDaCompraB(3, 1)` e
     `toBe("3/4 · (faltam 1 depois desta)")` em `tabela-lancamentos.test.tsx`, junto do de `:417`.
     Provado: passa hoje e mata o U15b.
   - Opcional: `e2e/compra-parcelada.spec.ts:181` passar a afirmar
     `descricaoDaParcela(…).toContainText("9/10 · (faltam 1 depois desta)")`.
4. **Só a tabela do Cartão é medida (LST-05 AC 3; E5)** — `e2e/lista-enxuta.spec.ts:382-390`.
   - **Correção**: medir cada `page.getByRole("table")` contra a coluna nas três larguras, além da do
     Cartão. Provado: passa hoje (as três tabelas terminam na borda da coluna) e mata o E5 (1016
     contra 1000,5).
5. **⚠️ A. Legibilidade da parcela sem critério mensurável** (Goal e Problem Statement; LST-05 AC 1).
   - O dono reclamou da quebra palavra por palavra. A 1280 px, "2/4 · (faltam 2 depois desta)"
     ainda ocupa duas linhas: a descrição fica com cerca de 133 px, conforme o próprio `docs/roadmap.md`
     e o print do cartão a 1280.
   - Nenhum AC diz se duas linhas é aceitável.
   - **Correção**: o dono decide. Ou um AC "em uma linha a partir de 1024 px", com a descrição
     absorvendo a folga, ou o registro de que duas linhas resolvem.
6. **⚠️ B. LST-01 AC 9 não diz se a receita sem categoria entra** — `spec.md:85-86`.
   - O código a tira (`src/application/mes/filtrar-lancamentos.ts:65-70`), coerente com TRC-01 e
     com o total do chip, que só soma despesa.
   - **Correção**: reescrever o AC como "só os gastos sem categoria", ou o dono decidir o contrário.
7. **Menor**: LST-05 ACs 4 e 5 só têm prova de classe (`seletor-de-categoria.test.tsx:297`, `:311`).
   - Hoje o efeito é real: 36/44/176 px na sonda.
   - Um e2e que meça a altura com `hasTouch` e sem ele, e a largura a partir de `md`, tiraria a
     dependência do nome da variante do Tailwind.

---

## Requirement Traceability Update

Proposta para o orquestrador. O verificador não editou o `spec.md`.

| Requirement | Status anterior | Status novo |
| --- | --- | --- |
| LST-01 | Implemented, aguardando o Verifier | ❌ Needs Fix: AC 1, texto visível do chip |
| LST-02 | Implemented, aguardando o Verifier | ✅ Verified |
| LST-03 | Implemented, aguardando o Verifier | ✅ Verified |
| LST-04 | Implemented, aguardando o Verifier | ✅ Verified |
| LST-05 | Implemented, aguardando o Verifier | ❌ Needs Fix: AC 1, limiar de "(última)"; AC 3, só o Cartão medido |

---

## Lições registradas

Todas como `candidate`, por `lessons.py`:

| Lição | Sinal | Origem |
| --- | --- | --- |
| L-028 | `ac_gap` | Lacuna 1: o texto visível do chip |
| L-029 | `surviving_mutant` | U15b e E6: o limiar de "(última)" |
| L-030 | `surviving_mutant` | E5: só a tabela do Cartão medida |
| L-031 | `spec_precision_gap` | ⚠️ A: legibilidade da parcela |
| L-032 | `spec_precision_gap` | ⚠️ B: a receita em `sem-categoria` |
| L-033 | `spec_deviation` | `src/lib/blocos-recolhidos.ts:19` |

O risco AD-009 não virou lição. Ele não está confirmado, e o `lessons.py` não tem sinal para ele.

---

## Summary

**Overall**: ❌ Not Ready.

**Spec-anchored check**: 26 de 29 critérios provados por inteiro; 2 lacunas de precisão na spec.
**Sensor**: 46 mutantes, 43 mortos, 1 vivo coberto pelo unit (E4a), 3 vivos que quebram critério
(U15b, E6, E5).
**Gate**: 1424 de 1424 no unit, `typecheck` e `lint` verdes; e2e da fatia com 9 de 9.

**O que funciona**:
- os totais dos chips são os da Visão geral, inclusive com a busca ativa;
- o filtro `sem-categoria` lista só os gastos sem categoria;
- os blocos recolhem, gravam o cookie e voltam fechados já no HTML do servidor;
- a barra compacta aparece e some com o cartão, tira cada filtro pelo "×" e cabe em 400 px;
- o gráfico da Visão geral leva à lista filtrada;
- a parcela fica sob a descrição, sem a coluna Parcela;
- a tabela do Cartão cabe na coluna nas três larguras.

**Próximo passo**: três tasks de fix (lacunas 1, 3 e 4), cada uma com o teste já provado na sonda.
Antes de qualquer push, a pergunta ao dono sobre a lacuna 2. Depois, rodada 2 do verificador.

---

## Rodada 2

**Data**: 2026-10-29
**Faixa do diff**: a fatia inteira é `96778b3..c2b1d3e`, 16 commits. As correções são
`e45f1ad..c2b1d3e`, 4 commits: F1 `d98b8d7`, F2 `f81f455`, F3 `1b871d6` e F4 `c2b1d3e`.
**Veredito**: PASS ✅.
**Verificador**: sub-agente independente (autor ≠ verificador). Os mutantes rodaram numa
`git worktree` descartável, em modo detached no `c2b1d3e`, no scratchpad, com
`pnpm install --offline` próprio. Os e2e rodaram um de cada vez na porta 3100, com
`DATABASE_URL_TEST=…/mybilling_test_trc`. **Nenhum `git stash`.**

**Os hashes da rodada 1 são de antes da limpeza do ramo.** O orquestrador reescreveu o ramo local
para tirar os exemplos numéricos (lacuna 2). Pelo assunto do commit, a base `09a9156` da rodada 1
é hoje `dfeaf7e`, e o `fcc88cf` é hoje `a3c12e5`. Os commits das tasks hoje são:

| Task | Commit |
| --- | --- |
| T1 | `68452b6` |
| T2 | `17bc2d4` |
| T3 | `d4c5ac3` |
| T4 | `8dda919` |
| T5 | `e37229d` |
| T6 | `67077e4` + `80154ee` |
| T7 | `5d325ac` |
| T8 | `a3c40b2` |
| T9 | `a3c12e5` |

O relatório da rodada 1 é o `e45f1ad`. Os `file:line` da rodada 1 valem para aquele estado. Os
desta seção valem para o `c2b1d3e`.

### O que as correções mudaram

`git diff --stat e45f1ad..c2b1d3e` lista cinco arquivos:

- **Código de produto:** só `src/components/chips-de-categoria.tsx`, em 11 linhas. Nome, separador e
  total passam a ficar num único `<span>` dentro do botão (`:86-90`).
- **Testes:**
  - `e2e/lista-enxuta.spec.ts`: +80 −22;
  - `src/components/tabela-lancamentos.test.tsx`: +7.
- **Documentos:** `spec.md` e `tasks.md`.

Duas assertions saíram, as duas do e2e de margem (`tabela.x` e `tabela.x + tabela.width` da tabela
do Cartão). Voltam mais fortes no laço de `e2e/lista-enxuta.spec.ts:421-431`, que mede as três
tabelas, inclusive a do Cartão, pelo começo e pelo fim. O resto do percurso de margem ficou:

- o transbordo da página (`:432`);
- a parcela na célula (`:456`), abaixo do texto (`:466`);
- as cinco colunas (`:467-469`).

O diff da fatia inteira (`96778b3..c2b1d3e -- src e2e`) não tem `skip`, `only` nem `fixme`.

### AD-009: a limpeza do ramo

Rodei `git grep -F -i` na árvore de cada um dos 16 commits de `96778b3..c2b1d3e`, e também na
base, com os cinco termos que o orquestrador indicou. Eles não são repetidos aqui, porque repeti-los
desfaria a limpeza (AD-009). Nenhum resultado. A busca nos patches (`git log -p`) e nas mensagens
dos 16 commits também não achou nenhum desses termos.

Os pontos que a rodada 1 apontou estão limpos:

- `spec.md:71` diz "Categoria Um · R$ 300,00";
- `spec.md:104-105` dizem "12 · R$ 1.200,00 · 8 a pagar";
- o Problem Statement diz "dezenas de fixos" (`spec.md:11`);
- os comentários de `src/components/tabela-lancamentos.tsx:211` e
  `src/components/bloco-recolhivel.tsx:60` usam o mesmo exemplo aritmético;
- a fixture dos chips usa 123456, 30003 e 50 centavos (`src/components/chips-de-categoria.test.tsx:17-21`);
- o Independent Test de LST-05 usa "Compra B" (`spec.md:188-189`).

A ref local `backup/lista-enxuta-antes-da-limpeza` continua lá (`d10edd9`). Ela não foi usada como
evidência, nem apagada.

### As lacunas da rodada 1

| # | Lacuna | Status | Evidência no `c2b1d3e` |
| --- | --- | --- | --- |
| 1 | O chip mostra "Nome ·R$ X" (LST-01 AC 1) | ✅ Fechada (F1) | `src/components/chips-de-categoria.tsx:86-90`: um item só no flex. `e2e/lista-enxuta.spec.ts:209-226`: a folga entre o glifo "·", tirado de um `Range`, e `.tabular`. `:251`: `toHaveLength(6)`. `:253`: `toBeGreaterThanOrEqual(2)` em cada chip. Sonda: 3,94 px nos seis chips, em 1024, 1280 e 1440. F1 revertida (R2a): falha em `:253` com "Received: 0" |
| 2 | Possível dado real (AD-009) | ✅ Fechada pelo orquestrador | Seção anterior: grep vazio nos 16 commits, nos patches e nas mensagens |
| 3 | "(última)" na penúltima (LST-05 AC 1; U15b, E6) | ✅ Fechada (F2) | `src/components/tabela-lancamentos.test.tsx:424-429`. `:428`: `toBe("3/4 · (faltam 1 depois desta)")`. U15b falha só esse caso, 1 de 48: `expected '3/4 · (última)' to be '3/4 · (faltam 1 depois desta)'` |
| 4 | Só a tabela do Cartão era medida (LST-05 AC 3; E5) | ✅ Fechada (F3) | `e2e/lista-enxuta.spec.ts:420`: `toHaveCount(3)`. `:427`: o começo de cada tabela. `:428-430`: o fim, com o nome da `caption` na mensagem. E5 e R4 (Gastos do Mês) falham nas três larguras |
| 5 | ⚠️ A. Parcela em duas linhas, sem critério mensurável | ⏸️ Pendência do dono | Fora desta rodada, por decisão do orquestrador. Não pesa no veredito |
| 6 | ⚠️ B. LST-01 AC 9 não dizia se a receita entra | ✅ Fechada (F4) | `spec.md:85-87`: "só os gastos sem categoria; a receita sem categoria não entra". `src/application/mes/filtrar-lancamentos.test.ts:160` prende isso (U9 morto). O investimento ficou sem nome no AC: ver ⚠️ C abaixo |
| 7 | Menor: LST-05 ACs 4 e 5 só com prova de classe | ✅ Fechada (F3), salvo a metade do toque | `e2e/lista-enxuta.spec.ts:437`: `matchMedia("(pointer: fine)")` verdadeiro. `:447`: 19 seletores. `:449`: altura ≈ 36. `:450`: largura ≈ 176. E4a e U32 morrem no e2e. Os 44 px do toque seguem só com a classe (`src/components/seletor-de-categoria.test.tsx:311`) e com a sonda abaixo |

**O teste da F3 não passa por vacuidade.** O código exige 3 tabelas (`:420`) e 19 seletores
(`:447`, `FIXOS + 1 + GASTOS.length`). A sonda contou o mesmo nas três larguras: as tabelas Fixos,
Cartão de Crédito e Gastos do Mês, e 19 seletores. O laço da folga também não passa vazio: a
contagem é exigida em `:251`, e um chip sem "·" daria `NaN`, que falha o `>= 2`.

### Critérios que mudaram desde a rodada 1

| AC | Resultado definido pela spec | `file:line` + assertion | Resultado |
| --- | --- | --- | --- |
| LST-01 AC 1 | "Nome · R$ X", do maior gasto para o menor, no lugar do select | `e2e/lista-enxuta.spec.ts:248`: `toHaveText(SEIS_PRIMEIROS)`. `:253`: folga ≥ 2 px entre "·" e o total, em cada chip. `src/components/chips-de-categoria.test.tsx:60`, `:70`: `textContent` e nome acessível | ✅ R1, R2a, R2b e U30 mortos |
| LST-01 AC 9 (reescrito) | Com `sem-categoria`, só os gastos sem categoria, e a receita fora | `src/application/mes/filtrar-lancamentos.test.ts:148`: `["sem-a", "sem-b"]`. `:160`: com a receita, o mesmo par. `:179`: interseção. `e2e/lista-enxuta.spec.ts:315-319`: só "Gasto I" | ✅ U8 e U9 mortos. ⚠️ C: o AC não nomeia o investimento |
| LST-05 AC 1 | "n/t · (faltam N depois desta)" ou "(última)" sob a descrição | `src/components/tabela-lancamentos.test.tsx:413`: 2/4 com 2 restantes. `:421`: 4/4 "(última)". `:428`: 3/4 com 1 restante. `e2e/lista-enxuta.spec.ts:456`, `:466` | ✅ U15b morto. O limiar tem caso colado dos dois lados |
| LST-05 AC 3 | A 1024, 1280 e 1440 px, nenhuma tabela mais larga que a coluna | `e2e/lista-enxuta.spec.ts:420`, `:427`, `:428-430`, `:432` | ✅ E5 e R4 mortos nas três larguras |
| LST-05 AC 4 | 36 px com ponteiro fino; 44 px no toque | `e2e/lista-enxuta.spec.ts:437`, `:449`. `src/components/seletor-de-categoria.test.tsx:311` | ✅ U32 morto no unit e no e2e (44 contra 36). O toque tem prova de classe e a sonda: 44 px em 19 de 19, com `pointer: coarse` |
| LST-05 AC 5 | Largura fixa a partir de `md`, com o nome inteiro no `title` | `e2e/lista-enxuta.spec.ts:450`: 176 px em todo seletor, inclusive o do nome longo. `src/components/seletor-de-categoria.test.tsx:279`, `:291`, `:297` | ✅ E4a morto no e2e (228,25 contra 176) e no unit |

Os outros 23 critérios não mudaram desde a rodada 1. O código deles é o mesmo. Os mutantes de
página que os provam, E1 e E2, continuam morrendo (abaixo).

### Sensor da rodada 2

Quinze execuções: treze mutantes que tocam critério, o E6 (o R3 contra outra suíte) e o INV, fora
da spec. Cada mutante foi aplicado sozinho, por substituição exata (o script recusa um trecho
ambíguo), e desfeito com `git checkout --` antes do seguinte. Os do unit rodaram contra os arquivos
de teste da camada. O R2a e o INV rodaram também contra a suíte unitária inteira. Os do e2e rodaram
com `-g`, e os de margem rodaram uma vez por largura, porque o arquivo é `serial` e a primeira falha
pula as outras larguras.

| Mutante | Arquivo:linha | Falha injetada | Resultado | Onde morre |
| --- | --- | --- | --- | --- |
| R1 | `src/components/chips-de-categoria.tsx:88` | separador `" ·"`, sem o espaço | ✅ morto | Unit: 14 de 60, `chips-de-categoria.test.tsx:60` (`'Categoria Um ·R$ 1.234,56'`). E2e: `e2e/lista-enxuta.spec.ts:248` |
| R2a | `chips-de-categoria.tsx:86-90` | a F1 revertida: nome, `" · "` e total soltos no botão | ✅ morto no e2e | `e2e/lista-enxuta.spec.ts:253`: "folga depois do "·" em "Categoria Um · R$ 200,00"", Expected ≥ 2, Received 0. Vivo no unit inteiro (1425 de 1425): só o navegador vê o espaço aparado |
| R2b | `chips-de-categoria.tsx:86-90` | o total fora do `span` único; nome e separador ficam nele | ✅ morto | E2e: `:253`, Received 0. Unit: 11 de 60, `chips-de-categoria.test.tsx:70` (nome acessível) |
| R3 (U15b) | `src/components/tabela-lancamentos.tsx:308` | `restantes === 0` → `<= 1`: a penúltima diz "(última)" | ✅ morto | Unit: 1 de 48, `tabela-lancamentos.test.tsx:428` |
| E6 | `tabela-lancamentos.tsx:308` | o R3, contra `e2e/compra-parcelada.spec.ts` | ➖ vivo nesse e2e (11 passed) | Morto no unit pelo R3. Ver as notas |
| R4 | `tabela-lancamentos.tsx:265` | só a tabela de Gastos do Mês com `w-[calc(100%+16px)]` | ✅ morto nas três larguras | `e2e/lista-enxuta.spec.ts:428`, "fim da tabela Gastos do Mês": 1016 > 1000,5; 1144 > 1128,5; 1224 > 1208,5 |
| E5 | `tabela-lancamentos.tsx:265` | só a tabela de Fixos com `w-[calc(100%+16px)]` (rodada 1) | ✅ morto nas três larguras | `:428`, "fim da tabela Fixos": 1016, 1144 e 1224 |
| E4a | `src/components/seletor-de-categoria.tsx:116` | sem `md:w-44`, mantendo `w-full` (rodada 1) | ✅ morto | E2e: `:450`, 228,25 contra 176. Unit: `seletor-de-categoria.test.tsx:297`, `:305` |
| U32 | `seletor-de-categoria.tsx:116` | sem `pointer-fine:min-h-9` (rodada 1) | ✅ morto | E2e: `:449`, 44 contra 36. Unit: `:311` |
| U8 | `src/application/mes/filtrar-lancamentos.ts:66` | `sem-categoria` comparado como id (rodada 1) | ✅ morto | 3 de 32: `filtrar-lancamentos.test.ts:148`, `:160`, `:179` |
| U9 | `filtrar-lancamentos.ts:67` | `sem-categoria` com a receita (rodada 1) | ✅ morto | `:160`: `['sem-a', 'sem-b', 'receita']` |
| U30 | `chips-de-categoria.tsx:88` | chip sem o separador (rodada 1) | ✅ morto | 14 de 60, `chips-de-categoria.test.tsx:60` |
| E1 | `src/app/(app)/[competencia]/lancamentos/page.tsx:161` | chips somados sobre `visiveis`, a lista já filtrada (rodada 1) | ✅ morto | `e2e/lista-enxuta.spec.ts:274`: os totais mudam com `busca=Gasto` |
| E2 | `lancamentos/page.tsx:176` | o servidor lê outro cookie (rodada 1) | ✅ morto | `e2e/lista-enxuta.spec.ts:339`: `aria-expanded` "true" depois de recarregar |
| INV | `filtrar-lancamentos.ts:67` | `sem-categoria` só com DESPESA: o investimento sem categoria sai | ➖ vivo fora da spec | Unit inteiro, 1425 de 1425; e2e da fatia, 9 de 9. Ver ⚠️ C |

**Resultado**: 13 mutantes que tocam critério, 13 mortos pelo gate. O E6 é o R3 contra outra
suíte. O INV muda um comportamento que a spec não define, e fica com o dono (⚠️ C).

**Sensor acumulado**:

- Rodada 1: 46 mutantes.
- Rodada 2: R1, R2a, R2b, R4 e INV são novos. U15b (R3), E6, E5, E4a, U32, U8, U9, U30, E1 e E2
  repetem a rodada 1.
- Hoje: todo mutante que quebra critério morre pelo gate. O único vivo em todas as suítes é o INV,
  fora da spec. O E4a, que vivia no e2e na rodada 1, agora morre nele também. O E6 continua vivo só
  no e2e de compra parcelada, e o R3 o mata no unit.

### Sondas

| Sonda | Medida no `c2b1d3e` |
| --- | --- |
| Margem, seletor e chip, em 1024, 1280 e 1440 px | Coluna de conteúdo de 264 a 1000, de 392 a 1128 e de 472 a 1208. As 3 tabelas começam e terminam exatamente nela. Os 19 seletores medem 176,00 × 36,00. A folga depois do "·" é de 3,94 px nos seis chips |
| Seletor no toque (`hasTouch`, 1280 px) | `pointer: coarse` verdadeiro e `fine` falso; os 19 seletores medem 176,00 × 44,00 |
| Investimento no filtro e no chip (unit, no scratch) | Mês com um gasto e um investimento sem categoria, e um gasto e um investimento em Categoria X. `sem-categoria` lista os dois sem categoria, e Categoria X lista os dois dela. Os chips somam só a despesa: X = 1000 e sem-categoria = 700 |

### O ponto aberto: investimento no filtro e fora do total do chip

O autor das correções levantou um ponto, e ele se confirma:

- **O filtro:** `categoriaId=sem-categoria` lista o lançamento de categoria nula de qualquer
  natureza menos RECEITA (`src/application/mes/filtrar-lancamentos.ts:65-68`). Isso inclui o
  investimento. Um id comum casa qualquer natureza (`:69`), como antes da fatia
  (`96778b3:src/application/mes/filtrar-lancamentos.ts:64`).
- **O total do chip** vem de `resumoPorCategoria` sobre `despesasDaCompetencia`, que só soma DESPESA
  (`src/domain/mes/resumo-mensal.ts:41-48`).
- **O efeito:** com um investimento no mês, a lista filtrada mostra uma linha que o chip não soma.

**Não fere nenhum AC da lista-enxuta.**

- **LST-01 AC 9** (`spec.md:85-87`) pede "só os gastos sem categoria". No vocabulário do projeto, gasto
  é "despesa ou investimento" (TRC-02 AC 1, `.specs/features/trocar-categoria/spec.md:87`). A linha
  do investimento sem categoria mostra "Sem categoria" no seletor
  (`src/components/tabela-lancamentos.test.tsx:653-660`). Pela primeira razão do AC, a do rótulo
  da lista, ele entra.
- **LST-01 ACs 1 a 3** pedem que o total do chip seja o de `resumoPorCategoria`, igual ao da Visão
  geral, e ele é.
- **Nenhum AC** pede que a soma da lista filtrada iguale o total do chip.
- **LST-04 AC 1** só pede a lista filtrada pelo `categoriaId`.

**Mas o AC 9 não decide o caso, e por isso fica como ⚠️ C, pendência do dono.**

- A segunda razão que o AC dá para tirar a receita, "o total do chip 'Sem categoria' não a soma",
  vale também para o investimento. Ela apontaria para tirá-lo.
- Na lista-enxuta, "gasto" é sempre o valor da despesa: "o gasto dela" (AC 1), `resumoPorCategoria`
  (AC 2). O MOV-04 AC 4 tira o investimento do Total de Gastos
  (`.specs/features/mvp-gestao-financeira/spec.md:177`).
- Nenhum teste prende a escolha: o mutante INV, que tira o investimento, passa no unit inteiro e no
  e2e.
- Como a spec não diz, um teste escrito agora derivaria da implementação, e o `AGENTS.md` proíbe
  isso.

**O caminho é este:**

1. O dono decide.
2. O AC 9 passa a nomear o investimento.
3. Um caso em `filtrar-lancamentos.test.ts` prende a decisão.

Se o investimento ficar, convém o AC dizer que o total do chip conta só a despesa, para a diferença
não parecer defeito. O caso do id comum é anterior à fatia e segue a mesma decisão.

### Code Quality das correções

| Princípio | Status |
| --- | --- |
| Código mínimo | ✅ A F1 é um `<span>` em volta do conteúdo do botão, com o comentário do porquê. F2 e F3 só mexem em teste |
| Mudanças cirúrgicas | ✅ Nada fora do que as lacunas pediam. O `CHIP` e o `title` do seletor não mudaram |
| Resultado afirmado igual ao da spec | ✅ "3/4 · (faltam 1 depois desta)" exato; folga medida no navegador; 36 e 176 px exatos, com tolerância de meio pixel |
| Teste que afirma o que só o navegador vê | ✅ A folga e as medidas saem do `getBoundingClientRect`, e não da classe |
| Todo teste mapeia um AC | ✅ LST-01 AC 1 (F1), LST-05 AC 1 (F2), LST-05 ACs 3 a 5 (F3) |
| Guias do projeto (`AGENTS.md`) | ✅ Regra 1: nomes genéricos e valores aritméticos. Regra 2: nenhum valor monetário novo fora de `formatarBRL` |

### Gate

| Comando | Resultado |
| --- | --- |
| `pnpm test:unit` | 1425 passed, em 98 arquivos; domínio com 100% de branches (351/351) |
| `pnpm typecheck` | exit 0 |
| `pnpm lint` | Biome em 289 arquivos, sem achado |
| `DATABASE_URL_TEST=…/mybilling_test_trc pnpm exec playwright test e2e/lista-enxuta.spec.ts` | 9 passed (25,0 s) |
| `DATABASE_URL_TEST=…/mybilling_test_trc pnpm exec playwright test` (a suíte inteira) | 77 passed (4,2 min) |
| `pnpm build`, na worktree descartável no `c2b1d3e` | exit 0 |

- **Delta:** a rodada 1 tinha 1424 testes no unit, e a F2 soma 1. O e2e continua com 77 testes,
  porque a F1 e a F3 mudam testes que já existiam.
- **Integração:** não rodei. Nenhum commit desde a rodada 1 toca em banco, caso de uso ou teste de
  integração.

### Validadores

- `validate_spec.py lista-enxuta`: 0 erros, 0 avisos, antes e depois da traceability desta rodada.
- `validate_tasks.py` numa cópia com F1–F4 trocadas por T101–T104: 0 erros e 11 avisos. Os quatro
  novos são o `spec.md` no `Where` de T101–T103 e o `Tests: none` da T104.
- `check_commit.py`: OK nas mensagens dos quatro commits de correção. Cada um traz `tasks.md` e
  `spec.md`, como o `AGENTS.md` pede.
- `validate_state.py lista-enxuta`: 0 erros, saída 0.

### Notas

- **E6 vivo no e2e não é lacuna.** O texto "(última)" é decidido só em `TabelaLancamentos`. A página
  só repassa `restantes`, que o e2e de compra parcelada já confere de ponta a ponta nas duas pontas
  (`e2e/compra-parcelada.spec.ts:177`, "8/10 · (faltam 2 depois desta)", e `:184`,
  "10/10 · (última)"). O limiar tem caso colado dos dois lados no teste de componente
  (`tabela-lancamentos.test.tsx:421`, `:428`). A rodada 1 já marcava o e2e como opcional.
- **A metade do toque do LST-05 AC 4 continua sem e2e.** O projeto do Playwright é um Chrome de
  computador. Os 44 px têm a classe (`seletor-de-categoria.test.tsx:311`), que mata a retirada de
  `min-h-11`, e a sonda desta rodada. É menor e não pesa: a rodada 1 já o deixava assim, e a F3
  cobriu o que a lacuna 7 pedia para a medida do computador.

### Lições

Nenhum sinal novo de falha: todo mutante que quebra critério morreu, o gate passou e não há
`SPEC_DEVIATION` novo. A ⚠️ C é uma lacuna de precisão, e virou uma lição candidata, registrada
pelo `lessons.py`:

| Lição | Sinal | Origem |
| --- | --- | --- |
| L-034 | `spec_precision_gap` | ⚠️ C: o investimento no filtro e fora do total do chip; mutante INV vivo em `src/application/mes/filtrar-lancamentos.ts:67` |

As candidatas da rodada 1, de L-028 a L-033, ficam como estão. A `references/lessons.md` não
promove uma lição porque a correção deu certo. Promover é do script, e só quando o mesmo sinal
volta em outra feature. O `penalize` é só para lição confirmada que falhou depois de aplicada.

### Pendências do dono

1. **⚠️ A (lacuna 5 da rodada 1).** A 1280 px, "2/4 · (faltam 2 depois desta)" ainda ocupa duas
   linhas. O dono escolhe uma de duas saídas:
   - um AC mensurável, por exemplo "em uma linha a partir de 1024 px";
   - o registro de que duas linhas resolvem.
2. **⚠️ C.** O investimento sem categoria entra em `sem-categoria`, e um investimento com categoria
   entra no chip dela, mas o total do chip não o soma. O dono decide:
   - se fica, o AC 9 diz isso e que o total do chip conta só a despesa;
   - se sai, o filtro passa a pedir DESPESA, e o caso do id comum segue a mesma regra.

   Nos dois casos, um caso de teste prende a decisão.

### Requirement Traceability: aplicada ao `spec.md`

| Requisito | Status anterior | Novo status | Evidência que fecha |
| --- | --- | --- | --- |
| LST-01 | Needs Fix (rodada 1), corrigido por F1 e F4 | ✅ Verified (rodada 2) | AC 1: `e2e/lista-enxuta.spec.ts:253`. AC 9: `spec.md:85-87` e `filtrar-lancamentos.test.ts:160`. Os outros ACs como na rodada 1 |
| LST-02 | Verified (rodada 1) | ✅ Verified (rodada 2) | E2 morto de novo em `e2e/lista-enxuta.spec.ts:339`. O código não mudou |
| LST-03 | Verified (rodada 1) | ✅ Verified (rodada 2) | O código e os testes não mudaram. A suíte e2e inteira passa |
| LST-04 | Verified (rodada 1) | ✅ Verified (rodada 2) | O código e os testes não mudaram. `e2e/lista-enxuta.spec.ts:474-495` passa |
| LST-05 | Needs Fix (rodada 1), corrigido por F2 e F3 | ✅ Verified (rodada 2) | AC 1: `tabela-lancamentos.test.tsx:428`. AC 3: `e2e/lista-enxuta.spec.ts:420-430`. ACs 4 e 5: `:449-450` |

**Coverage**: 5 de 5 requisitos verificados. Os 29 critérios têm assertion sobre o resultado da
spec, e todo mutante que quebra critério morre.

### Isolamento

- **Porcelain da worktree da fatia:** vazio antes do sensor. Depois dele, só as mudanças desta
  rodada: este relatório, a traceability do `spec.md` e a L-034 (`.specs/lessons.json` e
  `.specs/LESSONS.md`).
- **`next-env.d.ts`:** o `next dev` dos e2e o reescreveu, e ele voltou ao commitado com
  `git checkout`.
- **Worktree descartável:** removida, e `git worktree list` não a mostra.
- **Fora daqui:** o checkout principal, as outras worktrees e a ref de backup não foram tocados.

### Resumo da rodada 2

**Overall**: ✅ Ready.

- **Lacunas da rodada 1:** as quatro que cabiam a esta rodada estão fechadas, com evidência própria
  (1, 3, 4 e 6). A lacuna 7 também, salvo os 44 px do toque, que têm classe e sonda. A lacuna 2 foi
  resolvida pelo orquestrador, e o grep confirma.
- **Sensor:** 13 mutantes que tocam critério, 13 mortos. O INV está vivo, mas fora da spec.
- **Gate:** 1425 no unit; `typecheck`, `lint` e `build` verdes; e2e da fatia 9 de 9; e2e inteira
  77 de 77.
- **Para o dono:** a ⚠️ A (parcela em duas linhas) e a ⚠️ C (investimento no filtro).
