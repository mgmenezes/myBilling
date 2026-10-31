# Todo mês em linhas, com o fixo aberto à direita: Validation

## Validation: todo-mes-colunas, rodada 2 — FAIL ❌

**Date**: 2026-10-31
**Spec**: `.specs/features/todo-mes-colunas/spec.md`
**Diff range**: `a121594..8d4ce41`, a fatia inteira. As correções da rodada 1 são `043753f..10a4659`
(F1 a F7), e `8d4ce41` só remapeia hashes.
**Verifier**: sub-agente independente (autor ≠ verificador), rodada 2

**Resumo do veredito.**
- **As cinco lacunas da rodada 1 estão fechadas.**
  - A confirmação de salvar fica à vista, com o foco nela, depois da página relida.
  - Os quatro sobreviventes (M3, M5, M16 e M17) morrem, cada um no teste novo que o mira.
- **A F7 trouxe uma lacuna nova, de corrida, no FIXCOL-09.** O `router.replace` só muda a URL quando
  o servidor responde, uns 100 ms depois do clique. O `mudarEndereco` decide "já está lá" lendo
  `window.location`. Por isso, fechar ou abrir o cadastro logo depois de abrir deixa `?fixo=` na URL,
  e reabrir logo depois de fechar deixa a URL sem ele.
  - A sonda reproduziu nos três casos: 3 de 3, 2 de 2 e 3 de 3.
  - Viola o FIXCOL-09, AC 4, e o AC 1.
  - É um caso só, de severidade Minor, com correção pequena.
- **Gate:**
  - `typecheck`, `lint`, 1.828 unitários, 364 de integração e `build` saem 0.
  - O e2e passou 190 de 190. Um arquivo fora da fatia caiu por carga e passou sozinho.
- **Sensor:** 12 mutantes e 12 mortos.
  - Os 4 sobreviventes da rodada 1.
  - 8 novos, na F1 e na F7.

---

## 1. Integridade da rodada

- **O rebase não mudou a fatia.**
  - `git diff e39eeae d964e84 -- src e2e` e `git diff a121594 8faeace -- src e2e` têm o mesmo
    `patch-id`, `c58c640…`.
  - Os quatro arquivos que a base trouxe não são tocados pela fatia: `e2e/formulario-pela-coluna.spec.ts`,
    `cadastro-de-meio-inline.tsx`, `form-compra.tsx` e `form-lancamento-avulso.tsx`.
  - `FormRecorrencia` não usa `CadastroDeMeioInline`.
- **Os commits são um por correção.** Cada um marca a task em `tasks.md` e atualiza a traceability
  em `spec.md`. Nenhuma caixa de `tasks.md` ficou aberta.
- **Nenhum teste saiu, foi pulado ou afrouxado.**
  - As assertions de antes estão intactas em `todo-mes-colunas.spec.ts`, `todo-mes.test.tsx` e
    `painel-do-fixo.test.tsx`. Os títulos ganharam os ACs novos.
  - `editar-fixo.spec.ts` não mudou.
  - Os dois testes da F6 em `todo-mes.test.tsx` foram reescritos pela F7, porque a releitura saiu do
    código. Eles provam agora a navegação, em `:275-281` e `:284-290`.
- **Contagens.**
  - Unitários: 1.823 → 1.828. São +2 da F1 (`form-recorrencia.test.tsx:207`, `:575`), +2 da F6/F7
    (`todo-mes.test.tsx:275`, `:284`) e +1 da F5 (`painel-do-fixo.test.tsx:606`).
  - e2e da fatia: 35 → 41 em `todo-mes-colunas.spec.ts`. São +5 da F1 (`:1203` ×4, `:1239`) e +1
    da F7 (`:1265`).
  - O e2e inteiro tem 190 testes em 16 arquivos. Os 15 de `formulario-pela-coluna.spec.ts` vieram da
    base.
- **A spec mudou por decisão do dono.**
  - O FIXCOL-05, AC 5, e o FIXCOL-06, AC 3, dizem "à vista, junto do botão …, sem levar a tela ao
    título do painel", com a confirmação do dono em 2026-10-31.
  - A premissa "Estado na URL" passou a `router.replace`, como decisão do autor (`n`). O `design.md`
    registra a troca em `:274-279` e `:331`.

---

## 2. As lacunas da rodada 1

| Rodada 1 | Correção | Prova agora | Mutante | Situação |
| --- | --- | --- | --- | --- |
| Fix 1: a confirmação de salvar fora da janela (FIXCOL-05, AC 5; FIXCOL-06, AC 3) | F1 (`preventScroll` na guarda, foco na confirmação), F6 → F7 (a rolagem do Next) | `e2e/todo-mes-colunas.spec.ts:1220` `toBeInViewport({ ratio: 1 })`, `:1221` `toBeFocused()`, `:1222` `oTituloEntrou` = `false`, nas quatro combinações de 1.280 × 720 e 1.920 × 1.080, edição e cadastro, medidas depois da linha nova (`:1218`) e de dois quadros; `form-recorrencia.test.tsx:215-218` e `:582-585` o foco na confirmação, logo antes do botão | N2, N3, N4, N5 mortos (seção 8) | ✅ Fechado |
| Fix 2: o lado colado de "começa depois" (FIXCOL-01, AC 9) | F2 | `e2e/todo-mes-colunas.spec.ts:408` sem "Começa em" em Fixo B e Entrada A; `:412-418` no painel de B | M3 morto em `:408` | ✅ Fechado |
| Fix 3: os dados do painel na página real (FIXCOL-04, AC 3) | F3, com uma segunda pessoa semeada | `e2e/todo-mes-colunas.spec.ts:444-448` cada `dd` pelo `dt` no painel de A, "Pessoa B" em "De quem é"; `:462-463` "Onde o dinheiro cai" e "Pessoa A" na entrada | M16 morto em `:446` (mostrou o id) | ✅ Fechado |
| Fix 4: "+ Novo fixo" acima a partir de 1.536 px (FIXCOL-06, AC 1) | F4 | `e2e/todo-mes-colunas.spec.ts:733-734` (`novoFixoNoAlto`), chamado em `:943` (1.536 e 1.920 px) e `:751` (400 px) | M17 morto em `:733` (684 px > 87,5 px) | ✅ Fechado |
| Fix 5: a condição `disabled` da guarda | F5 | `src/components/painel-do-fixo.test.tsx:606-617`, `expect(document.activeElement).toBe(mudarValor)` | M5 morto, 1 de 642 testes de `src/components` | ✅ Fechado |

