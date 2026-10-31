# Todo mês em linhas, com o fixo aberto à direita: Validation

## Validation: todo-mes-colunas, rodada 3 — PASS ✅

**Date**: 2026-10-31
**Spec**: `.specs/features/todo-mes-colunas/spec.md`
**Diff range**: `a121594..d26ae96`, a fatia inteira. Desde a rodada 2 (`8d4ce41`): `33b8e04` (os
documentos da rodada 2 e a L-058), `307106b` (F8, a corrida do endereço) e `d26ae96` (F9, o teste que
provava o mock).
**Verifier**: sub-agente independente (autor ≠ verificador), rodada 3, a última dentro do limite de 3

**Resumo do veredito.**
- **A lacuna da rodada 2 está fechada.** O endereço segue o último fixo pedido (`todo-mes.tsx:99`,
  `:103-106`), e não a barra.
  - No navegador, sem esperar a URL entre os passos, os três casos da rodada 2 terminam certos:
    - com as leituras atrasadas: 3 de 3 cada;
    - na rede normal: 3 de 3 cada;
    - com as respostas fora de ordem: 3 de 3 cada.
  - Com a comparação antiga de volta, os testes novos caem na unidade e no e2e (seção 8).
- **Os 62 ACs têm o resultado da spec provado.** Nenhum spec-precision gap.
- **Gate:**
  - `typecheck`, `lint`, 1.832 unitários, 364 de integração e `build` saem 0;
  - o e2e inteiro passou 193 de 193 na primeira passada.
- **Sensor:** 13 mutantes, 13 mortos, nenhum sobrevivente.
  - 8 na F8 e na F9.
  - 5 das rodadas 1 e 2, que morrem de novo: N1, N5, M3, M5 e M17.
- **Uma observação nova, Cosmetic:** um endereço feito à mão, com `fixo` repetido, fica com `?fixo=`
  depois de "+ Novo fixo" (seção 7). Nenhum caminho do app gera esse endereço, e recarregá-lo não abre
  nada. Fica para o dono, com a correção de uma linha.

---

## 1. Integridade da rodada

- **O código mudou só onde a F8 e a F9 dizem.** `git diff 8d4ce41 d26ae96 -- src e2e` toca três
  arquivos:
  - `src/components/todo-mes.tsx`: o `ref` e o `mudarEndereco`, 20 linhas;
  - `src/components/todo-mes.test.tsx`: o mock, o `afterEach`, o teste da F9 e quatro testes novos;
  - `e2e/todo-mes-colunas.spec.ts`: um tipo importado na linha 1 e três testes no fim. As linhas de
    1 a 1.289 não se moveram, e as citações da rodada 2 nesse arquivo continuam valendo.
- **Os outros arquivos de teste são os da rodada 2, byte a byte.** As citações deles foram conferidas
  por amostra em `d26ae96`:
  - e2e `:405-418`, `:440-449`, `:578-587` e `:727-735`;
  - `painel-do-fixo.test.tsx:606-617`;
  - `tabela-de-fixos.test.tsx:252-256`;
  - `fixos-do-mes.test.ts:364-386`.
- **Os commits são um por correção.** Cada um marca a task em `tasks.md` e atualiza a traceability
  do FIXCOL-09 em `spec.md`. Nenhuma caixa de `tasks.md` ficou aberta.
- **Nenhum teste saiu, foi pulado ou afrouxado.** O único corpo reescrito é o da F9, julgado no
  desvio 4 (seção 6). O `afterEach` passou de `mockClear` a `mockReset`:
  - no Vitest 5.0.0, isso devolve ao `navegar` a implementação de `vi.fn(impl)`;
  - o teste de `:372`, que só passa se o mock mudar a URL, passa no controle (60 de 60 em
    `todo-mes.test.tsx` e `painel-do-fixo.test.tsx`).
- **Contagens.**
  - Unitários: 1.828 → 1.832. São os 4 da F8: `todo-mes.test.tsx:407`, `:416`, `:427` e `:439`.
  - e2e: 190 → 193. São os 3 da F8: `todo-mes-colunas.spec.ts:1336`, `:1353` e `:1371`. O arquivo
    da fatia tem 44.
- **Nenhum `// SPEC_DEVIATION` na fatia** (`git diff a121594..d26ae96 -- src e2e`). Os dois desvios
  do autor estão nas notas da F8 em `tasks.md`.

---

## 2. A lacuna da rodada 2

| Rodada 2 | Correção | Prova agora | Mutante | Situação |
| --- | --- | --- | --- | --- |
| Fix 1: o endereço comparava com `window.location` enquanto a navegação estava pendente (FIXCOL-09, ACs 1 e 4) | F8: `fixoPedido` (`todo-mes.tsx:99`) guarda o último `fixo` pedido; o `mudarEndereco` compara com ele (`:103`) e o atualiza antes de navegar (`:106`) | `todo-mes.test.tsx:413`, `:424`, `:434` e `:445` `toHaveBeenLastCalledWith(…, { scroll: false })`, com o `replace` do mock sem mudar a URL; e2e `:1350`, `:1368` e `:1383` a URL depois de todas as leituras de página, sem esperar a URL entre os passos | F8-A (a comparação antiga) morto na unidade, 3 de 21, e no e2e, 9 de 9; F8-B, F8-C e F8-D mortos | ✅ Fechado |
| Observação 4: o teste de `:254` provava o mock | F9 | `todo-mes.test.tsx:272-279` a chamada do componente | F9-A e F9-B mortos em `:266` | ✅ Fechado |

