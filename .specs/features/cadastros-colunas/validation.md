# Cadastros em abas, com o item aberto à direita: Validation

## Validation: cadastros-colunas, rodada 3 — FAIL ❌

**Date**: 2026-10-31
**Spec**: `.specs/features/cadastros-colunas/spec.md`
**Diff range**: `e8b1540..92063b4`, a fatia inteira. Desde a rodada 2 (relatório em `14acc90`):
`e523713` (F7), `3816187` (F8), `7b642b6` (F9) e `92063b4` (F10).
**Verifier**: sub-agente independente (autor ≠ verificador), rodada 3, a última dentro do limite de 3

**Resumo do veredito.**
- **As duas lacunas da rodada 2 estão fechadas.**
  - G6: B8 morre em `detalhe-do-meio.test.tsx:268`.
  - G7: F6e morre em e2e `:2323` nos três casos do nome do meio (568, 473 e 318 px).
  - A observação 2 também fechou: F4f morre em `:2129`, em 400 px (75,7 px fora da tabela).
- **Gate verde, nas duas pontas.**
  - `typecheck`, `lint`, 2.088 unitários, 406 de integração e `build` saem 0. O `pnpm verify` inteiro
    também sai 0.
  - O e2e inteiro passou 266 de 266 na primeira passada, 73 deles em `cadastros-colunas.spec.ts`.
- **Sensor:** 37 mutantes, 33 mortos, 4 vivos: S3, S3b, N5 e N7.
- **Três lacunas novas, todas de teste.** O código está certo hoje nas três (sondas A, B e C). Nenhuma
  pede decisão nova do dono sobre o produto. Como esta é a última rodada do limite, cabe ao dono
  decidir se abre uma quarta.
  1. **G8.** CADCOL-04, AC 11 e CADCOL-07, AC 13. O rótulo "Fixos em Março de 2026" é montado pela
     página, e nenhum teste o lê na tela. Com o painel mostrando "Fixos em Março" (S3 e S3b), as
     suítes passam inteiras.
  2. **G9.** CADCOL-09, AC 7. A medida olha a página, o painel e o nome longo contra a tabela. Ela
     não olha a tabela contra o contêiner dela. Com a lista num invólucro `overflow-x-auto` e a
     tabela com 448 px (N5), em 400 px a lista rola 80 px de lado, e a suíte passa.
  3. **G10.** Edge Case "Nome longo", no painel. Com o título do painel cortado com reticências
     (N7), a palavra longa não quebra: em 400 px ficam 66 a 164 px do texto fora do painel. Nada
     rola, e a suíte passa.
- **Os desvios do autor nas F7 a F10** (seção 6) são aceitáveis. A medida da F9 é mais estreita do
  que o comentário dela promete, e isso é a G9.

---

## 1. Integridade da rodada

- **O código de produto não mudou.** `git diff 14acc90..92063b4 -- src e2e` toca quatro arquivos:
  - `src/components/detalhe-do-meio.test.tsx`: o bloco do AC 8 (`:257-276`), e o cabeçalho passa a
    citar o AC 8;
  - `e2e/cadastros-colunas.spec.ts`: `textoForaDaTabela`, a medida nova em `medirRolagemLateral`, as
    duas assertions da F9, `abrirCartaoRoxo` e o quarto caso de `GRAVACOES`. A primeira mudança está
    na linha 2.022, e as linhas 1 a 2.021 são as da rodada 2, byte a byte;
  - `src/components/tabela-de-categorias.tsx` e `src/components/tabela-de-meios.tsx`: só
    comentários. Nenhuma linha de código mudou.
- **Os outros arquivos de teste são os de `21aa62b`, byte a byte.** As citações deles valem como na
  rodada 2. Conferi por amostra em `92063b4`:
  - `cabecalho-de-cadastros.test.tsx:39-40` e `:76-80`;
  - `tabela-de-categorias.test.tsx:92`, `:132-139`, `:165`, `:196`, `:207` e `:217`;
  - `uso-no-mes.test.ts:107-113`, `:159` e `:209-217`;
  - `obter-uso-no-mes/handler.test.ts:112-117` e `:237-250`;
  - e2e `:655`, `:658`, `:667`, `:710`, `:761`, `:1059`, `:1062`, `:1206`, `:1404`, `:1743`,
    `:1749`, `:1786` e `:1858`.
- **As citações novas e remapeadas da traceability conferem em `92063b4`.**
  - CADCOL-01: `:2161` é o título do teste da F5.
  - CADCOL-04 e CADCOL-07: `:2300` é o título do laço; `:2323-2324` são as duas rolagens e `:2325`
    o `toBeInViewport({ ratio: 1 })`; `:2266` é o caso "o nome do meio".
  - CADCOL-07: `detalhe-do-meio.test.tsx:262` é o título do teste da F7, `:268` o aviso e `:269-274`
    o `editar` chamado uma vez com "cartão roxo" e os dias 25 e 5.
  - CADCOL-09: `:2113` e `:2138` são os títulos dos dois testes da F4, e `:2126-2129` e `:2147-2150`
    as assertions da F9. `visao-tres-colunas.spec.ts:604` é agora a linha do `test(` de TRES-01,
    AC 10 (observação 5 da rodada 2).
- **Nenhum teste saiu, foi pulado ou afrouxado.** A única linha de assertion apagada,
  `toHaveText("Cartão Roxo")` no caso dos dias, foi para `abrirCartaoRoxo` (`:2209-2213`), que esse
  caso chama. Nenhum `skip`, `only`, `fixme`, `any` nem `// SPEC_DEVIATION` no diff da rodada.
- **Os quatro commits passam no `check_commit.py`**, um por correção. Cada um marca a task em
  `tasks.md` e a traceability em `spec.md`. Nenhuma das 201 caixas de `tasks.md` ficou aberta.
- **Contagens**, medidas aqui:
  - unitários: 2.087 → 2.088 em 132 arquivos (o da F7);
  - integração: 406 em 25 arquivos, como na rodada 2;
  - e2e: 263 → 266 em 17 arquivos (os 3 da F8). A F9 põe assertions em dois testes da F4.

---

## 2. As lacunas da rodada 2

| Lacuna | Como fechou | Prova nesta rodada |
| --- | --- | --- |
| G6, CADCOL-07, AC 8 no navegador | `detalhe-do-meio.test.tsx:262` troca "Cartão Roxo" por "cartão roxo" e salva | B8 morre em `:268` (`Unable to find role="status"`), 1 de 25; N1, que manda o nome gravado quando só a caixa muda, morre em `:270` |
| G7, CADCOL-07, AC 16, o nome | O caso "o nome do meio" de `GRAVACOES` (`:2266`), pelo laço de `:2300` | F6e morre em `:2323` nas três janelas (568, 473 e 318 px). N2 (rolagem até o alto só com o nome) e N3 (foco no título sem `preventScroll` só com o nome) também morrem ali, e os três casos dos dias passam com cada um |
| Observação 2, a palavra longa num invólucro em 400 px | `textoForaDaTabela` (`:2035`), medida nos 60 casos de ponteiro fino e nos 6 de toque | F4f morre em `:2129`: em Categorias, 400 px, os três estados, 75,7 px fora da tabela, com a página e o painel em 0 |
| Fix 3, os comentários de "duas linhas de texto" | Reescritos em `tabela-de-meios.tsx:17-25`, `:149` e `:177-183`, e em `tabela-de-categorias.tsx:23-26` | Lidos aqui. "Grade de duas linhas" (`tabela-de-categorias.tsx:145`) descreve a grade, e pode ficar |
| Observação 5, a citação deslocada | `visao-tres-colunas.spec.ts:606` → `:604` | `:604` é o `test(` de TRES-01, AC 10 |

---

## 3. Task Completion

