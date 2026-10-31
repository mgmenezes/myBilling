# LESSONS - auto-maintained by scripts/lessons.py

> Machine-owned. Do NOT hand-edit. Changes are overwritten on the next `lessons.py` write.
> Canonical state lives in `.specs/lessons.json`. Edit lessons only via the script.
> promote_threshold=2 distinct features · window_days=45 · quarantine_threshold=2

## Confirmed (load these at Specify/Design)

Corroborated across multiple features. Safe to apply as guidance.

### L-001 - Regra de negócio aplicada num .filter() de página precisa de um percurso e2e que a exercite; sem ele o filtro pode ser apagado com a suíte inteira verde.
- signal: `surviving_mutant` · recurrence: 2 feature(s) · scope: `app-router,paginas` · harmful: 0
- features: lancamento-avulso, importar-planilha
- evidence: mutante M24 (ciclo 1) e N2 (ciclo 3) — src/app/(app)/[competencia]/fixos/page.tsx:66-72 (app-router,paginas) (+1 more)
- last seen: 2026-10-25T05:06:38Z

### L-010 - AC com duas cláusulas precisa de uma assertion para cada uma; provar só uma deixa a outra livre para regredir.
- signal: `surviving_mutant` · recurrence: 4 feature(s) · scope: `testes,acceptance-criteria` · harmful: 0
- features: importar-planilha, saldo-futuro, visao-tres-colunas, lancamentos-densos
- evidence: mutante M28 — src/domain/importacao/reconhecer-recorrencias.ts:71 (IMP-07 AC 12, cláusula 'por ordem de aparição') (testes,acceptance-criteria) (+3 more)
- last seen: 2026-10-31T04:36:51Z

### L-014 - Garantia provada em cada elo separado, quem produz e quem consome, precisa de um teste que atravesse a composição; sem ele, o elo do meio a desfaz com a suíte verde.
- signal: `surviving_mutant` · recurrence: 3 feature(s) · scope: `testes,composicao` · harmful: 1
- features: importar-planilha, trocar-categoria, visao-tres-colunas
- evidence: validation.md rodada 2: N9 (src/domain/importacao/planejar-importacao.ts:362) e N6 (src/components/importacao/dialogo-importacao.tsx:184) (testes,composicao) (+3 more)
- last seen: 2026-10-30T22:13:51Z

### L-018 - AC que situa um elemento ('na seção X', 'junto do botão Y') precisa de consulta restrita àquela região, com within ou vizinhança no DOM; consulta em screen inteiro não prova o lugar.
- signal: `surviving_mutant` · recurrence: 3 feature(s) · scope: `componentes,testes` · harmful: 1
- features: importar-planilha, trocar-categoria, visao-tres-colunas
- evidence: validation.md, Rodada F13–F15: P27 (passo-pendencias.tsx:207-248) e P29 (passo-pendencias.tsx:299-316) (componentes,testes) (+2 more)
- last seen: 2026-10-30T22:13:51Z

### L-029 - Limiar de um AC precisa de casos colados nele dos dois lados; provar o limiar e um valor distante deixa o off-by-one passar.
- signal: `surviving_mutant` · recurrence: 3 feature(s) · scope: `testes,limites` · harmful: 0
- features: lista-enxuta, visao-tres-colunas, lancamentos-densos
- evidence: U15b, E6; src/components/tabela-lancamentos.tsx:308 (testes,limites) (+2 more)
- last seen: 2026-10-31T01:41:01Z

### L-030 - AC universal ('nenhuma tabela', 'todo bloco') precisa de teste que percorra todos os elementos; medir só o caso que motivou a regra deixa os outros regredirem.
- signal: `surviving_mutant` · recurrence: 2 feature(s) · scope: `e2e,layout` · harmful: 0
- features: lista-enxuta, visao-tres-colunas
- evidence: E5; e2e/lista-enxuta.spec.ts:382-390 (e2e,layout) (+1 more)
- last seen: 2026-10-30T22:13:51Z