**As sondas da rodada 2, repetidas no navegador** (seção 7):
- abrir A e logo `Escape`: sem `?fixo=`, 9 de 9;
- fechar A e logo reabri-lo: com `?fixo=<A>`, 9 de 9;
- abrir A e logo "+ Novo fixo": sem `?fixo=`, 9 de 9.

Cada caso rodou três vezes em cada rede: a lenta do teste, a normal e a fora de ordem.

---

## 3. Task Completion

| Task | Status | Notes |
| --- | --- | --- |
| T1 a T11 | ✅ Done | Conferidas na rodada 1; o código delas não mudou |
| F1 a F7 | ✅ Done | Conferidas na rodada 2; a F6 foi substituída pela F7 |
| F8 | ✅ Done | `307106b`; fecha a corrida, com 4 testes de unidade e 3 e2e |
| F9 | ✅ Done | `d26ae96`; o teste do endereço afirma a chamada do componente |

---

## 4. Spec-Anchored Acceptance Criteria

Cada linha cita o teste e a assertion em `d26ae96`. "e2e" é `e2e/todo-mes-colunas.spec.ts`, salvo
quando outro arquivo é nomeado.

### P1: Uma linha por fixo, em duas seções — FIXCOL-01

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| 1 | "Entradas fixas" antes de "Saídas fixas"; colunas Descrição, Categoria, Vence/Cai, Meio/Onde cai, "Valor em <mês>" | `src/components/tabela-de-fixos.test.tsx:154`, `:163-167`, `:173-177`; e2e `:358` `entradas.y < saidas.y`, `:359-372` `toHaveText([...])` | ✅ |
| 2 | Despesa em saídas; o resto em entradas | `src/domain/recorrencia/fixos-do-mes.test.ts:102-103` | ✅ |
| 3 | Dia crescente; empate pela descrição pt-BR | `fixos-do-mes.test.ts:118`, `:134-138`, `:147-148`; e2e `:374-379` `["Fixo D","Fixo A","Fixo B","Fixo C"]` | ✅ |
| 4 | "N · R$ X" no título da seção | `tabela-de-fixos.test.tsx:183-185`; e2e `:381-382` | ✅ |
| 5 | Pill na cor; neutras para "Sem categoria"/"Categoria removida" | `tabela-de-fixos.test.tsx:269-296`; `e2e/categorias.spec.ts:423-425` | ✅ |
| 6 | "Receita" em toda entrada | `tabela-de-fixos.test.tsx:243-246`, `:311-316` | ✅ |
| 7 | Um botão só na linha | `tabela-de-fixos.test.tsx:252-256` `toHaveLength(1)` | ✅ |
| 8 | Selo "Encerrado" | `tabela-de-fixos.test.tsx:235-237`; e2e `:395` | ✅ |
| 9 | Começa depois: "—" e "Começa em <Mês de Ano>"; quem começa no mês aberto, não | `tabela-de-fixos.test.tsx:227-229`; e2e `:398-401` (D, junho), `:408` `getByText(/^Começa em/)` `toHaveCount(0)` em Fixo B e Entrada A | ✅ |
| 10 | ≥ 1.280 px, ponteiro fino: toda linha ≤ 48 px | e2e `:655` (1.280) e `:953` (1.536 e 1.920) via `linhasDeAte48` `:225-251` | ✅ |
| 11 | < 768 px: duas linhas, sem cabeçalho | e2e `:748-749` (400), `:811-812` e `:815-823` (767 e 768) | ✅ |
| 12 | Mês sem fixo: o aviso, sem seções | `tabela-de-fixos.test.tsx:324-330`; `e2e/recorrencias.spec.ts:269` | ✅ |
| 13 | Seção vazia: a linha de texto | `tabela-de-fixos.test.tsx:337`, `:346` | ✅ |

### P1: O valor do mês aberto — FIXCOL-02

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| 1 | Valor da ocorrência, inclusive o confirmado | `fixos-do-mes.test.ts:160`, `:172`; `src/application/recorrencias/obter-todo-mes/handler.test.ts:130`; e2e `:391` `/^confirmado\s*R\$ 105,00$/` | ✅ |
| 2 | "confirmado", em texto, junto do valor | `tabela-de-fixos.test.tsx:219-221`; e2e `:392-393` | ✅ |
| 3 | Materializa antes de ler | `handler.test.ts:77-86`, `:98`; e2e `:333` sem a ocorrência de B, `:337` "R$ 50,00" | ✅ |
| 4 | Encerrado antes do mês com ocorrência: aparece | `fixos-do-mes.test.ts:224-226`; e2e `:395-396` | ✅ |
| 5 | Começa depois aparece; encerrado sem ocorrência some | `fixos-do-mes.test.ts:232-233`, `:239-240`; e2e `:398`; `e2e/recorrencias.spec.ts:270` | ✅ |

