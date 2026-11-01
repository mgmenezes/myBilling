# Cadastros em abas, com o item aberto à direita: Validation

## Validation: cadastros-colunas, rodada 2 — FAIL ❌

**Date**: 2026-10-31
**Spec**: `.specs/features/cadastros-colunas/spec.md`
**Diff range**: `e8b1540..21aa62b`, a fatia inteira. Desde a rodada 1 (`34449f7`): `971b6c6` (F1),
`5894141` (F2), `0e6cf23` (F3), `7ee5281` (F4), `19e972f` (F5) e `21aa62b` (F6).
**Verifier**: sub-agente independente (autor ≠ verificador), rodada 2

**Resumo do veredito.**
- **As cinco lacunas da rodada 1 estão fechadas**, e a F6 entrega a terceira decisão do dono.
  - Os seis vivos da rodada 1 morrem: E7, E14b, E15, E17, E18 e E19 (seção 8).
  - As três decisões do dono de 2026-10-31 estão nos ACs, nas premissas e nos testes: a quebra
    abaixo de 768 px, nenhuma rolagem lateral e a tela parada ao salvar.
- **Gate verde, nas duas pontas.**
  - `typecheck`, `lint`, 2.087 unitários, 406 de integração e `build` saem 0.
  - O e2e inteiro passou 263 de 263 na primeira passada, 70 deles em `cadastros-colunas.spec.ts`.
- **Sensor:** 37 mutantes, 35 mortos, 2 vivos: F6e e B8.
  - Todo mutante contra a F4 morre (sete), e cinco dos seis contra a F6.
  - Os dois vivos caem em cláusulas de AC que só o servidor ou só uma gravação provam.
- **Duas lacunas novas, nenhuma do dono.** O código está certo hoje nas duas (sondas P3 e P5); falta
  o teste.
  1. **G6.** CADCOL-07, AC 8 no navegador. O `DetalheDoMeio` confere "nada mudou" antes de chamar o
     servidor, e nenhum teste muda só a caixa do nome do meio. Com a comparação sem caixa (B8), a
     tela engole a mudança, sem gravar nem avisar, e a suíte inteira passa.
  2. **G7.** CADCOL-07, AC 16 diz "o nome ou os dias", e o teste da F6 salva só os dias. Uma rolagem
     até a linha renomeada (F6e) leva a página de 545 a 1.113 px em 400 × 700, e a suíte passa.
- **Os quatro desvios do autor** (seção 6): três aceitáveis; os comentários de "duas linhas de
  texto" são um defeito cosmético, não bloqueante.

---

## 1. Integridade da rodada

- **O código mudou só onde a F4 diz.** `git diff 34449f7..21aa62b -- src e2e` toca quatro arquivos:
  - `src/components/coluna-de-cadastro.tsx`: `[overflow-wrap:anywhere]` no `aside`, com o comentário;
  - `src/components/tabela-de-categorias.tsx`: a mesma regra no botão da linha, e a cor com
    `lg:whitespace-nowrap` no lugar de `md:`;
  - `src/components/tabela-de-meios.tsx`: a regra no botão da linha;
  - `e2e/cadastros-colunas.spec.ts`: 432 linhas acrescentadas e **nenhuma apagada**.
- **Nenhum teste saiu, foi pulado ou afrouxado.** Os arquivos de unidade e de integração são os da
  rodada 1, byte a byte: as citações deles valem como estavam. No e2e, só entram assertions.
- **Nenhum `skip`, `only`, `fixme`, `any` nem `// SPEC_DEVIATION`** no diff da rodada.
- **As citações da traceability conferem.** F1 e F2 remapearam as de `e2e/cadastros-colunas.spec.ts`
  por script. Conferi em `21aa62b` cada linha citada desse arquivo: cada uma é o título do teste
  nomeado ou a assertion descrita. As de `categorias.spec.ts` (`:326`, `:366`, `:464`, `:531`) e
  `visao-tres-colunas.spec.ts:220` também. Uma só está deslocada: `visao-tres-colunas.spec.ts:606`
  cai duas linhas abaixo do título do teste, que está em `:604` (observação 5).
- **Os seis commits passam no `check_commit.py`**, um por correção. Cada um marca a task em
  `tasks.md` e a traceability no `spec.md`. Nenhuma caixa de `tasks.md` ficou aberta.
- **Contagens**, medidas aqui:
  - unitários: 2.087 em 132 arquivos, como na rodada 1;
  - integração: 406 em 25 arquivos, como na rodada 1;
  - e2e: 247 → 263 em 17 arquivos (+16: 2 na F3, 2 na F4, 3 na F5 e 9 na F6).

---

## 2. As lacunas da rodada 1, fechadas

| Lacuna | Como fechou | Prova nesta rodada |
| --- | --- | --- |
| G1, decisão do dono | CADCOL-02 e CADCOL-06, AC 8 dizem "de 400 a 767 px", o nome sozinho em cima e o resto embaixo, "que quebram em mais linhas quando não cabem"; a premissa "Celular" passa a `y` | e2e `:1536` mede o cartão em 400 px; um mutante que sobe o tipo para a linha do nome cai (Nota da F1) |
| G2 | As assertions de 400 px também em 767 px | E17 morre em `:786` ("Categoria Dois": 3 linhas, e não 1); E18 em `:1483` ("Cartão Roxo": 5) |
| G3 | Os alvos medidos com ponteiro fino em 768 e 1.536 px, com o painel e os dois formulários abertos | E19 morre nos dois casos de `:1940` ("largura de Fechar") |
| G4, decisão do dono | CADCOL-09, AC 7 vale em toda largura a partir de 400 px, nos três estados, na página e no painel; o Edge Case do nome longo ganha a palavra que quebra | E7 morre em `:2107` (Meios, 23 px no toque em 768 px); F4a a F4g morrem em `:2090` e `:2107` |
| G5 | A ação medida ao lado do título em 400, 1.535 e 1.536 px | E14b morre em `:2125` (a ação começa em 180,9 px, e a base do título está em 164,9) |
| E15, decisão do dono | CADCOL-04 e CADCOL-07, AC 16, com a premissa "A tela ao salvar" | E15 morre em `:2256` nos três casos do meio (545, 393 e 541 px) |

---

## 3. Task Completion

| Task | Status | Notes |
| --- | --- | --- |
| T1 a T22 | ✅ Done | Rodada 1 |
| F1 | ✅ Done | Os dois ACs 8 e a premissa; o cartão medido em 400 px |
| F2 | ✅ Done | A regra do AC 8 em 767 px |
| F3 | ✅ Done | Os alvos com ponteiro fino em 768 e 1.536 px |
| F4 | ✅ Done | AC 7, Edge Case e premissa; a correção em três componentes; desvio 1 |
| F5 | ✅ Done | A ação ao lado do título |
| F6 | ⚠️ Done, com lacuna | O AC 16 do meio diz "o nome ou os dias", e só os dias entram em `GRAVACOES` (G7); desvios 2 e 3 |

