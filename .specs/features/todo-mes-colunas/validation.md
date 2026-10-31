# Todo mês em linhas, com o fixo aberto à direita: Validation

## Validation: todo-mes-colunas, rodada 1 — FAIL ❌

**Date**: 2026-10-31
**Spec**: `.specs/features/todo-mes-colunas/spec.md`
**Diff range**: `e39eeae..d964e84` (T1 a T11, mais o commit de docs que só remapeia os hashes depois do rebase)
**Verifier**: sub-agente independente (autor ≠ verificador), rodada 1

**Resumo do veredito.**
- **Spec-anchored check:** 57 de 62 ACs com o resultado da spec provado. Dois ACs são gaps: FIXCOL-01, AC 9, no lado colado do limiar, e FIXCOL-04, AC 3, na composição. Um AC, FIXCOL-06, AC 1, não é provado a partir de 1.536 px. Há dois spec-precision gaps, FIXCOL-05, AC 5, e FIXCOL-06, AC 3: a confirmação fica fora da janela.
- **Gate:** verde.
- **Sensor:** 12 mutantes, 8 mortos e 4 sobreviventes.

---

## Task Completion

| Task | Status | Notes |
| --- | --- | --- |
| T1 | ✅ Done | `ac45664`; 23 testes no domínio, 100% de branches |
| T2 | ✅ Done | `fd138a5`; 4 testes com os fakes |
| T3 | ✅ Done | `f8758c8`; 25 testes |
| T4 | ✅ Done | `617c3ad`; 18 testes |
| T5 | ✅ Done | `11fd7d1`; 14 testes, os oito herdados com as mesmas assertions |
| T6 | ✅ Done | `db60cec`; 32 testes no fim da fatia (com os 9 de foco da T8) |
| T7 | ✅ Done | `f19f634`; 15 testes |
| T8 | ✅ Done | `2ec425f`; `lista-de-fixos.*` saem, os 25 testes portados (conferido abaixo) |
| T9 | ✅ Done | `60f20f6`; seis assertions de `todo-mes.test.tsx` trocadas (conferido abaixo) |
| T10 | ✅ Done | `767e57d`; limiar em 777 e 778 px de janela, 447 e 448 px de formulário |
| T11 | ✅ Done | `5a8d472`; AD-021 e as notas de substituição em EDF, AVUL-05, FIXO-07 e TRES-01 |

Todas as caixas de `tasks.md` estão marcadas, e nenhuma task ficou bloqueada ou parcial.

---

## Spec-Anchored Acceptance Criteria

Cada linha cita o teste e a assertion. "e2e" é `e2e/todo-mes-colunas.spec.ts`, salvo quando
outro arquivo é nomeado.

### P1: Uma linha por fixo, em duas seções — FIXCOL-01

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| 1 | "Entradas fixas" antes de "Saídas fixas"; colunas Descrição, Categoria, Vence/Cai, Meio/Onde cai, "Valor em <mês>" | `src/components/tabela-de-fixos.test.tsx:154` ordem das regiões; `:163-167` e `:173-177` `toEqual([...colunas])`; e2e `:350` `entradas.y < saidas.y`, `:351-364` `toHaveText([...])` | ✅ |
| 2 | Despesa em saídas; o resto em entradas | `src/domain/recorrencia/fixos-do-mes.test.ts:102-103` `ids(saidas)=["a"]`, `ids(entradas)=["b","c"]` (receita e investimento) | ✅ |
| 3 | Dia crescente; empate pela descrição pt-BR | `fixos-do-mes.test.ts:118` D antes de A; `:134-138` "Item B, Ú, V"; `:147-148` id no empate; e2e `:366-371` `["Fixo D","Fixo A","Fixo B","Fixo C"]` | ✅ |
| 4 | Título da seção com "N · R$ X" | `tabela-de-fixos.test.tsx:183-185` dentro da região; e2e `:373-374` `getByText("4 · R$ 185,00", {exact})` na seção | ✅ |
| 5 | Pill na cor da categoria; "Sem categoria"/"Categoria removida" na neutra | `tabela-de-fixos.test.tsx:269-296` classes `bg-cat-*` e `bg-surface-strong` na linha; composição: `e2e/categorias.spec.ts:423-425` "Categoria removida" com fundo `--surface-strong` em Todo mês | ✅ |
| 6 | "Receita" em toda entrada | `tabela-de-fixos.test.tsx:243-246` `textContent` "Receita" nas duas entradas; `:311-316` sem cor (o componente decide, `tabela-de-fixos.tsx:79-81`) | ✅ |
| 7 | Nenhum botão na linha além do que abre | `tabela-de-fixos.test.tsx:252-256` `toHaveLength(1)` em cada linha | ✅ |
| 8 | Selo "Encerrado" ao lado da descrição | `tabela-de-fixos.test.tsx:235-237` dentro do botão; e2e `:387` | ✅ |
| 9 | Começa depois do mês aberto: "—" e "Começa em <Mês de Ano>" | `tabela-de-fixos.test.tsx:227-229`; e2e `:390-393` (D, junho). **O lado colado do limiar não é provado:** nenhum teste afirma que o fixo que começa no próprio mês aberto (B e Entrada A começam em março) fica sem o selo. Mutante M3 (`page.tsx:135`, `> 0` → `>= 0`) sobreviveu a 46 testes | ❌ GAP (L-029) |
| 10 | A partir de 1.280 px, ponteiro fino: toda linha ≤ 48 px, inclusive encerrada, começa depois e confirmada | e2e `:600-607` (1.280) e `:880-888` (1.536 e 1.920) via `linhasDeAte48` `:225-251`: `toBeLessThanOrEqual(48)` em cada linha curta, `matchMedia("(pointer: fine)")` verdadeiro | ✅ |
| 11 | Abaixo de 768 px: duas linhas de texto, descrição e valor em cima, sem cabeçalho | e2e `:676-687` (400 px) e `:737-759` (767 px, e 768 px com os cabeçalhos de volta), helpers `:691-730` | ✅ |
| 12 | Mês sem fixo: o aviso, sem seções | `tabela-de-fixos.test.tsx:324-330` texto exato e `queryAllByRole("region")` vazio; composição: `e2e/recorrencias.spec.ts:269` | ✅ |
| 13 | Seção vazia: a linha de texto dela | `tabela-de-fixos.test.tsx:337` e `:346` | ✅ |

