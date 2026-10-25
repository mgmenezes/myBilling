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

## Candidates (under observation - do NOT load as guidance yet)

Seen once or not yet corroborated. Tracked, not trusted.

### L-002 - Teste de paridade entre duas fontes precisa afirmar as duas direções; a unidirecional não pega remoção.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `integridade,banco` · harmful: 0
- features: lancamento-avulso
- evidence: mutante M28 (ciclo 1) — src/infrastructure/db/restricoes.integration.test.ts:222-262 (integridade,banco)
- last seen: 2026-09-15T04:13:17Z

### L-003 - Comportamento que só aparece em tabela de dimensões ou em decisão, sem acceptance criterion numerado, passa despercebido: promova-o a AC antes de mapear requisito para ele.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `spec` · harmful: 0
- features: lancamento-avulso
- evidence: spec.md:91 (tabela de dimensões) e traceability de AVUL-04 — ciclo 2 (spec)
- last seen: 2026-09-15T04:13:17Z

### L-004 - Correção de lacuna apontada por verificação precisa ser confirmada pela mesma mutação que revelou a lacuna, antes de declará-la fechada.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `verificacao` · harmful: 0
- features: lancamento-avulso
- evidence: mutante N10 (ciclo 2) — e2e/recorrencias.spec.ts:87 (verificacao)
- last seen: 2026-09-15T04:13:17Z

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

### L-010 - AC com duas cláusulas precisa de uma assertion para cada uma; provar só uma deixa a outra livre para regredir.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `testes,acceptance-criteria` · harmful: 0
- features: importar-planilha
- evidence: mutante M28 — src/domain/importacao/reconhecer-recorrencias.ts:71 (IMP-07 AC 12, cláusula 'por ordem de aparição') (testes,acceptance-criteria)
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

### L-014 - Garantia provada em cada elo separado, quem produz e quem consome, precisa de um teste que atravesse a composição; sem ele, o elo do meio a desfaz com a suíte verde.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `testes,composicao` · harmful: 0
- features: importar-planilha
- evidence: validation.md rodada 2: N9 (src/domain/importacao/planejar-importacao.ts:362) e N6 (src/components/importacao/dialogo-importacao.tsx:184) (testes,composicao)
- last seen: 2026-10-25T06:12:20Z

### L-015 - Correção de estado transitório na tela precisa observar todo elemento ligado ao mesmo sinal pendente, e não só o que exibiu o defeito.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `componentes,testes` · harmful: 0
- features: importar-planilha
- evidence: validation.md rodada 2: N5 (src/components/importacao/dialogo-importacao.tsx:194) (componentes,testes)
- last seen: 2026-10-25T06:12:20Z

## Quarantined (failed when applied - ignore)

A confirmed lesson that recurred alongside failure. Kept for the maintainer to review.

_none_