---

## 4. Spec-Anchored Acceptance Criteria

Cada linha cita o teste e a assertion em `21aa62b`. "e2e" é `e2e/cadastros-colunas.spec.ts`, salvo
quando outro arquivo é nomeado; os componentes estão em `src/components/`. As linhas do e2e da
rodada 1 foram remapeadas pelo diff e conferidas uma a uma.

### P1: Duas abas em Cadastros — CADCOL-01

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| 1 | `h1` "Cadastros" e, abaixo, a navegação "Cadastros" com os dois links | `cabecalho-de-cadastros.test.tsx:39-40` `antes(titulo, abas())`; e2e `:442` | ✅ |
| 2 | Os links levam às duas rotas no mês aberto | `cabecalho-de-cadastros.test.tsx:47-50`; e2e `:451-454` `href`, `:1032` a URL depois do clique | ✅ |
| 3 | `aria-current="page"` só na aba aberta | `cabecalho-de-cadastros.test.tsx:55-67`; e2e `:443-450`, `:1034-1041` | ✅ |
| 4 | O item "Cadastros" abre Categorias | e2e `:439-441` `toHaveURL(…/cadastros/categorias$)`; `e2e/categorias.spec.ts:330-332` | ✅ |
| 5 | "Cadastros" ativo em toda aba | e2e `:455`, `:1042` `aria-current` "page" | ✅ |
| 6 | "+ Nova…" ao lado do título, em todas as larguras | e2e `:2125-2134` em 400, 1.535 e 1.536 px, nas duas abas: a ação na faixa vertical do `h1` (duas assertions) e à direita dele; `cabecalho-de-cadastros.test.tsx:76-80` a ordem do DOM | ✅ E14b morre |

### P1: Uma linha por categoria — CADCOL-02

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| 1 | Tabela "Categorias" com as quatro colunas | `tabela-de-categorias.test.tsx:92`; e2e `:790-795` | ✅ |
| 2 | Ordem pt-BR, sem caixa nem acento | `e2e/categorias.spec.ts:345-352`, fixture que a ordem do banco e a do código de caractere desmentem | ✅ |
| 3 | Pill com o nome, na cor em uso | `tabela-de-categorias.test.tsx:114`, `:120`; `e2e/categorias.spec.ts:355-363` | ✅ |
| 4 | "Laranja" ou "Automática (<cor>)" | `tabela-de-categorias.test.tsx:132`, `:138-139`; `cor-de-categoria.test.ts:212`, `:216` | ✅ |
| 5 | Contagens de CADCOL-03, "0" sem uso | e2e `:413-416` | ✅ |
| 6 | Nenhum botão além do que abre | `tabela-de-categorias.test.tsx:165` | ✅ |
| 7 | ≥ 1.280 px, ponteiro fino: cada linha ≤ 48 px | e2e `:758-762` em 1.280 px; `:1829-1836` em 1.536 e 1.920 px | ✅ B15 morre em `:761` (52,5 px) |
| 8 | De 400 a 767 px: sem cabeçalho, a pill sozinha na primeira linha de texto, e embaixo a cor e as contagens com o nome escrito, quebrando quando não cabem | 767 px: e2e `:775` nenhum `columnheader`, `:780` o nome da contagem à vista, `:784-787` a pill sozinha em cima e o resto numa linha; 400 px: `:834-835` duas linhas de texto, `:842-846` as células abaixo da pill; 768 px: `:790-799` os cabeçalhos e o nome só para leitor de tela | ✅ E17 e B14 morrem |
| 9 | Lista vazia: o aviso com "+ Nova categoria" | `tabela-de-categorias.test.tsx:217` | ✅ |

### P1: O uso no mês aberto — CADCOL-03

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| 1 | Fixos cujo período contém o mês, de qualquer natureza | `src/domain/cadastro/uso-no-mes.test.ts:62`, `:68`, `:72`, `:86-87` | ✅ |
| 2 | Fora o que começa depois e o que terminou antes | `uso-no-mes.test.ts:107-108`, `:112-113`; e2e `:413` | ✅ |
| 3 | Lançamentos não cancelados da competência, com a ocorrência do fixo | `uso-no-mes.test.ts:129`, `:144`, `:155`, `:159`, `:194`; e2e `:414` | ✅ B1 morre em `:159` |
| 4 | Igual ao que Lançamentos mostra com o filtro | `src/application/cadastros/obter-uso-no-mes/handler.test.ts:237-238`, `:249-250`; e2e `:426-428`, `:1016-1018` | ✅ |
| 5 | Materializa antes de contar | `handler.test.ts:112`, `:116-117`, `:144`; `handler.integration.test.ts:97-103`; e2e `:408` | ✅ |
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
| 9 | Nome igual depois de normalizar: não grava nem avisa | `detalhe-da-categoria.test.tsx:400` | ✅ |
| 10 | Só a caixa: grava e avisa | `detalhe-da-categoria.test.tsx:411-419` `renomear` chamado com "categoria um" e "Categoria renomeada." | ✅ |
| 11 | "Onde ela aparece" com as contagens e o link | `onde-aparece.test.tsx:19`; `detalhe-da-categoria.test.tsx:435`; e2e `:420` | ✅ |
| 12 | O link abre Lançamentos filtrado | e2e `:423-425` | ✅ |
| 13 | Fundo diferente e `aria-expanded` | `tabela-de-categorias.test.tsx:196`, `:207`; e2e `:734-737` | ✅ |
| 14 | Trocar de item ou abrir "+ Nova…" descarta o digitado | `cadastro-de-categorias.test.tsx:327`, `:342` | ✅ |
| 15 | "Fechar" fecha e desmarca | `coluna-de-cadastro.test.tsx:142`; `cadastro-de-categorias.test.tsx:286-287` | ✅ |
| 16 | Salvar a cor ou o nome deixa a página e a coluna na rolagem em que estavam, com o controle inteiro à vista | e2e `:2233`, casos "a cor" e "o nome da categoria", em 400 × 700, 1.280 × 480 e 1.920 × 480: `:2244` o controle fora antes, abaixo de 1.536 px; `:2248` a página rolada antes; `:2256-2257` a página e a coluna (± 1 px); `:2258` `toBeInViewport({ ratio: 1 })` | ✅ F6a, F6b e F6f morrem |

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
| 1 | Tabela com as seis colunas | `tabela-de-meios.test.tsx:99`; e2e `:1487-1494` | ✅ |
| 2 | Ordem pt-BR | e2e `:1054-1055` a fixture desmente o banco e o código de caractere; `:1059` | ✅ B6 morre em `:1059` |
| 3 | "Cartão de crédito", "Conta corrente" ou "Rótulo" | `tabela-de-meios.test.tsx:133`, `:139`, `:145`; e2e `:1061`, `:1069` | ✅ |
| 4 | "dia N" no cartão, "—" na conta e no rótulo | `tabela-de-meios.test.tsx:160-161`, `:169-170`; e2e `:1062-1071` | ✅ B7 morre em `:1062` ("fecha dia 5") |
| 5 | Contagens de CADCOL-03, "0" sem uso | e2e `:1001-1006` | ✅ |
| 6 | Nenhum botão além do que abre | `tabela-de-meios.test.tsx:200-201` | ✅ |
| 7 | ≥ 1.280 px, ponteiro fino: cada linha ≤ 48 px | e2e `:1451-1455`; `:1829-1836` | ✅ |
| 8 | De 400 a 767 px: sem cabeçalho, o nome sozinho em cima, e embaixo o tipo, os dias e as contagens com o nome escrito, quebrando quando não cabem | 767 px: e2e `:1469`, `:1476-1477`, `:1481-1484` os quatro meios com o resto numa linha; 400 px: `:1536` "Cartão Roxo" com toda caixa abaixo do nome, `:1537-1541` "Conta Corrente" em duas linhas, `:1549-1561` as células | ✅ E18 morre |
| 9 | Lista vazia: o aviso com "+ Novo meio" | `tabela-de-meios.test.tsx:247-251` | ✅ |