### P1: O valor do mês aberto — FIXCOL-02

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| 1 | Valor da ocorrência, inclusive o confirmado | `fixos-do-mes.test.ts:160` (5000 da ocorrência, vigência 99900), `:172` (10500); `src/application/recorrencias/obter-todo-mes/handler.test.ts:130`; e2e `:383` `/^confirmado\s*R\$ 105,00$/` | ✅ |
| 2 | "confirmado", em texto, junto do valor | `tabela-de-fixos.test.tsx:219-221` na célula do valor, ausente em B; e2e `:384-385` | ✅ |
| 3 | Materializa antes de ler, mesma janela | `handler.test.ts:77-79` controle zerado, `:83-86` 5000 e 100000; `:98` `rangeCompetencias(MARCO, +MESES_DE_PROJECAO)`; e2e `:325` sem ocorrência de B no banco e `:329` "R$ 50,00" | ✅ |
| 4 | Encerrado antes do mês com ocorrência: aparece, com selo e valor | `fixos-do-mes.test.ts:224-226`; e2e `:387-388` C "Encerrado" e "R$ 30,00" | ✅ |
| 5 | Começa depois aparece sem ocorrência; encerrado sem ocorrência some | `fixos-do-mes.test.ts:232-233` e `:239-240`; e2e `:390`; `e2e/recorrencias.spec.ts:270` `row` com "Internet" `toHaveCount(0)` em maio | ✅ |

### P1: Os totais do mês no alto — FIXCOL-03

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| 1 | "Saídas fixas em <Mês de Ano>" e "Entradas fixas em <Mês de Ano>" com o total | `src/components/todo-mes.test.tsx:196-197` no par `dt`/`dd`; e2e `:331-332` | ✅ |
| 2 | Saídas = bloco "Fixos" de Lançamentos | `fixos-do-mes.test.ts:368` `toBe(resumoMensal(...).competenciaView.fixos)`; e2e `:331` R$ 185,00 e `:336-340` "3 · R$ 185,00 · 2 a pagar" no bloco "Fixos" (L-014) | ✅ |
| 3 | Entradas = ocorrências dos não despesa | `fixos-do-mes.test.ts:372` 102500 (receita e investimento); e2e `:332` | ✅ |
| 4 | Só `movimento`; começa depois soma zero | `fixos-do-mes.test.ts:385` zero com vigência 999900; e2e `:331` R$ 185,00 sem os R$ 70,00 de D | ✅ |
| 5 | Título da seção = total do alto = soma das linhas | `fixos-do-mes.test.ts:376-377`; e2e `:373-374` contra `:331-332` | ✅ |

### P1: O fixo aberto no painel — FIXCOL-04

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| 1 | Clique em qualquer ponto da linha ou no botão abre; título = descrição; "Saída fixa · vence dia N" / "Entrada fixa · cai dia N" | `tabela-de-fixos.test.tsx:355-358` clique na célula do valor, uma vez; `:364-368` `Enter`; `:374-377` espaço; `src/components/painel-do-fixo.test.tsx:239-240` e `:247-248`; e2e `:401-404` | ✅ |
| 2 | Valor com "em <Mês de Ano>"; "confirmado · previa R$ X"; "—" com "Começa em" | `src/components/detalhe-do-fixo.test.tsx:86`, `:95`, `:109-110`; e2e `:405` | ✅ |
| 3 | Categoria, meio (rótulo por natureza), "De quem é", "Começou/Começa em", "Termina em" com "Sem fim" | `detalhe-do-fixo.test.tsx:118-173` (cada `dd` pelo `dt`). **Composição não provada:** o nome em "De quem é" é campo novo do item, montado em `page.tsx:130`, e nenhum e2e lê o painel além do título, do subtítulo, do valor e do histórico. Mutante M16 (`pessoa: recorrencia.usuarioId`) sobreviveu a 38 testes | ❌ GAP (L-014) |
| 4 | Vigências da mais antiga para a mais nova, "desde", valor, "vale em <mês>" na do mês | `detalhe-do-fixo.test.tsx:183-189` e `:198-202`; e2e `:409-414` e `:434-437` | ✅ |
| 5 | "Mudar valor", "Editar" e, no pé, "Encerrar" em vermelho | `detalhe-do-fixo.test.tsx:211-217` ordem, `text-negativo`, bloco `border-t` próprio | ✅ |
| 6 | Encerrado: o aviso e só "Editar" | `detalhe-do-fixo.test.tsx:237-242` texto exato e `["Editar"]` | ✅ |
| 7 | Linha aberta com fundo diferente; `aria-expanded` true nela e false nas outras | `tabela-de-fixos.test.tsx:383-387` e `:393-396`; e2e `:591-597` fundo computado e filete `2px ... inset` na cor primária | ✅ |
| 8 | "Fechar" fecha e desmarca | `painel-do-fixo.test.tsx:255-257`; `todo-mes.test.tsx:303-305` `aria-expanded="false"` | ✅ |
| 9 | Outro fixo com o painel ocupado: detalhe do novo, sem o digitado | `painel-do-fixo.test.tsx:265-273` | ✅ |