### L-031 - Objetivo de legibilidade precisa virar AC mensurável, em linhas ou largura; sem número, quebrar em duas linhas passa como resolvido.
- signal: `spec_precision_gap` · recurrence: 2 feature(s) · scope: `spec,layout` · harmful: 0
- features: lista-enxuta, lancamentos-densos
- evidence: LST-05 Goal e Problem Statement; validation.md lacuna 5 (spec,layout) (+1 more)
- last seen: 2026-10-31T04:36:51Z

## Candidates (under observation - do NOT load as guidance yet)

Seen once or not yet corroborated. Tracked, not trusted.

### L-005 - Achado de relatório de subagente vira decisão só depois de reler o código que o originou: a transcrição inverteu o mecanismo da divergência e o exemplo concreto passou a descrever algo que não acontece.
- signal: `spec_deviation` · recurrence: 1 feature(s) · scope: `specs,decisoes` · harmful: 0
- features: lacunas-do-painel
- evidence: AD-017 (.specs/STATE.md), corrigido em f6644a7 (specs,decisoes)
- last seen: 2026-09-20T13:06:26Z

### L-006 - AC que compara duas coisas ('mesma contagem que X') precisa definir o referente dos dois lados, ou não há número a comparar e a prova vira número inventado.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `specs,acceptance-criteria` · harmful: 0
- features: lacunas-do-painel
- evidence: REDE-03 AC 5 (.specs/features/lacunas-do-painel/spec.md) (specs,acceptance-criteria)
- last seen: 2026-09-20T13:06:26Z

### L-007 - Fixture que põe a competência corrente igual à aberta esconde toda classe de bug de mês passado: a reconciliação indicador ↔ lista passou verde enquanto o link do indicador apontava para um estado que aquele mês não tem.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `testes,fixtures` · harmful: 0
- features: lacunas-do-painel
- evidence: REDE-02 AC 1 vs painel-indicadores.test.tsx:103 (corrente = mês aberto) (testes,fixtures)
- last seen: 2026-09-20T13:06:27Z

### L-008 - Teste de regra de precedência ('a primeira vence') precisa de fixture em que a primeira e a última ocorrência difiram; se a última repete a primeira, a regra invertida passa verde.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `testes,fixtures` · harmful: 0
- features: importar-planilha
- evidence: mutante M13 — src/domain/importacao/planejar-importacao.ts:210; testes planejar-importacao.test.ts:394 e gravar-importacao/handler.test.ts:287 (IMP-03 AC 10) (testes,fixtures)
- last seen: 2026-10-25T05:06:38Z

### L-009 - Limite inclusivo de um AC precisa de um caso no próprio limite, do lado aceito; provar só o primeiro valor recusado deixa o off-by-one passar.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `testes,limites` · harmful: 0
- features: importar-planilha
- evidence: mutantes M29 (competencia-do-arquivo.ts:30, IMP-02 AC 1) e M30 (celula.ts:63, IMP-01 AC 11) (testes,limites)
- last seen: 2026-10-25T05:06:38Z

### L-011 - AC que manda parear 'por ordem' precisa dizer a ordem dos dois lados, inclusive a dos registros que já estão no banco, senão o pareamento não tem resultado verificável.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `specs,acceptance-criteria` · harmful: 0
- features: importar-planilha
- evidence: IMP-07 AC 12 — validation.md, Fix 3 (specs,acceptance-criteria)
- last seen: 2026-10-25T05:06:38Z

### L-012 - Script destrutivo precisa de AC que nomeie o que ele preserva e de teste que conte essas tabelas antes e depois; 'não toca por construção' não segura quem editar a lista.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `banco,scripts` · harmful: 0
- features: importar-planilha
- evidence: IMP-09 AC 2; mutantes M26 e M27 — src/infrastructure/db/sql/limpar-para-importar.sql:33 (banco,scripts)
- last seen: 2026-10-25T05:06:38Z