### P1: O meio aberto — CADCOL-07

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| 1 | Linha ou botão abre; nome como título e o subtítulo do tipo | `tabela-de-meios.test.tsx:205-221`; `detalhe-do-meio.test.tsx:146`, `:156`, `:163`; e2e `:1202-1204` | ✅ |
| 2 | "Editar <nome>", "Nome", o tipo em texto com a frase, "Salvar alterações" | `detalhe-do-meio.test.tsx:172`; `campos-do-meio.test.tsx:107` | ✅ |
| 3 | No cartão, os dias gravados e a nota | `detalhe-do-meio.test.tsx:192`, `:200` | ✅ |
| 4 | Nenhum controle de tipo, nem dia na conta e no rótulo | `detalhe-do-meio.test.tsx:183`; `campos-do-meio.test.tsx:127`, `:143`; `mudancas-do-meio.test.ts:127` | ✅ |
| 5 | Grava, "Meio de pagamento salvo.", nome e dias novos na linha e no painel | `detalhe-do-meio.test.tsx:211`, `:227`, `:242`; `meios-de-pagamento.integration.test.ts:164`; e2e `:1097-1111` | ✅ |
| 6 | Nome de outro ativo: recusa junto do campo | `editar-meio-de-pagamento/handler.test.ts:154-156`; `meios-de-pagamento.integration.test.ts:253`; e2e `:1126-1136` | ✅ |
| 7 | Nome de arquivado grava | `handler.test.ts:159`; `meios-de-pagamento.integration.test.ts:205-213` | ✅ |
| 8 | Só a caixa grava | Servidor: `mudancas-do-meio.test.ts:79`; `handler.test.ts:171`; `meios-de-pagamento.integration.test.ts:216-223`. Navegador: nenhum teste | ⚠️ Prova só do servidor. O `DetalheDoMeio` decide "nada mudou" antes de chamar o servidor (`detalhe-do-meio.tsx:131-137`), e nenhum teste do componente nem do e2e muda só a caixa. B8 vive (G6) |
| 9 | Igual depois de normalizar: não grava nem avisa | `detalhe-do-meio.test.tsx:258-266`; `handler.test.ts:136-139`; `meios-de-pagamento.integration.test.ts:228-245` | ✅ |
| 10 | Vazio, > 40 ou dia fora de 1 a 31, no navegador e no servidor | `detalhe-do-meio.test.tsx:287`, `:297`, `:320`, `:331`, `:307`, `:343`; `meio-pagamento.schema.test.ts:181`, `:192`, `:198`; `meios-de-pagamento.integration.test.ts:311-343` | ✅ |
| 11 | Dias fora do cartão, ou cartão sem dias | `mudancas-do-meio.test.ts:101-119`; `handler.test.ts:104`, `:119`; `src/lib/erros.test.ts:5`; `meios-de-pagamento.integration.test.ts:292-308` | ✅ |
| 12 | Inexistente ou arquivado: "Esse meio de pagamento não existe mais." | `handler.test.ts:72`, `:87`; `meios-de-pagamento.integration.test.ts:286-289`; `detalhe-do-meio.test.tsx:429` | ✅ |
| 13 | "Onde ele aparece" e o link filtrado pelo meio | `detalhe-do-meio.test.tsx:436`; e2e `:1010-1018` | ✅ |
| 14 | A mudança nas outras telas, sem recarregar | `meios-de-pagamento.integration.test.ts:202`; e2e `:1167-1175` | ✅ B4 morre em `:195` |
| 15 | Marcação, troca de item e "Fechar" | `tabela-de-meios.test.tsx:226`; `cadastro-de-meios.test.tsx:311`, `:358`, `:371`; e2e `:1427-1430` | ✅ |
| 16 | Salvar o nome **ou** os dias deixa a página e a coluna na rolagem em que estavam, com "Salvar alterações" inteiro à vista | Os dias: e2e `:2233`, caso "os dias do meio", nas três janelas, `:2244`, `:2248`, `:2256-2258`. O nome: nenhum teste | ❌ Só os dias. F6e vive (G7) |

### P1: Novo meio na coluna — CADCOL-08

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| 1 | "Novo meio de pagamento" com "Nome", "Tipo" começando no cartão, "Criar meio", "Cancelar" | `novo-meio.test.tsx:103`, `:119-122` | ✅ |
| 2 | Os dias só com cartão | `novo-meio.test.tsx:130`; `campos-do-meio.test.tsx:150` | ✅ |
| 3 | Regras, ajudas e mensagens de hoje | `novo-meio.test.tsx:148`, `:158`, `:169-218` | ✅ |
| 4 | Criado: na tabela, aberto, "Meio de pagamento criado." | `cadastro-de-meios.test.tsx:264`, `:289`; `meios-de-pagamento.integration.test.ts:396`; e2e `:1200-1211` | ✅ B18 morre em `:264` |
| 5 | Nome de ativo: recusa junto do campo | `novo-meio.test.tsx:258`; `meios-de-pagamento.integration.test.ts:418-431`; e2e `:1220-1227` | ✅ |
| 6 | "Cancelar" fecha sem criar | `novo-meio.test.tsx:293`; `cadastro-de-meios.test.tsx:345` | ✅ |