| Task | Status | Notes |
| --- | --- | --- |
| T1 a T22 | ✅ Done | Rodada 1 |
| F1 a F6 | ✅ Done | Rodada 2 |
| F7 | ✅ Done | O caso de caixa do nome do meio no componente |
| F8 | ✅ Done | O nome do meio em `GRAVACOES` |
| F9 | ⚠️ Done, com lacuna | Fecha a palavra longa contra a tabela, mas não a tabela contra o contêiner (G9) nem o título do painel (G10) |
| F10 | ✅ Done | Comentários e a citação |

---

## 4. Spec-Anchored Acceptance Criteria

Cada linha cita o teste e a assertion em `92063b4`. "e2e" é `e2e/cadastros-colunas.spec.ts`, salvo
quando outro arquivo é nomeado; os componentes estão em `src/components/`.

### P1: Duas abas em Cadastros — CADCOL-01

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| 1 | `h1` "Cadastros" e, abaixo, a navegação "Cadastros" com os dois links | `cabecalho-de-cadastros.test.tsx:39-40` `antes(titulo, abas())`; e2e `:442` | ✅ |
| 2 | Os links levam às duas rotas no mês aberto | `cabecalho-de-cadastros.test.tsx:47-50`; e2e `:451-454` `href`, `:1032` a URL depois do clique | ✅ |
| 3 | `aria-current="page"` só na aba aberta | `cabecalho-de-cadastros.test.tsx:55-67`; e2e `:443-450`, `:1034-1041` | ✅ |
| 4 | O item "Cadastros" abre Categorias | e2e `:439-441` `toHaveURL(…/cadastros/categorias$)`; `e2e/categorias.spec.ts:330-332` | ✅ |
| 5 | "Cadastros" ativo em toda aba | e2e `:455`, `:1042` `aria-current` "page" | ✅ |
| 6 | "+ Nova…" ao lado do título, em todas as larguras | e2e `:2161`, em 400, 1.535 e 1.536 px, nas duas abas: `:2169-2175` a ação na faixa vertical do `h1` e `:2176-2178` à direita dele; `cabecalho-de-cadastros.test.tsx:76-80` a ordem do DOM | ✅ |

### P1: Uma linha por categoria — CADCOL-02

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| 1 | Tabela "Categorias" com as quatro colunas | `tabela-de-categorias.test.tsx:92`; e2e `:790-795` | ✅ |
| 2 | Ordem pt-BR, sem caixa nem acento | `e2e/categorias.spec.ts:345-352`, com fixture que a ordem do banco e a do código de caractere desmentem | ✅ S4 morre em `:345` |
| 3 | Pill com o nome, na cor em uso | `tabela-de-categorias.test.tsx:114`, `:120`; `e2e/categorias.spec.ts:355-363` | ✅ |
| 4 | "Laranja" ou "Automática (<cor>)" | `tabela-de-categorias.test.tsx:132`, `:138-139`; `cor-de-categoria.test.ts:212`, `:216` | ✅ |
| 5 | Contagens de CADCOL-03, "0" sem uso | e2e `:413-416` | ✅ S1 morre em `:413` |
| 6 | Nenhum botão além do que abre | `tabela-de-categorias.test.tsx:165` | ✅ |
| 7 | ≥ 1.280 px, ponteiro fino: cada linha ≤ 48 px | e2e `:758-762` em 1.280 px; `:1829-1836` em 1.536 e 1.920 px | ✅ |
| 8 | De 400 a 767 px: sem cabeçalho, a pill sozinha na primeira linha de texto, e embaixo a cor e as contagens com o nome escrito, quebrando quando não cabem | 767 px: e2e `:775`, `:780`, `:784-787`; 400 px: `:834-835`, `:842-846`; 768 px: `:790-799` | ✅ S28 morre em `:386` (767 e 400 px) |
| 9 | Lista vazia: o aviso com "+ Nova categoria" | `tabela-de-categorias.test.tsx:217` | ✅ |

### P1: O uso no mês aberto — CADCOL-03

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| 1 | Fixos cujo período contém o mês, de qualquer natureza | `src/domain/cadastro/uso-no-mes.test.ts:62`, `:68`, `:72`, `:86-87` | ✅ |
| 2 | Fora o que começa depois e o que terminou antes | `uso-no-mes.test.ts:107-108`, `:112-113`; e2e `:413` | ✅ |
| 3 | Lançamentos não cancelados da competência, com a ocorrência do fixo | `uso-no-mes.test.ts:129`, `:144`, `:155`, `:159`, `:194`; e2e `:414` | ✅ |
| 4 | Igual ao que Lançamentos mostra com o filtro | `src/application/cadastros/obter-uso-no-mes/handler.test.ts:237-238`, `:249-250`; e2e `:426-428`, `:1016-1018` | ✅ |
| 5 | Materializa antes de contar | `handler.test.ts:112`, `:116-117`, `:144`; `handler.integration.test.ts:97-103`; e2e `:408` | ✅ S2 morre em `handler.test.ts:116` e mais 4 |
| 6 | Sem categoria: só para o meio | `uso-no-mes.test.ts:209-217`, `:236-238`; e2e `:1001-1002` | ✅ |

### P1: A categoria aberta na coluna — CADCOL-04

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| 1 | Linha ou botão abre, com a pill como título | `tabela-de-categorias.test.tsx:175`, `:184`; `detalhe-da-categoria.test.tsx:152` | ✅ |
| 2 | "Renomear <nome>" com "Nome" preenchido e "Salvar" | `detalhe-da-categoria.test.tsx:161` | ✅ |
| 3 | "Cor de <nome>", onze opções tingidas, a em uso marcada | `detalhe-da-categoria.test.tsx:170-209` | ✅ |
| 4 | Grava sem outro clique, pinta antes da resposta, "Cor trocada." | `detalhe-da-categoria.test.tsx:217`, `:238`; e2e `:655-656` | ✅ |
| 5 | A pill da linha na cor nova | e2e `:658` | ✅ |
| 6 | Grava com a cor em uso, "Categoria renomeada.", painel aberto, linha no lugar novo | `detalhe-da-categoria.test.tsx:296-306`, `:309`; e2e `:663-669` | ✅ |
| 7 | Nome de outra: a mensagem junto do campo | `detalhe-da-categoria.test.tsx:340-346`; `e2e/categorias.spec.ts:464`; `src/app/actions/categorias.integration.test.ts:381` | ✅ |
| 8 | Falha volta a cor ou o nome, motivo no painel, sem aviso | `detalhe-da-categoria.test.tsx:274-292`, `:349` | ✅ |
| 9 | Nome igual depois de normalizar: não grava nem avisa | `detalhe-da-categoria.test.tsx:400-406` | ✅ S23 morre em `:406` |
| 10 | Só a caixa: grava e avisa | `detalhe-da-categoria.test.tsx:411-419` | ✅ |
| 11 | "Onde ela aparece" com "Fixos em <Mês de Ano>" e "Lançamentos em <Mês de Ano>", as contagens e o link | Componente: `onde-aparece.test.tsx:19`, com `rotuloDaCompetencia="Março de 2026"` recebido; `detalhe-da-categoria.test.tsx:435`. Página: e2e `:420` lê só os `dd` ("1" e "2"), e nenhum teste lê os `dt` | ❌ O rótulo vem da página (`categorias/page.tsx:70`), e nenhum teste o lê na tela. Com `nomeDoMes` no lugar de `formatarCompetencia` (S3b), o painel diz "Fixos em Março", e os 103 e2e das abas e os 2.088 unitários passam (G8) |
| 12 | O link abre Lançamentos filtrado | e2e `:423-425` | ✅ |
| 13 | Fundo diferente e `aria-expanded` | `tabela-de-categorias.test.tsx:196`, `:207`; e2e `:734-737` | ✅ |
| 14 | Trocar de item ou abrir "+ Nova…" descarta o digitado | `cadastro-de-categorias.test.tsx:327`, `:342` | ✅ S13 morre em `:336` |
| 15 | "Fechar" fecha e desmarca | `coluna-de-cadastro.test.tsx:142`; `cadastro-de-categorias.test.tsx:286-287` | ✅ |
| 16 | Salvar a cor ou o nome deixa a página e a coluna na rolagem em que estavam, com o controle inteiro à vista | e2e `:2300`, casos "a cor" (`:2222`) e "o nome da categoria" (`:2237`), em 400 × 700, 1.280 × 480 e 1.920 × 480: `:2311` o controle fora antes, abaixo de 1.536 px; `:2315` a página rolada antes; `:2323-2324` as duas rolagens (± 1 px); `:2325` `toBeInViewport({ ratio: 1 })` | ✅ S27 morre em `:2323` (24 px em 1.920 × 480) |