### P1: Os totais do mês no alto — FIXCOL-03

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| 1 | Os dois totais com "em <Mês de Ano>" | `src/components/todo-mes.test.tsx:211-212` `total(…)` `toBe("R$ 155,00")`, `toBe("R$ 1.000,00")`; e2e `:339-340` | ✅ |
| 2 | Saídas = bloco "Fixos" de Lançamentos | `fixos-do-mes.test.ts:368`; e2e `:339` e `:344-348` "3 · R$ 185,00 · 2 a pagar" | ✅ |
| 3 | Entradas = ocorrências dos não despesa | `fixos-do-mes.test.ts:372`; e2e `:340` | ✅ |
| 4 | Só `movimento`; começa depois soma zero | `fixos-do-mes.test.ts:385`; e2e `:339` sem os R$ 70,00 de D | ✅ |
| 5 | Título da seção = total = soma das linhas | `fixos-do-mes.test.ts:376-377`; e2e `:381-382` contra `:339-340` | ✅ |

### P1: O fixo aberto no painel — FIXCOL-04

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| 1 | Linha inteira ou botão abre; título e subtítulo | `tabela-de-fixos.test.tsx:355-377`; `src/components/painel-do-fixo.test.tsx:239-248`; e2e `:440-441` | ✅ |
| 2 | "em <Mês de Ano>"; "confirmado · previa R$ X"; "—" com "Começa em" | `src/components/detalhe-do-fixo.test.tsx:86`, `:95`, `:109-110`; e2e `:442`, `:412` | ✅ |
| 3 | Categoria, meio, "De quem é", início, "Termina em"/"Sem fim" | `detalhe-do-fixo.test.tsx:118-173`; e2e `:444-448` cada `dd` pelo `dt`, "Pessoa B" em "De quem é"; `:462-463` na entrada; `:413-418` "Começou em" em B | ✅ |
| 4 | Vigências em ordem, "vale em <mês>" na do mês | `detalhe-do-fixo.test.tsx:183-202`; e2e `:452-457` | ✅ |
| 5 | "Mudar valor", "Editar", "Encerrar" em vermelho no pé | `detalhe-do-fixo.test.tsx:211-217` | ✅ |
| 6 | Encerrado: aviso e só "Editar" | `detalhe-do-fixo.test.tsx:237-242` | ✅ |
| 7 | Linha aberta com fundo e `aria-expanded` | `tabela-de-fixos.test.tsx:383-396`; e2e `:640-646` | ✅ |
| 8 | "Fechar" fecha e desmarca | `painel-do-fixo.test.tsx:255-257`; `todo-mes.test.tsx:344-346` | ✅ |
| 9 | Outro fixo: detalhe do novo, sem o digitado | `painel-do-fixo.test.tsx:265-273` | ✅ |

### P1: Mudar valor, editar e encerrar no painel — FIXCOL-05

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| 1 | "Novo valor (R$)", "Vale a partir de" com o mês | `src/components/ciclo-do-fixo.test.tsx:105-148`; `painel-do-fixo.test.tsx:283-286`; e2e `:474-475` | ✅ |
| 2 | Registrado: volta ao detalhe com a vigência nova | `painel-do-fixo.test.tsx:310-315`; e2e `:483-487` | ✅ |
| 3 | Encerrar: aviso, mês, "Encerrar mesmo assim" | `ciclo-do-fixo.test.tsx:185-221`; `painel-do-fixo.test.tsx:295-299`; e2e `:504` | ✅ |
| 4 | "Editar" no painel, sem diálogo, preenchido | `painel-do-fixo.test.tsx:357-397`; `e2e/editar-fixo.spec.ts:85-92` | ✅ |
| 5 | Salvo: o formulário fica, com "Alterações salvas." ou "Nada mudou…", à vista, junto do botão, sem ir ao título | `painel-do-fixo.test.tsx:411-412`; `e2e/editar-fixo.spec.ts:97`, `:143`, `:183`; `src/components/form-recorrencia.test.tsx:582-585` o foco na confirmação, com `nextElementSibling` = "Salvar alterações"; e2e `:1220-1222` inteira na janela, com o foco, sem o título entrar, em 1.280 × 720 e 1.920 × 1.080 | ✅. "Nada mudou" segue sem a medida da janela na suíte; a sonda dela passa (observação 3) |
| 6 | "Voltar"/"Cancelar": detalhe com o gravado | `painel-do-fixo.test.tsx:324`, `:333`, `:427-429` | ✅ |
| 7 | Recusa no painel, em alerta | `ciclo-do-fixo.test.tsx:161-166`, `:233-237`; e2e `:1252-1253` o alerta inteiro na janela em 400 × 800 | ✅ |
| 8 | Fixo sai da lista: "<descrição> não aparece mais em <Mês de Ano>." | `painel-do-fixo.test.tsx:453-469`; e2e `:507-509` | ✅ |

### P1: Novo fixo no painel — FIXCOL-06

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| 1 | "+ Novo fixo" acima dos totais e da lista, em todas as larguras | `todo-mes.test.tsx:203-204` (DOM); `e2e/recorrencias.spec.ts:125` (1.280); e2e `:733-734` na tela, em 400 (`:751`), 1.536 e 1.920 px (`:943`) | ✅ |
| 2 | Cadastro no painel, sem diálogo; fecha o fixo aberto | `painel-do-fixo.test.tsx:213-215`; `todo-mes.test.tsx:328-330`; e2e `:518-519` | ✅ |
| 3 | Cadastrado: formulário fica, confirmação à vista, junto do botão, campos limpos, fixo na lista | `painel-do-fixo.test.tsx:226-231`; e2e `:526-529`; `form-recorrencia.test.tsx:215-218`; e2e `:1220-1222` no cadastro, a partir de uma carga com `?fixo=` | ✅ |