### P1: A coluna da direita a partir de 1.536 px — CADCOL-09

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| 1 | ≥ 1.536: coluna de 384 px, linha fina | e2e `:1695` à direita em 1.536 px; `:1743` `abs(largura − 384) ≤ 1`; `:1749` `{ largura: "1px", tipo: "solid" }` | ✅ |
| 2 | Título do painel à vista ao rolar | e2e `:1783-1786` | ✅ |
| 3 | Nada aberto ≥ 1.536: o vazio e a dica | e2e `:1699-1704`; `coluna-de-cadastro.test.tsx:104`; `cadastro-de-meios.test.tsx:191` | ✅ |
| 4 | Título, abas e tabela ≤ 1.100 px, centrados | e2e `:1757-1760` | ✅ |
| 5 | < 1.536: uma coluna ≤ 1.024 px, painel entre as abas e a tabela | e2e `:1689-1690`, `:1726-1729`; `:692-693`, `:1387-1388` | ✅ |
| 6 | Nada aberto < 1.536: sem painel | e2e `:1681-1683`, `:1707-1708`; `coluna-de-cadastro.test.tsx:104` | ✅ B13 morre em `:104` |
| 7 | Toda largura a partir de 400 px, nos três estados, sem rolagem lateral na página e no painel | e2e `:2089-2090` as 60 medidas (duas abas × três estados × dez larguras, colado em 767/768, 1.023/1.024, 1.279/1.280 e 1.535/1.536), com "Categoria C", um meio de 40 letras e uma categoria de 60 numa palavra só; `:2106-2107` as 6 com toque em 768 px; `:829`, `:1530` em 400 px com o item aberto | ✅ E7 e F4a a F4g morrem |

### P1: Teclado, foco e toque — CADCOL-10

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| 1 | Botão da linha no `Tab`, abre com `Enter` ou espaço | e2e `:544-549`, `:560-562`; `:1268-1286` | ✅ |
| 2 | Abrir leva o foco ao título | `coluna-de-cadastro.test.tsx:182`, `:190`; `cadastro-de-categorias.test.tsx:180`, `:224`, `:244`; e2e `:549`, `:1206` | ✅ |
| 3 | `Escape` dentro do painel fecha | `coluna-de-cadastro.test.tsx:162`, `:171`; e2e `:552-556` | ✅ |
| 4 | O foco volta à linha, ou ao "+ Nova…" | `cadastro-de-categorias.test.tsx:288`, `:300`, `:311`, `:322`; e2e `:555`, `:1279` | ✅ |
| 5 | < 1.536: abrir traz o título para a janela | e2e `:705`, `:710`; `:1399`, `:1404` | ✅ B12 morre em `:710` e `:1404` |
| 6 | < 768 px ou ponteiro grosso: botão da linha ≥ 44 × 44 | e2e `:777`, `:1472` em 767 px; `:810-813`, `:1511-1514` com toque em 1.280 px; `:1880-1882`, `:1909-1911` com toque em 1.920 px | ✅ |
| 7 | Abas, "+ Nova…", "Fechar", botões dos formulários, "Ver em Lançamentos" e opções de cor ≥ 44 × 44, em qualquer largura e ponteiro | e2e `:849-871`, `:1568-1594` em 400 px; `:1885-1928` com toque em 1.920 px; `:1940` com ponteiro fino em 768 e 1.536 px, com o painel e os dois formulários abertos pela ação (as medidas em `medirAlvo`, `:318-321`) | ✅ E19 e B16 morrem |

### P2: O item aberto no endereço — CADCOL-11

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| 1 | `?categoria=` e `?meio=` sem recarregar e sem entrada no histórico | `parametro-na-url.test.tsx:39`; `cadastro-de-categorias.test.tsx:189-192`; e2e `:523-527`, `:1246-1250`; a corrida `:602-614`, `:617-631`, `:1289-1318` | ✅ B11 morre em `:39` |
| 2 | Carregar com o parâmetro abre, sem foco | `cadastro-de-categorias.test.tsx:198-199`; `coluna-de-cadastro.test.tsx:199`; e2e `:529-530`, `:1252-1253` | ✅ |
| 3 | Id de fora: ignorado, sem erro | `cadastro-de-categorias.test.tsx:205-207`; e2e `:532-535`, `:1255-1258` | ✅ |
| 4 | Fechar ou abrir o cadastro tira o parâmetro, mantendo os outros | `parametro-na-url.test.tsx:52`, `:61`; `cadastro-de-categorias.test.tsx:222-223`, `:289-290`, `:412`, `:432`; `cadastro-de-meios.test.tsx:246`; e2e `:556`, `:614`, `:1280`, `:1301` | ✅ B10 morre em `cadastro-de-meios.test.tsx:246` |

### P2: A decisão registrada — CADCOL-12

Nenhum dos arquivos mudou desde a rodada 1.

| AC | Spec-defined outcome | Evidência | Result |
| --- | --- | --- | --- |
| 1 | AD-022 com o que revê | `.specs/STATE.md:208` | ✅ |
| 2 | A regra de arquivar meio usado por fixo ativo no roadmap | `docs/roadmap.md:95-99` | ✅ |
| 3 | COR-04 e TRES-01, AC 8 apontam para o CADCOL | `.specs/features/cor-por-categoria/spec.md:154`, `:161`, `:167`, `:172`, `:207`; `.specs/features/visao-tres-colunas/spec.md:89` | ✅ |
| 4 | "Largura do conteúdo" com Cadastros | `docs/design.md:124-127` | ✅ |

**Status:** ❌ 94 de 96 ACs com o resultado da spec provado. CADCOL-07, AC 8 tem a prova só do
servidor (G6), e CADCOL-07, AC 16 só da cláusula dos dias (G7). Nenhum spec-precision gap.

---

## 5. Edge Cases

- [x] **Nome longo quebra linha, e só ela cresce:** e2e `:1829-1836`, com nome de espaços.
  - **Uma palavra só quebra no meio, na linha e no painel:** e2e `:2089-2090` sem rolagem lateral em
    nenhuma das 60 medidas. A sonda P6 mostra a palavra quebrada dentro da tabela: em 768 px, a
    categoria de 60 letras ocupa cinco linhas entre 276 e 423 px, numa tabela que vai de 264 a
    744 px. F4a, F4b, F4c, F4e e F4g morrem. Observação 2 sobre os 400 px.
- [x] **Renomear muda a posição; o painel fica e a linha continua marcada:** e2e `:667-668`
  (categoria) e `:1157-1164` (meio).
- [x] **Criar categoria com nome de ativa ou de arquivada:** e2e `:493-504`.
- [x] **Criar meio com nome de arquivado cria outro; renomear para ele grava:**
  `meios-de-pagamento.integration.test.ts:435-444` e `:205-213`.
- [x] **Só os dias não consulta o nome; só o nome não mexe nos dias:**
  `editar-meio-de-pagamento/handler.test.ts:185` (B3 morre aqui);
  `src/infrastructure/db/repositories/cadastro.repository.integration.test.ts:389`.
- [x] **O item aberto sai da tabela:** `cadastro-de-categorias.test.tsx:372-383`;
  `cadastro-de-meios.test.tsx:397-408`.