### P1: Mudar valor, editar e encerrar no painel — FIXCOL-05

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| 1 | "Novo valor (R$)", "Vale a partir de" com o mês aberto, "Registrar", "Cancelar", regras de hoje | `src/components/ciclo-do-fixo.test.tsx:105-107`, `:120-124` centavos e competência, `:146-148` texto inválido barrado; `painel-do-fixo.test.tsx:283-286`; e2e `:426` | ✅ |
| 2 | Registrado: volta ao detalhe com a vigência nova | `painel-do-fixo.test.tsx:310-315`; e2e `:434-438` abril no histórico e março em R$ 50,00 | ✅ |
| 3 | Encerrar: aviso, "Encerrar a partir de" com o mês, "Encerrar mesmo assim", "Cancelar" | `ciclo-do-fixo.test.tsx:185-186`, `:193`, `:205`, `:221`; `painel-do-fixo.test.tsx:295-299`; e2e `:455` | ✅ |
| 4 | "Editar" no painel, sem diálogo, sob "Editar gasto fixo"/"Editar entrada", preenchido | `painel-do-fixo.test.tsx:357-360` região e nenhum `dialog`; `:374-385` payload; `:395-397` previsão "100,00" e não o confirmado; `e2e/editar-fixo.spec.ts:85-92` | ✅ |
| 5 | Salvo: formulário fica, "Alterações salvas." ou "Nada mudou: já estava tudo assim." | `painel-do-fixo.test.tsx:411-412`; `e2e/editar-fixo.spec.ts:97`, `:143`, `:183`. ⚠️ A mensagem fica fora da janela depois de salvar (sonda abaixo); o AC não diz "à vista" | ⚠️ Spec-precision gap |
| 6 | "Voltar"/"Cancelar": detalhe com o gravado | `painel-do-fixo.test.tsx:324`, `:333`, `:427-429` | ✅ |
| 7 | Recusa da action no painel, em alerta | `ciclo-do-fixo.test.tsx:161-166` e `:233-237` (controle continua aberto) | ✅ |
| 8 | Fixo sai da lista: "<descrição> não aparece mais em <Mês de Ano>." com "Fechar" | `painel-do-fixo.test.tsx:453-458` e `:469`; e2e `:458-460` | ✅ |

### P1: Novo fixo no painel — FIXCOL-06

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| 1 | "+ Novo fixo" no topo, acima dos totais e da lista, em todas as larguras | `todo-mes.test.tsx:187-190` ordem do DOM; `e2e/recorrencias.spec.ts:125` em 1.280 px. A partir de 1.536 px a grade decide o lugar por `2xl:row-start-*`, e nenhum teste mede ali: o mutante M17 (cabeçalho depois das seções a partir de 1.536 px) sobreviveu a 12 testes | ❌ GAP (L-030) |
| 2 | Cadastro no painel, sem diálogo, sob "Novo gasto fixo ou entrada"; fecha o fixo aberto | `painel-do-fixo.test.tsx:213-215`; `todo-mes.test.tsx:287-289`; e2e `:469-470` | ✅ |
| 3 | Cadastrado: formulário fica, confirmação, campos limpos, fixo novo na lista | `painel-do-fixo.test.tsx:226-231`; e2e `:477-480`. ⚠️ Em 1.280 × 720 a confirmação fica fora da janela (sonda) | ⚠️ Spec-precision gap |

### P1: A coluna da direita a partir de 1.536 px — FIXCOL-07

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| 1 | ≥ 1.536: coluna de 384 px à direita, linha fina | e2e `:810-813` em 1.536; `:858` `abs(largura − 384) ≤ 1` e `:863` `borderLeft 1px solid` em 1.536 e 1.920 | ✅ |
| 2 | Título do painel à vista ao rolar | e2e `:890-902` em 1.536 × 480 e 1.920 × 480; `:927` | ✅ |
| 3 | Nada aberto ≥ 1.536: "Nenhum fixo aberto" e a dica | `painel-do-fixo.test.tsx:199-205`; e2e `:817-818` em 1.536 | ✅ |
| 4 | ≥ 1.536: título, totais e seções ≤ 1.100 px, centrados | e2e `:873` e `:876` folgas iguais ± 1 px, em 1.536 e 1.920 | ✅ |
| 5 | < 1.536: uma coluna ≤ 1.024 px, painel entre totais e seções enquanto aberto | `todo-mes.test.tsx:217-220` e `:230-233`; e2e `:566-567` (1.280), `:645-651` (1.024, 1.280, 1.440, com o conteúdo que aperta), `:808` e `:843` (1.535) | ✅ |
| 6 | Nada aberto < 1.536: sem painel | e2e `:554` (1.280), `:802-803` e `:824-825` (1.535), `painel` `toHaveCount(0)` e a dica `toBeHidden()`; `todo-mes.test.tsx:205` (classe `hidden 2xl:block`) | ✅ |
| 7 | Formulário < 448 px: um campo por linha | e2e `:1004-1005` na coluna, cadastro e edição, 1.536 e 1.920; `:1040-1042` em 447 px | ✅ |
| 8 | Formulário ≥ 448 px: os pares lado a lado | e2e `:1021-1022` em 1.280; `:1045-1047` em 448 px | ✅ |
| 9 | 400 px com um fixo aberto: sem rolagem lateral | e2e `:683` `transbordoHorizontal = 0` | ✅ |

