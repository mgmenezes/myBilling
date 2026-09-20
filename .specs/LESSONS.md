# LESSONS - auto-maintained by scripts/lessons.py

> Machine-owned. Do NOT hand-edit. Changes are overwritten on the next `lessons.py` write.
> Canonical state lives in `.specs/lessons.json`. Edit lessons only via the script.
> promote_threshold=2 distinct features · window_days=45 · quarantine_threshold=2

## Confirmed (load these at Specify/Design)

Corroborated across multiple features. Safe to apply as guidance.

_none_

## Candidates (under observation - do NOT load as guidance yet)

Seen once or not yet corroborated. Tracked, not trusted.

### L-001 - Regra de negócio aplicada num .filter() de página precisa de um percurso e2e que a exercite; sem ele o filtro pode ser apagado com a suíte inteira verde.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `app-router,paginas` · harmful: 0
- features: lancamento-avulso
- evidence: mutante M24 (ciclo 1) e N2 (ciclo 3) — src/app/(app)/[competencia]/fixos/page.tsx:66-72 (app-router,paginas)
- last seen: 2026-09-15T04:13:17Z

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

## Quarantined (failed when applied - ignore)

A confirmed lesson that recurred alongside failure. Kept for the maintainer to review.

_none_