- [x] **"Mês atual" mantém a aba, sem o item:** `src/components/seletor-competencia.test.tsx:146`.
- [x] **Mês sem lançamento: "0":** e2e `:415-416` e `:1005-1006`.
- [x] **Erro numa action: no painel, no mesmo modo:** `nova-categoria.test.tsx:144`,
  `novo-meio.test.tsx:275`, `detalhe-do-meio.test.tsx:399`.
- [x] **Formulário de novo meio mais alto que a janela, ≥ 1.536 px:** e2e `:1858-1866` (B17 morre
  em `:1858`, com 567 px numa janela de 480).

---

## 6. Os desvios do autor, julgados

Julgados só contra a spec, depois da passada própria.

| Desvio | Juízo | Por quê |
| --- | --- | --- |
| 1. F4 põe `[overflow-wrap:anywhere]` no `aside` inteiro, e não só no `TituloDoPainel`; o teste mede também a rolagem lateral do próprio painel | **Aceitável** | A legenda "Cor de <nome>" também leva o nome. F4e, a regra só no título, morre: o painel da categoria de 60 letras rola 143 px em 1.536 e 1.920 px, e 132 px em 400 px. A medida do painel é necessária, porque a partir de 1.536 px ele rola por conta própria e a da página não o vê: F4c morre nela em 1.536 e 1.920 px. O AC 7 diz "na página e no painel" desde a F4. No resto do painel a regra só age numa palavra que não cabe; os alvos de 44 px e as linhas de 48 px continuam medidos e verdes |
| 2. F6 afirma "o controle começa fora da janela" só abaixo de 1.536 px | **Aceitável** | Em 1.920 × 480 o painel é preso, e rolar a página não o move. A sonda P4 confirma "Verde" em y 261 e "Salvar" em y 166, dentro da janela, e "Salvar alterações" em y 503, fora. O que discrimina ali é a igualdade das rolagens: `:2248` afirma a página rolada antes de salvar nos nove casos, e a coluna rola 274 px até "Salvar alterações". E15, F6a, F6b, F6c e F6f morrem em 1.920 × 480 pela página (541, 440, 388, 24 e 84 px), e F6d pela coluna (274 px). L-066 está cumprida no que importa: uma rolagem até o alto muda a medida |
| 3. F6 rola com `scrollIntoView({ block: "center" })` | **Aceitável** | É preparo, e não assertion: o "antes" é medido depois de centrar, e o "depois" tem de ser igual. Centrar deixa o controle inteiro na janela antes de salvar; assim o `toBeInViewport({ ratio: 1 })` de `:2258` não falha por fração de pixel, como falhava com a rolagem do Playwright (Nota da F6). Nenhum mutante se esconde atrás disso: os seis mutantes que movem a tela sem depender do nome do meio morrem |
| 4. Os comentários de `tabela-de-meios.tsx` e `tabela-de-categorias.tsx` ainda dizem "duas linhas de texto" | **Defeito cosmético, não bloqueante** | Contradizem o AC 8 revisto em 2026-10-31. Em `tabela-de-meios.tsx:17-18` e `:177-178` ("duas linhas de texto: [...] o resto quebra na segunda"), o próprio arquivo se desmente em `:23-24` ("quebra em duas linhas" embaixo do nome); `:22` e `:148` falam em "cartão de duas linhas". Em `tabela-de-categorias.tsx:23-25`, "um cartão de duas linhas de texto". A grade de `:144` tem mesmo duas linhas de grade, e pode ficar. Não é lacuna de spec: o AC está certo, e o código também. Fix 3 |

---

## 7. Sondas

Descartáveis, só na worktree do sensor, anexadas ao fim de uma cópia de `cadastros-colunas.spec.ts`,
no código de `21aa62b`, com o banco `mybilling_test_cad`.

| Sonda | Medida | Juízo |
| --- | --- | --- |
| **P1**, toque em 1.023, 1.024, 1.279, 1.280, 1.535, 1.536 e 1.920 px, nas duas abas, nos três estados, com as fixtures da F4 | 42 medidas, nenhuma rolagem lateral na página nem no painel | O AC 7 vale também com toque fora de 768 px |
| **P2**, ponteiro fino em 500, 639, 640 e 700 px, onde o respiro da página muda (`sm:px-6`) | 24 medidas, nenhuma rolagem | Idem, entre os limiares do teste |
| **P3**, renomear "Cartão Roxo" para "Cartão Lilás" pelo laço da F6, nas três janelas | Página e coluna iguais antes e depois: 545/0, 393/0 e 541/274 px; "Salvar alterações" inteiro à vista | **O código está certo hoje na cláusula do nome (G7).** Com F6e, a sonda cai: 545 → 1.113, 393 → 866 e 541 → 223 px |
| **P4**, onde os controles começam em 1.920 × 480, com a página no fim | "Verde" em y 261, "Salvar" do nome em y 166, "Salvar alterações" em y 503 | Desvio 2 |
| **P5**, renomear "Cartão Roxo" para "cartão roxo" pela tela | "Meio de pagamento salvo." e "cartão roxo" gravado no banco | **O código está certo hoje no AC 8 (G6).** Com B8, a sonda cai: nada é gravado e nenhum aviso aparece |
| **P6**, as caixas do texto da palavra longa em 400, 768 e 1.024 px | A palavra quebra dentro da tabela nas três larguras, nas duas abas | Edge Case do nome longo. Com F4f, em 400 px a categoria vai a 472 px numa tabela de 384 (observação 2) |

---

## 8. Discrimination Sensor

**A worktree descartável.**
- Criada por `git worktree add --detach` em `21aa62b`, sob o scratchpad, com `pnpm install --offline
  --frozen-lockfile` próprio, sem link de `node_modules`.
- Cada mutante conferiu que o trecho original aparecia uma vez só, e foi desfeito com `git checkout
  -- src` antes do seguinte.
- O `git status --porcelain` da worktree real estava vazio antes e continuou vazio depois.

**Unidade e integração.** `vitest run --project domain --project componentes` inteiro, ou `--project
integration` inteiro, para cada mutante. O controle sem mutante passou 2.087 de 2.087 e 406 de 406.

**O e2e.**
- Um `next dev` da worktree descartável na porta 3100, com a configuração padrão e
  `reuseExistingServer`.
- Na cópia, `mode: "serial"` virou `"default"` na mesma linha: as linhas citadas são as do arquivo
  real, e uma falha não pula os testes seguintes.
- O controle sem mutante passou os testes das correções. Cada morte foi conferida na assertion
  esperada.
- Os dois vivos rodaram de novo contra os três arquivos que desenham as abas, sem as sondas:
  `cadastros-colunas.spec.ts`, `categorias.spec.ts` e `visao-tres-colunas.spec.ts`.