### P1: A coluna da direita a partir de 1.536 px — FIXCOL-07

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| 1 | ≥ 1.536: coluna de 384 px, linha fina | e2e `:878`, `:923` `abs(largura − 384) ≤ 1`, `:928` `1px solid` | ✅ |
| 2 | Título do painel à vista ao rolar | e2e `:967` (1.536 e 1.920 × 480), `:993` | ✅ |
| 3 | Nada aberto ≥ 1.536: a dica | `painel-do-fixo.test.tsx:199-205`; e2e `:882-883` | ✅ |
| 4 | ≤ 1.100 px, centrados | e2e `:938-941` | ✅ |
| 5 | < 1.536: uma coluna ≤ 1.024 px, painel entre totais e seções | `todo-mes.test.tsx:229-235`, `:244-248`; e2e `:611-616`, `:694-700`, `:873`, `:908` | ✅ |
| 6 | Nada aberto < 1.536: sem painel | e2e `:603`, `:867-868`, `:889-890`; `todo-mes.test.tsx:220` | ✅ |
| 7 | Formulário < 448 px: um campo por linha | e2e `:1070-1071`, `:1105-1108` | ✅ |
| 8 | Formulário ≥ 448 px: pares lado a lado | e2e `:1087-1088`, `:1110-1112` e seguintes | ✅ |
| 9 | 400 px com um fixo aberto: sem rolagem lateral | e2e `:747` | ✅ |

### P1: Teclado e foco — FIXCOL-08

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| 1 | Botão da linha no `Tab`, abre com `Enter` ou espaço | `tabela-de-fixos.test.tsx:364-377`; e2e `:575-577`, `:591-592` | ✅ |
| 2 | Abrir leva o foco ao título | `todo-mes.test.tsx:260`, `:333`; `painel-do-fixo.test.tsx:501`, `:514`; e2e `:579`, `:593` | ✅ |
| 3 | `Escape` dentro do painel fecha | `painel-do-fixo.test.tsx:482`, `:492`, `:577-590`; e2e `:582-583`, `:1224`, `:1254-1255`, `:1349` | ✅ |
| 4 | Fechar devolve o foco à linha ou ao "+ Novo fixo" | `todo-mes.test.tsx:345`, `:358`, `:369`, `:391`; e2e `:584`, `:1225` | ✅ |
| 5 | < 1.536: abrir traz o título para a janela | e2e `:667` (fora antes), `:672` `toBeInViewport()` | ✅ |
| 6 | < 768 px: alvos ≥ 44 × 44 | e2e `:750`, `:813`, `:842` (ponteiro grosso) | ✅ |

### P2: O fixo aberto no endereço — FIXCOL-09

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| 1 | Abrir põe `?fixo=<id>` na URL, sem recarregar e sem entrada nova | `todo-mes.test.tsx:274-279` destino relativo com `fixo=rec-b` e `outro=1`, `{ scroll: false }`, nenhum `push` nem `pushState`; `:292-293` `toHaveBeenCalledWith("?outro=1&fixo=rec-b", { scroll: false })`; `:424` fechar e logo reabrir pede `?outro=1&fixo=rec-b`; e2e `:545` a URL, `:546-549` o marcador e `history.length` iguais; e2e `:1368` fechar e logo reabrir termina com `fixo` = id de A | ✅ (era ❌) |
| 2 | Carregar com `?fixo=` abre o fixo | `todo-mes.test.tsx:308-309`; e2e `:551-553` | ✅ |
| 3 | `?fixo=` fora da lista: ignorado | `todo-mes.test.tsx:315-317`; e2e `:555-560` | ✅ |
| 4 | Fechar ou abrir o cadastro tira `?fixo=` | `todo-mes.test.tsx:331`, `:347`, `:359`, `:380` (sem "?" sozinho); `:413` e `:434` o último pedido sem `fixo` com a navegação pendente; `:445` um `?fixo=` fora da lista sai ao abrir o cadastro; e2e `:586`; e2e `:1350` e `:1383` sem `fixo` depois de abrir e logo fechar ou abrir o cadastro | ✅ (era ❌). Um endereço feito à mão com `fixo` repetido é a exceção da observação 1 |

**Status**: ✅ os 62 ACs com o resultado da spec provado. Nenhum spec-precision gap.

---

## 5. Edge Cases

- [x] Descrição longa quebra e só ela cresce: e2e `:243-250`, em 1.280, 1.536 e 1.920 px.
- [x] Fixo que começa depois: "—", selo, zero no total, ações no painel. O lado "começa no mês
  aberto" é provado em e2e `:408`.
- [x] Valor confirmado: e2e `:391`, `fixos-do-mes.test.ts:361`, `painel-do-fixo.test.tsx:395-397`.
- [x] Encerrado com ocorrência paga depois do fim: `fixos-do-mes.test.ts:224-226`, e2e `:395-396`.
- [~] Encerrar a partir de mês posterior: `painel-do-fixo.test.tsx:342` volta ao detalhe; o aviso
  nesse retorno não tem assertion. Igual às rodadas 1 e 2, não bloqueia.
- [x] Renomear muda a posição da linha: `e2e/editar-fixo.spec.ts:137-143`; na F1, e2e `:1218-1222`.
- [x] Edição mais alta que a janela a partir de 1.536 px: e2e `:973-997`.
- [x] Trocar de mês pelo seletor: sem teste na suíte. A sonda da rodada 2 viu a navegação sem
  `?fixo=` e o painel fechado; o código do seletor não mudou.