---

## 3. Task Completion

| Task | Status | Notes |
| --- | --- | --- |
| T1 a T11 | ✅ Done | Conferidas na rodada 1; o código delas não mudou no rebase (seção 1) |
| F1 | ✅ Done | `f7b3842`; a spec, a guarda, o foco na confirmação, 2 unitários e 5 e2e |
| F2 | ✅ Done | `bca56a0`; mata M3 |
| F3 | ✅ Done | `206f11e`; mata M16 |
| F4 | ✅ Done | `1751ad2`; mata M17 |
| F5 | ✅ Done | `4b37dd2`; mata M5 |
| F6 | ✅ Done, substituída | `a259f53`; a releitura saiu na F7 |
| F7 | ⚠️ Done, com lacuna | `10a4659`; resolve a rolagem, mas abre a corrida da seção 6 |

---

## 4. Spec-Anchored Acceptance Criteria

Cada linha cita o teste e a assertion. "e2e" é `e2e/todo-mes-colunas.spec.ts`, salvo quando outro
arquivo é nomeado. As linhas são as de `8d4ce41`.

### P1: Uma linha por fixo, em duas seções — FIXCOL-01

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| 1 | "Entradas fixas" antes de "Saídas fixas"; colunas Descrição, Categoria, Vence/Cai, Meio/Onde cai, "Valor em <mês>" | `src/components/tabela-de-fixos.test.tsx:154`, `:163-167`, `:173-177`; e2e `:358` `entradas.y < saidas.y`, `:359-372` `toHaveText([...])` | ✅ |
| 2 | Despesa em saídas; o resto em entradas | `src/domain/recorrencia/fixos-do-mes.test.ts:102-103` | ✅ |
| 3 | Dia crescente; empate pela descrição pt-BR | `fixos-do-mes.test.ts:118`, `:134-138`, `:147-148`; e2e `:374-379` `["Fixo D","Fixo A","Fixo B","Fixo C"]` | ✅ |
| 4 | "N · R$ X" no título da seção | `tabela-de-fixos.test.tsx:183-185`; e2e `:381-382` | ✅ |
| 5 | Pill na cor; neutras para "Sem categoria"/"Categoria removida" | `tabela-de-fixos.test.tsx:269-296`; `e2e/categorias.spec.ts:423-425` | ✅ |
| 6 | "Receita" em toda entrada | `tabela-de-fixos.test.tsx:243-246`, `:311-316` | ✅ |
| 7 | Um botão só na linha | `tabela-de-fixos.test.tsx:252-256` | ✅ |
| 8 | Selo "Encerrado" | `tabela-de-fixos.test.tsx:235-237`; e2e `:395` | ✅ |
| 9 | Começa depois: "—" e "Começa em <Mês de Ano>"; quem começa no mês aberto, não | `tabela-de-fixos.test.tsx:227-229`; e2e `:398-401` (D, junho), `:408` `getByText(/^Começa em/)` `toHaveCount(0)` em Fixo B e Entrada A, que começam em março | ✅ (era ❌) |
| 10 | ≥ 1.280 px, ponteiro fino: toda linha ≤ 48 px | e2e `:655` (1.280) e `:953` (1.536 e 1.920) via `linhasDeAte48` `:225-251` | ✅ |
| 11 | < 768 px: duas linhas, sem cabeçalho | e2e `:748-749` (400), `:811-812` e `:815-823` (767 e 768), helpers `:756-795` | ✅ |
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
| 1 | Os dois totais com "em <Mês de Ano>" | `src/components/todo-mes.test.tsx:202-203`; e2e `:339-340` | ✅ |
| 2 | Saídas = bloco "Fixos" de Lançamentos | `fixos-do-mes.test.ts:368`; e2e `:339` e `:344-348` "3 · R$ 185,00 · 2 a pagar" | ✅ |
| 3 | Entradas = ocorrências dos não despesa | `fixos-do-mes.test.ts:372`; e2e `:340` | ✅ |
| 4 | Só `movimento`; começa depois soma zero | `fixos-do-mes.test.ts:385`; e2e `:339` sem os R$ 70,00 de D | ✅ |
| 5 | Título da seção = total = soma das linhas | `fixos-do-mes.test.ts:376-377`; e2e `:381-382` contra `:339-340` | ✅ |