| # | `file:line` | Falha injetada | Quem a mata | Killed? |
| --- | --- | --- | --- | --- |
| E7 | `src/components/tabela-de-meios.tsx:67` | `md:px-2` → `md:px-4`: o respiro do toque entre 768 e 1.023 px volta a 16 px (rodada 1) | e2e `:2107`: Meios rola 23 px nos três estados, com toque em 768 px | ✅ Morto |
| E14b | `src/components/cabecalho-de-cadastros.tsx:38` | O cabeçalho em coluna a partir de 1.536 px (rodada 1) | e2e `:2125` em 1.536 px: a ação em 180,9 px, a base do título em 164,9 | ✅ Morto |
| E15 | `src/components/detalhe-do-meio.tsx:146` | `window.scrollTo(0, 0)` depois de salvar o meio (rodada 1) | e2e `:2256` nos três casos do meio: 545, 393 e 541 px | ✅ Morto |
| E17 | `src/components/tabela-de-categorias.tsx:149` | `md:table-row` → `sm:table-row` (rodada 1) | e2e `:786` em 767 px: "Categoria Dois" com 3 linhas, e não 1 | ✅ Morto |
| E18 | `tabela-de-meios.tsx:182` | O mesmo nos meios (rodada 1) | e2e `:1483` em 767 px: "Cartão Roxo" com 5 linhas | ✅ Morto |
| E19 | `src/components/coluna-de-cadastro.tsx:144` | "Fechar" com `md:pointer-fine:min-h-9 md:pointer-fine:min-w-9` (rodada 1) | e2e `:1940`, nos dois casos: "largura de Fechar" | ✅ Morto |
| F4a | `tabela-de-categorias.tsx:167` | Sem `[overflow-wrap:anywhere]` no botão da linha | e2e `:2090` e `:2107`: Categorias rola em 400, 768 e 1.024 px | ✅ Morto |
| F4b | `tabela-de-meios.tsx:200` | O mesmo nos meios | e2e `:2090` e `:2107`: Meios rola em 768 e 1.024 px | ✅ Morto |
| F4c | `coluna-de-cadastro.tsx:137` | Sem `[overflow-wrap:anywhere]` no `aside` | e2e `:2090` e `:2107`: o item aberto rola em 400, 768, 1.536 e 1.920 px, nas duas abas | ✅ Morto |
| F4d | `tabela-de-categorias.tsx:177` | `lg:whitespace-nowrap` → `md:`, como em `e4789ef` | e2e `:2090` e `:2107`: Categorias rola em 768 px, nos três estados | ✅ Morto |
| F4e | `coluna-de-cadastro.tsx:50`, `:137` | A regra só no `TituloDoPainel`, como a Fix Plan sugeria | e2e `:2090`: o painel rola 143 px em 1.536 e 1.920 px, pela legenda "Cor de <nome>" | ✅ Morto |
| F4f | `coluna-de-cadastro.tsx:152`; `tabela-de-categorias.tsx:167`; `tabela-de-meios.tsx:200` | A tabela num invólucro `overflow-x-auto`, sem a regra nos botões | e2e `:2090` e `:2107`: a página rola 233 e 69 px em Categorias, e 205 e 77 em Meios, em 768 e 1.024 px. Em 400 px passa (observação 2) | ✅ Morto |
| F4g | `tabela-de-categorias.tsx:167`; `tabela-de-meios.tsx:200` | `break-word` no lugar de `anywhere` nos botões | e2e `:2090` e `:2107`: a tabela não encolhe, e a página rola em 400, 768 e 1.024 px | ✅ Morto |
| F6a | `src/components/detalhe-da-categoria.tsx:86` | `window.scrollTo(0, 0)` depois de "Cor trocada." | e2e `:2256` nos três casos da cor: 296, 241 e 440 px | ✅ Morto |
| F6b | `detalhe-da-categoria.tsx:113` | O mesmo depois de "Categoria renomeada." | e2e `:2256` nos três casos do nome: 207, 152 e 388 px | ✅ Morto |
| F6c | `detalhe-do-meio.tsx:146` | O foco no título do painel depois de salvar, sem `preventScroll` | e2e `:2256` nos três casos do meio: 472, 375 e 24 px | ✅ Morto |
| F6d | `detalhe-do-meio.tsx:146` | A coluna do painel rolada até o alto depois de salvar | e2e `:2257` em 1.920 × 480: a coluna anda 274 px | ✅ Morto |
| F6e | `detalhe-do-meio.tsx:146` | Com o nome mudado, a linha renomeada rolada para a janela (`scrollIntoView`) | **Nenhum.** Os 9 de `:2233`, `:1084`, `:1139` e os 2.087 unitários passam; a confirmação nos três arquivos de e2e está na seção 9. Só a sonda P3 cai | ❌ **Sobrevive (G7)** |
| F6f | `detalhe-da-categoria.tsx:113` | O mesmo na categoria, depois de "Categoria renomeada." | e2e `:2256` nos três casos do nome: 336, 226 e 84 px | ✅ Morto |
| B1 | `src/domain/cadastro/uso-no-mes.ts:61` | Conta o lançamento de outra competência | `uso-no-mes.test.ts:159` | ✅ Morto |
| B2 | `src/domain/cadastro/mudancas-do-meio.ts:53` | O vencimento comparado com o fechamento gravado | `mudancas-do-meio.test.ts:41`, `:87`; `handler.test.ts:126` (5 testes) | ✅ Morto |
| B3 | `src/application/cadastros/editar-meio-de-pagamento/handler.ts:67-68` | Consulta o nome sempre, mesmo sem mudança de nome | `handler.test.ts:185` | ✅ Morto |
| B4 | `src/app/actions/meios-de-pagamento.ts:163` | `revalidatePath("/")`, sem o layout | `meios-de-pagamento.integration.test.ts:195`, `:396` (3 testes) | ✅ Morto |
| B5 | `src/app/actions/categorias.ts:236` | Sem revalidar a tela de Cadastros | `categorias.integration.test.ts:193` e mais 4 | ✅ Morto |
| B6 | `src/app/(app)/[competencia]/cadastros/meios-de-pagamento/page.tsx:56` | Ordem pelo código de caractere | e2e `:1059` | ✅ Morto |
| B7 | `meios-de-pagamento/page.tsx:64` | O fechamento lido do vencimento | e2e `:1062`: "fecha dia 5" | ✅ Morto |
| B8 | `detalhe-do-meio.tsx:132` | "Nada mudou" compara o nome sem caixa: mudar só a caixa não chega ao servidor | **Nenhum.** Os 2.087 unitários e os 28 testes da aba de meios passam; a confirmação nos três arquivos de e2e está na seção 9. Só a sonda P5 cai | ❌ **Sobrevive (G6)** |
| B9 | `detalhe-do-meio.tsx:134` | "Nada mudou" sem comparar o vencimento | `detalhe-do-meio.test.tsx:381` | ✅ Morto |
| B10 | `src/components/cadastro-de-meios.tsx:127` | "+ Novo meio" não tira `?meio=` | `cadastro-de-meios.test.tsx:246` e mais 1 | ✅ Morto |
| B11 | `src/components/parametro-na-url.ts:48` | `router.replace` sem `{ scroll: false }` | `parametro-na-url.test.tsx:39` e mais 13 | ✅ Morto |
| B12 | `coluna-de-cadastro.tsx:86` | O foco ao abrir com `preventScroll` | e2e `:710` e `:1404`: `viewport ratio 0` | ✅ Morto |
| B13 | `coluna-de-cadastro.tsx:103` | O vazio à vista também abaixo de 1.536 px | `coluna-de-cadastro.test.tsx:104` | ✅ Morto |
| B14 | `tabela-de-categorias.tsx:124` | O nome da contagem só para leitor de tela a partir de 1.024 px | e2e `:799` em 768 px: 44,3 px de largura | ✅ Morto |
| B15 | `tabela-de-categorias.tsx:51` | `md:pointer-fine:py-2` | e2e `:761`: a linha de nome longo com 52,5 px | ✅ Morto |
| B16 | `src/components/onde-aparece.tsx:44` | "Ver em Lançamentos" sem `min-h-11` | e2e `:821`, `:1522` e os dois de `:1940`: 22,5 px de altura | ✅ Morto |
| B17 | `coluna-de-cadastro.tsx:137` | O painel sem `2xl:max-h-dvh` | e2e `:1858`: 567 px numa janela de 480 | ✅ Morto |
| B18 | `cadastro-de-meios.tsx:140` | Depois de criar, o foco não espera o meio criado | `cadastro-de-meios.test.tsx:264` e mais 1 | ✅ Morto |