- [x] Erro numa action: `ciclo-do-fixo.test.tsx:161-166`; e2e `:1252-1255`.

---

## 6. Os desvios do autor, julgados

### Desvio 1: o `ref` começa com o `fixoInicial` cru

**Certo, e é o que o AC 4 pede.**
- O `?fixo=` da carga é o que está na barra, válido ou não.
- O AC 3 manda ignorar o id fora da lista, com o painel fechado. O AC 4 manda tirar `?fixo=` ao abrir
  o cadastro, sem exceção.
- Iniciado só com o válido, o `ref` ficaria `null` com um id inválido na barra, e "+ Novo fixo"
  acharia que não há nada a tirar.

O teste de `todo-mes.test.tsx:439` guarda essa escolha.
- Ele mata F8-C (o `ref` iniciado com `null`) e F8-D (iniciado só com o válido), cada um sozinho: 1 de
  21 testes.
- Passar no código de `8d4ce41` é esperado. Lá a comparação era com a barra, que tinha o id inválido.
  O teste prova a escolha da F8, e não a corrida.
- A sonda "carga com `?fixo=<A>`, `Escape`" termina sem `?fixo=`, 3 de 3 (seção 7).

Uma ponta fica de fora: com `fixo` repetido na barra, a página passa `null` (`page.tsx:168`), e o
`ref` deixa de espelhar a barra. É a observação 1.

### Desvio 2: a rede lenta nos três e2e

**É uma reprodução legítima e determinística do cenário da spec. Não mascara o que importa.**

Ela é legítima por três motivos.
- O AC não depende da latência: "fechar tira `?fixo=`" vale com a resposta em 60 ms ou em 600 ms.
- O `page.route` de `redeLenta` (`:1304-1309`) só segura a resposta das leituras `_rsc`. Ele não muda
  o código, a ordem dos pedidos nem o que o servidor devolve.
- 600 ms é uma ida e volta comum em rede móvel, e é nela que a pessoa encontra a corrida. Sem o
  atraso, o servidor local responde antes do passo seguinte do Playwright. Por isso o código de
  `8d4ce41` falhava só às vezes.

O que ela poderia esconder, e onde isso está provado:
- **A resposta chegando entre os dois passos**, que é o caminho comum. Os testes de antes esperam a
  URL antes do passo seguinte (e2e `:545`, `:580`, `:586`) e continuam verdes.
- **A rede normal.** A sonda roda os mesmos três casos sem atraso no código de `d26ae96`: 9 de 9
  terminam certos.
- **Respostas fora de ordem.** Com a rede uniforme, a resposta do primeiro pedido chega antes. A sonda
  atrasa o primeiro em 1.500 ms e os outros em 100 ms: 9 de 9 terminam certos.
  - O código do Next 16.3.5 explica: uma navegação nova marca a pendente como `discarded`, e o estado
    dela nunca é aplicado.
  - Está em `node_modules/next/dist/client/components/app-router-instance.js:147-150` e `:81-82`.
  - É o "o Next descarta a navegação pendente" do comentário de `todo-mes.tsx:96-97`.

**O estado final é o que os testes conferem.** `vigiarLeituras().terminar()` (`:1328-1332`) espera:
- ao menos uma leitura;
- todas as leituras pedidas terminarem, inclusive as que falham ou são abortadas;
- dois quadros.

Só então a URL é lida (`:1350`, `:1368`, `:1383`). Há uma fresta teórica: entre os dois pedidos
seguidos de "fechar", o conjunto pode ficar vazio por alguns milissegundos. Se o `expect.poll` caísse
nela, o teste leria a URL antes da hora. Esse risco só pode esconder um defeito, e nunca reprovar o
código certo. O F8-A, rodado três vezes, mediu o efeito: os três testes caíram nas três vezes, 9 de
9, cada um na leitura da URL. A fresta não escondeu a corrida nenhuma vez.

Sem o atraso, a sonda na rede normal confirma o que o autor viu. No código de `8d4ce41` (F8-A),
"fechar e logo reabrir" falhou 2 de 3, e os outros dois casos passaram 3 de 3.

### Desvio 3: o `Escape` sem esperar o foco

**Aceitável.**
- A sonda leu `document.activeElement` logo depois do `click()`, sem espera nenhuma. Em 3 de 3 era
  `H2:Fixo A`.
- O React 19 aplica os efeitos de um evento discreto no fim do mesmo evento. O efeito de
  `painel-do-fixo.tsx:103-107` já rodou quando o Playwright manda a tecla seguinte.
- Se o foco não estivesse no painel, o `Escape` não fecharia. O teste cairia em `:1349`, com
  `aria-expanded` `"true"`. O erro possível é um teste vermelho, e nunca um verde falso.
- Esperar o foco daria tempo à navegação, e a corrida sumiria do teste.

### Desvio 4: a F9 reescreve `todo-mes.test.tsx:266`

**É um reforço, e não um afrouxamento.** Assertion por assertion:

| Antes (`8d4ce41:254`) | O que provava | Agora (`d26ae96:266`) |
| --- | --- | --- |
| `replaceState` chamado | Nada do componente: o mock `navegar` chama `replaceState` | `navegar.mock.lastCall` com destino e `{ scroll: false }` (`:272`, `:277`) |
| `pushState` não chamado | Que o componente não empurra | Mantido (`:279`), mais `router.push` não chamado (`:278`) |
| `pathname` igual | Que o destino é relativo | `destino.startsWith("?")` (`:274`) |
| `fixo` = `rec-b`, `outro` = `1` na URL | O destino | O mesmo, lido do destino (`:275-276`) |
| `history.length` igual | Nada: `replaceState` nunca muda o comprimento | Fica no e2e, `todo-mes-colunas.spec.ts:549`, no navegador real |