### P1: Nova categoria na coluna — CADCOL-05

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| 1 | "Nova categoria" com "Nome", a nota, "Criar categoria" e "Cancelar" | `nova-categoria.test.tsx:55`; `cadastro-de-categorias.test.tsx:218-224` | ✅ |
| 2 | Criada: na tabela, aberta, "Categoria criada." | `cadastro-de-categorias.test.tsx:238-244`, `:261-274`; e2e `:478-491` | ✅ |
| 3 | Nome de ativa: abre a existente, "Essa categoria já existia." | `nova-categoria.test.tsx:122`; e2e `:493-497` | ✅ |
| 4 | Nome de arquivada: reativa, "Categoria reativada." | `nova-categoria.test.tsx:132`; e2e `:501-504` | ✅ |
| 5 | Vazio ou > 60: recusa no navegador, sem servidor | `nova-categoria.test.tsx:73`, `:85`, `:97` | ✅ |
| 6 | "Cancelar" fecha sem criar | `nova-categoria.test.tsx:160`; `cadastro-de-categorias.test.tsx:320-322` | ✅ |

### P1: Uma linha por meio de pagamento — CADCOL-06

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| 1 | Tabela com as seis colunas | `tabela-de-meios.test.tsx:99`; e2e `:1487-1494` | ✅ S17 morre em `:1487` |
| 2 | Ordem pt-BR | e2e `:1054-1055`, a fixture desmente o banco e o código de caractere; `:1059` | ✅ |
| 3 | "Cartão de crédito", "Conta corrente" ou "Rótulo" | `tabela-de-meios.test.tsx:133`, `:139`, `:145`; e2e `:1061`, `:1069` | ✅ |
| 4 | "dia N" no cartão, "—" na conta e no rótulo | `tabela-de-meios.test.tsx:160-161`, `:169-170`; e2e `:1062-1071` | ✅ |
| 5 | Contagens de CADCOL-03, "0" sem uso | e2e `:1001-1006` | ✅ |
| 6 | Nenhum botão além do que abre | `tabela-de-meios.test.tsx:200-201` | ✅ |
| 7 | ≥ 1.280 px, ponteiro fino: cada linha ≤ 48 px | e2e `:1451-1455`; `:1829-1836` | ✅ |
| 8 | De 400 a 767 px: sem cabeçalho, o nome sozinho em cima, e embaixo o tipo, os dias e as contagens com o nome escrito, quebrando quando não cabem | 767 px: e2e `:1469`, `:1476-1477`, `:1481-1484`; 400 px: `:1536`, `:1537-1541`, `:1549-1561` | ✅ N6 (`flex-nowrap` na linha) morre em `:389` em 767 px e em `:1530` em 400 px |
| 9 | Lista vazia: o aviso com "+ Novo meio" | `tabela-de-meios.test.tsx:247-251` | ✅ |

### P1: O meio aberto — CADCOL-07

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| 1 | Linha ou botão abre; nome como título e o subtítulo do tipo | `tabela-de-meios.test.tsx:205-221`; `detalhe-do-meio.test.tsx:146`, `:156`, `:163`; e2e `:1202-1204` | ✅ |
| 2 | "Editar <nome>", "Nome", o tipo em texto com a frase, "Salvar alterações" | `detalhe-do-meio.test.tsx:172`; `campos-do-meio.test.tsx:107` | ✅ |
| 3 | No cartão, os dias gravados e a nota | `detalhe-do-meio.test.tsx:192`, `:200` | ✅ |
| 4 | Nenhum controle de tipo, nem dia na conta e no rótulo | `detalhe-do-meio.test.tsx:183`; `campos-do-meio.test.tsx:127`, `:143`; `mudancas-do-meio.test.ts:127` | ✅ |
| 5 | Grava, "Meio de pagamento salvo.", nome e dias novos na linha e no painel | `detalhe-do-meio.test.tsx:211`, `:227`, `:242`; `meios-de-pagamento.integration.test.ts:164`; e2e `:1097-1111` | ✅ |
| 6 | Nome de outro ativo: recusa junto do campo | `editar-meio-de-pagamento/handler.test.ts:154-156`; `meios-de-pagamento.integration.test.ts:253`; `detalhe-do-meio.test.tsx:388`; e2e `:1126-1136` | ✅ |
| 7 | Nome de arquivado grava | `handler.test.ts:159`; `meios-de-pagamento.integration.test.ts:205-213` | ✅ |
| 8 | Só a caixa grava | Navegador: `detalhe-do-meio.test.tsx:262`, `:268` o aviso, `:269-274` `editar` uma vez com `nome: "cartão roxo"` e os dias 25 e 5. Servidor: `mudancas-do-meio.test.ts:79`; `handler.test.ts:171`; `meios-de-pagamento.integration.test.ts:216-223` | ✅ B8 morre em `:268`, N1 em `:270` |
| 9 | Igual depois de normalizar: não grava nem avisa | `detalhe-do-meio.test.tsx:279-287`, `:290`; `handler.test.ts:136-139`; `meios-de-pagamento.integration.test.ts:228-245` | ✅ S24 morre em `meios-de-pagamento.integration.test.ts:245` |
| 10 | Vazio, > 40 ou dia fora de 1 a 31, no navegador e no servidor | `detalhe-do-meio.test.tsx:308`, `:318`, `:328`, `:341`, `:352`, `:364`; `meio-pagamento.schema.test.ts:181`, `:192`, `:198`, `:206`; `meios-de-pagamento.integration.test.ts:311-343` | ✅ S14 morre em `detalhe-do-meio.test.tsx:341`; S16 em `:352` e em `meio-pagamento.schema.test.ts:206` |
| 11 | Dias fora do cartão, ou cartão sem dias | `mudancas-do-meio.test.ts:101-119`; `handler.test.ts:104`, `:119`; `src/lib/erros.test.ts:5`; `meios-de-pagamento.integration.test.ts:292-308`; `detalhe-do-meio.test.tsx:420` | ✅ |
| 12 | Inexistente ou arquivado: "Esse meio de pagamento não existe mais." | `handler.test.ts:72`, `:87`; `meios-de-pagamento.integration.test.ts:286-289`; `detalhe-do-meio.test.tsx:437`, `:450` | ✅ |
| 13 | "Onde ele aparece" com "Fixos em <Mês de Ano>", "Lançamentos em <Mês de Ano>" e o link filtrado pelo meio | Componente: `onde-aparece.test.tsx:38`; `detalhe-do-meio.test.tsx:457`, com o rótulo recebido. Página: e2e `:1010` lê só os `dd`, `:1013-1018` o link | ❌ Como no CADCOL-04, AC 11: o rótulo vem de `meios-de-pagamento/page.tsx:74`, e nenhum teste o lê na tela. S3 sobrevive aos 103 e2e das abas e aos 2.088 unitários (G8) |
| 14 | A mudança nas outras telas, sem recarregar | `meios-de-pagamento.integration.test.ts:202`; e2e `:1167-1175` | ✅ |
| 15 | Marcação, troca de item e "Fechar" | `tabela-de-meios.test.tsx:226`; `cadastro-de-meios.test.tsx:311`, `:358`, `:371`; e2e `:1427-1430` | ✅ |
| 16 | Salvar o nome **ou** os dias deixa a página e a coluna na rolagem em que estavam, com "Salvar alterações" inteiro à vista | e2e `:2300`, casos "os dias do meio" (`:2250`) e "o nome do meio" (`:2266`), nas três janelas: `:2311`, `:2315`, `:2323-2324`, `:2325` | ✅ F6e, N2 e N3 morrem em `:2323` nos três casos do nome |

