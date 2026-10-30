# Saldo dos próximos meses: Specification

> Pedido do dono em 2026-10-30, olhando a seção "Já comprometido nos próximos meses" da Visão geral:
> "seria bom que a gente mostrasse o saldo também, o valor que vai sobrar nos próximos meses".
> Plano aprovado no mesmo dia (`~/.claude/plans/stateless-roaming-lighthouse.md`).

## Problem Statement

A Visão geral mostra, para cada um dos três meses seguintes, quanto de despesa ainda não paga já
está comprometido. Ela não diz quanto vai sobrar nesses meses. Para saber, o dono abre cada mês e
lê o card "Saldo previsto". Os meses futuros já têm a entrada prevista, porque o salário e as outras
entradas que se repetem estão cadastrados como entrada fixa.

## Goals

- [ ] Ver, sem sair da Visão geral, quanto vai sobrar ou faltar em cada um dos três meses seguintes
- [ ] O número de cada mês ser o mesmo do card "Saldo previsto" quando aquele mês é aberto

## Out of Scope

| Feature | Reason |
| --- | --- |
| Sobra acumulada de um mês para o outro | Decisão do dono: cada mês isolado |
| Saldo da conta no banco | O app não conhece o saldo da conta, só o que entra e sai em cada mês |
| Mais de três meses | A janela é `MESES_DE_PROJECAO`, a mesma da materialização (FIXO-05, AC 2) |
| Mudar os quatro cards de indicadores | Os cards ficam como estão |
| Cartão do mês futuro como link | Hoje o cartão não é link, e o pedido não muda isso |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| De onde vem a entrada futura | Das entradas fixas já materializadas na janela | O dono cadastra salário e entradas que se repetem como entrada fixa | y |
| Sobra isolada ou acumulada | Cada mês isolado | Decisão do dono | y |
| Conta do saldo | Entradas − todas as despesas − investimentos da competência, a mesma do card "Saldo previsto" | O número do cartão e o do card do mês não têm como divergir | n (decisão do autor) |
| Despesa futura já paga | Entra no saldo e continua fora do comprometido | O saldo do mês não muda porque uma conta foi paga adiantada | n (decisão do autor) |
| Rótulo do saldo | "Vai sobrar" quando positivo ou zero, "Vai faltar" quando negativo, com o valor sem sinal | São as palavras do dono. O rótulo "Saldo previsto" não pode se repetir: o e2e de `compra-parcelada.spec.ts:239-250` exige que ele apareça uma vez no Planejamento e nenhuma em Movimentações, e a seção aparece nas duas visões | n (decisão do autor) |
| Cor do saldo | Verde em "Vai sobrar", vermelho em "Vai faltar", neutro no zero | Cor de texto, nunca sozinha: a palavra diz o sentido (`docs/design.md`, "Semântica de valor") | n (decisão do autor) |
| Título da seção | "Próximos meses" | "Já comprometido" deixa de cobrir tudo o que a seção mostra | n (decisão do autor) |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Saldo de cada mês seguinte, numa definição só ⭐ MVP — SALDO-01

**User Story**: Como quem planeja os próximos meses, quero que o app calcule quanto sobra em cada
um deles com a mesma conta do card "Saldo previsto", para os dois números nunca divergirem.

**Why P1**: É o número que o dono pediu.

**Acceptance Criteria**

1. The system SHALL calcular, para cada competência da janela de projeção, o `saldo` como as
   entradas menos as despesas menos os investimentos daquela competência, só com lançamentos não
   cancelados
2. The system SHALL contar no `saldo` a despesa da competência já paga, que continua fora do
   `comprometido`
3. The system SHALL calcular o `saldo` de cada competência só com os lançamentos dela, sem somar o
   saldo de outra competência
4. The system SHALL obter o `saldo` de uma competência da mesma função que produz o
   `competenciaView.saldo` de `resumoMensal`, de modo que os dois sejam iguais para a mesma lista e
   a mesma competência
5. WHEN uma competência da janela não tem lançamento vigente THEN o sistema SHALL devolver `saldo`
   igual a zero

**Independent Test**: abril com entrada de R$ 1.000,00, despesa de R$ 300,00 e investimento de
R$ 100,00 projeta `saldo` de R$ 600,00, e `resumoMensal` de abril dá o mesmo `saldo`.

---

### P1: A visão mensal entrega o saldo futuro ⭐ MVP — SALDO-02

**User Story**: Como a página da Visão geral, quero receber o saldo de cada mês seguinte junto do
comprometido, para não ter de calculá-lo.

**Why P1**: Sem ele a tela não tem o número.

**Acceptance Criteria**