Toda assertion que dizia algo do componente tem equivalente. As duas que mediam o mock viraram
assertions sobre a chamada. A prova empírica:
- F9-A (`router.push`) e F9-B (o destino sem os outros parâmetros) morrem em `:266`;
- N1 (sem `{ scroll: false }`) morre em `:266` e em `:287`.

### Desvio 5: as observações abertas da rodada 2

Medidas de novo no navegador, no código de `d26ae96`.

| Observação | Agora | Fere AC? |
| --- | --- | --- |
| Os 24 px a partir de 1.536 px | Continua. Abrir a última linha com a página no fim: `scrollY` 401 → 377 em 1.536 × 480 e 356 → 332 em 1.920 × 480, Δ = −24 nos dois, 3 de 3. O título preso fica em `top` 40 | Não. A linha clicada continua à vista (e2e `:1287`) |
| O foco na recusa de "Registrar" | Continua no título do painel (`H2:Fixo B`). Em 400 × 800, com os fixos do e2e, **o título fica fora da janela** em 3 de 3. A rodada 2 o viu dentro da janela com 15 fixos | Não. O FIXCOL-05, AC 7, pede o alerta no painel, e ele está inteiro na janela (e2e `:1253`). O `Escape` fecha (`:1254-1255`) |
| "Nada mudou" sem a medida da janela | Continua sem teste. A sonda mede: em 1.280 × 720 e 1.920 × 1.080, "Nada mudou: já estava tudo assim." fica inteira na janela, com o foco, e o título não entra, 3 de 3 | Não: a conduta é a do AC 5. Falta só a assertion, como a L-010 pediria |

---

## 7. Sondas

Descartáveis, só no worktree do sensor, anexadas ao fim de uma cópia de `todo-mes-colunas.spec.ts`.
Cada uma rodou três vezes no código de `d26ae96`.

| Sonda | Medida | Juízo |
| --- | --- | --- |
| Os três casos da corrida, na rede normal | 9 de 9 certos | O estado final vale sem o atraso |
| Os três casos, com a primeira resposta 1.500 ms atrás das outras | 9 de 9 certos | Vale o último pedido, como o comentário diz |
| O foco logo depois do clique | `H2:Fixo A`, 3 de 3 | Desvio 3 |
| Carga com `?fixo=<A>`, `Escape` | Sem `?fixo=`, 3 de 3 | AC 4 no caminho do link |
| **Carga com `?fixo=<A>&fixo=<B>`, "+ Novo fixo"** | **A URL fica com `fixo`, 3 de 3.** No código de `8d4ce41` (F8-A), a URL termina sem `fixo`, 3 de 3: é uma regressão da F8 | Observação 1 |
| Os 24 px, o foco na recusa e "Nada mudou" | Seção 6, desvio 5 | Observações 2 a 4 |

---

## 8. Discrimination Sensor

**O worktree descartável.**
- Criado em `d26ae96`, sob o scratchpad, com `pnpm install --offline --frozen-lockfile` próprio.
- Cada mutante conferiu que o trecho original aparecia uma vez só, e foi desfeito com
  `git checkout -- <arquivo>`.

**A unidade.** Rodou com `vitest run --project componentes` no arquivo do componente. O controle sem
mutante passou 60 de 60 em `todo-mes.test.tsx` e `painel-do-fixo.test.tsx`.

**O e2e.**
- Rodou com a configuração padrão, na porta 3100, depois do e2e do gate, no banco `…_tmc`.
- Na cópia, o arquivo trocou `mode: "serial"` por `"default"`. Com um worker só, a ordem é a mesma,
  mas uma falha não pula os testes seguintes, e dá para contar quantos morrem.
- Um teste `AQUECER` compila a rota com o servidor frio. Ele não afirma nada da fatia, e assim nenhum
  "morto" vem da primeira visita lenta.
- Cada morte foi conferida na assertion esperada.