**Sensor depth**: ampliado, com 37 mutantes:
- os 6 vivos da rodada 1;
- 7 contra a F4 e 6 contra a F6;
- 18 na amostra do resto: contagem e mês, ordem, endereço e corrida, foco, regras do painel, erro
  de campo, limites no navegador, limiares, largura e borda da coluna, alvos de toque, "nada mudou
  sem servidor" e revalidação.

**Result**: 35 de 37 mortos — FAIL ❌. Sobrevivem F6e e B8.

---

## 9. Gate Check

- **Gate command**: o `build` de `tasks.md:121`.
  - `pnpm verify` foi rodado passo a passo, com cada código de saída conferido sozinho.
  - Depois veio o e2e inteiro na porta 3100, com `DATABASE_URL_TEST` no banco
    `mybilling_test_cad`.
  - O banco já estava de pé (`mybilling-db`, saudável), e o `pnpm db:up` não foi preciso.
- **Saídas**:
  - `pnpm typecheck`: 0.
  - `pnpm lint`: 0, com 368 arquivos.
  - `pnpm test:unit`: 0. **2.087 passaram em 132 arquivos**, 0 falhas, 0 skip. `src/domain` tem
    100% de branches (393/393).
  - `pnpm test:integration`: 0. **406 passaram em 25 arquivos.**
  - `pnpm build`: 0, com `/[competencia]/cadastros/categorias` e
    `/[competencia]/cadastros/meios-de-pagamento`.
  - **e2e inteiro: 0, com 263 de 263 em 17 arquivos na primeira passada**, em 8,3 min. Os 70 de
    `cadastros-colunas.spec.ts` passaram.
- **Os dois vivos, contra os três arquivos de e2e das abas**, sem as sondas: F6e e B8 passam 100 de 100 cada (70 de `cadastros-colunas.spec.ts`, 6 de
  `categorias.spec.ts` e 24 de `visao-tres-colunas.spec.ts`), e os 2.087 unitários também.
- **Contagem antes da fatia** (`e8b1540`, rodada 1): 1.832 unitários, 364 de integração e 193 e2e.
- **Delta**: +255 unitários, +42 de integração e +70 e2e. Nesta rodada, +16 e2e.
- **Skipped**: nenhum.
- **Efeito colateral**: o `next dev` do e2e reescreveu `next-env.d.ts` na worktree real. Foi
  restaurado com `git checkout -- next-env.d.ts`.

---

## 10. Code Quality

| Principle | Status |
| --- | --- |
| Minimum code | ✅ A F4 é uma classe em três lugares e um prefixo trocado; F1, F2, F3, F5 e F6 só mexem no e2e e na spec |
| Surgical changes | ✅ A regra no `aside` está no Where da F4 (`coluna-de-cadastro.tsx`); desvio 1 |
| No scope creep | ✅ |
| Matches patterns | ✅ A cor quebra entre 768 e 1.023 px como o tipo do meio da T16 |
| Spec-anchored outcome check | ❌ 94 de 96; G6 e G7 |
| Per-layer Coverage Expectation | ⚠️ A regra do "nada mudou" do meio tem o caso de caixa no domínio, no caso de uso e na action, e não no componente (G6) |
| Every test maps to a spec requirement | ✅ Os testes novos citam o CADCOL e o AC no título |
| Documented guidelines followed | `AGENTS.md`: ✅ nenhum skip, nenhuma assertion afrouxada, nenhum timeout mexido |

**`AGENTS.md`, regras 1 a 5, na rodada:**
1. **AD-009:** as fixtures novas são "Categoria C", "CartaoComNomeDeQuarentaLetrasNumaPalavra",
   "CategoriaComNomeDeSessentaLetrasNumaPalavraSoParaApertarTudo" e "Categoria Dez", e os dias 10,
   17 e 28. Nenhum nome de banco, de pessoa ou valor real no diff, nos comentários nem nas mensagens
   dos seis commits.
2. **Centavos:** nenhum campo monetário tocado.
3. **Competência:** nenhum `Date` novo; `src/domain` não mudou.
4. **Domínio puro:** `src/domain` não mudou; `arquitetura.test.ts` passa no gate.
5. **Só `movimento` é somável:** nada soma; a rodada é de layout e de teste.

---

## 11. Fix Plans

Em ordem de prioridade. Nenhum espera o dono: o código está certo hoje (sondas P3 e P5), e falta só o
teste. Cada um começa pelo teste, que passa na HEAD e cai com o mutante dele.

### Fix 1 — CADCOL-07, AC 8: mudar só a caixa do nome do meio, no navegador (G6)

- **Root cause:** o `DetalheDoMeio` decide "nada mudou" antes de chamar o servidor
  (`detalhe-do-meio.tsx:131-137`). A regra do AC 8 (a caixa conta) mora nos dois lados, e só o
  servidor tem o caso (L-041). Na categoria, o mesmo caso existe no componente
  (`detalhe-da-categoria.test.tsx:411`).
- **Fix task:** em `src/components/detalhe-do-meio.test.tsx`, no bloco "salvar (CADCOL-07, AC 5)" ou
  num bloco do AC 8: trocar "Cartão Roxo" por "cartão roxo", salvar, e afirmar `editar` chamado uma
  vez com `nome: "cartão roxo"` e os dias de sempre, e "Meio de pagamento salvo.".