1. WHEN `obterVisaoMensal` é chamada para uma competência THEN o sistema SHALL entregar em `futuro`,
   para cada uma das `MESES_DE_PROJECAO` competências seguintes, `competencia`, `comprometido` e
   `saldo`
2. WHEN `obterVisaoMensal` é chamada para uma das competências seguintes, com os mesmos lançamentos
   THEN o sistema SHALL entregar em `competenciaView.saldo` o mesmo valor que a competência anterior
   projetou para ela em `futuro`

**Independent Test**: com uma entrada fixa e um fixo em abril, o `saldo` de abril em `futuro` de
março é igual ao `competenciaView.saldo` de abril.

---

### P1: Os cartões dos próximos meses mostram o saldo ⭐ MVP — SALDO-03

**User Story**: Como quem olha a Visão geral, quero ver em cada mês seguinte quanto já está
comprometido e quanto vai sobrar ou faltar, para saber de relance se o mês fecha no azul.

**Why P1**: É onde o dono pediu para ver.

**Acceptance Criteria**

1. The system SHALL titular a seção "Próximos meses"
2. The system SHALL mostrar em cada cartão o mês, o rótulo "Comprometido" com o valor comprometido, e
   o rótulo do saldo com o valor do saldo, cada rótulo ligado ao seu valor numa lista de descrição
   (`dt` e `dd`)
3. WHEN o `saldo` do mês é positivo THEN o sistema SHALL mostrar o rótulo "Vai sobrar" e o valor
   formatado em `text-positivo`
4. WHEN o `saldo` do mês é negativo THEN o sistema SHALL mostrar o rótulo "Vai faltar" e o valor
   absoluto formatado, sem sinal, em `text-negativo`
5. WHEN o `saldo` do mês é zero THEN o sistema SHALL mostrar o rótulo "Vai sobrar" e "R$ 0,00" em
   `text-ink`, sem cor de semântica
6. The system SHALL mostrar a seção nas visões Planejamento e Movimentações, sem repetir os rótulos
   dos cards de indicadores ("Saldo previsto" e "Saldo do período")
7. WHEN a pessoa abre um dos meses seguintes THEN o sistema SHALL mostrar no card "Saldo previsto"
   o mesmo valor do cartão daquele mês: igual em "Vai sobrar" e com sinal de menos em "Vai faltar"
8. WHEN a Visão geral é exibida em 400 px de largura THEN o sistema SHALL caber sem rolagem
   horizontal da página

**Independent Test**: em março, com entrada fixa de R$ 1.000,00 e um fixo de R$ 300,00, o cartão
de abril mostra "Comprometido R$ 300,00" e "Vai sobrar R$ 700,00"; abrir abril mostra "Saldo
previsto R$ 700,00".

---

## Edge Cases

- Mês da janela sem lançamento nenhum: "Comprometido R$ 0,00" e "Vai sobrar R$ 0,00", sem cor
- Despesa do mês futuro já paga: fora do comprometido e dentro do saldo
- Lançamento cancelado: fora do comprometido e fora do saldo
- Investimento do mês futuro: fora do comprometido e subtraído do saldo
- Recorrência sem competência de fim: o saldo enxerga só a janela, como o comprometido (REC-02,
  AC 5)

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| SALDO-01 | P1: Saldo de cada mês seguinte, numa definição só | Execute | Implementing: `saldoPrevistoDaCompetencia` em `resumo-mensal.ts` é a definição única, usada pelo `competenciaView.saldo` e por `projetarProximosMeses`; `projecao.test.ts` prova entradas − despesas − investimentos e os cancelados fora, AC 1, a despesa paga no saldo e fora do comprometido, AC 2, cada mês isolado, AC 3, o mesmo número de `resumoMensal`, AC 4, e zero no mês vazio, AC 5 (passo 2); falta o Verifier |
| SALDO-02 | P1: A visão mensal entrega o saldo futuro | Execute | Implementing: `handler.test.ts` prova `futuro` com competência, comprometido e saldo nos `MESES_DE_PROJECAO` meses, com entrada fixa, fixo e investimento, AC 1, e o saldo projetado igual ao `competenciaView.saldo` de abril e de maio abertos, AC 2; o mês sem lançamento com saldo zero (passo 3); falta o Verifier |
| SALDO-03 | P1: Os cartões dos próximos meses mostram o saldo | Execute | Pending |

---

## Success Criteria

- [ ] Na Visão geral, cada um dos três meses seguintes mostra o comprometido e quanto vai sobrar ou
  faltar
- [ ] O número de cada mês é o mesmo do card "Saldo previsto" ao abrir aquele mês
- [ ] Nenhuma mudança de banco: a fatia publica só com `git push`