### P1: Novo meio na coluna — CADCOL-08

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| 1 | "Novo meio de pagamento" com "Nome", "Tipo" começando no cartão, "Criar meio", "Cancelar" | `novo-meio.test.tsx:103`, `:119-122` | ✅ |
| 2 | Os dias só com cartão | `novo-meio.test.tsx:130`; `campos-do-meio.test.tsx:150` | ✅ |
| 3 | Regras, ajudas e mensagens de hoje | `novo-meio.test.tsx:148`, `:158`, `:169-218` | ✅ |
| 4 | Criado: na tabela, aberto, "Meio de pagamento criado." | `cadastro-de-meios.test.tsx:264`, `:289`; `meios-de-pagamento.integration.test.ts:396`; e2e `:1200-1211` | ✅ S12 morre em `cadastro-de-meios.test.tsx:296` |
| 5 | Nome de ativo: recusa junto do campo | `novo-meio.test.tsx:258`; `meios-de-pagamento.integration.test.ts:418-431`; e2e `:1220-1227` | ✅ |
| 6 | "Cancelar" fecha sem criar | `novo-meio.test.tsx:293`; `cadastro-de-meios.test.tsx:345` | ✅ |

### P1: A coluna da direita a partir de 1.536 px — CADCOL-09

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| 1 | ≥ 1.536: coluna de 384 px, linha fina | e2e `:1695`; `:1743` `abs(largura − 384) ≤ 1`; `:1749` `{ largura: "1px", tipo: "solid" }` | ✅ S19 morre em `:1743` (16 px), S20 em `:1749` |
| 2 | Título do painel à vista ao rolar | e2e `:1783-1786` | ✅ |
| 3 | Nada aberto ≥ 1.536: o vazio e a dica | e2e `:1699-1704`; `coluna-de-cadastro.test.tsx:104`; `cadastro-de-meios.test.tsx:191` | ✅ |
| 4 | Título, abas e tabela ≤ 1.100 px, centrados | e2e `:1757-1760` | ✅ |
| 5 | < 1.536: uma coluna ≤ 1.024 px, painel entre as abas e a tabela | e2e `:1689-1690`, `:1726-1729`; `:692-693`, `:1387-1388` | ✅ |
| 6 | Nada aberto < 1.536: sem painel | e2e `:1681-1683`, `:1707-1708`; `:684`, `:1379`; `coluna-de-cadastro.test.tsx:104` | ✅ S18 (o vazio a partir de 1.280 px) morre em `:684`, `:1379` e `:1682` |
| 7 | Toda largura a partir de 400 px, nos três estados, **caber** sem rolagem lateral, na página e no painel | e2e `:2113`, as 60 medidas: `:2126-2129` o nome numa palavra só dentro da tabela, `:2130` a página e o painel; `:2138`, as 6 com toque em 768 px: `:2147-2150` e `:2151`; `:829`, `:1530` em 400 px | ❌ Medem a página, o painel e o texto do nome contra a tabela. Não medem a tabela contra o contêiner dela. Com a lista num `overflow-x-auto` e a tabela com 448 px (N5), em 400 px a lista rola 80 px de lado nos três estados (sonda B), a página e o painel ficam em 0, o nome fica dentro da tabela, e os 103 e2e passam (G9) |

### P1: Teclado, foco e toque — CADCOL-10

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| 1 | Botão da linha no `Tab`, abre com `Enter` ou espaço | e2e `:544-549`, `:560-562`; `:1268-1286` | ✅ |
| 2 | Abrir leva o foco ao título | `coluna-de-cadastro.test.tsx:182`, `:190`; `cadastro-de-categorias.test.tsx:180`, `:224`, `:244`; e2e `:549`, `:1206` | ✅ |
| 3 | `Escape` dentro do painel fecha | `coluna-de-cadastro.test.tsx:162`, `:171`; e2e `:552-556` | ✅ S11 morre em `coluna-de-cadastro.test.tsx:168` e mais 2; S10 (a guarda em qualquer botão) em `:234` |
| 4 | O foco volta à linha, ou ao "+ Nova…" | `cadastro-de-categorias.test.tsx:288`, `:300`, `:311`, `:322`; e2e `:555`, `:1279` | ✅ S8 morre em `:288` e `:300` |
| 5 | < 1.536: abrir traz o título para a janela | e2e `:705`, `:710`; `:1399`, `:1404` | ✅ |
| 6 | < 768 px ou ponteiro grosso: botão da linha ≥ 44 × 44 | e2e `:777`, `:1472` em 767 px; `:810-813`, `:1511-1514` com toque em 1.280 px; `:1880-1882`, `:1909-1911` com toque em 1.920 px | ✅ S22 morre em `:321` (36 px), pelos testes de `:1506` e `:1875` |
| 7 | Abas, "+ Nova…", "Fechar", botões dos formulários, "Ver em Lançamentos" e opções de cor ≥ 44 × 44, em qualquer largura e ponteiro | e2e `:849-871`, `:1568-1594` em 400 px; `:1885-1928` com toque em 1.920 px; `:1940` com ponteiro fino em 768 e 1.536 px (as medidas em `medirAlvo`, `:318-321`) | ✅ S21 morre em `:321` (40 px), pelos testes de `:821` e `:1940` |

### P2: O item aberto no endereço — CADCOL-11

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| 1 | `?categoria=` e `?meio=` sem recarregar e sem entrada no histórico | `parametro-na-url.test.tsx:39`; `cadastro-de-categorias.test.tsx:189-192`; e2e `:523-527`, `:1246-1250`; a corrida `:602-614`, `:617-631`, `:1289-1318` | ✅ S6 (a comparação com a barra, L-058) morre em `parametro-na-url.test.tsx:87`, `:98` e mais 4 |
| 2 | Carregar com o parâmetro abre, sem foco | `cadastro-de-categorias.test.tsx:198-199`; `cadastro-de-meios.test.tsx:233`; `coluna-de-cadastro.test.tsx:199-202`; e2e `:529-530`, `:1252-1253` | ✅ S9 morre em `cadastro-de-categorias.test.tsx:199`, `cadastro-de-meios.test.tsx:233` e `coluna-de-cadastro.test.tsx:202` |
| 3 | Id de fora: ignorado, sem erro | `cadastro-de-categorias.test.tsx:205-207`; e2e `:532-535`, `:1255-1258` | ✅ |
| 4 | Fechar ou abrir o cadastro tira o parâmetro, mantendo os outros | `parametro-na-url.test.tsx:52`, `:61`; `cadastro-de-categorias.test.tsx:222-223`, `:289-290`, `:412`, `:432`; `cadastro-de-meios.test.tsx:246`; e2e `:556`, `:614`, `:1280`, `:1301` | ✅ S7 morre em `cadastro-de-categorias.test.tsx:222` e `:432` |

### P2: A decisão registrada — CADCOL-12

Nenhum dos arquivos mudou desde a rodada 1.

| AC | Spec-defined outcome | Evidência | Result |
| --- | --- | --- | --- |
| 1 | AD-022 com o que revê | `.specs/STATE.md:208` | ✅ |
| 2 | A regra de arquivar meio usado por fixo ativo no roadmap | `docs/roadmap.md:95-99` | ✅ |
| 3 | COR-04 e TRES-01, AC 8 apontam para o CADCOL | `.specs/features/cor-por-categoria/spec.md:154`, `:161`, `:167`, `:172`, `:207`; `.specs/features/visao-tres-colunas/spec.md:89` | ✅ |
| 4 | "Largura do conteúdo" com Cadastros | `docs/design.md:124-127` | ✅ |

**Status:** ❌ 93 de 96 ACs com o resultado da spec provado. CADCOL-04, AC 11 e CADCOL-07, AC 13
têm a prova só do componente (G8), e CADCOL-09, AC 7 não prova que a tabela cabe no contêiner dela
(G9). Nenhum spec-precision gap; a redação do CADCOL-09, AC 7 pode ficar mais precisa (Fix 2).