- **Done when:** o teste passa na HEAD e cai com B8 (`pedido.nome === meio.nome` comparado sem
  caixa).
- **Priority:** Minor. **Needs owner:** não.

### Fix 2 — CADCOL-07, AC 16: salvar o nome do meio deixa a tela parada (G7)

- **Root cause:** `GRAVACOES` (e2e `:2165-2214`) tem um caso por controle, e o do meio salva só os
  dias. O nome passa pelo mesmo "Salvar alterações", mas muda a ordem da tabela e o título, e uma
  rolagem presa ao nome passa com a suíte verde.
- **Fix task:** um quarto caso em `GRAVACOES`, "o nome do meio": preencher "Nome" com "Cartão Lilás"
  e esperar `botaoDoMeio(page, "Cartão Lilás")` na página relida.
  - **Cuidado:** o `formularioDoMeio(page, "Cartão Roxo")` some depois de renomear, porque o
    `aria-label` do formulário passa a "Editar Cartão Lilás". O controle precisa ser procurado pelo
    painel: `painelDoMeio(page).getByRole("button", { name: "Salvar alterações" })`.
  - Com isso, a traceability do CADCOL-07 cita o caso novo.
- **Done when:** os três casos novos passam na HEAD e caem com F6e. Na sonda P3, com F6e, a página
  foi de 545 a 1.113 px em 400 × 700, de 393 a 866 em 1.280 × 480 e de 541 a 223 em 1.920 × 480.
- **Where:** `e2e/cadastros-colunas.spec.ts`; `spec.md` (traceability).
- **Priority:** Minor. **Needs owner:** não.

### Fix 3 — Os comentários de "duas linhas de texto" (desvio 4), opcional

- **Fix task:** reescrever `tabela-de-meios.tsx:17-24`, `:148` e `:176-178`, e
  `tabela-de-categorias.tsx:23-25`, com a regra do AC 8 revisto: o nome sozinho em cima, e embaixo
  o resto, que quebra quando não cabe.
- **Priority:** Cosmetic. **Needs owner:** não. Pode ir num commit `docs` ou `refactor` à parte; não
  bloqueia a rodada 3.

---

## 12. Observações não bloqueantes, para o dono

1. **O código está certo nas duas lacunas.** Mudar só a caixa do nome do meio pela tela grava e avisa
   (P5), e renomear o meio não mexe na tela (P3). As lacunas são de teste: hoje, uma mudança futura
   poderia quebrar as duas coisas sem a suíte ver.
2. **Em 400 px, a medida da F4 não vê uma rolagem dentro de um invólucro.** Com a tabela num
   `overflow-x-auto` e sem a regra no botão (F4f), em 400 px a palavra de 60 letras vai a 472 px numa
   tabela de 384, e a página não rola. O mutante morreu em 768 e 1.024 px, onde a grade deixa o
   invólucro crescer. Uma assertion de que as caixas do texto do nome longo ficam dentro da tabela,
   como na sonda P6, fecharia isso nas três larguras. Fica como sugestão: o mutante natural morre.
3. **Mais larguras do que o teste mede:** com toque em 1.023 a 1.920 px (P1) e com ponteiro fino em
   500, 639, 640 e 700 px (P2), nada rola de lado.
4. **Os comentários de "duas linhas de texto"** contradizem o AC 8 revisto (desvio 4, Fix 3).
5. **Uma citação da traceability está deslocada:** `e2e/visao-tres-colunas.spec.ts:606`, no
   CADCOL-09, cai dentro do laço do teste de TRES-01, AC 10, que começa em `:604`. A T21 mexeu no
   arquivo depois da T20, e o remapeamento da F1 e da F2 só cobriu `cadastros-colunas.spec.ts`.

---

## 13. Requirement Traceability Update

Proposta para o `spec.md`. O Verifier não edita a spec.

| Requirement | Previous Status | New Status |
| --- | --- | --- |
| CADCOL-01 | ❌ Needs Fix (AC 6, G5) | ✅ Verified |
| CADCOL-02 | ❌ Needs Fix (AC 8, G2) | ✅ Verified |
| CADCOL-03 | ✅ Verified | ✅ Verified |
| CADCOL-04 | ✅ Verified | ✅ Verified, com o AC 16 novo |
| CADCOL-05 | ✅ Verified | ✅ Verified |
| CADCOL-06 | ❌ Needs Fix (AC 8, G1 e G2) | ✅ Verified |
| CADCOL-07 | ✅ Verified | ❌ Needs Fix (AC 8, G6; AC 16, G7) |
| CADCOL-08 | ✅ Verified | ✅ Verified |
| CADCOL-09 | ⚠️ G4 esperava o dono | ✅ Verified |
| CADCOL-10 | ❌ Needs Fix (AC 7, G3) | ✅ Verified |
| CADCOL-11 | ✅ Verified | ✅ Verified |
| CADCOL-12 | ✅ Verified | ✅ Verified |

---

## 14. Lições

Gravadas por `lessons.py add`, uma por falha com sinal:
- **L-041** (`surviving_mutant`, G6; B8): a mesma lição de Cor por categoria, com o mesmo texto. A
  regra que o cliente e o servidor aplicam cada um precisa de caso nos dois lados. Passa a
  `confirmed`, em duas fatias.
- **L-067** (`surviving_mutant`, G7; F6e): o caso de teste sai de cada cláusula do AC, e não de cada
  controle. Duas cláusulas que passam pelo mesmo botão viram um caso só, e a outra fica livre.

---

## 15. Summary

**Overall**: ❌ Not Ready.

**Spec-anchored check**: 94 de 96 ACs com o resultado da spec provado. CADCOL-07, AC 8 sem o caso no
navegador (G6) e CADCOL-07, AC 16 sem a cláusula do nome (G7). Nenhum spec-precision gap.
**Sensor**: 35 de 37 mortos; vivos F6e e B8.
**Gate**: `typecheck`, `lint`, 2.087 unitários, 406 de integração e `build` saem 0. O e2e passou 263
de 263 na primeira passada.

**What works**:
- **As cinco lacunas da rodada 1 fecharam,** e os seis vivos dela morrem.
- **Nenhuma largura rola de lado.** São 60 medidas com ponteiro fino e 6 com toque, e as sondas
  acrescentam 66. A palavra longa quebra dentro da tabela e do painel.
- **A tela fica parada** ao salvar a cor, o nome da categoria e os dias do meio, e seis jeitos de
  movê-la morrem: E15, F6a, F6b, F6c, F6d e F6f.

**Issues found**: G6 e G7, na seção 11. Os dois se fecham com um teste cada, sem mudar o código.

**Next steps**: Fix 1 e Fix 2 para um implementador, e a Fix 3 se couber. Depois, a rodada 3, a
última dentro do limite de 3.

---

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