### P1: Teclado e foco — FIXCOL-08

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| 1 | Botão da linha no `Tab`; abre com `Enter` ou espaço | `tabela-de-fixos.test.tsx:364-377`; e2e `:520-530` e `:540-544` | ✅ |
| 2 | Abrir leva o foco ao título do painel | `todo-mes.test.tsx:245` e `:292`; `painel-do-fixo.test.tsx:501`, `:514`; e2e `:530`, `:544` | ✅ |
| 3 | `Escape` dentro do painel fecha | `painel-do-fixo.test.tsx:482`, `:492`; e2e `:533-534`; `e2e/editar-fixo.spec.ts:144-145` depois de salvar | ✅ |
| 4 | Fechar devolve o foco à linha ou ao "+ Novo fixo" | `todo-mes.test.tsx:304`, `:317`, `:328`; e2e `:535` | ✅ |
| 5 | < 1.536: abrir traz o título para a janela | e2e `:618` (fora antes) e `:623` `toBeInViewport()` | ✅ |
| 6 | < 768 px: alvos ≥ 44 × 44 | e2e `:668-669` em 400 e 767 px; `:766-779` com ponteiro grosso em 1.280 (L-044) | ✅ |

### P2: O fixo aberto no endereço — FIXCOL-09

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| 1 | `?fixo=<id>` sem recarregar e sem entrada nova | `todo-mes.test.tsx:256-261` `replaceState` sim, `pushState` não, `history.length` igual; e2e `:496-500` marcador em `window` | ✅ |
| 2 | Carregar com `?fixo=` abre o fixo | `todo-mes.test.tsx:267-268` sem roubar o foco; e2e `:502-504` | ✅ |
| 3 | `?fixo=` fora da lista: ignorado, sem erro | `todo-mes.test.tsx:274-276`; e2e `:507-511` | ✅ |
| 4 | Fechar ou abrir o cadastro tira `?fixo=` | `todo-mes.test.tsx:290`, `:306`, `:339`; e2e `:537` | ✅ |

**Status**: ❌ Gaps presentes (FIXCOL-01, AC 9; FIXCOL-04, AC 3; FIXCOL-06, AC 1) e ⚠️ spec-precision gaps (FIXCOL-05, AC 5; FIXCOL-06, AC 3)

---

## Edge Cases

- [x] Descrição longa quebra e só a linha dela cresce: e2e `:246-250` (`toBeGreaterThan(48)` só nas duas longas), em 1.280, 1.536 e 1.920 px.
- [x] Fixo que começa depois: "—", selo, zero no total, ações no painel: `tabela-de-fixos.test.tsx:227-228`, `fixos-do-mes.test.ts:385`; as ações saem de `detalhe-do-fixo.tsx:99-125`, que só as esconde no encerrado. O lado "começa no próprio mês" não é provado (gap 1).
- [x] Valor confirmado: linha e total com o confirmado, edição com a previsão: e2e `:383`, `fixos-do-mes.test.ts:361`, `painel-do-fixo.test.tsx:395-397`.
- [x] Encerrado com ocorrência paga depois do fim: `fixos-do-mes.test.ts:224-226`, e2e `:387-388`.
- [~] Encerrar a partir de mês posterior ao aberto: `painel-do-fixo.test.tsx:342` volta ao detalhe; o aviso de encerrado nesse retorno não tem assertion (o aviso em si está em `detalhe-do-fixo.test.tsx:237-241`). Não bloqueia.
- [x] Renomear muda a posição da linha, o painel continua com a confirmação: `e2e/editar-fixo.spec.ts:137-143`.
- [x] Edição mais alta que a janela a partir de 1.536 px rola dentro da coluna presa: e2e `:922-931`.
- [ ] Trocar de mês pelo seletor sem `?fixo=`: sem teste; a spec registra como aceito (`design.md`, Risks). Não bloqueia.
- [x] Erro numa action: a mensagem no painel, no mesmo modo: `ciclo-do-fixo.test.tsx:161-166`.

---

## Desvios declarados pelo autor, conferidos