---

## 5. Edge Cases

- [ ] **Nome longo quebra linha, e só ela cresce; uma palavra só quebra no meio, na linha e no
  painel.**
  - Nome de espaços: e2e `:1829-1836`. ✅
  - Na linha: e2e `:2126-2129` e `:2147-2150`, o texto do nome numa palavra só dentro da tabela, nas
    66 medidas. F4f morre. ✅
  - **No painel: ❌.** O que se mede é só a rolagem lateral do `aside` (`:2130`). Com o título
    cortado com reticências (`truncate` no `TituloDoPainel`, N7), o painel não rola e a palavra não
    quebra. A sonda A mostra 66,5 px do texto fora do painel em Categorias, em 400 px, e 163,5 px em
    Meios. Os 103 e2e das abas passam (G10). No código de hoje o título quebra em duas linhas em 400,
    768, 1.536 e 1.920 px, dentro do painel (sonda A).
- [x] **Renomear muda a posição; o painel fica e a linha continua marcada:** e2e `:667-668`
  (categoria) e `:1157-1164` (meio).
- [x] **Criar categoria com nome de ativa ou de arquivada:** e2e `:493-504`.
- [x] **Criar meio com nome de arquivado cria outro; renomear para ele grava:**
  `meios-de-pagamento.integration.test.ts:435-444` e `:205-213`.
- [x] **Só os dias não consulta o nome; só o nome não mexe nos dias:**
  `editar-meio-de-pagamento/handler.test.ts:185`;
  `src/infrastructure/db/repositories/cadastro.repository.integration.test.ts:389`.
- [x] **O item aberto sai da tabela:** `cadastro-de-categorias.test.tsx:372-383`;
  `cadastro-de-meios.test.tsx:397-408`.
- [x] **"Mês atual" mantém a aba, sem o item:** `src/components/seletor-competencia.test.tsx:146`.
- [x] **Mês sem lançamento: "0":** e2e `:415-416` e `:1005-1006`.
- [x] **Erro numa action: no painel, no mesmo modo:** `nova-categoria.test.tsx:144`,
  `novo-meio.test.tsx:275`, `detalhe-do-meio.test.tsx:420`.
- [x] **Formulário de novo meio mais alto que a janela, ≥ 1.536 px:** e2e `:1858-1866`.

---

## 6. Os desvios do autor, julgados

Julgados só contra a spec, depois da passada própria.

| Desvio | Juízo | Por quê |
| --- | --- | --- |
| 1. F8 cria `abrirCartaoRoxo` e o caso dos dias passa a usá-lo | **Aceitável** | São as mesmas três instruções que o caso tinha, com a assertion do título (`:2212`). Nenhuma medida mudou, e os três casos dos dias passam com N2 e N3, que agem só no nome: o caso continua separado do nome |
| 2. F8 procura "Salvar alterações" pelo painel, e não pelo formulário | **Aceitável** | Depois de salvar, o formulário passa a "Editar Cartão Lilás", e o localizador pelo nome velho sumiria. O painel tem um "Salvar alterações" só. F6e, N2 e N3 morrem pelo mesmo controle |
| 3. F9 escreve `textoForaDaTabela`, e não reaproveita `caixasDoTexto` | **Aceitável** | `caixasDoTexto` devolve só o topo e a base. A medida precisa dos lados, e mudar o ajudante deslocaria as citações do arquivo. A função nova lança quando o nome não tem texto à vista, e assim não passa calada |
| 4. F9 mede nas 60 + 6 medidas, e não só em 400, 768 e 1.024 px | **Aceitável** | É mais do que o Done-when pede, e as 66 passam na HEAD |
| 5. F9 põe a assertion nova antes da que mede a rolagem | **Aceitável** | Sem isso, F4f cairia na da rolagem em 768 px e esconderia o caso de 400 px. Com a ordem nova, F4f cai em `:2129`, em 400 px |
| 6. F9 diz, no comentário de `textoForaDaTabela`, que a medida da página não vê o texto que vaza num invólucro | **Aceitável como desvio, mas é aqui a G9** | A medida cobre o texto do nome. Ela não cobre a tabela que passa do invólucro por outro motivo, como uma largura mínima (N5). A Nota da F9 fecha a observação 2 pela letra dela; a cláusula do AC 7, "caber sem rolagem lateral", continua sem a medida da tabela contra o contêiner |
| 7. F10 deixa "grade de duas linhas" em `tabela-de-categorias.tsx:145` | **Aceitável** | A grade tem duas linhas de grade; o texto da segunda quebra quando não cabe, como o comentário do arquivo diz agora |
| 8. F10 não mexe na `validation.md` de Visão em três colunas, que também cita `:606` | **Aceitável** | É o relatório de outra fatia, e registra o que era verdade nele |

---

## 7. Sondas

Descartáveis, só na worktree do sensor, anexadas ao fim de uma cópia de `cadastros-colunas.spec.ts`,
no código de `92063b4`, com o banco `mybilling_test_cad`.

| Sonda | Medida | Juízo |
| --- | --- | --- |
| **A**, as linhas do texto do título do painel com o nome numa palavra só, e o quanto ele passa do `aside`, em 400, 767, 768, 1.023, 1.024, 1.279, 1.280, 1.535, 1.536 e 1.920 px, nas duas abas | Duas linhas em 400, 768, 1.536 e 1.920 px; uma linha nas outras, onde o painel tem até 1.024 px. Nada fora do painel nas 20 medidas | **O código está certo hoje no Edge Case, no painel.** Com N7, o título fica numa linha só e passa do painel em 400, 768 (meios), 1.536 e 1.920 px, de 51,5 a 163,5 px |
| **B**, todo elemento da página com `overflow-x` diferente de `visible` e `scrollWidth > clientWidth`, nas duas abas, nos três estados, em 13 larguras (as dez da F4, mais 500, 639 e 640 px) | 78 medidas. Só o campo "Nome", que rola o próprio valor quando o nome longo não cabe nele, como todo `input` | **O código está certo hoje no AC 7.** Com N5, a sonda acha o invólucro: `DIV.overflow-x-auto +80` em 400 px, nos três estados |
| **C**, o texto dos `dt` de "Onde ela aparece" e de "Onde ele aparece" | "Fixos em Março de 2026" e "Lançamentos em Março de 2026" nas duas abas | **O código está certo hoje na G8.** Com S3, o painel do meio diz "Fixos em Março"; com S3b, o da categoria |

---

## 8. Discrimination Sensor

**A worktree descartável.**
- Criada por `git worktree add --detach` em `92063b4`, sob o scratchpad, com `pnpm install --offline
  --frozen-lockfile` próprio, sem link de `node_modules`.
- Cada mutante conferiu que o trecho original aparecia uma vez só, e foi desfeito com
  `git checkout -- <arquivos>`, com `src` conferido limpo depois de cada um.
- Removida com `git worktree remove --force` e `git worktree prune`. O `git status --porcelain` da
  worktree real estava vazio antes e continuou vazio depois.

**Unidade e integração.** `vitest run --project domain --project componentes` nos arquivos do
módulo mutado, ou `--project integration` no da action. O controle sem mutante passou 155 de 155 nos
oito arquivos e 25 de 25 no de integração. Os quatro vivos rodaram também contra os 2.088
unitários, que passaram com cada um.

**O e2e.**
- A configuração padrão, na porta 3100, depois do e2e do gate. O Playwright subiu o `next dev` da
  worktree descartável a cada mutante.
- Na cópia, `mode: "serial"` virou `"default"` na mesma linha, e as sondas foram para o fim do
  arquivo: as linhas citadas são as do arquivo real, e uma falha não pula os testes seguintes.
- O controle sem mutante passou os dois testes da F4 e as sondas. Cada morte foi conferida na
  assertion esperada.
- Os vivos rodaram de novo contra os três arquivos que desenham as abas, sem as sondas:
  `cadastros-colunas.spec.ts`, `categorias.spec.ts` e `visao-tres-colunas.spec.ts`, 103 testes.