### P1: O fixo aberto no painel — FIXCOL-04

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| 1 | Linha inteira ou botão abre; título e subtítulo | `tabela-de-fixos.test.tsx:355-377`; `src/components/painel-do-fixo.test.tsx:239-248`; e2e `:440-441` | ✅ |
| 2 | "em <Mês de Ano>"; "confirmado · previa R$ X"; "—" com "Começa em" | `src/components/detalhe-do-fixo.test.tsx:86`, `:95`, `:109-110`; e2e `:442`, `:412` (B, "em Março de 2026") | ✅ |
| 3 | Categoria, meio, "De quem é", início, "Termina em"/"Sem fim" | `detalhe-do-fixo.test.tsx:118-173`; e2e `:444-448` cada `dd` pelo `dt` no painel de A, com uma segunda pessoa dona dele; `:462-463` na entrada; `:413-418` "Começou em" em B, sem "Começa em" | ✅ (era ❌) |
| 4 | Vigências em ordem, "vale em <mês>" na do mês | `detalhe-do-fixo.test.tsx:183-202`; e2e `:452-457` | ✅ |
| 5 | "Mudar valor", "Editar", "Encerrar" em vermelho no pé | `detalhe-do-fixo.test.tsx:211-217` | ✅ |
| 6 | Encerrado: aviso e só "Editar" | `detalhe-do-fixo.test.tsx:237-242` | ✅ |
| 7 | Linha aberta com fundo e `aria-expanded` | `tabela-de-fixos.test.tsx:383-396`; e2e `:640-646` | ✅ |
| 8 | "Fechar" fecha e desmarca | `painel-do-fixo.test.tsx:255-257`; `todo-mes.test.tsx:332-334` | ✅ |
| 9 | Outro fixo: detalhe do novo, sem o digitado | `painel-do-fixo.test.tsx:265-273` | ✅ |

### P1: Mudar valor, editar e encerrar no painel — FIXCOL-05

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| 1 | "Novo valor (R$)", "Vale a partir de" com o mês | `src/components/ciclo-do-fixo.test.tsx:105-148`; `painel-do-fixo.test.tsx:283-286`; e2e `:474-475` | ✅ |
| 2 | Registrado: volta ao detalhe com a vigência nova | `painel-do-fixo.test.tsx:310-315`; e2e `:483-487` | ✅ |
| 3 | Encerrar: aviso, mês, "Encerrar mesmo assim" | `ciclo-do-fixo.test.tsx:185-221`; `painel-do-fixo.test.tsx:295-299`; e2e `:504` | ✅ |
| 4 | "Editar" no painel, sem diálogo, preenchido | `painel-do-fixo.test.tsx:357-397`; `e2e/editar-fixo.spec.ts:85-92` | ✅ |
| 5 | Salvo: formulário fica, "Alterações salvas." ou "Nada mudou…", **à vista, junto do botão, sem ir ao título** | `painel-do-fixo.test.tsx:411-412`; `e2e/editar-fixo.spec.ts:97`, `:143`, `:183`; `src/components/form-recorrencia.test.tsx:582-585` foco na confirmação e `nextElementSibling` = "Salvar alterações" (L-018); e2e `:1220-1222` inteira na janela, com o foco, sem o título entrar, em 1.280 × 720 e 1.920 × 1.080, depois da página relida | ✅ (era ⚠️). "Nada mudou" não tem a medida da janela: mesmo elemento e mesmo efeito, observação 3 |
| 6 | "Voltar"/"Cancelar": detalhe com o gravado | `painel-do-fixo.test.tsx:324`, `:333`, `:427-429` | ✅ |
| 7 | Recusa no painel, em alerta | `ciclo-do-fixo.test.tsx:161-166`, `:233-237`; e2e `:1252-1253` o alerta de "Registrar" inteiro na janela em 400 × 800 | ✅ |
| 8 | Fixo sai da lista: "<descrição> não aparece mais em <Mês de Ano>." | `painel-do-fixo.test.tsx:453-469`; e2e `:507-509` | ✅ |

### P1: Novo fixo no painel — FIXCOL-06

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| 1 | "+ Novo fixo" acima dos totais e da lista, em todas as larguras | `todo-mes.test.tsx:194-195` (DOM); `e2e/recorrencias.spec.ts:125` (1.280); e2e `:733-734` na tela, em 400 (`:751`), 1.536 e 1.920 px (`:943`) | ✅ (era ❌) |
| 2 | Cadastro no painel, sem diálogo; fecha o fixo aberto | `painel-do-fixo.test.tsx:213-215`; `todo-mes.test.tsx:316-321`; e2e `:518-519` | ✅ |
| 3 | Cadastrado: formulário fica, confirmação **à vista, junto do botão**, campos limpos, fixo na lista | `painel-do-fixo.test.tsx:226-231`; e2e `:526-529`; `form-recorrencia.test.tsx:215-218`; e2e `:1220-1222` no cadastro, a partir de uma carga com `?fixo=`, depois da página relida | ✅ (era ⚠️) |