### L-013 - Ampliar uma port e implementar o método nas classes concretas vão na mesma task; separadas, o commit da port não compila.
- signal: `gate_fail` · recurrence: 1 feature(s) · scope: `tasks,ports` · harmful: 0
- features: importar-planilha
- evidence: commit 7fe7552 (T12): tsc --noEmit com 10 erros em 5 arquivos; 0 em 3fca286 (T13) (tasks,ports)
- last seen: 2026-10-25T05:06:38Z

### L-015 - Correção de estado transitório na tela precisa observar todo elemento ligado ao mesmo sinal pendente, e não só o que exibiu o defeito.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `componentes,testes` · harmful: 0
- features: importar-planilha
- evidence: validation.md rodada 2: N5 (src/components/importacao/dialogo-importacao.tsx:194) (componentes,testes)
- last seen: 2026-10-25T06:12:20Z

### L-016 - O gate de cada task precisa incluir `tsc --noEmit`, encadeado com `&&`: o Vitest transpila sem checar tipos, e o commit que não compila passa verde.
- signal: `gate_fail` · recurrence: 1 feature(s) · scope: `tasks,gates` · harmful: 0
- features: importar-planilha
- evidence: commit f8920a8 (F11): tsc --noEmit com TS2554 em dialogo-importacao.test.tsx:303, 0 em a033fef; antes, 7fe7552 (T12); validation.md, rodada 3 (tasks,gates)
- last seen: 2026-10-25T06:36:08Z

### L-017 - Controle novo que grava num campo de opções filtradas, como um 'aplicar a todas', precisa de teste da própria lista de opções com o mesmo filtro; o filtro do campo de destino não segura o valor posto por código.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `componentes,testes` · harmful: 0
- features: importar-planilha
- evidence: validation.md, Rodada F13–F15: P28 em src/components/importacao/passo-pendencias.tsx:227 (componentes,testes)
- last seen: 2026-10-28T20:24:12Z

### L-019 - Valor versionado por mês precisa de teste com duas vigências que abra o mês anterior à mais nova; com uma vigência só, a vigente no mês e a última coincidem e a troca passa verde.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `testes,fixtures,versionamento` · harmful: 0
- features: editar-fixos
- evidence: E2, src/app/(app)/[competencia]/fixos/page.tsx:115 (testes,fixtures,versionamento)
- last seen: 2026-10-28T19:52:49Z

### L-020 - AC que exige o mesmo erro de outro fluxo precisa comparar a mensagem com a dele; afirmar só que houve recusa deixa a mensagem divergir com a suíte verde.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `testes,acceptance-criteria` · harmful: 0
- features: editar-fixos
- evidence: S3, src/application/schemas/recorrencia.schema.ts:65 (testes,acceptance-criteria)
- last seen: 2026-10-28T19:52:49Z

### L-021 - AC que cita uma decisão (AD-NNN) precisa ser relido contra a regra dela; se a regra torna o resultado constante, o AC não tem o que provar.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `specs,acceptance-criteria` · harmful: 0
- features: editar-fixos
- evidence: EDF-02 AC 5, src/domain/mes/bloco-do-lancamento.ts:33 (specs,acceptance-criteria)
- last seen: 2026-10-28T19:52:49Z

### L-022 - Texto que a interface mostra e o teste afirma literalmente precisa estar na spec; senão a assertion fixa uma frase que ninguém aprovou.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `specs,textos` · harmful: 0
- features: editar-fixos
- evidence: EDF-06 AC 6, src/components/form-recorrencia.tsx:313 (specs,textos)
- last seen: 2026-10-28T19:52:50Z

### L-023 - Valor versionado por mês precisa de teste nos dois lados da vigência mais nova; abrir só o mês anterior a ela deixa passar quem lê a primeira vigência, e abrir só o mês dela deixa passar quem lê a última.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `e2e, app/page, recorrencia` · harmful: 0
- features: editar-fixos
- evidence: E2b, src/app/(app)/[competencia]/fixos/page.tsx:115 (validation.md, Rodada 2) (e2e, app/page, recorrencia)
- last seen: 2026-10-29T14:48:44Z