| Desvio (`tasks.md`) | O que conferi | Veredito |
| --- | --- | --- |
| **25 testes removidos** com `lista-de-fixos.test.tsx` (T8) | Os 25 testes do arquivo em `e39eeae` (linhas 119 a 451, com o `it.each` de 392 contando 2), um a um, contra a tabela do `design.md:359-374`. Equivalentes: 119 → `tabela-de-fixos.test.tsx:321`; 125 → `:207`; 132 → `:224`; 138 → `:232` e `detalhe-do-fixo.test.tsx:234` (agora `["Editar"]` exato, mais forte); 146 → `tabela:240`; 176, 189, 195, 205 → `tabela:269`, `:281`, `:287` (it.each com as duas neutras), `:298` e `:311`; 225, 235, 254, 266 → `ciclo-do-fixo.test.tsx:102`, `:110`, `:139`, `:169`, com as mesmas assertions; 279, 288, 302, 310 → `ciclo:182`, `:196`, `:218`, `:224`, idem; 326 → `painel-do-fixo.test.tsx:260` (regra nova: um painel só); 373, 386 → `detalhe:207`, `:234`; 392 (×2) → `painel:347` (região, sem `dialog`); 410 → `painel:364`, mesmo payload, com o fixo fora dos padrões; 435 → `painel:400`; 451 → `painel:415` e `:432` | ✅ Nenhum perdido. Contagem: 131 testes novos nos sete arquivos (`vitest list`), menos 25 = +106 |
| **Seis assertions de `todo-mes.test.tsx` trocadas** na T9 (`oPainel()` nulo → `nadaAberto()`) | `git diff f19f634 60f20f6 -- src/components/todo-mes.test.tsx`. A regra mudou de estrutura por decisão do design (`design.md:176-177`: o invólucro existe sempre, com `hidden 2xl:block`), e não de comportamento. A nova assertion ainda discrimina: o mutante M4 (tira `hidden`) é morto por 6 testes da unidade. E a garantia que a antiga dava, "nada aparece abaixo de 1.536 px", passou para o navegador, que vê CSS: e2e `:554`, `:802-803` e `:824-825` (`painel` com `toHaveCount(0)`, que exclui o escondido, e a dica `toBeHidden()`), colados no limiar. Ver M4 no navegador, no sensor. Os dois testes do painel aberto ganharam uma assertion (`colunaAVista`) | ✅ Não é enfraquecimento: a prova mudou de camada para a que enxerga a regra, e as duas camadas matam o mutante |
| **Guarda de foco** no `onBlur` (`painel-do-fixo.tsx:115-125`) | Discrimina o caso que motivou (`painel-do-fixo.test.tsx:577-590`, e o `Escape` depois de salvar em `e2e/editar-fixo.spec.ts:144-145`). Mas a condição `disabled` não é discriminada: M5 (dispara em qualquer botão) sobrevive na unidade, porque o teste de `:592` desfoca um `input`, e não um botão. E a guarda tem efeito colateral visível: o foco no título rola a página, e a confirmação de salvar fica fora da janela (sonda) | ⚠️ Ver Fix 1 e Fix 5 |
| **Limiar do formulário em 777 e 778 px** (T10), em vez das janelas do plano | O teste mede a largura do formulário antes dos pares: `:1039-1041` exige 447 ≤ largura < 448 e `:1045-1046` exige 448 ≤ largura < 449. O limiar provado é o do AC (448 px de formulário), e não a janela | ✅ |
| **Quarta linha `1fr` na grade** a partir de 1.536 px (`todo-mes.tsx:120`) | Coerente com o design (a coluna ocupa todas as linhas e a lista não ganha espaço vazio). A linha `1fr` em si está certa. Mas o M17 mostrou que nenhuma medida prende a ordem das linhas a partir de 1.536 px | ✅ desvio; ver Fix 4 |
| **e2e antigos alterados** | `recorrencias.spec.ts`: as ausências passaram de `listitem` para `row`, com âncora de tela carregada (`:269-270`), e o "R$ 180,00/240,00" saiu do `getByText` da tela inteira para a célula da linha (`:200`, `:203`), mais forte. `editar-fixo.spec.ts`: o diálogo virou a região do painel, e o teste do renome ganhou a ordem das linhas e a confirmação (`:137-143`). `categorias.spec.ts:227-232`: a pill presa à linha pelo botão, mais estrita que o `hasText`. `importacao.spec.ts:203-209` e `trocar-categoria.spec.ts:68-71`: `row` e painel no lugar de `listitem` e diálogo, com as mesmas assertions. `visao-tres-colunas.spec.ts:213-224`: Todo mês sai do laço do TRES-01, AC 8, substituído pelo FIXCOL-07, AC 4. Nenhum arquivo perdeu teste (8, 3, 6, 2, 6 e 24, antes e depois) | ✅ Nada enfraquecido |

---

## Discrimination Sensor

Worktree descartável em `d964e84`, com `pnpm install --offline`. O e2e rodou na porta 3101, com uma
cópia da configuração apontando para o scratch. Antes de cada mutante, o script conferiu que o trecho
original aparecia uma vez só, e depois o desfez com `git checkout -- <arquivo>`. O `git status --porcelain`
da worktree real é o mesmo do começo (vazio). O scratch foi removido com `git worktree remove`.