### P1: A coluna da direita a partir de 1.536 px — FIXCOL-07

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| 1 | ≥ 1.536: coluna de 384 px, linha fina | e2e `:878`, `:923` `abs(largura − 384) ≤ 1`, `:928` `1px solid` | ✅ |
| 2 | Título do painel à vista ao rolar | e2e `:967` (1.536 e 1.920 × 480), `:993` | ✅ |
| 3 | Nada aberto ≥ 1.536: a dica | `painel-do-fixo.test.tsx:199-205`; e2e `:882-883` | ✅ |
| 4 | ≤ 1.100 px, centrados | e2e `:938-941` | ✅ |
| 5 | < 1.536: uma coluna ≤ 1.024 px, painel entre totais e seções | `todo-mes.test.tsx:214-239`; e2e `:611-616`, `:694-700`, `:873`, `:908` | ✅ |
| 6 | Nada aberto < 1.536: sem painel | e2e `:603`, `:867-868`, `:889-890`; `todo-mes.test.tsx:208-211` | ✅ |
| 7 | Formulário < 448 px: um campo por linha | e2e `:1070-1071`, `:1105-1108` | ✅ |
| 8 | Formulário ≥ 448 px: pares lado a lado | e2e `:1087-1088`, `:1110-1112` e seguintes | ✅ |
| 9 | 400 px com um fixo aberto: sem rolagem lateral | e2e `:747` | ✅ |

### P1: Teclado e foco — FIXCOL-08

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| 1 | Botão da linha no `Tab`, abre com `Enter` ou espaço | `tabela-de-fixos.test.tsx:364-377`; e2e `:575-577`, `:591-592` | ✅ |
| 2 | Abrir leva o foco ao título | `todo-mes.test.tsx:251`, `:321`; `painel-do-fixo.test.tsx:501`, `:514`; e2e `:579`, `:593`. A sonda viu o foco continuar no título depois da página relida da F7 (seção 6) | ✅ |
| 3 | `Escape` dentro do painel fecha | `painel-do-fixo.test.tsx:482`, `:492`, `:577-590`; e2e `:582-583`, `:1224` depois de salvar, `:1254-1255` depois da recusa | ✅ |
| 4 | Fechar devolve o foco à linha ou ao "+ Novo fixo" | `todo-mes.test.tsx:333`, `:346`, `:357`, `:379`; e2e `:584`, `:1225` | ✅ |
| 5 | < 1.536: abrir traz o título para a janela | e2e `:667` (fora antes), `:672` `toBeInViewport()` | ✅ |
| 6 | < 768 px: alvos ≥ 44 × 44 | e2e `:750`, `:813`, `:842` (ponteiro grosso) | ✅ |

### P2: O fixo aberto no endereço — FIXCOL-09

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| 1 | Abrir põe `?fixo=<id>` na URL, sem recarregar e sem entrada nova | `todo-mes.test.tsx:280-281` `router.replace("?outro=1&fixo=rec-b", { scroll: false })`; e2e `:545` URL, `:546-549` marcador e `history.length`. **Falha na corrida:** fechar e logo reabrir o mesmo fixo deixa a URL **sem** `?fixo=`, com o fixo aberto (sonda "corrida 2", 3 de 3) | ❌ GAP (F7) |
| 2 | Carregar com `?fixo=` abre o fixo | `todo-mes.test.tsx:296-297`; e2e `:551-553` | ✅ |
| 3 | `?fixo=` fora da lista: ignorado | `todo-mes.test.tsx:303-305`; e2e `:555-560` | ✅ |
| 4 | Fechar ou abrir o cadastro tira `?fixo=` | `todo-mes.test.tsx:319`, `:335`, `:347`, `:368`; e2e `:586`, depois de esperar a URL em `:580`. **Falha na corrida:** abrir e logo fechar deixa `?fixo=<id>` com o painel fechado (3 de 3), e abrir e logo "+ Novo fixo" deixa `?fixo=<id>` com o cadastro (2 de 2) | ❌ GAP (F7) |

**Status**: ❌ dois ACs do FIXCOL-09 falham na mesma corrida, nascida na F7. Os outros 60 de 62 têm
o resultado da spec provado. Nenhum spec-precision gap: os dois da rodada 1 viraram ACs com "à vista",
por decisão do dono, e estão provados.

---

## 5. Edge Cases

- [x] Descrição longa quebra e só ela cresce: e2e `:243-250`, em 1.280, 1.536 e 1.920 px.
- [x] Fixo que começa depois: "—", selo, zero no total, ações no painel. O lado "começa no mês
  aberto" agora é provado (e2e `:408`).
- [x] Valor confirmado: e2e `:391`, `fixos-do-mes.test.ts:361`, `painel-do-fixo.test.tsx:395-397`.
- [x] Encerrado com ocorrência paga depois do fim: `fixos-do-mes.test.ts:224-226`, e2e `:395-396`.
- [~] Encerrar a partir de mês posterior: `painel-do-fixo.test.tsx:342` volta ao detalhe; o aviso
  nesse retorno não tem assertion. Igual à rodada 1, não bloqueia.
- [x] Renomear muda a posição da linha: `e2e/editar-fixo.spec.ts:137-143`. Na F1, a edição renomeia
  A para "Fixo A2" e a confirmação fica à vista (e2e `:1218-1222`).
- [x] Edição mais alta que a janela a partir de 1.536 px: e2e `:973-997`.
- [x] Trocar de mês pelo seletor: sem teste na suíte. A sonda abriu A, foi pelo "Próximo mês" e chegou
  a `/2026-04`, sem `?fixo=` e sem painel: as setas e os campos do seletor levam à Visão geral do
  outro mês (`seletor-competencia.tsx:104`, `:144`).
- [x] Erro numa action: `ciclo-do-fixo.test.tsx:161-166`; e2e `:1252-1255`.

---

## 6. A F7 julgada: o endereço pelo roteador do Next

A F7 troca `history.replaceState` por `router.replace(…, { scroll: false })` (`todo-mes.tsx:93-105`).
- **A causa que ela trata é real.** Com `history.replaceState`, a página relida da action rolava a
  janela até o alto:
  - o mutante N5 (a rodada 1) cai em e2e `:1220`, com `ratio` 0;
  - o N9 (a F6) cai em `:1287`, com a linha clicada fora da janela.