### L-024 - Fixture de e2e precisa de pelo menos duas opções em cada campo que a tela preenche com o gravado; com uma só, o valor errado coincide com o certo e o mutante passa.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `e2e, fixtures` · harmful: 0
- features: editar-fixos
- evidence: E3p, src/app/(app)/[competencia]/fixos/page.tsx:114; src/infrastructure/db/testing/banco-de-teste.ts:55 (validation.md, Rodada 2) (e2e, fixtures)
- last seen: 2026-10-29T14:48:44Z

### L-025 - Rode o 'salvar sem mexer não muda nada' antes da primeira gravação do teste; depois dela, um campo que a tela entrega errado e constante já foi gravado e passa a se comparar consigo mesmo.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `e2e, app/page, formularios` · harmful: 0
- features: editar-fixos
- evidence: P4, src/app/(app)/[competencia]/fixos/page.tsx:113; C1 :114; C2 :112 (validation.md, Rodada 3) (e2e, app/page, formularios)
- last seen: 2026-10-29T15:09:18Z

### L-026 - Fixture que prova 'a ordem recebida' precisa estar fora da ordem que uma regra óbvia (alfabética, por id) daria; confira a ordem dos próprios dados, não o comentário que os descreve.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `testes,fixtures` · harmful: 0
- features: trocar-categoria
- evidence: S10 — src/components/seletor-de-categoria.test.tsx:23-27 (validation.md, rodada 1) (testes,fixtures)
- last seen: 2026-10-29T16:16:13Z

### L-027 - Código novo na union de erros do domínio leva a mensagem em src/lib/erros.ts na mesma task; o Record exaustivo de mensagens não compila sem ela.
- signal: `spec_deviation` · recurrence: 1 feature(s) · scope: `tasks,erros` · harmful: 0
- features: trocar-categoria
- evidence: SPEC_DEVIATION em src/lib/erros.ts:74 (T1 em vez de T5) (tasks,erros)
- last seen: 2026-10-29T16:16:13Z

### L-028 - AC que fixa o texto que a pessoa lê precisa de prova no layout do navegador; textContent e nome acessível não veem o espaço que o flex apara entre itens.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `componentes,css` · harmful: 0
- features: lista-enxuta
- evidence: LST-01 AC 1; src/components/chips-de-categoria.tsx:83-85 (componentes,css)
- last seen: 2026-10-29T19:06:31Z

### L-032 - AC de filtro precisa nomear as naturezas que alcança quando a lista rotula alguma de outro jeito; senão quem decide é o teste.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `spec,filtros` · harmful: 0
- features: lista-enxuta
- evidence: LST-01 AC 9; .specs/features/lista-enxuta/spec.md:85-86 (spec,filtros)
- last seen: 2026-10-29T19:06:31Z

### L-033 - Chave ou valor de enum citado no Design precisa ser copiado do tipo que já existe no código; reescrito de memória, diverge e vira SPEC_DEVIATION.
- signal: `spec_deviation` · recurrence: 1 feature(s) · scope: `design,tipos` · harmful: 0
- features: lista-enxuta
- evidence: SPEC_DEVIATION src/lib/blocos-recolhidos.ts:19 (design,tipos)
- last seen: 2026-10-29T19:06:31Z

### L-034 - AC de filtro ligado a um total precisa dizer, natureza por natureza, se o que a lista mostra entra no total; senão a natureza que um aceita e o outro ignora passa sem ninguém decidir.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `spec,filtros` · harmful: 0
- features: lista-enxuta
- evidence: validation.md rodada 2, ⚠️ C; mutante INV vivo em src/application/mes/filtrar-lancamentos.ts:67 (spec,filtros)
- last seen: 2026-10-29T19:49:06Z