| # | File:line | Descrição | Killed? |
| --- | --- | --- | --- |
| M1 | `src/domain/recorrencia/fixos-do-mes.ts:102` | Tira `\|\| ocorrenciaPorFixo.has(...)`: o encerrado com ocorrência paga some (FIXCOL-02, AC 4) | ✅ Morto por `fixos-do-mes.test.ts:217`, `:375` e `:388` |
| M2 | `src/application/recorrencias/obter-todo-mes/handler.ts:30-34` | Lê antes de materializar (FIXCOL-02, AC 3) | ✅ Morto por `handler.test.ts:65` e `:101` |
| M8 | `src/domain/recorrencia/fixos-do-mes.ts:116` | Tira o filtro de origem: o total de saídas soma avulso e parcela (FIXCOL-03, AC 2) | ✅ Morto por `fixos-do-mes.test.ts:283`, `:360`, `:364` e `:375` |
| M13 | `src/domain/recorrencia/fixos-do-mes.ts:61` | `confirmado` em toda ocorrência com previsto (FIXCOL-02, AC 2) | ✅ Morto por `fixos-do-mes.test.ts:153` |
| M4 | `src/components/todo-mes.tsx:155` | `hidden 2xl:block` → `2xl:block`: a coluna com a dica aparece abaixo de 1.536 px (FIXCOL-07, AC 6) | ✅ Morto na unidade por 6 testes (`todo-mes.test.tsx:202`, `:271`, `:297`, `:310`, `:321`, `:342`) e no navegador (e2e `:507`) |
| M10 | `src/components/todo-mes.tsx:111` | Fechar devolve o foco sempre ao "+ Novo fixo" (FIXCOL-08, AC 4) | ✅ Morto por `todo-mes.test.tsx:297` e `:310` |
| M6 | `src/app/(app)/[competencia]/fixos/page.tsx:148` | "vale em <mês>" na vigência mais nova (FIXCOL-04, AC 4) | ✅ Morto por e2e `:409` |
| M14 | `src/components/painel-do-fixo.tsx:129` | Tira `2xl:sticky 2xl:top-0` (FIXCOL-07, AC 2) | ✅ Morto por e2e `:901` (1.536 × 480) |
| M3 | `src/app/(app)/[competencia]/fixos/page.tsx:135` | `> 0` → `>= 0`: o fixo que começa **no** mês aberto ganha "Começa em" e "Começa em" no painel (FIXCOL-01, AC 9) | ❌ Sobreviveu: 46/46 (`todo-mes-colunas`, `recorrencias`, `editar-fixo`). B e Entrada A começam em março, e nada afirma que ficam sem o selo |
| M16 | `src/app/(app)/[competencia]/fixos/page.tsx:130` | `pessoa: recorrencia.usuarioId`: "De quem é" mostra o id (FIXCOL-04, AC 3) | ❌ Sobreviveu: 38/38 (`todo-mes-colunas`, `editar-fixo`) |
| M17 | `src/components/todo-mes.tsx:121` | `2xl:row-start-1` → `2xl:row-start-4`: a partir de 1.536 px, o cabeçalho com "+ Novo fixo" desce para depois das seções (FIXCOL-06, AC 1) | ❌ Sobreviveu: 12/12 testes de 1.536 e 1.920 px. Uma sonda confirmou que o mutante tem efeito: em 1.920 px, "+ Novo fixo" em y = 456, abaixo do fim de "Saídas fixas" (376) |
| M5 | `src/components/painel-do-fixo.tsx:119-121` | Tira `&& evento.target.disabled`: a guarda devolve o foco ao título quando **qualquer** botão do painel perde o foco para fora | ❌ Sobreviveu: 734/734 na unidade (`src/components`) e 38/38 no e2e |

Nota de carga: na rodada de M4, `detalhe-do-fixo.test.tsx:178` caiu por tempo (8,4 s). É de um
arquivo que não importa `todo-mes.tsx` e passa no gate. Não conta como morte.

**Sensor depth**: ampliado, com 12 mutantes. O código mexe no total de dinheiro que o dono confere
contra Lançamentos.
**Result**: 8/12 mortos, 4 sobreviventes — FAIL ❌

---

## Sonda no navegador: a confirmação depois de salvar

Uma sonda descartável, só no worktree do sensor e sem nenhuma mutação, abriu Todo mês, salvou a
edição e o cadastro pelo painel e mediu a mensagem `role="status"` e o foco. Ela rodou 4/4.

| Janela | Ação | Foco depois | `scrollY` | Caixa do status | Na janela? |
| --- | --- | --- | --- | --- | --- |
| 1.280 × 720 | Editar, "Salvar alterações" | `H2` "Fixo A" | 0 | 1.028 a 1.076 px | Não |
| 1.280 × 720 | Cadastro, "Cadastrar gasto fixo" | `H2` "Novo gasto fixo ou entrada" | 0 | 945 a 993 px | Não |
| 1.920 × 1.080 | Editar, "Salvar alterações" | `H2` "Fixo A" | 47 | 1.133 a 1.182 px (coluna com `scrollTop` 0) | Não |
| 1.920 × 1.080 | Cadastro | `H2` | 64 | 1.019 a 1.067 px | Sim |

**O que isso quer dizer.** A guarda de `onBlur` (`painel-do-fixo.tsx:115-125`) leva o foco ao título
quando o botão de envio se desabilita ("Gravando…"). O `focus()` rola a página, ou a coluna, até o
título. A pessoa clica em "Salvar alterações" no pé do formulário e a tela pula para o alto do
painel. A confirmação "Alterações salvas." fica fora da janela.

Antes da fatia, no diálogo, o foco caía no `body` e nada rolava. Os ACs (FIXCOL-05, AC 5, e
FIXCOL-06, AC 3) dizem "com 'Alterações salvas.'", mas não dizem "à vista". Por isso entra como
spec-precision gap, e não como AC falho. Os e2e usam `toBeVisible()`, que não olha a janela, e não
pegam o pulo.

---
## Gate Check

- **Gate command**: `build` de `tasks.md:97`: `pnpm verify` (rodado passo a passo, cada código de saída conferido sozinho: `typecheck`, `lint`, `test:unit`, `test:integration`, `build`) e depois o e2e inteiro, na porta 3101, com o banco de teste separado.
- **Resultado**:
  - `pnpm typecheck`: 0. `pnpm lint`: 0 (330 arquivos).
  - `pnpm test:unit`: 0. **1.823 passaram em 115 arquivos**, 0 falhas, 0 skip. Cobertura de `src/domain`: 100% de branches (367/367), 100% de linhas.
  - `pnpm test:integration`: 0. **364 passaram em 23 arquivos.**
  - `pnpm build`: 0.
  - e2e inteiro: **169 testes em 15 arquivos.** A primeira passada saiu 1, com 132 passando, 3 falhando e 34 sem rodar. As 3 falhas são de carga da máquina, em arquivos que esta fatia não toca: o Chrome não abriu em 180 s (`lancamentos-densos`), "browser has been closed" (`lista-enxuta`) e um `expect` de 5 s na primeira visita a Lançamentos (`lancamento-avulso`). Os 34 sem rodar são os testes seriais desses mesmos arquivos. Cada um, rodado sozinho uma vez, passou inteiro: `lancamento-avulso` 14/14, `lancamentos-densos` 23/23 e `lista-enxuta` 9/9. Os 123 testes dos outros 12 arquivos passaram na primeira passada, e os 46 dos três arquivos na repetição: **169/169**.