| # | `file:line` | Falha injetada | Quem a mata | Killed? |
| --- | --- | --- | --- | --- |
| B8 | `src/components/detalhe-do-meio.tsx:132` | "Nada mudou" compara o nome sem caixa (rodada 2) | `detalhe-do-meio.test.tsx:268`, 1 de 25 | ✅ Morto |
| F6e | `detalhe-do-meio.tsx:146` | Com o nome mudado, a linha renomeada rolada para a janela (rodada 2) | e2e `:2323` nos três casos do nome: 568, 473 e 318 px. Os três dos dias passam | ✅ Morto |
| F4f | `src/components/coluna-de-cadastro.tsx:153`; `tabela-de-categorias.tsx:168`; `tabela-de-meios.tsx:202` | A lista num `overflow-x-auto`, sem a quebra nos botões (rodada 2) | e2e `:2129` em 400 px, Categorias, 75,7 px fora da tabela; `:2151` com toque, a página em 245 e 205 px | ✅ Morto |
| N1 | `detalhe-do-meio.tsx:139` | O painel manda o nome gravado quando só a caixa muda | `detalhe-do-meio.test.tsx:270`, 1 de 25 | ✅ Morto |
| N2 | `detalhe-do-meio.tsx:146` | `window.scrollTo(0, 0)` só quando o nome do meio muda | e2e `:2323` nos três casos do nome: 545, 393 e 541 px | ✅ Morto |
| N3 | `detalhe-do-meio.tsx:146` | O foco no título do painel, sem `preventScroll`, só quando o nome muda | e2e `:2323` nos três casos do nome: 472, 375 e 24 px | ✅ Morto |
| N4 | `coluna-de-cadastro.tsx:153`; `tabela-de-categorias.tsx:178` | A lista num `overflow-x-auto`, e a cor sem quebra a partir de 768 px | e2e `:2151`: com toque em 768 px, a página rola 2 px. Com ponteiro fino, `:2113` passa | ✅ Morto, por 2 px (observação 2) |
| N5 | `coluna-de-cadastro.tsx:153`; `tabela-de-categorias.tsx:77` | A lista num `overflow-x-auto`, e a tabela com `min-w-[28rem]` | **Nenhum.** `:2113`, `:2138`, `:821` e os 103 e2e das abas passam, e os 2.088 unitários também. A sonda B acha a lista rolando 80 px em 400 px | ❌ **Sobrevive (G9)** |
| N6 | `tabela-de-meios.tsx:184` | `flex-wrap` → `flex-nowrap` na linha do meio abaixo de 768 px | e2e `:389` ("Cartão Roxo: caixa abaixo do nome", pelo laço de `:1482`) em 767 px; `:1530` em 400 px, com a página rolando 1 px | ✅ Morto |
| N7 | `coluna-de-cadastro.tsx:50` | `truncate` no `TituloDoPainel`: o nome longo cortado com reticências | **Nenhum.** `:2113`, `:2138` e os 103 e2e das abas passam, e os 2.088 unitários também. A sonda A acha o texto fora do painel | ❌ **Sobrevive (G10)** |
| S1 | `src/app/(app)/[competencia]/cadastros/categorias/page.tsx:63` | A categoria lê o uso do meio | e2e `:413`: "0 fixos", e não "1 fixo" | ✅ Morto |
| S2 | `src/application/cadastros/obter-uso-no-mes/handler.ts:29` | Conta sem materializar antes | `handler.test.ts:116` e mais 4 (5 de 10) | ✅ Morto |
| S3 | `src/app/(app)/[competencia]/cadastros/meios-de-pagamento/page.tsx:74` | `rotuloDaCompetencia={nomeDoMes(mes)}`: o painel do meio diz "Fixos em Março" | **Nenhum.** Os 103 e2e das abas e os 2.088 unitários passam. A sonda C acha o rótulo errado | ❌ **Sobrevive (G8)** |
| S3b | `categorias/page.tsx:70` | O mesmo no painel da categoria | **Nenhum.** Idem | ❌ **Sobrevive (G8)** |
| S4 | `categorias/page.tsx:61` | A ordem das categorias pelo código de caractere | `e2e/categorias.spec.ts:345` | ✅ Morto |
| S6 | `src/components/parametro-na-url.ts:37` | Compara com a barra, e não com o último pedido (L-058) | `parametro-na-url.test.tsx:87`, `:98`; `cadastro-de-categorias.test.tsx:412`, `:423`; `cadastro-de-meios.test.tsx:437`, `:448` (6 de 50) | ✅ Morto |
| S7 | `src/components/cadastro-de-categorias.tsx:135` | "+ Nova categoria" não tira `?categoria=` | `cadastro-de-categorias.test.tsx:222`, `:432` | ✅ Morto |
| S8 | `cadastro-de-categorias.tsx:141` | Fechar devolve sempre o foco ao "+ Nova categoria" | `cadastro-de-categorias.test.tsx:288`, `:300` | ✅ Morto |
| S9 | `coluna-de-cadastro.tsx:85` | `focarTitulo !== 0` → `>= 0`: a carga pelo endereço rouba o foco | `coluna-de-cadastro.test.tsx:202`; `cadastro-de-categorias.test.tsx:199`; `cadastro-de-meios.test.tsx:233` | ✅ Morto |
| S10 | `coluna-de-cadastro.tsx:126-127` | A guarda do foco age em qualquer botão, e não só no desabilitado (L-056) | `coluna-de-cadastro.test.tsx:234` | ✅ Morto |
| S11 | `coluna-de-cadastro.tsx:117` | `Escape` não fecha | `coluna-de-cadastro.test.tsx:168`; `cadastro-de-categorias.test.tsx:299`; `cadastro-de-meios.test.tsx:330` | ✅ Morto |
| S12 | `src/components/cadastro-de-meios.tsx:112` | `estava && !esta` → `!esta`: o painel fecha antes de o meio criado chegar | `cadastro-de-meios.test.tsx:296` | ✅ Morto |
| S13 | `cadastro-de-categorias.tsx:158` | Sem a chave do detalhe: trocar de categoria mantém o digitado | `cadastro-de-categorias.test.tsx:336` | ✅ Morto |
| S14 | `detalhe-do-meio.tsx:62` | A recusa do fechamento vai para o campo do vencimento | `detalhe-do-meio.test.tsx:341`, `:375` | ✅ Morto |
| S16 | `src/application/schemas/meio-pagamento.schema.ts:66` | A edição aceita o vencimento 32, no navegador e no servidor | `meio-pagamento.schema.test.ts:206`; `detalhe-do-meio.test.tsx:352` | ✅ Morto |
| S17 | `tabela-de-meios.tsx:96` | Os cabeçalhos dos meios só a partir de 1.024 px | e2e `:1487`, em 768 px | ✅ Morto |
| S18 | `coluna-de-cadastro.tsx:103` | O vazio à vista a partir de 1.280 px (`xl:` no lugar de `2xl:`) | e2e `:684`, `:1379` em 1.280 px; `:1682` em 1.535 px, nas duas abas | ✅ Morto |
| S19 | `coluna-de-cadastro.tsx:94` | A coluna com 25rem (400 px) | e2e `:1743`, 16 px a mais, em 1.536 e 1.920 px, nas duas abas | ✅ Morto |
| S20 | `coluna-de-cadastro.tsx:102` | Sem a linha fina da coluna | e2e `:1749`, nos quatro casos | ✅ Morto |
| S21 | `src/components/cabecalho-de-cadastros.tsx:51` | As abas com `min-h-10` | e2e `:321` "altura de aba Categorias", 40 px, pelos testes de `:821` e `:1940` (768 e 1.536 px) | ✅ Morto |
| S22 | `tabela-de-meios.tsx:202` | `md:pointer-fine:min-h-9` → `md:min-h-9`: o botão da linha com 36 px também no toque | e2e `:321`, pelos testes de `:1506` e `:1875` | ✅ Morto |
| S23 | `src/components/detalhe-da-categoria.tsx:100` | O nome igual ao gravado chama o servidor | `detalhe-da-categoria.test.tsx:406` | ✅ Morto |
| S24 | `src/app/actions/meios-de-pagamento.ts:147` | Revalida também quando nada mudou | `meios-de-pagamento.integration.test.ts:245` | ✅ Morto |
| S25 | `tabela-de-meios.tsx:207` | O tipo do meio sem quebra a partir de 768 px | e2e `:2130` e `:2151`: Meios rola 38 px em 768 px, nos três estados | ✅ Morto |
| S26 | `coluna-de-cadastro.tsx:137` | `[overflow-wrap:break-word]` no `aside` | e2e `:2130`: o painel da categoria rola 132 px em 400, 20 em 768 e 143 em 1.536 e 1.920 px; `:2151` com toque | ✅ Morto |
| S27 | `detalhe-da-categoria.tsx:113` | O foco no título depois de "Categoria renomeada.", sem `preventScroll` | e2e `:2323` em 1.920 × 480, 24 px. Em 400 × 700 e 1.280 × 480 o título já está na janela, e nada se move | ✅ Morto |
| S28 | `tabela-de-categorias.tsx:156`, `:178` | A cor sobe para a linha da pill abaixo de 768 px | e2e `:386` ("caixa na faixa do nome"), em 767 e 400 px | ✅ Morto |