| # | File:line | Descrição | Killed? |
| --- | --- | --- | --- |
| F8-A | `src/components/todo-mes.tsx:102-115` | A comparação com `window.location.search` de volta, como em `8d4ce41` | ✅ Morto na unidade em `todo-mes.test.tsx:413`, `:424` e `:434` (3 de 21), e no e2e em `:1350`, `:1368` e `:1383`, 9 de 9 em três repetições |
| F8-B | `todo-mes.tsx:106` | O `ref` só acompanha quem abre: fechar não o zera | ✅ Morto em `todo-mes.test.tsx:424` (1 de 21) e no e2e em `:1368`, 2 de 2, com a URL sem `fixo` |
| F8-C | `todo-mes.tsx:99` | O `ref` iniciado com `null` | ✅ Morto em `todo-mes.test.tsx:445` (1 de 21). Os três e2e da corrida passam com ele; a sonda "carga com `?fixo=<A>`, `Escape`" cai, sem navegação nenhuma |
| F8-D | `todo-mes.tsx:99` | O `ref` iniciado só com o `fixoInicial` válido (a proposta da rodada 2) | ✅ Morto em `todo-mes.test.tsx:445` (1 de 21) |
| F8-E | `todo-mes.tsx:103-105` | Sem a guarda: navega a cada abrir ou fechar | ✅ Morto em `todo-mes.test.tsx:302` `not.toHaveBeenCalled()` (1 de 21) |
| F8-F | `todo-mes.tsx:114` | Sempre `?${busca}`: deixa "?" sozinho | ✅ Morto em `todo-mes.test.tsx:380` (1 de 21) |
| F9-A | `todo-mes.tsx:114` | `router.push` no lugar de `router.replace` | ✅ Morto em `todo-mes.test.tsx:274` e mais 6 (7 de 21) |
| F9-B | `todo-mes.tsx:107` | O destino sem os outros parâmetros | ✅ Morto em `todo-mes.test.tsx:276` e mais 7 (8 de 21) |
| N1 | `todo-mes.tsx:114` | `router.replace` sem `{ scroll: false }` (rodada 2) | ✅ Morto em `todo-mes.test.tsx:277` e `:293` (6 de 21), e no e2e em `:1287`, com `viewport ratio 0` |
| N5 | `todo-mes.tsx:114` | `history.replaceState`, como na rodada 1 (rodada 2) | ✅ Morto em `todo-mes.test.tsx:272-277` e `:292` (6 de 21), e no e2e em `:1220`, `viewport ratio 0`, na edição e no cadastro em 1.280 × 720 |
| M5 | `src/components/painel-do-fixo.tsx:126-127` | A guarda age em qualquer botão (rodadas 1 e 2) | ✅ Morto em `painel-do-fixo.test.tsx:617` (1 de 39) |
| M17 | `todo-mes.tsx:146` | `2xl:row-start-1` → `2xl:row-start-4` (rodadas 1 e 2) | ✅ Morto no e2e em `:733`, 684,3 px > 87,5 px, em 1.536 e 1.920 px |
| M3 | `src/app/(app)/[competencia]/fixos/page.tsx:135` | `> 0` → `>= 0` (rodadas 1 e 2) | ✅ Morto no e2e em `:408`, com "Começa em" na linha de Fixo B |

**Sensor depth**: ampliado, com 13 mutantes. A rodada mexe na navegação, e é a última antes de
escalar.
**Resultado do sensor**: 13 de 13 mortos. Nenhum sobrevivente.

As linhas do e2e são as do arquivo real. Na cópia, o `AQUECER` desloca cada uma em 6.

---

## 9. Gate Check

- **Gate command**: o `build` de `tasks.md:108`.
  - `pnpm verify` foi rodado passo a passo, com cada código de saída conferido sozinho.
  - Depois veio o e2e inteiro na porta 3100, com `DATABASE_URL_TEST` no banco `…_tmc`.
  - O banco já estava de pé (`mybilling-db`, saudável), e o `pnpm db:up` não foi preciso.
- **Saídas**:
  - `pnpm typecheck`: 0.
  - `pnpm lint`: 0, com 331 arquivos.
  - `pnpm test:unit`: 0. **1.832 passaram em 115 arquivos**, 0 falhas, 0 skip. `src/domain` tem
    100% de branches (367/367).
  - `pnpm test:integration`: 0. **364 passaram em 23 arquivos.**
  - `pnpm build`: 0.
  - **e2e inteiro: 0, com 193 de 193 em 16 arquivos na primeira passada**, em 6,2 min. Os 44 de
    `todo-mes-colunas.spec.ts` passaram, os três da F8 entre eles.
- **Contagem antes da fatia** (`e39eeae`, rodada 1): 1.717 unitários, 364 de integração e 134 e2e em
  14 arquivos.
- **Delta**:
  - +115 unitários: +131 novos, −25 portados de `lista-de-fixos.test.tsx` e +9 nas correções;
  - 0 de integração;
  - +44 e2e da fatia. Os 15 de `formulario-pela-coluna.spec.ts` vieram da base.
- **Skipped**: nenhum.
- **Efeito colateral**: o `next dev` do e2e reescreveu `next-env.d.ts` na worktree real. Foi
  restaurado com `git checkout -- next-env.d.ts`.

---

## 10. Code Quality

| Principle | Status |
| --- | --- |
| Minimum code | ✅ A F8 é um `ref` e uma comparação; o `mudarEndereco` encolheu |
| Surgical changes | ✅ A F8 toca o componente e os dois testes; a F9, um teste e o mock |
| No scope creep | ✅ Nenhuma action nova, nenhum outro componente |
| Matches patterns | ✅ `useRef` para o que não desenha, como `botaoNovo` |
| Spec-anchored outcome check | ✅ Os 62 ACs |
| Per-layer Coverage Expectation | ✅ A corrida tem unidade e e2e; o e2e cobre o caminho rápido e o comum |
| Every test maps to a spec requirement | ✅ Os testes novos citam o FIXCOL-09 e o AC no título |
| Documented guidelines followed | `AGENTS.md`: ✅ nenhum skip, nenhuma assertion afrouxada (desvio 4), nenhum timeout mexido, nomes genéricos |

---

## 11. Fix Plans

Nenhum bloqueante. A correção da observação 1 é opcional e cabe numa linha:
- **Opção a:** a página passa o primeiro valor de `fixo` também quando ele vem repetido, para o `ref`
  começar com o que está na barra.
- **Opção b:** o `mudarEndereco` navega para `null` também quando a barra ainda tem `fixo`.

---

## 12. Observações não bloqueantes, para o dono