- **Contagem antes da fatia** (`e39eeae`): 1.717 unitários em 109 arquivos (derivado: 1.823 − 131 novos nos sete arquivos de teste, por `vitest list`, + 25 de `lista-de-fixos.test.tsx`); 364 de integração; 134 e2e em 14 arquivos (`playwright test --list`: 169 − 35 de `todo-mes-colunas.spec.ts`).
- **Delta**: +106 unitários (+131 novos, −25 removidos com o componente, todos portados), 0 de integração, +35 e2e. Nenhum e2e antigo perdeu teste.
- **Skipped**: nenhum.
- **Efeito colateral do gate**: o `next dev` do e2e reescreveu `next-env.d.ts` (de `.next/types` para `.next/dev/types`) na worktree real. Foi restaurado com `git checkout -- next-env.d.ts` antes deste relatório, e o `git status --porcelain` voltou ao de antes (vazio, mais este `validation.md` e os arquivos de lições).

---

## Code Quality

| Principle | Status |
| --- | --- |
| Minimum code | ✅ Cinco componentes, uma função pura e um caso de uso, cada um com um papel do design |
| Surgical changes | ✅ `form-recorrencia.tsx` só troca `sm:` por `@md:` e o comentário; `FormRecorrencia` só é usado pelo painel (`painel-do-fixo.tsx:168`, `:280`) |
| No scope creep | ✅ Nenhuma action nova, nenhuma migration |
| Matches patterns | ✅ Célula densa e grade iguais às de Lançamentos; `Chip` reaproveitado |
| AD-006 (domínio puro) | ✅ `fixos-do-mes.ts` só importa do domínio; não lança, não é `async`; `arquitetura.test.ts` passa |
| AD-003 (só `movimento` soma) | ✅ Os dois totais saem de lançamentos (`fixos-do-mes.ts:114-117`); vigência só no histórico |
| AD-001 (centavos) | ✅ `Cents` no domínio, `valorNoMesCentavos` no item; formatação só por `formatarBRL` |
| AD-009 (dado real) | ✅ Nomes genéricos ("Fixo A", "Pessoa B", "Cartão Roxo") e valores redondos em todos os testes |
| Spec-anchored outcome check | ❌ FIXCOL-01, AC 9, no lado colado do limiar (gap 1) |
| Per-layer Coverage Expectation | ❌ Composição do painel (FIXCOL-04, AC 3) sem e2e (gap 2) |
| Every test maps to a spec requirement | ✅ Os testes além do plano mapeiam para FIXCOL-08 (foco), edge cases e lições (L-044, L-045, L-049) |
| Documented guidelines followed | `AGENTS.md`: ✅ nenhum skip, nenhuma assertion enfraquecida (ver os seis de `todo-mes.test.tsx`), 100% de branches no domínio |

---

## Fix Plans

Em ordem de prioridade. Os quatro primeiros são testes que faltam, e o código de hoje está certo
neles. O quinto é comportamento que a pessoa vê, e pede uma palavra do dono no AC.

### Fix 1: a confirmação de salvar fica fora da janela (FIXCOL-05, AC 5; FIXCOL-06, AC 3)
- **Root cause**: a guarda `painel-do-fixo.tsx:123` chama `titulo.current?.focus()` quando o botão
  de envio se desabilita. O `focus()` rola até o título, e a mensagem de `role="status"`, no pé do
  formulário (`form-recorrencia.tsx:697`), sai da janela. A sonda mostrou isso em 1.280 × 720 e, na
  edição, em 1.920 × 1.080.
- **Fix task**:
  - **Spec:** o dono confirma no AC 5 do FIXCOL-05 e no AC 3 do FIXCOL-06 que a confirmação fica à
    vista depois de salvar.
  - **Código:** na guarda, `focus({ preventScroll: true })`. O foco de abrir, em `:98-102`, é outra
    chamada, e por isso o FIXCOL-08, AC 5 não muda.
  - **e2e:** depois de "Salvar alterações" e de "Cadastrar gasto fixo", em 1.280 × 720 e em
    1.920 × 1.080, `expect(form.getByRole("status")).toBeInViewport()`, e o `Escape` continua
    fechando (`editar-fixo.spec.ts:144-145`).
- **Done when**: o novo e2e passa, e falha se a guarda voltar a rolar.
- **Priority**: Major (visível em toda edição na largura mais comum)

### Fix 2: o limiar de "começa depois" do lado do próprio mês (FIXCOL-01, AC 9; L-029)
- **Root cause**: o e2e só tem fixo que começa bem depois (D, junho) ou bem antes (A, janeiro). B e
  Entrada A começam em março, o mês aberto, e nenhum teste olha o selo deles.
- **Fix task**: no teste de `e2e/todo-mes-colunas.spec.ts:377`:
  - `botaoDaLinha(page, "Fixo B").getByText(/^Começa em/)` com `toHaveCount(0)`, e o mesmo para
    "Entrada A";
  - no painel de B, "em Março de 2026" junto do valor e o termo "Começou em".