**Sensor depth**: ampliado, com 37 mutantes, na última rodada antes de escalar:
- os 2 vivos da rodada 2 e o F4f;
- 6 contra a F7, a F8 e a F9 (N1 a N5 e N7);
- 28 na amostra do resto: contagem e mês, ordem, endereço e corrida, foco, abrir e fechar o painel,
  erro de campo, limites no navegador, limiares, largura e borda da coluna, alvos de toque, "nada
  mudou sem servidor", revalidação, rolagem lateral, a tela parada ao salvar e a linha do celular.

**Resultado do sensor**: 33 de 37 mortos. Sobrevivem S3, S3b, N5 e N7.

---

## 9. Gate Check

- **Gate command**: o `build` de `tasks.md:130`.
  - Cada passo do `pnpm verify` rodou sozinho, com o código de saída conferido, e depois o `pnpm
    verify` inteiro.
  - Depois veio o e2e inteiro na porta 3100, com `DATABASE_URL_TEST` no banco `mybilling_test_cad`.
  - O banco já estava de pé (`mybilling-db`, saudável), e o `pnpm db:up` não foi preciso.
- **Saídas**:
  - `pnpm typecheck`: 0.
  - `pnpm lint`: 0, com 368 arquivos.
  - `pnpm test:unit`: 0. **2.088 passaram em 132 arquivos**, 0 falhas, 0 skip. `src/domain` tem
    100% de branches (393/393).
  - `pnpm test:integration`: 0. **406 passaram em 25 arquivos.**
  - `pnpm build`: 0, com `/[competencia]/cadastros/categorias` e
    `/[competencia]/cadastros/meios-de-pagamento`.
  - `pnpm verify` inteiro: 0.
  - **e2e inteiro: 0, com 266 de 266 em 17 arquivos na primeira passada**, em 6,9 min. Os 73 de
    `cadastros-colunas.spec.ts` passaram.
- **Contagem antes da fatia** (`e8b1540`): 1.832 unitários, 364 de integração e 193 e2e.
- **Delta**: +256 unitários, +42 de integração e +73 e2e. Nesta rodada, +1 unitário e +3 e2e.
- **Skipped**: nenhum.
- **Efeito colateral**: o `next dev` do e2e reescreveu `next-env.d.ts` na worktree real. Foi
  restaurado com `git checkout -- next-env.d.ts`.

---

## 10. Code Quality

| Principle | Status |
| --- | --- |
| Minimum code | ✅ A rodada não muda código de produto; F7 é um teste, F8 um caso e um ajudante, F9 uma medida |
| Surgical changes | ✅ Cada commit toca o Where da task dele |
| No scope creep | ✅ |
| Matches patterns | ✅ `textoForaDaTabela` segue `caixasDoTexto`; o caso novo segue os de `GRAVACOES` |
| Spec-anchored outcome check | ❌ 93 de 96; G8 e G9, e o Edge Case do nome longo no painel (G10) |
| Per-layer Coverage Expectation | ⚠️ O rótulo do painel tem só o teste do componente, que recebe o texto pronto (G8, L-054) |
| Every test maps to a spec requirement | ✅ Os testes novos citam o CADCOL e o AC no título |
| Documented guidelines followed | `AGENTS.md`: ✅ nenhum skip, nenhuma assertion afrouxada, nenhum timeout mexido |

**`AGENTS.md`, regras 1 a 5, na rodada:**
1. **AD-009:** as fixtures novas são "Cartão Lilás" e "cartão roxo", com os dias 25 e 5. Nenhum nome
   de banco, de pessoa ou valor real no diff, nos comentários nem nas mensagens dos quatro commits.
2. **Centavos:** nenhum campo monetário tocado.
3. **Competência:** nenhum `Date` novo; `src/domain` não mudou.
4. **Domínio puro:** `src/domain` não mudou; `arquitetura.test.ts` passa no gate.
5. **Só `movimento` é somável:** nada soma; a rodada é de teste e de comentário.

---

## 11. Fix Plans

Em ordem de prioridade. As três são só de teste: o código está certo hoje (sondas A, B e C). Cada
uma começa pelo teste, que passa na HEAD e cai com o mutante dela. **Precisa do dono:** a rodada 3 é a
última do limite, e abrir uma quarta para estas correções é decisão dele. Nenhuma pede decisão nova
sobre o produto.

### Fix 1 — CADCOL-04, AC 11 e CADCOL-07, AC 13: o rótulo do mês lido na tela (G8)

- **Root cause:** a página monta `rotuloDaCompetencia` (`categorias/page.tsx:70`,
  `meios-de-pagamento/page.tsx:74`). Os testes do componente recebem "Março de 2026" pronto, e os e2e
  de `:399` e `:989` leem só os `dd` da seção (L-054).
- **Fix task:** em `e2e/cadastros-colunas.spec.ts`, ao lado de `:420` e de `:1010`, afirmar
  `secao.locator("dt")` com `["Fixos em Março de 2026", "Lançamentos em Março de 2026"]`.
- **Done when:** os dois testes passam na HEAD e caem com S3 e S3b, um cada.
- **Priority:** Minor. **Needs owner:** só para abrir a rodada 4.

### Fix 2 — CADCOL-09, AC 7: a tabela cabe no contêiner dela (G9)

- **Root cause:** `medirRolagemLateral` mede a página, o `aside` e o texto do nome contra a tabela.
  Um invólucro que rola por conta própria esconde das três medidas uma tabela mais larga que ele.
  O comentário de `textoForaDaTabela` promete isso, e a medida só cobre o nome.
- **Fix task:** em `medirRolagemLateral`, medir também a caixa da tabela contra a do contêiner da
  lista, ou, como a sonda B, todo elemento da página com `overflow-x` diferente de `visible` e
  `scrollWidth > clientWidth`, fora os campos de texto. Afirmar 0 nas 66 medidas.
  - A redação do AC pode ficar mais precisa: "sem rolagem lateral na página, no painel nem em região
    nenhuma dentro deles". A escolha do dono, "Nunca rolar de lado", já cobre isso.
- **Done when:** passa na HEAD e cai com N5 em 400 px, e com N4 também com ponteiro fino em 768 px.
- **Priority:** Minor. **Needs owner:** só para abrir a rodada 4.

### Fix 3 — Edge Case "Nome longo": a palavra quebra no painel (G10)

- **Root cause:** a cláusula "quebra no meio, no painel" só tem a medida da rolagem do `aside`. Um
  corte com reticências não rola (L-067: um caso por cláusula).