### L-035 - Prova de composição precisa atravessar também o ramo neutro que a página decide, e não só o caso com valor; provado só o colorido, a página tinge o neutro com a suíte verde.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `e2e,composicao` · harmful: 0
- features: cor-por-categoria
- evidence: E1/E2; src/app/(app)/[competencia]/page.tsx:186; src/app/(app)/[competencia]/fixos/page.tsx:105 (e2e,composicao)
- last seen: 2026-10-30T02:12:18Z

### L-036 - Fixture que prova uma ordenação precisa de itens cuja ordem esperada difira da do banco e da do código de caractere; senão tirar a ordenação passa verde.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `testes,fixtures` · harmful: 0
- features: cor-por-categoria
- evidence: E7/E8; src/app/(app)/[competencia]/cadastros/categorias/page.tsx:31-33; e2e/categorias.spec.ts:326 (testes,fixtures)
- last seen: 2026-10-30T02:12:18Z

### L-037 - Efeito visual que um AC manda manter precisa de assertion no estilo computado do navegador; proibir nomes de classe não pega o mesmo efeito desfeito por estilo em linha.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `componentes,css` · harmful: 0
- features: cor-por-categoria
- evidence: E13; src/components/seletor-de-categoria.test.tsx:299 (componentes,css)
- last seen: 2026-10-30T02:12:18Z

### L-038 - AC que vale para vários caminhos de criação precisa de assertion em cada porta de entrada; provar só o repositório comum deixa um caminho gravar o campo depois de criar.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `integracao,actions` · harmful: 0
- features: cor-por-categoria
- evidence: B4; src/app/actions/categorias.ts:89 (integracao,actions)
- last seen: 2026-10-30T02:12:18Z

### L-039 - AC que trata 'removido' de um jeito precisa dizer se arquivado conta como removido em cada tela; senão a mesma entidade sai neutra num componente e colorida no vizinho.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `spec,estados` · harmful: 0
- features: cor-por-categoria
- evidence: COR-02 AC 5; src/app/(app)/[competencia]/lancamentos/page.tsx:166 (spec,estados)
- last seen: 2026-10-30T02:12:18Z

### L-040 - Edge case de 'valor igual ao atual' precisa dizer a regra de igualdade (caixa, acento, espaço); senão quem decide é o código.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `spec,textos` · harmful: 0
- features: cor-por-categoria
- evidence: Edge Case nome igual; src/app/actions/categorias.ts:200 (spec,textos)
- last seen: 2026-10-30T02:12:18Z

### L-041 - Regra que o cliente e o servidor aplicam cada um precisa de caso de teste nos dois lados; provada só no servidor, o cliente barra a entrada com a suíte verde.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `componentes,validacao` · harmful: 0
- features: cor-por-categoria
- evidence: L3c: src/components/lista-de-categorias.tsx:176 (componentes,validacao)
- last seen: 2026-10-30T02:50:50Z

### L-042 - Teste de composição precisa de fixture com cada edge case cuja garantia mora num elo interno; só com o caminho feliz, o elo do meio filtra o caso e a suíte fica verde.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `testes,composicao` · harmful: 0
- features: saldo-futuro
- evidence: validation.md rodada 1: H1 (src/application/mes/obter-visao-mensal/handler.ts:91, SALDO-02 AC 2, edge case da despesa futura paga) (testes,composicao)
- last seen: 2026-10-30T13:55:49Z

### L-043 - Edge case de uma porta nova que reusa uma regra antiga precisa de teste que passe pela porta nova com o caso; a prova da regra antiga não vê a porta.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `e2e,composicao` · harmful: 0
- features: visao-tres-colunas
- evidence: Edge cases 'busca com espaços nas pontas' e 'gravação recusada na coluna de ação' — src/app/(app)/[competencia]/page.tsx:250-284 (validation.md rodada 1) (e2e,composicao)
- last seen: 2026-10-30T22:13:51Z

### L-044 - Alvo que só encolhe com ponteiro fino precisa de teste com ponteiro grosso acima do breakpoint (hasTouch); medir só no celular não separa a largura do ponteiro.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `e2e,layout,toque` · harmful: 0
- features: lancamentos-densos
- evidence: validation.md: M12 (src/components/menu-da-linha.tsx:84, botao-excluir.tsx:32); sonda P2 (e2e,layout,toque)
- last seen: 2026-10-31T01:41:01Z