1. **`fixo` repetido num endereço feito à mão** (nova, Cosmetic).
   - Com `?fixo=<A>&fixo=<B>`, a página trata o parâmetro como ausente (`page.tsx:168`). O painel fica
     fechado, como manda o AC 3.
   - O `ref` começa `null`, e "+ Novo fixo" não tira os dois `fixo` da barra (sonda, 3 de 3).
   - No código de `8d4ce41`, a URL termina sem `fixo`, 3 de 3: é uma regressão da F8.
   - Pela letra, fere o FIXCOL-09, AC 4, nesse endereço. Pelo efeito, não: recarregá-lo também não
     abre nada.
   - Nenhum caminho do app gera esse endereço. A correção está na seção 11.
2. **Os 24 px a partir de 1.536 px**, medidos de novo: Δ = −24 em 1.536 e 1.920 × 480.
   - Vêm do `focus()` de abrir e do `scroll-padding-top` de 64 px.
   - Um `scroll-margin-top` negativo no título a partir de 1.536 px, ou `preventScroll` quando o
     título já está na janela, tiraria isso.
3. **O foco na recusa de "Registrar"** fica no título do painel.
   - Em 400 × 800, com os fixos do e2e, o título está fora da janela. O próximo `Tab` leva a tela até
     ele.
   - Levar o foco ao alerta seria coerente com a confirmação de salvar.
4. **"Nada mudou: já estava tudo assim."** se comporta como o AC 5 pede, pela sonda, mas não tem a
   medida da janela na suíte.
   - Uma entrada a mais em `GRAVACOES` (e2e `:1171-1195`), salvando a edição sem mudar nada, a cobriria
     nas duas janelas do laço de `:1197-1229`.
5. **Custo da F7**, sem mudança: uma página no servidor por clique que muda o endereço, sem escrita no
   banco.

---

## 13. Requirement Traceability Update

Proposta para o `spec.md`. O Verifier não edita a spec.

| Requirement | Previous Status | New Status |
| --- | --- | --- |
| FIXCOL-01 | ✅ Verified (rodada 2) | ✅ Verified |
| FIXCOL-02 | ✅ Verified | ✅ Verified |
| FIXCOL-03 | ✅ Verified | ✅ Verified |
| FIXCOL-04 | ✅ Verified (rodada 2) | ✅ Verified |
| FIXCOL-05 | ✅ Verified (rodada 2) | ✅ Verified |
| FIXCOL-06 | ✅ Verified (rodada 2) | ✅ Verified |
| FIXCOL-07 | ✅ Verified | ✅ Verified |
| FIXCOL-08 | ✅ Verified | ✅ Verified |
| FIXCOL-09 | ❌ Needs Fix (rodada 2) | ✅ Verified |

---

## 14. Summary

**Overall**: ✅ Ready.

**Spec-anchored check**: 62 de 62 ACs com o resultado da spec provado. Nenhum spec-precision gap.
**Sensor**: 13 de 13 mutantes mortos.
**Gate**: `typecheck`, `lint`, 1.832 unitários, 364 de integração e `build` saem 0. O e2e passou 193 de
193 na primeira passada.

**What works**:
- **A corrida do endereço acabou.** Abrir e logo fechar, fechar e logo reabrir, e abrir e logo o
  cadastro terminam com a URL certa nas três redes medidas.
- **O teste do endereço prova o componente.** O "sem entrada nova" real continua no navegador.
- **Nada do que as rodadas 1 e 2 fecharam voltou.** N1, N5, M3, M5 e M17 morrem de novo.

**Issues found**: nenhum bloqueante. Quatro observações para o dono, na seção 12.

**Next steps**:
- Decidir as observações da seção 12.
- O merge segue o fluxo de sempre.

---

## Rodada 2 (resumo)

**2026-10-31, `8d4ce41`, FAIL ❌.**

- **Spec-anchored:** 60 de 62. A F7 trocou o `history.replaceState` por `router.replace`, que só muda
  a URL quando o servidor responde. O `mudarEndereco` comparava com `window.location`. Fechar logo
  depois de abrir deixava `?fixo=` na URL, e reabrir logo depois de fechar o tirava (FIXCOL-09, ACs 1
  e 4).
- **As cinco lacunas da rodada 1** fecharam, e M3, M5, M16 e M17 morreram.
- **Sensor:** 12 mutantes, 12 mortos.
- **Gate:** verde, com 1.828 unitários, 364 de integração e 190 e2e.
- **Lição:** L-058, candidata.
- **Fix 1** virou a F8, e a observação 4 virou a F9.

## Rodada 1 (resumo)

**2026-10-31, `d964e84` (depois `8faeace`), FAIL ❌.**

- **Spec-anchored:** 57 de 62.
  - Três ACs com gap: FIXCOL-01, AC 9 (o lado colado do limiar); FIXCOL-04, AC 3 (a composição); e
    FIXCOL-06, AC 1 (a partir de 1.536 px).
  - Dois spec-precision gaps, no FIXCOL-05, AC 5, e no FIXCOL-06, AC 3: a confirmação de salvar ficava
    fora da janela.
- **Sensor:** 12 mutantes, 8 mortos. Sobreviveram M3, M16, M17 e M5.
- **Gate:** verde, com 1.823 unitários, 364 de integração e 169 e2e.
- **Fixes 1 a 5** viraram as tasks F1 a F5. A F6 e a F7 nasceram no gate delas.