- **Fix task:** no estado "item aberto" de `medirRolagemLateral`, medir as caixas do texto do título
  do painel e da legenda "Cor de <nome>" contra a caixa do `aside`, como `textoForaDaTabela` faz com
  a tabela, e afirmar 0.
- **Done when:** passa na HEAD e cai com N7 em 400, 1.536 e 1.920 px.
- **Priority:** Minor. **Needs owner:** só para abrir a rodada 4.

---

## 12. Observações não bloqueantes, para o dono

1. **O código está certo nas três lacunas.** O painel diz "Fixos em Março de 2026" nas duas abas
   (sonda C); nenhuma região da página rola de lado em 13 larguras, nos três estados (sonda B); e a
   palavra longa quebra dentro do painel (sonda A). As lacunas são de teste: uma mudança futura
   poderia quebrar essas três coisas sem a suíte ver.
2. **N4 morreu por 2 px.** Com a lista num invólucro e a cor sem quebra entre 768 e 1.023 px, só o
   teste com toque em 768 px viu a página rolar 2 px. Com ponteiro fino, nada caiu. A Fix 2 o mata
   pelos dois.
3. **Um comentário velho fora do Where:** o cabeçalho de `detalhe-do-meio.tsx:15` ainda diz "ACs 1 a
   6 e 9 a 13". O componente também decide o AC 8, e o teste já cita o AC 8 desde a F7. Cosmético.

---

## 13. Requirement Traceability Update

Proposta para o `spec.md`. Com o FAIL, o Verifier não edita a spec.

| Requirement | Previous Status | New Status |
| --- | --- | --- |
| CADCOL-01 | ✅ Verified (rodada 2) | ✅ Verified |
| CADCOL-02 | ✅ Verified (rodada 2) | ✅ Verified |
| CADCOL-03 | ✅ Verified | ✅ Verified |
| CADCOL-04 | ✅ Verified (rodada 2) | ❌ Needs Fix (AC 11, G8) |
| CADCOL-05 | ✅ Verified | ✅ Verified |
| CADCOL-06 | ✅ Verified (rodada 2) | ✅ Verified |
| CADCOL-07 | ❌ Needs Fix (rodada 2) | ❌ Needs Fix (AC 13, G8). Os ACs 8 e 16 fecharam |
| CADCOL-08 | ✅ Verified | ✅ Verified |
| CADCOL-09 | ✅ Verified (rodada 2) | ❌ Needs Fix (AC 7, G9; Edge Case do nome longo no painel, G10) |
| CADCOL-10 | ✅ Verified (rodada 2) | ✅ Verified |
| CADCOL-11 | ✅ Verified | ✅ Verified |
| CADCOL-12 | ✅ Verified | ✅ Verified |

---

## 14. Lições

Gravadas por `lessons.py add`, uma por falha com sinal:
- **L-054** (`surviving_mutant`, G8; S3 e S3b): a mesma lição de Todo mês, com o mesmo texto. O campo
  que a página monta para um componente precisa de e2e que leia o texto na tela. Passa a
  `confirmed`, em duas fatias.
- **L-068** (`surviving_mutant`, G9; N5): a medida de "sem rolagem lateral" compara cada região com o
  contêiner dela, e não só a página e o painel.
- **L-069** (`surviving_mutant`, G10; N7): o edge case que diz que o texto quebra precisa de
  assertion de que o texto fica dentro da caixa; a ausência de rolagem não vê o corte com
  reticências.

---

## 15. Summary

**Overall**: ❌ Not Ready.

**Spec-anchored check**: 93 de 96 ACs com o resultado da spec provado. CADCOL-04, AC 11 e CADCOL-07,
AC 13 sem o rótulo lido na tela (G8); CADCOL-09, AC 7 sem a tabela medida contra o contêiner (G9); e
o Edge Case do nome longo sem a quebra no painel (G10). Nenhum spec-precision gap.
**Sensor**: 33 de 37 mortos; vivos S3, S3b, N5 e N7.
**Gate**: `typecheck`, `lint`, 2.088 unitários, 406 de integração, `build` e o `pnpm verify` inteiro
saem 0. O e2e passou 266 de 266 na primeira passada.

**What works**:
- **As lacunas da rodada 2 fecharam.** Mudar só a caixa do nome do meio grava pelo painel, e
  renomear o meio deixa a tela parada; B8, F6e, N1, N2 e N3 morrem.
- **A palavra longa fica dentro da tabela** em 400 px também: F4f morre onde antes passava.
- **Nada do que as rodadas 1 e 2 fecharam voltou,** e a amostra larga morre: contagem, ordem,
  endereço e corrida, foco, limiares, largura e borda, alvos de toque, revalidação e a tela parada.

**Issues found**: G8, G9 e G10, na seção 11. As três se fecham com assertions novas no e2e, sem
mudar o código.

**Next steps**: o limite de três rodadas acabou. O dono decide se as Fixes 1 a 3 entram numa rodada
4, ou se ficam registradas como dívida de teste.

---

## Rodada 2 (resumo)

**2026-10-31, `21aa62b` (relatório em `14acc90`), FAIL ❌.**

- **Spec-anchored:** 94 de 96.
  - CADCOL-07, AC 8 provado só no servidor. O painel decide "nada mudou" antes de chamar o
    servidor, e nenhum teste mudava só a caixa do nome do meio (G6).
  - CADCOL-07, AC 16 provado só na cláusula dos dias (G7).
- **As cinco lacunas da rodada 1** fecharam, e E7, E14b, E15, E17, E18 e E19 morreram.
- **Sensor:** 37 mutantes, 35 mortos. Sobreviveram B8 (G6) e F6e (G7).
- **Gate:** verde, com 2.087 unitários, 406 de integração e 263 e2e.
- **Observações:** em 400 px, a medida da F4 não via a palavra longa vazando num invólucro (F4f,
  observação 2); os comentários de "duas linhas de texto" (Fix 3); a citação
  `visao-tres-colunas.spec.ts:606` deslocada (observação 5).
- **Lições:** L-041 passou a `confirmed`; L-067, candidata.
- **Fix 1 e Fix 2** viraram a F7 e a F8; a observação 2 virou a F9; a Fix 3 e a observação 5 viraram
  a F10.

## Rodada 1 (resumo)

**2026-10-31, `e4789ef` (relatório em `34449f7`), FAIL ❌.**

- **Spec-anchored:** 89 de 94.
  - CADCOL-06, AC 8 sem o resultado da spec: o cartão de crédito ocupava três linhas de texto em
    360, 400 e 500 px, e o AC pedia duas (G1).
  - Quatro ACs com a prova incompleta:
    - CADCOL-02, AC 8 medido só em 400 px, longe do limiar (G2);
    - CADCOL-10, AC 7 sem medida com ponteiro fino a partir de 768 px (G3);
    - CADCOL-09, AC 7 só em 400 px com um item aberto. "Automática (Verde-água)" rolava a página
      10 px em 768 px, e um nome de uma palavra só a rolava em 400, 768 e 1.024 px (G4);
    - CADCOL-01, AC 6 provado só pela ordem do DOM (G5).
- **Sensor:** 46 mutantes, 40 mortos. Sobreviveram E7, E14b, E15, E17, E18 e E19. E15 (uma rolagem
  até o alto depois de salvar) não feria AC nenhum.
- **Gate:** verde, com 2.087 unitários, 406 de integração e 247 e2e.
- **Lições:** L-062 a L-066, candidatas; L-055 passou a `confirmed`.
- **Decisões do dono em 2026-10-31**, depois do relatório:
  - G1: "Aceitar a quebra" (saída A). Abaixo de 768 px, a linha de baixo quebra quando não cabe.
  - G4: "Nunca rolar de lado", "sim" às duas perguntas. Nenhuma rolagem lateral em largura nenhuma
    a partir de 400 px, e a palavra mais larga que a coluna quebra no meio.
  - E15: "Sim, como em Todo mês". A tela fica parada ao salvar, e isso virou um AC novo.
- **Fix Plans 1 a 5** viraram as tasks F1 a F5, e E15 virou a F6.