### L-045 - Regra de layout que protege uma linha da pressão de outra precisa de fixture com o conteúdo que aperta, como uma descrição longa; com textos curtos, tirar a regra passa verde.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `e2e,fixtures,layout` · harmful: 0
- features: lancamentos-densos
- evidence: validation.md: M11 (src/components/tabela-lancamentos.tsx:351); sonda P1 (e2e,fixtures,layout)
- last seen: 2026-10-31T01:41:01Z

### L-046 - Fechar ao clicar fora precisa de teste com o painel aberto sem foco dentro; com o foco no gatilho, o focusout fecha sozinho e esconde a falta do ouvinte de clique.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `componentes,testes` · harmful: 0
- features: lancamentos-densos
- evidence: validation.md: M17 (src/components/menu-da-linha.tsx:68); sonda P5 (componentes,testes)
- last seen: 2026-10-31T01:41:02Z

### L-047 - Decisão de design que contraria um AC confirmado pelo dono volta ao próprio AC, com a confirmação dele, antes do commit; registrada só no design ou no STATE, o AC continua pedindo o contrário.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `spec,decisoes` · harmful: 0
- features: lancamentos-densos
- evidence: DENS-02 AC 1; src/components/tabela-lancamentos.tsx:363-369; AD-020 trade-off (spec,decisoes)
- last seen: 2026-10-31T01:41:02Z

### L-048 - A lista de limiares a provar dos dois lados sai de todo AC que diz 'abaixo de' ou 'a partir de', inclusive do breakpoint antigo que a fatia reaproveita; listar só os limiares novos deixa o antigo provado longe dele.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `testes,limites` · harmful: 0
- features: lancamentos-densos
- evidence: validation.md rodada 2: N11 (src/components/menu-da-linha.tsx:84, botao-excluir.tsx:32) e N11b (botao-pago.tsx:32); DENS-02 AC 7, limiar de 768 px; sonda P6 (testes,limites)
- last seen: 2026-10-31T03:31:54Z

### L-049 - Mudança que alarga uma célula precisa reabrir o AC de largura que a fatia mantém, com fixture do conteúdo mais largo nas larguras dele; o teste antigo, com conteúdo curto, continua verde enquanto a tabela sai da coluna.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `e2e,fixtures,layout` · harmful: 0
- features: lancamentos-densos
- evidence: validation.md rodada 3, Lacuna 1: LST-05 AC 3 em 1.024 px com fixo confirmado; src/components/valor-confirmavel.tsx:67; sonda G (Fixos 1.091,8 contra 1.000) (e2e,fixtures,layout)
- last seen: 2026-10-31T04:36:51Z

### L-050 - Regra de layout que um AC pede sem dizer largura precisa de prova colada no breakpoint em que o código a liga; provada só no monitor grande, o breakpoint muda com a suíte verde.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `testes,limites,layout` · harmful: 0
- features: lancamentos-densos
- evidence: validation.md rodada 3: F2 (src/components/valor-confirmavel.tsx:67), DENS-01 AC 5 entre 768 e 1.279 px; sonda B (testes,limites,layout)
- last seen: 2026-10-31T04:36:51Z

### L-051 - Edge case que junta dois estados precisa de um teste com os dois ao mesmo tempo; provar cada estado num teste separado deixa a junção regredir com a suíte verde.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `componentes,testes` · harmful: 0
- features: lancamentos-densos
- evidence: validation.md rodada 3: F6 (src/components/menu-da-linha.tsx:89-96), edge case 'confirmação aberta e clique fora'; sonda F (componentes,testes)
- last seen: 2026-10-31T04:36:51Z

## Quarantined (failed when applied - ignore)

A confirmed lesson that recurred alongside failure. Kept for the maintainer to review.

_none_