- **Done when**: M3 (`page.tsx:135`, `> 0` → `>= 0`) é morto.
- **Priority**: Major (AC de P1 sem um dos lados)

### Fix 3: os dados do painel lidos na página real (FIXCOL-04, AC 3; L-014)
- **Root cause**: "De quem é" é campo novo, montado em `page.tsx:130`. O meio e o fim também saem da
  página. O teste do componente recebe o nome pronto, e nenhum e2e lê o `<dl>` do painel.
- **Fix task**: no teste de `e2e/todo-mes-colunas.spec.ts:396`, ler cada `dd` pelo `dt` no painel
  de A: "Categoria Um", "Meio de pagamento" com "Conta Corrente", "De quem é" com o nome da pessoa,
  "Começou em" com "Janeiro de 2026" e "Termina em" com "Sem fim". No painel de Entrada A, ler "Onde
  o dinheiro cai". Semear uma segunda pessoa e dar a ela o Fixo A, para o nome certo não coincidir
  com o da única pessoa (L-024).
- **Done when**: M16 é morto.
- **Priority**: Major

### Fix 4: "+ Novo fixo" acima da lista em toda largura (FIXCOL-06, AC 1; L-030)
- **Root cause**: a partir de 1.536 px a ordem da tela é a da grade (`2xl:row-start-*`), e não a do
  DOM. O único teste de posição roda em 1.280 px (`recorrencias.spec.ts:125`).
- **Fix task**: no laço de `e2e/todo-mes-colunas.spec.ts:848`, em 1.536 e 1.920 px, e no teste de
  400 px, medir:
  - a base do "+ Novo fixo" ≤ o topo dos totais;
  - o topo dos totais ≤ o topo de "Entradas fixas".
- **Done when**: M17 é morto.
- **Priority**: Minor

### Fix 5: a guarda de foco presa à condição de botão desabilitado
- **Root cause**: `painel-do-fixo.test.tsx:592` desfoca um `input`. Nenhum teste desfoca um botão
  habilitado, e a condição `disabled` (`painel-do-fixo.tsx:121`) pode sumir sem a suíte notar.
- **Fix task**: um teste em `painel-do-fixo.test.tsx`:
  1. dar foco ao "Mudar valor" do detalhe;
  2. disparar `fireEvent.blur(botao, { relatedTarget: null })`;
  3. esperar que o foco **não** vá ao título.
- **Done when**: M5 é morto.
- **Priority**: Minor

---

## Requirement Traceability Update

Proposta para o `spec.md`. O Verifier não edita a spec.

| Requirement | Previous Status | New Status |
| --- | --- | --- |
| FIXCOL-01 | In progress | ❌ Needs Fix (AC 9, lado colado: Fix 2) |
| FIXCOL-02 | In progress | ✅ Verified |
| FIXCOL-03 | In progress | ✅ Verified |
| FIXCOL-04 | In progress | ❌ Needs Fix (AC 3, composição: Fix 3) |
| FIXCOL-05 | In progress | ⚠️ AC 5 com spec-precision gap (Fix 1) |
| FIXCOL-06 | In progress | ❌ Needs Fix (AC 1 a partir de 1.536 px: Fix 4; AC 3 com spec-precision gap: Fix 1) |
| FIXCOL-07 | In progress | ✅ Verified |
| FIXCOL-08 | In progress | ✅ Verified (a guarda de foco tem o Fix 5, que não é AC) |
| FIXCOL-09 | In progress | ✅ Verified |

---

## Summary

**Overall**: ❌ Not Ready

**Spec-anchored check**: 57/62 ACs com o resultado da spec provado; 3 ACs com gap (FIXCOL-01, AC 9;
FIXCOL-04, AC 3; FIXCOL-06, AC 1) e 2 spec-precision gaps (FIXCOL-05, AC 5; FIXCOL-06, AC 3).
**Sensor**: 8/12 mutantes mortos.
**Gate**: `typecheck`, `lint`, 1.823 unitários, 364 de integração e `build` saem 0. O e2e passou
169/169, com três arquivos repetidos sozinhos depois de falhas de carga da máquina.

**What works**:
- **A regra e a soma:** `fixosDoMes` está pura e com 100% de branches. O total de saídas bate com o
  bloco "Fixos" de Lançamentos na unidade e no navegador. A materialização vem antes da leitura.
- **Layout:** o limiar de 1.536 px foi provado dos dois lados, e os de 768 e 448 px também. As
  linhas medem até 48 px, percorridas uma a uma. Os alvos têm 44 px com ponteiro grosso.
- **Endereço e foco:** `?fixo=` e o foco de abrir e fechar estão provados.
- **Testes trocados:** os 25 testes removidos têm equivalente, e as seis assertions trocadas não
  enfraquecem nada. Os e2e antigos ficaram iguais ou mais estritos.

**Issues found**:
1. A confirmação de salvar sai da janela por causa da guarda de foco (Fix 1).
2. O limiar de "começa depois" não tem o lado do próprio mês (Fix 2).
3. Os dados do painel não são lidos na página real (Fix 3).
4. "+ Novo fixo" não tem a posição provada a partir de 1.536 px (Fix 4).
5. A condição da guarda de foco não é discriminada (Fix 5).

**Next steps**:
- Fix 1 pede ao dono a frase do AC, "à vista", antes do código.
- Os Fixes 2 a 5 são só testes, e o código de hoje passa neles.
- Depois, rodada 2 do Verifier.