- **Os documentos do Next 16 confirmam o caminho.**
  - `scroll: false` desliga a rolagem até o primeiro elemento da página
    (`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-router.md`, "Disabling
    scroll to top").
  - `replace` não cria entrada no histórico.
  - O `replaceState` nativo "integra" com o roteador
    (`01-app/01-getting-started/04-linking-and-navigating.md:343-347`), mas não diz que suspende a
    rolagem. Foi o que a F6 e a F7 mediram.

A sonda descartável (`zz-sonda-f7.spec.ts`, só no worktree do sensor, `next dev`, 1.280 × 900) mediu
o resto.

| Pergunta | Medida | Juízo |
| --- | --- | --- |
| Idas ao servidor por clique | **Abrir** um fixo: 1 GET `?fixo=…&_rsc=`, a página inteira no servidor (33 a 35 ms de código). **Fechar** ou "+ Novo fixo" com `?fixo=`: 2 GETs, um de 3 ms (a árvore da rota) e um de 26 a 33 ms (a página). **Nenhum** pedido ao clicar de novo no fixo aberto ou ao abrir o cadastro sem `?fixo=` | O custo que o autor registrou, e só quando o endereço muda (`todo-mes.tsx:101`) |
| A URL acompanha o clique? | Não: logo depois do clique `window.location.search` é o de antes; a URL muda **86 a 117 ms** depois, quando o Next recebe a página | É a origem da lacuna abaixo |
| Escritas no banco | Um clique: 16 transações contra 3 do intervalo ocioso, ~13 por clique (recarregar a página: ~16). `movimento`: 0 inseridas, 0 alteradas, 0 tuplas mortas. O `INSERT … ON CONFLICT DO NOTHING` da materialização roda a cada clique e não grava nada com o mês já aberto | Custo de leitura, sem escrita efetiva; idempotente como qualquer carga (FIXO-02) |
| Piscar | 1.280 × 720 e 1.920 × 1.080: nenhum esqueleto "Carregando o mês", nenhum nó de tabela removido, o mesmo nó DOM na linha clicada depois da resposta, o foco no `H2` do painel. Em 1.920 × 1.080, nenhum movimento em 4 s. Em 1.280 × 720, um movimento só, o da abertura (FIXCOL-08, AC 5), e nada na hora da resposta | Sem piscar e sem roubar o foco |
| "Voltar" | `history.length` 2 → 3 ao entrar em Todo mês pelo menu → 3 depois de abrir A, abrir B e fechar. "Voltar" leva a `/2026-03`; "Avançar" volta a `/2026-03/fixos`, fechado | Igual a antes: sem entrada por clique |
| Estado velho | Renomear B para "Fixo B2", abrir A e voltar a B2: a lista mostra "Fixo B2", nunca "Fixo B". Um nome mudado direto no banco aparece no clique seguinte | Nenhum dado velho do cache do cliente; cada clique relê |
| Cliques seguidos | A, B e C sem esperar: 2 de 2 terminam em `?fixo=<C>`, com C no painel | O Next descarta a navegação pendente; certo |
| **Abrir e logo fechar** | A e `Escape` sem esperar: **3 de 3 terminam com `?fixo=<A>` e o painel fechado**. A e "+ Novo fixo": **2 de 2 com `?fixo=<A>` e o cadastro**. Contraprova, esperando a URL antes do `Escape`: termina sem `?fixo=` | ❌ FIXCOL-09, AC 4 |
| **Fechar e logo reabrir** | A aberto e com a URL, `Escape` e clique em A sem esperar: **3 de 3 terminam sem `?fixo=` e com A no painel** | ❌ FIXCOL-09, AC 1 |

**O mecanismo da corrida.**
1. `mudarEndereco` compara o endereço pedido com `window.location.search` (`todo-mes.tsx:101`) e
   desiste quando são iguais.
2. Pelo `router.replace`, a URL só muda no commit da navegação, depois da resposta.
3. Durante esses ~100 ms, `window.location` ainda é o endereço anterior.
4. Fechar logo depois de abrir calcula "sem `?fixo=`", acha igual ao que a barra ainda mostra e
   desiste.
5. A navegação pendente chega e grava `?fixo=<A>`.

Recarregar ou mandar o link reabre o fixo que a pessoa fechou. Com o `replaceState` da rodada 1 a URL
mudava na hora, e a corrida não existia. Os e2e não pegam porque esperam a URL antes do passo seguinte
(e2e `:580`, `:545`). Em produção a janela é a ida e volta ao servidor, e com rede de celular ela é
maior, não menor.

**Juízo da F7.**
- A troca resolve a rolagem que a F1 precisava, e o custo dela é aceitável:
  - uma página no servidor por clique que muda o endereço;
  - nenhuma escrita efetiva;
  - nenhum piscar e nenhum dado velho.
- A reversão do "sem ida ao servidor a cada clique" foi registrada no `design.md` e na premissa da spec,
  como decisão do autor. Não quebra nenhum AC por si.
- **O que quebra é o atalho de comparar com `window.location`**, que fazia sentido com o
  `replaceState` síncrono e deixou de fazer. É o Fix 1.

---

## 7. O que o autor pediu para julgar

**O foco na recusa de "Registrar"** fica no título do painel, segurado pela guarda sem rolar. A
sonda, em 400 × 800 com 15 fixos, mediu:
- o título em y 164 a 190, dentro da janela;
- o alerta em y 536, dentro da janela, e `scrollY` 369;
- o próximo `Tab` indo a "Fechar", sem a tela andar.

O FIXCOL-05, AC 7, pede só a mensagem no painel, em alerta, e o edge case pede o painel no mesmo modo.
Os dois estão provados (e2e `:1252-1255`). Uma janela mais baixa pode deixar o título fora dela, mas
isso não fere AC nenhum. "Como hoje", o foco caía no `body`, o que é pior. **Não bloqueia.** Levar o
foco ao alerta seria coerente com a confirmação, e fica para o dono.

**Os 24 px em 1.920 × 480.**
- A sonda mediu `scrollY` 674 → 650 no clique, e 650 depois da resposta.
- O título fica preso em y 40, e o `html` reserva `scroll-padding-top` de 64 px
  (`globals.css:439`). 64 − 40 = 24.
- O mesmo 674 → 650 aparece com o mutante N5, isto é, com o `replaceState` da rodada 1.
- A atribuição do autor está certa: é o `focus()` de abrir (`painel-do-fixo.tsx:103-107`), e não a
  F7. Ele já existia.

Nenhum AC proíbe, e a linha clicada continua à vista (e2e `:1287`). Fica como observação 1.

**Os testes da F1 não passam por tempo.**
- Eles medem depois de `linhaNova` existir (e2e `:1218`). "Fixo A2" ou "Fixo E" só aparecem no
  commit da página relida, e é nesse commit que o Next rolaria.
- Depois vêm dois quadros, para o observador entregar o que mudou.
- O `toBeInViewport` repete, mas nada traz a confirmação de volta depois dessa rolagem: o foco nela
  aconteceu antes, quando ela apareceu.
- O teste da F7 mede depois de a URL mudar (`:1280`, que só muda no commit), da resposta terminar e de
  dois quadros.
- A prova empírica:
  - N5 cai em `:1220`, `ratio` 0;
  - N9 e N1 caem em `:1287`;
  - N2 cai em `:1222`, com o título entrando na janela;
  - N3 cai em `:1221`.
- Uma ressalva: com N9, a F6, os quatro testes da F1 passam. Está certo, porque a F6 consertava o
  salvar. O defeito dela, ao abrir com a página rolada, é pego por `:1265`.

---

## 8. Discrimination Sensor

Worktree descartável em `8d4ce41`, com `pnpm install --offline --frozen-lockfile` próprio, sob o
scratchpad. O e2e rodou na porta 3101, com uma configuração fora do repositório, sempre depois do e2e do
gate, porque os dois usam o mesmo banco. Cada mutante:
- conferiu que o trecho original aparecia uma vez só;
- foi desfeito com `git checkout -- <arquivo>`.

No fim, o worktree do sensor só tinha `next-env.d.ts`, reescrito pelo `next dev`, e as duas sondas não
rastreadas. Ele foi removido com `git worktree remove --force`.

| # | File:line | Descrição | Killed? |
| --- | --- | --- | --- |
| M3 | `src/app/(app)/[competencia]/fixos/page.tsx:135` | `> 0` → `>= 0`: quem começa no mês aberto ganha "Começa em" | ✅ Morto em e2e `:408` (sobrevivia na rodada 1) |
| M5 | `src/components/painel-do-fixo.tsx:126-127` | Tira `&& evento.target.disabled`: a guarda age em qualquer botão | ✅ Morto em `painel-do-fixo.test.tsx:606` (1 de 642) (sobrevivia) |
| M16 | `page.tsx:130` | `pessoa: recorrencia.usuarioId` | ✅ Morto em e2e `:446`, que recebeu o id (sobrevivia) |
| M17 | `src/components/todo-mes.tsx:136` | `2xl:row-start-1` → `2xl:row-start-4` | ✅ Morto em e2e `:733` a 1.536 px (sobrevivia) |
| N1 | `todo-mes.tsx:104` | `router.replace` sem `{ scroll: false }` | ✅ Morto em `todo-mes.test.tsx:281` e e2e `:1287` (os quatro da F1 passam) |
| N2 | `painel-do-fixo.tsx:129` | A guarda volta a `focus()` sem `preventScroll` | ✅ Morto em e2e `:1222`, o título entrou na janela (a unidade passa: o jsdom não rola) |
| N3 | `src/components/form-recorrencia.tsx:215` | A confirmação aparece sem receber o foco | ✅ Morto em `form-recorrencia.test.tsx:207` e `:575`, e em e2e `:1221` |
| N4 | `form-recorrencia.tsx:710` | Sem `tabIndex={-1}`: o `focus()` não pega no `<p>` | ✅ Morto em `form-recorrencia.test.tsx:207` e `:575` |
| N5 | `todo-mes.tsx:104` | A F7 desfeita: `history.replaceState`, como na rodada 1 | ✅ Morto em `todo-mes.test.tsx:281` e e2e `:1220` (`ratio` 0, edição em 1.280 × 720) |
| N6 | `todo-mes.tsx:101-103` | Navega a cada abrir ou fechar, mesmo com o endereço igual | ✅ Morto em `todo-mes.test.tsx:290` |
| N8 | `painel-do-fixo.tsx:129` | A guarda deixa de segurar o foco (o foco cai no `body` ao gravar) | ✅ Morto em `painel-do-fixo.test.tsx:577` e e2e `:1255`, depois da recusa (os quatro da F1 passam: o foco na confirmação compensa no sucesso) |
| N9 | `todo-mes.tsx:104` | A F6 de volta: `replaceState` e `router.refresh()` | ✅ Morto em e2e `:1287` (os quatro da F1 passam, como a F6 prometia) |

**Sensor depth**: ampliado, com 12 mutantes. A rodada mexe no foco e na navegação, e a F7 inverte uma
decisão de desenho.
**Resultado do sensor**: 12 de 12 mortos. Nenhum sobrevivente. A lacuna do FIXCOL-09 é de
comportamento, e não de teste fraco: o código de hoje viola o AC na corrida, e nenhum mutante era
necessário para vê-la.

---

## 9. Gate Check

- **Gate command**: o `build` de `tasks.md:105`. `pnpm verify` foi rodado passo a passo, com cada
  código de saída conferido sozinho, e depois veio o e2e inteiro na porta 3100, com
  `DATABASE_URL_TEST` no banco `…_tmc`.
- **Resultado**:
  - `pnpm typecheck`: 0. `pnpm lint`: 0 (331 arquivos).
  - `pnpm test:unit`: 0. **1.828 passaram em 115 arquivos**, 0 falhas, 0 skip. `src/domain` tem
    100% de branches (367/367).
  - `pnpm test:integration`: 0. **364 passaram em 23 arquivos.**
  - `pnpm build`: 0.
  - e2e inteiro, **190 testes em 16 arquivos**: a primeira passada saiu 1, com 188 passando.
    - Caiu `e2e/importacao.spec.ts:152`: o `expect` de 5 s em "5 criados" depois de "Importar 9
      lançamentos", com a máquina em carga 15 a 19.
    - O teste serial seguinte do mesmo arquivo não rodou.
    - O arquivo não toca nada desta fatia além da leitura de Todo mês no fim.
    - Rodado sozinho uma vez, passou 2 de 2, com saída 0.
    - **Total: 190 de 190.** Os 41 de `todo-mes-colunas.spec.ts` passaram na primeira passada.
- **Contagem antes da fatia** (`e39eeae`): 1.717 unitários, 364 de integração e 134 e2e em 14
  arquivos (rodada 1).
- **Delta**:
  - +111 unitários: +131 novos, −25 portados de `lista-de-fixos.test.tsx` e +5 nas correções.
  - 0 de integração.
  - +41 e2e da fatia. Os 15 de `formulario-pela-coluna.spec.ts` vieram da base.
- **Skipped**: nenhum.
- **Efeito colateral**: o `next dev` do e2e reescreveu `next-env.d.ts` na worktree real. Foi
  restaurado com `git checkout -- next-env.d.ts`.

---

## 10. Code Quality

| Principle | Status |
| --- | --- |
| Minimum code | ✅ A F1 é uma opção no `focus()`, um `ref` e um efeito; a F7 troca uma função por outra do mesmo tamanho |
| Surgical changes | ✅ Cada correção toca o arquivo da causa e o teste dela |
| No scope creep | ✅ Nenhuma action nova; a releitura da F6 saiu inteira |
| Matches patterns | ✅ `tabIndex={-1}` e `focus()`, como nos títulos do painel |
| Spec-anchored outcome check | ❌ FIXCOL-09, ACs 1 e 4, na corrida (Fix 1) |
| Per-layer Coverage Expectation | ⚠️ O caminho rápido do endereço não tem e2e: os testes esperam a URL antes do passo seguinte |
| Every test maps to a spec requirement | ✅ Os testes novos citam o AC no título |
| Documented guidelines followed | `AGENTS.md`: ✅ nenhum skip, nenhuma assertion afrouxada, nenhum timeout mexido, nomes genéricos ("Pessoa B", "Fixo A2") |

---

## 11. Fix Plans

### Fix 1: o endereço não pode depender de `window.location` enquanto a navegação está pendente (FIXCOL-09, ACs 1 e 4)

- **Root cause**: `mudarEndereco` (`src/components/todo-mes.tsx:93-105`) desiste quando o endereço
  pedido é igual a `window.location.search` (`:101`). Com `router.replace`, a URL só muda no commit
  da navegação, uns 100 ms depois do clique. Abrir e logo fechar, ou fechar e logo reabrir, compara
  com o endereço anterior e não navega. A navegação pendente então grava o endereço errado.
- **Fix task**:
  - **Código:** guardar num `ref` o `fixo` do último endereço pedido, iniciado com o `fixoInicial`
    válido. Comparar com ele, e não com `window.location`. Os outros parâmetros continuam vindo de
    `window.location.search`, só com `fixo` posto ou tirado. O Next descarta a navegação pendente
    quando chega outra, e por isso o último pedido vale.
  - **Unidade** (`todo-mes.test.tsx`), com um `replace` no mock que **não** muda a URL, como o do
    Next antes da resposta:
    - abrir B e logo "Fechar": a última chamada é `replace(<sem fixo>, { scroll: false })`;
    - "Fechar" e logo reabrir B: a última chamada é `replace("?outro=1&fixo=rec-b", { scroll: false })`;
    - abrir B e logo "+ Novo fixo": a última chamada é sem `fixo`.
  - **e2e** (`todo-mes-colunas.spec.ts`), sem esperar a URL entre os passos:
    - clicar em A e apertar `Escape`; depois da resposta, a URL termina sem `?fixo=`;
    - com A aberto, `Escape` e clicar em A de novo; a URL termina com `?fixo=<A>`.
- **Done when**: os testes novos falham no código de `8d4ce41` e passam com a correção. Os testes de
  endereço de hoje passam sem mudança no corpo.
- **Priority**: Minor (P2, janela curta, mas a URL errada reabre o que a pessoa fechou)

---

## 12. Observações não bloqueantes, para o dono

1. **Os 24 px em 1.920 px.**
   - Abrir um fixo com a página rolada sobe a página 24 px.
   - O título preso em y 40 cai dentro dos 64 px de `scroll-padding-top`.
   - É anterior à F7. Um `scroll-margin-top` negativo no título a partir de 1.536 px, ou o `focus()`
     de abrir com `preventScroll` quando o título já está na janela, tiraria isso.
2. **O foco na recusa** fica no título do painel, e não no alerta (seção 7). Levá-lo ao alerta seria
   coerente com a confirmação.
3. **"Nada mudou: já estava tudo assim."** não tem a medida da janela. É o mesmo elemento e o mesmo
   efeito de "Alterações salvas.", provado em `:1220`. A L-010 sugeriria um caso.
4. **`todo-mes.test.tsx:254`, "por replaceState",** agora prova o mock. `navegar` chama
   `replaceState` (`:22-28`), e a assertion `expect(replace).toHaveBeenCalled()` (`:262`) não diz
   nada do componente.
   - A traceability do FIXCOL-09 em `spec.md` ainda diz "por `replaceState`".
   - Renomear o teste e tirar o espião do `replaceState` deixa a prova honesta. O "sem entrada nova"
     real está em e2e `:549` e na sonda do "Voltar".
5. **Custo da F7:**
   - uma página no servidor por clique que muda o endereço, ~13 transações, sem escrita;
   - no fechar, mais um pedido leve da árvore da rota.

   Para duas pessoas é irrelevante. Fica registrado para quando a lista crescer.

---

## 13. Requirement Traceability Update

Proposta para o `spec.md`. O Verifier não edita a spec.

| Requirement | Previous Status | New Status |
| --- | --- | --- |
| FIXCOL-01 | ❌ Needs Fix (rodada 1) | ✅ Verified |
| FIXCOL-02 | ✅ Verified | ✅ Verified |
| FIXCOL-03 | ✅ Verified | ✅ Verified |
| FIXCOL-04 | ❌ Needs Fix (rodada 1) | ✅ Verified |
| FIXCOL-05 | ⚠️ (rodada 1) | ✅ Verified |
| FIXCOL-06 | ❌ Needs Fix (rodada 1) | ✅ Verified |
| FIXCOL-07 | ✅ Verified | ✅ Verified |
| FIXCOL-08 | ✅ Verified | ✅ Verified |
| FIXCOL-09 | ✅ Verified (rodada 1) | ❌ Needs Fix (ACs 1 e 4 na corrida da F7: Fix 1) |

---

## 14. Summary

**Overall**: ❌ Not Ready. Falta uma correção, Minor.

**Spec-anchored check**: 60 de 62 ACs com o resultado da spec provado e válido. Dois ACs do FIXCOL-09
falham na corrida da F7. Nenhum spec-precision gap.
**Sensor**: 12 de 12 mutantes mortos.
**Gate**: `typecheck`, `lint`, 1.828 unitários, 364 de integração e `build` saem 0. O e2e passou 190 de
190, com `importacao.spec.ts` repetido sozinho depois de uma queda por carga.

**What works**:
- **As cinco lacunas da rodada 1 estão fechadas**, e cada sobrevivente morre no teste novo.
- **A confirmação de salvar** fica à vista, com o foco nela, nas duas janelas da rodada 1, depois da
  página relida. Sem a guarda sem rolar, sem o foco ou com o mecanismo antigo do endereço, os testes
  caem.
- **A F7** tira a rolagem até o alto sem piscar, sem roubar o foco, sem dado velho e sem entrada no
  histórico. Custa uma página no servidor por clique, sem escrita no banco.

**Issues found**:
1. A corrida do endereço (FIXCOL-09, ACs 1 e 4). A correção está no Fix 1.

**Next steps**:
- O Fix 1, com os testes que esperam o passo seguinte sem esperar a URL.
- Depois, a rodada 3 do Verifier. Ela é a última antes de escalar para o dono. O escopo é
  `todo-mes.tsx`, os testes de endereço e uma volta no e2e da fatia.

---

## Rodada 1 (resumo)

**2026-10-31, `d964e84` (hoje `8faeace`), FAIL ❌.**

- **Spec-anchored:** 57 de 62.
  - Três ACs com gap:
    - FIXCOL-01, AC 9, no lado colado do limiar;
    - FIXCOL-04, AC 3, na composição;
    - FIXCOL-06, AC 1, a partir de 1.536 px.
  - Dois spec-precision gaps, FIXCOL-05, AC 5, e FIXCOL-06, AC 3: a confirmação de salvar ficava fora
    da janela. A guarda de foco rolava até o título.
- **Sensor:** 12 mutantes, 8 mortos.
  - M1, M2, M4, M6, M8, M10, M13 e M14 morreram.
  - Sobreviveram M3 (`page.tsx:135`), M16 (`page.tsx:130`), M17 (`todo-mes.tsx:121` à época) e M5
    (`painel-do-fixo.tsx:119-121` à época).
- **Gate:** verde, com 1.823 unitários, 364 de integração e 169 e2e.
- **Fixes 1 a 5:** viraram as tasks F1 a F5. A F6 e a F7 nasceram no gate delas. A seção 2 acima diz
  como cada um fechou.
